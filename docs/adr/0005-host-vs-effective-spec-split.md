---
status: accepted
---

# Host-vs-effective spec split

## Context

Every provider is created at one pinned [`TARGET_SPEC`](../../packages/schema/src/providers.ts)
(4 vCPU / 8 GiB) for fairness, but what an in-sandbox probe *sees* varies by provider. Some enforce a
cgroup quota so the sandbox really is 4 vCPU; others run that 4-vCPU sandbox on a large shared host
(e.g. Daytona: a 4-vCPU quota on a 48-thread machine) and the probe can see straight through the
container boundary. If we recorded a single "observed CPU model / vcpu count," a comparison would
silently mix "the sandbox you were sold" with "the box it happened to land on" — and an aggregate over
shards scheduled on different hosts would average across hardware without anyone noticing.

## Decision

**Record observed specs as two explicit sides — effective and host — in one
[`ObservedSpecs`](../../packages/schema/src/run.ts).** `vcpus`/`memoryGb`/`diskGb` are the EFFECTIVE
sandbox size (the cgroup quota where enforced); `hostVcpus`/`hostMemoryGb` disclose the underlying
machine when probes see through the boundary. `cpuModel`/`cpuMicroarch`/`cpuMhz` and friends are
HOST-side by construction — `cpuMicroarch` is a generation label derived from the host `cpuModel`,
and **never reflects the effective spec**. The aggregate path sets `hostCpuModels` — the distinct host
CPU models — when a provider's merged shards disclosed more than one, naming the scheduling confound the
published Run must own. Every field is optional because providers differ in what their probes expose,
and `specMatched` records whether the effective side honored the target.

## Consequences

- A reader can always tell the sold size from the silicon it ran on; price/performance uses the
  effective spec, while the host side explains a fast or noisy number.
- Heterogeneous scheduling is disclosed, not hidden: `hostCpuModels` names the distinct CPUs when a
  provider's shards didn't all land on the same hardware, so the comparison stays honest about that confound.
- More fields to populate, and probes that can't see the host simply leave the host side absent (the
  effective side stands alone) — accepted in exchange for never conflating the two axes.
- The split is encoded in the schema and documented field-by-field, so a new probe/provider must
  decide *which side* a value belongs to rather than dumping it into one ambiguous bucket.
