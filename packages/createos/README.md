# @sandbox-benchmarks/createos

Owns the CreateOS (https://createos.sh/products/sandbox) driver implementation, SDK dependencies,
and behavioral tests. The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

CreateOS quirks the driver is built around:

- `createSandbox` is synchronous: the POST returns only once the Firecracker VM is booted, the guest
  agent is ready and the row is durably `running`, so the create response itself proves readiness.
  The harness's create budget, not a vendor wait option, bounds it (`wait`/`waitTimeoutMs` are
  deprecated no-ops).
- Ownership cannot ride in the sandbox name: the name is the guest's hostname and DNS label, and the
  create response omits `envs`. The driver carries the kit marker in an env key spelled
  `SB_BENCHMARK_<32 hex>` and treats the name only as an inventory hint (`sbbench-<14 hex>`), so a
  listed row whose name looks ours but whose `envs` are missing is re-read by id before it is
  attributed — otherwise a leak from an earlier run would be counted as a foreign sandbox.
- The item view and the account listing move independently. A create whose response was lost (or a
  delete in flight) can 404 on `GET /v1/sandboxes/:id` while the listing still holds the row, so a
  read that 404s cross-checks the listing: a terminal row is a tombstone, a live row is reported
  `deleting` only when this session asked for the delete, and anything else reads as absent rather
  than holding a teardown open on a sandbox we never deleted. `provesAbsence` is false for the same
  reason.
- Deletion is asynchronous: `destroy` reports `destroying` and the row survives as a `destroyed`
  tombstone, which rejects further deletes. Only `destroyed` (or a 404) is removal evidence;
  acceptance is not.
- `paused` means snapshotted to storage with the host freed, so an owned paused allocation is a
  failure to clean up, not a ready sandbox. Auto-pause is therefore never requested, and `error`
  asks for a fresh create once the failed allocation is gone.
- `devbox:1` exposes `python3` through an ASDF shim that Phoronix's sanitized environment cannot
  resolve, so the post-create provider step links the installed interpreter into `/usr/local/bin`
  before the harness starts. That fix is provider-local: it never touches the shared harness,
  another provider, or the catalog image.
- Create asks for `s-4vcpu-8gb`, `devbox:1`, the requested overlay size and unmetered egress `*`;
  the library has no cost API, so there is no cost evidence.

Run `bun run --filter @sandbox-benchmarks/createos test` or `typecheck` from the repo root.
