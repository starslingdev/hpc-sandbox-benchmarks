/**
 * Measured cost: what a provider's own billing API reported for each benchmark sandbox, read from
 * the Run's `costEvidence` and nothing else. SDK-free — the Run model and the schema only.
 *
 * This is deliberately NOT an economics Metric. The `economics` dimension prices the requested
 * reservation from published catalog rates; a measured figure is the bill for what one sandbox
 * actually used (Modal's CPU burst included). Folding the two into one ranked table would put a
 * reservation price beside a usage bill as if they answered the same question, so the board carries
 * measured cost as its own section and labels every figure with its evidence source.
 *
 * Derived at render time rather than stored as Metric rows: the evidence is already retained per
 * cell in the Run, so a stored copy would be a second representation free to drift from it, and a
 * re-aggregated or pooled Run gets the measured figures for free.
 *
 * Three rules carry the honesty of the numbers:
 *
 *  - **One sandbox, one figure.** Each observed record is one sandbox's whole bill; the per-suite
 *    value is the median across those sandboxes, as every other board value is.
 *  - **Unmeasured is never zero.** A `missing` record, or a sandbox the Run attributes measurements
 *    to without any cost record, counts against coverage and is listed by reason. It never enters a
 *    median as 0.
 *  - **Totals are exact or absent.** A total is {@link providerCostTotal}: printed only when every
 *    expected cell has an observed, sandbox-unique, single-currency record.
 */
import type {
	MissingProviderCostEvidence,
	ObservedProviderCostEvidence,
	ProviderCostCell,
	ProviderCostEvidence,
	ProviderRun,
	SuiteName,
} from "@sandbox-benchmarks/schema";
import {
	getProvider,
	percentileOf,
	providerCostCellKey,
	providerCostTotal,
	SUITE_NAMES,
	SUITES,
} from "@sandbox-benchmarks/schema";

/** Why a cell has no measured figure: the provider hook's recorded reason, or no record at all. */
export type UnmeasuredReason = MissingProviderCostEvidence["reason"] | "no_cost_record";

/** One suite's measured cost for one provider. */
export interface MeasuredCostSuite {
	suite: SuiteName;
	/**
	 * True when one sandbox runs this suite's pipeline exactly once (the realworld suites, k = 1), so
	 * the per-sandbox figure IS the measured cost of one pipeline run.
	 */
	perPipelineRun: boolean;
	/** Sandboxes the Run holds evidence for in this suite — the coverage denominator. */
	expected: number;
	/** Observed per-sandbox amounts, ascending. Empty when nothing was measured. */
	amounts: number[];
	/** Median of {@link amounts}, or null when none was observed or currencies disagree. */
	median: number | null;
	/** Exact suite total, or null unless every expected sandbox has an observed record. */
	total: number | null;
	/** Unmeasured sandboxes, counted by reason, most common first. */
	unmeasured: { reason: UnmeasuredReason; count: number }[];
	/** Evidence sources behind {@link amounts}. */
	sources: ObservedProviderCostEvidence["source"][];
}

/** One provider's measured cost across the suites it ran. */
export interface MeasuredCostProvider {
	providerId: string;
	displayName: string;
	/** The one currency every observed record uses, or null when none was observed or they disagree. */
	currency: string | null;
	/** Realworld suites first, then registry order. */
	suites: MeasuredCostSuite[];
	expected: number;
	observed: number;
	/** Exact total across every expected cell, or null when any is unmeasured. */
	total: number | null;
	/** Unmeasured sandboxes across every suite, counted by reason, most common first. */
	unmeasured: MeasuredCostSuite["unmeasured"];
}

/** Realworld pipelines lead, as they do on the rest of the board; the rest keep registry order. */
const SUITE_ORDER: readonly SuiteName[] = [
	...SUITE_NAMES.filter((suite) => SUITES[suite].wave === "realworld"),
	...SUITE_NAMES.filter((suite) => SUITES[suite].wave !== "realworld"),
];

