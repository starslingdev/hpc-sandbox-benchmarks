/**
 * Aggregate the per-shard {@link Run}s of one benchmark run into a single published Run. The CI matrix
 * fans out one job per `(provider, suite, replicate)` cell, each emitting a Run document where only that
 * cell's provider/suite carries data (and, on a v3 shard, its {@link Run.replicateIndex}). This merges
 * them back into the one Run the dataset publishes: each provider's measured Metrics unioned across
 * suites, coverage/gaps/uncatalogued/observed-specs combined, and — critically — economics RE-DERIVED
 * from the merged measured set so `usd_per_lifecycle` reflects every suite's timings, not whichever shard
 * happened to carry them.
 *
 * Replicate sandboxes report the SAME metric id (they ran the same suite), so the merge folds them by id:
 * ≥2 replicate slices of one metric become a {@link MetricResult.replicates} breakdown with a pooled
 * `samples`/`aggregates` recomputed across all of them, while a metric seen in a single replicate is kept
 * verbatim (the R = 1 path — byte-identical to the pre-replicate merge). A repeated id WITHIN one
 * replicate is still a duplicate (result-name contamination), so first-wins survives at that level.
 *
 * SDK-free — schema + the Run model only. Validates the result at the boundary (parseRun), so an
 * inconsistent merge fails here rather than reaching a consumer.
 */
import type {
	HostMetadataRecord,
	MetricReplicate,
	MetricResult,
	ObservedSpecs,
	ProviderRun,
	ResultGap,
	Run,
	UncataloguedResult,
} from "@sandbox-benchmarks/schema";
import {
	aggregate,
	deriveEconomics,
	getMetric,
	getProvider,
	parseRun,
} from "@sandbox-benchmarks/schema";

/**
 * Field separator for the composite dedupe keys below. A NUL can't occur in a suite name, a reason, or
 * an error message, so it can't be forged into a collision by real data — and it is written as an escape
 * rather than a literal control character in a template string (which makes git read the file as binary).
 */
const NUL = "\u0000";

/** A measured (non-derived) Metric: one a suite actually produced, vs. a derived economics Metric. */
function isMeasured(metric: MetricResult): boolean {
	// Derived metrics (economics) are recomputed post-merge; everything else is real measurement.
	return getMetric(metric.metricId)?.derived !== true;
}

/** One provider's slice from one shard, tagged with the replicate sandbox the shard was measured under. */
interface ReplicateSlice {
	slice: ProviderRun;
	replicateIndex: number;
}

/**
 * Fold one metric id's per-replicate slices into a single {@link MetricResult}. A single replicate is
 * returned verbatim (the R = 1 path stays byte-identical to the old first-wins union). Two or more become
 * a {@link MetricResult.replicates} breakdown — replicates ordered by index, `samples` the pooled union
 * in that order, `aggregates` recomputed over the pool — so the cluster structure survives for the
 * hierarchical-bootstrap inference while the pooled median stays the ranking value. Provenance
 * (`sourceFile`/`appVersion`/`arguments`) is carried from the lowest-index replicate.
 */
function mergeMetricReplicates(byReplicate: Map<number, MetricResult>): MetricResult {
	const indices = [...byReplicate.keys()].sort((a, b) => a - b);
	const first = byReplicate.get(indices[0] as number) as MetricResult;
	if (indices.length === 1) return first;

	const replicates: MetricReplicate[] = indices.map((index) => ({
		index,
		samples: [...(byReplicate.get(index) as MetricResult).samples],
	}));
	const pooled = replicates.flatMap((r) => r.samples);
	return {
		metricId: first.metricId,
		samples: pooled,
		aggregates: aggregate(pooled),
		...(first.sourceFile !== undefined ? { sourceFile: first.sourceFile } : {}),
		...(first.appVersion !== undefined ? { appVersion: first.appVersion } : {}),
		...(first.arguments !== undefined ? { arguments: first.arguments } : {}),
		replicates,
	};
}

