# Sandbox provider leaderboard

Run [`202608140001`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/202608140001) · commit [`b554885b8e25d0027b182cfc6a40b4b5b38d7990`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/b554885b8e25d0027b182cfc6a40b4b5b38d7990) ·
dataset [`data/dataset/runs/202608140001.json`](data/dataset/runs/202608140001.json) · generated 2026-08-14T05:10:52.227Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **513 metric records**
backed by **5190 retained trial observations**, across **46 metrics** and
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
| Cursor Cloud Agent | Firecracker microVM + OCI container | firecracker+oci |
| Daytona (VM) | microVM (Linux VM) | vm |
| E2B | Firecracker microVM | vm |
| Microsandbox Cloud | libkrun microVM (cloud) | vm |
| Modal (gVisor) | gVisor container | gvisor |
| Modal (VM) | microVM (VM runtime) | vm |
| Namespace | microVM (dedicated instance) | vm |
| Novita | microVM | vm |
| run.cloud | Firecracker microVM | vm |
| Runloop | microVM | vm |
| Vercel Sandbox | Firecracker microVM | vm |

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** Cursor Cloud Agent's observed compute did not match the requested CPU/RAM target; its observed allocation was **4 vCPU · 16 GiB RAM · 252 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 10 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel, Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 37.84 | 36.83 – 38.54 | 12 | 12 | — |
| 1 | Daytona (VM) | 39 | 37.26 – 39.92 | 12 | 12 | tied |
| 1 | Namespace | 40.04 | 37.99 – 46.74 | 12 | 12 | tied |
| 4 | Novita | 46.83 | 44.91 – 50.85 | 12 | 12 | — |
| 4 | Modal (VM) | 51.61 | 50.21 – 55.99 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 58.59 | 57.24 – 61.18 | 12 | 12 | — |
| 7 | run.cloud | 67.21 | 60.01 – 72.18 | 12 | 12 | — |
| 7 | E2B | 69.79 | 64.93 – 75.22 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 73.87 | 59.14 – 75.18 | 12 | 12 | tied |
| 10 | Runloop | 92.42 | 89.79 – 97.35 | 12 | 12 | — |
| 10 | Modal (gVisor) | 97.18 | 96.14 – 100.5 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 46.27 | 45.76 – 46.58 | 12 | 12 | — |
| 2 | Blaxel | 57.88 | 57.25 – 58.92 | 12 | 12 | — |
| 2 | Daytona (VM) | 58.22 | 55.09 – 69.55 | 12 | 12 | tied |
| 2 | Modal (VM) | 70.35 | 66.31 – 73.46 | 12 | 12 | tied |
| 2 | Novita | 75.01 | 70.84 – 89.78 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 80.89 | 77.77 – 85.04 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 89.73 | 88.83 – 90.48 | 12 | 12 | — |
| 7 | run.cloud | 90.66 | 83.61 – 147.5 | 12 | 12 | tied |
| 7 | E2B | 102.5 | 98.31 – 106.6 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 136.4 | 129.2 – 139.3 | 12 | 12 | — |
| 11 | Runloop | 141.5 | 138.3 – 142.6 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.74 | 11.41 – 11.87 | 12 | 12 | — |
| 2 | Daytona (VM) | 13.85 | 13.02 – 14 | 12 | 12 | — |
| 3 | Novita | 15.92 | 15.28 – 16.5 | 12 | 12 | — |
| 3 | Modal (VM) | 18.85 | 15.84 – 19.81 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 19.49 | 19.22 – 20.92 | 12 | 12 | tied |
| 3 | E2B | 20.23 | 19.66 – 21.54 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 20.64 | 18.73 – 21.42 | 12 | 12 | tied |
| 3 | Namespace | 24.3 | 13.52 – 25.43 | 12 | 12 | tied |
| 9 | Runloop | 28.02 | 27.84 – 28.18 | 12 | 12 | — |
| 10 | Modal (gVisor) | 35.93 | 32.48 – 38.03 | 12 | 12 | — |
| 10 | run.cloud | 54.9 | 16.29 – 68.62 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Vercel Sandbox is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.6295 | 0.613 – 0.641 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.825 | 0.798 – 0.87 | 12 | 12 | — |
| 2 | Modal (VM) | 0.9035 | 0.7225 – 1.048 | 12 | 12 | tied |
| 2 | Namespace | 0.968 | 0.6625 – 1.339 | 12 | 12 | tied |
| 5 | E2B | 1.433 | 1.367 – 1.565 | 12 | 12 | — |
| 5 | Daytona (VM) | 1.526 | 1.43 – 1.744 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 1.632 | 1.587 – 1.731 | 12 | 12 | tied |
| 5 | Novita | 1.902 | 1.679 – 1.987 | 12 | 12 | tied |
| 5 | run.cloud | 1.946 | 1.73 – 2.982 | 12 | 12 | tied |
| 5 | Runloop | 2.079 | 1.715 – 2.758 | 12 | 12 | tied |
| 5 | Modal (gVisor) | 2.683 | 2.542 – 2.813 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.536 | 2.396 – 2.571 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.942 | 2.903 – 3.115 | 12 | 12 | — |
| 3 | Blaxel | 3.217 | 3.163 – 3.259 | 12 | 12 | — |
| 4 | Novita | 3.788 | 3.614 – 4.213 | 12 | 12 | — |
| 4 | Modal (VM) | 3.86 | 3.461 – 4.016 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 4.03 | 3.997 – 4.184 | 12 | 12 | — |
| 6 | run.cloud | 4.089 | 3.208 – 4.196 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 4.279 | 4.239 – 4.424 | 12 | 12 | — |
| 9 | E2B | 5.075 | 4.934 – 5.213 | 12 | 12 | — |
| 10 | Runloop | 6.4 | 6.21 – 6.591 | 12 | 12 | — |
| 11 | Modal (gVisor) | 10.27 | 9.296 – 10.62 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 7.814 | 7.758 – 7.918 | 12 | 12 | — |
| 2 | Blaxel | 10.07 | 9.962 – 10.33 | 12 | 12 | — |
| 2 | Daytona (VM) | 10.35 | 10.03 – 10.61 | 12 | 12 | tied |
| 4 | Novita | 12.34 | 11.77 – 14.08 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 12.87 | 12.55 – 13.39 | 12 | 12 | tied |
| 4 | Modal (VM) | 12.98 | 11.79 – 13.21 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 14.77 | 14.53 – 14.95 | 12 | 12 | — |
| 8 | run.cloud | 16.74 | 15 – 18.08 | 12 | 12 | — |
| 9 | E2B | 19.02 | 18.56 – 19.75 | 12 | 12 | — |
| 10 | Runloop | 22.38 | 22.1 – 22.65 | 12 | 12 | — |
| 11 | Modal (gVisor) | 27.99 | 26.8 – 29.7 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.123 | 2.056 – 2.163 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.861 | 2.739 – 2.897 | 12 | 12 | — |
| 3 | Blaxel | 2.919 | 2.872 – 2.982 | 12 | 12 | — |
| 4 | Novita | 3.142 | 3.054 – 3.616 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.413 | 3.319 – 3.678 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.434 | 3.143 – 3.593 | 12 | 12 | tied |
| 7 | run.cloud | 4.364 | 4.287 – 6.101 | 12 | 12 | — |
| 7 | Vercel Sandbox | 4.389 | 4.293 – 4.506 | 12 | 12 | tied |
| 9 | E2B | 5.256 | 4.954 – 5.421 | 12 | 12 | — |
| 10 | Modal (gVisor) | 6.348 | 5.988 – 6.975 | 12 | 12 | — |
| 10 | Runloop | 6.686 | 6.534 – 6.849 | 12 | 12 | tied |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.061 | 1.97 – 2.119 | 12 | 12 | — |
| 2 | Blaxel | 2.434 | 2.359 – 2.51 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.455 | 2.362 – 2.7 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.214 | 2.868 – 3.326 | 12 | 12 | — |
| 4 | Novita | 3.314 | 2.983 – 3.598 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 3.356 | 3.288 – 3.821 | 12 | 12 | tied |
| 4 | run.cloud | 3.412 | 3.35 – 4.146 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 3.688 | 3.62 – 3.766 | 12 | 12 | tied |
| 9 | E2B | 4.271 | 4.151 – 4.539 | 12 | 12 | — |
| 10 | Runloop | 6.524 | 6.396 – 6.563 | 12 | 12 | — |
| 11 | Modal (gVisor) | 9.409 | 8.922 – 9.678 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.192 | 5.146 – 5.346 | 12 | 12 | — |
| 2 | Blaxel | 6.851 | 6.793 – 7.025 | 12 | 12 | — |
| 3 | Daytona (VM) | 7.244 | 7.101 – 7.504 | 12 | 12 | — |
| 4 | Novita | 7.934 | 7.694 – 9.115 | 12 | 12 | — |
| 4 | Modal (VM) | 8.778 | 7.604 – 9.061 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 9.998 | 9.614 – 10.6 | 12 | 12 | — |
| 6 | run.cloud | 10.86 | 9.482 – 17.67 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 11.05 | 10.82 – 11.55 | 12 | 12 | tied |
| 9 | E2B | 13.43 | 12.97 – 14.51 | 12 | 12 | — |
| 9 | Modal (gVisor) | 14.65 | 13.99 – 16 | 12 | 12 | tied |
| 11 | Runloop | 16.71 | 16.52 – 17.16 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 24.34 | 24.18 – 26.41 | 12 | 12 | — |
| 1 | Daytona (VM) | 24.92 | 23.65 – 33.73 | 12 | 12 | tied |
| 1 | Blaxel | 26.7 | 25.7 – 27.11 | 12 | 12 | tied |
| 4 | Modal (VM) | 34.14 | 30.38 – 35.16 | 12 | 12 | — |
| 4 | Novita | 36.03 | 34.39 – 41.45 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 40.66 | 38.82 – 44.63 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 44.3 | 43.4 – 45.27 | 12 | 12 | — |
| 7 | run.cloud | 48.55 | 40.39 – 79.95 | 12 | 12 | tied |
| 7 | E2B | 52.28 | 50.71 – 56.95 | 12 | 12 | tied |
| 10 | Runloop | 76.78 | 75.51 – 79.73 | 12 | 12 | — |
| 11 | Modal (gVisor) | 101.6 | 95.9 – 108.8 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 29.98 | 29.52 – 31.1 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.32 | 38.31 – 47.32 | 12 | 12 | — |
| 2 | Blaxel | 41.52 | 40.26 – 42.9 | 12 | 12 | tied |
| 4 | Novita | 46.14 | 44.46 – 52.67 | 12 | 12 | — |
| 4 | Modal (VM) | 50.11 | 47.22 – 54.81 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 60.39 | 57.79 – 61.86 | 12 | 12 | — |
| 7 | Vercel Sandbox | 65.43 | 64.34 – 67 | 12 | 12 | — |
| 7 | run.cloud | 65.48 | 57.4 – 134 | 12 | 12 | tied |
| 7 | E2B | 76.66 | 72.24 – 81.05 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 79.19 | 75.11 – 86.39 | 12 | 12 | tied |
| 11 | Runloop | 100.2 | 99.45 – 103.5 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 55.78 | 55.23 – 56.21 | 12 | 12 | — |
| 2 | Daytona (VM) | 70.73 | 69.94 – 72.22 | 12 | 12 | — |
| 2 | Blaxel | 71.79 | 70.56 – 73.44 | 12 | 12 | tied |
| 4 | Novita | 84.21 | 80.19 – 94.57 | 12 | 12 | — |
| 4 | Modal (VM) | 91.55 | 89.92 – 118.3 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 94.91 | 92.5 – 97.55 | 12 | 12 | tied |
| 7 | run.cloud | 121.4 | 115.7 – 126.4 | 12 | 12 | — |
| 8 | E2B | 128.4 | 122.4 – 137.6 | 12 | 12 | — |
| 8 | Vercel Sandbox | 150.6 | 109.1 – 155 | 12 | 12 | tied |
| 10 | Runloop | 159.4 | 152.6 – 178.5 | 12 | 12 | — |
| 10 | Modal (gVisor) | 171.5 | 163.3 – 177 | 12 | 12 | tied |

