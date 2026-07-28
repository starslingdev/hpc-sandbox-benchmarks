/**
 * The ranked-table figure. Presentational only: it receives a fully-decided {@link TableView} and
 * never sees a `Leaderboard`, a `MetricDef` or a raw number. Every width is already solved, every
 * string already formatted, every emphasis already adjudicated in ../view/.
 *
 * Satori has no table layout (`display: table` throws), so this is a column of flex rows whose cells
 * carry the solved fixed widths. `flexGrow` is not used — each row is an independent flex container,
 * so a grow-sized column resolves differently per row and the columns come out ragged.
 */
import type { Theme } from "../../theme.ts";
import { metrics, type_ } from "../../theme.ts";
import type { TableView } from "../view/metric-table.ts";
import { hasSpans } from "../view/metric-table.ts";
import { Cell } from "./Cell.tsx";
import { Row } from "./Row.tsx";

/** A prose line above or below the table (subtitle, takeaway, footnote). */
function Note({
	text,
	theme,
	fontSize,
	marginTop = 0,
	marginBottom = 0,
}: {
	text: string;
	theme: Theme;
	fontSize: number;
	marginTop?: number;
	marginBottom?: number;
}) {
	return (
		<div style={{ display: "flex", fontSize, color: theme.colors.dim, marginTop, marginBottom }}>
			{text}
		</div>
	);
}

export function MetricTable({ view, theme }: { view: TableView; theme: Theme }) {
	const spans = hasSpans(view);
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
			<Note text={view.subtitle} theme={theme} fontSize={type_.subtitle} marginTop={8} />
			<Note
				text={view.takeaway}
				theme={theme}
				fontSize={type_.subtitle}
				marginTop={6}
				marginBottom={20}
			/>

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
				{spans ? (
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
				<Row key={row.providerId} row={row} columns={view.columns} spans={spans} theme={theme} />
			))}

			<Note text={view.footnote} theme={theme} fontSize={type_.footnote} marginTop={18} />
		</div>
	);
}
