# Sandbox provider leaderboard

Run [`30589436441`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30589436441) · commit [`4ee64f2d0596263f9f88bd5ad74bda7218178e3d`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/4ee64f2d0596263f9f88bd5ad74bda7218178e3d) ·
dataset [`data/dataset/runs/30589436441.json`](data/dataset/runs/30589436441.json) · generated 2026-07-31T01:35:50.052Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **353 metric records**
backed by **3582 retained trial observations**, across **46 metrics** and
**8 providers**; every emitted, catalogued metric has a ranked table below
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
| Microsandbox Cloud | libkrun microVM (cloud) | vm |
| Modal (gVisor) | gVisor container | gvisor |
| Modal (VM) | microVM (VM runtime) | vm |
| Namespace | microVM (dedicated instance) | vm |
| Novita | microVM | vm |

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 39.27 | 38.74 – 41.48 | 12 | — |
| 1 | Daytona (VM) | 39.79 | 38.23 – 48.51 | 12 | tied |
| 3 | Novita | 46.97 | 44.17 – 54.18 | 12 | — |
| 3 | Modal (VM) | 54.36 | 52.39 – 57.66 | 12 | tied |
| 3 | Namespace | 58.62 | 53.44 – 64.57 | 12 | tied |
| 6 | Microsandbox Cloud | 75.71 | 73.52 – 552.2 | 5 | — |
| 6 | Modal (gVisor) | 100.7 | 96.78 – 108.5 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM), Blaxel and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 57.03 | 54.38 – 69.17 | 12 | — |
| 1 | Blaxel | 59.86 | 58.31 – 64.66 | 12 | tied |
| 1 | Namespace | 61.69 | 56.61 – 66.64 | 12 | tied |
| 4 | Microsandbox Cloud | 68.28 | 67.57 – 72.2 | 4 | — |
| 4 | Modal (VM) | 69.54 | 68.86 – 74.9 | 12 | tied |
| 4 | Novita | 71.65 | 66.84 – 84.44 | 12 | tied |
| 7 | E2B | 99.52 | 97.41 – 101.5 | 12 | — |
| 8 | Modal (gVisor) | 138.7 | 131.8 – 141.1 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.85 | 11.51 – 12.44 | 12 | — |
| 2 | Daytona (VM) | 12.61 | 11.92 – 14.77 | 12 | — |
| 2 | Novita | 14.24 | 13.91 – 14.72 | 12 | tied |
| 4 | Modal (VM) | 19.14 | 18.4 – 20.06 | 12 | — |
| 4 | E2B | 19.87 | 19.49 – 20.12 | 12 | tied |
| 6 | Namespace | 30.15 | 28.48 – 33.04 | 12 | — |
| 7 | Modal (gVisor) | 34.49 | 32.25 – 36.93 | 12 | — |
| 8 | Microsandbox Cloud | 73.28 | 62.46 – 84.09 | 2 | — |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.593 | 0.5655 – 0.7405 | 12 | — |
| 2 | Modal (VM) | 0.7525 | 0.731 – 0.937 | 12 | — |
| 2 | Namespace | 1.095 | 0.6825 – 1.643 | 12 | tied |
| 2 | E2B | 1.485 | 1.381 – 1.591 | 12 | tied |
| 2 | Daytona (VM) | 1.512 | 1.353 – 1.602 | 12 | tied |
| 6 | Microsandbox Cloud | 1.899 | 1.835 – 1.948 | 6 | — |
| 6 | Novita | 1.95 | 1.845 – 2.088 | 12 | tied |
| 8 | Modal (gVisor) | 2.494 | 2.17 – 2.669 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM), Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 3.157 | 3.068 – 3.41 | 12 | — |
| 1 | Namespace | 3.17 | 3.002 – 3.321 | 12 | tied |
| 1 | Blaxel | 3.278 | 3.244 – 3.308 | 12 | tied |
| 4 | Novita | 3.739 | 3.548 – 4.342 | 12 | — |
| 4 | Modal (VM) | 4.058 | 4.001 – 4.195 | 12 | tied |
| 4 | Microsandbox Cloud | 4.117 | 3.891 – 4.365 | 6 | tied |
| 7 | E2B | 5.212 | 5.078 – 5.332 | 12 | — |
| 8 | Modal (gVisor) | 10.27 | 9.945 – 10.84 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace, Blaxel, Daytona (VM) and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.06 | 9.265 – 10.22 | 12 | — |
| 1 | Blaxel | 10.3 | 10.07 – 10.71 | 12 | tied |
| 1 | Daytona (VM) | 10.57 | 10.43 – 11.85 | 12 | tied |
| 1 | Microsandbox Cloud | 11.47 | 11.1 – 11.54 | 6 | tied |
| 5 | Novita | 12.48 | 11.68 – 12.89 | 12 | — |
| 5 | Modal (VM) | 13.36 | 13.28 – 13.52 | 12 | tied |
| 7 | E2B | 18.9 | 18.6 – 19.12 | 12 | — |
| 8 | Modal (gVisor) | 28.79 | 27.64 – 29.82 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.779 | 2.667 – 2.87 | 12 | — |
| 2 | Daytona (VM) | 2.981 | 2.885 – 3.056 | 12 | — |
| 2 | Blaxel | 3.002 | 2.923 – 3.052 | 12 | tied |
| 2 | Microsandbox Cloud | 3.235 | 3.003 – 3.433 | 6 | tied |
| 2 | Novita | 3.33 | 3.222 – 3.445 | 12 | tied |
| 6 | Modal (VM) | 3.826 | 3.753 – 3.92 | 12 | — |
| 7 | E2B | 5.329 | 5.236 – 5.442 | 12 | — |
| 8 | Modal (gVisor) | 7.106 | 6.921 – 7.314 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM), Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.415 | 2.338 – 2.471 | 12 | — |
| 1 | Namespace | 2.5 | 2.363 – 2.716 | 12 | tied |
| 1 | Blaxel | 2.559 | 2.516 – 2.637 | 12 | tied |
| 4 | Novita | 2.947 | 2.75 – 3.381 | 12 | — |
| 4 | Microsandbox Cloud | 3.161 | 2.889 – 3.884 | 6 | tied |
| 4 | Modal (VM) | 3.194 | 3.182 – 3.258 | 12 | tied |
| 7 | E2B | 4.204 | 4.143 – 4.287 | 12 | — |
| 8 | Modal (gVisor) | 10.59 | 10.27 – 11.13 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace, Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 6.989 | 6.47 – 7.338 | 12 | — |
| 1 | Blaxel | 7.188 | 7.047 – 7.399 | 12 | tied |
| 1 | Daytona (VM) | 7.446 | 7.282 – 7.729 | 12 | tied |
| 4 | Novita | 8.055 | 7.852 – 8.428 | 12 | — |
| 4 | Microsandbox Cloud | 8.582 | 8.145 – 9.249 | 6 | tied |
| 4 | Modal (VM) | 9.015 | 8.834 – 9.306 | 12 | tied |
| 7 | E2B | 13.3 | 13.14 – 13.49 | 12 | — |
| 8 | Modal (gVisor) | 15.36 | 15.11 – 17 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.25 | 23.72 – 30.91 | 12 | — |
| 1 | Blaxel | 26.72 | 25.69 – 27.87 | 12 | tied |
| 3 | Namespace | 31.39 | 29.46 – 33.97 | 12 | — |
| 3 | Modal (VM) | 33.55 | 33.35 – 34.56 | 12 | tied |
| 3 | Novita | 35.08 | 32.5 – 40.49 | 12 | tied |
| 3 | Microsandbox Cloud | 35.23 | 33.08 – 44.12 | 6 | tied |
| 7 | E2B | 49.64 | 48.46 – 50.91 | 12 | — |
| 8 | Modal (gVisor) | 105 | 100.7 – 106.4 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 41.17 | 40.06 – 43.67 | 12 | — |
| 1 | Daytona (VM) | 41.26 | 39.95 – 42.53 | 12 | tied |
| 3 | Novita | 44.21 | 43.02 – 49.09 | 12 | — |
| 3 | Namespace | 45.84 | 43.02 – 52.3 | 12 | tied |
| 3 | Microsandbox Cloud | 49.56 | 45.09 – 55.4 | 6 | tied |
| 3 | Modal (VM) | 49.66 | 48.7 – 51.11 | 12 | tied |
| 7 | E2B | 73.19 | 71.12 – 73.83 | 12 | — |
| 8 | Modal (gVisor) | 80.8 | 78.02 – 87.26 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 72.67 | 70.85 – 80.12 | 12 | — |
| 1 | Daytona (VM) | 72.99 | 71.46 – 73.34 | 12 | tied |
| 3 | Blaxel | 74.11 | 73.15 – 75.3 | 12 | — |
| 4 | Novita | 84.66 | 79.04 – 95.38 | 12 | — |
| 4 | Microsandbox Cloud | 86.35 | 83.22 – 98.9 | 5 | tied |
| 4 | Modal (VM) | 93.77 | 92.24 – 104.5 | 12 | tied |
| 7 | Modal (gVisor) | 170.4 | 166.5 – 177.4 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.171 | 2.131 – 3.309 | 12 | — |
| 1 | Modal (VM) | 2.247 | 2.016 – 2.818 | 12 | tied |
| 3 | Daytona (VM) | 2.78 | 2.532 – 3.405 | 12 | — |
| 3 | Novita | 3.256 | 3.077 – 3.651 | 12 | tied |
| 5 | Namespace | 4.278 | 3.885 – 4.447 | 12 | — |
| 6 | Modal (gVisor) | 6.041 | 5.878 – 6.652 | 12 | — |
| 7 | Microsandbox Cloud | 7.431 | 7.243 – 7.742 | 8 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 85.3 | 81.77 – 92.31 | 12 | — |
| 1 | Blaxel | 90.7 | 88.94 – 92.92 | 12 | tied |
| 3 | Daytona (VM) | 94.12 | 92.19 – 97.77 | 12 | — |
| 4 | Microsandbox Cloud | 98.47 | 96.54 – 103.3 | 7 | — |
| 5 | Novita | 105.6 | 101.5 – 118.2 | 12 | — |
| 5 | Modal (VM) | 114.7 | 113 – 128.6 | 12 | tied |
| 7 | Modal (gVisor) | 192.5 | 187.8 – 204.5 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.37 | 11.22 – 11.61 | 12 | — |
| 2 | Daytona (VM) | 13.47 | 12.93 – 13.84 | 12 | — |
| 3 | Novita | 15.37 | 15.17 – 15.79 | 12 | — |
| 4 | Modal (VM) | 18.87 | 18.15 – 23.7 | 12 | — |
| 4 | Microsandbox Cloud | 22.08 | 18.89 – 525.4 | 10 | tied |
| 4 | Namespace | 23.5 | 20.02 – 30.07 | 12 | tied |
| 4 | Modal (gVisor) | 31.03 | 28.68 – 32.35 | 11 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Modal (VM) and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 3.115 | 3.038 – 3.277 | 12 | — |
| 1 | Daytona (VM) | 3.242 | 3.061 – 3.673 | 12 | tied |
| 3 | Microsandbox Cloud | 4.183 | 4.005 – 4.332 | 12 | — |
| 3 | Novita | 4.229 | 3.828 – 4.495 | 12 | tied |
| 5 | Modal (gVisor) | 9.896 | 9.124 – 11.01 | 11 | — |
| 6 | Blaxel | 13.16 | 12.54 – 14.17 | 12 | — |
| 6 | Namespace | 13.28 | 8.031 – 18.96 | 12 | tied |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 60.47 | 59.6 – 62.73 | 12 | — |
| 1 | Blaxel | 62.83 | 62.1 – 66.55 | 12 | tied |
| 3 | Novita | 68.67 | 65.62 – 73.7 | 12 | — |
| 3 | Namespace | 70.98 | 64.01 – 77.31 | 12 | tied |
| 3 | Modal (VM) | 74.7 | 73.19 – 78.81 | 12 | tied |
| 3 | Microsandbox Cloud | 82.09 | 76.2 – 84.59 | 12 | tied |
| 7 | Modal (gVisor) | 167.1 | 154.3 – 174.6 | 11 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 95.68 | 91.58 – 101.6 | 12 | — |
| 2 | Namespace | 110 | 99.06 – 123.6 | 12 | — |
| 2 | Modal (VM) | 121.6 | 115.3 – 131.3 | 12 | tied |
| 2 | Microsandbox Cloud | 124.9 | 121.6 – 130.6 | 12 | tied |
| 2 | Novita | 128.9 | 113 – 135.8 | 12 | tied |
| 6 | Modal (gVisor) | 320.7 | 246.4 – 363.3 | 11 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM), Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 16.72 | 16.4 – 18.13 | 12 | — |
| 1 | Namespace | 17.19 | 16.09 – 18.6 | 12 | tied |
| 1 | Blaxel | 17.42 | 17.11 – 18.09 | 12 | tied |
| 4 | Modal (VM) | 22.7 | 21.21 – 23.03 | 12 | — |
| 4 | Microsandbox Cloud | 23.3 | 22.44 – 24.95 | 12 | tied |
| 4 | Novita | 24.45 | 22.61 – 27.28 | 12 | tied |
| 7 | Modal (gVisor) | 57.42 | 35.56 – 77.54 | 11 | — |

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 20.07 | 19.34 – 20.57 | 20 | — |
| 2 | Microsandbox Cloud | 19.68 | 18.22 – 20.07 | 33 | n too small |
| 3 | Namespace | 19.61 | 17.96 – 22.44 | 43 | n too small |
| 4 | Daytona (VM) | 18.59 | 18.14 – 19 | 21 | n too small |
| 5 | Modal (VM) | 15.57 | 12.46 – 17.84 | 36 | n too small |
| 6 | Novita | 15.28 | 14.84 – 18.29 | 9 | n too small |
| 7 | E2B | 11.44 | 10.73 – 11.57 | 9 | n too small |
| 8 | Modal (gVisor) | 9.06 | 8.82 – 9.25 | 10 | n too small |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 357000 | 298000 – 375000 | 6 | — |
| 2 | Daytona (VM) | 266000 | 237000 – 389000 | 6 | n too small |
| 3 | Modal (VM) | 228000 | 196000 – 401000 | 6 | n too small |
| 4 | Blaxel | 224500 | 214000 – 392000 | 6 | n too small |
| 5 | Namespace | 211500 | 176000 – 228000 | 6 | n too small |
| 6 | Novita | 75050 | 71150 – 77350 | 6 | n too small |
| 7 | E2B | 47150 | 46100 – 48300 | 6 | n too small |
| 8 | Modal (gVisor) | 33700 | 28400 – 37100 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1394 | 1162 – 1464 | 6 | — |
| 2 | Daytona (VM) | 1038 | 926 – 1521 | 6 | n too small |
| 3 | Modal (VM) | 891 | 802 – 1565 | 6 | n too small |
| 4 | Blaxel | 876.5 | 837.5 – 1530 | 6 | n too small |
| 5 | Namespace | 827 | 687 – 892 | 6 | n too small |
| 6 | Novita | 293 | 275 – 304 | 6 | n too small |
| 7 | E2B | 184 | 180 – 188 | 6 | n too small |
| 8 | Modal (gVisor) | 131.5 | 111 – 145 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 298000 | 268000 – 369000 | 6 | — |
| 2 | Blaxel | 226000 | 203500 – 316000 | 6 | n too small |
| 3 | Daytona (VM) | 222500 | 207000 – 312000 | 6 | n too small |
| 4 | Modal (VM) | 217500 | 178000 – 374000 | 6 | n too small |
| 5 | Namespace | 214000 | 187000 – 241000 | 6 | n too small |
| 6 | Novita | 75750 | 74800 – 77950 | 6 | n too small |
| 7 | E2B | 48350 | 46800 – 50600 | 6 | n too small |
| 8 | Modal (gVisor) | 26550 | 24700 – 27100 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1165 | 1046 – 1443 | 6 | — |
| 2 | Blaxel | 883 | 785 – 1236 | 6 | n too small |
| 3 | Daytona (VM) | 870 | 830.5 – 1217 | 6 | n too small |
| 4 | Modal (VM) | 849 | 696 – 1459 | 6 | n too small |
| 5 | Namespace | 835.5 | 729 – 943 | 6 | n too small |
| 6 | Novita | 296 | 292 – 304.5 | 6 | n too small |
| 7 | E2B | 189 | 183 – 198 | 6 | n too small |
| 8 | Modal (gVisor) | 103.5 | 96.5 – 105 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.9× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 21750 | 17600 – 23500 | 6 | — |
| 2 | Novita | 11650 | 10800 – 12700 | 6 | n too small |
| 3 | Blaxel | 10040 | 9248 – 11000 | 6 | n too small |
| 4 | Microsandbox Cloud | 8460 | 7597 – 8754 | 6 | n too small |
| 5 | Daytona (VM) | 6231 | 5313 – 9772 | 6 | n too small |
| 6 | Namespace | 2862 | 2713 – 3618 | 6 | n too small |
| 7 | Modal (VM) | 2295 | 1707 – 4695 | 6 | n too small |
| 8 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9632 | 9250 – 9873 | 3 | — |
| 2 | Microsandbox Cloud | 8462 | 7599 – 8756 | 6 | n too small |
| 3 | Daytona (VM) | 6233 | 5362 – 9774 | 6 | n too small |
| 4 | Namespace | 2863 | 2715 – 3872 | 6 | n too small |
| 5 | Modal (VM) | 2296 | 1652 – 4696 | 6 | n too small |
| 6 | E2B | 601 | 601 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.1× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6728 | 5791 – 7127 | 6 | — |
| 2 | Microsandbox Cloud | 6133 | 5602 – 6500 | 6 | n too small |
| 3 | Blaxel | 5834 | 5347 – 6120 | 6 | n too small |
| 4 | Daytona (VM) | 4056 | 3336 – 4451 | 6 | n too small |
| 5 | Modal (VM) | 3590 | 2366 – 5551 | 6 | n too small |
| 6 | Modal (gVisor) | 2763 | 2527 – 3554 | 6 | n too small |
| 7 | Namespace | 1809 | 1277 – 1978 | 6 | n too small |
| 8 | E2B | 599 | 598 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.1× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6730 | 5792 – 6999 | 6 | — |
| 2 | Microsandbox Cloud | 6135 | 5603 – 6501 | 6 | n too small |
| 3 | Blaxel | 5835 | 5349 – 6122 | 6 | n too small |
| 4 | Daytona (VM) | 4057 | 3337 – 4453 | 6 | n too small |
| 5 | Modal (VM) | 3592 | 2368 – 5553 | 6 | n too small |
| 6 | Modal (gVisor) | 2765 | 2529 – 3556 | 6 | n too small |
| 7 | Namespace | 1810 | 1279 – 1973 | 6 | n too small |
| 8 | E2B | 601 | 599 – 601 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.84 | 23.32 – 26.45 | 6 | — |
| 2 | Blaxel | 19.58 | 17.5 – 19.93 | 6 | n too small |
| 3 | Novita | 18.23 | 18.13 – 18.33 | 6 | n too small |
| 4 | Microsandbox Cloud | 9.84 | 9.69 – 9.99 | 6 | n too small |
| 5 | Modal (VM) | 8.225 | 7.99 – 31.46 | 6 | n too small |
| 6 | Namespace | 4.45 | 4.19 – 4.77 | 6 | n too small |
| 7 | Modal (gVisor) | 3.055 | 2.62 – 3.19 | 6 | n too small |
| 8 | E2B | 1.36 | 1.26 – 1.36 | 6 | n too small |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Modal (VM) leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 144200 | 132900 – 166200 | 15 | — |
| 2 | Blaxel | 98625 | 97720 – 105600 | 15 | n too small |
| 3 | Daytona (VM) | 82240 | 58390 – 176200 | 15 | n too small |
| 4 | Modal (gVisor) | 62340 | 59220 – 69530 | 15 | n too small |
| 5 | Microsandbox Cloud | 60220 | 59160 – 60810 | 15 | n too small |
| 6 | E2B | 47080 | 45870 – 50110 | 15 | n too small |
| 7 | Novita | 42211 | 42050 – 53810 | 15 | n too small |
| 8 | Namespace | 29610 | 28650 – 33160 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Modal (VM) leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 146400 | 131195 – 166200 | 15 | — |
| 2 | Blaxel | 98500 | 97430 – 105400 | 15 | n too small |
| 3 | Daytona (VM) | 82640 | 58225 – 176200 | 15 | n too small |
| 4 | Modal (gVisor) | 61500 | 61090 – 70620 | 15 | n too small |
| 5 | Microsandbox Cloud | 59840 | 59610 – 60510 | 15 | n too small |
| 6 | E2B | 47100 | 45870 – 50750 | 15 | n too small |
| 7 | Novita | 42130 | 42020 – 53760 | 15 | n too small |
| 8 | Namespace | 29770 | 28940 – 33110 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Modal (VM) leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 172400 | 115200 – 173800 | 35 | — |
| 2 | Blaxel | 121600 | 120700 – 124863 | 75 | n too small |
| 3 | Daytona (VM) | 97580 | 80720 – 200700 | 65 | n too small |
| 4 | Modal (gVisor) | 86790 | 82540 – 95510 | 60 | n too small |
| 5 | Microsandbox Cloud | 84650 | 83900 – 85970 | 55 | n too small |
| 6 | E2B | 75530 | 74520 – 77920 | 75 | n too small |
| 7 | Novita | 51170 | 51010 – 58350 | 35 | n too small |
| 8 | Namespace | 43470 | 40730 – 43780 | 35 | n too small |

