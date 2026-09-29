# @sandbox-benchmarks/freestyle

Native [Freestyle](https://www.freestyle.sh/docs/vms) VM driver; the SDK is pinned in the root catalog.
Set `FREESTYLE_API_KEY` and select `freestyle` explicitly in `bench-smoke` or the CLI.

Like Boat, this driver boots a stock image (`freestyle/ubuntu`) with `artifact: { kind: "none" }`.
The shared harness installs pinned tools at runtime on Ubuntu 24.04. Freestyle is opt-in, excluded
from required releases, and cannot be scoped for artifact backfill. The stock snapshot slug is mutable.

The standard target is **4 vCPU / 8 GiB RAM / 40 GiB disk**. Resizing is grow-only from the snapshot's
4 vCPU / 8 GiB / 32 GiB minimum; create verifies the requested allocation and guest readiness.

- VMs have a six-hour TTL independent of the create deadline, with idle pausing disabled.
- Exec and native files use `ubuntu` (passwordless sudo). Long steps use the shared detached runner.
  Missing exit status remains unknown; accepted synchronous commands settle before caller cancellation
  is reported because the API cannot kill them.
- HTTP 202 polling shares the operation's deadline. Inventory drains all pages within five minutes;
  teardown has 60 seconds to delete and confirm absence. Pausing does not count as deletion.
- Failed-create recovery deletes only an exact attempt-marker match. A lost response remains uncertain
  until ownership and deletion are confirmed; repeated 404s alone do not prove allocation failed.
- Snapshots capture memory and disk, are explicitly deleted, and have a ten-minute TTL.
  Outbound public traffic is allowed for runtime installation and benchmarks.

Actions requires a dedicated benchmark account, `FREESTYLE_API_KEY` in `privileged`, and a protected
`benchmark-account-journal-freestyle` branch: follow [account admission setup](../../docs/benchmark-execution-rollout.md#account-admission-before-live-rollout).
For branch smoke validation, set `allow_branch=true` and permit that ref in the environment.

Run `bun run --filter @sandbox-benchmarks/freestyle test` or `typecheck` from the repo root.
With credentials, check the real harness and cleanup without publishing results:

```sh
bun apps/cli/src/bin/driver-check.ts --provider freestyle --require-pass --workload-seconds 305
```
