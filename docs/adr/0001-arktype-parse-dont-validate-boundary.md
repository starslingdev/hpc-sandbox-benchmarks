---
status: accepted
---

# arktype parse-don't-validate boundary

## Context

The repo ingests data from outside its own types at several edges: harness `RawRun` output, vendored
PTS `<Result>` XML, jc/fio/free probe JSON, `observed-specs.json`, per-shard Run documents merged at
aggregation, and the committed dataset itself. A `RawRun | Run` JSON file on disk is `unknown` until
something checks it. Hand-written TypeScript interfaces describe the *intended* shape but enforce
nothing at runtime — a malformed artifact would flow deep into normalization before failing (or
worse, succeed and publish a corrupt number), and the interface and any ad-hoc validator would drift.

## Decision

Every external boundary is an **arktype schema, and the TypeScript type is inferred from it** — one
source of truth for shape *and* runtime check. The schema is the gate: a value is *parsed* into a
typed value at the boundary (`parseRawRun`, `parseRun`, `aggregatesSchema`, `metricDefSchema`,
`observedSpecsSchema`, …), and code past that point receives an already-validated value, never an
`unknown`. Schemas also carry invariants the type system can't: `finiteNumber` narrows reject
NaN/Infinity, `catalogSchema.narrow` makes the dangerous wildcard catalog shape unconstructable, and
the Catalog `.assert`s at module load so a malformed `MetricDef` is a fail-fast at import.

## Consequences

- No interface/validator drift: there is exactly one declaration of each boundary shape, and `infer`
  keeps the static type honest to the runtime check.
- Failures are loud and early — a bad artifact fails *at the boundary* with an arktype summary, not
  three layers deep in aggregation. The promote gate relies on this: a Run that can't parse can't be
  published.
- arktype is the schema package's only external dependency (bottom of the DAG, ADR-0002), so the
  whole repo shares one validation vocabulary and adds no other runtime dep to get it.
- Validation is paid at every boundary crossing. For repo-scale data (hundreds of KB per Run) this is
  negligible, and the alternative — trusting `unknown` — is what we are explicitly buying out of.
</content>
