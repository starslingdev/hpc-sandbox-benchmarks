# Methodology

How a number in this repo's dataset is produced, and the caveats that keep it comparable across
providers and over time.

## North star

Compare sandbox **providers**, not bare-metal hardware. Every provider is asked to run the same
workloads on the same pinned spec, and the results are normalized into one schema-validated dataset.

Where a vendor exposes more than one **isolation technology**, each is a first-class provider variant
so the comparison attributes results to the isolation the sandbox actually used: `daytona-vm` (a
`SandboxClass.LINUX_VM` microVM) vs `daytona-container` (a Sysbox/OCI container), and `modal-gvisor`
(Modal's default gVisor runtime) vs `modal-vm` (Modal's gVisor-free VM runtime). Each provider's
declared isolation is the authoritative label and is shown in the leaderboard's **Providers in this
run** roster, beside a best-effort **detected** class from an in-sandbox probe (gVisor kernel marker;
a cgroup quota far below the disclosed host ⇒ container; a self-sized hypervisor ⇒ VM). The probe
cannot separate every type — a container and a microVM can both report `kvm`; gVisor and a microVM can
both report `unknown` — so it is only a cross-check that flags a declared/detected contradiction, never
a source of truth.

## Target spec

Every provider is created at one pinned [`TARGET_SPEC`](../packages/schema/src/providers.ts): **4 vCPU,
8 GiB RAM, 40 GB disk**. 8 GiB RAM fits inside every provider's reproducible envelope (E2B caps sandbox
RAM at 8 GiB); vCPU is pinned at 4 because Blaxel couples CPU to RAM (8 GiB forces 4 vCPU there), so
targeting 4 lets every provider — Blaxel included — match on the same shape. A provider that can't express a dimension
runs with its actuals recorded and the mismatch disclosed (`specMatched`). Its measurements stay in the
rankings, but the leaderboard flags the provider with an explicit **Comparability warning** naming its
observed allocation, so its ranks are never read as like-for-like with the compute-matched providers.

Vercel exposes only a vCPU resource knob and derives memory at 2048 MB per vCPU, so requesting four
vCPU reaches the 8 GiB target as a coupled point. Its SDK does not expose a disk-size knob; available
disk is measured in the guest and disk-gated suites skip honestly when the observed mount is too small.

## Dimensions and metrics

Results land on a closed, ordered set of [`DIMENSIONS`](../packages/schema/src/metrics.ts): `lifecycle`,
`control-plane`, `cpu`, `disk`, `memory`, `network`, `system`, `realworld`, `economics`. Each catalogued
[`MetricDef`](../packages/schema/src/metrics.ts) declares its `dimension`, `unit`, `direction` (HIB =
higher-is-better, LIB = lower-is-better), and whether it `headline`s its dimension. A dimension has at
most one headline metric (enforced at catalog load); the leaderboard ranks *every* emitted metric and
leads each dimension with its headline.

### How the leaderboard is laid out

Which sections exist is driven by the data — a dimension no provider emitted is simply absent — but the
order and the emphasis are editorial, and they follow this document's argument:

- **`realworld` leads.** Synthetic scores say what the hardware *can* do; the real-world suites say what
  a developer or a CI job actually waits on, which is the question the benchmark exists to answer.
- **The synthetic microbenchmarks collapse.** `cpu`, `disk`, `memory`, `network` and `system` each load
  one hardware axis in isolation, so their tables render inside a collapsed `<details>`. The `##`
  heading stays outside it: a measured axis must never look like one that never ran.
- **Everything else stays expanded.** `lifecycle` and `control-plane` are harness-measured timings of
  the provider's own API — a spawn a user waits on, not a synthetic load — and `economics` is the
  provider's published price. None is a microbenchmark, so none is hidden.

The header links each identifier to its primary source: the run id to the `bench-matrix` workflow run
that produced the measurements, the commit to the tree they were measured against, and the dataset link
to the committed Run document the tables were rendered from — so any number on the page can be traced
back to its raw Samples. (A Run spliced from two CI runs — a composite `<runA>+<runB>` id, see
[`data/dataset/index.json`](../data/dataset/index.json) — links each half separately; no single workflow
run owns the pair.) The order, the collapse, and the links are all gated
against the committed artifact by `tooling/repo-checks/src/leaderboard-artifact-sync.test.ts`.

Metrics come from three sources:

- **PTS-derived** — generated from vendored Phoronix Test Suite profiles (see the
  [ADR-0003](./adr/0003-generated-pts-catalog-and-drift-gate.md)). The generator owns the
  XML-derived fields and id-uniqueness; a hand-authored override map supplies editorial fields.
  A `<Result>` maps onto the catalog by its versionless test + `<Description>`; profiles whose
  parsers post several scales under one description (fio: bandwidth + IOPS from a single run) get
  one metric per scale, disambiguated by a `pts.scale` pin the mapping also matches on.
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