### STREAM Scale

MB/s · higher is better

_Modal (VM) leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 134672 | 132900 – 162000 | 15 | — |
| 2 | Blaxel | 90090 | 89020 – 97111 | 15 | n too small |
| 3 | Daytona (VM) | 74750 | 52130 – 166800 | 15 | n too small |
| 4 | Modal (gVisor) | 53970 | 52820 – 59830 | 15 | n too small |
| 5 | Microsandbox Cloud | 51200 | 50690 – 51980 | 15 | n too small |
| 6 | E2B | 44590 | 42490 – 46050 | 15 | n too small |
| 7 | Novita | 42346 | 41990 – 51320 | 15 | n too small |
| 8 | Namespace | 27114 | 24990 – 30060 | 15 | n too small |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 142600 | 49753 – 149480 | 6 | — |
| 2 | Blaxel | 131594 | 92440 – 147066 | 6 | n too small |
| 3 | Daytona (VM) | 75352 | 50694 – 112966 | 6 | n too small |
| 4 | Microsandbox Cloud | 70400 | 56203 – 84486 | 6 | n too small |
| 5 | Namespace | 63258 | 48705 – 66490 | 6 | n too small |
| 6 | E2B | 58838 | 47304 – 65100 | 6 | n too small |
| 7 | Modal (VM) | 23621 | 15373 – 81293 | 6 | n too small |
| 8 | Modal (gVisor) | 15241 | 13706 – 15840 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 148641 | 60516 – 155276 | 6 | — |
| 2 | Blaxel | 115777 | 105730 – 158931 | 6 | n too small |
| 3 | Daytona (VM) | 82629 | 65757 – 99378 | 6 | n too small |
| 4 | Microsandbox Cloud | 69290 | 54986 – 84740 | 6 | n too small |
| 5 | Namespace | 51650 | 43438 – 57424 | 6 | n too small |
| 6 | E2B | 50150 | 43340 – 60639 | 6 | n too small |
| 7 | Modal (VM) | 27579 | 13743 – 57019 | 6 | n too small |
| 8 | Modal (gVisor) | 13679 | 12644 – 14063 | 6 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace and Novita share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 6 | n too small, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 8 | Modal (gVisor) | 177 | 173 – 179 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.6× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 7764 | 6828 – 9972 | 6 | — |
| 2 | Microsandbox Cloud | 4724 | 2423 – 5321 | 6 | n too small |
| 3 | Novita | 4266 | 3462 – 5303 | 6 | n too small |
| 4 | Daytona (VM) | 4224 | 3961 – 5506 | 6 | n too small |
| 5 | E2B | 2503 | 985.6 – 6701 | 6 | n too small |
| 6 | Modal (VM) | 1542 | 1466 – 1928 | 6 | n too small |
| 7 | Namespace | 1235 | 969.1 – 2131 | 6 | n too small |
| 8 | Blaxel | 675 | 251 – 1104 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~2.4× Modal (gVisor) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9110 | 2864 – 9302 | 6 | — |
| 2 | Modal (gVisor) | 3744 | 169.3 – 8688 | 6 | n too small |
| 3 | Namespace | 3735 | 3241 – 4640 | 6 | n too small |
| 4 | E2B | 3501 | 1072 – 3661 | 6 | n too small |
| 5 | Daytona (VM) | 3193 | 241.2 – 4667 | 6 | n too small |
| 6 | Novita | 3059 | 1097 – 5176 | 6 | n too small |
| 7 | Microsandbox Cloud | 1614 | 1339 – 2914 | 6 | n too small |
| 8 | Blaxel | 1299 | 810.1 – 2133 | 6 | n too small |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 381.5 | 368 – 386 | 6 | — |
| 2 | Daytona (VM) | 440 | 401 – 445 | 6 | n too small |
| 3 | Novita | 485 | 482 – 673 | 6 | n too small |
| 4 | Blaxel | 488 | 485 – 496 | 6 | n too small |
| 5 | Microsandbox Cloud | 497.5 | 494 – 509 | 6 | n too small |
| 6 | Modal (VM) | 669.5 | 662 – 818 | 6 | n too small |
| 7 | E2B | 803.5 | 800 – 808 | 6 | n too small |
| 8 | Modal (gVisor) | 900 | 677 – 901 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 37.55 | 35.91 – 38.49 | 6 | — |
| 2 | Daytona (VM) | 39.48 | 36.47 – 40.8 | 6 | n too small |
| 3 | Blaxel | 42.84 | 42.35 – 43.3 | 6 | n too small |
| 4 | Novita | 44.46 | 43.84 – 50.56 | 6 | n too small |
| 5 | Modal (VM) | 47.37 | 47.29 – 67.39 | 6 | n too small |
| 6 | Microsandbox Cloud | 50.33 | 48.25 – 53.06 | 6 | n too small |
| 7 | E2B | 65.23 | 64.46 – 66.75 | 6 | n too small |
| 8 | Modal (gVisor) | 79.41 | 73.49 – 87.22 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 324800 | 293500 – 338700 | 6 | — |
| 2 | Novita | 267600 | 227600 – 297300 | 6 | n too small |
| 3 | Daytona (VM) | 253200 | 238300 – 282300 | 6 | n too small |
| 4 | Microsandbox Cloud | 242100 | 227500 – 259500 | 6 | n too small |
| 5 | Namespace | 221100 | 174600 – 321000 | 6 | n too small |
| 6 | Modal (VM) | 191200 | 175400 – 197400 | 6 | n too small |
| 7 | E2B | 175300 | 171600 – 177100 | 6 | n too small |
| 8 | Modal (gVisor) | 11640 | 11020 – 12360 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.154 | 0.15 – 0.1641 | 6 | — |
| 2 | Novita | 0.1865 | 0.168 – 0.222 | 6 | n too small |
| 3 | Daytona (VM) | 0.1975 | 0.177 – 0.21 | 6 | n too small |
| 4 | Microsandbox Cloud | 0.2065 | 0.193 – 0.219 | 6 | n too small |
| 5 | Namespace | 0.226 | 0.156 – 0.286 | 6 | n too small |
| 6 | Modal (VM) | 0.2615 | 0.253 – 0.285 | 6 | n too small |
| 7 | E2B | 0.285 | 0.282 – 0.291 | 6 | n too small |
| 8 | Modal (gVisor) | 4.297 | 4.046 – 4.538 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 27050 | 20390 – 27980 | 6 | — |
| 2 | Blaxel | 22770 | 22220 – 24090 | 6 | n too small |
| 3 | Namespace | 19450 | 12880 – 33050 | 6 | n too small |
| 4 | Microsandbox Cloud | 17940 | 17300 – 18660 | 6 | n too small |
| 5 | Daytona (VM) | 15370 | 14490 – 17170 | 6 | n too small |
| 6 | Modal (VM) | 12720 | 10440 – 13790 | 6 | n too small |
| 7 | E2B | 11190 | 10880 – 11740 | 6 | n too small |
| 8 | Modal (gVisor) | 1975 | 1713 – 2096 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 1.849 | 1.787 – 2.481 | 6 | — |
| 2 | Blaxel | 2.196 | 2.076 – 2.242 | 6 | n too small |
| 3 | Namespace | 2.573 | 1.516 – 3.881 | 6 | n too small |
| 4 | Microsandbox Cloud | 2.788 | 2.679 – 2.89 | 6 | n too small |
| 5 | Daytona (VM) | 3.253 | 2.911 – 3.451 | 6 | n too small |
| 6 | Modal (VM) | 3.933 | 3.625 – 4.787 | 6 | n too small |
| 7 | E2B | 4.468 | 4.134 – 4.596 | 6 | n too small |
| 8 | Modal (gVisor) | 25.32 | 23.85 – 29.18 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 33.92 | 31.23 – 38.19 | 6 | — |
| 2 | Blaxel | 38.11 | 37.81 – 38.93 | 6 | n too small |
| 3 | Novita | 41.53 | 40.29 – 56.19 | 6 | n too small |
| 4 | Microsandbox Cloud | 50.53 | 49.65 – 57.18 | 6 | n too small |
| 5 | Namespace | 62.61 | 55.34 – 68.04 | 6 | n too small |
| 6 | Modal (VM) | 64.4 | 63.02 – 70.53 | 6 | n too small |
| 7 | E2B | 70.16 | 68.78 – 72.12 | 6 | n too small |
| 8 | Modal (gVisor) | 419.1 | 377.7 – 454.4 | 6 | n too small |

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

