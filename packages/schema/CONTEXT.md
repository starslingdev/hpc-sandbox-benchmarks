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

**Native baked snapshot**:
A provider artifact captured from a VM after installing the shared pinned toolchain directly in it.
Its immutable provider ID identifies the captured environment; a mutable release alias does not.
Sharing toolchain pins does not imply identical operating-system packages or kernels.


**Repair experiment**:
An explicitly authorized experiment that replaces every failed or missing logical replicate of an
original experiment as a whole attempt. Its frozen manifest preserves original and replacement
provenance; it never selects measurements based on scores or adds logical replicates.

**Unstarted batch receipt**:
Platform evidence that a recovery batch failed authentication before its allocation step, with no
attempt artifacts or account ownership records. It permits explicit partial publication while
preserving those cells as missing; it contributes no execution attempt or measurement.

**Cost per pipeline run**:
What the timed steps of one run of a realworld pipeline cost on a provider: the median across its
sandboxes. Either a billed share or an estimated cost, never ranked.

**Billed cost**:
What the provider's own billing API charged for one sandbox's whole billed lifetime: boot, setup and
untimed warm-ups included. No bill is never counted as zero.

**Billed share**:
A billed cost × the sandbox's timed pipeline seconds ÷ its billed seconds: the provider's real
billed rate over the window an estimated cost prices.

**Estimated cost**:
The provider's published per-sandbox prices (disk included, plan fees excluded) × pipeline time. _At
most_ the billed share when some charges apply only while in use; _at least_ when usage above the reservation
costs extra.

**Three-pipeline total**:
One environment's cost, or time, for one run each of Mastra, Better-Auth and OpenClaw: the three
medians added up.
