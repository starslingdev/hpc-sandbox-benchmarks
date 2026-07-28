/**
 * `LeaderboardMetric` → a fully-formatted, fully-decided view model. Pure data: no JSX, no satori,
 * no filesystem. Everything a figure can get wrong is decided here, where it is assertable by an
 * ordinary unit test.
 *
 * INTEGRITY IS THE POINT. The Markdown surface is engineered to avoid claiming more than the
 * statistics support — it declines to print a ratio when the leader's margin is under 5%, it says
 * "share the top" rather than naming a winner when rank 1 is a cohort, and it labels a comparison
 * the trial count could never have decided as `n too small` rather than as a tie. A figure is read
 * faster and trusted more than a table, so a figure that looks more confident than the table it sits
 * above is a worse regression than no figure at all. Three rules follow, and each is enforced here:
 *
 *  1. NO BAR ENCODES A MEDIAN ALONE. Every bar is the 95% bootstrap INTERVAL drawn as a span, with
 *     the median as a tick inside it. Two providers whose intervals overlap are then visibly
 *     overlapping — which is the actual finding. A bar chart of medians would draw Blaxel at 100%
 *     and Daytona at 94% on the cpu headline, where the test could not separate them at all.
 *  2. NO LEAD HIGHLIGHT THE STATISTICS DO NOT SUPPORT. Rank 1 is highlighted only when it is a
 *     UNIQUE rank AND the row below it is `separated`. On the current committed board every
 *     non-leading row is `underpowered`, so nothing is crowned — matching the prose.
 *  3. A PROVIDER THAT WAS NOT MEASURED GETS AN EXPLICIT ROW. Never omitted, never a zero-length bar.
 *     "A gap is a missing result, never a tie or a zero."
 */
import type { Leaderboard, LeaderboardMetric, LeaderboardRow } from "@sandbox-benchmarks/results";
import { formatInterval, formatValue, metricTakeaway, rowNote } from "@sandbox-benchmarks/results";
import { metrics } from "../../theme.ts";
import type { ColumnSpec, SolvedColumn } from "./columns.ts";
import { solveColumns, textWidth } from "./columns.ts";

/** Where a row's interval sits within the metric's plotted domain, as fractions in [0, 1]. */
export interface Span {
	readonly lo: number;
	readonly hi: number;
	readonly median: number;
}

export interface TableRowView {
	readonly providerId: string;
	/** Formatted cells, index-aligned with {@link TableView.columns}. */
	readonly cells: readonly string[];
	/** Interval span to plot, or `null` when there is no interval to draw (n = 1, or not measured). */
	readonly span: Span | null;
	/** True only for a rank-1 row the statistics actually separate from the row below. See rule 2. */
	readonly highlighted: boolean;
	/** True when this row's rank is established against the row above (`verdict === "separated"`). */
	readonly established: boolean;
	/** True for a provider in the run that produced no value for this metric. See rule 3. */
	readonly notMeasured: boolean;
}

export interface TableView {
	readonly metricId: string;
	readonly title: string;
	readonly subtitle: string;
	readonly takeaway: string;
	readonly footnote: string;
	readonly columns: readonly SolvedColumn[];
	readonly rows: readonly TableRowView[];
	/** True when at least one row has an interval worth plotting. */
	readonly hasSpans: boolean;
	/**
	 * Canvas width, solved to fit the widest thing the figure contains — the table, or one of the
	 * prose lines above and below it.
	 *
	 * Sizing the canvas to the content (rather than picking a round number and hoping) is what makes
	 * overflow structurally impossible instead of merely tested-for. Satori does not clip: a line
	 * that does not fit wraps, silently doubling its height and bleeding across the rule below it,
	 * and there is no measurement API to detect that after the fact.
	 */
	readonly width: number;
}

const COLUMNS: readonly ColumnSpec[] = [
	{ id: "rank", header: "#", align: "right" },
	{ id: "provider", header: "PROVIDER", align: "left" },
	{ id: "value", header: "MEDIAN", align: "right" },
	{ id: "interval", header: "95% INTERVAL", align: "right" },
	{ id: "n", header: "n", align: "right" },
	{ id: "note", header: "NOTE", align: "left" },
];

/** Rule 2. A crown requires a unique rank AND a separated runner-up. */
function leaderIsEstablished(rows: readonly LeaderboardRow[]): boolean {
	const [first, second] = rows;
	if (!first || !second) return false; // a sole provider leads nothing
	if (second.rank === first.rank) return false; // shared rank 1: a cohort, not a winner
	return second.verdict === "separated";
}

