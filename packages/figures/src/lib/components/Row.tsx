/** One provider's row. Colour comes from the row's already-adjudicated emphasis — this component
 *  never re-derives who leads. */
import type { Theme } from "../../theme.ts";
import { metrics, type_ } from "../../theme.ts";
import type { SolvedColumn } from "../view/columns.ts";
import type { TableRowView } from "../view/metric-table.ts";
import { Cell } from "./Cell.tsx";
import { Span } from "./Span.tsx";

export function Row({
	row,
	columns,
	spans,
	theme,
}: {
	row: TableRowView;
	columns: readonly SolvedColumn[];
	/** Whether this figure plots bars at all — see `hasSpans` in ../view/metric-table.ts. */
	spans: boolean;
	theme: Theme;
}) {
	const base: string = {
		lead: theme.colors.lead,
		separated: theme.colors.fg,
		muted: theme.colors.fg,
		gap: theme.colors.gap,
	}[row.emphasis];

	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				height: metrics.rowHeight,
				borderBottom: `1px solid ${theme.colors.line}`,
			}}
		>
			{columns.map((column, index) => (
				<Cell
					key={column.id}
					column={column}
					text={row.cells[index] ?? ""}
					// The note column is always secondary: a verdict is a caveat, not a headline.
					color={column.id === "note" ? theme.colors.dim : base}
					fontSize={type_.cell}
					bold={row.emphasis === "lead" && column.id !== "note"}
				/>
			))}
			{spans ? <Span row={row} theme={theme} /> : null}
		</div>
	);
}
