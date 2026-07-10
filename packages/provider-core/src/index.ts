// Public surface of @sandbox-benchmarks/provider-core.
// The shared vocabulary every provider package and the aggregator speak: the adapter contract
// (what a provider package exports), the env-contract reader (how a provider package takes
// credentials from the environment), and the toolchain artifact identity (image refs + the
// version-scoped artifact/candidate naming every baked artifact shares). Deliberately free of any
// vendor SDK — those live in the per-provider packages; this core depends only on the schema and
// the computesdk types.
export { readProviderEnv } from "./lib/env.ts";
export {
	CANDIDATE_SUFFIX,
	toolchainArtifactName,
	toolchainImage,
	toolchainImageCandidate,
	toolchainImageVersion,
} from "./lib/toolchain.ts";
export type {
	DirectProvider,
	ProviderAdapter,
	ProviderConfig,
	ProviderSnapshots,
} from "./lib/types.ts";
