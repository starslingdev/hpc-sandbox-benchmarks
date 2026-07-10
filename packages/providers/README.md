# @sandbox-benchmarks/providers

**Role:** provider wiring — binds each schema provider to a computesdk runtime.

**Public surface (`.`):** `ProviderAdapter`, `ProviderConfig`, `DirectProvider` (re-exported from
`@sandbox-benchmarks/provider-core`, which owns the contract), the assembled `providers` registry,
and the toolchain image constants (`TOOLCHAIN_IMAGE`, `TOOLCHAIN_VERSION`,
`DAYTONA_SNAPSHOT_DEFAULT`).

**Depends on:** `@sandbox-benchmarks/schema` (provider identity / `PROVIDERS`),
`@sandbox-benchmarks/provider-core` (the adapter contract + env gate), `computesdk` and the
`@computesdk/{e2b,daytona,modal,blaxel,vercel,cloud-run}` wrappers (the unified provider runtime),
plus the raw vendor SDK each wrapper peers on (`e2b`, `@daytonaio/sdk`, `modal`, `@blaxel/core`,
`@vercel/sandbox`). Novita has no wrapper of its own: its control plane is E2B-protocol-compatible,
so `src/lib/novita.ts` re-points the `@computesdk/e2b` provider at `sandbox.novita.ai`.

**What lives here:** _not_ SDK wrappers. The `@computesdk/*` packages already adapt each raw vendor
SDK to computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem,
destroy). This package only holds what the framework can't infer: which factory builds each
provider, and the benchmark's create-time policy — the pinned `TARGET_SPEC` and toolchain image
(ADR-0003). The assembled `providers` registry joins the schema `PROVIDERS` metadata with the adapter
map by id; both are keyed by `ProviderId`, so a one-sided provider is a compile error rather than a
runtime check. Private glue lives in `src/lib/` and is never imported across a package boundary.

The join also carries each provider's schema-owned `transport` capability (`ProviderTransport`:
streaming, synchronous cap, detached+poll) onto the `ProviderConfig`, so the harness selects a
per-step exec transport from the declared capability instead of hardcoding one provider's quirks.
