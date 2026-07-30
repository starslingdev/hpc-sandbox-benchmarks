import { describe, expect, it } from "bun:test";
import type { ColumnSpec } from "./columns.ts";
import { ADVANCE_RATIO, solveColumns, textWidth } from "./columns.ts";

/**
 * The width solver's unit tests. The calibration of {@link textWidth} against satori's own
 * layout is a separate, slower test (`width-parity.test.ts`) — these cover the arithmetic
 * and the solve, which is where the interesting mistakes are.
 */

const SPECS: ColumnSpec[] = [
	{ id: "metric", header: "METRIC", align: "left" },
	{ id: "a", header: "A", align: "right" },
];

describe("textWidth", () => {
	it("is linear in character count for a monospace face", () => {
		expect(textWidth("ab", 16)).toBe(Math.ceil(2 * 16 * ADVANCE_RATIO));
		expect(textWidth("abcd", 16)).toBe(Math.ceil(4 * 16 * ADVANCE_RATIO));
	});

	it("treats every glyph as the same width — the property the solver rests on", () => {
		// If this ever stops holding, the bundled face was changed or subset and every column
		// width in every figure is silently wrong.
		expect(textWidth("WWWW", 20)).toBe(textWidth("iiii", 20));
		expect(textWidth("0000", 20)).toBe(textWidth("(),.", 20));
	});

	it("is zero for the empty string", () => {
		expect(textWidth("", 16)).toBe(0);
	});
});

describe("solveColumns", () => {
	it("sizes a column to its widest cell, not its header", () => {
		const [, a] = solveColumns(SPECS, [["m", "1234567890"]], {
			cellFontSize: 16,
			headerFontSize: 12,
			padX: 10,
		});
		expect(a?.widest).toBe("1234567890");
		expect(a?.width).toBe(textWidth("1234567890", 16) + 20 + 1);
	});

	it("falls back to the header when it is the widest thing in the column", () => {
		const [metric] = solveColumns(SPECS, [["x", "1"]], {
			cellFontSize: 16,
			headerFontSize: 12,
			padX: 10,
		});
		expect(metric?.widest).toBe("METRIC");
	});

	it("never truncates: a very long cell widens its column", () => {
		// MUTANT: cap the width. A clipped number reads as a real number wrong by orders of
		// magnitude, which is worse than a wide figure — so there is deliberately no cap.
		const long = "x".repeat(200);
		const [metric] = solveColumns(SPECS, [[long, "1"]], {
			cellFontSize: 16,
			headerFontSize: 12,
			padX: 10,
		});
		expect(metric?.width).toBeGreaterThan(textWidth(long, 16));
	});

	it("tolerates a short row rather than reading undefined as a wide cell", () => {
		const solved = solveColumns(SPECS, [["only-one-cell"]], {
			cellFontSize: 16,
			headerFontSize: 12,
			padX: 10,
		});
		expect(solved[1]?.widest).toBe("A");
	});
});
