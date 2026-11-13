# Modal CPU bursting: Better Auth time and cost (2026-11-11)

Allowing Modal Sandboxes to burst from a four-core request to an eight-core limit reduced
Better Auth's pipeline score by **18.1% on VMs** and **20.7% on gVisor**, while reducing mean
complete-run compute cost by **4.2%** and **6.0%**, respectively. This is a controlled comparison
of two Modal resource policies: three fresh sandboxes per policy and runtime, twelve successful
runs and 120 timed tasks. It is supporting evidence for a separately labeled burst-enabled
comparison, rather than a published cross-provider Run.

## Results

| Runtime | CPU request / limit | Pipeline score (s) | Mean compute cost (USD/run) |
| --- | --- | ---: | ---: |
| VM | 4 / 4 | 151.314 | $0.10732882 |
| VM | 4 / 8 | 123.860 | $0.10280845 |
| gVisor | 4 / 4 | 200.983 | $0.13644580 |
| gVisor | 4 / 8 | 159.320 | $0.12828701 |

The pipeline score is the **sum of the ten per-task medians**, following the
[realworld chart aggregation](../methodology.md#the-realworld-charts). It is not the median
wall time of a single continuous execution. Cost is the arithmetic mean of the **entire
sandbox lifetime**, including setup, preparation, warmups, resets and measured tasks.
It must not be read as the cost of only the seconds in the pipeline-score column.

Each pair below is matched by repetition number, not by physical host. Every pair completed
the same ten tasks, and every burst-enabled run was faster and cheaper than its capped pair.

| Runtime | Repetition | Sum of timed tasks: 4 / 4 → 4 / 8 (s) | Complete-run cost: 4 / 4 → 4 / 8 (USD) |
| --- | ---: | ---: | ---: |
| VM | 1 | 155.584 → 125.286 | $0.10782128 → $0.10345303 |
| VM | 2 | 153.616 → 125.731 | $0.10782105 → $0.10318257 |
| VM | 3 | 151.016 → 122.829 | $0.10634414 → $0.10178976 |
| gVisor | 1 | 202.530 → 162.401 | $0.13744422 → $0.13084530 |
| gVisor | 2 | 201.342 → 157.993 | $0.13741676 → $0.12660275 |
| gVisor | 3 | 197.000 → 158.713 | $0.13447642 → $0.12741298 |

Most of the improvement came from parallel work. These are per-task medians, in seconds:

| Task | VM 4 / 4 | VM 4 / 8 | gVisor 4 / 4 | gVisor 4 / 8 |
| --- | ---: | ---: | ---: | ---: |
| Cold install | 13.224 | 11.920 | 17.505 | 18.323 |
| Build | 53.917 | 40.952 | 63.470 | 46.745 |
| `lint:types` | 23.311 | 13.068 | 44.874 | 22.616 |
| Typecheck | 36.102 | 35.175 | 39.804 | 39.477 |

## Why the larger limit did not increase cost

Modal [bills CPU and memory at `max(request, actual usage)`](https://modal.com/docs/guide/sandbox-resources).
`cpu=(4, 8)` retains the four-core request and billing floor while allowing additional CPU use
when capacity is available. The burst-enabled runs averaged approximately 4.6–4.7 **billed**
cores over their lifetimes, rather than being billed for eight reserved cores throughout.

Mean billed CPU-core-seconds changed from 1162.7 to 1156.7 on VMs and from 1478.3 to 1437.6
on gVisor. Mean metered sandbox lifetime fell from 290.7 to 246.7 seconds on VMs and from
369.3 to 312.0 seconds on gVisor. The eight-GiB memory request therefore cost less as well.

Costs were read from Modal's `SandboxGetStats` API after termination and checked across repeated
reads for stable final usage. They include the measurement workspace's Sandbox rates and a
**1.75× `us-east` region-selection multiplier**, and exclude credits, invoice discounts and
network egress. The effective rates in these responses were approximately
$0.00006897917 per billed core-second and $0.00001166667 per billed GiB-second. These are
measured usage-based compute costs; the leaderboard's published hourly prices are a different
quantity. See [Modal pricing](https://modal.com/pricing).

## CPU counts and the four-vCPU comparison

The [Modal adapter](../../packages/modal/src/shared.ts) sets both the CPU request and limit
to `spec.vcpus`. The limit controls burst headroom: in this study, `nproc` was four for
`cpu=(4, 4)` and eight for `cpu=(4, 8)` on both runtimes. Raising the limit can also increase
the parallelism selected by tools that inspect the visible CPU count. Default thread-count
environment variables followed the limit as well; they were not independently overridden.

Modal documents its CPU parameter in physical-core units. A guest-visible `nproc` value alone
does not establish the host's SMT topology or a universal conversion to another provider's
vCPUs. This experiment raises the resource ceiling; it is not evidence that eight is a
necessary correction for a mislabeled four-core allocation.

The pinned provider adapters request four CPUs, not eight. In
[Run 37073680030](../../data/dataset/runs/37073680030.json), every provider with CPU observations
reports four except Tama. Tama's observed mixtures report 8, 16, 32, 64 or 96 and have
`specMatched: false`; exposed host CPU counts are not proof of dedicated entitlement.
Keep the [host/effective distinction](../adr/0005-host-vs-effective-spec-split.md) when
interpreting those records.

## Workload and collection method

- Date: 2026-11-11. Harness revision:
  [`f571eec3dc1378680f223a365d586f61a4fc6658`](https://github.com/starslingdev/hpc-sandbox-benchmarks/tree/f571eec3dc1378680f223a365d586f61a4fc6658),
  the revision identified by the October 3 reference Run.
- Better Auth revision: `6f3ba45639579da152b69e8e5342e02f28288670`.
- Image tag: `ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8`. The immutable image
  digest was not recorded. Image probes reported Node 22.23.1 and pnpm 10.34.5; the
  repository's package-manager pin selected pnpm 11.1.1 for the workload.
- CPU request: four in all cases. CPU limit: four or eight. Memory request and limit:
  8192 MiB. Region: `us-east`. `experimental_options={"performance_sensitive": True}`
  was enabled in **all** cases. All six VM probes reported AMD EPYC 9655P; gVisor masked
  the CPU model. The hardware policy did not change between the two CPU-limit cases.
- The in-tree Modal Python client reported version 1.6.3. Matching protocol bindings were
  regenerated locally before successful collection. Both runtimes used its current V2
  creation path, with the runtime selected explicitly and verified from the guest kernel.
- Three fresh sandboxes per configuration; up to four independent sandboxes ran concurrently.
  Each sandbox ran one task at a time. The second repetition reversed the limit ordering.
  This does not reproduce the main harness's one-sandbox-at-a-time scheduling policy.
- The original `install.sh`, `realworld-runner.sh`, `openclaw-lint.mjs` and `target.env` were
  copied unmodified into each sandbox. Their Git blob IDs and SHA-256 hashes are in the
  [sample file](./modal-cpu-burst-2026-11-11/samples.json).
- The runner was invoked directly, preserving its preparation, internal warmups, cache
  resets and `REALWORLD_RESULT_SECONDS` timing. PTS orchestration was bypassed. Each
  sandbox contributed one measured sample for each of the ten tasks, in the original order.
- All twelve cold-install logs reported zero reused packages and more than 2000 downloads.
  Both build executions in each sandbox reported zero cached tasks. All 120 measured tasks
  completed successfully, and every measured sandbox was terminated.
- Two initial local SDK setup attempts created eight sandboxes but failed before workload
  execution. Those sandboxes were terminated. They are excluded from the twelve successful
  samples and their reported compute costs; no completed workload measurement was discarded.

These samples compare CPU limits within this setup. The current performance-oriented placement,
Python client, creation path and direct runner invocation differ from the October publication.
Other providers were not rerun. Three repetitions support the descriptive result here, not a
fleet-wide guarantee, statistical ranking against other providers, or a recommendation for an
unlimited ceiling.

## Reproduce the calculations and workload

The [sample file](./modal-cpu-burst-2026-11-11/samples.json) retains all 120 task timings,
per-run resource configuration, host probes and final usage responses. Account, app, task and
sandbox identifiers are omitted from the public export. The standard-library-only analysis
script recomputes the table, checks completeness and verifies costs against billed resource use:

```sh
python3 docs/evidence/modal-cpu-burst-2026-11-11/summarize.py
```

For workload reproduction, retrieve the four files listed in `harness.files` from the exact
`harness.commit` in the sample file. Copy them into `/opt/starsling-profile` in a fresh sandbox,
and create `/opt/starsling-run`. Use the image tag above and these Python SDK resource options,
varying `runtime` over `"vm"` and `"gvisor"`, and `cpu` over `(4, 4)` and `(4, 8)`:

```python
sb = modal.Sandbox.create(
    app=app,
    image=modal.Image.from_registry("ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8"),
    cpu=(4, 8),
    memory=(8192, 8192),
    runtime="vm",
    region="us-east",
    experimental_options={"performance_sensitive": True},
    timeout=3600,
)
```

Inside each sandbox, run the installation and each task sequentially, failing the run if any
command exits nonzero. Keep stdout and stderr, and parse the runner's timing sentinel:

```sh
set -eu
cd /opt/starsling-run
sh /opt/starsling-profile/install.sh
for task in git_clone cold_install build lint_biome lint_deps lint_format lint_spell \
    lint_types lint_packages typecheck; do
    sh /opt/starsling-run/realworld-runner.sh "$task"
done
```

Terminate each sandbox in a `finally` block, including on failure. Collect settled lifetime
usage after termination, separately from the task timers. `SandboxGetStats` access was enabled
for the measurement workspace; it is not a generally available public SDK method. A reproducer
without access needs an equivalent sandbox-level usage export to reproduce the cost comparison.

## Proposal for a burst-enabled comparison

Report **four requested cores / eight maximum cores**, with the request, limit, observed CPU
count, placement options and measured complete-job cost disclosed. The study supports retaining
Modal's elastic behavior when evaluating developer-workload latency and cost together.

That comparison needs an explicit resource policy and cohort label alongside the existing
fixed-size results. An eight-core maximum does not satisfy a four-core maximum, and its samples
must not silently acquire `specMatched: true` under the existing fixed target. Extending the
request/limit evidence contract and offering the same policy to other providers should precede
publishing such a cohort through the normal Run pipeline. These study samples remain supporting
evidence outside that pipeline.
