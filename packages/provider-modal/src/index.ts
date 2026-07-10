// Public surface of @sandbox-benchmarks/provider-modal.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `modalAdapter` and binds it to the schema's `modal` id.
export { modalAdapter } from "./lib/adapter.ts";
