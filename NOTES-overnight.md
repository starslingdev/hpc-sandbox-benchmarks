# Overnight autonomous run — decision log

Branch: `claude/sandbox-benchmarking-exploration-22na64`. One long branch, TDD-style,
one vertical slice per commit. Scope: all offline-unblocked tasks of the Sandbox
Benchmark Matrix & Leaderboard project. Live provider runs (ENG-63/64/65) are
code-wired + fixture-tested only — no real provider API calls.

Each entry records a design decision made under the ambiguity protocol (pick the most
defensible option, document, continue).

## Setup

- Merged the in-flight ENG-59 lifecycle stack (#62–#65, commits `fb6969d..e1b3ec6`)
  into this branch as the base (fast-forward; the stack was linear off `main`).
- `mise` install is blocked by org egress policy (403 on `mise.en.dev`). Installed the
  real `typos` checker via `cargo install typos-cli` (crates.io is allowlisted) so the
  spell gate runs for real. Green gate per slice: `bun run typecheck` + `bun run test`
  + `bun run lint` + `typos`.

## ENG-61 — Economics dimension wiring

- **What "economics" emits.** Two derived MetricDefs on the `economics` dimension:
  - `usd_per_hour` (headline) — the provider's hourly cost at the pinned target spec,
    i.e. `hourlyCostAtTargetSpec(meta)`. The price/performance denominator the
    leaderboard needs; always derivable for a provider with a vetted rate.
  - `usd_per_lifecycle` — `hourlyCostAtTargetSpec × (sum of measured lifecycle-dimension
    metric means, in hours)`. Honors the issue's "× measured runtime" using ENG-59's
    lifecycle timings; emitted only when ≥1 lifecycle metric is present.
- **Why not a single `usd_per_run` over total suite wall-clock?** The Run model does not
  record a total suite wall-clock today (PTS emits throughput, not a single duration).
  Rather than add producer plumbing in this slice, economics is derived purely from data
  already on the Run: pricing (always available) + measured lifecycle durations (when
  present). A true `$/suite-run` over recorded wall-clock is a documented follow-up that
  needs a producer-side total-runtime field.
- **When emitted.** Only for providers that already produced ≥1 measured (non-economics)
  metric — i.e. already `validated`. Keeps "validated = produced real measurements"
  honest; economics enriches a validated provider, never promotes a pending one.
- **Where computed.** Pure `deriveEconomics(meta, measuredMetrics)` in
  `packages/schema/src/economics.ts` (schema is the single owner of pricing). The
  results normalizer calls it after the suite↔dimension contract check and appends the
  economics MetricResults — so economics, which no suite declares, never trips the
  off-dimension check.
- **`derived: true`** on both, so they are visibly distinct from parsed/measured metrics.

## ENG-70 — Host-fingerprint + forensics capture

- **Producer pieces already landed.** The scoped `composite.xml` find (`-path "*benchmark*/…"`) and
  `unset MONITOR PERFORMANCE_PER_WATT` (design §4.3/§4.4) were already in `lib/bench.sh` from earlier
  PRs. The only producer work left for ENG-70 was the forensics tarball.
- **`<System>` is read-only host disclosure.** Added `<System>` to `ptsCompositeSchema` and a tolerant
  regex parser `parseSystemHost` (`results/lib/system-specs.ts`). PTS Hardware/Software are free-text,
  so each field is best-effort: unmatched → unset. Host logical CPUs prefer the thread count over the
  core count ("(24 Cores / 48 Threads)" → 48); memory handles "K x S GB" and "S GB".
- **Never effective.** `parseSystemHost` sets ONLY host-side ObservedSpecs fields
  (`hostVcpus`/`hostMemoryGb`/`cpuModel`/`cpuMhz`/`kernel`/`os`/`virtualization`/`user`). The normalizer
  merges it UNDER the in-sandbox spec probe (`{ ...systemHost, ...probeSpecs }`), so the probe always
  wins on the effective `vcpus`/`memoryGb` and a host disclosure can never masquerade as the sandbox
  quota. Threaded via a new `observedHost?` slot on `ProviderExtraction` (first composite with a
  non-empty `<System>` wins) — extract.ts surfaces it, the run-writer layer merges it (design §4.1).
- **Forensics tarball.** `ptsForensicsFile`/`isPtsForensicsFile` in `raw-files.ts` with suffix
  `--forensics.tar.gz`; provably disjoint from `isPtsResultFile` (ends `.tar.gz`, never `.xml`) so its
  nested XML can't be misrouted. Producer `run_pts_benchmark` now `tar -czf`s the result dir with
  `|| true`. Updated the raw-files doc comment that claimed siblings "deliberately don't match" — one
  sibling now intentionally has a recognized provenance name.
- **shellcheck unavailable.** The `bench.sh` edit could not be shellcheck-linted (shellcheck is a
  Haskell binary, not cargo-installable, and `mise` is egress-blocked). Edit follows the file's existing
  conventions (`local` decls, `|| true` on the tar, portable `dirname`/`basename`). Flagging for review.

## ENG-60 — Disk/memory/network/system PTS suites + catalog (scoped to system)

- **Scope decision.** Delivered the **system** dimension end to end; **memory/disk/network deferred**
  with documentation. Rationale: the generator emits a description-less *wildcard* for single-result
  profiles (zero byte-match risk, no recorded composite needed), but a *multi-result* profile's
  synthesized `pts.description` must byte-match real PTS output, which the golden gate (§3.7) proves
  only against a **recorded composite** — a live PTS artifact unavailable offline.
  - **system** → `pts/pybench` + `pts/sqlite-speedtest`, both single-result (no `<Option>`). Safe offline.
  - **memory** (`stream`), **disk** (`dbench`/`fio`) → multi-result option matrices; need recorded
    composites to wire safely. Deferred.
  - **network** → PTS network profiles need an external peer/server; not runnable in one sandbox.
    Deferred pending an infra decision.
- **Generator robustness fix.** `parse.ts` required `TestSettings.Option`; pybench/sqlite carry a
  `<TestSettings>` with only a `<Default>` (fixed args, no menu). Made `Option` optional → such a
  profile collapses to one wildcard, exactly like a profile with no `<TestSettings>`.
- **Vendoring.** Added the two profiles to `fetch-profiles.ts` PROFILES (pinned at the existing REF,
  verified present there) and re-ran it; `generate-catalog` produced `pybench_milliseconds` +
  `sqlite_speedtest_seconds` (regeneration is byte-stable → drift gate green once committed).
- **Curation + suite.** `pts-overrides.ts` headlines PyBench for `system` + short labels; new `system`
  suite in SUITES (`pybench_milliseconds`, `sqlite_speedtest_seconds`) with producer mise tasks
  (`benchmark:system:all` orchestrator + two PTS leaves under `system/pts/`). Suite orchestrator is a
  file named `all` because a task path can't be both a dir and a file (mirrors cpu's `node`).
