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

**Vendored PTS profiles (`src/pts-profiles/<name>-<ver>/`):** the upstream PTS
`test-definition.xml` / `results-definition.xml` for each suite we run, pinned by exact version (the
dir name is the pin). The forthcoming Metric Catalog generator reads these committed copies — the
build never hits the network. Re-pull or add a profile with `bun run fetch-profiles` (a non-build
dev tool; nothing imports it).
