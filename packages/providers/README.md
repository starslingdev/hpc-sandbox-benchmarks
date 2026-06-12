# @sandbox-benchmarks/providers

**Role:** provider adapters — the bridge between a sandbox SDK and the benchmark harness.

**Public surface (`.`):** `ProviderAdapter`, `createStubAdapter()`, `providerRuntimeReady`.

**Depends on:** `@sandbox-benchmarks/schema` (descriptor/capability types), `computesdk`
(`catalog:computesdk`, the unified provider runtime).

**What lives here:** the adapter interface and per-provider adapters (stubs this pass). Private
glue — including the computesdk wiring — lives in `src/lib/` and is never imported across a
package boundary.
