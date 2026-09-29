# Sandbox provider leaderboard

Run [`36498291449`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36498291449) · commit [`d02dfe89375e80f2a2814b2e8bea1e5f24646d95`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/d02dfe89375e80f2a2814b2e8bea1e5f24646d95) ·
dataset [`data/dataset/runs/36498291449.json`](data/dataset/runs/36498291449.json) · generated 2026-09-29T01:17:02.860Z

**Partial results — incomplete experiment.** 700 of 728 planned cells complete; 28 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:efd3a97355d87284041af484e3d525292cbb6ebe62fcb309086119111f0e972d`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **611 metric records**
backed by **5165 retained trial observations**, across **48 metrics** and
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

_Blaxel, Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 38.2 | 37.45 – 40.55 | 12 | 12 | — |
| 1 | Daytona (VM) | 38.29 | 37.92 – 41.55 | 12 | 12 | tied |
| 1 | Namespace | 40.22 | 38.31 – 40.47 | 12 | 12 | tied |
| 4 | boat | 43.55 | 42.09 – 47.32 | 12 | 12 | — |
| 4 | Novita | 44.51 | 42.35 – 46.94 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 48.73 | 46.77 – 51.49 | 12 | 12 | — |
| 6 | Modal (VM) | 51.89 | 44.98 – 55.28 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 65.64 | 59.77 – 90.41 | 12 | 12 | — |
| 8 | Modal (gVisor) | 70.67 | 67.73 – 74.99 | 11 | 11 | tied |
| 8 | E2B | 74.31 | 69.54 – 80.49 | 12 | 12 | tied |
| 11 | tama | 96.94 | 84.04 – 101.8 | 12 | 12 | — |
| 11 | Runloop | 100 | 95.44 – 102.8 | 12 | 12 | tied |
| 13 | run.cloud | 127.1 | 109 – 171.4 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_boat and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 50.89 | 47.6 – 55.72 | 12 | 12 | — |
| 1 | Daytona (VM) | 53.33 | 52.66 – 53.78 | 12 | 12 | tied |
| 3 | Namespace | 57.04 | 54.36 – 61.36 | 12 | 12 | — |
| 4 | tama | 65.28 | 59.97 – 68.44 | 4 | 4 | — |
| 4 | Novita | 66.35 | 64.81 – 67.06 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 68.77 | 60.48 – 74.04 | 12 | 12 | tied |
| 4 | Blaxel | 69.73 | 66.66 – 71.86 | 12 | 12 | tied |
| 8 | Modal (VM) | 73.34 | 71.57 – 75.17 | 12 | 12 | — |
| 9 | run.cloud | 90.51 | 77.28 – 95.14 | 12 | 12 | — |
| 10 | E2B | 101.8 | 94.49 – 106.3 | 12 | 12 | — |
| 11 | Vercel Sandbox | 113.4 | 108.8 – 167.6 | 12 | 12 | — |
| 11 | Modal (gVisor) | 135.5 | 105.2 – 145.5 | 12 | 12 | tied |
| 13 | Runloop | 185.7 | 159.4 – 194.1 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.93 | 10.63 – 11.15 | 12 | 12 | — |
| 2 | Blaxel | 12.49 | 12.01 – 12.72 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.81 | 12.15 – 14.24 | 12 | 12 | tied |
| 2 | boat | 13.5 | 12.78 – 17.6 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 14.61 | 13.98 – 17.2 | 12 | 12 | tied |
| 2 | Novita | 15.14 | 14.66 – 15.62 | 12 | 12 | tied |
| 7 | tama | 18.22 | 16.36 – 21.44 | 4 | 4 | — |
| 7 | Modal (VM) | 19.81 | 18.94 – 20.54 | 12 | 12 | tied |
| 7 | E2B | 20.32 | 18.25 – 22.37 | 12 | 12 | tied |
| 7 | run.cloud | 22.52 | 15.81 – 30.79 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 23.64 | 21.17 – 29.23 | 12 | 12 | tied |
| 12 | Runloop | 29.95 | 26.29 – 30.22 | 12 | 12 | — |
| 12 | Modal (gVisor) | 34.72 | 26.73 – 58.55 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6535 | 0.636 – 0.8295 | 12 | 12 | — |
| 2 | Blaxel | 0.7405 | 0.737 – 0.757 | 12 | 12 | — |
| 3 | Vercel Sandbox | 1.025 | 0.9205 – 1.221 | 12 | 12 | — |
| 3 | Modal (VM) | 1.124 | 0.9515 – 1.361 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 1.131 | 1.096 – 1.329 | 12 | 12 | tied |
| 3 | tama | 1.43 | 1.049 – 2.083 | 4 | 4 | tied |
| 3 | Daytona (VM) | 1.607 | 1.386 – 1.784 | 12 | 12 | tied |
| 3 | E2B | 1.647 | 1.533 – 2.532 | 12 | 12 | tied |
| 3 | boat | 1.705 | 1.633 – 2.021 | 12 | 12 | tied |
| 3 | Modal (gVisor) | 1.811 | 1.507 – 2.793 | 12 | 12 | tied |
| 3 | Novita | 2.014 | 1.71 – 2.162 | 12 | 12 | tied |
| 12 | Runloop | 2.72 | 1.964 – 6.025 | 12 | 12 | — |
| 12 | run.cloud | 3.606 | 2.11 – 7.305 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.386 | 2.305 – 2.532 | 12 | 12 | — |
| 2 | Namespace | 2.718 | 2.584 – 2.821 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.859 | 2.778 – 2.915 | 12 | 12 | — |
| 4 | Novita | 3.224 | 3.171 – 3.276 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.391 | 3.075 – 3.572 | 12 | 12 | tied |
| 4 | Blaxel | 3.405 | 3.32 – 3.501 | 12 | 12 | tied |
| 7 | Modal (VM) | 3.827 | 3.761 – 3.93 | 12 | 12 | — |
| 7 | run.cloud | 4.372 | 3.846 – 4.534 | 12 | 12 | tied |
| 9 | tama | 4.622 | 4.482 – 4.785 | 4 | 4 | — |
| 9 | E2B | 4.953 | 4.649 – 5.21 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 5.124 | 4.579 – 6.982 | 12 | 12 | tied |
| 12 | Runloop | 7.778 | 6.899 – 8.168 | 12 | 12 | — |
| 13 | Modal (gVisor) | 9.885 | 8.143 – 10.49 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 7.661 | 7.359 – 8.542 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.47 | 9.192 – 9.833 | 12 | 12 | — |
| 3 | Namespace | 10.19 | 9.607 – 11.06 | 12 | 12 | — |
| 3 | Blaxel | 10.84 | 10.61 – 11.63 | 12 | 12 | tied |
| 3 | Novita | 11.19 | 10.93 – 11.25 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 11.65 | 9.715 – 13.1 | 12 | 12 | tied |
| 7 | Modal (VM) | 13.01 | 12.73 – 13.47 | 12 | 12 | — |
| 8 | run.cloud | 14.47 | 13.53 – 15.53 | 12 | 12 | — |
| 8 | tama | 15.85 | 14.31 – 20.44 | 4 | 4 | tied |
| 8 | Vercel Sandbox | 17.52 | 16.92 – 22.92 | 12 | 12 | tied |
| 8 | E2B | 18.53 | 16.95 – 19.44 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 24.34 | 17.86 – 31.73 | 12 | 12 | — |
| 12 | Runloop | 24.94 | 23.01 – 25.39 | 12 | 12 | tied |

### Better-Auth: lint format

Seconds · lower is better

_boat, Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.223 | 2.123 – 2.633 | 12 | 12 | — |
| 1 | Namespace | 2.343 | 2.24 – 2.658 | 12 | 12 | tied |
| 1 | Daytona (VM) | 2.571 | 2.484 – 2.657 | 12 | 12 | tied |
| 4 | Novita | 2.986 | 2.947 – 3.113 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.103 | 2.747 – 3.535 | 12 | 12 | tied |
| 4 | Blaxel | 3.149 | 3.074 – 3.228 | 12 | 12 | tied |
| 7 | Modal (VM) | 3.561 | 3.541 – 3.636 | 12 | 12 | — |
| 7 | run.cloud | 3.793 | 3.564 – 4.405 | 12 | 12 | tied |
| 7 | tama | 4.325 | 3.913 – 6.075 | 4 | 4 | tied |
| 7 | E2B | 5.117 | 4.521 – 5.451 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 5.321 | 4.84 – 6.643 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 6.294 | 4.688 – 6.777 | 12 | 12 | tied |
| 13 | Runloop | 7.171 | 6.957 – 7.45 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace, Daytona (VM), tama and boat share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.279 | 2.182 – 2.42 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.407 | 2.349 – 2.439 | 12 | 12 | tied |
| 1 | tama | 2.495 | 2.085 – 3.705 | 4 | 4 | tied |
| 1 | boat | 2.496 | 2.309 – 2.655 | 12 | 12 | tied |
| 5 | Novita | 2.652 | 2.612 – 2.691 | 12 | 12 | — |
| 6 | Blaxel | 2.79 | 2.738 – 2.949 | 12 | 12 | — |
| 6 | Microsandbox Cloud | 2.995 | 2.551 – 3.567 | 12 | 12 | tied |
| 6 | Modal (VM) | 3.248 | 3.179 – 3.33 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 3.946 | 3.827 – 5.156 | 12 | 12 | — |
| 9 | run.cloud | 3.954 | 3.526 – 4.046 | 12 | 12 | tied |
| 11 | E2B | 4.335 | 3.869 – 4.556 | 12 | 12 | — |
| 12 | Modal (gVisor) | 8.304 | 6.655 – 9.535 | 12 | 12 | — |
| 12 | Runloop | 8.996 | 6.603 – 9.58 | 12 | 12 | tied |

### Better-Auth: lint spell

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.46 | 5.268 – 6.024 | 12 | 12 | — |
| 2 | Namespace | 5.957 | 5.699 – 6.983 | 12 | 12 | — |
| 2 | Daytona (VM) | 6.491 | 6.11 – 6.671 | 12 | 12 | tied |
| 4 | Novita | 7.707 | 7.511 – 7.886 | 12 | 12 | — |
| 4 | Blaxel | 7.808 | 7.621 – 8.175 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 7.949 | 6.742 – 8.431 | 12 | 12 | tied |
| 7 | Modal (VM) | 8.905 | 8.751 – 9.216 | 12 | 12 | — |
| 8 | run.cloud | 10.57 | 10.08 – 11.35 | 12 | 12 | — |
| 8 | tama | 10.58 | 10.01 – 11.73 | 4 | 4 | tied |
| 10 | E2B | 13.44 | 12.34 – 14.48 | 12 | 12 | — |
| 10 | Vercel Sandbox | 13.88 | 12.61 – 17.08 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 16.04 | 12.31 – 18.75 | 12 | 12 | tied |
| 13 | Runloop | 20.57 | 17.67 – 23.04 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_tama, boat and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 21.05 | 15.77 – 25.25 | 4 | 4 | — |
| 1 | boat | 24.52 | 23.68 – 27.64 | 12 | 12 | tied |
| 1 | Daytona (VM) | 24.53 | 23.8 – 25.54 | 12 | 12 | tied |
| 4 | Namespace | 29.39 | 28.46 – 33.62 | 12 | 12 | — |
| 4 | Novita | 31.53 | 29.98 – 32.3 | 12 | 12 | tied |
| 4 | Blaxel | 32.84 | 31.02 – 35.79 | 12 | 12 | tied |
| 4 | Modal (VM) | 34.79 | 34.01 – 36.48 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 37.98 | 31.14 – 44.12 | 12 | 12 | tied |
| 9 | E2B | 50.9 | 47.44 – 53.66 | 12 | 12 | — |
| 9 | run.cloud | 53.8 | 49.81 – 58.36 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 53.84 | 47.71 – 63.75 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 107.3 | 99.65 – 128.6 | 12 | 12 | — |
| 12 | Runloop | 111.7 | 69.28 – 114.3 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 32.98 | 31.05 – 33.93 | 12 | 12 | — |
| 2 | Namespace | 39.43 | 33.3 – 43.24 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.65 | 37.52 – 40.45 | 12 | 12 | tied |
| 4 | Novita | 44.93 | 44.35 – 46.48 | 12 | 12 | — |
| 5 | Blaxel | 47.75 | 46 – 49.05 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 50.46 | 40.38 – 55.36 | 12 | 12 | tied |
| 5 | Modal (VM) | 51.13 | 49.73 – 52.68 | 12 | 12 | tied |
| 5 | tama | 51.46 | 47.52 – 60.49 | 4 | 4 | tied |
| 9 | run.cloud | 65.87 | 63.29 – 75.24 | 12 | 12 | — |
| 10 | Vercel Sandbox | 74.45 | 72.07 – 101.7 | 12 | 12 | — |
| 10 | E2B | 74.92 | 70.14 – 78.61 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 80.14 | 67.55 – 91.91 | 12 | 12 | tied |
| 13 | Runloop | 163.1 | 159.4 – 165.9 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 60.29 | 57.63 – 65.07 | 12 | 12 | — |
| 2 | Namespace | 66.9 | 62.96 – 81.45 | 12 | 12 | — |
| 2 | Daytona (VM) | 68.78 | 65.94 – 70.79 | 12 | 12 | tied |
| 4 | Blaxel | 75.72 | 73.79 – 78.54 | 12 | 12 | — |
| 4 | Novita | 77.33 | 76.28 – 78.68 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 84.56 | 80.52 – 94.16 | 12 | 12 | — |
| 6 | Modal (VM) | 93.04 | 78.75 – 94.64 | 11 | 11 | tied |
| 8 | tama | 99.52 | 94.56 – 102.4 | 12 | 12 | — |
| 9 | run.cloud | 108.8 | 103.9 – 110.5 | 12 | 12 | — |
| 10 | Vercel Sandbox | 125.8 | 121.3 – 152.4 | 12 | 12 | — |
| 10 | Modal (gVisor) | 127 | 124.7 – 141.6 | 11 | 11 | tied |
| 10 | E2B | 132.6 | 124.3 – 149.3 | 12 | 12 | tied |
| 13 | Runloop | 276.9 | 274.1 – 295.6 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.687 | 1.526 – 2.45 | 12 | 12 | — |
| 1 | Blaxel | 1.716 | 1.645 – 2.02 | 12 | 12 | tied |
| 3 | Modal (VM) | 2.39 | 2.259 – 2.586 | 11 | 11 | — |
| 4 | Microsandbox Cloud | 2.712 | 2.634 – 3.46 | 12 | 12 | — |
| 4 | boat | 2.947 | 2.899 – 3.189 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 3 | 2.559 – 3.921 | 12 | 12 | tied |
| 4 | run.cloud | 3.215 | 3.128 – 8.416 | 12 | 12 | tied |
| 4 | Daytona (VM) | 3.361 | 2.375 – 4.364 | 12 | 12 | tied |
| 4 | Novita | 3.483 | 3.298 – 3.767 | 12 | 12 | tied |
| 4 | tama | 3.54 | 2.514 – 4.129 | 12 | 12 | tied |
| 4 | E2B | 3.787 | 3.516 – 4.458 | 12 | 12 | tied |
| 4 | Modal (gVisor) | 4.145 | 3.795 – 4.645 | 11 | 11 | tied |
| 13 | Runloop | 5.718 | 4.831 – 7.426 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 70.16 | 68.54 – 78.87 | 12 | 12 | — |
| 2 | Namespace | 79.61 | 76.12 – 84.28 | 12 | 12 | — |
| 2 | Daytona (VM) | 84.18 | 82.58 – 87.36 | 12 | 12 | tied |
| 4 | Novita | 96.21 | 94.8 – 98.48 | 12 | 12 | — |
| 4 | Blaxel | 96.73 | 91.48 – 105.1 | 12 | 12 | tied |
| 6 | Modal (VM) | 114.4 | 99.92 – 116.2 | 11 | 11 | — |
| 6 | tama | 114.4 | 110.6 – 120 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 116.5 | 103.4 – 144.3 | 12 | 12 | tied |
| 6 | run.cloud | 138.3 | 135.3 – 142.8 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 149 | 145.4 – 156.7 | 11 | 11 | — |
| 11 | Vercel Sandbox | 165.8 | 161.3 – 194.6 | 12 | 12 | — |
| 11 | E2B | 167.6 | 159.6 – 185.5 | 12 | 12 | tied |
| 13 | Runloop | 217.6 | 211.9 – 224.2 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 830.9 | 806 – 855.6 | 12 | 12 | — |
| 2 | Daytona (VM) | 908.1 | 898.4 – 917.9 | 12 | 12 | — |
| 2 | Namespace | 950.6 | 900.9 – 989 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 952.5 | 923 – 1088 | 12 | 12 | tied |
| 2 | Blaxel | 956 | 944.3 – 961.8 | 12 | 12 | tied |
| 6 | Novita | 1007 | 993.1 – 1015 | 12 | 12 | — |
| 7 | tama | 1118 | 1116 – 1131 | 12 | 12 | — |
| 7 | Modal (VM) | 1118 | 988 – 1134 | 11 | 11 | tied |
| 9 | run.cloud | 1311 | 1289 – 1353 | 12 | 12 | — |
| 10 | Vercel Sandbox | 1359 | 1339 – 1566 | 12 | 12 | — |
| 11 | Modal (gVisor) | 1419 | 1404 – 1515 | 11 | 11 | — |
| 11 | E2B | 1471 | 1410 – 1553 | 11 | 11 | tied |
| 13 | Runloop | 1961 | 1942 – 1994 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 11.43 | 11.01 – 12.64 | 12 | 12 | — |
| 1 | Daytona (VM) | 11.81 | 11.5 – 12.21 | 12 | 12 | tied |
| 1 | Blaxel | 12.09 | 11.92 – 12.32 | 12 | 12 | tied |
| 4 | Novita | 14.57 | 14.26 – 15 | 12 | 12 | — |
| 4 | Modal (VM) | 14.76 | 13.89 – 16.42 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 17.53 | 16.91 – 19.88 | 12 | 12 | — |
| 6 | boat | 18.73 | 17.64 – 20.42 | 12 | 12 | tied |
| 6 | E2B | 20.21 | 20 – 20.67 | 12 | 12 | tied |
| 6 | run.cloud | 20.4 | 18.81 – 21.74 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 20.67 | 18.94 – 24.52 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 24.48 | 21.6 – 28.36 | 12 | 12 | tied |
| 6 | Runloop | 24.83 | 23.55 – 25.74 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.564 | 2.41 – 2.984 | 12 | 12 | — |
| 1 | Blaxel | 2.704 | 2.588 – 2.795 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 3.72 | 3.354 – 5.757 | 12 | 12 | — |
| 3 | Vercel Sandbox | 4.287 | 3.851 – 4.809 | 12 | 12 | tied |
| 3 | Novita | 4.323 | 3.858 – 4.546 | 12 | 12 | tied |
| 3 | Daytona (VM) | 4.434 | 3.982 – 5.472 | 12 | 12 | tied |
| 3 | Modal (VM) | 4.518 | 4.115 – 4.617 | 12 | 12 | tied |
| 8 | E2B | 4.896 | 4.455 – 5.761 | 12 | 12 | — |
| 8 | Modal (gVisor) | 5.115 | 5.047 – 9.178 | 12 | 12 | tied |
| 8 | boat | 5.982 | 4.841 – 12.4 | 12 | 12 | tied |
| 8 | Runloop | 7.175 | 6.597 – 8.48 | 12 | 12 | tied |
| 12 | run.cloud | 10.71 | 9.891 – 12.18 | 12 | 12 | — |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 117.7 | 109.4 – 129.7 | 12 | 12 | — |
| 2 | Daytona (VM) | 145.7 | 143.3 – 147.8 | 12 | 12 | — |
| 3 | Blaxel | 163.6 | 160.7 – 166.6 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 164.2 | 153.3 – 172.3 | 12 | 12 | tied |
| 3 | Namespace | 164.8 | 158.8 – 170.8 | 12 | 12 | tied |
| 3 | Modal (VM) | 172 | 166.6 – 175.9 | 12 | 12 | tied |
| 3 | Novita | 175.3 | 172.8 – 179.7 | 12 | 12 | tied |
| 8 | run.cloud | 215.6 | 187.3 – 227.9 | 12 | 12 | — |
| 9 | Modal (gVisor) | 242.4 | 234.4 – 278.5 | 12 | 12 | — |
| 9 | Vercel Sandbox | 255.2 | 237.1 – 307.4 | 12 | 12 | tied |
| 9 | E2B | 304.4 | 271.1 – 319.2 | 12 | 12 | tied |
| 12 | Runloop | 343.9 | 327.4 – 357.6 | 12 | 12 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 210.2 | 197.7 – 226.5 | 12 | 12 | — |
| 2 | Daytona (VM) | 288.8 | 284.5 – 293.8 | 12 | 12 | — |
| 3 | Blaxel | 314.6 | 307.3 – 317.8 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 314.9 | 286.7 – 326.7 | 12 | 12 | tied |
| 3 | Namespace | 327 | 309.6 – 341.9 | 12 | 12 | tied |
| 3 | Modal (VM) | 331.5 | 327.4 – 341.8 | 12 | 12 | tied |
| 7 | Novita | 344 | 340.7 – 346.7 | 12 | 12 | — |
| 8 | run.cloud | 405.6 | 368 – 524.4 | 12 | 12 | — |
| 8 | Modal (gVisor) | 432.3 | 421.9 – 499.3 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 435.2 | 422.5 – 571.7 | 12 | 12 | tied |
| 11 | E2B | 586.9 | 519.4 – 615.1 | 12 | 12 | — |
| 12 | Runloop | 914.7 | 880 – 946.7 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 79.66 | 74.08 – 84.46 | 12 | 12 | — |
| 2 | Daytona (VM) | 91.11 | 90.51 – 94.13 | 12 | 12 | — |
| 3 | Blaxel | 106.9 | 105.5 – 109.2 | 12 | 12 | — |
| 3 | Modal (VM) | 108.9 | 105.9 – 112.8 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 109.1 | 107.8 – 119 | 12 | 12 | tied |
| 3 | Novita | 112.2 | 109.5 – 115.1 | 12 | 12 | tied |
| 3 | Namespace | 114.5 | 109.6 – 120 | 12 | 12 | tied |
| 8 | run.cloud | 130.5 | 115.8 – 157.9 | 12 | 12 | — |
| 8 | Modal (gVisor) | 148.9 | 141.6 – 165.4 | 12 | 12 | tied |
| 10 | Vercel Sandbox | 160.6 | 157.2 – 207.8 | 12 | 12 | — |
| 10 | E2B | 174.2 | 158.8 – 198.6 | 12 | 12 | tied |
| 12 | Runloop | 223.8 | 208.4 – 277.6 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 13.46 | 12.52 – 15.04 | 12 | 12 | — |
| 2 | Daytona (VM) | 15.87 | 15.45 – 16.38 | 12 | 12 | — |
| 3 | Blaxel | 17.46 | 17.11 – 17.84 | 12 | 12 | — |
| 4 | Modal (VM) | 18.1 | 17.8 – 18.7 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 18.8 | 17.45 – 19.87 | 12 | 12 | tied |
| 4 | Namespace | 19.43 | 18.33 – 20.36 | 12 | 12 | tied |
| 7 | Novita | 21.21 | 20.31 – 21.82 | 12 | 12 | — |
| 8 | run.cloud | 23.57 | 21.3 – 28.78 | 12 | 12 | — |
| 8 | Modal (gVisor) | 25.62 | 24.69 – 28.93 | 12 | 12 | tied |
| 10 | Vercel Sandbox | 29.5 | 26.51 – 36.89 | 12 | 12 | — |
| 10 | E2B | 34.08 | 31.04 – 37.24 | 12 | 12 | tied |
| 12 | Runloop | 46.67 | 37.6 – 52.89 | 12 | 12 | — |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 25.46 | 24.07 – 28.98 | 5 | 10 | — |
| 2 | Daytona (VM) | 21.57 | 21.06 – 21.92 | 5 | 10 | — |
| 2 | Microsandbox Cloud | 21.14 | 19.24 – 22.04 | 5 | 10 | tied |
| 2 | Namespace | 20.55 | 19.5 – 22.48 | 5 | 10 | tied |
| 2 | Novita | 19.56 | 18.59 – 21.03 | 5 | 10 | tied |
| 2 | Blaxel | 19.34 | 18.94 – 21.83 | 5 | 10 | tied |
| 7 | tama | 17.26 | 14.75 – 17.98 | 5 | 10 | — |
| 7 | Modal (VM) | 15.54 | 15.13 – 20.38 | 5 | 10 | tied |
| 7 | run.cloud | 14.9 | 14.32 – 19.09 | 5 | 10 | tied |
| 10 | Vercel Sandbox | 13.02 | 9.105 – 13.44 | 5 | 10 | — |
| 10 | Modal (gVisor) | 12.66 | 12.07 – 13.15 | 4 | 8 | tied |
| 10 | E2B | 12.61 | 10.2 – 13.65 | 5 | 10 | tied |
| 13 | Runloop | 8.23 | 7.96 – 8.74 | 5 | 10 | — |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, O_DIRECT (MB/s): 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, O_DIRECT (MB/s)</summary>

### fio rand write 4KB, O_DIRECT (MB/s) _(headline)_

MB/s · higher is better

_boat leads · ~1.3× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1487 | 1049 – 1814 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1150 | 1066 – 1312 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 896 | 719.8 – 905.4 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 887.1 | 870.3 – 1046 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 837.8 | 820 – 1154 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 773.3 | 763.4 – 795.3 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 559.9 | 551.6 – 1010 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 556.8 | 550.5 – 562 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 518 | 259.5 – 529.5 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 431 | 400 – 478.7 | 3 | 6 | too few sandboxes |
| 11 | Novita | 327.2 | 327.2 – 335 | 3 | 6 | too few sandboxes |
| 12 | tama | 269 | 250.6 – 304.6 | 3 | 6 | too few sandboxes |
| 13 | E2B | 240.1 | 239.1 – 244.8 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_boat leads · ~1.8× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, O_DIRECT (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 456500 | 301000 – 492500 | 3 | 6 | — |
| 2 | Vercel Sandbox | 249500 | 248000 – 250000 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 243500 | 208000 – 255000 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 227000 | 224000 – 244500 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 222000 | 203500 – 224000 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 220500 | 211000 – 246500 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 171500 | 165500 – 174000 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 147500 | 129500 – 152000 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 139800 | 107650 – 177000 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 108000 | 93150 – 109450 | 3 | 6 | too few sandboxes |
| 11 | tama | 94850 | 79600 – 96000 | 3 | 6 | too few sandboxes |
| 12 | Novita | 79750 | 77700 – 81600 | 3 | 6 | too few sandboxes |
| 13 | E2B | 58600 | 50500 – 58700 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_boat leads · ~1.8× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, O_DIRECT (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1871 | 1232 – 2018 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1021 | 1015 – 1025 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 996.1 | 850.9 – 1046 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 930.6 | 918 – 1000 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 908.6 | 835.2 – 917 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 903.9 | 863.5 – 1010 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 701.5 | 679 – 712.5 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 605 | 530.6 – 620.8 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 572 | 441.5 – 724.6 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 443 | 381.7 – 447.2 | 3 | 6 | too few sandboxes |
| 11 | tama | 388.5 | 326.1 – 392.7 | 3 | 6 | too few sandboxes |
| 12 | Novita | 326.6 | 318.2 – 334 | 3 | 6 | too few sandboxes |
| 13 | E2B | 240.1 | 206.6 – 240.6 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_boat leads · ~1.3× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, O_DIRECT (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 363000 | 256000 – 443000 | 3 | 6 | — |
| 2 | Vercel Sandbox | 281000 | 260000 – 320000 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 219000 | 176000 – 221000 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 216500 | 212500 – 255500 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 204500 | 200500 – 282000 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 189000 | 186500 – 194500 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 136500 | 134500 – 246500 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 136000 | 134500 – 137500 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 126500 | 63350 – 129500 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 105350 | 97750 – 117000 | 3 | 6 | too few sandboxes |
| 11 | Novita | 79900 | 79750 – 81800 | 3 | 6 | too few sandboxes |
| 12 | tama | 65700 | 61150 – 74300 | 3 | 6 | too few sandboxes |
| 13 | E2B | 58650 | 58350 – 59650 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, O_DIRECT (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 23450 | 8912 – 24200 | 3 | 6 | — |
| 2 | Modal (gVisor) | 23200 | 21950 – 25450 | 3 | 6 | too few sandboxes |
| 3 | boat | 18600 | 10750 – 18950 | 3 | 6 | too few sandboxes |
| 4 | Novita | 12000 | 11750 – 12150 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 11640 | 10750 – 15200 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 9747 | 7846 – 11192 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 7302 | 7067 – 7969 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 5750 | 4916 – 5929 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 5002 | 4788 – 5043 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 2275 | 2252 – 2307 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1046 | 1026 – 1626 | 3 | 6 | too few sandboxes |
| 12 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |
| 13 | tama | 526.5 | 366 – 1023 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, O_DIRECT (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 24540 | 9347 – 25340 | 3 | 6 | — |
| 2 | Modal (gVisor) | 24320 | 23030 – 26740 | 3 | 6 | too few sandboxes |
| 3 | boat | 19540 | 11270 – 19920 | 3 | 6 | too few sandboxes |
| 4 | Novita | 12620 | 12350 – 12780 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 12170 | 11270 – 15950 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 10200 | 8229 – 11740 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 7658 | 7411 – 8357 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 6031 | 5156 – 6218 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 5247 | 5022 – 5290 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 2386 | 2363 – 2420 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1098 | 1077 – 1707 | 3 | 6 | too few sandboxes |
| 12 | E2B | 630.2 | 630.2 – 630.2 | 3 | 6 | too few sandboxes |
| 13 | tama | 553.6 | 385.4 – 1074 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~2.5× Novita on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, O_DIRECT (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 16500 | 6621 – 20250 | 3 | 6 | — |
| 2 | Novita | 6605 | 5871 – 6725 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 6592 | 6299 – 6858 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 5035 | 4946 – 5560 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3984 | 3435 – 4597 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 3977 | 2882 – 5209 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 3817 | 3461 – 4442 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2961 | 2788 – 2972 | 3 | 6 | too few sandboxes |
| 9 | boat | 2693 | 1787 – 3243 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1602 | 1583 – 1830 | 3 | 6 | too few sandboxes |
| 11 | tama | 1188 | 1145 – 1266 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 838 | 784.5 – 1137 | 3 | 6 | too few sandboxes |
| 13 | E2B | 598.5 | 596.5 – 600 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~2.5× Novita on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, O_DIRECT (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 17290 | 6944 – 21260 | 3 | 6 | — |
| 2 | Novita | 6927 | 6158 – 7054 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 6913 | 6606 – 7192 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 5281 | 5188 – 5832 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 4179 | 3603 – 4822 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 4172 | 3023 – 5464 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 4005 | 3630 – 4659 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 3106 | 2926 – 3118 | 3 | 6 | too few sandboxes |
| 9 | boat | 2824 | 1875 – 3401 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1681 | 1661 – 1921 | 3 | 6 | too few sandboxes |
| 11 | tama | 1247 | 1202 – 1329 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 880.3 | 823.7 – 1194 | 3 | 6 | too few sandboxes |
| 13 | E2B | 629.7 | 627 – 630.7 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.45 | 24.23 – 25.12 | 3 | 6 | — |
| 2 | Blaxel | 20.07 | 19.9 – 20.51 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 15.89 | 14.11 – 16.32 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 14.25 | 14.23 – 14.3 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.15 | 12.07 – 12.32 | 3 | 6 | too few sandboxes |
| 6 | boat | 11.87 | 10.25 – 12.13 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 10.76 | 9.74 – 10.94 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 8.475 | 8.37 – 8.51 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 8.055 | 8.02 – 28.66 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 7.625 | 7.56 – 7.705 | 3 | 6 | too few sandboxes |
| 11 | tama | 7.46 | 6.88 – 7.6 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 4.94 | 4.74 – 4.99 | 3 | 6 | too few sandboxes |
| 13 | E2B | 1.715 | 1.33 – 1.73 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_tama leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 224200 | 156900 – 347100 | 3 | 6 | — |
| 2 | Daytona (VM) | 176700 | 145300 – 182500 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 107600 | 79170 – 150600 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 97790 | 76000 – 103800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57040 | 57020 – 99313 | 3 | 6 | too few sandboxes |
| 6 | Novita | 54230 | 53730 – 88780 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 48220 | 40810 – 83050 | 3 | 6 | too few sandboxes |
| 8 | E2B | 46590 | 46160 – 50850 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 45340 | 43840 – 46760 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 44960 | 43090 – 45000 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 39140 | 37645 – 40890 | 3 | 6 | too few sandboxes |
| 12 | boat | 32870 | 32310 – 33190 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 32710 | 30270 – 33340 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_tama leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 201500 | 183200 – 358500 | 3 | 6 | — |
| 2 | Daytona (VM) | 176000 | 146700 – 182000 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 106400 | 78680 – 150900 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 97170 | 78870 – 103300 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 56980 | 56970 – 99020 | 3 | 6 | too few sandboxes |
| 6 | Novita | 54010 | 53690 – 88990 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 48370 | 40950 – 82910 | 3 | 6 | too few sandboxes |
| 8 | E2B | 46807 | 45841 – 50920 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 44900 | 43120 – 44970 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 44570 | 44290 – 45720 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 38450 | 36550 – 40640 | 3 | 6 | too few sandboxes |
| 12 | boat | 32820 | 32330 – 33210 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 32740 | 30210 – 33260 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.1× tama on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 200100 | 162000 – 211400 | 3 | 6 | — |
| 2 | tama | 178133 | 154100 – 361800 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 107500 | 94490 – 167900 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 99130 | 99000 – 116800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 87710 | 87690 – 136900 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 78030 | 67672 – 80660 | 3 | 6 | too few sandboxes |
| 7 | E2B | 74280 | 68110 – 76160 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 61670 | 58810 – 61980 | 3 | 6 | too few sandboxes |
| 9 | Novita | 58480 | 58380 – 106000 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 43160 | 40590 – 44590 | 3 | 6 | too few sandboxes |
| 11 | boat | 42900 | 42860 – 43430 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 42052 | 39530 – 47680 | 3 | 6 | too few sandboxes |
| 13 | Vercel Sandbox | 39860 | 39130 – 42570 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_tama leads · ~1.2× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 201700 | 133900 – 295100 | 3 | 6 | — |
| 2 | Daytona (VM) | 166700 | 139300 – 173300 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 106700 | 74250 – 144300 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 85910 | 74300 – 94750 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52730 | 52680 – 90341 | 3 | 6 | too few sandboxes |
| 6 | Novita | 51760 | 51410 – 87020 | 3 | 6 | too few sandboxes |
| 7 | E2B | 43990 | 42810 – 44720 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 41410 | 38300 – 82080 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 41020 | 40550 – 41950 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 40530 | 38820 – 40580 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 36570 | 33430 – 37530 | 3 | 6 | too few sandboxes |
| 12 | boat | 29850 | 29490 – 30120 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 29760 | 27290 – 30340 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 13 environments ranked best-first, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 8878 | 6984 – 9771 | 3 | 6 | — |
| 2 | Daytona (VM) | 6717 | 6663 – 10080 | 3 | 6 | too few sandboxes |
| 3 | Novita | 5608 | 2989 – 6028 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 5131 | 892 – 5201 | 3 | 6 | too few sandboxes |
| 5 | tama | 4617 | 4552 – 4682 | 2 | 4 | too few sandboxes |
| 6 | Modal (gVisor) | 1942 | 1782 – 2102 | 2 | 4 | too few sandboxes |
| 7 | Runloop | 1686 | 1193 – 1923 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 1464 | 1370 – 2142 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 1433 | 1282 – 1629 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1292 | 1131 – 2160 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 994.2 | 599.8 – 1539 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 933 | 926.1 – 936.9 | 3 | 6 | too few sandboxes |
| 13 | boat | 880.9 | 869 – 920.6 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads · ~1.7× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9247 | 1809 – 10940 | 3 | 6 | — |
| 2 | Vercel Sandbox | 5515 | 5491 – 5565 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 4728 | 4333 – 5093 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 4711 | 3883 – 5405 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 4341 | 2944 – 4899 | 3 | 6 | too few sandboxes |
| 6 | Novita | 3845 | 2140 – 4670 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 2035 | 1564 – 2261 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 1799 | 1651 – 5473 | 3 | 6 | too few sandboxes |
| 9 | tama | 1722 | 565.7 – 2878 | 2 | 4 | too few sandboxes |
| 10 | Modal (gVisor) | 1553 | 82.41 – 3024 | 2 | 4 | too few sandboxes |
| 11 | E2B | 1440 | 1141 – 2050 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 934.3 | 934.3 – 934.5 | 3 | 6 | too few sandboxes |
| 13 | boat | 428.9 | 428.3 – 917.4 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156485 | 155900 – 157426 | 3 | 6 | — |
| 2 | Blaxel | 119100 | 99741 – 149500 | 3 | 6 | too few sandboxes |
| 3 | boat | 89395 | 81860 – 113900 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 83998 | 80175 – 93652 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 79715 | 79410 – 84357 | 3 | 6 | too few sandboxes |
| 6 | tama | 63230 | 62840 – 63627 | 2 | 4 | too few sandboxes |
| 7 | Vercel Sandbox | 63137 | 41660 – 67136 | 3 | 6 | too few sandboxes |
| 8 | E2B | 52200 | 48920 – 62548 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 39610 | 35590 – 40810 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 35888 | 31352 – 36970 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 35100 | 34700 – 43520 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 33050 | 32296 – 33801 | 2 | 4 | too few sandboxes |
| 13 | Modal (VM) | 22900 | 15663 – 75007 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 148679 | 98850 – 165900 | 3 | 6 | — |
| 2 | Novita | 147300 | 145200 – 157300 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 100335 | 85961 – 102100 | 3 | 6 | too few sandboxes |
| 4 | boat | 81890 | 79406 – 110100 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 70550 | 54753 – 95470 | 3 | 6 | too few sandboxes |
| 6 | E2B | 51470 | 47784 – 55632 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 49387 | 37769 – 54000 | 3 | 6 | too few sandboxes |
| 8 | tama | 43210 | 42960 – 43460 | 2 | 4 | too few sandboxes |
| 9 | run.cloud | 41370 | 38627 – 49225 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 40460 | 32234 – 40810 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 36500 | 32300 – 38133 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 27659 | 27083 – 28235 | 2 | 4 | too few sandboxes |
| 13 | Modal (VM) | 23600 | 20253 – 40693 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, boat, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop, tama and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | boat | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | tama | 9999 | 9999 – 9999 | 2 | 4 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 13 | Modal (gVisor) | 499.5 | 486 – 513 | 2 | 4 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 34.92 | 34.38 – 35 | 3 | 6 | — |
| 2 | Daytona (VM) | 36.16 | 35.76 – 39.52 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 37.58 | 33.59 – 53.7 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 40.06 | 39.97 – 40.21 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 41.38 | 41.26 – 41.88 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 41.88 | 41.86 – 41.95 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 41.97 | 35.65 – 42.85 | 3 | 6 | too few sandboxes |
| 8 | Novita | 45.04 | 43.59 – 45.31 | 3 | 6 | too few sandboxes |
| 9 | tama | 50.69 | 50.24 – 68.85 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 62.84 | 62.25 – 85.34 | 3 | 6 | too few sandboxes |
| 11 | E2B | 66.62 | 64.6 – 66.95 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 81.61 | 79.79 – 83.44 | 1 | 2 | too few sandboxes |
| 13 | Runloop | 95.96 | 95.34 – 96.06 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_tama leads · ~1.1× boat on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 436800 | 413600 – 589400 | 3 | 6 | — |
| 2 | boat | 386100 | 358800 – 393900 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 334300 | 330700 – 349500 | 3 | 6 | too few sandboxes |
| 4 | Novita | 296500 | 235500 – 302500 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 280600 | 280000 – 282200 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 244400 | 232300 – 249600 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 227300 | 208700 – 228700 | 3 | 6 | too few sandboxes |
| 8 | E2B | 226100 | 203600 – 268400 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 195500 | 193700 – 237400 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 178300 | 178200 – 193600 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 128000 | 122700 – 158300 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 103600 | 103500 – 105000 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 78760 | 12970 – 110400 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_tama leads · boat is ~1.1× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.1155 | 0.0845 – 0.121 | 3 | 6 | — |
| 2 | boat | 0.13 | 0.127 – 0.1395 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 0.1495 | 0.1435 – 0.152 | 3 | 6 | too few sandboxes |
| 4 | Novita | 0.1685 | 0.165 – 0.2125 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 0.1785 | 0.177 – 0.1785 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 0.2045 | 0.2005 – 0.215 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 0.22 | 0.22 – 0.2395 | 3 | 6 | too few sandboxes |
| 8 | E2B | 0.221 | 0.1875 – 0.2455 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 0.256 | 0.2105 – 0.258 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 0.2805 | 0.2585 – 0.2815 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 0.3905 | 0.316 – 0.4075 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 0.4845 | 0.4765 – 0.485 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 0.635 | 0.4535 – 3.858 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads · ~1.1× boat on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 26990 | 20760 – 28530 | 3 | 6 | — |
| 2 | boat | 24110 | 21250 – 27710 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 23240 | 22640 – 23400 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 16710 | 14830 – 21040 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 16220 | 14280 – 17050 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 15870 | 15370 – 15870 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 15430 | 15180 – 20310 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 15210 | 15210 – 15770 | 3 | 6 | too few sandboxes |
| 9 | tama | 13820 | 13420 – 14140 | 3 | 6 | too few sandboxes |
| 10 | E2B | 13090 | 11710 – 13980 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 12570 | 12250 – 16820 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 8344 | 1931 – 11910 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 8328 | 8147 – 8612 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads · boat is ~1.1× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 1.854 | 1.752 – 2.41 | 3 | 6 | — |
| 2 | boat | 2.075 | 1.805 – 2.353 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.152 | 2.142 – 2.21 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 3.066 | 2.386 – 3.402 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 3.092 | 2.934 – 3.501 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 3.17 | 3.16 – 3.265 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 3.242 | 2.462 – 3.294 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 3.287 | 3.172 – 3.287 | 3 | 6 | too few sandboxes |
| 9 | tama | 3.733 | 3.536 – 3.784 | 3 | 6 | too few sandboxes |
| 10 | E2B | 3.821 | 3.579 – 4.274 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 3.979 | 2.974 – 4.091 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 5.994 | 4.205 – 25.91 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 6.005 | 5.806 – 6.142 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 373.5 | 364.5 – 375 | 3 | 6 | — |
| 2 | Daytona (VM) | 409 | 404.5 – 413.5 | 3 | 6 | too few sandboxes |
| 3 | boat | 417.5 | 405 – 419 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 451 | 451 – 453 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 458.5 | 449.5 – 460 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 477.5 | 476 – 478 | 3 | 6 | too few sandboxes |
| 7 | Novita | 480.5 | 479.5 – 481.5 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 493.5 | 487.5 – 502.5 | 3 | 6 | too few sandboxes |
| 9 | tama | 534 | 510.5 – 536 | 3 | 6 | too few sandboxes |
| 10 | E2B | 634.5 | 552.5 – 807.5 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 770 | 762 – 1207 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 901 | 897 – 905 | 1 | 2 | too few sandboxes |
| 13 | Runloop | 1202 | 1201 – 1204 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.82 | 30.77 – 32.47 | 3 | 6 | — |
| 2 | Namespace | 34.7 | 34.47 – 87.27 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 35.78 | 35.68 – 36.44 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 38.19 | 37.29 – 39.78 | 3 | 6 | too few sandboxes |
| 5 | Novita | 40.54 | 40 – 41.06 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 47.7 | 47.2 – 47.72 | 3 | 6 | too few sandboxes |
| 7 | boat | 48.05 | 47.48 – 55.13 | 3 | 6 | too few sandboxes |
| 8 | tama | 57.34 | 57.02 – 181.6 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 67.11 | 66.18 – 88.03 | 3 | 6 | too few sandboxes |
| 10 | E2B | 71.4 | 64.25 – 77.78 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 76.63 | 59.44 – 81.15 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 94.18 | 88.92 – 94.75 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 450 | 437.7 – 462.4 | 1 | 2 | too few sandboxes |

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

36 uncovered results across 4 providers (E2B 2, Modal (gVisor) 8, Modal (VM) 2, tama 24). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | cpu-node | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (gVisor) | cpu-node | **failed** | Partial publication withheld unverified measurements: node_web_tooling_runs_per_s |
| Modal (gVisor) | network | **failed** | computesdk exec failed: Modal control operation exceeded 5000ms |
| Modal (gVisor) | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| Modal (gVisor) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Channel has been shut down |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Modal (gVisor) | system | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (gVisor) | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| Modal (VM) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Channel has been shut down |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| tama | network | **failed** | Failed to create sandbox: tama new bench-7c080ec3-c7c9-447d-862c-b5bd3620f9fd --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7c080ec3-c7c9-447d-862c-b5bd3620f9fd failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-27569028-1a38-46f9-b36c-549b24692577 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-27569028-1a38-46f9-b36c-549b24692577 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-6bc7cabf-3777-4327-b065-0dffd618d134 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6bc7cabf-3777-4327-b065-0dffd618d134 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-2aa81f6a-2df9-4762-bdeb-bf9a21938d7c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2aa81f6a-2df9-4762-bdeb-bf9a21938d7c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f3a9f147-374c-4af5-b645-62d10d7f085f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f3a9f147-374c-4af5-b645-62d10d7f085f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-b877cf39-0970-4eb3-9575-c2c5ec975f79 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b877cf39-0970-4eb3-9575-c2c5ec975f79 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-df1c5e5c-8f6d-46a5-b834-9df476585564 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-df1c5e5c-8f6d-46a5-b834-9df476585564 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-116e522d-ff95-414b-9d2f-c1627adb06f6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-116e522d-ff95-414b-9d2f-c1627adb06f6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-570baaf0-76ca-4f34-b78b-efd484412750 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-570baaf0-76ca-4f34-b78b-efd484412750 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-707fc315-f423-4c7a-a04c-633477b1de5a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-707fc315-f423-4c7a-a04c-633477b1de5a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-da57ec1f-67e5-403f-8ba3-b1e466a32e04 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-da57ec1f-67e5-403f-8ba3-b1e466a32e04 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-1ea57b41-edba-4f5b-ad14-8d5735a07de7 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1ea57b41-edba-4f5b-ad14-8d5735a07de7 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-6861eb6b-3fe3-42eb-8f16-575c363f5bed --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6861eb6b-3fe3-42eb-8f16-575c363f5bed failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-c0ac6ac4-2528-488c-a8f0-fe19555adec0 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c0ac6ac4-2528-488c-a8f0-fe19555adec0 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-1ab1e03f-f9a3-4490-852c-a11f565fb4be --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1ab1e03f-f9a3-4490-852c-a11f565fb4be failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e3b62363-3636-4504-9d28-14a52f315354 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e3b62363-3636-4504-9d28-14a52f315354 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-2b54d6b9-c2f0-4fbb-835e-321fe10557bc --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2b54d6b9-c2f0-4fbb-835e-321fe10557bc failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f4310d55-9df4-49b5-b31d-b4c4ee5d319e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f4310d55-9df4-49b5-b31d-b4c4ee5d319e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-89e60cda-2d9e-421c-af26-60541f2a8eb8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-89e60cda-2d9e-421c-af26-60541f2a8eb8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-2cb1e1cc-f0bc-4056-93f6-c4d78da16b28 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-2cb1e1cc-f0bc-4056-93f6-c4d78da16b28 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-a4c5c528-2ee6-4b6e-9e7b-ecb7634c0062 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a4c5c528-2ee6-4b6e-9e7b-ecb7634c0062 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |

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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 2 v 2 sandboxes floors at p ≈ 0.33; 2 v 3 sandboxes floors at p ≈ 0.20; 2 v 3 sandboxes floors at p ≈ 0.40; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 2 sandboxes floors at p ≈ 0.10; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 2 sandboxes floors at p ≈ 1.0; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.30; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Daytona (VM) | 0.71 (tied) | 0.43 |
| realworld | Mastra: cold install | Namespace | 0.41 (tied) | 0.43 |
| realworld | Mastra: cold install | boat | 0.0018 | <0.001 |
| realworld | Mastra: cold install | Novita | 0.67 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.0036 | 0.0046 |
| realworld | Mastra: cold install | Modal (VM) | 0.29 (tied) | 0.10 |
| realworld | Mastra: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.26 (tied) | 0.083 |
| realworld | Mastra: cold install | E2B | 0.53 (tied) | 0.26 |
| realworld | Mastra: cold install | tama | 0.010 | 0.0046 |
| realworld | Mastra: cold install | Runloop | 0.38 (tied) | 0.43 |
| realworld | Mastra: cold install | run.cloud | 0.0083 | <0.001 |
| realworld | Better-Auth: build | boat | — | — |
| realworld | Better-Auth: build | Daytona (VM) | 0.24 (tied) | 0.066 |
| realworld | Better-Auth: build | Namespace | 0.028 | 0.019 |
| realworld | Better-Auth: build | tama | 0.042 | 0.032 |
| realworld | Better-Auth: build | Novita | 0.86 (tied) | 0.55 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.63 (tied) | 0.066 |
| realworld | Better-Auth: build | Blaxel | 0.93 (tied) | 0.19 |
| realworld | Better-Auth: build | Modal (VM) | 0.0056 | 0.019 |
| realworld | Better-Auth: build | run.cloud | 0.020 | 0.0046 |
| realworld | Better-Auth: build | E2B | 0.0029 | 0.0046 |
| realworld | Better-Auth: build | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.98 (tied) | 0.99 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: cold install | boat | 0.13 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Novita | 1.0 (tied) | 0.43 |
| realworld | Better-Auth: cold install | tama | 0.0022 | 0.0042 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.21 (tied) | 0.077 |
| realworld | Better-Auth: cold install | E2B | 0.71 (tied) | 0.79 |
| realworld | Better-Auth: cold install | run.cloud | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.55 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Runloop | 0.045 | 0.066 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.089 (tied) | 0.0046 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.043 | 0.019 |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.32 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.51 (tied) | 0.19 |
| realworld | Better-Auth: git clone | tama | 0.95 (tied) | 0.32 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.77 (tied) | 0.55 |
| realworld | Better-Auth: git clone | E2B | 0.41 (tied) | 0.79 |
| realworld | Better-Auth: git clone | boat | 0.37 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.62 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Novita | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Runloop | 0.012 | 0.0046 |
| realworld | Better-Auth: git clone | run.cloud | 0.59 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.0045 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | 0.017 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.48 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.60 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.086 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | tama | 0.030 | 0.077 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.0023 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | 0.0014 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.0014 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.0068 | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.51 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.033 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.033 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.13 (tied) | 0.32 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.078 (tied) | 0.16 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.76 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.045 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: lint format | boat | — | — |
| realworld | Better-Auth: lint format | Namespace | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.13 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Blaxel | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | run.cloud | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: lint format | tama | 0.13 (tied) | 0.16 |
| realworld | Better-Auth: lint format | E2B | 0.45 (tied) | 0.32 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.18 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.98 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Runloop | 0.010 | 0.0046 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | tama | 1.0 (tied) | 0.32 |
| realworld | Better-Auth: lint packages | boat | 0.84 (tied) | 0.32 |
| realworld | Better-Auth: lint packages | Novita | 0.040 | 0.0046 |
| realworld | Better-Auth: lint packages | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.19 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | run.cloud | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | E2B | 0.020 | 0.019 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | 0.80 (tied) | 0.99 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Namespace | 0.033 | 0.0046 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.014 | <0.001 |
| realworld | Better-Auth: lint spell | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | tama | 0.86 (tied) | 0.98 |
| realworld | Better-Auth: lint spell | E2B | 0.0044 | 0.012 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.26 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | Runloop | 0.0083 | <0.001 |
| realworld | Better-Auth: lint types | tama | — | — |
| realworld | Better-Auth: lint types | boat | 0.17 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.63 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.27 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Blaxel | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | run.cloud | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.67 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Namespace | 0.0083 | 0.066 |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | 0.0036 | 0.019 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.63 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.62 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | tama | 0.84 (tied) | 0.98 |
| realworld | Better-Auth: typecheck | run.cloud | 0.0022 | 0.0042 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.0068 | 0.019 |
| realworld | Better-Auth: typecheck | E2B | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.38 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Namespace | 0.010 | 0.019 |
| realworld | Mastra: build:core | Daytona (VM) | 0.80 (tied) | 0.19 |
| realworld | Mastra: build:core | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | 0.48 (tied) | 0.43 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.0056 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.61 (tied) | 0.55 |
| realworld | Mastra: build:core | tama | <0.001 | 0.0059 |
| realworld | Mastra: build:core | run.cloud | 0.0056 | 0.0046 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.26 (tied) | 0.26 |
| realworld | Mastra: build:core | E2B | 0.74 (tied) | 0.58 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Blaxel | 0.54 (tied) | 0.066 |
| realworld | Mastra: git clone | Modal (VM) | 0.0045 | 0.0012 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.037 | 0.0076 |
| realworld | Mastra: git clone | boat | 0.075 (tied) | 0.0046 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.54 (tied) | 0.066 |
| realworld | Mastra: git clone | run.cloud | 0.13 (tied) | 0.066 |
| realworld | Mastra: git clone | Daytona (VM) | 0.20 (tied) | 0.19 |
| realworld | Mastra: git clone | Novita | 0.93 (tied) | 0.43 |
| realworld | Mastra: git clone | tama | 0.93 (tied) | 0.43 |
| realworld | Mastra: git clone | E2B | 0.18 (tied) | 0.19 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.61 (tied) | 0.52 |
| realworld | Mastra: git clone | Runloop | 0.0013 | 0.0017 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Namespace | 0.014 | 0.0046 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.068 (tied) | 0.019 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.71 (tied) | 0.43 |
| realworld | Mastra: lint:format | Modal (VM) | 0.0017 | 0.0098 |
| realworld | Mastra: lint:format | tama | 0.41 (tied) | 0.35 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.98 (tied) | 0.19 |
| realworld | Mastra: lint:format | run.cloud | 0.24 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.0045 | 0.0017 |
| realworld | Mastra: lint:format | E2B | 1.0 (tied) | 0.79 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | boat | — | — |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Namespace | 0.20 (tied) | 0.066 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.29 (tied) | 0.19 |
| realworld | Mastra: test:core | Blaxel | 0.93 (tied) | 0.19 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | tama | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (VM) | 0.74 (tied) | 0.35 |
| realworld | Mastra: test:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: test:core | Vercel Sandbox | 0.0068 | 0.066 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.019 | 0.0012 |
| realworld | Mastra: test:core | E2B | 0.75 (tied) | 0.37 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Blaxel | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.48 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | boat | 0.51 (tied) | 0.43 |
| realworld | OpenClaw: cold install | E2B | 0.078 (tied) | 0.0046 |
| realworld | OpenClaw: cold install | run.cloud | 0.98 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.052 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Runloop | 0.98 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | 0.50 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Novita | 1.0 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.67 (tied) | 0.43 |
| realworld | OpenClaw: git clone | E2B | 0.045 | 0.066 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.089 (tied) | 0.019 |
| realworld | OpenClaw: git clone | boat | 0.92 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Runloop | 0.47 (tied) | 0.19 |
| realworld | OpenClaw: git clone | run.cloud | 0.0056 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.93 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | Namespace | 0.93 (tied) | 0.99 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.060 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.10 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.028 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.0029 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.41 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.16 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Runloop | <0.001 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.89 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.028 | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.10 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.67 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.028 | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | 0.0036 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.20 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.27 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.44 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.033 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.060 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.028 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 1.0 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.012 | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.35 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.024 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.039 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.27 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.014 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.14 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | 0.0046 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Daytona (VM) | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.69 (tied) | 0.11 |
| cpu | Node.js web tooling | Namespace | 0.69 (tied) | 0.68 |
| cpu | Node.js web tooling | Novita | 0.15 (tied) | 0.0069 |
| cpu | Node.js web tooling | Blaxel | 1.0 (tied) | 0.97 |
| cpu | Node.js web tooling | tama | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.55 (tied) | 0.31 |
| cpu | Node.js web tooling | run.cloud | 0.31 (tied) | 0.031 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.73 (tied) | 0.74 |
| cpu | Node.js web tooling | E2B | 1.0 (tied) | 0.38 |
| cpu | Node.js web tooling | Runloop | 0.0079 | <0.001 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | boat | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | boat | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | boat | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | boat | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.80 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | tama | 0.60 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | tama | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | boat | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | boat | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.70 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.20 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | tama | 0.20 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | tama | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (VM) | 0.20 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Novita | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Runloop | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Namespace | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | tama | — | — |
| memory | STREAM Add | Daytona (VM) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Modal (VM) | 0.20 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Novita | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Runloop | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Namespace | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | E2B | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | boat | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | tama | — | — |
| memory | STREAM Scale | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Modal (VM) | 0.20 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Novita | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | run.cloud | 0.20 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Runloop | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Namespace | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | tama | 0.80 (too few sandboxes) | 0.14 |
| network | iperf3 WAN download | Modal (gVisor) | 0.33 (too few sandboxes) | 0.011 |
| network | iperf3 WAN download | Runloop | 0.40 (too few sandboxes) | 0.25 |
| network | iperf3 WAN download | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | boat | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.10 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Novita | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | tama | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 WAN upload | Modal (gVisor) | 1.0 (too few sandboxes) | 0.53 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.44 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | boat | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 1.0 (too few sandboxes) | 0.89 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.20 (too few sandboxes) | 0.066 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Novita | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | boat | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.20 (too few sandboxes) | 0.030 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | boat | 1.0 (too few sandboxes, equal medians) | 1.0 |
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
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0047 |
| system | Git common operations | boat | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | 1.0 (too few sandboxes) | 0.32 |
| system | Git common operations | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.50 (too few sandboxes) | 0.033 |
| system | Git common operations | Runloop | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | tama | — | — |
| system | pgbench RO (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | tama | — | — |
| system | pgbench RO latency (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.60 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | tama | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.40 (too few sandboxes) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.60 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| system | PyBench | Runloop | 0.50 (too few sandboxes) | 0.033 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | boat | 0.40 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | tama | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.50 (too few sandboxes) | 0.033 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

