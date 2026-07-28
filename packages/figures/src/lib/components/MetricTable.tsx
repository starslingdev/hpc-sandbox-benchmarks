/**
 * The ranked-table figure. Presentational only: it receives a fully-decided {@link TableView} and
 * never sees a `Leaderboard`, a `MetricDef` or a raw number. Every width is already solved, every
 * string already formatted, every highlight already adjudicated in ../view/metric-table.ts.
 *
 * Satori has no table layout (`display: table` throws), so this is a column of flex rows whose cells
 * carry the solved fixed widths. `flexGrow` is not used — each row is an independent flex container,
 * so a grow-sized column resolves differently per row and the columns come out ragged.
 */
import type { Theme } from "../../theme.ts";
import { metrics, type_ } from "../../theme.ts";
import type { SolvedColumn } from "../view/columns.ts";
import type { TableRowView, TableView } from "../view/metric-table.ts";

function Cell({
	column,
	text,
	color,
	fontSize,
	bold,
}: {
	column: SolvedColumn;
	text: string;
	color: string;
	fontSize: number;
	bold?: boolean;
}) {
	return (
		<div
			style={{
				display: "flex",
				width: column.width,
				paddingLeft: metrics.cellPadX,
				paddingRight: metrics.cellPadX,
				justifyContent: column.align === "right" ? "flex-end" : "flex-start",
				fontSize,
				color,
				fontWeight: bold ? 700 : 400,
			}}
		>
			{text}
		</div>
	);
}

/**
 * The interval span. This is the component that keeps the figure honest: it draws
 * `interval.lo … interval.hi` as a bar with the median as a tick, so two providers the test could
 * not separate render as two visibly overlapping bars rather than as two different lengths.
 */
function Span({ row, theme }: { row: TableRowView; theme: Theme }) {
	const track = metrics.spanWidth;
	if (row.span === null) {
		return (
			<div
				style={{
					display: "flex",
					width: track,
					marginLeft: metrics.cellPadX,
					marginRight: metrics.cellPadX,
					fontSize: type_.footnote,
					color: theme.colors.gap,
				}}
			>
				{row.notMeasured ? "no result" : "single trial"}
			</div>
		);
	}
	const left = Math.round(row.span.lo * track);
	const width = Math.max(2, Math.round((row.span.hi - row.span.lo) * track));
	// Clamp so a 2px tick at the extreme end of the domain stays within the track.
	const tick = Math.min(track - 2, Math.max(0, Math.round(row.span.median * track)));
	const fill = row.highlighted || row.established ? theme.colors.bar : theme.colors.barMuted;
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: track,
				height: 14,
				marginLeft: metrics.cellPadX,
				marginRight: metrics.cellPadX,
			}}
		>
			{/* The bar's x-extent IS the interval; the tick sits inside it at the median. Both are
			    absolutely positioned on the shared track — as flex siblings the tick could only ever
			    render after the bar, not within it. */}
			<div
				style={{
					display: "flex",
					position: "absolute",
					left,
					top: 0,
					width,
					height: 14,
					backgroundColor: fill,
					borderRadius: 7,
				}}
			/>
			<div
				style={{
					display: "flex",
					position: "absolute",
					left: tick,
					top: 0,
					width: 2,
					height: 14,
					backgroundColor: theme.colors.tick,
				}}
			/>
		</div>
	);
}

function Row({ row, view, theme }: { row: TableRowView; view: TableView; theme: Theme }) {
	const base = row.notMeasured
		? theme.colors.gap
		: row.highlighted
			? theme.colors.lead
			: theme.colors.fg;
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				height: metrics.rowHeight,
				borderBottom: `1px solid ${theme.colors.line}`,
			}}
		>
			{view.columns.map((column, index) => (
				<Cell
					key={column.id}
					column={column}
					text={row.cells[index] ?? ""}
					// The note column is always secondary: a verdict is a caveat, not a headline.
					color={column.id === "note" ? theme.colors.dim : base}
					fontSize={type_.cell}
					bold={row.highlighted && column.id !== "note"}
				/>
			))}
			{view.hasSpans ? <Span row={row} theme={theme} /> : null}
		</div>
	);
}

export function MetricTable({ view, theme }: { view: TableView; theme: Theme }) {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
				backgroundColor: theme.colors.bg,
				padding: metrics.pad,
				fontFamily: "Mono",
			}}
		>
			<div
				style={{ display: "flex", fontSize: type_.title, fontWeight: 700, color: theme.colors.fg }}
			>
				{view.title}
			</div>
			<div
				style={{
					display: "flex",
					fontSize: type_.subtitle,
					color: theme.colors.dim,
					marginTop: 8,
				}}
			>
				{view.subtitle}
			</div>
			<div
				style={{
					display: "flex",
					fontSize: type_.subtitle,
					color: theme.colors.dim,
					marginTop: 6,
					marginBottom: 20,
				}}
			>
				{view.takeaway}
			</div>

			<div
				style={{
					display: "flex",
					alignItems: "center",
					paddingBottom: 8,
					borderBottom: `1px solid ${theme.colors.line}`,
				}}
			>
				{view.columns.map((column) => (
					<Cell
						key={column.id}
						column={column}
						text={column.header}
						color={theme.colors.dim}
						fontSize={type_.columnHeader}
					/>
				))}
				{view.hasSpans ? (
					<div
						style={{
							display: "flex",
							width: metrics.spanWidth,
							marginLeft: metrics.cellPadX,
							marginRight: metrics.cellPadX,
							fontSize: type_.columnHeader,
							color: theme.colors.dim,
						}}
					>
						INTERVAL
					</div>
				) : null}
			</div>

			{view.rows.map((row) => (
				<Row key={row.providerId} row={row} view={view} theme={theme} />
			))}

			<div
				style={{
					display: "flex",
					marginTop: 18,
					fontSize: type_.footnote,
					color: theme.colors.dim,
				}}
			>
				{view.footnote}
			</div>
		</div>
	);
}
