#!/usr/bin/env bun
// `bake` — create each provider's CANDIDATE toolchain artifact and immediately validate it end-to-end
// by booting a sandbox from the just-baked artifact and running the shared smoke spec. This is the
// iteration loop: edit Dockerfile/templates → `bake --build-push` → `bake` → repeat. Everything hits
// the mutable candidate (`:v1-candidate`, `…-v1-candidate`); the public `:v1` is untouched until
// `promote` (next PR). Providers without credentials are skipped; exits non-zero iff a baked provider
// failed to validate. bun auto-loads .env, so local creds are picked up.
//
// The provider loop + skip-vs-fail contract is shared with bench-smoke/promote (providers-run.ts);
// the boot+smoke lifecycle (probe results captured before teardown) is shared too (smoke-run.ts).
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	exitAfterSandboxCleanup,
	requiredProviders,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import type {
	BakedProviderId,
	CandidateArtifactRefs,
	MirroredProviderId,
	ProviderId,
} from "@sandbox-benchmarks/schema";
import { bakedArtifactName, baseImageUse, PROVIDERS } from "@sandbox-benchmarks/schema";
import { buildAndPushCandidate, resolveImageDigestRef } from "../lib/bake/image.ts";
import { promoteAll } from "../lib/bake/promote.ts";
import {
	buildProviderArtifact,
	describeReplacement,
	isBakedProviderId,
	nonBakedArtifactAction,
} from "../lib/bake/provider-artifacts.ts";
import type { BakeReport, Log } from "../lib/bake/types.ts";
import { bootAndSmokeCandidate } from "../lib/bake/validate-run.ts";
import { isPartialScope, selectProviders } from "../lib/matrix.ts";
import { anyFailed, forEachProviderWithCreds } from "../lib/providers-run.ts";
import { releaseConfig } from "../lib/release-config.ts";
import { logChecks, smokeFailureReason, smokeOk } from "../lib/smoke-run.ts";

/**
 * Emit the bake/promote report JSON. To `$BAKE_REPORT_FILE` when set — the provider CLIs (e2b) and
 * docker inherit stdout, so a `bun bake.ts … > report.json` redirect would splice their chatter into
 * the report and corrupt the diagnostic. Writing the JSON to a file keeps the captured artifact clean
 * regardless. Falls back to stdout locally (no env var) so the bin stays runnable by hand.
 */
function writeReport(report: unknown): void {
	const json = `${JSON.stringify(report, null, 2)}\n`;
	const file = process.env.BAKE_REPORT_FILE;
	if (file) writeFileSync(file, json);
	else process.stdout.write(json);
}

/**
 * The provider ids a `--provider <ids>` (or `--provider=<ids>`) flag restricts the bake+validate loop
 * to — a comma-separated list, so the CI matrix passes one id per cell (`--provider e2b`) and each
 * provider bakes in its own job. Absent → undefined (drive every registered provider, the local
 * default). The argv scan mirrors `--require` (harness `requiredProviders`); the CSV is split and
 * validated against the registry by the shared {@link selectProviders} (which dedups, is
 * case-insensitive, returns registry order, and throws a registry-derived message on an unknown id).
 * It restricts `--promote` too: a scoped promote publishes only those providers' version artifacts,
 * onto an already-published version, and leaves the public base alone (see promote.ts, PromoteOptions).
 *
 * A PRESENT-but-valueless flag (`--provider`, `--provider=`, `--provider --force`) THROWS rather than
 * falling through to the all-providers default. `selectProviders` treats a blank list as "every
 * provider", which is the right default for an *absent* dispatch input but exactly wrong here: a matrix
 * cell whose value failed to interpolate would silently bake every provider instead of its one, and
 * those cells would race on the same artifact names. Asking to restrict and getting everything is a
 * failure, so it is reported as one.
 */
export function requestedProviders(argv: string[]): ProviderId[] | undefined {
	let raw: string | undefined;
	const eq = argv.find((a) => a.startsWith("--provider="));
	if (eq) {
		raw = eq.slice("--provider=".length);
	} else {
		const i = argv.indexOf("--provider");
		// The flag is present, so a missing or flag-like next arg is a typo, not "no restriction" —
		// record it as an empty request and let the blank check below reject it.
		if (i !== -1) {
			const next = argv[i + 1];
			raw = next !== undefined && !next.startsWith("-") ? next : "";
		}
	}
	if (raw === undefined) return undefined;
	if (raw.trim() === "") {
		throw new Error("--provider requires at least one provider id (e.g. --provider e2b)");
	}
	return selectProviders(raw);
}

/**
 * Optional immutable/shared base ref for the bake phase. CI always supplies the release plan's
 * resolved source: the just-built candidate digest for a full release, or the published version for
 * a scoped backfill. Local runs omit it and retain the mutable candidate default.
 */
