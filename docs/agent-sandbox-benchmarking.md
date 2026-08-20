# Benchmarking the sandbox you are running in

How an AI coding agent (Claude Code on the web, Cursor Cloud Agent, ChatGPT Codex, …) benchmarks
**its own VM** and publishes the result as a provider row.

Every other provider in the matrix is measured remotely: the CLI creates a sandbox through a vendor
SDK, runs the suites inside it, and pulls `benchmark-results/` back out. An agent sandbox has no such
API, so it runs the same mise tasks locally and splices the results in afterwards — **host ingest**.
The measurements are identical; only the transport differs.

Budget ~3–4 h wall clock and ~30 GB of disk for a full 9-suite run.

---

## 0. Preconditions

```bash
cd <repo>                      # the repo root; every command below is relative to it
git checkout -b <your-branch>
```

You need root (or `sudo`), ~30 GB free, and outbound HTTPS. Check disk first — it is the most common
hard stop:

```bash
df -h .                        # need ~30 GB Avail for the realworld suites
```

---

## 1. Bootstrap the toolchain

Agent images ship none of this. Install in this order; each step is idempotent.

```bash
# mise + bun, symlinked so they resolve on a bare PATH
curl -fsSL https://mise.run | MISE_VERSION=v2026.7.11 sh
curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14"
ln -sf /root/.local/bin/mise /usr/local/bin/mise
ln -sf /root/.bun/bin/bun /usr/local/bin/bun && ln -sf /root/.bun/bin/bunx /usr/local/bin/bunx
export PATH=/usr/local/bin:$PATH

mise trust && mise install     # MUST succeed before any `mise run` — see below
bun install --ignore-scripts   # --ignore-scripts: `prepare` runs lefthook, which fails on agent hosts

# node + pnpm at the matrix's own pins (realworld suites only; must match setup.ts)
mise use --global --yes node@22.23.1
npm install --global --prefix "$HOME/.local" pnpm@10.34.5
export PATH="$HOME/.local/bin:$PATH"

# Phoronix Test Suite 10.8.4 + build deps (~5 min)
SUDO=sudo bash -c 'source lib/bench.sh && ensure_pts'
phoronix-test-suite version    # expect: Phoronix Test Suite v10.8.4
```

> **`mise install` is not optional.** `mise run` auto-installs the pinned tools *before* the task and
> **aborts the whole task** if any download fails — you get a tool-download error where you expected
> a benchmark. A flaky `typos` fetch is the usual culprit; just retry `mise install typos@1.47.2`.

Verify the pins resolve *inside* a task (a bare `node -v` may show a different, image-provided Node —
that is fine, `mise run` activates its own):

```bash
mise exec -- node -v           # v22.23.1
pnpm -v                        # 10.34.5
```

---

## 2. Capture the host's specs

The harness normally writes this in-sandbox before a suite runs. On a host ingest nothing creates
it, so run the harness's **own** script — never hand-write the values, or the row asserts specs
nobody measured:

```bash
bun -e 'const m=await import("./packages/harness/src/lib/setup.ts");console.log(m.OBSERVED_SPECS_SCRIPT)' > /tmp/specs.sh
sed -i "s|cd \"\$HOME/sandbox-benchmarks\"|cd \"$PWD\"|" /tmp/specs.sh
bash /tmp/specs.sh             # writes + prints benchmark-results/observed-specs.json
```

`scripts/ingest-host-run.ts` refuses to run without this file.

---

## 3. Run the suites

Nine suites. Run them **serially** — concurrent suites contend for CPU and invalidate each other.

