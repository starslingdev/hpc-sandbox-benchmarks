// Private implementation detail of @sandbox-benchmarks/harness.

/** Monotonic clock wrapper so timing is swappable in tests. Stub. */
export function now(): number {
	return performance.now();
}

/** A measured operation: its return value paired with the elapsed wall time. */
export interface Timed<T> {
	value: T;
	ms: number;
}

/**
 * Time an async (or sync) operation, flooring to a strictly-positive duration. `rawRunSchema` requires
 * `durationMs > 0`, and a sub-tick op can observe two equal `now()` readings (a 0 delta) — so the floor
 * to EPSILON lives here, the single home for the contract `timeOperation` and the lifecycle driver share.
 */
export async function time<T>(run: () => Promise<T> | T): Promise<Timed<T>> {
	const start = now();
	const value = await run();
	return { value, ms: Math.max(now() - start, Number.EPSILON) };
}
