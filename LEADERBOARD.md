# Sandbox provider leaderboard

Run [`34781421576`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/34781421576) · commit [`08dfc6eb132dee567352ffa97abb96daa4db3153`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/08dfc6eb132dee567352ffa97abb96daa4db3153) ·
dataset [`data/dataset/runs/34781421576.json`](data/dataset/runs/34781421576.json) · generated 2026-09-14T00:12:55.940Z

**Partial results — incomplete experiment.** 349 of 648 planned cells complete; 299 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:a8027119cd782ff1a9f143e55570383b88d86fc75a08b8f519a52995150b071e`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **528 metric records**
backed by **4255 retained trial observations**, across **45 metrics** and
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

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **96 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 12 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 12 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 4 pipeline tasks across 10 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 18 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 36.54 | 35.89 – 38.03 | 12 | 12 | — |
| 2 | Namespace | 41.24 | 39.66 – 42.49 | 12 | 12 | — |
| 2 | Blaxel | 41.84 | 39.41 – 47.97 | 12 | 12 | tied |
| 2 | Novita | 42.1 | 41.58 – 43.7 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 49.43 | 43.39 – 54.9 | 12 | 12 | — |
| 5 | Modal (VM) | 50.7 | 50.19 – 51.41 | 12 | 12 | tied |
| 5 | run.cloud | 50.75 | 41.47 – 83.65 | 12 | 12 | tied |
| 5 | E2B | 60.93 | 56.32 – 65.41 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 73.62 | 63.03 – 79.41 | 12 | 12 | — |
| 10 | Modal (gVisor) | 100.7 | 98.24 – 106.6 | 12 | 12 | — |
| 10 | tama | 108.2 | 94.87 – 113.8 | 12 | 12 | tied |
| 12 | Runloop | 146.5 | 97.11 – 149.4 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 53.35 | 51.79 – 54.48 | 12 | 12 | — |
| 1 | Namespace | 59.11 | 46.87 – 60.47 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 60.28 | 59.87 – 63.55 | 12 | 12 | — |
| 3 | tama | 62.83 | 61.3 – 64.4 | 3 | 3 | tied |
| 5 | Novita | 66.17 | 65.76 – 66.9 | 12 | 12 | — |
| 5 | run.cloud | 66.25 | 60.42 – 106.3 | 12 | 12 | tied |
| 5 | Modal (VM) | 71.33 | 69.46 – 72.2 | 12 | 12 | tied |
| 8 | Blaxel | 86.51 | 85.78 – 87.37 | 12 | 12 | — |
| 9 | E2B | 93.79 | 88.42 – 95.8 | 12 | 12 | — |
| 10 | Vercel Sandbox | 98.58 | 96.42 – 106.9 | 12 | 12 | — |
| 11 | Modal (gVisor) | 139.8 | 136.9 – 142.8 | 12 | 12 | — |
| 12 | Runloop | 200.6 | 199.2 – 202.9 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.35 | 10.14 – 10.55 | 12 | 12 | — |
| 2 | Daytona (VM) | 11.57 | 11.4 – 12.06 | 12 | 12 | — |
| 3 | Blaxel | 12.27 | 11.89 – 12.81 | 12 | 12 | — |
| 3 | run.cloud | 12.56 | 11.68 – 20.66 | 12 | 12 | tied |
| 3 | Novita | 13.51 | 13.17 – 13.81 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 13.52 | 13.33 – 13.75 | 12 | 12 | tied |
| 7 | E2B | 19.07 | 18.45 – 19.77 | 12 | 12 | — |
| 7 | Modal (VM) | 19.57 | 19.14 – 22.05 | 12 | 12 | tied |
| 7 | tama | 19.67 | 17.1 – 34.33 | 3 | 3 | tied |
| 7 | Vercel Sandbox | 21.61 | 20.49 – 23.33 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 34.51 | 32.83 – 37.85 | 12 | 12 | — |
| 12 | Runloop | 48.37 | 41.47 – 51.33 | 12 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.637 | 0.608 – 0.657 | 12 | 12 | — |
| 2 | Blaxel | 0.813 | 0.7765 – 7.641 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.974 | 0.92 – 1.013 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 1.099 | 1.07 – 1.144 | 12 | 12 | — |
| 4 | Modal (VM) | 1.106 | 0.838 – 1.227 | 12 | 12 | tied |
| 6 | Daytona (VM) | 1.37 | 1.244 – 1.483 | 12 | 12 | — |
| 6 | E2B | 1.471 | 1.402 – 1.61 | 12 | 12 | tied |
| 8 | run.cloud | 2.102 | 1.868 – 2.284 | 12 | 12 | — |
| 8 | Novita | 2.106 | 1.808 – 2.178 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 2.45 | 2.222 – 2.735 | 12 | 12 | — |
| 10 | tama | 2.73 | 2.679 – 4.038 | 3 | 3 | tied |
| 12 | Runloop | 5.994 | 4.514 – 8.647 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.825 | 2.572 – 2.929 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.838 | 2.783 – 2.879 | 12 | 12 | tied |
| 3 | run.cloud | 3.102 | 3.005 – 5.077 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.158 | 3.008 – 3.288 | 12 | 12 | tied |
| 3 | Novita | 3.229 | 3.159 – 3.258 | 12 | 12 | tied |
| 6 | Blaxel | 3.853 | 3.625 – 3.902 | 12 | 12 | — |
| 6 | Modal (VM) | 3.862 | 3.836 – 3.945 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 4.514 | 4.328 – 4.873 | 12 | 12 | — |
| 8 | E2B | 4.825 | 4.724 – 4.936 | 12 | 12 | tied |
| 8 | tama | 6.31 | 4.086 – 6.412 | 3 | 3 | tied |
| 11 | Runloop | 7.991 | 7.321 – 8.259 | 12 | 12 | — |
| 12 | Modal (gVisor) | 9.931 | 9.731 – 11.05 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace, Daytona (VM) and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.45 | 7.924 – 9.695 | 12 | 12 | — |
| 1 | Daytona (VM) | 9.569 | 9.317 – 10.2 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 9.819 | 9.515 – 10.37 | 12 | 12 | tied |
| 4 | run.cloud | 11.06 | 10.19 – 21.27 | 12 | 12 | — |
| 4 | Novita | 11.15 | 10.72 – 11.24 | 12 | 12 | tied |
| 6 | Blaxel | 11.45 | 11.18 – 12.49 | 12 | 12 | — |
| 7 | Modal (VM) | 13.15 | 13.08 – 13.25 | 12 | 12 | — |
| 8 | tama | 13.34 | 13.32 – 17.29 | 3 | 3 | — |
| 8 | Vercel Sandbox | 16.1 | 15.3 – 17.5 | 12 | 12 | tied |
| 8 | E2B | 18.12 | 16.52 – 18.38 | 12 | 12 | tied |
| 11 | Runloop | 28.33 | 27.48 – 29.27 | 12 | 12 | — |
| 12 | Modal (gVisor) | 29.27 | 28.83 – 30.63 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.417 | 2.088 – 2.496 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.628 | 2.513 – 2.751 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.719 | 2.688 – 2.826 | 12 | 12 | — |
| 4 | run.cloud | 2.919 | 2.833 – 5.255 | 12 | 12 | — |
| 4 | Novita | 2.97 | 2.885 – 3.02 | 12 | 12 | tied |
| 6 | Blaxel | 3.359 | 3.26 – 3.407 | 12 | 12 | — |
| 7 | Modal (VM) | 3.591 | 3.55 – 3.705 | 12 | 12 | — |
| 8 | tama | 4.002 | 3.904 – 5.419 | 3 | 3 | — |
| 8 | Vercel Sandbox | 4.783 | 4.506 – 5.002 | 12 | 12 | tied |
| 8 | E2B | 4.837 | 4.146 – 5.082 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 6.607 | 6.365 – 6.831 | 12 | 12 | — |
| 12 | Runloop | 8.283 | 8.097 – 8.55 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.26 | 2.117 – 2.373 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.35 | 2.325 – 2.409 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 2.663 | 2.599 – 2.74 | 12 | 12 | — |
| 3 | Novita | 2.676 | 2.601 – 2.753 | 12 | 12 | tied |
| 3 | run.cloud | 2.679 | 2.572 – 4.256 | 12 | 12 | tied |
| 3 | Modal (VM) | 3.209 | 3.137 – 3.278 | 12 | 12 | tied |
| 7 | tama | 3.381 | 3.318 – 3.676 | 3 | 3 | — |
| 7 | Blaxel | 3.696 | 3.367 – 3.817 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 3.921 | 3.873 – 4.014 | 12 | 12 | — |
| 9 | E2B | 3.973 | 3.665 – 4.11 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 9.28 | 8.807 – 9.739 | 12 | 12 | — |
| 12 | Runloop | 10.21 | 9.637 – 10.56 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.98 | 5.193 – 6.425 | 12 | 12 | — |
| 2 | Daytona (VM) | 6.612 | 6.358 – 7.116 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 6.864 | 6.54 – 7.338 | 12 | 12 | tied |
| 4 | run.cloud | 7.674 | 7.019 – 14.28 | 12 | 12 | — |
| 4 | Novita | 7.685 | 7.535 – 7.766 | 12 | 12 | tied |
| 6 | Modal (VM) | 8.909 | 8.782 – 9.171 | 12 | 12 | — |
| 6 | Blaxel | 9.659 | 8.139 – 11.55 | 12 | 12 | tied |
| 6 | tama | 9.796 | 9.731 – 10.52 | 3 | 3 | tied |
| 9 | E2B | 12.29 | 11.48 – 13 | 12 | 12 | — |
| 9 | Vercel Sandbox | 12.49 | 12.29 – 13.43 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 16.14 | 15.58 – 17.19 | 12 | 12 | — |
| 12 | Runloop | 21.48 | 20.63 – 22.29 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) and tama share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.12 | 23.46 – 25.01 | 12 | 12 | — |
| 1 | tama | 25.67 | 18.87 – 26.83 | 3 | 3 | tied |
| 3 | Microsandbox Cloud | 30.41 | 29.71 – 31.24 | 12 | 12 | — |
| 3 | Novita | 30.58 | 29.46 – 30.92 | 12 | 12 | tied |
| 3 | Namespace | 32.23 | 24.52 – 33.32 | 12 | 12 | tied |
| 6 | run.cloud | 33.88 | 32.63 – 53.13 | 12 | 12 | — |
| 6 | Modal (VM) | 34.41 | 33.63 – 35.72 | 12 | 12 | tied |
| 8 | Blaxel | 46.56 | 45.52 – 48.99 | 12 | 12 | — |
| 8 | E2B | 46.76 | 43.43 – 49.31 | 12 | 12 | tied |
| 10 | Vercel Sandbox | 50.95 | 48.5 – 51.93 | 12 | 12 | — |
| 11 | Modal (gVisor) | 107.3 | 100.6 – 111.7 | 12 | 12 | — |
| 12 | Runloop | 139.3 | 130 – 140.8 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM), Namespace and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 38.05 | 37.34 – 39.02 | 12 | 12 | — |
| 1 | Namespace | 39.94 | 30.23 – 41.16 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 40.28 | 39.85 – 41.84 | 12 | 12 | tied |
| 4 | Novita | 43.73 | 43.18 – 45.91 | 12 | 12 | — |
| 4 | run.cloud | 47.19 | 43.73 – 79.25 | 12 | 12 | tied |
| 4 | Modal (VM) | 50.09 | 49.41 – 53.41 | 12 | 12 | tied |
| 4 | Blaxel | 51.13 | 49.35 – 52.22 | 12 | 12 | tied |
| 4 | tama | 52.63 | 45.67 – 62.94 | 3 | 3 | tied |
| 4 | E2B | 66.47 | 61.12 – 69.61 | 12 | 12 | tied |
| 10 | Vercel Sandbox | 76.78 | 71.48 – 80.31 | 12 | 12 | — |
| 11 | Modal (gVisor) | 83.3 | 80.44 – 86.5 | 12 | 12 | — |
| 12 | Runloop | 147.1 | 142 – 148.3 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 66.39 | 65.3 – 69.36 | 12 | 12 | — |
| 2 | Namespace | 69.47 | 68.69 – 70.9 | 12 | 12 | — |
| 3 | Novita | 75.89 | 74.51 – 76.38 | 12 | 12 | — |
| 4 | Blaxel | 77.86 | 76.73 – 78.61 | 12 | 12 | — |
| 5 | Modal (VM) | 91.85 | 91.6 – 92.62 | 12 | 12 | — |
| 5 | run.cloud | 93.73 | 72.59 – 137.8 | 12 | 12 | tied |
| 5 | tama | 100.3 | 98.48 – 105.3 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 107.6 | 76.95 – 110.2 | 12 | 12 | tied |
| 9 | E2B | 115.6 | 101.3 – 125.2 | 12 | 12 | — |
| 10 | Vercel Sandbox | 140.9 | 127 – 165.8 | 12 | 12 | — |
| 11 | Modal (gVisor) | 173 | 170.9 – 184 | 12 | 12 | — |
| 12 | Runloop | 226.9 | 196.5 – 232.4 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.73 | 1.681 – 2.468 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.154 | 2.03 – 2.665 | 12 | 12 | — |
| 2 | Blaxel | 2.25 | 1.708 – 2.333 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 2.426 | 2.118 – 2.837 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.029 | 2.757 – 3.179 | 12 | 12 | — |
| 5 | run.cloud | 3.176 | 2.978 – 4.498 | 12 | 12 | tied |
| 5 | Novita | 3.635 | 3.276 – 3.887 | 12 | 12 | tied |
| 5 | E2B | 3.772 | 3.357 – 4.218 | 12 | 12 | tied |
| 5 | tama | 4.026 | 3.202 – 5.21 | 12 | 12 | tied |
| 5 | Modal (VM) | 4.35 | 2.933 – 60.35 | 12 | 12 | tied |
| 5 | Modal (gVisor) | 6.077 | 5.579 – 6.891 | 12 | 12 | tied |
| 12 | Runloop | 7.925 | 6.994 – 10.06 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 82.16 | 81.48 – 83.68 | 12 | 12 | — |
| 1 | Daytona (VM) | 83.42 | 82.33 – 91.46 | 12 | 12 | tied |
| 3 | Blaxel | 95.86 | 93.76 – 113.5 | 12 | 12 | — |
| 3 | Novita | 96.76 | 95.02 – 97.72 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 109.9 | 99.38 – 117.6 | 12 | 12 | — |
| 5 | Modal (VM) | 114.9 | 114.5 – 116 | 12 | 12 | tied |
| 5 | run.cloud | 118.2 | 86.99 – 184.2 | 12 | 12 | tied |
| 5 | tama | 119.7 | 108.4 – 122.6 | 12 | 12 | tied |
| 9 | E2B | 140.9 | 123.7 – 155.5 | 12 | 12 | — |
| 10 | Vercel Sandbox | 178.4 | 159.1 – 208.2 | 12 | 12 | — |
| 10 | Modal (gVisor) | 203.9 | 199.6 – 211.6 | 12 | 12 | tied |
| 12 | Runloop | 319.9 | 228.7 – 322.6 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.02 | 9.752 – 10.23 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.13 | 11.64 – 12.34 | 12 | 12 | — |
| 3 | run.cloud | 12.15 | — | 1 | 1 | — |
| 4 | Novita | 14.39 | 14.12 – 14.95 | 12 | 12 | — |
| 4 | Blaxel | 14.63 | 13.94 – 17.45 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 17.17 | 15.27 – 18.55 | 12 | 12 | tied |
| 4 | E2B | 17.54 | 16.01 – 18.71 | 12 | 12 | tied |
| 4 | Modal (VM) | 19.47 | 17.38 – 20.53 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 19.87 | 18.25 – 22.79 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 27.69 | 26.16 – 28.26 | 12 | 12 | — |
| 11 | Runloop | 40.88 | 38.43 – 41.95 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Namespace, Daytona (VM), Microsandbox Cloud, Blaxel, Vercel Sandbox, Modal (VM) and Novita share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.426 | 2.412 – 5.228 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.995 | 2.852 – 3.673 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 3.108 | 3.028 – 3.136 | 12 | 12 | tied |
| 1 | Blaxel | 3.165 | 2.63 – 12.44 | 12 | 12 | tied |
| 1 | Vercel Sandbox | 3.9 | 3.758 – 4.309 | 12 | 12 | tied |
| 1 | Modal (VM) | 4.09 | 3.224 – 7.844 | 12 | 12 | tied |
| 1 | Novita | 4.34 | 4.131 – 4.644 | 12 | 12 | tied |
| 8 | run.cloud | 4.538 | — | 1 | 1 | — |
| 9 | E2B | 4.587 | 4.036 – 5.827 | 12 | 12 | — |
| 10 | Modal (gVisor) | 10.57 | 9.912 – 11.98 | 12 | 12 | — |
| 10 | Runloop | 10.73 | 9.585 – 12.69 | 12 | 12 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 81.1 | 80.08 – 81.96 | 12 | 12 | — |
| 2 | Daytona (VM) | 89.27 | 88.78 – 90.28 | 12 | 12 | — |
| 3 | run.cloud | 98.45 | — | 1 | 1 | — |
| 4 | Novita | 109.7 | 108.8 – 110.9 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 113.6 | 106.1 – 121.8 | 12 | 12 | tied |
| 4 | Modal (VM) | 120.2 | 117.3 – 121.6 | 12 | 12 | tied |
| 7 | E2B | 149.6 | 127.9 – 175.5 | 12 | 12 | — |
| 8 | Vercel Sandbox | 177.1 | 163.1 – 182.5 | 12 | 12 | — |
| 9 | Modal (gVisor) | 258.6 | 247.3 – 276 | 12 | 12 | — |
| 10 | Runloop | 318.4 | 313.3 – 323.4 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 13.82 | 13.21 – 14 | 12 | 12 | — |
| 2 | Daytona (VM) | 16.29 | 15.79 – 16.68 | 12 | 12 | — |
| 3 | run.cloud | 18.93 | — | 1 | 1 | — |
| 4 | Microsandbox Cloud | 20.23 | 17.84 – 21.38 | 12 | 12 | — |
| 4 | Modal (VM) | 20.95 | 20.32 – 21.35 | 12 | 12 | tied |
| 4 | Novita | 21.34 | 20.62 – 21.97 | 12 | 12 | tied |
| 7 | Blaxel | 27.56 | 25.42 – 28.61 | 12 | 12 | — |
| 7 | E2B | 29.2 | 26.06 – 33.66 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 29.9 | 27.72 – 31.31 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 37.89 | 30.52 – 53.9 | 12 | 12 | — |
| 11 | Runloop | 55.39 | 53.64 – 56.96 | 12 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 21.47 | 20 – 21.92 | 3 | 6 | — |
| 2 | Novita | 21.25 | 19.48 – 21.34 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 20.91 | 19.69 – 21.77 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 19.29 | 18.45 – 20.42 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 18.4 | 12.82 – 22.27 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 16.8 | 14.25 – 20.05 | 3 | 6 | too few sandboxes |
| 7 | tama | 15.98 | 15.91 – 16.2 | 3 | 6 | too few sandboxes |
| 8 | E2B | 15.93 | 11.79 – 17.75 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 14.97 | 12.96 – 15.27 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 12.25 | 8.94 – 12.68 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 8.585 | 8.535 – 8.85 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 7.525 | 7.29 – 7.71 | 3 | 6 | too few sandboxes |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong></summary>

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Namespace leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 69900 | 69650 – 71300 | 3 | 6 | — |
| 2 | Blaxel | 54400 | 49700 – 56000 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 47550 | 41350 – 48900 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 34800 | 23750 – 35200 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 32300 | 29650 – 33550 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 30750 | 14000 – 32200 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 29500 | 28500 – 30300 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 25250 | 23100 – 25800 | 3 | 6 | too few sandboxes |
| 9 | Novita | 16350 | 16150 – 16600 | 3 | 6 | too few sandboxes |
| 10 | E2B | 12600 | 11600 – 12950 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 7049 | 6932 – 7058 | 3 | 6 | too few sandboxes |
| 12 | tama | 6665 | 5987 – 6932 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Namespace leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 286.3 | 285.7 – 292 | 3 | 6 | — |
| 2 | Blaxel | 222.8 | 203.9 – 229.6 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 194.5 | 169.3 – 200.8 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 142.6 | 97.15 – 144.2 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 132.6 | 121.6 – 137.4 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 125.8 | 57.46 – 131.6 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 121.1 | 116.9 – 124.3 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 103.3 | 94.63 – 106 | 3 | 6 | too few sandboxes |
| 9 | Novita | 67.06 | 66.32 – 68.11 | 3 | 6 | too few sandboxes |
| 10 | E2B | 51.64 | 47.55 – 53.22 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 28.89 | 28.36 – 28.94 | 3 | 6 | too few sandboxes |
| 12 | tama | 27.26 | 24.54 – 28.36 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 292500 | 291000 – 294500 | 3 | 6 | — |
| 2 | Novita | 248000 | 245000 – 249500 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 212000 | 211000 – 223500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 191500 | 165000 – 210000 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 168500 | 166500 – 175000 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 157500 | 140000 – 161500 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 145500 | 69100 – 158500 | 3 | 6 | too few sandboxes |
| 8 | tama | 125500 | 121950 – 144500 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 116500 | 109500 – 116500 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 114000 | 113000 – 116000 | 3 | 6 | too few sandboxes |
| 11 | E2B | 60050 | 60050 – 60100 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 24050 | 23450 – 25050 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1200 | 1191 – 1207 | 3 | 6 | — |
| 2 | Novita | 1017 | 1002 – 1022 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 868.7 | 864 – 914.9 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 785.9 | 676.3 – 858.8 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 690.5 | 682.6 – 716.2 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 645.4 | 572.5 – 663.2 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 595.6 | 283.1 – 650.6 | 3 | 6 | too few sandboxes |
| 8 | tama | 512.8 | 500.2 – 592.4 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 476.1 | 449.8 – 478.2 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 466.6 | 461.9 – 475.5 | 3 | 6 | too few sandboxes |
| 11 | E2B | 245.9 | 245.9 – 246.4 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 98.46 | 96.21 – 102.6 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 17400 | 17000 – 17400 | 3 | 6 | — |
| 2 | Daytona (VM) | 11100 | 10031 – 12300 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9279 | 8632 – 9767 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5496 | 2659 – 5983 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4925 | 4754 – 5030 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 4676 | 4585 – 6409 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 4165 | 3030 – 4268 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3001 | 2861 – 3151 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1485 | 1368 – 1503 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1076 | 1062 – 1098 | 3 | 6 | too few sandboxes |
| 11 | tama | 777.5 | 538 – 954 | 3 | 6 | too few sandboxes |
| 12 | E2B | 600 | 599 – 600 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 18250 | 17820 – 18250 | 3 | 6 | — |
| 2 | Daytona (VM) | 11650 | 10540 – 12880 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9731 | 9052 – 10220 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5765 | 2790 – 6275 | 3 | 6 | too few sandboxes |
| 5 | Novita | 5166 | 4987 – 5276 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 4904 | 4809 – 6722 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 4369 | 3178 – 4477 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3148 | 3001 – 3305 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1558 | 1436 – 1577 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1130 | 1114 – 1153 | 3 | 6 | too few sandboxes |
| 11 | tama | 816.3 | 565.4 – 1002 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.7 | 630.2 – 631.2 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4965 | 4157 – 5258 | 3 | 6 | — |
| 2 | Namespace | 4255 | 4240 – 4304 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 3177 | 3166 – 3388 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 3134 | 2661 – 3411 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 2975 | 2593 – 3087 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 2724 | 1422 – 3739 | 3 | 6 | too few sandboxes |
| 7 | Novita | 2367 | 2300 – 2447 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1561 | 1488 – 1757 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1381 | 1372 – 1390 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 968.5 | 957.5 – 1044 | 3 | 6 | too few sandboxes |
| 11 | E2B | 604 | 596.5 – 605 | 3 | 6 | too few sandboxes |
| 12 | tama | 506.5 | 487 – 701.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5208 | 4360 – 5515 | 3 | 6 | — |
| 2 | Namespace | 4463 | 4446 – 4515 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 3332 | 3321 – 3554 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 3287 | 2791 – 3578 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 3121 | 2719 – 3239 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 2858 | 1493 – 3922 | 3 | 6 | too few sandboxes |
| 7 | Novita | 2484 | 2413 – 2567 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1638 | 1562 – 1844 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1449 | 1440 – 1459 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1017 | 1005 – 1097 | 3 | 6 | too few sandboxes |
| 11 | E2B | 634.9 | 627.6 – 636.5 | 3 | 6 | too few sandboxes |
| 12 | tama | 532.7 | 512.2 – 737.1 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.16 | 23.24 – 25.76 | 3 | 6 | — |
| 2 | Blaxel | 20.27 | 20.21 – 20.49 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 12.19 | 12.18 – 12.47 | 3 | 6 | too few sandboxes |
| 4 | Novita | 12.18 | 12.07 – 12.19 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 10.86 | 8.34 – 10.97 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 8.18 | 8.055 – 8.205 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 8.06 | 8.025 – 8.19 | 3 | 6 | too few sandboxes |
| 8 | tama | 7.255 | 7.22 – 7.435 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 5.805 | 4.99 – 7.61 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 5.14 | 5.09 – 5.22 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 3.005 | 2.555 – 3.215 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.83 | 1.615 – 1.965 | 3 | 6 | too few sandboxes |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 178593 | 177700 – 178700 | 3 | 6 | — |
| 2 | Blaxel | 107400 | 99350 – 128000 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 78120 | 66100 – 79700 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 60380 | 51330 – 79510 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57010 | 56450 – 96760 | 3 | 6 | too few sandboxes |
| 6 | Novita | 53890 | 52920 – 53930 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 52700 | 51280 – 53440 | 3 | 6 | too few sandboxes |
| 8 | E2B | 50840 | 45330 – 51700 | 3 | 6 | too few sandboxes |
| 9 | tama | 37390 | 37040 – 165600 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 34000 | 33970 – 80410 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 33110 | 31250 – 42000 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 32430 | 31425 – 32950 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 178000 | 177400 – 178300 | 3 | 6 | — |
| 2 | Blaxel | 110300 | 100100 – 126900 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 77340 | 67520 – 78750 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 61548 | 50390 – 78400 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 56960 | 56270 – 96410 | 3 | 6 | too few sandboxes |
| 6 | Novita | 53850 | 53010 – 53940 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 52100 | 50950 – 53330 | 3 | 6 | too few sandboxes |
| 8 | E2B | 50930 | 44490 – 52190 | 3 | 6 | too few sandboxes |
| 9 | tama | 35990 | 35124 – 184100 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 34160 | 33980 – 79840 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 33210 | 30890 – 41740 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 32410 | 31660 – 33173 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 206900 | 203000 – 207100 | 3 | 6 | — |
| 2 | Blaxel | 119876 | 106300 – 138600 | 3 | 6 | too few sandboxes |
| 3 | tama | 98150 | 59800 – 167700 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 93850 | 78260 – 95000 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 87920 | 87160 – 106000 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 87770 | 86610 – 132800 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 80220 | 79660 – 81770 | 3 | 6 | too few sandboxes |
| 8 | E2B | 74910 | 67600 – 75910 | 3 | 6 | too few sandboxes |
| 9 | Novita | 58460 | 58151 – 58630 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 46150 | 45780 – 73530 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 43410 | 42260 – 44140 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 37310 | 36980 – 38160 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 169900 | 168300 – 170600 | 3 | 6 | — |
| 2 | Blaxel | 98910 | 94290 – 115300 | 3 | 6 | too few sandboxes |
| 3 | tama | 74640 | 71150 – 148700 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 73720 | 64400 – 74990 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52670 | 51970 – 88210 | 3 | 6 | too few sandboxes |
| 6 | Novita | 51390 | 49870 – 51630 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 49600 | 45360 – 68630 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 44650 | 43860 – 45830 | 3 | 6 | too few sandboxes |
| 9 | E2B | 43980 | 42830 – 45050 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 31030 | 30870 – 84900 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 30560 | 29390 – 38620 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 29500 | 29060 – 30200 | 3 | 6 | too few sandboxes |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 157500 | 144830 – 161100 | 3 | 6 | — |
| 2 | Blaxel | 94760 | 90430 – 101357 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 91396 | 70000 – 91630 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 66150 | 54580 – 77803 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 63470 | 39590 – 66490 | 3 | 6 | too few sandboxes |
| 6 | tama | 60826 | 60136 – 61516 | 1 | 2 | too few sandboxes |
| 7 | run.cloud | 60700 | 16500 – 62820 | 3 | 6 | too few sandboxes |
| 8 | E2B | 52657 | 48220 – 69190 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 52186 | 43880 – 66990 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 39601 | 36693 – 40210 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 24783 | 20154 – 24790 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 14240 | 13514 – 15796 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.6× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 158800 | 158300 – 160500 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 101621 | 93298 – 102100 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 100139 | 65680 – 103500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 78070 | 72335 – 85365 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 73667 | 23710 – 78420 | 3 | 6 | too few sandboxes |
| 6 | E2B | 57440 | 54160 – 74370 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 50827 | 31960 – 51606 | 3 | 6 | too few sandboxes |
| 8 | tama | 44430 | 44248 – 44621 | 1 | 2 | too few sandboxes |
| 9 | Runloop | 35505 | 33490 – 35900 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 29343 | 24490 – 37992 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 23850 | 17760 – 26614 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 12926 | 12577 – 15008 | 3 | 6 | too few sandboxes |

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
| 2 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | run.cloud | 9999 | 9991 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | tama | 9999 | 9999 – 9999 | 1 | 2 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 160.5 | 152.5 – 190.5 | 3 | 6 | too few sandboxes |

### iperf3 WAN download

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 7005 | 6019 – 7042 | 3 | 6 | — |
| 2 | Daytona (VM) | 6412 | 4194 – 8341 | 3 | 6 | too few sandboxes |
| 3 | Novita | 4440 | 2852 – 4813 | 3 | 6 | too few sandboxes |
| 4 | tama | 4208 | 3917 – 4498 | 1 | 2 | too few sandboxes |
| 5 | Modal (gVisor) | 4119 | 828.7 – 5101 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 2801 | 2361 – 4145 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 2466 | 1685 – 2603 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 1852 | 606.1 – 2049 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 1759 | 1200 – 2628 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1615 | 1111 – 2792 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1452 | 1411 – 1508 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 1233 | 1195 – 4615 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.5× Namespace on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9204 | 5923 – 9211 | 3 | 6 | — |
| 2 | Namespace | 6308 | 3695 – 6400 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 4326 | 2408 – 5436 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 3361 | 3045 – 3575 | 3 | 6 | too few sandboxes |
| 5 | Novita | 2323 | 2122 – 2470 | 3 | 6 | too few sandboxes |
| 6 | tama | 2083 | 1916 – 2250 | 1 | 2 | too few sandboxes |
| 7 | Blaxel | 2046 | 1918 – 2246 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1900 | 1867 – 4704 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 1347 | 183.4 – 1484 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1187 | 1169 – 1655 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1047 | 963 – 1054 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 973.6 | 60.09 – 1179 | 3 | 6 | too few sandboxes |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 358.5 | 358 – 365 | 3 | 6 | — |
| 2 | Daytona (VM) | 405.5 | 404 – 408 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 451 | 450 – 455 | 3 | 6 | too few sandboxes |
| 4 | Novita | 484 | 481 – 486 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 507.5 | 496 – 509.5 | 3 | 6 | too few sandboxes |
| 6 | tama | 533 | 509.5 – 536 | 3 | 6 | too few sandboxes |
| 7 | E2B | 558 | 510 – 805 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 669 | 611.5 – 676.5 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 767 | 764.5 – 767.5 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 797 | 500.5 – 810.5 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 901.5 | 895.5 – 902 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1187 | 1176 – 1190 | 3 | 6 | too few sandboxes |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.44 | 31.39 – 34.29 | 3 | 6 | — |
| 2 | Daytona (VM) | 35.54 | 35.52 – 36.03 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 40.39 | 40 – 40.54 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 42.38 | 42.33 – 42.46 | 3 | 6 | too few sandboxes |
| 5 | Novita | 43.94 | 43.91 – 45.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 47.14 | 43.38 – 47.25 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 50 | 36.6 – 58.83 | 3 | 6 | too few sandboxes |
| 8 | tama | 58.31 | 54.41 – 58.79 | 3 | 6 | too few sandboxes |
| 9 | E2B | 59.39 | 58.39 – 65.48 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 65.57 | 63.53 – 65.78 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 81.67 | 79.64 – 83.53 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 89.19 | 82.84 – 89.59 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_tama leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 346700 | 343600 – 497500 | 3 | 6 | — |
| 2 | Blaxel | 337800 | 330300 – 339500 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 300300 | 271500 – 303400 | 3 | 6 | too few sandboxes |
| 4 | Novita | 293200 | 291900 – 295800 | 3 | 6 | too few sandboxes |
| 5 | E2B | 256900 | 175900 – 276700 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 252900 | 236400 – 254600 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 242200 | 220100 – 243500 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 201400 | 197200 – 205900 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 157600 | 156900 – 164300 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 144700 | 144200 – 224400 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 91280 | 90410 – 115700 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 13930 | 13130 – 15120 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_tama leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.1455 | 0.1005 – 0.1455 | 3 | 6 | — |
| 2 | Blaxel | 0.148 | 0.1475 – 0.1515 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 0.1665 | 0.165 – 0.184 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.171 | 0.169 – 0.1715 | 3 | 6 | too few sandboxes |
| 5 | E2B | 0.1945 | 0.181 – 0.284 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 0.1975 | 0.196 – 0.2115 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 0.2065 | 0.2055 – 0.2305 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 0.2485 | 0.243 – 0.2535 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 0.317 | 0.3045 – 0.319 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 0.3455 | 0.223 – 0.347 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 0.5485 | 0.4325 – 0.556 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 3.603 | 3.309 – 3.811 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 26920 | 26130 – 28210 | 3 | 6 | — |
| 2 | Namespace | 25740 | 25590 – 26960 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 25030 | 24940 – 25120 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 18080 | 15150 – 18200 | 3 | 6 | too few sandboxes |
| 5 | tama | 17370 | 16710 – 23390 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 16400 | 16200 – 16890 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 15730 | 14260 – 17230 | 3 | 6 | too few sandboxes |
| 8 | E2B | 15420 | 11370 – 17360 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 14210 | 13760 – 14380 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 11030 | 10850 – 19630 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 8173 | 8083 – 11690 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 2116 | 1941 – 2170 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.859 | 1.776 – 1.914 | 3 | 6 | — |
| 2 | Namespace | 1.943 | 1.855 – 1.955 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 1.998 | 1.99 – 2.006 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 2.766 | 2.748 – 3.302 | 3 | 6 | too few sandboxes |
| 5 | tama | 2.88 | 2.139 – 2.994 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3.048 | 2.96 – 3.09 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3.178 | 2.902 – 3.508 | 3 | 6 | too few sandboxes |
| 8 | E2B | 3.242 | 2.882 – 4.399 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 3.519 | 3.477 – 3.633 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 4.534 | 2.549 – 4.609 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 6.29 | 4.292 – 6.316 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 23.63 | 23.04 – 25.76 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.97 | 30.74 – 31.13 | 3 | 6 | — |
| 2 | Blaxel | 38.61 | 37.94 – 38.84 | 3 | 6 | too few sandboxes |
| 3 | Novita | 41.46 | 40.92 – 43.39 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 47.11 | 46.5 – 47.48 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 47.23 | 46.88 – 71.08 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 62.95 | 61.06 – 63.08 | 3 | 6 | too few sandboxes |
| 7 | E2B | 65.33 | 58.38 – 72.39 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 66.86 | 62.02 – 81.29 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 74.73 | 69.89 – 76 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 105.5 | 83.9 – 105.7 | 3 | 6 | too few sandboxes |
| 11 | tama | 139.3 | 62.19 – 140.3 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 472.2 | 401.1 – 489.6 | 3 | 6 | too few sandboxes |

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

74 uncovered results across 12 providers (Blaxel 4, Daytona (VM) 4, E2B 4, Microsandbox Cloud 4, Modal (gVisor) 4, Modal (VM) 4, Namespace 4, Novita 4, run.cloud 6, Runloop 4, tama 28, Vercel Sandbox 4). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 2 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions, realworld_openclaw_task_test_types |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| E2B | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| E2B | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| run.cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| run.cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| run.cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| run.cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: run.cloud API 429: concurrent sandbox resource limit reached |
| run.cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Runloop | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Runloop | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Runloop | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Runloop | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |
| tama | network | **failed** | Failed to create sandbox: tama new bench-a64208b7-5aaf-468a-af6e-9e2f63269f78 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a64208b7-5aaf-468a-af6e-9e2f63269f78 failed to provision; inspect it in the console; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | network | **failed** | Failed to create sandbox: tama new bench-d9bd1c52-05cf-418d-b940-3e858698a384 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d9bd1c52-05cf-418d-b940-3e858698a384 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-fcc6875f-50b3-41b7-92f2-44419b887196 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-fcc6875f-50b3-41b7-92f2-44419b887196 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f6cdd8f4-e4de-456a-b642-8bc52ae0331d --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f6cdd8f4-e4de-456a-b642-8bc52ae0331d failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-0b25ba49-a27c-4b00-a13a-c3f46cdfd426 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0b25ba49-a27c-4b00-a13a-c3f46cdfd426 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f3b334b2-02bd-4837-bb41-73ee83654f6b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f3b334b2-02bd-4837-bb41-73ee83654f6b failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-493117bd-887c-4d59-9540-a7bfa0ccb9e3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-493117bd-887c-4d59-9540-a7bfa0ccb9e3 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-96821255-f97e-4945-a0ec-ba280280ec59 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-96821255-f97e-4945-a0ec-ba280280ec59 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-a2334208-476d-491a-b9c2-c62b477c27c5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a2334208-476d-491a-b9c2-c62b477c27c5 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-aac6b2bf-7f0f-4b67-a12f-21b3f73f067b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-aac6b2bf-7f0f-4b67-a12f-21b3f73f067b failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-e921b932-bce4-47c5-a86e-b0db16bac872 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e921b932-bce4-47c5-a86e-b0db16bac872 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| tama | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-129f02f9-6aa1-43e5-a159-c9e4daad9923 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-129f02f9-6aa1-43e5-a159-c9e4daad9923 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f936a151-51dd-4a73-848a-e425025ba3b5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f936a151-51dd-4a73-848a-e425025ba3b5 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d1550253-ea28-43ef-9080-b540ba33c4f5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d1550253-ea28-43ef-9080-b540ba33c4f5 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-323c2302-422c-4274-84ba-3aeb0b8e8d7a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-323c2302-422c-4274-84ba-3aeb0b8e8d7a failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-89332dda-9a33-47f6-a119-ac65850f904f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-89332dda-9a33-47f6-a119-ac65850f904f failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-5a6adcd1-2960-4ca9-bef5-78497ee06d48 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5a6adcd1-2960-4ca9-bef5-78497ee06d48 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-2ae848db-8617-45ba-ac1f-ddbd9893081d --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2ae848db-8617-45ba-ac1f-ddbd9893081d failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-20769f5b-6ace-4432-aa08-dc5b034cbd16 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-20769f5b-6ace-4432-aa08-dc5b034cbd16 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6a731556-fd19-4608-8509-e4941ce7b547 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6a731556-fd19-4608-8509-e4941ce7b547 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-b2ba47cd-d6cb-46e8-9c04-c3c267c314ac --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b2ba47cd-d6cb-46e8-9c04-c3c267c314ac failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-43b30e3c-5474-4230-97ca-e1890a270238 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-43b30e3c-5474-4230-97ca-e1890a270238 failed to provision; inspect it in the console; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6d3d24fc-e462-438a-803a-01aa30ec5e8e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6d3d24fc-e462-438a-803a-01aa30ec5e8e failed to provision; inspect it in the console; process exit 1 |
| Vercel Sandbox | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Vercel Sandbox | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Vercel Sandbox | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Vercel Sandbox | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions |

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 1 v 3 sandboxes floors at p ≈ 1.0; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 1 sandboxes floors at p ≈ 1.0; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Namespace | <0.001 | <0.001 |
| realworld | Mastra: cold install | Blaxel | 0.67 (tied) | 0.43 |
| realworld | Mastra: cold install | Novita | 0.80 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.014 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | 0.59 (tied) | 0.19 |
| realworld | Mastra: cold install | run.cloud | 0.76 (tied) | 0.066 |
| realworld | Mastra: cold install | E2B | 0.32 (tied) | 0.066 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.0068 | 0.019 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: cold install | tama | 0.48 (tied) | 0.43 |
| realworld | Mastra: cold install | Runloop | 0.045 | 0.0046 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Namespace | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.039 | 0.066 |
| realworld | Better-Auth: build | tama | 0.36 (tied) | 0.25 |
| realworld | Better-Auth: build | Novita | 0.018 | 0.012 |
| realworld | Better-Auth: build | run.cloud | 1.0 (tied) | 0.19 |
| realworld | Better-Auth: build | Modal (VM) | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: build | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: build | E2B | 0.028 | <0.001 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.0056 | 0.019 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | 0.033 | 0.066 |
| realworld | Better-Auth: cold install | run.cloud | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Novita | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: cold install | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.054 (tied) | 0.19 |
| realworld | Better-Auth: cold install | tama | 1.0 (tied) | 0.89 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.54 (tied) | 0.25 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Runloop | 0.0036 | <0.001 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0036 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.66 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.012 | 0.0046 |
| realworld | Better-Auth: git clone | E2B | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: git clone | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Novita | 0.76 (tied) | 0.99 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.0018 | 0.0046 |
| realworld | Better-Auth: git clone | tama | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Runloop | 0.031 | 0.066 |
| realworld | Better-Auth: lint (Biome) | Namespace | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | 0.70 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.33 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | tama | 0.29 (tied) | 0.14 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.0044 | 0.0047 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.0083 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.010 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.018 | 0.012 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.23 (tied) | 0.14 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.045 | 0.19 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.0011 | 0.0046 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.045 | 0.066 |
| realworld | Better-Auth: lint format | run.cloud | 0.0029 | 0.019 |
| realworld | Better-Auth: lint format | Novita | 1.0 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0083 | <0.001 |
| realworld | Better-Auth: lint format | tama | 0.0044 | 0.0047 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.36 (tied) | 0.14 |
| realworld | Better-Auth: lint format | E2B | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.13 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Novita | 0.81 (tied) | 0.99 |
| realworld | Better-Auth: lint packages | run.cloud | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | tama | 0.018 | 0.030 |
| realworld | Better-Auth: lint packages | Blaxel | 0.45 (tied) | 0.44 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | E2B | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | 0.017 | 0.019 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.0048 | 0.019 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | run.cloud | 0.033 | 0.066 |
| realworld | Better-Auth: lint spell | Novita | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | 0.24 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | tama | 0.84 (tied) | 0.44 |
| realworld | Better-Auth: lint spell | E2B | 0.031 | 0.012 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.0029 | <0.001 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | tama | 0.45 (tied) | 0.14 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.0044 | 0.0047 |
| realworld | Better-Auth: lint types | Novita | 0.84 (tied) | 0.99 |
| realworld | Better-Auth: lint types | Namespace | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: lint types | run.cloud | 0.017 | 0.066 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.024 | 0.066 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.0045 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Namespace | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | 0.014 | <0.001 |
| realworld | Better-Auth: typecheck | run.cloud | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Blaxel | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: typecheck | tama | 0.45 (tied) | 0.25 |
| realworld | Better-Auth: typecheck | E2B | 0.070 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.0029 | 0.0046 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.033 | 0.019 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Namespace | 0.020 | 0.0046 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | 0.032 | 0.0046 |
| realworld | Mastra: build:core | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | run.cloud | 0.76 (tied) | 0.066 |
| realworld | Mastra: build:core | tama | 0.84 (tied) | 0.066 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.84 (tied) | 0.19 |
| realworld | Mastra: build:core | E2B | 0.045 | 0.066 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.039 | 0.019 |
| realworld | Mastra: git clone | Blaxel | 0.35 (tied) | 0.43 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.16 (tied) | 0.19 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.014 | 0.066 |
| realworld | Mastra: git clone | run.cloud | 0.17 (tied) | 0.43 |
| realworld | Mastra: git clone | Novita | 0.50 (tied) | 0.43 |
| realworld | Mastra: git clone | E2B | 0.24 (tied) | 0.19 |
| realworld | Mastra: git clone | tama | 0.98 (tied) | 0.43 |
| realworld | Mastra: git clone | Modal (VM) | 0.89 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.078 (tied) | 0.0046 |
| realworld | Mastra: git clone | Runloop | 0.020 | 0.0046 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | 0.060 (tied) | 0.066 |
| realworld | Mastra: lint:format | Blaxel | <0.001 | 0.0046 |
| realworld | Mastra: lint:format | Novita | 0.84 (tied) | 0.79 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.033 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 0.48 (tied) | 0.066 |
| realworld | Mastra: lint:format | run.cloud | 0.80 (tied) | 0.066 |
| realworld | Mastra: lint:format | tama | 1.0 (tied) | 0.066 |
| realworld | Mastra: lint:format | E2B | 0.0045 | 0.019 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.24 (tied) | 0.066 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | run.cloud | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: cold install | Blaxel | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.10 (tied) | 0.019 |
| realworld | OpenClaw: cold install | E2B | 0.59 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.20 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.19 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.54 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Blaxel | 0.97 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.51 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.84 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Novita | 0.76 (tied) | 0.19 |
| realworld | OpenClaw: git clone | run.cloud | — | — |
| realworld | OpenClaw: git clone | E2B | — | — |
| realworld | OpenClaw: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Runloop | 0.98 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | — | — |
| realworld | OpenClaw: typecheck (test tree) | Novita | — | — |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.089 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.017 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.27 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.068 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.71 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.014 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.033 | 0.0046 |
| cpu | Node.js web tooling | Daytona (VM) | — | — |
| cpu | Node.js web tooling | Novita | 0.40 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Namespace | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | tama | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | E2B | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| cpu | Node.js web tooling | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.60 (too few sandboxes) | 1.0 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 1.0 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.60 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.30 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | tama | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Runloop | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Namespace | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Add | E2B | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | tama | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Runloop | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Namespace | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | tama | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | tama | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Runloop | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 1.0 (too few sandboxes) | 0.68 |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Novita | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (gVisor) | 1.0 (too few sandboxes) | 0.68 |
| network | iperf3 WAN download | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Runloop | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Namespace | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Novita | 0.10 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 0.50 (too few sandboxes) | 0.68 |
| network | iperf3 WAN upload | Blaxel | 1.0 (too few sandboxes) | 0.98 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | tama | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | E2B | 0.20 (too few sandboxes) | 0.32 |
| system | Git common operations | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | tama | — | — |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | tama | — | — |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | tama | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

