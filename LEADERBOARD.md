# Sandbox provider leaderboard

Run [`32202700104`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/32202700104) · commit [`ed69316182d0a61c7281936027a98d6ac4001a6c`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/ed69316182d0a61c7281936027a98d6ac4001a6c) ·
dataset [`data/dataset/runs/32202700104.json`](data/dataset/runs/32202700104.json) · generated 2026-08-19T04:06:29.024Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **514 metric records**
backed by **5103 retained trial observations**, across **46 metrics** and
**12 providers**; every emitted, catalogued metric has a ranked table below
(median across sandboxes), grouped by dimension with its headline first — some behind a disclosure triangle, none omitted.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median across sandboxes (one machine, one vote) · interval = cluster bootstrap,
labelled 95% but ≈77% actual coverage at 3 sandboxes (see methodology) · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

**Document order:** the real-world developer workflows lead, because what a developer or a CI job
actually waits on is what this benchmark exists to measure. The synthetic microbenchmarks (`cpu`, `disk`, `memory`, `network`, `system`)
load one hardware axis in isolation — a real question, but a different one — so each is collapsed by
default; expand a section to read its tables.

**The `realworld` section is drawn, not tabulated.** One stacked chart per repo, each bar a
whole pipeline on one environment and each segment a task. Its per-task rankings — the medians,
intervals and trial counts every bar is built from — are still here, one triangle down: the charts
are what the section is FOR, and the tables are how you check them.

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
| run.cloud | Firecracker microVM | vm |
| Runloop | microVM | vm |
| tama | container (shared kernel) | unknown |
| Vercel Sandbox | Firecracker microVM | vm |

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **4 vCPU · 10 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 12 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 10 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.38 | 38.44 – 41.6 | 12 | 12 | — |
| 2 | Novita | 45.92 | 42.89 – 48.15 | 12 | 12 | — |
| 3 | Modal (VM) | 51.65 | 50.42 – 53.17 | 12 | 12 | — |
| 3 | Namespace | 51.74 | 49.93 – 58.65 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 59.11 | 57.21 – 61.87 | 12 | 12 | — |
| 6 | E2B | 69.06 | 67.73 – 73.15 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 74.75 | 70.01 – 75.99 | 12 | 12 | — |
| 8 | Runloop | 90.44 | 87.34 – 95.17 | 12 | 12 | — |
| 8 | Modal (gVisor) | 96.69 | 93.06 – 103.6 | 12 | 12 | tied |
| 8 | tama | 104.2 | 60.62 – 147.7 | 2 | 2 | tied |
| 8 | Blaxel | 128 | 126.4 – 130.7 | 12 | 12 | tied |
| 12 | run.cloud | 180.7 | 180.1 – 230.5 | 7 | 7 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads · run.cloud is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 54.07 | 53.33 – 54.71 | 12 | 12 | — |
| 2 | run.cloud | 57.33 | 55 – 58.59 | 4 | 4 | — |
| 3 | Novita | 67.32 | 66.58 – 68.37 | 12 | 12 | — |
| 3 | Modal (VM) | 69.1 | 64.28 – 78.05 | 12 | 12 | tied |
| 3 | Namespace | 69.65 | 67.97 – 94.42 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 91.61 | 90.28 – 93.45 | 12 | 12 | — |
| 7 | E2B | 102.2 | 97.94 – 105.2 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 103.6 | 101.6 – 110.5 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 134.1 | 132.9 – 138 | 12 | 12 | — |
| 9 | Blaxel | 137.8 | 92.47 – 144.8 | 12 | 12 | tied |
| 11 | Runloop | 177.5 | 174.4 – 178.6 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_run.cloud, Daytona (VM), Namespace and Novita share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | run.cloud | 12.84 | 11.18 – 14.01 | 4 | 4 | — |
| 1 | Daytona (VM) | 12.91 | 12.64 – 13.39 | 12 | 12 | tied |
| 1 | Namespace | 13.94 | 11.75 – 15.28 | 12 | 12 | tied |
| 1 | Novita | 14.69 | 14.14 – 14.93 | 12 | 12 | tied |
| 5 | Modal (VM) | 18.14 | 16.27 – 18.59 | 12 | 12 | — |
| 6 | Vercel Sandbox | 19.81 | 19.34 – 21.69 | 12 | 12 | — |
| 6 | E2B | 19.98 | 19.44 – 20.45 | 12 | 12 | tied |
| 8 | Microsandbox Cloud | 21 | 20.5 – 21.65 | 12 | 12 | — |
| 9 | Blaxel | 30.45 | 17.91 – 31.86 | 12 | 12 | — |
| 10 | Runloop | 32.61 | 32.47 – 33.05 | 12 | 12 | — |
| 11 | Modal (gVisor) | 34.26 | 32.85 – 35.24 | 12 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Vercel Sandbox is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.741 | 0.6985 – 0.788 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.9365 | 0.911 – 0.978 | 12 | 12 | — |
| 3 | Blaxel | 1.183 | 0.876 – 1.284 | 12 | 12 | — |
| 3 | Modal (VM) | 1.448 | 0.9375 – 1.595 | 12 | 12 | tied |
| 3 | E2B | 1.459 | 1.387 – 1.638 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 1.531 | 1.498 – 1.615 | 12 | 12 | tied |
| 3 | Daytona (VM) | 1.675 | 1.483 – 1.894 | 12 | 12 | tied |
| 3 | Runloop | 1.976 | 1.641 – 4.331 | 12 | 12 | tied |
| 3 | run.cloud | 2.03 | 1.542 – 3.018 | 4 | 4 | tied |
| 3 | Novita | 2.089 | 2.013 – 2.171 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 2.383 | 2.276 – 2.476 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) and run.cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.901 | 2.875 – 2.939 | 12 | 12 | — |
| 1 | run.cloud | 2.973 | 2.83 – 3.03 | 4 | 4 | tied |
| 3 | Namespace | 3.261 | 3.177 – 3.734 | 12 | 12 | — |
| 3 | Novita | 3.268 | 3.237 – 3.392 | 12 | 12 | tied |
| 5 | Modal (VM) | 3.788 | 3.557 – 4.114 | 12 | 12 | — |
| 6 | Vercel Sandbox | 4.312 | 4.229 – 4.425 | 12 | 12 | — |
| 7 | E2B | 5.036 | 4.928 – 5.172 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 5.042 | 4.854 – 5.195 | 12 | 12 | tied |
| 7 | Blaxel | 5.095 | 3.84 – 5.502 | 12 | 12 | tied |
| 10 | Runloop | 6.877 | 6.633 – 7.165 | 12 | 12 | — |
| 11 | Modal (gVisor) | 9.715 | 9.401 – 10.36 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_run.cloud leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | run.cloud | 9.695 | 9.359 – 9.928 | 4 | 4 | — |
| 2 | Daytona (VM) | 10.35 | 10.2 – 10.39 | 12 | 12 | — |
| 3 | Namespace | 10.82 | 10.61 – 13.61 | 12 | 12 | — |
| 3 | Novita | 11.01 | 10.8 – 11.46 | 12 | 12 | tied |
| 5 | Modal (VM) | 13 | 12.25 – 13.84 | 12 | 12 | — |
| 6 | Vercel Sandbox | 14.73 | 14.48 – 15.06 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 17.15 | 16.29 – 17.84 | 12 | 12 | — |
| 8 | E2B | 18.96 | 18.23 – 19.51 | 12 | 12 | — |
| 8 | Blaxel | 19.12 | 13.41 – 21.33 | 12 | 12 | tied |
| 10 | Runloop | 25.18 | 24.7 – 25.35 | 12 | 12 | — |
| 11 | Modal (gVisor) | 28.46 | 27.91 – 29.36 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_run.cloud, Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | run.cloud | 2.665 | 2.465 – 2.695 | 4 | 4 | — |
| 1 | Namespace | 2.726 | 2.67 – 3.75 | 12 | 12 | tied |
| 1 | Daytona (VM) | 2.815 | 2.787 – 2.898 | 12 | 12 | tied |
| 4 | Novita | 2.974 | 2.89 – 3.078 | 12 | 12 | — |
| 5 | Modal (VM) | 3.581 | 3.184 – 4.033 | 12 | 12 | — |
| 6 | Vercel Sandbox | 4.465 | 4.374 – 4.501 | 12 | 12 | — |
| 7 | Blaxel | 4.971 | 3.861 – 5.758 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 5.035 | 4.627 – 5.37 | 12 | 12 | tied |
| 7 | E2B | 5.099 | 4.982 – 5.256 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 6.606 | 6.383 – 6.732 | 12 | 12 | — |
| 11 | Runloop | 7.223 | 7.01 – 7.26 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) and run.cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.386 | 2.348 – 2.439 | 12 | 12 | — |
| 1 | run.cloud | 2.458 | 2.382 – 2.543 | 4 | 4 | tied |
| 3 | Novita | 2.706 | 2.632 – 2.736 | 12 | 12 | — |
| 3 | Namespace | 2.845 | 2.658 – 3.614 | 12 | 12 | tied |
| 3 | Modal (VM) | 3.165 | 2.967 – 3.463 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 3.723 | 3.619 – 3.801 | 12 | 12 | — |
| 7 | E2B | 4.196 | 4.082 – 4.264 | 12 | 12 | — |
| 8 | Microsandbox Cloud | 4.47 | 4.296 – 4.74 | 12 | 12 | — |
| 8 | Blaxel | 4.728 | 3.519 – 4.996 | 12 | 12 | tied |
| 10 | Runloop | 7.468 | 7.293 – 7.789 | 12 | 12 | — |
| 11 | Modal (gVisor) | 8.796 | 8.563 – 9.548 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_run.cloud leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | run.cloud | 6.678 | 6.306 – 6.751 | 4 | 4 | — |
| 2 | Daytona (VM) | 7.331 | 7.23 – 7.455 | 12 | 12 | — |
| 2 | Namespace | 7.38 | 6.924 – 8.848 | 12 | 12 | tied |
| 2 | Novita | 7.817 | 7.56 – 8.039 | 12 | 12 | tied |
| 5 | Modal (VM) | 8.848 | 8.027 – 9.997 | 12 | 12 | — |
| 6 | Vercel Sandbox | 11.28 | 11.01 – 11.62 | 12 | 12 | — |
| 7 | E2B | 13.15 | 12.77 – 13.82 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 14.09 | 13.31 – 14.83 | 12 | 12 | tied |
| 7 | Blaxel | 14.97 | 9.526 – 21.73 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 16.18 | 15.81 – 16.84 | 12 | 12 | tied |
| 11 | Runloop | 18.86 | 18.41 – 19.38 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.1 | 22.57 – 24.69 | 12 | 12 | — |
| 2 | Novita | 30.06 | 29.81 – 31.18 | 12 | 12 | — |
| 2 | run.cloud | 31.94 | 29.28 – 32.89 | 4 | 4 | tied |
| 2 | Modal (VM) | 33.6 | 29.67 – 38.64 | 12 | 12 | tied |
| 2 | Namespace | 34.77 | 31.93 – 45.52 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 45.18 | 43.59 – 46.12 | 12 | 12 | — |
| 7 | E2B | 52.3 | 49.73 – 54.76 | 12 | 12 | — |
| 8 | Microsandbox Cloud | 54.88 | 52.57 – 57.46 | 12 | 12 | — |
| 9 | Blaxel | 67.45 | 41.44 – 75.09 | 12 | 12 | — |
| 10 | Modal (gVisor) | 101.4 | 98.25 – 108.8 | 12 | 12 | — |
| 10 | Runloop | 108.1 | 105.7 – 111.1 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) and run.cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 38.93 | 38.28 – 39.45 | 12 | 12 | — |
| 1 | run.cloud | 41.1 | 38.64 – 41.45 | 4 | 4 | tied |
| 3 | Novita | 43.53 | 42.86 – 44.38 | 12 | 12 | — |
| 4 | Modal (VM) | 49.21 | 45.72 – 55.96 | 12 | 12 | — |
| 4 | Namespace | 51.39 | 43.68 – 66.4 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 67.62 | 66.88 – 71.42 | 12 | 12 | — |
| 7 | E2B | 75.04 | 71.84 – 77.66 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 75.4 | 72.28 – 79.92 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 85.46 | 81.6 – 87.23 | 12 | 12 | — |
| 9 | Blaxel | 94.2 | 60.62 – 98.09 | 12 | 12 | tied |
| 11 | Runloop | 119.6 | 118.8 – 123.8 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 71 | 70.07 – 71.33 | 12 | 12 | — |
| 2 | Novita | 75.6 | 74.6 – 77.19 | 12 | 12 | — |
| 2 | Namespace | 77.42 | 74.47 – 85.25 | 12 | 12 | tied |
| 4 | Modal (VM) | 91.05 | 90.5 – 92.79 | 12 | 12 | — |
| 4 | tama | 104.2 | 100.5 – 108 | 2 | 2 | tied |
| 6 | Vercel Sandbox | 117.3 | 114.3 – 118.7 | 12 | 12 | — |
| 6 | Blaxel | 119.3 | 113.7 – 122.2 | 12 | 12 | tied |
| 8 | Microsandbox Cloud | 124.4 | 121.2 – 128.5 | 12 | 12 | — |
| 8 | E2B | 127.7 | 122.6 – 132.5 | 12 | 12 | tied |
| 10 | run.cloud | 140.8 | 139 – 141 | 7 | 7 | — |
| 11 | Modal (gVisor) | 164.4 | 157 – 174.3 | 12 | 12 | — |
| 12 | Runloop | 180.8 | 172 – 190.9 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel, Namespace, Vercel Sandbox, Daytona (VM), Modal (VM) and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.479 | 2.151 – 2.832 | 12 | 12 | — |
| 1 | Namespace | 2.65 | 1.986 – 3.038 | 12 | 12 | tied |
| 1 | Vercel Sandbox | 2.859 | 2.455 – 3.248 | 12 | 12 | tied |
| 1 | Daytona (VM) | 2.913 | 2.46 – 3.868 | 12 | 12 | tied |
| 1 | Modal (VM) | 3.028 | 2.974 – 4.243 | 12 | 12 | tied |
| 1 | Novita | 3.446 | 3.204 – 3.901 | 12 | 12 | tied |
| 7 | Microsandbox Cloud | 3.856 | 3.804 – 3.938 | 12 | 12 | — |
| 7 | E2B | 4.482 | 3.428 – 5.43 | 12 | 12 | tied |
| 7 | tama | 4.639 | 4.602 – 4.677 | 2 | 2 | tied |
| 10 | run.cloud | 5.394 | 4.098 – 6.694 | 7 | 7 | too few sandboxes |
| 10 | Modal (gVisor) | 5.724 | 5.363 – 5.91 | 12 | 12 | tied |
| 12 | Runloop | 7.188 | 5.999 – 8.395 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM), Namespace and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 94 | 92.79 – 94.84 | 12 | 12 | — |
| 1 | Namespace | 95.44 | 91.87 – 98.03 | 12 | 12 | tied |
| 1 | Novita | 97.7 | 94.4 – 99.45 | 12 | 12 | tied |
| 4 | Modal (VM) | 114.9 | 113.4 – 116.6 | 12 | 12 | — |
| 4 | tama | 140 | 107.3 – 172.7 | 2 | 2 | tied |
| 4 | Vercel Sandbox | 144.3 | 141.6 – 149.8 | 12 | 12 | tied |
| 7 | E2B | 161.7 | 157.1 – 167.3 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 163.7 | 160.4 – 166.5 | 12 | 12 | tied |
| 9 | run.cloud | 182.8 | 180.3 – 185.5 | 7 | 7 | — |
| 10 | Modal (gVisor) | 198.5 | 194.7 – 212.4 | 12 | 12 | — |
| 11 | Runloop | 225.1 | 216.8 – 229.9 | 12 | 12 | — |
| 12 | Blaxel | 235 | 232.9 – 236.7 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.51 | 11.21 – 12.75 | 12 | 12 | — |
| 2 | Namespace | 13.09 | 12.13 – 17.25 | 12 | 12 | — |
| 2 | Daytona (VM) | 14.63 | 13.62 – 16.24 | 12 | 12 | tied |
| 2 | run.cloud | 16.39 | 12.78 – 18.89 | 12 | 12 | tied |
| 2 | Novita | 16.47 | 15.58 – 17.69 | 12 | 12 | tied |
| 2 | Modal (VM) | 17.34 | 16.96 – 17.49 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 17.75 | 17.66 – 18.33 | 8 | 8 | — |
| 8 | E2B | 19.47 | 19.05 – 20.99 | 12 | 12 | — |
| 9 | Microsandbox Cloud | 25.34 | 23.43 – 26.3 | 12 | 12 | — |
| 10 | Modal (gVisor) | 28.48 | 27.15 – 31.23 | 12 | 12 | — |
| 10 | Runloop | 31.14 | 29.92 – 32.13 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.46 | 2.439 – 2.792 | 12 | 12 | — |
| 2 | Namespace | 2.82 | 2.666 – 3.072 | 12 | 12 | — |
| 3 | Daytona (VM) | 3.099 | 2.974 – 3.851 | 12 | 12 | — |
| 3 | Modal (VM) | 3.3 | 3.146 – 3.534 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.756 | 3.696 – 3.881 | 8 | 8 | — |
| 6 | Novita | 4.498 | 4.249 – 4.562 | 12 | 12 | — |
| 7 | E2B | 4.698 | 4.593 – 6.332 | 12 | 12 | — |
| 7 | run.cloud | 5.109 | 4.268 – 7.203 | 12 | 12 | tied |
| 7 | Microsandbox Cloud | 5.52 | 5.164 – 5.671 | 12 | 12 | tied |
| 10 | Runloop | 7.714 | 6.938 – 10.07 | 12 | 12 | — |
| 10 | Modal (gVisor) | 9.177 | 8.815 – 10.68 | 12 | 12 | tied |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Blaxel, Daytona (VM), run.cloud and Novita share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 58.51 | 57.61 – 99.03 | 12 | 12 | — |
| 1 | Daytona (VM) | 59.61 | 59.03 – 60.03 | 12 | 12 | tied |
| 1 | run.cloud | 60.61 | 58.7 – 91.31 | 12 | 12 | tied |
| 1 | Novita | 68.71 | 65.73 – 72.32 | 12 | 12 | tied |
| 5 | Modal (VM) | 74.25 | 73.28 – 75.14 | 12 | 12 | — |
| 5 | Namespace | 86.13 | 73 – 121.1 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 99.16 | 92.61 – 105.8 | 8 | 8 | tied |
| 8 | E2B | 107.9 | 105.8 – 111.7 | 12 | 12 | — |
| 9 | Modal (gVisor) | 125.2 | 122 – 168.4 | 12 | 12 | — |
| 9 | Microsandbox Cloud | 130.1 | 103.7 – 146.1 | 12 | 12 | tied |
| 11 | Runloop | 176 | 172.9 – 181.4 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 91.8 | 89.87 – 97.13 | 12 | 12 | — |
| 2 | Namespace | 100.3 | 93.52 – 152.8 | 12 | 12 | — |
| 2 | run.cloud | 103.6 | 99.43 – 144.8 | 12 | 12 | tied |
| 2 | Novita | 113.6 | 112.9 – 117.1 | 12 | 12 | tied |
| 2 | Modal (VM) | 116.9 | 115.5 – 121.9 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 153.7 | 148.4 – 157.7 | 8 | 8 | — |
| 6 | Microsandbox Cloud | 162.4 | 152.5 – 183.7 | 12 | 12 | tied |
| 8 | E2B | 186.6 | 179.7 – 191.6 | 12 | 12 | — |
| 9 | Modal (gVisor) | 267.3 | 234.3 – 289.7 | 12 | 12 | — |
| 9 | Runloop | 288.3 | 284.7 – 291.1 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) leads · run.cloud is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 15.79 | 15.4 – 16.83 | 12 | 12 | — |
| 2 | run.cloud | 17.3 | 16.78 – 24.5 | 12 | 12 | — |
| 2 | Blaxel | 17.37 | 16.83 – 24.06 | 12 | 12 | tied |
| 2 | Namespace | 19.25 | 16.87 – 25.61 | 12 | 12 | tied |
| 2 | Modal (VM) | 20.77 | 20.31 – 21.57 | 12 | 12 | tied |
| 2 | Novita | 21.86 | 21.56 – 22.33 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 26.78 | 25.32 – 27.18 | 8 | 8 | — |
| 8 | Microsandbox Cloud | 30.15 | 27.99 – 32.23 | 12 | 12 | — |
| 9 | Modal (gVisor) | 32.69 | 31.1 – 49.94 | 12 | 12 | — |
| 9 | E2B | 36.44 | 35.47 – 37.24 | 12 | 12 | tied |
| 11 | Runloop | 51.09 | 47 – 56.48 | 12 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.2× run.cloud on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 26.06 | 22.19 – 26.21 | 3 | 30 | — |
| 2 | run.cloud | 21.66 | 21.54 – 21.72 | 1 | 3 | too few sandboxes |
| 3 | Daytona (VM) | 18.66 | 18.09 – 21.22 | 3 | 21 | too few sandboxes |
| 4 | Novita | 18.51 | 18.38 – 18.54 | 3 | 18 | too few sandboxes |
| 5 | tama | 16.18 | 13.48 – 16.29 | 3 | 19 | too few sandboxes |
| 6 | Modal (VM) | 14.96 | 11.78 – 15.97 | 3 | 16 | too few sandboxes |
| 7 | Vercel Sandbox | 12.73 | 12.07 – 13.72 | 3 | 16 | too few sandboxes |
| 8 | Microsandbox Cloud | 11.96 | 11.68 – 12.02 | 3 | 45 | too few sandboxes |
| 9 | E2B | 11.21 | 10.55 – 11.31 | 3 | 14 | too few sandboxes |
| 10 | Blaxel | 9.475 | 9.45 – 9.515 | 3 | 36 | too few sandboxes |
| 11 | Modal (gVisor) | 8.765 | 8.64 – 9.72 | 3 | 23 | too few sandboxes |
| 12 | Runloop | 8.64 | 8.38 – 8.87 | 3 | 42 | too few sandboxes |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 273000 | 230000 – 276500 | 3 | 6 | — |
| 2 | Modal (VM) | 269000 | 171800 – 308000 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 248000 | 243500 – 265000 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 237500 | 214000 – 238500 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 235500 | 233500 – 249500 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 192500 | 190500 – 195500 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 165500 | 162500 – 167500 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 112500 | 109000 – 116000 | 1 | 2 | too few sandboxes |
| 9 | tama | 93750 | 83500 – 104000 | 1 | 2 | n too small |
| 10 | Novita | 77450 | 71900 – 79950 | 3 | 6 | too few sandboxes |
| 11 | E2B | 46700 | 46050 – 47750 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 32200 | 30400 – 33000 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1066 | 898 – 1081 | 3 | 6 | — |
| 2 | Modal (VM) | 1052 | 671.5 – 1204 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 968.5 | 951.5 – 1034 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 928 | 836 – 932 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 919.5 | 911.5 – 974.5 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 752 | 743.5 – 764 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 647.5 | 636 – 654.5 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 438.5 | 424 – 453 | 1 | 2 | too few sandboxes |
| 9 | tama | 366.5 | 326 – 407 | 1 | 2 | n too small |
| 10 | Novita | 302.5 | 281 – 312.5 | 3 | 6 | too few sandboxes |
| 11 | E2B | 182 | 179.5 – 186.5 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 125.5 | 118.5 – 129 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Vercel Sandbox leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 267500 | 258000 – 312000 | 3 | 6 | — |
| 2 | Modal (VM) | 263000 | 258500 – 282500 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 249500 | 218500 – 250500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 205000 | 202000 – 214500 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 170000 | 163000 – 174000 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 157500 | 150000 – 160500 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 111000 | 108000 – 114000 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 109100 | 107750 – 109650 | 3 | 6 | too few sandboxes |
| 9 | Novita | 78950 | 77900 – 79900 | 3 | 6 | too few sandboxes |
| 10 | tama | 69350 | 67800 – 70900 | 1 | 2 | too few sandboxes |
| 11 | E2B | 48200 | 48000 – 49500 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 25400 | 23550 – 25550 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Vercel Sandbox leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 1046 | 1008 – 1220 | 3 | 6 | — |
| 2 | Modal (VM) | 1027 | 1010 – 1104 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 975 | 853.5 – 978 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 802 | 788.5 – 837 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 663.5 | 637.5 – 679 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 615.5 | 586.5 – 626 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 432 | 420 – 444 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 427 | 421 – 427.5 | 3 | 6 | too few sandboxes |
| 9 | Novita | 308.5 | 304 – 312 | 3 | 6 | too few sandboxes |
| 10 | tama | 271 | 265 – 277 | 1 | 2 | too few sandboxes |
| 11 | E2B | 188.5 | 187.5 – 193 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 99.2 | 92.05 – 99.7 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 19250 | 17350 – 21350 | 3 | 6 | — |
| 2 | Novita | 11300 | 7935 – 12050 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 11019 | 7485 – 13500 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 5445 | 5357 – 5497 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 5047 | 4451 – 5095 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 4452 | 2467 – 6436 | 1 | 2 | too few sandboxes |
| 7 | Namespace | 3990 | 2874 – 4090 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 2407 | 2337 – 2807 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2136 | 2033 – 2269 | 3 | 6 | too few sandboxes |
| 10 | tama | 1916 | 1853 – 1979 | 1 | 2 | too few sandboxes |
| 11 | Modal (VM) | 1766 | 1653 – 2064 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 7937 | 7727 – 8146 | 1 | 2 | — |
| 2 | Daytona (VM) | 6764 | 6040 – 7487 | 2 | 3 | too few sandboxes |
| 3 | Vercel Sandbox | 5447 | 5359 – 5498 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 5049 | 4452 – 5096 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 4453 | 2468 – 6437 | 1 | 2 | too few sandboxes |
| 6 | Namespace | 3992 | 2876 – 4092 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 2408 | 2338 – 2808 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2138 | 2035 – 2270 | 3 | 6 | too few sandboxes |
| 9 | tama | 1918 | 1855 – 1981 | 1 | 2 | too few sandboxes |
| 10 | Modal (VM) | 1768 | 1654 – 2065 | 3 | 6 | too few sandboxes |
| 11 | E2B | 601 | 600.5 – 601 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.4× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 6182 | 5394 – 6295 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 4484 | 4134 – 6107 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 4434 | 3991 – 4689 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 4258 | 3929 – 4823 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 3759 | 2663 – 3808 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 2896 | 2741 – 3051 | 1 | 2 | too few sandboxes |
| 7 | Namespace | 2512 | 1812 – 2569 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 2186 | 2170 – 2196 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 2027 | 1984 – 2316 | 3 | 6 | too few sandboxes |
| 10 | tama | 1628 | 1528 – 1727 | 1 | 2 | too few sandboxes |
| 11 | Runloop | 970 | 936 – 1054 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599 | 598.5 – 600 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.4× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 6183 | 5395 – 6296 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 4485 | 4135 – 6109 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 4436 | 3993 – 4691 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 4259 | 3931 – 4825 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 3760 | 2665 – 3809 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 2898 | 2742 – 3053 | 1 | 2 | too few sandboxes |
| 7 | Namespace | 2514 | 1814 – 2571 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 2188 | 2171 – 2197 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 2029 | 1986 – 2318 | 3 | 6 | too few sandboxes |
| 10 | tama | 1629 | 1530 – 1728 | 1 | 2 | too few sandboxes |
| 11 | Runloop | 971.5 | 938 – 1055 | 3 | 6 | too few sandboxes |
| 12 | E2B | 601 | 600.5 – 601 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.5× Modal (VM) on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.34 | 23.27 – 25.72 | 3 | 6 | — |
| 2 | Modal (VM) | 15.58 | 15.53 – 16 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 14.09 | 14.09 – 14.21 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 13.37 | 13.11 – 13.68 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.11 | 11.54 – 12.14 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 10.77 | 10.76 – 11.34 | 3 | 6 | too few sandboxes |
| 7 | tama | 7.92 | 7.92 – 7.92 | 1 | 2 | too few sandboxes |
| 8 | Microsandbox Cloud | 6.14 | 5.895 – 6.505 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 5.105 | 4.32 – 5.14 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 4.975 | 4.96 – 4.99 | 1 | 2 | too few sandboxes |
| 11 | Modal (gVisor) | 2.88 | 2.88 – 3.385 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.4 | 1.31 – 1.4 | 3 | 6 | too few sandboxes |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~2.3× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 176700 | 65950 – 181000 | 3 | 15 | — |
| 2 | Modal (gVisor) | 78180 | 64810 – 78680 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 69270 | 52750 – 157600 | 3 | 15 | too few sandboxes |
| 4 | Blaxel | 60775 | 52410 – 68000 | 3 | 15 | too few sandboxes |
| 5 | Novita | 52950 | 52630 – 53190 | 3 | 15 | too few sandboxes |
| 6 | Vercel Sandbox | 52950 | 52130 – 53720 | 3 | 15 | too few sandboxes |
| 7 | tama | 50360 | 46160 – 52950 | 3 | 15 | too few sandboxes |
| 8 | E2B | 47410 | 43410 – 57870 | 3 | 15 | too few sandboxes |
| 9 | Microsandbox Cloud | 45790 | 44340 – 46910 | 3 | 15 | too few sandboxes |
| 10 | Runloop | 34790 | 33620 – 36460 | 3 | 15 | too few sandboxes |
| 11 | Namespace | 26710 | 26110 – 30540 | 3 | 15 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~2.3× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 175500 | 68500 – 181200 | 3 | 15 | — |
| 2 | Modal (gVisor) | 75450 | 63140 – 81990 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 69250 | 52240 – 160071 | 3 | 15 | too few sandboxes |
| 4 | Blaxel | 59390 | 54140 – 64650 | 3 | 15 | too few sandboxes |
| 5 | Vercel Sandbox | 52950 | 52000 – 53480 | 3 | 15 | too few sandboxes |
| 6 | Novita | 52850 | 52620 – 53100 | 3 | 15 | too few sandboxes |
| 7 | tama | 50980 | 46900 – 53390 | 3 | 15 | too few sandboxes |
| 8 | E2B | 46980 | 43560 – 59580 | 3 | 15 | too few sandboxes |
| 9 | Microsandbox Cloud | 45020 | 44420 – 47180 | 3 | 15 | too few sandboxes |
| 10 | Runloop | 32730 | 28300 – 35310 | 3 | 15 | too few sandboxes |
| 11 | Namespace | 26680 | 25410 – 30930 | 3 | 15 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~2.3× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 209500 | 88710 – 209700 | 3 | 55 | — |
| 2 | Modal (gVisor) | 91950 | 87900 – 94870 | 3 | 75 | too few sandboxes |
| 3 | Modal (VM) | 85001 | 79120 – 173900 | 3 | 55 | too few sandboxes |
| 4 | Vercel Sandbox | 81000 | 80310 – 81700 | 3 | 36 | too few sandboxes |
| 5 | E2B | 74770 | 73110 – 85750 | 3 | 56 | too few sandboxes |
| 6 | Blaxel | 72870 | 65020 – 78420 | 3 | 75 | too few sandboxes |
| 7 | Microsandbox Cloud | 66670 | 63990 – 68130 | 3 | 35 | too few sandboxes |
| 8 | Novita | 58065 | 58020 – 58360 | 3 | 15 | too few sandboxes |
| 9 | tama | 51920 | 48050 – 52420 | 3 | 45 | too few sandboxes |
| 10 | Namespace | 41060 | 35770 – 42600 | 3 | 70 | too few sandboxes |
| 11 | Runloop | 36900 | 36310 – 37160 | 3 | 74 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~2.4× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 168600 | 62250 – 172200 | 3 | 15 | — |
| 2 | Modal (gVisor) | 70460 | 59490 – 74880 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 64790 | 45100 – 153100 | 3 | 15 | too few sandboxes |
| 4 | Blaxel | 60280 | 49000 – 64940 | 3 | 15 | too few sandboxes |
| 5 | Novita | 50210 | 49630 – 50664 | 3 | 15 | too few sandboxes |
| 6 | Vercel Sandbox | 46270 | 44270 – 47690 | 3 | 15 | too few sandboxes |
| 7 | tama | 45800 | 40410 – 47390 | 3 | 15 | too few sandboxes |
| 8 | E2B | 41560 | 36890 – 52130 | 3 | 15 | too few sandboxes |
| 9 | Microsandbox Cloud | 37870 | 37430 – 39650 | 3 | 15 | too few sandboxes |
| 10 | Runloop | 28994 | 28430 – 31350 | 3 | 15 | too few sandboxes |
| 11 | Namespace | 24050 | 23910 – 26960 | 3 | 15 | too few sandboxes |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 154320 | 153900 – 155506 | 3 | 6 | — |
| 2 | Blaxel | 86010 | 85950 – 103900 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 74810 | 71745 – 87044 | 3 | 6 | too few sandboxes |
| 4 | tama | 70130 | 58500 – 72969 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 68840 | 60073 – 71860 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 58280 | 51294 – 65470 | 3 | 6 | too few sandboxes |
| 7 | E2B | 56130 | 53624 – 60352 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 54136 | 50057 – 58380 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 41070 | 40265 – 41367 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 15655 | 14060 – 18240 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 14915 | 13827 – 24756 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 155200 | 153420 – 157700 | 3 | 6 | — |
| 2 | Blaxel | 102677 | 101400 – 105408 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 78282 | 59780 – 103697 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 58303 | 51694 – 60430 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 56750 | 50420 – 77822 | 3 | 6 | too few sandboxes |
| 6 | E2B | 56650 | 48976 – 57523 | 3 | 6 | too few sandboxes |
| 7 | tama | 48919 | 45494 – 54060 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 43480 | 29970 – 50665 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 37770 | 32888 – 39460 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 14859 | 14282 – 16362 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 12900 | 12838 – 16211 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | — |
| 2 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Novita | 9999 | 9991 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | tama | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 11 | Modal (gVisor) | 177.5 | 172 – 179.5 | 3 | 6 | too few sandboxes |