/** Merge one provider's slices across every replicate shard that carried it. */
function mergeProvider(providerId: string, entries: readonly ReplicateSlice[]): ProviderRun {
	const slices = entries.map((entry) => entry.slice);
	// Group measured metrics by id, then by the replicate that produced them. A metric id recurring across
	// replicate shards is R distinct sandboxes (folded into the replicate structure below); a metric id
	// recurring WITHIN one replicate is a duplicate (one <Result> owns a metric's samples — result-name
	// contamination), so first-wins survives at the per-replicate level.
	const byMetric = new Map<string, Map<number, MetricResult>>();
	for (const { slice, replicateIndex } of entries) {
		for (const metric of slice.metrics) {
			if (!isMeasured(metric)) continue;
			let byReplicate = byMetric.get(metric.metricId);
			if (!byReplicate) {
				byReplicate = new Map<number, MetricResult>();
				byMetric.set(metric.metricId, byReplicate);
			}
			if (!byReplicate.has(replicateIndex)) byReplicate.set(replicateIndex, metric);
		}
	}
	const measured = new Map<string, MetricResult>();
	for (const [metricId, byReplicate] of byMetric) {
		measured.set(metricId, mergeMetricReplicates(byReplicate));
	}

	// Gaps deduped by (scope, id, outcome, reason); uncatalogued stragglers by id — both can recur across
	// shards. `outcome` belongs in the key: one shard skipping a suite on a disk precondition while another
	// attempted it and crashed are two distinct facts about the provider, and folding them into one would
	// silently drop whichever arrived second.
	const gaps: ResultGap[] = [];
	const seenGap = new Set<string>();
	// Coverage unions across shards: the matrix fans out one job per (provider, suite), so each shard sees
	// only its own cell. A suite is covered for this provider iff SOME shard produced a Metric for it.
	const suitesCovered = new Set<string>();
	const uncatalogued: UncataloguedResult[] = [];
	const seenStraggler = new Set<string>();
	// observed-specs: first non-undefined value per key wins (all shards of a provider ran the same spec).
	const observedSpecs: ObservedSpecs = {};
	let specMatched: boolean | undefined;
	// Cross-shard hardware heterogeneity: shards of one provider are MEANT to be the same machine, so a
	// divergent host cpuModel means the provider scheduled them onto different hardware — a confound the
	// published Run must disclose. cpuModel is the key (cpuMicroarch is derived from it, so distinct
	// microarchs can't arise without distinct models); collect the distinct disclosures, publish below.
	const hostCpuModels = new Set<string>();
	const hostMetadata: HostMetadataRecord[] = [];
	const seenHostMetadata = new Set<string>();

	for (const slice of slices) {
		for (const record of slice.hostMetadata ?? []) {
			const key = JSON.stringify(record);
			if (seenHostMetadata.has(key)) continue;
			seenHostMetadata.add(key);
			hostMetadata.push(record);
		}
		for (const suite of slice.suitesCovered) suitesCovered.add(suite);
		for (const gap of slice.gaps) {
			const key = [gap.scope, gap.id, gap.outcome, gap.reason].join(NUL);
			if (seenGap.has(key)) continue;
			seenGap.add(key);
			gaps.push(gap);
		}
		for (const straggler of slice.uncatalogued) {
			if (seenStraggler.has(straggler.id)) continue;
			seenStraggler.add(straggler.id);
			uncatalogued.push(straggler);
		}
		for (const [key, value] of Object.entries(slice.observedSpecs)) {
			if (value !== undefined && !(key in observedSpecs)) {
				(observedSpecs as Record<string, unknown>)[key] = value;
			}
		}
		if (slice.observedSpecs.cpuModel) hostCpuModels.add(slice.observedSpecs.cpuModel);
		// specMatched folds ORDER-INDEPENDENTLY across shards (was first-shard-wins, which made ranking
		// eligibility depend on shard arrival order). The merged provider row shares one aggregate, so a
		// single shard that ran off the target spec (specMatched === false) contaminates it and
		// disqualifies the whole provider — false is sticky and always wins. An affirmative match stands
		// only while no shard contradicts it; all-undefined stays undefined ("refuse to judge on partial
		// evidence", see computeSpecMatched).
		if (slice.specMatched === false) specMatched = false;
		else if (slice.specMatched === true && specMatched !== false) specMatched = true;
	}

	// Disclose the distinct host CPUs when the shards saw more than one — names the confound rather than
	// hiding it behind the "first-wins" cpuModel merged above. Sorted for deterministic output.
	if (hostCpuModels.size > 1) {
		observedSpecs.hostCpuModels = [...hostCpuModels].sort((a, b) => a.localeCompare(b));
	}

	const metrics = [...measured.values()];
	// Re-derive economics from the FULL merged measured set so $/lifecycle sums every suite's timings,
	// not just the shard that carried them. Gated on ≥1 measured metric (as in normalize), so economics
	// enriches a validated provider and never promotes a pending one.
	const meta = getProvider(providerId);
	if (meta && metrics.length > 0) {
		metrics.push(
			...deriveEconomics(
				meta,
				metrics.map((m) => ({ metricId: m.metricId, mean: m.aggregates.mean })),
			),
		);
	}
	metrics.sort((a, b) => a.metricId.localeCompare(b.metricId));

	return {
		providerId,
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		...(specMatched !== undefined ? { specMatched } : {}),
		observedSpecs,
		...(hostMetadata.length > 0 ? { hostMetadata } : {}),
		metrics,
		suitesCovered: [...suitesCovered].sort((a, b) => a.localeCompare(b)),
		gaps,
		uncatalogued,
	};
}

