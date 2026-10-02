# Brezel driver

This package connects Starsling's sandbox benchmark to a self-hosted
[Brezel](https://github.com/infercrane/brezel) endpoint through the public
`@infercrane/brezel` SDK.

Required configuration:

- `BREZEL_API_URL`: HTTPS URL of the qualified Brezel API.
- `BREZEL_API_KEY`: bearer token for the benchmark project.
- `BREZEL_PROJECT_ID`: a project used only by Starsling.
- `BREZEL_ENVIRONMENT_REVISION`: immutable, operator-prepared environment revision containing the
  benchmark toolchain and configured for the 4 vCPU / 8 GiB target.

## Layout

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives a `fetch` transport and translates Brezel's API:
  record states to phases, the `Idempotency-Key` create and `benchmark-delete-<id>` delete, the
  environment-revision admission check, refusal statuses, and `/bin/bash -lc` execution.
- `src/index.ts` binds `globalThis.fetch` in `defineVendorDriver`. Readiness, cleanup confirmation,
  inventory, ambiguous-create recovery and the disk proof come from `@sandbox-benchmarks/driver/vendor`.
- `src/index.test.ts` tests the translation, runs `vendorContract` over a fake HTTP router, and
  drives sessions through the module's `specFor` seam.

## Ownership and evidence

The dedicated-project requirement is load-bearing. Brezel does not currently attach arbitrary
benchmark labels to sandboxes, so the driver declares a dedicated account: inventory treats every
sandbox without confirmed backend removal visible to this token and project as benchmark-owned, and
an ambiguous create is recovered by replaying its Idempotency-Key. Never point the driver at a
project containing user workloads.

The environment is deliberately recorded as `artifact: none`: Starsling neither builds nor
publishes the environment revision. Results are not comparable publication evidence until the
revision, Linux/KVM endpoint, request shape, cleanup, and full benchmark run are qualified and the
result bundle records those facts.

A create acknowledgement is not readiness: the driver observes `running` by GET within the
readiness deadline, then rejects an allocation booted from another environment revision.
Allocations expire after two hours on the qualified endpoint; detached execution does not extend
that limit. Control requests honor caller cancellation. Accepted commands run to their bounded
completion before cancellation is reported. Only 400, 401, 403, 404 and 429 create responses are
refusals (429 is retryable); anything else is reconciled. Cleanup retains ownership of failed or
paused records until deletion, expiry, a 404, or an explicit backend verdict confirms absence
(`backend_resource_missing` or `backend_capacity_unavailable`).
