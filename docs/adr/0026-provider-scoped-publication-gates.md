---
status: accepted
---

# Provider-scoped publication gates

This refines [ADR-0012](./0012-explicit-partial-publication.md) and
[ADR-0014](./0014-post-run-cleanup-recovery.md). Strict publication is unchanged.

## Context

CPU run 43646674451 retained 333 complete and 227 failed cells across eleven providers. Four
CreateOS attempts kept unresolved cleanup after the provider rate-limited their destroys. Under
ADR-0012 a single unresolved cleanup anywhere blocked partial publication of the whole experiment,
so verified measurements from ten providers whose evidence was whole were not published.

Unresolved cleanup is an account-ownership fact about one provider. Account admission already
fences that provider's account until the allocation is recovered. Holding back other providers'
measurements adds no protection.

## Decision

Under explicit partial publication, publication gates have two scopes.

Experiment-wide gates still block every measurement: conflicting evidence (provenance, execution
policy, shard or lineage conflicts), and an experiment with no verified measurement left to publish.

Provider-scoped gates withhold one provider: unresolved cleanup without a recovery record, a missing
Run, a missing raw digest, and missing attempts. That provider retains no measurement. Its planned
cells stay in the frozen partial coverage, keep their attempt links, retain nothing and never count
as complete. Each of its planned suites carries a failed gap that names why it was withheld, so the
leaderboard shows it as withheld rather than scored or silently absent. The denominator never shrinks.

`aggregate-experiment` reports each withheld provider as a warning. Promotion recomputes the same
gates from the original plan and attempts.

Recovery is unchanged and still worthwhile: a later cleanup record releases the gate, and a fresh
backfill then publishes that provider's verified measurements. An explicit repair still refuses to
plan while any original allocation is unresolved.

## Consequences

One provider's leaked or unconfirmed sandbox no longer blocks the leaderboard. The operator must
still clean up that provider's account before its next run, because admission stays fenced.
