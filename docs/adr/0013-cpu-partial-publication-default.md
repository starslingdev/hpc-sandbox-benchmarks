---
status: accepted
---

# CPU workflow defaults to verified partial publication

## Context

CPU run 34853816482 collected 470 complete and 178 failed cells. Its automatic dataset publication
failed because the workflow omitted `allow_partial`, selecting strict completeness. The operator
requested both publication of this run and a default that retains verified partial CPU results.

## Decision

This refines only ADR-0012's CPU workflow default. CPU benchmark exposes a boolean `allow_partial`
input enabled by default and forwards its value unchanged to the reusable dataset workflow.
Disabling it requires complete coverage. CLI commands, standalone backfills and reusable callers
that omit the input retain strict defaults.

All ADR-0012 evidence checks remain mandatory in both aggregation and promotion. Partial Runs retain
the frozen denominator, every shortfall and the partial label; enabling publication cannot make
unverified measurements eligible.

## Consequences

Fully collected CPU runs with verified measurements can be committed despite individual workload
failures. They remain incomplete comparisons, and provenance or cleanup failures can still block
publication. Operators can request strict completeness in the dispatch form.