29 uncovered results across 8 providers (Blaxel 3, Daytona (VM) 2, E2B 2, Microsandbox Cloud 11, Modal (gVisor) 4, Modal (VM) 2, Namespace 2, Novita 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Microsandbox Cloud | realworld-better-auth | **skipped** | pts_realworld-better-auth: PTS install of local/realworld-better-auth-1.0.0 failed (exit 0, not in list-installed-tests) |
| Microsandbox Cloud | realworld-mastra | **skipped** | pts_realworld-mastra: PTS install of local/realworld-mastra-1.0.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-better-auth | **failed** | Suite "realworld-better-auth" on microsandbox-cloud produced no pts_*.xml — PTS likely failed silently |
| Microsandbox Cloud | realworld-better-auth | **failed** | PTS ran but every trial failed for 2 of 10 declared metrics: realworld_better_auth_task_build (realworld-better-auth/pts_realworld-better-auth.xml), realworld_better_auth_task_cold_install (realworld-better-auth/pts_realworld-better-auth.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-better-auth | **failed** | PTS ran but every trial failed for 1 of 10 declared metrics: realworld_better_auth_task_cold_install (realworld-better-auth/pts_realworld-better-auth.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | Suite "realworld-mastra" on microsandbox-cloud produced no pts_*.xml — PTS likely failed silently |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 3 of 5 declared metrics: realworld_mastra_task_build_core (realworld-mastra/pts_realworld-mastra.xml), realworld_mastra_task_cold_install (realworld-mastra/pts_realworld-mastra.xml), realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 4 of 5 declared metrics: realworld_mastra_task_build_core (realworld-mastra/pts_realworld-mastra.xml), realworld_mastra_task_cold_install (realworld-mastra/pts_realworld-mastra.xml), realworld_mastra_task_lint_format (realworld-mastra/pts_realworld-mastra.xml), realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_cold_install (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

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
Samples, so the test could not have separated the rows at any effect size (here 15 v 15 floors at p ≈ <0.001; 20 v 33 floors at p ≈ <0.001; 21 v 36 floors at p ≈ <0.001; 3 v 6 floors at p ≈ 0.024; 33 v 43 floors at p ≈ <0.001; 35 v 35 floors at p ≈ <0.001; 35 v 75 floors at p ≈ <0.001; 36 v 9 floors at p ≈ <0.001; 43 v 21 floors at p ≈ <0.001; 55 v 75 floors at p ≈ <0.001; 6 v 6 floors at p ≈ 0.0022; 60 v 55 floors at p ≈ <0.001; 65 v 60 floors at p ≈ <0.001; 75 v 35 floors at p ≈ <0.001; 75 v 65 floors at p ≈ <0.001; 9 v 10 floors at p ≈ <0.001; 9 v 9 floors at p ≈ <0.001).
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
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Daytona (VM) | 0.98 (tied) | 0.43 |
| realworld | Mastra: cold install | Novita | 0.020 | 0.0046 |
| realworld | Mastra: cold install | Modal (VM) | 0.11 (tied) | 0.019 |
| realworld | Mastra: cold install | Namespace | 0.27 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.064 (tied) | 0.0089 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | 0.34 (tied) | 0.066 |
| realworld | Better-Auth: build | Namespace | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.042 | 0.012 |
| realworld | Better-Auth: build | Modal (VM) | 0.38 (tied) | 0.32 |
| realworld | Better-Auth: build | Novita | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.033 | 0.19 |
| realworld | Better-Auth: cold install | Novita | 0.14 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.0056 | <0.001 |
| realworld | Better-Auth: cold install | E2B | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.010 | 0.019 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.022 | 0.021 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | 0.013 | <0.001 |
| realworld | Better-Auth: git clone | Namespace | 0.66 (tied) | 0.43 |
| realworld | Better-Auth: git clone | E2B | 0.21 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.72 (tied) | 0.99 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Novita | 0.35 (tied) | 0.38 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.0025 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.50 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.82 (tied) | 0.93 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.089 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.10 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.55 (tied) | 0.080 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.0020 | 0.0028 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.11 (tied) | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.023 | 0.019 |
| realworld | Better-Auth: lint format | Blaxel | 0.70 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.053 (tied) | 0.080 |
| realworld | Better-Auth: lint format | Novita | 0.34 (tied) | 0.67 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.033 | 0.0046 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Namespace | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Blaxel | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Novita | 0.0068 | 0.0046 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.44 (tied) | 0.67 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Blaxel | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.15 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.34 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.0018 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | 0.76 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Novita | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.62 (tied) | 0.93 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.98 (tied) | 0.99 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | 0.0046 |
| realworld | Better-Auth: typecheck | Namespace | 0.55 (tied) | 0.79 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.44 (tied) | 0.38 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.89 (tied) | 0.93 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.0018 | <0.001 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | 0.68 (tied) | 0.43 |
| realworld | Mastra: build:core | Blaxel | 0.045 | 0.066 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.51 (tied) | 0.45 |
| realworld | Mastra: build:core | Modal (VM) | 0.19 (tied) | 0.067 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.93 (tied) | 0.79 |
| realworld | Mastra: git clone | Daytona (VM) | 0.017 | 0.066 |
| realworld | Mastra: git clone | Novita | 0.089 (tied) | 0.19 |
| realworld | Mastra: git clone | Namespace | 0.0056 | <0.001 |
| realworld | Mastra: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.0073 | <0.001 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Blaxel | 0.078 (tied) | 0.019 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.028 | 0.0046 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.017 | 0.020 |
| realworld | Mastra: lint:format | Novita | 0.022 | 0.032 |
| realworld | Mastra: lint:format | Modal (VM) | 0.11 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.0036 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.12 (tied) | 0.27 |
| realworld | OpenClaw: cold install | Namespace | 0.72 (tied) | 0.27 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.079 (tied) | 0.026 |
| realworld | OpenClaw: git clone | Modal (VM) | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.41 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.99 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Namespace | 0.84 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (extension channels) | Blaxel | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Novita | 0.0068 | 0.019 |
| realworld | OpenClaw: lint (extension channels) | Namespace | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.24 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.024 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.84 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.89 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.18 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | <0.001 | <0.001 |
| cpu | Node.js web tooling | Blaxel | — | — |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.033 (n too small) | 0.033 |
| cpu | Node.js web tooling | Namespace | 0.82 (n too small) | 0.089 |
| cpu | Node.js web tooling | Daytona (VM) | 0.0093 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Novita | 0.43 (n too small) | 0.12 |
| cpu | Node.js web tooling | E2B | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.065 (n too small) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.31 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.79 (n too small) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.058 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.065 (n too small) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.31 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.82 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.074 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.024 (n too small) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.47 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.026 (n too small) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.48 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.0043 (n too small) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.093 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.024 (n too small) | 0.011 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.093 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.13 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.94 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.13 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.94 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.065 (n too small) | 0.012 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | Hardlink throughput | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Modal (VM) | — | — |
| memory | STREAM Triad | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Daytona (VM) | 0.17 (n too small) | 0.0047 |
| memory | STREAM Triad | Modal (gVisor) | 0.013 (n too small) | 0.0047 |
| memory | STREAM Triad | Microsandbox Cloud | 0.081 (n too small) | 0.051 |
| memory | STREAM Triad | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Novita | 0.27 (n too small) | 0.0047 |
| memory | STREAM Triad | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Modal (VM) | — | — |
| memory | STREAM Add | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Daytona (VM) | 0.20 (n too small) | 0.0047 |
| memory | STREAM Add | Modal (gVisor) | 0.036 (n too small) | 0.0047 |
| memory | STREAM Add | Microsandbox Cloud | 0.0048 (n too small) | 0.0011 |
| memory | STREAM Add | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Novita | 0.27 (n too small) | 0.0047 |
| memory | STREAM Add | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (VM) | — | — |
| memory | STREAM Copy | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | 0.0018 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | 0.0035 (n too small) | 0.0011 |
| memory | STREAM Copy | Microsandbox Cloud | 0.084 (n too small) | <0.001 |
| memory | STREAM Copy | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Novita | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Modal (VM) | — | — |
| memory | STREAM Scale | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | 0.17 (n too small) | 0.0047 |
| memory | STREAM Scale | Modal (gVisor) | 0.0066 (n too small) | <0.001 |
| memory | STREAM Scale | Microsandbox Cloud | 0.015 (n too small) | 0.0047 |
| memory | STREAM Scale | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Novita | 0.90 (n too small) | 0.14 |
| memory | STREAM Scale | Namespace | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.59 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.82 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.026 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.59 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.82 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.18 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | E2B | 1.0 (n too small) | 1.0 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.093 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.015 (n too small) | 0.012 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Novita | 0.70 (n too small) | 0.81 |
| network | iperf3 WAN download | Daytona (VM) | 0.94 (n too small) | 1.0 |
| network | iperf3 WAN download | E2B | 0.065 (n too small) | 0.012 |
| network | iperf3 WAN download | Modal (VM) | 1.0 (n too small) | 0.32 |
| network | iperf3 WAN download | Namespace | 0.31 (n too small) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.0087 (n too small) | 0.012 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Modal (gVisor) | 0.065 (n too small) | 0.077 |
| network | iperf3 WAN upload | Namespace | 1.0 (n too small) | 0.32 |
| network | iperf3 WAN upload | E2B | 0.13 (n too small) | 0.32 |
| network | iperf3 WAN upload | Daytona (VM) | 1.0 (n too small) | 0.81 |
| network | iperf3 WAN upload | Novita | 0.82 (n too small) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.18 (n too small) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.31 (n too small) | 0.32 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Blaxel | 0.56 (n too small) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.0043 (n too small) | 0.012 |
| system | PyBench | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | E2B | 0.37 (n too small) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.36 (n too small) | 0.077 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.24 (n too small) | 0.077 |
| system | Git common operations | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Novita | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.13 (n too small) | 0.077 |
| system | Git common operations | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | Git common operations | E2B | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Novita | 0.0087 (n too small) | 0.012 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.82 (n too small) | 0.81 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.18 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | Namespace | 0.39 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.13 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | E2B | 0.026 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Novita | 0.0087 (n too small) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.78 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.19 (n too small) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.37 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.041 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Namespace | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | E2B | 0.065 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.065 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.026 (n too small) | 0.012 |
| system | SQLite Speedtest | Novita | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.24 (n too small) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.0087 (n too small) | 0.012 |
| system | SQLite Speedtest | Modal (VM) | 0.093 (n too small) | 0.077 |
| system | SQLite Speedtest | E2B | 0.093 (n too small) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