In a container `<System>` discloses the **host** (e.g. a 48-thread EPYC), not the 4-vCPU sandbox quota.
The normalizer therefore maps `<System>` only to the host side and merges it **under** the spec probe,
so a host disclosure can never masquerade as the sandbox's effective size. Forensic logs are captured as
a `*--forensics.tar.gz` tarball (a tarball, not loose files, so nested `.xml` can't be misrouted).

PTS `MONITOR`/sensor data is deliberately **not** collected: it's host-level (unattributable per
provider) and its empty-`<Identifier>` `<Result>` nodes would abort extraction — the producer unsets
`MONITOR`.

## Transport model

Providers differ in how their `@computesdk/*` adapter executes a command. Each declares a
[`ProviderTransport`](../packages/schema/src/providers.ts) capability (`streaming`, `syncCapMs`,
`detachedPoll`), and the harness selects a transport per step: a step that could reach the integration's
synchronous durability threshold runs **detached + poll** where supported, everything else runs directly.
That threshold may be a measured/vendor limit (for example Daytona's server-side HTTP 408) or a
conservative policy where one long connection is unvalidated. Vercel uses a 60-second policy threshold,
so 20–80-minute suites such as Mastra launch detached and remain observable through short polls.

## The dataset pipeline

1. **Run** — `bench-suite <provider> <suite> <runId> --replicates <indices>` boots one sandbox per
   replicate index (concurrently, from one process), runs the suite's mise tasks in each, pulls the raw
   trees (`data/raw/<runId>/r<idx>/<provider>/<suite>/`), and normalizes each into its own shard Run
   document (`data/runs/<runId>-r<idx>.json`) stamped with that replicate index. `--replicate <idx>` is
   the single-sandbox spelling, writing the un-suffixed `data/runs/<runId>.json`.
2. **Matrix** — the `bench-matrix` workflow plans three axes (`plan-providers` / `plan-suites` /
   `plan-replicates`), then one suite-matrix job calls the reusable `bench-suite` workflow per suite
   (GitHub-native nesting: `<suite> / <provider>`), fanning out over the selected providers; each
   `(provider, suite)` cell drives that suite's whole replicate fleet itself and uploads all its shard
   Runs as one artifact. **Replicates are not a runner axis.** A bench runner is idle for essentially
   its whole life — it creates a sandbox and polls it — so a runner per replicate billed R idle runners
   to do one runner's work (324 runners where 54 suffice, at the shipped defaults). Driving the fleet
   in-process leaves the sandbox count, provider load, and wall clock unchanged (the cell's wall clock
   is its slowest replicate, not their sum) while the runner bill stops scaling with R. Isolation is
   preserved: every replicate runs to completion and writes its shard even when a peer dies, and the
   cell goes red at the end if any did. Two axes are the statistical knobs, both defaulting to the per-suite schema
   config so a bare dispatch already carries the intended statistical power for separating providers
   (subject to the genuine near-tie limit noted below — no sample size resolves providers that are truly
   within a few percent):
   - **replicates** — R sandboxes per cell, the between-machine axis (`replicas` blank = each suite's
     `Suite.defaultReplicas`: synthetic R=3, realworld **R=12**, sized from the committed dataset's
     observed between-machine variance so realworld provider CIs separate; a number overrides every suite).
   - **PTS passes** — the within-machine axis (`pts_passes` blank = each suite's own policy). The `memory`
     and `cpu-node` suites **converge** via PTS's `DynamicRunCount` — both are cheap or CPU-bound enough that
     convergence settles near its ~3-pass minimum without a runaway. Every other suite keeps a **fixed** pass
     count, because convergence there re-introduces fio's runaway (20–40 runs) on `disk`, timed `system` out
     at its budget on modal-gvisor (SQLite's I/O variance) in a converge run, breaks `iperf`'s fixed-trial
     rule on `network`, or is a k=1 cold-start whose install/build IS the metric (realworld). Everything
     fixed carries its spread via replicates, not in-sandbox repeats; a number or `converge` forces one
     policy across every suite.
3. **Aggregate → promote → commit** — the `commit-dataset` workflow (the matrix's `publish` job calls
   it) collects every shard, `aggregate`s them into one candidate Run (measured metrics unioned, the ≥2
   replicate sandboxes of one `(provider, suite)` folded into per-metric replicate breakdowns, economics
   re-derived from the merged set), then `promote`s it (gate: ≥1 validated provider) into the committed
   dataset at `data/dataset/` with a newest-first index, and opens a PR to land it on `main`. This step
   commits only the machine-readable dataset — it never touches `LEADERBOARD.md`.
4. **Leaderboard** — the `update-leaderboard` workflow renders a chosen committed Run into a ranked
   Markdown table per dimension (`leaderboard`) and opens a PR to update `LEADERBOARD.md`. It is a
   deliberate, maintainer-dispatched step (default: the newest committed run), so the dataset can grow a
   run per matrix run while the public comparison surface only moves when someone updates it. See
   [CI & secrets](./ci-secrets.md) rule 7.
5. **Stability gate** — `stability <prev> <cur>` flags any provider metric that shifted beyond the noise
   threshold across Runs, comparing only provenance-matched (same `appVersion` + `arguments`) metrics.

Every Run is validated against the schema at the producer boundary, so no malformed Run reaches a
consumer. The whole pipeline is reproducible: a committed `bun.lock`, vendored PTS profiles, and a
byte-stable catalog held by the drift gate.
