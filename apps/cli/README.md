# @sandbox-benchmarks/cli

**Role:** the entrypoint app — wires the five `@sandbox-benchmarks/*` packages into runnable commands.

**Bins (`bin`, no `exports`):**
- `bench-lifecycle` — measure each provider's lifecycle (spawn→exec→snapshot→teardown) and
  control-plane (sandbox info/list) timings directly in the harness, the axes PTS cannot see. Flags:
  `--iterations N` (cold-start cycles/provider), `--control-plane-samples N`, `--no-snapshot`. Providers
  with absent creds skip; per-Metric distributions go to stdout JSON, a timing log to stderr.
- `bench-suite` — run the full suite across the matrix.
- `bench-local` — run one or more suites on THIS machine (no CI, no provider credentials, no sandbox)
  and emit a Run document in the published dataset's format. **stdout carries only that document** —
  every human-facing line, including the harness's own progress logs, is quarantined onto stderr — so
  `bench-local --suites memory > run.json` and `| jq` both work. `--promote` publishes into
  `data/local/`, never `data/dataset/`. Its interface is owned by `src/lib/usage-spec.ts`, which also
  generates the `#USAGE` headers in `.mise/tasks/bench-local` (drift-gated). Usually invoked as
  `mise run bench-local`.
- `plan-providers` — print the **selected provider ids** as **single-line compact JSON** (honors `BENCH_PROVIDERS`); in Actions writes `providers=` via `emitStepOutputs` and logs through `@actions/core`.
- `plan-suites` — print the **selected suite names** as **single-line compact JSON** (blank `BENCH_SUITES` = every suite — the targeted/pre-merge knob); in Actions writes `suites=` the same way.
- `plan-matrix` — print the full **provider × suite** benchmark matrix as **single-line compact JSON** (cell listing for local inspection / discovery; CI fans out via `plan-providers` + `plan-suites`).
- `build-template` — build a provider's sandbox template.
- `normalize` — turn raw runs into normalized run documents.
- `aggregate` — merge shard Runs into one candidate.
- `promote` — promote normalized results to the published dataset. Used by the `commit-dataset` workflow.
- `leaderboard` — render a Run as Markdown (`LEADERBOARD.md`); used by the `update-leaderboard` workflow.
- `reprice-dataset <dataset-directory>` — maintenance-only rewrite of derived economics in every
  canonical Run referenced by an existing dataset index. It validates and reprices all Runs before
  writes begin, then atomically replaces each Run file individually. It preserves schema
  versions/timestamps and does not rewrite the index; the overall operation is not dataset-atomic.
- `bake` / `bench-smoke` / `stability` — toolchain bake, single-cell smoke, cross-run stability gate.

**Depends on:** all five packages (`workspace:*`) + `dotenv` (`catalog:`).

**What lives here:** thin command wrappers under `src/bin/`; shared command helpers under
`src/lib/` (never imported across a package boundary). As an app it has **no `exports`** — nothing
imports the CLI.

Run a bin directly during development: `bun apps/cli/src/bin/plan-matrix.ts`.
