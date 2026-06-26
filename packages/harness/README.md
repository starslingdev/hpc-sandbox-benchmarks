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
measurement PTS cannot see. Suite steps run through `StepRunner`, which exposes two transports — a
direct synchronous exec (`run`) and a durable detached+poll exec (`runDetached`) — and a
capability-driven selector (`step`). `step` reads the provider's declared `ProviderTransport`
(`selectTransport`) and detaches a step only when it could outlast the provider's synchronous cap and
the provider supports detached+poll, so a single-round-trip-capped provider (Daytona's HTTP 408) keeps
its detached path while an uncapped one runs the same step directly. The lifecycle driver
(`src/lib/lifecycle.ts`) times each provider SDK call — `spawn → exec → snapshot → teardown` plus the
control-plane reads (`getInfo`, `list`) — and labels every timing with the matching `HARNESS_METRIC_IDS`
id from the schema, so a `RawRun.operation` is a catalogued Metric id by construction. Spawn must
succeed (nothing to tear down otherwise); every other per-op failure is recorded as a skip; teardown
always runs. The clock and other timing internals live in `src/lib/` and are never imported across a
package boundary.