| Suite | Command (`mise run …`) | ~Time | Disk | Needs |
| --- | --- | --- | --- | --- |
| system | `benchmark:system:all` | 6 min | 5 GB | PTS |
| memory | `benchmark:memory:all` | 3 min | — | PTS |
| disk | `benchmark:disk:all` | 8 min | 4 GB | PTS, `stress-ng` |
| network | `benchmark:network:suite` | 10 min | — | PTS, egress |
| pgbench | `benchmark:pgbench:all` | 15 min | 5 GB | PTS (builds PostgreSQL) |
| cpu-node | `benchmark:cpu:node` | 10 min | — | PTS, GitHub archive egress |
| realworld-better-auth | `benchmark:realworld:pts:better-auth` | 20 min | 10 GB | node 22, pnpm |
| realworld-openclaw | `benchmark:realworld:pts:openclaw` | 35 min | 25 GB | node 22, pnpm |
| realworld-mastra | `benchmark:realworld:pts:mastra` | 35 min | 30 GB | node 22, pnpm |

Run the cheap ones first so a disk or toolchain problem surfaces early:

```bash
for t in system:all memory:all disk:all network:suite pgbench:all cpu:node; do
  echo "=== $t ==="
  mise run "benchmark:$t" 2>&1 | tee "/tmp/bench-$(echo "$t" | tr ':' '-').log"
done
```

The realworld suites need **no Docker** (only `benchmark:realworld:selftest` does). Each leaves a
multi-GB checkout behind, so free it between suites or the next one runs out of disk:

```bash
mise run benchmark:realworld:pts:better-auth
rm -rf /var/lib/phoronix-test-suite/installed-tests/local/realworld-better-auth-1.0.0
mise run benchmark:realworld:pts:openclaw
rm -rf /var/lib/phoronix-test-suite/installed-tests/local/realworld-openclaw-1.0.0
mise run benchmark:realworld:pts:mastra
```

### Verify what actually ran

**A green task exit does not prove the benchmark ran.** Every PTS leaf skips gracefully when its tool
is missing. Check the artifacts, not the exit code:

```bash
ls benchmark-results/*.xml            | wc -l   # successes
ls benchmark-results/*--skipped.json  2>/dev/null # tool missing → suite gap
ls benchmark-results/*--failed.json   2>/dev/null # ran but produced no numbers → suite gap
```

A `.xml` whose `<Value>` is empty is a failed task, not a zero.

---

## 4. Register the provider (first run only)

Provider ids are a closed union, and several `switch`es over it are exhaustive. Add the id, then let
`bun run typecheck` enumerate every remaining site — it fails until all are handled:

1. `packages/schema/src/identifiers.ts` — add to `providerIdSchema`.
2. `packages/schema/src/providers.ts` — `REGISTRY` entry: `displayName`, `website`,
   `sdkPackage: "none"`, `requiredEnvVars: ["<PROVIDER>_BENCH"]`, `isolation`, `pricing`
   (`model: "unavailable"`, `reason: "self_hosted"` — agent compute is bundled into a subscription,
   with no comparable per-vCPU rate), `maturity`, `specPinning: "fixed"`, `transport`.
3. `packages/providers/src/lib/adapters.ts` — a stub whose `create` **throws**. Host ingest must
   never look like a working remote adapter.
4. `apps/cli/src/lib/bake/validate.ts` (×2), `apps/cli/src/bin/bake.ts`,
   `apps/cli/src/bin/release-plan.ts` (×2), `apps/cli/src/lib/bake/promote.ts` — "nothing to
   bake/promote" branches.
5. `.github/workflows/bench-suite.yml` (`<PROVIDER>_BENCH` env gate) and `bench-smoke.yml` (provider list).
6. Tests carrying the provider roster: `packages/schema/src/providers.test.ts`,
   `apps/cli/src/bin/release-plan.test.ts`, `apps/cli/src/lib/bake/validate.test.ts`,
   `apps/cli/src/lib/providers-run.test.ts`.

---

## 5. Ingest, render, verify

```bash
bun scripts/ingest-host-run.ts --provider <providerId>
```

It routes the flat `benchmark-results/` into `data/raw/<runId>/<providerId>/<suite>/`, normalizes,
asserts the row is `validated`, splices it into the newest published run, and writes a new run +
index entry. Defaults: base = newest indexed run, id = `<UTC-date>0001`. Override with `--base` /
`--run-id` to re-ingest in place.

