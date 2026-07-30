/**
 * The ONLY module in this package that imports satori.
 *
 * Three things happen here that the rest of the package must not have to know about:
 *
 *  1. HEIGHT IS NEVER PASSED. `height` is a hard canvas, not a hint: pass one row too few
 *     and satori silently slices rows off the bottom of the published figure with no
 *     error. Omitting it lets Yoga compute the height from the content, which is right by
 *     construction. The WIDTH is passed, because it was solved to fit the content in
 *     ../view/table.ts — that is what makes overflow structurally impossible rather than
 *     merely tested for.
 *  2. GLYPH COVERAGE IS ASSERTED FIRST, before satori can paint a missing glyph as a tofu
 *     box and exit 0. Every string that can reach the figure is checked, not a sample.
 *  3. PRETTY-PRINTING. Satori emits the whole SVG on one line with no trailing newline. A
 *     one-digit change then reports as a single insertion and deletion over a 100 KB line
 *     and GitHub declines to render the diff. Splitting on element boundaries is safe here
 *     only because `embedFont: true` emits no `<text>` nodes, where whitespace would be
 *     significant — `svg.test.ts` pins that element set.
 *
 * `embedFont: true` (satori's default, set explicitly because it is load-bearing) draws
 * glyphs as paths. That is what makes a committed figure self-contained: it renders
 * identically wherever it is viewed with no font installed, and it is also what keeps it
 * clear of GitHub's Markdown sanitiser, which strips `dominant-baseline` from `<text>`.
 * The cost is that the SVG is outline data and is not reviewable as a diff — the review
 * surface is the image, not the patch.
 */

import satori from "satori";
import type { Theme } from "../../theme.ts";
import { fontBytes } from "../assets/bytes.ts";
import { assertGlyphCoverage } from "../assets/coverage.ts";
import { loadFonts } from "../assets/fonts.ts";
import { MetricFigure } from "../components/MetricFigure.tsx";
import type { TableView } from "../view/table.ts";

/** An SVG document. Branded so a plain `string` cannot be handed on as rendered output. */
declare const svgBrand: unique symbol;
export type Svg = string & { readonly [svgBrand]: "svg" };

/** Deterministic, and idempotent on already-split input. */
function prettyPrint(svg: string): string {
	return `${svg.replaceAll("><", ">\n<")}\n`;
}

export async function renderTableSvg(view: TableView, theme: Theme): Promise<Svg> {
	assertGlyphCoverage(
		[
			view.title,
			view.subtitle,
			view.footnote,
			...view.columns.map((c) => c.header),
			...view.groups.flatMap((g) => [
				g.label,
				...g.rows.flatMap((r) => r.cells.map((c) => c.text)),
			]),
		],
		`figure ${view.name}`,
	);

	const svg = await satori(<MetricFigure view={view} theme={theme} />, {
		width: view.width,
		fonts: loadFonts().map((f) => ({
			name: f.name,
			data: fontBytes(f.data),
			weight: f.weight,
			style: f.style,
		})),
		embedFont: true,
	});
	return prettyPrint(svg) as Svg;
}
