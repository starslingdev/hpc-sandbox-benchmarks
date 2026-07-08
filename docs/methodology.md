# Methodology

How a number in this repo's dataset is produced, and the caveats that keep it comparable across
providers and over time.

## North star

Compare sandbox **providers** (`e2b` / `daytona` / `modal`), not bare-metal hardware. Every provider
is asked to run the same workloads on the same pinned spec, and the results are normalized into one
schema-validated dataset.

## Target spec

Every provider is created at one pinned [`TARGET_SPEC`](../packages/schema/src/providers.ts): **2 vCPU,
8 GiB RAM, 20 GB disk**. It's sized to fit inside every provider's reproducible envelope (E2B caps
sandbox RAM at 8 GiB), so anyone can rerun on the same shape. A provider that can't express a dimension
runs with its actuals recorded and the mismatch disclosed (`specMatched`).

## Dimensions and metrics

Results land on a closed, ordered set of [`DIMENSIONS`](../packages/schema/src/metrics.ts): `lifecycle`,
`control-plane`, `cpu`, `disk`, `memory`, `network`, `system`, `realworld`, `economics`. Each catalogued
[`MetricDef`](../packages/schema/src/metrics.ts) declares its `dimension`, `unit`, `direction` (HIB =
higher-is-better, LIB = lower-is-better), and whether it `headline`s its dimension. The leaderboard
shows exactly one headline metric per dimension (enforced at catalog load).

Metrics come from three sources:

- **PTS-derived** — generated from vendored Phoronix Test Suite profiles (see the
  [ADR-0003](./adr/0003-generated-pts-catalog-and-drift-gate.md)). The generator owns the
  XML-derived fields and id-uniqueness; a hand-authored override map supplies editorial fields.
- **Harness-measured** — lifecycle (spawn/exec/snapshot/teardown) and control-plane (info/list)
  timings PTS can't see, measured directly around the provider SDK calls.
- **Derived (economics)** — never measured; computed from pricing + measured runtime (below).

## Economics ($/run)

The `economics` dimension is the price/performance axis. It's `derived` — computed at normalization
from each provider's published, vetted pricing
([`hourlyCostAtTargetSpec`](../packages/schema/src/providers.ts)) plus the runtime already on the Run:

- `usd_per_hour` (headline) — hourly cost at the target spec; the comparison denominator.
- `usd_per_lifecycle` — hourly cost × the summed measured lifecycle timings; emitted only when a Run
  carries lifecycle metrics.

A provider with no vetted rate emits no economics (a null rate must never read as free). Economics
enriches a provider that already produced ≥1 measured metric — it never promotes a `pending` provider.

## Host vs. effective specs (the host-fingerprint caveat)

`ObservedSpecs` splits what a Run saw into two sides:

- **Effective** (`vcpus`/`memoryGb`/`diskGb`) — the sandbox's actual size (cgroup quota where enforced),
  from the in-sandbox spec probe.
- **Host** (`hostVcpus`/`hostMemoryGb`/`cpuModel`/…) — the underlying machine, parsed from the PTS
  composite's `<System>` block.

In a container `<System>` discloses the **host** (e.g. a 48-thread EPYC), not the 2-vCPU sandbox quota.
The normalizer therefore maps `<System>` only to the host side and merges it **under** the spec probe,
so a host disclosure can never masquerade as the sandbox's effective size. Forensic logs are captured as
a `*--forensics.tar.gz` tarball (a tarball, not loose files, so nested `.xml` can't be misrouted).

PTS `MONITOR`/sensor data is deliberately **not** collected: it's host-level (unattributable per
provider) and its empty-`<Identifier>` `<Result>` nodes would abort extraction — the producer unsets
`MONITOR`.

## Transport model

Providers differ in how their `@computesdk/*` adapter executes a command. Each declares a
[`ProviderTransport`](../packages/schema/src/providers.ts) capability (`streaming`, `syncCapMs`,
`detachedPoll`), and the harness selects a transport per step: a step that could outlast the provider's
synchronous cap runs **detached + poll** where supported, everything else runs directly. This is why a
multi-minute suite completes on a single-round-trip-capped provider (e.g. Daytona's server-side HTTP 408)
without being Daytona-specific.

## The dataset pipeline

1. **Run** — `bench-suite <provider> <suite>` boots a sandbox, runs the suite's mise tasks, pulls the
   raw tree (`data/raw/<runId>/<provider>/<suite>/`), and normalizes it into a Run document.
2. **Matrix** — the `bench-matrix` workflow fans `plan-matrix` (provider × suite) out into one job per
   cell, each uploading its shard Run as an artifact.
3. **Aggregate → promote** — the `publish` job collects every shard, `aggregate`s them into one
   candidate Run (measured metrics unioned, economics re-derived from the merged set), then `promote`s
   it (gate: ≥1 validated provider) into the committed dataset at `data/dataset/` with a newest-first
   index.
4. **Leaderboard** — `leaderboard` renders the published Run into a ranked Markdown table per dimension.
5. **Stability gate** — `stability <prev> <cur>` flags any provider metric that shifted beyond the noise
   threshold across Runs, comparing only provenance-matched (same `appVersion` + `arguments`) metrics.

Every Run is validated against the schema at the producer boundary, so no malformed Run reaches a
consumer. The whole pipeline is reproducible: a committed `bun.lock`, vendored PTS profiles, and a
byte-stable catalog held by the drift gate.
