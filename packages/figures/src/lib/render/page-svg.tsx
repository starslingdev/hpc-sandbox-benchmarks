/**
 * Satori entry point for the PAGE figures. The sibling of ./svg.tsx, kept apart from it
 * because the two render different things in different faces: the composites are set in
 * DejaVu Sans Mono and sized by arithmetic, the page figures are set in the site's own
 * Geist / Geist Mono / Afacad and sized by measured advances.
 *
 * The same three rules apply here as there and for the same reasons:
 *
 *  1. HEIGHT IS NEVER PASSED. Satori treats `height` as a hard canvas and silently slices
 *     off whatever does not fit. Yoga computes it from the content instead, which is
 *     right by construction. WIDTH is passed, because the view solved it.
 *  2. GLYPH COVERAGE IS ASSERTED FIRST. Satori paints `.notdef` and exits 0, so every
 *     string in the tree is checked before it can be rendered as a tofu box. Walking the
 *     tree rather than sampling it is the point: the strings come from a dataset whose
 *     provider names and metric labels change between runs.
 *  3. PRETTY-PRINTED on element boundaries, which is safe only because `embedFont: true`
 *     emits glyph outlines and no `<text>` node where whitespace would be significant.
 */

import satori from "satori";
import { fontBytes } from "../assets/bytes.ts";
import { assertGlyphCoverage } from "../assets/coverage.ts";
import { loadPageFonts } from "../assets/page-fonts.ts";
import { PageFigure } from "../components/PageFigure.tsx";
import type { Block, PageFigureView } from "../view/page/blocks.ts";
import type { Svg } from "./svg.tsx";

/** Every string the figure will draw, in tree order. */
function stringsOf(block: Block): string[] {
	if (block.kind === "text") return [block.text];
	return block.children.flatMap(stringsOf);
}

export async function renderPageFigureSvg(view: PageFigureView): Promise<Svg> {
	assertGlyphCoverage(stringsOf(view.root), `page figure ${view.anchor}`);
	const svg = await satori(<PageFigure view={view} />, {
		width: view.width,
		fonts: loadPageFonts().map((f) => ({
			name: f.family,
			data: fontBytes(f.data),
			weight: f.weight,
			style: f.style,
		})),
		embedFont: true,
	});
	return `${svg.replaceAll("><", ">\n<")}\n` as Svg;
}
