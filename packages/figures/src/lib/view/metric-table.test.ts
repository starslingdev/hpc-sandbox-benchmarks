// Assembly: cells, columns, canvas width, and that the rules in ./emphasis.ts and ./spans.ts are
// actually applied. The rules themselves are asserted in their own files.
import { describe, expect, it } from "bun:test";
import { formatValue, metricTakeaway } from "@sandbox-benchmarks/results";
import { board, entry, METRIC, row } from "./__fixtures__/board.ts";
import { buildTableView, hasSpans } from "./metric-table.ts";

const view = (rows: Parameters<typeof entry>[0], extraProviders: string[] = []) =>
	buildTableView(board(rows, extraProviders), entry(rows));

describe("the rules reach the assembled view", () => {
	// The rules themselves are covered in ./emphasis.test.ts and ./spans.test.ts; these pin that
	// buildTableView actually applies them, which is the wiring those files cannot see.
	it("applies the crowning rule to the assembled rows", () => {
		const crowned = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 10, rank: 2, verdict: "separated" }),
		]);
		expect(crowned.rows[0]?.emphasis).toBe("lead");

		const uncrowned = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 10, rank: 2, verdict: "underpowered" }),
		]);
		expect(uncrowned.rows.every((r) => r.emphasis !== "lead")).toBe(true);
	});

	it("plots interval spans, and labels a shared rank", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 20, rank: 1, tiedWithAbove: "identical-value" }),
		]);
		expect(v.rows[1]?.cells[0]).toBe("=1");
		expect(v.rows[0]?.span).not.toBeNull();
	});

	it("draws no bars, and says so in the footnote, when no row has an interval", () => {
		const v = view([
			row({
				providerId: "a",
				interval: { median: 10, lo: 10, hi: 10, level: 0.95, resamples: 0 },
			}),
		]);
		expect(hasSpans(v)).toBe(false);
		// A legend describing a bar the figure does not draw would be its only false claim.
		expect(v.footnote).toContain("no interval to plot");
	});
});

describe("rule 3 — a provider that was not measured gets an explicit row", () => {
	it("renders an unmeasured provider rather than omitting it", () => {
		const v = view([row({ providerId: "a" })], ["ghost"]);
		const ghost = v.rows.find((r) => r.providerId === "ghost");
		expect(ghost?.emphasis).toBe("gap");
		expect(ghost?.cells).toContain("not measured");
	});

	it("never gives an unmeasured provider a bar — a gap is not a zero", () => {
		const v = view([row({ providerId: "a" })], ["ghost"]);
		expect(v.rows.find((r) => r.providerId === "ghost")?.span).toBeNull();
	});
});

describe("shared formatting with the Markdown surface", () => {
	it("takes the takeaway sentence from results, not a local reimplementation", () => {
		const rows = [
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 10, rank: 2, verdict: "separated" }),
		];
		// Same function the Markdown calls: the two surfaces cannot drift into different sentences.
		expect(view(rows).takeaway).toBe(metricTakeaway("cpu", METRIC, rows));
	});

	it("formats values and intervals with the results formatters", () => {
		const rows = [
			row({
				providerId: "a",
				value: 1 / 3,
				interval: { median: 1 / 3, lo: 0.1, hi: 0.9, level: 0.95, resamples: 10_000 },
			}),
		];
		expect(view(rows).rows[0]?.cells[2]).toBe(formatValue(1 / 3));
		expect(view(rows).rows[0]?.cells[3]).toBe("0.1 – 0.9");
	});
});

describe("canvas width", () => {
	it("is wide enough for every column plus padding", () => {
		const v = view([row({ providerId: "a" })]);
		const columnsWidth = v.columns.reduce((sum, c) => sum + c.width, 0);
		expect(v.width).toBeGreaterThanOrEqual(columnsWidth);
	});

	it("grows to fit a long provider name rather than truncating it", () => {
		const short = view([row({ providerId: "a" })]);
		const long = view([row({ providerId: "a-very-long-provider-display-name-indeed" })]);
		expect(long.width).toBeGreaterThan(short.width);
		expect(long.rows[0]?.cells[1]).toBe("a-very-long-provider-display-name-indeed");
	});
});
