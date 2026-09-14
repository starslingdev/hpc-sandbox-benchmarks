# @sandbox-benchmarks/cli

**Role:** the entrypoint app — wires the five `@sandbox-benchmarks/*` packages into runnable commands.

**Bins (`bin`, no `exports`):**
- `bench-lifecycle` — measure each provider's lifecycle (spawn→exec→snapshot→teardown) and
  control-plane (sandbox info/list) timings directly in the harness, the axes PTS cannot see. Flags:
  `--iterations N` (cold-start cycles/provider), `--control-plane-samples N`, `--no-snapshot`. Providers
  with absent creds skip; per-Metric distributions go to stdout JSON, a timing log to stderr.
- `bench-suite` — run the full suite across the matrix.
- `plan-providers` — print the **selected provider ids** as **single-line compact JSON** (honors `BENCH_PROVIDERS`); in Actions writes `providers=` via `emitStepOutputs` and logs through `@actions/core`.
- `plan-suites` — print the **selected suite names** as **single-line compact JSON** (blank `BENCH_SUITES` = every suite — the targeted/pre-merge knob); in Actions writes `suites=` the same way.
- `plan-matrix` — print the full **provider × suite** benchmark matrix as **single-line compact JSON** (cell listing for local inspection / discovery; CI fans out via `plan-providers` + `plan-suites`).
- `build-template` — build a provider's sandbox template.
- `normalize` — turn raw runs into normalized run documents.
- `aggregate` — merge shard Runs into one candidate.
- `promote` — promote normalized results to the published dataset. Used by the `commit-dataset` workflow.
- `leaderboard` — render a Run as Markdown (`LEADERBOARD.md`); used by the `update-leaderboard` workflow.
- `compare-figures <runA.json> <runB.json> <out-directory>` — draw two committed runs' realworld
  suites side by side: one chart per suite both runs chart, each environment as a pair of bars
  (the older run's faded, both chipped with their month) with the change in the summed medians
  printed beside the newer one. Bars sum only the tasks both runs exercised. The output directory
  is yours, never `docs/figures/` (that is the leaderboard's, gated to what `LEADERBOARD.md` links).
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

`workflow-experiment collect` downloads immutable attempt artifacts with 32 concurrent workers and
reads independent account journals alongside those downloads. Set `BENCH_ARTIFACT_DOWNLOAD_CONCURRENCY`
to an integer from 1 to 64 for transfer diagnostics; this setting does not alter sandbox capacity,
the frozen plan, or publication eligibility. The default leaves room for journal requests below
[GitHub's shared concurrent-request limit](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
Collection rejects duplicate destinations, validates original Run/raw digests and provenance, and
waits for all active extractions before reporting a download failure. Its final JSON timing line
reports artifact bytes, inventory, downloads plus verification, synchronous verification, journal reads,
peak download concurrency, and the whole collect command duration. Journal and download durations
overlap; do not add them when interpreting total wall time.

### Explicit partial publication

Both aggregation and promotion default to complete experiments. An operator can deliberately publish
verified measurements from an incomplete, fully collected experiment with:

```sh
bun apps/cli/src/bin/aggregate-experiment.ts plan.json attempts candidate --allow-partial
bun apps/cli/src/bin/promote.ts candidate/runs/RUN_ID.json data/dataset plan.json attempts --allow-partial
```

Run v8 preserves every planned cell and its shortfalls under `experiment.partial`, marks the dataset
partial and makes the leaderboard show an incomplete-results banner. The option does not bypass
raw evidence, provenance, fixed trial counts or resolved cleanup. See
[ADR-0012](../../docs/adr/0012-explicit-partial-publication.md).

In CI the same opt-in is the `allow_partial` input of the `commit-dataset` workflow (backfill a
run with **Actions → Commit dataset → Run workflow**, or `scripts/backfill-dataset.sh <run-id>
--allow-partial`); it sets the flag on both commands, so promotion re-verifies the candidate under
the policy it was built with. The CPU benchmark workflow enables its visible `allow_partial` input
by default and forwards it to publication. Disable that input to require complete coverage.
Standalone backfills and CLI commands remain strict by default. See
[ADR-0013](../../docs/adr/0013-cpu-partial-publication-default.md).
