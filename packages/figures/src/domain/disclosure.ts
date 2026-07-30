/**
 * Disclosures derived from the run's own provenance.
 *
 * Pure and parameterized rather than bound to one dataset: a caller holding a DIFFERENT
 * dataset (the share-image composites, and the fixtures that test them) derives the same
 * disclosure from its own provenance instead of inheriting the site's. A composite that
 * drops this note publishes a backfilled number, outside the site, with nothing attached
 * saying it came from another run's target spec.
 */
import type { SandboxBenchmarkData } from "./types.ts";

/** Backfill disclosure for the all-metrics table — DERIVED from the data's own
 *  backfill provenance so the legend cannot drift from what was actually
 *  filled. Null when the run needed no backfill. */
export function backfillNoteOf(backfill: SandboxBenchmarkData["backfill"]): string | null {
	return backfill
		? `‡ ${backfill.cells.length} cell${backfill.cells.length === 1 ? "" : "s"} backfilled from run ${backfill.runId} (${backfill.date}, ${backfill.targetSpec.vcpus} vCPU target); the primary run did not emit them.`
		: null;
}
