# @repo/test-utils

**Role:** dev-only shared test helpers — chiefly the provider **conformance suite factory**.

**Public surface (`.`):** `ConformanceAdapter`, `ConformanceSuite`,
`createProviderConformanceSuite(adapter, capabilities)`.

**Depends on:** `@sandbox-benchmarks/schema` (capability/descriptor types).

**What lives here:** a factory that builds a capability-scoped conformance suite from an adapter
plus its `CapabilityFlags`. Adding a provider later means implementing the adapter interface and
calling this factory — not writing bespoke per-provider tests. Private helpers live in `src/lib/`
and are never imported across a package boundary.
