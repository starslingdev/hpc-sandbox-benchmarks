# High-Performance Sandbox Benchmarks

Compare top sandbox providers on the same pinned machine shape for real developer and CI/CD workloads.

**Same target everywhere:** 4 vCPU · 8 GiB RAM · 40 GB disk. One headline metric per dimension, ranked with honest statistics.

## Why real-world workflows?

Synthetic scores tell you what the hardware can do. We measure what developers actually
experience — clone a repo, install dependencies, lint, build, test, etc.

A sandbox provider can top a creation time or CPU performance chart and still lose badly on:
- dependency installation is thousands of small, random file writes, and a network-attached
or bandwidth-capped disk turns that into the longest step of your run.
- cloning a repo has the opposite profile: mostly sequential writes, bounded by network.
- single-threaded developer tools are limited by single-thread CPU not threads

## Start here

| | |
| --- | --- |
| **[Leaderboard](./LEADERBOARD.md)** | Provider rankings from the latest published run |
| **[Methodology](./docs/methodology.md)** | How a measurement is produced |
| **[Docs hub](./docs/README.md)** | ADRs, CI secrets, security, contributing |

Live provider benches and toolchain releases are **maintainer-only** (GitHub Environment `privileged`). Pull requests never receive provider secrets — see [CI & secrets](./docs/ci-secrets.md).

---

## The repository

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
  templates/    per-provider template builders + toolchain Docker images (images/)
  harness/      benchmark timing → providers + schema
  results/      normalization → schema only (no provider SDKs)
apps/
  cli/          entrypoint with bin commands → all five packages
tooling/        dev-only            — scope @repo/*
  tsconfig/     shared source-first TS configs (config-only)
  test-utils/   provider conformance suite factory
  repo-checks/  boundary + package-meta invariant tests
lib/        in-sandbox benchmark runner (bench.sh) + vendored PTS profiles
data/       committed benchmark dataset (published run results)
scripts/    maintainer scripts (dataset backfill, leaderboard update)
docs/       methodology, ADRs, CI & secrets
```

## Dependency DAG (enforced)

| Member                      | Internal deps (`workspace:*`)                   | External (catalog)                  |
|-----------------------------|-------------------------------------------------|-------------------------------------|
| `@sandbox-benchmarks/schema`     | —                                               | `arktype`                           |
| `@sandbox-benchmarks/providers`  | schema                                          | `arktype`, computesdk packages (`catalog:computesdk`) |
| `@sandbox-benchmarks/templates`  | providers, schema                               | `computesdk` (`catalog:computesdk`) |
| `@sandbox-benchmarks/harness`    | providers, schema                               | —                                   |
| `@sandbox-benchmarks/results`    | schema                                          | `arktype`, XML tooling (`catalog:xml`) |
| `@sandbox-benchmarks/cli` (app)  | schema, providers, templates, harness, results  | `dotenv`, `@actions/core`, provider SDKs (`catalog:computesdk`) |
| `@repo/tsconfig`            | —                                               | —                                   |
| `@repo/test-utils`          | schema                                          | —                                   |
| `@repo/repo-checks`         | —                                               | —                                   |

`results` deliberately depends on `schema` alone among workspace packages — it must normalize
without any provider SDK, and
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
| `bun run lint:shell` | `shellcheck` on the repo's shell scripts (toolchain images, `lib/`, mise tasks). |
| `bun run lint:docker`| `hadolint` on the toolchain-image Dockerfiles (`packages/templates/images`). |
| `bun run smoke`      | Boot each provider's sandbox from the baked image and smoke-test it (providers without credentials are skipped). |
| `bun run check:catalog-drift` | Fails if the generated PTS catalog drifted from the vendored profiles. |

Run a single bin during development: `bun apps/cli/src/bin/plan-matrix.ts`.

## Toolchain (mise)

Non-Bun tools are version-pinned in [`mise.toml`](mise.toml) and managed with
[mise](https://mise.jdx.dev): [`typos`](https://github.com/crate-ci/typos) (spell check),
`shellcheck` + `hadolint` (shell/Dockerfile lint for the toolchain images), and
`actionlint` + `zizmor` (workflow lint + security audit, run by the `ci-lint` workflow). After
cloning, run `mise install` (and `mise trust` once) so the pinned binaries are available; the
`bun run` wrappers invoke these tools through `mise exec`, so they always use the pinned versions.
mise fetches from official release sources with checksum verification — no npm republisher and no
install-time postinstall.

## Continuous integration

`.github/workflows/ci.yml` runs the command contract on every pull request and every push to
`main`: `bun install --frozen-lockfile --ignore-scripts` → `bun run lint` (the Biome gate) →
`bun run lint:shell` → `bun run lint:docker` → `bun run typecheck` → `bun run test` →
`bun run check:catalog-drift` → `bun run spell` (typos, set up via [mise](https://mise.jdx.dev)).
A separate `ci-lint.yml` lints the workflows themselves (actionlint + zizmor). The same checks run
locally, so green-on-your-machine means green-in-CI.

CI runs on a maintainer-controlled runner, so it never executes fork-PR code — the gate runs only
for pushes and same-repo pull requests. Anything that needs provider credentials additionally runs
only from `main`, behind Environment [`privileged`](./docs/ci-secrets.md); pull requests never
receive provider secrets.

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

## Community

- [Contributing](./CONTRIBUTING.md) — local gate; how to add a provider, suite, or metric
- [Security](./SECURITY.md) — vulnerability reporting; never paste secrets into issues or PRs
