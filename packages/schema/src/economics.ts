// The economics Dimension: the $/run comparison axis. Unlike PTS Metrics (parsed from a `<Result>`)
// and harness Metrics (timed by the lifecycle driver), economics Metrics are DERIVED — computed from
// a provider's published pricing ({@link hourlyCostAtTargetSpec}) and the runtime already measured on
// the Run. Schema owns pricing, so it owns this derivation too; the results normalizer calls
// {@link deriveEconomics} and appends the result to each validated ProviderRun.
//
// These MetricDefs are hand-authored (the PTS generator owns only the PTS half of the Catalog) and
// merged into METRIC_CATALOG by catalog.ts after the harness Metrics. The drift gate diffs only the
// generated PTS module, so editing this file never trips it.
import { aggregate } from "./analysis.ts";
import { harnessMetrics } from "./harness-metrics.ts";
import type { MetricDef } from "./metrics.ts";
import type { ProviderMeta } from "./providers.ts";
import { hourlyCostAtTargetSpec } from "./providers.ts";
import type { MetricResult } from "./run.ts";

// The lifecycle-Dimension Metric ids, sourced from the harness slice (the sole owner of lifecycle
// Metrics). Built here rather than via getMetric() so this module never imports catalog.ts — catalog.ts
// imports economicsMetrics, and a back-edge would be a cycle. PTS never emits lifecycle Metrics, so the
// harness slice is the complete set.
const LIFECYCLE_METRIC_IDS = new Set(
	harnessMetrics.filter((m) => m.dimension === "lifecycle").map((m) => m.id),
);

/**
 * The stable id for each derived economics Metric — the one source of truth shared by the MetricDefs
 * below and {@link deriveEconomics}, so the value a provider emits is always a catalogued id.
 */
export const ECONOMICS_METRIC_IDS = {
	/** Hourly cost at the pinned target spec — the price/performance denominator. */
	usdPerHour: "usd_per_hour",
	/** Cost of one measured sandbox lifecycle (spawn→exec→snapshot→teardown) at the target spec. */
	usdPerLifecycle: "usd_per_lifecycle",
} as const;

/** A derived economics Metric id — a value of {@link ECONOMICS_METRIC_IDS}. */
export type EconomicsMetricId = (typeof ECONOMICS_METRIC_IDS)[keyof typeof ECONOMICS_METRIC_IDS];

const LIB = "LIB";
const MS_PER_HOUR = 3_600_000;

/**
 * The economics Catalog slice, in display order. Both entries are `derived:true` — never parsed or
 * timed, always computed from pricing + measured runtime. Exactly one `headline:true` (usd_per_hour),
 * the invariant catalog.ts enforces at load. No `pts` field, so the PTS-mapping invariant skips them.
 */
export const economicsMetrics: MetricDef[] = [
	{
		id: ECONOMICS_METRIC_IDS.usdPerHour,
		dimension: "economics",
		unit: "USD/hr",
		direction: LIB,
		headline: true,
		label: "Hourly cost",
		description:
			"USD per hour to run a sandbox at the pinned target spec (2 vCPU / 8 GiB), from the provider's published per-vCPU/per-GiB rates. The price/performance denominator; null-rated providers emit nothing.",
		derived: true,
	},
	{
		id: ECONOMICS_METRIC_IDS.usdPerLifecycle,
		dimension: "economics",
		unit: "USD",
		direction: LIB,
		headline: false,
		label: "Cost per lifecycle",
		description:
			"USD to run one measured sandbox lifecycle (sum of the measured lifecycle timings — spawn, exec, snapshot, teardown) at the target hourly cost. Emitted only when the Run carries lifecycle timings.",
		derived: true,
	},
];

/** One measured Metric's id and the mean of its Samples — the input {@link deriveEconomics} reads. */
export interface MeasuredMetric {
	metricId: string;
	mean: number;
}

/**
 * Derive a provider's economics Metrics from its pricing and the runtime already measured on the Run.
 * Returns ready-to-embed {@link MetricResult}s (single-Sample distributions) for the normalizer to
 * append to the ProviderRun.
 *
 * - `usd_per_hour` — {@link hourlyCostAtTargetSpec}; emitted whenever the provider has a vetted rate.
 * - `usd_per_lifecycle` — the hourly cost prorated over the summed measured lifecycle timings;
 *   emitted only when `measured` carries ≥1 lifecycle-Dimension Metric.
 *
 * Returns `[]` for an unknown/unpriced provider so a null rate can never read as free. Pure — `meta`
 * and `measured` are the only inputs, so this is unit-testable without a Run.
 */
export function deriveEconomics(
	meta: ProviderMeta,
	measured: readonly MeasuredMetric[],
): MetricResult[] {
	const hourly = hourlyCostAtTargetSpec(meta);
	if (hourly === null) return [];

	const results: MetricResult[] = [economicsResult(ECONOMICS_METRIC_IDS.usdPerHour, hourly)];

	// Sum the means of every measured lifecycle-Dimension Metric (ms). Driven by the lifecycle-id set
	// (built from the harness slice) so it stays correct as new lifecycle Metrics are added there.
	let lifecycleMs = 0;
	let lifecycleCount = 0;
	for (const m of measured) {
		if (LIFECYCLE_METRIC_IDS.has(m.metricId)) {
			lifecycleMs += m.mean;
			lifecycleCount += 1;
		}
	}
	if (lifecycleCount > 0) {
		results.push(
			economicsResult(ECONOMICS_METRIC_IDS.usdPerLifecycle, hourly * (lifecycleMs / MS_PER_HOUR)),
		);
	}

	return results;
}

/** A derived economics Metric as a single-Sample MetricResult (n=1, stdev=0). */
function economicsResult(metricId: EconomicsMetricId, value: number): MetricResult {
	return { metricId, samples: [value], aggregates: aggregate([value]) };
}
