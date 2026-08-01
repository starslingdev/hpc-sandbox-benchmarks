/** One copy of the duration formatting, shared by everything that prints a total — two
 *  implementations would let a chart round a number differently from the surface above it. */
export function formatSeconds(s: number): string {
	return `${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
}
