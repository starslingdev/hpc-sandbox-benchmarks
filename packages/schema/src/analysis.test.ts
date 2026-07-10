import { describe, expect, it } from "bun:test";
import {
	aggregate,
	bootstrapMedianInterval,
	kolmogorovSmirnov,
	mannWhitneyU,
	percentileOf,
	seededRng,
} from "./index.ts";

// Real Samples from a live `memory` smoke run: modal's STREAM Copy trials (35% deviation, a noisy
// gVisor host) against daytona's (0.14% deviation). The pair the whole inference layer exists for.
const MODAL_COPY = [10127, 34120, 9719, 59952, 29815];
const DAYTONA_COPY = [66500, 66510, 66495, 66505, 66502];

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

describe("percentileOf", () => {
	it("matches aggregate's percentiles on the same unsorted samples", () => {
		// Same samples, same R-7 interpolation: the public helper and aggregate() share one code path,
		// so a one-off percentile can never diverge from the catalogued distribution.
		const samples = [16.3, 16.08, 16.19];
		const a = aggregate(samples);
		expect(percentileOf(samples, 0.5)).toBeCloseTo(a.p50, 10);
		expect(percentileOf(samples, 0.95)).toBeCloseTo(a.p95, 10);
	});

	it("resolves p=0 to the min and p=1 to the max", () => {
		expect(percentileOf([3, 1, 2], 0)).toBe(1);
		expect(percentileOf([3, 1, 2], 1)).toBe(3);
	});

	it("rejects an empty sample set", () => {
		expect(() => percentileOf([], 0.5)).toThrow();
	});

	it("rejects a non-finite sample", () => {
		expect(() => percentileOf([1, Number.NaN], 0.5)).toThrow(/finite/);
	});

	it("rejects a p outside [0, 1]", () => {
		expect(() => percentileOf([1, 2, 3], -0.1)).toThrow(/\[0, 1\]/);
		expect(() => percentileOf([1, 2, 3], 1.5)).toThrow(/\[0, 1\]/);
		expect(() => percentileOf([1, 2, 3], Number.NaN)).toThrow(/\[0, 1\]/);
	});
});

describe("seededRng", () => {
	it("is deterministic per seed, so a committed leaderboard never churns", () => {
		const a = seededRng("run-1:stream_type_copy:modal");
		const b = seededRng("run-1:stream_type_copy:modal");
		const first = Array.from({ length: 5 }, () => a());
		const second = Array.from({ length: 5 }, () => b());
		expect(first).toEqual(second);
		expect(first.every((v) => v >= 0 && v < 1)).toBe(true);
	});

	it("decorrelates different seeds", () => {
		const a = seededRng("modal");
		const b = seededRng("daytona");
		expect(a()).not.toBe(b());
	});
});

