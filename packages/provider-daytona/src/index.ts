// Public surface of @sandbox-benchmarks/provider-daytona.
// One provider, its deps isolated: the aggregator (@sandbox-benchmarks/providers) imports
// `daytonaAdapter` and binds it to the schema's `daytona` id. The config slice and snapshot names
// are exported for the bake pipeline (build/validate/promote in apps/cli), which composes them
// into its candidate refs and snapshot builds.
export { daytonaAdapter } from "./lib/adapter.ts";
export type { DaytonaConfig } from "./lib/config.ts";
export { daytonaConfig, daytonaSnapshotCandidate, daytonaSnapshotDefault } from "./lib/config.ts";
