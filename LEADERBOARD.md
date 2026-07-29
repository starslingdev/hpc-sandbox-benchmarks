# Sandbox provider leaderboard

Run [`30322186937`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30322186937) · commit [`769743f75f2d0c55fd51b01ec5f026bdcdba774c`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/769743f75f2d0c55fd51b01ec5f026bdcdba774c) ·
dataset [`data/dataset/runs/30322186937.json`](data/dataset/runs/30322186937.json) · generated 2026-07-28T05:35:57.390Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **298 metric records**
backed by **2980 retained trial observations**, across **44 metrics** and
**7 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

**Document order:** the real-world developer workflows lead, because what a developer or a CI job
actually waits on is what this benchmark exists to measure. The synthetic microbenchmarks (`cpu`, `disk`, `memory`, `network`, `system`)
load one hardware axis in isolation — a real question, but a different one — so each is collapsed by
default; expand a section to read its tables.

## Providers in this run

Each provider's isolation technology — the **declared** technology is authoritative; **detected**
is a best-effort in-sandbox probe that cannot separate every isolation type (a container and a
microVM can both read `kvm`; gVisor and a microVM can both read `unknown`), shown only as a
cross-check.

| Provider | Isolation (declared) | Detected |
| --- | --- | --- |
| Blaxel | microVM | vm |
| Daytona (VM) | microVM (Linux VM) | vm |
| E2B | Firecracker microVM | vm |
| Modal (gVisor) | gVisor container | gvisor |
| Modal (VM) | microVM (VM runtime) | vm |
| Namespace | microVM (dedicated instance) | vm |
| Novita | microVM | vm |

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 20.56 | 20.12 – 21.6 | 12 | — |
| 2 | Daytona (VM) | 26.35 | 26.21 – 26.58 | 12 | — |
| 2 | Blaxel | 26.52 | 26.27 – 27.65 | 12 | tied |
| 4 | Modal (VM) | 35.43 | 34.71 – 40.78 | 12 | — |
| 4 | Novita | 36.35 | 33.53 – 42.47 | 12 | tied |
| 6 | Modal (gVisor) | 74.24 | 65.42 – 78.62 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 46.05 | 45.38 – 46.44 | 12 | — |
| 2 | Daytona (VM) | 53.99 | 53.35 – 54.76 | 12 | — |
| 3 | Blaxel | 60.04 | 56.64 – 61.14 | 12 | — |
| 4 | Modal (VM) | 79.47 | 69.84 – 93.49 | 12 | — |
| 4 | Novita | 79.79 | 72.41 – 85.23 | 12 | tied |
| 6 | E2B | 97.66 | 94.21 – 101.9 | 12 | — |
| 7 | Modal (gVisor) | 143.6 | 142.1 – 149.2 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM), Blaxel and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 10.11 | 9.963 – 10.72 | 12 | — |
| 1 | Blaxel | 10.6 | 10.33 – 10.9 | 12 | tied |
| 1 | Namespace | 11.39 | 8.856 – 11.72 | 12 | tied |
| 4 | Novita | 12.51 | 11.66 – 13.36 | 12 | — |
| 5 | E2B | 17.27 | 17.13 – 17.76 | 12 | — |
| 5 | Modal (VM) | 17.32 | 13.89 – 18.43 | 12 | tied |
| 7 | Modal (gVisor) | 31.08 | 29.89 – 33.77 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.505 | 0.4885 – 0.5965 | 12 | — |
| 2 | Blaxel | 0.6635 | 0.591 – 0.7995 | 12 | — |
| 3 | Modal (VM) | 0.792 | 0.7355 – 1.035 | 12 | — |
| 4 | E2B | 1.393 | 1.286 – 1.519 | 12 | — |
| 4 | Daytona (VM) | 1.481 | 1.348 – 1.733 | 12 | tied |
| 6 | Novita | 2.082 | 1.98 – 2.38 | 12 | — |
| 7 | Modal (gVisor) | 2.744 | 2.224 – 3.104 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.655 | 2.517 – 2.699 | 12 | — |
| 2 | Daytona (VM) | 3.043 | 2.992 – 3.107 | 12 | — |
| 3 | Blaxel | 3.251 | 3.181 – 3.297 | 12 | — |
| 4 | Novita | 3.995 | 3.764 – 4.213 | 12 | — |
| 4 | Modal (VM) | 4.339 | 4.061 – 4.715 | 12 | tied |
| 6 | E2B | 5.252 | 5.181 – 5.328 | 12 | — |
| 7 | Modal (gVisor) | 11.74 | 11.24 – 13.61 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 7.998 | 7.593 – 8.067 | 12 | — |
| 2 | Blaxel | 9.989 | 9.781 – 10.28 | 12 | — |
| 2 | Daytona (VM) | 10.3 | 9.582 – 10.54 | 12 | tied |
| 4 | Novita | 12.95 | 12.65 – 15 | 12 | — |
| 4 | Modal (VM) | 13.96 | 13.3 – 16.02 | 12 | tied |
| 6 | E2B | 18.59 | 17.97 – 18.76 | 12 | — |
| 7 | Modal (gVisor) | 31.78 | 29.73 – 36.28 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.182 | 2.144 – 2.216 | 12 | — |
| 2 | Daytona (VM) | 2.848 | 2.708 – 2.998 | 12 | — |
| 2 | Blaxel | 2.903 | 2.814 – 3.05 | 12 | tied |
| 4 | Novita | 3.502 | 3.372 – 4.059 | 12 | — |
| 5 | Modal (VM) | 4.236 | 3.715 – 4.848 | 12 | — |
| 6 | E2B | 5.262 | 5.139 – 5.416 | 12 | — |
| 7 | Modal (gVisor) | 7.753 | 7.469 – 8.794 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.031 | 1.921 – 2.067 | 12 | — |
| 2 | Daytona (VM) | 2.377 | 2.342 – 2.412 | 12 | — |
| 2 | Blaxel | 2.425 | 2.376 – 2.506 | 12 | tied |
| 4 | Novita | 3.181 | 2.999 – 3.364 | 12 | — |
| 4 | Modal (VM) | 3.443 | 3.157 – 3.945 | 12 | tied |
| 6 | E2B | 4.183 | 4.131 – 4.296 | 12 | — |
| 7 | Modal (gVisor) | 11.51 | 11.09 – 11.85 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.277 | 5.219 – 5.316 | 12 | — |
| 2 | Blaxel | 6.875 | 6.677 – 7.157 | 12 | — |
| 2 | Daytona (VM) | 7.189 | 6.657 – 7.474 | 12 | tied |
| 4 | Novita | 8.635 | 8.328 – 10.02 | 12 | — |
| 5 | Modal (VM) | 10.07 | 8.979 – 11.95 | 12 | — |
| 6 | E2B | 13.26 | 12.53 – 14.27 | 12 | — |
| 7 | Modal (gVisor) | 16.89 | 15.92 – 19.32 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.15 | 23.17 – 24.97 | 12 | — |
| 1 | Namespace | 24.23 | 23.53 – 24.48 | 12 | tied |
| 3 | Blaxel | 26.28 | 25.02 – 27.41 | 12 | — |
| 4 | Modal (VM) | 37.57 | 33.35 – 45.32 | 12 | — |
| 4 | Novita | 37.76 | 34.91 – 43.86 | 12 | tied |
| 6 | E2B | 49.48 | 46.91 – 52.03 | 12 | — |
| 7 | Modal (gVisor) | 113.4 | 109.2 – 119.4 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 30.05 | 29.71 – 30.96 | 12 | — |
| 2 | Daytona (VM) | 38.08 | 37.2 – 38.78 | 12 | — |
| 3 | Blaxel | 40.67 | 38.81 – 43.55 | 12 | — |
| 4 | Novita | 49.58 | 46.89 – 55.35 | 12 | — |
| 4 | Modal (VM) | 56.48 | 48.33 – 66.44 | 12 | tied |
| 6 | E2B | 71.02 | 69.16 – 75.91 | 12 | — |
| 7 | Modal (gVisor) | 82.05 | 80.01 – 90.55 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Namespace | 55.77 | 55.32 – 59.43 | 12 |
| 2 | Daytona (VM) | 71.43 | 70.59 – 72.28 | 12 |
| 3 | Blaxel | 74.12 | 71.51 – 77.89 | 12 |
| 4 | Novita | 85.53 | 80.66 – 92.04 | 12 |
| 5 | Modal (VM) | 92.34 | 91.83 – 103.2 | 12 |
| 6 | Modal (gVisor) | 171.2 | 165.4 – 185 | 12 |

