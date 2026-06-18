// Public surface of @sandbox-benchmarks/providers.
// Depends on @sandbox-benchmarks/schema (provider identity) and computesdk + the @computesdk/*
// wrappers (the unified provider runtime). Each provider is wired via its @computesdk/* factory;
// `providers` is the schema identity joined with those adapters.
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { adapters } from "./lib/adapters.ts";
import type { ProviderConfig } from "./lib/types.ts";

export { DAYTONA_SNAPSHOT_DEFAULT, TOOLCHAIN_IMAGE, TOOLCHAIN_VERSION } from "./lib/toolchain.ts";
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
export const providers: ProviderConfig[] = PROVIDERS.map((meta) => ({
	...adapters[meta.id],
	name: meta.id,
	requiredEnvVars: meta.requiredEnvVars,
}));
