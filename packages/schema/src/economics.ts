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
	/** Cost of one end-to-end compute/realworld pipeline at the target spec, from a supplied runtime. */
	usdPerComputeRun: "usd_per_compute_run",
} as const;

/** A derived economics Metric id — a value of {@link ECONOMICS_METRIC_IDS}. */
export type EconomicsMetricId = (typeof ECONOMICS_METRIC_IDS)[keyof typeof ECONOMICS_METRIC_IDS];

const LIB = "LIB";
const MS_PER_HOUR = 3_600_000;

/**
 * The economics Catalog slice, in display order. All three entries are `derived:true` — never parsed or
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
			"USD per hour to run a sandbox at the pinned target spec (4 vCPU / 8 GiB), from the provider's published per-vCPU/per-GiB rates. The price/performance denominator; null-rated providers emit nothing.",
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
	{
		id: ECONOMICS_METRIC_IDS.usdPerComputeRun,
		dimension: "economics",
		unit: "USD",
		direction: LIB,
		headline: false,
		label: "Cost per compute run",
		description:
			"USD to run one end-to-end compute/realworld pipeline at the target hourly cost (hourly × the pipeline's wall-clock runtime). Burst-priced: you pay only for the seconds the sandbox is alive. Emitted only when a total-runtime input is supplied; OURS has no realworld suite yet, so today's Runs omit it.",
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
 * - `usd_per_compute_run` — the hourly cost prorated over a whole compute/realworld pipeline's
 *   wall-clock runtime, supplied via `runtimeMs`. OURS has no realworld suite yet, so this is
 *   omitted unless a caller passes a positive runtime — we never fabricate a pipeline duration.
 *
 * Returns `[]` for an unknown/unpriced provider so a null rate can never read as free. Pure — `meta`,
 * `measured`, and `runtimeMs` are the only inputs, so this is unit-testable without a Run.
 */
export function deriveEconomics(
	meta: ProviderMeta,
	measured: readonly MeasuredMetric[],
	runtimeMs?: number,
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
			economicsResult(ECONOMICS_METRIC_IDS.usdPerLifecycle, burstCostPerRun(hourly, lifecycleMs)),
		);
	}

	// usd_per_compute_run — the cost of a full compute/realworld pipeline, billed burst-style over the
	// runtime the caller measured. Gated on a positive finite runtime so a missing suite (undefined) or
	// a 0/NaN can never read as a free run; OURS has no realworld suite, so live Runs omit it today.
	if (runtimeMs !== undefined && Number.isFinite(runtimeMs) && runtimeMs > 0) {
		results.push(
			economicsResult(ECONOMICS_METRIC_IDS.usdPerComputeRun, burstCostPerRun(hourly, runtimeMs)),
		);
	}

	return results;
}

/**
 * Burst (pay-per-use) cost of one run: you pay only for the wall-clock the sandbox is alive, so the
 * cost scales linearly with runtime. The model behind every runtime economics Metric here
 * (`usd_per_lifecycle`, `usd_per_compute_run`) — the serverless/per-second default.
 */
export function burstCostPerRun(hourlyUsd: number, runtimeMs: number): number {
	return hourlyUsd * (runtimeMs / MS_PER_HOUR);
}

/**
 * Fixed-infra amortized cost of one run: a reserved box bills `monthlyUsd` whether busy or idle, so
 * the cost *attributable* to a single run is that fixed bill spread across the runs it serves that
 * month. Per-run cost therefore FALLS as utilization rises — the mirror image of
 * {@link burstCostPerRun}. `runsPerMonth <= 0` returns `Infinity` (a box that serves no runs
 * amortizes its bill over nothing). Ported in spirit from THEIRS `compute_costs` `ec2_full`
 * (variable per-run + a `monthly_fixed` overhead), kept as a documented helper rather than a
 * catalogued Metric since OURS prices no reserved infra yet.
 */
export function amortizedCostPerRun(monthlyUsd: number, runsPerMonth: number): number {
	return runsPerMonth > 0 ? monthlyUsd / runsPerMonth : Number.POSITIVE_INFINITY;
}

/**
 * The break-even utilization between the two models: the runs/month at which a fixed-infra box's
 * amortized per-run cost equals burst's. Below it burst wins (idle infra wastes the fixed bill);
 * above it the reserved box wins. From equating the two —
 *   monthlyUsd / runsPerMonth = hourlyUsd × runtimeHours  ⇒  runsPerMonth = monthlyUsd / burstCost.
 * Returns `Infinity` when a run's burst cost is 0 (no per-run cost to amortize against).
 */
export function amortizationBreakEvenRunsPerMonth(
	monthlyUsd: number,
	hourlyUsd: number,
	runtimeMs: number,
): number {
	const burst = burstCostPerRun(hourlyUsd, runtimeMs);
	return burst > 0 ? monthlyUsd / burst : Number.POSITIVE_INFINITY;
}

/** A derived economics Metric as a single-Sample MetricResult (n=1, stdev=0). */
function economicsResult(metricId: EconomicsMetricId, value: number): MetricResult {
	return { metricId, samples: [value], aggregates: aggregate([value]) };
}
