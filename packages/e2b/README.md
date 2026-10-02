# @sandbox-benchmarks/e2b

Owns the E2B driver, its `e2b` SDK dependency, its template builder, and their tests. The fleet
loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter: `@sandbox-benchmarks/driver/vendor/e2b-protocol`'s
  `e2bProtocolVendor` over the SDK's statics, which take the caller's signal on every call. The
  shared protocol adapter (also Novita's) creates the resolved template for a three-hour lifetime,
  stamped with the ownership marker under the `sandbox-benchmarks-attempt` metadata key (the create
  response proves readiness), reads `running` and `paused` as live states (paused is owned and torn
  down; a state it does not know is failed, never released) and `kill` as proven removal, lists one
  paginator page at a time resumed from the vendor's own token (more pages without a token fails
  closed), recovers by a server-side metadata query, classifies typed refusals (authentication,
  invalid argument, rate limit; only a rate limit is retryable), runs root foreground commands that
  keep the nonzero-exit envelope (also from another copy of the SDK, read by shape), accepts a
  native background launch only with a positive pid and no command timeout, and serves the root
  file API. Control-plane calls are bounded at 5 s.
- `src/index.ts` binds the SDK in `defineVendorDriver`. The template pins 4 vCPU / 8 GiB and the
  kit proves the platform-fixed disk after boot.

`src/artifact.ts` (`./artifact`) builds the E2B template from the digest-pinned toolchain base through
the pinned `@e2b/cli`, over an injectable build-command transport.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives sessions
through the kit's `vendorDriver` and its production binding. Run `bun run --filter @sandbox-benchmarks/e2b test` or `typecheck` from the repo root.
