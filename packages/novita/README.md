# @sandbox-benchmarks/novita

Owns the Novita driver, its `novita-sandbox` dependency, and its tests. The fleet loader selects
this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter: `@sandbox-benchmarks/driver/vendor/e2b-protocol`'s
  `e2bProtocolVendor` (the E2B protocol adapter E2B's package shares) over the loaded SDK, stating
  only Novita's differences: the regional control plane (`us-phx-1.sandbox.novita.ai`), an SDK that
  takes no signal (so guest calls are bounded by the 5 s request timeout and check the caller's
  signal first), a 300 s create request bound and an explicit 60 s command timeout. The shared
  adapter carries the `sandbox-benchmarks-attempt` metadata marker, the server-side marker query for
  ambiguous-create recovery, `paused` as live but not ready, an unknown state as failed (owned and
  killed, never released), `kill` as proof of removal, refusal classes (authentication, invalid
  argument, rate limit; only a rate limit is retryable), root-user commands and files, and native
  background launch with a process-id check.
- `src/index.ts` loads the SDK's CJS build once and binds it in `defineVendorDriver`. Readiness,
  cleanup confirmation, inventory, recovery and the disk proof come from
  `@sandbox-benchmarks/driver/vendor`.
- Listings are filtered to live states and resumed from the SDK's continuation token (more pages
  without a token fails closed); a held session's teardown is a single `kill`.
- The account key rides only the SDK's `apiKey` option, never custom headers, which the SDK would
  forward to the guest daemon.

`src/artifact.ts` (`./artifact`) builds the template from the digest-pinned toolchain base with the
SDK's Template API on the same regional control plane, masking PTS's phoromatic units.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives
sessions through the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/novita test`
or `typecheck` from the repo root.