### Mastra: git clone

Seconds · lower is better

_Blaxel, Modal (VM), Daytona (VM), Vercel Sandbox, Microsandbox Cloud, run.cloud, E2B, Namespace and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.083 | 2.006 – 2.197 | 12 | 12 | — |
| 1 | Modal (VM) | 2.299 | 2.037 – 2.996 | 12 | 12 | tied |
| 1 | Daytona (VM) | 2.388 | 2.249 – 3.938 | 12 | 12 | tied |
| 1 | Vercel Sandbox | 2.892 | 2.378 – 3.202 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 3.082 | 3.008 – 3.213 | 12 | 12 | tied |
| 1 | run.cloud | 3.296 | 3.163 – 3.599 | 12 | 12 | tied |
| 1 | E2B | 3.351 | 3.266 – 3.596 | 12 | 12 | tied |
| 1 | Namespace | 3.743 | 2.734 – 4.141 | 12 | 12 | tied |
| 1 | Novita | 4.061 | 3.184 – 5.328 | 12 | 12 | tied |
| 10 | Runloop | 5.427 | 4.671 – 6.383 | 12 | 12 | — |
| 10 | Modal (gVisor) | 6.489 | 6.22 – 6.737 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 67.09 | 66.28 – 72.29 | 12 | 12 | — |
| 2 | Blaxel | 88.88 | 87.06 – 93.15 | 12 | 12 | — |
| 2 | Daytona (VM) | 93.22 | 86.02 – 98.04 | 12 | 12 | tied |
| 4 | Novita | 101.8 | 98.52 – 113.7 | 12 | 12 | — |
| 4 | Modal (VM) | 115 | 114 – 145.7 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 116.4 | 114.8 – 121.9 | 12 | 12 | tied |
| 7 | run.cloud | 150.9 | 147 – 158.5 | 12 | 12 | — |
| 8 | E2B | 165.8 | 155.1 – 172.2 | 12 | 12 | — |
| 9 | Modal (gVisor) | 189.2 | 187.1 – 194.5 | 12 | 12 | — |
| 9 | Vercel Sandbox | 189.3 | 140 – 192.1 | 12 | 12 | tied |
| 11 | Runloop | 199.8 | 192.2 – 225.7 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel, Namespace, Daytona (VM), Modal (VM), Novita, Vercel Sandbox, E2B, Microsandbox Cloud, run.cloud and Runloop share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.26 | 11.16 – 11.6 | 12 | 12 | — |
| 1 | Namespace | 14.65 | 10.98 – 17.92 | 12 | 12 | tied |
| 1 | Daytona (VM) | 15.65 | 14.75 – 16.21 | 12 | 12 | tied |
| 1 | Modal (VM) | 18.2 | 14.13 – 18.54 | 12 | 12 | tied |
| 1 | Novita | 19.01 | 17.79 – 22.58 | 12 | 12 | tied |
| 1 | Vercel Sandbox | 19.67 | 17.55 – 22.25 | 12 | 12 | tied |
| 1 | E2B | 19.93 | 19.51 – 22.6 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 20.31 | 19.11 – 21.27 | 12 | 12 | tied |
| 1 | run.cloud | 21.28 | 18.32 – 24.21 | 11 | 11 | tied |
| 1 | Runloop | 24.34 | 22.76 – 26.59 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 31.91 | 30.17 – 36.44 | 9 | 9 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.373 | 2.352 – 2.433 | 12 | 12 | — |
| 2 | Modal (VM) | 3.183 | 2.8 – 3.627 | 12 | 12 | — |
| 2 | Daytona (VM) | 3.551 | 3.047 – 5.737 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 4.111 | 3.611 – 4.527 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 4.181 | 4.052 – 4.329 | 12 | 12 | tied |
| 2 | Novita | 4.183 | 4.073 – 4.415 | 12 | 12 | tied |
| 2 | run.cloud | 4.275 | 4.185 – 4.646 | 11 | 11 | tied |
| 2 | E2B | 4.483 | 4.412 – 4.532 | 12 | 12 | tied |
| 9 | Namespace | 6.213 | 4.639 – 8.429 | 12 | 12 | — |
| 9 | Runloop | 6.78 | 5.619 – 8.105 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 10.32 | 9.888 – 12.82 | 9 | 9 | — |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 51.56 | 50.51 – 54.95 | 12 | 12 | — |
| 2 | Blaxel | 61.36 | 60.08 – 62.87 | 12 | 12 | — |
| 2 | Daytona (VM) | 61.68 | 60.36 – 64.65 | 12 | 12 | tied |
| 4 | Novita | 69.31 | 68.47 – 73.49 | 12 | 12 | — |
| 4 | Modal (VM) | 73.92 | 62.87 – 83.57 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 89.55 | 87.72 – 94.81 | 12 | 12 | — |
| 7 | run.cloud | 101.7 | 99.78 – 108.8 | 11 | 11 | — |
| 8 | E2B | 110.3 | 106.7 – 112.8 | 12 | 12 | — |
| 8 | Vercel Sandbox | 111 | 93.67 – 127.1 | 12 | 12 | tied |
| 10 | Runloop | 133.7 | 132.1 – 140 | 12 | 12 | — |
| 11 | Modal (gVisor) | 177.8 | 158.8 – 191.9 | 9 | 9 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 80.36 | 78.46 – 82.7 | 12 | 12 | — |
| 2 | Daytona (VM) | 100.3 | 91.29 – 103.9 | 12 | 12 | — |
| 3 | Modal (VM) | 120.3 | 106.9 – 127.1 | 12 | 12 | — |
| 3 | Novita | 126.4 | 122.1 – 144.4 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 131 | 127.7 – 134.6 | 12 | 12 | tied |
| 6 | run.cloud | 163 | 154.2 – 165.8 | 11 | 11 | — |
| 6 | Vercel Sandbox | 170.5 | 145 – 193.7 | 12 | 12 | tied |
| 6 | E2B | 184.4 | 179 – 188 | 12 | 12 | tied |
| 9 | Runloop | 208.8 | 202.2 – 212.7 | 12 | 12 | — |
| 10 | Modal (gVisor) | 315.2 | 275.3 – 331.2 | 9 | 9 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 13.73 | 13.5 – 13.93 | 12 | 12 | — |
| 2 | Daytona (VM) | 17.32 | 16.62 – 18 | 12 | 12 | — |
| 2 | Blaxel | 17.34 | 16.78 – 17.78 | 12 | 12 | tied |
| 4 | Modal (VM) | 20.83 | 18.06 – 22.54 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 22.99 | 22.6 – 23.44 | 12 | 12 | — |
| 5 | Novita | 24.25 | 22.82 – 26.31 | 12 | 12 | tied |
| 5 | run.cloud | 27.11 | 25.08 – 27.9 | 11 | 11 | tied |
| 5 | Vercel Sandbox | 30.06 | 26.59 – 34.92 | 12 | 12 | tied |
| 9 | Runloop | 36.4 | 35.08 – 37.78 | 12 | 12 | — |
| 9 | E2B | 37.39 | 35.04 – 37.94 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 70.31 | 52.44 – 91.65 | 9 | 9 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 28.13 | 27.83 – 29.05 | 3 | 9 | — |
| 2 | Blaxel | 20.41 | 19.27 – 21.14 | 3 | 21 | too few sandboxes |
| 3 | Cursor Cloud Agent | 20.3 | — | 1 | 1 | — |
| 4 | Daytona (VM) | 18.86 | 18.58 – 21.09 | 3 | 24 | — |
| 5 | Microsandbox Cloud | 17.19 | 16.45 – 17.43 | 3 | 33 | too few sandboxes |
| 6 | Modal (VM) | 15.46 | 15.15 – 18.07 | 3 | 21 | too few sandboxes |
| 7 | Novita | 15.19 | 15.08 – 16.85 | 3 | 23 | too few sandboxes |
| 8 | Vercel Sandbox | 13.6 | 9.67 – 13.7 | 3 | 9 | too few sandboxes |
| 9 | E2B | 11.57 | 8.99 – 11.64 | 3 | 22 | too few sandboxes |
| 10 | Runloop | 10.87 | 9.19 – 12.77 | 3 | 9 | too few sandboxes |
| 11 | Modal (gVisor) | 9.98 | 9.62 – 10.1 | 3 | 45 | too few sandboxes |
| 12 | run.cloud | 9.22 | 8.99 – 12.1 | 3 | 45 | too few sandboxes |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 305500 | 291000 – 321000 | 3 | 6 | — |
| 2 | Daytona (VM) | 268500 | 260000 – 329500 | 3 | 6 | too few sandboxes |
| 3 | Cursor Cloud Agent | 267000 | — | 1 | 1 | — |
| 4 | run.cloud | 256000 | 162500 – 284500 | 3 | 6 | — |
| 5 | Namespace | 254000 | 246000 – 738500 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 227500 | 215500 – 228500 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 223500 | 214500 – 245000 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 165000 | 148500 – 203000 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 140000 | 137600 – 147500 | 3 | 6 | too few sandboxes |
| 10 | Novita | 95300 | 80550 – 144000 | 3 | 6 | too few sandboxes |
| 11 | E2B | 47100 | 46800 – 47950 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 33000 | 31350 – 34000 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1193 | 1136 – 1255 | 3 | 6 | — |
| 2 | Daytona (VM) | 1048 | 1015 – 1287 | 3 | 6 | too few sandboxes |
| 3 | Cursor Cloud Agent | 1042 | — | 1 | 1 | — |
| 4 | run.cloud | 1000 | 636.5 – 1112 | 3 | 6 | — |
| 5 | Namespace | 991.5 | 961.5 – 2885 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 888.5 | 840 – 893 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 874 | 839 – 956 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 643.5 | 580 – 792 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 547.5 | 536.5 – 576 | 3 | 6 | too few sandboxes |
| 10 | Novita | 373 | 314.5 – 562 | 3 | 6 | too few sandboxes |
| 11 | E2B | 184 | 183 – 187.5 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 128.5 | 122.5 – 132.5 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.1× Cursor Cloud Agent on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 284000 | 206500 – 295500 | 3 | 6 | — |
| 2 | Cursor Cloud Agent | 256000 | — | 1 | 1 | — |
| 3 | Namespace | 248500 | 235500 – 607000 | 3 | 6 | — |
| 4 | Daytona (VM) | 237500 | 226000 – 273000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 210500 | 202000 – 211500 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 210000 | 208000 – 214000 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 207500 | 173000 – 216500 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 178000 | 154000 – 213500 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 156000 | 134000 – 188000 | 3 | 6 | too few sandboxes |
| 10 | Novita | 110850 | 81050 – 170000 | 3 | 6 | too few sandboxes |
| 11 | E2B | 48550 | 47050 – 49100 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 26800 | 25300 – 27450 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.1× Cursor Cloud Agent on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1109 | 808 – 1153 | 3 | 6 | — |
| 2 | Cursor Cloud Agent | 998 | — | 1 | 1 | — |
| 3 | Namespace | 969.5 | 919 – 2370 | 3 | 6 | — |
| 4 | Daytona (VM) | 926.5 | 883 – 1067 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 823.5 | 789 – 828 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 821 | 813.5 – 836 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 810.5 | 675 – 847.5 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 696 | 600.5 – 834.5 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 610 | 524.5 – 733.5 | 3 | 6 | too few sandboxes |
| 10 | Novita | 433 | 316.5 – 663.5 | 3 | 6 | too few sandboxes |
| 11 | E2B | 190 | 184 – 192 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 105 | 98.95 – 107.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 19150 | 17750 – 19950 | 3 | 6 | — |
| 2 | Daytona (VM) | 9179 | 7330 – 9430 | 3 | 6 | too few sandboxes |
| 3 | Novita | 8027 | 6701 – 10856 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 7904 | 6489 – 8346 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 6375 | 6099 – 6577 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 5759 | 5163 – 7637 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 4858 | 4575 – 11050 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 4085 | 3893 – 4245 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 4075 | 3986 – 4827 | 3 | 6 | too few sandboxes |
| 10 | Cursor Cloud Agent | 3476 | — | 1 | 1 | — |
| 11 | Modal (VM) | 1926 | 1866 – 1947 | 3 | 6 | — |
| 12 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 8028 | 6703 – 9514 | 3 | 5 | — |
| 2 | Blaxel | 7905 | 6490 – 8348 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 7559 | 7331 – 8060 | 3 | 4 | too few sandboxes |
| 4 | Microsandbox Cloud | 6377 | 6100 – 6578 | 3 | 6 | too few sandboxes |
| 5 | Runloop | 5760 | 5165 – 7639 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 4718 | 4576 – 4859 | 2 | 4 | too few sandboxes |
| 7 | Vercel Sandbox | 4087 | 3895 – 4247 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 4076 | 3988 – 4829 | 3 | 6 | too few sandboxes |
| 9 | Cursor Cloud Agent | 3478 | — | 1 | 1 | — |
| 10 | Modal (VM) | 1927 | 1868 – 1949 | 3 | 6 | — |
| 11 | E2B | 601 | 601 – 601 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 5864 | 5095 – 6620 | 3 | 6 | — |
| 2 | Blaxel | 5659 | 3890 – 5792 | 3 | 6 | too few sandboxes |
| 3 | Novita | 3980 | 3634 – 5687 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3972 | 3201 – 7067 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 3944 | 3748 – 4025 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3020 | 2479 – 3419 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 2961 | 2885 – 3727 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2934 | 2774 – 4604 | 3 | 6 | too few sandboxes |
| 9 | Cursor Cloud Agent | 2821 | — | 1 | 1 | — |
| 10 | Namespace | 2808 | 2521 – 2810 | 3 | 6 | — |
| 11 | Vercel Sandbox | 2623 | 2611 – 3162 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599 | 599 – 600 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 5866 | 5097 – 6621 | 3 | 6 | — |
| 2 | Blaxel | 5661 | 3891 – 5793 | 3 | 6 | too few sandboxes |
| 3 | Novita | 3982 | 3636 – 5689 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3974 | 3203 – 7068 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 3946 | 3749 – 4026 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3022 | 2481 – 3420 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 2962 | 2886 – 3729 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2935 | 2775 – 4606 | 3 | 6 | too few sandboxes |
| 9 | Cursor Cloud Agent | 2823 | — | 1 | 1 | — |
| 10 | Namespace | 2810 | 2523 – 2812 | 3 | 6 | — |
| 11 | Vercel Sandbox | 2625 | 2613 – 3163 | 3 | 6 | too few sandboxes |
| 12 | E2B | 601 | 600.5 – 601 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.64 | 25.32 – 25.98 | 3 | 6 | — |
| 2 | Blaxel | 20.05 | 19.81 – 20.3 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 14.4 | 12.42 – 17.69 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 10.93 | 5.79 – 11.2 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 9.59 | 9.475 – 9.795 | 3 | 6 | too few sandboxes |
| 6 | Novita | 9.24 | 9.205 – 11.63 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 8.275 | 8.255 – 8.475 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 8.055 | 8.02 – 8.06 | 3 | 6 | too few sandboxes |
| 9 | Cursor Cloud Agent | 7.96 | — | 1 | 1 | — |
| 10 | Namespace | 5.245 | 4.99 – 18.61 | 3 | 6 | — |
| 11 | Modal (gVisor) | 2.825 | 2.815 – 2.9 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.415 | 1.4 – 1.43 | 3 | 6 | too few sandboxes |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 180600 | 52630 – 180900 | 3 | 15 | — |
| 2 | Blaxel | 100700 | 98900 – 129100 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 67410 | 55520 – 77090 | 3 | 15 | too few sandboxes |
| 4 | Microsandbox Cloud | 58410 | 56780 – 59504 | 3 | 15 | too few sandboxes |
| 5 | Modal (gVisor) | 56430 | 55280 – 65580 | 3 | 15 | too few sandboxes |
| 6 | Novita | 53820 | 50910 – 88870 | 3 | 15 | too few sandboxes |
| 7 | E2B | 48030 | 46630 – 51460 | 3 | 15 | too few sandboxes |
| 8 | Vercel Sandbox | 47710 | 47610 – 54370 | 3 | 15 | too few sandboxes |
| 9 | Runloop | 41900 | 31770 – 42050 | 3 | 15 | too few sandboxes |
| 10 | Namespace | 33830 | 33820 – 33930 | 3 | 15 | too few sandboxes |
| 11 | run.cloud | 32050 | 25540 – 32290 | 3 | 15 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 180000 | 53197 – 180800 | 3 | 15 | — |
| 2 | Blaxel | 100500 | 98890 – 128600 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 68030 | 54850 – 76000 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 60000 | 57550 – 66433 | 3 | 15 | too few sandboxes |
| 5 | Microsandbox Cloud | 58550 | 56930 – 60060 | 3 | 15 | too few sandboxes |
| 6 | Novita | 53860 | 50810 – 88850 | 3 | 15 | too few sandboxes |
| 7 | E2B | 47880 | 46770 – 51340 | 3 | 15 | too few sandboxes |
| 8 | Vercel Sandbox | 46810 | 46738 – 54150 | 3 | 15 | too few sandboxes |
| 9 | Runloop | 41196 | 30580 – 42450 | 3 | 15 | too few sandboxes |
| 10 | Namespace | 33770 | 33750 – 33870 | 3 | 15 | too few sandboxes |
| 11 | run.cloud | 31550 | 25810 – 32330 | 3 | 15 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 207600 | 71880 – 213600 | 3 | 59 | — |
| 2 | Blaxel | 118000 | 117900 – 143500 | 3 | 58 | too few sandboxes |
| 3 | Modal (VM) | 90000 | 86360 – 91780 | 3 | 70 | too few sandboxes |
| 4 | Modal (gVisor) | 89690 | 89500 – 94260 | 3 | 65 | too few sandboxes |
| 5 | Microsandbox Cloud | 82360 | 81860 – 83048 | 3 | 55 | too few sandboxes |
| 6 | E2B | 76670 | 74460 – 77054 | 3 | 75 | too few sandboxes |
| 7 | Novita | 74690 | 58320 – 75610 | 3 | 45 | too few sandboxes |
| 8 | Runloop | 47010 | 43670 – 48260 | 3 | 72 | too few sandboxes |
| 9 | Namespace | 44090 | 44010 – 44920 | 3 | 15 | too few sandboxes |
| 10 | run.cloud | 42850 | 36610 – 43580 | 3 | 55 | too few sandboxes |
| 11 | Vercel Sandbox | 40240 | 40120 – 83570 | 3 | 20 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 171100 | 47870 – 171900 | 3 | 15 | — |
| 2 | Blaxel | 92840 | 91370 – 120600 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 66140 | 47370 – 71981 | 3 | 15 | too few sandboxes |
| 4 | Novita | 51310 | 48690 – 87130 | 3 | 15 | too few sandboxes |
| 5 | Modal (gVisor) | 50660 | 48200 – 53630 | 3 | 15 | too few sandboxes |
| 6 | Microsandbox Cloud | 49440 | 48930 – 49503 | 3 | 15 | too few sandboxes |
| 7 | E2B | 45010 | 44660 – 45445 | 3 | 15 | too few sandboxes |
| 8 | Vercel Sandbox | 43510 | 43143 – 46530 | 3 | 15 | too few sandboxes |
| 9 | Runloop | 38120 | 28180 – 40260 | 3 | 15 | too few sandboxes |
| 10 | Namespace | 30660 | 30630 – 30770 | 3 | 15 | too few sandboxes |
| 11 | run.cloud | 29280 | 23000 – 29600 | 3 | 15 | too few sandboxes |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 151886 | 150748 – 152700 | 3 | 6 | — |
| 2 | Blaxel | 97861 | 88815 – 98660 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 75680 | 63150 – 77350 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 73119 | 56755 – 81347 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 72502 | 71830 – 72988 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 72098 | 65490 – 92070 | 3 | 6 | too few sandboxes |
| 7 | Cursor Cloud Agent | 64056 | — | 1 | 1 | — |
| 8 | Modal (VM) | 61652 | 14440 – 106394 | 3 | 6 | — |
| 9 | E2B | 61440 | 60186 – 62895 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 49870 | 48440 – 57903 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 41420 | 38440 – 43738 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 15320 | 13960 – 30312 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 154834 | 151200 – 155700 | 3 | 6 | — |
| 2 | Blaxel | 122700 | 121200 – 143814 | 3 | 6 | too few sandboxes |
| 3 | Cursor Cloud Agent | 84461 | — | 1 | 1 | — |
| 4 | Daytona (VM) | 79050 | 68100 – 94980 | 3 | 6 | — |
| 5 | Microsandbox Cloud | 78670 | 55760 – 80375 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 71731 | 62046 – 72880 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 66487 | 65809 – 67000 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 62344 | 14675 – 75257 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 52746 | 46580 – 66630 | 3 | 6 | too few sandboxes |
| 10 | E2B | 48012 | 38230 – 49550 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 37640 | 35440 – 38886 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 13810 | 11390 – 27590 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Cursor Cloud Agent, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop and Vercel Sandbox share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | Cursor Cloud Agent | 9999 | — | 1 | 1 | equal values |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | equal values |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 159 | 152 – 537.5 | 3 | 6 | too few sandboxes |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.6× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 7348 | 1939 – 8772 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 4481 | 4299 – 4937 | 3 | 6 | too few sandboxes |
| 3 | Novita | 4446 | 4250 – 4739 | 3 | 6 | too few sandboxes |
| 4 | Cursor Cloud Agent | 4226 | — | 1 | 1 | — |
| 5 | Daytona (VM) | 4177 | 3152 – 4561 | 3 | 6 | — |
| 6 | E2B | 3860 | 3373 – 4222 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 1925 | 1834 – 2305 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 1752 | 1495 – 1808 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1655 | 1627 – 1862 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1609 | 1339 – 2980 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 893 | 249.6 – 1736 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload

