# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **Bun workspace monorepo** (source-first, no build step) whose product is a
CLI (`@sandbox-benchmarks/cli`) that plans, runs, normalizes, and renders sandbox-provider
benchmarks. There is no server or web UI — everything is exercised through Bun and the CLI bins.

### Toolchain (provisioned by the startup update script)
- The startup update script is self-healing: it installs `mise` (2026.7.11) and `bun` (1.3.14) if
 they are missing, symlinks `mise`, `bun`, and **`bunx`** into `/usr/local/bin` (so they resolve on a
 bare `PATH`), then runs `mise install` (pinned non-Bun tools) + `bun install --ignore-scripts`. The
 `bunx` symlink is load-bearing: `bun run check:catalog-drift` spawns `bunx biome`, so a missing
 `bunx` on `PATH` fails that gate with `Executable not found in $PATH: "bunx"`.
- Non-Bun tools (`typos`, `shellcheck`, `hadolint`, `actionlint`, `zizmor`) are pinned in
 `mise.toml` and invoked via `mise exec` — never install them ad hoc.
- **Phoronix Test Suite (PTS) is NOT installed by the update script** (it is heavy and network-bound,
 and every benchmark leaf skips gracefully without it — see below). Install it on demand.

### Phoronix Test Suite (PTS)
The `.mise/tasks/benchmark/**` leaves call `phoronix-test-suite` (via `lib/bench.sh`). In provider
sandboxes PTS is baked into the toolchain image (`packages/templates/images/base/scripts/20-pts.sh`);
on this host VM install it on demand (the update script does not).

- Install + configure on the host (idempotent, needs sudo):
 `cd /workspace && SUDO=sudo bash -c 'source lib/bench.sh && ensure_pts'`. `ensure_pts` apt-installs
 PTS (pin 10.8.4, matching `packages/templates/src/lib/pins.ts`) plus its build deps and `stress-ng`,
 then puts PTS in batch mode. It returns 1 (never aborts) if PTS can't be made available — leaves
 then skip rather than fail.
- Verify: `phoronix-test-suite version` (expect `Phoronix Test Suite v10.8.4`).
- Cheap end-to-end mise leaf on the host (no provider keys):  
  `mise run benchmark:disk:pts:hardlink` — needs `stress-ng` (`apt-get install -y stress-ng`).
  Writes under `benchmark-results/` (local output; do not commit).
- Full OpenBenchmarking profiles (c-ray, fio, zstd, …) download/build on first use and are heavy;
  prefer the hardlink leaf or the Docker `benchmark:realworld:selftest` when validating PTS wiring.
- `benchmark:realworld:selftest` requires Docker (not installed in this Cloud VM by default).

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
- Live provider benches (E2B/Daytona/Modal/Blaxel/Novita) need per-provider API keys from `.env`
  (see `.env.example`). Without keys a provider is recorded as a **skip, not a failure**, so lint /
  typecheck / test / spell and the offline CLI bins (`plan-matrix`, `leaderboard` over the committed
  `data/dataset` runs) all work with no credentials.
- Mise PTS leaves that lack `phoronix-test-suite` (or a leaf-specific tool like `stress-ng` /
  `nc`) call `skip_result` and exit 0 — a green task exit does **not** prove the benchmark ran.
  Check for `benchmark-results/<prefix>.xml` (success) vs `benchmark-results/<prefix>--skipped.json`.


### Cursor Cloud Agent host ingest
- Provider id `cursor-cloud-agent` is host-ingest only (Firecracker Cloud Agent VM). Opt in with
  `CURSOR_CLOUD_AGENT_BENCH=1`; the harness adapter refuses remote `create`.
- After running host suites (`mise run benchmark:system:all`, `benchmark:disk:all`,
  `benchmark:network:suite`, `benchmark:cpu:node`), stage + splice into the dataset with
  `bun scripts/ingest-cursor-cloud-agent.ts` (sets `observedSpecs.cpuModel` to
  `Intel(R) Xeon(R) Platinum 8559C` when PTS CPUID is Family 6 Model 207).
- Then refresh `LEADERBOARD.md` from the newest index run via
  `bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json LEADERBOARD.md`.

### Claude Cloud host ingest
- Provider id `claude-cloud` is host-ingest only (Firecracker Claude Code remote session VM). Opt in
  with `CLAUDE_CLOUD_BENCH=1`; the harness adapter refuses remote `create`.
- The session image ships neither `mise` nor PTS. Install `mise` (`curl -fsSL https://mise.run | sh`,
  symlink into `/usr/local/bin`) and run `mise trust` — then `mise install`, because **`mise run`
  auto-installs the pinned tools first and aborts the task if any of them fails to download**
  (a flaky `typos` fetch is what fails; retry `mise install typos@<pin>`). Then install PTS with
  `SUDO=sudo bash -c 'source lib/bench.sh && ensure_pts'`, same as the Cursor host.
- After running host suites (`mise run benchmark:system:all`, `benchmark:disk:all`,
  `benchmark:network:suite`, `benchmark:cpu:node`), stage + splice into the dataset with
  `bun scripts/ingest-claude-cloud.ts`. It routes the flat `benchmark-results/` into suites by
  producer prefix and hand-writes `observed-specs.json` (the file the harness would normally write);
  every value there is a measurement from the session VM, and the CPU SKU is deliberately left as the
  hypervisor's masked `/proc/cpuinfo` string rather than inferred from CPUID.
- Then refresh `LEADERBOARD.md` from the newest index run via
  `bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json LEADERBOARD.md`.
  The bin also re-renders `docs/figures/*.webp` through `Bun.WebView`, which needs Bun >= 1.3.14 and a
  Chrome that will start: this VM runs as root, where Chrome refuses to launch without `--no-sandbox`,
  so point `BUN_CHROME_PATH` at a wrapper that adds the flag. Those rasters are authored by CI's
  pinned Chrome — `git checkout -- docs/figures/` after the render so an unpinned browser's bytes do
  not land in the diff.
- The realworld suites need no Docker (that is only `benchmark:realworld:selftest`); they git-clone
  the upstream repos and run pnpm tasks, so they need the matrix's own pins on PATH — `mise use
  --global node@22.23.1` plus `npm install --global --prefix "$HOME/.local" pnpm@10.34.5`, matching
  `packages/harness/src/lib/setup.ts`. Each leaves a multi-GB checkout under the installed-profile
  dir; delete it between suites or the next one runs out of the session's disk allowance.
- If the container restarts mid-session the agent proxy comes back on a NEW port. Anything launched
  with the stale `HTTPS_PROXY` fails with `ECONNREFUSED 127.0.0.1:<old-port>` inside package
  postinstalls — re-read the port from the environment and relaunch rather than debugging the
  workload.
- Finally `bunx biome format --write data/dataset/runs/<id>.json` — the ingest writes
  `JSON.stringify(…, null, 2)`, which expands short arrays that biome collapses, so `bun run lint`
  fails without it.