- **Drift gate caveat.** `bun run check:catalog-drift` fails on *any* uncommitted change to
  `pts-generated.ts` (it `git diff --exit-code`s vs HEAD), so it only goes green after the commit;
  verified regeneration is byte-identical, so it is green post-commit.

## ENG-66 — Generalize plan-matrix to provider × suite

- `matrix.ts` was a stub (provider × *capability*). Rewrote `buildMatrix()` as provider × **suite** over
  `PROVIDERS` × `SUITE_NAMES` (both injectable; defaults are the real registries) → one CI cell per
  `(provider, suite)`. The dataset grows by registering a provider/suite, never by editing the workflow.
- Added `.github/workflows/bench-matrix.yml`: a `plan` job runs `plan-matrix` → `$GITHUB_OUTPUT`
  `matrix=…`, and a `bench` job fans out with `matrix: ${{ fromJSON(needs.plan.outputs.matrix) }}`,
  `fail-fast: false`, running `bench-suite <provider> <suite>` per cell and uploading per-cell artifacts.
  Mirrors `bench-smoke`'s runner/secrets/env-passing (matrix values via env, never shell-interpolated).
- `plan-matrix.test.ts` updated (`operation` → `suite`); asserts the cross-product size and that every
  cell names a registered provider + suite. CI fan-out itself is live-only (needs provider secrets), so
  only the planning is exercised offline — the workflow is authored but not executed here.

