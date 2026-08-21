/**
 * Host ingest: splice one locally-measured provider row into an already-published {@link Run}.
 *
 * This is NOT {@link aggregateRuns}. That merges the per-`(provider, suite, replicate)` shards of a
 * single CI run — every shard shares a runId/sha and carries one replicate slice, and the merge folds
 * them into per-replicate metric breakdowns. A host ingest is the other shape: one provider measured
 * on the agent's own VM, joined to a run that is already aggregated. Feeding an aggregated Run back
 * through the shard merge is not merely wasteful, it is invalid — a folded metric already carries its
 * replicate breakdown, and re-merging it violates the per-replicate host-attribution invariant
 * `runSchema` enforces.
 *
 * Composition is therefore a replace-or-insert by provider id, leaving every other row byte-identical.
 */
import type { ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { parseRun } from "@sandbox-benchmarks/schema";

export interface SpliceProviderRunInput {
	/** The published Run to splice into. Its `targetSpec` and `sourceRunUrl` carry over. */
	base: Run;
	/** The locally-measured row. Replaces any existing row with the same `providerId`. */
	provider: ProviderRun;
	/** Identity of the resulting Run. See `hostIngestRunId` for the composite convention. */
	runId: string;
	sha: string;
	/** Defaults to now. Pass it for reproducible output. */
	generatedAt?: string;
}

/**
 * Replace-or-insert `provider` into `base`, returning a validated v5 Run.
 *
 * Rows are emitted in provider-id order so the document is deterministic regardless of which row was
 * spliced. A pre-v5 base carries no `costEvidence`; v5 requires the array on every row, so the
 * absent ones are filled with `[]` rather than failing validation on rows this ingest never touched.
 */
export function spliceProviderRun(input: SpliceProviderRunInput): Run {
	const { base, provider, runId, sha } = input;
	const providers: ProviderRun[] = [
		...base.providers
			.filter((p) => p.providerId !== provider.providerId)
			.map((p) => ({ ...p, costEvidence: p.costEvidence ?? [] })),
		provider,
	].sort((a, b) => a.providerId.localeCompare(b.providerId));

	return parseRun({
		schemaVersion: "5",
		runId,
		sha,
		generatedAt: input.generatedAt ?? new Date().toISOString(),
		...(base.sourceRunUrl !== undefined ? { sourceRunUrl: base.sourceRunUrl } : {}),
		targetSpec: base.targetSpec,
		providers,
	});
}

/**
 * The Run id for a host ingest: `<baseRunId>+<providerId>-<YYYYMMDD>`.
 *
 * The composite form is load-bearing for provenance, not cosmetic. `LEADERBOARD.md` turns each
 * `+`-separated component of a Run id into a source link, and a purely NUMERIC component is rendered
 * as `/actions/runs/<id>` — so inventing a numeric id for a locally-measured run publishes a link to
 * a workflow run GitHub never issued. A non-numeric component renders as bare code instead, which is
 * exactly what a measurement with no workflow run behind it should look like, while the base
 * component keeps linking to the CI run its other rows really do come from.
 */
export function hostIngestRunId(baseRunId: string, providerId: string, day: Date): string {
	return `${baseRunId}+${providerId}-${day.toISOString().slice(0, 10).replaceAll("-", "")}`;
}
