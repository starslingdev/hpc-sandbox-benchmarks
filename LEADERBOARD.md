# Sandbox provider leaderboard

Run [`36333582902`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36333582902) · commit [`1624916dae37fad3ffb8a29586fbf5f95bfdd552`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/1624916dae37fad3ffb8a29586fbf5f95bfdd552) ·
dataset [`data/dataset/runs/36333582902.json`](data/dataset/runs/36333582902.json) · generated 2026-09-27T18:30:13.793Z

**Partial results — incomplete experiment.** 640 of 672 planned cells complete; 32 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:64a7629ef09c29b66528584037eb41f2475d40179b2aeabc65c9c978047eab38`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **564 metric records**
backed by **4768 retained trial observations**, across **48 metrics** and
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
| Modal (gVisor) | gVisor container | gvisor (user-kernel, confirmed) |
| Modal (VM) | microVM (VM runtime) | cloud-hypervisor (microVM, confirmed) |
| Namespace | microVM (dedicated instance) | oci-container (container, likely) on firecracker |
| Novita | microVM | firecracker (microVM, confirmed) |
| run.cloud | Firecracker microVM | firecracker (microVM, confirmed) |
| Runloop | microVM | cloud-hypervisor (microVM, confirmed) |
| tama | container (shared kernel) | oci-container (container, strong) |
| Vercel Sandbox | Firecracker microVM | firecracker (microVM, confirmed) |

_Not present in this run: Daytona (container), Microsandbox Cloud — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **96 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 12 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 12 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 11 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 34.24 | 34.01 – 34.45 | 12 | 12 | — |
| 2 | Blaxel | 37.85 | 36.74 – 40.34 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.04 | 38.21 – 40.22 | 12 | 12 | tied |
| 4 | Novita | 44.74 | 43.4 – 46.25 | 12 | 12 | — |
| 4 | boat | 49.81 | 43.29 – 55.04 | 12 | 12 | tied |
| 4 | Modal (VM) | 50.75 | 41.84 – 52 | 11 | 11 | tied |
| 7 | Vercel Sandbox | 57.38 | 55.21 – 60.19 | 12 | 12 | — |
| 8 | E2B | 67.81 | 60.11 – 76.1 | 12 | 12 | — |
| 9 | Runloop | 86.07 | 76.38 – 92.22 | 12 | 12 | — |
| 9 | tama | 99.16 | 84.59 – 133.4 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 112.8 | 71.17 – 142.7 | 11 | 11 | tied |
| 9 | run.cloud | 154.3 | 119.9 – 161.4 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 49.68 | 49.66 – 50.05 | 12 | 12 | — |
| 1 | boat | 49.98 | 48.44 – 53.56 | 12 | 12 | tied |
| 3 | Daytona (VM) | 54.62 | 52.45 – 59.66 | 12 | 12 | — |
| 4 | Modal (VM) | 64.38 | 61.23 – 71.56 | 12 | 12 | — |
| 4 | Novita | 66.3 | 64 – 67.84 | 12 | 12 | tied |
| 4 | Blaxel | 68.48 | 65.21 – 69.83 | 12 | 12 | tied |
| 4 | tama | 81.92 | 50.73 – 84.96 | 4 | 4 | tied |
| 4 | run.cloud | 91.46 | 81.99 – 95.59 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 95.59 | 93.59 – 101.2 | 12 | 12 | — |
| 10 | E2B | 106.9 | 101.1 – 115 | 12 | 12 | — |
| 11 | Runloop | 161.1 | 159.6 – 162.5 | 12 | 12 | — |
| 11 | Modal (gVisor) | 168.8 | 149.5 – 185.5 | 12 | 12 | tied |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.809 | 9.721 – 9.95 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.12 | 11.57 – 12.22 | 12 | 12 | — |
| 2 | Blaxel | 12.29 | 11.94 – 12.75 | 12 | 12 | tied |
| 4 | boat | 15.92 | 14.54 – 45.93 | 12 | 12 | — |
| 4 | Novita | 16.24 | 15.23 – 17.1 | 12 | 12 | tied |
| 4 | Modal (VM) | 16.43 | 14.45 – 18.66 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 20.89 | 19.9 – 21.81 | 12 | 12 | — |
| 7 | Runloop | 21.29 | 20.7 – 21.71 | 12 | 12 | tied |
| 7 | E2B | 21.49 | 19.98 – 23.66 | 12 | 12 | tied |
| 7 | run.cloud | 28.5 | 19.57 – 51.45 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 51.45 | 42.44 – 56.99 | 12 | 12 | — |
| 11 | tama | 60.52 | 27.53 – 70.8 | 4 | 4 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6315 | 0.5965 – 0.6435 | 12 | 12 | — |
| 2 | Blaxel | 0.752 | 0.7315 – 0.7765 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.9615 | 0.8855 – 0.9895 | 12 | 12 | — |
| 3 | Modal (VM) | 1.039 | 0.847 – 1.895 | 12 | 12 | tied |
| 3 | Daytona (VM) | 1.433 | 1.303 – 1.675 | 12 | 12 | tied |
| 3 | E2B | 1.528 | 1.452 – 1.66 | 12 | 12 | tied |
| 7 | boat | 1.973 | 1.602 – 2.268 | 12 | 12 | — |
| 7 | Novita | 1.978 | 1.831 – 2.16 | 12 | 12 | tied |
| 9 | run.cloud | 2.563 | 2.152 – 2.97 | 12 | 12 | — |
| 9 | tama | 2.873 | 1.027 – 4.269 | 4 | 4 | tied |
| 9 | Modal (gVisor) | 3.167 | 2.771 – 3.788 | 12 | 12 | tied |
| 9 | Runloop | 6.639 | 2.521 – 11.85 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.356 | 2.314 – 2.41 | 12 | 12 | — |
| 2 | Namespace | 2.477 | 2.454 – 2.513 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.847 | 2.785 – 2.905 | 12 | 12 | — |
| 4 | Novita | 3.16 | 3.08 – 3.257 | 12 | 12 | — |
| 5 | Blaxel | 3.314 | 3.25 – 3.388 | 12 | 12 | — |
| 5 | Modal (VM) | 3.374 | 3.179 – 3.778 | 12 | 12 | tied |
| 7 | run.cloud | 4.127 | 3.954 – 4.729 | 12 | 12 | — |
| 7 | Vercel Sandbox | 4.425 | 4.221 – 4.514 | 12 | 12 | tied |
| 9 | E2B | 5.258 | 4.809 – 5.625 | 12 | 12 | — |
| 9 | tama | 5.468 | 4.665 – 9.555 | 4 | 4 | tied |
| 9 | Runloop | 6.857 | 6.367 – 7.03 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 13.38 | 11.36 – 16.16 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 7.703 | 7.427 – 8.243 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.358 | 9.258 – 10.39 | 12 | 12 | — |
| 2 | Namespace | 9.452 | 9.417 – 9.48 | 12 | 12 | tied |
| 4 | Blaxel | 10.78 | 10.49 – 10.97 | 12 | 12 | — |
| 4 | Novita | 11.03 | 10.65 – 11.15 | 12 | 12 | tied |
| 6 | Modal (VM) | 11.49 | 11.03 – 12.77 | 12 | 12 | — |
| 7 | run.cloud | 13.92 | 13 – 14.39 | 12 | 12 | — |
| 7 | tama | 15.02 | 13.48 – 17.91 | 4 | 4 | tied |
| 7 | Vercel Sandbox | 15.52 | 14.97 – 15.93 | 12 | 12 | tied |
| 10 | E2B | 19.51 | 18.91 – 21.09 | 12 | 12 | — |
| 11 | Runloop | 21.04 | 20.52 – 21.58 | 12 | 12 | — |
| 12 | Modal (gVisor) | 36.12 | 33.64 – 42.43 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.181 | 2.167 – 2.199 | 12 | 12 | — |
| 1 | boat | 2.213 | 2.111 – 2.332 | 12 | 12 | tied |
| 3 | Daytona (VM) | 2.635 | 2.54 – 2.897 | 12 | 12 | — |
| 4 | Novita | 2.924 | 2.866 – 3.018 | 12 | 12 | — |
| 4 | Modal (VM) | 3.013 | 2.846 – 3.553 | 12 | 12 | tied |
| 4 | Blaxel | 3.055 | 2.889 – 3.113 | 12 | 12 | tied |
| 7 | run.cloud | 3.52 | 3.2 – 3.891 | 12 | 12 | — |
| 7 | tama | 3.915 | 3.86 – 5.71 | 4 | 4 | tied |
| 7 | Vercel Sandbox | 4.616 | 4.357 – 4.644 | 12 | 12 | tied |
| 10 | E2B | 5.506 | 4.729 – 5.934 | 12 | 12 | — |
| 11 | Runloop | 6.184 | 6.002 – 6.585 | 12 | 12 | — |
| 12 | Modal (gVisor) | 8.258 | 7.623 – 9.058 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.096 | 2.086 – 2.115 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.376 | 2.335 – 2.428 | 12 | 12 | — |
| 2 | boat | 2.462 | 2.376 – 2.664 | 12 | 12 | tied |
| 2 | Blaxel | 2.612 | 2.55 – 2.747 | 12 | 12 | tied |
| 2 | Novita | 2.663 | 2.619 – 2.707 | 12 | 12 | tied |
| 6 | Modal (VM) | 2.923 | 2.702 – 3.24 | 12 | 12 | — |
| 7 | run.cloud | 3.727 | 3.253 – 3.939 | 12 | 12 | — |
| 7 | Vercel Sandbox | 3.774 | 3.704 – 3.833 | 12 | 12 | tied |
| 7 | tama | 3.819 | 3.192 – 3.973 | 4 | 4 | tied |
| 10 | E2B | 4.353 | 4.053 – 5.059 | 12 | 12 | — |
| 11 | Runloop | 8.419 | 8.236 – 8.816 | 12 | 12 | — |
| 12 | Modal (gVisor) | 10.22 | 10 – 10.92 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.529 | 5.284 – 5.901 | 12 | 12 | — |
| 1 | Namespace | 5.67 | 5.637 – 5.687 | 12 | 12 | tied |
| 3 | Daytona (VM) | 6.425 | 6.24 – 7.348 | 12 | 12 | — |
| 4 | Blaxel | 7.473 | 7.418 – 7.719 | 12 | 12 | — |
| 4 | Novita | 7.529 | 7.327 – 7.656 | 12 | 12 | tied |
| 4 | Modal (VM) | 7.626 | 7.434 – 8.829 | 12 | 12 | tied |
| 7 | tama | 10.12 | 9.513 – 11.16 | 4 | 4 | — |
| 7 | run.cloud | 10.62 | 9.855 – 11.28 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 11.79 | 11.39 – 12.45 | 12 | 12 | — |
| 10 | E2B | 13.62 | 12.43 – 15.76 | 12 | 12 | — |
| 11 | Runloop | 16.73 | 16.3 – 17.15 | 12 | 12 | — |
| 12 | Modal (gVisor) | 19.55 | 18.05 – 23.47 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.93 | 22.93 – 25.15 | 12 | 12 | — |
| 2 | boat | 25.81 | 24.27 – 28.45 | 12 | 12 | — |
| 2 | Namespace | 27.96 | 27.5 – 28.1 | 12 | 12 | tied |
| 2 | Modal (VM) | 28.44 | 26.66 – 34.81 | 12 | 12 | tied |
| 2 | Novita | 31.65 | 30.41 – 32.36 | 12 | 12 | tied |
| 2 | Blaxel | 32.95 | 29.27 – 34.52 | 12 | 12 | tied |
| 2 | tama | 42.01 | 16.68 – 42.43 | 4 | 4 | tied |
| 8 | Vercel Sandbox | 45.5 | 44.33 – 47.95 | 12 | 12 | — |
| 9 | run.cloud | 49.64 | 47.09 – 57.53 | 12 | 12 | — |
| 9 | E2B | 53.45 | 47.02 – 57.87 | 12 | 12 | tied |
| 11 | Runloop | 107.4 | 103.4 – 109.2 | 12 | 12 | — |
| 12 | Modal (gVisor) | 121.4 | 112.9 – 136.3 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 31.27 | 30.36 – 35.86 | 12 | 12 | — |
| 1 | Namespace | 32.69 | 32.29 – 33.21 | 12 | 12 | tied |
| 3 | Daytona (VM) | 38.6 | 37.31 – 39.85 | 12 | 12 | — |
| 4 | Novita | 43.81 | 42.81 – 45.75 | 12 | 12 | — |
| 4 | Modal (VM) | 46.16 | 42.05 – 50.23 | 12 | 12 | tied |
| 4 | Blaxel | 47.11 | 45.54 – 48.52 | 12 | 12 | tied |
| 4 | tama | 51.47 | 45.08 – 53.99 | 4 | 4 | tied |
| 8 | run.cloud | 65.48 | 61.67 – 75.93 | 12 | 12 | — |
| 8 | Vercel Sandbox | 68.74 | 67.38 – 70.91 | 12 | 12 | tied |
| 8 | E2B | 77.96 | 68.71 – 86.92 | 12 | 12 | tied |
| 11 | Runloop | 94.42 | 92.62 – 95.79 | 12 | 12 | — |
| 11 | Modal (gVisor) | 100.5 | 91.18 – 113.2 | 12 | 12 | tied |

### Mastra: build:core

Seconds · lower is better

_boat and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 56.76 | 55.48 – 59.5 | 12 | 12 | — |
| 1 | Namespace | 58.23 | 58.1 – 58.81 | 12 | 12 | tied |
| 3 | Daytona (VM) | 68.79 | 66.87 – 71.55 | 12 | 12 | — |
| 4 | Novita | 76.18 | 75.18 – 77.15 | 12 | 12 | — |
| 5 | Blaxel | 77.84 | 76.47 – 79.37 | 12 | 12 | — |
| 5 | Modal (VM) | 91.05 | 76.39 – 93.24 | 11 | 11 | tied |
| 7 | tama | 95.25 | 93.74 – 100.3 | 12 | 12 | — |
| 8 | run.cloud | 109.8 | 105 – 112.5 | 12 | 12 | — |
| 9 | Vercel Sandbox | 115.5 | 112.6 – 116.7 | 12 | 12 | — |
| 10 | E2B | 131.6 | 120.1 – 136 | 12 | 12 | — |
| 11 | Runloop | 153.8 | 142.5 – 173 | 12 | 12 | — |
| 11 | Modal (gVisor) | 188.3 | 129 – 191.7 | 11 | 11 | tied |

### Mastra: git clone

Seconds · lower is better

_Modal (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 2.193 | 1.959 – 2.438 | 11 | 11 | — |
| 1 | Namespace | 2.201 | 1.51 – 2.354 | 12 | 12 | tied |
| 3 | Blaxel | 2.409 | 2.071 – 2.445 | 12 | 12 | — |
| 4 | Daytona (VM) | 2.571 | 2.361 – 2.732 | 12 | 12 | — |
| 5 | Vercel Sandbox | 2.949 | 2.525 – 3.316 | 12 | 12 | — |
| 5 | Novita | 3.004 | 2.69 – 3.436 | 12 | 12 | tied |
| 5 | run.cloud | 3.154 | 3.042 – 4.024 | 12 | 12 | tied |
| 5 | boat | 3.358 | 3.078 – 3.899 | 12 | 12 | tied |
| 9 | E2B | 4.199 | 3.65 – 4.85 | 12 | 12 | — |
| 9 | tama | 4.416 | 3.617 – 6.768 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 4.633 | 3.369 – 7.998 | 11 | 11 | tied |
| 9 | Runloop | 5.55 | 4.353 – 8.845 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 68.09 | 67.32 – 69.16 | 12 | 12 | — |
| 2 | Namespace | 72.47 | 72.07 – 72.6 | 12 | 12 | — |
| 3 | Daytona (VM) | 84.55 | 82.79 – 90.52 | 12 | 12 | — |
| 4 | Novita | 95.9 | 94.68 – 97.09 | 12 | 12 | — |
| 4 | Blaxel | 96.75 | 93.19 – 99.3 | 12 | 12 | tied |
| 6 | Modal (VM) | 114.3 | 94.61 – 116.1 | 11 | 11 | — |
| 7 | tama | 116.5 | 112.9 – 121.8 | 12 | 12 | — |
| 8 | run.cloud | 137.9 | 135.8 – 143.5 | 12 | 12 | — |
| 9 | Vercel Sandbox | 143.9 | 142.1 – 146.4 | 12 | 12 | — |
| 9 | E2B | 167.7 | 141.6 – 178.6 | 12 | 12 | tied |
| 11 | Runloop | 209.7 | 183 – 220.8 | 12 | 12 | — |
| 11 | Modal (gVisor) | 222.2 | 163.8 – 237 | 11 | 11 | tied |

### Mastra: test:core

Seconds · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 812.8 | 805.7 – 834.6 | 12 | 12 | — |
| 2 | Namespace | 853.2 | 849.7 – 855.1 | 12 | 12 | — |
| 3 | Daytona (VM) | 921 | 907.5 – 961.5 | 12 | 12 | — |
| 4 | Blaxel | 951.7 | 944 – 958.1 | 12 | 12 | — |
| 5 | Novita | 1003 | 987.7 – 1010 | 12 | 12 | — |
| 5 | Modal (VM) | 1099 | 965.8 – 1114 | 11 | 11 | tied |
| 5 | tama | 1108 | 1095 – 1122 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 1295 | 1286 – 1311 | 12 | 12 | — |
| 8 | run.cloud | 1315 | 1285 – 1368 | 11 | 11 | tied |
| 10 | E2B | 1452 | 1300 – 1507 | 11 | 11 | — |
| 10 | Runloop | 1491 | 1442 – 1723 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 1501 | 1374 – 1663 | 6 | 6 | tied |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.35 | 10.21 – 10.58 | 12 | 12 | — |
| 2 | Blaxel | 12.09 | 11.88 – 12.34 | 12 | 12 | — |
| 3 | Modal (VM) | 17.83 | 17.04 – 18.37 | 12 | 12 | — |
| 3 | Vercel Sandbox | 18.48 | 18.3 – 18.76 | 12 | 12 | tied |
| 3 | boat | 19.41 | 18.2 – 20.71 | 12 | 12 | tied |
| 3 | Runloop | 20.99 | 18.66 – 22.36 | 12 | 12 | tied |
| 3 | E2B | 21.3 | 19.77 – 25.04 | 12 | 12 | tied |
| 3 | run.cloud | 29.92 | 20.35 – 38.93 | 12 | 12 | tied |
| 3 | Modal (gVisor) | 40.31 | 32.12 – 48.36 | 12 | 12 | tied |
| 3 | Novita | 91.91 | 24.08 – 211.9 | 12 | 12 | tied |
| 3 | Daytona (VM) | 94.67 | 74.91 – 233.6 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace, Blaxel, Daytona (VM) and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.265 | 2.147 – 6.892 | 12 | 12 | — |
| 1 | Blaxel | 2.543 | 2.502 – 3.784 | 12 | 12 | tied |
| 1 | Daytona (VM) | 3.259 | 3.165 – 3.953 | 12 | 12 | tied |
| 1 | Modal (VM) | 3.285 | 3.244 – 3.432 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.76 | 3.692 – 3.825 | 12 | 12 | — |
| 5 | Novita | 4.162 | 3.745 – 5.376 | 12 | 12 | tied |
| 7 | boat | 5.169 | 4.494 – 8.032 | 12 | 12 | — |
| 7 | E2B | 5.203 | 4.875 – 6.812 | 12 | 12 | tied |
| 9 | run.cloud | 9.392 | 9.184 – 9.529 | 12 | 12 | — |
| 9 | Runloop | 10.84 | 5.705 – 14.39 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 13.13 | 9.849 – 14.22 | 12 | 12 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Namespace is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 112.5 | 109.3 – 125.8 | 12 | 12 | — |
| 2 | Namespace | 143.7 | 142.8 – 146.8 | 12 | 12 | — |
| 3 | Daytona (VM) | 150.5 | 146.5 – 152.7 | 12 | 12 | — |
| 4 | Blaxel | 160.2 | 157.1 – 163.5 | 12 | 12 | — |
| 5 | Novita | 176.4 | 171.9 – 180.7 | 12 | 12 | — |
| 6 | Modal (VM) | 189.9 | 180.8 – 196.5 | 12 | 12 | — |
| 7 | run.cloud | 213.3 | 208.6 – 234.8 | 12 | 12 | — |
| 7 | Vercel Sandbox | 227.3 | 221.5 – 231.3 | 12 | 12 | tied |
| 9 | Runloop | 280 | 263.4 – 284.5 | 12 | 12 | — |
| 10 | E2B | 321.3 | 300.7 – 338.8 | 12 | 12 | — |
| 11 | Modal (gVisor) | 434.5 | 385 – 544.7 | 11 | 11 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Namespace is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 206.8 | 202.4 – 228.6 | 12 | 12 | — |
| 2 | Namespace | 286.9 | 284.3 – 288.8 | 12 | 12 | — |
| 2 | Daytona (VM) | 287.2 | 281.7 – 288.1 | 12 | 12 | tied |
| 4 | Blaxel | 310.9 | 304.5 – 317.5 | 12 | 12 | — |
| 5 | Novita | 343.3 | 338.9 – 349.5 | 12 | 12 | — |
| 6 | Modal (VM) | 358.4 | 353.4 – 367.2 | 12 | 12 | — |
| 7 | run.cloud | 409.5 | 403.5 – 531.3 | 12 | 12 | — |
| 7 | Vercel Sandbox | 416.9 | 414.1 – 426.9 | 12 | 12 | tied |
| 9 | Runloop | 502.4 | 477.8 – 520.4 | 12 | 12 | — |
| 10 | E2B | 619 | 596.4 – 655.9 | 12 | 12 | — |
| 11 | Modal (gVisor) | 727 | 610.4 – 788.6 | 11 | 11 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 79.41 | 74.97 – 83.16 | 12 | 12 | — |
| 2 | Daytona (VM) | 92.12 | 89.14 – 96.44 | 12 | 12 | — |
| 3 | Namespace | 102.9 | 102.2 – 105.3 | 12 | 12 | — |
| 3 | Blaxel | 104.1 | 102.5 – 106.2 | 12 | 12 | tied |
| 5 | Novita | 110.1 | 108.6 – 113 | 12 | 12 | — |
| 6 | Modal (VM) | 120.5 | 112.4 – 124.8 | 12 | 12 | — |
| 7 | run.cloud | 145 | 121.5 – 160.4 | 12 | 12 | — |
| 7 | Vercel Sandbox | 155.6 | 153 – 162.1 | 12 | 12 | tied |
| 9 | Runloop | 191.6 | 172.4 – 193.4 | 12 | 12 | — |
| 9 | E2B | 194.6 | 174.6 – 207.4 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 335.9 | 263.2 – 392.7 | 11 | 11 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 13.2 | 12.48 – 14.35 | 12 | 12 | — |
| 2 | Daytona (VM) | 15.86 | 15.72 – 16.68 | 12 | 12 | — |
| 3 | Blaxel | 17.64 | 17.31 – 17.97 | 12 | 12 | — |
| 3 | Namespace | 17.75 | 17.12 – 18.81 | 12 | 12 | tied |
| 5 | Novita | 20.72 | 20.38 – 21.72 | 12 | 12 | — |
| 5 | Modal (VM) | 22.04 | 20.1 – 22.9 | 12 | 12 | tied |
| 5 | run.cloud | 22.75 | 21.76 – 28.29 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 26.39 | 25.76 – 27.17 | 12 | 12 | tied |
| 9 | Runloop | 30.78 | 29.64 – 31.41 | 12 | 12 | — |
| 10 | E2B | 37.7 | 35.68 – 40.59 | 12 | 12 | — |
| 11 | Modal (gVisor) | 50.04 | 45.4 – 69.11 | 12 | 12 | — |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat and Namespace share the top on this metric (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 28.24 | 25.18 – 28.98 | 5 | 10 | — |
| 1 | Namespace | 26.61 | 26.2 – 26.96 | 5 | 10 | tied |
| 3 | Daytona (VM) | 19.98 | 18.5 – 21.16 | 5 | 10 | — |
| 3 | Novita | 19.66 | 18.91 – 20.32 | 5 | 10 | tied |
| 3 | Blaxel | 19.52 | 19.14 – 19.88 | 5 | 10 | tied |
| 6 | tama | 16.7 | 16.32 – 17.15 | 5 | 10 | — |
| 6 | Modal (VM) | 15.81 | 14.74 – 16.62 | 5 | 10 | tied |
| 6 | run.cloud | 14.38 | 13.39 – 17.3 | 5 | 10 | tied |
| 9 | Modal (gVisor) | 13.03 | 8.965 – 13.23 | 5 | 10 | — |
| 9 | Vercel Sandbox | 12.86 | 12.58 – 13.21 | 5 | 10 | tied |
| 11 | Runloop | 10.45 | 10.33 – 11.22 | 5 | 10 | — |
| 11 | E2B | 9.5 | 8.785 – 11.44 | 5 | 10 | tied |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_boat leads · ~1.5× Namespace on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1665 | 1572 – 1709 | 3 | 6 | — |
| 2 | Namespace | 1131 | 1048 – 1164 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 1128 | 1120 – 1169 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 1061 | 1056 – 1074 | 3 | 6 | too few sandboxes |
| 5 | Novita | 993.5 | 938 – 1009 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 883.4 | 743.4 – 887.1 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 801.1 | 678.4 – 833.6 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 743.4 | 728.2 – 754.5 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 654.8 | 647.5 – 660.6 | 3 | 6 | too few sandboxes |
| 10 | tama | 631.8 | 260.6 – 661.1 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 457.2 | 456.1 – 806.4 | 3 | 6 | too few sandboxes |
| 12 | E2B | 235.9 | 231.7 – 245.9 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~3.7× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 209000 | 192500 – 213000 | 3 | 6 | — |
| 2 | boat | 56300 | 53600 – 57300 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 50050 | 42650 – 54100 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 48100 | 47300 – 51300 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 38350 | 38100 – 38600 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 36650 | 32450 – 48300 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 27950 | 27200 – 31250 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 26750 | 26600 – 26900 | 3 | 6 | too few sandboxes |
| 9 | Novita | 16550 | 16250 – 16700 | 3 | 6 | too few sandboxes |
| 10 | E2B | 9276 | 4292 – 11200 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 8346 | 8267 – 8383 | 3 | 6 | too few sandboxes |
| 12 | tama | 8178 | 4665 – 15550 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~3.7× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 856.2 | 789.6 – 872.9 | 3 | 6 | — |
| 2 | boat | 230.7 | 219.7 – 234.9 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 205 | 174.6 – 221.8 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 196.6 | 194 – 210.2 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 157.3 | 155.7 – 158.3 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 150.5 | 132.6 – 198.2 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 114.3 | 111.1 – 127.9 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 109.6 | 109.1 – 110.1 | 3 | 6 | too few sandboxes |
| 9 | Novita | 67.9 | 66.43 – 68.47 | 3 | 6 | too few sandboxes |
| 10 | E2B | 38.01 | 17.56 – 45.82 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 34.18 | 33.87 – 34.34 | 3 | 6 | too few sandboxes |
| 12 | tama | 33.5 | 19.14 – 63.65 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_boat leads · ~1.5× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 406500 | 384000 – 417000 | 3 | 6 | — |
| 2 | Namespace | 276000 | 255500 – 284000 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 275000 | 273500 – 285000 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 258500 | 257500 – 262000 | 3 | 6 | too few sandboxes |
| 5 | Novita | 243000 | 229000 – 246500 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 215500 | 181500 – 216500 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 195500 | 166000 – 203500 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 181500 | 177500 – 184500 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 160000 | 158000 – 161500 | 3 | 6 | too few sandboxes |
| 10 | tama | 154500 | 63550 – 161500 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 111500 | 111000 – 197000 | 3 | 6 | too few sandboxes |
| 12 | E2B | 57650 | 56650 – 60000 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.2× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 25600 | 24000 – 27400 | 3 | 6 | — |
| 2 | Daytona (VM) | 11600 | 10700 – 11850 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9309 | 7208 – 11550 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 7124 | 7060 – 7159 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 6112 | 6009 – 6514 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4867 | 4812 – 4963 | 3 | 6 | too few sandboxes |
| 7 | boat | 3682 | 3384 – 3986 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3612 | 3573 – 3629 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 2450 | 1709 – 4343 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1769 | 1756 – 1779 | 3 | 6 | too few sandboxes |
| 11 | tama | 948.5 | 302.5 – 1059 | 3 | 6 | too few sandboxes |
| 12 | E2B | 597.5 | 591 – 599 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.2× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 26840 | 25130 – 28720 | 3 | 6 | — |
| 2 | Daytona (VM) | 12130 | 11220 – 12400 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 9744 | 7560 – 12130 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 7472 | 7404 – 7508 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 6411 | 6302 – 6832 | 3 | 6 | too few sandboxes |
| 6 | Novita | 5104 | 5046 – 5206 | 3 | 6 | too few sandboxes |
| 7 | boat | 3862 | 3549 – 4181 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3790 | 3749 – 3806 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 2570 | 1794 – 4555 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1857 | 1843 – 1866 | 3 | 6 | too few sandboxes |
| 11 | tama | 996.7 | 318.2 – 1112 | 3 | 6 | too few sandboxes |
| 12 | E2B | 628.1 | 621.3 – 630.2 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 5680 | 5628 – 6219 | 3 | 6 | — |
| 2 | Daytona (VM) | 5184 | 5165 – 5337 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 4617 | 4563 – 4938 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 4100 | 3717 – 4261 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3546 | 3513 – 4841 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3492 | 3478 – 3534 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 3190 | 3186 – 3252 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2364 | 2271 – 2382 | 3 | 6 | too few sandboxes |
| 9 | boat | 2064 | 1990 – 2128 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1520 | 1410 – 1535 | 3 | 6 | too few sandboxes |
| 11 | E2B | 599 | 586 – 602.5 | 3 | 6 | too few sandboxes |
| 12 | tama | 537.5 | 380.5 – 852.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 5957 | 5903 – 6523 | 3 | 6 | — |
| 2 | Daytona (VM) | 5437 | 5417 – 5597 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 4842 | 4786 – 5179 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 4301 | 3899 – 4469 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3719 | 3685 – 5077 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3663 | 3649 – 3708 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 3347 | 3342 – 3411 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2480 | 2383 – 2499 | 3 | 6 | too few sandboxes |
| 9 | boat | 2165 | 2088 – 2232 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 1596 | 1480 – 1611 | 3 | 6 | too few sandboxes |
| 11 | E2B | 629.7 | 616 – 633.9 | 3 | 6 | too few sandboxes |
| 12 | tama | 565.2 | 400.6 – 895.5 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.04 | 24.98 – 25.39 | 3 | 6 | — |
| 2 | Blaxel | 20.23 | 19.95 – 20.25 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 18.16 | 18.13 – 18.26 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 18.1 | 17.82 – 18.2 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.09 | 11.26 – 12.18 | 3 | 6 | too few sandboxes |
| 6 | boat | 11.76 | 11.17 – 11.8 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 10.96 | 10.9 – 11.18 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 8.105 | 8.02 – 28.42 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 7.845 | 7.605 – 7.875 | 3 | 6 | too few sandboxes |
| 10 | tama | 7.235 | 4.94 – 7.81 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 4.81 | 4.785 – 4.855 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1.78 | 1.245 – 1.965 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.4× Modal (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 180400 | 179400 – 185200 | 3 | 6 | — |
| 2 | Modal (VM) | 127800 | 65770 – 166900 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 92650 | 88280 – 117400 | 3 | 6 | too few sandboxes |
| 4 | tama | 91450 | 84688 – 158400 | 3 | 6 | too few sandboxes |
| 5 | Novita | 53713 | 53710 – 53970 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 53070 | 52530 – 53430 | 3 | 6 | too few sandboxes |
| 7 | E2B | 50210 | 48590 – 50880 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 49330 | 40660 – 50560 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 47520 | 32790 – 52800 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 44870 | 43270 – 45250 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 33310 | 33310 – 33330 | 3 | 6 | too few sandboxes |
| 12 | boat | 33030 | 32270 – 33190 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 179800 | 178700 – 184700 | 3 | 6 | — |
| 2 | Modal (VM) | 145700 | 65040 – 165500 | 3 | 6 | too few sandboxes |
| 3 | tama | 102900 | 40940 – 157200 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 94740 | 87800 – 117800 | 3 | 6 | too few sandboxes |
| 5 | Novita | 53730 | 53690 – 53920 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 52810 | 52390 – 53470 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 51260 | 34660 – 52540 | 3 | 6 | too few sandboxes |
| 8 | E2B | 50760 | 48640 – 50820 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 45550 | 40380 – 50620 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 44787 | 43277 – 45180 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 33270 | 33170 – 33290 | 3 | 6 | too few sandboxes |
| 12 | boat | 33010 | 32040 – 33130 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.4× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 211700 | 210100 – 214200 | 3 | 6 | — |
| 2 | Modal (VM) | 154800 | 77420 – 179200 | 3 | 6 | too few sandboxes |
| 3 | tama | 133800 | 130000 – 211500 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 109306 | 93650 – 130200 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 82610 | 52910 – 88806 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 82419 | 81571 – 84500 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 74500 | 64090 – 78980 | 3 | 6 | too few sandboxes |
| 8 | E2B | 67980 | 67070 – 77390 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 60970 | 59160 – 60980 | 3 | 6 | too few sandboxes |
| 10 | Novita | 58500 | 58500 – 58520 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 43820 | 43780 – 44770 | 3 | 6 | too few sandboxes |
| 12 | boat | 42400 | 42160 – 43240 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 172900 | 170100 – 176300 | 3 | 6 | — |
| 2 | Modal (VM) | 140100 | 61810 – 157700 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 91700 | 86520 – 114100 | 3 | 6 | too few sandboxes |
| 4 | tama | 83970 | 44530 – 200400 | 3 | 6 | too few sandboxes |
| 5 | Novita | 51285 | 51280 – 51750 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 46880 | 45000 – 48200 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 44510 | 32400 – 48640 | 3 | 6 | too few sandboxes |
| 8 | E2B | 43470 | 42990 – 43780 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 42247 | 34790 – 43490 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 40480 | 39040 – 40690 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 30300 | 30260 – 30370 | 3 | 6 | too few sandboxes |
| 12 | boat | 30010 | 29620 – 30080 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 12 environments ranked best-first, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Daytona (VM) leads · ~1.1× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6288 | 4033 – 6498 | 3 | 6 | — |
| 2 | Vercel Sandbox | 5897 | 3853 – 8814 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5465 | 3782 – 5831 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 4904 | 4462 – 5426 | 3 | 6 | too few sandboxes |
| 5 | E2B | 2924 | 2006 – 3812 | 3 | 6 | too few sandboxes |
| 6 | tama | 2634 | 1785 – 3483 | 2 | 4 | too few sandboxes |
| 7 | Runloop | 2035 | 1739 – 2092 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 1935 | 1581 – 2162 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 1773 | 109.3 – 3272 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1405 | 714.7 – 2166 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 936.6 | 935.9 – 936.9 | 3 | 6 | too few sandboxes |
| 12 | boat | 921.1 | 920.8 – 921.3 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Namespace leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 6258 | 3980 – 6336 | 3 | 6 | — |
| 2 | Modal (VM) | 5388 | 1866 – 9323 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 4835 | 2315 – 4975 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 4756 | 4332 – 4829 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 4634 | 3810 – 4749 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4519 | 3881 – 4648 | 3 | 6 | too few sandboxes |
| 7 | tama | 4059 | 3611 – 4507 | 2 | 4 | too few sandboxes |
| 8 | E2B | 2989 | 712.2 – 3255 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2550 | 1310 – 2577 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 1313 | 183.9 – 4294 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 934.3 | 934.2 – 934.5 | 3 | 6 | too few sandboxes |
| 12 | boat | 917.1 | 873.4 – 917.4 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 158000 | 155900 – 158146 | 3 | 6 | — |
| 2 | Blaxel | 156561 | 83920 – 175800 | 3 | 6 | too few sandboxes |
| 3 | boat | 113100 | 102000 – 114800 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 75070 | 68960 – 80260 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 66250 | 61769 – 66830 | 3 | 6 | too few sandboxes |
| 6 | E2B | 58047 | 48590 – 64432 | 3 | 6 | too few sandboxes |
| 7 | tama | 47351 | 45349 – 49353 | 2 | 4 | too few sandboxes |
| 8 | Runloop | 46870 | 40600 – 49120 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 39815 | 35841 – 41172 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 36365 | 36150 – 36570 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 21980 | 14770 – 95170 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 19249 | 15102 – 30520 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 159900 | 157400 – 160300 | 3 | 6 | — |
| 2 | Blaxel | 132400 | 112224 – 182700 | 3 | 6 | too few sandboxes |
| 3 | boat | 111186 | 100297 – 124140 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 71277 | 54258 – 97200 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 58070 | 53887 – 59010 | 3 | 6 | too few sandboxes |
| 6 | tama | 50090 | 44930 – 55240 | 2 | 4 | too few sandboxes |
| 7 | E2B | 48320 | 43835 – 48564 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 43890 | 41194 – 45387 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 42600 | 40700 – 46310 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 41980 | 38914 – 43600 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 17420 | 16950 – 77610 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 16820 | 12630 – 31220 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, boat, Daytona (VM), E2B, Modal (VM), Namespace, Novita, run.cloud, Runloop, tama and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | boat | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | tama | 9999 | 9999 – 9999 | 2 | 4 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 364.5 | 117.5 – 500.5 | 3 | 6 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 12 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Namespace leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 32.53 | 32.45 – 32.62 | 3 | 6 | — |
| 2 | boat | 34.33 | 33.05 – 43.71 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 36.25 | 36.07 – 39.34 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 39.93 | 39.67 – 43.71 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 40.86 | 40.16 – 41.73 | 3 | 6 | too few sandboxes |
| 6 | Novita | 44.52 | 43.57 – 45.4 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 47.8 | 41.69 – 48.5 | 3 | 6 | too few sandboxes |
| 8 | tama | 53.71 | 53.47 – 53.87 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 61.64 | 61.12 – 63.15 | 3 | 6 | too few sandboxes |
| 10 | E2B | 64.14 | 60.61 – 75.75 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 65.8 | 65.47 – 67.12 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 91.31 | 82.94 – 99.66 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_boat leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 385800 | 353800 – 411800 | 3 | 6 | — |
| 2 | tama | 382500 | 382400 – 469900 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 343100 | 325000 – 350900 | 3 | 6 | too few sandboxes |
| 4 | Novita | 308400 | 296900 – 309300 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 296100 | 282600 – 298000 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 278900 | 194100 – 289000 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 259900 | 259300 – 260000 | 3 | 6 | too few sandboxes |
| 8 | E2B | 215900 | 212800 – 219500 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 179500 | 176900 – 197800 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 169500 | 149800 – 175300 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 136700 | 132300 – 138800 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 13410 | 11100 – 14860 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.1295 | 0.1215 – 0.1415 | 3 | 6 | — |
| 2 | tama | 0.131 | 0.1065 – 0.1315 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 0.146 | 0.1425 – 0.154 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.1625 | 0.1615 – 0.1685 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 0.169 | 0.168 – 0.1765 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 0.1795 | 0.173 – 0.2575 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 0.1925 | 0.1925 – 0.193 | 3 | 6 | too few sandboxes |
| 8 | E2B | 0.232 | 0.228 – 0.235 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.2785 | 0.253 – 0.2835 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 0.295 | 0.2855 – 0.334 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 0.3655 | 0.361 – 0.3785 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 3.732 | 3.366 – 4.507 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 28990 | 28290 – 29010 | 3 | 6 | — |
| 2 | boat | 27870 | 23910 – 27890 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 23250 | 22870 – 23740 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 22730 | 21410 – 22860 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 17640 | 14530 – 19400 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 17240 | 15860 – 18220 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 16540 | 16340 – 17010 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 15900 | 15200 – 17940 | 3 | 6 | too few sandboxes |
| 9 | tama | 14330 | 12420 – 18470 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 12470 | 11690 – 12820 | 3 | 6 | too few sandboxes |
| 11 | E2B | 11350 | 11290 – 12680 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 1966 | 1640 – 2087 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.725 | 1.724 – 1.768 | 3 | 6 | — |
| 2 | boat | 1.794 | 1.794 – 2.094 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.151 | 2.106 – 2.187 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 2.2 | 2.187 – 2.335 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 2.835 | 2.578 – 3.442 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 2.901 | 2.744 – 3.162 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 3.024 | 2.939 – 3.062 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 3.165 | 2.788 – 3.34 | 3 | 6 | too few sandboxes |
| 9 | tama | 3.491 | 2.708 – 4.027 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 4.048 | 3.904 – 4.329 | 3 | 6 | too few sandboxes |
| 11 | E2B | 4.406 | 3.955 – 4.434 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 25.43 | 23.96 – 30.48 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 363.5 | 362.5 – 364 | 3 | 6 | — |
| 2 | Daytona (VM) | 406.5 | 405.5 – 442 | 3 | 6 | too few sandboxes |
| 3 | boat | 410.5 | 409.5 – 452.5 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 453.5 | 451 – 455 | 3 | 6 | too few sandboxes |
| 5 | Novita | 482.5 | 481.5 – 484.5 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 498.5 | 486.5 – 505.5 | 3 | 6 | too few sandboxes |
| 7 | tama | 512 | 510.5 – 512.5 | 3 | 6 | too few sandboxes |
| 8 | E2B | 631 | 588 – 749.5 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 670 | 477.5 – 672.5 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 763 | 762.5 – 764.5 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 770 | 764 – 774.5 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 1026 | 903 – 1062 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 12 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.73 | 31.06 – 34.18 | 3 | 6 | — |
| 2 | Namespace | 31.92 | 31.91 – 32 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 38.54 | 37.78 – 38.66 | 3 | 6 | too few sandboxes |
| 4 | Novita | 40.29 | 39.47 – 42.44 | 3 | 6 | too few sandboxes |
| 5 | boat | 54.15 | 47.96 – 82.15 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 65.06 | 35.47 – 65.75 | 3 | 6 | too few sandboxes |
| 7 | E2B | 66.64 | 61.96 – 73.92 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 67.07 | 66.3 – 67.51 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 70.28 | 69.66 – 73.13 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 74.44 | 67.1 – 81.52 | 3 | 6 | too few sandboxes |
| 11 | tama | 143.6 | 61.91 – 145.2 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 517.1 | 494.9 – 701.5 | 3 | 6 | too few sandboxes |

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

38 uncovered results across 5 providers (E2B 2, Modal (gVisor) 8, Modal (VM) 2, run.cloud 2, tama 24). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 1 of 6 declared metrics: realworld_openclaw_task_lint_extensions_all (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_extensions_all |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 2 of 6 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_test_types |
| Modal (VM) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Channel has been shut down |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| run.cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| run.cloud | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | network | **failed** | Failed to create sandbox: tama new bench-82ba4153-3a92-4548-8424-4ea189de9b73 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-82ba4153-3a92-4548-8424-4ea189de9b73 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-611c3659-8e44-41b0-8efb-21a644ba47ee --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-611c3659-8e44-41b0-8efb-21a644ba47ee failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-784183a7-b6fd-46e7-9072-86b931af5e61 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-784183a7-b6fd-46e7-9072-86b931af5e61 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-3c377427-266d-4162-a977-3de55d7c1bd1 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-3c377427-266d-4162-a977-3de55d7c1bd1 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-dbd5aa3e-9322-45a2-8982-39ca48312157 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-dbd5aa3e-9322-45a2-8982-39ca48312157 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-935e58bf-2197-446d-aee6-e9006c7cd150 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-935e58bf-2197-446d-aee6-e9006c7cd150 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-dc474181-3d29-433c-b9c2-22084799b99b --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-dc474181-3d29-433c-b9c2-22084799b99b failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-c8148f14-c732-4c16-8572-3db5e19fc18e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c8148f14-c732-4c16-8572-3db5e19fc18e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-afc07bad-0b82-4194-948d-f0f2a4ffa74f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-afc07bad-0b82-4194-948d-f0f2a4ffa74f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-7a332659-75d5-4db1-b327-08703fc79719 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7a332659-75d5-4db1-b327-08703fc79719 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-673206ad-0234-417c-a455-abf3f73b6e21 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-673206ad-0234-417c-a455-abf3f73b6e21 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e4ba25ec-0833-4402-b337-df0ed052150f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e4ba25ec-0833-4402-b337-df0ed052150f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-db8d6c76-aefb-427a-96df-e6979e1323fc --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-db8d6c76-aefb-427a-96df-e6979e1323fc failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6c487ac4-ca2d-4582-9d70-715d87e90abe --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6c487ac4-ca2d-4582-9d70-715d87e90abe failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-7be83309-b279-413c-8d9e-d0f73e7ec395 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7be83309-b279-413c-8d9e-d0f73e7ec395 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f2c60cfa-8902-42c6-8287-d7abcb43cb16 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f2c60cfa-8902-42c6-8287-d7abcb43cb16 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-03697395-40c8-4481-8d0f-fb2fd82029f0 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-03697395-40c8-4481-8d0f-fb2fd82029f0 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ec6fe814-c7ac-4a2a-a48d-d496350d6191 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ec6fe814-c7ac-4a2a-a48d-d496350d6191 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-0e253c68-d04c-414e-8a72-4dc4c2fe4489 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0e253c68-d04c-414e-8a72-4dc4c2fe4489 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-ea628fbf-4d26-4851-b3cf-b07c871f50fe --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ea628fbf-4d26-4851-b3cf-b07c871f50fe failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-238e83f9-2b8a-4dad-9aa9-c7245c211efd --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-238e83f9-2b8a-4dad-9aa9-c7245c211efd failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

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
| realworld | Mastra: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: cold install | Daytona (VM) | 0.14 (tied) | 0.066 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | boat | 0.24 (tied) | 0.019 |
| realworld | Mastra: cold install | Modal (VM) | 0.79 (tied) | 0.96 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.0017 | <0.001 |
| realworld | Mastra: cold install | E2B | 0.0068 | 0.019 |
| realworld | Mastra: cold install | Runloop | 0.0036 | 0.0046 |
| realworld | Mastra: cold install | tama | 0.052 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.83 (tied) | 0.71 |
| realworld | Mastra: cold install | run.cloud | 0.059 (tied) | 0.10 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | boat | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: build | Daytona (VM) | 0.0068 | 0.0046 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: build | Blaxel | 0.14 (tied) | 0.19 |
| realworld | Better-Auth: build | tama | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: build | run.cloud | 0.078 (tied) | 0.032 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.033 | 0.19 |
| realworld | Better-Auth: build | E2B | 0.0045 | 0.019 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | 0.089 (tied) | 0.19 |
| realworld | Better-Auth: cold install | boat | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Runloop | 0.35 (tied) | 0.43 |
| realworld | Better-Auth: cold install | E2B | 0.93 (tied) | 0.19 |
| realworld | Better-Auth: cold install | run.cloud | 0.24 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.028 | 0.0046 |
| realworld | Better-Auth: cold install | tama | 0.32 (tied) | 0.16 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: git clone | E2B | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: git clone | boat | 0.0045 | 0.019 |
| realworld | Better-Auth: git clone | Novita | 0.71 (tied) | 0.79 |
| realworld | Better-Auth: git clone | run.cloud | 0.0029 | 0.019 |
| realworld | Better-Auth: git clone | tama | 0.86 (tied) | 0.81 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.60 (tied) | 0.55 |
| realworld | Better-Auth: git clone | Runloop | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.011 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | tama | 0.68 (tied) | 0.81 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.14 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.039 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.38 (tied) | 0.55 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.86 (tied) | 0.32 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.039 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | boat | 0.74 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Novita | 0.0036 | 0.0046 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.40 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Blaxel | 0.66 (tied) | 0.19 |
| realworld | Better-Auth: lint format | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | tama | 0.078 (tied) | 0.032 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint format | E2B | 0.0023 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | 0.0056 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | boat | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Blaxel | 0.089 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Novita | 0.39 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.024 | 0.0046 |
| realworld | Better-Auth: lint packages | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.93 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | tama | 0.86 (tied) | 0.32 |
| realworld | Better-Auth: lint packages | E2B | 0.020 | 0.012 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Namespace | 0.58 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | 0.0014 | 0.0046 |
| realworld | Better-Auth: lint spell | Novita | 0.89 (tied) | 0.99 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.18 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | tama | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint spell | run.cloud | 0.60 (tied) | 0.81 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.0011 | 0.0046 |
| realworld | Better-Auth: lint spell | E2B | 0.0029 | 0.0046 |
| realworld | Better-Auth: lint spell | Runloop | 0.0068 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | boat | 0.010 | 0.0046 |
| realworld | Better-Auth: lint types | Namespace | 0.078 (tied) | 0.0046 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.93 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Novita | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Blaxel | 0.41 (tied) | 0.066 |
| realworld | Better-Auth: lint types | tama | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint types | run.cloud | 0.017 | 0.066 |
| realworld | Better-Auth: lint types | E2B | 0.71 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Namespace | 0.18 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Blaxel | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | tama | 0.10 (tied) | 0.032 |
| realworld | Better-Auth: typecheck | run.cloud | 0.0011 | 0.0013 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | E2B | 0.052 (tied) | 0.0046 |
| realworld | Better-Auth: typecheck | Runloop | 0.0045 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.13 (tied) | 0.019 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Namespace | 0.41 (tied) | 0.019 |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | 0.039 | 0.019 |
| realworld | Mastra: build:core | Modal (VM) | 0.079 (tied) | 0.032 |
| realworld | Mastra: build:core | tama | 0.0070 | 0.029 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | 0.0046 |
| realworld | Mastra: build:core | E2B | 0.0083 | <0.001 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.15 (tied) | 0.0098 |
| realworld | Mastra: git clone | Modal (VM) | — | — |
| realworld | Mastra: git clone | Namespace | 0.45 (tied) | 0.46 |
| realworld | Mastra: git clone | Blaxel | 0.020 | 0.019 |
| realworld | Mastra: git clone | Daytona (VM) | 0.035 | 0.066 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.045 | 0.066 |
| realworld | Mastra: git clone | Novita | 0.22 (tied) | 0.19 |
| realworld | Mastra: git clone | run.cloud | 0.16 (tied) | 0.066 |
| realworld | Mastra: git clone | boat | 0.84 (tied) | 0.99 |
| realworld | Mastra: git clone | E2B | 0.020 | 0.066 |
| realworld | Mastra: git clone | tama | 0.89 (tied) | 0.99 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.79 (tied) | 0.65 |
| realworld | Mastra: git clone | Runloop | 0.24 (tied) | 0.13 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Namespace | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Novita | 0.0023 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.67 (tied) | 0.43 |
| realworld | Mastra: lint:format | Modal (VM) | 0.032 | 0.040 |
| realworld | Mastra: lint:format | tama | 0.027 | 0.091 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.028 | 0.019 |
| realworld | Mastra: lint:format | E2B | 0.068 (tied) | 0.019 |
| realworld | Mastra: lint:format | Runloop | 0.0018 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.35 (tied) | 0.12 |
| realworld | Mastra: test:core | boat | — | — |
| realworld | Mastra: test:core | Namespace | <0.001 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Blaxel | 0.039 | <0.001 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.38 (tied) | 0.040 |
| realworld | Mastra: test:core | tama | 0.12 (tied) | 0.13 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.29 (tied) | 0.13 |
| realworld | Mastra: test:core | E2B | 0.040 | 0.012 |
| realworld | Mastra: test:core | Runloop | 0.079 (tied) | 0.20 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.68 (tied) | 0.93 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.078 (tied) | 0.066 |
| realworld | OpenClaw: cold install | boat | 0.078 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Runloop | 0.17 (tied) | 0.43 |
| realworld | OpenClaw: cold install | E2B | 0.44 (tied) | 0.43 |
| realworld | OpenClaw: cold install | run.cloud | 0.13 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.052 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Novita | 0.20 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.67 (tied) | 0.99 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | 0.32 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.078 (tied) | 0.0046 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.0045 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.062 (tied) | 0.019 |
| realworld | OpenClaw: git clone | boat | 0.032 | 0.019 |
| realworld | OpenClaw: git clone | E2B | 0.83 (tied) | 0.43 |
| realworld | OpenClaw: git clone | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Runloop | 0.51 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.27 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | 0.0045 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.0014 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.13 (tied) | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.0014 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.0036 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.014 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.019 | 0.0098 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | 0.0014 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.51 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.033 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.017 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.14 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.0017 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | 0.0011 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.59 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.18 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.16 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.18 (tied) | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.0011 | <0.001 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Namespace | 0.15 (tied) | <0.001 |
| cpu | Node.js web tooling | Daytona (VM) | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Novita | 0.84 (tied) | 0.31 |
| cpu | Node.js web tooling | Blaxel | 0.69 (tied) | 0.68 |
| cpu | Node.js web tooling | tama | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.056 (tied) | 0.11 |
| cpu | Node.js web tooling | run.cloud | 0.69 (tied) | 0.31 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.0079 | 0.0012 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.69 (tied) | 0.31 |
| cpu | Node.js web tooling | Runloop | 0.0079 | <0.001 |
| cpu | Node.js web tooling | E2B | 0.55 (tied) | 0.11 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.50 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.30 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.40 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | tama | 1.0 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Runloop | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | tama | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Add | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Runloop | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Add | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | tama | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Daytona (VM) | — | — |
| network | iperf3 WAN download | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Novita | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | E2B | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | tama | 0.80 (too few sandboxes) | 0.25 |
| network | iperf3 WAN download | Runloop | 0.80 (too few sandboxes) | 0.89 |
| network | iperf3 WAN download | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Namespace | — | — |
| network | iperf3 WAN upload | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 0.40 (too few sandboxes) | 0.67 |
| network | iperf3 WAN upload | E2B | 0.20 (too few sandboxes) | 0.066 |
| network | iperf3 WAN upload | Runloop | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | boat | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.40 (too few sandboxes) | 0.14 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | boat | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.40 (too few sandboxes) | 0.25 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.40 (too few sandboxes) | 0.81 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | boat | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | boat | — | — |
| system | pgbench RO (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | boat | — | — |
| system | pgbench RO latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.60 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.40 (too few sandboxes) | 0.81 |
| system | PyBench | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | E2B | 0.40 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | tama | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