### Mastra: git clone

Seconds · lower is better

_Blaxel and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.139 | 1.577 – 4.137 | 12 | — |
| 1 | Modal (VM) | 2.436 | 2.13 – 4.037 | 12 | tied |
| 3 | Novita | 3.345 | 3.125 – 5.636 | 12 | — |
| 3 | Namespace | 3.632 | 2.575 – 4.537 | 12 | tied |
| 3 | Daytona (VM) | 4.71 | 4.004 – 6.521 | 12 | tied |
| 3 | Modal (gVisor) | 6.132 | 5.804 – 6.67 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Namespace | 65.92 | 65.14 – 66.43 | 12 |
| 2 | Blaxel | 88 | 84.28 – 92.58 | 12 |
| 3 | Daytona (VM) | 93.59 | 93.11 – 95.81 | 12 |
| 4 | Novita | 104.5 | 100.7 – 113.1 | 12 |
| 5 | Modal (VM) | 114.7 | 113.4 – 129.2 | 12 |
| 6 | Modal (gVisor) | 202.6 | 193.8 – 219.9 | 12 |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Namespace | 4.071 | 4.006 – 4.175 | 12 |
| 2 | Blaxel | 4.938 | 4.725 – 5.189 | 12 |
| 3 | Daytona (VM) | 5.787 | 5.664 – 5.992 | 12 |
| 4 | Modal (VM) | 6.56 | 6.373 – 6.835 | 12 |
| 5 | Novita | 7.084 | 6.973 – 7.747 | 12 |
| 6 | Modal (gVisor) | 14.8 | 14.28 – 16.2 | 12 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.361 | 2.311 – 2.436 | 12 | — |
| 2 | Modal (VM) | 3.219 | 3.067 – 3.454 | 12 | — |
| 2 | Daytona (VM) | 3.523 | 2.958 – 8.802 | 12 | tied |
| 2 | Novita | 4.458 | 4.236 – 5.259 | 12 | tied |
| 2 | Namespace | 5.684 | 5.403 – 6.128 | 12 | tied |
| 6 | Modal (gVisor) | 10.41 | 9.628 – 13.64 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.82 | 30.47 – 33.35 | 12 | — |
| 2 | Daytona (VM) | 35.91 | 34.04 – 36.9 | 12 | — |
| 3 | Blaxel | 39.3 | 38.39 – 40.26 | 12 | — |
| 4 | Modal (VM) | 47.11 | 44.5 – 52.2 | 12 | — |
| 4 | Novita | 50.33 | 47.41 – 56.71 | 12 | tied |
| 6 | Modal (gVisor) | 103.9 | 97.1 – 113.1 | 12 | — |

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 25.55 | 22.54 – 28.9 | 18 | — |
| 2 | Blaxel | 20.89 | 20.6 – 21.22 | 33 | n too small |
| 3 | Daytona (VM) | 18.53 | 18.22 – 18.62 | 9 | n too small |
| 4 | Novita | 17.9 | 17.21 – 18.7 | 9 | n too small |
| 5 | Modal (VM) | 15.43 | 15.22 – 21.01 | 27 | n too small |
| 6 | E2B | 11.3 | 10.95 – 11.46 | 9 | n too small |
| 7 | Modal (gVisor) | 9.33 | 8.9 – 9.64 | 21 | n too small |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Namespace leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 246500 | 241000 – 258000 | 6 | — |
| 2 | Daytona (VM) | 245500 | 238000 – 276000 | 6 | n too small |
| 3 | Blaxel | 233000 | 214800 – 378000 | 6 | n too small |
| 4 | Modal (VM) | 227000 | 120000 – 427000 | 6 | n too small |
| 5 | Novita | 80850 | 62900 – 88000 | 6 | n too small |
| 6 | E2B | 47200 | 46800 – 48200 | 6 | n too small |
| 7 | Modal (gVisor) | 33400 | 31700 – 34400 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Namespace leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 961.5 | 946.5 – 1004 | 6 | — |
| 2 | Daytona (VM) | 960 | 931 – 1079 | 6 | n too small |
| 3 | Blaxel | 911.5 | 809 – 1439 | 6 | n too small |
| 4 | Modal (VM) | 885.5 | 664 – 1666 | 6 | n too small |
| 5 | Novita | 316 | 246 – 344 | 6 | n too small |
| 6 | E2B | 184.5 | 183 – 188 | 6 | n too small |
| 7 | Modal (gVisor) | 130.5 | 124 – 134 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 287000 | 210000 – 375000 | 6 | — |
| 2 | Namespace | 245500 | 239000 – 247500 | 6 | n too small |
| 3 | Daytona (VM) | 222000 | 208000 – 233000 | 6 | n too small |
| 4 | Blaxel | 218000 | 200000 – 285000 | 6 | n too small |
| 5 | Novita | 79600 | 73400 – 82400 | 6 | n too small |
| 6 | E2B | 48600 | 47100 – 50100 | 6 | n too small |
| 7 | Modal (gVisor) | 28500 | 27000 – 29200 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1121 | 821 – 1463 | 6 | — |
| 2 | Namespace | 959.5 | 935 – 974 | 6 | n too small |
| 3 | Daytona (VM) | 866.5 | 814 – 910 | 6 | n too small |
| 4 | Blaxel | 851.5 | 783 – 1112 | 6 | n too small |
| 5 | Novita | 311 | 287 – 322 | 6 | n too small |
| 6 | E2B | 190 | 184 – 196 | 6 | n too small |
| 7 | Modal (gVisor) | 111.5 | 105 – 114 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 18650 | 15800 – 21000 | 6 | — |
| 2 | Daytona (VM) | 11550 | 8750 – 16800 | 6 | n too small |
| 3 | Novita | 9521 | 7402 – 13000 | 6 | n too small |
| 4 | Blaxel | 8016 | 5907 – 9900 | 6 | n too small |
| 5 | Namespace | 3947 | 2133 – 4012 | 6 | n too small |
| 6 | Modal (VM) | 2059 | 1712 – 4243 | 6 | n too small |
| 7 | E2B | 600 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 8752 | — | 1 | — |
| 2 | Blaxel | 8018 | 5909 – 9285 | 6 | — |
| 3 | Novita | 7576 | 7231 – 8942 | 3 | n too small |
| 4 | Namespace | 3949 | 2131 – 4014 | 6 | n too small |
| 5 | Modal (VM) | 2061 | 1757 – 4245 | 6 | n too small |
| 6 | E2B | 601 | 601 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6017 | 5614 – 6711 | 6 | — |
| 2 | Blaxel | 5824 | 4395 – 6102 | 6 | n too small |
| 3 | Daytona (VM) | 3985 | 3361 – 6726 | 6 | n too small |
| 4 | Modal (VM) | 3204 | 2725 – 5434 | 6 | n too small |
| 5 | Modal (gVisor) | 3119 | 2570 – 5499 | 6 | n too small |
| 6 | Namespace | 2470 | 1365 – 2490 | 6 | n too small |
| 7 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6018 | 5616 – 6713 | 6 | — |
| 2 | Blaxel | 5826 | 4196 – 6104 | 6 | n too small |
| 3 | Daytona (VM) | 3986 | 3524 – 5824 | 6 | n too small |
| 4 | Modal (VM) | 3205 | 2726 – 5435 | 6 | n too small |
| 5 | Modal (gVisor) | 3121 | 2385 – 6214 | 6 | n too small |
| 6 | Namespace | 2472 | 1367 – 2492 | 6 | n too small |
| 7 | E2B | 601 | 600 – 602 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.64 | 23.97 – 26.22 | 6 | — |
| 2 | Blaxel | 19.66 | 19.56 – 20.05 | 6 | n too small |
| 3 | Novita | 16.92 | 16.76 – 17.59 | 6 | n too small |
| 4 | Modal (VM) | 15.87 | 8.05 – 31.75 | 6 | n too small |
| 5 | Namespace | 5.18 | 4.42 – 5.22 | 6 | n too small |
| 6 | Modal (gVisor) | 3.22 | 2.68 – 3.33 | 6 | n too small |
| 7 | E2B | 1.36 | 1.36 – 1.4 | 6 | n too small |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 105900 | 100200 – 129900 | 15 | — |
| 2 | Daytona (VM) | 80130 | 65360 – 185800 | 15 | n too small |
| 3 | Modal (gVisor) | 72660 | 64990 – 75820 | 15 | n too small |
| 4 | Modal (VM) | 56018 | 48810 – 76530 | 15 | n too small |
| 5 | Novita | 53380 | 42150 – 92450 | 15 | n too small |
| 6 | E2B | 52650 | 51420 – 54200 | 15 | n too small |
| 7 | Namespace | 33230 | 30950 – 33754 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 105600 | 99340 – 130100 | 15 | — |
| 2 | Daytona (VM) | 78930 | 64680 – 185400 | 15 | n too small |
| 3 | Modal (gVisor) | 72390 | 63760 – 75010 | 15 | n too small |
| 4 | Modal (VM) | 55540 | 49480 – 75820 | 15 | n too small |
| 5 | Novita | 53370 | 42120 – 98190 | 15 | n too small |
| 6 | E2B | 52460 | 51140 – 54100 | 15 | n too small |
| 7 | Namespace | 33310 | 31020 – 33670 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.2× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 119600 | 116300 – 143600 | 35 | — |
| 2 | Modal (gVisor) | 97350 | 91160 – 101100 | 70 | n too small |
| 3 | Modal (VM) | 86894 | 83000 – 93320 | 30 | n too small |
| 4 | Daytona (VM) | 79770 | 75670 – 219900 | 55 | n too small |
| 5 | E2B | 78540 | 77350 – 80340 | 65 | n too small |
| 6 | Novita | 58150 | 51580 – 109800 | 17 | n too small |
| 7 | Namespace | 44180 | 43730 – 44790 | 50 | n too small |

