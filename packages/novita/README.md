# @sandbox-benchmarks/novita

Owns the Novita driver, its `novita-sandbox` dependency, and its tests. The fleet loader selects
this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives the loaded SDK and translates it: the regional
  control plane (`us-phx-1.sandbox.novita.ai`), the `sandbox-benchmarks-attempt` metadata marker on
  this shared account, the server-side marker query for ambiguous-create recovery, `paused` as live
  but not ready, an unknown state as failed (owned and killed, never released), `kill` as proof of removal, refusal classes (authentication, invalid argument, rate
  limit; only a rate limit is retryable), root-user commands and files, and native background
  launch with a process-id check.
- `src/index.ts` loads the SDK's CJS build once and binds it in `defineVendorDriver`. Readiness,
  cleanup confirmation, inventory, recovery and the disk proof come from
  `@sandbox-benchmarks/driver/vendor`.
- Listings are filtered to live states and resumed from the SDK's continuation token; a held
  session's teardown is a single `kill`.
- The account key rides only the SDK's `apiKey` option, never custom headers, which the SDK would
  forward to the guest daemon.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives
sessions through the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/novita test`
or `typecheck` from the repo root.
