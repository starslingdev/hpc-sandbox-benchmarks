# @sandbox-benchmarks/e2b

Owns the E2B driver, its `e2b` SDK dependency, its template builder, and their tests. The fleet
loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives the SDK's statics and translates them: a create of the
  resolved template for a three-hour lifetime, stamped with the ownership marker under the
  `sandbox-benchmarks-attempt` metadata key (the create response proves readiness), `running` and
  `paused` as live states (paused is owned and torn down; a state it does not know is failed, never
  released), `kill` as proven removal, one paginator page per listing resumed from E2B's own token
  (more pages without a token fails closed), a server-side metadata query as the recovery lookup,
  typed refusals (authentication, invalid argument, rate limit; only a rate limit is retryable),
  root foreground commands that keep E2B's nonzero-exit envelope (also from another copy of the
  SDK, read by shape), native background launch accepted only with a positive pid and no command
  timeout, and the root file API. Control-plane calls are bounded at 5 s.
- `src/index.ts` binds the SDK in `defineVendorDriver`. The template pins 4 vCPU / 8 GiB and the
  kit proves the platform-fixed disk after boot.

`src/artifact.ts` (`./artifact`) builds the E2B template from the digest-pinned toolchain base through
the pinned `@e2b/cli`, over an injectable build-command transport.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives sessions
through the module's `specFor` seam and its production binding. `src/compatibility.test.ts` pins the
ComputeSDK bridge's type inference over the published `@computesdk/e2b` wrapper. Run
`bun run --filter @sandbox-benchmarks/e2b test` or `typecheck` from the repo root.
