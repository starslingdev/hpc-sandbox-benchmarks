// Public surface of @sandbox-benchmarks/providers.
// Depends on @sandbox-benchmarks/schema (provider identity) and computesdk + the @computesdk/*
// wrappers (the unified provider runtime). Each provider is wired via its @computesdk/* factory;
// `providers` is the schema identity joined with those adapters.
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { adapters } from "./lib/adapters.ts";
import type { ProviderConfig } from "./lib/types.ts";

// The runtime configuration gatekeeper — the single validated config object consumers import.
export { config } from "./lib/config.ts";
export type { DirectProvider, ProviderAdapter, ProviderConfig } from "./lib/types.ts";

/**
 * All provider benchmark configurations: each schema provider's identity joined with its harness
 * adapter, in schema declaration order.
 *
 * No runtime reconciliation is needed because both sides are keyed by the same `ProviderId`:
 * `PROVIDERS` is derived from the schema's `Record<ProviderId, …>` registry and `adapters` is a
 * `Record<ProviderId, ProviderAdapter>`, so every `meta.id` indexes exactly one adapter and the two
 * registries are provably the same set at compile time.
 */
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
