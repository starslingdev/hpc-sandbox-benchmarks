# @sandbox-benchmarks/runloop

Owns the runloop driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

`src/artifact.ts` (`./artifact`) builds the Blueprint from the digest-pinned toolchain base and sweeps
same-name predecessors only after the successor is built.

Run `bun run --filter @sandbox-benchmarks/runloop test` or `typecheck` from the repo root.
