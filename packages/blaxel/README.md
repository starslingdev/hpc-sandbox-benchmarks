# @sandbox-benchmarks/blaxel

Owns the Blaxel driver, its `@blaxel/core` dependency, its image builder, and their tests. The
fleet loader selects this package lazily. SDK versions are pinned in the root catalog.

The driver is written against the vendor port (ADR-0023):

- `src/vendor.ts` is the adapter. It receives `SandboxInstance`'s statics and translates them: the
  memory-coupled shape (2048 MB per vCPU) with a sized ephemeral volume at
  `/mnt/benchmark-volume`, the sandbox name as identity and ownership marker (`benchmark-<uuid>`,
  also written as the `sandbox-benchmarks-attempt` label beside the `sandbox-benchmarks` owner
  label; a sandbox is owned only by the owner label or that name shape, never by an attempt label
  alone), statuses as phases (only DEPLOYED is usable; FAILED and deactivated records are owned and
  deleted; only TERMINATED or the control plane's 404 is removal), structured refusal codes (400,
  401, 403, 422, 429; only 429 is retryable), native process execution that withholds an exit the
  sandbox never reported, and the post-readiness `prepare`: the `benchmark-keepalive` process that
  keeps the sandbox resident (Blaxel suspends one after ~15 s without inbound requests) and the
  reported memory proof.
- `src/index.ts` configures the SDK process-wide and binds it in `defineVendorDriver`, refusing
  shapes off the coupling curve or without a volume before any call and pointing the kit's disk
  proof at the PTS data directory on the volume. Readiness, cleanup confirmation, inventory,
  recovery (a lookup by the create's name) and the disk proof come from
  `@sandbox-benchmarks/driver/vendor`.

The published `@computesdk/blaxel` wrapper is not used: its `list()` fails against
`@blaxel/core` 0.3.5 and its `destroy` swallows every failure.

`src/artifact.ts` (`./artifact`) pushes the digest-pinned toolchain base to Blaxel's remote builder
with `bl push` (`slim = false`), over an injectable build-command transport.

`src/index.test.ts` tests the translation, runs `vendorContract` over a stub SDK, and drives
sessions through the module's `specFor` seam. Run `bun run --filter @sandbox-benchmarks/blaxel test`
or `typecheck` from the repo root.
