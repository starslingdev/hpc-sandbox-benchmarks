---
status: proposed
---

# Explicit repair experiments

## Context

CPU run 36796890905 retained 688 complete cells and 116 failed cells, but 36 Vercel realworld
cells never reached the executor. Cleanup recovery resolved three Boat allocations; partial
publication still correctly refused the missing terminal attempts. GitHub's reusable-job rerun
expanded the workflow graph instead of isolating the missing batch.

ADR-0010 forbids measured reruns and limits retries to allowances frozen in the original plan.
This decision proposes an explicit extension for operator-authorized repairs, including failures
that started measuring. Ordinary execution, retry lineage and partial publication remain unchanged.

## Decision

A separately approved, main-only Recover benchmark dispatch freezes a new experiment containing
**every** failed, cancelled or missing cell from the original verified coverage, and no complete or
excluded cells. The manifest records the operator, reason, original revision/plan/attempt digests,
new workflow/plan identities, and each previous selected attempt. It is uploaded before workers
start. Original conflicts, unknown allocations and unresolved cleanup block planning.

Cells retain their original source revision, workload revision, artifact identity, resources,
metrics, exclusions, replicate index and fixed trial count. Workers check out that exact benchmark
source and execute a fresh plan under the normal account queues, inventory admission, deadlines,
raw persistence and per-cell artifact uploads. Authentication/environment inputs must be corrected
before dispatch; changes to benchmark or driver code require a fresh ordinary experiment.

Publication independently collects the two workflows and their journals, verifies each source
against its own frozen plan, recomputes the entire repair selection, and verifies the manifest.
Each targeted cell uses the replacement whole attempt, even if it still fails or scores worse.
No metric stitching, score-based selection, extra logical replicates, or missing-attempt placeholders
are allowed. Original successful cells retain their original observations. Raw receipts and source
Run documents are never rewritten.

The derived dataset keeps the original run ID and denominator and records `experiment.repair`.
Its presentation cost/artifact cell keys are projected onto that dataset ID only after both source
experiments pass verification; the manifest and selected attempt IDs preserve their source identities.
Cleanup attestations on replaced originals remain in the original journal and are mandatory for
planning, but are not falsely attached to replacement measurements. Later cleanup attestations for failed
replacement attempts retain their own recovery workflow and plan identity. Full verified coverage produces
Run v7; otherwise explicit partial policy produces Run v8. Missing replacement artifacts or unknown
ownership still prevent publication. Aggregate and promote perform the same verification separately.

The original producer and recovery share the CPU workflow lock. Every account retains its existing
queue. A standalone publication backfill must name a completed recovery run; in-workflow publication
runs after all replacement workers terminate. A recovery with no work or beyond the bounded Actions
matrix/account queue limits fails before workers start.

> ADR-0023 extends the missing-replacement gate for audited batches that never executed.

## Consequences

A repair is an explicit conditional remeasurement, not an unbiased first-attempt-only experiment.
Consumers can see that selection in the dataset manifest; successful completion does not erase the
original failures. Repeating the recovery dispatch creates a new repair experiment, never silently
retries measured attempts inside an existing recovery. Source evidence and both workflows' artifacts
must remain retained. Users may choose a new ordinary benchmark when changed code or a comparison
unaffected by failure-conditioned sampling is required.
