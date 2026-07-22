#!/usr/bin/env bun
// `bake` — create each provider's CANDIDATE toolchain artifact and immediately validate it end-to-end
// by booting a sandbox from the just-baked artifact and running the shared smoke spec. This is the
// iteration loop: edit Dockerfile/templates → `bake --build-push` → `bake` → repeat. Everything hits
// the mutable candidate (`:v1-candidate`, `…-v1-candidate`); the public `:v1` is untouched until
// `promote` (next PR). Providers without credentials are skipped. Exit code is required-aware (gates.ts):
// non-zero iff a REQUIRED provider (`--require`/REQUIRE_PROVIDERS) failed or skipped — or, locally with
// nothing required, any failure; a best-effort provider's failure only WARNS. bun auto-loads .env, so
// local creds are picked up.
//
// The provider loop + skip-vs-fail contract is shared with bench-smoke/promote (providers-run.ts);
// the boot+smoke lifecycle (probe results captured before teardown) is shared too (smoke-run.ts).
import { writeFileSync } from "node:fs";
import { requiredProviders, unmetRequirements } from "@sandbox-benchmarks/harness";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { config } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { fail, logWarning } from "../lib/actions-log.ts";
import { bakeDaytonaContainerSnapshot, bakeDaytonaVmSnapshot } from "../lib/bake/daytona.ts";
import { bakeE2bTemplate } from "../lib/bake/e2b.ts";
import { blockingFailures, nonBlockingFailures } from "../lib/bake/gates.ts";
import { buildAndPushCandidate, resolveImageDigestRef } from "../lib/bake/image.ts";
import { bakeModalImage } from "../lib/bake/modal.ts";
import { bakeNovitaTemplate } from "../lib/bake/novita.ts";
import { promoteAll } from "../lib/bake/promote.ts";
import type { BakeReport, Log } from "../lib/bake/types.ts";
import { candidateCreateOptions } from "../lib/bake/validate.ts";
import { selectProviders } from "../lib/matrix.ts";
import { forEachProviderWithCreds } from "../lib/providers-run.ts";
import { bootAndSmoke, logChecks, smokeFailureReason, smokeOk } from "../lib/smoke-run.ts";

// Each provider's candidate bake, bound to the candidate artifact name but NOT the mutable image
// tag. The caller resolves that tag once and passes the same immutable digest to every baker.
const bakers: Record<ProviderId, (image: string, log: Log) => Promise<void>> = {
	e2b: (image, log) => bakeE2bTemplate(config.e2bTemplateCandidate, image, log),
	"daytona-vm": (image, log) => bakeDaytonaVmSnapshot(config.daytonaSnapshotCandidate, image, log),
	"daytona-container": (image, log) =>
		bakeDaytonaContainerSnapshot(config.daytonaContainerSnapshotCandidate, image, log),
	// Both Modal variants boot the same pushed image via Image.fromRegistry — no per-variant artifact.
	"modal-gvisor": bakeModalImage,
	"modal-vm": bakeModalImage,
	blaxel: async (_image, log) => {
		log("blaxel boots the stock base image — no candidate artifact to bake");
	},
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
 * Surface a gate's outcome through @actions/core: WARN each best-effort (non-blocking) failure, then
 * FAIL the process naming the blocking ones. Shared by the promote and candidate-bake exit paths so the
 * two can't drift in how they report the same gate (the whole point of gates.ts is that the rule is
 * single-sourced — this keeps its *surfacing* single-sourced too). Returns only when nothing blocks;
 * `fail` exits non-zero otherwise.
 */
