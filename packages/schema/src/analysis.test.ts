import { describe, expect, it } from "bun:test";
import { aggregate } from "./index.ts";

describe("aggregate", () => {
	it("summarises a multi-sample distribution (R-7 percentiles, n-1 stdev)", () => {
		// The three real per-run samples from a Daytona node-web-tooling run.
		const a = aggregate([16.19, 16.3, 16.08]);
		expect(a.n).toBe(3);
		expect(a.min).toBe(16.08);
		expect(a.max).toBe(16.3);
		expect(a.p50).toBeCloseTo(16.19, 5);
		// R-7 interpolation for p95 over [16.08, 16.19, 16.3]: 16.19 + 0.9 * (16.3 - 16.19).
		expect(a.p95).toBeCloseTo(16.289, 3);
		expect(a.mean).toBeCloseTo(16.19, 2);
		expect(a.stdev).toBeCloseTo(0.11, 2);
	});

	it("rejects a non-finite sample", () => {
		expect(() => aggregate([1, Number.POSITIVE_INFINITY])).toThrow(/finite/);
		expect(() => aggregate([Number.NaN])).toThrow(/finite/);
	});

	it("is order-independent", () => {
		expect(aggregate([16.08, 16.19, 16.3])).toEqual(aggregate([16.3, 16.08, 16.19]));
	});

	it("reports a single sample with zero spread", () => {
		expect(aggregate([42])).toMatchObject({
			p50: 42,
			p95: 42,
			mean: 42,
			stdev: 0,
			min: 42,
			max: 42,
			n: 1,
		});
	});

	it("rejects an empty sample set", () => {
		expect(() => aggregate([])).toThrow();
	});

	it("computes a stable stdev for large-magnitude samples (Welford)", () => {
		// Values near 1e8 whose true stdev is exactly 1; a naive Σx² accumulator loses this signal to
		// float64 cancellation, Welford does not.
		const a = aggregate([100_000_001, 100_000_002, 100_000_003]);
		expect(a.mean).toBe(100_000_002);
		expect(a.stdev).toBeCloseTo(1, 10);
	});
});
