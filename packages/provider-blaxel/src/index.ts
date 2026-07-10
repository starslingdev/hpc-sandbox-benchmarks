// Public surface of @sandbox-benchmarks/provider-blaxel.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `blaxelAdapter` and binds it to the schema's `blaxel` id.
export { blaxelAdapter } from "./lib/adapter.ts";
