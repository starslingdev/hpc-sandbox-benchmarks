/** Cost per pipeline run (see CONTEXT.md): billed where bills cover the suite, else estimated. */
import type { ProviderRun, SuiteName, TargetSpec } from "@sandbox-benchmarks/schema";
import {
	aggregate,
	burstCostPerRun,
	fullHourlyPrice,
	getMetric,
	getProvider,
	percentileOf,
	SUITES,
} from "@sandbox-benchmarks/schema";
import type { MeasuredCostProvider } from "./measured-cost.ts";

export interface PipelineCostRow {
	providerId: string;
	displayName: string;
	billed: boolean;
	/** `Billed`, or `Estimated` with `(at most)` / `(at least)`. */
	basis: string;
	/** USD: median, lowest and highest sandbox; then the median pipeline seconds. */
	value: number;
	lo: number;
	hi: number;
	sandboxes: number;
	seconds: number;
}

/** Rows cheapest first. */
export type PipelineCostSuite = { suite: SuiteName; suiteName: string; rows: PipelineCostRow[] };

const BOUND = { exact: "", at_most: " (at most)", at_least: " (at least)" } as const;

/** Pipeline-step seconds per sandbox that reported every task the provider reported. */
function completedSandboxes(provider: ProviderRun, suite: SuiteName): Map<number, number> {
	const ids: readonly string[] = SUITES[suite].metrics;
	const tasks = provider.metrics.filter(
		(m) => ids.includes(m.metricId) && getMetric(m.metricId)?.unit === "Seconds",
	);
	const sums = new Map<number, { sum: number; n: number }>();
	for (const task of tasks) {
		for (const { index, samples } of task.replicates ?? [{ index: 0, samples: task.samples }]) {
			const e = sums.get(index) ?? { sum: 0, n: 0 };
			sums.set(index, { sum: e.sum + percentileOf(samples, 0.5), n: e.n + 1 });
		}
	}
	return new Map([...sums].flatMap(([i, e]) => (e.n === tasks.length ? [[i, e.sum]] : [])));
}

function rowOf(
	provider: ProviderRun,
	suite: SuiteName,
	measuredCost: readonly MeasuredCostProvider[],
	targetSpec: TargetSpec,
): PipelineCostRow | undefined {
	const measured = measuredCost.find((m) => m.providerId === provider.providerId);
	const completed = completedSandboxes(provider, suite);
	if (completed.size === 0) return undefined;
	const meta = getProvider(provider.providerId);
	const durations = [...completed.values()];
	const base = {
		providerId: provider.providerId,
		displayName: meta?.displayName ?? provider.providerId,
		seconds: aggregate(durations).p50,
	};
	const spread = (costs: number[]) => {
		const { p50, min, max } = aggregate(costs);
		return { value: p50, lo: min, hi: max, sandboxes: costs.length };
	};
	const bills = measured?.suites.find((s) => s.suite === suite);
	if (bills?.median != null && measured?.currency === "USD") {
		return { ...base, billed: true, basis: "Billed", ...spread(bills.amounts) };
	}
	const price = meta ? fullHourlyPrice(meta, targetSpec) : null;
	if (price === null) return undefined;
	const costs = durations.map((s) => burstCostPerRun(price.usdPerHour, s * 1000));
	return { ...base, billed: false, basis: `Estimated${BOUND[price.accuracy]}`, ...spread(costs) };
}

/** Cost per pipeline run for every realworld suite a provider completed. */
export function buildPipelineCost(
	providers: readonly ProviderRun[],
	measuredCost: readonly MeasuredCostProvider[],
	targetSpec: TargetSpec,
): PipelineCostSuite[] {
	return (Object.keys(SUITES) as SuiteName[])
		.filter((suite) => SUITES[suite].wave === "realworld" && SUITES[suite].ptsTimesToRun === 1)
		.flatMap((suite) => {
			const rows = providers
				.flatMap((p) => rowOf(p, suite, measuredCost, targetSpec) ?? [])
				.sort((a, b) => a.value - b.value || a.providerId.localeCompare(b.providerId, "en"));
			const label = getMetric(SUITES[suite].metrics[0] ?? "")?.label.split(":")[0] ?? suite;
			return rows.length === 0 ? [] : [{ suite, suiteName: label, rows }];
		});
}
