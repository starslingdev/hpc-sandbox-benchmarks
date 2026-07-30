/**
 * The shared shape of the page's three tables — environments, all-metrics, coverage.
 *
 * They differ in what a cell CONTAINS (a wrapped spec value, a metric label with a unit
 * suffix, a value over a `best` marker, a prose failure reason) and agree on everything
 * else: browser-solved column widths, a 1px rule between rows, row height driven by the
 * tallest cell, cells padded and aligned per column. This module owns the agreement; the
 * three builders own their cells.
 *
 * A CELL IS A LIST OF LINES, AND A LINE IS A LIST OF RUNS. That shape is not generality
 * for its own sake — it is what each of the three actually needs. `Modal (VM)`'s CPU-model
 * cell is four wrapped lines; a metric label is one line of three runs at three sizes and
 * three colours (`Node.js web tooling` + `runs/s ↑` + `headline`); a measured value is two
 * lines, the number and the `best` marker under it. Anything narrower than that would have
 * to be widened by the second table to use it.
 *
 * ROW HEIGHT IS COMPUTED, NOT MEASURED. Satori computes heights and never reports them
 * back, so a builder that let satori size its rows could not know where the next row
 * starts — and in a 3,000px table every row after the first mistake is displaced. Each
 * cell therefore states how tall its lines are, the row takes the tallest, and the figure's
 * total height follows by construction.
 *
 * THE 1px RULE IS DRAWN AS THE ROW'S BOTTOM BORDER, which is half a pixel away from where
 * the browser puts it. Chromium collapses adjacent table borders and reports a row's box
 * as `content + 1`, with the shared rule straddling the boundary — the first row of a
 * table comes out at `content + 0.5`. Satori's Yoga rounds every box to a whole pixel, so
 * that half cannot be reproduced; the figure is consistently 0.5px (one device pixel at
 * the 2× the crops are cut at) taller per table. It is the one unavoidable systematic
 * offset in these three figures and it is why they cannot reach the sub-2% the charts do.
 */
import type { Block, BoxStyle, TextBlock } from "./blocks.ts";
import { stack } from "./blocks.ts";
import { solveTableColumns } from "./table-layout.ts";

/** One line inside a cell: runs laid left to right, and the line box's height. */
export interface CellLine {
	readonly height: number;
	readonly runs: readonly TextBlock[];
}

export interface TableCell {
	/** Min-content width INCLUDING this cell's horizontal padding. */
	readonly min: number;
	/** Max-content width INCLUDING this cell's horizontal padding. */
	readonly max: number;
	readonly padX: number;
	readonly padY: number;
	readonly align?: "left" | "right";
	/**
	 * Vertical placement inside the row. `middle` is the DEFAULT because it is what the page
	 * does: a `<td>` with no `align-top` centres its content, so `AMD EPYC` sits halfway down
	 * the four-line row its Intel neighbour forces. The all-metrics value cells pass `top`,
	 * which is the `align-top` they carry on the page.
	 */
	readonly valign?: "top" | "middle";
	readonly background?: string;
	readonly borderLeft?: string;
	/**
	 * The cell's lines, given the CONTENT width the solve produced.
	 *
	 * A function rather than a value because wrapping cannot be decided before the column is
	 * solved, and the column cannot be solved before every cell has stated its intrinsics.
	 * That ordering is the whole reason the browser's table algorithm has two passes.
	 */
	readonly lines: (contentWidth: number) => readonly CellLine[];
}

export interface TableRow {
	readonly cells: readonly TableCell[];
	readonly background?: string;
	/** Colour of the 1px rule below this row, or `undefined` for no rule (the last row). */
	readonly rule?: string;
	/** A full-width band row (a dimension header). Its single cell spans every column. */
	readonly span?: boolean;
}

export interface TableResult {
	readonly block: Block;
	readonly columns: readonly number[];
	readonly height: number;
}

/** Height of a cell's content: its lines plus its vertical padding. */
function cellHeight(cell: TableCell, contentWidth: number): number {
	const lines = cell.lines(contentWidth);
	return cell.padY * 2 + lines.reduce((sum, line) => sum + line.height, 0);
}

export function buildTable(rows: readonly TableRow[], tableWidth: number): TableResult {
	const columnCount = Math.max(...rows.filter((r) => !r.span).map((r) => r.cells.length), 0);
	const intrinsics = Array.from({ length: columnCount }, (_, index) => {
		let min = 0;
		let max = 0;
		for (const row of rows) {
			if (row.span) continue;
			const cell = row.cells[index];
			if (!cell) continue;
			min = Math.max(min, cell.min);
			max = Math.max(max, cell.max);
		}
		return { min, max };
	});
	const columns = solveTableColumns(intrinsics, tableWidth);

	let height = 0;
	const rowBlocks: Block[] = rows.map((row) => {
		const widths = row.span ? [tableWidth] : columns;
		const rowHeight = Math.max(
			...row.cells.map((cell, index) => cellHeight(cell, (widths[index] ?? 0) - cell.padX * 2)),
			0,
		);
		height += rowHeight + (row.rule === undefined ? 0 : 1);

		const cellBlocks = row.cells.map((cell, index) => {
			const width = widths[index] ?? 0;
			const lines = cell.lines(width - cell.padX * 2);
			const box: BoxStyle = {
				width,
				height: rowHeight,
				paddingLeft: cell.padX,
				paddingRight: cell.padX,
				paddingTop: cell.padY,
				paddingBottom: cell.padY,
				background: cell.background,
				borderLeft: cell.borderLeft,
			};
			return stack(
				"column",
				lines.map((line) =>
					stack("row", line.runs, {
						height: line.height,
						// CENTRED, which is an approximation of the browser's baseline and is the
						// better one MEASURED. A line box actually places its runs on a shared
						// baseline, so a 12px number inside a 20px line box sits 3.5px down it rather
						// than the 2px centring gives. Bottom-aligning the boxes instead — the obvious
						// fix, since a descender scales with the size — was tried and made the
						// all-metrics figure WORSE (5.83% differing pixels to 6.07%): it corrects the
						// single-run lines and over-corrects the mixed-size ones, where the small unit
						// suffix drops well below where its baseline puts it. Reproducing this
						// properly needs the strut's own ascent and half-leading, i.e. a line-box
						// model; the residual is under a pixel and is documented rather than guessed at.
						align: "center",
						justify: cell.align === "right" ? "flex-end" : "flex-start",
					}),
				),
				{
					...box,
					align: cell.align === "right" ? "flex-end" : "flex-start",
					justify: cell.valign === "top" ? "flex-start" : "center",
				},
			);
		});

		// `height` INCLUDES the rule. Satori boxes are border-box, so a row given `height:
		// rowHeight` plus a 1px bottom border comes out `rowHeight` tall in total and the row
		// below it starts a pixel early — 1px per row, 20px down a coverage table, and every
		// row after the first displaced by a growing amount.
		return stack("row", cellBlocks, {
			width: tableWidth,
			height: rowHeight + (row.rule === undefined ? 0 : 1),
			background: row.background,
			borderBottom: row.rule,
		});
	});

	return {
		block: stack("column", rowBlocks, { width: tableWidth }),
		columns,
		height,
	};
}
