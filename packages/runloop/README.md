# @sandbox-benchmarks/runloop

Owns the Runloop driver, its `@runloop/api-client` dependency, its Blueprint builder, and their
tests. The fleet loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives a client and translates the Devbox API: the custom
  size create from the resolved Blueprint, named by its ownership marker and stamped with the
  `sandbox-benchmarks` and `sandbox-benchmarks-attempt` metadata keys (either one marks ownership),
  statuses as phases (`shutdown` and `failure` tombstones are gone, since Runloop never forgets a
  Devbox; a suspended Devbox is owned and shut down), forced shutdown as removal, Stainless cursor
  pages, typed refusals (authentication, bad request, rate limit; only a rate limit is retryable),
  execute-and-await commands that keep a withheld exit unknown and refuse truncated output, native
  async launch, and the file API. Commands run as the Blueprint's unprivileged user.
- `src/index.ts` binds the SDK in `defineVendorDriver`. The kit observes `running` by retrieve
  within the 20-minute harness create budget, proves the root disk with a 1 GiB filesystem-overhead
  allowance, and recovers an ambiguous create by matching the attempt marker over the drained
  account (no server-side metadata filter exists).

`src/artifact.ts` (`./artifact`) builds the Blueprint from the digest-pinned toolchain base and sweeps
same-name predecessors only after the successor is built.

`src/index.test.ts` tests the translation, runs `vendorContract` over a fake client, and drives
sessions through the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/runloop test`
or `typecheck` from the repo root.
