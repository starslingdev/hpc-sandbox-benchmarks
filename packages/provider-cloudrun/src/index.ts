// Public surface of @sandbox-benchmarks/provider-cloudrun.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `cloudRunAdapter` and binds it to the schema's `cloudrun` id.
export { cloudRunAdapter, cloudRunConfig } from "./lib/adapter.ts";