const sortedByCount = (counts: Map<UnmeasuredReason, number>) =>
	[...counts.entries()]
		.map(([reason, count]) => ({ reason, count }))
		.sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "en"));

/**
 * The cells a provider must account for: every cell it has a cost record for, plus every cell the
 * Run attributes measurements to (`artifactEvidence`, one per booted sandbox). A sandbox that ran
 * and left no cost record is therefore unmeasured rather than invisible.
 */
function expectedCellsOf(provider: ProviderRun): Map<string, ProviderCostCell> {
	const cells = new Map<string, ProviderCostCell>();
	for (const record of [...(provider.costEvidence ?? []), ...(provider.artifactEvidence ?? [])]) {
		cells.set(providerCostCellKey(record), record.cell);
	}
	return cells;
}

/** One provider's measured cost, or undefined when its Run row carries no cost evidence at all. */
function measuredCostOf(provider: ProviderRun): MeasuredCostProvider | undefined {
	const records = provider.costEvidence ?? [];
	if (records.length === 0) return undefined;
	const expectedCells = expectedCellsOf(provider);
	const recordByCell = new Map(records.map((record) => [providerCostCellKey(record), record]));
	const observed = records.filter(
		(record): record is ObservedProviderCostEvidence => record.kind === "observed",
	);
	const currencies = new Set(observed.map((record) => record.currency));
	const currency = currencies.size === 1 ? ([...currencies][0] ?? null) : null;

	const suites = SUITE_ORDER.flatMap((suite): MeasuredCostSuite[] => {
		const cells = [...expectedCells.entries()].filter(([, cell]) => cell.suite === suite);
		if (cells.length === 0) return [];
		const unmeasured = new Map<UnmeasuredReason, number>();
		const suiteRecords: ProviderCostEvidence[] = [];
		const amounts: number[] = [];
		const sources = new Set<ObservedProviderCostEvidence["source"]>();
		for (const [key] of cells) {
			const record = recordByCell.get(key);
			if (record === undefined) {
				unmeasured.set("no_cost_record", (unmeasured.get("no_cost_record") ?? 0) + 1);
				continue;
			}
			suiteRecords.push(record);
			if (record.kind === "missing") {
				unmeasured.set(record.reason, (unmeasured.get(record.reason) ?? 0) + 1);
				continue;
			}
			amounts.push(record.amount);
			sources.add(record.source);
		}
		amounts.sort((a, b) => a - b);
		const exact = providerCostTotal(
			suiteRecords,
			cells.map(([, cell]) => cell),
		);
		return [
			{
				suite,
				perPipelineRun: SUITES[suite].wave === "realworld" && SUITES[suite].ptsTimesToRun === 1,
				expected: cells.length,
				amounts,
				median: amounts.length > 0 && currency !== null ? percentileOf(amounts, 0.5) : null,
				total: currency !== null ? (exact?.amount ?? null) : null,
				unmeasured: sortedByCount(unmeasured),
				sources: [...sources].sort(),
			},
		];
	});

	const total = providerCostTotal(records, [...expectedCells.values()]);
	const unmeasured = new Map<UnmeasuredReason, number>();
	for (const suite of suites) {
		for (const { reason, count } of suite.unmeasured) {
			unmeasured.set(reason, (unmeasured.get(reason) ?? 0) + count);
		}
	}
	return {
		providerId: provider.providerId,
		displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
		currency,
		suites,
		expected: expectedCells.size,
		observed: observed.length,
		total: currency !== null ? (total?.amount ?? null) : null,
		unmeasured: sortedByCount(unmeasured),
	};
}

/**
 * Every provider in the Run that recorded cost evidence, in run order. Providers without a cost
 * hook record nothing and are absent here; their only cost figures are the catalog economics.
 */
export function buildMeasuredCost(providers: readonly ProviderRun[]): MeasuredCostProvider[] {
	return providers.flatMap((provider) => measuredCostOf(provider) ?? []);
}