describe("bootstrapMedianInterval", () => {
	it("brackets the median, and is wide for noisy Samples / tight for stable ones", () => {
		const noisy = bootstrapMedianInterval(MODAL_COPY, { seed: "s" });
		const stable = bootstrapMedianInterval(DAYTONA_COPY, { seed: "s" });

		expect(noisy.median).toBe(29815);
		expect(noisy.lo).toBeLessThanOrEqual(noisy.median);
		expect(noisy.hi).toBeGreaterThanOrEqual(noisy.median);
		expect(stable.lo).toBeLessThanOrEqual(stable.median);
		expect(stable.hi).toBeGreaterThanOrEqual(stable.median);

		// The whole point: the interval must expose modal's instability, not hide it behind a median.
		expect(noisy.hi - noisy.lo).toBeGreaterThan(stable.hi - stable.lo);
	});

	it("is reproducible for a given seed, so the committed leaderboard is byte-stable", () => {
		// Determinism is the property the committed artifact needs. Seed-SENSITIVITY is deliberately not
		// asserted: with 5 Samples the bootstrap median can only take 5 distinct values, so two seeds
		// landing on identical bounds is correct behaviour, not a collision.
		expect(bootstrapMedianInterval(MODAL_COPY, { seed: "run-1" })).toEqual(
			bootstrapMedianInterval(MODAL_COPY, { seed: "run-1" }),
		);
	});

	it("degenerates to a point interval for a single Sample rather than inventing a bound", () => {
		const one = bootstrapMedianInterval([42]);
		expect(one).toEqual({ median: 42, lo: 42, hi: 42, level: 0.95, resamples: 0 });
	});

	it("collapses to the value when every Sample is identical", () => {
		const flat = bootstrapMedianInterval([7, 7, 7, 7], { seed: "s" });
		expect([flat.lo, flat.median, flat.hi]).toEqual([7, 7, 7]);
	});

	it("widens the interval as the coverage level rises", () => {
		const narrow = bootstrapMedianInterval(MODAL_COPY, { seed: "s", level: 0.5 });
		const wide = bootstrapMedianInterval(MODAL_COPY, { seed: "s", level: 0.99 });
		expect(wide.hi - wide.lo).toBeGreaterThanOrEqual(narrow.hi - narrow.lo);
	});

	it("rejects an empty set, a non-finite Sample, and a level outside (0, 1)", () => {
		expect(() => bootstrapMedianInterval([])).toThrow(/at least one sample/);
		expect(() => bootstrapMedianInterval([1, Number.NaN])).toThrow(/finite/);
		expect(() => bootstrapMedianInterval([1, 2], { level: 0 })).toThrow(/level/);
		expect(() => bootstrapMedianInterval([1, 2], { level: 1 })).toThrow(/level/);
	});

	it("rejects a resample count that would yield NaN bounds instead of an error", () => {
		// `0`/`NaN` built an empty Float64Array, skipped the loop, and returned lo/hi = NaN — which
		// serialize into the committed leaderboard as `null` rather than failing. `-1` threw a bare
		// RangeError from the typed array, naming neither the caller nor the value.
		expect(() => bootstrapMedianInterval([1, 2], { resamples: 0 })).toThrow(/positive integer/);
		expect(() => bootstrapMedianInterval([1, 2], { resamples: Number.NaN })).toThrow(
			/positive integer/,
		);
		expect(() => bootstrapMedianInterval([1, 2], { resamples: -5 })).toThrow(/positive integer/);
		expect(() => bootstrapMedianInterval([1, 2], { resamples: 1.5 })).toThrow(/positive integer/);
	});

	it("validates options even at n = 1, where the early return used to skip the check", () => {
		// The n=1 point-interval path returned before the resamples guard, so a misconfigured call passed
		// silently — while `level`, validated earlier, threw. Options are now checked regardless of how
		// many Samples the call happens to carry.
		expect(() => bootstrapMedianInterval([42], { resamples: 0 })).toThrow(/positive integer/);
		expect(() => bootstrapMedianInterval([42], { resamples: -1 })).toThrow(/positive integer/);
		expect(() => bootstrapMedianInterval([42], { level: 0 })).toThrow(/level/);
		// …and a well-formed n=1 call still degenerates to a point interval.
		expect(bootstrapMedianInterval([42])).toEqual({
			median: 42,
			lo: 42,
			hi: 42,
			level: 0.95,
			resamples: 0,
		});
	});
});

