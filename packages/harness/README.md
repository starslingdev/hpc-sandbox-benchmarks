# @sandbox-benchmarks/harness

**Role:** the benchmark harness — drives a provider adapter through operations and emits raw,
un-normalized timing runs.

**Public surface (`.`):** `timeOperation()`.

**Depends on:** `@sandbox-benchmarks/providers` (adapter type), `@sandbox-benchmarks/schema` (`RawRun`).

**What lives here:** operation timing and suite orchestration. Suite steps run through `StepRunner`,
which exposes two transports — a direct synchronous exec (`run`) and a durable detached+poll exec
(`runDetached`) — and a capability-driven selector (`step`). `step` reads the provider's declared
`ProviderTransport` (`selectTransport`) and detaches a step only when it could outlast the provider's
synchronous cap and the provider supports detached+poll, so a single-round-trip-capped provider
(Daytona's HTTP 408) keeps its detached path while an uncapped one runs the same step directly. The
clock and other timing internals live in `src/lib/` and are never imported across a package boundary.
