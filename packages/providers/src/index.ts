// Public surface of @sandbox-benchmarks/providers.
// Depends on @sandbox-benchmarks/schema (provider identity) and computesdk + the @computesdk/*
// wrappers (the unified provider runtime). Each provider is wired via its @computesdk/* factory;
// `providers` is the schema identity joined with those adapters.
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { adapters } from "./lib/adapters.ts";
import { assertProviderJoin } from "./lib/join.ts";
import type { ProviderConfig } from "./lib/types.ts";

// The runtime configuration gatekeeper — the single validated config object consumers import.
export { config } from "./lib/config.ts";
// Novita's E2B-compat surface: the domain the bake pipeline points the e2b CLI at, and the compat
// factory (exported for tests and for anyone driving Novita outside the harness join).
export { NOVITA_E2B_DOMAIN, novitaCompute, novitaConnection } from "./lib/novita.ts";
export type { DirectProvider, ProviderAdapter, ProviderConfig } from "./lib/types.ts";

/**
 * All provider benchmark configurations: each schema provider's identity joined with its harness
 * adapter, in schema declaration order.
 *
 * No runtime reconciliation is needed because both sides are keyed by the same `ProviderId`:
 * `PROVIDERS` is derived from the schema's `Record<ProviderId, …>` registry and `adapters` is a
 * `Record<ProviderId, ProviderAdapter>`, so every `meta.id` indexes exactly one adapter and the two
 * registries are provably the same set at compile time.
 *
 * The runtime {@link assertProviderJoin} below backs that compile-time guarantee for any path the
 * type-checker never saw — a published/installed build or a cross-version schema/providers drift —
 * failing loudly at module load rather than letting a one-sided provider surface as an `undefined`
 * adapter mid-run.
 */
assertProviderJoin(
	PROVIDERS.map((meta) => meta.id),
	Object.keys(adapters),
);

export const providers: ProviderConfig[] = PROVIDERS.map((meta) => {
	const adapter = adapters[meta.id];
	return {
		...adapter,
		name: meta.id,
		// The adapter may refine the required credentials at runtime (daytona's per-region key var);
		// otherwise the schema ProviderMeta's static list stands.
		requiredEnvVars: adapter.requiredEnvVars ?? meta.requiredEnvVars,
		// Transport capability is schema-owned (a static fact of the @computesdk/* integration), so it
		// rides the same id-keyed join — the harness reads it to pick sync vs detached per step.
		transport: meta.transport,
	};
});
