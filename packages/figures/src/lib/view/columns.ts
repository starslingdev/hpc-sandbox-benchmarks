/**
 * Column width solving — pure arithmetic, no font parsing, no measurement API.
 *
 * Satori exposes no way to measure text, and it does not clip. A cell that does not fit
 * either WRAPS (silently doubling the row height and bleeding across the rule below it)
 * or LEAKS horizontally across its neighbour. Both render "successfully", exit code 0.
 * Its one introspection hook reports the CLAMPED box, which is identical whether the
 * content fits or overflows, so overflow cannot even be detected after the fact.
 *
 * The escape is the typography decision in ../../theme.ts: every glyph in DejaVu Sans
 * Mono shares one advance width, so laid width is a closed-form function of the character
 * count. `width-parity.test.ts` validates that against satori itself rather than trusting
 * the constant.
 *
 * `flexGrow` is deliberately NOT used to size columns: each table row is an independent
 * flex container, so a grow-sized column resolves against that row's own content and the
 * columns come out misaligned between rows.
 */

/** DejaVu Sans Mono advance width in font units per em (`1233/2048`), uniform across every
 *  glyph. Pinned to the bundled faces; see lib/assets/fonts.ts on why they are not subset. */
export const ADVANCE_RATIO = 1233 / 2048;

/**
 * Width in px of `text` at `fontSize`, matching satori's layout.
 *
 * Counts UTF-16 code units, which is what satori's line breaker consumes. That
 * over-counts astral characters (an emoji is two units); over-counting is the safe
 * direction, and `assertGlyphCoverage` rejects those strings before they reach a figure.
 */
export function textWidth(text: string, fontSize: number): number {
	return Math.ceil(text.length * fontSize * ADVANCE_RATIO);
}

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
	/** The widest string the solve saw, retained so a failure can name what caused it. */
	readonly widest: string;
}

/**
 * Solve each column to fit its widest cell.
 *
 * The `+ 1` is a one-pixel guard against a float tie: satori accumulates per-glyph
 * advances, so a string whose exact width lands on an integer can round either way.
 * Columns are NEVER capped or truncated — a clipped number reads as a real number that is
 * wrong by orders of magnitude, which is far worse than a wide figure.
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
