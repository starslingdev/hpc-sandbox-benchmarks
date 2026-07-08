# sandbox-benchmarks

Compare top sandbox providers' performance for real developer and CI/CD tasks.

> **Docs:** [Methodology](./docs/methodology.md) — how a measurement is produced (target spec,
> dimensions, economics, host-vs-effective specs, transport model, the dataset pipeline). ·
> [ADRs](./docs/adr/README.md) — the load-bearing architecture decisions and why. ·
> [Contributing](./CONTRIBUTING.md) — the local gate and how to add a provider, suite, or metric.

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
| `bun run spell`      | `typos` — source-code spell check (run it before pushing).              |
| `bun run spell:fix`  | `typos --write-changes` — apply typos' suggested corrections.            |

Run a single bin during development: `bun apps/cli/src/bin/plan-matrix.ts`.

## Toolchain (mise)

Non-Bun tools are version-pinned in [`mise.toml`](mise.toml) and managed with
[mise](https://mise.jdx.dev). Today that's [`typos`](https://github.com/crate-ci/typos), the
spell checker behind `bun run spell`. After cloning, run `mise install` (and `mise trust` once) so
the pinned binaries are available; `bun run spell` invokes typos through `mise exec`, so it always
uses the pinned version. mise fetches from official release sources with checksum verification — no
npm republisher and no install-time postinstall.

## Continuous integration

`.github/workflows/ci.yml` runs the command contract on every pull request and every push to
`main`: `bun install --frozen-lockfile --ignore-scripts` → `bun run lint` (the Biome gate) →
`bun run typecheck` → `bun run test` → `bun run spell` (typos, set up via
[mise](https://mise.jdx.dev)). The same checks run locally, so green-on-your-machine means
green-in-CI.

## Git hooks (pre-commit)

[Lefthook](https://lefthook.dev) runs a fast local mirror of CI on every commit, configured in
`lefthook.yml`:

- **Biome** on staged files (`biome check --write`, restaging any auto-fixes; unfixable issues or
  warnings block the commit).
- **Typos** repo-wide (`bun run spell`) — read-only, so run `bun run spell:fix` to apply corrections.
- **Lockfile** check (`bun install --frozen-lockfile`) when a manifest or `bun.lock` is staged, so
  `package.json` and `bun.lock` can't drift apart.

`bun install` wires the hooks automatically via the project's own `prepare` script
(`lefthook install`) — no third-party postinstall runs. Re-install them with `bunx lefthook
install`, and bypass a single commit with `LEFTHOOK=0 git commit`.

## Supply-chain posture

`bunfig.toml` sets `minimumReleaseAge = 604800` (7 days) so freshly published — possibly
compromised — releases are not installed, and **no third-party lifecycle scripts run** (empty
`trustedDependencies`). The git hooks above are wired by the project's own first-party `prepare`
script, not a dependency's postinstall, and CI installs with `--ignore-scripts` so it runs none
either. Lint and formatting are root-only via a single `biome.json`.
