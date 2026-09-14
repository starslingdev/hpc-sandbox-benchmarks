---
status: accepted
---

# Explicit publication of incomplete experiments

## Context

CPU experiment 34781421576 completed with 349 complete and 299 incomplete planned cells.
The operator explicitly requested publication of the verified measurements as partial results.
Discarding those measurements is unnecessary, but publishing an ordinary complete Run would hide
failed workloads, missing trials and provider capacity failures.

## Decision

This supersedes only ADR-0010's blanket refusal to publish an incomplete experiment. Strict
completeness remains the default. Both `aggregate-experiment` and `promote` require an explicit
`--allow-partial` flag for partial publication; promotion independently recomputes the candidate
from the original frozen plan and immutable attempt artifacts.

Run v8 carries `experiment.partial.status: "partial"`, counts and every original planned cell,
including provider, suite, replicate, selected attempt, planned metrics, pass count, shortfalls,
exclusions and retained metrics. Its denominator is never reduced to successful providers or
successful cells. Run v7 continues to mean verified complete coverage; historical versions retain
their original, unverified completeness semantics.

Partial publication relaxes only metric completeness. Plan, raw-tree and Run digests, retry lineage,
terminal attempt collection and resolved cleanup remain mandatory. No measurements are retained from
an attempt whose execution, artifact identity or completion evidence fails validation. Within an
otherwise verified attempt, individually proven positive metrics may be retained despite another
metric's shortfall. PTS measurements must still prove the exact frozen trial count from original
raw evidence. Unknown or retired metric identities cannot acquire a sampling contract by omission.
An experiment with no verified measurements cannot be published.

The dataset retains original provider gaps and adds explicit descriptions for measurements withheld
by verification. The leaderboard prominently labels the experiment partial, shows complete and
incomplete cell counts, and explains that uneven provider coverage prevents a complete comparison.
Absence is never rendered as a zero score. Existing cohort identity does not imply complete coverage.

## Consequences

Partial results are useful evidence, not a readiness certification. Fixing a workload or capacity
failure still requires a fresh benchmark at the corrected revision. The operator must explicitly
choose which committed dataset the leaderboard workflow renders.
