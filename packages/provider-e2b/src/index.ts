// Public surface of @sandbox-benchmarks/provider-e2b.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `e2bAdapter` and binds it to the schema's `e2b` id. The template names are exported for the bake
// pipeline (build/validate/promote in apps/cli), which composes them into its candidate refs.
export { e2bAdapter } from "./lib/adapter.ts";
export { e2bTemplate, e2bTemplateCandidate, e2bTemplateVersion } from "./lib/config.ts";
