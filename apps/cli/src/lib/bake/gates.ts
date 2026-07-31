// The single source of truth for the BLOCKING-FAILURE rule — "does this failed bake/promote report fail
// the job?" — shared by the candidate bake loop, the promote transaction, and the job-summary renderer
// so the three can never disagree about what a red build means. (The complementary gate, a REQUIRED
// provider that merely SKIPPED, is the harness `unmetRequirements`; a skip is not a failure, so it lives
// there and the callers check both.)
//
// The rule the whole release lane turns on:
//   • A failed report for a NON-provider id — the IMAGE_REPORT sentinel promote.ts records its
//     release-plumbing under (the base retag commit point / a pre-publish abort), or any UNRECOGNIZED
//     id — ALWAYS blocks. Failing closed on an unknown id means a mislabelled provider surfaces as a
//     hard failure rather than silently slipping through as "not required".
//   • A failed report for a real provider blocks IFF that provider is `required`. Non-required
//     ("best-effort") providers — daytona-container, modal-vm, novita, blaxel until a committed run
//     proves them — are recorded and warned, but must never fail a release whose required set passed.
//   • Locally (nothing required) any failure blocks, as a safety net for a hand-run bake/promote.
//
// This is deliberately NOT `reports.some(r => r.status === "failed")`: that blunt check is what made
// run 29896891577's promote job go red AFTER it had already published :v5 — a non-required
// daytona-container failure was counted as fatal even though the release intentionally shipped without
// it. Gate on `blockingFailures` instead, everywhere the exit code is decided.
import { PROVIDERS } from "@sandbox-benchmarks/schema";

/** Registered provider ids. A report whose id is NOT one of these is a synthetic release-step record
 *  (see {@link IMAGE_REPORT}) or an unrecognized id — either way it fails closed (always blocks). */
const PROVIDER_IDS: ReadonlySet<string> = new Set(PROVIDERS.map((p) => p.id));

/** The id promote.ts records its release-plumbing steps under — the base-retag commit point and every
 *  pre-publish abort (version already published, re-validation failed, required artifact failed). It is
 *  NOT a provider, so a failure here is the release itself failing and always blocks. */
export const IMAGE_REPORT = "image";

/** The minimal report shape the gate reads — structural so both a bake/promote {@link
 *  import("./types.ts").BakeReport} and a raw provider-run fit without coupling. */
export interface GateReport {
	provider: string;
	status: string;
}

/** Whether a FAILURE of this id blocks the release — independent of the report's current status, so the
 *  summary can label an ok/skipped row the same way a failure is judged. A non-provider id (the
 *  IMAGE_REPORT sentinel, or any unrecognized id) always blocks; a real provider blocks iff it is
 *  required — or, in the lenient local default (nothing required), always. */
export function isBlockingId(provider: string, required: readonly string[]): boolean {
	if (!PROVIDER_IDS.has(provider)) return true;
	return required.length === 0 || required.includes(provider);
}

/** True when this report is a failure that must fail the job (block the release). See the module note. */
export function isBlockingFailure(report: GateReport, required: readonly string[]): boolean {
	return report.status === "failed" && isBlockingId(report.provider, required);
}

/** The failed reports that block the release (see {@link isBlockingFailure}). Empty ⇒ safe to exit 0. */
export function blockingFailures<T extends GateReport>(
	reports: readonly T[],
	required: readonly string[],
): T[] {
	return reports.filter((r) => isBlockingFailure(r, required));
}

/** The failed reports that are best-effort (non-blocking): surfaced as warnings, never a job failure.
 *  Sentinels always block, so `!isBlockingFailure` already excludes them — what remains is a real,
 *  non-required provider that failed. In the local default (nothing required) this is empty, since there
 *  every failure blocks. */
export function nonBlockingFailures<T extends GateReport>(
	reports: readonly T[],
	required: readonly string[],
): T[] {
	return reports.filter((r) => r.status === "failed" && !isBlockingFailure(r, required));
}