Mbits/sec · higher is better

_Cursor Cloud Agent leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Cursor Cloud Agent | 4267 | — | 1 | 1 | — |
| 2 | Modal (VM) | 4159 | 1452 – 9289 | 3 | 6 | — |
| 3 | Daytona (VM) | 3635 | 3033 – 4360 | 3 | 6 | too few sandboxes |
| 4 | E2B | 3566 | 3321 – 3580 | 3 | 6 | too few sandboxes |
| 5 | Novita | 3105 | 1464 – 3368 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 2526 | 1904 – 4514 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 2238 | 1968 – 2279 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1393 | 1107 – 1683 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 907.6 | 771.1 – 9216 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 893.3 | 136.2 – 1121 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 730.8 | 726.4 – 1185 | 3 | 6 | too few sandboxes |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 364.5 | 358 – 366.5 | 3 | 6 | — |
| 2 | Daytona (VM) | 441 | 410 – 445 | 3 | 6 | too few sandboxes |
| 3 | Novita | 480.5 | 478.5 – 678 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 481.5 | 480.5 – 482 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 499.5 | 497 – 516.5 | 3 | 6 | too few sandboxes |
| 6 | Cursor Cloud Agent | 575 | — | 1 | 1 | — |
| 7 | Modal (VM) | 665 | 661 – 817.5 | 3 | 6 | — |
| 8 | Vercel Sandbox | 769.5 | 761 – 1176 | 3 | 6 | too few sandboxes |
| 9 | E2B | 806 | 804.5 – 808 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 813.5 | 802 – 825.5 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 901 | 774 – 903 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1176 | 1014 – 1178 | 3 | 6 | too few sandboxes |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.57 | 31.18 – 32.12 | 3 | 6 | — |
| 2 | Daytona (VM) | 39.42 | 38.25 – 39.99 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 43.14 | 43.11 – 46.67 | 3 | 6 | too few sandboxes |
| 4 | Novita | 45.54 | 45.19 – 50.5 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 47.44 | 47.41 – 64.06 | 3 | 6 | too few sandboxes |
| 6 | Cursor Cloud Agent | 49.05 | — | 1 | 1 | — |
| 7 | Microsandbox Cloud | 52.04 | 52.01 – 55.38 | 3 | 6 | — |
| 8 | run.cloud | 53.94 | 53.06 – 53.96 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 61.56 | 60.31 – 80.05 | 3 | 6 | too few sandboxes |
| 10 | E2B | 66.09 | 64.99 – 66.98 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 81 | 61.58 – 85.93 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 84.55 | 76 – 85.07 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 324700 | 276200 – 333700 | 3 | 6 | — |
| 2 | Daytona (VM) | 283100 | 272500 – 295300 | 3 | 6 | too few sandboxes |
| 3 | Novita | 257200 | 221300 – 285500 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 253500 | 248000 – 258900 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 229700 | 215600 – 237800 | 3 | 6 | too few sandboxes |
| 6 | E2B | 219300 | 217600 – 221100 | 1 | 2 | too few sandboxes |
| 7 | Modal (VM) | 195300 | 182100 – 197300 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 175400 | 118800 – 177000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 142500 | 142200 – 214500 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 98830 | 95840 – 100500 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 11220 | 11140 – 11230 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.154 | 0.1495 – 0.181 | 3 | 6 | — |
| 2 | Daytona (VM) | 0.1765 | 0.1695 – 0.1835 | 3 | 6 | too few sandboxes |
| 3 | Novita | 0.1945 | 0.1755 – 0.2265 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 0.1975 | 0.193 – 0.202 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 0.2175 | 0.2105 – 0.232 | 3 | 6 | too few sandboxes |
| 6 | E2B | 0.228 | 0.226 – 0.23 | 1 | 2 | too few sandboxes |
| 7 | Modal (VM) | 0.256 | 0.2535 – 0.2745 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 0.285 | 0.2825 – 0.4215 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.351 | 0.2345 – 0.352 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 0.5065 | 0.4975 – 0.5215 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 4.463 | 4.455 – 4.49 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 27860 | 27200 – 27900 | 3 | 6 | — |
| 2 | Novita | 24730 | 18440 – 28570 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 23990 | 22230 – 24190 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 18660 | 12770 – 18840 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 16980 | 16380 – 16990 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 15730 | 15550 – 15930 | 3 | 6 | too few sandboxes |
| 7 | E2B | 13890 | 13130 – 14650 | 1 | 2 | too few sandboxes |
| 8 | Modal (VM) | 13350 | 13330 – 13650 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 9565 | 9291 – 9682 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 7894 | 7619 – 16200 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 1946 | 1927 – 1964 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.796 | 1.792 – 1.839 | 3 | 6 | — |
| 2 | Novita | 2.023 | 1.75 – 2.712 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.085 | 2.067 – 2.258 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 2.679 | 2.654 – 3.915 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 2.945 | 2.944 – 3.055 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3.179 | 3.139 – 3.215 | 3 | 6 | too few sandboxes |
| 7 | E2B | 3.611 | 3.413 – 3.808 | 1 | 2 | too few sandboxes |
| 8 | Modal (VM) | 3.746 | 3.674 – 3.752 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 5.229 | 5.172 – 5.405 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 6.335 | 3.103 – 6.59 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 25.69 | 25.47 – 25.95 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 34.81 | 33.22 – 35.04 | 3 | 6 | — |
| 2 | Blaxel | 41.85 | 41.18 – 44.69 | 3 | 6 | too few sandboxes |
| 3 | Novita | 44.69 | 44.54 – 56.39 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 48.82 | 47.93 – 48.9 | 3 | 6 | too few sandboxes |
| 5 | Cursor Cloud Agent | 52.09 | — | 1 | 1 | — |
| 6 | Microsandbox Cloud | 52.86 | 51.01 – 54.55 | 3 | 6 | — |
| 7 | Modal (VM) | 63.21 | 63.09 – 64.34 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 66.31 | 65.65 – 67.93 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 67.01 | 65.31 – 85.54 | 3 | 6 | too few sandboxes |
| 10 | E2B | 72.46 | 70.43 – 75.1 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 99.13 | 83.59 – 101.4 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 395.2 | 176.8 – 412 | 3 | 6 | too few sandboxes |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 0.2333 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 0.3312 | — | 1 | 1 | — |
| 2 | E2B | 0.3312 | — | 1 | 1 | equal values |
| 4 | Runloop | 0.6336 | — | 1 | 1 | — |

