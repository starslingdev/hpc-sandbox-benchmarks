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
import { writeFileSync } from "node:fs";
import { requiredProviders, unmetRequirements } from "@sandbox-benchmarks/harness";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { bakeBlaxelImage } from "../lib/bake/blaxel.ts";
import { bakeDaytonaSnapshot } from "../lib/bake/daytona.ts";
import { bakeE2bTemplate } from "../lib/bake/e2b.ts";
import { buildAndPushCandidate, resolveImageDigestRef } from "../lib/bake/image.ts";
import { bakeModalImage } from "../lib/bake/modal.ts";
import { bakeNovitaTemplate } from "../lib/bake/novita.ts";
import { promoteAll } from "../lib/bake/promote.ts";
import type { BakeReport, Log } from "../lib/bake/types.ts";
import { candidateCreateOptions } from "../lib/bake/validate.ts";
import { selectProviders } from "../lib/matrix.ts";
import { anyFailed, forEachProviderWithCreds } from "../lib/providers-run.ts";
import { bootAndSmoke, logChecks, smokeFailureReason, smokeOk } from "../lib/smoke-run.ts";

// Each provider's candidate bake, bound to the candidate artifact name but NOT the mutable image
// tag. The caller resolves that tag once and passes the same immutable digest to every baker.
const bakers: Record<ProviderId, (image: string, log: Log) => Promise<void>> = {
	e2b: (image, log) => bakeE2bTemplate(config.e2bTemplateCandidate, image, log),
	daytona: (image, log) => bakeDaytonaSnapshot(config.daytonaSnapshotCandidate, image, log),
	modal: bakeModalImage,
	blaxel: (image, log) => bakeBlaxelImage(config.toolchainImageBlaxelCandidate, image, log),
	novita: (image, log) => bakeNovitaTemplate(config.novitaTemplateCandidate, image, log),
};

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
 * The flag applies only to the candidate bake loop; `--promote` is always all-providers (a transaction).
 *
 * A PRESENT-but-valueless flag (`--provider`, `--provider=`, `--provider --force`) THROWS rather than
 * falling through to the all-providers default. `selectProviders` treats a blank list as "every
 * provider", which is the right default for an *absent* dispatch input but exactly wrong here: a matrix
 * cell whose value failed to interpolate would silently bake all five providers instead of its one, and
 * five such cells would race on the same artifact names. Asking to restrict and getting everything is a
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

if (import.meta.main) {
	const log: Log = (m) => console.error(m);

	// Promote is the release step: publish the already-validated candidate as the public version.
	if (process.argv.includes("--promote")) {
		// `--force` republishes over an existing (immutable) version — dev regeneration, set only by a
		// manual toolchain-image.yml dispatch. Automated pushes never pass it, so :v1 stays immutable there.
		const promoted = await promoteAll(log, process.argv.includes("--force"));
		writeReport({
			version: {
				image: config.toolchainImageVersion,
				e2bTemplate: config.e2bTemplateVersion,
				daytonaSnapshot: config.daytonaSnapshotDefault,
				novitaTemplate: config.novitaTemplateVersion,
			},
			reports: promoted,
		});
		// promoteAll is self-gating: the D1 required-providers gate (CI passes `--require e2b,daytona,modal`)
		// runs INSIDE promoteAll before the immutable base is written, and every abort path (version already
		// published, candidate re-validation failed, artifact failed, unmet requirements) pushes a structured
		// `{ status: "failed" }` report. So a single `some(failed)` is the whole exit contract — re-deriving
		// `unmet` here would mislabel an early abort (e.g. "version already exists") as a provider-credentials
		// failure, since the early `reports` carry no provider "ok" entries.
		process.exit(promoted.some((r) => r.status === "failed") ? 1 : 0);
	}

	// Optional per-provider restriction for the CI matrix fan-out (one cell per provider). Parsed before
	// any build so a typo'd id fails the cell fast (clean message, no stack), before the candidate is touched.
	let only: ProviderId[] | undefined;
	try {
		only = requestedProviders(process.argv);
	} catch (err) {
		log(`error: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}
	if (only) log(`>>> restricting bake+validate to: ${only.join(", ")}`);

	if (process.argv.includes("--build-push")) {
		log(">>> building + pushing candidate image…");
		try {
			await buildAndPushCandidate(log);
		} catch (err) {
			log(`<<< build/push failed — ${err instanceof Error ? err.message : String(err)}`);
			process.exit(1);
		}
	}

	// Modal's registry importer, like the remote E2B-compatible builders, may cache a mutable tag.
	// Resolve once after the push and validate the exact candidate bytes by immutable digest. This also
	// makes a tag change between provider bakes unable to redirect Modal's validation to different bytes.
	let pinnedCandidateImage: string;
	try {
		pinnedCandidateImage = await resolveImageDigestRef(config.toolchainImageCandidate);
		log(`>>> candidate image pinned for validation: ${pinnedCandidateImage}`);
	} catch (err) {
		log(
			`<<< could not resolve candidate image digest — ${err instanceof Error ? err.message : String(err)}`,
		);
		process.exit(1);
	}
	const candidateRefs = {
		e2bTemplateCandidate: config.e2bTemplateCandidate,
		daytonaSnapshotCandidate: config.daytonaSnapshotCandidate,
		novitaTemplateCandidate: config.novitaTemplateCandidate,
		toolchainImageCandidate: pinnedCandidateImage,
		toolchainImageBlaxelCandidate: config.toolchainImageBlaxelCandidate,
		daytonaTarget: config.daytona.target,
	};

	const runs = await forEachProviderWithCreds(
		async (provider) => {
			log(`>>> ${provider.name}: baking candidate…`);
			await bakers[provider.name](pinnedCandidateImage, (m) => log(`    ${m}`));

			log(`>>> ${provider.name}: validating (boot + smoke)…`);
			// Boot the just-baked candidate (override the registry adapter's version create-options).
			const validateConfig: ProviderConfig = {
				...provider,
				createOptions: {
					...provider.createOptions,
					...candidateCreateOptions(provider.name, candidateRefs),
				},
			};
			return bootAndSmoke(validateConfig);
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
		candidate: {
			image: pinnedCandidateImage,
			e2bTemplate: config.e2bTemplateCandidate,
			daytonaSnapshot: config.daytonaSnapshotCandidate,
			novitaTemplate: config.novitaTemplateCandidate,
		},
		reports,
	});

	if (anyFailed(runs)) process.exit(1);

	// D1: at the publish boundary (CI passes `--require e2b,daytona,modal`) a required provider that was
	// skipped for a missing/misnamed secret — or failed to validate — must fail the bake loudly, so a
	// candidate is never blessed while a provider was silently never built. Lenient locally (none required).
	const required = requiredProviders();
	const unmet = unmetRequirements(reports, required);
	if (required.length > 0 && unmet.length > 0) {
		log(
			`error: required providers did not pass: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`,
		);
		process.exit(1);
	}
}
