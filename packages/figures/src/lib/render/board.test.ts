// This file rasterizes deliberately — see the note at the top of ./png.test.ts. Two test files that
// both call `toPng` is the only configuration in which an un-memoized `initWasm()` fails.
import { describe, expect, it } from "bun:test";
import { dark } from "../../theme.ts";
import { board, row } from "../view/__fixtures__/board.ts";
import { renderBoardFigures, viewForFigure } from "./board.ts";
import { toPng } from "./png.ts";

const rows = [
	row({ providerId: "alpha", value: 20, rank: 1 }),
	row({ providerId: "beta", value: 10, rank: 2, verdict: "separated" }),
];

describe("renderBoardFigures", () => {
	it("renders one figure per planned dimension and rasterizes", async () => {
		const { plan, figures } = await renderBoardFigures(board(rows), { theme: dark });
		expect(figures).toHaveLength(plan.figures.length);
		expect(figures[0]?.plan.fileName).toBe("cpu.svg");
		const png = await toPng(figures[0]?.svg ?? ("" as never));
		expect(png.length).toBeGreaterThan(1000);
	});

	it("refuses a plan that does not belong to the board it is rendered against", () => {
		expect(() =>
			viewForFigure(board(rows), {
				fileName: "ghost.svg",
				dimension: "network",
				metricId: "nope",
				altText: "",
			}),
		).toThrow(/not in the board/);
	});
});