### iperf3 WAN download

Mbits/sec · higher is better

_tama leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 4583 | 3066 – 5178 | 3 | 6 | — |
| 2 | Daytona (VM) | 4448 | 3538 – 4475 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 3428 | 3055 – 6442 | 3 | 6 | too few sandboxes |
| 4 | Novita | 2761 | 1501 – 3117 | 3 | 6 | too few sandboxes |
| 5 | E2B | 2742 | 1095 – 3666 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 1979 | 892.6 – 3410 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 1967 | 1935 – 2178 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 1636 | 1396 – 1908 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1461 | 1417 – 1617 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 567.5 | 426.8 – 591.4 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.7× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 8216 | 5316 – 9267 | 3 | 6 | — |
| 2 | Daytona (VM) | 4812 | 2941 – 4813 | 3 | 6 | too few sandboxes |
| 3 | Novita | 3632 | 1078 – 3766 | 3 | 6 | too few sandboxes |
| 4 | E2B | 3353 | 1476 – 3540 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 2574 | 2539 – 2752 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 2139 | 1871 – 2347 | 3 | 6 | too few sandboxes |
| 7 | tama | 1289 | 1232 – 1489 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 862.2 | 854.3 – 865.5 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 781.6 | 690.4 – 798.5 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 166.7 | 155.3 – 182.9 | 3 | 6 | too few sandboxes |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 362 | 360.5 – 362 | 3 | 6 | — |
| 2 | Daytona (VM) | 408.5 | 403 – 409 | 3 | 6 | too few sandboxes |
| 3 | Novita | 484 | 482.5 – 487.5 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 526 | 524.5 – 533 | 3 | 6 | too few sandboxes |
| 5 | tama | 536.8 | 536.5 – 537 | 2 | 4 | too few sandboxes |
| 6 | Microsandbox Cloud | 690 | 677.5 – 697.5 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 766.5 | 764 – 767.5 | 3 | 6 | too few sandboxes |
| 8 | E2B | 809 | 804.5 – 811 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 817 | 671.5 – 818.5 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 902 | 897 – 904 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1206 | 1198 – 1207 | 3 | 6 | too few sandboxes |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 32.57 | 32.4 – 32.68 | 3 | 6 | — |
| 2 | Daytona (VM) | 36.56 | 36.45 – 36.84 | 3 | 6 | too few sandboxes |
| 3 | Novita | 44.27 | 43.92 – 45.19 | 3 | 6 | too few sandboxes |
| 4 | tama | 51.69 | 51.67 – 51.72 | 2 | 4 | too few sandboxes |
| 5 | Blaxel | 53.05 | 52.75 – 54.74 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 61.77 | 60.03 – 62.17 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 63.14 | 47.29 – 66.09 | 3 | 6 | too few sandboxes |
| 8 | E2B | 65.1 | 64.6 – 66.02 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 72.04 | 70.74 – 72.14 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 81.9 | 79.46 – 82.84 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 84.66 | 83.81 – 85.35 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 283800 | 273500 – 296600 | 3 | 6 | — |
| 2 | Daytona (VM) | 282500 | 281300 – 283400 | 3 | 6 | too few sandboxes |
| 3 | tama | 274600 | 224400 – 279200 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 242600 | 235200 – 248100 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 202000 | 199200 – 294700 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 174800 | 164500 – 180000 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 169900 | 158900 – 174500 | 3 | 6 | too few sandboxes |
| 8 | E2B | 169600 | 162900 – 178100 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 166900 | 160000 – 182600 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 145600 | 144000 – 147200 | 1 | 2 | too few sandboxes |
| 11 | Runloop | 100100 | 98500 – 115300 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 15170 | 13750 – 15210 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 0.1765 | 0.1685 – 0.1825 | 3 | 6 | — |
| 2 | Daytona (VM) | 0.177 | 0.176 – 0.178 | 3 | 6 | too few sandboxes |
| 3 | tama | 0.182 | 0.179 – 0.223 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 0.206 | 0.2015 – 0.2125 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 0.2475 | 0.1695 – 0.251 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 0.2865 | 0.278 – 0.3045 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 0.294 | 0.287 – 0.3165 | 3 | 6 | too few sandboxes |
| 8 | E2B | 0.295 | 0.2805 – 0.307 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 0.2995 | 0.2735 – 0.313 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 0.3435 | 0.34 – 0.347 | 1 | 2 | too few sandboxes |
| 11 | Runloop | 0.504 | 0.4335 – 0.5105 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 3.298 | 3.289 – 3.638 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 28220 | 26430 – 28350 | 3 | 6 | — |
| 2 | Namespace | 28000 | 25360 – 28300 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 18050 | 17490 – 18070 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 15440 | 15000 – 15920 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 15000 | 14930 – 15380 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 14360 | 13860 – 18090 | 3 | 6 | too few sandboxes |
| 7 | E2B | 11330 | 11050 – 11490 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 10590 | 10250 – 11460 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 10530 | 10370 – 10680 | 1 | 2 | too few sandboxes |
| 10 | Blaxel | 9932 | 9186 – 10270 | 3 | 6 | too few sandboxes |
| 11 | tama | 5816 | 5711 – 9758 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 2101 | 2100 – 2292 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.774 | 1.764 – 1.893 | 3 | 6 | — |
| 2 | Namespace | 1.786 | 1.766 – 1.972 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 2.771 | 2.767 – 2.861 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 3.237 | 3.159 – 3.333 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 3.337 | 3.251 – 3.35 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3.483 | 2.768 – 3.607 | 3 | 6 | too few sandboxes |
| 7 | E2B | 4.413 | 4.353 – 4.524 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 4.749 | 4.68 – 4.819 | 1 | 2 | too few sandboxes |
| 9 | Runloop | 4.808 | 4.37 – 4.956 | 3 | 6 | too few sandboxes |
| 10 | Blaxel | 5.107 | 4.881 – 5.454 | 3 | 6 | too few sandboxes |
| 11 | tama | 8.601 | 5.125 – 8.835 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 23.81 | 21.82 – 23.85 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.21 | 31.14 – 32.39 | 3 | 6 | — |
| 2 | Novita | 42.94 | 40.26 – 43.16 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 48.52 | 47.31 – 49.92 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 49.69 | 49.44 – 50.38 | 3 | 6 | too few sandboxes |
| 5 | tama | 59.23 | 58.05 – 60.41 | 2 | 4 | too few sandboxes |
| 6 | Modal (VM) | 62.76 | 61.45 – 65.44 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 68.06 | 63.51 – 69.45 | 3 | 6 | too few sandboxes |
| 8 | E2B | 68.74 | 67.58 – 73.32 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 81.46 | 80.84 – 81.82 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 93.76 | 90.77 – 97.53 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 415.9 | 412.2 – 427.9 | 3 | 6 | too few sandboxes |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_tama is cheapest · Novita is ~3.2× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.074 | — | 1 | 1 | — |
| 2 | Novita | 0.2333 | — | 1 | 1 | — |
| 3 | Daytona (VM) | 0.3312 | — | 1 | 1 | — |
| 3 | E2B | 0.3312 | — | 1 | 1 | equal values |
| 5 | Runloop | 0.6336 | — | 1 | 1 | — |

