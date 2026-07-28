// What a bar represents. Tested directly against rows, because "the bar is the interval, not the
// median" is the rule that stops the figure from reading as more certain than the table.
import { describe, expect, it } from "bun:test";
import { row } from "./__fixtures__/board.ts";
import { domainOf, spanOf } from "./spans.ts";

const interval = (lo: number, hi: number, resamples = 10_000) => ({
	median: (lo + hi) / 2,
	lo,
	hi,
	level: 0.95,
	resamples,
});

describe("domainOf", () => {
	it("spans the union of every interval, not the range of the medians", () => {
		expect(
			domainOf([
				row({ providerId: "a", value: 20, interval: interval(18, 22) }),
				row({ providerId: "b", value: 10, interval: interval(8, 12) }),
			]),
		).toEqual({ lo: 8, hi: 22 });
	});

	it("includes a median that falls outside its own interval bounds", () => {
		// Defensive: the domain must contain every value it will plot a tick for.
		const d = domainOf([row({ providerId: "a", value: 30, interval: interval(8, 12) })]);
		expect(d?.hi).toBeGreaterThanOrEqual(30);
	});

	it("ignores rows with no interval to plot", () => {
		expect(
			domainOf([
				row({ providerId: "a", value: 20, interval: interval(18, 22) }),
				row({ providerId: "b", value: 999, interval: interval(999, 999, 0) }),
			]),
		).toEqual({ lo: 18, hi: 22 });
	});

	it("is null when nothing has an interval — the figure then draws no bars at all", () => {
		expect(domainOf([row({ providerId: "a", interval: interval(5, 5, 0) })])).toBeNull();
	});

	it("widens a degenerate domain rather than dividing by zero", () => {
		const d = domainOf([row({ providerId: "a", value: 5, interval: interval(5, 5) })]);
		expect(d).not.toBeNull();
		expect(d?.hi).toBeGreaterThan(d?.lo ?? 0);
	});
});

describe("spanOf", () => {
	const domain = { lo: 8, hi: 22 };

	it("maps lo/hi/median onto the domain as fractions", () => {
		const span = spanOf(row({ providerId: "a", value: 20, interval: interval(18, 22) }), domain);
		expect(span).toEqual({ lo: (18 - 8) / 14, hi: 1, median: (20 - 8) / 14 });
	});

	it("keeps overlapping intervals overlapping — the ambiguity the ranking has", () => {
		const a = spanOf(
			row({ providerId: "a", value: 19.8, interval: interval(18.51, 20.56) }),
			domain,
		);
		const b = spanOf(
			row({ providerId: "b", value: 18.6, interval: interval(18.21, 18.88) }),
			domain,
		);
		expect(b?.hi).toBeGreaterThan(a?.lo ?? 0);
	});

	it("draws nothing for a single trial — an exact value is not a measured distribution", () => {
		expect(spanOf(row({ providerId: "a", interval: interval(10, 10, 0) }), domain)).toBeNull();
	});

	it("draws nothing when there is no domain", () => {
		expect(spanOf(row({ providerId: "a", interval: interval(10, 12) }), null)).toBeNull();
	});
});
