// The runtime half of the PROVIDERS × adapters join guarantee. The `Record<ProviderId, …>` type on
// both registries already makes a one-sided provider a *compile* error, but a compile error only
// protects an in-repo edit: a published/installed build, a downstream consumer, or any path where the
// schema and providers packages drift to different versions can present a registry pair the compiler
// never type-checked together. This asserts the two id sets are identical at load and throws naming
// the exact offenders, so a one-sided provider fails loudly here instead of surfacing as an
// `undefined` adapter deep inside a benchmark run.

/**
 * Assert that the schema provider ids and the harness adapter ids are exactly the same set.
 * Throws an {@link Error} naming every one-sided id (in the schema but missing an adapter, or with an
 * adapter but no schema entry) when they disagree; returns silently when they match. Both id lists
 * are passed in (rather than read from the modules) so the guard stays a pure, unit-testable function
 * the caller wires to the real registries.
 */
export function assertProviderJoin(
	schemaIds: readonly string[],
	adapterIds: readonly string[],
): void {
	const schema = new Set(schemaIds);
	const adapter = new Set(adapterIds);
	const missingAdapter = schemaIds.filter((id) => !adapter.has(id));
	const missingSchema = adapterIds.filter((id) => !schema.has(id));
	if (missingAdapter.length === 0 && missingSchema.length === 0) return;

	const parts: string[] = [];
	if (missingAdapter.length > 0) {
		parts.push(
			`in the schema PROVIDERS registry but missing a harness adapter: ${missingAdapter.join(", ")}`,
		);
	}
	if (missingSchema.length > 0) {
		parts.push(`have a harness adapter but no schema PROVIDERS entry: ${missingSchema.join(", ")}`);
	}
	throw new Error(`Provider registry mismatch — ${parts.join("; ")}`);
}
