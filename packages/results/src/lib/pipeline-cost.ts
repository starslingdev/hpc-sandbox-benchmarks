/**
 * Cost per pipeline run (see CONTEXT.md): the timed steps of one pipeline run, priced from the
 * provider's bills where every sandbox has a splittable one, else estimated from published prices.
 */
import type { ProviderRun, SuiteName, TargetSpec } from "@sandbox-benchmarks/schema";
import {
	aggregate,
	billedWallSeconds,
	burstCostPerRun,
	fullHourlyPrice,
	getMetric,
	getProvider,
	percentileOf,
	SUITES,
} from "@sandbox-benchmarks/schema";

export interface PipelineCostRow {
	providerId: string;
	displayName: string;
	billed: boolean;
	/** `Billed` (each bill's share for the timed steps), or `Estimated` with `(at most)` / `(at least)`. */
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

/**
 * Each completed sandbox's bill × its timed ÷ billed seconds: the provider's real billed rate over
 * the window the estimate prices (docs/methodology.md, "Cost per pipeline run"). All or nothing: one
 * bill that cannot be split sends the whole row to the estimate.
 */
function billedShares(
	provider: ProviderRun,
	suite: SuiteName,
	completed: ReadonlyMap<number, number>,
): number[] | undefined {
	const bills = new Map(
		(provider.costEvidence ?? []).flatMap((record) =>
			record.kind === "observed" && record.cell.suite === suite
				? [[record.cell.replicateIndex ?? 0, record] as const]
				: [],
		),
	);
	const shares: number[] = [];
	for (const [index, timed] of completed) {
		const bill = bills.get(index);
		const billed = bill?.currency === "USD" ? billedWallSeconds(bill) : undefined;
		// A billed lifetime shorter than the timed steps inside it is a mismatched record, not a bill.
		if (bill === undefined || billed === undefined || billed < timed) return undefined;
		shares.push((bill.amount * timed) / billed);
	}
	return shares;
}

function rowOf(
	provider: ProviderRun,
	suite: SuiteName,
	targetSpec: TargetSpec,
): PipelineCostRow | undefined {
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
	const shares = billedShares(provider, suite, completed);
	if (shares !== undefined) {
		return { ...base, billed: true, basis: "Billed", ...spread(shares) };
	}
	const price = meta ? fullHourlyPrice(meta, targetSpec) : null;
	if (price === null) return undefined;
	const costs = durations.map((s) => burstCostPerRun(price.usdPerHour, s * 1000));
	return { ...base, billed: false, basis: `Estimated${BOUND[price.accuracy]}`, ...spread(costs) };
}

/** Cost per pipeline run for every realworld suite a provider completed. */
export function buildPipelineCost(
	providers: readonly ProviderRun[],
	targetSpec: TargetSpec,
): PipelineCostSuite[] {
	return (Object.keys(SUITES) as SuiteName[])
		.filter((suite) => SUITES[suite].wave === "realworld" && SUITES[suite].ptsTimesToRun === 1)
		.flatMap((suite) => {
			const rows = providers
				.flatMap((p) => rowOf(p, suite, targetSpec) ?? [])
				.sort((a, b) => a.value - b.value || a.providerId.localeCompare(b.providerId, "en"));
			const label = getMetric(SUITES[suite].metrics[0] ?? "")?.label.split(":")[0] ?? suite;
			return rows.length === 0 ? [] : [{ suite, suiteName: label, rows }];
		});
}
