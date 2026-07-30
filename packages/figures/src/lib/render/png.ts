/**
 * The ONLY module in this package that imports the rasteriser.
 *
 * SVG in, PNG buffer out, entirely in memory: satori has already produced the SVG
 * string, so there is no file, no browser and no page. Together with ./svg.tsx this is
 * the whole render path — JSX → SVG → PNG — and neither half touches the filesystem.
 *
 * WHY THIS NEEDS NO FONT CONFIGURATION, which is the non-obvious part. `renderTableSvg`
 * passes `embedFont: true`, so every glyph is already a `<path>` and the SVG carries no
 * `<text>` at all. resvg therefore has nothing to resolve and CANNOT substitute a
 * different face — the layout satori solved is the layout that rasterises. Turn
 * `embedFont` off and this module would silently start depending on whatever fonts the
 * machine has, which is exactly the determinism hole the bundled faces exist to close.
 * `svg.test.tsx` pins the no-`<text>` property.
 *
 * SCALE. The SVG is sized in CSS pixels; the published figures are cut at 2× device
 * pixels, which is what the browser pipeline's `deviceScaleFactor: 2` produced. `zoom` is
 * used rather than a fixed output width so the ratio holds for any figure regardless of
 * its solved width — a fixed width would silently rescale a wide six-provider table
 * differently from a narrow two-provider one.
 */
import { Resvg } from "@resvg/resvg-js";
import type { Svg } from "./svg.tsx";

/** Device-pixel ratio the published figures are cut at. Matches the browser pipeline's
 *  `deviceScaleFactor`, so a figure rendered here is the same size as the page crops it
 *  sits beside. */
export const DEFAULT_SCALE = 2;

export interface PngResult {
	readonly buffer: Uint8Array;
	/** Output pixel dimensions, after scaling. Returned rather than recomputed by callers,
	 *  since resvg is the only thing that actually knows them. */
	readonly width: number;
	readonly height: number;
}

export function toPng(svg: Svg, scale: number = DEFAULT_SCALE): PngResult {
	if (!(scale > 0)) throw new Error(`figures: png scale must be positive, got ${scale}`);
	const resvg = new Resvg(svg, { fitTo: { mode: "zoom", value: scale } });
	const rendered = resvg.render();
	return {
		buffer: rendered.asPng(),
		width: rendered.width,
		height: rendered.height,
	};
}