### STREAM Scale

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 97810 | 91410 – 121360 | 15 | — |
| 2 | Daytona (VM) | 70870 | 58760 – 177400 | 15 | n too small |
| 3 | Modal (gVisor) | 63980 | 56340 – 67940 | 15 | n too small |
| 4 | Novita | 50970 | 42220 – 93490 | 15 | n too small |
| 5 | Modal (VM) | 48155 | 41800 – 72800 | 15 | n too small |
| 6 | E2B | 46130 | 45770 – 46630 | 15 | n too small |
| 7 | Namespace | 30250 | 29030 – 30590 | 15 | n too small |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 148400 | 131280 – 152811 | 6 | — |
| 2 | Blaxel | 97840 | 87545 – 155461 | 6 | n too small |
| 3 | Namespace | 74730 | 72100 – 140164 | 6 | n too small |
| 4 | Daytona (VM) | 70244 | 67620 – 80855 | 6 | n too small |
| 5 | E2B | 58134 | 53179 – 68194 | 6 | n too small |
| 6 | Modal (VM) | 26070 | 16043 – 84307 | 6 | n too small |
| 7 | Modal (gVisor) | 11830 | 9159 – 15959 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 144870 | 129936 – 155766 | 6 | — |
| 2 | Blaxel | 127000 | 112685 – 164136 | 6 | n too small |
| 3 | Daytona (VM) | 97613 | 80570 – 102949 | 6 | n too small |
| 4 | Namespace | 68580 | 63800 – 105620 | 6 | n too small |
| 5 | E2B | 51598 | 46865 – 61072 | 6 | n too small |
| 6 | Modal (VM) | 19863 | 13822 – 72964 | 6 | n too small |
| 7 | Modal (gVisor) | 12147 | 11331 – 13068 | 6 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Modal (VM), Namespace and Novita share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 6 | n too small, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 7 | Modal (gVisor) | 161.5 | 142 – 171 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.5× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 7040 | 6409 – 10840 | 6 | — |
| 2 | Novita | 4840 | 3588 – 6253 | 6 | n too small |
| 3 | Daytona (VM) | 3642 | 2984 – 4557 | 6 | n too small |
| 4 | Namespace | 3572 | 2198 – 11600 | 6 | n too small |
| 5 | E2B | 3443 | 537.6 – 6102 | 6 | n too small |
| 6 | Blaxel | 1443 | 982.7 – 1654 | 6 | n too small |
| 7 | Modal (VM) | 1404 | 674.9 – 1657 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5397 | 1327 – 9306 | 6 | — |
| 2 | Daytona (VM) | 4312 | 3806 – 4799 | 6 | n too small |
| 3 | Novita | 3269 | 498.2 – 4410 | 6 | n too small |
| 4 | E2B | 3150 | 1025 – 3312 | 6 | n too small |
| 5 | Namespace | 2742 | 955.8 – 3080 | 6 | n too small |
| 6 | Blaxel | 1754 | 809.9 – 2376 | 6 | n too small |
| 7 | Modal (gVisor) | 156.1 | 142.1 – 181.8 | 6 | n too small |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 361.5 | 358.5 – 366 | 6 | — |
| 2 | Daytona (VM) | 404 | 400 – 443 | 6 | n too small |
| 3 | Blaxel | 478 | 475 – 493 | 6 | n too small |
| 4 | Novita | 484 | 480 – 485 | 6 | n too small |
| 5 | Modal (VM) | 666.5 | 479 – 673 | 6 | n too small |
| 6 | E2B | 803 | 802 – 807 | 6 | n too small |
| 7 | Modal (gVisor) | 896 | 888 – 903 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.77 | 31.5 – 32.42 | 6 | — |
| 2 | Daytona (VM) | 36.64 | 36.21 – 39.32 | 6 | n too small |
| 3 | Blaxel | 43.9 | 41.7 – 48.15 | 6 | n too small |
| 4 | Novita | 44.82 | 44.05 – 44.96 | 6 | n too small |
| 5 | Modal (VM) | 47.17 | 41.67 – 47.32 | 6 | n too small |
| 6 | E2B | 65.36 | 63.97 – 66.24 | 6 | n too small |
| 7 | Modal (gVisor) | 85.1 | 80.08 – 86.72 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 310200 | 274900 – 348700 | 6 | — |
| 2 | Daytona (VM) | 299800 | 270300 – 302800 | 6 | n too small |
| 3 | Namespace | 239900 | 218300 – 385400 | 6 | n too small |
| 4 | Novita | 237800 | 217000 – 269400 | 6 | n too small |
| 5 | Modal (VM) | 200200 | 196300 – 201900 | 6 | n too small |
| 6 | E2B | 176800 | 174500 – 182500 | 6 | n too small |
| 7 | Modal (gVisor) | 11770 | 11180 – 12230 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.161 | 0.143 – 0.182 | 6 | — |
| 2 | Daytona (VM) | 0.167 | 0.165 – 0.185 | 6 | n too small |
| 3 | Namespace | 0.2085 | 0.13 – 0.229 | 6 | n too small |
| 4 | Novita | 0.2105 | 0.186 – 0.2305 | 6 | n too small |
| 5 | Modal (VM) | 0.2495 | 0.248 – 0.255 | 6 | n too small |
| 6 | E2B | 0.283 | 0.2745 – 0.289 | 6 | n too small |
| 7 | Modal (gVisor) | 4.248 | 4.088 – 4.577 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 24890 | 16100 – 41320 | 6 | — |
| 2 | Blaxel | 23250 | 22270 – 24530 | 6 | n too small |
| 3 | Novita | 17700 | 15740 – 21940 | 6 | n too small |
| 4 | Daytona (VM) | 16000 | 15570 – 16570 | 6 | n too small |
| 5 | Modal (VM) | 14240 | 13750 – 14410 | 6 | n too small |
| 6 | E2B | 11880 | 10980 – 12530 | 6 | n too small |
| 7 | Modal (gVisor) | 2067 | 1942 – 2107 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.018 | 1.21 – 3.105 | 6 | — |
| 2 | Blaxel | 2.151 | 2.038 – 2.217 | 6 | n too small |
| 3 | Novita | 2.828 | 2.279 – 3.045 | 6 | n too small |
| 4 | Daytona (VM) | 3.124 | 3.042 – 3.212 | 6 | n too small |
| 5 | Modal (VM) | 3.51 | 3.47 – 3.617 | 6 | n too small |
| 6 | E2B | 4.208 | 3.989 – 4.555 | 6 | n too small |
| 7 | Modal (gVisor) | 24.19 | 23.73 – 25.75 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.09 | 30.73 – 34.82 | 6 | — |
| 2 | Blaxel | 38.42 | 37.02 – 42.7 | 6 | n too small |
| 3 | Novita | 41.36 | 39.96 – 44.67 | 6 | n too small |
| 4 | Namespace | 48.41 | 47.94 – 48.73 | 6 | n too small |
| 5 | Modal (VM) | 62.39 | 35.6 – 63.32 | 6 | n too small |
| 6 | E2B | 70.5 | 70.25 – 73.4 | 6 | n too small |
| 7 | Modal (gVisor) | 410 | 391.1 – 443 | 6 | n too small |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 0.2333 | — | 1 | — |
| 2 | Daytona (VM) | 0.2502 | — | 1 | — |
| 3 | E2B | 0.3312 | — | 1 | — |
| 4 | Modal (gVisor) | 0.7612 | — | 1 | — |
| 4 | Modal (VM) | 0.7612 | — | 1 | equal values |

