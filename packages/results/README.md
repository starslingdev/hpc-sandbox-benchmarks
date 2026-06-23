# @sandbox-benchmarks/results

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
