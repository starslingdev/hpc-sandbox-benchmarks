---
status: accepted
---

# Modal admission scoped to the benchmark App

## Context

CPU run 35008234357 blocked all 36 Modal synthetic cells before allocation because another
App had active sandboxes. Both Modal drivers already create and identify owned sandboxes in
the dedicated `sandbox-benchmarks` App. Requiring the entire account to be empty prevents this
App from operating alongside unrelated applications. The operator requested App-scoped admission.

## Decision

Refine ADR-0011: the shared `modal` quota domain uses benchmark-scoped admission for both
`modal-gvisor` and `modal-vm`. The existing `sandbox-benchmarks` App remains the ownership
boundary. Sandboxes in other Apps remain foreign and are never removed by reconciliation;
their presence alone does not block benchmark allocation.

Keep complete inventory, per-variant ownership validation, journal recovery, confirmed cleanup,
and the shared Modal account queue and capacity limits. Incomplete inventory, uncertain cleanup
and unexpected benchmark-owned allocations still block admission. No workload or timing policy changes.

## Consequences

Benchmark App admission no longer depends on unrelated Apps becoming empty. An App separates
ownership, not account quotas or physical compute capacity. Provider quota refusals still produce
failed attempts. The frozen experiment revision binds this policy: existing runs require a new
Modal experiment to use it. All other ADR-0011 scopes remain unchanged.