/**
 * Merge the per-shard Runs of one benchmark run into a single validated Run. All shards must share
 * `runId` and `sha` (they are slices of one run); `generatedAt` resolves to the latest shard's. Throws
 * on an empty input or a shard-identity mismatch, and validates the merged Run at the boundary.
 */
export function aggregateRuns(runs: readonly Run[]): Run {
	if (runs.length === 0) {
		throw new Error("aggregateRuns requires at least one shard Run");
	}
	const first = runs[0];
	if (!first) throw new Error("aggregateRuns requires at least one shard Run");
	for (const run of runs) {
		if (run.runId !== first.runId || run.sha !== first.sha) {
			throw new Error(
				`aggregateRuns: shard identity mismatch — expected runId=${first.runId} sha=${first.sha}, got runId=${run.runId} sha=${run.sha}`,
			);
		}
	}

	// Every provider present in any shard, sorted for deterministic output.
	const providerIds = [
		...new Set(runs.flatMap((run) => run.providers.map((p) => p.providerId))),
	].sort((a, b) => a.localeCompare(b));

	const providers = providerIds.map((id) =>
		mergeProvider(
			id,
			// Carry each shard's replicate index alongside its slice so the merge can key the replicate
			// breakdown by it. A shard without one (a legacy v2 shard) is replicate 0 — so a run of such
			// shards folds every metric into a single replicate and stays byte-identical to the old merge.
			runs.flatMap((run) =>
				run.providers
					.filter((p) => p.providerId === id)
					.map((slice) => ({ slice, replicateIndex: run.replicateIndex ?? 0 })),
			),
		),
	);

	// Latest shard timestamp (ISO-8601 sorts lexicographically) — the run is "as of" its last shard.
	const generatedAt = runs.map((run) => run.generatedAt).sort((a, b) => a.localeCompare(b))[
		runs.length - 1
	];
	const sourceRunUrl = runs.find((run) => run.sourceRunUrl !== undefined)?.sourceRunUrl;

	// The merged Run spans every replicate, so it carries no single `replicateIndex` — that lived on the
	// shards. Emit v3 (the replicate-aware schema); v2 shards read in above validate unchanged.
	return parseRun({
		schemaVersion: "3",
		runId: first.runId,
		sha: first.sha,
		generatedAt,
		...(sourceRunUrl !== undefined ? { sourceRunUrl } : {}),
		targetSpec: first.targetSpec,
		providers,
	});
}
