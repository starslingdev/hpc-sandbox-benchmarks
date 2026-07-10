# @sandbox-benchmarks/provider-e2b

**Role:** the E2B provider adapter — boots the pre-baked toolchain template on e2b.dev, deps
isolated to this package.

**Public surface (`.`):** `e2bAdapter` (the `ProviderAdapter` the aggregator binds to the schema's
`e2b` id), plus the template names (`e2bTemplate`, `e2bTemplateVersion`, `e2bTemplateCandidate`)
the bake pipeline composes into its candidate refs.

**Env vars:** `E2B_API_KEY` (read by the `@computesdk/e2b` factory; missing → the harness skips the
provider). `E2B_TEMPLATE` optionally overrides the booted template — CI points it at the candidate
while iterating on the toolchain image.

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract + env gate + the shared
toolchain artifact identity the template names derive from), `@computesdk/e2b` (the vendor
wrapper).

**What lives here:** pure create-time policy. The template carries the cpu/memory pins (its
`e2b.toml`) and the toolchain, so the adapter is just "boot this template" — the template itself is
built by the bake pipeline from `packages/templates`.
