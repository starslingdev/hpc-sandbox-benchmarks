// Private implementation detail of @sandbox-benchmarks/harness.

/** Monotonic clock wrapper so timing is swappable in tests. Stub. */
export function now(): number {
	return performance.now();
}
