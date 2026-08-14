/**
 * The promote gate and publish, shared by the `promote` bin and `bench-local --promote`.
 *
 * Both lanes publish a Run into a dataset, and both must refuse the same thing: a Run with nothing
 * validated. That rule is the reason the candidate→promote split exists (ADR-0004) — a partial
 * collection with no real metrics must never reach a published dataset — so it belongs in one place
 * rather than being restated by each caller. What the callers still own is their own reporting: the
 * bin renders an Actions job summary, the local runner writes a line to stderr.
 */
import { join } from "node:path";
import { writeRunDocument } from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";

/** A Run that failed the promote gate. Thrown, not returned, so no caller can publish past it. */
export class PromoteGateError extends Error {}

export interface PromotedRun {
	/** Where the Run document was written. */
	outFile: string;
	/** How many providers reached `validated` — the gate's own count, for the caller's report. */
	validated: number;
}

/** How many providers in `run` carry at least one catalogued metric. */
export function validatedProviderCount(run: Run): number {
	return run.providers.filter((provider) => provider.validationStatus === "validated").length;
}

/**
 * Gate `run`, then publish it into `datasetDir` (`runs/<id>.json` plus the newest-first index).
 *
 * @throws PromoteGateError when no provider validated.
 */
export function promoteRun(run: Run, datasetDir: string): PromotedRun {
	const validated = validatedProviderCount(run);
	// Gate FIRST: a Run with nothing validated (a partial collection, a suite that produced no PTS
	// XML, a local run whose every precondition was unmet) must never reach a published dataset.
	if (validated === 0) {
		throw new PromoteGateError("refusing to promote a Run with zero validated providers");
	}
	const outFile = join(datasetDir, "runs", `${run.runId}.json`);
	writeRunDocument(run, outFile, join(datasetDir, "index.json"));
	return { outFile, validated };
}
