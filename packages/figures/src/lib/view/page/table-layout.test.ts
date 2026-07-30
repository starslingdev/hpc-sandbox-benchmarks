import { describe, expect, it } from "bun:test";
import { breakPieces, solveTableColumns } from "./table-layout.ts";

/**
 * The table solver's unit tests, on SYNTHETIC intrinsics.
 *
 * Deliberately not driven by the committed run. Against the live artifact these assertions
 * go vacuous the moment the data changes shape — which is exactly how a dropped disclosure
 * got through earlier on this branch — and the arithmetic is the thing worth pinning
 * anyway. The agreement with Chromium is measured separately and continuously by
 * `pnpm sandbox-benchmarks:figure-diff`, which is the only honest way to check it.
 */

describe("breakPieces", () => {
	it("splits on whitespace", () => {
		expect(breakPieces("relatime rw")).toEqual(["relatime", "rw"]);
	});

	it("offers a break AFTER a hyphen, keeping the hyphen on the left", () => {
		// Not cosmetic: the published crop shows Chromium breaking `4.19.0-gvisor` here, and a
		// solver that treats it as unbreakable makes its column 24px too wide and pushes every
		// column after it.
		expect(breakPieces("4.19.0-gvisor")).toEqual(["4.19.0-", "gvisor"]);
		expect(breakPieces("container-other")).toEqual(["container-", "other"]);
	});

	it("splits every hyphen in a multiply-hyphenated token", () => {
		expect(breakPieces("a-b-c")).toEqual(["a-", "b-", "c"]);
	});

	it("is empty for whitespace-only input", () => {
		expect(breakPieces("   ")).toEqual([]);
	});
});

describe("solveTableColumns", () => {
	it("gives every column its max-content when the table is exactly that wide", () => {
		const columns = [
			{ min: 20, max: 100 },
			{ min: 20, max: 200 },
		];
		expect(solveTableColumns(columns, 300)).toEqual([100, 200]);
	});

	it("shares surplus in proportion to max-content", () => {
		const columns = [
			{ min: 20, max: 100 },
			{ min: 20, max: 200 },
		];
		// 300 of content, 60 spare: a third to the first column, two thirds to the second.
		expect(solveTableColumns(columns, 360)).toEqual([120, 240]);
	});

	it("interpolates between min and max on ONE shared factor when squeezed", () => {
		const columns = [
			{ min: 100, max: 200 },
			{ min: 100, max: 300 },
		];
		// sumMin 200, sumMax 500, width 350 -> f = 0.5.
		expect(solveTableColumns(columns, 350)).toEqual([150, 200]);
	});

	it("pins a column whose min equals its max, whatever the factor", () => {
		// This is what `whitespace-nowrap` does to a spec table's label column, and it is why
		// that column comes out at exactly its text width in the figure and on the page.
		const columns = [
			{ min: 145, max: 145 },
			{ min: 100, max: 400 },
		];
		const [label] = solveTableColumns(columns, 400);
		expect(label).toBe(145);
	});

	it("falls back to min-content and lets the table overflow when it cannot fit", () => {
		const columns = [
			{ min: 100, max: 200 },
			{ min: 100, max: 300 },
		];
		expect(solveTableColumns(columns, 150)).toEqual([100, 100]);
	});

	it("shares an empty table evenly instead of producing NaN widths", () => {
		// A NaN width is not an error in satori: it lays the column out at zero and the figure
		// renders successfully with its content piled at the left edge.
		expect(
			solveTableColumns(
				[
					{ min: 0, max: 0 },
					{ min: 0, max: 0 },
				],
				100,
			),
		).toEqual([50, 50]);
	});

	it("returns nothing for no columns", () => {
		expect(solveTableColumns([], 500)).toEqual([]);
	});
});
