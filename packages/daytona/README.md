# @sandbox-benchmarks/daytona

Owns the daytona driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

`src/vm/artifact.ts` and `src/container/artifact.ts` (`./vm/artifact`, `./container/artifact`) build
each variant's class-pinned snapshot through `src/snapshot-build.ts`: a transient-registry upload,
then delete-then-create, reported as a `destructive` replacement when a predecessor was deleted.

Run `bun run --filter @sandbox-benchmarks/daytona test` or `typecheck` from the repo root.
