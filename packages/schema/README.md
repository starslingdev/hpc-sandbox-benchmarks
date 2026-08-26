# @sandbox-benchmarks/schema

**Role:** the bottom of the dependency DAG — shared types and runtime schemas every other member
builds on.

**Public surface (`.`):** the provider registry and economics, the toolchain identity, the Metric
vocabulary + Catalog (`MetricDef`, `METRIC_CATALOG`, `aggregate()`), the harness-measured Metric slice
and its operation→id contract (`harnessMetrics`, `HARNESS_METRIC_IDS`), the Run dataset model (`Run`,
`ProviderRun`, `MetricResult`, `parseRun()`), the raw-file naming contract, and `RawRun` /
`parseRawRun()`.

**Depends on:** `arktype` only (no internal deps).

**What lives here:** the canonical type vocabulary and arktype runtime schemas every other member
builds on — providers, metrics, the normalized Run model, and how raw result files are named.
Private validation internals live in `src/lib/` and must never be imported across a package
boundary — import from `@sandbox-benchmarks/schema` instead.

Provider pricing is also structured here. A published record retains cited component rates, vendor
units, billing bases, intrinsic quantity rules, plan fees/allowances, and source verification dates.
Component quantities are derived from each Run's `TargetSpec` when pricing is applied rather than
stored for the current benchmark shape. `targetHourlyCost` classifies the resulting total as `exact`,
`usage_dependent`, or `plan_dependent`; `hourlyCostAtTargetSpec()` returns a scalar only for `exact`
component lists. Unavailable self-hosted or unpublished pricing has a separate reason-bearing arm.
This keeps rates auditable without converting active usage, monthly pools, or reserved floors into
misleading totals.

**Vendored PTS profiles (`src/pts-profiles/<name>-<ver>/`):** the upstream PTS
`test-definition.xml` / `results-definition.xml` for each suite we run, pinned by exact version (the
dir name is the pin). The forthcoming Metric Catalog generator reads these committed copies — the
build never hits the network. Re-pull or add a profile with `bun run fetch-profiles` (a non-build
dev tool; nothing imports it).

## Run v5 provider cost evidence

Run v5 requires `costEvidence: []` on every provider row and retains sandbox-scoped observed or
explicitly missing provider cost records. v2-v4 remain valid and cannot carry fabricated evidence.
The raw transport is the fixed `provider-cost-evidence.json` filename; serialization is deterministic,
bounded, and parsing is strict. Schema validity establishes structure and attribution fields, not
external authenticity. `providerCostTotal(records, expectedCells)` returns money only when the records
exactly equal the caller's authoritative expected-cell set and every record is unique, observed, and
same-currency. The result is exact only relative to those supplied cells; missing evidence never
contributes zero.

## Run v6 artifact evidence

Run v6 requires `artifactEvidence: []` on every provider row. A booted sandbox records its complete
benchmark cell, sandbox id, exact requested artifact, and how that identity was established. The raw
transport is the bounded, deterministic `provider-artifact-evidence.json` host-owned file. Canonical
release artifacts may carry a guest observation from `/toolchain-manifest.json`; the schema derives
the expected image identity from release constants and rejects a stale or producer-selected expected
value. Noncanonical overrides remain `request-fallback`. Aggregation preserves one record per cell and
rejects conflicting records, reused sandbox ids, and mixed v6/older inputs.
