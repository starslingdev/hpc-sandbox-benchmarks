# @sandbox-benchmarks/harness

**Role:** the benchmark harness — drives a provider adapter through operations and emits raw,
un-normalized timing runs.

**Public surface (`.`):** `timeOperation()`; the suite runner (`runSuite()`, `runSuiteOnSandbox()`,
`withSandbox()`); the credential helpers (`missingCreds()`, `hasRequiredCreds()`, `requiredProviders()`,
`unmetRequirements()`); and the lifecycle/control-plane measurement (`benchmarkLifecycle()`,
`measureLifecycle()`, `aggregateLifecycle()`).

**Depends on:** `@sandbox-benchmarks/providers` (adapter type), `@sandbox-benchmarks/schema` (`RawRun`,
the harness Metric ids).

**What lives here:** operation timing, suite orchestration, and the lifecycle & control-plane
measurement PTS cannot see. The lifecycle driver (`src/lib/lifecycle.ts`) times each provider SDK call —
`spawn → exec → snapshot → teardown` plus the control-plane reads (`getInfo`, `list`) — and labels every
timing with the matching `HARNESS_METRIC_IDS` id from the schema, so a `RawRun.operation` is a
catalogued Metric id by construction. Spawn must succeed (nothing to tear down otherwise); every other
per-op failure is recorded as a skip; teardown always runs. The clock and other timing internals live in
`src/lib/` and are never imported across a package boundary.
