/**
 * The interval bar — the component that keeps the figure honest.
 *
 * It draws `interval.lo … interval.hi` as a span with the median as a tick inside it, so two
 * providers the test could not separate render as two visibly overlapping bars rather than as two
 * different lengths. The decision of WHAT to plot lives in ../view/spans.ts; this only turns
 * fractions into pixels.
 */
import type { Theme } from "../../theme.ts";
import { metrics, type_ } from "../../theme.ts";
import type { TableRowView } from "../view/metric-table.ts";

/** Bar height, and the tick's width. Shared by both so the tick spans the bar exactly. */
const BAR_HEIGHT = 14;
const TICK_WIDTH = 2;

/** The fixed-width track every bar is positioned within, with the cell gutters either side. */
const track = {
	display: "flex",
	width: metrics.spanWidth,
	marginLeft: metrics.cellPadX,
	marginRight: metrics.cellPadX,
} as const;

export function Span({ row, theme }: { row: TableRowView; theme: Theme }) {
	if (row.span === null) {
		// Say why there is no bar, rather than leaving a blank that reads as a missing render.
		return (
			<div style={{ ...track, fontSize: type_.footnote, color: theme.colors.gap }}>
				{row.emphasis === "gap" ? "no result" : "single trial"}
			</div>
		);
	}

	const width = metrics.spanWidth;
	const left = Math.round(row.span.lo * width);
	const barWidth = Math.max(TICK_WIDTH, Math.round((row.span.hi - row.span.lo) * width));
	// Clamp so a tick at the extreme end of the domain stays within the track.
	const tick = Math.min(width - TICK_WIDTH, Math.max(0, Math.round(row.span.median * width)));
	const fill = row.emphasis === "muted" ? theme.colors.barMuted : theme.colors.bar;

	return (
		<div style={{ ...track, position: "relative", height: BAR_HEIGHT }}>
			{/* Both absolutely positioned on the shared track: as flex siblings the tick could only
			    ever render after the bar, not inside the interval it annotates. */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					left,
					top: 0,
					width: barWidth,
					height: BAR_HEIGHT,
					backgroundColor: fill,
					borderRadius: BAR_HEIGHT / 2,
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					left: tick,
					top: 0,
					width: TICK_WIDTH,
					height: BAR_HEIGHT,
					backgroundColor: theme.colors.tick,
				}}
			/>
		</div>
	);
}
