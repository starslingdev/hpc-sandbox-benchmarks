# @sandbox-benchmarks/createos

Owns the CreateOS driver implementation, official SDK dependency, and behavioral tests. The fleet
loader selects this package lazily; shared session mechanics live in
`@sandbox-benchmarks/driver`.

Run `bun run --filter @sandbox-benchmarks/createos test` or `typecheck` from the repo root.