## Coverage gaps

85 uncovered results across 12 providers (Blaxel 2, Daytona (VM) 3, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 3, Modal (VM) 2, Namespace 2, Novita 3, run.cloud 30, Runloop 2, tama 28, Vercel Sandbox 6). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | cpu-node | **failed** | Failed to create sandbox: run.cloud sandbox sbx_1a5d152a64c775855e9a entered terminal state "interrupted" while booting |
| run.cloud | cpu-node | **failed** | Failed to create sandbox: run.cloud readiness get for sandbox sbx_22c6a7c2d31e9e4f25db did not settle within 30000ms |
| run.cloud | disk | **failed** | Failed to create sandbox: run.cloud sandbox sbx_d5ecdb98ef87e53011bc entered terminal state "interrupted" while booting |
| run.cloud | disk | **failed** | Failed to create sandbox: run.cloud sandbox sbx_a3521ecd29cbd0aec9d5 entered terminal state "interrupted" while booting |
| run.cloud | memory | **failed** | Failed to create sandbox: run.cloud sandbox sbx_09a0a9464f5b962363bf entered terminal state "interrupted" while booting |
| run.cloud | memory | **failed** | Failed to create sandbox: run.cloud sandbox sbx_d7637aba350ce6f3562b entered terminal state "interrupted" while booting |
| run.cloud | memory | **failed** | Failed to create sandbox: run.cloud sandbox sbx_b649f085ae326b98486e entered terminal state "interrupted" while booting |
| run.cloud | network | **failed** | Failed to create sandbox: run.cloud sandbox sbx_0f5fd97cceb46e3e873f entered terminal state "interrupted" while booting |
| run.cloud | network | **failed** | Failed to create sandbox: run.cloud sandbox sbx_d2ac03e2fd5b487a4893 entered terminal state "interrupted" while booting |
| run.cloud | network | **failed** | Failed to create sandbox: run.cloud sandbox sbx_350762430ad77e90e816 entered terminal state "interrupted" while booting |
| run.cloud | pgbench | **failed** | Failed to create sandbox: run.cloud sandbox sbx_bfd5091a1d8cea984b5d entered terminal state "interrupted" while booting |
| run.cloud | pgbench | **failed** | Failed to create sandbox: run.cloud sandbox sbx_38631b71eb6b6ac24204 entered terminal state "interrupted" while booting |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud sandbox sbx_d4774966322a2d905d9a entered terminal state "interrupted" while booting |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud sandbox sbx_cf9cfde4586a2d9f914b entered terminal state "interrupted" while booting |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud readiness get for sandbox sbx_5a31486e8776c5d95021 did not settle within 30000ms |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud sandbox sbx_83181b05be7c021ec2ff entered terminal state "interrupted" while booting |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud readiness get for sandbox sbx_e8a05028e5f6beff9e05 did not settle within 30000ms |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud readiness get for sandbox sbx_aaa2937cbf922ce6b41f did not settle within 30000ms |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud sandbox sbx_ed976eb98fca9149a6f4 entered terminal state "interrupted" while booting |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud sandbox sbx_168f04632661c363b603 entered terminal state "interrupted" while booting |
| run.cloud | realworld-mastra | **failed** | Failed to create sandbox: run.cloud sandbox sbx_e4b62b63a4282139c460 entered terminal state "interrupted" while booting |
| run.cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| run.cloud | realworld-mastra | **failed** | Failed to create sandbox: run.cloud sandbox sbx_e4d864ba199096524053 entered terminal state "interrupted" while booting |
| run.cloud | realworld-mastra | **failed** | Failed to create sandbox: run.cloud sandbox sbx_7f1ff8358dde3f0ea33e entered terminal state "interrupted" while booting |
| run.cloud | realworld-mastra | **failed** | Failed to create sandbox: run.cloud sandbox sbx_6ffccedf0d06d1392b3b entered terminal state "interrupted" while booting |
| run.cloud | realworld-mastra | **failed** | Failed to create sandbox: run.cloud sandbox sbx_646759e75c5d72344615 entered terminal state "interrupted" while booting |
| run.cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | system | **failed** | Failed to create sandbox: run.cloud sandbox sbx_ba7a994b53ca0de551e7 entered terminal state "interrupted" while booting |
| run.cloud | system | **failed** | Failed to create sandbox: run.cloud sandbox sbx_e2feb3ac6dc61fd58c83 entered terminal state "interrupted" while booting |
| run.cloud | system | **failed** | Failed to create sandbox: run.cloud sandbox sbx_edc2c8029ca413757f92 entered terminal state "interrupted" while booting |
| Runloop | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Runloop | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| tama | disk | **failed** | Failed to create sandbox: tama machine machine-obusdw8bsyw2 entered terminal state "failed" |
| tama | disk | **failed** | Failed to create sandbox: tama machine machine-jy70u45f5bjc entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-7w3svz2u0rrp entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-xtc6uq2b842e entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-mcsb5rn8wtip entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-cmb82go83sl9 entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-xpenmbf91vda entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-ugrnb2sa4bt1 entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-stjxzwrlyc4b entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-b8btfnljx8vj entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-dy72dqgf5kdj entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-4cmzotwsmybj entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-6em5ftb99irk entered terminal state "failed" |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama machine machine-cbh1mqku4irm entered terminal state "failed" |
| tama | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-y69yxc99jiba entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-wih91ise11sk entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-4dhaqn55vl3m entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-ixkk40mc6r7j entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-exu3302co95k entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-h5om7k5x8pzw entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-l2edgibih5pb entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-u0c2iizkfbza entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-xntj3lylwfei entered terminal state "failed" |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama machine machine-s4b599wyrpkt entered terminal state "failed" |
| tama | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new sandbox-benchmarks-15fef947-ed60-40a1-90c4-18d9e04012b3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192 exited 1: tama: parse /home/runner/.tama/config.yaml: missing field `token` |
| tama | system | **failed** | Failed to create sandbox: tama login --token &lt;redacted&gt; exited 1: tama: ssh-keygen failed |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-download: pts_iperf-wan-download did not produce 1 numeric metric value(s) |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-upload: PTS batch-run of local/iperf-wan-1.0.0 completed but every trial errored (composite carries no values) |
| Vercel Sandbox | network | **failed** | Step "mise run benchmark:network:suite" failed with exit code 1 |
| Vercel Sandbox | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Vercel Sandbox | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll) — the sandbox stopped responding, not a quiet long step |
| Vercel Sandbox | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

