---
status: accepted
---

# Post-run cleanup recovery for partial publication

## Context

CPU run 34853816482 retained 470 complete and 178 failed cells. Two Modal failures had unresolved
cleanup receipts, so even explicit partial publication was blocked. The known Mastra allocation
later became terminal. Better Auth failed after native create returned but before a durable
allocation record was written; its sandbox ID was not retained. Modal's running inventory excludes
finished sandboxes, while its App history can anchor a subsequent inventory to the original account.

## Decision

This refines ADR-0010's historical recovery exception and ADR-0012's cleanup publication gate.
An explicit operator command may append later cleanup evidence to the protected account journal.
It binds the original attempt digest, plan digest, source revision, cell, workflow, operator and
observation time. Original attempts, raw trees and Run digests remain immutable.

For an allocated attempt, recovery requires agreement between its original execution receipt,
retained allocation and durable journal. The exact sandbox must be observed terminal or absent
after any required identity-based teardown. The release retains that reference and the observation.

For the reviewed Modal source `845a0f19b3aa3bda32f0ec988c1d1c188c9e260f` only, the exact gVisor
created-request preparation failure followed by failed destruction may instead use App clearance.
It must have no execution, cleanup or retained allocation receipt and no measurement started.
Source inspection establishes that native create returned in the `sandbox-benchmarks` App before
this failure. A sandbox from the same frozen experiment must appear in that App's server-side history,
anchoring credentials and environment. Two complete V1/V2 running inventories must both be empty.
The record identifies App clearance, never an invented sandbox identity or a claim of non-allocation.
This is not a general exception for interrupted or unknown creates.

The original workflow must have completed. All local account writers must be stopped, and repository
workflow quiescence is checked before observations and immediately before the append. Concurrent
journal changes reject recovery. Foreign resources are never removed; benchmark-App clearance is
separate from account-wide admission, whose foreign-resource gate remains unchanged.

Collection obtains recovery evidence only from matching durable intent/allocation/release records,
and writes it outside the original raw tree. Original artifacts cannot supply later recovery files.
Both aggregation and promotion independently validate the binding to original attempts. Run v8
retains `experiment.cleanupRecoveries` alongside the original frozen partial coverage. Recovered
attempts remain failed, with no retained measurements; strict publication still refuses them.

## Consequences

Verified measurements from other cells can be published after ownership is resolved without
pretending that failed workload execution succeeded. Recovery is explicit and idempotent and never
runs as an automatic publication fallback. Other identifier-free failure signatures need their own
reviewed evidence and policy before they can use an exception.
