#!/usr/bin/env bun
// `promote-phase` — the promote transaction, one phase per invocation, so the release lane can run its
// per-provider halves as CONCURRENT GitHub Actions steps instead of one 60-minute serial job.
//
// `bake --promote` runs the whole transaction in a single process and remains the local entry point.
// This bin exposes the SAME phases (lib/bake/promote.ts exports each one) as subcommands a workflow can
// sequence by hand:
//
//   preflight            once   steps 1, 2-pin, 2b — probe, pin the base, guard backfill drift
//   validate  --provider per-provider, CONCURRENT   step 2 — boot its candidate + smoke
//   gate --phase validate once   the step-2 abort: a REQUIRED provider that failed stops the release
//   artifact  --provider per-provider, CONCURRENT   step 3 — build its version-named artifact
//   commit               once   steps 3b, 4 — required-providers gate, then the base retag
//
// The ordering is the contract, not the concurrency: preflight → ‖validate‖ → gate → ‖artifact‖ →
// commit reproduces `promoteAll`'s sequence exactly, including that a required provider's FAILED
// re-validation aborts before any version artifact is built. Nothing is reimplemented here — every
// gate, refusal and predicate is imported, so the split lane cannot drift from the monolith.
//
// Per-provider steps DO NOT decide the release. They always exit 0 and record a structured verdict in
// a fragment file; the sequential `gate`/`commit` steps read those fragments and are the single owner
// of pass/fail. That is deliberate: it makes every sibling's diagnostics land even when one provider
// has already doomed the run (the same posture as the bake matrix's `fail-fast: false`), and it keeps
// the release's success from depending on how a `parallel:` block reports a failed child step.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { requiredProviders } from "@sandbox-benchmarks/harness";
import { drainRuncloudBackgroundWork } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { hasVersionArtifact, PROVIDERS } from "@sandbox-benchmarks/schema";
import {
	blocksPromotion,
	buildVersionArtifact,
	candidateRefsFor,
	effectivePromotionRequirements,
	promoteCommit,
	promotePayload,
	promotePreflight,
	revalidateProvider,
} from "../lib/bake/promote.ts";
import type { BakeReport, Log } from "../lib/bake/types.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";
import { isPartialScope } from "../lib/matrix.ts";
import { forEachProviderWithCreds } from "../lib/providers-run.ts";
import { requestedProviders } from "./bake.ts";

/** Where the per-provider fragments live. One directory per run; the workflow leaves the default. */
const DEFAULT_REPORTS_DIR = "promote-reports";

/** The final diagnostic every path must leave behind, whatever it is named by `BAKE_REPORT_FILE`.
 *  Matches bake.ts so a promote payload is found at the same place regardless of which lane wrote it. */
const DEFAULT_PAYLOAD_FILE = "promote-payload.json";

/** The phases that emit one fragment per provider. `gate` names one to say which set it is gating. */
type Phase = "validate" | "artifact";

/**
 * A phase's fragment path for one provider. Derived (never globbed) so `commit` can insist on a
 * fragment being present for every provider it expects: a step that was cancelled or crashed leaves no
 * file, and "no file" must read as "no verdict" — a failure — rather than silently shrinking the set
 * the gates run over. That is the same reasoning `forEachProviderWithCreds` uses to reject an empty
 * `only`: a release that verified nothing must never look like a release that passed.
 */
function fragmentPath(dir: string, phase: Phase, provider: ProviderId): string {
	return join(dir, `${phase}-${provider}.json`);
}

