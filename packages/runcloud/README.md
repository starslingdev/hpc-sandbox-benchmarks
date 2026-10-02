# @sandbox-benchmarks/runcloud

Owns the run.cloud driver, its `@run-cloud/sdk` dependency, and their tests. The fleet loader
selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives a transport (the SDK's sandbox calls plus one raw
  inventory page) and translates it: a create of the resolved image at the requested CPU, memory
  and disk, named and idempotency-keyed `sandbox-benchmarks-<uuid>` (the marker's spelling) before
  the request; a lost response is answered by READING that exact name (never by replaying the
  create) and a sandbox the create did allocate is adopted, oldest first (a definitive 4xx gets one
  confirming look, anything else five, 2 s apart); typed refusals (a non-timeout, non-conflict 4xx;
  only a 429 is retryable, and its status reaches account admission); `destroyed` tombstones as
  gone and `destroying` as still live; a boot that ends `failed`, `interrupted`, `destroying` or
  `destroyed` as one the host gave up on (the per-sandbox rootfs build corrupts under concurrent
  load), so the failed create is retryable once teardown is proven, while `stopped` is not; the
  vendor's `last_error` in the boot failure (redacted by the bridge); the allocation's reported CPU
  and memory; a network failure or a timed-out, conflicting, rate-limited or 5xx call as `transient`, so a refused
  DELETE is asked again at every removal read and a create that failed this way is retryable once
  teardown is proven; and WebSocket exec. Calls inside create are raced
  against a 30 s bound and the caller.
- `src/index.ts` binds the SDK in `defineVendorDriver`. Readiness and removal are read every 2 s
  (20 minutes for a cold image pull, 50 s for a delete, inside the harness's 60 s destroy timeout);
  the disk quota is proven with 3 % of the request allowed for filesystem overhead; the
  inventory reads the raw 200-row envelope, because the SDK's `list` drops its cursor, under a
  1,000-page cap. `recovery.provesAbsence: false`: a timed-out POST can land after every lookup, so
  only removing the allocation its name finds releases the attempt. Cost evidence records honestly
  that run.cloud's usage API is organization-wide (`src/cost.ts`). The durable route is the kit's
  shell detach; there is no filesystem API in the measurement path.

`src/index.test.ts` tests the translation, runs `vendorContract` over a fake account, drives
sessions through the module's `specFor` seam, and checks the real transport's inventory envelope.
Run `bun run --filter @sandbox-benchmarks/runcloud test` or `typecheck` from the repo root.