</details>

<details>
<summary>How rankings are decided</summary>

The value is the median of the PER-SANDBOX medians — one machine, one vote — not the median of all
trials pooled together. Pooling would weight each machine by how many trials it ran, and the harness
chooses that count adaptively by watching the variance, so the noisiest machine would carry the most
weight in the published number. The median, not the mean, because a single stalled pass drags a mean
far more than it moves a median.

The interval is a cluster bootstrap of that same statistic (10,000 resamples, seeded from the Run id
so the table is reproducible byte-for-byte): whole sandboxes are resampled with replacement, keeping
each machine's trials intact.

**The interval is labelled 95%, and at these sandbox counts it does not achieve 95%.** Coverage is a
property of how many machines were measured, not of the estimator: simulated at ≈77% for 3 sandboxes,
≈92% at 6, and ≈95% at 20. No percentile bootstrap reaches nominal coverage at 3 clusters. Read a
3-sandbox interval as a resampling envelope over three machines, **not** as a calibrated frequentist
confidence interval. Within-sandbox trials may also be dependent on host scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. Where
replicate sandboxes exist that test runs on the PER-SANDBOX MEDIANS, so whole machines are the
exchangeable unit; testing pooled trials instead would treat repeated measurements of one machine as
independent evidence about the provider. KS is reported separately for distribution *shape* and does
not drive the ranking.

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`tied` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only note that claims two providers are
statistically indistinguishable.
`equal medians` / `equal values` — arithmetic, not a finding: the ranking sorts on the value,
and two identical values have no order between them. It says nothing about the distributions.

