# @sandbox-benchmarks/microsandbox-cloud

Owns the Microsandbox Cloud driver, its `microsandbox` dependency, and its tests. The fleet loader
selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives the SDK's `Sandbox` statics and backend selector and
  translates them: the ephemeral, size-limited, labelled OCI boot named `bench-cloud-<uuid>` (the
  name is the vendor id and carries the attempt's ownership marker; it is the module's
  `markerSpelling`, which a recovery diagnostic prints), only `running` as usable (a
  stopped, draining or crashed record is owned and removed), stop-before-remove with a bounded wait
  for a wedged `draining` stop, cursor pages, `InvalidConfigError` as the only refusal (never
  retryable), an agent connection that reconnects for the next command but never replays one, and
  the post-readiness `prepare` that proves CPU, memory and root disk from the allocation's own
  config (an in-guest `df` would refuse every correctly sized managed disk).
- `src/index.ts` binds the SDK in `defineVendorDriver` with a 20-minute harness create budget (the
  image pull happens inside create) and the kit's shell detach. Readiness, cleanup confirmation,
  inventory and recovery (a lookup by the create's name) come from `@sandbox-benchmarks/driver/vendor`.

The control-plane credential lives only in the backend selected around each call; it never enters
create options, labels, or the guest environment.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives
sessions through the module's `specFor` seam. Run
`bun run --filter @sandbox-benchmarks/microsandbox-cloud test` or `typecheck` from the repo root.
