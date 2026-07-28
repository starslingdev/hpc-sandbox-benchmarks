import { describe, expect, it } from "bun:test";
import { dark, metrics } from "../../theme.ts";
import { board, entry, row } from "../view/__fixtures__/board.ts";
import { buildTableView } from "../view/metric-table.ts";
import { renderTableSvg } from "./svg.ts";

const rows = [
	row({ providerId: "alpha", value: 20, rank: 1 }),
	row({ providerId: "beta", value: 10, rank: 2, verdict: "separated" }),
];
const view = () => buildTableView(board(rows), entry(rows));

describe("renderTableSvg", () => {
	it("emits one element per line so a regenerated figure produces a readable diff", async () => {
		const svg = await renderTableSvg(view(), { theme: dark });
		const lines = svg.split("\n");
		expect(lines.length).toBeGreaterThan(50);
		// Satori's own output is a single line; without the split, git reports the whole file changed.
		expect(svg.includes("><")).toBe(false);
		expect(svg.endsWith("\n")).toBe(true);
	});

	it("embeds glyphs as paths, so the figure renders without the font and clears GitHub's sanitiser", async () => {
		const svg = await renderTableSvg(view(), { theme: dark });
		// `<text>` would be font-dependent at view time AND is what GitHub's Markdown sanitiser
		// mangles (it strips `dominant-baseline`). Neither may appear.
		expect(svg).not.toContain("<text");
		expect(svg).toContain("<path");
	});

	it("is byte-identical across renders — the artifact gate depends on it", async () => {
		const a = await renderTableSvg(view(), { theme: dark });
		const b = await renderTableSvg(view(), { theme: dark });
		expect(a).toBe(b);
	});

	it("sizes the canvas from the content, never from a fixed height that could slice rows off", async () => {
		const svg = await renderTableSvg(view(), { theme: dark });
		const height = /<svg[^>]*height="(\d+)"/.exec(svg)?.[1];
		expect(Number(height)).toBeGreaterThan(metrics.rowHeight * rows.length);
	});

	it("throws naming the character when a string needs a glyph the bundled fonts don't cover", async () => {
		const exotic = [row({ providerId: "深度算力", value: 20, rank: 1 })];
		const v = buildTableView(board(exotic), entry(exotic));
		// Satori would silently paint tofu boxes and exit 0; a published figure of `□□□□` is worse
		// than a failed build.
		expect(renderTableSvg(v, { theme: dark })).rejects.toThrow(/U\+6DF1/);
	});
});
