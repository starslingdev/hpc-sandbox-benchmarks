# @sandbox-benchmarks/schema

**Role:** the bottom of the dependency DAG — shared types and runtime schemas every other member
builds on.

**Public surface (`.`):** the provider registry and economics, the toolchain identity, the Metric
vocabulary + Catalog (`MetricDef`, `METRIC_CATALOG`, `aggregate()`), the Run dataset model (`Run`,
`ProviderRun`, `MetricResult`, `parseRun()`), the raw-file naming contract, and `RawRun` /
`parseRawRun()`.

**Depends on:** `arktype` only (no internal deps).

**What lives here:** the canonical type vocabulary and arktype runtime schemas every other member
builds on — providers, metrics, the normalized Run model, and how raw result files are named.
Private validation internals live in `src/lib/` and must never be imported across a package
boundary — import from `@sandbox-benchmarks/schema` instead.
