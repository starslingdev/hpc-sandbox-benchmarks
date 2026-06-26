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
