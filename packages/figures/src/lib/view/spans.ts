/**
 * Interval-bar geometry: where each row's 95% bootstrap interval sits on a shared axis.
 *
 * RULE: no bar ever encodes a median alone. A bar is the INTERVAL, drawn as a span, with the median
 * as a tick inside it — so two providers whose intervals overlap render as visibly overlapping bars,
 * which is the actual finding. A median bar chart would draw the cpu headline's top two at 100% and
 * 94% on a metric where the test could not separate them at all.
 *
 * Everything is expressed as fractions in [0, 1] of the metric's plotted domain, so this module owns
 * the statistics-to-geometry step and the component owns only fractions-to-pixels.
 */
import type { LeaderboardRow } from "@sandbox-benchmarks/results";

/** Where a row's interval sits within the metric's plotted domain, as fractions in [0, 1]. */
export interface Span {
	readonly lo: number;
	readonly hi: number;
	readonly median: number;
}

interface Domain {
	readonly lo: number;
	readonly hi: number;
}

/**
 * The plotted domain: the union of every interval on the metric, so overlapping intervals overlap on
 * screen. Bounds come from the INTERVALS rather than the medians precisely so that a row with a wide
 * interval reads as uncertain instead of as a precise value.
 *
 * `null` when no row has an interval worth plotting — the figure then draws no bars at all.
 */
export function domainOf(rows: readonly LeaderboardRow[]): Domain | null {
	const usable = rows.filter((r) => r.interval.resamples > 0);
	if (usable.length === 0) return null;
	let lo = Number.POSITIVE_INFINITY;
	let hi = Number.NEGATIVE_INFINITY;
	for (const r of usable) {
		lo = Math.min(lo, r.interval.lo, r.value);
		hi = Math.max(hi, r.interval.hi, r.value);
	}
	// A degenerate domain (every interval identical) would divide by zero; give it a nominal width.
	if (!(hi > lo)) return { lo: lo - 0.5, hi: hi + 0.5 };
	return { lo, hi };
}

/**
 * The span to plot for one row, or `null` when there is nothing to plot — no domain, or a single
 * trial (`resamples === 0`), where the value is typically exact rather than measured. A row with no
 * span draws no bar; it never draws a zero-length one.
 */
export function spanOf(row: LeaderboardRow, domain: Domain | null): Span | null {
	if (domain === null || row.interval.resamples === 0) return null;
	const size = domain.hi - domain.lo;
	return {
		lo: (row.interval.lo - domain.lo) / size,
		hi: (row.interval.hi - domain.lo) / size,
		median: (row.value - domain.lo) / size,
	};
}
