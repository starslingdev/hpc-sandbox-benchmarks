# Sandbox provider leaderboard

Run [`35819944942`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/35819944942) · commit [`38f0d3bdd559cdde5ddb78968007f53841a4873e`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/38f0d3bdd559cdde5ddb78968007f53841a4873e) ·
dataset [`data/dataset/runs/35819944942.json`](data/dataset/runs/35819944942.json) · generated 2026-09-23T06:57:05.122Z

**Partial results — incomplete experiment.** 639 of 702 planned cells complete; 63 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:3b720fd4c09e2d91790274d9a1c2d6b62feb620cee7c377a17be4b78d4b5d601`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **604 metric records**
backed by **5014 retained trial observations**, across **48 metrics** and
**13 providers**; every emitted, catalogued metric has a ranked table below
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
| boat | KVM virtual machine | vm |
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
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 13 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 12 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 11 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 41.15 | 39.56 – 44.14 | 12 | 12 | — |
| 1 | Blaxel | 41.16 | 40.28 – 45.39 | 12 | 12 | tied |
| 3 | Novita | 45.63 | 44.54 – 47.57 | 12 | 12 | — |
| 3 | boat | 46.39 | 44.71 – 51.57 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 46.65 | 42.84 – 50.66 | 12 | 12 | tied |
| 3 | Namespace | 48.92 | 46.97 – 51.47 | 12 | 12 | tied |
| 3 | Modal (VM) | 52.74 | 49 – 54.62 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 59.14 | 56.57 – 72.97 | 12 | 12 | — |
| 8 | E2B | 71.38 | 66.92 – 75.7 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 72.91 | 67.28 – 102 | 11 | 11 | tied |
| 8 | Runloop | 85.95 | 84.29 – 100.9 | 12 | 12 | tied |
| 8 | tama | 87.77 | 66.74 – 113.4 | 12 | 12 | tied |
| 13 | run.cloud | 116.4 | 107.4 – 135.8 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 51.11 | 47.56 – 56.31 | 12 | 12 | — |
| 2 | Daytona (VM) | 57.1 | 52.78 – 60.7 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 61.7 | 59.99 – 63.84 | 12 | 12 | — |
| 3 | Blaxel | 63.74 | 60.74 – 69.39 | 12 | 12 | tied |
| 3 | Novita | 68.08 | 67.33 – 68.51 | 12 | 12 | tied |
| 6 | Modal (VM) | 73.83 | 70.69 – 83.03 | 12 | 12 | — |
| 6 | Namespace | 76.03 | 72.23 – 79.46 | 12 | 12 | tied |
| 6 | tama | 78.36 | 77.41 – 81.25 | 3 | 3 | tied |
| 6 | run.cloud | 90.65 | 72.56 – 94.52 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 92.78 | 90.11 – 95.25 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 95.79 | 72.21 – 138.7 | 12 | 12 | tied |
| 6 | E2B | 102.9 | 96.56 – 107.9 | 12 | 12 | tied |
| 13 | Runloop | 138.6 | 131.5 – 141.5 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace, Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 11.87 | 11.68 – 12.81 | 12 | 12 | — |
| 1 | Blaxel | 11.94 | 11.62 – 12.45 | 12 | 12 | tied |
| 1 | Daytona (VM) | 12.07 | 11.65 – 12.25 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 13.36 | 13.16 – 13.62 | 12 | 12 | — |
| 5 | Novita | 13.74 | 13.64 – 13.9 | 12 | 12 | — |
| 5 | boat | 14.1 | 12.7 – 14.72 | 12 | 12 | tied |
| 7 | Modal (VM) | 19.12 | 18.44 – 20.07 | 12 | 12 | — |
| 7 | Vercel Sandbox | 19.65 | 19.13 – 21.22 | 12 | 12 | tied |
| 7 | E2B | 20.5 | 19.98 – 21.46 | 12 | 12 | tied |
| 7 | run.cloud | 21.3 | 16 – 24.87 | 12 | 12 | tied |
| 7 | Runloop | 22.1 | 21.24 – 23.15 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 24.64 | 23.12 – 36.75 | 12 | 12 | — |
| 13 | tama | 39.96 | 36.55 – 41.03 | 3 | 3 | — |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.698 | 0.6645 – 0.714 | 12 | 12 | — |
| 2 | Blaxel | 0.7635 | 0.7375 – 0.786 | 12 | 12 | — |
| 3 | Modal (VM) | 0.8705 | 0.834 – 0.901 | 12 | 12 | — |
| 4 | Vercel Sandbox | 0.9295 | 0.914 – 0.9905 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 1.075 | 1.05 – 1.089 | 12 | 12 | — |
| 6 | Daytona (VM) | 1.506 | 1.214 – 1.57 | 12 | 12 | — |
| 7 | E2B | 1.615 | 1.518 – 1.706 | 12 | 12 | — |
| 7 | Novita | 1.9 | 1.597 – 2.097 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 2.026 | 1.376 – 2.612 | 12 | 12 | tied |
| 7 | boat | 2.303 | 1.978 – 2.743 | 12 | 12 | tied |
| 7 | run.cloud | 2.392 | 2.083 – 2.826 | 12 | 12 | tied |
| 7 | Runloop | 3.494 | 2.229 – 6.724 | 12 | 12 | tied |
| 7 | tama | 5.774 | 3.995 – 6.389 | 3 | 3 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.41 | 2.319 – 2.603 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.83 | 2.803 – 2.921 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.126 | 3.029 – 3.227 | 12 | 12 | — |
| 3 | Novita | 3.217 | 3.175 – 3.276 | 12 | 12 | tied |
| 5 | Blaxel | 3.474 | 3.253 – 3.548 | 12 | 12 | — |
| 5 | Namespace | 3.565 | 3.216 – 3.665 | 12 | 12 | tied |
| 7 | Modal (VM) | 3.838 | 3.804 – 4.125 | 12 | 12 | — |
| 8 | run.cloud | 4.3 | 4.03 – 4.551 | 12 | 12 | — |
| 8 | Vercel Sandbox | 4.38 | 4.297 – 4.519 | 12 | 12 | tied |
| 10 | E2B | 5.094 | 5.01 – 5.248 | 12 | 12 | — |
| 10 | tama | 5.142 | 4.259 – 7.05 | 3 | 3 | tied |
| 10 | Runloop | 6.413 | 6.165 – 6.727 | 12 | 12 | tied |
| 13 | Modal (gVisor) | 8.208 | 7.376 – 10.25 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 8.009 | 7.405 – 8.755 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.393 | 9.261 – 9.642 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 10.11 | 9.555 – 10.46 | 12 | 12 | — |
| 4 | Blaxel | 10.71 | 10.48 – 10.9 | 12 | 12 | — |
| 5 | Novita | 11.08 | 10.94 – 11.41 | 12 | 12 | — |
| 5 | Namespace | 11.57 | 11.03 – 12.27 | 12 | 12 | tied |
| 7 | Modal (VM) | 13.03 | 12.81 – 14.12 | 12 | 12 | — |
| 7 | run.cloud | 13.9 | 13.16 – 14.98 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 14.9 | 14.58 – 15.35 | 12 | 12 | — |
| 9 | tama | 15.36 | 13.97 – 16.93 | 3 | 3 | tied |
| 9 | Modal (gVisor) | 17.29 | 12.99 – 29.86 | 12 | 12 | tied |
| 9 | E2B | 19.9 | 18.89 – 22.42 | 12 | 12 | tied |
| 9 | Runloop | 22.05 | 21.48 – 22.53 | 12 | 12 | tied |

### Better-Auth: lint format

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.29 | 2.135 – 2.479 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.528 | 2.426 – 2.586 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.787 | 2.665 – 2.861 | 12 | 12 | — |
| 3 | Namespace | 2.954 | 2.648 – 3.127 | 12 | 12 | tied |
| 3 | Novita | 3.053 | 2.985 – 3.16 | 12 | 12 | tied |
| 3 | Blaxel | 3.061 | 2.95 – 3.135 | 12 | 12 | tied |
| 7 | Modal (VM) | 3.629 | 3.436 – 4.074 | 12 | 12 | — |
| 7 | run.cloud | 4.089 | 3.873 – 4.252 | 12 | 12 | tied |
| 7 | tama | 4.452 | 3.689 – 5.827 | 3 | 3 | tied |
| 7 | Vercel Sandbox | 4.483 | 4.34 – 4.642 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 4.552 | 2.989 – 6.829 | 12 | 12 | tied |
| 7 | E2B | 5.377 | 5.006 – 5.776 | 12 | 12 | tied |
| 13 | Runloop | 6.721 | 6.581 – 6.912 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.447 | 2.349 – 2.529 | 12 | 12 | — |
| 1 | boat | 2.462 | 2.313 – 2.606 | 12 | 12 | tied |
| 3 | Novita | 2.619 | 2.602 – 2.717 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.644 | 2.579 – 2.742 | 12 | 12 | tied |
| 3 | Blaxel | 2.659 | 2.552 – 2.796 | 12 | 12 | tied |
| 6 | Namespace | 3.107 | 2.646 – 3.428 | 12 | 12 | — |
| 6 | Modal (VM) | 3.227 | 3.189 – 3.548 | 12 | 12 | tied |
| 6 | run.cloud | 3.63 | 3.348 – 3.728 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 3.776 | 3.704 – 3.971 | 12 | 12 | — |
| 9 | tama | 3.875 | 3.816 – 3.906 | 3 | 3 | tied |
| 11 | E2B | 4.276 | 4.188 – 4.595 | 12 | 12 | — |
| 12 | Runloop | 6.456 | 6.053 – 6.859 | 12 | 12 | — |
| 12 | Modal (gVisor) | 6.62 | 3.917 – 9.494 | 12 | 12 | tied |

### Better-Auth: lint spell

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.519 | 5.224 – 6.098 | 12 | 12 | — |
| 2 | Daytona (VM) | 6.365 | 6.163 – 6.524 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 6.762 | 6.52 – 7.21 | 12 | 12 | — |
| 4 | Blaxel | 7.553 | 7.021 – 7.822 | 12 | 12 | — |
| 4 | Namespace | 7.633 | 7.247 – 8.074 | 12 | 12 | tied |
| 4 | Novita | 8.151 | 7.575 – 8.352 | 12 | 12 | tied |
| 7 | Modal (VM) | 8.878 | 8.726 – 10.26 | 12 | 12 | — |
| 8 | run.cloud | 10.76 | 10.03 – 11.35 | 12 | 12 | — |
| 8 | tama | 10.82 | 10.81 – 13.67 | 3 | 3 | tied |
| 8 | Modal (gVisor) | 11.12 | 8.413 – 16.39 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 11.57 | 11.37 – 12.84 | 12 | 12 | tied |
| 12 | E2B | 13.43 | 12.94 – 15.06 | 12 | 12 | — |
| 13 | Runloop | 16.3 | 15.85 – 17.11 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_boat and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 25.18 | 23.71 – 27.64 | 12 | 12 | — |
| 1 | Daytona (VM) | 26.55 | 25.48 – 27.75 | 12 | 12 | tied |
| 3 | Blaxel | 30.06 | 27.75 – 34.24 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 31.42 | 31.13 – 32.24 | 12 | 12 | tied |
| 3 | Novita | 32.55 | 31.6 – 33 | 12 | 12 | tied |
| 6 | Modal (VM) | 35.33 | 34.31 – 39.35 | 12 | 12 | — |
| 6 | tama | 35.34 | 25.74 – 36.21 | 3 | 3 | tied |
| 8 | Namespace | 42.87 | 40.41 – 45.15 | 12 | 12 | — |
| 9 | Vercel Sandbox | 46.14 | 44.07 – 47.97 | 12 | 12 | — |
| 9 | run.cloud | 49.73 | 46.79 – 56.09 | 12 | 12 | tied |
| 9 | E2B | 53.28 | 50.12 – 54.79 | 12 | 12 | tied |
| 12 | Runloop | 67.67 | 65.42 – 71 | 12 | 12 | — |
| 12 | Modal (gVisor) | 94.83 | 47.56 – 106.6 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 33.71 | 29.53 – 35.58 | 12 | 12 | — |
| 2 | Daytona (VM) | 38.93 | 37.1 – 40.54 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 41.16 | 40.14 – 43.53 | 12 | 12 | — |
| 4 | Novita | 44.5 | 43.29 – 44.97 | 12 | 12 | — |
| 4 | Blaxel | 45.44 | 43.57 – 48.91 | 12 | 12 | tied |
| 4 | Namespace | 49 | 46.98 – 50.6 | 12 | 12 | tied |
| 4 | tama | 49.85 | 48.84 – 51.13 | 3 | 3 | tied |
| 4 | Modal (VM) | 50.87 | 50.19 – 58.27 | 12 | 12 | tied |
| 4 | Modal (gVisor) | 62.28 | 42.12 – 84.86 | 12 | 12 | tied |
| 4 | run.cloud | 63.08 | 60.55 – 74.14 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 67.61 | 66.68 – 72.06 | 12 | 12 | tied |
| 4 | E2B | 75.49 | 72 – 80.26 | 12 | 12 | tied |
| 13 | Runloop | 97.61 | 96.01 – 102.9 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 57.05 | 53.83 – 60.04 | 12 | 12 | — |
| 2 | Daytona (VM) | 67.09 | 65.97 – 70.24 | 12 | 12 | — |
| 3 | Novita | 76.91 | 75.97 – 78.12 | 12 | 12 | — |
| 3 | Namespace | 77.58 | 74.99 – 80.35 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 78.05 | 72.03 – 97.58 | 12 | 12 | tied |
| 3 | Blaxel | 80.64 | 73.9 – 82.71 | 12 | 12 | tied |
| 7 | Modal (VM) | 93.25 | 85.87 – 94.49 | 12 | 12 | — |
| 7 | tama | 99 | 92.95 – 102.2 | 12 | 12 | tied |
| 9 | run.cloud | 107.7 | 106.5 – 109.3 | 12 | 12 | — |
| 10 | Vercel Sandbox | 114.6 | 112.8 – 137.4 | 12 | 12 | — |
| 10 | Modal (gVisor) | 125.9 | 119.1 – 161.7 | 11 | 11 | tied |
| 10 | E2B | 129.8 | 125.6 – 135.7 | 12 | 12 | tied |
| 13 | Runloop | 177.9 | 171.6 – 182.4 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace, Daytona (VM), Blaxel, Modal (VM) and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.778 | 1.752 – 2.897 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.324 | 1.993 – 2.521 | 12 | 12 | tied |
| 1 | Blaxel | 2.403 | 1.738 – 2.468 | 12 | 12 | tied |
| 1 | Modal (VM) | 2.484 | 2.208 – 2.875 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 2.672 | 2.373 – 2.761 | 12 | 12 | tied |
| 6 | run.cloud | 3.12 | 3.019 – 4.216 | 12 | 12 | — |
| 6 | Vercel Sandbox | 3.149 | 3.075 – 3.258 | 12 | 12 | tied |
| 6 | Novita | 3.394 | 2.856 – 3.734 | 12 | 12 | tied |
| 6 | boat | 3.412 | 3.127 – 3.905 | 12 | 12 | tied |
| 6 | tama | 3.517 | 3.236 – 3.881 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 3.782 | 3.288 – 5.841 | 11 | 11 | tied |
| 6 | E2B | 4.239 | 3.487 – 4.383 | 12 | 12 | tied |
| 13 | Runloop | 5.232 | 4.3 – 6.98 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 68.71 | 65.99 – 79.11 | 12 | 12 | — |
| 2 | Daytona (VM) | 88.61 | 84.02 – 93.47 | 12 | 12 | — |
| 3 | Blaxel | 97.11 | 93.73 – 105.1 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 99.83 | 90.61 – 144.6 | 12 | 12 | tied |
| 3 | Novita | 101.9 | 100.8 – 103.2 | 12 | 12 | tied |
| 3 | Namespace | 107.2 | 96.89 – 111.2 | 12 | 12 | tied |
| 7 | Modal (VM) | 116.3 | 109 – 117.4 | 12 | 12 | — |
| 7 | tama | 116.9 | 109.3 – 124.1 | 12 | 12 | tied |
| 9 | run.cloud | 133.2 | 129.8 – 137.4 | 12 | 12 | — |
| 10 | Vercel Sandbox | 141.8 | 140.4 – 174 | 12 | 12 | — |
| 10 | Modal (gVisor) | 145.7 | 139.8 – 189.4 | 11 | 11 | tied |
| 10 | E2B | 165.7 | 151.1 – 169.1 | 12 | 12 | tied |
| 13 | Runloop | 221.7 | 211 – 234.7 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_Daytona (VM), Namespace, Blaxel, Microsandbox Cloud and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 904.5 | 900.5 – 954.9 | 12 | 12 | — |
| 1 | Namespace | 939.2 | 911.6 – 954.8 | 12 | 12 | tied |
| 1 | Blaxel | 960.1 | 938.4 – 963.2 | 11 | 11 | tied |
| 1 | Microsandbox Cloud | 967.6 | 931.1 – 1078 | 12 | 12 | tied |
| 1 | Novita | 1013 | 1007 – 1023 | 12 | 12 | tied |
| 6 | Modal (VM) | 1105 | 1049 – 1126 | 12 | 12 | — |
| 6 | tama | 1106 | 1103 – 1115 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 1291 | 1272 – 1494 | 12 | 12 | — |
| 8 | run.cloud | 1340 | 1331 – 1358 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 1401 | 1382 – 2027 | 11 | 11 | — |
| 10 | E2B | 1441 | 1390 – 1490 | 12 | 12 | tied |
| 12 | Runloop | 1794 | 1597 – 1826 | 10 | 10 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.82 | 11.52 – 12.29 | 12 | 12 | — |
| 2 | Namespace | 14.28 | 13.17 – 14.83 | 12 | 12 | — |
| 2 | Daytona (VM) | 14.85 | 14.2 – 16.43 | 12 | 12 | tied |
| 2 | Novita | 15.91 | 15.18 – 16.24 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 17.6 | 15.11 – 18.84 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 17.93 | 17.81 – 19.55 | 12 | 12 | tied |
| 2 | Modal (VM) | 18.19 | 17.17 – 19.01 | 12 | 12 | tied |
| 8 | run.cloud | 21.55 | 20.27 – 21.9 | 12 | 12 | — |
| 8 | E2B | 21.9 | 20.93 – 26.29 | 12 | 12 | tied |
| 8 | Runloop | 23.74 | 22.69 – 24.21 | 12 | 12 | tied |
| 11 | boat | 25.19 | — | 1 | 1 | — |
| 12 | Modal (gVisor) | 26.26 | 20.63 – 28.13 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel and Namespace share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.63 | 2.558 – 2.808 | 12 | 12 | — |
| 1 | Namespace | 2.778 | 2.71 – 2.83 | 12 | 12 | tied |
| 3 | Modal (VM) | 3.245 | 3.21 – 3.984 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.263 | 3.062 – 3.391 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.813 | 3.752 – 4.186 | 12 | 12 | — |
| 5 | Novita | 3.981 | 3.742 – 4.474 | 12 | 12 | tied |
| 5 | Daytona (VM) | 4.091 | 3.526 – 4.703 | 12 | 12 | tied |
| 8 | E2B | 4.918 | 4.707 – 5.124 | 12 | 12 | — |
| 9 | Runloop | 6.644 | 5.264 – 7.67 | 12 | 12 | — |
| 9 | Modal (gVisor) | 8.185 | 6.065 – 10.36 | 12 | 12 | tied |
| 9 | run.cloud | 10.35 | 9.769 – 11.04 | 12 | 12 | tied |
| 12 | boat | 10.91 | — | 1 | 1 | — |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 108 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 148 | 145.4 – 151 | 12 | 12 | — |
| 2 | Namespace | 151.7 | 145.6 – 154.7 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 161.5 | 144.8 – 172.8 | 12 | 12 | tied |
| 2 | Blaxel | 164.9 | 161.8 – 165.5 | 12 | 12 | tied |
| 6 | Novita | 176.4 | 173.9 – 178.7 | 12 | 12 | — |
| 7 | Modal (VM) | 190.6 | 185.4 – 195.5 | 12 | 12 | — |
| 7 | run.cloud | 216.9 | 171.2 – 223.3 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 224.9 | 220.3 – 232.6 | 12 | 12 | — |
| 9 | Modal (gVisor) | 251.5 | 211.6 – 316.5 | 12 | 12 | tied |
| 9 | E2B | 324.4 | 312.1 – 336.2 | 12 | 12 | tied |
| 9 | Runloop | 325.1 | 298.4 – 346.9 | 12 | 12 | tied |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 207.5 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 285.7 | 280.6 – 290.4 | 12 | 12 | — |
| 2 | Namespace | 287.7 | 278.7 – 290.2 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 299.9 | 275.6 – 327.7 | 12 | 12 | tied |
| 2 | Blaxel | 308.9 | 304.7 – 316 | 12 | 12 | tied |
| 6 | Novita | 343.5 | 340.5 – 345.9 | 12 | 12 | — |
| 6 | Modal (VM) | 356.9 | 350.1 – 363.7 | 12 | 12 | tied |
| 8 | run.cloud | 396.7 | 381.1 – 407.5 | 12 | 12 | — |
| 9 | Vercel Sandbox | 413.3 | 405.6 – 427 | 12 | 12 | — |
| 9 | Modal (gVisor) | 468.5 | 400.8 – 652.8 | 12 | 12 | tied |
| 9 | Runloop | 600.4 | 592.7 – 617.5 | 12 | 12 | tied |
| 9 | E2B | 638.1 | 611.4 – 653.8 | 12 | 12 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 76.4 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 93.68 | 91.43 – 95.91 | 12 | 12 | — |
| 3 | Namespace | 103.7 | 99.98 – 104.9 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 108.2 | 103.6 – 120.3 | 12 | 12 | — |
| 4 | Novita | 113.2 | 110.1 – 115.6 | 12 | 12 | tied |
| 6 | Modal (VM) | 122 | 119.1 – 124.1 | 12 | 12 | — |
| 6 | run.cloud | 124.3 | 112.9 – 150.5 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 151.5 | 147.3 – 158.2 | 12 | 12 | — |
| 8 | Modal (gVisor) | 176.7 | 133.4 – 263.3 | 12 | 12 | tied |
| 8 | E2B | 199.9 | 187.2 – 205.7 | 12 | 12 | tied |
| 8 | Runloop | 208 | 194.2 – 241 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 12.41 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 16.23 | 15.94 – 16.79 | 12 | 12 | — |
| 2 | Namespace | 16.31 | 15.72 – 16.98 | 12 | 12 | tied |
| 4 | Blaxel | 17.63 | 17.27 – 17.92 | 6 | 6 | — |
| 4 | Microsandbox Cloud | 17.81 | 17.06 – 20.73 | 12 | 12 | tied |
| 6 | Modal (VM) | 21.03 | 20.76 – 21.85 | 12 | 12 | — |
| 6 | Novita | 21.1 | 20.5 – 22.23 | 12 | 12 | tied |
| 6 | run.cloud | 23.4 | 20.03 – 25.28 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 26.08 | 25.46 – 26.91 | 12 | 12 | — |
| 9 | Modal (gVisor) | 26.7 | 21.8 – 43.23 | 12 | 12 | tied |
| 11 | E2B | 37.64 | 36.59 – 41.25 | 12 | 12 | — |
| 11 | Runloop | 37.84 | 34.25 – 40.37 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 23.08 | 22.3 – 27.58 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 22.14 | 20.3 – 23.73 | 3 | 6 | too few sandboxes |
| 3 | Novita | 21.18 | 17.97 – 21.19 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 21.08 | 18.81 – 21.52 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 19.45 | 19.44 – 20.02 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 18.62 | 18.54 – 26.16 | 3 | 6 | too few sandboxes |
| 7 | tama | 16.57 | 15.75 – 17.26 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 15.22 | 15.2 – 15.3 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 13.52 | 13.03 – 19.81 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 13.16 | 9.97 – 13.66 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 12.49 | 9.665 – 12.71 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 12.07 | 11.99 – 13.77 | 3 | 6 | too few sandboxes |
| 13 | E2B | 10.55 | 10.2 – 10.88 | 3 | 6 | too few sandboxes |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_boat leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1361 | 592.4 – 1581 | 3 | 6 | — |
| 2 | Blaxel | 1166 | 1156 – 1167 | 3 | 6 | too few sandboxes |
| 3 | Novita | 984.6 | 980.9 – 997.2 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 865.6 | 855.1 – 930.6 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 854.6 | 835.7 – 863 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 826.3 | 809.5 – 866.1 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 734 | 661.1 – 759.2 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 724.6 | 557.3 – 733.5 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 649.1 | 644.3 – 655.4 | 3 | 6 | too few sandboxes |
| 10 | tama | 628.1 | 612.4 – 757.6 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 523.2 | 499.1 – 690 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 474 | 469.2 – 481.8 | 3 | 6 | too few sandboxes |
| 13 | E2B | 233.8 | 231.2 – 239.6 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.8× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 144000 | 137500 – 151500 | 3 | 6 | — |
| 2 | Daytona (VM) | 51800 | 51050 – 53100 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 51400 | 46750 – 55050 | 3 | 6 | too few sandboxes |
| 4 | boat | 48450 | 44900 – 55150 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 47350 | 47200 – 70600 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 38750 | 37750 – 39400 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 33200 | 24400 – 37950 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 28200 | 27900 – 29400 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 24600 | 16550 – 26300 | 3 | 6 | too few sandboxes |
| 10 | Novita | 16250 | 14750 – 16350 | 3 | 6 | too few sandboxes |
| 11 | tama | 11700 | 6718 – 12550 | 3 | 6 | too few sandboxes |
| 12 | E2B | 8269 | 7320 – 8982 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 8063 | 7941 – 8373 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.8× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 590.3 | 562.6 – 621.8 | 3 | 6 | — |
| 2 | Daytona (VM) | 212.3 | 208.7 – 217.1 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 210.8 | 191.4 – 225.4 | 3 | 6 | too few sandboxes |
| 4 | boat | 198.2 | 184 – 226 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 194 | 193.5 – 289.4 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 158.9 | 154.7 – 161.5 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 135.8 | 99.98 – 155.2 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 115.9 | 114.3 – 120.6 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 100.8 | 67.74 – 108 | 3 | 6 | too few sandboxes |
| 10 | Novita | 66.53 | 60.5 – 66.95 | 3 | 6 | too few sandboxes |
| 11 | tama | 47.82 | 27.53 – 51.28 | 3 | 6 | too few sandboxes |
| 12 | E2B | 33.87 | 29.99 – 36.81 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 33.03 | 32.56 – 34.29 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_boat leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 332000 | 144500 – 386000 | 3 | 6 | — |
| 2 | Blaxel | 284500 | 282000 – 285000 | 3 | 6 | too few sandboxes |
| 3 | Novita | 240500 | 239500 – 243500 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 211500 | 208500 – 227000 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 209000 | 204000 – 211000 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 201500 | 198000 – 211500 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 179500 | 161500 – 185000 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 177000 | 136000 – 179000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 158000 | 157000 – 160000 | 3 | 6 | too few sandboxes |
| 10 | tama | 153000 | 149500 – 185000 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 128000 | 122000 – 168500 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 116000 | 114500 – 117500 | 3 | 6 | too few sandboxes |
| 13 | E2B | 57050 | 56500 – 58350 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.7× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 34150 | 33250 – 57200 | 3 | 6 | — |
| 2 | Daytona (VM) | 12450 | 11550 – 12700 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9783 | 8809 – 12300 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 4964 | 4572 – 5993 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4465 | 4390 – 4804 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 4449 | 4101 – 6823 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 3058 | 3037 – 3117 | 3 | 6 | too few sandboxes |
| 8 | boat | 2886 | 2499 – 3306 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 2855 | 2827 – 3309 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1904 | 1503 – 2442 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1489 | 1481 – 2056 | 3 | 6 | too few sandboxes |
| 12 | tama | 1075 | 557 – 1240 | 3 | 6 | too few sandboxes |
| 13 | E2B | 599 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.7× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 35810 | 34900 – 60020 | 3 | 6 | — |
| 2 | Daytona (VM) | 13050 | 12130 – 13310 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 10300 | 9238 – 12940 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5207 | 4795 – 6285 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4683 | 4605 – 5039 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 4666 | 4301 – 7155 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 3208 | 3186 – 3270 | 3 | 6 | too few sandboxes |
| 8 | boat | 3027 | 2621 – 3468 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 2995 | 2966 – 3471 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1998 | 1577 – 2562 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1562 | 1555 – 2158 | 3 | 6 | too few sandboxes |
| 12 | tama | 1128 | 585.9 – 1302 | 3 | 6 | too few sandboxes |
| 13 | E2B | 630.2 | 629.7 – 630.7 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.7× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 7705 | 5462 – 9576 | 3 | 6 | — |
| 2 | Daytona (VM) | 4598 | 4249 – 4737 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4368 | 3538 – 4922 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3727 | 3640 – 4614 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 3325 | 3278 – 3450 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3016 | 2714 – 3420 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2145 | 1968 – 4211 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2136 | 2094 – 2250 | 3 | 6 | too few sandboxes |
| 9 | boat | 1808 | 625.5 – 1978 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1751 | 1469 – 1779 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1474 | 1393 – 1544 | 3 | 6 | too few sandboxes |
| 12 | E2B | 598.5 | 596.5 – 605.5 | 3 | 6 | too few sandboxes |
| 13 | tama | 456 | 439.5 – 823.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.7× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 8080 | 5728 – 10040 | 3 | 6 | — |
| 2 | Daytona (VM) | 4822 | 4457 – 4968 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4581 | 3711 – 5162 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3910 | 3818 – 4839 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 3488 | 3438 – 3619 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3164 | 2847 – 3588 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2250 | 2065 – 4417 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2242 | 2197 – 2361 | 3 | 6 | too few sandboxes |
| 9 | boat | 1896 | 658 – 2075 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1838 | 1542 – 1867 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1548 | 1462 – 1620 | 3 | 6 | too few sandboxes |
| 12 | E2B | 629.1 | 627 – 637 | 3 | 6 | too few sandboxes |
| 13 | tama | 479.7 | 461.9 – 865.6 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.79 | 21.34 – 24.46 | 3 | 6 | — |
| 2 | Blaxel | 20.11 | 20.07 – 20.13 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 14.19 | 14.13 – 14.76 | 3 | 6 | too few sandboxes |
| 4 | Novita | 11.95 | 11.36 – 11.96 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 11.04 | 8.005 – 11.13 | 3 | 6 | too few sandboxes |
| 6 | boat | 10.43 | 10.28 – 11.77 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 8.55 | 8.525 – 8.59 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 8.02 | 8.01 – 8.02 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 7.625 | 7.62 – 7.64 | 3 | 6 | too few sandboxes |
| 10 | tama | 7.12 | 7.085 – 7.785 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 4.575 | 4.375 – 5.14 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 4.25 | 4.24 – 4.305 | 3 | 6 | too few sandboxes |
| 13 | E2B | 1.35 | 1.25 – 1.415 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Modal (gVisor) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 178000 | 173700 – 179300 | 3 | 6 | — |
| 2 | Modal (gVisor) | 114200 | 83090 – 115600 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 100638 | 99670 – 127300 | 3 | 6 | too few sandboxes |
| 4 | tama | 100400 | 88660 – 185700 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57310 | 57040 – 98710 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 55630 | 50010 – 58080 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 53260 | 53100 – 55010 | 3 | 6 | too few sandboxes |
| 8 | Novita | 52170 | 52080 – 102300 | 3 | 6 | too few sandboxes |
| 9 | E2B | 48260 | 46300 – 52670 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 41050 | 39380 – 44500 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 40370 | 39910 – 41500 | 3 | 6 | too few sandboxes |
| 12 | boat | 32900 | 31840 – 33120 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 32700 | 28420 – 33480 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 177600 | 173000 – 178800 | 3 | 6 | — |
| 2 | Modal (gVisor) | 114000 | 83340 – 117200 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 100400 | 99210 – 127600 | 3 | 6 | too few sandboxes |
| 4 | tama | 89540 | 41020 – 151200 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57240 | 56990 – 98470 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 55100 | 50230 – 55110 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 52980 | 52650 – 54600 | 3 | 6 | too few sandboxes |
| 8 | Novita | 52450 | 52340 – 102200 | 3 | 6 | too few sandboxes |
| 9 | E2B | 48560 | 46380 – 52570 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 41470 | 39100 – 44550 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 39430 | 38930 – 40530 | 3 | 6 | too few sandboxes |
| 12 | boat | 32700 | 31930 – 33060 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 32630 | 28720 – 33130 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.3× tama on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 207200 | 193800 – 209000 | 3 | 6 | — |
| 2 | tama | 154600 | 118900 – 156600 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 111400 | 110300 – 143800 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 98040 | 75800 – 110200 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 87720 | 87520 – 135900 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 82530 | 72420 – 89240 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 81900 | 81410 – 84080 | 3 | 6 | too few sandboxes |
| 8 | E2B | 79510 | 77730 – 82390 | 3 | 6 | too few sandboxes |
| 9 | Novita | 57660 | 57150 – 111900 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 53430 | 52340 – 60460 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 45370 | 42930 – 50360 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 42900 | 38450 – 45220 | 3 | 6 | too few sandboxes |
| 13 | boat | 42170 | 41360 – 42630 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.4× tama on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 169200 | 164900 – 170700 | 3 | 6 | — |
| 2 | tama | 119000 | 73490 – 143100 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 105600 | 76070 – 108205 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 93220 | 91550 – 120500 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52880 | 52660 – 89820 | 3 | 6 | too few sandboxes |
| 6 | Novita | 50100 | 49600 – 97520 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 48020 | 45290 – 52670 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 45820 | 45620 – 47190 | 3 | 6 | too few sandboxes |
| 9 | E2B | 42790 | 42060 – 45470 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 37810 | 36010 – 40170 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 36310 | 35510 – 36920 | 3 | 6 | too few sandboxes |
| 12 | boat | 29770 | 28500 – 30060 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 29630 | 25653 – 30380 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6374 | 6191 – 8558 | 3 | 6 | — |
| 2 | Vercel Sandbox | 6357 | 6054 – 9902 | 3 | 6 | too few sandboxes |
| 3 | Novita | 3042 | 2887 – 4362 | 3 | 6 | too few sandboxes |
| 4 | E2B | 2483 | 1068 – 2662 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 2360 | 473.3 – 4373 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 1967 | 1913 – 2055 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 1839 | 1180 – 2097 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 1723 | 1429 – 1912 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1346 | 947.7 – 1590 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1127 | 1097 – 1600 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 937.7 | 936.9 – 937.8 | 3 | 6 | too few sandboxes |
| 12 | boat | 823.5 | 85.37 – 921.3 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 4784 | 3514 – 5137 | 3 | 6 | — |
| 2 | Blaxel | 4579 | 4358 – 4636 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4376 | 1114 – 5696 | 3 | 6 | too few sandboxes |
| 4 | Novita | 3816 | 1724 – 4420 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 3726 | 3521 – 5890 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 2699 | 2244 – 3776 | 3 | 6 | too few sandboxes |
| 7 | E2B | 2475 | 1922 – 5857 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2087 | 1694 – 2344 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 1880 | 61.81 – 2257 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1581 | 1399 – 2968 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 935.2 | 935 – 935.2 | 3 | 6 | too few sandboxes |
| 12 | boat | 793.3 | 166.9 – 851.6 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.3× boat on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156200 | 154931 – 157403 | 3 | 6 | — |
| 2 | boat | 117513 | 103631 – 121284 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 90129 | 83160 – 90183 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 86020 | 84690 – 142400 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 81580 | 68410 – 97590 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 66650 | 59303 – 67348 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 60740 | 47490 – 70260 | 3 | 6 | too few sandboxes |
| 8 | E2B | 53310 | 49582 – 56305 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 39558 | 28340 – 42720 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 26410 | 24010 – 35691 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 25954 | 21845 – 111769 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 14815 | 14760 – 17627 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.4× boat on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 157600 | 155089 – 158116 | 3 | 6 | — |
| 2 | boat | 115400 | 98990 – 142762 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 111818 | 102138 – 152600 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 92850 | 82075 – 101100 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 91680 | 77870 – 93363 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 57450 | 52581 – 60312 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 53537 | 34880 – 63440 | 3 | 6 | too few sandboxes |
| 8 | E2B | 50160 | 43226 – 54840 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 45600 | 38660 – 47290 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 35040 | 32020 – 35680 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 24498 | 15097 – 120400 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 15710 | 13220 – 19820 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, boat, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | boat | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 417 | 175 – 465.5 | 3 | 6 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 34.21 | 33.83 – 35.25 | 3 | 6 | — |
| 2 | Daytona (VM) | 37.03 | 36.84 – 37.84 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 39.18 | 34.88 – 40.75 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 40.24 | 39.99 – 40.26 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 40.65 | 39.36 – 43.87 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 42.5 | 41.61 – 42.87 | 3 | 6 | too few sandboxes |
| 7 | Novita | 44.25 | 43.79 – 44.69 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 47.95 | 47.26 – 47.98 | 3 | 6 | too few sandboxes |
| 9 | tama | 54.06 | 53.39 – 55.34 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 61.73 | 61.45 – 62.3 | 3 | 6 | too few sandboxes |
| 11 | E2B | 68.07 | 67.44 – 69.02 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 72.56 | 61.39 – 83.29 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 83.47 | 78.79 – 86.01 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_boat leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 394200 | 389400 – 408100 | 3 | 6 | — |
| 2 | Blaxel | 340200 | 323300 – 342700 | 3 | 6 | too few sandboxes |
| 3 | tama | 322100 | 321000 – 470500 | 3 | 6 | too few sandboxes |
| 4 | Novita | 290100 | 289700 – 304100 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 285300 | 273900 – 291900 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 246100 | 228600 – 247000 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 238400 | 234900 – 253000 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 195000 | 190900 – 196200 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 177100 | 172500 – 192400 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 170100 | 126200 – 171600 | 3 | 6 | too few sandboxes |
| 11 | E2B | 156500 | 145300 – 160500 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 121000 | 101800 – 123900 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 108700 | 108500 – 115900 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_boat leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.127 | 0.1225 – 0.1285 | 3 | 6 | — |
| 2 | Blaxel | 0.1475 | 0.146 – 0.155 | 3 | 6 | too few sandboxes |
| 3 | tama | 0.1555 | 0.1065 – 0.157 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.1725 | 0.164 – 0.1725 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 0.1755 | 0.1715 – 0.1825 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 0.203 | 0.2025 – 0.2205 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 0.2095 | 0.1975 – 0.213 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 0.2565 | 0.255 – 0.262 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.283 | 0.261 – 0.296 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 0.294 | 0.2915 – 0.3965 | 3 | 6 | too few sandboxes |
| 11 | E2B | 0.3195 | 0.3115 – 0.344 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 0.4135 | 0.4035 – 0.4915 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 0.4605 | 0.431 – 0.4615 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 27850 | 26510 – 28120 | 3 | 6 | — |
| 2 | boat | 27830 | 27050 – 28670 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 27290 | 27150 – 27610 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 24020 | 23810 – 24430 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 17880 | 12890 – 18240 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 16030 | 14150 – 18820 | 3 | 6 | too few sandboxes |
| 7 | tama | 15950 | 15750 – 18190 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 15720 | 15330 – 17360 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 15620 | 14980 – 17580 | 3 | 6 | too few sandboxes |
| 10 | Daytona (VM) | 11560 | 11290 – 15070 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 10860 | 10450 – 11530 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 10670 | 10620 – 10940 | 3 | 6 | too few sandboxes |
| 13 | E2B | 9296 | 9193 – 10380 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.798 | 1.778 – 1.891 | 3 | 6 | — |
| 2 | boat | 1.799 | 1.744 – 1.849 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 1.833 | 1.811 – 1.841 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 2.083 | 2.047 – 2.101 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 2.797 | 2.742 – 3.885 | 3 | 6 | too few sandboxes |
| 6 | tama | 3.136 | 2.773 – 3.175 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3.157 | 2.658 – 3.594 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3.182 | 2.889 – 3.262 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 3.203 | 2.845 – 3.338 | 3 | 6 | too few sandboxes |
| 10 | Daytona (VM) | 4.503 | 3.322 – 4.678 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 4.605 | 4.338 – 4.787 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 4.697 | 4.574 – 4.784 | 3 | 6 | too few sandboxes |
| 13 | E2B | 5.437 | 4.816 – 5.443 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · boat is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 376.5 | 358 – 430.5 | 3 | 6 | — |
| 2 | boat | 413 | 412 – 414 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 416.5 | 406 – 420 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 452.5 | 449.5 – 455.5 | 3 | 6 | too few sandboxes |
| 5 | Novita | 482.5 | 481.5 – 486.5 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 484 | 482 – 485.5 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 503 | 483 – 516 | 3 | 6 | too few sandboxes |
| 8 | tama | 507 | 506.5 – 508 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 672.5 | 669 – 672.5 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 767.5 | 763.5 – 770.5 | 3 | 6 | too few sandboxes |
| 11 | E2B | 810 | 805 – 815 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 900 | 674 – 915 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 1180 | 1172 – 1184 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.69 | 32.37 – 32.76 | 3 | 6 | — |
| 2 | Blaxel | 37.77 | 35.7 – 38.49 | 3 | 6 | too few sandboxes |
| 3 | Novita | 41.65 | 40.65 – 42.76 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 47.1 | 46.42 – 47.34 | 3 | 6 | too few sandboxes |
| 5 | boat | 47.92 | 47 – 53.07 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 61.93 | 61.26 – 72.07 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 67.41 | 64.46 – 67.42 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 67.5 | 66.98 – 67.74 | 3 | 6 | too few sandboxes |
| 9 | E2B | 74.23 | 73.23 – 74.77 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 81.91 | 68.03 – 82.3 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 86.16 | 79.01 – 86.8 | 3 | 6 | too few sandboxes |
| 12 | tama | 144.3 | 62.79 – 144.6 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 422.4 | 303.6 – 533.1 | 3 | 6 | too few sandboxes |

</details>

## economics

<img src="docs/figures/usd_per_hour.webp" width="960" alt="Hourly cost: 6 environments ranked best-first, with 95% intervals">

### Hourly cost _(headline)_

USD/hr · lower is better

_boat is cheapest · tama is ~2.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.036 | — | 1 | 1 | — |
| 2 | tama | 0.074 | — | 1 | 1 | — |
| 3 | Novita | 0.2333 | — | 1 | 1 | — |
| 4 | Daytona (VM) | 0.3312 | — | 1 | 1 | — |
| 4 | E2B | 0.3312 | — | 1 | 1 | equal values |
| 6 | Runloop | 0.6336 | — | 1 | 1 | — |

## Coverage gaps

41 uncovered results across 5 providers (Blaxel 6, boat 4, Modal (gVisor) 2, Runloop 2, tama 27). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 2 of 6 declared metrics: realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_typecheck (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_test_types |
| boat | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| boat | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| boat | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| boat | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Modal (gVisor) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Runloop | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Runloop | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | network | **failed** | Failed to create sandbox: tama new bench-b289b0e6-89da-45f3-880f-7de08a2a799e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b289b0e6-89da-45f3-880f-7de08a2a799e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | network | **failed** | Failed to create sandbox: tama new bench-177c9bd1-7798-4f4d-817b-70d81deea47b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-177c9bd1-7798-4f4d-817b-70d81deea47b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Failed to create sandbox: tama new bench-bf73cddd-7d1b-44ac-a4ca-c8333f1d515b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-bf73cddd-7d1b-44ac-a4ca-c8333f1d515b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-aca73318-37ea-43ef-88f2-6b72cd4f2f30 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-aca73318-37ea-43ef-88f2-6b72cd4f2f30 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-06d26e30-fada-4835-b3c7-b5179dcc1325 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-06d26e30-fada-4835-b3c7-b5179dcc1325 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-02c20ff8-7242-47cb-a828-20f5771f56ea --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-02c20ff8-7242-47cb-a828-20f5771f56ea failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-85af3a74-3ffb-4d15-8c34-efda69fb466c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-85af3a74-3ffb-4d15-8c34-efda69fb466c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-d539814d-6b8b-4be5-8666-69d03b75c407 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d539814d-6b8b-4be5-8666-69d03b75c407 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-af374ce4-f58b-4934-b23a-b039296eef15 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-af374ce4-f58b-4934-b23a-b039296eef15 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5de49623-2ced-41da-82b5-543e18f853e0 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5de49623-2ced-41da-82b5-543e18f853e0 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-30e045a6-6792-4ef2-8546-256a59bf6b23 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-30e045a6-6792-4ef2-8546-256a59bf6b23 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-761b7197-9fb0-4f7e-aaaf-9328c107edd4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-761b7197-9fb0-4f7e-aaaf-9328c107edd4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-780f3e22-06d8-441b-9a26-2c9a41c1b14a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-780f3e22-06d8-441b-9a26-2c9a41c1b14a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f0e299a2-0791-464e-8206-65a53a34451b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f0e299a2-0791-464e-8206-65a53a34451b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-b87559e0-3148-45c5-8fab-2b8b145bfd86 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b87559e0-3148-45c5-8fab-2b8b145bfd86 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f4298157-4710-4f8f-b1fd-13e9a021c4c8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f4298157-4710-4f8f-b1fd-13e9a021c4c8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d92c7da9-29ec-46ea-918f-c39799b31167 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d92c7da9-29ec-46ea-918f-c39799b31167 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ec7e5cf5-1385-40d0-96e8-1e6fc394302f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ec7e5cf5-1385-40d0-96e8-1e6fc394302f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-0429432e-8f64-43d4-b260-bff8a07a8f18 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0429432e-8f64-43d4-b260-bff8a07a8f18 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-de19cc10-b84c-4de7-be78-efd465e478df --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-de19cc10-b84c-4de7-be78-efd465e478df failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e61f1be2-f51d-4649-aede-80523de43a2b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e61f1be2-f51d-4649-aede-80523de43a2b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-a3952e0e-ba68-41e4-a9d3-46413836ec4a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a3952e0e-ba68-41e4-a9d3-46413836ec4a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d0a1b436-3f58-471c-9b0b-6acbf83a7718 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d0a1b436-3f58-471c-9b0b-6acbf83a7718 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-76311cf8-4cf2-4527-a278-b83762dc1560 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-76311cf8-4cf2-4527-a278-b83762dc1560 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

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
The floor is a property of the design — here 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Blaxel | 0.84 (tied) | 0.79 |
| realworld | Mastra: cold install | Novita | 0.010 | 0.0046 |
| realworld | Mastra: cold install | boat | 0.41 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.55 (tied) | 0.79 |
| realworld | Mastra: cold install | Namespace | 0.18 (tied) | 0.19 |
| realworld | Mastra: cold install | Modal (VM) | 0.10 (tied) | 0.066 |
| realworld | Mastra: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: cold install | E2B | 0.13 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.53 (tied) | 0.35 |
| realworld | Mastra: cold install | Runloop | 0.15 (tied) | 0.0098 |
| realworld | Mastra: cold install | tama | 0.93 (tied) | 0.066 |
| realworld | Mastra: cold install | run.cloud | 0.011 | 0.066 |
| realworld | Better-Auth: build | boat | — | — |
| realworld | Better-Auth: build | Daytona (VM) | 0.020 | 0.19 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.0083 | 0.019 |
| realworld | Better-Auth: build | Blaxel | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: build | Novita | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: build | Modal (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: build | Namespace | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: build | tama | 0.45 (tied) | 0.44 |
| realworld | Better-Auth: build | run.cloud | 0.36 (tied) | 0.14 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Blaxel | 0.98 (tied) | 0.99 |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.84 (tied) | 0.79 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.0083 | 0.0046 |
| realworld | Better-Auth: cold install | boat | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: cold install | E2B | 0.10 (tied) | 0.066 |
| realworld | Better-Auth: cold install | run.cloud | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Runloop | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.0036 | 0.019 |
| realworld | Better-Auth: cold install | tama | 0.031 | 0.066 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.0011 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.0086 | 0.019 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.0048 | <0.001 |
| realworld | Better-Auth: git clone | E2B | 0.028 | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.12 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.79 (tied) | 0.19 |
| realworld | Better-Auth: git clone | boat | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: git clone | run.cloud | 0.55 (tied) | 0.99 |
| realworld | Better-Auth: git clone | Runloop | 0.32 (tied) | 0.019 |
| realworld | Better-Auth: git clone | tama | 0.29 (tied) | 0.14 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.068 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.0068 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.0014 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.024 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.0045 | <0.001 |
| realworld | Better-Auth: lint (Biome) | tama | 0.95 (tied) | 0.89 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.36 (tied) | 0.14 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.010 | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.024 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Novita | <0.001 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0083 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.068 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.028 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.95 (tied) | 0.67 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.54 (tied) | 0.25 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.10 (tied) | 0.019 |
| realworld | Better-Auth: lint format | boat | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.020 | 0.0046 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Novita | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Blaxel | 1.0 (tied) | 0.99 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.010 | <0.001 |
| realworld | Better-Auth: lint format | run.cloud | 0.071 (tied) | 0.019 |
| realworld | Better-Auth: lint format | tama | 0.36 (tied) | 0.25 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.63 (tied) | 0.89 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.68 (tied) | 0.19 |
| realworld | Better-Auth: lint format | E2B | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | boat | 0.80 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Novita | 0.013 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.92 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Blaxel | 1.0 (tied) | 0.99 |
| realworld | Better-Auth: lint packages | Namespace | 0.033 | 0.019 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | run.cloud | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.028 | 0.066 |
| realworld | Better-Auth: lint packages | tama | 0.36 (tied) | 0.14 |
| realworld | Better-Auth: lint packages | E2B | 0.031 | 0.012 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.0048 | 0.0046 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.0045 | 0.019 |
| realworld | Better-Auth: lint spell | Blaxel | 0.033 | 0.066 |
| realworld | Better-Auth: lint spell | Namespace | 0.48 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | Novita | 0.16 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.0083 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | 0.012 | <0.001 |
| realworld | Better-Auth: lint spell | tama | 0.29 (tied) | 0.25 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.73 (tied) | 0.67 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | E2B | 0.039 | 0.0046 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | boat | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Blaxel | 0.0036 | 0.0046 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Novita | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint types | tama | 0.73 (tied) | 0.89 |
| realworld | Better-Auth: lint types | Namespace | 0.048 | 0.030 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.039 | 0.066 |
| realworld | Better-Auth: lint types | run.cloud | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint types | E2B | 0.41 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.0036 | 0.019 |
| realworld | Better-Auth: typecheck | Novita | 0.045 | 0.019 |
| realworld | Better-Auth: typecheck | Blaxel | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Namespace | 0.13 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | tama | 0.45 (tied) | 0.44 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.29 (tied) | 0.44 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | run.cloud | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | E2B | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.89 (tied) | 0.43 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.48 (tied) | 0.066 |
| realworld | Mastra: build:core | Blaxel | 0.93 (tied) | 0.19 |
| realworld | Mastra: build:core | Modal (VM) | 0.0023 | <0.001 |
| realworld | Mastra: build:core | tama | 0.089 (tied) | 0.066 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.21 (tied) | 0.091 |
| realworld | Mastra: build:core | E2B | 0.98 (tied) | 0.68 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.18 (tied) | 0.0046 |
| realworld | Mastra: git clone | Blaxel | 0.50 (tied) | 0.19 |
| realworld | Mastra: git clone | Modal (VM) | 0.14 (tied) | 0.19 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.66 (tied) | 0.19 |
| realworld | Mastra: git clone | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.60 (tied) | 0.19 |
| realworld | Mastra: git clone | Novita | 0.29 (tied) | 0.066 |
| realworld | Mastra: git clone | boat | 0.38 (tied) | 0.43 |
| realworld | Mastra: git clone | tama | 0.88 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.48 (tied) | 0.58 |
| realworld | Mastra: git clone | E2B | 0.93 (tied) | 0.35 |
| realworld | Mastra: git clone | Runloop | 0.020 | 0.066 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.0014 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.71 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | 1.0 (tied) | 0.066 |
| realworld | Mastra: lint:format | Namespace | 0.18 (tied) | 0.0046 |
| realworld | Mastra: lint:format | Modal (VM) | 0.045 | 0.066 |
| realworld | Mastra: lint:format | tama | 0.41 (tied) | 0.43 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.74 (tied) | 0.58 |
| realworld | Mastra: lint:format | E2B | 0.53 (tied) | 0.11 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | — | — |
| realworld | Mastra: test:core | Namespace | 0.22 (tied) | 0.066 |
| realworld | Mastra: test:core | Blaxel | 0.12 (tied) | 0.26 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.57 (tied) | 0.075 |
| realworld | Mastra: test:core | Novita | 0.51 (tied) | 0.019 |
| realworld | Mastra: test:core | Modal (VM) | 0.039 | <0.001 |
| realworld | Mastra: test:core | tama | 0.84 (tied) | 0.43 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.16 (tied) | 0.0046 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.0086 | <0.001 |
| realworld | Mastra: test:core | E2B | 0.98 (tied) | 0.35 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.060 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Novita | 0.24 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.41 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.38 (tied) | 0.43 |
| realworld | OpenClaw: cold install | run.cloud | 0.0036 | <0.001 |
| realworld | OpenClaw: cold install | E2B | 0.18 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Runloop | 0.24 (tied) | 0.066 |
| realworld | OpenClaw: cold install | boat | — | — |
| realworld | OpenClaw: cold install | Modal (gVisor) | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Namespace | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.0018 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.98 (tied) | 0.43 |
| realworld | OpenClaw: git clone | E2B | 0.014 | <0.001 |
| realworld | OpenClaw: git clone | Runloop | <0.001 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.16 (tied) | 0.066 |
| realworld | OpenClaw: git clone | run.cloud | 0.086 (tied) | 0.066 |
| realworld | OpenClaw: git clone | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (all extensions) | Namespace | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.078 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.0014 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.44 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.024 | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.052 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Runloop | 0.67 (tied) | 0.43 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.98 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.22 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.32 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.052 (tied) | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.0036 | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.44 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 0.11 (tied) | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.060 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.0083 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.014 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.48 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.0056 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.44 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.017 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.93 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.93 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.16 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.98 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.0032 | 0.0028 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.84 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.0056 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.93 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.0014 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.76 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.045 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.71 (tied) | 0.79 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Novita | 0.40 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Namespace | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | tama | 0.10 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Runloop | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | E2B | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.60 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.70 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | tama | 1.0 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (VM) | 0.40 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Runloop | 1.0 (too few sandboxes) | 1.0 |
| memory | STREAM Triad | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Namespace | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | tama | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Novita | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Add | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Runloop | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Namespace | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | tama | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Namespace | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | boat | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | tama | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Runloop | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Daytona (VM) | — | — |
| network | iperf3 WAN download | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | E2B | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Namespace | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 WAN download | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Vercel Sandbox | — | — |
| network | iperf3 WAN upload | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | boat | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | boat | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Namespace | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | boat | — | — |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | boat | — | — |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 1.0 |
| system | pgbench RW (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | Namespace | — | — |
| system | PyBench | boat | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| system | PyBench | tama | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | boat | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | tama | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

