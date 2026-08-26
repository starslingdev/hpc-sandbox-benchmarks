# @sandbox-benchmarks/results

Normalization reads each suite's fixed cost- and artifact-evidence files separately from PTS
extraction and emits Run v6. Aggregation retains deterministic records per sandbox cell, rejects
conflicts and sandbox reuse, and rejects a v6/older shard mixture rather than dropping attribution.
Historical all-pre-v6 inputs still aggregate as Run v5. This package remains provider-SDK-free:
provider calls and response sanitization happen upstream in the providers package.

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