function writeJson(file: string, value: unknown): void {
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** Read one provider's fragment, or undefined when the step never produced it. */
function readFragment(dir: string, phase: Phase, provider: ProviderId): BakeReport | undefined {
	const file = fragmentPath(dir, phase, provider);
	if (!existsSync(file)) return undefined;
	return JSON.parse(readFileSync(file, "utf8")) as BakeReport;
}

/** The payload file this run writes, honouring `BAKE_REPORT_FILE` exactly as bake.ts does. */
function payloadFile(): string {
	return process.env.BAKE_REPORT_FILE || DEFAULT_PAYLOAD_FILE;
}

/** A flag's value from argv, supporting both `--flag value` and `--flag=value`. Blank/missing → undefined. */
function flagValue(argv: string[], flag: string): string | undefined {
	const eq = argv.find((arg) => arg.startsWith(`${flag}=`));
	if (eq) {
		const value = eq.slice(flag.length + 1).trim();
		return value === "" ? undefined : value;
	}
	const index = argv.indexOf(flag);
	if (index === -1) return undefined;
	const next = argv[index + 1];
	if (next === undefined || next.startsWith("-")) return undefined;
	return next.trim() === "" ? undefined : next;
}

/**
 * The single provider a per-provider subcommand operates on. `--provider` is shared with the scoped
 * forms below, so this insists on EXACTLY one id: a `validate` step handed the whole CSV would boot
 * thirteen sandboxes in a step sized for one, and its fragment would claim to be one provider's
 * verdict while holding another's.
 */
function oneProvider(argv: string[]): ProviderId {
	const selected = requestedProviders(argv);
	if (selected === undefined || selected.length !== 1) {
		throw new Error(
			`--provider must name exactly one provider id for this phase (got ${selected?.join(", ") ?? "nothing"})`,
		);
	}
	return selected[0] as ProviderId;
}

/** The transaction's scope. Absent → every registered provider, matching `promoteAll`'s default. */
function scopeOf(argv: string[]): ProviderId[] | undefined {
	return requestedProviders(argv);
}

/** The scope as a concrete list, for iteration. */
function requestedOf(only: ProviderId[] | undefined): ProviderId[] {
	return only ?? PROVIDERS.map((provider) => provider.id);
}

/** The pinned base ref a per-provider or commit phase works from (the preflight's output). */
function baseRef(argv: string[]): string {
	const ref = flagValue(argv, "--base-ref");
	if (ref === undefined) {
		throw new Error("--base-ref is required — pass the preflight step's `base-ref` output");
	}
	return ref;
}

function reportsDir(argv: string[]): string {
	const dir = flagValue(argv, "--reports-dir") ?? DEFAULT_REPORTS_DIR;
	mkdirSync(dir, { recursive: true });
	return dir;
}

/**
 * Merge the per-provider fragments back into the report list `promoteAll` would have produced, in the
 * same order: every provider REJECTED at re-validation first (registry order), then every eligible
 * provider's version-artifact outcome (registry order). Both halves come straight from the fragments,
 * so the merged list is the split lane's equivalent of `promotionScope.rejected` followed by the
 * step-3 `runs`.
 *
 * A provider with no version artifact ({@link hasVersionArtifact} false) has no `artifact` step to read
 * a fragment from, so its `ok` report is synthesized here — exactly what step 3's no-op branch would
 * have recorded. The only difference from the monolith is the absent `durationMs`, which is an optional
 * diagnostic field measuring a log line.
 */
export function mergeFragments(
	dir: string,
	requested: readonly ProviderId[],
): { reports: BakeReport[]; missing: ProviderId[] } {
	const rejected: BakeReport[] = [];
	const eligible: ProviderId[] = [];
	const missing: ProviderId[] = [];

	for (const provider of requested) {
		const validated = readFragment(dir, "validate", provider);
		if (validated === undefined) {
			missing.push(provider);
			// No verdict is not a pass. Record it as a failure so the gates below see it and the payload
			// tells an operator which step vanished, rather than omitting the provider entirely.
			rejected.push({
				provider,
				status: "failed",
				reason: "candidate re-validation produced no result",
			});
			continue;
		}
		if (validated.status === "ok") eligible.push(provider);
		else rejected.push(validated);
	}

	const runs: BakeReport[] = [];
	for (const provider of eligible) {
		if (!hasVersionArtifact(provider)) {
			runs.push({ provider, status: "ok" });
			continue;
		}
		const built = readFragment(dir, "artifact", provider);
		if (built === undefined) {
			missing.push(provider);
			runs.push({
				provider,
				status: "failed",
				reason: "version artifact step produced no result",
			});
			continue;
		}
		runs.push(built);
	}

	return { reports: [...rejected, ...runs], missing };
}

if (import.meta.main) {
	const log: Log = (m) => console.error(m);
	const argv = process.argv;
	const subcommand = argv[2];

	/** Argument errors exit 2 (a typo, nothing was touched); transaction failures exit 1. Same split
	 *  bake.ts uses, so a workflow can tell "you called it wrong" from "the release did not commit". */
	const usage = (message: string): never => {
		log(`error: ${message}`);
		log(
			"usage: promote-phase <preflight|validate|gate|artifact|commit> --provider <ids> [--base-ref <ref>] [--force] [--phase validate|artifact] [--reports-dir <dir>]",
		);
		process.exit(2);
	};

	try {
		switch (subcommand) {
			case "preflight": {
				const only = scopeOf(argv);
				const force = argv.includes("--force");
				const dir = reportsDir(argv);
				// bake.ts refuses this combination before spending anything; repeat it here because this bin
				// is a second entry point into the same transaction and must not be the lenient one.
				if (isPartialScope(only) && force) {
					usage(
						"--force cannot be combined with a scoped --provider promote — a scoped promote " +
							"backfills providers onto an already-published version, while --force regenerates the " +
							"whole version in place. Pick one.",
					);
				}
				const preflight = await promotePreflight(log, { force, only });
				writeJson(join(dir, "preflight.json"), preflight);
				emitStepOutputs(
					[
						`ok=${preflight.ok}`,
						`partial=${preflight.partial}`,
						`base-ref=${preflight.pinnedBaseImage}`,
					].join("\n"),
				);
				if (!preflight.ok) {
					// Leave a payload behind even though nothing ran: the workflow's `if: always()` upload and
					// the release summary both point at this file, and a refused release is exactly when an
					// operator needs to read it.
					writeJson(payloadFile(), promotePayload(only, preflight.reports));
					process.exit(1);
				}
				break;
			}

			case "validate": {
				const provider = oneProvider(argv);
				const dir = reportsDir(argv);
				const refs = candidateRefsFor(baseRef(argv));
				let report: BakeReport;
				try {
					report = await revalidateProvider(provider, refs, log);
				} finally {
					// Re-validation can boot run.cloud; its retained failed-create cleanup must finish before
					// this step's process exits, exactly as bake.ts drains it around the monolithic promote.
					await drainRuncloudBackgroundWork();
				}
				writeJson(fragmentPath(dir, "validate", provider), report);
				// The step stays green (the gate owns pass/fail) but the log must not be quiet about it.
				if (report.status === "failed") {
					log(
						`::warning title=Candidate re-validation failed::${provider} — ${report.reason ?? "no reason recorded"}`,
					);
				}
				break;
			}

			case "gate": {
				const only = scopeOf(argv);
				const dir = reportsDir(argv);
				const phase = flagValue(argv, "--phase");
				if (phase !== "validate") {
					usage(`--phase must be "validate" (got ${phase ?? "nothing"})`);
				}
				const requested = requestedOf(only);
				const required = effectivePromotionRequirements(requiredProviders(), only);
				const blocks = blocksPromotion(required);
				const reports: BakeReport[] = requested.map(
					(provider) =>
						readFragment(dir, "validate", provider) ?? {
							provider,
							status: "failed",
							reason: "candidate re-validation produced no result",
						},
				);
				for (const report of reports) {
					log(
						`<<< ${report.provider}: ${report.status}${report.reason ? ` — ${report.reason}` : ""}`,
					);
				}
				if (reports.some(blocks)) {
					log(
						"<<< promote aborted — a required provider's candidate re-validation failed (nothing published)",
					);
					writeJson(payloadFile(), promotePayload(only, reports));
					process.exit(1);
				}
				break;
			}

			case "artifact": {
				const provider = oneProvider(argv);
				const dir = reportsDir(argv);
				const pinnedBaseImage = baseRef(argv);
				// A best-effort provider whose re-validation failed must NOT get a published artifact — the
				// same exclusion `promotionScopeAfterValidation` performs between steps 2 and 3. It stays
				// visible in the payload through its validate fragment, which `commit` folds in as rejected.
				const validated = readFragment(dir, "validate", provider);
				if (validated?.status !== "ok") {
					log(
						`>>> ${provider}: skipping version artifact — candidate re-validation was ${validated?.status ?? "never recorded"}`,
					);
					break;
				}
				let runs: Awaited<ReturnType<typeof forEachProviderWithCreds<void>>>;
				try {
					// Through the shared loop rather than calling buildVersionArtifact directly, so this step
					// inherits the identical skip-vs-fail contract (missing creds SKIP, a throw FAILS) and the
					// identical timing the monolith records.
					runs = await forEachProviderWithCreds(
						(selected) => buildVersionArtifact(selected.name, pinnedBaseImage, log),
						{ log, only: [provider] },
					);
				} finally {
					await drainRuncloudBackgroundWork();
				}
				const run = runs.find((candidate) => candidate.provider === provider);
				const report: BakeReport =
					run === undefined
						? { provider, status: "failed", reason: "version artifact produced no result" }
						: {
								provider: run.provider,
								status: run.status,
								...(run.reason ? { reason: run.reason } : {}),
								...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
							};
				writeJson(fragmentPath(dir, "artifact", provider), report);
				log(
					`<<< ${report.provider}: ${report.status}${report.reason ? ` — ${report.reason}` : ""}`,
				);
				if (report.status === "failed") {
					log(
						`::warning title=Version artifact failed::${provider} — ${report.reason ?? "no reason recorded"}`,
					);
				}
				break;
			}

			case "commit": {
				const only = scopeOf(argv);
				const force = argv.includes("--force");
				const dir = reportsDir(argv);
				const pinnedBaseImage = baseRef(argv);
				const { reports, missing } = mergeFragments(dir, requestedOf(only));
				if (missing.length > 0) {
					// Named explicitly: a missing fragment is already recorded as a failure in `reports`, but
					// an operator reading the log should see "a step did not report" rather than infer it.
					log(`!!! no report from: ${missing.join(", ")} — treating each as a failure`);
				}
				let result: Awaited<ReturnType<typeof promoteCommit>>;
				try {
					result = await promoteCommit(log, {
						force,
						only,
						partial: isPartialScope(only),
						pinnedBaseImage,
						reports,
					});
				} finally {
					await drainRuncloudBackgroundWork();
				}
				writeJson(payloadFile(), promotePayload(only, result.reports));
				// The transaction outcome is separate from its diagnostics: an optional provider can fail and
				// stay visible in the payload without turning a successfully published version red.
				process.exit(result.ok ? 0 : 1);
				// Unreachable — process.exit does not return. Present so the switch has no fallthrough.
				break;
			}

			default:
				usage(`unknown subcommand ${subcommand ?? "(none)"}`);
		}
	} catch (err) {
		log(`error: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}
}
