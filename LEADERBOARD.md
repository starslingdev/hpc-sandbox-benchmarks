# Sandbox provider leaderboard

Run [`35254700103`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/35254700103) · commit [`5c162190e6c71addcd2d2dc5b1d852bc86da6591`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/5c162190e6c71addcd2d2dc5b1d852bc86da6591) ·
dataset [`data/dataset/runs/35254700103.json`](data/dataset/runs/35254700103.json) · generated 2026-09-17T19:20:47.646Z

**Partial results — incomplete experiment.** 558 of 648 planned cells complete; 90 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:f0bb5816fa9813c273968057da0e1bf3bd4a209045508eaa90c4445346a9bfd0`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **538 metric records**
backed by **4321 retained trial observations**, across **48 metrics** and
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

**Every synthetic metric is charted too.** Each dimension shows its headline metrics as ranked bar
charts above the triangle, and every other metric's chart sits beside its table inside. Bars are
the same medians the tables print, best first, with the 95% interval as a whisker; each chart
scales to its own largest value, so lengths compare within a chart and never across two.

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

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **64 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 9 environments, 3 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.11 | 38.51 – 40.09 | 12 | 12 | — |
| 1 | Blaxel | 39.49 | 38.98 – 40.13 | 12 | 12 | tied |
| 3 | Novita | 43.78 | 42.74 – 47.11 | 12 | 12 | — |
| 3 | Namespace | 44.15 | 40.1 – 47.07 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 48.69 | 41.87 – 50.4 | 11 | 11 | tied |
| 6 | Modal (VM) | 52.59 | 51.57 – 54.68 | 11 | 11 | — |
| 7 | Vercel Sandbox | 58.64 | 58.16 – 80.03 | 12 | 12 | — |
| 7 | E2B | 69.78 | 64.14 – 75.78 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 82.03 | 81.1 – 82.5 | 12 | 12 | — |
| 9 | tama | 84.67 | 76.09 – 89.89 | 12 | 12 | tied |
| 11 | Runloop | 154 | 132.5 – 155.8 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 53.89 | 51.46 – 54.88 | 12 | 12 | — |
| 2 | Blaxel | 58.3 | 56.59 – 60.71 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 62.97 | 61.22 – 73.41 | 12 | 12 | — |
| 3 | Novita | 67.4 | 65.27 – 69.26 | 12 | 12 | tied |
| 5 | Namespace | 71.15 | 70.1 – 71.94 | 12 | 12 | — |
| 6 | Modal (VM) | 73.1 | 71.07 – 78.02 | 11 | 11 | — |
| 6 | tama | 78.17 | 62.41 – 94.73 | 4 | 4 | tied |
| 6 | Vercel Sandbox | 93.5 | 91.84 – 94.85 | 12 | 12 | tied |
| 6 | E2B | 98.16 | 97.56 – 99.87 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 115 | 97.24 – 117.9 | 11 | 11 | tied |
| 11 | Runloop | 217.3 | 215.3 – 218.4 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 11.54 | 11.39 – 11.88 | 12 | 12 | — |
| 2 | Blaxel | 12.24 | 11.91 – 12.68 | 12 | 12 | — |
| 3 | Namespace | 12.61 | 12.33 – 13.56 | 12 | 12 | — |
| 3 | Novita | 13.65 | 13.32 – 14.2 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 14.77 | 14.31 – 15.21 | 12 | 12 | — |
| 6 | Modal (VM) | 19.2 | 18.68 – 23.66 | 11 | 11 | — |
| 6 | Vercel Sandbox | 20.36 | 19.77 – 21.08 | 12 | 12 | tied |
| 6 | E2B | 20.9 | 19.97 – 23.11 | 12 | 12 | tied |
| 6 | tama | 25.33 | 17.14 – 26.53 | 4 | 4 | tied |
| 6 | Modal (gVisor) | 26.8 | 23.01 – 28.37 | 11 | 11 | tied |
| 11 | Runloop | 39.08 | 38.22 – 40.24 | 12 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Vercel Sandbox is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.751 | 0.717 – 0.789 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.933 | 0.868 – 1.112 | 12 | 12 | — |
| 2 | Namespace | 1.016 | 0.865 – 1.417 | 12 | 12 | tied |
| 2 | Modal (VM) | 1.098 | 0.853 – 2.139 | 11 | 11 | tied |
| 2 | Microsandbox Cloud | 1.139 | 1.075 – 1.221 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 1.218 | 1.153 – 1.363 | 11 | 11 | — |
| 6 | Daytona (VM) | 1.482 | 1.132 – 1.655 | 12 | 12 | tied |
| 6 | tama | 1.807 | 1.086 – 3.535 | 4 | 4 | tied |
| 6 | E2B | 1.874 | 1.527 – 2.962 | 12 | 12 | tied |
| 6 | Novita | 2.042 | 1.916 – 2.33 | 12 | 12 | tied |
| 11 | Runloop | 3.544 | 2.73 – 5.02 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.845 | 2.792 – 2.93 | 12 | 12 | — |
| 2 | Blaxel | 3.218 | 3.138 – 3.335 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 3.239 | 3.053 – 3.59 | 12 | 12 | tied |
| 2 | Novita | 3.248 | 3.171 – 3.293 | 12 | 12 | tied |
| 5 | Namespace | 3.314 | 3.257 – 3.464 | 12 | 12 | — |
| 6 | Modal (VM) | 3.915 | 3.802 – 4.019 | 11 | 11 | — |
| 7 | Vercel Sandbox | 4.319 | 4.28 – 4.519 | 12 | 12 | — |
| 7 | tama | 4.639 | 4.337 – 6.267 | 4 | 4 | tied |
| 7 | E2B | 4.97 | 4.855 – 5.12 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 8.319 | 7.605 – 8.882 | 11 | 11 | — |
| 11 | Runloop | 10.03 | 9.899 – 10.18 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 9.485 | 9.287 – 10.2 | 12 | 12 | — |
| 2 | Blaxel | 10.27 | 9.871 – 10.59 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 10.47 | 9.768 – 12.69 | 12 | 12 | tied |
| 2 | Namespace | 10.88 | 10.79 – 11.61 | 12 | 12 | tied |
| 2 | Novita | 11.21 | 10.99 – 11.5 | 12 | 12 | tied |
| 6 | Modal (VM) | 13.19 | 12.99 – 13.95 | 11 | 11 | — |
| 7 | Vercel Sandbox | 15.22 | 14.95 – 16.12 | 12 | 12 | — |
| 7 | tama | 17.38 | 16.18 – 18.69 | 4 | 4 | tied |
| 7 | Modal (gVisor) | 17.65 | 17.29 – 21.14 | 11 | 11 | tied |
| 7 | E2B | 18.54 | 18.02 – 19.2 | 12 | 12 | tied |
| 11 | Runloop | 31.06 | 29.9 – 31.79 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads · Microsandbox Cloud is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.572 | 2.492 – 2.857 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 2.829 | 2.735 – 3.416 | 12 | 12 | — |
| 2 | Namespace | 2.848 | 2.784 – 2.958 | 12 | 12 | tied |
| 2 | Blaxel | 2.966 | 2.86 – 3.068 | 12 | 12 | tied |
| 2 | Novita | 3.032 | 2.933 – 3.212 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.679 | 3.49 – 3.962 | 11 | 11 | — |
| 7 | Vercel Sandbox | 4.528 | 4.312 – 4.63 | 12 | 12 | — |
| 7 | Modal (gVisor) | 4.775 | 4.345 – 5.491 | 11 | 11 | tied |
| 7 | tama | 4.947 | 4.208 – 5.748 | 4 | 4 | tied |
| 7 | E2B | 4.99 | 4.768 – 5.397 | 12 | 12 | tied |
| 11 | Runloop | 8.595 | 8.262 – 8.826 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.406 | 2.361 – 2.482 | 12 | 12 | — |
| 2 | Blaxel | 2.486 | 2.457 – 2.56 | 12 | 12 | — |
| 3 | Novita | 2.659 | 2.64 – 2.697 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.769 | 2.583 – 3.266 | 12 | 12 | tied |
| 3 | Namespace | 2.915 | 2.786 – 3.171 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.242 | 3.202 – 3.328 | 11 | 11 | — |
| 6 | tama | 3.532 | 3.019 – 3.796 | 4 | 4 | tied |
| 6 | Vercel Sandbox | 3.749 | 3.708 – 3.835 | 12 | 12 | tied |
| 9 | E2B | 4.29 | 4.139 – 4.375 | 12 | 12 | — |
| 10 | Modal (gVisor) | 6.619 | 6.258 – 6.978 | 11 | 11 | — |
| 11 | Runloop | 10.75 | 10.47 – 10.92 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM), Blaxel, Microsandbox Cloud, Novita and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6.406 | 6.197 – 7.395 | 12 | 12 | — |
| 1 | Blaxel | 7.059 | 6.84 – 7.373 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 7.265 | 6.637 – 8.502 | 12 | 12 | tied |
| 1 | Novita | 7.686 | 7.592 – 8.22 | 12 | 12 | tied |
| 1 | Namespace | 7.855 | 7.582 – 8.165 | 12 | 12 | tied |
| 6 | Modal (VM) | 9.103 | 8.945 – 9.542 | 11 | 11 | — |
| 7 | tama | 11.53 | 10.29 – 13.01 | 4 | 4 | — |
| 7 | Vercel Sandbox | 11.55 | 11.15 – 12.04 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 11.72 | 11.4 – 14 | 11 | 11 | tied |
| 7 | E2B | 13 | 12.57 – 13.79 | 12 | 12 | tied |
| 11 | Runloop | 22.64 | 21.86 – 23.13 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.35 | 22.97 – 25.06 | 12 | 12 | — |
| 2 | Blaxel | 26.61 | 24.54 – 27.42 | 12 | 12 | — |
| 3 | Novita | 30.4 | 29.93 – 31.19 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 31.03 | 30.56 – 39.15 | 12 | 12 | tied |
| 3 | tama | 32.87 | 22.4 – 42.06 | 4 | 4 | tied |
| 3 | Namespace | 36.07 | 35.32 – 37.54 | 12 | 12 | tied |
| 3 | Modal (VM) | 36.84 | 34.26 – 38.1 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 45.89 | 44.21 – 47.9 | 12 | 12 | — |
| 8 | E2B | 49.88 | 47.2 – 53.45 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 101.1 | 85.66 – 103.5 | 11 | 11 | — |
| 11 | Runloop | 141.2 | 139.5 – 143.5 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 37.68 | 35.66 – 39.33 | 12 | 12 | — |
| 2 | Blaxel | 40.34 | 39.29 – 42.06 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 41.66 | 40.62 – 55.22 | 12 | 12 | tied |
| 2 | Novita | 43.67 | 41.39 – 45.13 | 12 | 12 | tied |
| 5 | Namespace | 45.96 | 44.57 – 48.08 | 12 | 12 | — |
| 6 | Modal (VM) | 51.86 | 50.18 – 56.22 | 11 | 11 | — |
| 6 | tama | 57.18 | 45.82 – 67.28 | 4 | 4 | tied |
| 6 | Modal (gVisor) | 66.5 | 58.29 – 79.52 | 11 | 11 | tied |
| 6 | Vercel Sandbox | 69.83 | 69.33 – 72.27 | 12 | 12 | tied |
| 6 | E2B | 71.85 | 69.46 – 73.36 | 12 | 12 | tied |
| 11 | Runloop | 162.1 | 159.2 – 164.7 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 66.2 | 65.88 – 67.31 | 12 | 12 | — |
| 2 | Blaxel | 72.64 | 71.57 – 73.31 | 12 | 12 | — |
| 3 | Namespace | 75.01 | 73.58 – 78.25 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 75.79 | 69.36 – 92.58 | 11 | 11 | tied |
| 3 | Novita | 76.44 | 74.17 – 77.19 | 12 | 12 | tied |
| 6 | Modal (VM) | 93.17 | 91.86 – 94.47 | 11 | 11 | — |
| 6 | tama | 94.9 | 91.33 – 99.99 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 121.6 | 115.1 – 167 | 12 | 12 | — |
| 8 | E2B | 129.6 | 115.4 – 139 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 148.5 | 146.5 – 151 | 12 | 12 | — |
| 11 | Runloop | 238.2 | 218.5 – 239.9 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.774 | 1.71 – 2.285 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.192 | 1.966 – 2.62 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 2.354 | 2.16 – 2.478 | 11 | 11 | tied |
| 2 | Modal (VM) | 2.382 | 2.183 – 4.899 | 11 | 11 | tied |
| 2 | Vercel Sandbox | 2.752 | 2.495 – 3.172 | 12 | 12 | tied |
| 2 | tama | 2.957 | 2.713 – 3.408 | 12 | 12 | tied |
| 2 | Namespace | 3.369 | 2.551 – 4.332 | 12 | 12 | tied |
| 2 | Novita | 3.546 | 3.433 – 3.76 | 12 | 12 | tied |
| 2 | E2B | 3.601 | 3.434 – 4.216 | 12 | 12 | tied |
| 2 | Modal (gVisor) | 3.641 | 3.561 – 3.788 | 12 | 12 | tied |
| 11 | Runloop | 5.652 | 5.13 – 6.46 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 84.34 | 82.84 – 85.53 | 12 | 12 | — |
| 2 | Blaxel | 91.64 | 87.75 – 92.86 | 12 | 12 | — |
| 3 | Novita | 97.69 | 95.89 – 100.9 | 12 | 12 | — |
| 3 | Namespace | 103.6 | 97.54 – 106.6 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 110.1 | 84.98 – 144.2 | 11 | 11 | tied |
| 3 | tama | 111.3 | 104.6 – 126 | 12 | 12 | tied |
| 3 | Modal (VM) | 115.6 | 114.8 – 116.9 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 152.8 | 141.5 – 203.5 | 12 | 12 | — |
| 8 | E2B | 155.8 | 140 – 181 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 178.7 | 176 – 179.9 | 12 | 12 | tied |
| 11 | Runloop | 344.8 | 295.5 – 350.7 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 891.8 | 888.8 – 898.7 | 12 | 12 | — |
| 1 | Namespace | 910.8 | 896.4 – 919.7 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 936.4 | 911.2 – 1043 | 11 | 11 | — |
| 3 | Blaxel | 939.5 | 929.9 – 940.8 | 12 | 12 | tied |
| 5 | Novita | 1008 | 996.5 – 1018 | 11 | 11 | — |
| 6 | tama | 1107 | 1083 – 1140 | 12 | 12 | — |
| 6 | Modal (VM) | 1109 | 1104 – 1123 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 1318 | 1287 – 1653 | 12 | 12 | — |
| 8 | E2B | 1428 | 1382 – 1521 | 11 | 11 | tied |
| 10 | Modal (gVisor) | 1595 | 1589 – 1631 | 11 | 11 | — |
| 11 | Runloop | 2168 | 2013 – 2177 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 12.62 | 12.41 – 12.79 | 12 | 12 | — |
| 2 | Daytona (VM) | 13.12 | 12.8 – 13.8 | 12 | 12 | — |
| 3 | Novita | 15.09 | 14.72 – 15.38 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 17.44 | 15.57 – 18.66 | 12 | 12 | — |
| 4 | Namespace | 17.55 | 12.68 – 18.78 | 12 | 12 | tied |
| 6 | Modal (VM) | 18.91 | 18.36 – 20.43 | 12 | 12 | — |
| 6 | Vercel Sandbox | 19.19 | 18.82 – 19.83 | 12 | 12 | tied |
| 6 | E2B | 20.01 | 19.06 – 22.28 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 24.28 | 22.37 – 24.9 | 10 | 10 | — |
| 10 | Runloop | 31.57 | 28.6 – 33.48 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Microsandbox Cloud is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.578 | 2.494 – 2.74 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 3.244 | 3.135 – 3.702 | 12 | 12 | — |
| 2 | Modal (VM) | 3.345 | 3.224 – 4.013 | 12 | 12 | tied |
| 2 | Daytona (VM) | 3.396 | 3.091 – 5.094 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 3.913 | 3.664 – 5.415 | 12 | 12 | tied |
| 2 | Novita | 4.421 | 4.13 – 4.571 | 12 | 12 | tied |
| 2 | Namespace | 4.894 | 3.825 – 6.348 | 12 | 12 | tied |
| 2 | E2B | 5.171 | 4.694 – 9.625 | 12 | 12 | tied |
| 2 | Modal (gVisor) | 5.686 | 5.296 – 5.759 | 10 | 10 | tied |
| 10 | Runloop | 8.16 | 7.284 – 9.197 | 12 | 12 | — |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 140.2 | 138.7 – 145.7 | 12 | 12 | — |
| 2 | Daytona (VM) | 147.4 | 146.4 – 150.2 | 12 | 12 | — |
| 3 | Blaxel | 157.4 | 155.2 – 160.1 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 160.8 | 150.9 – 167.8 | 12 | 12 | tied |
| 5 | Novita | 176.4 | 174 – 178.6 | 12 | 12 | — |
| 6 | Modal (VM) | 190.4 | 187.6 – 197.9 | 12 | 12 | — |
| 7 | Vercel Sandbox | 227 | 224.5 – 232 | 12 | 12 | — |
| 7 | Modal (gVisor) | 258.9 | 230.1 – 273.7 | 10 | 10 | tied |
| 9 | E2B | 294.5 | 272.4 – 310.4 | 12 | 12 | — |
| 10 | Runloop | 428.8 | 391.5 – 434.3 | 12 | 12 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 267 | 260.4 – 273.9 | 12 | 12 | — |
| 2 | Daytona (VM) | 286.4 | 281.9 – 289.2 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 294.3 | 274.6 – 311.8 | 12 | 12 | tied |
| 2 | Blaxel | 299.5 | 296.4 – 307.1 | 12 | 12 | tied |
| 5 | Novita | 348.5 | 343.5 – 351.9 | 12 | 12 | — |
| 6 | Modal (VM) | 365.1 | 357.1 – 373.6 | 12 | 12 | — |
| 7 | Vercel Sandbox | 417.4 | 411.1 – 427.1 | 12 | 12 | — |
| 7 | Modal (gVisor) | 482.6 | 399.3 – 499.5 | 10 | 10 | tied |
| 9 | E2B | 582.4 | 540.6 – 613.1 | 12 | 12 | — |
| 10 | Runloop | 853.3 | 691 – 858 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 91.14 | 89.13 – 96.4 | 12 | 12 | — |
| 2 | Namespace | 96.78 | 94.6 – 99.86 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 107.5 | 104.7 – 112.7 | 12 | 12 | — |
| 4 | Novita | 112.5 | 110.7 – 113.6 | 12 | 12 | — |
| 5 | Modal (VM) | 125.8 | 121.4 – 130.7 | 12 | 12 | — |
| 6 | Vercel Sandbox | 154.7 | 151.1 – 157 | 12 | 12 | — |
| 6 | Modal (gVisor) | 159.7 | 138.1 – 164.8 | 10 | 10 | tied |
| 8 | E2B | 180 | 165 – 187.4 | 12 | 12 | — |
| 9 | Runloop | 326.7 | 255.1 – 331.6 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 15.75 | 15.19 – 16.39 | 12 | 12 | — |
| 1 | Namespace | 15.79 | 15.19 – 16.11 | 12 | 12 | tied |
| 3 | Blaxel | 17.81 | 16.85 – 18.71 | 5 | 5 | — |
| 3 | Microsandbox Cloud | 18.1 | 17.66 – 19.01 | 12 | 12 | tied |
| 5 | Novita | 21.43 | 21.02 – 21.93 | 12 | 12 | — |
| 5 | Modal (VM) | 21.78 | 20.98 – 22.45 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 26.69 | 25.71 – 27.8 | 12 | 12 | — |
| 7 | Modal (gVisor) | 27.56 | 23.78 – 29.09 | 10 | 10 | tied |
| 9 | E2B | 34 | 32.35 – 36.76 | 12 | 12 | — |
| 10 | Runloop | 53.1 | 45.56 – 55.37 | 12 | 12 | — |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 20.88 | 18.5 – 21.38 | 3 | 6 | — |
| 2 | Blaxel | 20.34 | 20.08 – 20.66 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 18.88 | 18.82 – 22.85 | 3 | 6 | too few sandboxes |
| 4 | Novita | 18.39 | 18.21 – 18.8 | 3 | 6 | too few sandboxes |
| 5 | tama | 15.8 | 12.54 – 16.34 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 15.68 | 15.06 – 15.72 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 15.59 | 15.52 – 18.82 | 3 | 6 | too few sandboxes |
| 8 | E2B | 13.79 | 11.65 – 14.3 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 12.54 | 12.46 – 12.73 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 12.24 | 11.96 – 15.84 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 10.77 | 10.73 – 13.25 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8.49 | 7.54 – 8.6 | 3 | 6 | too few sandboxes |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1158 | 1150 – 1163 | 3 | 6 | — |
| 2 | Novita | 984.1 | 949.5 – 995.1 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 920.6 | 912.8 – 925.9 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 785.9 | 732.4 – 807.4 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 737.7 | 667.4 – 753.4 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 691 | 489.7 – 758.6 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 690 | 308.8 – 701 | 3 | 6 | too few sandboxes |
| 8 | tama | 649.6 | 574.6 – 664.3 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 585.1 | 583 – 587.2 | 1 | 2 | too few sandboxes |
| 10 | Runloop | 509.6 | 478.7 – 533.2 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 479.7 | 464.5 – 484.4 | 3 | 6 | too few sandboxes |
| 12 | E2B | 238 | 233.8 – 245.9 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.1× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 150000 | 148000 – 153000 | 3 | 6 | — |
| 2 | Namespace | 69850 | 34800 – 71000 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 49550 | 48250 – 50250 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 47650 | 39500 – 48400 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 37150 | 22750 – 39200 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 33100 | 30150 – 33250 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 27800 | 26050 – 27950 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 23500 | 22500 – 24500 | 1 | 2 | too few sandboxes |
| 9 | Novita | 14900 | 14600 – 15000 | 3 | 6 | too few sandboxes |
| 10 | tama | 8979 | 5125 – 9606 | 3 | 6 | too few sandboxes |
| 11 | E2B | 8813 | 8268 – 10900 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 6471 | 6340 – 7719 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.1× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 615 | 606.1 – 626.5 | 3 | 6 | — |
| 2 | Namespace | 286.3 | 142.1 – 291 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 202.9 | 197.7 – 206 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 195 | 162 – 198.2 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 152.6 | 93.06 – 161 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 135.8 | 123.7 – 136.3 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 113.8 | 106.4 – 114.3 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 96.26 | 92.17 – 100.3 | 1 | 2 | too few sandboxes |
| 9 | Novita | 60.97 | 59.82 – 61.5 | 3 | 6 | too few sandboxes |
| 10 | tama | 36.81 | 21.02 – 39.37 | 3 | 6 | too few sandboxes |
| 11 | E2B | 36.12 | 33.87 – 44.77 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 26.53 | 25.95 – 31.61 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 282500 | 280500 – 284000 | 3 | 6 | — |
| 2 | Novita | 240500 | 231500 – 242500 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 224500 | 223000 – 226000 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 191500 | 178500 – 197000 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 180500 | 163000 – 184000 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 169000 | 120000 – 185000 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 168500 | 75400 – 171000 | 3 | 6 | too few sandboxes |
| 8 | tama | 158500 | 140000 – 162000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 142500 | 142000 – 143000 | 1 | 2 | too few sandboxes |
| 10 | Runloop | 124500 | 116500 – 130500 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 117000 | 113000 – 118500 | 3 | 6 | too few sandboxes |
| 12 | E2B | 58000 | 57100 – 60050 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 16000 | 14450 – 16100 | 3 | 6 | — |
| 2 | Daytona (VM) | 11750 | 10950 – 11800 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 10660 | 10360 – 11750 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 6114 | 4849 – 6877 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 5512 | 5333 – 5691 | 1 | 2 | too few sandboxes |
| 6 | Novita | 4190 | 4129 – 4241 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3264 | 3233 – 4363 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3108 | 2914 – 3121 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1474 | 1471 – 1479 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1234 | 1222 – 1669 | 3 | 6 | too few sandboxes |
| 11 | tama | 805.5 | 699.5 – 1004 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599 | 599 – 600 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 16750 | 15140 – 16910 | 3 | 6 | — |
| 2 | Daytona (VM) | 12290 | 11490 – 12350 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 11170 | 10860 – 12290 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 6413 | 5086 – 7213 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 5782 | 5594 – 5970 | 1 | 2 | too few sandboxes |
| 6 | Novita | 4396 | 4331 – 4449 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3424 | 3391 – 4576 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3261 | 3057 – 3274 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1547 | 1545 – 1552 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1296 | 1282 – 1752 | 3 | 6 | too few sandboxes |
| 11 | tama | 846.2 | 735.1 – 1054 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.2 | 630.2 – 630.7 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5114 | 4963 – 5605 | 3 | 6 | — |
| 2 | Namespace | 4236 | 3362 – 4329 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 3598 | 3268 – 4186 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 3335 | 2629 – 3356 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 3316 | 3239 – 3455 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 3081 | 1944 – 4218 | 1 | 2 | too few sandboxes |
| 7 | Novita | 2091 | 2085 – 2224 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1778 | 1742 – 1805 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1411 | 1342 – 1573 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1361 | 1341 – 1368 | 3 | 6 | too few sandboxes |
| 11 | E2B | 601.5 | 597.5 – 604.5 | 3 | 6 | too few sandboxes |
| 12 | tama | 491 | 485 – 626.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5363 | 5205 – 5878 | 3 | 6 | — |
| 2 | Namespace | 4443 | 3526 – 4540 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 3774 | 3429 – 4390 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 3499 | 2758 – 3521 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 3478 | 3398 – 3623 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 3232 | 2039 – 4424 | 1 | 2 | too few sandboxes |
| 7 | Novita | 2194 | 2187 – 2334 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1866 | 1828 – 1894 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1482 | 1409 – 1650 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1428 | 1408 – 1436 | 3 | 6 | too few sandboxes |
| 11 | E2B | 632.3 | 628.1 – 636 | 3 | 6 | too few sandboxes |
| 12 | tama | 516.4 | 509.6 – 659 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.05 | 24.87 – 25.16 | 3 | 6 | — |
| 2 | Blaxel | 20.04 | 19.86 – 20.23 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 13.84 | 13.59 – 13.9 | 3 | 6 | too few sandboxes |
| 4 | Novita | 11.99 | 11.63 – 12.03 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 10.98 | 8.06 – 11.18 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 8.49 | 8.345 – 8.54 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 7.99 | 7.105 – 8.005 | 3 | 6 | too few sandboxes |
| 8 | tama | 7.675 | 7.635 – 7.84 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 7.07 | 7.05 – 7.09 | 1 | 2 | too few sandboxes |
| 10 | Namespace | 5.14 | 3.31 – 5.205 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 4.035 | 4.035 – 4.06 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.345 | 1.33 – 1.96 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 177900 | 168300 – 181300 | 3 | 6 | — |
| 2 | Blaxel | 114000 | 112600 – 127000 | 3 | 6 | too few sandboxes |
| 3 | tama | 108400 | 76500 – 191300 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 99120 | 55890 – 99270 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 72830 | 65080 – 84450 | 3 | 6 | too few sandboxes |
| 6 | E2B | 56580 | 44870 – 57330 | 3 | 6 | too few sandboxes |
| 7 | Novita | 52700 | 52630 – 53300 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 47680 | 47070 – 50470 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 47300 | 46700 – 53070 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 42760 | 39920 – 43290 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 37240 | 36110 – 42960 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 31870 | 31480 – 32240 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.5× Blaxel on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 177400 | 167800 – 180800 | 3 | 6 | — |
| 2 | Blaxel | 119400 | 116800 – 127600 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 98820 | 55590 – 99010 | 3 | 6 | too few sandboxes |
| 4 | tama | 80720 | 79310 – 179772 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 72920 | 64928 – 84246 | 3 | 6 | too few sandboxes |
| 6 | E2B | 56500 | 44890 – 56560 | 3 | 6 | too few sandboxes |
| 7 | Novita | 52720 | 52650 – 53180 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 47519 | 46360 – 50330 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 46430 | 45960 – 52877 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 42520 | 39870 – 43680 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 36760 | 36170 – 42080 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 31790 | 31320 – 32260 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.5× Microsandbox Cloud on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 200400 | 194900 – 206600 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 136400 | 85760 – 136500 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 135900 | 133500 – 142700 | 3 | 6 | too few sandboxes |
| 4 | tama | 100900 | 89840 – 147900 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 89060 | 84250 – 99060 | 3 | 6 | too few sandboxes |
| 6 | E2B | 80390 | 72470 – 80972 | 3 | 6 | too few sandboxes |
| 7 | Novita | 58070 | 57950 – 58200 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 54090 | 50390 – 58550 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 47390 | 44610 – 49270 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 44850 | 39540 – 80480 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 42080 | 41940 – 43993 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 38290 | 36920 – 40570 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.5× tama on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 169300 | 160700 – 171000 | 3 | 6 | — |
| 2 | tama | 113900 | 67350 – 147800 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 112700 | 104300 – 120800 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 90110 | 51540 – 90260 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 69000 | 60520 – 84778 | 3 | 6 | too few sandboxes |
| 6 | Novita | 50332 | 50260 – 50664 | 3 | 6 | too few sandboxes |
| 7 | E2B | 49680 | 42980 – 49900 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 44280 | 43870 – 46670 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 42650 | 42540 – 45620 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 38600 | 35760 – 39830 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 34000 | 33048 – 38300 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 28770 | 28680 – 29340 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 12 environments ranked best-first, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 8655 | 7158 – 13260 | 3 | 6 | — |
| 2 | Daytona (VM) | 6591 | 6506 – 6677 | 1 | 2 | too few sandboxes |
| 3 | tama | 5191 | 5171 – 5210 | 1 | 2 | n too small |
| 4 | Novita | 4933 | 939.7 – 5113 | 3 | 6 | too few sandboxes |
| 5 | E2B | 2805 | 1068 – 3110 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 1941 | 1746 – 1969 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 1680 | 1497 – 2916 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 1428 | 1401 – 1558 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1278 | 680 – 1430 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1262 | 1082 – 1281 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 730.7 | 666.9 – 1029 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 314.8 | 264.6 – 364.9 | 1 | 2 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5257 | 4219 – 10220 | 3 | 6 | — |
| 2 | Blaxel | 5020 | 4951 – 5276 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4577 | 4560 – 4660 | 3 | 6 | too few sandboxes |
| 4 | Novita | 3522 | 1110 – 3614 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 2094 | 1658 – 2980 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 2092 | 1786 – 5642 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 2080 | 2014 – 2093 | 3 | 6 | too few sandboxes |
| 8 | tama | 2053 | 1831 – 2275 | 1 | 2 | too few sandboxes |
| 9 | E2B | 1856 | 902.7 – 6068 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 829.3 | 826.1 – 832.6 | 1 | 2 | too few sandboxes |
| 11 | Modal (gVisor) | 55.42 | 35.17 – 2516 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 36.65 | 33.61 – 4092 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.5× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 152300 | 146695 – 156576 | 3 | 6 | — |
| 2 | Blaxel | 98680 | 97908 – 141600 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 90230 | 58598 – 91870 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 79076 | 77170 – 88100 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 64160 | 40677 – 66332 | 3 | 6 | too few sandboxes |
| 6 | E2B | 54630 | 47730 – 60498 | 3 | 6 | too few sandboxes |
| 7 | tama | 49590 | 48833 – 50342 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 40815 | 39760 – 41009 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 36836 | 35650 – 40123 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 30097 | 27466 – 32728 | 1 | 2 | too few sandboxes |
| 11 | Modal (VM) | 26300 | 21420 – 31750 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 25490 | 15840 – 31143 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.5× Microsandbox Cloud on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 151400 | 149000 – 154400 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 100816 | 84920 – 101096 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 95815 | 93786 – 118800 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 79500 | 73929 – 83970 | 3 | 6 | too few sandboxes |
| 5 | E2B | 56327 | 54180 – 63541 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 51487 | 37047 – 58900 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 47560 | 46941 – 48172 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 37200 | 36867 – 38755 | 3 | 6 | too few sandboxes |
| 9 | tama | 32565 | 32333 – 32797 | 1 | 2 | too few sandboxes |
| 10 | Namespace | 25659 | 25460 – 25927 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 20733 | 16500 – 27863 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 19430 | 18710 – 30731 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop, tama and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 1 | 2 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | tama | 9999 | 9999 – 9999 | 1 | 2 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 438.5 | 426.5 – 475 | 3 | 6 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 11 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 33.92 | 32.3 – 37.95 | 3 | 6 | — |
| 2 | Daytona (VM) | 35.83 | 35.76 – 35.85 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 40.15 | 40.15 – 42.07 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 42.06 | 41.65 – 42.46 | 2 | 4 | too few sandboxes |
| 5 | Novita | 45.6 | 44.83 – 45.7 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 47.77 | 47.43 – 48.28 | 3 | 6 | too few sandboxes |
| 7 | tama | 49.27 | 48.38 – 62.13 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 61.96 | 60.6 – 84.56 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 62.37 | 60.98 – 73.68 | 3 | 6 | too few sandboxes |
| 10 | E2B | 66.12 | 65.27 – 68.24 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 91.76 | 90.13 – 92.33 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_tama leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 395100 | 392000 – 617700 | 3 | 6 | — |
| 2 | Blaxel | 334900 | 331000 – 357300 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 296500 | 283800 – 305700 | 3 | 6 | too few sandboxes |
| 4 | Novita | 277600 | 276200 – 285800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 248800 | 231500 – 252700 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 242600 | 224200 – 242900 | 3 | 6 | too few sandboxes |
| 7 | E2B | 217900 | 166400 – 260900 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 198300 | 190900 – 200400 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 181200 | 168100 – 194200 | 2 | 4 | too few sandboxes |
| 10 | Vercel Sandbox | 152400 | 123000 – 166200 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 97100 | 95380 – 98900 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 87420 | 86540 – 110800 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_tama leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.127 | 0.081 – 0.1275 | 3 | 6 | — |
| 2 | Blaxel | 0.1495 | 0.14 – 0.151 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 0.169 | 0.1635 – 0.1765 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.18 | 0.175 – 0.181 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 0.201 | 0.1975 – 0.2165 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 0.206 | 0.206 – 0.2265 | 3 | 6 | too few sandboxes |
| 7 | E2B | 0.2295 | 0.192 – 0.3005 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 0.252 | 0.2495 – 0.262 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.284 | 0.266 – 0.302 | 2 | 4 | too few sandboxes |
| 10 | Vercel Sandbox | 0.3285 | 0.301 – 0.4065 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 0.515 | 0.506 – 0.524 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 0.572 | 0.4515 – 0.578 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Novita on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 25840 | 25470 – 27950 | 3 | 6 | — |
| 2 | Novita | 24520 | 23770 – 25880 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 23990 | 23570 – 24500 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 17440 | 16150 – 18730 | 2 | 4 | too few sandboxes |
| 5 | Microsandbox Cloud | 16470 | 14830 – 18080 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 15660 | 15380 – 16320 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 14520 | 12530 – 17820 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 13910 | 13510 – 14850 | 3 | 6 | too few sandboxes |
| 9 | E2B | 12900 | 10350 – 16220 | 3 | 6 | too few sandboxes |
| 10 | tama | 11410 | 10200 – 14830 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 9480 | 9031 – 12100 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8352 | 7797 – 8522 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Novita is ~1.1× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.935 | 1.79 – 1.964 | 3 | 6 | — |
| 2 | Novita | 2.045 | 1.932 – 2.124 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.085 | 2.041 – 2.122 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 2.901 | 2.67 – 3.132 | 2 | 4 | too few sandboxes |
| 5 | Microsandbox Cloud | 3.035 | 2.767 – 3.37 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3.194 | 3.064 – 3.252 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3.445 | 2.806 – 3.991 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 3.596 | 3.369 – 3.702 | 3 | 6 | too few sandboxes |
| 9 | E2B | 3.877 | 3.083 – 4.832 | 3 | 6 | too few sandboxes |
| 10 | tama | 4.383 | 3.414 – 4.91 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 5.274 | 4.131 – 5.539 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 6.108 | 5.928 – 6.591 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 11 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 370 | 362 – 370.5 | 3 | 6 | — |
| 2 | Daytona (VM) | 403 | 401 – 407 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 452.5 | 451 – 456 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 480.5 | 472 – 489 | 2 | 4 | too few sandboxes |
| 5 | Novita | 482.5 | 482 – 482.5 | 3 | 6 | too few sandboxes |
| 6 | tama | 506.5 | 504 – 541.5 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 666 | 665.5 – 671 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 768 | 764 – 1191 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 772 | 772 – 1047 | 3 | 6 | too few sandboxes |
| 10 | E2B | 805 | 651.5 – 807.5 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1191 | 1191 – 1202 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 11 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.97 | 30.97 – 31.44 | 3 | 6 | — |
| 2 | Blaxel | 37.73 | 36.65 – 38.81 | 2 | 4 | too few sandboxes |
| 3 | Novita | 43.53 | 43.27 – 43.9 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 46.94 | 46.49 – 47.51 | 3 | 6 | too few sandboxes |
| 5 | tama | 53.32 | 51.63 – 71.63 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 60.63 | 54.57 – 65.67 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 63.93 | 63.86 – 64.86 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 71.27 | 65.47 – 89.61 | 3 | 6 | too few sandboxes |
| 9 | E2B | 73.75 | 66.02 – 74.02 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 100.4 | 97.03 – 105.1 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 182.4 | 179.2 – 238.6 | 3 | 6 | too few sandboxes |

</details>

## economics

<img src="docs/figures/usd_per_hour.webp" width="960" alt="Hourly cost: 5 environments ranked best-first, with 95% intervals">

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

96 uncovered results across 9 providers (Blaxel 6, Daytona (VM) 1, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 6, Modal (VM) 4, Novita 2, run.cloud 48, tama 25). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | system | **skipped** | pts_pybench: PTS install of pts/pybench-1.1.3 failed (exit 0, not in list-installed-tests) |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 2 of 6 declared metrics: realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_typecheck (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_test_types |
| Blaxel | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| Daytona (VM) | network | **failed** | Partial publication withheld unverified measurements: iperf_wan_direction_download |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Microsandbox Cloud | realworld-mastra | **failed** | computesdk background launch failed: runtime error: timed out connecting to cloud sandbox agent "bench-cloud-d2d4724a-aea8-42af-aca4-349ff2df2e14" after 10s |
| Microsandbox Cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-better-auth | **failed** | Failed to create sandbox: modal-gvisor ComputeSDK created-request preparation and verification callback failed |
| Modal (gVisor) | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-openclaw | **failed** | Failed to create sandbox: modal-gvisor ComputeSDK created-request preparation and verification callback failed |
| Modal (gVisor) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Modal (VM) | realworld-better-auth | **failed** | Failed to create sandbox: modal-vm ComputeSDK created-request preparation and verification callback failed; cleanup failed: modal-vm ComputeSDK lifecycle destroy callback failed |
| Modal (VM) | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Modal (VM) | realworld-mastra | **failed** | Failed to create sandbox: modal-vm ComputeSDK created-request preparation and verification callback failed |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| run.cloud | disk | **failed** | Cleanup unresolved: sandbox sbx_00e344737133e7a12b19 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| run.cloud | disk | **failed** | Partial publication withheld unverified measurements: hardlink_bogo_ops_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops |
| run.cloud | disk | **failed** | Step "collect benchmark-results" timed out after 300s; Cleanup unresolved: sandbox sbx_db46f4df9741ab6ac65e still has an accepted operation after 1000ms; safe teardown remains scheduled |
| run.cloud | network | **failed** | Cleanup unresolved: sandbox sbx_4134d5e9d4f357c4f758 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| run.cloud | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| run.cloud | network | **failed** | computesdk background launch failed: run.cloud API 0: exec stream failed: WebSocket connection to 'wss://api.run.cloud/run-cloud/sandboxes/sbx_4123c6f50b4aeb7c8e01/exec/stream?mode=command' failed: Expected 101 status code |
| run.cloud | pgbench | **failed** | Cleanup unresolved: sandbox sbx_1b01d44f5c10a975bf19 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| run.cloud | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r0: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r1: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r10: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r11: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r2: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r3: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r4: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r5: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r6: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r7: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r8: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-better-auth | **failed** | runcloud-realworld-better-auth-r9: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r0: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r1: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r10: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r11: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r2: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r3: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r4: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r5: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r6: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r7: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r8: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-mastra | **failed** | runcloud-realworld-mastra-r9: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r0: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r1: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r10: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r11: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r2: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r3: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r4: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r5: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r6: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r7: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r8: runcloud ComputeSDK inventory list callback failed |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r9: runcloud ComputeSDK inventory list callback failed |
| run.cloud | system | **failed** | computesdk background launch failed: run.cloud API 4408: Command initialization timed out |
| run.cloud | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| run.cloud | system | **failed** | Cleanup unresolved: sandbox sbx_62bc4a22582fe961279e still has an accepted operation after 1000ms; safe teardown remains scheduled |
| run.cloud | system | **failed** | computesdk background launch failed: run.cloud API 0: exec stream failed: WebSocket connection to 'wss://api.run.cloud/run-cloud/sandboxes/sbx_bf748f67aadb0fed848f/exec/stream?mode=command' failed: Expected 101 status code; Cleanup unresolved: sandbox sbx_bf748f67aadb0fed848f still has an accepted operation after 1000ms; safe teardown remains scheduled |
| tama | network | **failed** | Failed to create sandbox: tama new bench-cbd67b39-0123-4f68-89b0-9bea63a78f4e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-cbd67b39-0123-4f68-89b0-9bea63a78f4e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | network | **failed** | Failed to create sandbox: tama new bench-d785a5d2-dfb9-46b4-8bfe-e95440850a47 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d785a5d2-dfb9-46b4-8bfe-e95440850a47 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5877ca15-405b-4b1d-9981-267fe079ed3e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5877ca15-405b-4b1d-9981-267fe079ed3e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5ded427a-fda6-4dad-83bc-f1a735cac879 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5ded427a-fda6-4dad-83bc-f1a735cac879 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-b94dbbe6-422f-4970-8795-560af7c1dabf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b94dbbe6-422f-4970-8795-560af7c1dabf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-e5f3d61c-96c5-4ca4-b3e3-c92e02508fc7 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e5f3d61c-96c5-4ca4-b3e3-c92e02508fc7 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-1898a080-59c5-4205-be47-39a93082e513 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1898a080-59c5-4205-be47-39a93082e513 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-2d11c845-4d94-4b81-a7de-bdb771350fe4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2d11c845-4d94-4b81-a7de-bdb771350fe4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f308422b-6bbf-475b-9c28-580236f09ab5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f308422b-6bbf-475b-9c28-580236f09ab5 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-e9c64ec7-3e13-4b3e-8e43-be97422f203f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e9c64ec7-3e13-4b3e-8e43-be97422f203f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6297c52e-ee86-4906-b689-d5edd8d876d7 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6297c52e-ee86-4906-b689-d5edd8d876d7 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ad4e7cf4-f3e1-4cc0-b50d-32bd3112ab67 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ad4e7cf4-f3e1-4cc0-b50d-32bd3112ab67 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-8a6a85f3-0edd-4f4b-872b-fc233f185e1c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-8a6a85f3-0edd-4f4b-872b-fc233f185e1c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-1a826370-88e8-497f-96b2-38c96265d7fb --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1a826370-88e8-497f-96b2-38c96265d7fb failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ddc9a77a-5dbe-4028-a2b2-bf0054291f61 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ddc9a77a-5dbe-4028-a2b2-bf0054291f61 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4b27bd2a-5110-402f-bdce-becd68e49cdf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4b27bd2a-5110-402f-bdce-becd68e49cdf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-9e0bf052-97b7-4083-9516-f824c324a46c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9e0bf052-97b7-4083-9516-f824c324a46c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-554d346f-58d0-4e45-a271-6eb65bb73dc0 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-554d346f-58d0-4e45-a271-6eb65bb73dc0 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6812e3db-5092-4933-a3e7-4c5d5e8fc8cf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6812e3db-5092-4933-a3e7-4c5d5e8fc8cf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-83bb5a72-c32c-4d6b-a63f-3fb1a7c30851 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-83bb5a72-c32c-4d6b-a63f-3fb1a7c30851 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-1614e4cb-ee1e-47cb-9b08-d52fdf65a70f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1614e4cb-ee1e-47cb-9b08-d52fdf65a70f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-5baf6721-ae4d-4723-8e8d-cbd0f7753223 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5baf6721-ae4d-4723-8e8d-cbd0f7753223 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 1 v 3 sandboxes floors at p ≈ 1.0; 2 v 2 trials floors at p ≈ 0.33; 2 v 3 sandboxes floors at p ≈ 0.10; 2 v 3 sandboxes floors at p ≈ 0.20; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 1 sandboxes floors at p ≈ 1.0; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Blaxel | 0.44 (tied) | 0.79 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Namespace | 0.71 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.24 (tied) | 0.30 |
| realworld | Mastra: cold install | Modal (VM) | 0.0041 | <0.001 |
| realworld | Mastra: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: cold install | E2B | 0.35 (tied) | 0.019 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: cold install | tama | 0.18 (tied) | 0.019 |
| realworld | Mastra: cold install | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: build | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: build | Namespace | <0.001 | 0.0046 |
| realworld | Better-Auth: build | Modal (VM) | 0.019 | 0.032 |
| realworld | Better-Auth: build | tama | 1.0 (tied) | 0.33 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.26 (tied) | 0.32 |
| realworld | Better-Auth: build | E2B | 0.10 (tied) | 0.0046 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.10 (tied) | 0.11 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | 0.012 | 0.019 |
| realworld | Better-Auth: cold install | Namespace | 0.024 | 0.19 |
| realworld | Better-Auth: cold install | Novita | 0.052 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | 0.0046 |
| realworld | Better-Auth: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.091 (tied) | 0.0098 |
| realworld | Better-Auth: cold install | E2B | 0.68 (tied) | 0.43 |
| realworld | Better-Auth: cold install | tama | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.28 (tied) | 0.23 |
| realworld | Better-Auth: cold install | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Namespace | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.83 (tied) | 0.65 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.93 (tied) | 0.13 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.037 | 0.10 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.38 (tied) | 0.091 |
| realworld | Better-Auth: git clone | tama | 0.60 (tied) | 0.55 |
| realworld | Better-Auth: git clone | E2B | 0.77 (tied) | 0.98 |
| realworld | Better-Auth: git clone | Novita | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.039 | 0.19 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | tama | 0.10 (tied) | 0.077 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.26 (tied) | 0.16 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.013 | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.48 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.62 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.099 (tied) | 0.032 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.34 (tied) | 0.45 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.61 (tied) | 0.12 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.012 | 0.019 |
| realworld | Better-Auth: lint format | Namespace | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Blaxel | 0.13 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Novita | 0.22 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.61 (tied) | 0.30 |
| realworld | Better-Auth: lint format | tama | 0.95 (tied) | 0.91 |
| realworld | Better-Auth: lint format | E2B | 0.86 (tied) | 0.98 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Blaxel | 0.012 | 0.066 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Namespace | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.0029 | 0.0012 |
| realworld | Better-Auth: lint packages | tama | 0.49 (tied) | 0.20 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.058 (tied) | 0.032 |
| realworld | Better-Auth: lint packages | E2B | 0.024 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | 0.0017 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Novita | 0.35 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Namespace | 0.71 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | tama | 0.018 | 0.016 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.68 (tied) | 0.55 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.35 (tied) | 0.65 |
| realworld | Better-Auth: lint spell | E2B | 0.21 (tied) | 0.040 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | 0.014 | 0.019 |
| realworld | Better-Auth: lint types | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.068 (tied) | 0.19 |
| realworld | Better-Auth: lint types | tama | 0.60 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Namespace | 0.95 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.88 (tied) | 0.65 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | 0.089 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.0056 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | 0.0029 | 0.019 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.078 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | 1.0 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Namespace | 0.012 | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | tama | 1.0 (tied) | 0.33 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.18 (tied) | 0.33 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.41 (tied) | 0.12 |
| realworld | Better-Auth: typecheck | E2B | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.045 | 0.019 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.35 (tied) | 0.13 |
| realworld | Mastra: build:core | Novita | 0.93 (tied) | 0.13 |
| realworld | Mastra: build:core | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | tama | 0.57 (tied) | 0.26 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | 0.67 (tied) | 0.19 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.0056 | 0.0046 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.033 | 0.019 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.53 (tied) | 0.20 |
| realworld | Mastra: git clone | Modal (VM) | 0.33 (tied) | 0.37 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.49 (tied) | 0.040 |
| realworld | Mastra: git clone | tama | 0.55 (tied) | 0.43 |
| realworld | Mastra: git clone | Namespace | 0.59 (tied) | 0.19 |
| realworld | Mastra: git clone | Novita | 1.0 (tied) | 0.43 |
| realworld | Mastra: git clone | E2B | 0.40 (tied) | 0.43 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.96 (tied) | 0.79 |
| realworld | Mastra: git clone | Runloop | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Namespace | 0.089 (tied) | 0.019 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.41 (tied) | 0.036 |
| realworld | Mastra: lint:format | tama | 0.61 (tied) | 0.35 |
| realworld | Mastra: lint:format | Modal (VM) | 0.35 (tied) | 0.075 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: lint:format | E2B | 0.38 (tied) | 0.43 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.22 (tied) | 0.066 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | — | — |
| realworld | Mastra: test:core | Namespace | 0.20 (tied) | 0.019 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.037 | 0.032 |
| realworld | Mastra: test:core | Blaxel | 0.79 (tied) | 0.35 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | tama | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.57 (tied) | 0.46 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | E2B | 0.53 (tied) | 0.023 |
| realworld | Mastra: test:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.0036 | 0.0046 |
| realworld | OpenClaw: cold install | Novita | 0.0011 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.0056 | 0.0046 |
| realworld | OpenClaw: cold install | Namespace | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.039 | 0.19 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.76 (tied) | 0.19 |
| realworld | OpenClaw: cold install | E2B | 0.22 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.014 | 0.013 |
| realworld | OpenClaw: cold install | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.22 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.98 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Novita | 0.71 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Namespace | 0.32 (tied) | 0.066 |
| realworld | OpenClaw: git clone | E2B | 0.20 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.42 (tied) | 0.13 |
| realworld | OpenClaw: git clone | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Namespace | — | — |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | <0.001 | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.71 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.080 (tied) | 0.017 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.0044 | 0.0076 |
| realworld | OpenClaw: lint (all extensions) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.76 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.0014 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.28 (tied) | 0.017 |
| realworld | OpenClaw: lint (Oxlint) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.045 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.039 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.28 (tied) | 0.017 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.014 | 0.013 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.76 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | 0.0016 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.33 (tied) | 0.56 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.58 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.77 (tied) | 0.63 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | <0.001 |
| cpu | Node.js web tooling | Daytona (VM) | — | — |
| cpu | Node.js web tooling | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Novita | 0.10 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | tama | 0.10 (too few sandboxes) | 0.0013 |
| cpu | Node.js web tooling | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Namespace | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | E2B | 0.10 (too few sandboxes) | 0.012 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.30 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.30 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.11 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | Namespace | 0.50 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | Modal (gVisor) | 0.60 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | tama | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Runloop | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | tama | 1.0 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Runloop | 0.20 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | tama | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Namespace | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | tama | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 0.20 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Daytona (VM) | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 WAN download | tama | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | Novita | 0.50 (too few sandboxes) | 0.11 |
| network | iperf3 WAN download | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Namespace | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 1.0 (too few sandboxes) | 0.68 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.68 |
| network | iperf3 WAN upload | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 WAN upload | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.11 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.40 (too few sandboxes) | 0.030 |
| system | Git common operations | Novita | 0.20 (too few sandboxes) | 0.0047 |
| system | Git common operations | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | tama | — | — |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.066 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.44 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | tama | — | — |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.60 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.066 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.44 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.80 (too few sandboxes) | 0.25 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.80 (too few sandboxes) | 0.25 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.32 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.20 (too few sandboxes) | 0.0047 |
| system | PyBench | Novita | 1.0 (too few sandboxes) | 0.44 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (gVisor) | 0.60 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.20 (too few sandboxes) | 0.0047 |
| system | SQLite Speedtest | Novita | 0.20 (too few sandboxes) | 0.0047 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

