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

### Post-run cleanup recovery

When an otherwise retained experiment is blocked by unresolved cleanup, stop local account writers
and use `recover-experiment-cleanup --exclusive-account <plan.json> <attempts-root>
<original-attempt-directory>` with provider credentials, `GITHUB_REPOSITORY`, journal-write `GH_TOKEN`
and `GITHUB_ACTOR`. The command requires a completed source workflow and checks workflow quiescence
before observation and release. It confirms exact sandbox removal, or applies the narrowly reviewed
Modal App clearance described in [ADR-0014](../../docs/adr/0014-post-run-cleanup-recovery.md).

The protected journal retains the later attestation. Fresh `workflow-experiment collect` downloads
the immutable attempts and attaches the matching recovery record separately. Re-run the existing
partial backfill after recovery: both aggregate and promote re-verify it, and the Run records recovery
under `experiment.cleanupRecoveries`. Failed cells remain failed and supply no numerical results.

### Local multi-dataset leaderboard and impact report

The `leaderboard` input can be a Run or a JSON array of Run file paths. Paths in an array are
relative to that manifest. The canonical output-file invocation still generates both Markdown and
figures through the same renderer. Use a scratch directory for exploratory combinations so the
published single-run leaderboard remains unchanged:

```sh
bun apps/cli/src/bin/leaderboard.ts /tmp/datasets.json /tmp/combined/LEADERBOARD.md \
  --cohort-review 'Document the compatibility review and remaining assumptions here'
bun apps/cli/src/bin/dataset-impact.ts data/dataset/runs/34804682438.json \
  data/dataset/runs/34853816482.json --out /tmp/combined/report.md \
  --cohort-review 'Document the compatibility review and remaining assumptions here'
```

`dataset-impact` accepts multiple added Run paths. It writes the Markdown report and a sibling JSON
with every provider/metric estimate and source cell. The review flag is necessary only when cohort
digests differ or are missing; it cannot override hard measurement incompatibilities. Neither command
republishes a dataset or dispatches a workflow.

A failure before execution may retain `raw/allocation.json` without an execution receipt. The same
`recover-experiment-cleanup` command validates that identity and restores a missing journal allocation
before confirming removal and appending the publication attestation. Use this command when partial
publication must be recovered; `recover-allocated-intent` alone only resolves account admission.
See [ADR-0017](../../docs/adr/0017-retained-allocation-cleanup-recovery.md).

Existing CPU cells cannot be measured again by clicking **Re-run failed jobs**: the executor refuses
cells already present in the journal. After recovery, use a fresh experiment at the corrected revision.
A dataset-only backfill can re-collect the original attempts with the later cleanup attestations.

The legacy `recover-rejected-create` command refuses generic create-failure markers. They cannot
prove the vendor rejected a request rather than accepting it before a timeout. No inventory sweep
or journal write occurs: leave the intent unresolved until identity-based recovery or a reviewed
vendor-confirmed recovery is available. Diagnostic prose is not authoritative rejection evidence.