## ENG-67 — Aggregate & commit the published Run dataset (candidate → promote)

- **`aggregateRuns(runs)`** (`results/lib/aggregate.ts`): merges the per-shard Runs the matrix emits
  (one per `(provider,suite)` cell) into one validated Run — measured Metrics unioned per provider
  across suites, skips/uncatalogued/observed-specs combined (first-wins), latest `generatedAt`. Guards
  shard-identity (same runId+sha) and empty input; validates via `parseRun`.
- **Economics re-derived post-merge.** Per-shard economics are *dropped* (identified by the catalog
  `derived` flag) and recomputed from the merged measured set, so `usd_per_lifecycle` reflects every
  suite's timings rather than whichever shard carried them. Reuses `deriveEconomics`.
- **Publish primitive.** `writeRunDocument(run, outFile, indexFile?)` in write-run.ts writes an
  already-built Run + updates the newest-first index (atomic), distinct from `writeNormalizedRun` which
  normalizes a raw tree.
- **Bins.** `aggregate <runId> <candidateDir> <shard.json...>` (collect → candidate) and an enhanced
  `promote <candidateRun.json> [datasetDir]` (gate on ≥1 validated provider, then publish into
  `data/dataset/` + index). promote stays a pure validation gate when no datasetDir is given (back-compat).
- **CI.** Added a `publish` job to `bench-matrix.yml`: downloads every shard artifact, aggregates →
  promotes → commits `data/dataset/` back to the branch (contents: write, github-actions bot). The
  aggregate/promote logic is unit-tested offline; the CI commit path is live-only.

## ENG-68 — Public leaderboard / comparison surface

- **`buildLeaderboard(run)` + `renderLeaderboardMarkdown(board)`** (`results/lib/leaderboard.ts`): one
  ranked table per Dimension keyed on that Dimension's headline Metric (catalog guarantees exactly one),
  every provider that produced it, ranked by Direction (HIB highest-first, LIB lowest-first), tie-broken
  on providerId for determinism. Representative value = Samples' p50. Economics rides in as just another
  Dimension (its `usd_per_hour` headline → a cheapest-first ranking), so "ranking with economics" needs
  no special case. Unpopulated dimensions (no headline value) are omitted.
- **`leaderboard` CLI bin**: renders a Run JSON to Markdown (stdout or a file). Smoke-tested against a
  synthetic two-provider run — produces the cpu (HIB) and economics (LIB) tables correctly.
- **Scope.** Renders from a published Run document; with no committed dataset yet (live runs are out of
  scope), there's no `LEADERBOARD.md` artifact to commit — the renderer + bin are the deliverable, wired
  to run over `data/dataset/` once the matrix publishes one.

## ENG-71 — Cross-run stability / regression gate

- **`compareRuns(previous, current, {threshold})`** (`results/lib/stability.ts`): per provider, per
  measured metric present in both Runs, classifies the p50 movement as
  `regression`/`improvement`/`stable`/`incomparable`. Direction-aware (HIB regresses on a fall, LIB on a
  rise); default noise threshold ±10%, configurable.
- **Provenance is the gate's integrity.** A pair is only comparable when `appVersion` AND `arguments`
  match across Runs (the fields ENG retains on `MetricResult`); otherwise the profile/options changed and
  the move is expected — classified `incomparable`, never a regression. This is the direct consumer of
  the retained provenance the issue calls for.
- **Derived metrics excluded.** Economics (`derived:true`) is skipped — it has no measurement provenance
  and would double-count the measured shift it's computed from.
- **`stability` CLI bin**: `stability <prev.json> <cur.json> [threshold]` prints each shift and exits
  non-zero on any regression (the CI gate). `regressions()` + `describeShift()` exported for reuse.

## ENG-69 — Docs: methodology + add-a-provider/suite/metric

- `docs/methodology.md` — how a measurement is produced: target spec, dimensions + headline metrics,
  the three metric sources, economics ($/run), the **host-vs-effective** caveat (and the MONITOR/forensics
  notes), the capability-driven transport model, and the matrix→aggregate→promote→leaderboard→stability
  pipeline. Cross-links the code it describes.
