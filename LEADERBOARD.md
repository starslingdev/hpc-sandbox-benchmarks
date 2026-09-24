# Sandbox provider leaderboard

Run [`35949832015`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/35949832015) · commit [`f85063fb53e8bd4b9a8d75d88fc6033ffe573c21`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/f85063fb53e8bd4b9a8d75d88fc6033ffe573c21) ·
dataset [`data/dataset/runs/35949832015.json`](data/dataset/runs/35949832015.json) · generated 2026-09-24T04:58:21.070Z

**Partial results — incomplete experiment.** 644 of 702 planned cells complete; 58 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:59b52455e576bd2b3893d82f990b80f629375a6b0d4f72873ad4514de988f728`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **595 metric records**
backed by **4984 retained trial observations**, across **48 metrics** and
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

Each provider's isolation technology — the **declared** technology is authoritative. **Detected**
uses the in-sandbox system probe's runtime, boundary class, and confidence when available,
with the setup probe as a fallback. Older runs may have a coarse setup result. A VM may sit
beneath a container; `kvm` alone cannot identify the sandbox's innermost boundary.
Detection is a cross-check, not a guarantee
of provider architecture.

| Provider | Isolation (declared) | Detected |
| --- | --- | --- |
| Blaxel | microVM | firecracker (microVM, confirmed) |
| boat | KVM virtual machine | qemu-kvm (vm, strong) |
| Daytona (VM) | microVM (Linux VM) | firecracker (microVM, confirmed) |
| E2B | Firecracker microVM | firecracker (microVM, confirmed) |
| Microsandbox Cloud | libkrun microVM (cloud) | libkrun (microVM, strong) |
| Modal (gVisor) | gVisor container | gvisor (user-kernel, confirmed) |
| Modal (VM) | microVM (VM runtime) | cloud-hypervisor (microVM, confirmed) |
| Namespace | microVM (dedicated instance) | oci-container (container, likely) on firecracker |
| Novita | microVM | firecracker (microVM, confirmed) |
| run.cloud | Firecracker microVM | firecracker (microVM, confirmed) |
| Runloop | microVM | cloud-hypervisor (microVM, confirmed) |
| tama | container (shared kernel) | oci-container (container, strong) |
| Vercel Sandbox | Firecracker microVM | firecracker (microVM, confirmed) |

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **64 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

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

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 36.81 | 35.72 – 38.91 | 12 | 12 | — |
| 1 | Daytona (VM) | 38.02 | 37.5 – 38.39 | 12 | 12 | tied |
| 3 | Namespace | 41.03 | 39.37 – 42.25 | 12 | 12 | — |
| 3 | Novita | 42.15 | 40.43 – 43.2 | 12 | 12 | tied |
| 3 | boat | 44.24 | 39.77 – 47.16 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 45 | 42.12 – 50.84 | 12 | 12 | tied |
| 7 | Modal (VM) | 53.45 | 51.16 – 56.91 | 12 | 12 | — |
| 8 | Vercel Sandbox | 56.72 | 55.86 – 76.07 | 12 | 12 | — |
| 8 | E2B | 72.26 | 66.43 – 74.34 | 12 | 12 | tied |
| 10 | Runloop | 83.33 | 81.46 – 84.28 | 12 | 12 | — |
| 10 | tama | 87.37 | 80.52 – 104.9 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 97.09 | 88.61 – 108.7 | 12 | 12 | tied |
| 13 | run.cloud | 118.7 | 107.3 – 149 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 53.93 | 52.03 – 54.94 | 12 | 12 | — |
| 2 | Namespace | 60.38 | 59.76 – 61.14 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 62.94 | 59.8 – 72.33 | 12 | 12 | tied |
| 2 | Blaxel | 63.48 | 61.82 – 72.24 | 12 | 12 | tied |
| 2 | Novita | 66.02 | 64.14 – 66.99 | 12 | 12 | tied |
| 6 | Modal (VM) | 72.84 | 71.44 – 77.07 | 12 | 12 | — |
| 6 | tama | 82.96 | 65.92 – 85.05 | 4 | 4 | tied |
| 6 | run.cloud | 89.24 | 73.19 – 93.92 | 12 | 12 | tied |
| 6 | boat | 89.49 | 48.09 – 209.6 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 92.61 | 91.3 – 98.6 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 97.51 | 93.75 – 140.4 | 12 | 12 | — |
| 11 | E2B | 103.9 | 97.54 – 110.9 | 12 | 12 | tied |
| 13 | Runloop | 136.1 | 130.8 – 139.6 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 11.3 | 10.78 – 12.33 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.14 | 11.82 – 12.92 | 12 | 12 | — |
| 2 | Blaxel | 12.14 | 11.87 – 12.26 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 13.69 | 13.43 – 13.88 | 12 | 12 | — |
| 5 | Novita | 14.23 | 13.88 – 14.77 | 12 | 12 | — |
| 6 | run.cloud | 16.9 | 15.57 – 24.45 | 12 | 12 | — |
| 6 | Modal (VM) | 19.19 | 18.55 – 19.83 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 20.67 | 19.56 – 22.31 | 12 | 12 | — |
| 8 | E2B | 21.65 | 20.71 – 23.2 | 12 | 12 | tied |
| 8 | boat | 22.04 | 13.21 – 48.72 | 12 | 12 | tied |
| 8 | Runloop | 22.44 | 21.22 – 23.61 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 25.38 | 24.69 – 38.56 | 12 | 12 | — |
| 12 | tama | 30.09 | 28.67 – 30.36 | 4 | 4 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6485 | 0.6215 – 0.677 | 12 | 12 | — |
| 2 | Blaxel | 0.7335 | 0.7095 – 0.7615 | 12 | 12 | — |
| 3 | Modal (VM) | 0.9145 | 0.8345 – 1.619 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.9685 | 0.912 – 1.086 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 1.071 | 1.051 – 1.139 | 12 | 12 | — |
| 6 | Modal (gVisor) | 1.405 | 1.341 – 2.544 | 12 | 12 | — |
| 6 | Daytona (VM) | 1.47 | 1.401 – 1.534 | 12 | 12 | tied |
| 8 | E2B | 1.59 | 1.478 – 1.776 | 12 | 12 | — |
| 9 | Novita | 1.923 | 1.619 – 2.175 | 12 | 12 | — |
| 9 | boat | 2.003 | 1.708 – 2.396 | 12 | 12 | tied |
| 9 | run.cloud | 2.211 | 2.038 – 2.683 | 12 | 12 | tied |
| 9 | tama | 2.287 | 1.429 – 3.919 | 4 | 4 | tied |
| 9 | Runloop | 2.437 | 1.67 – 3.764 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.845 | 2.771 – 2.912 | 12 | 12 | — |
| 1 | Namespace | 2.894 | 2.84 – 2.978 | 12 | 12 | tied |
| 3 | Novita | 3.171 | 3.138 – 3.248 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.228 | 3 – 3.58 | 12 | 12 | tied |
| 3 | Blaxel | 3.252 | 3.149 – 3.516 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.796 | 3.748 – 3.873 | 12 | 12 | — |
| 6 | run.cloud | 4.131 | 3.715 – 4.829 | 12 | 12 | tied |
| 6 | boat | 4.272 | 2.38 – 9.545 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 4.398 | 4.27 – 4.588 | 12 | 12 | tied |
| 6 | E2B | 5.015 | 4.678 – 5.296 | 12 | 12 | tied |
| 6 | tama | 5.234 | 4.605 – 6.198 | 4 | 4 | tied |
| 12 | Runloop | 6.396 | 6.251 – 6.698 | 12 | 12 | — |
| 13 | Modal (gVisor) | 8.107 | 7.855 – 11.2 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM), Namespace, Microsandbox Cloud, Blaxel and Novita share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 9.32 | 9.204 – 9.492 | 12 | 12 | — |
| 1 | Namespace | 9.494 | 9.349 – 9.724 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 10.41 | 9.426 – 11.91 | 12 | 12 | tied |
| 1 | Blaxel | 10.48 | 10.05 – 11.38 | 12 | 12 | tied |
| 1 | Novita | 11.09 | 10.89 – 11.21 | 12 | 12 | tied |
| 6 | Modal (VM) | 12.97 | 12.53 – 13.42 | 12 | 12 | — |
| 6 | run.cloud | 14.1 | 13.52 – 14.48 | 12 | 12 | tied |
| 6 | tama | 14.95 | 13.68 – 17.26 | 4 | 4 | tied |
| 6 | Vercel Sandbox | 15.31 | 15.01 – 16.36 | 12 | 12 | tied |
| 6 | boat | 16.88 | 7.621 – 38.47 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 17.25 | 16.96 – 31.04 | 12 | 12 | tied |
| 6 | E2B | 19.74 | 18.19 – 20.2 | 12 | 12 | tied |
| 13 | Runloop | 21.72 | 21.01 – 22.85 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.456 | 2.417 – 2.561 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.558 | 2.524 – 2.615 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.756 | 2.635 – 3.474 | 12 | 12 | — |
| 3 | Novita | 2.958 | 2.9 – 3.034 | 12 | 12 | tied |
| 3 | Blaxel | 3.028 | 2.902 – 3.291 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.553 | 3.486 – 3.672 | 12 | 12 | — |
| 6 | run.cloud | 3.66 | 3.438 – 4.01 | 12 | 12 | tied |
| 6 | tama | 4.231 | 3.872 – 5.825 | 4 | 4 | tied |
| 6 | Modal (gVisor) | 4.423 | 4.311 – 6.729 | 12 | 12 | tied |
| 6 | boat | 4.511 | 2.255 – 9.948 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 4.538 | 4.444 – 4.748 | 12 | 12 | tied |
| 6 | E2B | 5.405 | 4.764 – 5.575 | 12 | 12 | tied |
| 13 | Runloop | 6.693 | 6.31 – 6.901 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.325 | 2.295 – 2.428 | 12 | 12 | — |
| 1 | Namespace | 2.406 | 2.362 – 2.478 | 12 | 12 | tied |
| 3 | Novita | 2.651 | 2.585 – 2.725 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.69 | 2.529 – 3.066 | 12 | 12 | tied |
| 3 | Blaxel | 2.711 | 2.479 – 2.907 | 12 | 12 | tied |
| 3 | tama | 3.103 | 2.422 – 3.197 | 4 | 4 | tied |
| 3 | Modal (VM) | 3.213 | 3.169 – 3.296 | 12 | 12 | tied |
| 3 | run.cloud | 3.588 | 3.204 – 4.098 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 3.794 | 3.715 – 3.89 | 12 | 12 | tied |
| 3 | boat | 4.146 | 2.317 – 9.498 | 12 | 12 | tied |
| 3 | E2B | 4.29 | 3.994 – 4.436 | 12 | 12 | tied |
| 12 | Runloop | 6.361 | 6.093 – 6.636 | 12 | 12 | — |
| 13 | Modal (gVisor) | 6.696 | 6.356 – 9.341 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.986 | 5.872 – 6.167 | 12 | 12 | — |
| 2 | Daytona (VM) | 6.22 | 6.1 – 6.5 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 6.903 | 6.554 – 8.283 | 12 | 12 | — |
| 3 | Blaxel | 7.418 | 6.941 – 8.12 | 12 | 12 | tied |
| 3 | Novita | 7.64 | 7.393 – 7.812 | 12 | 12 | tied |
| 6 | Modal (VM) | 8.76 | 8.642 – 9.087 | 12 | 12 | — |
| 7 | run.cloud | 10.45 | 9.96 – 11.59 | 12 | 12 | — |
| 7 | tama | 10.71 | 10.14 – 12.37 | 4 | 4 | tied |
| 7 | Modal (gVisor) | 11.46 | 10.88 – 16.81 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 11.65 | 11.38 – 11.94 | 12 | 12 | tied |
| 7 | boat | 11.77 | 5.42 – 28.34 | 12 | 12 | tied |
| 7 | E2B | 13.09 | 12.17 – 14.49 | 12 | 12 | tied |
| 13 | Runloop | 16.33 | 15.4 – 17.02 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.36 | 24.18 – 25.65 | 12 | 12 | — |
| 2 | Blaxel | 30.3 | 27.48 – 33.89 | 12 | 12 | — |
| 2 | Novita | 30.99 | 30.23 – 31.62 | 12 | 12 | tied |
| 2 | Namespace | 31.78 | 30.94 – 33.09 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 32.48 | 30.7 – 40.14 | 12 | 12 | tied |
| 2 | Modal (VM) | 34.57 | 33.58 – 36.7 | 12 | 12 | tied |
| 2 | tama | 35.71 | 17.71 – 40.76 | 4 | 4 | tied |
| 2 | boat | 43.29 | 24.1 – 105.1 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 45.7 | 45.07 – 49.18 | 12 | 12 | tied |
| 10 | run.cloud | 51.41 | 50.29 – 54.33 | 12 | 12 | — |
| 10 | E2B | 53.97 | 46.89 – 58.37 | 12 | 12 | tied |
| 12 | Runloop | 65.43 | 60.46 – 68.92 | 12 | 12 | — |
| 13 | Modal (gVisor) | 93.23 | 90.82 – 116 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 37.85 | 37.1 – 38.84 | 12 | 12 | — |
| 2 | Namespace | 40.39 | 39.43 – 41.06 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 41.85 | 39.86 – 49.9 | 12 | 12 | tied |
| 2 | Novita | 44.1 | 42.45 – 44.7 | 12 | 12 | tied |
| 2 | Blaxel | 44.81 | 42.02 – 49.05 | 12 | 12 | tied |
| 6 | Modal (VM) | 50.79 | 49.75 – 54.56 | 12 | 12 | — |
| 6 | tama | 53.29 | 50.41 – 66.28 | 4 | 4 | tied |
| 6 | boat | 61.94 | 30.9 – 151.2 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 64 | 57.93 – 84.46 | 12 | 12 | tied |
| 6 | run.cloud | 68.26 | 60.02 – 76.61 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 72.01 | 67.79 – 75.42 | 12 | 12 | tied |
| 6 | E2B | 75.35 | 70.1 – 88.18 | 12 | 12 | tied |
| 13 | Runloop | 99.65 | 95.81 – 101.3 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 55.57 | 54.29 – 59.62 | 12 | 12 | — |
| 2 | Daytona (VM) | 65.8 | 65.12 – 67.45 | 12 | 12 | — |
| 3 | Namespace | 69.61 | 68.73 – 70.3 | 12 | 12 | — |
| 4 | Blaxel | 74.68 | 71.15 – 80.42 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 75.83 | 70.53 – 82.27 | 12 | 12 | tied |
| 4 | Novita | 76.87 | 75.81 – 77.14 | 12 | 12 | tied |
| 7 | Modal (VM) | 94.65 | 92.51 – 97.95 | 12 | 12 | — |
| 7 | tama | 95.4 | 94.43 – 98.78 | 12 | 12 | tied |
| 9 | run.cloud | 107.3 | 104.9 – 110.4 | 12 | 12 | — |
| 10 | Vercel Sandbox | 120.8 | 117.3 – 162.1 | 12 | 12 | — |
| 10 | E2B | 129.8 | 125.1 – 136.6 | 12 | 12 | tied |
| 12 | Runloop | 168.8 | 162 – 174.5 | 12 | 12 | — |
| 12 | Modal (gVisor) | 182 | 153.9 – 188.8 | 12 | 12 | tied |

### Mastra: git clone

Seconds · lower is better

_Namespace leads · Modal (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.769 | 1.647 – 2.446 | 12 | 12 | — |
| 2 | Modal (VM) | 2.331 | 2.187 – 2.84 | 12 | 12 | — |
| 2 | Blaxel | 2.342 | 1.655 – 2.539 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 2.423 | 2.114 – 2.695 | 12 | 12 | tied |
| 2 | Daytona (VM) | 2.968 | 2.319 – 3.633 | 12 | 12 | tied |
| 2 | boat | 2.994 | 2.857 – 3.319 | 12 | 12 | tied |
| 2 | run.cloud | 3 | 2.985 – 3.52 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 3.242 | 3.154 – 3.619 | 12 | 12 | — |
| 9 | tama | 3.58 | 3.446 – 6.716 | 12 | 12 | — |
| 9 | Novita | 3.734 | 3.337 – 3.998 | 12 | 12 | tied |
| 11 | E2B | 4.338 | 4.171 – 6.226 | 12 | 12 | — |
| 11 | Runloop | 4.984 | 4.319 – 6.847 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 6.407 | 5.123 – 6.973 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 68.16 | 67.19 – 80.8 | 12 | 12 | — |
| 2 | Namespace | 82 | 81.19 – 84.55 | 12 | 12 | — |
| 2 | Daytona (VM) | 83.11 | 81.67 – 84.2 | 12 | 12 | tied |
| 4 | Blaxel | 89.55 | 87.66 – 104.2 | 12 | 12 | — |
| 4 | Novita | 94.34 | 93.61 – 97.89 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 96.84 | 86.13 – 128.4 | 12 | 12 | tied |
| 4 | tama | 116.6 | 112.4 – 120.6 | 12 | 12 | tied |
| 4 | Modal (VM) | 117.6 | 113.8 – 118.7 | 12 | 12 | tied |
| 9 | run.cloud | 141.1 | 140.3 – 142.8 | 12 | 12 | — |
| 10 | Vercel Sandbox | 147 | 143.2 – 194.6 | 12 | 12 | — |
| 10 | E2B | 171.6 | 151.4 – 183.8 | 12 | 12 | tied |
| 12 | Runloop | 210.9 | 202.3 – 216.3 | 12 | 12 | — |
| 12 | Modal (gVisor) | 213.6 | 180.4 – 224.4 | 12 | 12 | tied |

### Mastra: test:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 853.5 | 849.5 – 871.4 | 11 | 11 | — |
| 2 | Daytona (VM) | 905.9 | 894.6 – 913.8 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 936.7 | 923.5 – 997.7 | 12 | 12 | — |
| 3 | Blaxel | 939.5 | 927.9 – 973.4 | 12 | 12 | tied |
| 5 | Novita | 1004 | 996.2 – 1010 | 12 | 12 | — |
| 6 | Modal (VM) | 1127 | 1106 – 1153 | 12 | 12 | — |
| 6 | tama | 1131 | 1078 – 1139 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 1305 | 1283 – 1634 | 12 | 12 | — |
| 8 | run.cloud | 1342 | 1320 – 1366 | 12 | 12 | tied |
| 10 | E2B | 1471 | 1412 – 1504 | 12 | 12 | — |
| 11 | Runloop | 1707 | 1640 – 1722 | 12 | 12 | — |
| 11 | Modal (gVisor) | 2265 | 1426 – 2361 | 9 | 9 | tied |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.88 | 11.51 – 12.39 | 11 | 11 | — |
| 2 | Daytona (VM) | 13.21 | 12.92 – 14.98 | 12 | 12 | — |
| 2 | Namespace | 13.55 | 12.82 – 14.37 | 12 | 12 | tied |
| 4 | Novita | 15.45 | 14.61 – 16.21 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 15.82 | 15.48 – 16.17 | 12 | 12 | tied |
| 4 | Modal (VM) | 17.91 | 16.02 – 18.53 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 18.81 | 18.22 – 20.26 | 12 | 12 | — |
| 7 | run.cloud | 20.41 | 19.55 – 23.9 | 12 | 12 | tied |
| 7 | E2B | 21.41 | 19.87 – 23.49 | 12 | 12 | tied |
| 7 | Runloop | 22.67 | 20.13 – 22.89 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 24.59 | 20.35 – 29.87 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace leads · Microsandbox Cloud is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.878 | 2.848 – 3.285 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 3.165 | 3.087 – 3.554 | 12 | 12 | — |
| 2 | Daytona (VM) | 3.192 | 2.976 – 3.372 | 12 | 12 | tied |
| 2 | Modal (VM) | 3.442 | 3.236 – 3.99 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.774 | 3.715 – 4.008 | 12 | 12 | — |
| 5 | Novita | 4.437 | 3.796 – 4.498 | 12 | 12 | tied |
| 7 | Runloop | 5.385 | 4.882 – 6.784 | 12 | 12 | — |
| 7 | Blaxel | 5.608 | 2.54 – 6.752 | 11 | 11 | tied |
| 7 | E2B | 5.886 | 4.803 – 8.715 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 8.113 | 6.006 – 10.89 | 12 | 12 | tied |
| 7 | run.cloud | 9.971 | 9.726 – 10.82 | 12 | 12 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_Daytona (VM) leads · Microsandbox Cloud is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 146.8 | 144.5 – 154.6 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 158.9 | 152.4 – 162.6 | 12 | 12 | — |
| 2 | Blaxel | 165.7 | 157.4 – 167.7 | 11 | 11 | tied |
| 2 | Namespace | 174.6 | 143.4 – 199 | 12 | 12 | tied |
| 2 | Novita | 178 | 174.2 – 181 | 12 | 12 | tied |
| 2 | Modal (VM) | 191.9 | 176 – 203.7 | 12 | 12 | tied |
| 2 | run.cloud | 217.6 | 170.6 – 241.7 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 232.1 | 226.4 – 236.8 | 12 | 12 | tied |
| 2 | Modal (gVisor) | 252.5 | 215.6 – 372.1 | 12 | 12 | tied |
| 2 | E2B | 302.9 | 279.5 – 314 | 12 | 12 | tied |
| 2 | Runloop | 313 | 279.9 – 325.3 | 12 | 12 | tied |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_Daytona (VM), Namespace and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 284.4 | 277.8 – 304.1 | 12 | 12 | — |
| 1 | Namespace | 299.1 | 283.9 – 329.6 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 299.6 | 279.2 – 311 | 12 | 12 | tied |
| 4 | Blaxel | 314.8 | 307.2 – 318.4 | 11 | 11 | — |
| 5 | Novita | 347.6 | 342.7 – 351.7 | 12 | 12 | — |
| 5 | Modal (VM) | 361.7 | 334.5 – 377.6 | 12 | 12 | tied |
| 7 | run.cloud | 403 | 397.7 – 404.9 | 12 | 12 | — |
| 8 | Vercel Sandbox | 421.3 | 415.6 – 427 | 12 | 12 | — |
| 8 | Modal (gVisor) | 465.6 | 395.8 – 645.4 | 12 | 12 | tied |
| 8 | Runloop | 575.8 | 516.7 – 601.7 | 12 | 12 | tied |
| 8 | E2B | 599.6 | 523.2 – 614.6 | 12 | 12 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 94.24 | 89.59 – 98.26 | 12 | 12 | — |
| 2 | Blaxel | 107.4 | 103.9 – 110 | 11 | 11 | — |
| 2 | Microsandbox Cloud | 107.5 | 105.9 – 115.1 | 12 | 12 | tied |
| 2 | Novita | 114.1 | 110.6 – 116 | 12 | 12 | tied |
| 2 | Namespace | 116.4 | 105.2 – 124.4 | 12 | 12 | tied |
| 2 | Modal (VM) | 121.4 | 106.3 – 136.9 | 12 | 12 | tied |
| 2 | run.cloud | 126.3 | 120.8 – 163.2 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 154 | 150.1 – 156.6 | 12 | 12 | tied |
| 9 | E2B | 186.1 | 164.6 – 201.3 | 12 | 12 | — |
| 9 | Modal (gVisor) | 188.1 | 131.8 – 288.7 | 12 | 12 | tied |
| 9 | Runloop | 214.5 | 187.9 – 223.4 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 15.91 | 15.33 – 16.43 | 12 | 12 | — |
| 2 | Blaxel | 17.64 | 16.45 – 18.22 | 11 | 11 | — |
| 2 | Microsandbox Cloud | 18.05 | 17.52 – 18.85 | 12 | 12 | tied |
| 2 | Namespace | 20.07 | 18.11 – 21.79 | 12 | 12 | tied |
| 5 | Novita | 21.67 | 21.02 – 22.17 | 12 | 12 | — |
| 5 | run.cloud | 21.73 | 20.28 – 28.37 | 12 | 12 | tied |
| 5 | Modal (VM) | 22.52 | 18.57 – 23.7 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 26.79 | 26.15 – 28 | 12 | 12 | — |
| 8 | Modal (gVisor) | 27.43 | 21.77 – 46.15 | 12 | 12 | tied |
| 8 | Runloop | 35.91 | 33.45 – 37.18 | 12 | 12 | tied |
| 8 | E2B | 36.52 | 34.99 – 38 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat leads · ~1.2× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 27.55 | 27.46 – 28.14 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 22.87 | 22.63 – 23.32 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 21.55 | 15.7 – 21.84 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 21.45 | 18.57 – 21.59 | 3 | 6 | too few sandboxes |
| 5 | Novita | 19.44 | 18.91 – 20.13 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 19.34 | 18.91 – 20.23 | 3 | 6 | too few sandboxes |
| 7 | tama | 17.6 | 6.24 – 17.8 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 15.56 | 12.18 – 17 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 12.98 | 12.86 – 13.11 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 12.37 | 12.12 – 13.51 | 3 | 6 | too few sandboxes |
| 11 | E2B | 10.62 | 8.935 – 12.6 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8.88 | 8.84 – 11.13 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 8.545 | 8.405 – 13.14 | 3 | 6 | too few sandboxes |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1150 | 1120 – 1230 | 3 | 6 | — |
| 2 | Novita | 969.9 | 956.3 – 985.7 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 861.4 | 860.9 – 906 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 812.1 | 807.9 – 844.1 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 790.6 | 749.2 – 823.1 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 737.7 | 692.6 – 747.1 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 696.3 | 612.9 – 702.5 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 645.4 | 641.2 – 648 | 3 | 6 | too few sandboxes |
| 9 | boat | 499.6 | 445.1 – 550.5 | 3 | 6 | too few sandboxes |
| 10 | tama | 479.2 | 358.6 – 497.5 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 455.1 | 445.6 – 790.6 | 3 | 6 | too few sandboxes |
| 12 | E2B | 234.9 | 234.9 – 239.6 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 103 | 99.46 – 745.5 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Namespace leads · ~1.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 70700 | 66600 – 70800 | 3 | 6 | — |
| 2 | Daytona (VM) | 52300 | 51600 – 54250 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 49150 | 47950 – 59100 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 39900 | 39300 – 50950 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 38150 | 37350 – 39100 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 32150 | 30100 – 125000 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 28050 | 27950 – 30700 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 16400 | 16050 – 26050 | 3 | 6 | too few sandboxes |
| 9 | Novita | 16050 | 15900 – 16550 | 3 | 6 | too few sandboxes |
| 10 | tama | 14500 | 14400 – 15200 | 3 | 6 | too few sandboxes |
| 11 | E2B | 9221 | 8517 – 9851 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8015 | 7585 – 8147 | 3 | 6 | too few sandboxes |
| 13 | boat | 6749 | 6725 – 7712 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Namespace leads · ~1.3× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 289.4 | 273.2 – 289.9 | 3 | 6 | — |
| 2 | Daytona (VM) | 214.4 | 211.3 – 222.3 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 201.3 | 196.1 – 241.7 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 163.1 | 161 – 208.7 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 156.2 | 153.1 – 159.9 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 131.6 | 123.2 – 512.2 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 114.8 | 114.3 – 125.8 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 67.27 | 65.69 – 106.6 | 3 | 6 | too few sandboxes |
| 9 | Novita | 65.85 | 64.96 – 67.69 | 3 | 6 | too few sandboxes |
| 10 | tama | 59.4 | 58.98 – 62.29 | 3 | 6 | too few sandboxes |
| 11 | E2B | 37.8 | 34.92 – 40.37 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 32.82 | 31.09 – 33.34 | 3 | 6 | too few sandboxes |
| 13 | boat | 27.63 | 27.53 – 31.61 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 281000 | 273500 – 300500 | 3 | 6 | — |
| 2 | Novita | 236500 | 233500 – 240500 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 210500 | 210000 – 221000 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 198000 | 197000 – 206000 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 193000 | 182500 – 201000 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 180500 | 169500 – 182000 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 169500 | 150000 – 171500 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 157500 | 157000 – 158000 | 3 | 6 | too few sandboxes |
| 9 | boat | 122000 | 108500 – 134500 | 3 | 6 | too few sandboxes |
| 10 | tama | 117000 | 87400 – 121500 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 111000 | 108500 – 193000 | 3 | 6 | too few sandboxes |
| 12 | E2B | 57400 | 57400 – 58400 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 25200 | 24250 – 182000 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 18450 | 16500 – 46300 | 3 | 6 | — |
| 2 | Daytona (VM) | 11350 | 10500 – 12150 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 10900 | 7767 – 12100 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5128 | 4806 – 6027 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 4824 | 4711 – 6179 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4400 | 4343 – 4434 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3597 | 3583 – 3624 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3100 | 3042 – 3111 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2024 | 1849 – 2033 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1835 | 1795 – 4363 | 3 | 6 | too few sandboxes |
| 11 | boat | 1156 | 875.5 – 1241 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599.5 | 599.5 – 599.5 | 3 | 6 | too few sandboxes |
| 13 | tama | 582.5 | 499 – 695 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 19330 | 17340 – 48530 | 3 | 6 | — |
| 2 | Daytona (VM) | 11920 | 11010 – 12720 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 11440 | 8145 – 12670 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5379 | 5042 – 6321 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 5059 | 4941 – 6481 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4615 | 4556 – 4650 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3773 | 3759 – 3802 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3252 | 3191 – 3263 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2123 | 1940 – 2134 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1926 | 1883 – 4577 | 3 | 6 | too few sandboxes |
| 11 | boat | 1214 | 919.6 – 1302 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.7 | 630.2 – 630.7 | 3 | 6 | too few sandboxes |
| 13 | tama | 612.9 | 525.3 – 730.3 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5255 | 4502 – 5318 | 3 | 6 | — |
| 2 | Namespace | 4294 | 4011 – 4364 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 3877 | 3779 – 4936 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3660 | 3274 – 4428 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3545 | 3487 – 3546 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3145 | 3079 – 3174 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 3121 | 3117 – 9809 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2204 | 2202 – 2357 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 1777 | 1751 – 1780 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1477 | 1439 – 1603 | 3 | 6 | too few sandboxes |
| 11 | boat | 938.5 | 859 – 1258 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599.5 | 591 – 606.5 | 3 | 6 | too few sandboxes |
| 13 | tama | 403 | 383 – 484 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5512 | 4723 – 5578 | 3 | 6 | — |
| 2 | Namespace | 4504 | 4207 – 4578 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4067 | 3964 – 5177 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3839 | 3434 – 4645 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3718 | 3657 – 3719 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3298 | 3230 – 3330 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 3274 | 3270 – 10310 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2312 | 2310 – 2473 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 1865 | 1838 – 1868 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1550 | 1510 – 1682 | 3 | 6 | too few sandboxes |
| 11 | boat | 985.7 | 902.3 – 1320 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.2 | 621.3 – 638.1 | 3 | 6 | too few sandboxes |
| 13 | tama | 424.1 | 403.7 – 509.6 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.52 | 22.63 – 24.93 | 3 | 6 | — |
| 2 | Blaxel | 20.05 | 20 – 20.17 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 13.98 | 13.93 – 14.05 | 3 | 6 | too few sandboxes |
| 4 | Novita | 12.14 | 12.12 – 12.16 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 10.43 | 10.22 – 11.11 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 8.52 | 8.425 – 8.54 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 7.835 | 7.19 – 28.51 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 7.62 | 7.605 – 7.64 | 3 | 6 | too few sandboxes |
| 9 | tama | 6.875 | 4.025 – 6.92 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 5.16 | 5.12 – 5.19 | 3 | 6 | too few sandboxes |
| 11 | boat | 3.545 | 2.955 – 3.755 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 2.87 | 2.72 – 4.26 | 3 | 6 | too few sandboxes |
| 13 | E2B | 1.445 | 1.33 – 1.545 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~2.0× Modal (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 179600 | 178900 – 180000 | 3 | 6 | — |
| 2 | Modal (VM) | 90600 | 42250 – 155400 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 63380 | 60200 – 70930 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 57120 | 56400 – 72580 | 3 | 6 | too few sandboxes |
| 5 | Novita | 53640 | 51080 – 53840 | 3 | 6 | too few sandboxes |
| 6 | tama | 53040 | 51060 – 120700 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 53030 | 47420 – 54440 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 51590 | 45130 – 51970 | 3 | 6 | too few sandboxes |
| 9 | E2B | 50880 | 47770 – 55020 | 3 | 6 | too few sandboxes |
| 10 | boat | 45670 | 32940 – 55770 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 41670 | 39620 – 44080 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 31950 | 28147 – 32900 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~2.0× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 179000 | 178300 – 179400 | 3 | 6 | — |
| 2 | Modal (VM) | 90290 | 44480 – 155600 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 60890 | 57890 – 71480 | 3 | 6 | too few sandboxes |
| 4 | tama | 59990 | 54420 – 103200 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57070 | 56350 – 72430 | 3 | 6 | too few sandboxes |
| 6 | Novita | 53570 | 50900 – 53810 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 52730 | 46520 – 54320 | 3 | 6 | too few sandboxes |
| 8 | E2B | 50990 | 47800 – 55230 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 50500 | 44390 – 52110 | 3 | 6 | too few sandboxes |
| 10 | boat | 44800 | 32910 – 55950 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 41790 | 39910 – 44170 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 31860 | 28120 – 32750 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~2.3× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 205500 | 203500 – 206200 | 3 | 6 | — |
| 2 | Modal (gVisor) | 90600 | 83970 – 102800 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 87860 | 87040 – 108700 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 87600 | 68530 – 172400 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 81960 | 40060 – 82750 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 81220 | 70340 – 84290 | 3 | 6 | too few sandboxes |
| 7 | E2B | 79411 | 67620 – 79960 | 3 | 6 | too few sandboxes |
| 8 | tama | 70880 | 63550 – 131900 | 3 | 6 | too few sandboxes |
| 9 | boat | 63350 | 42360 – 75860 | 3 | 6 | too few sandboxes |
| 10 | Novita | 58500 | 57270 – 58540 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 53320 | 52650 – 60460 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 42020 | 39630 – 44160 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.9× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 170400 | 170000 – 170500 | 3 | 6 | — |
| 2 | Modal (VM) | 89850 | 37260 – 150500 | 3 | 6 | too few sandboxes |
| 3 | tama | 64490 | 50640 – 105509 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 53760 | 52720 – 66210 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52771 | 52240 – 66520 | 3 | 6 | too few sandboxes |
| 6 | Novita | 51180 | 49610 – 51450 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 45833 | 42780 – 46670 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 45130 | 37990 – 45260 | 3 | 6 | too few sandboxes |
| 9 | E2B | 44010 | 43750 – 48740 | 3 | 6 | too few sandboxes |
| 10 | boat | 41598 | 29910 – 52080 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 38360 | 36050 – 40220 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 28950 | 25780 – 30120 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Daytona (VM) leads · ~1.1× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6489 | 4613 – 6534 | 3 | 6 | — |
| 2 | Vercel Sandbox | 6049 | 5870 – 6242 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5685 | 4917 – 6270 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 3751 | 2842 – 4953 | 3 | 6 | too few sandboxes |
| 5 | boat | 3385 | 1316 – 3910 | 3 | 6 | too few sandboxes |
| 6 | tama | 3009 | 2999 – 3019 | 1 | 2 | too few sandboxes |
| 7 | E2B | 3000 | 1037 – 3366 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2003 | 1182 – 2090 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 1914 | 1211 – 5351 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1434 | 1295 – 4933 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1209 | 1020 – 1311 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 936.7 | 607.5 – 937.7 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_boat leads · ~2.9× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 12570 | 1602 – 15700 | 3 | 6 | — |
| 2 | Daytona (VM) | 4349 | 2896 – 4397 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4057 | 3069 – 5249 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4025 | 1068 – 4299 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3680 | 3470 – 4215 | 3 | 6 | too few sandboxes |
| 6 | tama | 3564 | 3496 – 3632 | 1 | 2 | too few sandboxes |
| 7 | E2B | 3178 | 1235 – 3274 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 2984 | 1910 – 4225 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 2121 | 1837 – 2876 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 2087 | 2031 – 2206 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 935.2 | 236.5 – 935.5 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 191.6 | 159.9 – 1747 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.9× Microsandbox Cloud on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 157200 | 156500 – 157900 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 82950 | 76297 – 88423 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 77920 | 69400 – 80081 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 66528 | 39560 – 68000 | 3 | 6 | too few sandboxes |
| 5 | E2B | 64210 | 48469 – 64230 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 60250 | 45060 – 60446 | 3 | 6 | too few sandboxes |
| 7 | tama | 40064 | 39149 – 40979 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 36118 | 33330 – 49700 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 30450 | 21110 – 36645 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 24459 | 16073 – 24590 | 3 | 6 | too few sandboxes |
| 11 | boat | 22680 | 22346 – 22894 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 13240 | 12770 – 15330 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.8× Daytona (VM) on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 155909 | 152000 – 159472 | 3 | 6 | — |
| 2 | Daytona (VM) | 85392 | 74938 – 93678 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 83985 | 74820 – 97510 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 54790 | 38150 – 58911 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 54760 | 34016 – 55798 | 3 | 6 | too few sandboxes |
| 6 | E2B | 49648 | 47730 – 52790 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 45686 | 39976 – 47188 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 42100 | 36610 – 46610 | 3 | 6 | too few sandboxes |
| 9 | tama | 29020 | 27293 – 30748 | 1 | 2 | too few sandboxes |
| 10 | Modal (VM) | 28370 | 20153 – 28690 | 3 | 6 | too few sandboxes |
| 11 | boat | 24190 | 19780 – 25169 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 13527 | 10304 – 15310 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_boat and Modal (VM) share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 10000 | 9999 – 10000 | 3 | 6 | — |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 3 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | run.cloud | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | tama | 9999 | 9999 – 9999 | 1 | 2 | too few sandboxes, equal medians |
| 3 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 177 | 148 – 422.5 | 3 | 6 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 32.85 | 32.71 – 35.05 | 3 | 6 | — |
| 2 | boat | 34.29 | 34.16 – 35.96 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 36.21 | 36.01 – 36.59 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 40.55 | 38.97 – 42.69 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 40.57 | 40.55 – 40.61 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 41.18 | 41.15 – 42.19 | 3 | 6 | too few sandboxes |
| 7 | Novita | 43.61 | 43.45 – 44.04 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 55.69 | 48.69 – 62.7 | 2 | 4 | too few sandboxes |
| 9 | tama | 55.87 | 54.98 – 60.81 | 3 | 6 | too few sandboxes |
| 10 | E2B | 65.01 | 60.45 – 68.92 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 81.55 | 61.13 – 84.39 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 83.88 | 62.82 – 86.8 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 86.4 | 64.73 – 86.91 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_boat leads · ~1.2× tama on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 399400 | 89580 – 405800 | 3 | 6 | — |
| 2 | tama | 342900 | 338900 – 633100 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 328800 | 326200 – 344200 | 3 | 6 | too few sandboxes |
| 4 | Novita | 290500 | 288900 – 305100 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 286900 | 276700 – 293200 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 239100 | 223000 – 244100 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 232400 | 228800 – 237800 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 195700 | 191500 – 198400 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 179500 | 172100 – 190500 | 3 | 6 | too few sandboxes |
| 10 | E2B | 176600 | 169800 – 198900 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 156900 | 126100 – 170100 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 116400 | 112500 – 138500 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 13290 | 12830 – 13940 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_boat leads · tama is ~1.2× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.125 | 0.123 – 0.558 | 3 | 6 | — |
| 2 | tama | 0.1465 | 0.079 – 0.1475 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 0.152 | 0.1455 – 0.1535 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.172 | 0.1635 – 0.173 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 0.1745 | 0.1705 – 0.181 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 0.2095 | 0.205 – 0.2265 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 0.2155 | 0.2105 – 0.2185 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 0.2555 | 0.252 – 0.2615 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.2795 | 0.2635 – 0.297 | 3 | 6 | too few sandboxes |
| 10 | E2B | 0.283 | 0.2515 – 0.2945 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 0.319 | 0.294 – 0.3965 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 0.4295 | 0.3615 – 0.4445 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 3.761 | 3.588 – 3.897 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Novita on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 27810 | 26840 – 27920 | 3 | 6 | — |
| 2 | Novita | 25720 | 25680 – 27270 | 3 | 6 | too few sandboxes |
| 3 | boat | 25310 | 5125 – 26610 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 23800 | 23220 – 24190 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 16420 | 12540 – 17310 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 15890 | 15210 – 17500 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 15890 | 15360 – 18910 | 3 | 6 | too few sandboxes |
| 8 | tama | 15630 | 14290 – 17120 | 3 | 6 | too few sandboxes |
| 9 | Daytona (VM) | 15470 | 15150 – 16360 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 14970 | 14670 – 15600 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 12090 | 10060 – 12880 | 3 | 6 | too few sandboxes |
| 12 | E2B | 11080 | 10990 – 11180 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 2013 | 1846 – 2113 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Novita is ~1.1× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.798 | 1.791 – 1.863 | 3 | 6 | — |
| 2 | Novita | 1.944 | 1.833 – 1.951 | 3 | 6 | too few sandboxes |
| 3 | boat | 1.976 | 1.888 – 9.773 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 2.102 | 2.067 – 2.157 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3.048 | 2.889 – 3.988 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3.147 | 2.86 – 3.293 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3.169 | 2.645 – 3.274 | 3 | 6 | too few sandboxes |
| 8 | tama | 3.208 | 2.975 – 3.505 | 3 | 6 | too few sandboxes |
| 9 | Daytona (VM) | 3.232 | 3.061 – 3.31 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 3.339 | 3.205 – 3.409 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 4.136 | 3.884 – 5.049 | 3 | 6 | too few sandboxes |
| 12 | E2B | 4.523 | 4.472 – 4.55 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 24.84 | 23.69 – 27.09 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 361 | 361 – 362.5 | 3 | 6 | — |
| 2 | Daytona (VM) | 405.5 | 405.5 – 407 | 3 | 6 | too few sandboxes |
| 3 | boat | 407.5 | 401 – 408 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 453.5 | 451 – 454 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 456.5 | 451 – 457 | 3 | 6 | too few sandboxes |
| 6 | Novita | 481 | 478 – 485 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 493.5 | 479 – 506.5 | 3 | 6 | too few sandboxes |
| 8 | tama | 538 | 507 – 538 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 745.3 | 669.5 – 821 | 2 | 4 | too few sandboxes |
| 10 | E2B | 804.5 | 519.5 – 809 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 896.5 | 773 – 904.5 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1186 | 770.5 – 1193 | 3 | 6 | too few sandboxes |
| 13 | Vercel Sandbox | 1187 | 763 – 1203 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.25 | 30.84 – 31.83 | 3 | 6 | — |
| 2 | Blaxel | 39.05 | 37.57 – 40.62 | 3 | 6 | too few sandboxes |
| 3 | Novita | 39.29 | 39.01 – 40.34 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 47.36 | 47.25 – 47.62 | 3 | 6 | too few sandboxes |
| 5 | boat | 47.78 | 45.03 – 49.24 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 60.3 | 49.47 – 66.5 | 3 | 6 | too few sandboxes |
| 7 | tama | 64.13 | 63.97 – 174.6 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 64.32 | 63.64 – 65 | 2 | 4 | too few sandboxes |
| 9 | E2B | 68.82 | 61.92 – 77.37 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 84.02 | 70.32 – 86.35 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 90.4 | 67.25 – 90.55 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 90.57 | 67.98 – 91.23 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 391.6 | 168.9 – 430.2 | 3 | 6 | too few sandboxes |

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

47 uncovered results across 6 providers (Blaxel 12, boat 4, Modal (gVisor) 2, Modal (VM) 2, Namespace 2, tama 25). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | network | **skipped** | pts_iperf-tcp-p1: PTS install of pts/iperf-1.2.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | network | **skipped** | pts_iperf-tcp-p10: PTS install of pts/iperf-1.2.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | network | **skipped** | pts_iperf-udp-10g: PTS install of pts/iperf-1.2.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | network | **skipped** | pts_iperf-wan-download: PTS install of local/iperf-wan-1.0.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | network | **skipped** | pts_iperf-wan-upload: PTS install of local/iperf-wan-1.0.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | memory | **failed** | pts_stream: stream in-place recompile failed; the stale baked binary would measure the wrong array size/ISA |
| Blaxel | memory | **failed** | Step "mise run benchmark:memory:all" failed with exit code 1 |
| Blaxel | memory | **failed** | Partial publication withheld unverified measurements: stream_type_copy, stream_type_scale, stream_type_add, stream_type_triad |
| Blaxel | network | **failed** | Suite "network" on blaxel produced no pts_*.xml — PTS likely failed silently |
| Blaxel | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| Blaxel | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Blaxel | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| boat | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| boat | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| boat | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| boat | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (VM) | system | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (VM) | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | network | **failed** | Failed to create sandbox: tama new bench-c951eddc-19e9-4688-a951-6d2dbec5e950 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c951eddc-19e9-4688-a951-6d2dbec5e950 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | network | **failed** | Failed to create sandbox: tama new bench-1c20f4eb-ff9a-4481-aeae-02ac90f04e48 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1c20f4eb-ff9a-4481-aeae-02ac90f04e48 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-fe090e70-7b7c-4ced-bfed-283fa0e17cdf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-fe090e70-7b7c-4ced-bfed-283fa0e17cdf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-d22944a5-005c-4541-b957-474c43ddf0f8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d22944a5-005c-4541-b957-474c43ddf0f8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-4449b99c-47c1-4bee-ba00-bb622c03a99b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4449b99c-47c1-4bee-ba00-bb622c03a99b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-b56d8ab8-08dd-4a10-859d-b87927019f5e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b56d8ab8-08dd-4a10-859d-b87927019f5e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-606a3669-d779-41c9-97df-2274dd5942ba --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-606a3669-d779-41c9-97df-2274dd5942ba failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-dfe4dd4c-8755-42d2-92d9-77b397424cd3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-dfe4dd4c-8755-42d2-92d9-77b397424cd3 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-6d86f806-ba3b-4b3b-acf0-4c6bb0904cbd --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6d86f806-ba3b-4b3b-acf0-4c6bb0904cbd failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5ca5f361-43f5-47d1-9caa-42ac0e99d940 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5ca5f361-43f5-47d1-9caa-42ac0e99d940 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-8e6f6567-d9d2-4c9f-8966-c50e4a20e897 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-8e6f6567-d9d2-4c9f-8966-c50e4a20e897 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-a7122422-c024-4ac2-a7b0-76a93bfb7cc5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a7122422-c024-4ac2-a7b0-76a93bfb7cc5 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ea51bbde-f12a-44a5-9c6b-5a4a4e7e5ed7 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ea51bbde-f12a-44a5-9c6b-5a4a4e7e5ed7 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-33df2901-cc9f-4ec0-a2d5-7146c3c2fca0 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-33df2901-cc9f-4ec0-a2d5-7146c3c2fca0 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-74017cdd-2c1a-4c7f-80d8-5a27d6240066 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-74017cdd-2c1a-4c7f-80d8-5a27d6240066 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d953ba76-1c02-447a-ab9e-fe0c64b396fb --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d953ba76-1c02-447a-ab9e-fe0c64b396fb failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-7d849dd7-3646-4ccc-8a9d-d42aeaa894b3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7d849dd7-3646-4ccc-8a9d-d42aeaa894b3 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-75797a1c-c536-4ba7-8764-3efbc1e926a4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-75797a1c-c536-4ba7-8764-3efbc1e926a4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-7e66acff-f348-4dd7-8993-5fb3db7ec553 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7e66acff-f348-4dd7-8993-5fb3db7ec553 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-752582ab-8c5c-4c8f-b7d4-7b34ebd7e6e6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-752582ab-8c5c-4c8f-b7d4-7b34ebd7e6e6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-5494e9df-2e5f-4945-b1b3-8e6d67707e03 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5494e9df-2e5f-4945-b1b3-8e6d67707e03 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ee21329a-c319-43be-b2ba-5af844bc44a6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ee21329a-c319-43be-b2ba-5af844bc44a6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 1 v 3 sandboxes floors at p ≈ 1.0; 2 v 3 sandboxes floors at p ≈ 0.20; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 1 sandboxes floors at p ≈ 1.0; 3 v 2 sandboxes floors at p ≈ 0.10; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.30; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Daytona (VM) | 0.11 (tied) | 0.066 |
| realworld | Mastra: cold install | Namespace | 0.0068 | <0.001 |
| realworld | Mastra: cold install | Novita | 0.24 (tied) | 0.43 |
| realworld | Mastra: cold install | boat | 0.35 (tied) | 0.066 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.38 (tied) | 0.43 |
| realworld | Mastra: cold install | Modal (VM) | 0.010 | 0.019 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.014 | 0.019 |
| realworld | Mastra: cold install | E2B | 0.11 (tied) | 0.019 |
| realworld | Mastra: cold install | Runloop | 0.0023 | <0.001 |
| realworld | Mastra: cold install | tama | 0.11 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.29 (tied) | 0.43 |
| realworld | Mastra: cold install | run.cloud | 0.024 | 0.019 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: build | Blaxel | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: build | Novita | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | tama | 0.45 (tied) | 0.16 |
| realworld | Better-Auth: build | run.cloud | 0.26 (tied) | 0.16 |
| realworld | Better-Auth: build | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.93 (tied) | 0.066 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.020 | 0.066 |
| realworld | Better-Auth: build | E2B | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.014 | 0.0046 |
| realworld | Better-Auth: cold install | Blaxel | 0.54 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.028 | 0.019 |
| realworld | Better-Auth: cold install | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.045 | 0.066 |
| realworld | Better-Auth: cold install | E2B | 0.32 (tied) | 0.43 |
| realworld | Better-Auth: cold install | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Runloop | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | tama | 0.68 (tied) | 0.16 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.70 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.028 | 0.0046 |
| realworld | Better-Auth: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: git clone | E2B | 0.039 | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.012 | 0.066 |
| realworld | Better-Auth: git clone | boat | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: git clone | run.cloud | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: git clone | tama | 0.86 (tied) | 0.32 |
| realworld | Better-Auth: git clone | Runloop | 0.60 (tied) | 0.98 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.10 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.70 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | tama | 0.68 (tied) | 0.81 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.027 | 0.032 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.18 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0023 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.060 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.38 (tied) | 0.55 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.60 (tied) | 0.32 |
| realworld | Better-Auth: lint deps (Knip) | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.045 | 0.0046 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.017 | 0.019 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Novita | 0.24 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Blaxel | 0.37 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0014 | <0.001 |
| realworld | Better-Auth: lint format | run.cloud | 0.71 (tied) | 0.43 |
| realworld | Better-Auth: lint format | tama | 0.13 (tied) | 0.16 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.26 (tied) | 0.32 |
| realworld | Better-Auth: lint format | boat | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint format | E2B | 0.27 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Runloop | 0.0056 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Namespace | 0.058 (tied) | 0.019 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.85 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Blaxel | 0.84 (tied) | 0.99 |
| realworld | Better-Auth: lint packages | tama | 0.52 (tied) | 0.16 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.10 (tied) | 0.077 |
| realworld | Better-Auth: lint packages | run.cloud | 0.15 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | E2B | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | 0.023 | 0.066 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.0056 | 0.0046 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Novita | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.0011 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | 0.014 | 0.0046 |
| realworld | Better-Auth: lint spell | tama | 0.68 (tied) | 0.81 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.21 (tied) | 0.32 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | boat | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | E2B | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Runloop | 0.0045 | 0.0046 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Namespace | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.33 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.22 (tied) | 0.019 |
| realworld | Better-Auth: lint types | tama | 0.77 (tied) | 0.55 |
| realworld | Better-Auth: lint types | boat | 0.52 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.93 (tied) | 0.066 |
| realworld | Better-Auth: lint types | run.cloud | 0.039 | 0.0046 |
| realworld | Better-Auth: lint types | E2B | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Runloop | 0.0023 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Blaxel | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | tama | 0.26 (tied) | 0.32 |
| realworld | Better-Auth: typecheck | boat | 1.0 (tied) | 0.32 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | run.cloud | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | E2B | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Daytona (VM) | 0.0011 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.010 | 0.0046 |
| realworld | Mastra: build:core | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.93 (tied) | 0.79 |
| realworld | Mastra: build:core | Novita | 0.93 (tied) | 0.19 |
| realworld | Mastra: build:core | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | tama | 0.29 (tied) | 0.43 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | 0.63 (tied) | 0.066 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.24 (tied) | 0.066 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.023 | 0.0046 |
| realworld | Mastra: git clone | Blaxel | 0.26 (tied) | 0.19 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.18 (tied) | 0.19 |
| realworld | Mastra: git clone | Daytona (VM) | 0.052 (tied) | 0.0046 |
| realworld | Mastra: git clone | boat | 0.63 (tied) | 0.43 |
| realworld | Mastra: git clone | run.cloud | 0.38 (tied) | 0.43 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.045 | 0.0046 |
| realworld | Mastra: git clone | tama | 0.024 | 0.066 |
| realworld | Mastra: git clone | Novita | 0.35 (tied) | 0.19 |
| realworld | Mastra: git clone | E2B | 0.0023 | <0.001 |
| realworld | Mastra: git clone | Runloop | 0.41 (tied) | 0.19 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.22 (tied) | 0.19 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Namespace | 0.010 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.67 (tied) | 0.43 |
| realworld | Mastra: lint:format | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Novita | 0.51 (tied) | 0.066 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.89 (tied) | 0.066 |
| realworld | Mastra: lint:format | tama | 0.13 (tied) | 0.0046 |
| realworld | Mastra: lint:format | Modal (VM) | 0.93 (tied) | 0.79 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.0029 | 0.0046 |
| realworld | Mastra: lint:format | E2B | 0.59 (tied) | 0.19 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.84 (tied) | 0.43 |
| realworld | Mastra: test:core | Namespace | — | — |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: test:core | Blaxel | 0.93 (tied) | 0.79 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.0011 | <0.001 |
| realworld | Mastra: test:core | tama | 0.80 (tied) | 0.79 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.35 (tied) | 0.066 |
| realworld | Mastra: test:core | E2B | 0.0023 | <0.001 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.15 (tied) | 0.010 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | 0.89 (tied) | 0.99 |
| realworld | OpenClaw: cold install | Novita | 0.0011 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.11 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.020 | 0.19 |
| realworld | OpenClaw: cold install | run.cloud | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: cold install | E2B | 0.76 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Runloop | 0.71 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.41 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.028 | <0.001 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.59 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.089 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.024 | 0.0046 |
| realworld | OpenClaw: git clone | Novita | 0.18 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Runloop | 0.0023 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | 0.29 (tied) | 0.13 |
| realworld | OpenClaw: git clone | E2B | 0.12 (tied) | 0.13 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.075 (tied) | 0.19 |
| realworld | OpenClaw: git clone | run.cloud | 0.31 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.028 | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | 0.091 (tied) | 0.11 |
| realworld | OpenClaw: lint (all extensions) | Namespace | 0.41 (tied) | 0.023 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.052 (tied) | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.27 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.98 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.41 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Runloop | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.32 (tied) | 0.43 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.76 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.019 | 0.036 |
| realworld | OpenClaw: lint (Oxlint) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.13 (tied) | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.0018 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.93 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | <0.001 | 0.0017 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.49 (tied) | 0.81 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.060 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.80 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.55 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.060 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.017 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.0070 | 0.0059 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.19 (tied) | 0.65 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.060 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.028 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 1.0 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.71 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.84 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.44 (tied) | 0.79 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| cpu | Node.js web tooling | Namespace | 0.10 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | Novita | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | tama | 0.10 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | E2B | 0.40 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Runloop | 0.40 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.60 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.50 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | boat | 0.20 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | boat | 0.20 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.30 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.60 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.60 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.70 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | boat | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | tama | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | boat | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Runloop | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | boat | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | boat | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Daytona (VM) | — | — |
| network | iperf3 WAN download | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Novita | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Namespace | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | boat | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | boat | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Novita | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | E2B | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.50 (too few sandboxes) | 0.11 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 1.0 (too few sandboxes) | 0.68 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | boat | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.50 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | boat | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | boat | — | — |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | boat | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.077 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | Git common operations | tama | 1.0 (too few sandboxes) | 0.44 |
| system | Git common operations | E2B | 0.20 (too few sandboxes) | 0.012 |
| system | Git common operations | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Runloop | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | boat | — | — |
| system | pgbench RO (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 1.0 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | boat | — | — |
| system | pgbench RO latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 1.0 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | boat | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | boat | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.60 (too few sandboxes) | 0.81 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.50 (too few sandboxes) | 0.81 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 0.10 (too few sandboxes) | 0.0047 |
| system | PyBench | E2B | 0.80 (too few sandboxes) | 0.44 |
| system | PyBench | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 1.0 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | boat | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | tama | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (VM) | 0.80 (too few sandboxes) | 0.67 |
| system | SQLite Speedtest | E2B | 0.80 (too few sandboxes) | 0.14 |
| system | SQLite Speedtest | run.cloud | 0.20 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Vercel Sandbox | 0.40 (too few sandboxes) | 1.0 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

