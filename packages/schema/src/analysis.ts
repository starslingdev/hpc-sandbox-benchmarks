// Pure analysis over the Samples a Metric retains. Percentiles use linear interpolation between
// order statistics (R-7, the numpy/Excel default) so Aggregates are stable across toolchains.
import { type } from "arktype";

// Plain `"number"` accepts NaN/Infinity; the distribution fields must be finite, so a corrupt
// Aggregates can't pass validation undetected. `n`'s `number.integer` already excludes both; `stdev`
// composes `finiteNumber` with `>= 0` (a bare `number >= 0` would still admit `Infinity`).
const finiteNumber = type("number").narrow((value) => Number.isFinite(value));
const finiteNonNegative = finiteNumber.narrow((value) => value >= 0);

/**
 * The canonical distribution retained for every MetricResult: percentiles, mean, spread and Sample
 * count. An arktype schema so the Run model (./run.ts) can validate it at the dataset boundary, with
 * the TypeScript {@link Aggregates} type inferred from it — one source of truth for the shape.
 */
export const aggregatesSchema = type({
	p50: finiteNumber,
	p95: finiteNumber,
	mean: finiteNumber,
	stdev: finiteNonNegative,
	min: finiteNumber,
	max: finiteNumber,
	n: "number.integer > 0",
});

export type Aggregates = typeof aggregatesSchema.infer;

/**
 * Percentile of a pre-sorted, non-empty Sample set (R-7 linear interpolation). Private: callers go
 * through {@link aggregate}, which establishes the sorted/non-empty precondition. `p` of 0 and 1
 * resolve to the min and max, so {@link aggregate} reuses this for both.
 */
function percentile(sorted: ArrayLike<number>, p: number): number {
	const h = (sorted.length - 1) * p;
	const lo = Math.floor(h);
	const hi = Math.ceil(h);
	const loValue = sorted[lo] ?? Number.NaN;
	const hiValue = sorted[hi] ?? loValue;
	return loValue + (h - lo) * (hiValue - loValue);
}

// ---------------------------------------------------------------------------------------------
// Order-statistic selection. Every bootstrap below draws tens of thousands of resamples and reads a
// single median out of each, so the resample's median is the innermost loop of the whole leaderboard.
// Sorting each draw to reach it is asymptotically wasteful (O(n log n) for two order statistics) and,
// worse, pays a JS comparator call per comparison plus a fresh Array per resample. Selecting in place
// over a reused Float64Array scratch buffer is ~5x faster and allocates nothing — measured on the
// committed dataset's replicate shapes, and bit-identical to the sorted path by construction:
// selection returns the same order statistics, fed through the same {@link percentile} arithmetic.
// ---------------------------------------------------------------------------------------------

/**
 * The `k`-th smallest of `buffer[0, length)`, selected IN PLACE. Leaves the buffer partitioned about
 * `k` — everything before it ≤ it, everything after ≥ it — which is what lets {@link medianInPlace}
 * read an even-n median's upper order statistic off a single scan instead of selecting twice.
 *
 * Three-way (Dutch-national-flag) partitioning around a median-of-three pivot, not the textbook
 * two-way form: resampling WITH REPLACEMENT from a few dozen samples produces heavy ties, and a
 * two-way partition degrades toward O(n²) on runs of equal keys — precisely this caller's input.
 */
function selectNth(buffer: Float64Array, length: number, k: number): number {
	let lo = 0;
	let hi = length - 1;
	while (lo < hi) {
		const mid = (lo + hi) >>> 1;
		const x = buffer[lo] as number;
		const y = buffer[mid] as number;
		const z = buffer[hi] as number;
		const pivot = x < y ? (y < z ? y : x < z ? z : x) : x < z ? x : y < z ? z : y;
		let lt = lo;
		let i = lo;
		let gt = hi;
		while (i <= gt) {
			const v = buffer[i] as number;
			if (v < pivot) {
				buffer[i] = buffer[lt] as number;
				buffer[lt] = v;
				lt++;
				i++;
			} else if (v > pivot) {
				buffer[i] = buffer[gt] as number;
				buffer[gt] = v;
				gt--;
			} else i++;
		}
		// [lt, gt] now holds every element equal to the pivot, already in final position.
		if (k < lt) hi = lt - 1;
		else if (k > gt) lo = gt + 1;
		else return pivot;
	}
	return buffer[k] as number;
}

/**
 * Median of `buffer[0, length)`, computed in place — the exact value `percentile(sorted, 0.5)` would
 * return for the same multiset, including the even-n interpolation, evaluated as the same expression
 * on the same two order statistics so the committed leaderboard's bounds cannot shift.
 */
function medianInPlace(buffer: Float64Array, length: number): number {
	const h = (length - 1) * 0.5;
	const lo = Math.floor(h);
	const loValue = selectNth(buffer, length, lo);
	// Odd length: h is an integer, the interpolation weight is 0, and one order statistic is the answer.
	// `+ 0` is not redundant — it normalizes a -0 order statistic to +0, which is what `percentile`'s
	// `loValue + (h - lo) * (…)` does for free and what makes the bit-identity claim above literally true.
	// Nothing downstream can observe the difference today (every median is written into a Float64Array and
	// re-read through `percentile`), so this is here to keep the invariant real rather than accidental.
	if (h === lo) return loValue + 0;
	// Even length: selectNth left every element past `lo` ≥ loValue, so the next order statistic up is
	// that tail's minimum — an O(n) scan rather than a second selection pass.
	let hiValue = buffer[lo + 1] as number;
	for (let i = lo + 2; i < length; i++) {
		const v = buffer[i] as number;
		if (v < hiValue) hiValue = v;
	}
	return loValue + (h - lo) * (hiValue - loValue);
}

/**
 * Percentile `p` (0–1) of an unsorted, non-empty Sample set — the public entry point to the same R-7
 * interpolation {@link aggregate} computes its p50/p95 with. Sorts a copy and defers to the private
 * {@link percentile} order-statistic helper, so a one-off percentile and the Aggregates distribution
 * share one code path and can never diverge. Throws on an empty set, a non-finite Sample, or a `p`
 * outside [0, 1] (same fail-fast posture as {@link aggregate}); `p` of 0 and 1 resolve to min and max.
 */
