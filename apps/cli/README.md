# @sandbox-benchmarks/cli

**Role:** the entrypoint app — wires the five `@sandbox-benchmarks/*` packages into runnable commands.

**Bins (`bin`, no `exports`):**
- `bench-lifecycle` — measure each provider's lifecycle (spawn→exec→snapshot→teardown) and
  control-plane (sandbox info/list) timings directly in the harness, the axes PTS cannot see. Flags:
  `--iterations N` (cold-start cycles/provider), `--control-plane-samples N`, `--no-snapshot`. Providers
  with absent creds skip; per-Metric distributions go to stdout JSON, a timing log to stderr.
- `bench-suite` — run the full suite across the matrix.
- `plan-providers` — print the **selected provider ids** as **single-line compact JSON** for `$GITHUB_OUTPUT` (the `bench-matrix` workflow's per-suite fan-out axis; honors `BENCH_PROVIDERS`).
- `plan-suites` — print the **selected suite names** as **single-line compact JSON** for `$GITHUB_OUTPUT` (each `bench-matrix` suite job is gated on membership; blank `BENCH_SUITES` = every suite — the targeted/pre-merge knob).
- `plan-matrix` — print the full **provider × suite** benchmark matrix as **single-line compact JSON** (cell listing for local inspection / discovery; the workflow's fan-out axis is `plan-providers`).
- `build-template` — build a provider's sandbox template.
- `normalize` — turn raw runs into normalized run documents.
- `aggregate` — merge shard Runs into one candidate.
- `promote` — promote normalized results to the published dataset.
- `leaderboard` — render a Run as Markdown (`LEADERBOARD.md`); used by the dataset publish job.
- `bake` / `bench-smoke` / `stability` — toolchain bake, single-cell smoke, cross-run stability gate.

**Depends on:** all five packages (`workspace:*`) + `dotenv` (`catalog:`).

**What lives here:** thin command wrappers under `src/bin/`; shared command helpers under
`src/lib/` (never imported across a package boundary). As an app it has **no `exports`** — nothing
imports the CLI.

Run a bin directly during development: `bun apps/cli/src/bin/plan-matrix.ts`.
