# @sandbox-benchmarks/boat

Owns the boat (https://boat.dev) driver implementation, SDK dependencies, and behavioral tests.
The fleet loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`. SDK versions are pinned in the root catalog.

Run `bun run --filter @sandbox-benchmarks/boat test` or `typecheck` from the repo root.
