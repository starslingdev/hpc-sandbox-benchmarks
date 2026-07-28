/** One table cell. Fixed width, already solved in ../view/columns.ts — satori has no measurement
 *  API, so a cell that does not fit wraps or leaks rather than clipping. */
import { metrics } from "../../theme.ts";
import type { SolvedColumn } from "../view/columns.ts";

export function Cell({
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