## Coverage gaps

17 uncovered results across 7 providers (Blaxel 2, Daytona (VM) 3, E2B 2, Modal (gVisor) 3, Modal (VM) 2, Namespace 2, Novita 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

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

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`tied` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only note that claims two providers are
statistically indistinguishable.
`equal medians` / `equal values` — arithmetic, not a finding: the ranking sorts on the value,
and two identical values have no order between them. It says nothing about the distributions.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

`n too small` is the extreme of that: Mann-Whitney's best attainable p already exceeds α for those
Samples, so the test could not have separated the rows at any effect size (here 15 v 15 floors at p ≈ <0.001; 17 v 50 floors at p ≈ <0.001; 18 v 33 floors at p ≈ <0.001; 27 v 9 floors at p ≈ <0.001; 3 v 6 floors at p ≈ 0.024; 30 v 55 floors at p ≈ <0.001; 33 v 9 floors at p ≈ <0.001; 35 v 70 floors at p ≈ <0.001; 55 v 65 floors at p ≈ <0.001; 6 v 3 floors at p ≈ 0.024; 6 v 6 floors at p ≈ 0.0022; 65 v 17 floors at p ≈ <0.001; 70 v 30 floors at p ≈ <0.001; 9 v 21 floors at p ≈ <0.001; 9 v 27 floors at p ≈ <0.001; 9 v 9 floors at p ≈ <0.001).
Such rows are ranked on their observed medians and are **not** claimed to be tied — read the gap
between the values, and treat the p-value as unable to settle them either way. Where such a row
nevertheless shares the rank above it, the note reads `equal medians`: the two values are simply
identical, which is the ranking having nothing to order them by — never a finding that the
providers are alike.

### Pairwise tests (vs. row above)

`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution
*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).
These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate
correction is applied across providers or metrics.

| Dimension | Metric | Provider | p vs. above | p (KS) |
| --- | --- | --- | ---: | ---: |
| realworld | Mastra: cold install | Namespace | — | — |
| realworld | Mastra: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Blaxel | 0.24 (tied) | 0.43 |
| realworld | Mastra: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Novita | 0.93 (tied) | 0.79 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | 0.052 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Namespace | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: cold install | Novita | 0.0068 | 0.019 |
| realworld | Better-Auth: cold install | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.0083 | 0.0046 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.043 | 0.066 |
| realworld | Better-Auth: git clone | E2B | 0.0018 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.34 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.0036 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Namespace | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Blaxel | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.045 | 0.066 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Blaxel | 0.078 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.10 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.47 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.045 | 0.066 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Namespace | 0.67 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | 0.0036 | 0.0046 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | 0.017 | 0.019 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.045 | 0.019 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.28 (tied) | 0.19 |
| realworld | Mastra: git clone | Novita | 0.024 | 0.0046 |
| realworld | Mastra: git clone | Namespace | 0.80 (tied) | 0.79 |
| realworld | Mastra: git clone | Daytona (VM) | 0.060 (tied) | 0.19 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.13 (tied) | 0.019 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.017 | 0.0046 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 0.033 | 0.0046 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Novita | 0.0036 | 0.0046 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.76 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Novita | 0.16 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Namespace | 0.068 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.0014 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | <0.001 | <0.001 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | Blaxel | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Daytona (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Novita | 0.11 (n too small) | 0.019 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | E2B | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.85 (n too small) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.39 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.90 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.90 (n too small) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.39 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.90 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.37 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.39 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.0043 (n too small) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.12 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.12 (n too small) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.90 (n too small) | 0.93 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.024 (n too small) | 0.011 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.18 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.24 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.82 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.022 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.18 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.24 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.82 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.026 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | Hardlink throughput | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Blaxel | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.17 (n too small) | 0.017 |
| memory | STREAM Triad | Modal (gVisor) | 0.098 (n too small) | 0.051 |
| memory | STREAM Triad | Modal (VM) | 0.050 (n too small) | 0.0047 |
| memory | STREAM Triad | Novita | 0.62 (n too small) | 0.31 |
| memory | STREAM Triad | E2B | 0.51 (n too small) | 0.31 |
| memory | STREAM Triad | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Blaxel | — | — |
| memory | STREAM Add | Daytona (VM) | 0.19 (n too small) | 0.017 |
| memory | STREAM Add | Modal (gVisor) | 0.14 (n too small) | 0.051 |
| memory | STREAM Add | Modal (VM) | 0.045 (n too small) | 0.0047 |
| memory | STREAM Add | Novita | 0.74 (n too small) | 0.31 |
| memory | STREAM Add | E2B | 0.49 (n too small) | 0.14 |
| memory | STREAM Add | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (VM) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | 0.11 (n too small) | 0.0032 |
| memory | STREAM Copy | E2B | 0.076 (n too small) | 0.060 |
| memory | STREAM Copy | Novita | 0.27 (n too small) | <0.001 |
| memory | STREAM Copy | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Blaxel | — | — |
| memory | STREAM Scale | Daytona (VM) | 0.29 (n too small) | 0.017 |
| memory | STREAM Scale | Modal (gVisor) | 0.11 (n too small) | 0.051 |
| memory | STREAM Scale | Novita | 0.27 (n too small) | 0.0047 |
| memory | STREAM Scale | Modal (VM) | 0.27 (n too small) | 0.31 |
| memory | STREAM Scale | E2B | 0.32 (n too small) | 0.017 |
| memory | STREAM Scale | Namespace | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.065 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.24 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.13 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.0043 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.18 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.31 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 0.45 (n too small, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 0.45 (n too small, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Novita | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Daytona (VM) | 0.13 (n too small) | 0.32 |
| network | iperf3 WAN download | Namespace | 0.82 (n too small) | 1.0 |
| network | iperf3 WAN download | E2B | 0.39 (n too small) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN download | Modal (VM) | 0.59 (n too small) | 0.81 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN upload | Novita | 0.041 (n too small) | 0.077 |
| network | iperf3 WAN upload | E2B | 0.48 (n too small) | 0.32 |
| network | iperf3 WAN upload | Namespace | 0.39 (n too small) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.093 (n too small) | 0.077 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.067 (n too small) | 0.077 |
| system | PyBench | Modal (VM) | 0.19 (n too small) | 0.077 |
| system | PyBench | E2B | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Novita | 0.48 (n too small) | 0.32 |
| system | Git common operations | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | Git common operations | E2B | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.13 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.39 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.59 (n too small) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.12 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.37 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.59 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (n too small) | 0.32 |
| system | pgbench RW (s100, 50c) | Novita | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.026 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (n too small) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.026 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.24 (n too small) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | E2B | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

