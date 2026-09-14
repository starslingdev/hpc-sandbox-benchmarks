/** One copy of the duration formatting, shared by everything that prints a total — two
 *  implementations would let a chart round a number differently from the surface above it. */
export function formatSeconds(s: number): string {
	return `${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
}

/**
 * A metric value as the leaderboard's tables print it: integers verbatim, anything else to four
 * significant digits with trailing zeros dropped (`0.2304`, `12.35`, `1234`). The same rule as
 * `packages/results`' table formatter, restated here because the chart's number must be the
 * table's number — a reader checking one against the other must find them equal.
 */
export function formatMetricValue(value: number): string {
	if (Number.isInteger(value)) return String(value);
	return Number.parseFloat(value.toPrecision(4)).toString();
}
