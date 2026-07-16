# Plan: Refactor bench-matrix.yml into a replicate-based, suite-grouped benchmark pipeline

## Context

`.github/workflows/bench-matrix.yml` fans the live benchmark across a flat provider × suite
matrix (27 cells by default) feeding the public LEADERBOARD.md. Problems: hours-long
wall-clock (155-min suite budgets, 180-min job timeout), statistically weak results
(`FORCE_TIMES_TO_RUN=2` caps every PTS case at 2 trials), no visible grouping of jobs
running the same suite, provider/machine metadata collected in-sandbox but dropped,
pts/git absent, and no large-blob download benchmark. The leaderboard buries real-world
results (realworld dimension renders second-to-last).

The target pattern is the user's `disk-io-comparison.yml` (sibling repo): a `setup` job
expands labels × replicas; one **static, named caller job per scenario**, each calling a
reusable `bench-suite.yml`; sidecar metadata probes in every leg; a `summarize` job
rendering a comparison table. Mapping here: runner label → **provider**; replica →
**replicate sandbox** per (provider, suite); hosted runners drive provider SDKs.

Decisions already made by the user: GHA Enterprise concurrency (~180 jobs — full matrix
runs in one wave); **vendor pts/fast-cli** for large-blob download; **publish all**
metadata including egress IPs/reverse-DNS; **synthetic suite set is exactly cpu-node,
git, fast-cli, disk, system, pgbench** — cpu-generic (c-ray + zstd), memory (STREAM),
and network (loopback) are retired.

## Verified ground truth (key files)

- Fan-out: `plan-matrix.ts` emits `{"include":[{provider,suite}...]}` →
  `bench` matrix job → reusable `publish-dataset.yml` (aggregate → promote →
  `leaderboard.ts` → auto-merge PR). `bench-smoke.yml` duplicates the bench job body.
- Registries: `packages/schema/src/suites.ts` (9 suites; fields incl.
  `commandTimeoutMinutes`/`timeoutMinutes`/`minDiskGb`/`dimensions`/`metrics`/`commands`;
  unused GHA helpers `paddedSuiteToken`/`padSuiteList` at lines 258-265),
  `packages/schema/src/providers.ts` (5 providers, `requiredEnvVars`).
- Run cap: `packages/harness/src/lib/execute.ts:186-192` (PREAMBLE exports
  `PTS_RESPECT_TIMES_TO_RUN=1`, `FORCE_TIMES_TO_RUN=2`; disables PTS adaptive variance
  policy). Fallback `lib/bench.sh:271-278`. Stale "five fixed trials" comments in
  suites.ts (~108, 151, 200).
- Samples: raw per-pass values persist end-to-end (PTS `RawString` →
  `packages/results/src/lib/pts.ts` `resultSamples` → `MetricResult.samples`).
  Aggregates (p50/p95/mean/stdev/min/max/n) in `packages/schema/src/analysis.ts`.
  Bootstrap CI + Mann-Whitney/KS computed at **render time** in
  `packages/results/src/lib/leaderboard.ts` (not persisted).
- **Blocker**: `packages/results/src/lib/aggregate.ts` `mergeProvider` unions metrics by
  id **first-wins** — replicate shards reporting the same metric would be silently
  dropped. Must be reworked before any replicate fan-out.
- Metadata: `.mise/tasks/benchmark/system/provider` (bash, tolerant) writes
  `benchmark-results/system-provider.json` (IP, ASN/org via Team Cymru, geo via ipinfo,
  DMI manufacturer/product/bios, virtualization, cpu/cores/ram/kernel). **No consumer** —
  `packages/results/src/lib/specs.ts` reads only observed-specs + jc probes. Runs only in
  the `system` suite today.
- pts/git: not vendored/registered (only a skip-marker fixture
  `packages/results/src/lib/__fixtures__/daytona/pts_git--skipped.json` and contamination
  history in `docs/pts-catalog-and-analysis-design.md:187`).
- pts/fast-cli: absent. Non-catalogued ~10 MB curl probe at
  `.mise/tasks/benchmark/network/download` (raw JSON provenance only).
- Vendoring pattern: `packages/schema/scripts/fetch-profiles.ts` PROFILES list (vendors
  test-definition.xml + results-definition.xml only; payloads fetched live by PTS at
  install) → catalog regen (`pts-generated.ts` + `pts-overrides.ts`) → golden fixture →
  mise task → SUITES entry. Local-profile precedent: `packages/schema/src/pts-profiles/local/`.
- Drift gate `tooling/repo-checks/src/lib/workflow-sync.ts` pins job ids
  (`smoke`/`bench`), step name "Run suite and normalize", the per-provider secret-env
  mapping in BOTH live workflows, smoke choice options == registries, and literal
  `timeout-minutes >= max(suite budgets)+15`. Must change in lockstep.
