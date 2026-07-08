---
status: accepted
---

# Enforced dependency DAG with a uniform package shape

## Context

This is a Bun workspace monorepo: `schema`, `providers`, `templates`, `harness`, `results`, the `cli`
app, and dev-only `@repo/*` tooling. Left unconstrained, monorepos rot into a tangle — `results`
reaching into a provider SDK, a package importing another's private `lib/`, a cycle between two
peers — and the rot is invisible until something breaks. We wanted "can I import this?" answerable
from the path alone, and the answer enforced rather than documented.

## Decision

A **strict, acyclic dependency DAG** with a uniform package shape, **enforced in CI** by
`@repo/repo-checks`, not just written down. `schema` sits at the bottom (only external dep: arktype,
ADR-0001); each member declares its internal `workspace:*` deps explicitly; and the layering is a
deliberate contract — e.g. `results` depends on `schema` **only**, so it can normalize without any
provider SDK. Every package's `exports` points at TypeScript **source** (`./src/index.ts`) with no
build step, and only a package's public entry is importable — its private `lib/` is off-limits across
boundaries. The boundary + package-meta invariants run as ordinary `bun test` checks.

## Consequences

- Boundary violations (a cross-package `lib/` reach, an undeclared dep, a cycle, a stray SDK import in
  `results`) fail CI as a red test, so the architecture can't silently erode.
- Source-first + no build means `bun install → typecheck → test → lint` are green with zero
  compilation, and the committed `bun.lock` pins the whole graph.
- New packages must adopt the uniform shape (public `src/index.ts`, declared deps, `@repo/tsconfig`)
  to pass the invariants — slightly more ceremony per package, bought deliberately for the guarantee.
- The DAG dictates where new code lives: a helper two packages need moves *down* toward `schema`
  rather than sideways, which is why pricing/economics derivation and the Metric Catalog live in
  `schema`.
