---
status: accepted
---

# Retry journal write failures and recover a lost not-allocated release

## Context

CPU run 36265300223 stopped Modal admission after `modal-gvisor-pgbench-r1` received
`account journal POST HTTP 500` from the GitHub Git Data API. That cell's intent was never
acknowledged, but admission still stopped. Two later intents (`modal-gvisor-disk-r2` and
`modal-vm-cpu-node-r3`) had already been written. Their creates never started, the attempts
recorded `cleanup: not-allocated`, and the `released` / `not-allocated` appends were lost to the
same class of failure. Those intent-only rows blocked the next admission.

`recover-allocated-intent` requires unresolved cleanup and `allocation.json`.
`recover-experiment-cleanup` requires unresolved cleanup. `recover-completed-create` accepts one
historical marker. `recover-rejected-create` refuses generic create-failure markers because an
empty inventory cannot prove a vendor request was cancelled. Operators had to append the missing
release by hand after checking the attempt evidence.

## Decision

Retry GitHub journal POST and PATCH when the status is HTTP 500–599. Use three attempts and a
bounded backoff (250ms, then 500ms). After the budget, fail with the final status, the GitHub
message, and the attempt count. Do not retry HTTP 4xx. Auth and validation failures still fail
closed. GET is not retried. The existing conditional ref update still retries a rejected
fast-forward only while the parent commit is unchanged; a lost acknowledgement is still settled
by that exact commit, never by forcing the ref.

Add `recover-not-allocated-intent`. It appends the executor's ordinary `released` /
`not-allocated` record only when all of the following hold:

- The attempt is failed, measurement has not started, and cleanup is `not-allocated`.
- The digest-bound raw tree has no allocation, execution receipt, or cleanup receipt.
- Exactly one create-failure marker names this provider, suite, and replicate.
- The marker detail is an executor pre-create stop: admission stopped after another cell, or the
  startup deadline elapsed before create. The marker reason carries that detail, and the attempt
  diagnostic does too.
- The journal still holds exactly that attempt's intent, on the provider's quota-domain account,
  with no allocation and no release.
- The original workflow completed, and repository workflow quiescence is checked before the
  re-read and again immediately before the append.

The command does not call a provider. Ambiguous or vendor create markers stay unresolved. A
retained allocation is refused with a pointer to `recover-allocated-intent`. The original attempt
is not rewritten and remains failed. This is an explicit operator command, never an admission
fallback.

## Consequences

A transient GitHub 500 during an intent, allocation, or release append is replayed before the
account stops. A duplicate commit object can be left unreferenced if the server accepted a POST
whose response was an HTTP 500; the ref still names one tree. An intent that still loses its
not-allocated release can be closed from the attempt artifact without treating empty inventory or
a vendor refusal as proof that create never happened. Creates that reached the vendor keep
blocking admission until identity-based or reviewed recovery.
