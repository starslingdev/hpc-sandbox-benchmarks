---
status: accepted
---

# Host-vs-effective spec split

## Context

Every provider is created at one pinned [`TARGET_SPEC`](../../packages/schema/src/target-spec.ts)
(2 vCPU / 8 GiB) for fairness, but what an in-sandbox probe *sees* varies by provider. Some enforce a
cgroup quota so the sandbox really is 2 vCPU; others run that 2-vCPU sandbox on a large shared host
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
and **never reflects the effective spec**. Every field is optional because providers differ in what
their probes expose, and `specMatched` records whether the effective side honored the target.

**Amended (Run schema v4): the document describes itself.** Six facts a reader needed were present in
the dataset but not expressible *from* it — each recoverable only by knowing something the file did not
say. Run 30510718771 makes the cost concrete: modal-vm's 12 realworld replicates were spread over **ten**
CPU models, Intel and AMD across five EPYC generations, under a single `specMatched: true` and a headline
`cpuModel` that appears in 10 of its 78 host records. v4 records what was missing:

- **[`ObservedMixtures`](../../packages/schema/src/run.ts)** — per provider, `sandboxes` (the
  denominator) plus two maps from a stable content hash to `{ count, specs }`, one for **host hardware**
  and one for **host network** (egress ASN/org + geo). `Object.keys(hostHardware).length` *is* the number
  of distinct machine shapes observed; each `count` is how many sandboxes landed on it. The prior
  mitigation, `hostCpuModels`, covered one field of one category and answered "were they different?"
  rather than "how many, and how many sandboxes each?" — so it was REMOVED rather than kept beside the
  mixtures: nothing ever read it, and arktype ignores undeclared keys, so published Runs carrying it
  still validate.
- **`MetricReplicate.hostHardwareId` / `hostNetworkId`** — the join from a sample cluster to the machine
  that produced it. Both halves of "is the Intel leg slower than the EPYC leg?" were already in the
  document with nothing connecting them. `providerRunSchema` narrows the ids to resolvable keys: a
  dangling id and an absent one both read as `undefined` at the point of use, and only one is honest.
  The same two ids also sit on **`MetricResult`** for a Metric measured on a SINGLE sandbox, because
  `replicates` exists only at ≥2 clusters — without them the join went missing exactly where the
  breakdown is absent, and a provider whose suites each landed one sandbox published its mixtures with
  nothing pointing at any of them. The two levels are mutually exclusive: a Metric-level id claims one
  machine for every Sample, which a breakdown contradicts.
- **A dominant representative reading** — `observedSpecs` on an aggregate was "first defined value per
  key wins", i.e. shard arrival order, which on a mixed fleet publishes a machine most sandboxes never
  ran on. The hashed-category fields now come from the mixture the MOST sandboxes reported.
- **`ResultGap.cause`** — a closed, discriminated taxonomy (`disk-shortfall`, `step-timeout`,
  `sandbox-lost`, `metrics-unrecorded`, …) authored where the failure happens. `reason` had been the
  machine interface as well as the human one, so the leaderboard classified disk skips with
  `/^insufficient disk/i` against a string authored in another package — a coupling its own comment
  warned about. There is deliberately no catch-all arm: an unclassifiable gap omits `cause`, which reads
  as "unclassified" and cannot be mistaken for a diagnosis.
- **`MetricResult.derived`** — `usd_per_hour` sat among the measurements looking like one, separable only
  by a Metric Catalog lookup, and a Run outlives the catalog version that produced it. Mandatory from v4;
  optional-in-practice would leave consumers keeping the lookup anyway.
- **Host records folded and attributed** — each record carries `sandboxes` and its machine's mixture id.
  The old dedupe kept byte-identical records only and every PTS record carries a wall-clock
  `ci.timestamp`, so it never fired: host metadata was 54% of the committed dataset while describing a
  handful of machines. Folding on the non-volatile fields cuts it by 54% (468 records → 203 on run
  30510718771).
- **Per-machine `specMatched`** — one boolean cannot cover a ten-machine fleet. Each host-hardware
  mixture carries its own verdict, and a narrow enforces that the provider's fold is never kinder than
  its parts. The network mixture type has no such field at all: the target spec says nothing about
  egress, so a network mixture must not be able to claim a verdict.

Two rules make the mixture categories trustworthy rather than merely present:

- **`ObservedSpecs` is composed from the category field groups**, not written flat with the groups
  listed separately. A new field must join a group to exist at all, so it cannot be silently absent
  from every hash while the key lists still look complete.
- **Per-sandbox identity fields are excluded from both hashes** (`publicIp`, `reverseDns`, `user`).
  Hashing a unique-per-sandbox value would mint one "mixture" per sandbox and report every count as 1,
  destroying the signal. `networkPrefix` carries the address-space dimension instead.

## Consequences

- A reader can always tell the sold size from the silicon it ran on; price/performance uses the
  effective spec, while the host side explains a fast or noisy number.
- Heterogeneous scheduling is counted, not just flagged: the mixture maps name every distinct machine
  shape and egress network with a sandbox count each, so "how mixed was this provider" is arithmetic
  rather than inference. Hash ids are content-addressed, so the same shape carries the same id across
  runs and can be tracked through the dataset series.
- The between-machine axis is decomposable: because every replicate names its mixture, a consumer can
  group a metric's sample clusters by host and ask whether the spread is the provider's variance or the
  hardware's. That question was unanswerable from a published Run before v4. Below two clusters there is
  no spread to decompose, but the Metric still names its machine, so "which host produced this number"
  is answerable at every R.
- The counts are bounded by their own denominator: a category's `count`s sum to at most `sandboxes`.
  Falling short is a real, visible partial disclosure (a probe that saw nothing contributes no mixture);
  exceeding it would describe a fleet that never existed, so the schema refuses it rather than leaving
  every proportion a reader computes open to being arithmetic on a lie.
- The provider-level `specMatched` is still one boolean, but it is now the FOLD of the per-machine
  verdicts as well as the per-shard ones (a single `false` is sticky), and the schema refuses a provider
  verdict kinder than its parts. "Which machine missed the target" is answered by the mixtures.
- Pre-v4 unreachability is by construction, not by extra rules: a replicate id must resolve into
  `observedMixtures` and a mixture's `specMatched` lives inside one, so the single v4 gate on
  `observedMixtures` already refuses both. No redundant per-field gates to keep in sync.
- The host-vs-effective split stays documented field-by-field, but the effective size shares the
  hostHardware hash category: a provider handing out 4 vCPU on some sandboxes and 2 on others is
  exactly the heterogeneity this disclosure exists to surface, so it belongs in "which machine did I
  get". The two sides remain separately labelled within the group.
- Counts sum to less than `sandboxes` when some sandbox's probe saw nothing, which is a visible partial
  disclosure rather than a silent one — a category is omitted entirely rather than recording an empty
  mixture nobody observed.
- More fields to populate, and probes that can't see the host simply leave the host side absent (the
  effective side stands alone) — accepted in exchange for never conflating the two axes.
- The split is encoded in the schema and documented field-by-field, so a new probe/provider must
  decide *which side* a value belongs to rather than dumping it into one ambiguous bucket.
