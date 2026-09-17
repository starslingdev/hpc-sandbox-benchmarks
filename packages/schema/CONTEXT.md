# Benchmark experiments

This context names the planned work and evidence used to establish a benchmark comparison.

## Language

**Experiment plan**:
The frozen selection of providers, workloads, logical replicates, eligible metrics, revisions and
resource policy that defines a complete comparison.

**Logical replicate**:
One planned sandbox measurement identified independently of any attempt to execute it. Repeating an
attempt does not add a new logical replicate.

**Execution attempt**:
One effort to perform a logical replicate, including its allocation, measurement and cleanup outcome.
A failed or interrupted attempt remains part of the experiment's evidence.

**Retained allocation**:
The sandbox identity an execution attempt keeps in its digest-verified raw evidence as soon as the
provider returns it, before anything executes. It proves which resource the attempt owned even when
the account journal never recorded the allocation.

**Eligible metric**:
A metric admitted by the experiment plan and not covered by its reviewed exclusions. Other collected
measurements may remain diagnostic evidence without contributing to that comparison.

**Comparison cohort**:
The workload revisions, execution environment, pass policy, requested resources and eligible metrics
that must agree for scores to be compared.
