// Cost models for a single benchmark run: the pure pricing math the economics Dimension is built on.
// Two models — burst (pay-per-use) and fixed-infra amortized — plus the break-even utilization between
// them. Pure functions with no schema dependencies, so they are unit-testable in isolation. The derived
// economics MetricDefs and the deriveEconomics() derivation that consume burstCostPerRun land in the
// next PR up the stack.

const MS_PER_HOUR = 3_600_000;

/**
 * Burst (pay-per-use) cost of one run: you pay only for the wall-clock the sandbox is alive, so the
 * cost scales linearly with runtime. The model behind every runtime economics Metric
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
