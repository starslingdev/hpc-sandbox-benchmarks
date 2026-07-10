// Public surface of @sandbox-benchmarks/provider-vercel.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `vercelAdapter` and binds it to the schema's `vercel` id.
export { VERCEL_GB_PER_VCPU, vercelAdapter } from "./lib/adapter.ts";
