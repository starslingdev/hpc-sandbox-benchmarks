/**
 * The ONLY module in this package that imports satori.
 *
 * Three things happen here that the rest of the package must not have to know about:
 *
 *  1. THE `ReactNode` CAST. satori's published types open with `import { ReactNode } from 'react'`,
 *     and `react` is neither a dependency of satori nor installed here. Under the repo's
 *     `skipLibCheck: true` that unresolved import degenerates to the error type, so satori's first
 *     parameter is effectively `any` — `satori("hello")` would compile. Worse, it is unstable: if
 *     `@types/react` ever lands transitively, `ReactNode` becomes real and our element type stops
 *     being assignable, breaking `typecheck` with no first-party change. The cast is confined to
 *     one named site so that failure has exactly one place to happen and one place to fix.
 *  2. HEIGHT IS NEVER PASSED. `height` is a hard canvas, not a hint: pass one row too few and satori
 *     silently slices providers off the bottom of the published figure with no error. Omitting it
 *     lets Yoga compute the height from the content, which is always right by construction.
 *  3. PRETTY-PRINTING. satori emits the entire SVG on ONE line with no trailing newline. Committed
 *     as-is, a one-digit change reports as "1 file changed, 1 insertion, 1 deletion" over a 130 KB
 *     line, and GitHub declines to render the diff at all. Splitting on element boundaries is safe
 *     here ONLY because `embedFont: true` output contains no `<text>` nodes, where whitespace would
 *     be significant — verified element set: clipPath, defs, g, mask, path, rect, svg.
 */
import satori from "satori";
import type { Theme } from "../../theme.ts";
import { assertGlyphCoverage, loadFonts } from "../assets/fonts.ts";
import { MetricTable } from "../components/MetricTable.tsx";
import type { TableView } from "../view/metric-table.ts";

/** An SVG document. Branded so a plain `string` cannot be handed to the rasterizer by accident. */
declare const svgBrand: unique symbol;
export type Svg = string & { readonly [svgBrand]: "svg" };

/** See note 1. The single point of contact with satori's React-typed signature. */
type SatoriArg = Parameters<typeof satori>[0];

/** See note 3. Deterministic, and idempotent on already-split input. */
function prettyPrint(svg: string): string {
	return `${svg.replaceAll("><", ">\n<")}\n`;
}

export interface RenderSvgOptions {
	readonly theme: Theme;
}

export async function renderTableSvg(view: TableView, options: RenderSvgOptions): Promise<Svg> {
	// Fail on a character the bundled faces are not asserted to cover, BEFORE satori silently paints
	// it as a tofu box. Every string that can reach the figure is checked, not a sample.
	assertGlyphCoverage(
		[
			view.title,
			view.subtitle,
			view.takeaway,
			view.footnote,
			...view.columns.map((c) => c.header),
			...view.rows.flatMap((r) => r.cells),
		],
		`figure ${view.metricId}`,
	);

	const fonts = await loadFonts();
	const element = MetricTable({ view, theme: options.theme });
	const svg = await satori(element as unknown as SatoriArg, {
		width: view.width,
		fonts: fonts.map((f) => ({ ...f })),
		// Glyphs are embedded as paths. This is what makes the committed figure self-contained (it
		// renders identically wherever it is viewed, with no font available), and it is also what keeps
		// it clear of GitHub's Markdown sanitiser, which strips `dominant-baseline` from `<text>`.
		embedFont: true,
	});
	return prettyPrint(svg) as Svg;
}
