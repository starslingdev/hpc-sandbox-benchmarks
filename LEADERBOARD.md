# Sandbox provider leaderboard

Run `29741364586` · commit `b5e93145866d53d9378fa70823fd7d770e8ee8ae` · generated 2026-07-20T12:28:37.898Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **35 metric records**
backed by **53 retained trial observations**, across **35 metrics** and
**1 provider**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel is the only ranked provider (20.48 runs/s; higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 20.48 | 20.44 – 20.52 | 2 |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel is the only ranked provider (215500 IOPS; higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 215500 | 214000 – 217000 | 2 |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (843 MB/s; higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 843 | 837 – 849 | 2 |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (220500 IOPS; higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 220500 | 213000 – 228000 | 2 |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (863 MB/s; higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 863 | 834 – 892 | 2 |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (10450 IOPS; higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 10450 | 10300 – 10600 | 2 |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel is the only ranked provider (5513 IOPS; higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 5513 | 5270 – 5756 | 2 |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel is the only ranked provider (5515 MB/s; higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 5515 | 5272 – 5757 | 2 |

### Hardlink throughput

bogo ops/s · higher is better

_Blaxel is the only ranked provider (19.38 bogo ops/s; higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 19.38 | 19.36 – 19.39 | 2 |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel is the only ranked provider (125900 MB/s; higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 125900 | 124300 – 127600 | 2 |

### STREAM Add

MB/s · higher is better

_Blaxel is the only ranked provider (126470 MB/s; higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 126470 | 124800 – 128100 | 2 |

### STREAM Copy

MB/s · higher is better

_Blaxel is the only ranked provider (145221 MB/s; higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 145221 | 144400 – 146000 | 2 |

### STREAM Scale

MB/s · higher is better

_Blaxel is the only ranked provider (119600 MB/s; higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 119600 | 118400 – 120700 | 2 |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Blaxel is the only ranked provider (2.771 Seconds; lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.771 | 2.157 – 3.385 | 2 |

### fast.com download

Mbit/s · higher is better

_Blaxel is the only ranked provider (4.5 Mbit/s; higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.5 | 3.3 – 5.7 | 2 |

### fast.com latency

ms · lower is better

_Blaxel is the only ranked provider (3.5 ms; lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 3.5 | 3 – 4 | 2 |

### fast.com loaded latency

ms · lower is better

_Blaxel is the only ranked provider (7 ms; lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 7 | 7 – 7 | 2 |

### fast.com upload

Mbit/s · higher is better

_Blaxel is the only ranked provider (2050 Mbit/s; higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2050 | 2000 – 2100 | 2 |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel is the only ranked provider (25.1 Seconds; lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 25.1 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Blaxel is the only ranked provider (56.97 Seconds; lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 56.97 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel is the only ranked provider (10.82 Seconds; lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 10.82 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (1.354 Seconds; lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1.354 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel is the only ranked provider (3.173 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 3.173 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Blaxel is the only ranked provider (9.902 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 9.902 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Blaxel is the only ranked provider (2.93 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.93 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel is the only ranked provider (2.536 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.536 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Blaxel is the only ranked provider (6.771 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 6.771 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel is the only ranked provider (25.27 Seconds; lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 25.27 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Blaxel is the only ranked provider (41.11 Seconds; lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 41.11 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Blaxel is the only ranked provider (69.48 Seconds; lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 69.48 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (9.148 Seconds; lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 9.148 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Blaxel is the only ranked provider (87.78 Seconds; lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 87.78 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel is the only ranked provider (4.635 Seconds; lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.635 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel is the only ranked provider (9.027 Seconds; lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 9.027 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel is the only ranked provider (39.21 Seconds; lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 39.21 | — | 1 |

## Coverage gaps

28 uncovered results across 4 providers (Daytona 7, E2B 7, Modal 7, Novita 7). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Daytona | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | network | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | network | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | network | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | network | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |

**missing** — nothing was reported at all: no result, and no marker explaining why. The suite ran
elsewhere in this run, so it was part of the comparison, and this provider is simply absent from
it — a dropped job, a lost artifact, or a sandbox that died before it could say anything. Treat it
as unmeasured, never as a pass: the provider has not been shown to run this workload.

</details>

<details>
<summary>How rankings are decided</summary>

The value is the median (p50) of the retained per-trial Samples, not the mean — a single stalled
pass drags a mean far more than it moves a median. The 95% interval is a percentile bootstrap of
that median (10,000 resamples, seeded from the Run id so the table is reproducible byte-for-byte).
It is a descriptive interval conditional on the retained trials, **not a calibrated frequentist
confidence interval**: n is small and within-sandbox trials may be dependent on host scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is
reported separately for distribution *shape* and does not drive the ranking.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

</details>

