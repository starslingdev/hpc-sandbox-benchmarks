/**
 * The rasterisation step.
 *
 * The assertion that carries weight is the SCALE. Everything else about this module is
 * visible the moment you look at an image; a figure rasterised at 1× instead of 2× looks
 * entirely correct on its own and is half the resolution it claims — you only notice when
 * it is placed beside a 2× crop, or enlarged. resvg's default `fitTo` is `original`, so
 * getting this wrong is a one-word edit away and silent.
 */
import { describe, expect, it } from "bun:test";
import { backfillNoteOf, dimensionLabels, resolveComposite } from "../../domain/index.ts";
import { light } from "../../theme.ts";
import { FIXTURE } from "../view/__fixtures__/data.ts";
import { buildTableView } from "../view/table.ts";
import { DEFAULT_SCALE, toPng } from "./png.ts";
import { renderTableSvg } from "./svg.tsx";

async function fixtureSvg() {
	const view = buildTableView(
		resolveComposite({ name: "fixture", rows: { predicate: () => true } }, FIXTURE),
		{ dimensionLabels, backfillNote: backfillNoteOf(FIXTURE.backfill), run: FIXTURE.run },
	);
	return { view, svg: await renderTableSvg(view, light) };
}

/** PNG signature: the 8 bytes every PNG starts with. */
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("toPng", () => {
	it("emits an actual PNG", async () => {
		const { svg } = await fixtureSvg();
		const png = toPng(svg);
		// Compared as arrays rather than with Buffer#equals, so a wrong first byte reports WHICH
		// byte it found instead of `false`.
		expect([...png.buffer.subarray(0, 8)]).toEqual(PNG_MAGIC);
		expect(png.buffer.length).toBeGreaterThan(1000);
	});

	it("rasterises at DEFAULT_SCALE times the SVG's own dimensions", async () => {
		// MUTANT: change `fitTo` to `{ mode: "original" }` in png.ts. Every published figure
		// silently halves in resolution while still looking correct in isolation.
		const { view, svg } = await fixtureSvg();
		const svgHeight = Number(/height="(\d+)"/.exec(svg)?.[1]);
		expect(svgHeight).toBeGreaterThan(0);

		const png = toPng(svg);
		expect(png.width).toBe(view.width * DEFAULT_SCALE);
		expect(png.height).toBe(svgHeight * DEFAULT_SCALE);
	});

	it("honours an explicit scale", async () => {
		const { view, svg } = await fixtureSvg();
		expect(toPng(svg, 1).width).toBe(view.width);
		expect(toPng(svg, 3).width).toBe(view.width * 3);
	});

	it("keeps the 2x default aligned with the browser pipeline's deviceScaleFactor", () => {
		// The page crops in scripts/snapshot-sandbox-benchmark-images.ts are cut at
		// deviceScaleFactor 2. A figure that sits beside one must match it, or the pair
		// renders at visibly different sharpness in the same document.
		expect(DEFAULT_SCALE).toBe(2);
	});

	it("rejects a non-positive scale rather than emitting a zero-pixel image", async () => {
		const { svg } = await fixtureSvg();
		expect(() => toPng(svg, 0)).toThrow(/positive/);
		expect(() => toPng(svg, -1)).toThrow(/positive/);
		expect(() => toPng(svg, Number.NaN)).toThrow(/positive/);
	});
});
