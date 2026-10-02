# @sandbox-benchmarks/e2b

Owns the e2b driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

`src/artifact.ts` (`./artifact`) builds the e2b template from the digest-pinned toolchain base through
the pinned `@e2b/cli`, over an injectable build-command transport.

Run `bun run --filter @sandbox-benchmarks/e2b test` or `typecheck` from the repo root.