- `CONTRIBUTING.md` — the local gate commands (incl. the catalog drift gate) and three walkthroughs:
  add a provider (identity+economics → adapter → template), add a suite (SUITES + mise tasks), add a
  metric (PTS single-result vs multi-result-needs-recorded-composite; non-PTS slices). Documents the
  parse-don't-validate + cross-registry-invariant conventions.
- README links both. Docs reflect everything built this session (economics, host-fingerprint, system
  dimension, matrix, dataset, leaderboard, stability) so they're accurate to the branch, not aspirational.

---

# Run 2 — closing the comparison gaps (Borrow into OURS ← THEIRS)

Both repos are local now; THEIRS = /Users/dbworku/repos/runner-benchmarking (read-only, port-from). Live runs still out of scope; golden fixtures sourced from THEIRS's real recorded composites.

## Setup
- gitignore'd `.claude/` (agent state — was tripping `biome check .`) + `data/raw,runs` (transient; `data/dataset/` stays committable). Greens the lint gate (biome useIgnoreFile).

## Task 1 — ENG-60 memory + disk (was deferred for byte-match risk)
- **memory: pts/stream-1.3.4** (multi-result Copy/Scale/Add/Triad). Golden fixture = REAL Daytona `pts_stream.xml` from THEIRS (stream-1.3.5; versionless `pts/stream`). Proves option-matrix description synthesis byte-matches. STREAM Triad = headline.
- **disk: local/hardlink** via a NEW generator capability: source-segment-aware `pts.test` prefix (design §3.2 intent, never implemented). `parseProfile(repo, dir, ...)`; `generate-catalog` discovers flat (`repo=pts`) + nested `pts-profiles/<repo>/<name>-<ver>`. Vendored hardlink from THEIRS; golden fixture = real `pts_hardlink.xml` (proves `local/` join resolves). Hardlink = disk headline.
- **Decision:** network deferred (needs external peer); FIO deferred (no recorded composite) — hardlink is the disk headline. Both documented on ENG-60.

## Task 2 — ENG-59 cold-start honesty (lifecycle)
- Ported THEIRS' readiness approach (additive — `spawn` kept = create-resolve, many tests depend on it). New harness Metrics: `lifecycle_cold_start_ms` (t0→first successful exec, now the lifecycle HEADLINE), `lifecycle_time_to_first_exec_ms` (create→ready gap), `control_plane_exec_payload_64k_ms`. Flipped `spawn` headline→false.
- Driver: after create() (still `spawn`), a readiness loop retries `echo ok` (success=exitCode 0) up to `readinessMaxAttempts`=40 × `readinessRetryDelayMs`=250ms, then a 64KiB payload exec. Injected `now`/`delay` so tests never sleep. `benchmarkLifecycle` default iterations 1→5.
- **Decision:** honest cold start = t0→first-exec, NOT create-resolve — a resolved handle isn't a usable sandbox. Additive to the hand-authored harness slice (not the generated PTS module), so the drift gate is untouched.

## Task 3 — ENG-62 harden detached+poll transport (port from THEIRS runPolled)
- **Double-fork daemonization:** the background launch now spawns an outer nohup that backgrounds an inner nohup (no setsid). A single setsid/nohup pins e2b's envd — it holds the exec open for as long as its *direct* child lives — so the direct child must background the real job and exit at once. Daytona/Blaxel detach either way.
- **Adaptive poll backoff:** replaced fixed POLL_MS=10s with 1.5s → ×1.5 → cap 10s (THEIRS measured ~44% of a short run charged to fixed polling). The inter-poll `sleep` is constructor-injected so tests assert the exact schedule with no real waiting.
- **Cat-poll fallback:** no-filesystem providers no longer fall back to a (non-durable) foreground run — `runDetached` now reads the done-file via a `cat … || echo __RUNNING__` exec, keeping durability everywhere. `selectTransport`/`step` behavior unchanged.
- **Decision/insight:** the no-fs path changed from foreground→cat-poll, so the orchestration fake (index.test.ts) and collect fakes had to model the done-file/log split; collect.test.ts now runs uncapped (sync) since marker-extraction is transport-agnostic and the cat-poll path is covered in execute.test.ts + end-to-end in index.test.ts.
