/**
 * Structural assertions on the rendered SVG.
 *
 * Deliberately NOT a byte-snapshot of the output. Satori is 0.x, so a patch bump reflows
 * every figure, and a golden-bytes test would then fail as a matter of course and be
 * updated without being read — a gate nobody trusts is worse than none. What is asserted
 * here is what a reviewer would actually check and cannot see in a diff of outline data.
 */
import { describe, expect, it } from "bun:test";
import { backfillNoteOf, dimensionLabels, resolveComposite } from "../../domain/index.ts";
import { light } from "../../theme.ts";
import { FIXTURE } from "../view/__fixtures__/data.ts";
import { buildTableView } from "../view/table.ts";
import { renderTableSvg } from "./svg.tsx";

async function render() {
	const view = buildTableView(
		resolveComposite({ name: "fixture", rows: { predicate: () => true } }, FIXTURE),
		{
			dimensionLabels,
			backfillNote: backfillNoteOf(FIXTURE.backfill),
			run: FIXTURE.run,
		},
	);
	return { view, svg: await renderTableSvg(view, light) };
}

describe("renderTableSvg", () => {
	it("emits no <text>, so the figure is self-contained and survives GitHub's sanitiser", async () => {
		// `embedFont: true` draws glyphs as paths. A <text> SVG renders in whatever font the
		// VIEWER has, while the layout was solved with the bundled face's metrics — so it
		// misrenders anywhere the font is absent. GitHub's Markdown sanitiser also strips
		// `dominant-baseline` from <text>, which is a second, independent reason.
		const { svg } = await render();
		expect(svg).not.toContain("<text");
	});

	it("uses only the element set the pretty-printer is safe to split on", async () => {
		// svg.ts splits on `><`. That is safe only while no element has significant
		// whitespace — i.e. while there is no <text>. Pin the set so a satori upgrade that
		// starts emitting one is caught here rather than as corrupted committed figures.
		const { svg } = await render();
		const elements = new Set([...svg.matchAll(/<([a-zA-Z]+)/g)].flatMap((m) => m[1] ?? []));
		for (const element of elements) {
			expect(["svg", "defs", "clipPath", "mask", "g", "path", "rect"]).toContain(element);
		}
	});

	it("is pretty-printed, so a corrupt file is visibly not N lines", async () => {
		const { svg } = await render();
		expect(svg.split("\n").length).toBeGreaterThan(20);
		expect(svg.endsWith("\n")).toBe(true);
	});

	it("renders at the solved width, and lets the height be computed", async () => {
		// MUTANT: pass `height` in svg.ts. It is a hard canvas, not a hint — one row too few
		// and rows are sliced off the bottom of the published figure with no error.
		const { view, svg } = await render();
		expect(svg).toContain(`width="${view.width}"`);
		const height = Number(/height="(\d+)"/.exec(svg)?.[1]);
		expect(height).toBeGreaterThan(0);
	});

	it("refuses a string the bundled fonts are not asserted to cover", async () => {
		// MUTANT: drop the assertGlyphCoverage call. Satori paints .notdef and exits 0, so a
		// provider named in a script the fonts lack publishes as a row of tofu boxes.
		const view = buildTableView(
			resolveComposite({ name: "f", rows: { ids: ["disk_iops"] } }, FIXTURE),
			{ title: "中文", dimensionLabels, backfillNote: null, run: FIXTURE.run },
		);
		await expect(renderTableSvg(view, light)).rejects.toThrow(/U\+4E2D/);
	});
});
