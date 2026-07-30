/**
 * The composite-table figure. Presentational only: it receives a fully-decided
 * {@link TableView} and never sees a `ResolvedComposite`, a `MetricTableRow` or a raw
 * number. Every width is already solved, every string already formatted, every shading
 * decision already made in ../view/.
 *
 * Satori has no table layout — `display: table` and `display: grid` throw — so this is a
 * column of flex rows whose cells carry the solved fixed widths. `flexGrow` is not used:
 * each row is an independent flex container, so a grow-sized column resolves differently
 * per row and the columns come out ragged.
 */

import type { Theme } from "../../theme.ts";
import { metrics, type_ } from "../../theme.ts";
import type { Style } from "../style.tsx";
import { Box } from "../style.tsx";
import type { SolvedColumn } from "../view/columns.ts";
import { ADVANCE_RATIO } from "../view/columns.ts";
import type { CellView, RowView, TableView } from "../view/table.ts";
import { INDENT_CHARS } from "../view/table.ts";

/** One cell. Fixed width, solved in ../view/columns.ts — satori has no measurement API,
 *  so a cell that does not fit wraps or leaks rather than clipping. */
function Cell({
	column,
	cell,
	theme,
	fontSize,
	header = false,
	indent = 0,
}: {
	column: SolvedColumn;
	cell: CellView;
	theme: Theme;
	fontSize: number;
	header?: boolean;
	/** Extra left padding, in px, for a nested task row. Accounted for in the width solve. */
	indent?: number;
}) {
	const color = header
		? theme.colors.dim
		: cell.tone === "best"
			? theme.colors.best
			: cell.tone === "missing"
				? theme.colors.missing
				: cell.tone === "spread"
					? theme.colors.dim
					: theme.colors.fg;

	const style: Style = {
		width: column.width,
		flexShrink: 0,
		paddingLeft: metrics.cellPadX + indent,
		paddingRight: metrics.cellPadX,
		justifyContent: column.align === "right" ? "flex-end" : "flex-start",
		alignItems: "center",
		height: header ? metrics.bandHeight : metrics.rowHeight,
		fontSize,
		color,
		fontWeight: cell.tone === "best" ? 700 : 400,
	};
	// The wash is what carries "how far behind" at a glance. `best` gets its own tone
	// rather than tint step 0, so the leader reads as marked rather than merely unshaded.
	if (cell.tone === "best") style.backgroundColor = theme.colors.bestBg;
	else if (cell.tint > 0) style.backgroundColor = theme.colors.tint[cell.tint];

	return <Box style={style}>{cell.text}</Box>;
}

function Row({
	row,
	columns,
	theme,
}: {
	row: RowView;
	columns: readonly SolvedColumn[];
	theme: Theme;
}) {
	return (
		<Box style={{ alignItems: "center", borderBottom: `1px solid ${theme.colors.line}` }}>
			{columns.map((column, index) => {
				const cell = row.cells[index];
				return cell ? (
					<Cell
						key={column.id}
						column={column}
						cell={cell}
						theme={theme}
						fontSize={type_.cell}
						indent={index === 0 && row.indent ? INDENT_CHARS * type_.cell * ADVANCE_RATIO : 0}
					/>
				) : null;
			})}
		</Box>
	);
}

/** A prose line above or below the table. */
function Note({
	text,
	width,
	theme,
	fontSize,
	marginTop = 0,
	marginBottom = 0,
}: {
	text: string;
	/** Bounded so the line wraps here instead of stretching the canvas. */
	width: number;
	theme: Theme;
	fontSize: number;
	marginTop?: number;
	marginBottom?: number;
}) {
	return (
		<Box style={{ width, fontSize, color: theme.colors.dim, marginTop, marginBottom }}>{text}</Box>
	);
}

export function MetricFigure({ view, theme }: { view: TableView; theme: Theme }) {
	const totalWidth = view.columns.reduce((sum, c) => sum + c.width, 0);
	const { contentWidth } = view;
	return (
		<Box
			style={{
				flexDirection: "column",
				width: "100%",
				backgroundColor: theme.colors.bg,
				padding: metrics.pad,
				fontFamily: "Mono",
			}}
		>
			<Box
				style={{
					width: contentWidth,
					fontSize: type_.title,
					fontWeight: 700,
					color: theme.colors.fg,
				}}
			>
				{view.title}
			</Box>
			<Note
				text={view.subtitle}
				width={contentWidth}
				theme={theme}
				fontSize={type_.subtitle}
				marginTop={8}
				marginBottom={20}
			/>

			<Box style={{ flexDirection: "column", width: totalWidth }}>
				<Box style={{ alignItems: "center", borderBottom: `1px solid ${theme.colors.line}` }}>
					{view.columns.map((column) => (
						<Cell
							key={column.id}
							column={column}
							cell={{ text: column.header, tone: "label", tint: 0 }}
							theme={theme}
							fontSize={type_.columnHeader}
							header
						/>
					))}
				</Box>

				{view.groups.map((group) => (
					<Box key={group.dimension} style={{ flexDirection: "column" }}>
						<Box
							style={{
								alignItems: "center",
								height: metrics.bandHeight,
								width: totalWidth,
								backgroundColor: theme.colors.bandBg,
								borderBottom: `1px solid ${theme.colors.line}`,
								paddingLeft: metrics.cellPadX,
								fontSize: type_.band,
								color: theme.colors.band,
							}}
						>
							{group.label}
						</Box>
						{group.rows.map((row) => (
							<Row key={row.id} row={row} columns={view.columns} theme={theme} />
						))}
					</Box>
				))}
			</Box>

			<Note
				text={view.footnote}
				width={contentWidth}
				theme={theme}
				fontSize={type_.footnote}
				marginTop={16}
			/>
		</Box>
	);
}
