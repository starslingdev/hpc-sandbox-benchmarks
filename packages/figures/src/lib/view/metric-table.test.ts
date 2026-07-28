// The integrity rules. These are the assertions that keep a figure from claiming more than the
// statistics support — see the module comment on ./metric-table.ts for why that is the whole point.
import { describe, expect, it } from "bun:test";
import { formatValue, metricTakeaway } from "@sandbox-benchmarks/results";
import { board, entry, METRIC, row } from "./__fixtures__/board.ts";
import { buildTableView, hasSpans } from "./metric-table.ts";

const view = (rows: Parameters<typeof entry>[0], extraProviders: string[] = []) =>
	buildTableView(board(rows, extraProviders), entry(rows));

describe("rule 2 — no lead highlight the statistics do not support", () => {
	it("crowns rank 1 when the runner-up is separated", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 10, rank: 2, verdict: "separated" }),
		]);
		expect(v.rows[0]?.emphasis).toBe("lead");
	});

	it("does NOT crown when the runner-up is underpowered — the test could not have separated them", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 10, rank: 2, verdict: "underpowered" }),
		]);
		expect(v.rows.every((r) => r.emphasis !== "lead")).toBe(true);
	});

	it("does NOT crown when the runner-up is a statistical tie", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 19, rank: 2, verdict: "tied" }),
		]);
		expect(v.rows.every((r) => r.emphasis !== "lead")).toBe(true);
	});

	it("does NOT crown a shared rank 1 — a cohort is not a winner", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 20, rank: 1, verdict: "tied", tiedWithAbove: "statistical" }),
		]);
		expect(v.rows.every((r) => r.emphasis !== "lead")).toBe(true);
	});

	it("does NOT crown a sole provider — it leads nothing", () => {
		expect(view([row({ providerId: "a" })]).rows[0]?.emphasis).not.toBe("lead");
	});

	it("marks a shared rank with `=` so the table cannot read as a strict ordering", () => {
		const v = view([
			row({ providerId: "a", value: 20, rank: 1 }),
			row({ providerId: "b", value: 20, rank: 1, tiedWithAbove: "identical-value" }),
		]);
		expect(v.rows[1]?.cells[0]).toBe("=1");
	});
});

describe("rule 1 — every bar is an interval, never a bare median", () => {
	it("plots lo/hi/median as fractions of the metric's domain", () => {
		const v = view([
			row({
				providerId: "a",
				value: 20,
				rank: 1,
				interval: { median: 20, lo: 18, hi: 22, level: 0.95, resamples: 10_000 },
			}),
			row({
				providerId: "b",
				value: 10,
				rank: 2,
				interval: { median: 10, lo: 8, hi: 12, level: 0.95, resamples: 10_000 },
			}),
		]);
		// Domain is the union of the intervals: [8, 22].
		expect(v.rows[0]?.span).toEqual({ lo: (18 - 8) / 14, hi: 1, median: (20 - 8) / 14 });
		expect(v.rows[1]?.span).toEqual({ lo: 0, hi: (12 - 8) / 14, median: (10 - 8) / 14 });
	});

	it("makes overlapping intervals overlap on screen", () => {
		const v = view([
			row({
				providerId: "a",
				value: 19.8,
				rank: 1,
				interval: { median: 19.8, lo: 18.51, hi: 20.56, level: 0.95, resamples: 10_000 },
			}),
			row({
				providerId: "b",
				value: 18.6,
				rank: 2,
				verdict: "underpowered",
				interval: { median: 18.6, lo: 18.21, hi: 18.88, level: 0.95, resamples: 10_000 },
			}),
		]);
		const [a, b] = v.rows;
		// b's upper bound sits above a's lower bound — the reader sees the ambiguity the ranking has.
		expect(b?.span?.hi).toBeGreaterThan(a?.span?.lo ?? 0);
	});

	it("draws no bar when there is no interval to draw (n = 1)", () => {
		const v = view([
			row({
				providerId: "a",
				interval: { median: 10, lo: 10, hi: 10, level: 0.95, resamples: 0 },
			}),
		]);
		expect(v.rows[0]?.span).toBeNull();
		expect(hasSpans(v)).toBe(false);
	});

	it("survives a degenerate domain without dividing by zero", () => {
		const v = view([
			row({
				providerId: "a",
				value: 5,
				interval: { median: 5, lo: 5, hi: 5, level: 0.95, resamples: 10 },
			}),
			row({
				providerId: "b",
				value: 5,
				interval: { median: 5, lo: 5, hi: 5, level: 0.95, resamples: 10 },
			}),
		]);
		for (const r of v.rows) {
			expect(Number.isFinite(r.span?.median ?? Number.NaN)).toBe(true);
		}
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
