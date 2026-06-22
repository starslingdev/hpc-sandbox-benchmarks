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
function percentile(sorted: readonly number[], p: number): number {
	const h = (sorted.length - 1) * p;
	const lo = Math.floor(h);
	const hi = Math.ceil(h);
	const loValue = sorted[lo] ?? Number.NaN;
	const hiValue = sorted[hi] ?? loValue;
	return loValue + (h - lo) * (hiValue - loValue);
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
