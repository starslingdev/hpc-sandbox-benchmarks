---
status: proposed
---

# Audited unstarted recovery batches

## Context

Recovery run 36969794621 retained valid replacement measurements, but Vercel authentication
failed before the executor. Its 36 cells have no execution attempts. ADR-0022 currently blocks
this case along with lost executor artifacts. Repeating a frozen recovery cannot fix provider
credentials or change its historical driver revision.

## Decision

Extend ADR-0022 only for a verified prerequisite failure in a completed recovery workflow.
The collector fetches the complete latest GitHub Actions job inventory and protected Vercel
account journal. It binds the exact batch, workflow revision, workflow attempt, source plan,
operator and job. Authentication must have failed and the sole allocating step, Run suite and
normalize, must have been skipped. No matching attempt artifact or journal ownership record
may exist. Incomplete inventories, duplicate jobs and contradictory evidence fail closed.

The exception supports only reviewed recovery revision
`de63d929211cd0b416372e11f1dd71e63b99fa0d` with checked-out execution revision
`8d12320592d858202f46648b903bf4e5a75d086f` (including its local setup/auth actions). Other revision pairs require independent
review before being admitted; step names alone cannot establish that no other step allocated.

The digest-bound receipt is platform evidence, not an execution attempt or a metric. Missing
cells remain missing in Run v8, with the original denominator and explicit partial policy.
No metric stitching or missing-attempt placeholders are introduced. Aggregate and promote
independently verify the receipt. Ordinary experiments and strict publication keep their gates.
Lost artifacts after execution and unresolved cleanup still block publication.

## Consequences

Retained measurements can be published without another paid benchmark dispatch when platform
and ownership evidence proves that a batch never executed. The dataset remains partial;
credentials must be repaired before a later recovery can fill the remaining gaps. This decision
supersedes ADR-0022's unconditional missing-replacement-artifact block only for this case.
