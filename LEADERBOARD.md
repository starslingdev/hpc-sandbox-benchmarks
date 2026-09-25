# Sandbox provider leaderboard

Run [`36104006010`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/36104006010) · commit [`7526f211b3a860af4e8a997e5b274fd41dd8c803`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/7526f211b3a860af4e8a997e5b274fd41dd8c803) ·
dataset [`data/dataset/runs/36104006010.json`](data/dataset/runs/36104006010.json) · generated 2026-09-25T12:18:33.976Z

**Partial results — incomplete experiment.** 676 of 728 planned cells complete; 52 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:2bdef43fa245adc28ffdd1bc4992db0497a944227ad0607465f1740d8460a69d`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **587 metric records**
backed by **5009 retained trial observations**, across **48 metrics** and
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
| tama | container (shared kernel) | mixed: oci-container (container, strong), oci-container (container, strong) on amazon-nitro |
| Vercel Sandbox | Firecracker microVM | firecracker (microVM, confirmed) |

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** tama's observed compute did not match the requested CPU/RAM target; its observed allocation was **64 vCPU · 1512 GiB RAM · 48.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

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
| 1 | Namespace | 36.31 | 35.66 – 37.49 | 12 | 12 | — |
| 2 | Blaxel | 38.89 | 38.3 – 39.96 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 44.62 | 42.54 – 47.75 | 12 | 12 | — |
| 3 | boat | 44.88 | 43.39 – 46.37 | 12 | 12 | tied |
| 3 | Modal (VM) | 45 | 42.67 – 50.39 | 12 | 12 | tied |
| 3 | Novita | 51 | 45.07 – 57.11 | 12 | 12 | tied |
| 3 | Daytona (VM) | 52.13 | 45.97 – 61.08 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 60.05 | 57.86 – 63.01 | 12 | 12 | — |
| 9 | E2B | 73.93 | 72.26 – 78.37 | 12 | 12 | — |
| 9 | Modal (gVisor) | 81.11 | 64.7 – 83.65 | 12 | 12 | tied |
| 11 | Runloop | 114.3 | 112.6 – 117.2 | 12 | 12 | — |
| 11 | run.cloud | 131.5 | 108.6 – 142.8 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 47.26 | 46.4 – 49.41 | 12 | 12 | — |
| 2 | Daytona (VM) | 54.01 | 51.53 – 55.16 | 12 | 12 | — |
| 2 | Namespace | 54.84 | 52.89 – 58.54 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 59.74 | 58.65 – 62.65 | 12 | 12 | — |
| 5 | Modal (VM) | 64.04 | 62.25 – 68.35 | 12 | 12 | — |
| 5 | Blaxel | 64.13 | 61.2 – 65.83 | 12 | 12 | tied |
| 5 | Novita | 66.19 | 64.38 – 66.99 | 12 | 12 | tied |
| 8 | run.cloud | 88.63 | 81.21 – 93.38 | 12 | 12 | — |
| 9 | Vercel Sandbox | 96.69 | 94.03 – 129.7 | 12 | 12 | — |
| 9 | Modal (gVisor) | 97.47 | 84.36 – 113 | 12 | 12 | tied |
| 9 | E2B | 103.5 | 96.88 – 110.5 | 12 | 12 | tied |
| 12 | Runloop | 166.6 | 163.3 – 169 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.946 | 9.616 – 10.56 | 12 | 12 | — |
| 2 | Daytona (VM) | 10.72 | 10.54 – 11.26 | 12 | 12 | — |
| 3 | Blaxel | 12.13 | 11.69 – 12.46 | 12 | 12 | — |
| 4 | Novita | 12.81 | 12.59 – 13.14 | 12 | 12 | — |
| 5 | boat | 13.33 | 12.87 – 14.05 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 13.63 | 13.14 – 14.64 | 12 | 12 | tied |
| 5 | Modal (VM) | 14.03 | 13.79 – 17.91 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 20.31 | 19.33 – 25.52 | 12 | 12 | — |
| 8 | E2B | 20.7 | 19.9 – 24.3 | 12 | 12 | tied |
| 8 | run.cloud | 20.8 | 18.04 – 28.98 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 24.78 | 21.89 – 29.63 | 12 | 12 | tied |
| 8 | Runloop | 25.14 | 24.27 – 26.62 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.6575 | 0.6405 – 0.686 | 12 | 12 | — |
| 2 | Blaxel | 0.733 | 0.71 – 0.7535 | 12 | 12 | — |
| 3 | Modal (VM) | 0.9335 | 0.8415 – 1.557 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.9625 | 0.924 – 1.093 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 1.138 | 1.093 – 1.2 | 12 | 12 | — |
| 5 | Modal (gVisor) | 1.294 | 1.122 – 1.76 | 12 | 12 | tied |
| 5 | Daytona (VM) | 1.473 | 1.382 – 1.739 | 12 | 12 | tied |
| 5 | E2B | 1.546 | 1.49 – 1.744 | 12 | 12 | tied |
| 9 | boat | 1.772 | 1.748 – 2.164 | 12 | 12 | — |
| 9 | Novita | 2.043 | 1.964 – 2.135 | 12 | 12 | tied |
| 11 | run.cloud | 2.692 | 2.052 – 3.311 | 12 | 12 | — |
| 12 | Runloop | 5.011 | 3.856 – 8.63 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.309 | 2.29 – 2.481 | 12 | 12 | — |
| 2 | Namespace | 2.644 | 2.572 – 2.697 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.803 | 2.752 – 2.883 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.102 | 2.962 – 3.216 | 12 | 12 | — |
| 4 | Novita | 3.211 | 3.141 – 3.274 | 12 | 12 | tied |
| 4 | Blaxel | 3.218 | 3.143 – 3.255 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.313 | 3.144 – 3.575 | 12 | 12 | tied |
| 8 | run.cloud | 4.145 | 3.761 – 4.723 | 12 | 12 | — |
| 9 | Vercel Sandbox | 4.476 | 4.328 – 5.795 | 12 | 12 | — |
| 9 | E2B | 5.194 | 4.923 – 5.29 | 12 | 12 | tied |
| 11 | Runloop | 7.958 | 7.587 – 8.117 | 12 | 12 | — |
| 11 | Modal (gVisor) | 8.253 | 7.771 – 10.69 | 12 | 12 | tied |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 7.57 | 7.382 – 7.727 | 12 | 12 | — |
| 2 | Daytona (VM) | 9.282 | 9.174 – 9.513 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 9.71 | 9.543 – 10.23 | 12 | 12 | — |
| 4 | Blaxel | 10.35 | 10.17 – 10.71 | 12 | 12 | — |
| 4 | Namespace | 10.47 | 10.01 – 10.82 | 12 | 12 | tied |
| 6 | Novita | 10.91 | 10.73 – 11.16 | 12 | 12 | — |
| 7 | Modal (VM) | 11.22 | 11.13 – 12.29 | 12 | 12 | — |
| 8 | run.cloud | 14.21 | 13.15 – 14.52 | 12 | 12 | — |
| 9 | Vercel Sandbox | 15.66 | 15.31 – 21.16 | 12 | 12 | — |
| 10 | Modal (gVisor) | 17.49 | 16.8 – 23.41 | 12 | 12 | — |
| 10 | E2B | 20.02 | 18.22 – 20.38 | 12 | 12 | tied |
| 12 | Runloop | 22.85 | 22.43 – 23.46 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_boat leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.188 | 2.125 – 2.229 | 12 | 12 | — |
| 2 | Namespace | 2.41 | 2.353 – 2.562 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.498 | 2.44 – 2.554 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 2.7 | 2.64 – 2.755 | 12 | 12 | — |
| 4 | Blaxel | 2.907 | 2.806 – 2.997 | 12 | 12 | tied |
| 4 | Novita | 2.955 | 2.829 – 3.034 | 12 | 12 | tied |
| 4 | Modal (VM) | 3.023 | 2.909 – 3.269 | 12 | 12 | tied |
| 8 | run.cloud | 3.5 | 3.301 – 3.804 | 12 | 12 | — |
| 9 | Vercel Sandbox | 4.62 | 4.588 – 5.974 | 12 | 12 | — |
| 9 | Modal (gVisor) | 4.677 | 4.237 – 5.687 | 12 | 12 | tied |
| 9 | E2B | 5.319 | 4.648 – 5.925 | 12 | 12 | tied |
| 12 | Runloop | 6.938 | 6.633 – 6.983 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_boat, Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 2.341 | 2.298 – 2.585 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.377 | 2.314 – 2.471 | 12 | 12 | tied |
| 1 | Namespace | 2.385 | 2.264 – 2.558 | 12 | 12 | tied |
| 4 | Novita | 2.583 | 2.558 – 2.655 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 2.605 | 2.542 – 2.739 | 12 | 12 | tied |
| 4 | Blaxel | 2.669 | 2.555 – 2.716 | 12 | 12 | tied |
| 7 | Modal (VM) | 2.889 | 2.692 – 3.066 | 12 | 12 | — |
| 8 | run.cloud | 3.578 | 3.447 – 3.721 | 12 | 12 | — |
| 9 | Vercel Sandbox | 3.893 | 3.784 – 4.93 | 12 | 12 | — |
| 9 | E2B | 4.301 | 4.104 – 4.436 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 6.457 | 4.671 – 6.929 | 12 | 12 | — |
| 12 | Runloop | 8.287 | 8.093 – 8.559 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 5.244 | 5.188 – 5.492 | 12 | 12 | — |
| 2 | Namespace | 6.197 | 5.987 – 6.434 | 12 | 12 | — |
| 2 | Daytona (VM) | 6.309 | 6.093 – 6.486 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 6.754 | 6.562 – 7.245 | 12 | 12 | — |
| 4 | Blaxel | 7.144 | 7.091 – 7.604 | 12 | 12 | tied |
| 6 | Modal (VM) | 7.351 | 7.263 – 8.031 | 12 | 12 | — |
| 6 | Novita | 7.524 | 7.33 – 7.675 | 12 | 12 | tied |
| 8 | run.cloud | 10.76 | 9.89 – 12.2 | 12 | 12 | — |
| 8 | Modal (gVisor) | 11.19 | 10.88 – 14.19 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 12.02 | 11.75 – 16.02 | 12 | 12 | tied |
| 8 | E2B | 13.6 | 12.94 – 15.43 | 12 | 12 | tied |
| 12 | Runloop | 19.25 | 18.66 – 20.27 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_boat and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 23.76 | 23.27 – 24.27 | 12 | 12 | — |
| 1 | Daytona (VM) | 24.81 | 23.53 – 25.57 | 12 | 12 | tied |
| 3 | Modal (VM) | 27.96 | 27.21 – 32.09 | 12 | 12 | — |
| 3 | Blaxel | 29.03 | 28.81 – 29.57 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 30.77 | 30.42 – 31.08 | 12 | 12 | — |
| 5 | Namespace | 31.04 | 30.27 – 34.28 | 12 | 12 | tied |
| 5 | Novita | 31.1 | 28.95 – 31.93 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 45.44 | 44.66 – 63.15 | 12 | 12 | — |
| 8 | run.cloud | 52.67 | 49.84 – 53.97 | 12 | 12 | tied |
| 8 | E2B | 53.17 | 48.81 – 56.77 | 12 | 12 | tied |
| 11 | Modal (gVisor) | 76.58 | 51.48 – 90.75 | 12 | 12 | — |
| 12 | Runloop | 104.3 | 101.7 – 108.2 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 29.37 | 28.87 – 30.52 | 12 | 12 | — |
| 2 | Daytona (VM) | 37.01 | 35.98 – 40.52 | 12 | 12 | — |
| 2 | Namespace | 39.53 | 37.3 – 48.89 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 40.81 | 39.44 – 43.03 | 12 | 12 | tied |
| 2 | Novita | 43.6 | 40.97 – 45.54 | 12 | 12 | tied |
| 2 | Modal (VM) | 44.34 | 43.62 – 48.1 | 12 | 12 | tied |
| 2 | Blaxel | 44.59 | 43.58 – 45.96 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 61.39 | 55.67 – 74.38 | 12 | 12 | — |
| 8 | run.cloud | 68.25 | 64.34 – 78.82 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 70.35 | 68.42 – 106.9 | 12 | 12 | tied |
| 8 | E2B | 77.37 | 69.26 – 84.38 | 12 | 12 | tied |
| 12 | Runloop | 119.5 | 116.3 – 124.5 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 55.14 | 54.52 – 56.33 | 12 | 12 | — |
| 2 | Daytona (VM) | 67.56 | 66.96 – 68.71 | 12 | 12 | — |
| 2 | Namespace | 69.99 | 66.09 – 102.8 | 12 | 12 | tied |
| 2 | Microsandbox Cloud | 74.33 | 70.41 – 86.49 | 12 | 12 | tied |
| 2 | Blaxel | 76.67 | 75.37 – 78.04 | 12 | 12 | tied |
| 2 | Novita | 77.85 | 76.04 – 78.24 | 12 | 12 | tied |
| 2 | Modal (VM) | 78.66 | 76.44 – 88.26 | 12 | 12 | tied |
| 8 | run.cloud | 109.4 | 107.9 – 111.1 | 12 | 12 | — |
| 9 | Vercel Sandbox | 122.9 | 119.2 – 126 | 12 | 12 | — |
| 10 | E2B | 132.9 | 129.4 – 137.4 | 12 | 12 | — |
| 10 | Modal (gVisor) | 142 | 117.3 – 163.3 | 12 | 12 | tied |
| 12 | Runloop | 171.5 | 163.9 – 173.1 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Daytona (VM), Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.289 | 2.054 – 2.742 | 12 | 12 | — |
| 1 | Namespace | 2.41 | 2.304 – 2.867 | 12 | 12 | tied |
| 1 | Blaxel | 2.474 | 2.376 – 2.522 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 2.666 | 2.486 – 3.344 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 2.726 | 2.293 – 2.761 | 12 | 12 | tied |
| 4 | Modal (VM) | 2.882 | 2.011 – 3.081 | 12 | 12 | tied |
| 7 | boat | 3.396 | 3.054 – 4.056 | 12 | 12 | — |
| 7 | Novita | 3.546 | 3.314 – 3.708 | 12 | 12 | tied |
| 7 | run.cloud | 3.597 | 3.36 – 4.594 | 12 | 12 | tied |
| 7 | E2B | 3.946 | 3.409 – 5.219 | 12 | 12 | tied |
| 7 | Modal (gVisor) | 4.269 | 3.708 – 4.605 | 12 | 12 | tied |
| 12 | Runloop | 8.023 | 5.617 – 12.85 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_boat leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 68.37 | 66.87 – 72.28 | 12 | 12 | — |
| 2 | Namespace | 81.33 | 78.88 – 90.84 | 12 | 12 | — |
| 2 | Daytona (VM) | 85.45 | 82.88 – 88.52 | 12 | 12 | tied |
| 4 | Blaxel | 93.61 | 90.78 – 95.04 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 94.53 | 88.83 – 132.2 | 12 | 12 | tied |
| 4 | Novita | 97.61 | 96.48 – 99.07 | 12 | 12 | tied |
| 4 | Modal (VM) | 101.3 | 97.37 – 110.1 | 12 | 12 | tied |
| 8 | run.cloud | 138 | 137.4 – 139.2 | 12 | 12 | — |
| 9 | Vercel Sandbox | 148.6 | 144.5 – 153.1 | 12 | 12 | — |
| 10 | E2B | 169.6 | 165.5 – 175.4 | 12 | 12 | — |
| 10 | Modal (gVisor) | 174.1 | 142.1 – 207.7 | 12 | 12 | tied |
| 12 | Runloop | 258.7 | 256.3 – 263.4 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 805.6 | 798.7 – 810.4 | 12 | 12 | — |
| 2 | Daytona (VM) | 897.4 | 894.5 – 899.4 | 12 | 12 | — |
| 2 | Namespace | 919.3 | 904.4 – 935.8 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 938.3 | 922.4 – 1010 | 12 | 12 | — |
| 4 | Blaxel | 961.7 | 951 – 981.5 | 12 | 12 | tied |
| 6 | Modal (VM) | 981.4 | 972.3 – 1057 | 12 | 12 | — |
| 7 | Novita | 1014 | 1002 – 1017 | 12 | 12 | — |
| 8 | Vercel Sandbox | 1338 | 1317 – 1362 | 11 | 11 | — |
| 8 | run.cloud | 1341 | 1309 – 1358 | 12 | 12 | tied |
| 10 | E2B | 1460 | 1403 – 1496 | 11 | 11 | — |
| 11 | Runloop | 1579 | 1567 – 1588 | 12 | 12 | — |
| 11 | Modal (gVisor) | 1839 | 1410 – 1865 | 9 | 9 | tied |

### OpenClaw: cold install

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 10.47 | 10.01 – 10.86 | 12 | 12 | — |
| 2 | Daytona (VM) | 11.27 | 10.97 – 11.81 | 12 | 12 | — |
| 2 | Blaxel | 11.41 | 11.13 – 11.55 | 12 | 12 | tied |
| 4 | Novita | 14.27 | 13.75 – 14.88 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 15.84 | 14.95 – 17.4 | 12 | 12 | — |
| 5 | Modal (VM) | 18.03 | 14.56 – 19.15 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 18.14 | 17.99 – 18.52 | 12 | 12 | tied |
| 5 | boat | 18.92 | 18.38 – 21.73 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 21.96 | 19.57 – 26.8 | 12 | 12 | — |
| 9 | run.cloud | 22.15 | 20.44 – 29.34 | 12 | 12 | tied |
| 9 | E2B | 22.53 | 20.1 – 28.26 | 12 | 12 | tied |
| 9 | Runloop | 26.16 | 25.41 – 28.04 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.394 | 2.27 – 5.831 | 12 | 12 | — |
| 1 | Blaxel | 2.521 | 2.489 – 2.558 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 3.652 | 3.26 – 5.662 | 12 | 12 | — |
| 3 | Modal (VM) | 3.707 | 2.913 – 4.902 | 12 | 12 | tied |
| 3 | Daytona (VM) | 3.904 | 3.213 – 9.616 | 12 | 12 | tied |
| 3 | Novita | 4.617 | 3.75 – 5.11 | 12 | 12 | tied |
| 3 | E2B | 4.979 | 4.687 – 5.986 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 5.965 | 3.775 – 9.269 | 12 | 12 | tied |
| 3 | boat | 6.299 | 4.81 – 13.25 | 12 | 12 | tied |
| 3 | Modal (gVisor) | 7.393 | 5.751 – 9.126 | 12 | 12 | tied |
| 11 | run.cloud | 11.15 | 9.997 – 11.93 | 12 | 12 | — |
| 11 | Runloop | 11.28 | 7.051 – 18.98 | 12 | 12 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 111.6 | 107.5 – 122.8 | 12 | 12 | — |
| 2 | Daytona (VM) | 146.5 | 145 – 151.5 | 12 | 12 | — |
| 3 | Namespace | 159.2 | 152.2 – 165.1 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 160.1 | 147.4 – 161.9 | 12 | 12 | tied |
| 5 | Blaxel | 164.5 | 162.1 – 166.4 | 12 | 12 | — |
| 6 | Novita | 174 | 171 – 179 | 12 | 12 | — |
| 6 | Modal (VM) | 180.5 | 170.9 – 193.6 | 12 | 12 | tied |
| 8 | run.cloud | 213.9 | 184.3 – 231.9 | 12 | 12 | — |
| 9 | Vercel Sandbox | 232.4 | 226.8 – 237.6 | 12 | 12 | — |
| 9 | Modal (gVisor) | 238.6 | 229 – 315.7 | 12 | 12 | tied |
| 11 | E2B | 312.1 | 307 – 332.6 | 12 | 12 | — |
| 11 | Runloop | 317.5 | 309.2 – 330 | 12 | 12 | tied |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 213.7 | 200.7 – 224.5 | 12 | 12 | — |
| 2 | Daytona (VM) | 283.6 | 279 – 289.2 | 12 | 12 | — |
| 2 | Microsandbox Cloud | 304.4 | 273.4 – 312.3 | 12 | 12 | tied |
| 2 | Namespace | 305.9 | 301.8 – 317.4 | 12 | 12 | tied |
| 2 | Blaxel | 315.9 | 311.4 – 324.2 | 12 | 12 | tied |
| 6 | Novita | 339.6 | 335.8 – 341.8 | 12 | 12 | — |
| 7 | Modal (VM) | 355.4 | 340.4 – 361.2 | 12 | 12 | — |
| 8 | run.cloud | 417.6 | 389.4 – 528.1 | 12 | 12 | — |
| 8 | Vercel Sandbox | 426.4 | 419 – 433.1 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 495.6 | 411.2 – 658.1 | 12 | 12 | tied |
| 8 | E2B | 608.9 | 603.7 – 628.9 | 12 | 12 | tied |
| 8 | Runloop | 624.5 | 615.3 – 638 | 12 | 12 | tied |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 77.39 | 74.93 – 84.04 | 12 | 12 | — |
| 2 | Daytona (VM) | 89.49 | 88.74 – 91.88 | 12 | 12 | — |
| 3 | Blaxel | 106.8 | 102.4 – 111.5 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 107.1 | 104.6 – 116.8 | 12 | 12 | tied |
| 3 | Novita | 113.8 | 112.5 – 115.8 | 12 | 12 | tied |
| 3 | Namespace | 114.1 | 109.7 – 120.7 | 12 | 12 | tied |
| 3 | Modal (VM) | 115.6 | 109.3 – 124.8 | 12 | 12 | tied |
| 3 | run.cloud | 140.8 | 113.8 – 162.4 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 154.5 | 151.4 – 158.5 | 12 | 12 | tied |
| 10 | E2B | 193.3 | 181.5 – 209.6 | 12 | 12 | — |
| 10 | Modal (gVisor) | 207.5 | 140.4 – 266.6 | 12 | 12 | tied |
| 10 | Runloop | 235.3 | 226.4 – 244.3 | 12 | 12 | tied |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_boat leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 13.04 | 12.65 – 13.55 | 12 | 12 | — |
| 2 | Daytona (VM) | 15.81 | 15.16 – 16.32 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 17.8 | 17.2 – 18.3 | 12 | 12 | — |
| 3 | Blaxel | 18.41 | 17.7 – 18.82 | 12 | 12 | tied |
| 5 | Namespace | 19.81 | 19.3 – 20.3 | 12 | 12 | — |
| 5 | Modal (VM) | 20.07 | 18.28 – 22.05 | 12 | 12 | tied |
| 5 | Novita | 20.84 | 20.4 – 21.82 | 12 | 12 | tied |
| 8 | run.cloud | 22.88 | 21.72 – 33.06 | 12 | 12 | — |
| 8 | Modal (gVisor) | 25.79 | 23.83 – 55.76 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 26.68 | 25.85 – 26.95 | 12 | 12 | tied |
| 11 | E2B | 36.32 | 34.29 – 40.44 | 12 | 12 | — |
| 11 | Runloop | 40.03 | 37.77 – 41.49 | 12 | 12 | tied |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_boat, Microsandbox Cloud and Daytona (VM) share the top on this metric (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 27.16 | 20.23 – 28.37 | 5 | 10 | — |
| 1 | Microsandbox Cloud | 22.2 | 19.56 – 23.58 | 5 | 10 | tied |
| 1 | Daytona (VM) | 21.64 | 21.55 – 22.14 | 5 | 10 | tied |
| 4 | Blaxel | 19.16 | 18.59 – 19.38 | 5 | 10 | — |
| 4 | Novita | 18.9 | 18.89 – 21.01 | 5 | 10 | tied |
| 4 | tama | 18.2 | 17.57 – 19.53 | 5 | 10 | tied |
| 4 | Namespace | 18.18 | 17 – 24.5 | 5 | 10 | tied |
| 8 | run.cloud | 15.21 | 13.14 – 17.35 | 5 | 10 | — |
| 8 | Modal (VM) | 14.81 | 14.18 – 17.75 | 5 | 10 | tied |
| 10 | Modal (gVisor) | 13.36 | 9.135 – 13.43 | 5 | 10 | — |
| 10 | Vercel Sandbox | 12.7 | 11.88 – 13.18 | 5 | 10 | tied |
| 10 | E2B | 11.18 | 10.26 – 14.38 | 5 | 10 | tied |
| 13 | Runloop | 7.945 | 7.735 – 10.92 | 5 | 10 | — |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, buffered (MB/s)</summary>

### fio rand write 4KB, buffered (MB/s) _(headline)_

MB/s · higher is better

_boat leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1609 | 1586 – 1646 | 3 | 6 | — |
| 2 | Blaxel | 1155 | 1127 – 1165 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 1064 | 876.1 – 1075 | 3 | 6 | too few sandboxes |
| 4 | Novita | 1027 | 996.7 – 1035 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 861.4 | 829.4 – 865.6 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 845.7 | 837.8 – 1055 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 824.2 | 778 – 830.5 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 739.2 | 243.3 – 772.8 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 739.2 | 688.4 – 778.6 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 647 | 646.4 – 657.5 | 3 | 6 | too few sandboxes |
| 11 | tama | 565.7 | 553.6 – 656.4 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 474.5 | 464.5 – 787 | 3 | 6 | too few sandboxes |
| 13 | E2B | 241.7 | 239.1 – 246.4 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.4× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 135500 | 66900 – 137000 | 3 | 6 | — |
| 2 | boat | 57250 | 56550 – 57250 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 51400 | 51200 – 51500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 48600 | 46400 – 50000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 36400 | 35650 – 61150 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 34400 | 33050 – 37100 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 27600 | 26850 – 31050 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 25250 | 21400 – 25300 | 3 | 6 | too few sandboxes |
| 9 | Novita | 16100 | 15700 – 16400 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 15850 | 15450 – 16300 | 3 | 6 | too few sandboxes |
| 11 | tama | 13200 | 9910 – 15100 | 3 | 6 | too few sandboxes |
| 12 | E2B | 9004 | 8450 – 10509 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 7986 | 7148 – 9012 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.4× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 554.2 | 274.2 – 561.5 | 3 | 6 | — |
| 2 | boat | 234.4 | 231.2 – 234.4 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 210.2 | 209.7 – 210.8 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 198.7 | 189.8 – 205 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 148.9 | 145.8 – 250.6 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 141 | 135.3 – 152 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 112.7 | 110.1 – 126.9 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 103.3 | 87.56 – 103.5 | 3 | 6 | too few sandboxes |
| 9 | Novita | 65.96 | 64.23 – 67.21 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 64.91 | 63.23 – 66.74 | 3 | 6 | too few sandboxes |
| 11 | tama | 54.21 | 40.63 – 61.71 | 3 | 6 | too few sandboxes |
| 12 | E2B | 36.91 | 34.6 – 43.1 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 32.72 | 29.26 – 36.91 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, buffered (IOPS)

IOPS · higher is better

_boat leads · ~1.4× Blaxel on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 393000 | 387500 – 402000 | 3 | 6 | — |
| 2 | Blaxel | 282000 | 275500 – 284000 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 259500 | 214000 – 262500 | 3 | 6 | too few sandboxes |
| 4 | Novita | 251000 | 243500 – 252500 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 210500 | 202500 – 211000 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 206500 | 204500 – 257500 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 201000 | 189500 – 202500 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 180500 | 59300 – 188500 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 180500 | 168000 – 190500 | 3 | 6 | too few sandboxes, equal medians |
| 10 | run.cloud | 158000 | 158000 – 160500 | 3 | 6 | too few sandboxes |
| 11 | tama | 138000 | 135000 – 160500 | 3 | 6 | too few sandboxes |
| 12 | Modal (VM) | 115500 | 113500 – 192000 | 3 | 6 | too few sandboxes |
| 13 | E2B | 59050 | 58300 – 60100 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 30150 | 30000 – 34700 | 3 | 6 | — |
| 2 | Daytona (VM) | 11500 | 10750 – 12500 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 8554 | 7980 – 8959 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 5983 | 5914 – 6440 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 5752 | 5454 – 5976 | 3 | 6 | too few sandboxes |
| 6 | Novita | 4867 | 4852 – 5046 | 3 | 6 | too few sandboxes |
| 7 | boat | 3644 | 3601 – 3875 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3512 | 3492 – 3586 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 3149 | 3024 – 3209 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1938 | 1789 – 4446 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1926 | 1504 – 2078 | 3 | 6 | too few sandboxes |
| 12 | tama | 997 | 971 – 1015 | 3 | 6 | too few sandboxes |
| 13 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, buffered (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 31620 | 31460 – 36450 | 3 | 6 | — |
| 2 | Daytona (VM) | 12030 | 11220 – 13150 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 8971 | 8369 – 9424 | 3 | 6 | too few sandboxes |
| 4 | run.cloud | 6276 | 6203 – 6754 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 6032 | 5721 – 6268 | 3 | 6 | too few sandboxes |
| 6 | Novita | 5105 | 5089 – 5293 | 3 | 6 | too few sandboxes |
| 7 | boat | 3822 | 3776 – 4065 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3685 | 3663 – 3761 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 3302 | 3172 – 3366 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 2033 | 1877 – 4664 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 2021 | 1578 – 2181 | 3 | 6 | too few sandboxes |
| 12 | tama | 1048 | 1020 – 1066 | 3 | 6 | too few sandboxes |
| 13 | E2B | 630.7 | 630.2 – 630.7 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, buffered (IOPS): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5144 | 5045 – 5214 | 3 | 6 | — |
| 2 | Namespace | 4138 | 2484 – 4264 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 3920 | 3772 – 4446 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 3536 | 3508 – 5485 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3457 | 3353 – 4995 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3262 | 3178 – 3374 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 3172 | 3135 – 3175 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2389 | 2329 – 2400 | 3 | 6 | too few sandboxes |
| 9 | boat | 1974 | 1971 – 2121 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1810 | 1487 – 1819 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1659 | 1584 – 1842 | 3 | 6 | too few sandboxes |
| 12 | E2B | 596.5 | 589.5 – 599 | 3 | 6 | too few sandboxes |
| 13 | tama | 522 | 458 – 550 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, buffered (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Namespace on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, buffered (MB/s): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, buffered (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 5395 | 5292 – 5469 | 3 | 6 | — |
| 2 | Namespace | 4340 | 2606 – 4473 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 4112 | 3957 – 4664 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 3709 | 3680 – 5753 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 3627 | 3517 – 5239 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 3422 | 3334 – 3539 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 3328 | 3288 – 3331 | 3 | 6 | too few sandboxes |
| 8 | Novita | 2507 | 2444 – 2517 | 3 | 6 | too few sandboxes |
| 9 | boat | 2071 | 2069 – 2226 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1899 | 1560 – 1909 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1741 | 1663 – 1933 | 3 | 6 | too few sandboxes |
| 12 | E2B | 626.5 | 619.7 – 629.7 | 3 | 6 | too few sandboxes |
| 13 | tama | 549.5 | 481.3 – 578.8 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.29 | 25.06 – 25.38 | 3 | 6 | — |
| 2 | Blaxel | 19.48 | 19.12 – 19.54 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 15.45 | 14.46 – 17.95 | 3 | 6 | too few sandboxes |
| 4 | Runloop | 13.84 | 12.35 – 17.49 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.16 | 12.11 – 12.19 | 3 | 6 | too few sandboxes |
| 6 | boat | 11.75 | 10.79 – 11.86 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 10.64 | 10.54 – 10.75 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 8.51 | 8.435 – 8.525 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 8.07 | 7.99 – 28.55 | 3 | 6 | too few sandboxes |
| 10 | tama | 7.91 | 5.36 – 7.99 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 7.605 | 7.605 – 7.62 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 4.235 | 2.44 – 4.24 | 3 | 6 | too few sandboxes |
| 13 | E2B | 1.345 | 1.315 – 1.96 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_tama leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 297700 | 240500 – 307100 | 3 | 6 | — |
| 2 | Daytona (VM) | 183900 | 179000 – 184700 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 107700 | 105000 – 129600 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 69870 | 58710 – 109800 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 57000 | 56990 – 99400 | 3 | 6 | too few sandboxes |
| 6 | Novita | 54030 | 53180 – 54200 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 53370 | 47170 – 54060 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 51740 | 45020 – 52620 | 3 | 6 | too few sandboxes |
| 9 | E2B | 46340 | 44752 – 53120 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 44840 | 43030 – 44920 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 32450 | 31619 – 32850 | 3 | 6 | too few sandboxes |
| 12 | boat | 32410 | 28010 – 33080 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_tama leads · ~1.5× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 283600 | 263500 – 332100 | 3 | 6 | — |
| 2 | Daytona (VM) | 183500 | 178500 – 184400 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 107100 | 104300 – 127800 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 68080 | 60860 – 106500 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 56940 | 56920 – 99138 | 3 | 6 | too few sandboxes |
| 6 | Novita | 54000 | 53130 – 54130 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 53210 | 46250 – 53920 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 51880 | 44660 – 52460 | 3 | 6 | too few sandboxes |
| 9 | E2B | 46800 | 44670 – 53460 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 44760 | 42970 – 44880 | 3 | 6 | too few sandboxes |
| 11 | boat | 32530 | 28310 – 33020 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 32390 | 31630 – 32840 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_tama leads · ~1.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 296600 | 272000 – 322600 | 3 | 6 | — |
| 2 | Daytona (VM) | 210600 | 207200 – 212300 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 107000 | 102300 – 115800 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 94720 | 84850 – 114600 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 87780 | 87610 – 136700 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 81010 | 39790 – 82440 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 79930 | 69880 – 81830 | 3 | 6 | too few sandboxes |
| 8 | E2B | 72520 | 68630 – 78220 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 61530 | 59050 – 61660 | 3 | 6 | too few sandboxes |
| 10 | Novita | 58360 | 58198 – 58530 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 42870 | 42720 – 43300 | 3 | 6 | too few sandboxes |
| 12 | boat | 41820 | 38210 – 42300 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_tama leads · ~1.4× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 252600 | 190800 – 281000 | 3 | 6 | — |
| 2 | Daytona (VM) | 174300 | 171600 – 174700 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 108600 | 102200 – 127300 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 57090 | 50030 – 96110 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 52720 | 52630 – 90440 | 3 | 6 | too few sandboxes |
| 6 | Novita | 51780 | 50220 – 51980 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 46160 | 42820 – 46600 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 43890 | 38590 – 45800 | 3 | 6 | too few sandboxes |
| 9 | E2B | 41950 | 37800 – 46603 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 40380 | 38690 – 40550 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 29690 | 28710 – 29910 | 3 | 6 | too few sandboxes |
| 12 | boat | 29460 | 25630 – 29940 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>5 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 9361 | 8042 – 9536 | 3 | 6 | — |
| 2 | Novita | 5650 | 4326 – 6234 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4170 | 3352 – 6253 | 3 | 6 | too few sandboxes |
| 4 | E2B | 3565 | 853.6 – 4069 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 2493 | 1536 – 2803 | 3 | 6 | too few sandboxes |
| 6 | tama | 2455 | 2186 – 2724 | 2 | 4 | too few sandboxes |
| 7 | Modal (gVisor) | 2163 | 1615 – 3778 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 1434 | 1149 – 1768 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1429 | 1046 – 1785 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1138 | 1046 – 1324 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 936.6 | 903.7 – 937 | 3 | 6 | too few sandboxes |
| 12 | boat | 921 | 356.2 – 921.2 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Namespace leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 6092 | 4236 – 6231 | 3 | 6 | — |
| 2 | Vercel Sandbox | 5279 | 5039 – 5461 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 5271 | 4164 – 9214 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 4809 | 3111 – 4836 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4111 | 2586 – 6453 | 3 | 6 | too few sandboxes |
| 6 | tama | 3122 | 1595 – 4649 | 2 | 4 | too few sandboxes |
| 7 | Modal (gVisor) | 2385 | 937.1 – 2935 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 2110 | 1911 – 2560 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2000 | 1684 – 2320 | 3 | 6 | too few sandboxes |
| 10 | E2B | 1306 | 1028 – 2631 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 934.4 | 934.2 – 934.6 | 3 | 6 | too few sandboxes |
| 12 | boat | 916.1 | 833.2 – 916.5 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.3× boat on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 158400 | 157200 – 160154 | 3 | 6 | — |
| 2 | boat | 119314 | 115900 – 119500 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 80680 | 65040 – 92786 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 72372 | 61540 – 79127 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 67210 | 41490 – 67400 | 3 | 6 | too few sandboxes |
| 6 | E2B | 51386 | 51350 – 57771 | 3 | 6 | too few sandboxes |
| 7 | tama | 47070 | 43124 – 51016 | 2 | 4 | too few sandboxes |
| 8 | run.cloud | 39943 | 34963 – 40800 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 39400 | 34970 – 39648 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 35694 | 32732 – 35804 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 22848 | 16880 – 71320 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 15884 | 15483 – 17461 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.2× boat on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 156927 | 151700 – 157100 | 3 | 6 | — |
| 2 | boat | 135700 | 134362 – 137800 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 99260 | 93213 – 102279 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 71157 | 68300 – 74000 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 51920 | 37936 – 59651 | 3 | 6 | too few sandboxes |
| 6 | tama | 49330 | 42420 – 56242 | 2 | 4 | too few sandboxes |
| 7 | E2B | 48770 | 40326 – 51950 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 43488 | 37980 – 44731 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 41780 | 36706 – 42112 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 33584 | 32400 – 33861 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 23310 | 14361 – 60196 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 15896 | 15224 – 17660 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 12 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | — |
| 2 | boat | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Namespace | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | tama | 9999 | 9999 – 9999 | 2 | 4 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 12 | Modal (gVisor) | 414 | 257 – 425.5 | 3 | 6 | too few sandboxes |

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
| 1 | Namespace | 33.66 | 33.61 – 34.39 | 3 | 6 | — |
| 2 | boat | 34.45 | 34.2 – 36 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 36.31 | 35.89 – 39.28 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 40.41 | 40.12 – 41.15 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 41.14 | 39.4 – 42.46 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 42.72 | 42.51 – 42.96 | 3 | 6 | too few sandboxes |
| 7 | Novita | 43.91 | 43.43 – 44.02 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 47.45 | 41.94 – 48.05 | 3 | 6 | too few sandboxes |
| 9 | tama | 48.02 | 47.82 – 56.63 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 62.01 | 52.83 – 62.82 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 62.35 | 61.48 – 64.81 | 3 | 6 | too few sandboxes |
| 12 | E2B | 71.22 | 68.85 – 73.14 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 87.47 | 63.79 – 89.17 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_tama leads · ~1.3× boat on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 545000 | 544300 – 545600 | 1 | 2 | — |
| 2 | boat | 405100 | 393800 – 407800 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 322200 | 322000 – 331300 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 297700 | 295400 – 301700 | 3 | 6 | too few sandboxes |
| 5 | Novita | 297000 | 295600 – 305000 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 276800 | 195300 – 282000 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 246600 | 229900 – 246700 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 239500 | 222600 – 242700 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 176800 | 167400 – 186200 | 1 | 2 | too few sandboxes |
| 10 | E2B | 169700 | 167000 – 175400 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 160900 | 123000 – 169700 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 108900 | 67560 – 121700 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 97100 | 93720 – 100400 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_tama leads · boat is ~1.3× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 0.092 | 0.092 – 0.092 | 1 | 2 | — |
| 2 | boat | 0.1235 | 0.1225 – 0.127 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 0.155 | 0.1515 – 0.1555 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 0.168 | 0.1655 – 0.169 | 3 | 6 | too few sandboxes |
| 5 | Novita | 0.1685 | 0.164 – 0.1695 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 0.1805 | 0.1775 – 0.256 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 0.203 | 0.2025 – 0.2175 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 0.209 | 0.206 – 0.2245 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 0.284 | 0.269 – 0.299 | 1 | 2 | too few sandboxes |
| 10 | E2B | 0.2945 | 0.2855 – 0.299 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 0.311 | 0.295 – 0.4065 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 0.4595 | 0.4105 – 0.7405 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 0.517 | 0.5025 – 0.538 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_boat leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 27460 | 26780 – 28310 | 3 | 6 | — |
| 2 | Novita | 27060 | 27030 – 27590 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 22270 | 21960 – 23170 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 22070 | 20800 – 22210 | 3 | 6 | too few sandboxes |
| 5 | tama | 17630 | 14340 – 20920 | 1 | 2 | too few sandboxes |
| 6 | Microsandbox Cloud | 17150 | 15120 – 17450 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 16540 | 16240 – 16670 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 16530 | 15220 – 17840 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 16460 | 11690 – 18490 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 16360 | 15470 – 17260 | 1 | 2 | too few sandboxes |
| 11 | E2B | 11390 | 10600 – 12000 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 10530 | 8075 – 12010 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 8886 | 8866 – 8961 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_boat leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 1.821 | 1.766 – 1.872 | 3 | 6 | — |
| 2 | Novita | 1.848 | 1.813 – 1.855 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 2.247 | 2.158 – 2.276 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 2.266 | 2.252 – 2.405 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 2.916 | 2.865 – 3.307 | 3 | 6 | too few sandboxes |
| 6 | tama | 2.939 | 2.391 – 3.486 | 1 | 2 | too few sandboxes |
| 7 | Daytona (VM) | 3.025 | 2.998 – 3.079 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3.037 | 2.705 – 4.277 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 3.042 | 2.829 – 3.284 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 3.065 | 2.897 – 3.233 | 1 | 2 | too few sandboxes |
| 11 | E2B | 4.392 | 4.178 – 4.716 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 4.749 | 4.175 – 6.192 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 5.661 | 5.6 – 5.689 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 371 | 368 – 371.5 | 3 | 6 | — |
| 2 | Daytona (VM) | 405 | 403.5 – 443.5 | 3 | 6 | too few sandboxes |
| 3 | boat | 412.5 | 407 – 417.5 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 452.5 | 452 – 452.5 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 463.5 | 460 – 492 | 3 | 6 | too few sandboxes |
| 6 | Novita | 480.5 | 479 – 481 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 496.5 | 485.5 – 500.5 | 3 | 6 | too few sandboxes |
| 8 | tama | 505.5 | 504 – 609.5 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 667 | 476 – 668.5 | 3 | 6 | too few sandboxes |
| 10 | E2B | 753.5 | 750 – 806.5 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 765 | 760.5 – 770 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 901 | 667 – 901.5 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 1212 | 769 – 1218 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 13 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.38 | 30.99 – 33.99 | 3 | 6 | — |
| 2 | Namespace | 34.88 | 33.46 – 35.58 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 40.7 | 40.64 – 41.05 | 3 | 6 | too few sandboxes |
| 4 | Novita | 40.74 | 39.35 – 41.2 | 3 | 6 | too few sandboxes |
| 5 | boat | 47.15 | 45.18 – 51.47 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 48.07 | 47.12 – 48.37 | 3 | 6 | too few sandboxes |
| 7 | tama | 52.47 | 52.31 – 66.34 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 65.1 | 64.92 – 66.04 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 65.24 | 35.75 – 67.09 | 3 | 6 | too few sandboxes |
| 10 | E2B | 73.7 | 73.1 – 73.74 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 75.11 | 67.03 – 83.31 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 96.32 | 71.41 – 96.79 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 299.9 | 200.3 – 312.1 | 3 | 6 | too few sandboxes |

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

60 uncovered results across 6 providers (Blaxel 10, E2B 2, Modal (gVisor) 2, run.cloud 3, tama 41, Vercel Sandbox 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

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
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| run.cloud | pgbench | **failed** | Cleanup unresolved: computesdk lifecycle destroy failed: run.cloud sandbox sbx_13bd17183b5fc8b40867 has not confirmed removal after destroy |
| run.cloud | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| run.cloud | pgbench | **failed** | Cleanup unresolved: computesdk lifecycle destroy failed: run.cloud sandbox sbx_f740beee07c138d97374 has not confirmed removal after destroy |
| tama | network | **failed** | Failed to create sandbox: tama new bench-927ccd7d-d378-4a9e-ac08-8353f493bee9 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-927ccd7d-d378-4a9e-ac08-8353f493bee9 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload |
| tama | pgbench | **failed** | Step "mise run benchmark:pgbench:all" timed out after 4500s; Cleanup unresolved: sandbox machine-5old8jd6rtpw still has an accepted operation after 1000ms; safe teardown remains scheduled |
| tama | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| tama | pgbench | **failed** | Step "mise run benchmark:pgbench:all" timed out after 4500s; Cleanup unresolved: sandbox machine-le8csgdl81md still has an accepted operation after 1000ms; safe teardown remains scheduled |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r0: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r1: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r10: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r11: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r2: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r3: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r4: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r5: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r6: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r7: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r8: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-better-auth | **failed** | tama-realworld-better-auth-r9: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r0: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r1: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r10: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r11: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r2: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r3: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r4: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r5: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r6: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r7: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r8: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-mastra | **failed** | tama-realworld-mastra-r9: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r0: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r1: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r10: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r11: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r2: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r3: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r4: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r5: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r6: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r7: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r8: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
| tama | realworld-openclaw | **failed** | tama-realworld-openclaw-r9: tama list --all --json: exit 1; tama: not logged in; run `tama login`; process exit 1 |
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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 2 v 3 sandboxes floors at p ≈ 0.20; 2 v 3 sandboxes floors at p ≈ 1.0; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 2 sandboxes floors at p ≈ 1.0; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Blaxel | 0.0068 | 0.0046 |
| realworld | Mastra: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: cold install | boat | 0.98 (tied) | 0.99 |
| realworld | Mastra: cold install | Modal (VM) | 1.0 (tied) | 0.79 |
| realworld | Mastra: cold install | Novita | 0.068 (tied) | 0.19 |
| realworld | Mastra: cold install | Daytona (VM) | 0.84 (tied) | 0.99 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.028 | 0.0046 |
| realworld | Mastra: cold install | E2B | 0.0011 | <0.001 |
| realworld | Mastra: cold install | Modal (gVisor) | 0.67 (tied) | 0.19 |
| realworld | Mastra: cold install | Runloop | <0.001 | <0.001 |
| realworld | Mastra: cold install | run.cloud | 0.22 (tied) | 0.019 |
| realworld | Better-Auth: build | boat | — | — |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.0056 | <0.001 |
| realworld | Better-Auth: build | Modal (VM) | 0.045 | 0.066 |
| realworld | Better-Auth: build | Blaxel | 0.93 (tied) | 0.79 |
| realworld | Better-Auth: build | Novita | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: build | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Vercel Sandbox | <0.001 | 0.0046 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: build | E2B | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Namespace | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.0029 | 0.0046 |
| realworld | Better-Auth: cold install | Blaxel | 0.0011 | <0.001 |
| realworld | Better-Auth: cold install | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | boat | 0.024 | 0.066 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.27 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.068 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | E2B | 0.55 (tied) | 0.99 |
| realworld | Better-Auth: cold install | run.cloud | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Runloop | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.0036 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.033 | 0.0046 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0029 | 0.0046 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: git clone | E2B | 0.21 (tied) | 0.19 |
| realworld | Better-Auth: git clone | boat | 0.0029 | 0.0046 |
| realworld | Better-Auth: git clone | Novita | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: git clone | run.cloud | 0.045 | 0.019 |
| realworld | Better-Auth: git clone | Runloop | 0.012 | 0.019 |
| realworld | Better-Auth: lint (Biome) | boat | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | 0.0014 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.10 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.93 (tied) | 0.99 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.039 | 0.019 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.22 (tied) | 0.019 |
| realworld | Better-Auth: lint (Biome) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | boat | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.0014 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.033 | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.76 (tied) | 0.99 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.028 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.039 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | 0.039 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | 0.0036 | <0.001 |
| realworld | Better-Auth: lint format | boat | — | — |
| realworld | Better-Auth: lint format | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.17 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Blaxel | 0.060 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Novita | 0.59 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.27 (tied) | 0.79 |
| realworld | Better-Auth: lint format | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint format | E2B | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | boat | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Namespace | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Novita | 0.028 | 0.0046 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.64 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Blaxel | 0.98 (tied) | 0.99 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.0068 | 0.019 |
| realworld | Better-Auth: lint packages | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | E2B | 0.62 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | boat | — | — |
| realworld | Better-Auth: lint spell | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.0010 | 0.0046 |
| realworld | Better-Auth: lint spell | Blaxel | 0.066 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.045 | 0.019 |
| realworld | Better-Auth: lint spell | Novita | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | E2B | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | boat | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Blaxel | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.0018 | <0.001 |
| realworld | Better-Auth: lint types | Namespace | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Novita | 0.44 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | run.cloud | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: lint types | E2B | 0.67 (tied) | 0.79 |
| realworld | Better-Auth: lint types | Modal (gVisor) | 0.020 | 0.0046 |
| realworld | Better-Auth: lint types | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | boat | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.38 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Novita | 0.12 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.14 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Blaxel | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | run.cloud | 0.16 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | E2B | 0.98 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.51 (tied) | 0.19 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.48 (tied) | 0.19 |
| realworld | Mastra: build:core | Blaxel | 0.76 (tied) | 0.066 |
| realworld | Mastra: build:core | Novita | 0.51 (tied) | 0.43 |
| realworld | Mastra: build:core | Modal (VM) | 0.29 (tied) | 0.19 |
| realworld | Mastra: build:core | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.80 (tied) | 0.066 |
| realworld | Mastra: build:core | Runloop | 0.0014 | 0.0046 |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Namespace | 0.38 (tied) | 0.19 |
| realworld | Mastra: git clone | Blaxel | 0.90 (tied) | 0.43 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.017 | 0.066 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.41 (tied) | 0.43 |
| realworld | Mastra: git clone | Modal (VM) | 0.51 (tied) | 0.19 |
| realworld | Mastra: git clone | boat | 0.0083 | 0.066 |
| realworld | Mastra: git clone | Novita | 0.80 (tied) | 0.79 |
| realworld | Mastra: git clone | run.cloud | 0.44 (tied) | 0.79 |
| realworld | Mastra: git clone | E2B | 0.62 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.88 (tied) | 0.79 |
| realworld | Mastra: git clone | Runloop | <0.001 | <0.001 |
| realworld | Mastra: lint:format | boat | — | — |
| realworld | Mastra: lint:format | Namespace | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.24 (tied) | 0.19 |
| realworld | Mastra: lint:format | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.44 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | 0.55 (tied) | 0.066 |
| realworld | Mastra: lint:format | Modal (VM) | 0.078 (tied) | 0.066 |
| realworld | Mastra: lint:format | run.cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | boat | — | — |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: test:core | Namespace | 0.052 (tied) | 0.0046 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.017 | 0.19 |
| realworld | Mastra: test:core | Blaxel | 0.24 (tied) | 0.19 |
| realworld | Mastra: test:core | Modal (VM) | 0.017 | 0.019 |
| realworld | Mastra: test:core | Novita | 0.045 | 0.0046 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.93 (tied) | 0.97 |
| realworld | Mastra: test:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.55 (tied) | 0.051 |
| realworld | OpenClaw: cold install | Namespace | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.0014 | 0.0046 |
| realworld | OpenClaw: cold install | Blaxel | 0.71 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.020 | 0.019 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.44 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.63 (tied) | 0.19 |
| realworld | OpenClaw: cold install | boat | 0.060 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.033 | 0.066 |
| realworld | OpenClaw: cold install | run.cloud | 0.55 (tied) | 0.43 |
| realworld | OpenClaw: cold install | E2B | 1.0 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Runloop | 0.20 (tied) | 0.019 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | 0.052 (tied) | 0.0046 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.44 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.29 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Novita | 0.71 (tied) | 0.43 |
| realworld | OpenClaw: git clone | E2B | 0.060 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.98 (tied) | 0.19 |
| realworld | OpenClaw: git clone | boat | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.76 (tied) | 0.43 |
| realworld | OpenClaw: git clone | run.cloud | 0.0056 | 0.0046 |
| realworld | OpenClaw: git clone | Runloop | 0.76 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | boat | — | — |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.48 (tied) | 0.79 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | 0.0023 | 0.0046 |
| realworld | OpenClaw: lint (all extensions) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.29 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.024 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.045 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.29 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.039 | 0.019 |
| realworld | OpenClaw: lint (all extensions) | Runloop | 0.89 (tied) | 0.79 |
| realworld | OpenClaw: lint (Oxlint) | boat | — | — |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | 0.22 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.22 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.028 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.35 (tied) | 0.066 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 0.22 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | boat | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.55 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.10 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.84 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.93 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.068 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.48 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.93 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | 0.89 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | boat | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.22 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.93 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.51 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.039 | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.068 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.76 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | 0.16 (tied) | 0.19 |
| cpu | Node.js web tooling | boat | — | — |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.15 (tied) | 0.031 |
| cpu | Node.js web tooling | Daytona (VM) | 0.69 (tied) | 0.31 |
| cpu | Node.js web tooling | Blaxel | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Novita | 0.55 (tied) | 0.31 |
| cpu | Node.js web tooling | tama | 0.056 (tied) | 0.0012 |
| cpu | Node.js web tooling | Namespace | 0.84 (tied) | 0.0069 |
| cpu | Node.js web tooling | run.cloud | 0.016 | 0.0069 |
| cpu | Node.js web tooling | Modal (VM) | 1.0 (tied) | 0.31 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.31 (tied) | 0.11 |
| cpu | Node.js web tooling | E2B | 0.13 (tied) | 0.0012 |
| cpu | Node.js web tooling | Runloop | 0.016 | 0.0012 |
| disk | fio rand write 4KB, buffered (MB/s) | boat | — | — |
| disk | fio rand write 4KB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (MB/s) | tama | 0.40 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (IOPS) | E2B | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio rand read 4KB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, buffered (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, buffered (MB/s) | E2B | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, buffered (MB/s) | Runloop | 0.30 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | boat | — | — |
| disk | fio rand write 4KB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Vercel Sandbox | 0.80 (too few sandboxes, equal medians) | 0.81 |
| disk | fio rand write 4KB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, buffered (IOPS) | tama | 0.50 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Namespace | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, buffered (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Namespace | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, buffered (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (IOPS) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, buffered (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, buffered (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, buffered (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, buffered (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | Runloop | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, buffered (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, buffered (MB/s) | tama | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.40 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.60 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | tama | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | boat | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | tama | — | — |
| memory | STREAM Add | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Runloop | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Add | run.cloud | 0.40 (too few sandboxes) | 0.012 |
| memory | STREAM Add | boat | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Namespace | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | tama | — | — |
| memory | STREAM Copy | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Runloop | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | boat | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | tama | — | — |
| memory | STREAM Scale | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | boat | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Novita | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | tama | 1.0 (too few sandboxes) | 0.44 |
| network | iperf3 WAN download | Modal (gVisor) | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 WAN download | Modal (VM) | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | boat | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Namespace | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Daytona (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Runloop | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.20 (too few sandboxes) | 0.14 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | tama | 1.0 (too few sandboxes) | 0.89 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.80 (too few sandboxes) | 0.44 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | boat | 0.40 (too few sandboxes) | 0.32 |
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
| system | Git common operations | boat | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | tama | — | — |
| system | pgbench RO (s100, 50c) | boat | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | tama | — | — |
| system | pgbench RO latency (s100, 50c) | boat | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | boat | — | — |
| system | pgbench RW (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | tama | 0.50 (too few sandboxes) | 0.11 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.98 |
| system | pgbench RW (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | boat | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.68 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.50 (too few sandboxes) | 0.68 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.68 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.50 (too few sandboxes) | 0.033 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Novita | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | tama | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.20 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.40 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

