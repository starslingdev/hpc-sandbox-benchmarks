/**
 * Aggregate the per-shard {@link Run}s of one benchmark run into a single published Run. The CI matrix
 * (ENG-66) fans out one job per `(provider, suite)` cell, each emitting a Run document where only that
 * cell's provider/suite carries data. This merges them back into the one Run the dataset publishes:
 * each provider's measured Metrics unioned across suites, coverage/gaps/uncatalogued/observed-specs
 * combined, and — critically — economics RE-DERIVED from the merged measured set so `usd_per_lifecycle`
 * reflects every suite's timings, not whichever shard happened to carry them.
 *
 * SDK-free — schema + the Run model only. Validates the result at the boundary (parseRun), so an
 * inconsistent merge fails here rather than reaching a consumer.
 */
import type {
	MetricResult,
	ObservedSpecs,
	ProviderRun,
	ResultGap,
	Run,
	UncataloguedResult,
} from "@sandbox-benchmarks/schema";
import { deriveEconomics, getMetric, getProvider, parseRun } from "@sandbox-benchmarks/schema";

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

/** Merge one provider's slice across every shard that carried it. */
function mergeProvider(providerId: string, slices: readonly ProviderRun[]): ProviderRun {
	// Union measured metrics by id, keeping the first occurrence (deterministic shard order). One
	// <Result> owns a metric's samples, so the same id in two shards is a duplicate, not extra passes.
	const measured = new Map<string, MetricResult>();
	for (const slice of slices) {
		for (const metric of slice.metrics) {
			if (isMeasured(metric) && !measured.has(metric.metricId)) {
				measured.set(metric.metricId, metric);
			}
		}
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

	for (const slice of slices) {
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
			runs.flatMap((run) => run.providers.filter((p) => p.providerId === id)),
		),
	);

	// Latest shard timestamp (ISO-8601 sorts lexicographically) — the run is "as of" its last shard.
	const generatedAt = runs.map((run) => run.generatedAt).sort((a, b) => a.localeCompare(b))[
		runs.length - 1
	];
	const sourceRunUrl = runs.find((run) => run.sourceRunUrl !== undefined)?.sourceRunUrl;

	return parseRun({
		schemaVersion: "2",
		runId: first.runId,
		sha: first.sha,
		generatedAt,
		...(sourceRunUrl !== undefined ? { sourceRunUrl } : {}),
		targetSpec: first.targetSpec,
		providers,
	});
}
