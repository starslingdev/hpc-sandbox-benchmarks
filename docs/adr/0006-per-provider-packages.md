---
status: accepted
---

# Per-provider packages with a shared contract core

## Context

`@sandbox-benchmarks/providers` began as the whole provider layer: every adapter, every credential
slice, and every `@computesdk/*` wrapper (plus raw vendor SDKs, e.g. `e2b` for the Novita
compatibility shim) lived in one package. Anything that imported it — harness, templates, CLI —
transitively depended on all seven vendor SDKs at once, and each new provider grew that blast
radius. The upstream ecosystem this repo builds on (`@computesdk/e2b`, `@computesdk/vercel`, …)
already demonstrates the right shape: one package per provider, deps isolated.

## Decision

Split the provider layer into **one package per provider plus a contract core**, keeping the
aggregator as the only join point:

- `@sandbox-benchmarks/provider-core` — the shared vocabulary: the `ProviderAdapter` /
  `ProviderConfig` / `DirectProvider` contract types, the validated env-contract reader
  (`readProviderEnv`), and the toolchain-image identity + candidate↔version naming convention that
  several providers and the bake pipeline must agree on. Deliberately vendor-free.
- `@sandbox-benchmarks/provider-<id>` (e2b, daytona, modal, blaxel, vercel, cloudrun, novita) —
  each owns exactly one provider: its `@computesdk/*` wrapper (and any raw SDK), its env slice
  (`E2B_TEMPLATE`, `DAYTONA_*`, `CLOUD_RUN_*`, `NOVITA_API_KEY`, …), its create-time policy, and
  its artifact naming. Colocated tests specify each policy.
- `@sandbox-benchmarks/providers` — the pure aggregator: joins the schema `PROVIDERS` registry with
  the packages' adapters into the exhaustive `Record<ProviderId, ProviderAdapter>` and composes the
  bake pipeline's config surface. **Zero external runtime dependencies.**

The decoupling is enforced by `@repo/repo-checks` (`provider-boundaries.test.ts`), extending
ADR-0002's DAG gates: no provider package may depend on a sibling, every provider package must
speak the provider-core contract, the aggregator declares no external dep, and `@computesdk/*`
wrappers are declared nowhere else.

## Consequences

- A provider's dependency set is auditable from its own `package.json`; adding or upgrading one
  vendor SDK touches exactly one package, and the aggregator's compile-time exhaustiveness
  (`Record<ProviderId, …>` + `assertProviderJoin`) still forces every schema id to have an adapter.
- Consumers keep their import surface: the harness/CLI still import `providers` and `config` from
  `@sandbox-benchmarks/providers`; the composition means the bake pipeline needed no changes.
- Env reading is decentralized by design — each package reads its slice at module load through the
  same validated gate, so "which env vars does provider X need?" is answered inside that package
  (and mirrored by the schema's `requiredEnvVars`, which the workflow-registry-sync gate keeps
  wired into CI).
- More packages (eight where there was one) and a little more `package.json` ceremony per provider,
  accepted deliberately for the isolation guarantee — the same trade ADR-0002 made for the DAG.
