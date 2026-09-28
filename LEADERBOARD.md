# Sandbox provider leaderboard

Run [`36356024651`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36356024651) · commit [`99d3e132298b2c4d9173f8bb8833ba68f1608955`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/99d3e132298b2c4d9173f8bb8833ba68f1608955) ·
dataset [`data/dataset/runs/36356024651.json`](data/dataset/runs/36356024651.json) · generated 2026-09-28T00:40:18.817Z

**Partial results — incomplete experiment.** 675 of 728 planned cells complete; 53 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:de15097d80223bb1b45ecef7ebe7085f6b51db4c6088e9dcb00c2801ba9f3cb4`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **611 metric records**
backed by **5000 retained trial observations**, across **48 metrics** and
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

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **96 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 13 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 13 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 12 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 33.96 | 33.84 – 34.36 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.12 | 37.23 – 42.04 | 12 | 12 | — |
| 2 | Blaxel | 42.02 | 41.41 – 42.6 | 12 | 12 | tied |
| 2 | Novita | 42.88 | 40.5 – 43.78 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 44.11 | 41.74 – 46.1 | 10 | 10 | tied |
| 2 | boat | 46.05 | 44.08 – 54.97 | 12 | 12 | tied |
| 2 | Modal (VM) | 49.7 | 43.19 – 50.28 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 58.43 | 55.61 – 59.61 | 12 | 12 | — |
| 9 | E2B | 73.44 | 68.68 – 75.68 | 12 | 12 | — |
| 9 | run.cloud | 88.32 | 58.66 – 119.4 | 9 | 9 | tied |
| 9 | Runloop | 91.08 | 73.04 – 101.1 | 12 | 12 | tied |
| 9 | tama | 95.65 | 74.33 – 122.3 | 12 | 12 | tied |
| 13 | Modal (gVisor) | 122 | 109.6 – 139.1 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 48.58 | 47.56 – 50.41 | 12 | 12 | — |
| 2 | Namespace | 49.81 | 49.6 – 51.08 | 12 | 12 | — |
| 3 | Daytona (VM) | 55.35 | 53.65 – 57.1 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 62.25 | 59.2 – 69.06 | 10 | 10 | — |
| 4 | Novita | 66.41 | 65.11 – 66.6 | 12 | 12 | tied |
| 4 | Modal (VM) | 67.3 | 63.06 – 71.2 | 12 | 12 | tied |
| 7 | Blaxel | 74.05 | 69.09 – 77.62 | 12 | 12 | — |
| 7 | tama | 76.98 | 69.58 – 82.14 | 4 | 4 | tied |
| 9 | Vercel Sandbox | 92.51 | 91.4 – 93.39 | 12 | 12 | — |
| 9 | E2B | 95.16 | 86.15 – 110.4 | 12 | 12 | tied |
| 9 | run.cloud | 99.19 | 85.34 – 110.7 | 6 | 6 | tied |
| 12 | Modal (gVisor) | 150.7 | 144.2 – 154.2 | 11 | 11 | — |
| 13 | Runloop | 200.5 | 185.6 – 202.5 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.771 | 9.566 – 10.05 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.11 | 11.65 – 12.35 | 12 | 12 | — |
| 3 | Blaxel | 12.73 | 12.33 – 13.07 | 12 | 12 | — |
| 4 | boat | 13.72 | 13.06 – 14.06 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 14.66 | 14.22 – 16.63 | 10 | 10 | — |
| 5 | Novita | 14.92 | 14.36 – 16.52 | 12 | 12 | tied |
| 5 | Modal (VM) | 17.35 | 14.95 – 19.53 | 12 | 12 | tied |
| 5 | run.cloud | 18.14 | 15.65 – 33.2 | 6 | 6 | tied |
| 5 | tama | 18.3 | 16.32 – 45.03 | 4 | 4 | tied |
| 5 | Vercel Sandbox | 19.82 | 19.54 – 20.33 | 12 | 12 | tied |
| 5 | E2B | 20.13 | 18.37 – 21.25 | 12 | 12 | tied |
| 12 | Runloop | 28.38 | 26.83 – 29.78 | 12 | 12 | — |
| 13 | Modal (gVisor) | 40.84 | 35.77 – 43.64 | 11 | 11 | — |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6295 | 0.609 – 0.642 | 12 | 12 | — |
| 2 | Blaxel | 0.7325 | 0.72 – 0.793 | 12 | 12 | — |
| 3 | Modal (VM) | 0.883 | 0.8375 – 1.575 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.958 | 0.8875 – 0.997 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 1.113 | 1.074 – 1.176 | 10 | 10 | — |
| 6 | Daytona (VM) | 1.469 | 1.271 – 1.568 | 12 | 12 | — |
| 6 | E2B | 1.531 | 1.475 – 2.155 | 12 | 12 | tied |
| 6 | tama | 1.58 | 1.1 – 3.058 | 4 | 4 | tied |
| 6 | boat | 1.635 | 1.594 – 1.685 | 12 | 12 | tied |
| 10 | Novita | 1.739 | 1.633 – 2.061 | 12 | 12 | — |
| 10 | run.cloud | 2.077 | 1.816 – 2.188 | 6 | 6 | tied |
| 12 | Modal (gVisor) | 2.749 | 2.371 – 2.893 | 11 | 11 | — |
| 12 | Runloop | 3.368 | 2.235 – 4.614 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.396 | 2.314 – 2.431 | 12 | 12 | — |
| 2 | Namespace | 2.481 | 2.447 – 2.521 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.965 | 2.83 – 3.161 | 12 | 12 | — |
| 3 | Novita | 3.171 | 3.106 – 3.265 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 3.221 | 3.027 – 3.435 | 10 | 10 | tied |
| 6 | Blaxel | 3.554 | 3.409 – 3.651 | 12 | 12 | — |
| 6 | Modal (VM) | 3.624 | 3.25 – 3.916 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 4.415 | 4.286 – 4.486 | 12 | 12 | — |
| 9 | E2B | 4.832 | 4.498 – 5.344 | 12 | 12 | — |
| 9 | run.cloud | 4.859 | 4.062 – 6.01 | 6 | 6 | tied |
| 9 | tama | 4.924 | 4.287 – 6.367 | 4 | 4 | tied |
| 12 | Runloop | 9.11 | 8.041 – 9.478 | 12 | 12 | — |
| 13 | Modal (gVisor) | 11.77 | 10.92 – 11.97 | 11 | 11 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 7.907 | 7.576 – 8.375 | 12 | 12 | — |
| 2 | Namespace | 9.63 | 9.406 – 10.06 | 12 | 12 | — |
| 2 | Daytona (VM) | 10.29 | 9.471 – 10.75 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 10.38 | 9.612 – 12.18 | 10 | 10 | tied |
| 2 | Novita | 11.32 | 11.04 – 11.5 | 12 | 12 | tied |
| 2 | Blaxel | 11.68 | 11.21 – 12.06 | 12 | 12 | tied |
| 2 | Modal (VM) | 12.12 | 10.86 – 13.11 | 12 | 12 | tied |
| 8 | tama | 14.99 | 14.76 – 20.55 | 4 | 4 | — |
| 8 | Vercel Sandbox | 15.35 | 14.74 – 15.5 | 12 | 12 | tied |
| 8 | run.cloud | 17.14 | 13.63 – 20.62 | 6 | 6 | tied |
| 8 | E2B | 17.42 | 15.56 – 20.59 | 12 | 12 | tied |
| 12 | Runloop | 27.55 | 25.77 – 28.24 | 12 | 12 | — |
| 13 | Modal (gVisor) | 33.99 | 30.88 – 35.84 | 11 | 11 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.219 | 2.147 – 2.317 | 12 | 12 | — |
| 1 | boat | 2.24 | 2.139 – 2.362 | 12 | 12 | tied |
| 3 | Daytona (VM) | 2.78 | 2.567 – 2.83 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 2.851 | 2.656 – 3.26 | 10 | 10 | tied |
| 3 | Novita | 2.957 | 2.923 – 3.091 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.314 | 3.008 – 3.59 | 12 | 12 | — |
| 6 | Blaxel | 3.346 | 3.213 – 3.514 | 12 | 12 | tied |
| 8 | tama | 3.902 | 3.785 – 6.526 | 4 | 4 | — |
| 8 | Vercel Sandbox | 4.484 | 4.41 – 4.622 | 12 | 12 | tied |
| 8 | E2B | 4.588 | 3.894 – 5.363 | 12 | 12 | tied |
| 8 | run.cloud | 5.609 | 4.151 – 5.875 | 6 | 6 | tied |
| 12 | Modal (gVisor) | 7.454 | 7.125 – 7.837 | 11 | 11 | — |
| 12 | Runloop | 8.099 | 7.997 – 8.294 | 12 | 12 | tied |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.099 | 2.062 – 2.349 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.424 | 2.403 – 2.461 | 12 | 12 | — |
| 2 | boat | 2.452 | 2.325 – 2.549 | 12 | 12 | tied |
| 4 | Novita | 2.614 | 2.579 – 2.659 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 2.761 | 2.569 – 3.146 | 10 | 10 | tied |
| 4 | Blaxel | 2.96 | 2.883 – 3.075 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.083 | 2.687 – 3.252 | 12 | 12 | tied |
| 4 | tama | 3.089 | 2.975 – 4.414 | 4 | 4 | tied |
| 4 | Vercel Sandbox | 3.803 | 3.769 – 3.853 | 12 | 12 | tied |
| 4 | E2B | 3.95 | 3.497 – 4.46 | 12 | 12 | tied |
| 4 | run.cloud | 4.412 | 3.827 – 4.851 | 6 | 6 | tied |
| 12 | Runloop | 9.096 | 8.133 – 9.665 | 12 | 12 | — |
| 13 | Modal (gVisor) | 9.9 | 9.369 – 10.47 | 11 | 11 | — |

### Better-Auth: lint spell

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.401 | 5.209 – 5.569 | 12 | 12 | — |
| 2 | Namespace | 5.732 | 5.679 – 5.822 | 12 | 12 | — |
| 3 | Daytona (VM) | 6.63 | 6.548 – 7.148 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 7.067 | 6.535 – 8.218 | 10 | 10 | tied |
| 3 | Novita | 7.726 | 7.434 – 7.771 | 12 | 12 | tied |
| 3 | Modal (VM) | 8.058 | 7.123 – 9.075 | 12 | 12 | tied |
| 3 | Blaxel | 8.361 | 7.862 – 8.551 | 12 | 12 | tied |
| 8 | tama | 10.89 | 10.24 – 11.84 | 4 | 4 | — |
| 8 | E2B | 11.77 | 10.76 – 13.28 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 11.98 | 11.46 – 12.11 | 12 | 12 | tied |
| 8 | run.cloud | 14.09 | 11.02 – 15.93 | 6 | 6 | tied |
| 12 | Modal (gVisor) | 18.63 | 17.62 – 19.91 | 11 | 11 | — |
| 12 | Runloop | 21.18 | 19.37 – 21.89 | 12 | 12 | tied |

### Better-Auth: lint types

Seconds · lower is better

_boat and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 24.44 | 23.95 – 25.07 | 12 | 12 | — |
| 1 | Daytona (VM) | 25.52 | 23.69 – 28.19 | 12 | 12 | tied |
| 3 | Namespace | 27.9 | 27.78 – 29.36 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 30.57 | 30.47 – 41.42 | 10 | 10 | — |
| 4 | Modal (VM) | 30.88 | 27.03 – 36.29 | 12 | 12 | tied |
| 4 | Novita | 31.06 | 30.45 – 32.04 | 12 | 12 | tied |
| 4 | tama | 34.89 | 17.86 – 39.17 | 4 | 4 | tied |
| 4 | Blaxel | 35.78 | 32.78 – 39.03 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 46.62 | 44.81 – 47.68 | 12 | 12 | — |
| 9 | E2B | 46.75 | 42.04 – 53.26 | 12 | 12 | tied |
| 11 | run.cloud | 57.36 | 49.28 – 65.75 | 6 | 6 | — |
| 12 | Runloop | 116.1 | 94.95 – 118.7 | 12 | 12 | — |
| 13 | Modal (gVisor) | 121.1 | 114.7 – 125.2 | 11 | 11 | — |

### Better-Auth: typecheck

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 31.11 | 29.52 – 33.12 | 12 | 12 | — |
| 2 | Namespace | 32.91 | 32.48 – 36.98 | 12 | 12 | — |
| 3 | Daytona (VM) | 38.16 | 37.43 – 39.45 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 40.99 | 40.21 – 50.16 | 10 | 10 | — |
| 4 | Novita | 44.79 | 43.46 – 45.68 | 12 | 12 | tied |
| 4 | Modal (VM) | 46.91 | 43.6 – 50.13 | 12 | 12 | tied |
| 7 | Blaxel | 51.46 | 47.64 – 54.05 | 12 | 12 | — |
| 7 | tama | 54.44 | 52.66 – 56.71 | 4 | 4 | tied |
| 7 | run.cloud | 67.62 | 57.72 – 73.03 | 6 | 6 | tied |
| 7 | Vercel Sandbox | 69.43 | 67.79 – 72.19 | 12 | 12 | tied |
| 7 | E2B | 71.26 | 58.67 – 78.69 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 92.77 | 84.14 – 94.27 | 11 | 11 | — |
| 13 | Runloop | 135.3 | 124.7 – 136.8 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 55.04 | 54.3 – 64.8 | 12 | 12 | — |
| 1 | Namespace | 58.34 | 58.04 – 60.26 | 12 | 12 | tied |
| 3 | Daytona (VM) | 67.57 | 65.16 – 68.91 | 12 | 12 | — |
| 4 | Novita | 76.27 | 73.62 – 77.7 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 79.74 | 69.45 – 91.59 | 10 | 10 | tied |
| 4 | Blaxel | 82.28 | 79.75 – 84.24 | 12 | 12 | tied |
| 4 | Modal (VM) | 90.74 | 78.52 – 94.49 | 12 | 12 | tied |
| 4 | tama | 90.79 | 87.43 – 98.26 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 121.2 | 118.4 – 122.4 | 12 | 12 | — |
| 9 | run.cloud | 125.6 | 99.27 – 138 | 9 | 9 | tied |
| 9 | E2B | 135.5 | 127.7 – 141.9 | 12 | 12 | tied |
| 12 | Runloop | 184.9 | 145.5 – 193.2 | 12 | 12 | — |
| 13 | Modal (gVisor) | 193.3 | 189.1 – 199 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace leads · Microsandbox Cloud is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.57 | 1.54 – 1.898 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 2.187 | 2.115 – 2.609 | 10 | 10 | — |
| 2 | Blaxel | 2.341 | 1.885 – 2.467 | 12 | 12 | tied |
| 2 | Modal (VM) | 2.528 | 2.232 – 2.938 | 12 | 12 | tied |
| 2 | Daytona (VM) | 2.63 | 2.095 – 3.16 | 12 | 12 | tied |
| 2 | Vercel Sandbox | 2.676 | 2.472 – 3.256 | 12 | 12 | tied |
| 2 | boat | 2.899 | 2.848 – 3.228 | 12 | 12 | tied |
| 2 | run.cloud | 3.08 | 2.846 – 7.587 | 9 | 9 | tied |
| 2 | tama | 3.327 | 2.869 – 10.13 | 12 | 12 | tied |
| 2 | Novita | 3.542 | 3.241 – 4.073 | 12 | 12 | tied |
| 2 | E2B | 3.824 | 3.474 – 4.666 | 12 | 12 | tied |
| 12 | Runloop | 5.957 | 5.137 – 10.31 | 12 | 12 | — |
| 12 | Modal (gVisor) | 7.413 | 6.642 – 8.03 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 71.05 | 66.69 – 82.76 | 12 | 12 | — |
| 1 | Namespace | 73.38 | 72.53 – 82.01 | 12 | 12 | tied |
| 3 | Daytona (VM) | 90.99 | 89.61 – 95.39 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 97.32 | 86.72 – 127.5 | 10 | 10 | tied |
| 3 | Novita | 97.39 | 95.52 – 100.7 | 12 | 12 | tied |
| 3 | Blaxel | 101.3 | 99.71 – 104.9 | 12 | 12 | tied |
| 7 | tama | 108.2 | 105.9 – 112.9 | 12 | 12 | — |
| 7 | Modal (VM) | 113.6 | 98.82 – 115.1 | 12 | 12 | tied |
| 9 | run.cloud | 133.6 | 121.1 – 144.9 | 9 | 9 | — |
| 10 | Vercel Sandbox | 150.1 | 144.7 – 153.9 | 12 | 12 | — |
| 11 | E2B | 175.2 | 162.9 – 179.4 | 12 | 12 | — |
| 12 | Runloop | 217.4 | 173.7 – 257.9 | 12 | 12 | — |
| 12 | Modal (gVisor) | 225.1 | 211.8 – 238.1 | 12 | 12 | tied |

### Mastra: test:core

Seconds · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 822.7 | 800 – 855.1 | 12 | 12 | — |
| 2 | Namespace | 855.5 | 853.5 – 857.6 | 12 | 12 | — |
| 3 | Daytona (VM) | 932.4 | 919.6 – 936.3 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 940.9 | 925.6 – 1059 | 10 | 10 | tied |
| 3 | Blaxel | 985.9 | 973.9 – 990.5 | 12 | 12 | tied |
| 6 | Novita | 1006 | 1001 – 1014 | 12 | 12 | — |
| 6 | Modal (VM) | 1099 | 981.6 – 1116 | 11 | 11 | tied |
| 6 | tama | 1103 | 1082 – 1108 | 12 | 12 | tied |
| 6 | run.cloud | 1151 | 1064 – 1266 | 9 | 9 | tied |
| 10 | Vercel Sandbox | 1331 | 1320 – 1354 | 12 | 12 | — |
| 11 | E2B | 1506 | 1468 – 1531 | 12 | 12 | — |
| 11 | Runloop | 1816 | 1486 – 1915 | 12 | 12 | tied |
| 13 | Modal (gVisor) | 2259 | 2207 – 2318 | 10 | 10 | — |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.945 | 9.794 – 10.68 | 12 | 12 | — |
| 2 | Blaxel | 12.18 | 11.57 – 12.57 | 12 | 12 | — |
| 3 | Daytona (VM) | 12.89 | 12.38 – 14.5 | 12 | 12 | — |
| 4 | Novita | 16.17 | 15.5 – 19.12 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 16.24 | 15.24 – 19.08 | 8 | 8 | tied |
| 4 | boat | 17.07 | 16.41 – 17.73 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 17.34 | 17.03 – 17.74 | 12 | 12 | tied |
| 4 | Modal (VM) | 18.24 | 15.96 – 26.27 | 12 | 12 | tied |
| 4 | run.cloud | 20.25 | 19.11 – 28.24 | 4 | 4 | tied |
| 4 | E2B | 21.05 | 19.02 – 22.58 | 12 | 12 | tied |
| 11 | Runloop | 25.65 | 21.01 – 29.55 | 12 | 12 | — |
| 12 | Modal (gVisor) | 32.09 | 30.25 – 34.32 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.237 | 2.178 – 2.263 | 12 | 12 | — |
| 2 | Blaxel | 2.68 | 2.571 – 2.79 | 12 | 12 | — |
| 3 | Daytona (VM) | 3.313 | 3.194 – 4.244 | 12 | 12 | — |
| 3 | Modal (VM) | 3.4 | 3.277 – 4.131 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 3.479 | 3.131 – 3.839 | 8 | 8 | tied |
| 3 | Vercel Sandbox | 3.784 | 3.638 – 3.835 | 12 | 12 | tied |
| 7 | Novita | 4.432 | 4.055 – 4.623 | 12 | 12 | — |
| 8 | boat | 4.787 | 4.623 – 9.086 | 12 | 12 | — |
| 8 | E2B | 4.925 | 4.649 – 5.306 | 12 | 12 | tied |
| 8 | run.cloud | 7.197 | 4.742 – 9.404 | 4 | 4 | tied |
| 8 | Runloop | 7.411 | 6.21 – 10 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 12.26 | 11.27 – 13.43 | 12 | 12 | — |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Namespace is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 113.2 | 106.6 – 119.7 | 12 | 12 | — |
| 2 | Namespace | 145 | 142.3 – 146.9 | 12 | 12 | — |
| 3 | Daytona (VM) | 150.2 | 147.1 – 157.1 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 155 | 143.3 – 166.3 | 8 | 8 | tied |
| 5 | Blaxel | 168.9 | 164.5 – 171.7 | 12 | 12 | — |
| 6 | Novita | 175.4 | 171.1 – 176.9 | 12 | 12 | — |
| 6 | Modal (VM) | 189.1 | 173.9 – 199.7 | 12 | 12 | tied |
| 6 | run.cloud | 194.2 | 157.3 – 206 | 4 | 4 | tied |
| 9 | Vercel Sandbox | 223.3 | 220.1 – 237.5 | 12 | 12 | — |
| 10 | E2B | 318.8 | 272.9 – 333.2 | 12 | 12 | — |
| 11 | Runloop | 387.2 | 292 – 394.2 | 12 | 12 | — |
| 11 | Modal (gVisor) | 390.9 | 324.5 – 417.2 | 12 | 12 | tied |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 211.1 | 205.1 – 230 | 12 | 12 | — |
| 2 | Daytona (VM) | 286.7 | 282.1 – 292.1 | 12 | 12 | — |
| 2 | Namespace | 288 | 283.5 – 294.9 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 292.5 | 276 – 317 | 8 | 8 | tied |
| 5 | Blaxel | 322.7 | 311.8 – 330.2 | 12 | 12 | — |
| 5 | run.cloud | 331.5 | 303.2 – 355.4 | 4 | 4 | tied |
| 5 | Novita | 344.2 | 342 – 350.8 | 12 | 12 | tied |
| 5 | Modal (VM) | 355.5 | 339.5 – 361.4 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 413.9 | 408.7 – 422.4 | 12 | 12 | — |
| 10 | E2B | 605.1 | 548.2 – 633.2 | 12 | 12 | — |
| 10 | Runloop | 685.5 | 520.7 – 694.6 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 713.1 | 551.4 – 820.3 | 10 | 10 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 77.07 | 73.54 – 81.16 | 12 | 12 | — |
| 2 | Daytona (VM) | 98.39 | 90.85 – 104.4 | 12 | 12 | — |
| 2 | Namespace | 102.6 | 100.4 – 103.7 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 106.9 | 104.8 – 122.4 | 8 | 8 | — |
| 4 | Blaxel | 111.3 | 109.8 – 112.7 | 12 | 12 | tied |
| 6 | Novita | 113.8 | 112.2 – 115.6 | 12 | 12 | — |
| 6 | Modal (VM) | 118.6 | 112.5 – 128.7 | 12 | 12 | tied |
| 6 | run.cloud | 146.2 | 115.6 – 158.7 | 4 | 4 | tied |
| 6 | Vercel Sandbox | 153.3 | 151 – 155.9 | 12 | 12 | tied |
| 10 | E2B | 183.9 | 161 – 191.2 | 12 | 12 | — |
| 11 | Runloop | 275.8 | 197.5 – 282.6 | 12 | 12 | — |
| 11 | Modal (gVisor) | 276.3 | 233.2 – 323.2 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 13.76 | 12.76 – 14.05 | 12 | 12 | — |
| 2 | Daytona (VM) | 15.94 | 15.3 – 18.05 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 18.04 | 16.86 – 19.9 | 8 | 8 | — |
| 3 | Blaxel | 18.37 | 18 – 19.01 | 12 | 12 | tied |
| 3 | Namespace | 18.49 | 17.8 – 18.91 | 12 | 12 | tied |
| 6 | Novita | 20.91 | 20.26 – 21.54 | 12 | 12 | — |
| 6 | Modal (VM) | 21.54 | 18.73 – 22.47 | 12 | 12 | tied |
| 6 | run.cloud | 23.56 | 20.27 – 25.29 | 4 | 4 | tied |
| 9 | Vercel Sandbox | 26.19 | 25.94 – 27.12 | 12 | 12 | — |
| 10 | E2B | 34.53 | 32.34 – 37.81 | 12 | 12 | — |
| 10 | Runloop | 40.5 | 31.73 – 41.84 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 50.7 | 34.95 – 66.88 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace, boat, Microsandbox Cloud, Daytona (VM), Novita and Blaxel share the top on this metric (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 26.6 | 26.5 – 26.96 | 5 | 10 | — |
| 1 | boat | 25.54 | 18.51 – 26.94 | 5 | 10 | tied |
| 1 | Microsandbox Cloud | 21.6 | 17.12 – 23.65 | 5 | 10 | tied |
| 1 | Daytona (VM) | 21.54 | 20.05 – 21.69 | 5 | 10 | tied |
| 1 | Novita | 20.1 | 19.52 – 20.86 | 5 | 10 | tied |
| 1 | Blaxel | 19.9 | 18.92 – 20.54 | 5 | 10 | tied |
| 7 | tama | 16.79 | 16.63 – 18.33 | 5 | 10 | — |
| 7 | Modal (VM) | 15.25 | 14.36 – 18.94 | 5 | 10 | tied |
| 7 | run.cloud | 14.36 | 12.93 – 17.42 | 5 | 10 | tied |
| 7 | Vercel Sandbox | 13.02 | 12.25 – 13.53 | 5 | 10 | tied |
| 7 | E2B | 11.14 | 10.57 – 15.32 | 5 | 10 | tied |
| 7 | Runloop | 10.45 | 7.825 – 11.88 | 5 | 10 | tied |
| 7 | Modal (gVisor) | 8.765 | 8.25 – 12.51 | 5 | 10 | tied |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_boat leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1655 | 812.6 – 1678 | 3 | 6 | — |
| 2 | Blaxel | 1127 | 1119 – 1191 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 1117 | 1094 – 1178 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 1093 | 1082 – 1136 | 3 | 6 | too few sandboxes |
| 5 | Novita | 1020 | 1017 – 1030 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 835.7 | 813.7 – 865.1 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 723.5 | 708.3 – 786.4 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 674.2 | 665.8 – 840.4 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 652.2 | 647 – 653.3 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 475 | 466.1 – 800.6 | 3 | 6 | too few sandboxes |
| 11 | tama | 352.3 | 338.2 – 372.8 | 3 | 6 | too few sandboxes |
| 12 | E2B | 241.2 | 239.1 – 241.7 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 91.8 | 84.83 – 747.6 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_boat leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 54050 | 45300 – 57150 | 3 | 6 | — |
| 2 | Blaxel | 52050 | 50900 – 57200 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 46700 | 42800 – 49000 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 39250 | 37200 – 56150 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 39100 | 36750 – 39750 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 29950 | 29050 – 134000 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 27500 | 27050 – 31150 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 26850 | 26800 – 27050 | 3 | 6 | too few sandboxes |
| 9 | Novita | 16250 | 16000 – 16350 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 14800 | 14500 – 16000 | 3 | 6 | too few sandboxes |
| 11 | tama | 13150 | 12850 – 13600 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 8637 | 8547 – 8753 | 3 | 6 | too few sandboxes |
| 13 | E2B | 8578 | 7869 – 8906 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_boat leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 221.2 | 185.6 – 233.8 | 3 | 6 | — |
| 2 | Blaxel | 212.9 | 208.1 – 234.4 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 191.4 | 175.6 – 200.8 | 3 | 6 | too few sandboxes |
| 4 | Vercel Sandbox | 160.4 | 150.5 – 162.5 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 160.4 | 152.6 – 229.6 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 122.7 | 119 – 548.9 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 112.7 | 111.1 – 127.4 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 110.1 | 109.6 – 111.1 | 3 | 6 | too few sandboxes |
| 9 | Novita | 66.74 | 65.54 – 67.06 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 60.66 | 59.35 – 65.54 | 3 | 6 | too few sandboxes |
| 11 | tama | 53.74 | 52.64 – 55.73 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 35.39 | 35.02 – 35.86 | 3 | 6 | too few sandboxes |
| 13 | E2B | 35.18 | 32.24 – 36.49 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_boat leads · ~1.5× Blaxel on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 404500 | 198500 – 409500 | 3 | 6 | — |
| 2 | Blaxel | 275000 | 273500 – 290500 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 273000 | 267500 – 287500 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 267000 | 264000 – 277500 | 3 | 6 | too few sandboxes |
| 5 | Novita | 249000 | 248000 – 251500 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 204000 | 198500 – 211000 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 177000 | 173000 – 192000 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 165000 | 162500 – 205000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 159000 | 157500 – 159500 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 116000 | 114000 – 195500 | 3 | 6 | too few sandboxes |
| 11 | tama | 86000 | 82550 – 91000 | 3 | 6 | too few sandboxes |
| 12 | E2B | 58900 | 58400 – 59000 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 22400 | 20700 – 182500 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 16900 | 14600 – 50600 | 3 | 6 | — |
| 2 | Daytona (VM) | 10850 | 10800 – 11700 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 10468 | 10450 – 11050 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 7056 | 6976 – 7082 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 6099 | 5840 – 6443 | 3 | 6 | too few sandboxes |
| 6 | Novita | 5012 | 4699 – 5171 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3611 | 3507 – 3725 | 3 | 6 | too few sandboxes |
| 8 | boat | 3436 | 3294 – 3770 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 2912 | 2858 – 3124 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1902 | 1825 – 4450 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1901 | 1878 – 1912 | 3 | 6 | too few sandboxes |
| 12 | tama | 799.5 | 780 – 810.5 | 3 | 6 | too few sandboxes |
| 13 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 17720 | 15350 – 53040 | 3 | 6 | — |
| 2 | Daytona (VM) | 11330 | 11330 – 12290 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 11020 | 11010 – 11600 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 7400 | 7316 – 7427 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 6396 | 6126 – 6758 | 3 | 6 | too few sandboxes |
| 6 | Novita | 5258 | 4928 – 5424 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3788 | 3679 – 3907 | 3 | 6 | too few sandboxes |
| 8 | boat | 3604 | 3456 – 3954 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 3055 | 2998 – 3276 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1996 | 1915 – 4668 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1995 | 1970 – 2006 | 3 | 6 | too few sandboxes |
| 12 | tama | 839.9 | 819.5 – 851.4 | 3 | 6 | too few sandboxes |
| 13 | E2B | 630.2 | 630.2 – 630.7 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5127 | 4971 – 5511 | 3 | 6 | — |
| 2 | Namespace | 5002 | 4306 – 5113 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4663 | 3694 – 4921 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 3866 | 3556 – 4972 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3598 | 3556 – 3651 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3184 | 3085 – 3265 | 3 | 6 | too few sandboxes |
| 7 | Novita | 2370 | 2303 – 2384 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 2346 | 2329 – 7212 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1832 | 1800 – 1853 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1754 | 1487 – 1806 | 3 | 6 | too few sandboxes |
| 11 | boat | 1618 | 897 – 1987 | 3 | 6 | too few sandboxes |
| 12 | E2B | 593.5 | 593 – 596.5 | 3 | 6 | too few sandboxes |
| 13 | tama | 374.5 | 346.5 – 405 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5377 | 5214 – 5780 | 3 | 6 | — |
| 2 | Namespace | 5246 | 4517 – 5362 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4891 | 3875 – 5162 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 4055 | 3730 – 5214 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3774 | 3730 – 3829 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 3340 | 3236 – 3425 | 3 | 6 | too few sandboxes |
| 7 | Novita | 2486 | 2416 – 2501 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 2462 | 2443 – 7564 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1923 | 1889 – 1945 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1841 | 1561 – 1895 | 3 | 6 | too few sandboxes |
| 11 | boat | 1699 | 942.7 – 2084 | 3 | 6 | too few sandboxes |
| 12 | E2B | 623.9 | 623.4 – 627.6 | 3 | 6 | too few sandboxes |
| 13 | tama | 394.3 | 365.4 – 426.2 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.79 | 25.25 – 25.84 | 3 | 6 | — |
| 2 | Blaxel | 20.05 | 20.05 – 20.07 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 18.26 | 16.26 – 18.37 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 18 | 17.27 – 18.11 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.39 | 12.16 – 12.42 | 3 | 6 | too few sandboxes |
| 6 | boat | 11.44 | 11.3 – 11.49 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 11.16 | 10.96 – 11.16 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 8.325 | 8.305 – 8.545 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 8.07 | 8.01 – 28.73 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 7.615 | 7.59 – 7.62 | 3 | 6 | too few sandboxes |
| 11 | tama | 7.095 | 7.035 – 7.1 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 3.06 | 2.575 – 4.295 | 3 | 6 | too few sandboxes |
| 13 | E2B | 1.26 | 1.145 – 1.3 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_tama leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 242300 | 154500 – 316800 | 3 | 6 | — |
| 2 | Daytona (VM) | 177100 | 114100 – 177200 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 131700 | 129100 – 161900 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 94320 | 91750 – 101200 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 62950 | 60570 – 68460 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 57090 | 57020 – 99420 | 3 | 6 | too few sandboxes |
| 7 | E2B | 54240 | 52010 – 55420 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 53660 | 53240 – 53770 | 3 | 6 | too few sandboxes |
| 9 | Novita | 53560 | 53100 – 53860 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 45230 | 44400 – 50190 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 44610 | 43020 – 44660 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 33310 | 33280 – 33400 | 3 | 6 | too few sandboxes |
| 13 | boat | 33090 | 28980 – 33100 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_tama leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 193100 | 177200 – 282300 | 3 | 6 | — |
| 2 | Daytona (VM) | 176500 | 113800 – 177000 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 130400 | 127000 – 160700 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 94030 | 91740 – 101200 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 59820 | 58560 – 72040 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 57030 | 56960 – 99130 | 3 | 6 | too few sandboxes |
| 7 | E2B | 54890 | 52250 – 55480 | 3 | 6 | too few sandboxes |
| 8 | Novita | 53600 | 52870 – 53780 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 53380 | 53020 – 53450 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 45350 | 43740 – 50610 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 44530 | 43010 – 44620 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 33270 | 33230 – 33290 | 3 | 6 | too few sandboxes |
| 13 | boat | 33010 | 28330 – 33080 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.4× tama on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 203400 | 138800 – 208300 | 3 | 6 | — |
| 2 | tama | 150400 | 134000 – 281469 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 115600 | 114700 – 178960 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 99620 | 97830 – 119800 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 88780 | 82390 – 95940 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 87900 | 87760 – 136300 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 82360 | 81810 – 83260 | 3 | 6 | too few sandboxes |
| 8 | E2B | 79300 | 78480 – 82960 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 70420 | 42500 – 79720 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 61310 | 58100 – 61470 | 3 | 6 | too few sandboxes |
| 11 | Novita | 58390 | 57880 – 58500 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 44040 | 43920 – 44740 | 3 | 6 | too few sandboxes |
| 13 | boat | 42460 | 38733 – 42710 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_tama leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 172200 | 122263 – 261927 | 3 | 6 | — |
| 2 | Daytona (VM) | 168400 | 104800 – 168400 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 132700 | 127600 – 154900 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 85860 | 84230 – 90820 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52740 | 52660 – 90410 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 51890 | 51360 – 56130 | 3 | 6 | too few sandboxes |
| 7 | Novita | 50870 | 50520 – 51560 | 3 | 6 | too few sandboxes |
| 8 | E2B | 47910 | 44630 – 49630 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 45936 | 45680 – 46010 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 40260 | 38700 – 40550 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 39640 | 37960 – 42930 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 30350 | 30260 – 30380 | 3 | 6 | too few sandboxes |
| 13 | boat | 29870 | 26500 – 29950 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 13 environments ranked best-first, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.5× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 9696 | 6481 – 10750 | 3 | 6 | — |
| 2 | Daytona (VM) | 6514 | 559 – 6531 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5810 | 5019 – 5914 | 3 | 6 | too few sandboxes |
| 4 | tama | 4958 | 4607 – 5308 | 2 | 4 | too few sandboxes |
| 5 | Modal (gVisor) | 4148 | 4114 – 5257 | 3 | 6 | too few sandboxes |
| 6 | E2B | 3840 | 3484 – 3958 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2761 | 2630 – 3654 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2522 | 765.2 – 2632 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 1832 | 1674 – 1992 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1481 | 1185 – 1501 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1417 | 1218 – 1454 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 936.9 | 936.5 – 936.9 | 3 | 6 | too few sandboxes |
| 13 | boat | 920.4 | 918.2 – 921.3 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 6028 | 4111 – 9181 | 3 | 6 | — |
| 2 | Vercel Sandbox | 4934 | 4920 – 5605 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 4441 | 2570 – 6070 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 4255 | 4224 – 4716 | 3 | 6 | too few sandboxes |
| 5 | Novita | 3584 | 3400 – 3889 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 3010 | 2854 – 3676 | 3 | 6 | too few sandboxes |
| 7 | tama | 2423 | 1230 – 3617 | 2 | 4 | too few sandboxes |
| 8 | Microsandbox Cloud | 2246 | 1474 – 3261 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1742 | 1651 – 2671 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1224 | 455.3 – 2731 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 934.4 | 934.4 – 934.6 | 3 | 6 | too few sandboxes |
| 12 | boat | 849.3 | 672.6 – 887.6 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 187.1 | 60.92 – 898.5 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156788 | 155400 – 161200 | 3 | 6 | — |
| 2 | Blaxel | 121398 | 113853 – 127482 | 3 | 6 | too few sandboxes |
| 3 | boat | 118160 | 107900 – 119560 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 79690 | 79182 – 81379 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 79199 | 72600 – 91930 | 3 | 6 | too few sandboxes |
| 6 | tama | 73630 | 73376 – 73890 | 2 | 4 | too few sandboxes |
| 7 | Vercel Sandbox | 66977 | 53419 – 67485 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 50069 | 38850 – 50438 | 3 | 6 | too few sandboxes |
| 9 | E2B | 48759 | 47289 – 59430 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 39820 | 35580 – 41050 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 36464 | 36166 – 36860 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 15502 | 15169 – 22459 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 12870 | 10441 – 15520 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.4× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156690 | 156637 – 159600 | 3 | 6 | — |
| 2 | Blaxel | 113500 | 107575 – 130100 | 3 | 6 | too few sandboxes |
| 3 | boat | 112333 | 106196 – 117400 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 93884 | 93280 – 102600 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 70290 | 60320 – 75170 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 59332 | 59000 – 61200 | 3 | 6 | too few sandboxes |
| 7 | E2B | 53851 | 48920 – 54709 | 3 | 6 | too few sandboxes |
| 8 | tama | 50400 | 49650 – 51150 | 2 | 4 | too few sandboxes |
| 9 | Runloop | 45610 | 33220 – 53450 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 42892 | 39402 – 44599 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 42877 | 42353 – 44380 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 22990 | 14030 – 24435 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 11518 | 10640 – 12800 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 10000 – 10000 | 3 | 6 | — |
| 2 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 2 | boat | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | tama | 9999 | 9999 – 9999 | 2 | 4 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 13 | Modal (gVisor) | 149 | 140.5 – 170 | 3 | 6 | too few sandboxes |

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
| 1 | Namespace | 32.4 | 32.4 – 32.85 | 3 | 6 | — |
| 2 | boat | 33.27 | 33.06 – 34.2 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 36.73 | 35.68 – 36.86 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 40.07 | 40.05 – 41.21 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 40.14 | 39.64 – 44.32 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 41.39 | 41.15 – 42.09 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 41.99 | 40.96 – 47.68 | 3 | 6 | too few sandboxes |
| 8 | Novita | 43.68 | 43.61 – 43.83 | 3 | 6 | too few sandboxes |
| 9 | tama | 50.63 | 50.39 – 52.42 | 3 | 6 | too few sandboxes |
| 10 | E2B | 62.86 | 60.88 – 72.06 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 63.43 | 60.78 – 63.44 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 86.11 | 65.65 – 87.26 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 87.43 | 66.05 – 90.8 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_boat leads · ~1.1× Blaxel on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 357600 | 276800 – 378800 | 3 | 6 | — |
| 2 | Blaxel | 329600 | 324300 – 332900 | 3 | 6 | too few sandboxes |
| 3 | Novita | 304700 | 279200 – 307100 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 290500 | 277200 – 291400 | 3 | 6 | too few sandboxes |
| 5 | tama | 278900 | 261500 – 344900 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 261400 | 259000 – 261800 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 237600 | 230000 – 248700 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 194200 | 181400 – 274900 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 178200 | 177600 – 178700 | 2 | 4 | too few sandboxes |
| 10 | Vercel Sandbox | 169000 | 151400 – 173000 | 3 | 6 | too few sandboxes |
| 11 | E2B | 164000 | 140800 – 236500 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 140300 | 139700 – 140700 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 12860 | 12840 – 13210 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_boat leads · Blaxel is ~1.1× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.14 | 0.132 – 0.1805 | 3 | 6 | — |
| 2 | Blaxel | 0.152 | 0.15 – 0.1545 | 3 | 6 | too few sandboxes |
| 3 | Novita | 0.164 | 0.1625 – 0.179 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 0.172 | 0.1715 – 0.1805 | 3 | 6 | too few sandboxes |
| 5 | tama | 0.183 | 0.1585 – 0.195 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 0.191 | 0.191 – 0.1935 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 0.2105 | 0.201 – 0.2175 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 0.2575 | 0.182 – 0.276 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.282 | 0.28 – 0.284 | 2 | 4 | too few sandboxes |
| 10 | Vercel Sandbox | 0.296 | 0.289 – 0.331 | 3 | 6 | too few sandboxes |
| 11 | E2B | 0.305 | 0.212 – 0.355 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 0.3565 | 0.3555 – 0.358 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 3.889 | 3.793 – 3.893 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 28730 | 28580 – 28880 | 3 | 6 | — |
| 2 | Blaxel | 23010 | 22830 – 23040 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 22200 | 22170 – 22760 | 3 | 6 | too few sandboxes |
| 4 | boat | 20850 | 16640 – 27510 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 16800 | 15970 – 17890 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 16050 | 15880 – 16220 | 2 | 4 | too few sandboxes |
| 7 | Daytona (VM) | 15690 | 15560 – 15730 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 15300 | 14050 – 17080 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 14880 | 14440 – 18450 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 12180 | 11970 – 12220 | 3 | 6 | too few sandboxes |
| 11 | E2B | 11490 | 9692 – 11920 | 3 | 6 | too few sandboxes |
| 12 | tama | 6440 | 6433 – 6587 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 1921 | 1909 – 2028 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads · Blaxel is ~1.2× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.744 | 1.732 – 1.752 | 3 | 6 | — |
| 2 | Blaxel | 2.176 | 2.17 – 2.193 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 2.252 | 2.196 – 2.255 | 3 | 6 | too few sandboxes |
| 4 | boat | 2.406 | 1.819 – 3.006 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 2.982 | 2.796 – 3.144 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 3.128 | 3.103 – 3.153 | 2 | 4 | too few sandboxes |
| 7 | Daytona (VM) | 3.187 | 3.179 – 3.213 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 3.267 | 2.931 – 3.566 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 3.362 | 2.71 – 3.465 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 4.151 | 4.127 – 4.247 | 3 | 6 | too few sandboxes |
| 11 | E2B | 4.351 | 4.197 – 5.159 | 3 | 6 | too few sandboxes |
| 12 | tama | 7.999 | 7.946 – 8.021 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 26.03 | 24.66 – 26.2 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · boat is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 364 | 359 – 364 | 3 | 6 | — |
| 2 | boat | 402.5 | 398.5 – 414.5 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 405.5 | 402.5 – 408 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 451.5 | 451 – 451.5 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 457 | 454.5 – 461.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 476 | 458 – 667 | 3 | 6 | too few sandboxes |
| 7 | Novita | 480 | 479.5 – 482 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 497 | 486 – 504 | 3 | 6 | too few sandboxes |
| 9 | tama | 533.5 | 531 – 534 | 3 | 6 | too few sandboxes |
| 10 | E2B | 618.5 | 518.5 – 804.5 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 764.5 | 763.5 – 769 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 903 | 901 – 908 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 1181 | 771.5 – 1185 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.37 | 30.77 – 31.75 | 3 | 6 | — |
| 2 | Namespace | 31.68 | 31.65 – 32.39 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 39.18 | 39.12 – 40.52 | 3 | 6 | too few sandboxes |
| 4 | Novita | 39.21 | 38.97 – 41.21 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 44.54 | 36 – 66.16 | 3 | 6 | too few sandboxes |
| 6 | boat | 45.36 | 44.47 – 45.36 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 47.86 | 47.09 – 47.99 | 3 | 6 | too few sandboxes |
| 8 | tama | 53.81 | 53.53 – 55.65 | 3 | 6 | too few sandboxes |
| 9 | E2B | 64.79 | 60.43 – 82.11 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 68.15 | 64.92 – 70.85 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 75.34 | 66.49 – 82.26 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 91.04 | 65.26 – 99.31 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 486 | 333.3 – 492.2 | 3 | 6 | too few sandboxes |

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

59 uncovered results across 5 providers (Microsandbox Cloud 10, Modal (gVisor) 6, Modal (VM) 2, run.cloud 17, tama 24). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Microsandbox Cloud | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" timed out after 4800s; Cleanup unresolved: Destroy timeout |
| Microsandbox Cloud | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Microsandbox Cloud | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" timed out after 4800s; Cleanup unresolved: sandbox bench-cloud-58da16af-5de7-4d6f-bedc-8d5febafc619 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| Microsandbox Cloud | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" timed out after 4800s; Cleanup unresolved: sandbox bench-cloud-53cef7f5-04bb-4b64-863c-86ca28ec17d4 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| Microsandbox Cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Microsandbox Cloud | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" timed out after 4800s; Cleanup unresolved: sandbox bench-cloud-53b7d871-6b4c-4f0f-8231-d8a9872b2d96 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| Microsandbox Cloud | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s; Cleanup unresolved: sandbox bench-cloud-0cad84ee-ca1b-4b05-8a7f-7400be4ea692 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| Microsandbox Cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Microsandbox Cloud | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s; Cleanup unresolved: Destroy timeout |
| Microsandbox Cloud | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s; Cleanup unresolved: sandbox bench-cloud-78f3d7cc-9e0d-45a7-bf57-a83ccd30cfc5 still has an accepted operation after 1000ms; safe teardown remains scheduled |
| Modal (gVisor) | realworld-better-auth | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Channel has been shut down |
| Modal (gVisor) | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| run.cloud | pgbench | **failed** | Cleanup unresolved: computesdk lifecycle destroy failed: run.cloud sandbox sbx_9bb23701a060834be02a has not confirmed removal after destroy |
| run.cloud | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| run.cloud | realworld-better-auth | **failed** | pts_realworld-better-auth: PTS batch-run of local/realworld-better-auth-1.0.0 completed but every trial errored (composite carries no values) |
| run.cloud | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" failed with exit code 1 |
| run.cloud | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| run.cloud | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" failed with exit code 1; Cleanup unresolved: computesdk lifecycle destroy failed: run.cloud sandbox sbx_5cc37e5d13d31e479edf has not confirmed removal after destroy |
| run.cloud | realworld-mastra | **failed** | pts_realworld-mastra: PTS batch-run of local/realworld-mastra-1.0.0 completed but every trial errored (composite carries no values) |
| run.cloud | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" failed with exit code 1 |
| run.cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r10: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r11: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r4: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r5: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r6: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r7: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r8: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r9: account runcloud admission stopped after runcloud-realworld-better-auth-r2: allocation ownership or journal release remains unresolved |
| tama | network | **failed** | Failed to create sandbox: tama new bench-be747fa9-81c4-4c84-a3fc-f6e5ded19d80 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-be747fa9-81c4-4c84-a3fc-f6e5ded19d80 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f449e800-6b29-4500-99a7-e093127e6657 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f449e800-6b29-4500-99a7-e093127e6657 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-90a100d3-61bf-4740-bd68-28f8f9928f03 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-90a100d3-61bf-4740-bd68-28f8f9928f03 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-58cb874f-766f-4b1e-8861-24aa463e5609 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-58cb874f-766f-4b1e-8861-24aa463e5609 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-a1745d9b-de13-471f-810b-0bbc6cdb6ce8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a1745d9b-de13-471f-810b-0bbc6cdb6ce8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-1cc7f245-ccfd-4752-90ab-f416447386ed --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1cc7f245-ccfd-4752-90ab-f416447386ed failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-9974f8a7-ad1e-46d2-9eec-51837848f13c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9974f8a7-ad1e-46d2-9eec-51837848f13c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-08f84473-47d5-43ec-9971-f0da9e218492 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-08f84473-47d5-43ec-9971-f0da9e218492 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-04853fed-7270-4410-93be-26ff7f214491 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-04853fed-7270-4410-93be-26ff7f214491 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-df8ec5d9-dece-4344-876e-5841ecbe17ce --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-df8ec5d9-dece-4344-876e-5841ecbe17ce failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-fdb4bf8c-1787-45b7-a658-837856e113e4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-fdb4bf8c-1787-45b7-a658-837856e113e4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-a7f92ebd-5ac5-454c-a135-1faca811da62 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a7f92ebd-5ac5-454c-a135-1faca811da62 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-de2ab636-ba89-4a6a-871e-a640204721db --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-de2ab636-ba89-4a6a-871e-a640204721db failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-84eed36b-11b9-412e-baef-dff2ca50fe76 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-84eed36b-11b9-412e-baef-dff2ca50fe76 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4045ba26-de2c-4d94-b0f3-138a10585921 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4045ba26-de2c-4d94-b0f3-138a10585921 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-11072145-ae14-4cf7-982f-79222fd3db61 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-11072145-ae14-4cf7-982f-79222fd3db61 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-55d434e0-ee92-4853-b4ad-42aae7014dd7 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-55d434e0-ee92-4853-b4ad-42aae7014dd7 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4734d8a9-97ab-4ef1-aafa-56074effb866 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4734d8a9-97ab-4ef1-aafa-56074effb866 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4862aca4-a515-4a34-a9cd-cbf7d20f8d49 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4862aca4-a515-4a34-a9cd-cbf7d20f8d49 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e529bf1e-a0ec-4db6-8c0b-72fff8df6807 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e529bf1e-a0ec-4db6-8c0b-72fff8df6807 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-d9b4dd8d-e9dc-4f7d-8af9-39d01fecfef3 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d9b4dd8d-e9dc-4f7d-8af9-39d01fecfef3 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

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
The floor is a property of the design — here 2 v 3 sandboxes floors at p ≈ 0.20; 2 v 3 sandboxes floors at p ≈ 1.0; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 2 sandboxes floors at p ≈ 1.0; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Blaxel | 0.18 (tied) | 0.019 |
| realworld | Mastra: cold install | Novita | 0.44 (tied) | 0.19 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.14 (tied) | 0.16 |
| realworld | Mastra: cold install | boat | 0.11 (tied) | 0.23 |
| realworld | Mastra: cold install | Modal (VM) | 0.76 (tied) | 0.79 |
| realworld | Mastra: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: cold install | E2B | <0.001 | <0.001 |
| realworld | Mastra: cold install | run.cloud | 0.22 (tied) | 0.010 |
| realworld | Mastra: cold install | Runloop | 1.0 (tied) | 0.52 |
| realworld | Mastra: cold install | tama | 0.51 (tied) | 0.43 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.012 | 0.019 |
| realworld | Better-Auth: build | boat | — | — |
| realworld | Better-Auth: build | Namespace | 0.033 | 0.019 |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.12 (tied) | 0.0043 |
| realworld | Better-Auth: build | Modal (VM) | 0.71 (tied) | 0.066 |
| realworld | Better-Auth: build | Blaxel | 0.033 | 0.066 |
| realworld | Better-Auth: build | tama | 0.38 (tied) | 0.55 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: build | E2B | 0.80 (tied) | 0.066 |
| realworld | Better-Auth: build | run.cloud | 0.96 (tied) | 0.93 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.0011 | <0.001 |
| realworld | Better-Auth: build | Runloop | 0.0036 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | 0.0029 | 0.019 |
| realworld | Better-Auth: cold install | boat | 0.0011 | 0.0046 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.67 (tied) | 0.96 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.060 (tied) | 0.19 |
| realworld | Better-Auth: cold install | run.cloud | 0.49 (tied) | 0.93 |
| realworld | Better-Auth: cold install | tama | 0.61 (tied) | 0.89 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.26 (tied) | 0.077 |
| realworld | Better-Auth: cold install | E2B | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.0068 | 0.0046 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0071 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.014 | 0.0017 |
| realworld | Better-Auth: git clone | E2B | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: git clone | tama | 0.58 (tied) | 0.32 |
| realworld | Better-Auth: git clone | boat | 1.0 (tied) | 0.32 |
| realworld | Better-Auth: git clone | Novita | 0.025 | 0.066 |
| realworld | Better-Auth: git clone | run.cloud | 0.15 (tied) | 0.080 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.010 | 0.0042 |
| realworld | Better-Auth: git clone | Runloop | 0.26 (tied) | 0.091 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.0012 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.060 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.58 (tied) | 0.27 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.0047 | 0.045 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.66 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.96 (tied) | 0.67 |
| realworld | Better-Auth: lint (Biome) | tama | 0.76 (tied) | 0.89 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.0044 | 0.012 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.50 (tied) | 0.63 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.11 (tied) | 0.017 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.55 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.0044 | 0.0042 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 1.0 (tied) | 0.81 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.68 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.34 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | boat | 0.83 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.14 (tied) | 0.23 |
| realworld | Better-Auth: lint format | Novita | 0.12 (tied) | 0.017 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.024 | 0.066 |
| realworld | Better-Auth: lint format | Blaxel | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: lint format | tama | 0.0022 | 0.0042 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint format | E2B | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint format | run.cloud | 0.25 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.0031 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | 0.069 (tied) | 0.0076 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.024 | <0.001 |
| realworld | Better-Auth: lint packages | boat | 0.77 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.16 (tied) | 0.071 |
| realworld | Better-Auth: lint packages | Blaxel | 0.093 (tied) | 0.057 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | tama | 0.54 (tied) | 0.55 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint packages | E2B | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | run.cloud | 0.25 (tied) | 0.38 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | 0.011 | 0.0098 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Novita | 0.14 (tied) | 0.022 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.67 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Blaxel | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | tama | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint spell | E2B | 0.17 (tied) | 0.32 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | run.cloud | 0.10 (tied) | 0.030 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.0031 | <0.001 |
| realworld | Better-Auth: lint spell | Runloop | 0.079 (tied) | 0.026 |
| realworld | Better-Auth: lint types | boat | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Namespace | 0.033 | 0.019 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.0071 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.25 (tied) | 0.087 |
| realworld | Better-Auth: lint types | Novita | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: lint types | tama | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint types | Blaxel | 0.95 (tied) | 0.98 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint types | run.cloud | 0.0069 | 0.0098 |
| realworld | Better-Auth: lint types | Runloop | 0.0020 | 0.0028 |
| realworld | Better-Auth: lint types | Modal (gVisor) | 0.023 | 0.036 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Namespace | 0.033 | 0.066 |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.0056 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.0015 | 0.0017 |
| realworld | Better-Auth: typecheck | Novita | 0.28 (tied) | 0.071 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Blaxel | 0.033 | 0.19 |
| realworld | Better-Auth: typecheck | tama | 0.13 (tied) | 0.16 |
| realworld | Better-Auth: typecheck | run.cloud | 0.11 (tied) | 0.030 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | E2B | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Namespace | 0.27 (tied) | 0.019 |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.92 (tied) | 0.087 |
| realworld | Mastra: build:core | Blaxel | 0.92 (tied) | 0.087 |
| realworld | Mastra: build:core | Modal (VM) | 0.20 (tied) | 0.019 |
| realworld | Mastra: build:core | tama | 0.24 (tied) | 0.19 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | run.cloud | 0.60 (tied) | 0.051 |
| realworld | Mastra: build:core | E2B | 0.082 (tied) | 0.19 |
| realworld | Mastra: build:core | Runloop | <0.001 | 0.0046 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.033 | 0.019 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.0056 | 0.0017 |
| realworld | Mastra: git clone | Blaxel | 0.87 (tied) | 0.49 |
| realworld | Mastra: git clone | Modal (VM) | 0.24 (tied) | 0.066 |
| realworld | Mastra: git clone | Daytona (VM) | 0.98 (tied) | 0.99 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.41 (tied) | 0.19 |
| realworld | Mastra: git clone | boat | 0.16 (tied) | 0.019 |
| realworld | Mastra: git clone | run.cloud | 0.19 (tied) | 0.25 |
| realworld | Mastra: git clone | tama | 0.97 (tied) | 0.85 |
| realworld | Mastra: git clone | Novita | 0.93 (tied) | 0.19 |
| realworld | Mastra: git clone | E2B | 0.27 (tied) | 0.43 |
| realworld | Mastra: git clone | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.29 (tied) | 0.066 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Namespace | 0.089 (tied) | 0.019 |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.18 (tied) | 0.087 |
| realworld | Mastra: lint:format | Novita | 0.97 (tied) | 0.23 |
| realworld | Mastra: lint:format | Blaxel | 0.089 (tied) | 0.066 |
| realworld | Mastra: lint:format | tama | 0.0068 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 1.0 (tied) | 0.19 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | 0.0025 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Runloop | 0.033 | 0.019 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.41 (tied) | 0.19 |
| realworld | Mastra: test:core | boat | — | — |
| realworld | Mastra: test:core | Namespace | 0.017 | 0.0046 |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.093 (tied) | 0.16 |
| realworld | Mastra: test:core | Blaxel | 0.25 (tied) | 0.057 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.29 (tied) | 0.0098 |
| realworld | Mastra: test:core | tama | 0.61 (tied) | 0.35 |
| realworld | Mastra: test:core | run.cloud | 0.42 (tied) | 0.051 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: test:core | Runloop | 0.10 (tied) | 0.019 |
| realworld | Mastra: test:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.0036 | 0.0046 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.79 (tied) | 0.97 |
| realworld | OpenClaw: cold install | boat | 0.38 (tied) | 0.12 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.41 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.18 (tied) | 0.066 |
| realworld | OpenClaw: cold install | run.cloud | 0.17 (tied) | 0.077 |
| realworld | OpenClaw: cold install | E2B | 0.95 (tied) | 0.81 |
| realworld | OpenClaw: cold install | Runloop | 0.045 | 0.019 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.0014 | 0.0046 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.51 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.47 (tied) | 0.41 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.18 (tied) | 0.12 |
| realworld | OpenClaw: git clone | Novita | 0.0011 | 0.0046 |
| realworld | OpenClaw: git clone | boat | 0.0029 | 0.019 |
| realworld | OpenClaw: git clone | E2B | 0.76 (tied) | 0.43 |
| realworld | OpenClaw: git clone | run.cloud | 0.17 (tied) | 0.32 |
| realworld | OpenClaw: git clone | Runloop | 0.68 (tied) | 0.55 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.024 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | 0.020 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.47 (tied) | 0.73 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | 0.020 | 0.026 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.0045 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.068 (tied) | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.77 (tied) | 0.55 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | OpenClaw: lint (all extensions) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Runloop | 0.014 | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.59 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 1.0 (tied) | 0.41 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.012 | 0.014 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | 0.68 (tied) | 0.32 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.60 (tied) | 0.32 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.18 (tied) | 0.071 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.41 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.0015 | 0.0018 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.85 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.024 | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.13 (tied) | 0.077 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.13 (tied) | 0.032 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.0011 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.016 | 0.014 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.73 (tied) | 0.29 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.93 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.17 (tied) | 0.16 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.13 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.078 (tied) | 0.0046 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | boat | 0.15 (tied) | 0.031 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.095 (tied) | 0.0012 |
| cpu | Node.js web tooling | Daytona (VM) | 0.84 (tied) | 0.11 |
| cpu | Node.js web tooling | Novita | 0.056 (tied) | 0.0069 |
| cpu | Node.js web tooling | Blaxel | 0.42 (tied) | 0.31 |
| cpu | Node.js web tooling | tama | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.39 (tied) | 0.11 |
| cpu | Node.js web tooling | run.cloud | 0.40 (tied) | 0.11 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.095 (tied) | 0.0069 |
| cpu | Node.js web tooling | E2B | 0.69 (tied) | 0.031 |
| cpu | Node.js web tooling | Runloop | 0.15 (tied) | 0.11 |
| cpu | Node.js web tooling | Modal (gVisor) | 1.0 (tied) | 0.31 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | boat | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | boat | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | tama | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Novita | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | tama | — | — |
| memory | STREAM Add | Daytona (VM) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Novita | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Blaxel | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Novita | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | tama | — | — |
| memory | STREAM Scale | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Modal (gVisor) | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Novita | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | tama | 0.40 (too few sandboxes) | 0.14 |
| network | iperf3 WAN download | Modal (gVisor) | 0.40 (too few sandboxes) | 0.44 |
| network | iperf3 WAN download | E2B | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Namespace | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Daytona (VM) | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | tama | 0.80 (too few sandboxes) | 0.67 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.89 |
| network | iperf3 WAN upload | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | run.cloud | 0.60 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | boat | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.80 (too few sandboxes) | 0.14 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | boat | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.80 (too few sandboxes) | 0.14 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.80 (too few sandboxes) | 0.25 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | boat | 1.0 (too few sandboxes, equal medians) | 1.0 |
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
| system | Git common operations | Namespace | — | — |
| system | Git common operations | boat | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.012 |
| system | Git common operations | Modal (VM) | 1.0 (too few sandboxes) | 0.077 |
| system | Git common operations | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Runloop | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | boat | — | — |
| system | pgbench RO (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Namespace | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.25 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.066 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | boat | — | — |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.60 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.20 (too few sandboxes) | 0.25 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.066 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | boat | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.67 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.44 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | boat | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.67 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.44 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Daytona (VM) | 0.80 (too few sandboxes) | 0.81 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | boat | 1.0 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