Each metric is measured on several independent sandboxes (the **Sandboxes** column), and within each
sandbox the benchmark runs several trials (**Trials**). Trials capture within-machine noise —
neighbours, host contention, virtualization; sandboxes capture the machine-to-machine variation a
user actually experiences when they start a new environment. The ranking and its interval both treat
the SANDBOX as the unit, so more trials on the same machine never make a row look better-evidenced.
Under adaptive trial counts a large **Trials** figure is in fact a sign the machines were unstable
(the harness kept re-running), not that the estimate is precise.

At the sandbox counts this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

`too few sandboxes` is the extreme of that: the deciding test's best attainable p already exceeds α,
so it could not have separated the rows at any effect size, however far apart their values are.
The floor is a property of the design — here 1 v 2 sandboxes floors at p ≈ 0.67; 1 v 3 sandboxes floors at p ≈ 0.25; 1 v 3 sandboxes floors at p ≈ 0.50; 2 v 2 trials floors at p ≈ 0.33; 2 v 3 sandboxes floors at p ≈ 0.20; 2 v 7 sandboxes floors at p ≈ 0.056; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 1.0.
At three sandboxes a side the floor is 2/C(6,3) = 0.1, which is above α, so **no** three-sandbox
comparison in this table can ever be declared separated. That is a fact about the replicate count,
not about the providers. One shape can appear more than once above with different floors: ties
among a provider's per-sandbox medians raise the floor further (to 1.0 when every median in the
comparison is equal), so the count alone does not determine it.
Such rows are ranked on their observed medians and are **not** claimed to be tied — read the gap
between the values, and treat the p-value as unable to settle them either way. Where such a row
nevertheless shares the rank above it, the note reads `equal medians`: the two values are simply
identical, which is the ranking having nothing to order them by — never a finding that the
providers are alike.