Then regenerate the board and satisfy the formatter:

```bash
bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<runId>.json LEADERBOARD.md
bunx biome format --write data/dataset/runs/<runId>.json data/dataset/index.json
```

`leaderboard.ts` also re-renders `docs/figures/*.webp` via `Bun.WebView` — needs Bun ≥ 1.3.14 and a
Chrome that will start. As root, Chrome refuses without `--no-sandbox`:

```bash
printf '#!/usr/bin/env bash\nexec /opt/pw-browsers/chromium-*/chrome-linux/chrome --no-sandbox "$@"\n' > /tmp/chrome-shim
chmod +x /tmp/chrome-shim && export BUN_CHROME_PATH=/tmp/chrome-shim
```

If your run adds no data to a realworld suite, `git checkout -- docs/figures/` after rendering:
those rasters are authored by CI's pinned Chrome, and an unpinned browser's bytes are noise.

Finally the gates — all must pass before you commit:

```bash
bun run lint && bun run typecheck && bun run test && bun run spell && bun run check:catalog-drift
```

---

## 6. Debugging

| Symptom | Cause | Fix |
| --- | --- | --- |
| `mise run` dies on a tool download | auto-install runs before the task | `mise install` (retry the failing tool), then re-run |
| `Executable not found in $PATH: "bunx"` | `bunx` not symlinked | symlink it into `/usr/local/bin` |
| Every PTS leaf writes `--skipped.json` | PTS absent | re-run `ensure_pts`; check `phoronix-test-suite version` |
| `Checksum Failed` on a profile download | egress policy served an error body, which then failed the SHA256 | check the URL by hand; if the **host** is blocked, record the gap — do not fetch the pinned artifact from an unpinned mirror |
| `ECONNREFUSED 127.0.0.1:<port>` inside a package postinstall | container restarted; the agent proxy came back on a **new** port while the running task kept the old `HTTPS_PROXY` | re-read the port from the env and relaunch the suite |
| `node … does not satisfy this profile's required >= 22` | image Node on PATH ahead of mise's | `mise use --global node@22.23.1`; confirm with `mise exec -- node -v` |
| `Chrome process closed the pipe` | running as root without `--no-sandbox` | use the shim above |
| `TypeError: undefined is not a constructor … Bun.WebView` | Bun < 1.3.14 | install the pinned Bun |
| `no space left on device` | realworld checkouts | delete the previous suite's `installed-tests/local/<profile>` dir |
| Suite exits 0 but no `.xml` | leaf skipped or every trial failed | read `--skipped.json` / `--failed.json` for the recorded reason |

### Known environment limits

These are policy, not flakes — re-running does not help. Record them as gaps.

- **GitHub source archives.** Some agent sandboxes allow third-party *release assets* (HTTP 200) but
  return **403** for `/archive/` and `codeload` URLs. `pts/node-web-tooling` downloads a GitHub
  archive, so the whole `cpu-node` suite is unavailable where that applies.
- **Non-443 outbound TCP.** Where egress is HTTPS-only, `benchmark:network:pts:iperf-wan` cannot
  reach any public iperf3 server. Loopback iperf still works — it needs no egress.
- **Live third-party APIs.** `realworld-mastra`'s `test_core` calls AI APIs and fails without
  credentials (`AI_APICallError`).

---

## 7. Honesty rules

The dataset's value is that a number means what it claims. Non-negotiable:

- **A gap is a result.** A suite that could not run belongs in `gaps` with its real reason. Never
  substitute an estimate, a re-used number from another host, or a zero.
- **Never weaken a workload to make it pass** — no skipped tasks, no relaxed profiles, no swapping a
  pinned artifact for a different build. A benchmark that measures something else is worse than a gap.
- **Every spec field is measured**, via the script in §2. Do not hand-write CPU models or sizes; if
  the hypervisor masks the SKU, publish the masked string.
- **Say what you did not cover.** The leaderboard prints a coverage table; make sure it is true.
