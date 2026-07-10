# @sandbox-benchmarks/provider-novita

**Role:** the Novita provider adapter — Novita's E2B-protocol-compatible control plane driven
through the `@computesdk/e2b` wrapper, deps isolated to this package.

**Public surface (`.`):** `novitaAdapter` (the `ProviderAdapter` the aggregator binds to the
schema's `novita` id), plus `novitaCompute` / `NOVITA_E2B_DOMAIN` for tests and direct use.

**Env vars:** `NOVITA_API_KEY` (an `nvta_…` key), read via provider-core's validated env gate.
Missing → the harness skips the provider; the factory only throws if invoked without it.

**Depends on:** `@sandbox-benchmarks/provider-core` (adapter contract + env gate),
`@computesdk/e2b` (the wrapper it re-points), `e2b` (the raw SDK — the wrapper's `E2BSandbox`
re-export exists only in its type declarations), `computesdk` (option types).

**What lives here:** Novita has no `@computesdk/*` wrapper of its own, but its control plane speaks
the E2B protocol (`E2B_DOMAIN=sandbox.novita.ai`). `lib/novita.ts` reuses the whole e2b wrapper and
swaps exactly the three config-taking connection methods — the stock wrapper's `create()` rejects
non-`e2b_` keys, and its `destroy()`/`getById()` reconnect without a domain — for domain-aware,
guard-free equivalents. Everything the harness touches after create (runCommand, filesystem,
getInfo) rides the live sandbox instance unchanged.
