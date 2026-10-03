# @sandbox-benchmarks/results

Normalization reads each suite's fixed cost- and artifact-evidence files separately from PTS
extraction and emits Run v6. Aggregation retains deterministic records per sandbox cell, rejects
conflicts and sandbox reuse, and rejects a v6/older shard mixture rather than dropping attribution.
Historical all-pre-v6 inputs still aggregate as Run v5. This package remains provider-SDK-free:
provider calls and response sanitization happen upstream in the providers package.

Fixed-pass experiment publication verifies individual PTS trials against the frozen cell policy,
before pooling sandbox replicates. Normalization records whether samples came from `RawString` or
the headline `Value`; a `Value` alone has an unknown trial count. The origin follows each replicate
through aggregation. Harness timings retain their own sampling contract.

When reading original attempts, the CLI verifies the raw-tree and Run digests, then checks the exact
samples in each metric's original XML source. This permits historical shards without sample-origin
metadata to prove their trials from retained raw evidence without rewriting either immutable file.
PTS omits `RawString` when a single trial equals `Value`. That case is accepted only when the original
Entry's JSON records exactly one finite, non-negative `test-run-times` duration, no error, and a
positive `Value` matching the stored sample, for a one-pass cell. This `single-trial-value` proof is
separate from the stored `aggregate-value` origin; neither absent historical origin nor original
attempt bytes are rewritten. Missing, malformed, multiple-duration or failed-trial metadata cannot
prove the count, and a single-value proof cannot satisfy two passes. Unproved or mismatched evidence
fails completeness and is named in coverage.
An eligible metric whose catalog definition was retired also remains unverified: its frozen
denominator is retained, and missing PTS mapping cannot be treated as a harness sampling contract.

**Role:** normalize a raw benchmark results tree (`data/raw/<runId>/<provider>/`) into validated `Run`
documents for reporting/promotion.

**Public surface (`.`):** `normalizeResultsTree()`, `writeNormalizedRun()`, `updateRunIndex()`,
`summarizeRun()` (+ their input types). The PTS XML parser, per-file extraction, and observed-spec
reading are package-internal under `src/lib/`.

**Depends on:** `@sandbox-benchmarks/schema` and an XML parser (`@nodable/*`) **only**. By design this
package must normalize results *without* any provider SDK — the boundary test enforces that it never
reaches into `@sandbox-benchmarks/providers` or a vendor SDK.

**What lives here:** the typed `composite.xml` parser, the raw-directory extractor, sample
aggregation into the `Run` model, and the Run writer/index. Implementation modules live in `src/lib/`
and are never imported across a package boundary — import from `@sandbox-benchmarks/results` instead.

## Combining datasets for local reporting

`combineLeaderboardDatasets(runs, options)` accepts an array of validated Runs and returns a
consumption-only `LeaderboardDataset`. `buildLeaderboard` also accepts an array directly. The view
is not a publishable Run: each source keeps its own experiment, coverage denominator and provenance.
Duplicate identical runs are idempotent; conflicting copies, reused attempts or sandbox identities,
different requested targets, recorded metric versions/options, artifact identities or pass policies
fail instead of silently pooling incompatible observations. Differing or missing comparison-cohort
digests require an explicit `cohortReview`, recorded in the output for exploratory analysis.

Replicate indices are namespaced by source run. Samples stay within their original sandbox clusters;
medians, bootstrap intervals and rank tests are recomputed from those clusters, never averaged from
precomputed summaries. Multi-source pipeline segments likewise use the median of sandbox medians.
Single-source output is preserved. A metric with no observations in the added runs retains its
original uncertainty seed and sample structure. Hourly prices use the latest contributing value as
one observation; other derived metrics are omitted rather than treated as experimental samples.

Pooling assumes exchangeable sandbox draws across the selected dates. It does not estimate a random
run effect, guarantee nominal coverage, correct failure-related selection, or predict future-date
performance. A documented cohort review does not establish these statistical assumptions. More
sandboxes can reveal additional variability and widen intervals. `datasetImpact` compares baseline,
added-only and combined estimates for every measured metric, with per-suite/provider coverage and
pipeline totals. `renderDatasetImpact` produces its Markdown report; the structured result retains
source-cell identities and full precision.