describe("mannWhitneyU", () => {
	// Values cross-checked against an independent implementation of the same normal approximation
	// (tie- and continuity-corrected) and against exact enumeration of the permutation null.
	it("separates disjoint samples (exact p = 0.0079; the normal approximation is conservative)", () => {
		const r = mannWhitneyU([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
		expect(r.statistic).toBe(0);
		expect(r.pValue).toBeCloseTo(0.012186, 5);
		// Conservative: the approximation never claims MORE significance than exact enumeration.
		expect(r.pValue).toBeGreaterThan(0.007937);
		expect(r.pValue).toBeLessThan(0.05);
	});

	it("finds no evidence of difference between identical samples", () => {
		expect(mannWhitneyU([5, 5, 5, 5, 5], [5, 5, 5, 5, 5]).pValue).toBe(1);
	});

	it("applies the tie correction", () => {
		const r = mannWhitneyU([1, 2, 2, 3, 3], [2, 3, 3, 4, 5]);
		expect(r.statistic).toBe(5);
		expect(r.pValue).toBeCloseTo(0.126379, 5);
	});

	it("is symmetric in its arguments (U is the min of the two rank sums)", () => {
		const a = mannWhitneyU(MODAL_COPY, DAYTONA_COPY);
		const b = mannWhitneyU(DAYTONA_COPY, MODAL_COPY);
		expect(a.statistic).toBe(b.statistic);
		expect(a.pValue).toBeCloseTo(b.pValue, 12);
	});

	it("separates the real modal/daytona STREAM Copy distributions", () => {
		expect(mannWhitneyU(MODAL_COPY, DAYTONA_COPY).pValue).toBeLessThan(0.05);
	});

	it("cannot separate overlapping noise (the false-ranking case it exists to prevent)", () => {
		expect(mannWhitneyU([10, 12, 11, 13, 9], [11, 12, 10, 14, 13]).pValue).toBeGreaterThan(0.05);
	});

	it("requires a non-empty sample on both sides", () => {
		expect(() => mannWhitneyU([], [1])).toThrow(/non-empty/);
		expect(() => mannWhitneyU([1], [])).toThrow(/non-empty/);
	});

	it("rejects a non-finite sample rather than returning a plausible, meaningless p-value", () => {
		// NaN has no order, so it corrupts the sort-based midranks silently: before this guard,
		// mannWhitneyU([NaN, 1, 2], [3, 4, 5]) happily returned p ≈ 0.081.
		expect(() => mannWhitneyU([Number.NaN, 1], [2, 3])).toThrow(/finite samples/);
		expect(() => mannWhitneyU([1, 2], [Number.POSITIVE_INFINITY, 3])).toThrow(/finite samples/);
	});
});

describe("kolmogorovSmirnov", () => {
	it("reports D = 1 and a significant p for disjoint samples", () => {
		const r = kolmogorovSmirnov([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
		expect(r.statistic).toBe(1);
		expect(r.pValue).toBeCloseTo(0.003781, 5);
	});

	it("returns p = 1 for identical samples (D = 0)", () => {
		// Regression: the naive fixed-term series alternates 1-1+1-1..., truncating to ~0, which would
		// report two IDENTICAL providers as certainly different. The convergence guard returns the limit.
		const r = kolmogorovSmirnov([5, 5, 5, 5, 5], [5, 5, 5, 5, 5]);
		expect(r.statistic).toBe(0);
		expect(r.pValue).toBe(1);
	});

	it("handles ties without reporting a spurious step", () => {
		const r = kolmogorovSmirnov([1, 2, 2, 3, 3], [2, 3, 3, 4, 5]);
		expect(r.statistic).toBeCloseTo(0.4, 10);
		expect(r.pValue).toBeCloseTo(0.697405, 5);
	});

	it("is symmetric in its arguments", () => {
		const a = kolmogorovSmirnov(MODAL_COPY, DAYTONA_COPY);
		const b = kolmogorovSmirnov(DAYTONA_COPY, MODAL_COPY);
		expect(a.statistic).toBeCloseTo(b.statistic, 12);
		expect(a.pValue).toBeCloseTo(b.pValue, 12);
	});

	it("catches a shape difference that a median comparison would miss", () => {
		// IDENTICAL medians (50), wildly different distributions: one stable, one bimodal — the signature
		// of a provider alternating between fast and stalled passes. Mann-Whitney tests central tendency
		// and sees no shift; KS compares the whole ECDF and separates them decisively. This is precisely
		// why both are reported: a leaderboard that only asked "is the median different?" would call
		// these two providers equivalent.
		const stable = [...Array(10).fill(50), 49, 49, 49, 49, 49, 51, 51, 51, 51, 51];
		const bimodal = [...Array(10).fill(1), ...Array(10).fill(99)];
		expect(percentileOf(stable, 0.5)).toBe(50);
		expect(percentileOf(bimodal, 0.5)).toBe(50);

		expect(mannWhitneyU(stable, bimodal).pValue).toBeGreaterThan(0.05);

		const ks = kolmogorovSmirnov(stable, bimodal);
		expect(ks.statistic).toBeCloseTo(0.5, 10);
		expect(ks.pValue).toBeLessThan(0.05);
	});

	it("requires a non-empty sample on both sides", () => {
		expect(() => kolmogorovSmirnov([], [1])).toThrow(/non-empty/);
		expect(() => kolmogorovSmirnov([1], [])).toThrow(/non-empty/);
	});

	it("rejects a non-finite sample instead of hanging the ECDF sweep forever", () => {
		// The two-pointer sweep advances on `x <= y` / `y <= x`; against NaN both are false, so neither
		// index moves and the loop never terminates. This test HANGS without the guard — it is the
		// reason the guard exists, not a style check. (Verified: the pre-guard call had to be killed.)
		expect(() => kolmogorovSmirnov([Number.NaN, 1], [1, 2])).toThrow(/finite samples/);
		expect(() => kolmogorovSmirnov([1, 2], [Number.NaN])).toThrow(/finite samples/);
	});
});