function reportGateOutcome(
	reports: BakeReport[],
	required: string[],
	labels: {
		warn: (r: BakeReport) => string;
		warnTitle: string;
		failVerb: string;
		failTitle: string;
	},
): void {
	for (const r of nonBlockingFailures(reports, required)) {
		logWarning(labels.warn(r), { title: labels.warnTitle });
	}
	const blocking = blockingFailures(reports, required);
	if (blocking.length > 0) {
		fail(`${labels.failVerb}: ${blocking.map((b) => b.provider).join(", ")}`, {
			properties: { title: labels.failTitle },
		});
	}
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
		const required = requiredProviders();
		const promoted = await promoteAll(log, process.argv.includes("--force"));
		writeReport({
			version: {
				image: config.toolchainImageVersion,
				e2bTemplate: config.e2bTemplateVersion,
				daytonaSnapshot: config.daytonaSnapshotDefault,
				daytonaContainerSnapshot: config.daytonaContainerSnapshotDefault,
				novitaTemplate: config.novitaTemplateVersion,
			},
			reports: promoted,
		});
		// Warn each best-effort failure, fail on any blocking one. A best-effort (non-required) provider
		// that failed to promote is recorded and warned, but must NOT fail a release whose required set +
		// base retag succeeded — exactly what shipped :v5 in run 29896891577 while the job still went red.
		// A blocking failure is a required provider OR the IMAGE_REPORT commit-point/abort sentinel
		// (promoteAll pushes one for every abort: version-already-published, re-validation failed, required
		// artifact failed), so those still fail the job. This is the SAME gate promoteAll gated its publish
		// on, so exit code and publish can't drift.
		reportGateOutcome(promoted, required, {
			warn: (r) =>
				`${r.provider} did not promote — recorded, not blocking ${config.toolchainImageVersion} (best-effort provider): ${r.reason ?? "failed"}`,
			warnTitle: "Non-required provider not promoted",
			failVerb: "promote failed",
			failTitle: "Promote failed",
		});
		process.exit(0);
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
		daytonaContainerSnapshotCandidate: config.daytonaContainerSnapshotCandidate,
		novitaTemplateCandidate: config.novitaTemplateCandidate,
		toolchainImageCandidate: pinnedCandidateImage,
		daytonaVmTarget: config.daytonaVm.target,
		daytonaContainerTarget: config.daytonaContainer.target,
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
			daytonaContainerSnapshot: config.daytonaContainerSnapshotCandidate,
			novitaTemplate: config.novitaTemplateCandidate,
		},
		reports,
	});

	// The CI fan-out hands EVERY cell the full required set (`--require e2b,daytona-vm,modal-gvisor`) and
	// restricts the run to one provider (`--provider <p>` → `only`). So a non-required cell's failure is
	// best-effort: WARN via @actions/core and exit 0 (the release ships without it) — the workflow no
	// longer swallows a non-zero exit with a hardcoded `|| echo "::warning::"`. A required cell's failure
	// blocks, exactly as before. Locally (nothing required) any failure blocks, the hand-run safety net.
	const required = requiredProviders();
	reportGateOutcome(reports, required, {
		warn: (r) =>
			`${r.provider} did not pass its bake/verify — recorded, not blocking the release (best-effort provider): ${r.reason ?? "failed"}`,
		warnTitle: "Non-required provider not validated",
		failVerb: "bake failed",
		failTitle: "Bake failed",
	});

	// D1: at the publish boundary a required provider that was SKIPPED for a missing/misnamed secret (a
	// pure skip, which the blocking-failure check above does not catch) must fail the bake loudly, so a
	// candidate is never blessed while a provider was silently never built. Scope the gate to the
	// providers THIS invocation ran (`only`): a single matrix cell isn't responsible for the required
	// providers it never touched — otherwise a non-required cell would report every other required
	// provider as "unmet". Locally (no `only`, none required) this is a no-op.
	const scopedRequired = only ? required.filter((id) => only.some((p) => p === id)) : required;
	const unmet = unmetRequirements(reports, scopedRequired);
	if (scopedRequired.length > 0 && unmet.length > 0) {
		fail(`required providers did not pass: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`, {
			properties: { title: "Required provider skipped" },
		});
	}
}
