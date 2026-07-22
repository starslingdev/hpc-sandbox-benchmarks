# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Bun workspace monorepo** (source-first, no build step) whose product is a
CLI (`@sandbox-benchmarks/cli`) that plans, runs, normalizes, and renders sandbox-provider
benchmarks. There is no server or web UI — everything is exercised through Bun and the CLI bins.

### Toolchain (already provisioned in the VM snapshot)
- `bun` 1.3.14 and `mise` are pre-installed and symlinked into `/usr/local/bin`, so they resolve
  on a bare `PATH`. The startup update script runs `mise install` + `bun install --ignore-scripts`,
  then installs **Phoronix Test Suite** if `phoronix-test-suite` is missing.
- Non-Bun tools (`typos`, `shellcheck`, `hadolint`, `actionlint`, `zizmor`) are pinned in
  `mise.toml` and invoked via `mise exec` — never install them ad hoc.

### Phoronix Test Suite (PTS)
The `.mise/tasks/benchmark/**` leaves call `phoronix-test-suite` (via `lib/bench.sh`). In provider
sandboxes PTS is baked into the toolchain image (`packages/templates/images/base/scripts/20-pts.sh`);
on this host VM it is installed from the same pin as `packages/templates/src/lib/pins.ts`
(`ptsVersion` 10.8.4 + `ptsDebSha256`).

- Verify: `phoronix-test-suite version` (expect `Phoronix Test Suite v10.8.4`).
- Host configure helper: `source lib/bench.sh && ensure_pts` (batch mode; returns 1 only if PTS
  cannot be made available — leaves then skip rather than fail).
- Cheap end-to-end mise leaf on the host (no provider keys):  
  `mise run benchmark:disk:pts:hardlink` — needs `stress-ng` (`apt-get install -y stress-ng`).
  Writes under `benchmark-results/` (local output; do not commit).
- Full OpenBenchmarking profiles (c-ray, fio, zstd, …) download/build on first use and are heavy;
  prefer the hardlink leaf or the Docker `benchmark:realworld:selftest` when validating PTS wiring.
- `benchmark:realworld:selftest` requires Docker (not installed in this Cloud VM by default).

### Running checks / the app
The command contract lives in the root `package.json` and `README.md`; run those scripts directly:
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
- Live provider benches (E2B/Daytona/Modal/Blaxel/Novita) need per-provider API keys from `.env`
  (see `.env.example`). Without keys a provider is recorded as a **skip, not a failure**, so lint /
  typecheck / test / spell and the offline CLI bins (`plan-matrix`, `leaderboard` over the committed
  `data/dataset` runs) all work with no credentials.
- Mise PTS leaves that lack `phoronix-test-suite` (or a leaf-specific tool like `stress-ng` /
  `nc`) call `skip_result` and exit 0 — a green task exit does **not** prove the benchmark ran.
  Check for `benchmark-results/<prefix>.xml` (success) vs `benchmark-results/<prefix>--skipped.json`.
