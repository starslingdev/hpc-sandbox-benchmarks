/**
 * `LeaderboardMetric` → a fully-formatted, fully-decided view model. Pure data: no JSX, no satori,
 * no filesystem. Everything a figure can get wrong is decided before a pixel exists, where it is
 * assertable by an ordinary unit test.
 *
 * This module ASSEMBLES; it does not adjudicate. The two decisions that carry the figure's honesty
 * live beside their own rationale and their own tests:
 *
 *   ./emphasis.ts  which row (if any) may be highlighted, and how a shared rank is labelled
 *   ./spans.ts     what a bar represents — the interval, never the median alone
 *
 * The third rule is here, because it is about which rows EXIST rather than how they are drawn: a
 * provider in the run that produced no value for this metric gets an explicit "not measured" row.
 * Never omitted, never a zero-length bar — "a gap is a missing result, never a tie or a zero".
 */
import type { Leaderboard, LeaderboardMetric } from "@sandbox-benchmarks/results";
import { formatInterval, formatValue, metricTakeaway, rowNote } from "@sandbox-benchmarks/results";
import { metrics, type_ } from "../../theme.ts";
import type { ColumnSpec, SolvedColumn } from "./columns.ts";
import { solveColumns, textWidth } from "./columns.ts";
import type { RowEmphasis } from "./emphasis.ts";
import { emphasisOf, leaderIsEstablished, rankLabel } from "./emphasis.ts";
import type { Span } from "./spans.ts";
import { domainOf, spanOf } from "./spans.ts";

export type { RowEmphasis } from "./emphasis.ts";
export type { Span } from "./spans.ts";

export interface TableRowView {
	readonly providerId: string;
	/** Formatted cells, index-aligned with {@link TableView.columns}. */
	readonly cells: readonly string[];
	/** Interval to plot, or `null` when there is nothing to plot. See ./spans.ts. */
	readonly span: Span | null;
	/** How the row is emphasised. See ./emphasis.ts. */
	readonly emphasis: RowEmphasis;
}

export interface TableView {
	readonly metricId: string;
	readonly title: string;
	readonly subtitle: string;
	readonly takeaway: string;
	readonly footnote: string;
	readonly columns: readonly SolvedColumn[];
	readonly rows: readonly TableRowView[];
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

export function buildTableView(board: Leaderboard, entry: LeaderboardMetric): TableView {
	const { metric, rows } = entry;
	const leaderEstablished = leaderIsEstablished(rows);
	const domain = domainOf(rows);

	const viewRows: TableRowView[] = rows.map((r) => ({
		providerId: r.providerId,
		cells: [
			rankLabel(r),
			r.displayName,
			formatValue(r.value),
			formatInterval(r),
			String(r.n),
			rowNote(r),
		],
		span: spanOf(r, domain),
		emphasis: emphasisOf(r, leaderEstablished),
	}));

	// Every provider measured in this RUN gets a row on every metric figure, so one that produced
	// nothing here is visibly absent-with-a-reason rather than quietly missing.
	const measured = new Set(rows.map((r) => r.providerId));
	for (const p of board.roster.filter((p) => !measured.has(p.providerId))) {
		viewRows.push({
			providerId: p.providerId,
			cells: ["—", p.displayName, "not measured", "—", "0", "coverage gap"],
			span: null,
			emphasis: "gap",
		});
	}

	const columns = solveColumns(
		COLUMNS,
		viewRows.map((r) => r.cells),
		{ cellFontSize: type_.cell, headerFontSize: type_.columnHeader, padX: metrics.cellPadX },
	);

	const better = metric.direction === "HIB" ? "higher is better" : "lower is better";
	const title = metric.label ?? metric.id;
	const subtitle = `${metric.unit} · ${better} · run ${board.runId}`;
	// Byte-identical to the sentence the Markdown prints above the same table.
	const takeaway = metricTakeaway(metric.dimension, metric, rows);
	const withSpans = viewRows.some((r) => r.span !== null);
	// Don't explain a bar the figure doesn't draw. A metric whose rows are single exact observations
	// (a published price, say) has no interval to plot, and a legend describing one would be the
	// figure's only false claim.
	const footnote = withSpans
		? "bar = 95% bootstrap interval, tick = median · rows share a rank when the test could not separate them"
		: "single observation per provider — no interval to plot · rows share a rank when the test could not separate them";

	const tableWidth =
		columns.reduce((sum, c) => sum + c.width, 0) +
		(withSpans ? metrics.spanWidth + 2 * metrics.cellPadX : 0);
	const proseWidth = Math.max(
		textWidth(title, type_.title),
		textWidth(subtitle, type_.subtitle),
		textWidth(takeaway, type_.subtitle),
		textWidth(footnote, type_.footnote),
	);

	return {
		metricId: metric.id,
		title,
		subtitle,
		takeaway,
		footnote,
		columns,
		rows: viewRows,
		width: Math.max(tableWidth, proseWidth) + 2 * metrics.pad,
	};
}

/** Whether the figure plots interval bars at all. Derived rather than stored: a `hasSpans` field
 *  could disagree with `rows`, and it is what the layout branches on. */
export function hasSpans(view: TableView): boolean {
	return view.rows.some((r) => r.span !== null);
}
