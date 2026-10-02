# @sandbox-benchmarks/namespace

Owns the Namespace driver, its generated `@namespacelabs/sdk` clients, and its tests. The fleet
loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives a client (`namespaceClient`, which reads only the
  explicit `NSC_TOKEN_FILE`) and translates the compute and command services: the protobuf create
  (shape, image, guest environment, a 195-minute deadline) whose documented purpose carries the
  attempt's UUID as `sandbox-benchmarks:namespace:<uuid>` (the module's `markerSpelling`, which a
  recovery diagnostic also prints), lifecycle enums as phases (suspended and
  errored instances are owned and destroyed; only DESTROYED or a NotFound is removal; an unknown
  status fails closed), byte pagination cursors, Connect's typed refusal codes (exhaustion is
  retryable), and `RunCommandSync` wrapped in an exit sentinel, because the RPC collapses nonzero
  exits to 1 (a missing trailer is an unknown exit).
- `src/index.ts` binds the client in `defineVendorDriver`. A create acknowledgement is not
  readiness (`RunCommandSync` hangs against a pending container): the kit observes RUNNING by
  describe within 15 minutes, polling every 2 s, and observes DESTROYED within 3 minutes. Disk is
  proven after boot; detached steps use the kit's shell detach under a 120 s synchronous cap.
  Ambiguous creates are recovered by matching the purpose over the drained account. Listings
  include completed runs, because the server-side default (PENDING, CREATING and RUNNING only)
  would hide an ERROR instance that still holds resources; that history accumulates, so the
  account is drained under a 1,000-page cap rather than the kit's default 100.

`src/index.test.ts` tests the translation over the real generated clients and protobuf
serialization (only service behaviour replaced), runs `vendorContract`, and drives sessions through
the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/namespace test` or
`typecheck` from the repo root.
