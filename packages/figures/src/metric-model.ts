/**
 * The metric figure model: one ranked bar chart per synthetic metric, as the charts consume it.
 *
 * Unlike the realworld model (`model.ts`), which derives its bars from the Run itself, the rows
 * here arrive ALREADY RANKED. The median across sandboxes, its cluster-bootstrap interval and
 * the rank (with its statistical ties) are `packages/results`' derivation — the same one that
 * fills the leaderboard's tables — and a second copy of that inference living beside a chart
 * would be free to disagree with the table under it. So this package draws what the board says,
 * and says nothing the board does not.
 *
 * The provider roster is shared with the realworld model ({@link FigureProvider}): the same
 * concise names, off-spec daggers and isolation chips on every chart drawn from one run.
 */
import type { FigureProvider } from "./model.ts";

export type { FigureIsolation, FigureProvider } from "./model.ts";

/** One environment's ranked result for a metric, as the board computed it. */
export interface MetricFigureRow {
	readonly provider: string;
	/** The median across sandboxes — the table's value. */
	readonly value: number;
	/** The 95% bootstrap interval of that median. Equal to `value` on both sides when none is
	 *  estimable (a single observation), which the chart draws as no whisker at all. */
	readonly lo: number;
	readonly hi: number;
	/** The board's rank — shared by rows it could not separate, which is how ties reach the chart. */
	readonly rank: number;
	/** Retained trials, and the sandboxes they came from. */
	readonly n: number;
	readonly sandboxes: number;
}

export interface MetricFigure {
	/** The catalog id, e.g. `stream_type_triad`. Names the output file. */
	readonly id: string;
	/** The catalog's short label, e.g. `STREAM Triad`. The chart's title. */
	readonly label: string;
	readonly dimension: string;
	readonly unit: string;
	readonly direction: "HIB" | "LIB";
	/** Whether this metric headlines its dimension on the board. */
	readonly headline: boolean;
	/** True for a metric derived from other metrics and published pricing rather than measured —
	 *  an environment without a row simply has no published price, which is not a coverage gap. */
	readonly derived: boolean;
	/** Ranked best-first, exactly as the board orders its table. */
	readonly rows: readonly MetricFigureRow[];
	/** Validated environments with no result for this metric: outcome and reason, no bar. */
	readonly unmeasured: readonly {
		readonly provider: string;
		readonly outcome: string;
		readonly reason: string;
	}[];
}

export interface MetricFigureModel {
	/** Chartable metrics only (≥2 ranked environments), in the board's dimension and metric order. */
	readonly metrics: readonly MetricFigure[];
	readonly providers: readonly FigureProvider[];
}
