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

/** Coverage and figures over one set of expected sandboxes — a suite, or a provider's whole Run. */
export interface MeasuredCostTally {
	/** Sandboxes the Run holds evidence for — the coverage denominator. */
	expected: number;
	/** Observed per-sandbox amounts, ascending; its length is the measured count. */
	amounts: number[];
	/** Median of {@link amounts}, or null when none was observed or currencies disagree. */
	median: number | null;
	/** Exact total, or null unless every expected sandbox has an observed record. */
	total: number | null;
	/** Unmeasured sandboxes, counted by reason, most common first. */
	unmeasured: { reason: UnmeasuredReason; count: number }[];
	/** Evidence sources behind {@link amounts}, sorted. */
	sources: ObservedProviderCostEvidence["source"][];
}

/** One suite's measured cost for one provider. */
export interface MeasuredCostSuite extends MeasuredCostTally {
	suite: SuiteName;
	/**
	 * True when one sandbox runs this suite's pipeline exactly once (the realworld suites, k = 1), so
	 * the per-sandbox figure IS the measured cost of one pipeline run.
	 */
	perPipelineRun: boolean;
}

/** One provider's measured cost: the whole-Run tally, and one per suite it ran. */
export interface MeasuredCostProvider extends MeasuredCostTally {
	providerId: string;
	displayName: string;
	/** The one currency every observed record uses, or null when none was observed or they disagree. */
	currency: string | null;
	/** Realworld suites first, then registry order. */
	suites: MeasuredCostSuite[];
}

/** Realworld pipelines lead, as they do on the rest of the board; the rest keep registry order. */
const SUITE_ORDER: readonly SuiteName[] = [
	...SUITE_NAMES.filter((suite) => SUITES[suite].wave === "realworld"),
	...SUITE_NAMES.filter((suite) => SUITES[suite].wave !== "realworld"),
];

/**
 * Tally expected cells against the provider's records. `currency` is the provider's single
 * currency; when it is null (none observed, or they disagree) no median or total is computed.
 */
function tally(
	cells: readonly [string, ProviderCostCell][],
	recordByCell: ReadonlyMap<string, ProviderCostEvidence>,
	currency: string | null,
): MeasuredCostTally {
	const unmeasured = new Map<UnmeasuredReason, number>();
	const records: ProviderCostEvidence[] = [];
	const amounts: number[] = [];
	const sources = new Set<ObservedProviderCostEvidence["source"]>();
	for (const [key] of cells) {
		const record = recordByCell.get(key);
		if (record !== undefined) records.push(record);
		if (record?.kind === "observed") {
			amounts.push(record.amount);
			sources.add(record.source);
		} else {
			const reason = record?.reason ?? "no_cost_record";
			unmeasured.set(reason, (unmeasured.get(reason) ?? 0) + 1);
		}
	}
	amounts.sort((a, b) => a - b);
	const priced = currency !== null && amounts.length > 0;
	return {
		expected: cells.length,
		amounts,
		median: priced ? percentileOf(amounts, 0.5) : null,
		total: priced
			? (providerCostTotal(
					records,
					cells.map(([, cell]) => cell),
				)?.amount ?? null)
			: null,
		unmeasured: [...unmeasured.entries()]
			.map(([reason, count]) => ({ reason, count }))
			.sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason, "en")),
		sources: [...sources].sort(),
	};
}

/** One provider's measured cost, or undefined when its Run row carries no cost evidence at all. */
function measuredCostOf(provider: ProviderRun): MeasuredCostProvider | undefined {
	const records = provider.costEvidence ?? [];
	if (records.length === 0) return undefined;
	// Every cell with a cost record, plus every cell the Run attributes measurements to
	// (`artifactEvidence`, one per booted sandbox): a sandbox that ran and left no cost record is
	// unmeasured rather than invisible.
	const expected = new Map<string, ProviderCostCell>();
	for (const record of [...records, ...(provider.artifactEvidence ?? [])]) {
		expected.set(providerCostCellKey(record), record.cell);
	}
	const recordByCell = new Map(records.map((record) => [providerCostCellKey(record), record]));
	const currencies = new Set(
		records.flatMap((record) => (record.kind === "observed" ? [record.currency] : [])),
	);
	const currency = currencies.size === 1 ? ([...currencies][0] ?? null) : null;
	const cells = [...expected.entries()];
	return {
		providerId: provider.providerId,
		displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
		currency,
		...tally(cells, recordByCell, currency),
		suites: SUITE_ORDER.flatMap((suite) => {
			const suiteCells = cells.filter(([, cell]) => cell.suite === suite);
			return suiteCells.length === 0
				? []
				: [
						{
							suite,
							perPipelineRun:
								SUITES[suite].wave === "realworld" && SUITES[suite].ptsTimesToRun === 1,
							...tally(suiteCells, recordByCell, currency),
						},
					];
		}),
	};
}

/**
 * Every provider in the Run that recorded cost evidence, in run order. Providers without a cost
 * hook record nothing and are absent here; their only cost figures are the catalog economics.
 */
export function buildMeasuredCost(providers: readonly ProviderRun[]): MeasuredCostProvider[] {
	return providers.flatMap((provider) => measuredCostOf(provider) ?? []);
}
