# @sandbox-benchmarks/providers

**Role:** the aggregator — joins the schema's provider identities with the per-provider packages'
adapters. No vendor SDK is a dependency here (ADR-0006); each `@computesdk/*` wrapper lives in its
own `@sandbox-benchmarks/provider-<id>` package.

**Public surface (`.`):** `ProviderAdapter`, `ProviderConfig`, `DirectProvider` (re-exported from
`@sandbox-benchmarks/provider-core`, which owns the contract), the assembled `providers` registry,
and the composed `config` object (toolchain image refs, template/snapshot names, daytona account)
the bake pipeline consumes.

**Depends on:** `@sandbox-benchmarks/schema` (provider identity / `PROVIDERS`),
`@sandbox-benchmarks/provider-core` (the contract), and the seven
`@sandbox-benchmarks/provider-<id>` packages — nothing external.

**What lives here:** only the join. `lib/adapters.ts` binds each package's adapter into the
`Record<ProviderId, ProviderAdapter>` whose type forces exactly one adapter per schema provider (a
one-sided provider is a compile error), backed at runtime by `assertProviderJoin` for any path the
type-checker never saw. `lib/config.ts` composes the pieces the bake pipeline needs into one typed
object; the env reading itself happens inside provider-core and the provider packages, each owning
its slice. The `providers` array carries each provider's schema-owned `transport` capability
(`ProviderTransport`) onto its `ProviderConfig`, so the harness selects a per-step exec transport
from the declared capability instead of hardcoding one provider's quirks.
