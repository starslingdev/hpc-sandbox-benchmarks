# `lib/probe` — in-sandbox probes

A **probe** answers one question about the sandbox a benchmark is running in, for the provenance
attached to every number that benchmark produces. Probes are sourced by the mise tasks under
[`.mise/tasks/benchmark/**`](../../.mise/tasks/benchmark); they are libraries, not tasks, and the
distinction is deliberate (see [Why libraries](#why-libraries-and-not-more-mise-tasks)).

| Probe | Question | Entry points |
| --- | --- | --- |
| [`egress.sh`](./egress.sh) | Which network does this sandbox leave from, and where is it? | `egress_probe`, `egress_report` |
| [`isolation/`](./isolation) | What is actually confining this workload? | `isolation_collect`, `isolation_classify`, `isolation_dind`, `isolation_report` |

Both are driven by [`benchmark:system:provider`](../../.mise/tasks/benchmark/system/provider), which
composes them into one `system-provider.json` record. Each also has a report-only task leaf
(`benchmark:system:provider:egress`, `…:isolation`) for running one half on a live sandbox.

## `isolation/` — a pipeline, numbered in dependency order

`main.sh` is the entry point: it declares the signal/verdict contract, the shared primitives, and
sources the stages. The numeric prefixes are the source order, so the pipeline is legible from `ls`
alone and a new stage slots in at an unused number.

| File | Role |
| --- | --- |
| `main.sh` | Entry point: the `ISO_*` signal contract, the verdict globals, shared primitives |
| `10-rules.sh` | **Data** — the scoring tables every detection is expressed in |
| `20-collect.sh` | **Stage 1** — read the machine (`/proc`, `/sys`, `/dev`, dmesg) into signals |
| `30-classify.sh` | **Stage 2** — score the signals into a verdict. Pure: touches no filesystem |
| `40-dind.sh` | **Stage 3** — can a container run *inside* this sandbox? Passive |
| `50-report.sh` | **Stage 4** — render the human evidence table |

The collect/classify boundary is the load-bearing one. Stage 2 reads nothing but the globals stage 1
set, which is what makes a verdict reproducible from a committed record and testable against recorded
signal sets for hardware nobody has to own. **Keep filesystem access in `20-collect.sh`.**

## Conventions

- **Prefixes are namespaces.** Every symbol a probe defines is prefixed (`ISO_*`/`_iso_*`,
  `egress_*`/`_*`): sourcing shares one shell namespace with `bench.sh`, the task, and any sibling
  probe.
- **Globals are the output contract.** Each file carries a `# shellcheck disable=SC2034` header
  saying so, because the values it assigns are read by the caller, never by itself.
- **Probes never write results.** Producing the artifact is the task's job. A probe that wrote one
  could race the task for the file the normalizer reads by exact name.
- **Tolerant, never fatal.** A probe reports what the sandbox exposes; a missing tool or an
  unreadable path is a recorded absence, not an abort.

## Why libraries, and not more mise tasks?

A mise task is a process that communicates through stdout; a library is sourced and shares state.
`isolation`'s collect→classify contract is ~50 shared signal globals plus a purity guarantee over
them — across a process boundary that becomes a serialization format to marshal out and back in, and
`mise run` dispatch measures ~190ms against ~140ms of actual probe work, so splitting the stages into
tasks would more than quadruple the probe's cost inside a benchmark's budget.

The process boundary belongs at the *runnable surface* instead, which is what the task group under
`.mise/tasks/benchmark/system/provider/` is: one task per thing you'd want to run on its own.

## Adding a probe

1. Add `lib/probe/<question>.sh` (or a `<question>/` pipeline if it needs stages), exposing
   `<question>_probe` and `<question>_report`.
2. Source it from the task that needs it and add its fields to that task's `RECORD_FIELDS`.
3. Add a report-only leaf under the task's group directory if the probe is useful on its own.
4. Publish a field only when it is consumed downstream, an input to a classification, or its output —
   the reasoning `benchmark:system:provider` records in its header.