### Pairwise tests (vs. row above)

`p vs. above` is the SANDBOX-LEVEL test that decides the rank wherever replicate sandboxes exist —
Mann-Whitney U on each provider's per-sandbox medians, whole machines as the exchangeable unit.
(Only where a provider ran in a single sandbox does it fall back to Mann-Whitney on pooled trials,
which treats repeated measurements of one machine as independent and is anti-conservative.)
`p (KS)` is Kolmogorov-Smirnov on distribution
*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).
These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate
correction is applied across providers or metrics.

| Dimension | Metric | Provider | p vs. above | p (KS) |
| --- | --- | --- | ---: | ---: |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Namespace | 0.98 (tied) | 0.99 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.028 | <0.001 |
| realworld | Mastra: cold install | E2B | <0.001 | <0.001 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.033 | 0.066 |
| realworld | Mastra: cold install | Runloop | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.060 (tied) | 0.066 |
| realworld | Mastra: cold install | tama | 1.0 (tied) | 0.62 |
| realworld | Mastra: cold install | Blaxel | 1.0 (tied) | 0.62 |
| realworld | Mastra: cold install | run.cloud | 0.0098 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | run.cloud | 0.020 | 0.012 |
| realworld | Better-Auth: build | Novita | 0.0011 | 0.0013 |
| realworld | Better-Auth: build | Modal (VM) | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: build | Namespace | 0.48 (tied) | 0.79 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.033 | <0.001 |
| realworld | Better-Auth: build | E2B | 0.0029 | 0.0046 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.29 (tied) | 0.43 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: build | Blaxel | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | run.cloud | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.77 (tied) | 0.81 |
| realworld | Better-Auth: cold install | Namespace | 0.44 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Novita | 0.18 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.014 | <0.001 |
| realworld | Better-Auth: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | E2B | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.012 | 0.019 |
| realworld | Better-Auth: cold install | Blaxel | 0.039 | <0.001 |
| realworld | Better-Auth: cold install | Runloop | 0.0011 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.028 | 0.0046 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Blaxel | 0.037 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: git clone | E2B | 0.33 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.17 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.43 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Runloop | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: git clone | run.cloud | 0.95 (tied) | 0.55 |
| realworld | Better-Auth: git clone | Novita | 0.68 (tied) | 0.81 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.014 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.32 (tied) | 0.32 |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.0077 | 0.0042 |
| realworld | Better-Auth: lint (Biome) | Novita | 1.0 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.0056 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.0083 | <0.001 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.80 (tied) | 0.99 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.0022 | 0.0042 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0029 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | run.cloud | — | — |
| realworld | Better-Auth: lint format | Namespace | 0.13 (tied) | 0.16 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.34 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Novita | 0.0065 | 0.019 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0029 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.0056 | <0.001 |
| realworld | Better-Auth: lint format | Blaxel | 0.039 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint format | E2B | 0.74 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.0028 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | run.cloud | 0.13 (tied) | 0.16 |
| realworld | Better-Auth: lint packages | Novita | 0.0022 | 0.0042 |
| realworld | Better-Auth: lint packages | Namespace | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.38 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.0083 | <0.001 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.0068 | 0.019 |
| realworld | Better-Auth: lint packages | Blaxel | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | 0.017 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.0077 | 0.0042 |
| realworld | Better-Auth: lint spell | Namespace | 0.51 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Novita | 0.38 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.039 | <0.001 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.078 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Blaxel | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | run.cloud | 0.32 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.21 (tied) | 0.077 |
| realworld | Better-Auth: lint types | Namespace | 0.32 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.039 | <0.001 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.039 | 0.19 |
| realworld | Better-Auth: lint types | Blaxel | 0.039 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | run.cloud | 0.058 (tied) | 0.077 |
| realworld | Better-Auth: typecheck | Novita | 0.0077 | 0.0042 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.028 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.033 | <0.001 |
| realworld | Better-Auth: typecheck | E2B | 0.0068 | 0.0046 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.024 | 0.0046 |
| realworld | Better-Auth: typecheck | Blaxel | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.32 (tied) | 0.066 |
| realworld | Mastra: build:core | Modal (VM) | 0.0068 | <0.001 |
| realworld | Mastra: build:core | tama | 0.20 (tied) | 0.083 |
| realworld | Mastra: build:core | Vercel Sandbox | 0.044 | 0.043 |
| realworld | Mastra: build:core | Blaxel | 0.24 (tied) | 0.19 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.0083 | 0.019 |
| realworld | Mastra: build:core | E2B | 0.18 (tied) | 0.19 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.017 | 0.0015 |
| realworld | Mastra: build:core | Runloop | 0.0029 | 0.0046 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Namespace | 0.99 (tied) | 0.43 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.17 (tied) | 0.19 |
| realworld | Mastra: git clone | Daytona (VM) | 0.92 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (VM) | 0.18 (tied) | 0.066 |
| realworld | Mastra: git clone | Novita | 0.44 (tied) | 0.066 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.039 | 0.066 |
| realworld | Mastra: git clone | E2B | 0.55 (tied) | 0.19 |
| realworld | Mastra: git clone | tama | 1.0 (tied) | 0.62 |
| realworld | Mastra: git clone | run.cloud | 0.50 (too few sandboxes) | 0.23 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.90 (tied) | 0.66 |
| realworld | Mastra: git clone | Runloop | 0.0045 | 0.019 |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Namespace | 0.14 (tied) | 0.066 |
| realworld | Mastra: lint:format | Novita | 0.38 (tied) | 0.43 |
| realworld | Mastra: lint:format | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | tama | 0.92 (tied) | 0.62 |
| realworld | Mastra: lint:format | Vercel Sandbox | 1.0 (tied) | 0.62 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.29 (tied) | 0.43 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.017 | 0.0015 |
| realworld | Mastra: lint:format | Runloop | <0.001 | 0.0046 |
| realworld | Mastra: lint:format | Blaxel | 0.0056 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Namespace | 0.012 | 0.066 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: cold install | run.cloud | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Novita | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.0041 | <0.001 |
| realworld | OpenClaw: cold install | E2B | 0.0015 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Runloop | 0.22 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Namespace | 0.0044 | 0.0046 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.024 | 0.19 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.0011 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.0015 | <0.001 |
| realworld | OpenClaw: git clone | E2B | 0.0083 | 0.019 |
| realworld | OpenClaw: git clone | run.cloud | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.38 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.052 (tied) | 0.0046 |
| realworld | OpenClaw: lint (extension channels) | Blaxel | — | — |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | 0.22 (tied) | 0.019 |
| realworld | OpenClaw: lint (extension channels) | run.cloud | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | Novita | 0.18 (tied) | 0.0046 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.0056 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Namespace | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Vercel Sandbox | 0.52 (tied) | 0.12 |
| realworld | OpenClaw: lint (extension channels) | E2B | 0.0073 | 0.014 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.29 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.0011 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.18 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.13 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.098 (tied) | 0.12 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.039 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.0029 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.93 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.36 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.078 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.0011 | 0.0018 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.033 | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.27 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | <0.001 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | run.cloud | 0.50 (too few sandboxes) | 0.018 |
| cpu | Node.js web tooling | Daytona (VM) | 0.50 (too few sandboxes) | 0.028 |
| cpu | Node.js web tooling | Novita | 0.70 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | tama | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.40 (too few sandboxes) | 0.032 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.70 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | E2B | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Blaxel | 0.10 (too few sandboxes) | 0.0016 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.70 (too few sandboxes) | 0.015 |
| cpu | Node.js web tooling | Runloop | 0.50 (too few sandboxes) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | tama | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | tama | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.50 (too few sandboxes) | 0.68 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | tama | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.50 (too few sandboxes) | 0.68 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | tama | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.68 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | tama | 0.50 (too few sandboxes) | 0.11 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.67 (too few sandboxes) | 0.42 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.011 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.68 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | tama | 0.50 (too few sandboxes) | 0.11 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | tama | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | tama | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.50 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Modal (gVisor) | 0.25 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Modal (VM) | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | Blaxel | 0.40 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Vercel Sandbox | 1.0 (too few sandboxes) | 0.051 |
| memory | STREAM Triad | tama | 0.20 (too few sandboxes) | 0.017 |
| memory | STREAM Triad | E2B | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.017 |
| memory | STREAM Triad | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Modal (VM) | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Add | Blaxel | 0.70 (too few sandboxes) | 0.14 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0047 |
| memory | STREAM Add | Novita | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Add | tama | 0.70 (too few sandboxes) | 0.051 |
| memory | STREAM Add | E2B | 1.0 (too few sandboxes) | 0.14 |
| memory | STREAM Add | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.051 |
| memory | STREAM Add | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Namespace | 0.20 (too few sandboxes) | 0.0047 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Vercel Sandbox | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | E2B | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Blaxel | 0.40 (too few sandboxes) | 0.0014 |
| memory | STREAM Copy | Microsandbox Cloud | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | tama | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Runloop | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Modal (VM) | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | Blaxel | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | tama | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | E2B | 1.0 (too few sandboxes) | 0.14 |
| memory | STREAM Scale | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Runloop | 0.10 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0011 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | tama | — | — |
| network | iperf3 WAN download | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (gVisor) | 0.70 (too few sandboxes) | 1.0 |
| network | iperf3 WAN download | Novita | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Runloop | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Blaxel | 0.10 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Novita | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | tama | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | tama | 0.20 (too few sandboxes) | 0.030 |
| system | PyBench | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.0047 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | tama | 0.20 (too few sandboxes) | 0.0047 |
| system | Git common operations | Blaxel | 0.20 (too few sandboxes) | 0.0047 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Runloop | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Novita | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 1.0 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Runloop | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.50 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | tama | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RW latency (s100, 50c) | Runloop | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | tama | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Namespace | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | tama | 0.20 (too few sandboxes) | 0.0047 |
| system | SQLite Speedtest | Modal (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | SQLite Speedtest | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

