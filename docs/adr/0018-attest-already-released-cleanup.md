---
status: accepted
---

# Attest cleanup after an ordinary account release

## Context

CPU run 35254700103 retained six Runcloud attempts with unresolved cleanup receipts. Admission of
its next batch recovered their exact allocations and appended ordinary `released/absent` records.
The resources were removed, but publication remained blocked: ADR-0014 recovery refused an existing
release without a publication attestation. ADR-0017 documented the same gap after interrupted recovery.

## Decision

Extend explicit post-run recovery with one append-only `cleanup-attested` record when an ordinary
identity-based release already exists. Require exactly one matching intent, allocation and absent
release; reject a release that already embeds recovery evidence. Revalidate the original immutable
attempt, retained allocation and execution identity, check workflow quiescence, observe the exact
sandbox again, and check the journal has not changed before appending.

The supplemental attestation uses the existing cleanup recovery schema. Admission validates its
agreement with ownership history. Collection validates both the journal history and original attempt
binding before attaching it. Aggregation and promotion retain their independent verification. Failed
attempts remain failed and supply no measurements. Unknown creates and not-allocated releases cannot
use this path. Existing embedded attestations remain supported and all recovery paths are idempotent.

## Consequences

Account cleanup no longer permanently prevents later publication recovery. Original releases and
attempt artifacts remain immutable. The new record kind requires deploying compatible journal
readers before writing it: merge the implementation, stop older account writers, then recover and
backfill using current main. Do not rerun an old workflow revision after appending these records.
