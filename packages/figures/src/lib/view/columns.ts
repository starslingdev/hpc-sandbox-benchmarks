/**
 * Column width solving — pure arithmetic, no font parsing, no measurement API.
 *
 * Satori exposes no way to measure text. Its only introspection hook (`onNodeDetected`) reports the
 * CLAMPED box of a cell, which is identical whether the content fits or overflows, so it cannot be
 * used to detect overflow on the real tree. And overflow is destructive rather than clipped: a cell
 * that does not fit either WRAPS (silently doubling row height and bleeding across the row rule) or
 * LEAKS horizontally across its neighbour. Both render "successfully" with exit code 0.
 *
 * The escape is the typography decision in ../../theme.ts: every glyph in DejaVu Sans Mono shares one
 * advance width, so laid width is a closed-form function of the character count. Verified against
 * satori's own layout across 7 font sizes × 6 strings (including `W`, `0`, `(`, an en dash and a
 * 15-char interval): `ceil(chars × fontSize × 1233/2048)` reproduced satori's width in every case.
 *
 * `flexGrow` is deliberately NOT used to size columns: each table row is an independent flex
 * container, so `flexGrow: 1` resolves per row against that row's own content and columns come out
 * misaligned by tens of pixels between rows.
 */

/** DejaVu Sans Mono advance width, in font units per em (`1233/2048`). Uniform across every glyph. */
export const ADVANCE_RATIO = 1233 / 2048;

/**
 * Width in px of `text` at `fontSize`, matching satori's layout exactly.
 *
 * Counts UTF-16 code units, which is what satori's line breaker consumes. That over-counts astral
 * characters (an emoji is 2 units) — over-counting is the safe direction, and `assertGlyphCoverage`
 * rejects those strings before they can reach a figure anyway.
 */
export function textWidth(text: string, fontSize: number): number {
	return Math.ceil(text.length * fontSize * ADVANCE_RATIO);
}

/** How a column's cells sit within the solved width. */
export type Align = "left" | "right";

export interface ColumnSpec {
	readonly id: string;
	/** Rendered header label. Participates in the width solve like any other cell. */
	readonly header: string;
	readonly align: Align;
}

export interface SolvedColumn extends ColumnSpec {
	/** Total column width including both paddings. */
	readonly width: number;
	/** The widest cell string the solve saw, retained so a failure names the string that caused it. */
	readonly widest: string;
}

/**
 * Solve each column to fit its widest cell.
 *
 * `+ 1` is a one-pixel guard against a float tie: satori accumulates per-glyph advances, so a string
 * whose exact width lands on an integer (`102.00000000000001`) can round either way. Numeric columns
 * are NEVER capped — a truncated number reads as a real number that is wrong by orders of magnitude,
 * which is a worse outcome than a wide figure.
 */
export function solveColumns(
	specs: readonly ColumnSpec[],
	rows: readonly (readonly string[])[],
	options: {
		readonly cellFontSize: number;
		readonly headerFontSize: number;
		readonly padX: number;
	},
): SolvedColumn[] {
	return specs.map((spec, index) => {
		let widest = spec.header;
		let max = textWidth(spec.header, options.headerFontSize);
		for (const row of rows) {
			const cell = row[index] ?? "";
			const width = textWidth(cell, options.cellFontSize);
			if (width > max) {
				max = width;
				widest = cell;
			}
		}
		return { ...spec, width: max + 2 * options.padX + 1, widest };
	});
}
