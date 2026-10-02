# Sandbox provider leaderboard

Run [`36796890905`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36796890905) · commit [`8d12320592d858202f46648b903bf4e5a75d086f`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/8d12320592d858202f46648b903bf4e5a75d086f) ·
dataset [`data/dataset/runs/36796890905.json`](data/dataset/runs/36796890905.json) · generated 2026-10-02T07:12:36.400Z

**Repaired experiment.** 152 originally failed or missing cells were selected for repair in [`36969794621`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36969794621). 116 cells have replacement attempts; 36 never reached execution and remain missing. Original successful cells were preserved. This dataset includes remeasurement selected by original failure; it is not a first-attempt-only comparison.

**Partial results — incomplete experiment.** 736 of 840 planned cells complete; 104 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:4e7a1f70793407b9feb40c2ffe73d3a4ec981dd0beaf6ab197570684df16a15b`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **642 metric records**
backed by **5490 retained trial observations**, across **48 metrics** and
**14 providers**; every emitted, catalogued metric has a ranked table below
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
| Brezel | Firecracker microVM | firecracker (microVM, confirmed) |
| Daytona (VM) | microVM (Linux VM) | firecracker (microVM, confirmed) |
| E2B | Firecracker microVM | firecracker (microVM, confirmed) |
| Freestyle | KVM virtual machine | firecracker (microVM, strong) |
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

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **96 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 13 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 13 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 12 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Brezel leads · Namespace is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 25.24 | 25.09 – 25.48 | 12 | 12 | — |
| 2 | Namespace | 35.19 | 34.87 – 37.54 | 12 | 12 | — |
| 3 | Daytona (VM) | 38.7 | 37.58 – 39.14 | 12 | 12 | — |
| 4 | Novita | 44.77 | 42.64 – 45.42 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 47.27 | 44.14 – 53.3 | 12 | 12 | tied |
| 4 | Blaxel | 53.35 | 51.63 – 54.93 | 12 | 12 | tied |
| 4 | Modal (VM) | 55.58 | 49.21 – 64.43 | 12 | 12 | tied |
| 8 | E2B | 72.48 | 66.06 – 84.36 | 12 | 12 | — |
| 8 | Freestyle | 82.05 | 79.88 – 84.94 | 12 | 12 | tied |
| 8 | Runloop | 82.2 | 80.13 – 83.44 | 12 | 12 | tied |
| 11 | tama | 96.87 | 83.17 – 109.2 | 12 | 12 | — |
| 11 | Modal (gVisor) | 108.9 | 74.02 – 132.8 | 12 | 12 | tied |
| 11 | run.cloud | 116.3 | 99.14 – 131 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 42.19 | 42.1 – 42.35 | 12 | 12 | — |
| 2 | Namespace | 52.13 | 50.25 – 56.18 | 12 | 12 | — |
| 2 | Daytona (VM) | 53.79 | 52.15 – 55.29 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 63.3 | 62.73 – 70.8 | 12 | 12 | — |
| 4 | Novita | 63.85 | 62.77 – 66.16 | 12 | 12 | tied |
| 4 | Modal (VM) | 68.88 | 63.53 – 71.12 | 12 | 12 | tied |
| 7 | tama | 76.09 | 73.09 – 80.37 | 12 | 12 | — |
| 8 | Blaxel | 83.66 | 81.95 – 92.86 | 12 | 12 | — |
| 8 | run.cloud | 92.03 | 75.84 – 96.87 | 12 | 12 | tied |
| 10 | E2B | 97.01 | 95.21 – 107.1 | 12 | 12 | — |
| 11 | Freestyle | 114.7 | 113 – 117.4 | 12 | 12 | — |
| 12 | Runloop | 128.6 | 122.6 – 129.6 | 12 | 12 | — |
| 13 | Modal (gVisor) | 148.9 | 143.3 – 154.5 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 8.424 | 8.091 – 8.604 | 12 | 12 | — |
| 2 | Namespace | 9.937 | 9.543 – 10.46 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 14.1 | 13.82 – 14.4 | 12 | 12 | — |
| 3 | Blaxel | 15.24 | 14.27 – 15.48 | 12 | 12 | tied |
| 5 | run.cloud | 16.88 | 15.69 – 22.26 | 12 | 12 | — |
| 5 | Daytona (VM) | 17.2 | 11.83 – 21.57 | 12 | 12 | tied |
| 5 | E2B | 20.06 | 18.99 – 20.63 | 12 | 12 | tied |
| 5 | Modal (VM) | 20.08 | 15.82 – 21.11 | 12 | 12 | tied |
| 5 | Novita | 20.79 | 18.47 – 25.17 | 12 | 12 | tied |
| 5 | Runloop | 22.4 | 21.56 – 22.89 | 12 | 12 | tied |
| 11 | tama | 27.53 | 22.78 – 32.4 | 12 | 12 | — |
| 11 | Freestyle | 33.69 | 29.2 – 35.5 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 38.33 | 35.94 – 44.97 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.606 | 0.5565 – 1.066 | 12 | 12 | — |
| 1 | Blaxel | 0.755 | 0.7275 – 0.799 | 12 | 12 | tied |
| 3 | Modal (VM) | 0.8755 | 0.7625 – 1.322 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 1.058 | 1.011 – 1.102 | 12 | 12 | tied |
| 5 | Daytona (VM) | 1.467 | 1.249 – 1.74 | 12 | 12 | — |
| 5 | E2B | 1.573 | 1.502 – 1.657 | 12 | 12 | tied |
| 5 | Runloop | 1.709 | 1.493 – 3.78 | 12 | 12 | tied |
| 5 | Novita | 1.911 | 1.725 – 2.032 | 12 | 12 | tied |
| 9 | Brezel | 2.036 | 2.012 – 2.15 | 12 | 12 | — |
| 9 | run.cloud | 2.13 | 1.856 – 2.864 | 12 | 12 | tied |
| 9 | tama | 2.286 | 1.594 – 3.774 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 2.975 | 2.449 – 3.178 | 12 | 12 | tied |
| 13 | Freestyle | 8.144 | 2.878 – 10.16 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2.192 | 2.16 – 2.2 | 12 | 12 | — |
| 2 | Namespace | 2.543 | 2.482 – 2.689 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.852 | 2.785 – 2.977 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.16 | 3.085 – 3.442 | 12 | 12 | — |
| 4 | Novita | 3.193 | 3.135 – 3.293 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.558 | 3.229 – 3.814 | 12 | 12 | — |
| 7 | Blaxel | 4.155 | 3.902 – 4.45 | 12 | 12 | — |
| 7 | run.cloud | 4.294 | 3.994 – 4.567 | 12 | 12 | tied |
| 9 | E2B | 4.874 | 4.733 – 5.313 | 12 | 12 | — |
| 9 | tama | 5.695 | 4.439 – 6.516 | 12 | 12 | tied |
| 9 | Freestyle | 5.858 | 5.687 – 6.095 | 12 | 12 | tied |
| 12 | Runloop | 6.114 | 5.95 – 6.258 | 12 | 12 | — |
| 13 | Modal (gVisor) | 11.59 | 10.24 – 12.45 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 6.84 | 6.777 – 6.863 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.44 | 9.29 – 9.681 | 12 | 12 | — |
| 2 | Namespace | 9.639 | 9.41 – 9.97 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 10.32 | 9.995 – 13.38 | 12 | 12 | — |
| 4 | Novita | 10.89 | 10.71 – 11.04 | 12 | 12 | tied |
| 6 | Modal (VM) | 12.53 | 11.22 – 12.88 | 12 | 12 | — |
| 7 | run.cloud | 13.3 | 12.57 – 14.32 | 12 | 12 | — |
| 7 | Blaxel | 13.37 | 12.94 – 13.72 | 12 | 12 | tied |
| 7 | tama | 13.95 | 12.86 – 15.71 | 12 | 12 | tied |
| 10 | E2B | 18.08 | 17.28 – 20.34 | 12 | 12 | — |
| 10 | Freestyle | 19.76 | 19.31 – 20.35 | 12 | 12 | tied |
| 12 | Runloop | 20.99 | 20.4 – 21.28 | 12 | 12 | — |
| 13 | Modal (gVisor) | 33.55 | 31.41 – 35.21 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2.006 | 1.98 – 2.026 | 12 | 12 | — |
| 2 | Namespace | 2.185 | 2.13 – 2.279 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.533 | 2.496 – 2.572 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 2.757 | 2.683 – 3.788 | 12 | 12 | — |
| 4 | Novita | 2.982 | 2.903 – 3.005 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.309 | 2.986 – 3.676 | 12 | 12 | — |
| 7 | run.cloud | 3.617 | 3.428 – 3.954 | 12 | 12 | — |
| 7 | Blaxel | 3.678 | 3.362 – 3.808 | 12 | 12 | tied |
| 9 | tama | 4.199 | 3.973 – 5.133 | 12 | 12 | — |
| 9 | E2B | 4.632 | 4.245 – 5.419 | 12 | 12 | tied |
| 11 | Freestyle | 5.835 | 5.656 – 5.929 | 12 | 12 | — |
| 12 | Runloop | 6.415 | 6.364 – 6.527 | 12 | 12 | — |
| 13 | Modal (gVisor) | 7.2 | 6.652 – 7.81 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1.778 | 1.762 – 1.796 | 12 | 12 | — |
| 2 | Namespace | 2.12 | 2.09 – 2.191 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.357 | 2.352 – 2.495 | 12 | 12 | — |
| 4 | Novita | 2.625 | 2.585 – 2.665 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 2.653 | 2.617 – 3.651 | 12 | 12 | tied |
| 4 | Blaxel | 2.841 | 2.769 – 2.941 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.102 | 2.796 – 3.197 | 12 | 12 | tied |
| 8 | tama | 3.694 | 3.151 – 4.487 | 12 | 12 | — |
| 8 | run.cloud | 3.95 | 3.474 – 4.162 | 12 | 12 | tied |
| 8 | E2B | 4.188 | 3.9 – 4.448 | 12 | 12 | tied |
| 11 | Freestyle | 5.871 | 5.693 – 6.196 | 12 | 12 | — |
| 11 | Runloop | 6.048 | 5.91 – 6.203 | 12 | 12 | tied |
| 13 | Modal (gVisor) | 9.998 | 9.359 – 10.29 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 4.863 | 4.848 – 4.881 | 12 | 12 | — |
| 2 | Namespace | 5.694 | 5.642 – 6.355 | 12 | 12 | — |
| 3 | Daytona (VM) | 6.271 | 6.088 – 6.552 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 6.933 | 6.724 – 9.79 | 12 | 12 | — |
| 4 | Novita | 7.498 | 7.274 – 7.834 | 12 | 12 | tied |
| 4 | Modal (VM) | 8.421 | 7.269 – 8.899 | 12 | 12 | tied |
| 4 | Blaxel | 8.443 | 8.108 – 8.934 | 12 | 12 | tied |
| 8 | tama | 10.1 | 9.02 – 11.15 | 12 | 12 | — |
| 8 | run.cloud | 10.42 | 9.82 – 10.72 | 12 | 12 | tied |
| 10 | E2B | 12.95 | 12.16 – 14.67 | 12 | 12 | — |
| 10 | Freestyle | 13.14 | 13.05 – 13.67 | 12 | 12 | tied |
| 12 | Runloop | 15.41 | 15.26 – 15.81 | 12 | 12 | — |
| 13 | Modal (gVisor) | 18.5 | 16.53 – 19.81 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 20.44 | 20.34 – 20.59 | 12 | 12 | — |
| 2 | Daytona (VM) | 24.79 | 23.62 – 25.54 | 12 | 12 | — |
| 3 | Namespace | 28.36 | 28 – 31.38 | 12 | 12 | — |
| 3 | Novita | 30.26 | 29.1 – 31.15 | 12 | 12 | tied |
| 3 | tama | 32.68 | 28.43 – 40.62 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 33.17 | 32.06 – 44.25 | 12 | 12 | tied |
| 3 | Modal (VM) | 33.85 | 28.48 – 34.76 | 12 | 12 | tied |
| 3 | Blaxel | 34.13 | 32.29 – 34.82 | 12 | 12 | tied |
| 9 | E2B | 48.7 | 46.79 – 54.32 | 12 | 12 | — |
| 9 | run.cloud | 50.3 | 47.04 – 54.23 | 12 | 12 | tied |
| 9 | Freestyle | 52.87 | 51.5 – 54.44 | 12 | 12 | tied |
| 12 | Runloop | 62.74 | 62.15 – 63.58 | 12 | 12 | — |
| 13 | Modal (gVisor) | 117.6 | 110.4 – 120.8 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 27.77 | 27.51 – 28.33 | 12 | 12 | — |
| 2 | Namespace | 33.33 | 32.56 – 37.15 | 12 | 12 | — |
| 3 | Daytona (VM) | 37.22 | 35.55 – 38.42 | 12 | 12 | — |
| 4 | Novita | 43.08 | 41.19 – 44.13 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 44.26 | 41.07 – 49.85 | 12 | 12 | tied |
| 4 | Modal (VM) | 48.13 | 44.02 – 50.11 | 12 | 12 | tied |
| 4 | Blaxel | 48.31 | 45.05 – 52.15 | 12 | 12 | tied |
| 4 | tama | 49.96 | 46.65 – 56.45 | 12 | 12 | tied |
| 9 | run.cloud | 71.49 | 61.08 – 75.73 | 12 | 12 | — |
| 9 | E2B | 72.42 | 68.25 – 81.63 | 12 | 12 | tied |
| 11 | Freestyle | 82.65 | 78.78 – 83.86 | 12 | 12 | — |
| 11 | Modal (gVisor) | 87.18 | 81.04 – 89.97 | 12 | 12 | tied |
| 13 | Runloop | 92.7 | 90.09 – 93.81 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 50.82 | 50.65 – 50.98 | 12 | 12 | — |
| 2 | Namespace | 58.3 | 58.16 – 58.47 | 12 | 12 | — |
| 3 | Daytona (VM) | 67.36 | 65.89 – 71.82 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 76.07 | 72.72 – 88.99 | 12 | 12 | — |
| 4 | Novita | 76.5 | 75.92 – 77.22 | 12 | 12 | tied |
| 6 | Blaxel | 81 | 78.04 – 82.3 | 12 | 12 | — |
| 7 | Modal (VM) | 92.26 | 82.23 – 97.28 | 12 | 12 | — |
| 7 | tama | 92.94 | 89.34 – 98.36 | 12 | 12 | tied |
| 9 | run.cloud | 107.1 | 102 – 109.5 | 12 | 12 | — |
| 10 | E2B | 125.8 | 121.9 – 145 | 12 | 12 | — |
| 10 | Freestyle | 134.6 | 132.3 – 139.7 | 12 | 12 | tied |
| 12 | Runloop | 160.8 | 159 – 161.6 | 12 | 12 | — |
| 12 | Modal (gVisor) | 175.3 | 132.9 – 189.2 | 12 | 12 | tied |

### Mastra: git clone

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.014 | 1.832 – 2.62 | 12 | 12 | — |
| 1 | Namespace | 2.022 | 1.482 – 2.14 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 2.208 | 2.08 – 2.585 | 12 | 12 | — |
| 3 | Modal (VM) | 2.779 | 2.468 – 3.046 | 12 | 12 | tied |
| 5 | Novita | 3.419 | 3.24 – 3.823 | 12 | 12 | — |
| 5 | E2B | 3.774 | 3.631 – 4.281 | 12 | 12 | tied |
| 5 | Blaxel | 4.46 | 2.052 – 4.531 | 12 | 12 | tied |
| 5 | Brezel | 4.589 | 4.446 – 4.658 | 12 | 12 | tied |
| 5 | tama | 4.793 | 3.739 – 5.595 | 12 | 12 | tied |
| 5 | run.cloud | 4.847 | 3.139 – 5.612 | 12 | 12 | tied |
| 5 | Runloop | 4.896 | 4.479 – 5.95 | 12 | 12 | tied |
| 5 | Modal (gVisor) | 6.316 | 4.433 – 6.973 | 12 | 12 | tied |
| 13 | Freestyle | 24.34 | 10.96 – 31.07 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 61.4 | 61.19 – 61.52 | 12 | 12 | — |
| 2 | Namespace | 72.62 | 72.2 – 77.03 | 12 | 12 | — |
| 3 | Daytona (VM) | 86.03 | 82.37 – 94.25 | 12 | 12 | — |
| 4 | Novita | 97.67 | 93.97 – 99.2 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 98.03 | 92.07 – 111.3 | 12 | 12 | tied |
| 4 | tama | 111.5 | 106.6 – 118.9 | 12 | 12 | tied |
| 4 | Modal (VM) | 114.5 | 103 – 118.6 | 12 | 12 | tied |
| 4 | Blaxel | 119 | 115 – 121.2 | 12 | 12 | tied |
| 9 | run.cloud | 139.5 | 132.4 – 142 | 12 | 12 | — |
| 10 | E2B | 159.9 | 148.7 – 170.2 | 12 | 12 | — |
| 10 | Freestyle | 166.2 | 161.5 – 169.7 | 12 | 12 | tied |
| 12 | Runloop | 200.5 | 197.1 – 202.3 | 12 | 12 | — |
| 12 | Modal (gVisor) | 205.4 | 148.4 – 218.4 | 12 | 12 | tied |

### Mastra: test:core

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 770.5 | 769 – 771.9 | 12 | 12 | — |
| 2 | Namespace | 853.5 | 849.6 – 859.3 | 12 | 12 | — |
| 3 | Daytona (VM) | 931 | 898.2 – 993.3 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 949 | 930.1 – 1028 | 12 | 12 | tied |
| 3 | Blaxel | 968.2 | 961.9 – 975.4 | 12 | 12 | tied |
| 6 | Novita | 1011 | 1008 – 1023 | 12 | 12 | — |
| 7 | tama | 1076 | 1071 – 1106 | 12 | 12 | — |
| 7 | Modal (VM) | 1115 | 988.4 – 1140 | 12 | 12 | tied |
| 9 | run.cloud | 1342 | 1299 – 1357 | 12 | 12 | — |
| 10 | E2B | 1416 | 1394 – 1512 | 12 | 12 | — |
| 10 | Freestyle | 1496 | 1468 – 1505 | 12 | 12 | tied |
| 12 | Runloop | 1603 | 1593 – 1622 | 12 | 12 | — |
| 12 | Modal (gVisor) | 2173 | 1424 – 2293 | 12 | 12 | tied |

### OpenClaw: cold install

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 9.436 | 8.809 – 9.759 | 12 | 12 | — |
| 2 | Namespace | 10.15 | 9.753 – 11.65 | 12 | 12 | — |
| 3 | Daytona (VM) | 13.07 | 12.59 – 13.53 | 12 | 12 | — |
| 4 | Blaxel | 13.76 | 13.29 – 14.2 | 12 | 12 | — |
| 5 | Novita | 15.52 | 15.3 – 15.97 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 16.93 | 15.66 – 19.64 | 12 | 12 | tied |
| 5 | Modal (VM) | 18.23 | 15.35 – 21.45 | 12 | 12 | tied |
| 5 | Runloop | 21.25 | 20.39 – 21.67 | 12 | 12 | tied |
| 5 | E2B | 22.65 | 20.33 – 25.72 | 12 | 12 | tied |
| 5 | run.cloud | 27.06 | 19.6 – 33.37 | 12 | 12 | tied |
| 5 | tama | 29.59 | 23.3 – 34.61 | 8 | 8 | tied |
| 5 | Modal (gVisor) | 30.66 | 22.25 – 40.34 | 12 | 12 | tied |
| 5 | Freestyle | 32.19 | 28.23 – 34.7 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace, Microsandbox Cloud, Modal (VM), Daytona (VM), Novita, Blaxel and E2B share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.486 | 2.145 – 7.633 | 12 | 12 | — |
| 1 | Microsandbox Cloud | 3.252 | 3.179 – 3.415 | 12 | 12 | tied |
| 1 | Modal (VM) | 3.52 | 3.224 – 4.293 | 12 | 12 | tied |
| 1 | Daytona (VM) | 3.686 | 3.23 – 4.957 | 12 | 12 | tied |
| 1 | Novita | 4.213 | 3.878 – 4.436 | 12 | 12 | tied |
| 1 | Blaxel | 5.069 | 3.386 – 8.062 | 12 | 12 | tied |
| 1 | E2B | 5.213 | 4.871 – 6.163 | 12 | 12 | tied |
| 8 | Brezel | 9.009 | 8.84 – 10.23 | 12 | 12 | — |
| 8 | Runloop | 9.223 | 5.689 – 12.48 | 12 | 12 | tied |
| 8 | Freestyle | 10.1 | 7.469 – 52.47 | 12 | 12 | tied |
| 8 | run.cloud | 10.23 | 9.227 – 10.52 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 10.63 | 7.791 – 12.14 | 12 | 12 | tied |
| 8 | tama | 15.27 | 9.744 – 19.05 | 8 | 8 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_Brezel leads · Namespace is ~1.5× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 98.74 | 98.31 – 99.43 | 12 | 12 | — |
| 2 | Namespace | 144.2 | 141.7 – 146.4 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 151.9 | 148.9 – 169 | 12 | 12 | — |
| 3 | Daytona (VM) | 152.9 | 148.9 – 156.8 | 12 | 12 | tied |
| 5 | Blaxel | 166.9 | 162.9 – 183.2 | 12 | 12 | — |
| 5 | Novita | 177.1 | 173.1 – 178.5 | 12 | 12 | tied |
| 5 | Modal (VM) | 188.1 | 174.7 – 195 | 12 | 12 | tied |
| 8 | run.cloud | 209.5 | 206.6 – 231.8 | 12 | 12 | — |
| 9 | Freestyle | 281.3 | 272.2 – 294 | 12 | 12 | — |
| 10 | Runloop | 299 | 292.6 – 304.4 | 12 | 12 | — |
| 10 | E2B | 309.1 | 281.2 – 347.8 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 315.2 | 234.5 – 407.4 | 12 | 12 | tied |
| 13 | tama | 677.3 | 582.4 – 701.1 | 8 | 8 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.5× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 186.2 | 184.8 – 186.8 | 12 | 12 | — |
| 2 | Daytona (VM) | 285.2 | 282.6 – 286.3 | 12 | 12 | — |
| 2 | Namespace | 285.2 | 282.2 – 289.2 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 290.8 | 280.7 – 322.1 | 12 | 12 | tied |
| 5 | Blaxel | 320.5 | 306.5 – 337.7 | 12 | 12 | — |
| 6 | Novita | 342.8 | 341.4 – 353.1 | 12 | 12 | — |
| 6 | Modal (VM) | 356.2 | 329.6 – 366.9 | 12 | 12 | tied |
| 8 | run.cloud | 410.5 | 406.6 – 532.1 | 12 | 12 | — |
| 9 | Freestyle | 529.1 | 510.4 – 540.7 | 12 | 12 | — |
| 9 | Modal (gVisor) | 536.9 | 427.2 – 754.6 | 12 | 12 | tied |
| 9 | Runloop | 554.9 | 540.3 – 562.8 | 12 | 12 | tied |
| 9 | E2B | 589.8 | 551.4 – 680 | 12 | 12 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_tama leads · Brezel is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 47.72 | 42.58 – 52.77 | 8 | 8 | — |
| 2 | Brezel | 69 | 67.86 – 69.97 | 12 | 12 | — |
| 3 | Daytona (VM) | 95.19 | 93.68 – 105.7 | 12 | 12 | — |
| 3 | Namespace | 102.6 | 100.9 – 104.9 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 106.9 | 104.4 – 107.9 | 12 | 12 | — |
| 5 | Blaxel | 108 | 104.8 – 132.2 | 12 | 12 | tied |
| 5 | Novita | 113.5 | 110.3 – 117.6 | 12 | 12 | tied |
| 5 | Modal (VM) | 119.6 | 108.5 – 128 | 12 | 12 | tied |
| 9 | run.cloud | 144.3 | 120.7 – 155.5 | 12 | 12 | — |
| 10 | E2B | 182.7 | 160.8 – 207 | 12 | 12 | — |
| 10 | Freestyle | 185 | 175.3 – 195.3 | 12 | 12 | tied |
| 12 | Runloop | 196.2 | 192.6 – 205.9 | 12 | 12 | — |
| 12 | Modal (gVisor) | 221.6 | 143.9 – 315.8 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.5× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 11.34 | 11.26 – 11.48 | 12 | 12 | — |
| 2 | Daytona (VM) | 16.53 | 15.8 – 17.67 | 12 | 12 | — |
| 3 | Blaxel | 18.04 | 17.11 – 19.4 | 12 | 12 | — |
| 3 | Namespace | 18.17 | 17.49 – 18.47 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 18.5 | 17.56 – 19.02 | 12 | 12 | tied |
| 6 | Modal (VM) | 21.37 | 18.46 – 22.78 | 12 | 12 | — |
| 6 | Novita | 21.97 | 21.73 – 22.31 | 12 | 12 | tied |
| 6 | run.cloud | 25.61 | 20.99 – 29.91 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 29.04 | 24.11 – 35.72 | 12 | 12 | tied |
| 6 | tama | 31.08 | 26.12 – 31.82 | 8 | 8 | tied |
| 11 | Freestyle | 35.19 | 32.04 – 36.32 | 12 | 12 | — |
| 11 | Runloop | 35.27 | 33.98 – 35.97 | 12 | 12 | tied |
| 11 | E2B | 35.38 | 33.54 – 41.16 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 14 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Brezel leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 29.76 | 29.71 – 30.04 | 5 | 10 | — |
| 2 | Namespace | 24.88 | 23.87 – 25.73 | 5 | 10 | — |
| 3 | Microsandbox Cloud | 21.36 | 19.88 – 22.39 | 5 | 10 | — |
| 3 | Novita | 20.99 | 19.55 – 21.42 | 5 | 10 | tied |
| 3 | Daytona (VM) | 20.67 | 18.76 – 21.98 | 5 | 10 | tied |
| 6 | run.cloud | 15.63 | 14.81 – 17.36 | 5 | 10 | — |
| 6 | Modal (VM) | 15.45 | 14.44 – 17.43 | 5 | 10 | tied |
| 6 | tama | 15.39 | 14.68 – 19.87 | 5 | 10 | tied |
| 6 | Blaxel | 14.86 | 10.29 – 16.93 | 5 | 10 | tied |
| 6 | Vercel Sandbox | 12.25 | 11.18 – 12.95 | 5 | 10 | tied |
| 6 | E2B | 11.41 | 10.35 – 14.04 | 5 | 10 | tied |
| 6 | Freestyle | 11.25 | 9.995 – 11.5 | 5 | 10 | tied |
| 13 | Runloop | 9.33 | 9.12 – 9.45 | 5 | 10 | — |
| 13 | Modal (gVisor) | 9.15 | 8.29 – 13.25 | 5 | 10 | tied |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, O_DIRECT (MB/s): 14 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, O_DIRECT (MB/s)</summary>

### fio rand write 4KB, O_DIRECT (MB/s) _(headline)_

MB/s · higher is better

_Brezel leads · ~2.1× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2634 | 2592 – 2656 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1258 | 1239 – 1362 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 854.6 | 816.3 – 880.8 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 796.4 | 672.7 – 1201 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 759.7 | 747.1 – 766 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 685.2 | 619.2 – 906 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 615 | 608.2 – 634.4 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 525.3 | 501.7 – 684.2 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 474 | 267.4 – 525.9 | 3 | 6 | too few sandboxes |
| 10 | Freestyle | 338.2 | 305.1 – 375.4 | 3 | 6 | too few sandboxes |
| 11 | Novita | 325.1 | 324.5 – 326.6 | 3 | 6 | too few sandboxes |
| 12 | tama | 280.5 | 278.9 – 291.5 | 3 | 6 | too few sandboxes |
| 13 | E2B | 193.5 | 191.4 – 240.1 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 106.4 | 100.7 – 809 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Brezel leads · ~1.7× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, O_DIRECT (IOPS): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 439000 | 432000 – 583000 | 3 | 6 | — |
| 2 | Vercel Sandbox | 259500 | 254000 – 260500 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 249000 | 237500 – 294500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 241000 | 230500 – 261000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 232500 | 208500 – 307000 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 169500 | 167500 – 186500 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 154000 | 153000 – 158000 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 132500 | 111500 – 152000 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 129550 | 95250 – 176500 | 3 | 6 | too few sandboxes |
| 10 | Freestyle | 96700 | 86600 – 97250 | 3 | 6 | too few sandboxes |
| 11 | tama | 82150 | 74850 – 97850 | 3 | 6 | too few sandboxes |
| 12 | Novita | 75250 | 75100 – 77600 | 3 | 6 | too few sandboxes |
| 13 | E2B | 47400 | 46750 – 60800 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 32050 | 31050 – 172500 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Brezel leads · ~1.7× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, O_DIRECT (MB/s): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1799 | 1769 – 2388 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1062 | 1040 – 1067 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 1020 | 973.1 – 1205 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 986.2 | 944.8 – 1068 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 951.6 | 854.6 – 1259 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 695.7 | 687.9 – 763.9 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 630.2 | 628.6 – 648.5 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 543.2 | 456.7 – 622.3 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 530.6 | 390.1 – 723 | 3 | 6 | too few sandboxes |
| 10 | Freestyle | 396.4 | 354.4 – 398.5 | 3 | 6 | too few sandboxes |
| 11 | tama | 336.6 | 306.7 – 400.6 | 3 | 6 | too few sandboxes |
| 12 | Novita | 308.3 | 307.8 – 317.7 | 3 | 6 | too few sandboxes |
| 13 | E2B | 194.5 | 191.4 – 248.5 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 131.1 | 126.9 – 707.8 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Brezel leads · ~2.1× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, O_DIRECT (IOPS): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 643000 | 633000 – 648500 | 3 | 6 | — |
| 2 | Vercel Sandbox | 307000 | 302500 – 332500 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 208500 | 199000 – 215000 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 194500 | 164000 – 293500 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 185500 | 182500 – 187000 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 167000 | 151500 – 221500 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 150000 | 148500 – 155000 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 128000 | 122500 – 167000 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 115500 | 65350 – 128500 | 3 | 6 | too few sandboxes |
| 10 | Freestyle | 82650 | 74450 – 91650 | 3 | 6 | too few sandboxes |
| 11 | Novita | 79400 | 79150 – 79800 | 3 | 6 | too few sandboxes |
| 12 | tama | 68450 | 68150 – 71100 | 3 | 6 | too few sandboxes |
| 13 | E2B | 47150 | 46650 – 58600 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 26000 | 24650 – 197500 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.1× Microsandbox Cloud on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, O_DIRECT (IOPS): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 22600 | 15450 – 25600 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 19900 | 8602 – 23950 | 3 | 6 | too few sandboxes |
| 3 | Brezel | 17000 | 16400 – 17400 | 3 | 6 | too few sandboxes |
| 4 | Novita | 10450 | 7896 – 12200 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 7870 | 5841 – 7986 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 7348 | 5256 – 9833 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 5660 | 5327 – 5825 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 5382 | 5261 – 8738 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 4869 | 4802 – 5120 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 3481 | 2791 – 4832 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 2189 | 1871 – 2257 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 1261 | 1007 – 1611 | 3 | 6 | too few sandboxes |
| 13 | tama | 1207 | 453 – 1376 | 3 | 6 | too few sandboxes |
| 14 | E2B | 599.5 | 598.5 – 600 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.1× Microsandbox Cloud on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, O_DIRECT (MB/s): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 23730 | 16160 – 26900 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 20880 | 9021 – 25130 | 3 | 6 | too few sandboxes |
| 3 | Brezel | 17820 | 17180 – 18200 | 3 | 6 | too few sandboxes |
| 4 | Novita | 10930 | 8282 – 12780 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 8253 | 6127 – 8376 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 7707 | 5512 – 10330 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 5937 | 5587 – 6109 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 5645 | 5518 – 9165 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 5107 | 5037 – 5369 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 3651 | 2928 – 5068 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 2296 | 1963 – 2367 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 1324 | 1057 – 1690 | 3 | 6 | too few sandboxes |
| 13 | tama | 1268 | 476.6 – 1443 | 3 | 6 | too few sandboxes |
| 14 | E2B | 629.7 | 629.7 – 630.2 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.8× Brezel on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, O_DIRECT (IOPS): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 14000 | 6490 – 15150 | 3 | 6 | — |
| 2 | Brezel | 7875 | 7772 – 8094 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5950 | 5361 – 6639 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 4689 | 3027 – 4736 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 4048 | 3869 – 4069 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3911 | 3018 – 4126 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3083 | 2460 – 3362 | 3 | 6 | too few sandboxes |
| 8 | Freestyle | 3021 | 2211 – 3027 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 2457 | 2395 – 4206 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1921 | 1091 – 1960 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1784 | 1584 – 2959 | 3 | 6 | too few sandboxes |
| 12 | tama | 1238 | 1032 – 1269 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 1150 | 816 – 1214 | 3 | 6 | too few sandboxes |
| 14 | E2B | 599.5 | 598.5 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.8× Brezel on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, O_DIRECT (MB/s): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 14660 | 6807 – 15840 | 3 | 6 | — |
| 2 | Brezel | 8259 | 8151 – 8488 | 3 | 6 | too few sandboxes |
| 3 | Novita | 6240 | 5623 – 6963 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 4918 | 3176 – 4967 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 4246 | 4058 – 4268 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 4102 | 3166 – 4328 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3233 | 2581 – 3526 | 3 | 6 | too few sandboxes |
| 8 | Freestyle | 3169 | 2319 – 3176 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 2578 | 2512 – 4412 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 2015 | 1146 – 2057 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1871 | 1662 – 3104 | 3 | 6 | too few sandboxes |
| 12 | tama | 1300 | 1084 – 1332 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 1207 | 857.7 – 1274 | 3 | 6 | too few sandboxes |
| 14 | E2B | 630.2 | 629.1 – 630.7 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.5× Brezel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.19 | 25.05 – 26.04 | 3 | 6 | — |
| 2 | Brezel | 16.59 | 16.59 – 16.59 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 16.56 | 11.5 – 17.16 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 14.73 | 14.64 – 14.75 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.16 | 12.14 – 12.17 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 11.91 | 11.41 – 12.81 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 10.92 | 10.79 – 11 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 8.525 | 8.36 – 8.53 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 8.16 | 7.975 – 28.55 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 7.64 | 7.59 – 7.655 | 3 | 6 | too few sandboxes |
| 11 | tama | 7.585 | 7.505 – 7.975 | 3 | 6 | too few sandboxes |
| 12 | Freestyle | 4.045 | 3.955 – 4.105 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 3.31 | 3.145 – 4.72 | 3 | 6 | too few sandboxes |
| 14 | E2B | 1.38 | 1.01 – 1.4 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 14 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.1× tama on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 172000 | 159200 – 177800 | 3 | 6 | — |
| 2 | tama | 159595 | 153800 – 215600 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 145700 | 59580 – 147100 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 96080 | 93430 – 123800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 67620 | 49070 – 73080 | 3 | 6 | too few sandboxes |
| 6 | Freestyle | 64110 | 63080 – 73820 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 60830 | 53780 – 67240 | 3 | 6 | too few sandboxes |
| 8 | Novita | 53720 | 53710 – 53790 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 53250 | 52080 – 54070 | 3 | 6 | too few sandboxes |
| 10 | E2B | 46700 | 46590 – 58360 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 45640 | 45530 – 45660 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 44590 | 43240 – 45100 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 42780 | 39950 – 48580 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 33530 | 33520 – 33570 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.2× tama on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 174500 | 169800 – 177400 | 3 | 6 | — |
| 2 | tama | 149500 | 146100 – 170700 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 146600 | 59050 – 147700 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 94430 | 93610 – 117800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 67430 | 49291 – 72920 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 63300 | 53760 – 67060 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 62230 | 61050 – 72567 | 3 | 6 | too few sandboxes |
| 8 | Novita | 53700 | 53600 – 53790 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 53140 | 52190 – 53710 | 3 | 6 | too few sandboxes |
| 10 | E2B | 47089 | 46840 – 57320 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 45550 | 45460 – 45630 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 44680 | 43190 – 45070 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 42210 | 40010 – 47630 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 33470 | 33450 – 33480 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 200903 | 199100 – 202500 | 3 | 6 | — |
| 2 | Modal (VM) | 162600 | 82312 – 164900 | 3 | 6 | too few sandboxes |
| 3 | tama | 151500 | 136500 – 164800 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 104400 | 99750 – 127600 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 102500 | 80930 – 109600 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 82700 | 82670 – 91350 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 82190 | 80930 – 83030 | 3 | 6 | too few sandboxes |
| 8 | Freestyle | 80710 | 80390 – 88710 | 3 | 6 | too few sandboxes |
| 9 | E2B | 74780 | 72690 – 82862 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 61020 | 58870 – 61140 | 3 | 6 | too few sandboxes |
| 11 | Novita | 58530 | 58390 – 58580 | 3 | 6 | too few sandboxes |
| 12 | Brezel | 48630 | 48600 – 48690 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 44350 | 44170 – 44530 | 3 | 6 | too few sandboxes |
| 14 | Runloop | 40020 | 38900 – 41940 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.1× tama on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 166400 | 165385 – 166800 | 3 | 6 | — |
| 2 | tama | 153400 | 146300 – 187100 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 137500 | 56260 – 149500 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 85880 | 85370 – 115600 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 62310 | 46110 – 67074 | 3 | 6 | too few sandboxes |
| 6 | Freestyle | 57090 | 54450 – 66040 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 56650 | 47620 – 56970 | 3 | 6 | too few sandboxes |
| 8 | Novita | 51070 | 51010 – 51520 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 46360 | 44030 – 47810 | 3 | 6 | too few sandboxes |
| 10 | E2B | 43600 | 41490 – 51570 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 41310 | 41270 – 41385 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 40330 | 38920 – 40690 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 38780 | 37760 – 44150 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 30500 | 30410 – 30550 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 14 environments ranked best-first, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 14 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 7082 | 1593 – 9300 | 3 | 6 | — |
| 2 | Novita | 6352 | 3296 – 6601 | 3 | 6 | too few sandboxes |
| 3 | tama | 4947 | 4829 – 4949 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 2682 | 823.9 – 3527 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 2558 | 2034 – 7170 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 1837 | 1633 – 1882 | 3 | 6 | too few sandboxes |
| 7 | Brezel | 1729 | 1727 – 6701 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 1664 | 1581 – 1961 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1537 | 1421 – 1618 | 3 | 6 | too few sandboxes |
| 10 | Freestyle | 1450 | 730.5 – 1756 | 3 | 6 | too few sandboxes |
| 11 | E2B | 1437 | 988.5 – 2668 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 1130 | 900.7 – 1475 | 3 | 6 | too few sandboxes |
| 13 | Microsandbox Cloud | 1044 | 927 – 1797 | 3 | 6 | too few sandboxes |
| 14 | run.cloud | 936.9 | 936.1 – 937 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads · ~1.9× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 8518 | 5869 – 12090 | 3 | 6 | — |
| 2 | Blaxel | 4568 | 3679 – 4646 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 3596 | 1395 – 4123 | 3 | 6 | too few sandboxes |
| 4 | Novita | 3533 | 2968 – 3953 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 3394 | 2705 – 4681 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 2724 | 1949 – 7693 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 2470 | 1831 – 6310 | 3 | 6 | too few sandboxes |
| 8 | Freestyle | 2208 | 141.4 – 2870 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2133 | 1642 – 2223 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1737 | 1047 – 3084 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 1333 | 1331 – 2791 | 3 | 6 | too few sandboxes |
| 12 | tama | 1071 | 652.5 – 2879 | 3 | 6 | too few sandboxes |
| 13 | run.cloud | 934.4 | 934.4 – 934.6 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 176.9 | 73.41 – 597.3 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.2× Brezel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 157600 | 156721 – 162300 | 3 | 6 | — |
| 2 | Brezel | 133300 | 131400 – 133838 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 99010 | 88470 – 117400 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 82510 | 78790 – 91340 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 80206 | 79230 – 80890 | 3 | 6 | too few sandboxes |
| 6 | tama | 73182 | 62950 – 75942 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 66350 | 36610 – 68932 | 3 | 6 | too few sandboxes |
| 8 | E2B | 56451 | 49770 – 58937 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 39401 | 37624 – 40890 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 37709 | 35910 – 40590 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 35076 | 34245 – 35530 | 3 | 6 | too few sandboxes |
| 12 | Freestyle | 20460 | 19794 – 22523 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 17977 | 17890 – 28496 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 14620 | 12358 – 31590 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Brezel leads · ~1.3× Novita on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 205200 | 198182 – 206681 | 3 | 6 | — |
| 2 | Novita | 160100 | 154100 – 161493 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 100500 | 89100 – 101400 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 91010 | 85788 – 103488 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 84650 | 78755 – 87821 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 51400 | 32420 – 58590 | 3 | 6 | too few sandboxes |
| 7 | tama | 51193 | 36550 – 78850 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 43720 | 40440 – 44574 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 41380 | 38766 – 42730 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 38567 | 33784 – 41058 | 3 | 6 | too few sandboxes |
| 11 | E2B | 37820 | 36117 – 49674 | 3 | 6 | too few sandboxes |
| 12 | Freestyle | 23768 | 22947 – 27250 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 16100 | 12145 – 34422 | 3 | 6 | too few sandboxes |
| 14 | Modal (VM) | 14312 | 14030 – 15020 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | — |
| 2 | Freestyle | 10000 | 10000 – 10000 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 3 | Brezel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | E2B | 9999 | 9996 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | tama | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 3 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 14 | Modal (gVisor) | 428 | 153 – 502.5 | 3 | 6 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 14 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 31.05 | 31.03 – 31.17 | 3 | 6 | — |
| 2 | Namespace | 34.02 | 33.84 – 34.24 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 35.8 | 35.77 – 36.51 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 39.57 | 37.92 – 41.85 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 40.91 | 40.58 – 41.23 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 42.08 | 39.39 – 47.24 | 3 | 6 | too few sandboxes |
| 7 | Novita | 43.66 | 43.5 – 43.95 | 3 | 6 | too few sandboxes |
| 8 | tama | 56.79 | 47.91 – 57 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 57.75 | 56.72 – 59.12 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 61.25 | 61.01 – 61.69 | 3 | 6 | too few sandboxes |
| 11 | Blaxel | 68.42 | 49.83 – 68.65 | 3 | 6 | too few sandboxes |
| 12 | E2B | 75.28 | 72.64 – 75.29 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 82.02 | 80.86 – 93.8 | 3 | 6 | too few sandboxes |
| 14 | Runloop | 82.54 | 81.43 – 83.4 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Brezel leads · ~1.4× tama on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 497000 | 496000 – 497700 | 3 | 6 | — |
| 2 | tama | 366900 | 361200 – 564900 | 3 | 6 | too few sandboxes |
| 3 | Novita | 304000 | 300800 – 305600 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 296100 | 275100 – 302000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 272000 | 192400 – 283600 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 259500 | 250800 – 269800 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 243300 | 242000 – 249200 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 232100 | 228800 – 247000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 186700 | 180200 – 199800 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 164700 | 161200 – 166500 | 3 | 6 | too few sandboxes |
| 11 | E2B | 162100 | 155800 – 221000 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 119000 | 116100 – 123000 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 111100 | 111100 – 116800 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 13450 | 13110 – 100200 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Brezel leads · tama is ~1.3× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 0.101 | 0.1005 – 0.101 | 3 | 6 | — |
| 2 | tama | 0.136 | 0.0885 – 0.139 | 3 | 6 | too few sandboxes |
| 3 | Novita | 0.1645 | 0.1635 – 0.166 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 0.1685 | 0.1655 – 0.182 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 0.184 | 0.1765 – 0.26 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 0.193 | 0.1855 – 0.1995 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 0.2055 | 0.2005 – 0.2065 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 0.2155 | 0.202 – 0.2185 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.2705 | 0.2505 – 0.2775 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 0.3035 | 0.3005 – 0.3105 | 3 | 6 | too few sandboxes |
| 11 | E2B | 0.3085 | 0.226 – 0.321 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 0.421 | 0.407 – 0.431 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 0.45 | 0.428 – 0.4515 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 3.725 | 0.5 – 3.819 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Brezel leads · ~1.8× Novita on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 48810 | 48740 – 49140 | 3 | 6 | — |
| 2 | Novita | 27500 | 26200 – 29670 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 20710 | 20220 – 21260 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 18980 | 14340 – 19970 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 17920 | 17850 – 17980 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 16150 | 15440 – 16840 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 16080 | 15670 – 17090 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 16060 | 15860 – 18630 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 14960 | 14680 – 17460 | 3 | 6 | too few sandboxes |
| 10 | tama | 12280 | 12170 – 24470 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 11630 | 9890 – 11920 | 3 | 6 | too few sandboxes |
| 12 | E2B | 10640 | 8990 – 11290 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 9198 | 8503 – 9304 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 2089 | 1997 – 12540 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Brezel leads · Novita is ~1.8× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1.024 | 1.018 – 1.026 | 3 | 6 | — |
| 2 | Novita | 1.818 | 1.685 – 1.912 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 2.417 | 2.353 – 2.473 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 2.635 | 2.505 – 3.487 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 2.792 | 2.781 – 2.803 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3.096 | 2.97 – 3.239 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3.111 | 2.925 – 3.192 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 3.123 | 2.688 – 3.155 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 3.356 | 2.865 – 3.408 | 3 | 6 | too few sandboxes |
| 10 | tama | 4.072 | 2.043 – 4.114 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 4.3 | 4.197 – 5.271 | 3 | 6 | too few sandboxes |
| 12 | E2B | 4.698 | 4.431 – 5.575 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 5.448 | 5.374 – 5.912 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 23.94 | 3.986 – 25.04 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Brezel leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 363.5 | 363 – 365 | 3 | 6 | — |
| 2 | Namespace | 367.5 | 366.5 – 374.5 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 406.5 | 402.5 – 411.5 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 452.5 | 452 – 462 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 477 | 442.5 – 670.5 | 3 | 6 | too few sandboxes |
| 6 | Novita | 480 | 479.5 – 481 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 498 | 479 – 505.5 | 3 | 6 | too few sandboxes |
| 8 | tama | 534.5 | 505 – 536.5 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 535 | 493.5 – 539 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 765 | 764.5 – 765 | 3 | 6 | too few sandboxes |
| 11 | Freestyle | 774.5 | 773.5 – 825.5 | 3 | 6 | too few sandboxes |
| 12 | E2B | 810 | 806.5 – 818 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 901.5 | 900 – 907 | 3 | 6 | too few sandboxes |
| 14 | Runloop | 1177 | 1174 – 1179 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 14 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 27.86 | 27.86 – 28.12 | 3 | 6 | — |
| 2 | Daytona (VM) | 31.04 | 30.83 – 31.85 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 34.97 | 33.41 – 35.72 | 3 | 6 | too few sandboxes |
| 4 | Novita | 39.48 | 39.19 – 41.08 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 43.2 | 35.84 – 64.7 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 48.26 | 47.36 – 48.54 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 66.24 | 65.61 – 67.82 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 68.26 | 49.58 – 69.07 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 71.49 | 67.52 – 80.24 | 3 | 6 | too few sandboxes |
| 10 | E2B | 79.97 | 78.98 – 80.17 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 83.65 | 79.34 – 85.05 | 3 | 6 | too few sandboxes |
| 12 | Freestyle | 92.59 | 90.44 – 93.73 | 3 | 6 | too few sandboxes |
| 13 | tama | 136.4 | 50.7 – 145.9 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 416.1 | 405.8 – 439.9 | 3 | 6 | too few sandboxes |

</details>

## economics

<img src="docs/figures/usd_per_hour.webp" width="960" alt="Hourly cost: 6 environments ranked best-first, with 95% intervals">

### Hourly cost _(headline)_

USD/hr · lower is better

_tama is cheapest · Novita is ~3.2× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.074 | — | 1 | 1 | — |
| 2 | Novita | 0.2333 | — | 1 | 1 | — |
| 3 | Freestyle | 0.2645 | — | 1 | 1 | — |
| 4 | Daytona (VM) | 0.3312 | — | 1 | 1 | — |
| 4 | E2B | 0.3312 | — | 1 | 1 | equal values |
| 6 | Runloop | 0.6336 | — | 1 | 1 | — |

## Coverage gaps

65 uncovered results across 3 providers (boat 55, tama 7, Vercel Sandbox 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| boat | cpu-node | **failed** | boat-cpu-node-r0: boat ComputeSDK destroy by id callback failed |
| boat | cpu-node | **failed** | boat-cpu-node-r1: boat ComputeSDK destroy by id callback failed |
| boat | cpu-node | **failed** | boat-cpu-node-r2: boat ComputeSDK destroy by id callback failed |
| boat | cpu-node | **failed** | boat-cpu-node-r3: boat ComputeSDK destroy by id callback failed |
| boat | cpu-node | **failed** | boat-cpu-node-r4: boat ComputeSDK destroy by id callback failed |
| boat | disk | **failed** | boat-disk-r0: boat ComputeSDK destroy by id callback failed |
| boat | disk | **failed** | boat-disk-r1: boat ComputeSDK destroy by id callback failed |
| boat | disk | **failed** | boat-disk-r2: boat ComputeSDK destroy by id callback failed |
| boat | memory | **failed** | Cleanup unresolved: computesdk lifecycle destroy failed: Response returned an error code |
| boat | memory | **failed** | Partial publication withheld unverified measurements: stream_type_copy, stream_type_scale, stream_type_add, stream_type_triad |
| boat | network | **failed** | boat-network-r0: boat ComputeSDK destroy by id callback failed |
| boat | network | **failed** | boat-network-r1: boat ComputeSDK destroy by id callback failed |
| boat | network | **failed** | boat-network-r2: boat ComputeSDK destroy by id callback failed |
| boat | pgbench | **failed** | boat-pgbench-r0: boat ComputeSDK destroy by id callback failed |
| boat | pgbench | **failed** | boat-pgbench-r1: boat ComputeSDK destroy by id callback failed |
| boat | pgbench | **failed** | boat-pgbench-r2: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r0: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r1: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r10: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r11: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r2: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r3: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r4: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r5: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r6: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r7: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r8: boat ComputeSDK destroy by id callback failed |
| boat | realworld-better-auth | **failed** | boat-realworld-better-auth-r9: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r0: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r1: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r10: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r11: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r2: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r3: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r4: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r5: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r6: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r7: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r8: boat ComputeSDK destroy by id callback failed |
| boat | realworld-mastra | **failed** | boat-realworld-mastra-r9: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r0: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r1: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r10: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r11: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r2: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r3: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r4: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r5: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r6: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r7: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r8: boat ComputeSDK destroy by id callback failed |
| boat | realworld-openclaw | **failed** | boat-realworld-openclaw-r9: boat ComputeSDK destroy by id callback failed |
| boat | system | **failed** | boat-system-r0: boat ComputeSDK destroy by id callback failed |
| boat | system | **failed** | boat-system-r1: boat ComputeSDK destroy by id callback failed |
| boat | system | **failed** | boat-system-r2: boat ComputeSDK destroy by id callback failed |
| tama | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f7b019d4-dd7b-493f-a7f7-d15eebd9e174 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f7b019d4-dd7b-493f-a7f7-d15eebd9e174 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6ac5cc10-3458-4fdc-9ee7-c78e6613b837 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6ac5cc10-3458-4fdc-9ee7-c78e6613b837 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e50a366c-97ee-4db7-b209-a38e5cc957fb --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e50a366c-97ee-4db7-b209-a38e5cc957fb failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-c4510c5a-9023-4af9-b14e-910eba1a0459 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c4510c5a-9023-4af9-b14e-910eba1a0459 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| Vercel Sandbox | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Vercel Sandbox | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Vercel Sandbox | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |

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
The floor is a property of the design — here 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.30; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Brezel | — | — |
| realworld | Mastra: cold install | Namespace | <0.001 | <0.001 |
| realworld | Mastra: cold install | Daytona (VM) | 0.014 | 0.0046 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.068 (tied) | 0.019 |
| realworld | Mastra: cold install | Blaxel | 0.052 (tied) | 0.019 |
| realworld | Mastra: cold install | Modal (VM) | 0.20 (tied) | 0.066 |
| realworld | Mastra: cold install | E2B | 0.0023 | <0.001 |
| realworld | Mastra: cold install | Freestyle | 0.060 (tied) | 0.019 |
| realworld | Mastra: cold install | Runloop | 0.55 (tied) | 0.79 |
| realworld | Mastra: cold install | tama | 0.017 | 0.0046 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.67 (tied) | 0.19 |
| realworld | Mastra: cold install | run.cloud | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: build | Brezel | — | — |
| realworld | Better-Auth: build | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: build | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: build | Modal (VM) | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: build | tama | 0.017 | 0.0046 |
| realworld | Better-Auth: build | Blaxel | 0.0056 | 0.0046 |
| realworld | Better-Auth: build | run.cloud | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: build | E2B | 0.024 | 0.066 |
| realworld | Better-Auth: build | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: cold install | Brezel | — | — |
| realworld | Better-Auth: cold install | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: cold install | run.cloud | 0.0023 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: cold install | E2B | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Novita | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Runloop | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: cold install | tama | 0.028 | 0.0046 |
| realworld | Better-Auth: cold install | Freestyle | 0.052 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.35 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.017 | 0.019 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.38 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | E2B | 0.17 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Runloop | 0.37 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Novita | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Brezel | 0.012 | 0.019 |
| realworld | Better-Auth: git clone | run.cloud | 1.0 (tied) | 0.43 |
| realworld | Better-Auth: git clone | tama | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.63 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Freestyle | 0.024 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Brezel | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.033 | 0.066 |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.38 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | tama | 0.27 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | Freestyle | 0.51 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.033 | 0.19 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Brezel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.14 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.0083 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0029 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.028 | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.0029 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Freestyle | 0.052 (tied) | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.0083 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Brezel | — | — |
| realworld | Better-Auth: lint format | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.0017 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Novita | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.017 | 0.0046 |
| realworld | Better-Auth: lint format | run.cloud | 0.040 | 0.19 |
| realworld | Better-Auth: lint format | Blaxel | 0.59 (tied) | 0.79 |
| realworld | Better-Auth: lint format | tama | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | E2B | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.0083 | 0.0046 |
| realworld | Better-Auth: lint packages | Brezel | — | — |
| realworld | Better-Auth: lint packages | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Blaxel | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.086 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | tama | 0.010 | 0.0046 |
| realworld | Better-Auth: lint packages | run.cloud | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | E2B | 0.078 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Brezel | — | — |
| realworld | Better-Auth: lint spell | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.024 | 0.0046 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.24 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Blaxel | 0.41 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | tama | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Freestyle | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint types | Brezel | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: lint types | tama | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.38 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Blaxel | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | run.cloud | 0.76 (tied) | 0.99 |
| realworld | Better-Auth: lint types | Freestyle | 0.13 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Brezel | — | — |
| realworld | Better-Auth: typecheck | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.028 | 0.0046 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Blaxel | 0.63 (tied) | 0.79 |
| realworld | Better-Auth: typecheck | tama | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | E2B | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Freestyle | 0.024 | 0.066 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Runloop | 0.0018 | 0.0046 |
| realworld | Mastra: build:core | Brezel | — | — |
| realworld | Mastra: build:core | Namespace | <0.001 | <0.001 |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | <0.001 | 0.0046 |
| realworld | Mastra: build:core | Novita | 0.84 (tied) | 0.19 |
| realworld | Mastra: build:core | Blaxel | 0.0056 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.0068 | 0.0046 |
| realworld | Mastra: build:core | tama | 0.63 (tied) | 0.79 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: build:core | Freestyle | 0.18 (tied) | 0.019 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.51 (tied) | 0.019 |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Namespace | 0.44 (tied) | 0.43 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.017 | 0.019 |
| realworld | Mastra: git clone | Modal (VM) | 0.16 (tied) | 0.066 |
| realworld | Mastra: git clone | Novita | 0.0018 | <0.001 |
| realworld | Mastra: git clone | E2B | 0.068 (tied) | 0.19 |
| realworld | Mastra: git clone | Blaxel | 0.76 (tied) | 0.19 |
| realworld | Mastra: git clone | Brezel | 0.089 (tied) | 0.19 |
| realworld | Mastra: git clone | tama | 0.67 (tied) | 0.19 |
| realworld | Mastra: git clone | run.cloud | 0.76 (tied) | 0.43 |
| realworld | Mastra: git clone | Runloop | 0.48 (tied) | 0.43 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.29 (tied) | 0.19 |
| realworld | Mastra: git clone | Freestyle | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Brezel | — | — |
| realworld | Mastra: lint:format | Namespace | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Novita | <0.001 | 0.0046 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.67 (tied) | 0.066 |
| realworld | Mastra: lint:format | tama | 0.078 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (VM) | 0.93 (tied) | 0.43 |
| realworld | Mastra: lint:format | Blaxel | 0.089 (tied) | 0.43 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Freestyle | 0.29 (tied) | 0.066 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.89 (tied) | 0.066 |
| realworld | Mastra: test:core | Brezel | — | — |
| realworld | Mastra: test:core | Namespace | <0.001 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.078 (tied) | 0.19 |
| realworld | Mastra: test:core | Blaxel | 0.22 (tied) | 0.066 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | tama | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.22 (tied) | 0.019 |
| realworld | Mastra: test:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: test:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: test:core | Freestyle | 0.11 (tied) | 0.0046 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.51 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Brezel | — | — |
| realworld | OpenClaw: cold install | Namespace | 0.0014 | 0.019 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.0056 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | 0.033 | 0.066 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.089 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.63 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Runloop | 0.052 (tied) | 0.0046 |
| realworld | OpenClaw: cold install | E2B | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: cold install | run.cloud | 0.44 (tied) | 0.066 |
| realworld | OpenClaw: cold install | tama | 0.62 (tied) | 0.57 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.68 (tied) | 0.57 |
| realworld | OpenClaw: cold install | Freestyle | 0.59 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.35 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.44 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Novita | 0.20 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Blaxel | 0.93 (tied) | 0.43 |
| realworld | OpenClaw: git clone | E2B | 0.85 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Brezel | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Runloop | 0.84 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Freestyle | 0.20 (tied) | 0.19 |
| realworld | OpenClaw: git clone | run.cloud | 0.80 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: git clone | tama | 0.057 (tied) | 0.026 |
| realworld | OpenClaw: lint (all extensions) | Brezel | — | — |
| realworld | OpenClaw: lint (all extensions) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.16 (tied) | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.052 (tied) | 0.019 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Freestyle | 0.0011 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Runloop | 0.014 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.76 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | tama | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Brezel | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.35 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.028 | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.0023 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Freestyle | 0.039 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.060 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | tama | — | — |
| realworld | OpenClaw: typecheck (test tree) | Brezel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.10 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.0029 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.014 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.0036 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Freestyle | 0.76 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.012 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Brezel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.024 | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.98 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.033 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.29 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.18 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | tama | 0.91 (tied) | 0.57 |
| realworld | OpenClaw: typecheck (tsgo) | Freestyle | 0.0030 | 0.0018 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.89 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.67 (tied) | 0.19 |
| cpu | Node.js web tooling | Brezel | — | — |
| cpu | Node.js web tooling | Namespace | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Novita | 0.42 (tied) | 0.11 |
| cpu | Node.js web tooling | Daytona (VM) | 0.31 (tied) | 0.31 |
| cpu | Node.js web tooling | run.cloud | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 1.0 (tied) | 0.97 |
| cpu | Node.js web tooling | tama | 1.0 (tied) | 0.31 |
| cpu | Node.js web tooling | Blaxel | 0.31 (tied) | 0.31 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.15 (tied) | 0.0012 |
| cpu | Node.js web tooling | E2B | 1.0 (tied) | 0.31 |
| cpu | Node.js web tooling | Freestyle | 0.31 (tied) | 0.31 |
| cpu | Node.js web tooling | Runloop | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.84 (tied) | 0.31 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Brezel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Brezel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Brezel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Brezel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Brezel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | tama | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Brezel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | tama | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.60 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Brezel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Freestyle | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Brezel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Freestyle | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 1.0 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | tama | 1.0 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Freestyle | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Novita | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | tama | 0.20 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Freestyle | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | E2B | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | tama | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Modal (VM) | 0.20 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Freestyle | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Modal (gVisor) | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Brezel | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | tama | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Brezel | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Freestyle | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Daytona (VM) | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.70 (too few sandboxes) | 1.0 |
| network | iperf3 WAN upload | Freestyle | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Brezel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Brezel | — | — |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.20 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | tama | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Freestyle | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | Brezel | 1.0 (too few sandboxes, equal medians) | 1.0 |
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
| system | Git common operations | Brezel | — | — |
| system | Git common operations | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.012 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Runloop | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Brezel | — | — |
| system | pgbench RO (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Brezel | — | — |
| system | pgbench RO latency (s100, 50c) | tama | 0.60 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Brezel | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Brezel | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Brezel | — | — |
| system | PyBench | Namespace | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Novita | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | run.cloud | 0.70 (too few sandboxes) | 0.012 |
| system | PyBench | tama | 0.20 (too few sandboxes) | 0.012 |
| system | PyBench | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Freestyle | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Brezel | — | — |
| system | SQLite Speedtest | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Runloop | 0.40 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | tama | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Freestyle | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

