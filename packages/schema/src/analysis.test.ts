import { describe, expect, it } from "bun:test";
import {
	aggregate,
	bootstrapMedianDifferenceInterval,
	bootstrapMedianInterval,
	canSeparate,
	DEFAULT_ALPHA,
	hierarchicalBootstrapMedianInterval,
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

describe("hierarchicalBootstrapMedianInterval", () => {
	it("reports the pooled median and brackets it", () => {
		const interval = hierarchicalBootstrapMedianInterval([MODAL_COPY, DAYTONA_COPY], { seed: "s" });
		expect(interval.median).toBe(percentileOf([...MODAL_COPY, ...DAYTONA_COPY], 0.5));
		expect(interval.lo).toBeLessThanOrEqual(interval.median);
		expect(interval.hi).toBeGreaterThanOrEqual(interval.median);
	});

	it("widens when the replicates disagree across sandboxes (between-sandbox variance)", () => {
		// Same pooled median (55) both ways; the only difference is machine-to-machine spread. The
		// hierarchical resample draws the clusters first, so a run where the two sandboxes landed far
		// apart must report a wider interval than one where they agreed — the whole point of the level.
		const disagree = hierarchicalBootstrapMedianInterval(
			[
				[10, 10],
				[100, 100],
			],
			{ seed: "s" },
		);
		const agree = hierarchicalBootstrapMedianInterval(
			[
				[54, 54],
				[56, 56],
			],
			{ seed: "s" },
		);
		expect(disagree.hi - disagree.lo).toBeGreaterThan(agree.hi - agree.lo);
	});

	it("degenerates to the ordinary bootstrap's median at R = 1", () => {
		// One replicate: the cluster draw always re-selects it, so the resample distribution is the plain
		// bootstrap's. The observed median is identical; the raw draw sequence is not, which is why the
		// leaderboard keeps the single-level function at R = 1 for byte-stability.
		const single = hierarchicalBootstrapMedianInterval([MODAL_COPY], { seed: "s" });
		const plain = bootstrapMedianInterval(MODAL_COPY, { seed: "s" });
		expect(single.median).toBe(plain.median);
		expect(single.lo).toBeLessThanOrEqual(single.median);
		expect(single.hi).toBeGreaterThanOrEqual(single.median);
	});

	it("degenerates to a point interval for a single pooled Sample", () => {
		expect(hierarchicalBootstrapMedianInterval([[42]])).toEqual({
			median: 42,
			lo: 42,
			hi: 42,
			level: 0.95,
			resamples: 0,
		});
	});

	it("is reproducible for a given seed", () => {
		const shape = [MODAL_COPY, DAYTONA_COPY];
		expect(hierarchicalBootstrapMedianInterval(shape, { seed: "run-1" })).toEqual(
			hierarchicalBootstrapMedianInterval(shape, { seed: "run-1" }),
		);
	});

	it("rejects an empty structure, a non-finite Sample, and bad options", () => {
		expect(() => hierarchicalBootstrapMedianInterval([])).toThrow(/at least one replicate/);
		expect(() => hierarchicalBootstrapMedianInterval([[]])).toThrow(/at least one sample/);
		expect(() => hierarchicalBootstrapMedianInterval([[1, Number.NaN]])).toThrow(/finite/);
		expect(() => hierarchicalBootstrapMedianInterval([[1, 2]], { level: 0 })).toThrow(/level/);
		expect(() => hierarchicalBootstrapMedianInterval([[1, 2]], { resamples: 0 })).toThrow(
			/positive integer/,
		);
	});
});

describe("bootstrapMedianDifferenceInterval", () => {
	it("reports the difference of pooled medians, sign following argument order", () => {
		const diff = bootstrapMedianDifferenceInterval([[100, 100]], [[10, 10]], { seed: "s" });
		expect(diff.difference).toBe(90);
		const flipped = bootstrapMedianDifferenceInterval([[10, 10]], [[100, 100]], { seed: "s" });
		expect(flipped.difference).toBe(-90);
	});

	it("separates two providers whose replicate sandboxes never overlap, once R clears the floor", () => {
		// Four non-overlapping sandboxes per side: the exact cluster test floors at 2/C(8,4) ≈ 0.029, so
		// complete separation clears α = 0.05. Every replicate of A is 1000 and of B is 1, so every
		// hierarchical resample still yields exactly 999 — the DISPLAYED interval collapses to [999, 999].
		const diff = bootstrapMedianDifferenceInterval(
			[
				[1000, 1000],
				[1000, 1000],
				[1000, 1000],
				[1000, 1000],
			],
			[
				[1, 1],
				[1, 1],
				[1, 1],
				[1, 1],
			],
			{ seed: "s" },
		);
		expect(diff.separated).toBe(true);
		expect(diff.pValue).toBeLessThan(0.05);
		expect(diff.lo).toBeGreaterThan(0);
	});

	it("ties two providers drawn from the same distribution (interval straddles 0)", () => {
		const shape = [
			[10, 20],
			[10, 20],
			[10, 20],
		];
		const diff = bootstrapMedianDifferenceInterval(shape, shape, { seed: "s" });
		expect(diff.difference).toBe(0);
		expect(diff.separated).toBe(false);
		expect(diff.lo).toBeLessThanOrEqual(0);
		expect(diff.hi).toBeGreaterThanOrEqual(0);
	});

	it("ties adjacent R = 3 providers whose medians are close — replicas are the dial, not more trials", () => {
		// The honest small-R behaviour the design accepts: three replicate sandboxes a step apart cannot
		// be told from three a step higher. A caller must read this as "not separated", never "equal".
		const diff = bootstrapMedianDifferenceInterval([[10], [20], [30]], [[15], [25], [35]], {
			seed: "s",
		});
		expect(diff.separated).toBe(false);
	});

	it("cannot separate at R = 3 even under complete separation — the 2/C(6,3) = 0.1 floor", () => {
		// The reviewer's case: three sandboxes per side, perfectly separated. The exact cluster test's
		// smallest attainable two-sided p is 2/C(6,3) = 0.1, above α = 0.05, so NO R=3 comparison can be
		// declared separated — the old "interval clears 0" rule would have over-claimed it. Raising k
		// (in-sandbox trials) cannot lower this floor; only more sandboxes (R) can.
		const diff = bootstrapMedianDifferenceInterval([[100], [101], [102]], [[1], [2], [3]], {
			seed: "s",
		});
		expect(diff.separated).toBe(false);
		expect(diff.pValue).toBeCloseTo(0.1, 12); // 2 / C(6,3)
		expect(diff.minAttainablePValue).toBeCloseTo(0.1, 12);
		expect(diff.lo).toBeGreaterThan(0); // the DISPLAYED bootstrap interval still excludes 0
	});

	it("a single sandbox per side can never separate, however many in-sandbox trials", () => {
		// One replicate cluster per side reduces to a 1-vs-1 cluster test (floor p = 1), so no gap and no
		// trial count can separate the providers — the between-sandbox axis is simply absent. This is the
		// case the pooled-sample CI missed: four identical trials look like power, but are one sandbox.
		const diff = bootstrapMedianDifferenceInterval([[10, 10, 10, 10]], [[99, 99, 99, 99]], {
			seed: "s",
		});
		expect(diff.separated).toBe(false);
		expect(diff.minAttainablePValue).toBe(1);
	});

	it("reports the verdict's method — exact at the R this benchmark runs", () => {
		// The verdict is the cluster permutation via Mann-Whitney U on R_a + R_b sandboxes; at any real R
		// that stays under mannWhitneyU's exact-N ceiling, so `method` is "exact" and the label is honest.
		const diff = bootstrapMedianDifferenceInterval([[1], [2], [3]], [[4], [5], [6]], { seed: "s" });
		expect(diff.method).toBe("exact");
	});

	it("falls back to the asymptotic method past the exact-N ceiling, and says so rather than claiming exact", () => {
		// Above mannWhitneyU's MAX_EXACT_N (50 total sandboxes) the cluster test uses the normal
		// approximation. Far beyond any real R, but the verdict must surface that rather than mislabel an
		// approximated p as exact — so `method` flips to "asymptotic".
		const many = (base: number) => Array.from({ length: 30 }, (_, i) => [base + i]);
		const diff = bootstrapMedianDifferenceInterval(many(0), many(1000), { seed: "s" });
		expect(diff.method).toBe("asymptotic");
	});

	it("degenerates to a point interval when each side pools to a single Sample (no power to separate)", () => {
		// One Sample per side has no spread, so there is nothing to resample: report resamples: 0 and a
		// point interval — never 10 000 identical draws, and never a separation verdict on zero power
		// (mirrors hierarchicalBootstrapMedianInterval's single-pooled-sample short-circuit).
		const diff = bootstrapMedianDifferenceInterval([[5]], [[8]]);
		expect(diff.resamples).toBe(0);
		expect(diff.separated).toBe(false);
		expect(diff.difference).toBe(-3);
		expect(diff.lo).toBe(-3);
		expect(diff.hi).toBe(-3);
	});

	it("is reproducible for a given seed", () => {
		const a = [[10, 12], [11]];
		const b = [[20, 22], [21]];
		expect(bootstrapMedianDifferenceInterval(a, b, { seed: "r" })).toEqual(
			bootstrapMedianDifferenceInterval(a, b, { seed: "r" }),
		);
	});

	it("negates the observed difference on reversal; the separation verdict is order-invariant", () => {
		// The shared seeded RNG draws A then B in order, so the resampled lo/hi bounds are not guaranteed
		// mirror images on reversal (a deliberate trade for one reproducible seed). What IS guaranteed:
		// `difference` negates exactly (computed directly, not resampled), and the separation VERDICT is
		// order-invariant — it comes from Mann-Whitney U on the per-sandbox medians, symmetric in its two
		// arguments. Uses R=4 so a clearly-separated pair can actually clear the 5% floor.
		const hi = [[100], [101], [102], [103]];
		const lo = [[1], [2], [3], [4]];
		const forward = bootstrapMedianDifferenceInterval(hi, lo, { seed: "rev" });
		const reversed = bootstrapMedianDifferenceInterval(lo, hi, { seed: "rev" });
		expect(reversed.difference).toBe(-forward.difference);
		expect(forward.separated).toBe(true);
		expect(reversed.separated).toBe(true);
		expect(forward.pValue).toBe(reversed.pValue);
	});

	it("rejects an empty side, a non-finite Sample, and bad options", () => {
		expect(() => bootstrapMedianDifferenceInterval([], [[1]])).toThrow(/at least one replicate/);
		expect(() => bootstrapMedianDifferenceInterval([[1]], [[Number.NaN]])).toThrow(/finite/);
		expect(() => bootstrapMedianDifferenceInterval([[1]], [[2]], { level: 1 })).toThrow(/level/);
		expect(() => bootstrapMedianDifferenceInterval([[1]], [[2]], { resamples: -1 })).toThrow(
			/positive integer/,
		);
	});
});

describe("mannWhitneyU", () => {
	// Values cross-checked against exact enumeration of the permutation null (every C(N,nA) split), which
	// is what the implementation now does at these sizes rather than approximating it.
	it("separates disjoint samples (exact p = 2/C(10,5) = 0.0079)", () => {
		const r = mannWhitneyU([1, 2, 3, 4, 5], [6, 7, 8, 9, 10]);
		expect(r.statistic).toBe(0);
		// Complete separation: 2 of the 252 splits are this extreme. The normal approximation reported
		// 0.0122 here — close, but it is the same machinery that reported an IMPOSSIBLE 0.047 at 3 v 3.
		expect(r.pValue).toBeCloseTo(2 / 252, 12);
		expect(r.pValue).toBeLessThan(0.05);
	});

	it("finds no evidence of difference between identical samples", () => {
		expect(mannWhitneyU([5, 5, 5, 5, 5], [5, 5, 5, 5, 5]).pValue).toBe(1);
	});

	it("handles ties exactly, by conditioning on the observed midranks", () => {
		// The exact test conditions on the rank multiset, so ties need no variance correction — they are
		// already in the null it enumerates. (48 of the 252 splits are at least this extreme.)
		const r = mannWhitneyU([1, 2, 2, 3, 3], [2, 3, 3, 4, 5]);
		expect(r.statistic).toBe(5);
		expect(r.pValue).toBeCloseTo(48 / 252, 12);
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

describe("the attainable p-floor / canSeparate", () => {
	it("reports the floor as the p the test itself yields under complete separation", () => {
		// The floor must be the SAME number the test yields under complete separation — otherwise the guard
		// and the test disagree and rows get grouped on a threshold nothing enforces.
		const separated = mannWhitneyU([1, 2, 3], [4, 5, 6]);
		expect(separated.pValue).toBeCloseTo(0.1, 12); // 2 / C(6,3)
		expect(separated.minAttainablePValue).toBeCloseTo(separated.pValue, 12);
		// The floor is a property of the comparison, not of the data's effect size: a middling 3 v 3 quotes
		// the same floor as a perfectly-separated one.
		expect(mannWhitneyU([1, 4, 5], [2, 3, 6]).minAttainablePValue).toBeCloseTo(0.1, 12);
	});

	it("is a floor no data of that shape can dip below — including tied data", () => {
		// The bug this guards: the normal approximation's tie correction shrinks the variance, so
		// [1,1,1] v [2,2,2] returned p = 0.047 — under α, and under the 0.081 that was claimed as the 3-v-3
		// floor. The exact null cannot produce anything below 0.1 at 3 v 3, tied or not.
		const tied = mannWhitneyU([1, 1, 1], [2, 2, 2]);
		expect(tied.pValue).toBeCloseTo(0.1, 12);
		expect(tied.pValue).toBeGreaterThanOrEqual(tied.minAttainablePValue);
		expect(canSeparate(tied)).toBe(false);
	});

	it("takes the floor from the tie pattern, not from the sample sizes alone", () => {
		// Ties break the permutation null's mirror symmetry, so a lone split can stand at the extreme and
		// halve the floor: 1 v 2 floors at 2/3 untied, but at 1/3 when the pair is tied. A size-only floor
		// is therefore either wrong or needlessly pessimistic — this one is neither.
		expect(mannWhitneyU([2], [1, 3]).minAttainablePValue).toBeCloseTo(2 / 3, 12);
		expect(mannWhitneyU([2], [1, 1]).minAttainablePValue).toBeCloseTo(1 / 3, 12);
	});

	it("says 3 v 3 cannot separate at α=0.05 however extreme the data", () => {
		// The whole point: at 3 trials a side the best possible p is already above α, so a non-significant
		// result there is a fact about the trial count, not about the providers.
		const extreme = mannWhitneyU([1, 2, 3], [100, 200, 300]);
		expect(canSeparate(extreme)).toBe(false);
		expect(extreme.pValue).toBeGreaterThan(0.05);
	});

	it("says 5 v 5 can separate — the floor drops under α", () => {
		const separated = mannWhitneyU([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]);
		expect(canSeparate(separated)).toBe(true);
		expect(separated.minAttainablePValue).toBeLessThan(0.05); // 2 / C(10,5) ≈ 0.0079
		expect(separated.pValue).toBeLessThan(0.05);
	});

	it("honours a caller-supplied alpha", () => {
		// 3 v 3 becomes testable only if you loosen α past its floor.
		expect(canSeparate(mannWhitneyU([1, 2, 3], [4, 5, 6]), 0.1)).toBe(false); // floor is 0.1, not < 0.1
		expect(canSeparate(mannWhitneyU([1, 2, 3], [4, 5, 6]), 0.2)).toBe(true);
	});
});

describe("mannWhitneyU exactness", () => {
	it("enumerates the permutation null instead of approximating it at these sample sizes", () => {
		const test = mannWhitneyU([1, 2, 3], [4, 5, 6]);
		expect(test.method).toBe("exact");
		// Complete separation of 3 v 3: exactly 2 of the C(6,3)=20 splits are this extreme.
		expect(test.pValue).toBeCloseTo(2 / 20, 12);
	});

	it("never returns a p below its own floor, however the ties fall", () => {
		// The invariant the ranking leans on: `underpowered` (floor ≥ α) must imply "not significant". If a
		// p could slip under its floor, the guard would be denying a separation the test had just made.
		const shapes: Array<[number[], number[]]> = [
			[
				[1, 1, 1],
				[2, 2, 2],
			],
			[
				[1, 1],
				[1, 2, 2],
			],
			[[5], [5, 5]],
			[
				[1, 2, 2, 3],
				[2, 3, 3],
			],
			[
				[7, 7, 7, 7],
				[7, 7, 7, 7],
			],
		];
		for (const [a, b] of shapes) {
			const test = mannWhitneyU(a, b);
			expect(test.pValue).toBeGreaterThanOrEqual(test.minAttainablePValue - 1e-12);
			if (!canSeparate(test)) expect(test.pValue).toBeGreaterThanOrEqual(DEFAULT_ALPHA);
		}
	});

	it("returns p = 1 when every pooled value is identical — no evidence of any difference", () => {
		expect(mannWhitneyU([5, 5, 5], [5, 5, 5]).pValue).toBe(1);
	});
});