export function requestedBaseImage(argv: string[]): string | undefined {
	let raw: string | undefined;
	const eq = argv.find((arg) => arg.startsWith("--base-image="));
	if (eq) {
		raw = eq.slice("--base-image=".length);
	} else {
		const i = argv.indexOf("--base-image");
		if (i !== -1) {
			const next = argv[i + 1];
			raw = next !== undefined && !next.startsWith("-") ? next : "";
		}
	}
	if (raw === undefined) return undefined;
	if (raw.trim() === "") {
		throw new Error("--base-image requires a non-empty image reference");
	}
	return raw;
}

/**
 * The `--bake-reports <dir>` a promote reads its candidates' build results from: the candidate
 * refs every bake report in the directory recorded, each for its own provider only (the one its
 * `bake-<id>.json` file is named for, or the `provider` it states), so one cell's report cannot pin
 * another provider's candidate. A native snapshot boots the immutable ID its
 * builder returned, which no name derives, so promote pins exactly the ID its bake validated
 * rather than looking one up by name. Absent → no recorded results (a native-snapshot candidate
 * then fails its re-validation as unresolved).
 */
export function candidateBuildResults(argv: string[]): Partial<Record<BakedProviderId, string>> {
	const i = argv.indexOf("--bake-reports");
	const eq = argv.find((arg) => arg.startsWith("--bake-reports="));
	const dir = eq ? eq.slice("--bake-reports=".length) : i === -1 ? undefined : (argv[i + 1] ?? "");
	if (dir === undefined) return {};
	if (dir.trim() === "" || dir.startsWith("-"))
		throw new Error("--bake-reports requires the directory holding the bake reports");
	const results: Partial<Record<BakedProviderId, string>> = {};
	for (const file of readdirSync(dir)
		.filter((name) => name.endsWith(".json"))
		.sort()) {
		const report = JSON.parse(readFileSync(join(dir, file), "utf8")) as {
			provider?: unknown;
			candidate?: { artifacts?: Record<string, unknown> };
		};
		// A report speaks only for its own cell's provider: the one its file is named for
		// (`bake-<id>.json`, as each matrix cell uploads it) or the one it names.
		const named = /^bake-(.+)\.json$/.exec(file)?.[1];
		const stated = typeof report.provider === "string" ? report.provider : undefined;
		if (named !== undefined && stated !== undefined && named !== stated)
			throw new Error(`${file}: names provider ${stated}, not ${named}`);
		const own = stated ?? named;
		for (const [id, ref] of Object.entries(report.candidate?.artifacts ?? {})) {
			if (!PROVIDERS.some((provider) => provider.id === id) || !isBakedProviderId(id as ProviderId))
				throw new Error(`${file}: ${id} is not a baked provider`);
			if (id !== own)
				throw new Error(
					`${file}: records ${id}'s candidate, but a report may only record its own provider's${own === undefined ? " (it names none)" : ` (${own})`}`,
				);
			if (typeof ref !== "string" || ref === "")
				throw new Error(`${file}: ${id} recorded no candidate artifact ref`);
			const known = results[id as BakedProviderId];
			if (known !== undefined && known !== ref)
				throw new Error(`bake reports disagree on ${id}'s candidate: ${known} vs ${ref}`);
			results[id as BakedProviderId] = ref;
		}
	}
	return results;
}

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	// Optional per-provider restriction. On the bake path it is the CI matrix fan-out (one cell per
	// provider); on the promote path it scopes the transaction to a backfill. Parsed before any build
	// or registry call so a typo'd id fails fast (clean message, no stack) before anything is touched.
	let only: ProviderId[] | undefined;
	let baseImageRef: string = releaseConfig.toolchainImageCandidate;
	let recordedCandidates: Partial<Record<BakedProviderId, string>> = {};
	try {
		only = requestedProviders(process.argv);
		baseImageRef = requestedBaseImage(process.argv) ?? releaseConfig.toolchainImageCandidate;
		recordedCandidates = candidateBuildResults(process.argv);
	} catch (err) {
		log(`error: ${err instanceof Error ? err.message : String(err)}`);
		await exitAfterSandboxCleanup(2);
	}

	// Promote is the release step: publish the already-validated candidate as the public version.
	if (process.argv.includes("--promote")) {
		// `--force` republishes over an existing (immutable) version — dev regeneration, set only by a
		// manual toolchain-image.yml dispatch. Automated pushes never pass it, so :v1 stays immutable there.
		const force = process.argv.includes("--force");
		// A scoped promote is a backfill onto an existing version, which is the opposite of what --force
		// does (regenerate the whole version in place, destructively where a vendor has no overwrite). Refuse the combination
		// rather than pick a winner: whichever we picked would silently not be what the operator asked for.
		if (isPartialScope(only) && force) {
			log(
				"error: --force cannot be combined with a scoped --provider promote — a scoped promote " +
					"backfills providers onto an already-published version, while --force regenerates the " +
					"whole version in place. Pick one.",
			);
			await exitAfterSandboxCleanup(2);
		}
		const promoted = await promoteAll(log, { force, only, candidates: recordedCandidates });
		writeReport({
			// The scope is recorded alongside the version because on a partial promote most of the
			// fleet was not touched, and the payload has to say which run this was rather than leave a
			// reader to infer it from `reports`.
			scope: only ?? PROVIDERS.map((p) => p.id),
			partial: isPartialScope(only),
			version: {
				image: releaseConfig.toolchainImageVersion,
				artifacts: Object.fromEntries(
					promoted.reports.flatMap((report) =>
						report.artifactRef === undefined ? [] : [[report.provider, report.artifactRef]],
					),
				),
			},
			reports: promoted.reports,
		});
		// The transaction outcome is separate from its diagnostics: an optional provider can fail and stay
		// visible in the report without turning a successfully published shared version red after commit.
		await exitAfterSandboxCleanup(promoted.ok ? 0 : 1);
	}

	if (only) log(`>>> restricting bake+validate to: ${only.join(", ")}`);

	if (process.argv.includes("--build-push")) {
		log(">>> building + pushing candidate image…");
		try {
			await buildAndPushCandidate(log);
		} catch (err) {
			log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
			await exitAfterSandboxCleanup(1);
		}
	}

	// Modal's registry importer, like the remote E2B-compatible builders, may cache a mutable tag.
	// Resolve once after the push and validate the exact candidate bytes by immutable digest. This also
	// makes a tag change between provider bakes unable to redirect Modal's validation to different bytes.
	//
	// Only providers that actually reference the base need it: vercel boots its own VCR mirror, so a
	// cell restricted to it must not die on a base candidate it never reads.
	const needsBase = (only ?? PROVIDERS.map((p) => p.id)).some((id) => baseImageUse(id) !== "none");
	let pinnedBaseImage = baseImageRef;
	if (needsBase) {
		try {
			pinnedBaseImage = await resolveImageDigestRef(baseImageRef);
			log(`>>> base image pinned for validation: ${pinnedBaseImage}`);
		} catch (err) {
			log(
				`<<< could not resolve base image digest for ${baseImageRef} — ${err instanceof Error ? err.message : String(err)}`,
			);
			await exitAfterSandboxCleanup(1);
		}
	} else {
		log(`>>> no provider in scope reads ${baseImageRef} — not resolving it`);
	}
	// Mutable: each build reports the ref its candidate boots only once it has run.
	const buildResults: Partial<Record<BakedProviderId, string>> = {};
	const candidateRefs: CandidateArtifactRefs = {
		toolchainImage: pinnedBaseImage,
		mirrored: { vercel: releaseConfig.vercelImageCandidate } satisfies Record<
			MirroredProviderId,
			string
		>,
		buildResults,
	};

	const runs = await forEachProviderWithCreds(
		async (target) => {
			if (isBakedProviderId(target.id)) {
				log(`>>> ${target.id}: baking candidate…`);
				const built = await buildProviderArtifact(target.id, {
					phase: "candidate",
					base: pinnedBaseImage,
					// The candidate name is mutable by design: each bake rebuilds it.
					replace: "allowed",
					log: (m) => log(`    ${m}`),
				});
				buildResults[target.id] = built.ref;
				log(
					`>>> ${describeReplacement(target.id, bakedArtifactName(target.id, "candidate"), built)}`,
				);
			} else {
				log(`>>> ${target.id}: ${nonBakedArtifactAction(target.id, "candidate")}`);
			}

			log(`>>> ${target.id}: validating (boot + smoke)…`);
			return bootAndSmokeCandidate(target, candidateRefs);
		},
		{
			log,
			only,
			ok: smokeOk,
			failureReason: smokeFailureReason,
			onComplete: (run) => {
				if (run.value) logChecks(run.provider, run.value.checks, log);
				const time = run.durationMs !== undefined ? `${run.durationMs.toFixed(0)}ms` : "";
				const counts = run.value
					? `${run.value.checks.filter((c) => c.ok).length}/${run.value.checks.length} checks`
					: "";
				const meta = [time, counts].filter(Boolean).join(", ");
				log(
					`<<< ${run.provider}: ${run.status}${meta ? ` (${meta})` : ""}${run.reason ? ` — ${run.reason}` : ""}`,
				);
			},
		},
	);

	const reports: BakeReport[] = runs.map((run) => ({
		provider: run.provider,
		status: run.status,
		...(run.reason ? { reason: run.reason } : {}),
		...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
		...(run.value && run.value.checks.length > 0 ? { checks: run.value.checks } : {}),
	}));

	writeReport({
		// `artifacts` is what a later promote pins: the ref each candidate build returned.
		candidate: { image: pinnedBaseImage, artifacts: buildResults },
		reports,
	});

	if (anyFailed(runs)) await exitAfterSandboxCleanup(1);

	// D1: at the publish boundary (CI passes `--require e2b,daytona-vm,modal-gvisor`) a required provider that was
	// skipped for a missing/misnamed secret — or failed to validate — must fail the bake loudly, so a
	// candidate is never blessed while a provider was silently never built. Lenient locally (none required).
	const required = requiredProviders();
	const unmet = unmetRequirements(reports, required);
	if (required.length > 0 && unmet.length > 0) {
		log(
			`error: required providers did not pass: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`,
		);
		await exitAfterSandboxCleanup(1);
	}
	await exitAfterSandboxCleanup(0);
}
