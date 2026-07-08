---
status: accepted
---

# Generated PTS catalog behind a drift gate

## Context

Most catalogued Metrics come from the Phoronix Test Suite: their id, unit, direction, and the
`<Description>` that maps a parsed `<Result>` onto a Metric all live in upstream `test-definition.xml`
profiles we vendor verbatim. Hand-transcribing those into `MetricDef`s is error-prone (a wrong unit
or a typo'd description silently routes results to `uncatalogued`) and goes stale the moment a profile
is re-fetched. But the Catalog is also a **stability contract** — ids/units/directions are the keys
that keep historical Runs comparable — so it can't be free to change on a whim either.

## Decision

**Generate the PTS half of the Catalog from the vendored profiles, and hold it byte-stable with a
drift gate.** `generate-catalog` derives `pts-generated.ts` (the XML-owned fields: id, unit,
direction, `pts` provenance, and id-uniqueness) from `test-definition.xml`; a hand-authored
`pts-overrides.ts` supplies only the editorial fields XML can't express (short `label`, the one
`headline:true` per dimension, dimension corrections), merged `{ ...generated, ...override }`.
`check:catalog-drift` fails CI if the committed generated module doesn't match a fresh regeneration,
so the generated file can't drift from its source. The hand-authored harness and economics slices are
appended separately and carry no `pts`, so the generator never touches them.

## Consequences

- Catalog changes are deliberate: editorial tweaks go in the override map (drift gate untouched);
  profile changes require a regenerate-and-commit, which review sees as a data diff.
- The generator owns id-uniqueness and the XML-derived fields; an orphaned override key (a profile
  regen renamed a slug) fails fast at load rather than silently shipping a verbose generated label.
- Adding a PTS suite means vendoring its profile and regenerating — no hand-transcription — at the
  cost of one more generator input to keep correct. `bun run --filter @sandbox-benchmarks/schema
  generate-catalog` then `bun run check:catalog-drift` is part of the gate for catalog changes.
- A synthesized `pts.description` that drifts from real PTS output turns the results golden gate red
  rather than silently misrouting a `<Result>` to `uncatalogued`.
