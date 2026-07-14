// Present a provider's harness-measured lifecycle/control-plane timings — the formatting `bench-lifecycle`
// feeds to its stderr logs and stdout JSON. Kept out of the bin so the catalog-label lookup and rounding
// are unit-testable without driving a real provider. SDK-free: the schema Catalog + the harness result
// shape only.
import type { LifecycleAggregate, LifecycleBenchmark } from "@sandbox-benchmarks/harness";
import { getMetric, HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";

/** The one Metric a lifecycle run exists to capture: the honest cold start (t0 → first ready exec). */
const REQUIRED_METRIC = HARNESS_METRIC_IDS.coldStart;

/**
 * A lifecycle run passed iff it captured the honest cold-start metric at least once. Spawn only times
 * create-resolve, so a provider that spawns but never becomes exec-ready still records spawn/teardown
 * Samples while every cycle records {@link REQUIRED_METRIC} as a failed gap (a spawn that throws every
 * cycle leaves no Samples at all). Without this gate such a run reads `ok` and satisfies `--require`,
 * masking that the provider was never actually measured for the latency the benchmark exists to report
 * — this is `bench-lifecycle`'s analogue of {@link smokeOk}.
 */
export function lifecycleOk(benchmark: LifecycleBenchmark): boolean {
	return benchmark.samples.some((s) => s.operation === REQUIRED_METRIC);
}

/**
 * A human reason for a failed lifecycle run: the gap reason(s) recorded against the cold-start Metric
 * ("sandbox never ready…", a spawn error), else a generic no-samples note. A lifecycle gap is
 * operation-scoped, so it is matched on `id` — the Metric id that produced no Sample.
 */
export function lifecycleFailureReason(benchmark: LifecycleBenchmark): string {
	const reasons = benchmark.gaps.filter((g) => g.id === REQUIRED_METRIC).map((g) => g.reason);
	const detail = reasons.length > 0 ? reasons.join("; ") : "no samples recorded";
	return `no ${REQUIRED_METRIC} sample captured (${detail})`;
}

/** One Metric's distribution, resolved to its catalog label/unit and rounded for display. */
export interface LifecycleMetricSummary {
	metricId: string;
	label: string;
	unit: string;
	p50: number;
	p95: number;
	n: number;
}

/**
 * Round to at most one decimal place so millisecond timings read cleanly without losing sub-ms signal
 * entirely. Stays a `number` (not a fixed-decimal string) so the JSON emit is numeric — a whole value
 * therefore renders as `12`, not `12.0`; the cap is on precision, not on a forced trailing zero.
 */
function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/**
 * Resolve each aggregated Metric against the Catalog for its display label/unit, rounding p50/p95.
 * Falls back to the raw id/`ms` for an id not in the Catalog — a defensive default; in practice every
 * {@link HARNESS_METRIC_IDS} value is catalogued (the schema contract test proves it).
 */
export function summarizeLifecycleAggregates(
	aggregates: readonly LifecycleAggregate[],
): LifecycleMetricSummary[] {
	return aggregates.map((a) => {
		const def = getMetric(a.metricId);
		return {
			metricId: a.metricId,
			label: def?.label ?? a.metricId,
			unit: def?.unit ?? "ms",
			p50: round1(a.aggregates.p50),
			p95: round1(a.aggregates.p95),
			n: a.aggregates.n,
		};
	});
}

/** Human-readable, aligned timing lines (one per Metric) for the per-provider stderr log. */
export function formatLifecycleLines(summaries: readonly LifecycleMetricSummary[]): string[] {
	// Size the label column to the widest label present (floor 16) so alignment survives a future
	// catalog label longer than today's "Exec round-trip" instead of silently breaking.
	const width = Math.max(16, ...summaries.map((s) => s.label.length));
	return summaries.map(
		(s) => `    ${s.label.padEnd(width)} p50=${s.p50}${s.unit} p95=${s.p95}${s.unit} (n=${s.n})`,
	);
}
