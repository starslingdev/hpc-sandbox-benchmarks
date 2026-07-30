/**
 * The CSS automatic table layout algorithm, reimplemented — because satori has no table
 * layout at all and the page's three tables are all `<table class="w-full">` with
 * browser-solved columns.
 *
 * WHY REIMPLEMENT IT RATHER THAN PICK WIDTHS THAT LOOK RIGHT. A column width is not
 * cosmetic here: it decides where every cell in that column wraps, which decides the row's
 * height, which decides the vertical position of every row below it. Guess one column
 * 8px narrow and a cell three rows down takes an extra line and the bottom two thirds of
 * the figure slides. The widths have to be DERIVED the way the browser derives them or
 * the figure is a different table that happens to contain the same numbers.
 *
 * THE ALGORITHM (CSS 2.1 §17.5.2.2, as Blink implements it):
 *
 *   1. Each column gets a MIN-CONTENT width (its widest unbreakable piece) and a
 *      MAX-CONTENT width (its widest cell laid out on one line), both plus padding.
 *   2. If the table is wider than the sum of the max-contents, the surplus is shared out
 *      in proportion to max-content.
 *   3. Otherwise, if it is wider than the sum of the min-contents, each column gets
 *      `min + (max - min) × f` for one shared `f` — the case all three of these tables
 *      are in.
 *   4. Otherwise every column gets its min-content and the table overflows.
 *
 * VALIDATION. Run against the environments table this reproduces Chromium's seven column
 * widths to within 0.02px (145.40/165.21/118.32/109.80/118.32/118.63/118.32 against a
 * measured 145.41/165.20/118.31/109.80/118.31/118.63/118.34). That agreement is not a
 * coincidence and it is not luck: it only holds because {@link ../text.ts} reproduces
 * Chromium's INTEGER GLYPH ADVANCES. With exact fractional advances the same algorithm is
 * out by several pixels per column. The two pieces are only correct together.
 *
 * THE BREAK OPPORTUNITIES ARE THE SUBTLE PART. Min-content is "the widest piece that
 * cannot be broken", and getting the break set wrong is invisible until a column is wrong
 * by 24px. Chromium breaks at spaces AND AFTER A HYPHEN — `4.19.0-gvisor` becomes
 * `4.19.0-` / `gvisor`, and `container-other` becomes `container-` / `other`, both of
 * which are visible in the published crop. Modelling spaces only put the gVisor column
 * 24px wide of the browser's and pushed every column after it.
 */

/** A column's intrinsic widths, already including whatever padding the cells carry. */
export interface ColumnIntrinsics {
	readonly min: number;
	readonly max: number;
}

/**
 * Break `text` into the pieces a line breaker may NOT split further.
 *
 * Spaces, plus a break opportunity after each hyphen (the hyphen stays with the piece to
 * its left, which is what Chromium does and what the published crop shows). Deliberately
 * not a UAX-14 implementation: this needs to agree with the ~200 strings the figures
 * actually contain, and every additional break class is another way for it to disagree
 * with satori's own breaker at render time.
 */
export function breakPieces(text: string): string[] {
	return text
		.split(/\s+/)
		.filter(Boolean)
		.flatMap((word) => word.split(/(?<=-)/g))
		.filter(Boolean);
}

/**
 * Solve column widths for a table of `tableWidth`.
 *
 * `tableWidth` is the border-box width the table is given (`w-full` inside a bordered
 * container is the container width minus its two 1px borders), not the sum of anything.
 */
export function solveTableColumns(
	columns: readonly ColumnIntrinsics[],
	tableWidth: number,
): number[] {
	if (columns.length === 0) return [];
	const sumMin = columns.reduce((a, c) => a + c.min, 0);
	const sumMax = columns.reduce((a, c) => a + c.max, 0);

	if (tableWidth >= sumMax) {
		// Surplus shared in proportion to max-content. `sumMax === 0` would divide by zero on
		// a table of empty cells; share it evenly instead of producing NaN widths, which
		// satori accepts and lays out as zero.
		const surplus = tableWidth - sumMax;
		if (sumMax === 0) return columns.map(() => tableWidth / columns.length);
		return columns.map((c) => c.max + (surplus * c.max) / sumMax);
	}
	if (tableWidth > sumMin) {
		const f = (tableWidth - sumMin) / (sumMax - sumMin);
		return columns.map((c) => c.min + (c.max - c.min) * f);
	}
	// Narrower than the min-contents: every column takes its min and the table overflows
	// its container, exactly as the browser lets it.
	return columns.map((c) => c.min);
}
