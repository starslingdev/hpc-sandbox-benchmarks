# Sandbox provider leaderboard

Run [`36082427288`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36082427288) · commit [`715802ff6f6babb65b37b497a678d9cde192cbeb`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/715802ff6f6babb65b37b497a678d9cde192cbeb) ·
dataset [`data/dataset/runs/36082427288.json`](data/dataset/runs/36082427288.json) · generated 2026-09-25T03:07:44.618Z

**Partial results — incomplete experiment.** 635 of 702 planned cells complete; 67 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:6b7561f5c1b5c4d4b09e66e39ff6b543e61103b273a003f77d78db734b60d57d`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **566 metric records**
backed by **4796 retained trial observations**, across **48 metrics** and
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
| tama | container (shared kernel) | gvisor (user-kernel, confirmed) |
| Vercel Sandbox | Firecracker microVM | firecracker (microVM, confirmed) |

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 12 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 12 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 12 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 34.91 | 34.42 – 35.3 | 12 | 12 | — |
| 2 | Blaxel | 39.64 | 38.03 – 41.6 | 12 | 12 | — |
| 2 | Daytona (VM) | 42.45 | 39.18 – 53.93 | 12 | 12 | tied |
| 2 | Novita | 43.83 | 43.03 – 46.39 | 12 | 12 | tied |
| 5 | boat | 50.15 | 47.68 – 52.14 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 50.54 | 45.12 – 52.85 | 12 | 12 | tied |
| 5 | Modal (VM) | 51.47 | 48.35 – 52.79 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 59.03 | 55.57 – 66.37 | 12 | 12 | — |
| 8 | Modal (gVisor) | 69.64 | 55.87 – 75.9 | 12 | 12 | tied |
| 8 | E2B | 72.97 | 63.53 – 74.44 | 12 | 12 | tied |
| 11 | Runloop | 100.6 | 81.63 – 103.4 | 12 | 12 | — |
| 11 | run.cloud | 124.3 | 94.32 – 136.3 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 50.21 | 50.05 – 51.02 | 12 | 12 | — |
| 1 | boat | 51.69 | 47.75 – 57.03 | 12 | 12 | tied |
| 3 | Daytona (VM) | 59.76 | 58.29 – 63.83 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 66.17 | 62.13 – 74.49 | 12 | 12 | — |
| 4 | Novita | 66.88 | 66.31 – 68.42 | 12 | 12 | tied |
| 4 | Blaxel | 69.37 | 62.93 – 72.03 | 12 | 12 | tied |
| 4 | Modal (VM) | 70.88 | 59.3 – 72.36 | 12 | 12 | tied |
| 8 | run.cloud | 92.58 | 83.67 – 96.26 | 12 | 12 | — |
| 8 | Vercel Sandbox | 94.43 | 89.83 – 116.5 | 12 | 12 | tied |
| 8 | E2B | 99.65 | 85.93 – 102.3 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 102.5 | 98.49 – 120.1 | 12 | 12 | tied |
| 12 | Runloop | 160.3 | 132.7 – 163.7 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.35 | 10.14 – 10.6 | 12 | 12 | — |
| 2 | Blaxel | 12.75 | 12.36 – 13.36 | 12 | 12 | — |
| 3 | boat | 14.12 | 13.31 – 14.92 | 12 | 12 | — |
| 3 | Daytona (VM) | 14.55 | 13.54 – 17.13 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 14.85 | 14.29 – 17.37 | 12 | 12 | tied |
| 3 | Novita | 14.97 | 14.71 – 15.43 | 12 | 12 | tied |
| 3 | Modal (VM) | 18.67 | 14.61 – 19.3 | 12 | 12 | tied |
| 3 | run.cloud | 20.02 | 18.27 – 21.83 | 12 | 12 | tied |
| 3 | E2B | 20.34 | 19.18 – 21.79 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 21.08 | 20.19 – 24.21 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 24.21 | 23.32 – 31.02 | 12 | 12 | — |
| 11 | Runloop | 24.28 | 20.38 – 25.37 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6375 | 0.626 – 0.6745 | 12 | 12 | — |
| 2 | Blaxel | 0.7465 | 0.7265 – 0.792 | 12 | 12 | — |
| 3 | Modal (VM) | 0.845 | 0.8305 – 1.233 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.9635 | 0.9095 – 1.099 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 1.141 | 1.073 – 1.256 | 12 | 12 | — |
| 5 | Modal (gVisor) | 1.507 | 1.066 – 1.849 | 12 | 12 | tied |
| 5 | Daytona (VM) | 1.524 | 1.438 – 1.649 | 12 | 12 | tied |
| 5 | E2B | 1.574 | 1.474 – 1.615 | 12 | 12 | tied |
| 9 | boat | 2.151 | 2.002 – 2.26 | 12 | 12 | — |
| 9 | Novita | 2.152 | 1.978 – 2.279 | 12 | 12 | tied |
| 9 | run.cloud | 2.482 | 1.676 – 5.241 | 12 | 12 | tied |
| 9 | Runloop | 4.433 | 3.641 – 7.548 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.473 | 2.362 – 2.638 | 12 | 12 | — |
| 1 | Namespace | 2.518 | 2.491 – 2.651 | 12 | 12 | tied |
| 3 | Daytona (VM) | 2.973 | 2.855 – 3.268 | 12 | 12 | — |
| 3 | Novita | 3.204 | 3.127 – 3.305 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 3.298 | 3.183 – 3.644 | 12 | 12 | tied |
| 3 | Blaxel | 3.316 | 3.194 – 3.598 | 12 | 12 | tied |
| 3 | Modal (VM) | 3.775 | 3.09 – 3.848 | 12 | 12 | tied |
| 8 | run.cloud | 4.292 | 3.806 – 4.616 | 12 | 12 | — |
| 8 | Vercel Sandbox | 4.508 | 4.252 – 5.165 | 12 | 12 | tied |
| 8 | E2B | 5.026 | 4.595 – 5.169 | 12 | 12 | tied |
| 11 | Runloop | 7.685 | 6.103 – 7.899 | 12 | 12 | — |
| 11 | Modal (gVisor) | 8.716 | 7.337 – 11.45 | 12 | 12 | tied |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 8.048 | 7.472 – 8.634 | 12 | 12 | — |
| 2 | Namespace | 9.534 | 9.441 – 10.15 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.892 | 9.665 – 10.58 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 11.03 | 10.36 – 12.47 | 12 | 12 | — |
| 4 | Blaxel | 11.12 | 10.8 – 12.03 | 12 | 12 | tied |
| 4 | Novita | 11.21 | 10.98 – 11.52 | 12 | 12 | tied |
| 4 | Modal (VM) | 12.55 | 10.47 – 12.92 | 12 | 12 | tied |
| 8 | run.cloud | 13.59 | 13.33 – 14.09 | 12 | 12 | — |
| 9 | Vercel Sandbox | 15.31 | 14.86 – 18.62 | 12 | 12 | — |
| 10 | Modal (gVisor) | 17.93 | 16.87 – 23.74 | 12 | 12 | — |
| 10 | E2B | 18.84 | 15.92 – 19.54 | 12 | 12 | tied |
| 12 | Runloop | 21.54 | 19.19 – 21.95 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.201 | 2.183 – 2.315 | 12 | 12 | — |
| 1 | boat | 2.299 | 2.189 – 2.542 | 12 | 12 | tied |
| 3 | Daytona (VM) | 2.685 | 2.571 – 2.822 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.037 | 2.737 – 3.475 | 12 | 12 | — |
| 4 | Novita | 3.039 | 2.955 – 3.099 | 12 | 12 | tied |
| 4 | Blaxel | 3.117 | 2.976 – 3.349 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.486 | 2.829 – 3.619 | 12 | 12 | tied |
| 8 | run.cloud | 3.812 | 3.651 – 4.155 | 12 | 12 | — |
| 9 | Vercel Sandbox | 4.514 | 4.424 – 5.447 | 12 | 12 | — |
| 9 | Modal (gVisor) | 4.698 | 4.595 – 5.822 | 12 | 12 | tied |
| 9 | E2B | 5.06 | 3.835 – 5.327 | 12 | 12 | tied |
| 12 | Runloop | 6.261 | 5.837 – 6.564 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · boat is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.099 | 2.064 – 2.165 | 12 | 12 | — |
| 2 | boat | 2.44 | 2.346 – 2.751 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.537 | 2.469 – 2.642 | 12 | 12 | tied |
| 4 | Novita | 2.659 | 2.625 – 2.745 | 12 | 12 | — |
| 4 | Blaxel | 2.771 | 2.622 – 2.889 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 2.87 | 2.716 – 3.343 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.125 | 2.854 – 3.207 | 12 | 12 | tied |
| 8 | run.cloud | 3.787 | 3.373 – 4.024 | 12 | 12 | — |
| 8 | Vercel Sandbox | 3.854 | 3.713 – 4.506 | 12 | 12 | tied |
| 8 | E2B | 4.079 | 3.806 – 4.324 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 6.398 | 6.091 – 6.8 | 12 | 12 | — |
| 11 | Runloop | 7.197 | 6.41 – 7.926 | 12 | 12 | tied |

### Better-Auth: lint spell

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.558 | 5.313 – 6.639 | 12 | 12 | — |
| 1 | Namespace | 5.736 | 5.627 – 5.87 | 12 | 12 | tied |
| 3 | Daytona (VM) | 6.646 | 6.451 – 7.042 | 12 | 12 | — |
| 4 | Blaxel | 7.569 | 7.114 – 8.639 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 7.648 | 7.139 – 8.306 | 12 | 12 | tied |
| 4 | Novita | 7.72 | 7.46 – 7.783 | 12 | 12 | tied |
| 4 | Modal (VM) | 8.729 | 6.928 – 8.881 | 12 | 12 | tied |
| 8 | run.cloud | 10.81 | 10.35 – 11.15 | 12 | 12 | — |
| 9 | Vercel Sandbox | 11.83 | 11.32 – 13.93 | 12 | 12 | — |
| 9 | Modal (gVisor) | 11.98 | 11.34 – 15.18 | 12 | 12 | tied |
| 9 | E2B | 13.46 | 11.7 – 14 | 12 | 12 | tied |
| 12 | Runloop | 16.86 | 14.51 – 17.56 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_boat, Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 24.65 | 23.79 – 28.18 | 12 | 12 | — |
| 1 | Daytona (VM) | 27.56 | 27.04 – 28.84 | 12 | 12 | tied |
| 1 | Namespace | 27.99 | 27.56 – 28.95 | 12 | 12 | tied |
| 4 | Novita | 31.9 | 30.53 – 32.32 | 12 | 12 | — |
| 4 | Modal (VM) | 33.66 | 26.44 – 34.34 | 12 | 12 | tied |
| 4 | Blaxel | 33.81 | 28.87 – 35.02 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 34.09 | 31.29 – 43.75 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 48.1 | 45.26 – 55.54 | 12 | 12 | — |
| 8 | E2B | 49.64 | 43.76 – 53.42 | 12 | 12 | tied |
| 8 | run.cloud | 53.06 | 51.08 – 54.7 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 83.57 | 68.03 – 86.97 | 12 | 12 | — |
| 11 | Runloop | 90.62 | 66.63 – 93.82 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 32.02 | 30.43 – 35.9 | 12 | 12 | — |
| 1 | Namespace | 32.61 | 32.29 – 33.11 | 12 | 12 | tied |
| 3 | Daytona (VM) | 43.06 | 40.04 – 45.24 | 12 | 12 | — |
| 3 | Novita | 44.83 | 41.9 – 46.26 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 46.9 | 39.99 – 53.55 | 12 | 12 | tied |
| 3 | Blaxel | 48.73 | 45.01 – 50.24 | 12 | 12 | tied |
| 3 | Modal (VM) | 49.2 | 40.5 – 50.71 | 12 | 12 | tied |
| 8 | run.cloud | 67.58 | 63.62 – 71.77 | 12 | 12 | — |
| 8 | Modal (gVisor) | 69.7 | 65.64 – 75.2 | 12 | 12 | tied |
| 8 | E2B | 74.52 | 61.36 – 79.49 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 85.88 | 74.54 – 98.31 | 12 | 12 | — |
| 11 | Runloop | 99 | 87.41 – 101.3 | 12 | 12 | tied |

### Mastra: build:core

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 58.06 | 57.42 – 58.66 | 12 | 12 | — |
| 1 | boat | 61.33 | 57.31 – 65.1 | 12 | 12 | tied |
| 3 | Daytona (VM) | 70.24 | 67.58 – 73.88 | 12 | 12 | — |
| 4 | Novita | 75.99 | 74.29 – 77.46 | 12 | 12 | — |
| 4 | Blaxel | 76.84 | 74.5 – 85.96 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 81.64 | 74.31 – 84.68 | 12 | 12 | tied |
| 7 | Modal (VM) | 91.95 | 80.2 – 92.39 | 12 | 12 | — |
| 8 | run.cloud | 105.5 | 100.6 – 110.3 | 12 | 12 | — |
| 9 | Modal (gVisor) | 119.4 | 107 – 138.4 | 12 | 12 | — |
| 9 | E2B | 124.9 | 115.9 – 133.3 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 127.3 | 125.5 – 130.6 | 12 | 12 | tied |
| 12 | Runloop | 156.7 | 147.4 – 162.3 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace, Modal (VM), Microsandbox Cloud, Blaxel, Daytona (VM) and Vercel Sandbox share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.833 | 1.48 – 2.329 | 12 | 12 | — |
| 1 | Modal (VM) | 2.182 | 1.98 – 2.561 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 2.277 | 2.188 – 2.397 | 12 | 12 | tied |
| 1 | Blaxel | 2.446 | 1.677 – 3.793 | 12 | 12 | tied |
| 1 | Daytona (VM) | 2.553 | 2.34 – 3.752 | 12 | 12 | tied |
| 1 | Vercel Sandbox | 2.732 | 2.402 – 3.346 | 12 | 12 | tied |
| 7 | boat | 3.207 | 2.992 – 4.109 | 12 | 12 | — |
| 7 | run.cloud | 3.451 | 3.066 – 5.778 | 12 | 12 | tied |
| 7 | E2B | 3.49 | 3.404 – 4.107 | 12 | 12 | tied |
| 7 | Novita | 3.833 | 3.553 – 3.91 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 3.856 | 3.219 – 4.347 | 12 | 12 | tied |
| 12 | Runloop | 5.565 | 5.176 – 7.033 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 72.37 | 71.93 – 72.77 | 12 | 12 | — |
| 1 | boat | 80.05 | 69.02 – 83.06 | 12 | 12 | tied |
| 3 | Daytona (VM) | 93.54 | 89.59 – 97.26 | 12 | 12 | — |
| 3 | Blaxel | 94.05 | 91.03 – 102.9 | 12 | 12 | tied |
| 3 | Novita | 96.73 | 94.96 – 98.52 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 103.8 | 91.89 – 115.1 | 12 | 12 | tied |
| 3 | Modal (VM) | 113.9 | 104.2 – 115.5 | 12 | 12 | tied |
| 8 | run.cloud | 143.2 | 138.6 – 148.2 | 12 | 12 | — |
| 8 | Vercel Sandbox | 144.4 | 143.6 – 157.3 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 149.5 | 131.8 – 180.5 | 12 | 12 | tied |
| 8 | E2B | 162.1 | 137.1 – 173.6 | 12 | 12 | tied |
| 12 | Runloop | 209.5 | 179.3 – 216.8 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 848.4 | 810.5 – 890.3 | 12 | 12 | — |
| 1 | Namespace | 854.6 | 848.2 – 865.8 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 949.3 | 922.5 – 981.7 | 12 | 12 | — |
| 3 | Daytona (VM) | 959.9 | 934.6 – 980.2 | 12 | 12 | tied |
| 3 | Blaxel | 963.8 | 952.3 – 992.5 | 12 | 12 | tied |
| 6 | Novita | 1017 | 1002 – 1029 | 12 | 12 | — |
| 6 | Modal (VM) | 1103 | 994.4 – 1111 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 1282 | 1276 – 1291 | 11 | 11 | — |
| 9 | run.cloud | 1328 | 1311 – 1345 | 12 | 12 | — |
| 10 | Modal (gVisor) | 1404 | 1362 – 1694 | 8 | 8 | — |
| 10 | E2B | 1422 | 1359 – 1475 | 11 | 11 | tied |
| 12 | Runloop | 1555 | 1469 – 1577 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.56 | 10.27 – 10.9 | 12 | 12 | — |
| 2 | Blaxel | 12.35 | 12.11 – 12.88 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 16.17 | 15.53 – 17.73 | 12 | 12 | — |
| 3 | Daytona (VM) | 16.22 | 15.16 – 18 | 12 | 12 | tied |
| 3 | Novita | 16.58 | 15.98 – 16.93 | 12 | 12 | tied |
| 3 | Modal (VM) | 17.23 | 14.81 – 18.72 | 12 | 12 | tied |
| 3 | boat | 18.19 | 17.8 – 20.43 | 10 | 10 | tied |
| 3 | Vercel Sandbox | 18.71 | 18.09 – 19.4 | 12 | 12 | tied |
| 3 | run.cloud | 19.79 | 18.58 – 22.25 | 12 | 12 | tied |
| 3 | E2B | 21.09 | 19.9 – 23.61 | 12 | 12 | tied |
| 3 | Runloop | 21.11 | 18.09 – 24.52 | 12 | 12 | tied |
| 3 | Modal (gVisor) | 21.69 | 19.67 – 24.5 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.332 | 2.244 – 2.486 | 12 | 12 | — |
| 2 | Blaxel | 2.69 | 2.657 – 2.849 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.216 | 3.131 – 3.468 | 12 | 12 | — |
| 3 | Modal (VM) | 3.252 | 2.769 – 3.933 | 12 | 12 | tied |
| 3 | Daytona (VM) | 3.411 | 3.134 – 4.7 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 3.908 | 3.719 – 3.984 | 12 | 12 | tied |
| 3 | Novita | 4.538 | 4.136 – 4.654 | 12 | 12 | tied |
| 8 | boat | 4.844 | 4.634 – 6.745 | 10 | 10 | — |
| 8 | E2B | 5.474 | 4.872 – 6.054 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 6.413 | 5.323 – 7.743 | 12 | 12 | tied |
| 11 | Runloop | 8.178 | 7.081 – 10.13 | 12 | 12 | — |
| 11 | run.cloud | 10.22 | 7.287 – 10.81 | 12 | 12 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 120.3 | 110.7 – 140.5 | 10 | 10 | — |
| 2 | Namespace | 145 | 143.1 – 148.7 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 151.1 | 142.6 – 157.9 | 12 | 12 | tied |
| 2 | Daytona (VM) | 151.3 | 149.8 – 159.3 | 12 | 12 | tied |
| 5 | Blaxel | 172.6 | 165.3 – 177 | 12 | 12 | — |
| 5 | Modal (VM) | 183.2 | 167.5 – 188.8 | 12 | 12 | tied |
| 5 | Novita | 184.1 | 180.4 – 186.9 | 12 | 12 | tied |
| 5 | run.cloud | 202.5 | 171.9 – 211.6 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 226.7 | 209.4 – 257.1 | 12 | 12 | — |
| 9 | Vercel Sandbox | 228.5 | 219.9 – 237.5 | 12 | 12 | tied |
| 11 | Runloop | 300.3 | 269.9 – 319.7 | 12 | 12 | — |
| 11 | E2B | 302.3 | 289.1 – 309.7 | 12 | 12 | tied |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Microsandbox Cloud is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 220.5 | 205.4 – 256.7 | 10 | 10 | — |
| 2 | Microsandbox Cloud | 277.5 | 274.4 – 289.4 | 12 | 12 | — |
| 3 | Namespace | 285.5 | 283.9 – 301.2 | 12 | 12 | — |
| 4 | Daytona (VM) | 302.7 | 296.9 – 308.8 | 12 | 12 | — |
| 5 | Blaxel | 330 | 316.9 – 340 | 12 | 12 | — |
| 5 | Modal (VM) | 351 | 323.1 – 357.3 | 12 | 12 | tied |
| 5 | Novita | 353.2 | 347.8 – 359.6 | 12 | 12 | tied |
| 8 | run.cloud | 387.4 | 370.5 – 405.1 | 12 | 12 | — |
| 9 | Modal (gVisor) | 410.6 | 395.9 – 489.8 | 12 | 12 | — |
| 9 | Vercel Sandbox | 439.8 | 427.4 – 452.7 | 12 | 12 | tied |
| 11 | Runloop | 552.6 | 476.6 – 587.6 | 12 | 12 | — |
| 12 | E2B | 614.3 | 567.7 – 623.6 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 81.95 | 78.31 – 88.84 | 10 | 10 | — |
| 2 | Daytona (VM) | 101.8 | 95.56 – 104 | 12 | 12 | — |
| 2 | Namespace | 102.9 | 102.1 – 111 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 104.1 | 102.2 – 107.9 | 12 | 12 | tied |
| 2 | Modal (VM) | 111.8 | 106.5 – 123.2 | 12 | 12 | tied |
| 2 | Blaxel | 115.7 | 111.2 – 117 | 12 | 12 | tied |
| 2 | Novita | 116.6 | 114.5 – 117 | 12 | 12 | tied |
| 2 | run.cloud | 126.5 | 110.1 – 141.1 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 151.8 | 149.4 – 153.6 | 12 | 12 | — |
| 9 | Modal (gVisor) | 152.8 | 136.3 – 249.1 | 12 | 12 | tied |
| 9 | E2B | 185.1 | 175.9 – 194.2 | 12 | 12 | tied |
| 9 | Runloop | 208.4 | 177.1 – 226.1 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 13.79 | 12.92 – 15.06 | 10 | 10 | — |
| 2 | Daytona (VM) | 16.95 | 16.51 – 18.14 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 17.24 | 16.86 – 18.34 | 12 | 12 | tied |
| 4 | Blaxel | 18.81 | 18.51 – 19.34 | 12 | 12 | — |
| 4 | Namespace | 18.89 | 18.2 – 19.78 | 12 | 12 | tied |
| 4 | Modal (VM) | 19.45 | 18.1 – 21.37 | 12 | 12 | tied |
| 7 | run.cloud | 21.7 | 20.94 – 26.62 | 12 | 12 | — |
| 7 | Novita | 22.01 | 21.73 – 22.76 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 23.05 | 21.51 – 34.47 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 25.51 | 25.22 – 27.61 | 12 | 12 | tied |
| 11 | Runloop | 36.12 | 29.7 – 38.97 | 12 | 12 | — |
| 11 | E2B | 37.03 | 35.52 – 39.5 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 22.94 | 20.27 – 24.99 | 3 | 6 | — |
| 2 | Daytona (VM) | 21.73 | 20.88 – 21.94 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 20.09 | 19.2 – 21.9 | 3 | 6 | too few sandboxes |
| 3 | Novita | 20.09 | 18.84 – 21.17 | 3 | 6 | too few sandboxes, equal medians |
| 5 | Microsandbox Cloud | 18.76 | 17.82 – 22.76 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 18.75 | 17.93 – 20.41 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 17.18 | 15.04 – 17.91 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 13.09 | 10.96 – 13.42 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 12.54 | 12.54 – 12.82 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 12.36 | 11.68 – 13.71 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 10.77 | 10.46 – 10.88 | 3 | 6 | too few sandboxes |
| 12 | E2B | 10.48 | 9.635 – 11.16 | 3 | 6 | too few sandboxes |
| 13 | tama | 6.61 | 6.555 – 6.655 | 3 | 6 | too few sandboxes |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.1× Namespace on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1162 | 1160 – 1183 | 3 | 6 | — |
| 2 | Namespace | 1085 | 973.1 – 1099 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 1059 | 993.5 – 1078 | 3 | 6 | too few sandboxes |
| 4 | Novita | 993 | 983.6 – 1012 | 3 | 6 | too few sandboxes |
| 5 | boat | 936.4 | 902.8 – 969.9 | 1 | 2 | too few sandboxes |
| 6 | Microsandbox Cloud | 893.4 | 869.3 – 921.2 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 843.6 | 702 – 853.5 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 703.1 | 464 – 808.5 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 655.9 | 642.8 – 656.9 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 423.6 | 406.3 – 590.3 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 294.1 | 289.9 – 915.4 | 3 | 6 | too few sandboxes |
| 12 | E2B | 245.9 | 245.9 – 246.4 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 72850 | 71250 – 223000 | 3 | 6 | — |
| 2 | Blaxel | 55550 | 55250 – 63750 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 50350 | 35500 – 55900 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 50050 | 45850 – 53650 | 3 | 6 | too few sandboxes |
| 5 | boat | 47550 | 45700 – 49400 | 1 | 2 | too few sandboxes |
| 6 | run.cloud | 28250 | 27750 – 30450 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 25150 | 23300 – 25150 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 24450 | 23900 – 37600 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 22300 | 19950 – 26550 | 3 | 6 | too few sandboxes |
| 10 | Novita | 15700 | 15650 – 16300 | 3 | 6 | too few sandboxes |
| 11 | E2B | 9920 | 9846 – 10450 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8869 | 8680 – 8968 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 298.3 | 292 – 912.8 | 3 | 6 | — |
| 2 | Blaxel | 227.5 | 226.5 – 261.1 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 206 | 145.2 – 229.1 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 205 | 187.7 – 219.7 | 3 | 6 | too few sandboxes |
| 5 | boat | 194.5 | 186.6 – 202.4 | 1 | 2 | too few sandboxes |
| 6 | run.cloud | 115.9 | 113.8 – 124.8 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 103 | 95.42 – 103.1 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 100.1 | 97.94 – 154.1 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 91.28 | 81.68 – 108.5 | 3 | 6 | too few sandboxes |
| 10 | Novita | 64.28 | 64.17 – 66.64 | 3 | 6 | too few sandboxes |
| 11 | E2B | 40.68 | 40.37 – 42.73 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 36.33 | 35.55 – 36.75 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.1× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 283500 | 283000 – 288500 | 3 | 6 | — |
| 2 | Namespace | 265000 | 237500 – 268500 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 258500 | 242500 – 263500 | 3 | 6 | too few sandboxes |
| 4 | Novita | 242500 | 240500 – 247000 | 3 | 6 | too few sandboxes |
| 5 | boat | 228500 | 220000 – 237000 | 1 | 2 | too few sandboxes |
| 6 | Microsandbox Cloud | 218000 | 212500 – 224500 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 206000 | 171000 – 208500 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 171500 | 113000 – 197000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 160000 | 157000 – 160500 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 103400 | 99200 – 144000 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 71700 | 70750 – 223500 | 3 | 6 | too few sandboxes |
| 12 | E2B | 60050 | 60000 – 60100 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 27450 | 18500 – 29050 | 3 | 6 | — |
| 2 | Daytona (VM) | 11450 | 10800 – 12250 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 8846 | 7367 – 10650 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 6291 | 6033 – 6593 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 5013 | 4688 – 6001 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4875 | 4868 – 5016 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 4324 | 1849 – 4365 | 3 | 6 | too few sandboxes |
| 8 | boat | 3605 | 3381 – 3828 | 1 | 2 | too few sandboxes |
| 9 | Microsandbox Cloud | 3057 | 2885 – 3062 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 2745 | 2662 – 3641 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1887 | 1855 – 1937 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 28830 | 19380 – 30440 | 3 | 6 | — |
| 2 | Daytona (VM) | 12030 | 11340 – 12830 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9277 | 7726 – 11140 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 6598 | 6327 – 6915 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 5257 | 4917 – 6294 | 3 | 6 | too few sandboxes |
| 6 | Novita | 5114 | 5105 – 5261 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 4536 | 1941 – 4579 | 3 | 6 | too few sandboxes |
| 8 | boat | 3781 | 3546 – 4016 | 1 | 2 | too few sandboxes |
| 9 | Microsandbox Cloud | 3207 | 3026 – 3212 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 2880 | 2793 – 3820 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1980 | 1947 – 2033 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.2 | 629.7 – 630.2 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 4916 | 4305 – 5069 | 3 | 6 | — |
| 2 | Daytona (VM) | 4501 | 4437 – 5116 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 4458 | 4138 – 4860 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 3616 | 3395 – 6459 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3442 | 3198 – 4422 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3032 | 2992 – 3298 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 2642 | 2039 – 2977 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2357 | 2308 – 2428 | 3 | 6 | too few sandboxes |
| 9 | boat | 1805 | 1649 – 1961 | 1 | 2 | too few sandboxes |
| 10 | Microsandbox Cloud | 1763 | 1479 – 1772 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1740 | 1679 – 1745 | 3 | 6 | too few sandboxes |
| 12 | E2B | 595.5 | 589 – 597.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5156 | 4516 – 5316 | 3 | 6 | — |
| 2 | Daytona (VM) | 4721 | 4655 – 5366 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 4676 | 4341 – 5097 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 3793 | 3561 – 6774 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3610 | 3355 – 4638 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3181 | 3138 – 3460 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 2772 | 2139 – 3124 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2473 | 2422 – 2548 | 3 | 6 | too few sandboxes |
| 9 | boat | 1894 | 1730 – 2057 | 1 | 2 | too few sandboxes |
| 10 | Microsandbox Cloud | 1849 | 1552 – 1860 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1827 | 1763 – 1831 | 3 | 6 | too few sandboxes |
| 12 | E2B | 626 | 619.2 – 628.1 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 28.19 | 8.02 – 28.63 | 3 | 6 | — |
| 2 | Daytona (VM) | 25.26 | 24.73 – 25.5 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 18.48 | 18.41 – 18.92 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 17.21 | 17.04 – 17.79 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 16.36 | 15.69 – 18.07 | 3 | 6 | too few sandboxes |
| 6 | Novita | 11.8 | 11.54 – 12.44 | 3 | 6 | too few sandboxes |
| 7 | boat | 11.13 | 10.99 – 11.26 | 1 | 2 | too few sandboxes |
| 8 | Microsandbox Cloud | 8.42 | 8.355 – 8.455 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 8.16 | 8.11 – 10.86 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 7.625 | 7.595 – 7.91 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 2.62 | 2.535 – 5.055 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.845 | 1.73 – 1.865 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Modal (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 179200 | 178500 – 179500 | 3 | 6 | — |
| 2 | Modal (VM) | 97720 | 63370 – 126600 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 68450 | 49220 – 80180 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 57080 | 54100 – 96290 | 3 | 6 | too few sandboxes |
| 5 | Novita | 53740 | 52970 – 53800 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 52310 | 46700 – 52750 | 3 | 6 | too few sandboxes |
| 7 | E2B | 46780 | 44180 – 52540 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 44560 | 41450 – 44770 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 41470 | 39700 – 44310 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 32650 | 31710 – 33100 | 3 | 6 | too few sandboxes |
| 11 | boat | 32570 | 32250 – 32730 | 3 | 6 | too few sandboxes |
| 12 | tama | 7257 | 7254 – 7261 | 2 | 4 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 178900 | 178100 – 179200 | 3 | 6 | — |
| 2 | Modal (VM) | 97030 | 63850 – 124700 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 72960 | 48740 – 76580 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 57010 | 54440 – 96110 | 3 | 6 | too few sandboxes |
| 5 | Novita | 53600 | 53099 – 53770 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 52020 | 46010 – 52560 | 3 | 6 | too few sandboxes |
| 7 | E2B | 46390 | 43686 – 52200 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 43790 | 39930 – 44430 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 41580 | 39790 – 44470 | 3 | 6 | too few sandboxes |
| 10 | boat | 32530 | 32220 – 32680 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 32230 | 31570 – 32989 | 3 | 6 | too few sandboxes |
| 12 | tama | 7651 | 7263 – 8040 | 2 | 4 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~2.2× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 206900 | 203600 – 208500 | 3 | 6 | — |
| 2 | Modal (gVisor) | 95180 | 84120 – 108400 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 89400 | 75920 – 107800 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 87580 | 85720 – 126900 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 79212 | 39410 – 80450 | 3 | 6 | too few sandboxes |
| 6 | E2B | 75540 | 71830 – 80440 | 3 | 6 | too few sandboxes |
| 7 | Novita | 58460 | 57930 – 58520 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 53760 | 50550 – 60770 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 43550 | 41200 – 69020 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 42850 | 42040 – 44630 | 3 | 6 | too few sandboxes |
| 11 | boat | 42500 | 42230 – 42780 | 3 | 6 | too few sandboxes |
| 12 | tama | 8015 | 7930 – 8099 | 2 | 4 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 170300 | 170000 – 171000 | 3 | 6 | — |
| 2 | Modal (VM) | 99260 | 60390 – 122600 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 60090 | 44730 – 71010 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 52660 | 51440 – 85450 | 3 | 6 | too few sandboxes |
| 5 | Novita | 51270 | 50600 – 51314 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 45150 | 42240 – 47410 | 3 | 6 | too few sandboxes |
| 7 | E2B | 40180 | 37240 – 45590 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 37760 | 36000 – 40220 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 37730 | 36580 – 40150 | 3 | 6 | too few sandboxes |
| 10 | boat | 29560 | 29320 – 29620 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 29220 | 28780 – 30180 | 3 | 6 | too few sandboxes |
| 12 | tama | 7993 | 7961 – 8026 | 2 | 4 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 11 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 11 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.4× Modal (gVisor) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 9146 | 3898 – 9948 | 3 | 6 | — |
| 2 | Modal (gVisor) | 6572 | 1247 – 6809 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5771 | 4400 – 6046 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 3900 | 2343 – 6717 | 3 | 6 | too few sandboxes |
| 5 | E2B | 3351 | 3172 – 3576 | 3 | 6 | too few sandboxes |
| 6 | tama | 2364 | 2357 – 2371 | 1 | 2 | too few sandboxes |
| 7 | Namespace | 2339 | 2299 – 3160 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 1357 | 953.9 – 1965 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 1317 | 1038 – 1453 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1272 | 1006 – 2098 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 936.9 | 936.4 – 936.9 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads · ~1.1× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5386 | 4089 – 5691 | 3 | 6 | — |
| 2 | Vercel Sandbox | 4881 | 4593 – 5043 | 3 | 6 | too few sandboxes |
| 3 | Novita | 4238 | 1105 – 5340 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 3330 | 855.9 – 4696 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 3211 | 2061 – 3764 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3095 | 1418 – 3869 | 3 | 6 | too few sandboxes |
| 7 | tama | 2456 | 2247 – 2665 | 1 | 2 | too few sandboxes |
| 8 | Runloop | 2063 | 1386 – 2376 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 1975 | 1936 – 3217 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1822 | 957.9 – 2507 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 934.1 | 880.9 – 934.3 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~2.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 11 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 157222 | 157062 – 158300 | 3 | 6 | — |
| 2 | Daytona (VM) | 76311 | 59180 – 93633 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 63620 | 58083 – 92167 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 59983 | 40970 – 61750 | 3 | 6 | too few sandboxes |
| 5 | E2B | 56090 | 51492 – 64640 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 55754 | 30340 – 56449 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 35130 | 33785 – 36090 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 31080 | 24190 – 37620 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 30329 | 20870 – 120274 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 17290 | 8224 – 20480 | 3 | 6 | too few sandboxes |
| 11 | tama | 9100 | 8974 – 9226 | 1 | 2 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.8× Daytona (VM) on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 11 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156400 | 151500 – 158862 | 3 | 6 | — |
| 2 | Daytona (VM) | 88614 | 82326 – 89090 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 86360 | 77370 – 102502 | 3 | 6 | too few sandboxes |
| 4 | E2B | 52947 | 48890 – 60250 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 49280 | 36640 – 55160 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 43620 | 36830 – 46994 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 43042 | 37824 – 46091 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 41995 | 37895 – 42894 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 19707 | 15370 – 85280 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 16239 | 9475 – 19850 | 3 | 6 | too few sandboxes |
| 11 | tama | 10681 | 10557 – 10805 | 1 | 2 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 11 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | — |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 2 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 10 | Modal (gVisor) | 255.5 | 118.5 – 271 | 3 | 6 | too few sandboxes |
| 11 | tama | 97.9 | 86.8 – 109 | 1 | 2 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 34.19 | 32.8 – 35.68 | 3 | 6 | — |
| 2 | boat | 34.33 | 32.95 – 34.38 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 38.04 | 36.71 – 38.29 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 39.78 | 38.98 – 43.15 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 40.3 | 40.23 – 40.32 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 41.94 | 40.73 – 42.69 | 3 | 6 | too few sandboxes |
| 7 | Novita | 44.46 | 43.73 – 45.02 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 47.35 | 41.71 – 48.02 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 65.75 | 65.37 – 65.91 | 3 | 6 | too few sandboxes |
| 10 | E2B | 67.62 | 58.12 – 69.67 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 68.61 | 61.27 – 70.78 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 83.65 | 61.91 – 85.32 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_boat leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 381300 | 297800 – 384200 | 3 | 6 | — |
| 2 | Blaxel | 315100 | 295600 – 318000 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 292800 | 289500 – 303600 | 3 | 6 | too few sandboxes |
| 4 | Novita | 289100 | 282200 – 294000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 275500 | 194400 – 277500 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 246900 | 236300 – 262200 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 246500 | 234200 – 247100 | 3 | 6 | too few sandboxes |
| 8 | E2B | 213500 | 163300 – 249700 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 179700 | 164500 – 188600 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 168700 | 166300 – 169100 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 125500 | 103500 – 131100 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 70550 | 45130 – 112800 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_boat leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.131 | 0.13 – 0.168 | 3 | 6 | — |
| 2 | Blaxel | 0.1585 | 0.1575 – 0.1695 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 0.171 | 0.1645 – 0.173 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.173 | 0.17 – 0.177 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 0.1815 | 0.18 – 0.257 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 0.2025 | 0.191 – 0.2115 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 0.203 | 0.2025 – 0.2135 | 3 | 6 | too few sandboxes |
| 8 | E2B | 0.234 | 0.2 – 0.3065 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.2785 | 0.266 – 0.3115 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 0.296 | 0.296 – 0.301 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 0.3995 | 0.382 – 0.483 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 0.7095 | 0.443 – 1.108 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 26750 | 26120 – 27980 | 3 | 6 | — |
| 2 | boat | 25710 | 19360 – 27230 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 22050 | 21910 – 24380 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 20680 | 20460 – 20960 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 18920 | 14690 – 19050 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 17240 | 15030 – 17290 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 17210 | 16560 – 17320 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 16130 | 15850 – 18330 | 3 | 6 | too few sandboxes |
| 9 | Daytona (VM) | 15120 | 13970 – 16490 | 3 | 6 | too few sandboxes |
| 10 | E2B | 12510 | 10070 – 12640 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 11450 | 11260 – 12290 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 8538 | 5920 – 12850 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.872 | 1.788 – 1.923 | 3 | 6 | — |
| 2 | boat | 1.945 | 1.837 – 2.583 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.268 | 2.075 – 2.284 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 2.418 | 2.386 – 2.444 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 2.646 | 2.625 – 3.409 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 2.901 | 2.896 – 3.326 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 2.905 | 2.886 – 3.019 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 3.121 | 2.731 – 3.18 | 3 | 6 | too few sandboxes |
| 9 | Daytona (VM) | 3.306 | 3.031 – 3.615 | 3 | 6 | too few sandboxes |
| 10 | E2B | 3.998 | 3.957 – 4.966 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 4.392 | 4.098 – 4.441 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 5.856 | 3.892 – 8.449 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 366.5 | 363.5 – 374 | 3 | 6 | — |
| 2 | Daytona (VM) | 405.5 | 402.5 – 407.5 | 3 | 6 | too few sandboxes |
| 3 | boat | 407.5 | 399 – 410.5 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 451 | 448.5 – 461.5 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 452 | 451 – 452.5 | 3 | 6 | too few sandboxes |
| 6 | Novita | 477.5 | 476.5 – 481 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 511.5 | 491.5 – 515 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 666 | 477 – 670 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 766.5 | 766.5 – 767 | 3 | 6 | too few sandboxes |
| 10 | E2B | 806.5 | 527.5 – 811 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 912 | 772 – 923 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 1199 | 771 – 1213 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.81 | 31.78 – 32.97 | 3 | 6 | — |
| 2 | Namespace | 36.08 | 32.17 – 37.54 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 39.1 | 38.25 – 40.84 | 3 | 6 | too few sandboxes |
| 4 | Novita | 41.05 | 39.66 – 43.35 | 3 | 6 | too few sandboxes |
| 5 | boat | 45.07 | 44.99 – 46.37 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 47.43 | 47.01 – 47.56 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 64.91 | 35.73 – 65.65 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 69.95 | 67.23 – 70.59 | 3 | 6 | too few sandboxes |
| 9 | E2B | 73.63 | 59.44 – 75.02 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 84.33 | 69.59 – 84.87 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 89.43 | 68.48 – 91.31 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 257.5 | 171.1 – 260.3 | 3 | 6 | too few sandboxes |

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

72 uncovered results across 6 providers (Blaxel 10, boat 6, E2B 2, Modal (gVisor) 2, tama 50, Vercel Sandbox 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

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
| boat | disk | **failed** | Failed to create sandbox: boat sandbox not ready within 480000ms |
| boat | disk | **failed** | Partial publication withheld unverified measurements: hardlink_bogo_ops_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops |
| boat | network | **failed** | Failed to create sandbox: boat sandbox not ready within 480000ms |
| boat | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| boat | realworld-openclaw | **failed** | Failed to create sandbox: boat sandbox not ready within 480000ms |
| boat | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | disk | **failed** | Step "BENCH_FIO_DIRECT=No mise run benchmark:disk:all" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step |
| tama | disk | **failed** | Partial publication withheld unverified measurements: hardlink_bogo_ops_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops |
| tama | memory | **failed** | Step "mise run benchmark:memory:all" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll) — the sandbox stopped responding, not a quiet long step |
| tama | memory | **failed** | Partial publication withheld unverified measurements: stream_type_copy, stream_type_scale, stream_type_add, stream_type_triad |
| tama | network | **failed** | Failed to create sandbox: tama new bench-2fdbb66c-2a06-40eb-b1c8-6abe57c4928a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2fdbb66c-2a06-40eb-b1c8-6abe57c4928a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | network | **failed** | Failed to create sandbox: tama new bench-24dc8ca5-844a-4970-b210-98c635181137 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-24dc8ca5-844a-4970-b210-98c635181137 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | pgbench | **failed** | Step "mise run benchmark:pgbench:all" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step |
| tama | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| tama | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-3vzghdorrwed: exit 1; tama: bench-15ee8e74-9ed5-4d97-a637-f06f3e8165a2 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-g2d9upnas01g: exit 1; tama: bench-6e64648f-9b37-4100-bc61-08da0c318ba1 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-a86005b3-01d5-4539-bac2-93624ae6c0c3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a86005b3-01d5-4539-bac2-93624ae6c0c3 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5f6dcbe0-fd2b-4b89-93b3-67ff11070945 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5f6dcbe0-fd2b-4b89-93b3-67ff11070945 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-hu10lykt42xd: exit 1; tama: bench-b4ad6d53-6d2a-493f-84bc-945402903816 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-1f34692b-b55d-4336-9557-99cd490af89d --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1f34692b-b55d-4336-9557-99cd490af89d failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-cb73dd10-5b48-443e-8e13-b4b500773b03 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-cb73dd10-5b48-443e-8e13-b4b500773b03 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-7a7af42f-41b9-45b9-bd1d-197a8eeb0952 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7a7af42f-41b9-45b9-bd1d-197a8eeb0952 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-46668202-2d2c-4d05-94af-39ac847c24f9 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-46668202-2d2c-4d05-94af-39ac847c24f9 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-da376077-5cce-4f30-a334-109e0635e55a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-da376077-5cce-4f30-a334-109e0635e55a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f1e6fdfe-7c54-46dc-b204-5153185f176a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f1e6fdfe-7c54-46dc-b204-5153185f176a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-5olul3ht61hc: exit 1; tama: bench-96389d30-2d4e-42bf-9a68-c1cfb3282a83 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-2186ammu0w4n: exit 1; tama: bench-24c7ad26-55ff-4e91-92da-dcb8b59ccbf6 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-3ahebfoj65gl: exit 1; tama: bench-58b1332d-4f34-48df-ae6a-4933356f421a is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-pmdn6pxz5s2r: exit 1; tama: bench-636616da-bd9f-42e2-8efb-90cac76e88f7 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-krpodczykzyd: exit 1; tama: bench-0a5ffa0a-c72a-40f3-aa74-12b357bb6ad3 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-8nmhalfr3hhn: exit 1; tama: bench-065d9a7c-57a5-4d8d-b35d-73bfdf81fc8b is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-dqnfsj8egid9: exit 1; tama: bench-33928068-608f-4547-9084-228ed5d8da8d is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-m1mp1dg90ion: exit 1; tama: bench-ad3f0d8c-fe95-483d-a355-6ab1fe1dad5f is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-6md3dtw4i7lb: exit 1; tama: bench-258b0f1d-9860-4645-ab0c-3c6d261dfc0a is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-akj2uf63tvmq: exit 1; tama: bench-e8082847-69f6-4e20-a1a6-45225192189c is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-oibq1xhk1ldu: exit 1; tama: bench-d31af899-5474-45db-ac40-490de3daf028 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step; Cleanup unresolved: tama rm -y machine-s8xasi3zc9ou: exit 1; tama: bench-896efa6a-7829-4c67-ae1b-e0c7f9cc8690 is being snapshotted; wait for it to finish; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-10bbb4b2-736a-41be-8f54-ae9159e29d2c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-10bbb4b2-736a-41be-8f54-ae9159e29d2c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-58702de0-0fd7-47a6-b21c-7cedcdba6da4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-58702de0-0fd7-47a6-b21c-7cedcdba6da4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-2585359f-cf80-480f-b0e0-04636be8cdbc --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2585359f-cf80-480f-b0e0-04636be8cdbc failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4646a2c0-e1c7-46f6-aa93-0f00b5266539 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4646a2c0-e1c7-46f6-aa93-0f00b5266539 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-cdc2092d-5576-4ff0-8c10-06c1d6448017 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-cdc2092d-5576-4ff0-8c10-06c1d6448017 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e09b18d5-68b6-4a33-8d1c-c27d03450515 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e09b18d5-68b6-4a33-8d1c-c27d03450515 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-62429bd3-8a13-4c2a-9f1f-673c181dbcfa --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-62429bd3-8a13-4c2a-9f1f-673c181dbcfa failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-75701e13-f5df-4ed6-a0f7-d8927098e30b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-75701e13-f5df-4ed6-a0f7-d8927098e30b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e6ff510b-9800-4637-81ce-089e2a096943 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e6ff510b-9800-4637-81ce-089e2a096943 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6335eb11-bd54-45ba-978e-9404db5a15fd --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6335eb11-bd54-45ba-978e-9404db5a15fd failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d1215b3e-f6e6-4906-b0b8-94dbb7a91610 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d1215b3e-f6e6-4906-b0b8-94dbb7a91610 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-de501120-80bb-4e3e-a784-8d9dfff2e0aa --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-de501120-80bb-4e3e-a784-8d9dfff2e0aa failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | system | **failed** | Step "mise run benchmark:system:all" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll returned exit 1 — sandbox not responding) — the sandbox stopped responding, not a quiet long step |
| tama | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| Vercel Sandbox | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Vercel Sandbox | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Namespace | — | — |
| realworld | Mastra: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: cold install | Daytona (VM) | 0.068 (tied) | 0.066 |
| realworld | Mastra: cold install | Novita | 0.48 (tied) | 0.19 |
| realworld | Mastra: cold install | boat | <0.001 | 0.0046 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.80 (tied) | 0.79 |
| realworld | Mastra: cold install | Modal (VM) | 0.51 (tied) | 0.19 |
| realworld | Mastra: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.27 (tied) | 0.19 |
| realworld | Mastra: cold install | E2B | 0.98 (tied) | 0.43 |
| realworld | Mastra: cold install | Runloop | <0.001 | <0.001 |
| realworld | Mastra: cold install | run.cloud | 0.11 (tied) | 0.019 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | boat | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: build | Daytona (VM) | 0.0023 | 0.0046 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.010 | 0.066 |
| realworld | Better-Auth: build | Novita | 0.93 (tied) | 0.066 |
| realworld | Better-Auth: build | Blaxel | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: build | Modal (VM) | 1.0 (tied) | 0.79 |
| realworld | Better-Auth: build | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.22 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.089 (tied) | 0.19 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | boat | 0.0068 | 0.019 |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.44 (tied) | 0.79 |
| realworld | Better-Auth: cold install | Novita | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: cold install | run.cloud | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: cold install | E2B | 0.80 (tied) | 0.99 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.0036 | 0.0046 |
| realworld | Better-Auth: cold install | Runloop | 0.22 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.0068 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.086 (tied) | 0.0046 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0023 | 0.019 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: git clone | E2B | 0.63 (tied) | 0.79 |
| realworld | Better-Auth: git clone | boat | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Novita | 1.0 (tied) | 0.99 |
| realworld | Better-Auth: git clone | run.cloud | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Runloop | 0.24 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.41 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.076 (tied) | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.19 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.72 (tied) | 0.99 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.51 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.0065 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.19 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | 0.089 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.045 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.27 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.0083 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.0036 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | boat | 0.14 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.0056 | 0.066 |
| realworld | Better-Auth: lint format | Novita | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Blaxel | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: lint format | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: lint format | E2B | 0.41 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.63 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Novita | 0.014 | 0.019 |
| realworld | Better-Auth: lint packages | Blaxel | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.33 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | E2B | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | 0.060 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Namespace | 0.71 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | 0.0028 | 0.0046 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 1.0 (tied) | 0.99 |
| realworld | Better-Auth: lint spell | Novita | 0.93 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.41 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.0014 | 0.0046 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.71 (tied) | 0.99 |
| realworld | Better-Auth: lint spell | E2B | 0.71 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Runloop | 0.0045 | <0.001 |
| realworld | Better-Auth: lint types | boat | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Namespace | 0.38 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint types | Blaxel | 0.80 (tied) | 0.99 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | 0.84 (tied) | 0.79 |
| realworld | Better-Auth: lint types | run.cloud | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Namespace | 0.41 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Novita | 0.40 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.37 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Blaxel | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.55 (tied) | 0.79 |
| realworld | Better-Auth: typecheck | E2B | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.020 | 0.019 |
| realworld | Better-Auth: typecheck | Runloop | 0.13 (tied) | 0.19 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | boat | 0.22 (tied) | 0.066 |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | 0.0056 | 0.0046 |
| realworld | Mastra: build:core | Blaxel | 0.29 (tied) | 0.19 |
| realworld | Mastra: build:core | Microsandbox Cloud | 1.0 (tied) | 0.99 |
| realworld | Mastra: build:core | Modal (VM) | 0.045 | 0.019 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.0056 | 0.0046 |
| realworld | Mastra: build:core | E2B | 0.59 (tied) | 0.43 |
| realworld | Mastra: build:core | Vercel Sandbox | 0.44 (tied) | 0.43 |
| realworld | Mastra: build:core | Runloop | 0.0029 | <0.001 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.24 (tied) | 0.066 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.27 (tied) | 0.43 |
| realworld | Mastra: git clone | Blaxel | 0.84 (tied) | 0.19 |
| realworld | Mastra: git clone | Daytona (VM) | 0.38 (tied) | 0.19 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.55 (tied) | 0.43 |
| realworld | Mastra: git clone | boat | 0.039 | 0.019 |
| realworld | Mastra: git clone | run.cloud | 0.38 (tied) | 0.79 |
| realworld | Mastra: git clone | E2B | 0.80 (tied) | 0.43 |
| realworld | Mastra: git clone | Novita | 0.48 (tied) | 0.19 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.77 (tied) | 0.43 |
| realworld | Mastra: git clone | Runloop | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | boat | 0.93 (tied) | 0.19 |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.35 (tied) | 0.79 |
| realworld | Mastra: lint:format | Novita | 0.71 (tied) | 0.19 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.20 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (VM) | 0.14 (tied) | 0.066 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.11 (tied) | 0.19 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.63 (tied) | 0.19 |
| realworld | Mastra: lint:format | E2B | 0.67 (tied) | 0.79 |
| realworld | Mastra: lint:format | Runloop | <0.001 | 0.0046 |
| realworld | Mastra: test:core | boat | — | — |
| realworld | Mastra: test:core | Namespace | 0.38 (tied) | 0.19 |
| realworld | Mastra: test:core | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | 0.67 (tied) | 0.19 |
| realworld | Mastra: test:core | Blaxel | 0.32 (tied) | 0.43 |
| realworld | Mastra: test:core | Novita | 0.0056 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.14 (tied) | 0.0046 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.037 | 0.0076 |
| realworld | Mastra: test:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: test:core | E2B | 0.78 (tied) | 0.82 |
| realworld | Mastra: test:core | Runloop | 0.0036 | 0.0059 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.71 (tied) | 0.99 |
| realworld | OpenClaw: cold install | Novita | 0.80 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: cold install | boat | 0.14 (tied) | 0.11 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.38 (tied) | 0.76 |
| realworld | OpenClaw: cold install | run.cloud | 0.24 (tied) | 0.066 |
| realworld | OpenClaw: cold install | E2B | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Runloop | 0.63 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.80 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | 0.0023 | <0.001 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.0029 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.18 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.13 (tied) | 0.0046 |
| realworld | OpenClaw: git clone | Novita | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: git clone | boat | 0.0056 | 0.0032 |
| realworld | OpenClaw: git clone | E2B | 0.28 (tied) | 0.16 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.10 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Runloop | 0.045 | 0.066 |
| realworld | OpenClaw: git clone | run.cloud | 0.48 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Namespace | 0.0026 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.51 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | 0.51 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.71 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.51 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.010 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.59 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.93 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.014 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | 0.020 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.11 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.32 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.039 | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.068 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.0036 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.068 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.98 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.052 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.14 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.67 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.27 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.12 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.34 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.0099 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.48 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.028 | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.93 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.10 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.32 (tied) | 0.43 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Namespace | 0.40 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Novita | 0.80 (too few sandboxes, equal medians) | 0.81 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| cpu | Node.js web tooling | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | Runloop | 0.10 (too few sandboxes) | 0.077 |
| cpu | Node.js web tooling | E2B | 1.0 (too few sandboxes) | 0.32 |
| cpu | Node.js web tooling | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | 0.50 (too few sandboxes) | 0.11 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.30 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | 0.50 (too few sandboxes) | 0.11 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.68 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 1.0 |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 1.0 |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 0.50 (too few sandboxes) | 0.033 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.68 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | — | — |
| disk | Hardlink throughput | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.50 (too few sandboxes) | 0.11 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.033 |
| disk | Hardlink throughput | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | boat | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | tama | 0.20 (too few sandboxes) | 0.0047 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Namespace | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | tama | 0.20 (too few sandboxes) | 0.0047 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Namespace | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | boat | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | tama | 0.20 (too few sandboxes) | 0.0047 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Runloop | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Namespace | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | tama | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Novita | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | tama | 0.50 (too few sandboxes) | 0.033 |
| network | iperf3 WAN download | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Runloop | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.70 (too few sandboxes) | 1.0 |
| network | iperf3 WAN upload | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Runloop | 0.50 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | E2B | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | tama | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | tama | 0.50 (too few sandboxes) | 0.033 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | boat | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| system | Git common operations | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | boat | — | — |
| system | pgbench RO (s100, 50c) | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | boat | — | — |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.50 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.60 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | boat | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | boat | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.80 (too few sandboxes) | 0.81 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Microsandbox Cloud | 0.80 (too few sandboxes) | 0.32 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.60 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Novita | 0.20 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | boat | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

