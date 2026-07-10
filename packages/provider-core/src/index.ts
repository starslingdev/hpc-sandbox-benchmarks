// Public surface of @sandbox-benchmarks/provider-core.
// The shared vocabulary every provider package and the aggregator speak: the adapter contract
// (what a provider package exports) and the env-contract reader (how a provider package takes
// credentials from the environment). Deliberately free of any vendor SDK — those live in the
// per-provider packages; this core depends only on the schema and the computesdk types.
export { readProviderEnv } from "./lib/env.ts";
export type { DirectProvider, ProviderAdapter, ProviderConfig } from "./lib/types.ts";
