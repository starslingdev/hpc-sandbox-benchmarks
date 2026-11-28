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

## Named ambiguous creates, run 43863642458

CPU run 43863642458 (source `8d58408dc4ca36bfae7d9eb83be4b21963562311`) left five intents that
blocked later smokes: runcloud `memory` r1 and freestyle `realworld-mastra` r0, r1, r5 and r7.
Each create timed out, or for freestyle r7 returned HTTP 409 with an unconfirmed outcome.
Failed-create cleanup also failed. None retained `allocation.json`. Unlike the earlier cases, each
diagnostic retained the unique pre-POST name or slug. The same proof clears them: two complete
inventories with no benchmark-owned sandbox at all cover a landed create under any name. Each
entry is pinned to its exact marker detail, retained name included.

## Tangle Better Auth, run 44468887637

The v8 Better Auth create reached Tangle's host. The host reported unconfirmed cleanup,
and the runner retained neither its generated sandbox name nor an allocation receipt.
Tangle correlated the original workload to a single resource. Its controller later reaped
the resource as absent. The host supplied no physical kill timestamp. Tangle's compute and
customer ledgers show zero charges for the resource. [Original attempt artifact](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/44468887637/artifacts/14504847110).

The benchmark owner receives the reviewed vendor receipt privately. Stop local account
writers and run the following with the Tangle account's credential and the original
attempt artifact extracted into its own directory.

```sh
bun apps/cli/src/bin/recover-ambiguous-create-inventory.ts --exclusive-account \
  --vendor-attestation /private/tangle-attestation.json \
  tangle realworld-better-auth /path/to/original-attempt
```

The command checks the original attempt and receipt against the digests pinned in the
review. Each pass checks that the authenticated customer matches the original, that a
direct lookup returns absent, and that the account's complete inventory contains zero
benchmark-owned sandboxes. It rechecks workflow quiescence and the intent before appending
one `released/reconciled` record. The public journal retains the two digests. The original
failed run contributes zero measurements.

### Addendum: Tangle inventory-only clearance (vendor receipt unavailable)

Tangle cannot supply the private vendor receipt above. The same reviewed attempt may instead be
released with `--inventory-only`, which replaces the receipt-based resource and customer probes with
the freestyle and runcloud proof: two complete account inventories, with the quiescence check
between and after them, hold no benchmark-owned sandbox at all, and the intent is unchanged
throughout. The pins stay: attempt, plan and source digests, and the attempt-artifact digest. The
command takes exactly one of `--vendor-attestation` or `--inventory-only`, and the latter applies to
this attempt only.

The release is `released/reconciled` with `tangle-inventory-clearance` evidence (attempt digest,
operator, `confirmedAt`). It is never `not-allocated`: the create did reach Tangle's host. The
operator is the GitHub actor running the command.

Residual risk, accepted on review: an empty inventory proves nothing is allocated now, not that the
create never billed. Past billing rests on Tangle's earlier statement that its compute and customer
ledgers show zero charges for the correlated resource, which we cannot independently verify without
the receipt. A resource that still existed would appear in the inventory and block the release.

### Addendum: Daytona VM arm missing image, run 45952135262

CPU run 45952135262 left one Daytona intent, `daytona-vm-arm-memory-r0-a1-492db90a-a65c-44af-86bb-74f21e6f71a7`
(source `f26ecf06029e1224930d8602d8e952fede4c4aa6`). Its create failed with
`image 'sandbox-benchmarks-toolchain-v9-arm' not found`, and the failed-create cleanup callback could
not confirm the outcome, so the attempt carries no sandbox identity and `cleanup: unresolved`. The
account's v2 image list holds no `-arm` image at all (only the `v9`, `v9-zen5`, `v9-zen5-burst` and
`v9-container` artifacts in `us-east-ash-1`), so the create was refused before anything was allocated.
That one unresolved intent stopped admission for the whole `daytona` account and withheld every
Daytona variant's measurements from the run.

The attempt is pinned like the freestyle and runcloud entries: provider, suite, attempt, cell, run,
source SHA and the exact failure detail. The proof is unchanged: two complete `daytona-vm-arm`
inventories, with quiescence checks between and after them, must hold no benchmark-owned sandbox
before the `not-allocated` release is appended. The failed attempt contributes zero measurements.
