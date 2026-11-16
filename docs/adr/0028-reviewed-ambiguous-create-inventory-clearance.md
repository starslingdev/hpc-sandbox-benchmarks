---
status: accepted
---

# Reviewed inventory clearance for name-free ambiguous creates

This adds one reviewed operator command for unresolved ambiguous creates that retained no sandbox
name or allocation. [ADR-0019](./0019-not-allocated-intent-recovery.md) still refuses vendor
creates whose cleanup is not already `not-allocated`. [ADR-0025](./0025-runcloud-named-cleanup-recovery.md)
still governs a Runcloud create whose diagnostic retained the unique pre-POST name.
[ADR-0027](./0027-createos-reviewed-create-rejection.md) remains CreateOS-only.

## Context

CPU run 43793708054 (source `606c3e9eb4d3f83ac5f9d15ed2b04f80b8878467`) left unresolved intents on
runcloud (`cpu-node` r1 and `system` r0) and freestyle (`memory` r0 and r2). Create either did not
settle within 30s or returned HTTP 502 with an unconfirmed outcome; failed-create cleanup also
failed; no `allocation.json` and no unique name were retained in the diagnostic. Both adapters
declare `provesAbsence: false`, so an empty lookup cannot prove the POST was never accepted.
Admission has refused later smokes on those accounts.

Freestyle `memory` r1 retained `allocation.json` and is not this exception; recover it with
`recover-allocated-intent` / `recover-experiment-cleanup`.

The same clearance later covers Provider smoke 43859473792 (source
`987b4cba3eb94e92d52af5c9f45cd07c9f0538d8`) freestyle `system` r0, whose harness create raced
the unconfirmed POST at 5 minutes and retained no allocation or slug in the diagnostic
(`Sandbox creation timed out; allocation ownership unresolved`). Two empty inventories remain
the proof; the original attempt stays failed.

## Decision

`recover-ambiguous-create-inventory --exclusive-account <provider> <suite> <attempt>` may append
the ordinary `released` / `not-allocated` record for a reviewed attempt only. All of these must
hold:

- The attempt is exactly one of the reviewed originals: its id, cell, workflow run, source
  revision, failed outcome with no measurement, unresolved cleanup, unknown completion, no
  execution or cleanup receipt, no retained allocation, and a verified raw tree.
- Its single create-failure marker and its diagnostic carry exactly the reviewed detail.
- The journal holds that attempt's matching intent and nothing else.
- The original workflow has completed and no workflow is queued or running.
- Two complete provider inventories, with that quiescence check between them, hold no
  benchmark-owned sandbox at all. So even if a timed-out or 502 create had landed, nothing could
  remain allocated behind the released intent.

It never calls a provider mutation and never rewrites the original attempt, which stays failed.
Other revisions, generic create failures, empty inventories without this pin, and attempts that
retained an allocation stay unresolved.

## Consequences

Runcloud and freestyle admission can reopen for later smokes once every reviewed intent on that
account is released. Any other unresolved intent still needs identity-based recovery or its own
review. Freestyle inventory and r1 teardown still require `FREESTYLE_API_KEY`.