- Leaderboard renders one Run; sections follow the `DIMENSIONS` tuple order
  (`packages/schema/src/metrics.ts:18-28`) — don't reorder that tuple globally.

## Design

### 1. Workflow structure (grouping visible at a glance)

New reusable `.github/workflows/bench-suite.yml` (name mirrors the reference; the CLI bin
`bench-suite.ts` is unchanged and invoked by it):

- `workflow_call` inputs: `suite`, `matrix` (JSON string `{"include":[{provider,replicate}...]}`),
  `run-id`, `timeout-minutes`; `secrets: inherit` from caller.
- One job `bench`, `name: ${{ matrix.provider }} · r${{ matrix.replicate }}`,
  `environment: privileged` (declared inside — a `uses:` caller can't set it),
  `strategy: fail-fast: false`, per-provider secret scoping moved here (single copy,
  same `matrix.provider == 'x' && secrets.X || ''` idiom).
- Steps: checkout → bun → install → `bun apps/cli/src/bin/bench-suite.ts "$BENCH_PROVIDER"
  "$BENCH_SUITE" "$GITHUB_RUN_ID" --replicate "$BENCH_REPLICATE"` → upload artifact
  **`bench-<suite>-<provider>-r<idx>-<runId>`** (keeps the `bench-*-<runId>` glob that
  publish-dataset.yml matches for backfill).

Rewritten `bench-matrix.yml`:

- Inputs (≤10-input cap respected): `providers` (CSV, default `e2b,daytona,modal`),
  `suites` (CSV, blank = all), `replicas` (override, blank = per-suite defaults).
- `plan` job: extended `plan-matrix.ts` emits one output per suite
  (`matrix-<suite>=<json>` with provider × replicate cells, plus per-suite
  `timeout-<suite>`), and a padded suite list for gating.
- **One static caller job per suite** (9 after changes: 3 realworld + cpu-node, disk,
  system, pgbench, git, fast-cli), e.g.:
  `realworld-mastra: needs: plan; if: contains(needs.plan.outputs.suites, ',realworld-mastra,');
  uses: ./.github/workflows/bench-suite.yml; with: {...}; secrets: inherit` — the UI shows
  `realworld-mastra / e2b · r3`, giving per-suite grouping exactly like the reference.
  Gate uses the existing (currently vestigial) `paddedSuiteToken`/`padSuiteList` helpers.
- `summary` job (`if: !cancelled()`, needs all callers): downloads shards, renders a
  suite × provider table (median, CI, n, failed replicates) to `$GITHUB_STEP_SUMMARY` —
  the reference's `summarize` leg, implemented as a small CLI bin reusing the aggregation
  library.
- `publish` job unchanged in contract (`uses: publish-dataset.yml` with run_id).

`bench-smoke.yml` becomes a thin caller of bench-suite.yml (1×1 matrix), killing the
duplicated env-mapping.

Tradeoff accepted: static per-suite jobs lose "add a suite with zero workflow edits".
Restored via drift gate: workflow-sync gains an invariant that bench-matrix.yml's caller
job set == `SUITE_NAMES` (a new suite fails CI with a clear message until its ~8-line
caller block is added).

### 2. Statistics (replicates × in-sandbox repeats)

Replicate sandboxes capture between-sandbox variance (host placement, region, noisy
neighbors) — what users actually experience; in-sandbox repeats (k, via per-suite
`FORCE_TIMES_TO_RUN`) capture within-machine noise cheaply. New suites.ts field
`ptsTimesToRun` threaded through `execute.ts` PREAMBLE (replacing the global constant);
replicate count `defaultReplicas` also lives in suites.ts.

| Tier | Suites | k (in-sandbox) | R (replicates) | n = R×k | cell wall (est.) |
|---|---|---|---|---|---|
| Real-world | realworld-{mastra,better-auth,openclaw} | 1 | 5 | 5 | ~50-55 min (setup ~15-20 + ~33 pass) |
| Long synthetic | cpu-node, disk, system, pgbench | 2 | 3 | 6 | ≤ ~60 min |
| Short | git, fast-cli | 3 | 3 | 9 | ~20-30 min |

Registry changes: split `system` → `system` (pybench+sqlite) + `pgbench` (mirrors the
reference treating pgbench as its own leg); **retire** `cpu-generic`, `memory`, and
`network` — remove their SUITES entries, mise tasks, vendored profiles (c-ray,
compress-zstd, stream, network-loopback) and catalog entries (via the generator list +
overrides). The leaderboard skips dimensions with no metrics in the rendered run, and
already-published dataset runs keep their old metrics untouched. The non-catalogued
curl/dns/latency probes retire with the network suite (fast-cli supersedes the download
probe). Every sample count rises from n=2 to n=5-9 while every cell shortens.

- **Ranking value**: median (p50) of pooled samples across replicates (unchanged UX).
- **CI**: 95% hierarchical bootstrap — resample replicates with replacement, then samples
  within each; degenerates to the current bootstrap at R=1. Render-time, deterministic
  seed (existing pattern). New function in `analysis.ts`.
- **Tie/separation test**: hierarchical bootstrap CI of the *difference* in medians
  between adjacent rows; separated iff the 95% CI excludes 0. Replaces Mann-Whitney as
  the tie decider (MW on pooled clustered samples is anticonservative; MW on R=3
  replicate medians can never reach p<0.05). MW/KS on pooled samples remain as
  descriptive columns in the pairwise details table.
- **Warmup**: none discarded — cold-start IS the real-world metric; synthetic tiers have
  k≥2 within-sandbox. PTS adaptive variance stays disabled.
- **Outliers**: no silent trimming. A replicate whose median deviates >3×MAD from the
  cross-replicate median gets flagged in the Notes column (data retained). Failed
  replicate → recorded gap; metrics render with surviving replicates and an "n too small"
  note below 3.
- `n` column becomes `R×k` (e.g. `5×1`, `3×3`).

Wall-clock target: **≤75 min end-to-end** for the default dispatch (~99 jobs in one wave
at Enterprise concurrency: bench ≤ ~55-60 min bounded by realworld cells + plan ~3 min +
publish ~10 min), conservative commitment ≤90 min, vs multi-hour today. Budgets become
ceilings re-derived after a calibration run; workflow timeout drops 180 → ~105
(max new budget 90 + 15 drift margin).

### 3. Schema & aggregation changes

- `packages/schema/src/run.ts`: schemaVersion `"2"` → `"3"`, `parseRun` accepts both.
  `MetricResult` gains `replicates?: { index: number; samples: number[] }[]` (pooled
  `samples` + `aggregates` kept for compatibility). `ProviderRun` gains
  `infrastructure?: InfrastructureRecord[]` (per replicate: index, publicIp, reverseDns,
  asn, orgName, city/region/country/loc/timezone, manufacturer, productName, biosVendor,
  virtualization, cpuModel/cores/ram/kernel, asn_source/geo_source). Published in full
  per user decision.
- `apps/cli/src/bin/bench-suite.ts`: new `--replicate <idx>` arg → stamped into the shard
  Run; artifact name carries `r<idx>`.
- `packages/results/src/lib/aggregate.ts`: `mergeProvider` reworked — same metricId across
  shards now merges into the replicate structure and recomputes pooled samples/aggregates
  (first-wins retained only for true duplicates within one replicate). Design-doc warning
  about pooled-n distortion is answered by the replicate structure + cluster-aware stats.
- New reader `packages/results/src/lib/infrastructure.ts` for `system-provider.json`,
  invoked from `normalize-tree.ts`.

### 4. Provider/machine metadata surfacing

- The probe runs in **every** sandbox: a harness step after setup (next to the
  observed-specs capture in `packages/harness/src/index.ts:~305`, allowFailure) instead
  of a `system`-suite command — one place, all suites, all replicates.
- Aggregate folds per-replicate records; heterogeneity across replicates is disclosed
  (same pattern as `hostCpuModels`).
- Leaderboard gains an **Infrastructure** section: per provider — ASN/org, egress IP(s) +
  reverse DNS, geo, manufacturer/product, virtualization, CPU model(s), cores/RAM/kernel,
  with per-replicate variance called out.

### 5. New benchmarks

- **pts/git** (the synthetic proxy for common Git operations): vendor the upstream
  profile via `fetch-profiles.ts` PROFILES; regenerate catalog (+ override if scale/name
  needs it); golden composite fixture; mise task `.mise/tasks/benchmark/system/pts/git`;
  new `git` suite (dimension `system`, setupPts, k=3/R=3, budget ~40/50 — provisional
  until the upstream install payload is verified during implementation).
- **pts/fast-cli** (large-blob download; user decision): vendor upstream profile;
  requires Node (`setupNode: true`) since it npm-installs the fast.com CLI; dimension
  `network`; metrics download Mbps (HIB) + upload/latency if the profile emits them;
  k=3/R=3. Recorded tradeoffs: measures Netflix-CDN peering (endpoint chosen by fast.com,
  outside our control), npm install adds setup time/flake surface, payload fetched live
  at PTS install (downloads.xml is never vendored). The existing 10 MB curl probe stays
  as raw provenance.

### 6. LEADERBOARD.md restructure

Mechanism: a leaderboard-local section order/grouping constant in `leaderboard.ts`
(global `DIMENSIONS` tuple untouched — other consumers depend on its order).

1. Header (run provenance, target spec, how-to-read) + comparability warnings.
2. **Real-world performance** (headline) — at-a-glance summary table: per provider, rank
   + median + CI for each realworld repo's headline task; then the per-metric tables for
   all realworld task metrics.
3. **Economics** (user-facing, kept above synthetic detail).
4. **Synthetic benchmarks** (explicitly labeled secondary depth) — cpu (node-web-tooling),
   disk (fio + hardlink), network (fast-cli download), system (pybench/sqlite/pgbench/git)
   as subsections. Memory and loopback sections disappear with their suites.
5. **Infrastructure** appendix (new, §4).
6. Coverage gaps (unchanged).

### 7. Drift-gate updates (`tooling/repo-checks/src/lib/workflow-sync.ts`)

Rewritten in lockstep with PR4: secret-env mapping checked in `bench-suite.yml` only;
caller-job set == `SUITE_NAMES`; per-suite `timeout-minutes` inputs ≥ suite budget + 15;
smoke choice options invariant unchanged; job/step name constants updated.

## Implementation phases (each an independently green PR)

1. **Stats & schema core** — run.ts v3, aggregate.ts replicate merge, analysis.ts
   hierarchical bootstrap + difference-CI separation, leaderboard.ts consumes new stats
   (R=1 compatible), suites.ts: `ptsTimesToRun`/`defaultReplicas` fields, system→pgbench
   split, retirement of cpu-generic/memory/network (suites, tasks, profiles, catalog),
   new budgets, stale-comment fixes; execute.ts threads k. Fixtures/tests. Inert to
   production until PR4.
2. **Metadata** — harness sidecar probe step, infrastructure reader + schema wiring,
   aggregate fold, leaderboard Infrastructure section.
3. **New suites** — vendor pts/git + pts/fast-cli (profiles, catalog regen, fixtures,
   mise tasks, SUITES entries; contract checker enforces completeness).
4. **Workflows** — new bench-suite.yml; bench-matrix.yml rewrite (plan → per-suite static
   callers → summary → publish); bench-smoke.yml thin caller; plan-matrix.ts per-suite
   outputs; workflow-sync.ts rewrite; verify publish-dataset.yml artifact glob still
   matches (`bench-*-<runId>` — it does with `r<idx>` infix).
5. **Leaderboard restructure** — section reorder, real-world headline summary, synthetic
   grouping label.
6. **Calibration dispatch** — full default matrix; harvest actual per-cell durations
   (manifest.ndjson timings); tighten budgets + workflow timeout; bump replicas if
   headroom allows (Enterprise concurrency permits R=7+ for realworld later).

## Verification

- Per PR: `bun run test` (includes workflow-sync + suite-contract + catalog-drift),
  Biome, actionlint/zizmor via ci-lint on workflow changes; golden-fixture tests for the
  new stats (hierarchical bootstrap deterministic seeds) and aggregation
  (multi-replicate merge).
- After PR4: `bench-smoke.yml` dispatch (git on daytona — the cheapest suite) proves
  bench-suite.yml end-to-end (sandbox, artifact naming, publish path untouched).
- After PR6 calibration: confirm one-wave scheduling, wall-clock ≤ target, shard count ==
  job count, dataset PR auto-merges, LEADERBOARD.md renders new structure; spot-check
  n=R×k and CI widths vs the old n=2 run.

## Risks & open questions

- **Provider quota thundering herd**: ~33 concurrent sandboxes per provider at dispatch.
  Existing 60-min capacity-retry absorbs 429s but eats wall-clock; if calibration shows
  contention, add per-caller `max-parallel` or replicate-index start stagger. (User OK'd
  aggressive concurrency.)
- **R=3 tiers rarely "separate" statistically** — difference-CI ties will be common for
  close providers; that's honest, and the tie UX already exists. Replicas are the dial.
- **fast.com variance/endpoint drift** and npm-install flake — accepted with the
  vendoring decision; failures become recorded gaps, not run failures.
- **pts/git install payload unverified** (may download a source repo / compile) — verify
  budget in PR3.
- **Runner-minutes**: ~50-100 runner-hours per dispatch on hosted runners (free if the
  repo is public; billable if private).
- Open: exact upstream profile versions for git/fast-cli (pin at implementation);
  Economics placement (proposed: directly after Real-world) — flag in PR5 review;
  whether realworld headline summary aggregates per-repo tasks or shows cold-install only.
