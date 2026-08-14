# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Bun workspace monorepo** (source-first, no build step) whose product is a
CLI (`@sandbox-benchmarks/cli`) that plans, runs, normalizes, and renders sandbox-provider
benchmarks. There is no server or web UI — everything is exercised through Bun and the CLI bins.

### Toolchain (provisioned by the startup update script)
- The startup update script is self-healing: it installs `mise` (2026.7.11) and `bun` (1.3.14) if
  they are missing, symlinks `mise`, `bun`, and **`bunx`** into `/usr/local/bin` (so they resolve on a
  bare `PATH`), then runs `mise install` (pinned non-Bun tools) + `bun install --ignore-scripts`.
  It then runs `ensure_pts` (via `lib/bench.sh`) so **Phoronix Test Suite 10.8.4** and its apt deps
  (`stress-ng`, `nc`, `jq`, php, build toolchain, …) are present — idempotent and fast when already
  installed. The `bunx` symlink is load-bearing: `bun run check:catalog-drift` spawns `bunx biome`,
  so a missing `bunx` on `PATH` fails that gate with `Executable not found in $PATH: "bunx"`.
- Non-Bun tools (`typos`, `shellcheck`, `hadolint`, `actionlint`, `zizmor`) are pinned in
  `mise.toml` and invoked via `mise exec` — never install them ad hoc.

### Synthetic host suites (CPU / disk / network / memory / system)
Run these **on the cloud VM host** (no provider API keys). They write under `benchmark-results/`
(local output; do not commit).

| Suite | Entrypoint |
| --- | --- |
| CPU | `mise run benchmark:cpu:node` |
| Disk | `mise run benchmark:disk:all` |
| Network (iperf composition) | `mise run benchmark:network:suite` |
| Network (legacy fast-cli + loopback) | `mise run benchmark:network:all` |
| Memory | `mise run benchmark:memory:all` |
| System | `mise run benchmark:system:all` |

**Snapshot warm (once, when building/refreshing the cloud VM snapshot):** cold PTS profile
installs are slow (git ~450 MB download, fio/iperf/stream compiles). After mise/bun/PTS are
present, run the Bun-native warmer:

```sh
SUDO=sudo bun run warm:synthetic-pts
# equivalent: SUDO=sudo bun scripts/warm-synthetic-pts.ts
# inspect the inferred plan only: bun scripts/warm-synthetic-pts.ts --dry-plan
```

The warmer **plans** targets from `SUITES` synthetic host suites (`cpu-node`, `system`,
`memory`, `disk`, `network`) via leaf mining — no hard-coded profile list. It stages
local/vendored profiles and `seed_pts_download_cache` hints through `lib/bench.sh`, loads
`host-seed.json` beside profiles when leaves lack a seed (fio's Ubuntu-mirror tarball —
OpenBenchmarking's `brick.kernel.dk` is often down), and writes
`~/.cache/sandbox-benchmarks/synthetic-pts-warm.stamp`. Subsequent `mise run benchmark:…`
calls then skip download/compile and go straight to measurement. Re-run only if the stamp is
missing or a suite leaf starts writing `--skipped.json` / reinstalling profiles. Legacy
`benchmark:network:all` leaves (fast-cli, network-loopback) are **not** in the warm set;
they install on first manual run.

- Verify PTS: `phoronix-test-suite version` (expect `Phoronix Test Suite v10.8.4`).
- Verify warm: `phoronix-test-suite list-installed-tests` should list the planned synthetic
  profiles (see `--dry-plan`), including local `hardlink` / `iperf-wan` and vendored `iperf`.
- Cheap single-leaf smoke (no warm required beyond PTS + stress-ng):
  `mise run benchmark:disk:pts:hardlink`.
- Full OpenBenchmarking profiles outside the warm set still download/build on first use.
- `benchmark:realworld:selftest` requires Docker (not installed in this Cloud VM by default).
- Live provider benches need per-provider API keys from `.env` (see `.env.example`); without keys a
  provider is a **skip, not a failure**.

### Running checks / the app
The command contract lives in the root `package.json` and `docs/architecture.md`; run those scripts
directly:
- `bun run lint`, `bun run typecheck`, `bun run test`, `bun run spell`, `bun run check:catalog-drift`,
  `bun run lint:shell`, `bun run lint:docker`.
- Run a CLI bin directly, e.g. `bun apps/cli/src/bin/plan-matrix.ts --list-providers` or
  `bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json`. Bins are listed under
  `apps/cli/package.json` `bin`.

### Non-obvious gotchas
- Use `bun install --ignore-scripts`. The `prepare` script runs `lefthook install`, which **fails**
  in Cursor because `core.hooksPath` is set to a custom agent-hooks directory. `--ignore-scripts`
  skips it (this is exactly what CI does) and dependencies still resolve fully. Git pre-commit hooks
  are therefore not wired here — run the gate scripts manually before committing.
- Mise PTS leaves that lack `phoronix-test-suite` (or a leaf-specific tool like `stress-ng` /
  `nc`) call `skip_result` and exit 0 — a green task exit does **not** prove the benchmark ran.
  Check for `benchmark-results/<prefix>.xml` (success) vs `benchmark-results/<prefix>--skipped.json`.
- The network suite's wall time is dominated by real 10s iperf trials (localhost ×3 + WAN ×2), not
  setup, once profiles are warmed.
