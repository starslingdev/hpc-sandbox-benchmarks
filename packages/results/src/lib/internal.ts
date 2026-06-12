// Private implementation detail of @sandbox-benchmarks/results.

/** Current time as an ISO-8601 string. Wrapped so it can be stubbed in tests. */
export function isoNow(): string {
  return new Date().toISOString();
}
