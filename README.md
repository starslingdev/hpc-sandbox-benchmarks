# sandbox-benchmarks

Compare top sandbox providers' performance for real developer and CI/CD tasks.

This repo is a **Bun workspace monorepo** with a strict, enforced dependency DAG and a uniform
package shape. The guiding rule: *"can I import this?"* is answered by the path alone, and
boundary violations fail CI.

## Source-first, no build step

Every package's `exports` map points at TypeScript **source** (`./src/index.ts`), and Bun resolves
workspace sources natively. There is no compile step: `bun install` → `typecheck` → `test` →
`lint` are all green with zero compilation. The committed `bun.lock` pins the whole graph.

## Layout

```text
packages/   importable libraries   — scope @sandbox-benchmarks/*
  schema/       shared types + arktype schemas (bottom of the DAG)
  providers/    provider adapters → schema + computesdk
  templates/    per-provider template builders (one export subpath each)
  harness/      benchmark timing → providers + schema
  results/      normalization → schema only (no provider SDKs)
apps/
  cli/          entrypoint with bin commands → all five packages
tooling/        dev-only            — scope @repo/*
  tsconfig/     shared source-first TS configs (config-only)
  test-utils/   provider conformance suite factory
  repo-checks/  boundary + package-meta invariant tests
```

## Dependency DAG (enforced)

| Member                      | Internal deps (`workspace:*`)                   | External (catalog)                  |
|-----------------------------|-------------------------------------------------|-------------------------------------|
| `@sandbox-benchmarks/schema`     | —                                               | `arktype`                           |
| `@sandbox-benchmarks/providers`  | schema                                          | `computesdk` (`catalog:computesdk`) |
| `@sandbox-benchmarks/templates`  | providers, schema                               | `computesdk` (`catalog:computesdk`) |
| `@sandbox-benchmarks/harness`    | providers, schema                               | —                                   |
| `@sandbox-benchmarks/results`    | schema                                          | —                                   |
| `@sandbox-benchmarks/cli` (app)  | schema, providers, templates, harness, results  | `dotenv`                            |
| `@repo/tsconfig`            | —                                               | —                                   |
| `@repo/test-utils`          | schema                                          | —                                   |
| `@repo/repo-checks`         | —                                               | —                                   |

`results` deliberately depends on `schema` only — it must normalize without any provider SDK, and
`@repo/repo-checks` enforces that no package reaches across boundaries or into another package's
private `lib/`.

## Command contract

| Command              | What it does                                                            |
|----------------------|-------------------------------------------------------------------------|
| `bun install`        | Resolve the graph, symlink workspaces, install catalogs (≥7-day-old releases). |
| `bun run typecheck`  | `tsc --noEmit` per member — proof of source-first/no-build.             |
| `bun run test`       | `bun test` per member, including the repo-checks invariants.            |
| `bun run lint`       | `biome check . --error-on-warnings` — CI gate; warnings fail (root-only Biome config). |
| `bun run format`     | `biome format . --write` — formatting only (no import sorting / lint fixes). |
| `bun run lint:fix`   | `biome check . --write` — formatting + import sorting + safe lint fixes. |
| `bun run lint:fix:unsafe` | `biome check . --fix --unsafe` — also applies behavior-changing fixes; review the diff. |

Run a single bin during development: `bun apps/cli/src/bin/plan-matrix.ts`.

## Supply-chain posture

`bunfig.toml` sets `minimumReleaseAge = 604800` (7 days) so freshly published — possibly
compromised — releases are not installed, and runs no third-party lifecycle scripts (empty
`trustedDependencies`). Lint and formatting are root-only via a single `biome.json`.
