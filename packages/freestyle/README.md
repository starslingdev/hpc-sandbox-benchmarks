# @sandbox-benchmarks/freestyle

Native [Freestyle](https://www.freestyle.sh/docs/vms) VM driver; the SDK is pinned in the root catalog.
Set `FREESTYLE_API_KEY` and pin `FREESTYLE_SNAPSHOT_ID` to a private immutable `sh-…` ID.
Freestyle is included in the default CPU benchmark selection; `bench-smoke` or the CLI can select
`freestyle` explicitly for a targeted run. The driver verifies the booted snapshot ID.

Freestyle uses a native baked snapshot, installed directly in Ubuntu 24.04 from the shared toolchain
recipes and pins. It supports scoped bake/backfill and remains outside `RELEASE_REQUIRED`,
which is independent of the default CPU benchmark selection.
Ubuntu packages and the VM kernel differ from the shared Debian 13 image; disclose that difference
when comparing results. See [ADR-0021](../../docs/adr/0021-freestyle-native-snapshots.md).

Every exec starts with the system mise shims and a clean system PATH, without shell startup files,
NVM globals, or inherited Node injection variables. The recipe also removes stock Node and Python
global-tool symlinks from `/usr/local/bin`, which otherwise survive a PATH reset, and removes the
replaced stock runtime trees so Mastra has the required free disk space on the standard 40 GiB disk. This prevents the stock global
`typescript-language-server` from changing Mastra's binary-not-found test. A workload can still set
its own Node options explicitly.

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
- Driver conformance snapshots capture memory and disk, are explicitly deleted, and have a ten-minute
  TTL. Baked release snapshots request no expiry and reject a plan-imposed expiry.
  Outbound public traffic is allowed for setup and benchmarks.

Create a candidate with credentials loaded (Bun reads `.env`):

```sh
BAKE_REPORT_FILE=/tmp/freestyle-bake.json bun apps/cli/src/bin/bake.ts --provider freestyle --require freestyle
```

The builder records the actual immutable stock base ID, recipe SHA-256 and requested shape in
`/freestyle-snapshot-build.json`, retains `/freestyle-snapshot-setup.sh`, runs shared toolchain smoke,
captures a persistent snapshot and validates a fresh boot. The report records its immutable ID.
GitHub anonymous quota failures retry for up to twenty minutes while keeping mise's attestation
verification enabled. Transient PTS result servers stop before capture.
Set `FREESTYLE_BASE_SNAPSHOT_ID` to that recorded base ID to regenerate from the same base. The recipe
fetches PTS install definitions from the catalog's fixed upstream Git revision and skips PTS's
repository-wide cache scan; payload verification and all installed-profile checks remain enabled.
It seeds the same definitions in `ubuntu`'s own PTS state while sharing the baked installed payloads,
so the runtime user can resolve every pinned profile without a fresh OpenBenchmarking download.

Promotion revalidates and snapshots the exact candidate ID without reinstalling; it rejects a changed
recipe or an existing version name. Replaced candidate IDs remain available for pinned experiments.
Use the returned ID for `FREESTYLE_SNAPSHOT_ID` and the frozen planner's `BENCH_ARTIFACT_FREESTYLE`.
Actions derives the planner input from the repository variable `FREESTYLE_SNAPSHOT_ID`.
The [default-matrix promotion evidence](../../docs/freestyle-default-matrix-2026-09-30.md) records
the native release, driver diagnostics, complete diagnostic suite coverage and main-branch Mastra
smoke, including `realworld_mastra_task_test_core`. The smoke used the promoted snapshot ID.
Default collection does not establish replicated coverage: each experiment still validates its own
attempts, artifact identity, metric coverage and cleanup before publication.

Actions requires a dedicated benchmark account, `FREESTYLE_API_KEY` in `privileged`, and a protected
`benchmark-account-journal-freestyle` branch: follow [account admission setup](../../docs/benchmark-execution-rollout.md#account-admission-before-live-rollout).
For branch smoke validation, set `allow_branch=true` and permit that ref in the environment.

Run `bun run --filter @sandbox-benchmarks/freestyle test` or `typecheck` from the repo root.
With credentials, check the real harness and cleanup without publishing results:

```sh
bun apps/cli/src/bin/driver-check.ts --provider freestyle --require-pass --workload-seconds 305
```
