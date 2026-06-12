# @sandbox-benchmarks/harness

**Role:** the benchmark harness — drives a provider adapter through operations and emits raw,
un-normalized timing runs.

**Public surface (`.`):** `timeOperation()`.

**Depends on:** `@sandbox-benchmarks/providers` (adapter type), `@sandbox-benchmarks/schema` (`RawRun`).

**What lives here:** operation timing and (later) suite orchestration. The clock and other timing
internals live in `src/lib/` and are never imported across a package boundary.