export function percentileOf(samples: readonly number[], p: number): number {
	if (samples.length === 0) {
		throw new Error("percentileOf() requires at least one sample");
	}
	// `!(0 <= p <= 1)` rather than `p < 0 || p > 1` so a NaN `p` is rejected too.
	if (!(p >= 0 && p <= 1)) {
		throw new Error(`percentileOf() requires p in [0, 1]; got ${p}`);
	}
	for (const sample of samples) {
		if (!Number.isFinite(sample)) {
			throw new Error(`percentileOf() requires finite samples; got ${sample}`);
		}
	}
	return percentile(
		[...samples].sort((a, b) => a - b),
		p,
	);
}

/** Aggregate Samples into the canonical distribution. Throws on an empty Sample set. */
export function aggregate(samples: number[]): Aggregates {
	if (samples.length === 0) {
		throw new Error("aggregate() requires at least one sample");
	}
	for (const sample of samples) {
		// Reject non-finite samples at the source so NaN/Infinity can never propagate into a Run.
		if (!Number.isFinite(sample)) {
			throw new Error(`aggregate() requires finite samples; got ${sample}`);
		}
	}
	const sorted = [...samples].sort((a, b) => a - b);

	// Welford's online algorithm over the sorted samples: mean and the sum of squared deviations (M2)
	// in one pass. Numerically stable — accumulating deviations from the running mean avoids the
	// catastrophic cancellation a naive Σx² accumulator suffers on large-magnitude samples — and
	// deterministic regardless of input order (we iterate the canonical sorted order, not the raw
	// input). The percentiles already require the sort, so aggregate() is O(n log n) overall.
	let mean = 0;
	let m2 = 0;
	let n = 0;
	for (const sample of sorted) {
		n += 1;
		const delta = sample - mean;
		mean += delta / n;
		m2 += delta * (sample - mean);
	}

	return {
		p50: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
		mean,
		// Sample standard deviation (n-1); 0 for a single Sample.
		stdev: Math.sqrt(n > 1 ? m2 / (n - 1) : 0),
		min: percentile(sorted, 0),
		max: percentile(sorted, 1),
		n,
	};
}

// ---------------------------------------------------------------------------------------------
// Inference. A provider's Samples are repeated trials inside ONE sandbox, so the spread across them
// is environmental noise (neighbours, host contention, gVisor), not measurement error that shrinks
// with more trials. Reporting a bare p50 therefore invites a false ranking: a provider whose trials
// span 9.7k–65k MB/s can out-rank a provider pinned at 66.5k ±0.14% on a lucky median. The tools
// below quantify that — an interval around the median, and a test for whether two providers'
// distributions differ at all.
// ---------------------------------------------------------------------------------------------

/**
 * Bootstrap resamples per interval.
 *
 * This does NOT make the printed bound seed-independent, and it is worth being precise about why, because
 * the obvious reading ("10k puts the Monte-Carlo error under the 4 significant digits we print") is false:
 * re-seeding the committed dataset changes a printed `lo`/`hi` on ~45% of rows (e.g. a STREAM bound moving
 * 81400 → 81020). At R=3 the resample distribution has only a handful of atoms, so the quantile jumps
 * between them; raising this number does not smooth that away — more sandboxes would. What 10k DOES buy is
 * a stable answer for a FIXED seed, which is what makes the committed artifact reproducible.
 */
const DEFAULT_RESAMPLES = 10_000;
/** Two-sided significance level for "are these two providers actually different?". */
export const DEFAULT_ALPHA = 0.05;

/**
 * Reject an empty or non-finite sample set at the boundary, naming the caller and the bad value.
 *
 * Every function below consumes Samples by ORDER (sorting, ranking, ECDF sweeps), and `NaN` has no
 * order: every comparison against it is `false`. That is not a cosmetic problem. In
 * {@link kolmogorovSmirnov}'s two-pointer sweep neither index advances past a `NaN`, so the loop
 * never terminates; in {@link mannWhitneyU} it silently corrupts the midranks and yields a plausible
 * but meaningless p-value. Fail fast instead, exactly as `aggregate`/`percentileOf` already do.
 */
function assertFiniteSamples(fn: string, samples: readonly number[]): void {
	if (samples.length === 0) {
		throw new Error(`${fn}() requires at least one sample`);
	}
	for (const sample of samples) {
		if (!Number.isFinite(sample)) {
			throw new Error(`${fn}() requires finite samples; got ${sample}`);
		}
	}
}

/**
 * Resolve and validate a coverage level, naming the caller — the same fail-fast posture as
 * {@link assertFiniteSamples}, applied to the one option every interval below shares. `!(0 < l < 1)`
 * rather than `l <= 0 || l >= 1` so a NaN level is rejected too.
 */
function coverageLevel(fn: string, level: number | undefined): number {
	const resolved = level ?? 0.95;
	if (!(resolved > 0 && resolved < 1)) {
		throw new Error(`${fn}() requires level in (0, 1); got ${resolved}`);
	}
	return resolved;
}

/**
 * A deterministic PRNG (mulberry32) seeded by hashing `seed`. The leaderboard is a COMMITTED
 * artifact, so a `Math.random()`-driven bootstrap would rewrite every confidence bound on each
 * regeneration and make the diff meaningless. Seeding from stable Run/Metric/provider identity keeps
 * a given Run's leaderboard byte-identical across machines and reruns.
 */
