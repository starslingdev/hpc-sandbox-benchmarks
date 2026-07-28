// NOTE: board.test.ts ALSO rasterizes, on purpose. `initWasm()` is single-shot and `bun test` runs
// every file in one process, so an un-memoized init only fails when two files rasterize — exactly
// the shape that passes as `bun test png.test.ts` and fails as `bun run test`.
import { describe, expect, it } from "bun:test";
import { dark, metrics, type_ } from "../../theme.ts";
import { board, entry, row } from "../view/__fixtures__/board.ts";
import { buildTableView } from "../view/metric-table.ts";
import { toPng } from "./png.ts";
import { renderTableSvg } from "./svg.ts";

const rows = [row({ providerId: "alpha", value: 20, rank: 1 })];
const view = buildTableView({
	board: board(rows),
	entry: entry(rows),
	cellFontSize: type_.cell,
	headerFontSize: type_.columnHeader,
	titleFontSize: type_.title,
	subtitleFontSize: type_.subtitle,
	footnoteFontSize: type_.footnote,
	padX: metrics.cellPadX,
});

describe("toPng", () => {
	it("rasterizes to a real PNG", async () => {
		const png = await toPng(await renderTableSvg(view, { theme: dark }));
		expect(png.length).toBeGreaterThan(1000);
		// PNG magic.
		expect([...png.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
	});

	it("can be called twice in one process — initWasm is single-shot and must be memoized", async () => {
		const svg = await renderTableSvg(view, { theme: dark });
		const a = await toPng(svg);
		const b = await toPng(svg);
		expect(a.length).toBe(b.length);
	});

	it("honours a target width", async () => {
		const svg = await renderTableSvg(view, { theme: dark });
		const wide = await toPng(svg, { width: view.width * 2 });
		const normal = await toPng(svg);
		expect(wide.length).toBeGreaterThan(normal.length);
	});
});
