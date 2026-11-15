---
status: accepted
---

# Reviewed CreateOS create rejection

This adds one reviewed exception to `recover-rejected-create`, which otherwise refuses every
invocation because legacy create markers cannot distinguish a rejection from an ambiguous create.
[ADR-0019](./0019-not-allocated-intent-recovery.md) still governs every other unresolved intent.

## Context

In CPU run 43646674451 (source `181066d25fa9558474edd0aa9018af1f8cf24ecb`), CreateOS answered one
create with `service unavailable`. The adapter treated it as ambiguous. CreateOS cannot prove
absence by lookup, so failed-create recovery had no verdict, and the account journal kept an
unresolved intent for `createos-realworld-openclaw-r6-a1-4aacfaed-46a7-4808-ac60-4e522dc985f9`.
Admission has refused every CreateOS cell since, in later runs too.

The CreateOS SDK's own contract (`isRetryableStatus` in its http client) is that 429 and 503 mean
the server explicitly did not process the request, for any method. The adapter now classifies a
503 create as a retryable refusal, so this cannot recur. The attempt's evidence, however, records
only the server's text, not the HTTP status. On its own that is not authoritative.

## Decision

`recover-rejected-create --exclusive-account createos realworld-openclaw <attempt>` may append the
ordinary `released` / `not-allocated` record for that one attempt only. All of these must hold:

- The attempt is exactly the reviewed one: its id, cell, workflow run and source revision, a
  failed outcome with no measurement, unresolved cleanup, unknown completion, no execution or
  cleanup receipt, no retained allocation, and a verified raw tree.
- Its single create-failure marker and its diagnostic carry exactly the reviewed detail.
- The journal holds that attempt's matching intent and nothing else.
- The original workflow has completed and no workflow is queued or running.
- Two complete CreateOS inventories, with that quiescence check between them, hold no
  benchmark-owned sandbox at all. So even if the rejection were wrong, nothing could remain
  allocated behind the released intent.

It never calls a provider mutation and never rewrites the original attempt, which stays failed.
Publication is unaffected: the attempt's unresolved cleanup is provider-scoped under
[ADR-0026](./0026-provider-scoped-publication-gates.md).

## Consequences

CreateOS admission reopens once the release is appended. Any other unresolved CreateOS intent
still needs identity-based recovery or its own review.