/**
 * Plot domain: the union of every interval on the metric, so overlapping intervals overlap on
 * screen. Bounds come from the intervals rather than the medians precisely so that a row whose
 * interval is wide reads as uncertain instead of as a precise value.
 */
function domainOf(rows: readonly LeaderboardRow[]): { lo: number; hi: number } | null {
	const usable = rows.filter((r) => r.interval.resamples > 0);
	if (usable.length === 0) return null;
	let lo = Number.POSITIVE_INFINITY;
	let hi = Number.NEGATIVE_INFINITY;
	for (const r of usable) {
		lo = Math.min(lo, r.interval.lo, r.value);
		hi = Math.max(hi, r.interval.hi, r.value);
	}
	// A degenerate domain (every interval identical) would divide by zero; give it a nominal width.
	if (!(hi > lo)) return { lo: lo - 0.5, hi: hi + 0.5 };
	return { lo, hi };
}

export interface TableViewInput {
	readonly board: Leaderboard;
	readonly entry: LeaderboardMetric;
	readonly cellFontSize: number;
	readonly headerFontSize: number;
	readonly titleFontSize: number;
	readonly subtitleFontSize: number;
	readonly footnoteFontSize: number;
	readonly padX: number;
}

export function buildTableView(input: TableViewInput): TableView {
	const { board, entry } = input;
	const { metric, rows } = entry;
	const highlightLeader = leaderIsEstablished(rows);
	const domain = domainOf(rows);
	const measured = new Set(rows.map((r) => r.providerId));

	// Rule 3: every provider measured in this RUN gets a row on every metric figure, so a provider
	// that produced nothing here is visibly absent-with-a-reason rather than quietly missing.
	const absent = board.roster.filter((p) => !measured.has(p.providerId));

	const viewRows: TableRowView[] = rows.map((r) => {
		const span: Span | null =
			domain === null || r.interval.resamples === 0
				? null
				: {
						lo: (r.interval.lo - domain.lo) / (domain.hi - domain.lo),
						hi: (r.interval.hi - domain.lo) / (domain.hi - domain.lo),
						median: (r.value - domain.lo) / (domain.hi - domain.lo),
					};
		return {
			providerId: r.providerId,
			cells: [
				r.tiedWithAbove !== null ? `=${r.rank}` : String(r.rank),
				r.displayName,
				formatValue(r.value),
				formatInterval(r),
				String(r.n),
				rowNote(r),
			],
			span,
			highlighted: highlightLeader && r.rank === 1,
			established: r.verdict === "separated",
			notMeasured: false,
		};
	});

	for (const p of absent) {
		viewRows.push({
			providerId: p.providerId,
			cells: ["—", p.displayName, "not measured", "—", "0", "coverage gap"],
			span: null,
			highlighted: false,
			established: false,
			notMeasured: true,
		});
	}

	const columns = solveColumns(
		COLUMNS,
		viewRows.map((r) => r.cells),
		{
			cellFontSize: input.cellFontSize,
			headerFontSize: input.headerFontSize,
			padX: input.padX,
		},
	);

	const better = metric.direction === "HIB" ? "higher is better" : "lower is better";
	const title = metric.label ?? metric.id;
	const subtitle = `${metric.unit} · ${better} · run ${board.runId}`;
	// Byte-identical to the sentence the Markdown prints above the same table.
	const takeaway = metricTakeaway(metric.dimension, metric, rows);
	const hasSpans = viewRows.some((r) => r.span !== null);
	// Don't explain a bar the figure doesn't draw. A metric whose rows are single exact observations
	// (a published price, say) has no interval to plot, and a legend describing one would be the
	// figure's only false claim.
	const footnote = hasSpans
		? "bar = 95% bootstrap interval, tick = median · rows share a rank when the test could not separate them"
		: "single observation per provider — no interval to plot · rows share a rank when the test could not separate them";

	const tableWidth =
		columns.reduce((sum, c) => sum + c.width, 0) +
		(hasSpans ? metrics.spanWidth + 2 * metrics.cellPadX : 0);
	const proseWidth = Math.max(
		textWidth(title, input.titleFontSize),
		textWidth(subtitle, input.subtitleFontSize),
		textWidth(takeaway, input.subtitleFontSize),
		textWidth(footnote, input.footnoteFontSize),
	);

	return {
		metricId: metric.id,
		title,
		subtitle,
		takeaway,
		footnote,
		columns,
		rows: viewRows,
		hasSpans,
		width: Math.max(tableWidth, proseWidth) + 2 * metrics.pad,
	};
}
