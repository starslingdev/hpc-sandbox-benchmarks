// Public surface of @sandbox-benchmarks/provider-novita.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `novitaAdapter` and binds it to the schema's `novita` id; nothing else in the workspace needs the
// e2b SDKs this package wraps. `novitaCompute`/`NOVITA_E2B_DOMAIN` stay exported for tests and for
// anyone driving Novita outside the harness join.
export { novitaAdapter } from "./lib/adapter.ts";
export { NOVITA_E2B_DOMAIN, novitaCompute } from "./lib/novita.ts";
