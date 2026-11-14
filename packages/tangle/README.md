# @sandbox-benchmarks/tangle

Owns the Tangle Sandbox driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

The driver boots the shared toolchain image (`artifact: image`) through the SDK's `environment`
field, as an isolated, agent-free, ephemeral sandbox at the target shape.

Run `bun run --filter @sandbox-benchmarks/tangle test` or `typecheck` from the repo root.