export function seededRng(seed: string): () => number {
	// An FNV-1a *variant*: it mixes UTF-16 code units, not UTF-8 bytes, because `charCodeAt` yields a
	// 16-bit unit. For the ASCII seeds this is called with (`<runId>:<metricId>:<providerId>`) that is
	// identical to textbook FNV-1a; above U+007F it diverges from the reference algorithm. We keep it
	// rather than encoding to bytes first: nothing depends on interoperating with another FNV-1a
	// implementation, only on being a stable, well-mixed 32-bit seed — and changing the hash would
	// silently rewrite every confidence bound in the committed leaderboard.
	let h = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		h ^= seed.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	let state = h >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A bootstrapped interval around a Metric's median. */
export interface MedianInterval {
	/**
	 * The observed value of whatever this interval brackets — the SAME estimand `lo`/`hi` envelope, which
	 * differs by producer: {@link bootstrapMedianInterval} and
	 * {@link hierarchicalBootstrapMedianInterval} report the median of the POOLED Samples (identical to
	 * `Aggregates.p50`), while {@link clusterMedianInterval} reports the median of the PER-SANDBOX medians.
	 * Those two coincide only when every sandbox contributed the same number of trials, so a consumer must
	 * not assume this equals `Aggregates.p50`.
	 */
	median: number;
	/** Lower/upper bound of the percentile-bootstrap interval at {@link level}. */
	lo: number;
	hi: number;
	/** Coverage, e.g. 0.95. */
	level: number;
	/** Resamples drawn. 0 when n === 1 (no interval is estimable; lo === hi === median). */
	resamples: number;
}

/**
 * Percentile bootstrap of the median: draw `resamples` resamples of size n with replacement, take each
 * one's median, and report the empirical [α/2, 1−α/2] quantiles of that distribution.
 *
 * The median — not the mean — because a single stalled pass (STREAM under a noisy neighbour) drags a
 * mean far more than it moves a median, and we want the provider's typical throughput, not its
 * average-including-the-stall. The bootstrap — not a normal-theory `±1.96·stdev/√n` — because these
 * Samples are neither normal nor independent of the host's scheduling, and a closed-form interval on
 * the median would assume a symmetry the data plainly lacks (modal's Copy: 9.7k…65k MB/s).
 *
 * Note the interval narrows as PTS re-runs a noisy test (n grows), which is honest about the median's
 * precision but says nothing about the underlying instability — read it alongside `Aggregates.stdev`.
 */
export function bootstrapMedianInterval(
	samples: readonly number[],
	options: { resamples?: number; level?: number; seed?: string } = {},
): MedianInterval {
	assertFiniteSamples("bootstrapMedianInterval", samples);
	const level = coverageLevel("bootstrapMedianInterval", options.level);
	// Validate EVERY option before the n=1 early return, so a misconfigured call is rejected regardless
	// of how many Samples it happens to carry. `0`/`NaN` would otherwise build an empty Float64Array,
	// skip the resampling loop, and hand back NaN bounds — which serialize into the committed leaderboard
	// as `null` rather than failing; a negative count throws a bare RangeError from the typed array,
	// naming neither the caller nor the offending value. (Guarding after the early return would let
	// `bootstrapMedianInterval([42], { resamples: -1 })` pass silently while `{ level: 0 }` threw.)
	const resamples = options.resamples ?? DEFAULT_RESAMPLES;
	if (!Number.isInteger(resamples) || resamples < 1) {
		throw new Error(
			`bootstrapMedianInterval() requires resamples to be a positive integer; got ${resamples}`,
		);
	}

	const median = percentileOf(samples, 0.5);
	// A single Sample carries no information about its own spread — degenerate to a point interval
	// rather than fabricating a bound by resampling the one value n times (which would always give it).
	// Reached only once the options above are known good.
	if (samples.length === 1) return { median, lo: median, hi: median, level, resamples: 0 };

	const rng = seededRng(options.seed ?? "sandbox-benchmarks");
	const n = samples.length;
	const medians = new Float64Array(resamples);
	// One scratch buffer for every resample: the draw is consumed the moment its median is read, so
	// there is nothing to keep, and reusing it keeps the loop allocation-free.
	const draw = new Float64Array(n);
	for (let b = 0; b < resamples; b++) {
		for (let i = 0; i < n; i++) draw[i] = samples[Math.floor(rng() * n)] as number;
		medians[b] = medianInPlace(draw, n);
	}
	// A typed array's default sort IS ascending numeric — no comparator, so no per-comparison JS call.
	medians.sort();
	const tail = (1 - level) / 2;
	return {
		median,
		lo: percentile(medians, tail),
		hi: percentile(medians, 1 - tail),
		level,
		resamples,
	};
}

// ---------------------------------------------------------------------------------------------
// Replicate-aware inference. A replicate is one whole sandbox: R replicates of a (provider, suite)
// capture BETWEEN-sandbox variance (host placement, region, noisy neighbours) that the within-sandbox
// trials cannot see. Pooling every replicate's Samples into one flat set and bootstrapping THAT
// under-states the spread — it treats R×k correlated draws as R×k independent ones, so the interval
// narrows with the trial count even when the true machine-to-machine variance is large. The
// hierarchical bootstrap below resamples at BOTH levels (replicates, then Samples within each), so the
// interval it reports reflects the variance a user actually experiences. At R = 1 it degenerates to the
// ordinary percentile bootstrap {@link bootstrapMedianInterval} computes.
// ---------------------------------------------------------------------------------------------

/** Reject empty/non-finite replicate structure at the boundary, naming the caller. Every replicate
 *  must carry at least one finite Sample, and there must be at least one replicate — the same
 *  fail-fast posture as {@link assertFiniteSamples}, extended to the two-level shape. */
function assertReplicates(fn: string, replicates: readonly (readonly number[])[]): void {
	if (replicates.length === 0) {
		throw new Error(`${fn}() requires at least one replicate`);
	}
	for (const replicate of replicates) {
		assertFiniteSamples(fn, replicate);
	}
}

/**
 * One hierarchical resample's median: draw R replicates WITH REPLACEMENT, then within each drawn
 * replicate draw its own number of Samples with replacement, pool the lot, and take the median. Drawing
 * the clusters first is what carries the between-sandbox variance into the resample distribution — a
 * flat bootstrap that skipped this level would treat the pooled Samples as exchangeable and hide it.
 */
function hierarchicalResampleMedian(
	replicates: readonly (readonly number[])[],
	rng: () => number,
	pool: Float64Array,
): number {
	const R = replicates.length;
	let size = 0;
	for (let r = 0; r < R; r++) {
		const chosen = replicates[Math.floor(rng() * R)] as readonly number[];
		const n = chosen.length;
		for (let i = 0; i < n; i++) pool[size++] = chosen[Math.floor(rng() * n)] as number;
	}
	return medianInPlace(pool, size);
}

/**
 * A scratch buffer big enough for any single hierarchical resample of `replicates`: R cluster draws,
 * each contributing its own replicate's length, so the worst case is R × the longest replicate (the
 * draw is with replacement, so one long replicate can be selected every time).
 */
function resamplePool(replicates: readonly (readonly number[])[]): Float64Array {
	let longest = 0;
	for (const replicate of replicates) longest = Math.max(longest, replicate.length);
	return new Float64Array(replicates.length * longest);
}

/**
 * Median of each replicate sandbox, one summary per machine. The unit of replication in this benchmark
 * is the SANDBOX, not the trial, so this is the vector every sandbox-level statistic below reduces to.
 */
function sandboxMedians(replicates: readonly (readonly number[])[]): number[] {
	return replicates.map((replicate) => percentileOf(replicate, 0.5));
}

/**
 * The typical MACHINE's value: the unweighted median of the per-sandbox medians.
 *
 * This, not the median of the pooled Samples, is what a reader means by "what does a sandbox from this
 * provider do". Pooling weights each sandbox by its TRIAL COUNT, and PTS's convergence mode chooses that
 * count by watching the variance — so a sandbox that measured noisy earns more votes in the published
 * number (measured on the committed dataset: Spearman ρ(trials, within-sandbox CV) = 0.76). One machine
 * one vote removes that, and matches the unit {@link clusterSeparation} already tests on.
 */
export function sandboxMedianOf(replicates: readonly (readonly number[])[]): number {
	assertReplicates("sandboxMedianOf", replicates);
	return percentileOf(sandboxMedians(replicates), 0.5);
}

/**
 * Cluster bootstrap of {@link sandboxMedianOf}: resample the R sandboxes WITH REPLACEMENT, keeping each
 * drawn sandbox's Samples INTACT, and take the median of the drawn sandboxes' medians.
 *
 * No second, within-sandbox resampling stage. Each observed sandbox's Samples already contain one
 * realization of that machine's within-noise, so the spread of the R summaries already carries both
 * variance components (σ²_between + σ²_within/k). Drawing the Samples again inside each drawn sandbox
 * adds a SECOND independent copy of the within-component on top of the one already there, inflating the
 * standard error by √(1 + (k−1)/k) — measured 1.219 against a predicted 1.2247 at k=2. That is why this
 * function, not {@link hierarchicalBootstrapMedianInterval}, is what the leaderboard reports.
 *
 * COVERAGE IS NOT NOMINAL AT SMALL R, and no percentile method makes it so: at R=3 the true coverage of
 * a "95%" interval is ≈77%, rising to ≈92% at R=6 and ≈95% at R=20. That is a property of having three
 * clusters, not of this estimator. Callers rendering the interval must disclose it (see the leaderboard's
 * methodology section) rather than presenting the nominal level as achieved.
 *
 * Degenerates deterministically: one sandbox → a point interval (`resamples: 0`), never a bound
 * fabricated from within-machine noise that says nothing about machine-to-machine spread.
 */
export function clusterMedianInterval(
	replicates: readonly (readonly number[])[],
	options: { resamples?: number; level?: number; seed?: string } = {},
): MedianInterval {
	assertReplicates("clusterMedianInterval", replicates);
	const level = coverageLevel("clusterMedianInterval", options.level);
	const resamples = options.resamples ?? DEFAULT_RESAMPLES;
	if (!Number.isInteger(resamples) || resamples < 1) {
		throw new Error(
			`clusterMedianInterval() requires resamples to be a positive integer; got ${resamples}`,
		);
	}

	const summaries = sandboxMedians(replicates);
	const median = percentileOf(summaries, 0.5);
	// One sandbox carries no between-machine information; a bound drawn from its trials would describe
	// that machine, not the provider. Mirrors bootstrapMedianInterval's single-Sample posture.
	if (summaries.length === 1) return { median, lo: median, hi: median, level, resamples: 0 };

	const rng = seededRng(options.seed ?? "sandbox-benchmarks");
	const R = summaries.length;
	const medians = new Float64Array(resamples);
	const draw = new Float64Array(R);
	for (let b = 0; b < resamples; b++) {
		for (let i = 0; i < R; i++) draw[i] = summaries[Math.floor(rng() * R)] as number;
		medians[b] = medianInPlace(draw, R);
	}
	medians.sort();
	const tail = (1 - level) / 2;
	return {
		median,
		lo: percentile(medians, tail),
		hi: percentile(medians, 1 - tail),
		level,
		resamples,
	};
}

/**
 * Hierarchical (two-level) percentile bootstrap of the median across replicate sandboxes.
 *
 * SUPERSEDED for reporting by {@link clusterMedianInterval} — its inner within-sandbox resampling stage
 * double-counts within-machine variance (see that function). Retained as the textbook two-stage variant
 * (Davison & Hinkley Algorithm 3.2) and because the committed pre-2026-08 leaderboards were rendered
 * from it; nothing in the current pipeline calls it.
 *
 * The reported `median` is the observed median of the POOLED Samples — the trial-count-weighted value
 * the leaderboard used to print — and `[lo, hi]` is the [α/2, 1−α/2] envelope of the resampled medians,
 * where each resample first draws replicates with replacement and then Samples within each.
 *
 * Degenerates deterministically:
 *  - one replicate  → the cluster draw always re-selects it, so this is the ordinary percentile
 *    bootstrap over that replicate's Samples (statistically identical to {@link bootstrapMedianInterval};
 *    the raw draw sequence differs, so the leaderboard keeps calling the single-level function at R = 1
 *    to stay byte-stable against the committed dataset).
 *  - one pooled Sample → a point interval (`resamples: 0`, `lo === hi === median`), never a fabricated
 *    bound, exactly as the single-level bootstrap does.
 */
export function hierarchicalBootstrapMedianInterval(
	replicates: readonly (readonly number[])[],
	options: { resamples?: number; level?: number; seed?: string } = {},
): MedianInterval {
	assertReplicates("hierarchicalBootstrapMedianInterval", replicates);
	const level = coverageLevel("hierarchicalBootstrapMedianInterval", options.level);
	const resamples = options.resamples ?? DEFAULT_RESAMPLES;
	if (!Number.isInteger(resamples) || resamples < 1) {
		throw new Error(
			`hierarchicalBootstrapMedianInterval() requires resamples to be a positive integer; got ${resamples}`,
		);
	}

	const pooled = replicates.flat();
	const median = percentileOf(pooled, 0.5);
	// A single pooled Sample carries no information about its own spread — degenerate to a point interval
	// rather than resampling one value into a fake bound (mirrors {@link bootstrapMedianInterval}).
	if (pooled.length === 1) return { median, lo: median, hi: median, level, resamples: 0 };

	const rng = seededRng(options.seed ?? "sandbox-benchmarks");
	const medians = new Float64Array(resamples);
	const pool = resamplePool(replicates);
	for (let b = 0; b < resamples; b++)
		medians[b] = hierarchicalResampleMedian(replicates, rng, pool);
	medians.sort();
	const tail = (1 - level) / 2;
	return {
		median,
		lo: percentile(medians, tail),
		hi: percentile(medians, 1 - tail),
		level,
		resamples,
	};
}

/**
 * Whether two Metrics' replicate SANDBOXES separate, and how much power the comparison had — the
 * verdict a replicate-aware ranking reads, with no interval attached. {@link clusterSeparation}
 * produces it; {@link MedianDifferenceInterval} carries it alongside a bootstrapped interval.
 *
 * Declared here rather than projected out of the interval type: this is the shape the leaderboard
 * consumes, so it owns its own field docs and cannot lose one to a change in the interval's shape.
 */
export interface ClusterSeparation {
	/** Coverage, e.g. 0.95. The significance level α the verdict is decided at is `1 − level`. */
	level: number;
	/**
	 * How the verdict's p-value was computed, straight from the underlying {@link mannWhitneyU}: `exact` —
	 * enumerated over the cluster permutation null — up to that test's exact-N ceiling (`MAX_EXACT_N` total
	 * sandboxes, far beyond any R this benchmark runs), and the normal `asymptotic` approximation only
	 * above it. Surfaced so a consumer is never told an approximated verdict is exact.
	 */
	method: PValueMethod;
	/**
	 * Two-sided p-value of the cluster-level rank permutation — Mann-Whitney U on each side's per-sandbox
	 * medians, with whole replicate sandboxes as the exchangeable unit (exact per {@link method}). This is
	 * what decides {@link separated}: MW on Samples pooled across replicates treats clustered draws as
	 * independent (anti-conservative), while the superseded "confidence interval clears 0" rule read
	 * between-provider power off within-sandbox spread and over-claimed at small R. Resampling the
	 * sandboxes is honest.
	 */
	pValue: number;
	/**
	 * The smallest p this comparison could ever yield — the attainable floor under complete separation. It
	 * depends on the sandbox counts AND the tie pattern among the per-sandbox medians (for DISTINCT medians
	 * it is `2/C(R_a+R_b, R_a)`: 1 at R=1, 0.1 at R=3, 0.029 at R=4). When it already meets or exceeds
	 * α (= 1 − {@link level}) the comparison is UNDERPOWERED: no data separates the two at this coverage,
	 * so a consumer must not read a non-separation as a tie. Mirrors {@link mannWhitneyU}'s field of the
	 * same name — because it IS that field, computed on the per-sandbox medians.
	 */
	minAttainablePValue: number;
	/**
	 * Separation verdict: {@link pValue} < α (α = 1 − {@link level}). True only when the sandboxes
	 * themselves separate the two providers — never from within-sandbox spread alone, and never below the
	 * R ≥ 4 the 5% floor requires. A single sandbox per side (however many in-sandbox trials) can never be
	 * separated: its 1-vs-1 cluster test floors at p = 1.
	 */
	separated: boolean;
}

/** A bootstrapped interval around the DIFFERENCE in two Metrics' medians, plus the cluster-level
 *  separation verdict a ranking reads. Interval and verdict come from deliberately-different methods:
 *  the added fields below are the interval, the inherited ones are the verdict. */
export interface MedianDifferenceInterval extends ClusterSeparation {
	/** Observed difference: median(pooled A) − median(pooled B). Sign follows the argument order. */
	difference: number;
	/** Lower/upper bound of the hierarchical-bootstrap interval at {@link level} — the DISPLAYED interval. */
	lo: number;
	hi: number;
	/** Resamples drawn for the interval. `0` is the degenerate single-pooled-Sample-per-side case: the
	 *  bounds collapse to the observed `difference`. */
	resamples: number;
}

/**
 * The verdict half of {@link bootstrapMedianDifferenceInterval}, callable without the interval half:
 * a cluster-level rank permutation — {@link mannWhitneyU} on each side's per-sandbox medians, whole
 * replicate sandboxes as the exchangeable unit. Order-invariant, RNG-free, and O(R log R) in the
 * sandbox count.
 *
 * Split out because a ranking reads ONLY the verdict. Computing it through the full difference
 * interval made every adjacent-pair comparison pay a 10 000-resample hierarchical bootstrap whose
 * `lo`/`hi` were then discarded — the dominant cost of building a leaderboard, for a number nobody
 * displayed. {@link bootstrapMedianDifferenceInterval} delegates here, so the two can never disagree.
 */
export function clusterSeparation(
	a: readonly (readonly number[])[],
	b: readonly (readonly number[])[],
	options: { level?: number } = {},
): ClusterSeparation {
	assertReplicates("clusterSeparation", a);
	assertReplicates("clusterSeparation", b);
	const level = coverageLevel("clusterSeparation", options.level);
	const { pValue, minAttainablePValue, method } = mannWhitneyU(
		a.map((replicate) => percentileOf(replicate, 0.5)),
		b.map((replicate) => percentileOf(replicate, 0.5)),
	);
	return { level, method, pValue, minAttainablePValue, separated: pValue < 1 - level };
}

/**
 * Compare two Metrics measured across replicate sandboxes, returning BOTH a displayed interval and a
 * separation verdict — computed by different, deliberately-matched methods:
 *
 *  - INTERVAL (`lo`/`hi`): the hierarchical bootstrap of the difference in medians. Each resample draws a
 *    hierarchical median for A and one for B (replicates with replacement, then Samples within) from ONE
 *    shared seeded RNG and records their difference; the interval is the [α/2, 1−α/2] envelope. Because
 *    that RNG draws A then B in order, the bounds depend on argument ORDER — reversing A and B negates
 *    `difference` but need not mirror `lo`/`hi`. A deliberate trade for one reproducible seed; the
 *    leaderboard always calls it higher-vs-lower, so the committed artifact stays byte-stable.
 *
 *  - VERDICT (`separated`/`pValue`/`minAttainablePValue`/`method`): a cluster-level rank permutation —
 *    {@link mannWhitneyU} on each side's per-sandbox medians, with whole sandboxes as the exchangeable
 *    unit (EXACT up to that test's exact-N ceiling — far beyond any real R — else asymptotic; see
 *    `method`). Unlike the interval this is ORDER-INVARIANT and carries the honest attainable floor
 *    (`2/C(R_a+R_b, R_a)` for distinct medians), so a single sandbox per side never separates and R < 4
 *    cannot clear α = 0.05. It replaces the old "interval clears 0" rule, which over-claimed separation.
 *
 * Deterministic given `seed`, so a committed leaderboard built from it is byte-stable across machines.
 */
export function bootstrapMedianDifferenceInterval(
	a: readonly (readonly number[])[],
	b: readonly (readonly number[])[],
	options: { resamples?: number; level?: number; seed?: string } = {},
): MedianDifferenceInterval {
	assertReplicates("bootstrapMedianDifferenceInterval", a);
	assertReplicates("bootstrapMedianDifferenceInterval", b);
	const level = coverageLevel("bootstrapMedianDifferenceInterval", options.level);
	const resamples = options.resamples ?? DEFAULT_RESAMPLES;
	if (!Number.isInteger(resamples) || resamples < 1) {
		throw new Error(
			`bootstrapMedianDifferenceInterval() requires resamples to be a positive integer; got ${resamples}`,
		);
	}

	const pooledA = a.flat();
	const pooledB = b.flat();
	const difference = percentileOf(pooledA, 0.5) - percentileOf(pooledB, 0.5);

	// VERDICT — the cluster-level rank permutation, in full in {@link clusterSeparation}: Mann-Whitney U on
	// each side's per-sandbox medians (one summary per replicate), so the sandboxes themselves are the
	// exchangeable unit. Its `minAttainablePValue` is the honest between-sandbox floor — 1 at R=1, 0.1 at
	// R=3 — the power the CI rule below cannot see. Spread WHOLE into both returns rather than field by
	// field: that is what makes "these two can never disagree" structural instead of a promise, and it
	// carries any field later added to ClusterSeparation without a second edit here.
	const verdict = clusterSeparation(a, b, { level });

	// INTERVAL — one pooled Sample per side carries no spread, so the DISPLAYED interval degenerates to a
	// point (resamples: 0) rather than 10 000 identical draws. The verdict above already forced `separated`
	// false for it (its 1-vs-1 cluster test floors at p = 1).
	if (pooledA.length === 1 && pooledB.length === 1) {
		return { ...verdict, difference, lo: difference, hi: difference, resamples: 0 };
	}
	const rng = seededRng(options.seed ?? "sandbox-benchmarks");
	const diffs = new Float64Array(resamples);
	const poolA = resamplePool(a);
	const poolB = resamplePool(b);
	for (let i = 0; i < resamples; i++) {
		diffs[i] =
			hierarchicalResampleMedian(a, rng, poolA) - hierarchicalResampleMedian(b, rng, poolB);
	}
	diffs.sort();
	const tail = (1 - level) / 2;
	return {
		...verdict,
		difference,
		lo: percentile(diffs, tail),
		hi: percentile(diffs, 1 - tail),
		resamples,
	};
}

/** Standard normal CDF, via a rational approximation to erfc (Numerical Recipes `erfcc`,
 *  |ε| < 1.2e-7 — far finer than any p-value we act on). */
function normalCdf(z: number): number {
	const x = Math.abs(z) / Math.SQRT2;
	const t = 1 / (1 + 0.5 * x);
	const tau =
		t *
		Math.exp(
			-x * x -
				1.26551223 +
				t *
					(1.00002368 +
						t *
							(0.37409196 +
								t *
									(0.09678418 +
										t *
											(-0.18628806 +
												t *
													(0.27886807 +
														t *
															(-1.13520398 +
																t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))),
		);
	const erfc = z >= 0 ? tau : 2 - tau;
	return 1 - erfc / 2;
}

/** Midranks of the pooled samples (ties share their average rank), plus Σ(t³−t) over tie groups. */
function midranks(pooled: readonly number[]): { ranks: number[]; tieCorrection: number } {
	const order = pooled.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
	const ranks = new Array<number>(pooled.length);
	let tieCorrection = 0;
	for (let i = 0; i < order.length; ) {
		let j = i;
		while (j + 1 < order.length && order[j + 1]?.value === order[i]?.value) j++;
		// Ranks are 1-based; a tie group spanning [i, j] shares their mean rank.
		const mean = (i + j + 2) / 2;
		const t = j - i + 1;
		tieCorrection += t ** 3 - t;
		for (let k = i; k <= j; k++) ranks[(order[k] as { index: number }).index] = mean;
		i = j + 1;
	}
	return { ranks, tieCorrection };
}

/** How a {@link DistributionTest}'s p-value was obtained — the two differ materially at small n. */
export type PValueMethod = "exact" | "asymptotic";

/** The outcome of a two-sample test on full distributions. */
export interface DistributionTest {
	/** The test statistic (U for Mann-Whitney, D for Kolmogorov-Smirnov). */
	statistic: number;
	/** Two-sided p-value: P(a difference this extreme | the two samples came from one distribution). */
	pValue: number;
	/**
	 * `exact` — enumerated over the permutation null, so the p-value is the true tail probability for
	 * THESE sample sizes and THIS tie pattern. `asymptotic` — a normal/limiting approximation, which at
	 * small n can be anti-conservative (it can report a p the exact null cannot actually produce).
	 */
	method: PValueMethod;
	nA: number;
	nB: number;
}

/**
 * A Mann-Whitney result, plus the thing a ranking has to know before it may believe one: the smallest
 * p this comparison was CAPABLE of producing.
 */
export interface RankSumTest extends DistributionTest {
	/**
	 * The smallest two-sided p this comparison could have returned, at any effect size — the value the
	 * test yields under COMPLETE separation, which is the most extreme evidence a rank statistic can
	 * encode. A ranking must not believe a p the comparison was never capable of producing;
	 * {@link canSeparate} is the guard that reads this.
	 *
	 * It is a property of the sample sizes AND THE TIE PATTERN — not, as it may look, of the sizes alone.
	 * That distinction is load-bearing, and getting it wrong is unsafe in the direction that matters:
	 *
	 * Without ties, the rank multiset {1..N} is symmetric under r ↦ N+1−r, so the two extreme splits (one
	 * side takes the lowest nA ranks, or the highest) both sit at maximal |U−μ| and the two-sided tail
	 * collects both: the floor is 2/C(N, nA). Ties destroy that symmetry — midranks are no longer a mirror
	 * of themselves — and a lone split can then stand at the maximum, halving the floor to 1/C(N, nA).
	 * `[2]` vs `[1,1]` really does return p = 1/3 where an untied 1 v 2 floors at 2/3. So any size-only
	 * formula is either wrong (if it assumes no ties) or needlessly pessimistic (if it assumes the worst).
	 *
	 * Enumerating the observed ranks sidesteps the whole question: this is the null's own mass at its most
	 * extreme split, computed in the same pass as {@link DistributionTest.pValue}, so the two are answers
	 * about one distribution and cannot contradict each other. At 3 v 3 it is 0.1 — above α — so no pair of
	 * three-trial providers can be declared different however far apart their medians are, and a caller
	 * that read that non-significant p as "statistically tied" would be reporting a fact about its trial
	 * count as if it were a fact about the providers.
	 */
	minAttainablePValue: number;
}

/**
 * The largest pooled sample the exact Mann-Whitney enumeration runs on.
 *
 * The bound is arithmetic, not performance: the enumeration counts subsets, and C(N, N/2) exceeds
 * `Number.MAX_SAFE_INTEGER` around N = 57, past which the counts (and so the p-value) silently lose
 * integer precision. 50 keeps a margin, and the DP costs O(nA · N²) ≈ 3M operations at the ceiling —
 * microseconds, and far beyond the handful of trials this benchmark produces.
 */
const MAX_EXACT_N = 50;

/** Exact C(n, k) for n ≤ {@link MAX_EXACT_N}, where the result is integer-exact in a double. */
function choose(n: number, k: number): number {
	if (k < 0 || k > n) return 0;
	const j = Math.min(k, n - k);
	let result = 1;
	for (let i = 1; i <= j; i++) result = (result * (n - j + i)) / i;
	return Math.round(result);
}

/**
 * The exact two-sided Mann-Whitney null, evaluated at the observed split AND at the most extreme split
 * these ranks admit: P(|U − μ| ≥ |U_obs − μ|) under the permutation null, where every C(N, nA) split of
 * the pooled ranks is equally likely. Conditioning on the OBSERVED ranks makes this exact with ties,
 * not merely without them — and it is why the floor falls out of the same pass as the p-value: both are
 * tail masses of one enumerated distribution, so they cannot contradict each other.
 *
 * Counted by DP over rank sums rather than by enumerating splits: `counts[k][s]` is the number of
 * size-k subsets whose rank sum is s. Midranks are half-integers when ties are present, so the DP runs
 * on DOUBLED ranks, keeping every index an exact integer.
 */
function exactMannWhitney(
	ranks: readonly number[],
	nA: number,
	nB: number,
): { pValue: number; minAttainablePValue: number } {
	const N = nA + nB;
	const doubled = ranks.map((r) => Math.round(r * 2));
	const total = doubled.reduce((sum, r) => sum + r, 0);

	// counts[k][s] — subsets of size k with doubled-rank-sum s. Iterate k downward so each element is
	// used at most once per subset (the 0/1-knapsack order).
	const counts: number[][] = Array.from({ length: nA + 1 }, () =>
		new Array<number>(total + 1).fill(0),
	);
	(counts[0] as number[])[0] = 1;
	for (const rank of doubled) {
		for (let k = Math.min(nA, N) - 1; k >= 0; k--) {
			const from = counts[k] as number[];
			const into = counts[k + 1] as number[];
			for (let s = total - rank; s >= 0; s--) {
				const c = from[s] as number;
				if (c !== 0) into[s + rank] = (into[s + rank] as number) + c;
			}
		}
	}

	// U doubled: 2·(rankSumA − nA(nA+1)/2) = s − nA(nA+1). μ doubled: 2·(nA·nB/2) = nA·nB.
	const offset = nA * (nA + 1);
	const mu2 = nA * nB;
	let rankSumA2 = 0;
	for (let i = 0; i < nA; i++) rankSumA2 += doubled[i] as number;
	const observedDeviation = Math.abs(rankSumA2 - offset - mu2);

	// One sweep of the null: the mass at least as extreme as what we saw (the p-value), and the mass at
	// least as extreme as the MOST extreme split available (the floor — the p the test would report if
	// the two providers separated perfectly).
	const row = counts[nA] as number[];
	let maxDeviation = 0;
	for (let s = 0; s <= total; s++) {
		if ((row[s] as number) !== 0) {
			maxDeviation = Math.max(maxDeviation, Math.abs(s - offset - mu2));
		}
	}
	let atLeastAsExtreme = 0;
	let atMostExtreme = 0;
	for (let s = 0; s <= total; s++) {
		const c = row[s] as number;
		if (c === 0) continue;
		const deviation = Math.abs(s - offset - mu2);
		if (deviation >= observedDeviation) atLeastAsExtreme += c;
		if (deviation >= maxDeviation) atMostExtreme += c;
	}
	const splits = choose(N, nA);
	return {
		pValue: Math.min(1, atLeastAsExtreme / splits),
		minAttainablePValue: Math.min(1, atMostExtreme / splits),
	};
}

/**
 * Could {@link mannWhitneyU} have reached significance at all for this comparison? False means the test
 * is structurally powerless here — not merely low-powered — so a caller must NOT read its
 * non-significant p as evidence that the two sides are alike. Rank on the observed values instead and
 * disclose that the comparison was untestable.
 *
 * Takes the TEST, not the two sample sizes. The floor it reads
 * ({@link RankSumTest.minAttainablePValue}) depends on the tie pattern as well as the sizes, so
 * re-deriving it from `nA`/`nB` is exactly the shortcut that lets a guard disagree with the test it is
 * guarding — which is precisely how the old size-only floor came to claim 0.081 for a 3 v 3 that the
 * test then answered with 0.047.
 */
export function canSeparate(test: RankSumTest, alpha: number = DEFAULT_ALPHA): boolean {
	return test.minAttainablePValue < alpha;
}

/**
 * Mann-Whitney U (two-sided) — EXACT at the sample sizes this benchmark produces, falling back to the
 * tie- and continuity-corrected normal approximation only past {@link MAX_EXACT_N}.
 *
 * The question it answers is exactly the one a leaderboard needs: are these two providers' Samples
 * drawn from the same distribution, or does one genuinely tend to be faster? It's rank-based, so it
 * assumes neither normality nor equal variance — both of which these Samples violate — and a single
 * catastrophic pass moves a rank by one position instead of dragging a mean.
 *
 * It is exact BECAUSE n is small, not despite it. The normal approximation is anti-conservative here,
 * and the failure is not a rounding error — it is a wrong verdict:
 *
 *     mannWhitneyU([1,1,1], [2,2,2])   approximation: p = 0.047  → "separated" at α = 0.05
 *                                      exact:         p = 0.100  → the null cannot go below 0.1 at 3 v 3
 *
 * The tie correction shrinks the approximation's variance, inflating z, and three-of-a-kind on each side
 * shrinks it hard. So the approximation returned a p BELOW the floor the exact null imposes on 3 trials
 * a side — and would have crowned a provider on evidence the test cannot actually supply. Enumerating
 * the permutation null removes the failure mode rather than documenting it.
 *
 * At n≈5 a side the smallest attainable two-sided p is 2/C(10,5) ≈ 0.008, so a genuine difference
 * between two five-trial providers can still be detected, but only a large one — treat a non-significant
 * result at small n as "not enough evidence", never as "the providers are equal". Below that the test
 * runs out of power entirely ({@link canSeparate}); callers that rank on it must branch, not silently tie.
 */
export function mannWhitneyU(a: readonly number[], b: readonly number[]): RankSumTest {
	if (a.length === 0 || b.length === 0) {
		throw new Error("mannWhitneyU() requires a non-empty sample on both sides");
	}
	// A NaN silently corrupts the sort-based midranks and returns a plausible p-value.
	assertFiniteSamples("mannWhitneyU", a);
	assertFiniteSamples("mannWhitneyU", b);
	const nA = a.length;
	const nB = b.length;
	const { ranks, tieCorrection } = midranks([...a, ...b]);
	let rankSumA = 0;
	for (let i = 0; i < nA; i++) rankSumA += ranks[i] as number;

	const uA = rankSumA - (nA * (nA + 1)) / 2;
	const uB = nA * nB - uA;
	const statistic = Math.min(uA, uB);

	const N = nA + nB;
	if (N <= MAX_EXACT_N) {
		return { statistic, ...exactMannWhitney(ranks, nA, nB), method: "exact", nA, nB };
	}

	const mu = (nA * nB) / 2;
	// Tie-corrected variance; collapses to nA*nB*(N+1)/12 when there are no ties.
	const variance = ((nA * nB) / 12) * (N + 1 - tieCorrection / (N * (N - 1)));
	// Every pooled value identical → no variance, no evidence of any difference.
	if (variance <= 0) {
		return { statistic, pValue: 1, minAttainablePValue: 1, method: "asymptotic", nA, nB };
	}

	// Continuity correction: |U − μ| is discrete, so shave half a step before the normal tail.
	const z = (dev: number): number => Math.max(0, dev - 0.5) / Math.sqrt(variance);
	const tail = (dev: number): number => Math.min(1, 2 * (1 - normalCdf(z(dev))));
	// The floor mirrors the p-value through the SAME variance (this rank multiset's, ties and all), at
	// the most extreme statistic the test admits: complete separation, U = 0. Deriving it any other way
	// is what lets a floor disagree with the test it bounds.
	return {
		statistic,
		pValue: tail(Math.abs(statistic - mu)),
		minAttainablePValue: tail(mu),
		method: "asymptotic",
		nA,
		nB,
	};
}

/**
 * Two-sample Kolmogorov-Smirnov (two-sided), asymptotic p-value.
 *
 * Complements Mann-Whitney: where U tests for a shift in central tendency, D is the largest gap
 * between the two empirical CDFs, so it also catches providers whose medians coincide but whose
 * *shapes* differ — a stable provider vs a bimodal one that alternates between fast and stalled
 * passes. That bimodality is precisely what environmental noise looks like.
 *
 * The tail is the asymptotic (Numerical Recipes) approximation at every n; exact enumeration is not
 * implemented, and — unlike {@link mannWhitneyU}, which now enumerates — that is a deliberate limit,
 * because KS does NOT drive the ranking. It is reported beside the rank as a shape diagnostic, never as
 * the verdict, so its small-n anti-conservatism cannot buy a provider a position. It is real, though:
 * `[1,2,3]` vs `[4,5,6]` returns p≈0.033 where the exact two-sided p is 2/C(6,3)=0.1. Read a small-n
 * `p (KS)` as directional evidence about distribution shape, never as hard proof.
 */
export function kolmogorovSmirnov(a: readonly number[], b: readonly number[]): DistributionTest {
	if (a.length === 0 || b.length === 0) {
		throw new Error("kolmogorovSmirnov() requires a non-empty sample on both sides");
	}
	// Critical: a NaN stalls the ECDF sweep below forever — `x <= y` and `y <= x` are both false, so
	// neither index advances. Reject it here rather than hanging the leaderboard build.
	assertFiniteSamples("kolmogorovSmirnov", a);
	assertFiniteSamples("kolmogorovSmirnov", b);
	const nA = a.length;
	const nB = b.length;
	const sortedA = [...a].sort((x, y) => x - y);
	const sortedB = [...b].sort((x, y) => x - y);

	// Sweep both ECDFs together, stepping whichever is behind; D is the largest gap seen.
	let i = 0;
	let j = 0;
	let statistic = 0;
	while (i < nA && j < nB) {
		const x = sortedA[i] as number;
		const y = sortedB[j] as number;
		// Advance past every copy of the smaller value (both, when equal) before measuring the gap, so
		// ties can't report a spurious step.
		if (x <= y) while (i < nA && sortedA[i] === x) i++;
		if (y <= x) while (j < nB && sortedB[j] === y) j++;
		statistic = Math.max(statistic, Math.abs(i / nA - j / nB));
	}

	const en = Math.sqrt((nA * nB) / (nA + nB));
	return {
		statistic,
		pValue: kolmogorovQ((en + 0.12 + 0.11 / en) * statistic),
		method: "asymptotic",
		nA,
		nB,
	};
}

/**
 * Q_KS(λ) = 2 Σ_{j≥1} (−1)^{j−1} e^{−2j²λ²}, the asymptotic KS tail (Numerical Recipes `probks`).
 *
 * Summing a fixed number of terms is WRONG at small λ: the series alternates 1−1+1−1…, so a truncated
 * sum collapses toward 0 and reports p≈0 — i.e. "certainly different" — for two IDENTICAL samples
 * (λ = 0). Iterate until the terms actually converge, and treat non-convergence (only λ→0 does that)
 * as p = 1, which is the limit.
 */
function kolmogorovQ(lambda: number): number {
	const EPS1 = 1e-6;
	const EPS2 = 1e-16;
	const a2 = -2 * lambda * lambda;
	let fac = 2;
	let sum = 0;
	let termPrev = 0;
	for (let j = 1; j <= 100; j++) {
		const term = fac * Math.exp(a2 * j * j);
		sum += term;
		if (Math.abs(term) <= EPS1 * termPrev || Math.abs(term) <= EPS2 * sum) {
			return Math.max(0, Math.min(1, sum));
		}
		fac = -fac;
		termPrev = Math.abs(term);
	}
	// Failed to converge — only happens as λ → 0, where the true value is 1 (no evidence of difference).
	return 1;
}