## Coverage gaps

35 uncovered results across 12 providers (Blaxel 2, Cursor Cloud Agent 5, Daytona (VM) 2, E2B 3, Microsandbox Cloud 2, Modal (gVisor) 4, Modal (VM) 2, Namespace 2, Novita 2, run.cloud 4, Runloop 2, Vercel Sandbox 5). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| E2B | pgbench | **failed** | Step "clone repo" failed with exit code 128 |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| run.cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| run.cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll) — the sandbox stopped responding, not a quiet long step |
| Runloop | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Runloop | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-download: pts_iperf-wan-download did not produce 1 numeric metric value(s) |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-upload: PTS batch-run of local/iperf-wan-1.0.0 completed but every trial errored (composite carries no values) |
| Vercel Sandbox | network | **failed** | Step "mise run benchmark:network:suite" failed with exit code 1 |
| Vercel Sandbox | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Vercel Sandbox | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Cursor Cloud Agent | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Cursor Cloud Agent | pgbench | **missing** | No result and no marker — the suite never reported for this provider. |
| Cursor Cloud Agent | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Cursor Cloud Agent | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Cursor Cloud Agent | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

**missing** — nothing was reported at all: no result, and no marker explaining why. The suite ran
elsewhere in this run, so it was part of the comparison, and this provider is simply absent from
it — a dropped job, a lost artifact, or a sandbox that died before it could say anything. Treat it
as unmeasured, never as a pass: the provider has not been shown to run this workload.

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 2 v 3 sandboxes floors at p ≈ 0.20; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Daytona (VM) | 0.27 (tied) | 0.43 |
| realworld | Mastra: cold install | Namespace | 0.51 (tied) | 0.43 |
| realworld | Mastra: cold install | Novita | 0.033 | 0.019 |
| realworld | Mastra: cold install | Modal (VM) | 0.10 (tied) | 0.019 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.0023 | 0.0046 |
| realworld | Mastra: cold install | run.cloud | 0.014 | 0.066 |
| realworld | Mastra: cold install | E2B | 0.35 (tied) | 0.43 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.84 (tied) | 0.43 |
| realworld | Mastra: cold install | Runloop | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: build | Modal (VM) | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: build | Novita | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.0018 | <0.001 |
| realworld | Better-Auth: build | run.cloud | 0.71 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | 0.24 (tied) | 0.019 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Runloop | 0.017 | 0.066 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.10 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.052 (tied) | 0.0046 |
| realworld | Better-Auth: cold install | E2B | 0.41 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Namespace | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: cold install | run.cloud | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.55 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Namespace | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: git clone | E2B | 0.0056 | 0.0046 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.20 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: git clone | run.cloud | 0.41 (tied) | 0.79 |
| realworld | Better-Auth: git clone | Runloop | 0.80 (tied) | 0.79 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.29 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | Namespace | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.0068 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.017 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.63 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.0045 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.0045 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.22 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.0029 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.028 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.010 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Blaxel | 0.045 | 0.019 |
| realworld | Better-Auth: lint format | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: lint format | run.cloud | 0.0056 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.94 (tied) | 0.43 |
| realworld | Better-Auth: lint format | E2B | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.36 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.012 | 0.019 |
| realworld | Better-Auth: lint packages | Novita | 0.41 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.41 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | run.cloud | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.29 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | E2B | 0.0029 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | 0.0043 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.0045 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | E2B | 0.0023 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Namespace | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Blaxel | 0.20 (tied) | 0.019 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.0056 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.052 (tied) | 0.0046 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.024 | 0.0046 |
| realworld | Better-Auth: lint types | run.cloud | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint types | E2B | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: lint types | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.012 | <0.001 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | run.cloud | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | E2B | 0.20 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | 0.35 (tied) | 0.43 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.068 (tied) | 0.019 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | 0.028 | 0.066 |
| realworld | Mastra: build:core | Vercel Sandbox | 0.18 (tied) | 0.0046 |
| realworld | Mastra: build:core | Runloop | 0.0068 | 0.019 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.41 (tied) | 0.19 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.068 (tied) | 0.066 |
| realworld | Mastra: git clone | Daytona (VM) | 0.34 (tied) | 0.43 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.54 (tied) | 0.43 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.075 (tied) | 0.066 |
| realworld | Mastra: git clone | run.cloud | 0.066 (tied) | 0.19 |
| realworld | Mastra: git clone | E2B | 0.55 (tied) | 0.79 |
| realworld | Mastra: git clone | Namespace | 0.55 (tied) | 0.19 |
| realworld | Mastra: git clone | Novita | 0.32 (tied) | 0.43 |
| realworld | Mastra: git clone | Runloop | 0.028 | 0.066 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.068 (tied) | 0.019 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.32 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | 0.0056 | 0.0046 |
| realworld | Mastra: lint:format | Modal (VM) | 0.068 (tied) | 0.019 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.76 (tied) | 0.43 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | E2B | 0.028 | 0.019 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.35 (tied) | 0.43 |
| realworld | Mastra: lint:format | Runloop | 0.0011 | 0.019 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Namespace | 0.25 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Daytona (VM) | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.13 (tied) | 0.0046 |
| realworld | OpenClaw: cold install | Novita | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: cold install | E2B | 0.16 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: cold install | run.cloud | 0.49 (tied) | 0.33 |
| realworld | OpenClaw: cold install | Runloop | 0.10 (tied) | 0.12 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | 0.0045 | <0.001 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.14 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.51 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Novita | 0.76 (tied) | 0.99 |
| realworld | OpenClaw: git clone | run.cloud | 0.17 (tied) | 0.22 |
| realworld | OpenClaw: git clone | E2B | 0.29 (tied) | 0.040 |
| realworld | OpenClaw: git clone | Namespace | 0.039 | <0.001 |
| realworld | OpenClaw: git clone | Runloop | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Namespace | — | — |
| realworld | OpenClaw: lint (extension channels) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.55 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.0014 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | run.cloud | 0.0045 | 0.0014 |
| realworld | OpenClaw: lint (extension channels) | E2B | 0.032 | 0.036 |
| realworld | OpenClaw: lint (extension channels) | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | <0.001 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.068 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.69 (tied) | 0.075 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.48 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.84 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | <0.001 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.024 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.12 (tied) | 0.083 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.17 (tied) | 0.075 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.0056 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.76 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.0018 | <0.001 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Cursor Cloud Agent | — | — |
| cpu | Node.js web tooling | Daytona (VM) | — | — |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.70 (too few sandboxes) | 0.098 |
| cpu | Node.js web tooling | Novita | 0.70 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | E2B | 0.40 (too few sandboxes) | 0.0032 |
| cpu | Node.js web tooling | Runloop | 1.0 (too few sandboxes) | 0.16 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0011 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Cursor Cloud Agent | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Cursor Cloud Agent | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Cursor Cloud Agent | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Cursor Cloud Agent | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 1.0 (too few sandboxes) | 1.0 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Cursor Cloud Agent | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.85 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.99 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.25 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 0.20 (too few sandboxes) | 0.066 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.14 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Cursor Cloud Agent | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Cursor Cloud Agent | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Cursor Cloud Agent | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Cursor Cloud Agent | — | — |
| disk | Hardlink throughput | Namespace | — | — |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.017 |
| memory | STREAM Triad | Modal (gVisor) | 0.70 (too few sandboxes) | 0.14 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | E2B | 0.20 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Vercel Sandbox | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Namespace | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.051 |
| memory | STREAM Add | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.051 |
| memory | STREAM Add | Novita | 0.70 (too few sandboxes) | 0.0047 |
| memory | STREAM Add | E2B | 0.20 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Vercel Sandbox | 1.0 (too few sandboxes) | 0.14 |
| memory | STREAM Add | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Namespace | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Novita | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Namespace | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Vercel Sandbox | 1.0 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Novita | 1.0 (too few sandboxes) | 0.59 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.14 |
| memory | STREAM Scale | Runloop | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Namespace | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Cursor Cloud Agent | — | — |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | — | — |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Cursor Cloud Agent | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | — | — |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Cursor Cloud Agent | — (equal values) | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | — (equal values) | — |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Novita | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Cursor Cloud Agent | — | — |
| network | iperf3 WAN download | Daytona (VM) | — | — |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Modal (VM) | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Cursor Cloud Agent | — | — |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Novita | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 WAN upload | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Runloop | 1.0 (too few sandboxes) | 0.32 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.80 (too few sandboxes) | 0.81 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Cursor Cloud Agent | — | — |
| system | PyBench | Modal (VM) | — | — |
| system | PyBench | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Cursor Cloud Agent | — | — |
| system | Git common operations | Microsandbox Cloud | — | — |
| system | Git common operations | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Runloop | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RW (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Cursor Cloud Agent | — | — |
| system | SQLite Speedtest | Microsandbox Cloud | — | — |
| system | SQLite Speedtest | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

