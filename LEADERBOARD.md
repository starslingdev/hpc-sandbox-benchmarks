# Sandbox provider leaderboard

Run [`37073680030`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/37073680030) · commit [`f571eec3dc1378680f223a365d586f61a4fc6658`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/f571eec3dc1378680f223a365d586f61a4fc6658) ·
dataset [`data/dataset/runs/37073680030.json`](data/dataset/runs/37073680030.json) · generated 2026-10-03T09:36:17.183Z

**Partial results — incomplete experiment.** 800 of 840 planned cells complete; 40 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:b06e78743cdd7873a2f552f1f8b333bd58f7bae01123132621ada19114db3c6d`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **939 metric records**
backed by **19664 retained trial observations**, across **65 metrics** and
**15 providers**; every emitted, catalogued metric has a ranked table below
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

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 15 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 15 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 14 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 37.19 | 36.25 – 38.65 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.32 | 38.62 – 40.3 | 12 | 12 | — |
| 3 | Blaxel | 41.97 | 40.7 – 42.78 | 12 | 12 | — |
| 4 | boat | 44.35 | 41.72 – 45.97 | 12 | 12 | — |
| 4 | Novita | 45.58 | 44.71 – 46.51 | 12 | 12 | tied |
| 4 | Modal (VM) | 46.42 | 44.31 – 50.34 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 47.88 | 44.71 – 53.03 | 12 | 12 | tied |
| 4 | Brezel | 52.81 | 35.69 – 63.53 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 58.95 | 56.67 – 60.15 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 70.87 | 69.23 – 74.03 | 11 | 11 | — |
| 10 | E2B | 72.9 | 64.17 – 75.85 | 12 | 12 | tied |
| 10 | tama | 76.38 | 59.17 – 102.1 | 12 | 12 | tied |
| 10 | Freestyle | 93.83 | 89.68 – 99.52 | 12 | 12 | tied |
| 14 | Runloop | 105.6 | 102.7 – 112.7 | 12 | 12 | — |
| 15 | run.cloud | 148.1 | 106.8 – 167.6 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 42.23 | 41.95 – 42.33 | 12 | 12 | — |
| 2 | boat | 47.72 | 46.81 – 50.5 | 12 | 12 | — |
| 3 | Namespace | 53.2 | 50.45 – 54.51 | 12 | 12 | — |
| 3 | Daytona (VM) | 55.7 | 52.88 – 57.13 | 12 | 12 | tied |
| 5 | Modal (VM) | 62.96 | 61.24 – 68.95 | 12 | 12 | — |
| 5 | Novita | 65.02 | 63.03 – 67.02 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 67.84 | 63.05 – 72.15 | 12 | 12 | tied |
| 5 | Blaxel | 71.23 | 68 – 74.65 | 12 | 12 | tied |
| 9 | tama | 75.89 | 69.19 – 79.14 | 4 | 4 | — |
| 10 | Vercel Sandbox | 92.66 | 91.61 – 95.37 | 12 | 12 | — |
| 11 | E2B | 100.1 | 98.66 – 102.5 | 12 | 12 | — |
| 11 | Modal (gVisor) | 100.2 | 98.63 – 101.4 | 12 | 12 | tied |
| 13 | Freestyle | 113.9 | 113 – 117.5 | 12 | 12 | — |
| 13 | run.cloud | 120.4 | 93.63 – 135.8 | 12 | 12 | tied |
| 15 | Runloop | 208.6 | 150 – 211.1 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Brezel leads · Namespace is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 8.094 | 8.024 – 8.329 | 12 | 12 | — |
| 2 | Namespace | 10.22 | 10.01 – 10.7 | 12 | 12 | — |
| 3 | Daytona (VM) | 11.2 | 10.82 – 11.53 | 12 | 12 | — |
| 4 | Novita | 12.89 | 12.81 – 13.52 | 12 | 12 | — |
| 4 | Blaxel | 13.41 | 12.77 – 13.78 | 12 | 12 | tied |
| 4 | boat | 13.65 | 13.08 – 14.73 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 14.63 | 14.03 – 15.54 | 12 | 12 | tied |
| 8 | Modal (VM) | 18.04 | 15.65 – 23.17 | 12 | 12 | — |
| 8 | tama | 18.55 | 16.05 – 21.35 | 4 | 4 | tied |
| 8 | E2B | 20.09 | 19.3 – 20.93 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 20.24 | 19.61 – 22.27 | 12 | 12 | tied |
| 12 | Modal (gVisor) | 25.31 | 24.44 – 26.81 | 12 | 12 | — |
| 13 | Runloop | 29.8 | 27.28 – 30.42 | 12 | 12 | — |
| 13 | run.cloud | 32.01 | 28.04 – 36.52 | 12 | 12 | tied |
| 13 | Freestyle | 38.16 | 30.22 – 40.15 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.573 | 0.5405 – 0.618 | 12 | 12 | — |
| 2 | Blaxel | 0.7355 | 0.6835 – 0.755 | 12 | 12 | — |
| 3 | Vercel Sandbox | 0.8115 | 0.792 – 0.862 | 12 | 12 | — |
| 4 | tama | 1.007 | 0.921 – 1.693 | 4 | 4 | — |
| 4 | Microsandbox Cloud | 1.089 | 1.059 – 1.098 | 12 | 12 | tied |
| 6 | Daytona (VM) | 1.358 | 1.15 – 1.734 | 12 | 12 | — |
| 6 | Modal (gVisor) | 1.453 | 1.323 – 1.49 | 12 | 12 | tied |
| 6 | E2B | 1.48 | 1.417 – 1.575 | 12 | 12 | tied |
| 9 | boat | 1.702 | 1.631 – 1.954 | 12 | 12 | — |
| 9 | Modal (VM) | 1.792 | 0.8055 – 2.013 | 12 | 12 | tied |
| 9 | Brezel | 1.911 | 1.876 – 1.943 | 12 | 12 | tied |
| 9 | Novita | 1.945 | 1.836 – 2.018 | 12 | 12 | tied |
| 9 | Runloop | 2.371 | 1.71 – 3.954 | 12 | 12 | tied |
| 9 | run.cloud | 3.218 | 2.169 – 7.687 | 12 | 12 | tied |
| 15 | Freestyle | 11.8 | 3.753 – 22.43 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2.2 | 2.171 – 2.216 | 12 | 12 | — |
| 2 | boat | 2.347 | 2.293 – 2.401 | 12 | 12 | — |
| 3 | Namespace | 2.537 | 2.492 – 2.662 | 12 | 12 | — |
| 4 | Daytona (VM) | 2.992 | 2.829 – 3.146 | 12 | 12 | — |
| 5 | Novita | 3.272 | 3.159 – 3.452 | 12 | 12 | — |
| 5 | Modal (VM) | 3.287 | 3.171 – 3.599 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 3.414 | 3.166 – 3.691 | 12 | 12 | tied |
| 5 | Blaxel | 3.522 | 3.432 – 3.617 | 12 | 12 | tied |
| 9 | tama | 4.364 | 3.537 – 4.549 | 4 | 4 | — |
| 9 | Vercel Sandbox | 4.381 | 4.272 – 4.47 | 12 | 12 | tied |
| 11 | E2B | 4.958 | 4.864 – 5.14 | 12 | 12 | — |
| 12 | run.cloud | 5.761 | 5.191 – 6.808 | 12 | 12 | — |
| 12 | Freestyle | 5.928 | 5.753 – 6.109 | 12 | 12 | tied |
| 14 | Modal (gVisor) | 7.849 | 7.631 – 8.177 | 12 | 12 | — |
| 14 | Runloop | 9.548 | 6.818 – 10.04 | 12 | 12 | tied |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 6.851 | 6.821 – 6.879 | 12 | 12 | — |
| 2 | boat | 7.473 | 7.255 – 7.804 | 12 | 12 | — |
| 3 | Daytona (VM) | 10.19 | 9.48 – 10.79 | 12 | 12 | — |
| 3 | Namespace | 10.51 | 9.52 – 11.2 | 12 | 12 | tied |
| 3 | Modal (VM) | 10.87 | 10.54 – 12.3 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 10.93 | 10.17 – 14 | 12 | 12 | tied |
| 3 | Novita | 11.12 | 10.99 – 11.87 | 12 | 12 | tied |
| 3 | Blaxel | 11.46 | 10.88 – 11.8 | 12 | 12 | tied |
| 9 | tama | 13.59 | 13.37 – 15.02 | 4 | 4 | — |
| 10 | Vercel Sandbox | 15.03 | 14.63 – 15.19 | 12 | 12 | — |
| 11 | Modal (gVisor) | 17.39 | 17.26 – 17.69 | 12 | 12 | — |
| 12 | E2B | 18.57 | 17.46 – 18.97 | 12 | 12 | — |
| 12 | run.cloud | 19.14 | 17.45 – 21.89 | 12 | 12 | tied |
| 12 | Freestyle | 20.02 | 19.91 – 20.23 | 12 | 12 | tied |
| 15 | Runloop | 28.06 | 23.75 – 28.83 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2.023 | 1.996 – 2.046 | 12 | 12 | — |
| 2 | boat | 2.154 | 2.088 – 2.237 | 12 | 12 | — |
| 3 | Namespace | 2.348 | 2.218 – 2.583 | 12 | 12 | — |
| 4 | Daytona (VM) | 2.651 | 2.547 – 2.936 | 12 | 12 | — |
| 5 | Modal (VM) | 2.977 | 2.839 – 3.323 | 12 | 12 | — |
| 5 | Novita | 3.019 | 2.976 – 3.186 | 12 | 12 | tied |
| 5 | Blaxel | 3.123 | 2.958 – 3.222 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 3.197 | 2.724 – 3.883 | 12 | 12 | tied |
| 5 | tama | 3.68 | 3.556 – 3.877 | 4 | 4 | tied |
| 10 | Vercel Sandbox | 4.511 | 4.385 – 4.566 | 12 | 12 | — |
| 11 | Modal (gVisor) | 4.687 | 4.545 – 4.746 | 12 | 12 | — |
| 11 | run.cloud | 4.738 | 4.091 – 5.999 | 12 | 12 | tied |
| 11 | E2B | 5.123 | 4.412 – 5.378 | 12 | 12 | tied |
| 14 | Freestyle | 5.798 | 5.706 – 5.944 | 12 | 12 | — |
| 15 | Runloop | 8.042 | 7.391 – 8.251 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1.774 | 1.764 – 1.788 | 12 | 12 | — |
| 2 | Namespace | 2.135 | 2.103 – 2.315 | 12 | 12 | — |
| 3 | boat | 2.356 | 2.271 – 2.461 | 12 | 12 | — |
| 3 | Daytona (VM) | 2.445 | 2.392 – 2.504 | 12 | 12 | tied |
| 5 | Novita | 2.635 | 2.567 – 2.734 | 12 | 12 | — |
| 6 | Modal (VM) | 2.823 | 2.764 – 3.068 | 12 | 12 | — |
| 6 | Blaxel | 2.861 | 2.686 – 2.982 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 2.962 | 2.654 – 3.559 | 12 | 12 | tied |
| 6 | tama | 3.005 | 2.931 – 3.192 | 4 | 4 | tied |
| 10 | Vercel Sandbox | 3.713 | 3.646 – 3.84 | 12 | 12 | — |
| 11 | E2B | 4.098 | 3.923 – 4.268 | 12 | 12 | — |
| 12 | run.cloud | 4.511 | 4.131 – 5.455 | 12 | 12 | — |
| 13 | Freestyle | 5.755 | 5.668 – 5.801 | 12 | 12 | — |
| 14 | Modal (gVisor) | 6.141 | 6.025 – 6.546 | 12 | 12 | — |
| 15 | Runloop | 9.306 | 7.154 – 9.742 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 4.865 | 4.86 – 4.871 | 12 | 12 | — |
| 2 | boat | 5.292 | 5.153 – 5.495 | 12 | 12 | — |
| 3 | Namespace | 6.104 | 5.796 – 6.668 | 12 | 12 | — |
| 3 | Daytona (VM) | 6.59 | 6.405 – 7.041 | 12 | 12 | tied |
| 5 | Modal (VM) | 7.295 | 7.143 – 8.249 | 12 | 12 | — |
| 5 | Novita | 7.735 | 7.54 – 8.012 | 12 | 12 | tied |
| 5 | Blaxel | 7.874 | 7.55 – 8.259 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 7.967 | 6.863 – 9.798 | 12 | 12 | tied |
| 5 | tama | 10.48 | 10.27 – 10.89 | 4 | 4 | tied |
| 10 | Vercel Sandbox | 11.51 | 11.03 – 12.22 | 12 | 12 | — |
| 10 | Modal (gVisor) | 11.77 | 11.41 – 11.99 | 12 | 12 | tied |
| 12 | E2B | 13.15 | 12.54 – 13.61 | 12 | 12 | — |
| 12 | Freestyle | 13.62 | 13.33 – 13.7 | 12 | 12 | tied |
| 12 | run.cloud | 14.47 | 13.19 – 17.88 | 12 | 12 | tied |
| 15 | Runloop | 22.51 | 18.44 – 23.91 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 20.62 | 20.4 – 20.74 | 12 | 12 | — |
| 2 | boat | 23.3 | 22.57 – 24.64 | 12 | 12 | — |
| 3 | Daytona (VM) | 25.78 | 24.28 – 26.75 | 12 | 12 | — |
| 4 | Modal (VM) | 27.91 | 27.53 – 31.73 | 12 | 12 | — |
| 4 | Namespace | 29.29 | 28.16 – 32.33 | 12 | 12 | tied |
| 4 | Novita | 30.53 | 30 – 31.97 | 12 | 12 | tied |
| 4 | tama | 32.48 | 31.52 – 34.72 | 4 | 4 | tied |
| 4 | Microsandbox Cloud | 33.72 | 31.14 – 45.13 | 12 | 12 | tied |
| 4 | Blaxel | 35.28 | 32.38 – 36.73 | 12 | 12 | tied |
| 10 | Vercel Sandbox | 46.08 | 43.88 – 46.84 | 12 | 12 | — |
| 10 | E2B | 50.68 | 45.39 – 53.68 | 12 | 12 | tied |
| 12 | Freestyle | 53.13 | 52.57 – 54.11 | 12 | 12 | — |
| 13 | run.cloud | 68.99 | 67.29 – 77.69 | 12 | 12 | — |
| 14 | Modal (gVisor) | 87.85 | 83.74 – 95.77 | 12 | 12 | — |
| 14 | Runloop | 113.9 | 78.57 – 118.7 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 27.57 | 27.11 – 27.76 | 12 | 12 | — |
| 2 | boat | 29.85 | 28.85 – 31.44 | 12 | 12 | — |
| 3 | Namespace | 33.6 | 33.01 – 34.4 | 12 | 12 | — |
| 4 | Daytona (VM) | 37.7 | 36.39 – 38.96 | 12 | 12 | — |
| 5 | Modal (VM) | 42.8 | 42.05 – 48.85 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 43.6 | 41.91 – 52.6 | 12 | 12 | tied |
| 5 | Novita | 43.78 | 42.82 – 44.66 | 12 | 12 | tied |
| 8 | Blaxel | 49.18 | 46.14 – 51.66 | 12 | 12 | — |
| 9 | tama | 57.52 | 55.09 – 63.51 | 4 | 4 | — |
| 10 | Modal (gVisor) | 64.21 | 62.8 – 69.83 | 12 | 12 | — |
| 10 | Vercel Sandbox | 67.4 | 65.95 – 70.34 | 12 | 12 | tied |
| 10 | E2B | 77.11 | 67.98 – 79.36 | 12 | 12 | tied |
| 13 | Freestyle | 83.12 | 81.46 – 84.08 | 12 | 12 | — |
| 13 | run.cloud | 92.77 | 82.02 – 110.8 | 12 | 12 | tied |
| 15 | Runloop | 127.4 | 110.8 – 130.2 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 50.63 | 50.56 – 50.73 | 12 | 12 | — |
| 2 | boat | 57.29 | 55.44 – 59.91 | 12 | 12 | — |
| 2 | Namespace | 59.28 | 58.39 – 63.33 | 12 | 12 | tied |
| 4 | Daytona (VM) | 68.59 | 65.47 – 71.47 | 12 | 12 | — |
| 5 | Novita | 76.25 | 75.01 – 77.22 | 12 | 12 | — |
| 5 | Modal (VM) | 77.2 | 76.12 – 85.94 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 78.98 | 71.48 – 83.6 | 12 | 12 | tied |
| 5 | Blaxel | 82.62 | 79.85 – 83.84 | 12 | 12 | tied |
| 9 | tama | 95.67 | 89.5 – 100.8 | 12 | 12 | — |
| 10 | Vercel Sandbox | 112.3 | 109.7 – 114.3 | 12 | 12 | — |
| 10 | E2B | 127.2 | 111.3 – 133.4 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 128.3 | 125.4 – 131.9 | 11 | 11 | tied |
| 10 | run.cloud | 138.2 | 108.9 – 140.2 | 12 | 12 | tied |
| 10 | Freestyle | 139 | 136.1 – 141 | 12 | 12 | tied |
| 15 | Runloop | 191.4 | 184.4 – 198.9 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Namespace, Daytona (VM) and Microsandbox Cloud share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.093 | 1.701 – 2.203 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.103 | 1.789 – 2.768 | 12 | 12 | tied |
| 1 | Microsandbox Cloud | 2.139 | 2.05 – 2.195 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 2.393 | 2.305 – 2.483 | 12 | 12 | — |
| 4 | Blaxel | 2.41 | 2.288 – 3.35 | 12 | 12 | tied |
| 4 | Modal (VM) | 2.551 | 2.117 – 3.472 | 12 | 12 | tied |
| 4 | tama | 2.743 | 2.385 – 3.439 | 12 | 12 | tied |
| 8 | boat | 3.487 | 3.129 – 4.88 | 12 | 12 | — |
| 8 | Novita | 3.584 | 3.181 – 3.94 | 12 | 12 | tied |
| 8 | E2B | 3.64 | 3.427 – 4.24 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 3.746 | 3.308 – 4.227 | 11 | 11 | tied |
| 12 | Brezel | 4.423 | 4.328 – 4.683 | 12 | 12 | — |
| 12 | run.cloud | 6.959 | 3.385 – 13.51 | 12 | 12 | tied |
| 12 | Runloop | 7.607 | 4.808 – 11.76 | 12 | 12 | tied |
| 12 | Freestyle | 12.11 | 6.902 – 29.88 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 61.19 | 61.02 – 61.32 | 12 | 12 | — |
| 2 | boat | 68.64 | 66.71 – 73 | 12 | 12 | — |
| 3 | Namespace | 75.91 | 73.27 – 83.78 | 12 | 12 | — |
| 4 | Daytona (VM) | 91.52 | 83.2 – 96.08 | 12 | 12 | — |
| 5 | Novita | 97.09 | 95.66 – 98.46 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 99.44 | 88.95 – 119.5 | 12 | 12 | tied |
| 5 | Modal (VM) | 99.46 | 96.67 – 109.2 | 12 | 12 | tied |
| 5 | Blaxel | 101.9 | 98.42 – 107.9 | 12 | 12 | tied |
| 9 | tama | 123.5 | 105.7 – 139.5 | 12 | 12 | — |
| 10 | Vercel Sandbox | 143.7 | 138 – 145.2 | 12 | 12 | — |
| 11 | Modal (gVisor) | 149.2 | 146.9 – 152.8 | 11 | 11 | — |
| 11 | E2B | 165.9 | 137.7 – 173.9 | 12 | 12 | tied |
| 11 | Freestyle | 171.1 | 169.3 – 173.6 | 12 | 12 | tied |
| 11 | run.cloud | 181.1 | 144.3 – 185.6 | 12 | 12 | tied |
| 15 | Runloop | 231.3 | 225.9 – 266.6 | 12 | 12 | — |

### Mastra: test:core

Seconds · lower is better

_Brezel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 768.6 | 765.9 – 772.3 | 12 | 12 | — |
| 2 | boat | 806.2 | 794.9 – 856.5 | 12 | 12 | — |
| 3 | Namespace | 876.1 | 852.9 – 901.5 | 12 | 12 | — |
| 4 | Daytona (VM) | 910.8 | 898.5 – 988.5 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 949.3 | 930 – 1022 | 12 | 12 | — |
| 6 | Modal (VM) | 979.8 | 973.4 – 1049 | 12 | 12 | — |
| 6 | Blaxel | 1008 | 990.7 – 1022 | 12 | 12 | tied |
| 6 | Novita | 1009 | 1001 – 1014 | 12 | 12 | tied |
| 9 | tama | 1155 | 1091 – 1173 | 12 | 12 | — |
| 10 | Vercel Sandbox | 1272 | 1263 – 1289 | 12 | 12 | — |
| 11 | Modal (gVisor) | 1415 | 1408 – 1451 | 11 | 11 | — |
| 11 | E2B | 1418 | 1330 – 1464 | 12 | 12 | tied |
| 13 | Freestyle | 1501 | 1489 – 1508 | 12 | 12 | — |
| 14 | run.cloud | 1658 | 1350 – 1699 | 12 | 12 | — |
| 15 | Runloop | 1807 | 1781 – 1934 | 11 | 11 | — |

### OpenClaw: cold install

Seconds · lower is better

_Brezel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 9.103 | 8.802 – 9.962 | 12 | 12 | — |
| 2 | Namespace | 10.66 | 10.5 – 10.87 | 12 | 12 | — |
| 3 | Daytona (VM) | 12.47 | 12.12 – 13.51 | 12 | 12 | — |
| 3 | Blaxel | 12.64 | 11.75 – 13.07 | 12 | 12 | tied |
| 5 | Novita | 15.12 | 14.4 – 15.63 | 12 | 12 | — |
| 6 | Modal (VM) | 17.02 | 15.45 – 19.81 | 11 | 11 | — |
| 6 | Microsandbox Cloud | 17.33 | 15.54 – 25.93 | 12 | 12 | tied |
| 6 | boat | 17.7 | 17.1 – 18.11 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 18.38 | 17.91 – 19.27 | 12 | 12 | — |
| 10 | E2B | 20.32 | 19.91 – 21.73 | 12 | 12 | — |
| 11 | Modal (gVisor) | 24.84 | 21.35 – 29.44 | 12 | 12 | — |
| 11 | run.cloud | 25.4 | 22.95 – 26.46 | 8 | 8 | tied |
| 11 | Runloop | 27.9 | 24.61 – 28.69 | 12 | 12 | tied |
| 14 | Freestyle | 46.17 | 27.48 – 56.02 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.255 | 2.167 – 4.54 | 12 | 12 | — |
| 2 | Blaxel | 2.795 | 2.717 – 3.097 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.269 | 3.126 – 5.623 | 12 | 12 | — |
| 3 | Vercel Sandbox | 3.61 | 3.591 – 3.891 | 12 | 12 | tied |
| 5 | boat | 4.518 | 4.383 – 5.072 | 12 | 12 | — |
| 5 | Novita | 4.719 | 4.135 – 6.204 | 12 | 12 | tied |
| 5 | Daytona (VM) | 4.952 | 3.43 – 8.349 | 12 | 12 | tied |
| 5 | E2B | 4.97 | 4.54 – 7.314 | 12 | 12 | tied |
| 5 | Modal (VM) | 5.036 | 4.258 – 9.108 | 11 | 11 | tied |
| 5 | Modal (gVisor) | 5.674 | 5.116 – 9.832 | 12 | 12 | tied |
| 5 | Runloop | 8.421 | 5.934 – 11.64 | 12 | 12 | tied |
| 5 | Brezel | 8.658 | 8.572 – 8.819 | 12 | 12 | tied |
| 13 | run.cloud | 9.883 | 9.632 – 10.89 | 8 | 8 | — |
| 14 | Freestyle | 33.58 | 16.51 – 45.37 | 12 | 12 | — |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 99.06 | 98.63 – 99.54 | 12 | 12 | — |
| 2 | boat | 109.5 | 107.1 – 123.9 | 12 | 12 | — |
| 3 | Namespace | 148.1 | 145 – 153.6 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 151.6 | 148.8 – 166.4 | 12 | 12 | tied |
| 3 | Daytona (VM) | 155.8 | 144.5 – 160.1 | 12 | 12 | tied |
| 6 | Blaxel | 168.9 | 166.4 – 170.5 | 12 | 12 | — |
| 7 | Modal (VM) | 172.3 | 169.3 – 187.5 | 11 | 11 | — |
| 7 | Novita | 179.1 | 173.9 – 181.9 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 228.3 | 224.3 – 233.4 | 12 | 12 | — |
| 9 | Modal (gVisor) | 234 | 226.8 – 250.2 | 12 | 12 | tied |
| 11 | Freestyle | 286.9 | 275.5 – 292.3 | 12 | 12 | — |
| 11 | run.cloud | 292.7 | 169.6 – 331.3 | 8 | 8 | tied |
| 11 | E2B | 310.6 | 262.5 – 326.6 | 12 | 12 | tied |
| 14 | Runloop | 381.3 | 341.1 – 386.6 | 12 | 12 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 184.5 | 183.7 – 187 | 12 | 12 | — |
| 2 | boat | 205.9 | 197.7 – 216.9 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 286.7 | 278.7 – 319.4 | 12 | 12 | — |
| 3 | Daytona (VM) | 287.7 | 277.2 – 293.1 | 12 | 12 | tied |
| 3 | Namespace | 288 | 285.8 – 292.4 | 12 | 12 | tied |
| 6 | Blaxel | 317.9 | 307 – 328.1 | 12 | 12 | — |
| 7 | Modal (VM) | 340 | 330.2 – 353.6 | 11 | 11 | — |
| 7 | Novita | 346.2 | 338 – 357.7 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 410.6 | 405.6 – 424 | 12 | 12 | — |
| 9 | Modal (gVisor) | 422.6 | 410.4 – 436.6 | 12 | 12 | tied |
| 11 | run.cloud | 493.1 | 469.5 – 676.3 | 8 | 8 | — |
| 11 | Freestyle | 543 | 539.9 – 547.5 | 12 | 12 | tied |
| 11 | E2B | 607.5 | 516.2 – 626.3 | 12 | 12 | tied |
| 14 | Runloop | 699.5 | 599.6 – 708.3 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Brezel leads · boat is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 67.38 | 66.86 – 68.03 | 12 | 12 | — |
| 2 | boat | 77.52 | 74.22 – 82.85 | 12 | 12 | — |
| 3 | Daytona (VM) | 93.22 | 90.31 – 95.98 | 12 | 12 | — |
| 4 | Namespace | 102.4 | 102 – 103 | 12 | 12 | — |
| 5 | Modal (VM) | 105.9 | 102.5 – 119.2 | 11 | 11 | — |
| 5 | Blaxel | 105.9 | 103.8 – 112.1 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 107.2 | 106.1 – 109.2 | 12 | 12 | tied |
| 8 | Novita | 115.7 | 109.9 – 117.5 | 12 | 12 | — |
| 9 | run.cloud | 133.8 | 123.4 – 234 | 8 | 8 | — |
| 9 | Modal (gVisor) | 148.7 | 141 – 153.9 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 151.5 | 149.4 – 158.6 | 12 | 12 | tied |
| 12 | E2B | 185.3 | 160.2 – 200.9 | 12 | 12 | — |
| 12 | Freestyle | 194.1 | 187.5 – 196.8 | 12 | 12 | tied |
| 14 | Runloop | 262.6 | 225.1 – 271 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Brezel leads · boat is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 11.55 | 11.4 – 11.78 | 12 | 12 | — |
| 2 | boat | 12.93 | 12.66 – 13.69 | 12 | 12 | — |
| 3 | Daytona (VM) | 16.79 | 15.99 – 17.32 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 18.02 | 17.37 – 19.44 | 12 | 12 | — |
| 4 | Blaxel | 18.44 | 17.57 – 19.21 | 12 | 12 | tied |
| 4 | Namespace | 18.54 | 18.37 – 20.85 | 12 | 12 | tied |
| 4 | Modal (VM) | 18.59 | 17.15 – 20.84 | 11 | 11 | tied |
| 8 | Novita | 21.37 | 21 – 22.12 | 12 | 12 | — |
| 9 | Modal (gVisor) | 24.88 | 23.18 – 26.03 | 12 | 12 | — |
| 9 | Vercel Sandbox | 25.84 | 24.9 – 26.6 | 12 | 12 | tied |
| 9 | run.cloud | 27.41 | 18.27 – 39.66 | 8 | 8 | tied |
| 9 | Freestyle | 34.84 | 34.13 – 35.86 | 12 | 12 | tied |
| 9 | E2B | 35.14 | 32.58 – 39.17 | 12 | 12 | tied |
| 14 | Runloop | 44 | 39.37 – 46.42 | 12 | 12 | — |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Brezel leads · ~1.1× boat on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 30.06 | 29.91 – 30.18 | 5 | 10 | — |
| 2 | boat | 28.06 | 23.27 – 28.22 | 5 | 10 | — |
| 2 | Namespace | 24.9 | 20.62 – 26.3 | 5 | 10 | tied |
| 2 | Daytona (VM) | 21.52 | 18.84 – 22.34 | 5 | 10 | tied |
| 2 | Microsandbox Cloud | 21.34 | 17.73 – 22.65 | 5 | 10 | tied |
| 2 | Novita | 20.16 | 19.51 – 21.09 | 5 | 10 | tied |
| 7 | tama | 18.69 | 17.74 – 19.46 | 5 | 10 | — |
| 7 | Blaxel | 18.03 | 17.37 – 22.02 | 5 | 10 | tied |
| 7 | Modal (VM) | 15.48 | 15.29 – 19.27 | 5 | 10 | tied |
| 7 | run.cloud | 13.89 | 11.84 – 18.59 | 5 | 10 | tied |
| 7 | Vercel Sandbox | 12.66 | 12.13 – 13 | 5 | 10 | tied |
| 7 | Modal (gVisor) | 12.6 | 12.25 – 12.86 | 5 | 10 | tied |
| 7 | E2B | 11.08 | 10.93 – 13.4 | 5 | 10 | tied |
| 14 | Freestyle | 10.22 | 10.04 – 10.47 | 5 | 10 | — |
| 15 | Runloop | 8.93 | 8.72 – 9.53 | 5 | 10 | — |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, O_DIRECT (MB/s): 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, O_DIRECT (MB/s)</summary>

### fio rand write 4KB, O_DIRECT (MB/s) _(headline)_

MB/s · higher is better

_Brezel leads · ~1.9× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 2564 | 2362 – 2676 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1350 | 1156 – 1455 | 3 | 6 | too few sandboxes |
| 3 | boat | 1210 | 1115 – 1279 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 1074 | 951.1 – 1093 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 801.1 | 755 – 824.2 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 752.9 | 498.1 – 779.1 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 749.7 | 742.9 – 752.9 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 731.9 | 588.3 – 1161 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 636.5 | 628.1 – 650.1 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 432 | 421 – 439.9 | 3 | 6 | too few sandboxes |
| 11 | Novita | 324.5 | 323 – 339.2 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 284.2 | 271.1 – 523.2 | 3 | 6 | too few sandboxes |
| 13 | tama | 262.7 | 245.4 – 275.3 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 202.9 | 199.8 – 319.8 | 3 | 6 | too few sandboxes |
| 15 | E2B | 200.8 | 199.8 – 243.8 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Brezel leads · ~1.1× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, O_DIRECT (IOPS): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 443500 | 295000 – 589500 | 3 | 6 | — |
| 2 | boat | 391000 | 345000 – 421000 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 255500 | 252500 – 258500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 233000 | 210000 – 241000 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 232500 | 230000 – 303000 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 229500 | 206500 – 302500 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 179000 | 137500 – 186500 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 161500 | 159000 – 166000 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 153000 | 140000 – 164000 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 128000 | 125500 – 139500 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 92450 | 92050 – 132500 | 3 | 6 | too few sandboxes |
| 12 | tama | 85050 | 80150 – 98200 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 82800 | 82700 – 88500 | 3 | 6 | too few sandboxes |
| 14 | Novita | 79750 | 74100 – 79900 | 3 | 6 | too few sandboxes |
| 15 | E2B | 46800 | 46750 – 59650 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Brezel leads · ~1.1× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, O_DIRECT (MB/s): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1816 | 1210 – 2413 | 3 | 6 | — |
| 2 | boat | 1602 | 1413 – 1723 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 1046 | 1034 – 1057 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 954.7 | 860.9 – 986.2 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 951.6 | 940.6 – 1241 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 940.6 | 845.2 – 1239 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 733.5 | 564.1 – 763.9 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 660.6 | 649.6 – 679.5 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 626 | 574.1 – 671.6 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 525.3 | 514.9 – 572 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 379.1 | 377.5 – 543.2 | 3 | 6 | too few sandboxes |
| 12 | tama | 348.1 | 328.2 – 403.2 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 339.2 | 338.7 – 362.3 | 3 | 6 | too few sandboxes |
| 14 | Novita | 326.6 | 303.6 – 327.2 | 3 | 6 | too few sandboxes |
| 15 | E2B | 191.9 | 191.4 – 244.3 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Brezel leads · ~1.9× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, O_DIRECT (IOPS): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 626000 | 576500 – 653500 | 3 | 6 | — |
| 2 | Vercel Sandbox | 329500 | 282500 – 355000 | 3 | 6 | too few sandboxes |
| 3 | boat | 295500 | 272000 – 312500 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 262500 | 232500 – 267000 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 195500 | 184500 – 201500 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 183500 | 181500 – 184000 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 183500 | 122000 – 190000 | 3 | 6 | too few sandboxes, equal medians |
| 8 | Modal (VM) | 179000 | 143500 – 283500 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 155000 | 153500 – 159000 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 105500 | 102950 – 107000 | 3 | 6 | too few sandboxes |
| 11 | Novita | 79200 | 78750 – 82800 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 69400 | 66200 – 128000 | 3 | 6 | too few sandboxes |
| 13 | tama | 64050 | 59950 – 67300 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 49500 | 48800 – 78150 | 3 | 6 | too few sandboxes |
| 15 | E2B | 49000 | 48750 – 59500 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.7× Brezel on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, O_DIRECT (IOPS): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 44800 | 44050 – 46850 | 3 | 6 | — |
| 2 | Brezel | 16600 | 15800 – 17200 | 3 | 6 | too few sandboxes |
| 3 | boat | 14800 | 12500 – 16350 | 3 | 6 | too few sandboxes |
| 4 | Novita | 11450 | 10550 – 12650 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 10540 | 10350 – 15500 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 9340 | 8293 – 24150 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 8014 | 4649 – 9581 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 7181 | 6156 – 7200 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 4949 | 4919 – 5221 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 4340 | 4273 – 4395 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 2346 | 2321 – 2383 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1993 | 1707 – 2350 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 1011 | 993.5 – 1573 | 3 | 6 | too few sandboxes |
| 14 | tama | 618 | 566 – 1366 | 3 | 6 | too few sandboxes |
| 15 | E2B | 599.5 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~2.7× Brezel on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, O_DIRECT (MB/s): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 46920 | 46170 – 49120 | 3 | 6 | — |
| 2 | Brezel | 17450 | 16590 – 18040 | 3 | 6 | too few sandboxes |
| 3 | boat | 15520 | 13100 – 17130 | 3 | 6 | too few sandboxes |
| 4 | Novita | 11970 | 11010 – 13260 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 11050 | 10900 – 16320 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 9795 | 8697 – 25340 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 8405 | 4876 – 10030 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 7531 | 6457 – 7551 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 5191 | 5159 – 5476 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 4552 | 4482 – 4610 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 2461 | 2435 – 2500 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 2091 | 1790 – 2465 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 1062 | 1043 – 1650 | 3 | 6 | too few sandboxes |
| 14 | tama | 649.6 | 595.1 – 1434 | 3 | 6 | too few sandboxes |
| 15 | E2B | 630.2 | 630.2 – 630.7 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Brezel leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, O_DIRECT (IOPS): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 7919 | 7885 – 8018 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 7888 | 6784 – 20000 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 6728 | 5359 – 7443 | 3 | 6 | too few sandboxes |
| 4 | Novita | 6399 | 6343 – 6519 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 6044 | 5827 – 6907 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 4122 | 3355 – 4144 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3640 | 3511 – 4990 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 3077 | 2777 – 3113 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 2742 | 2316 – 2973 | 3 | 6 | too few sandboxes |
| 10 | boat | 2350 | 1939 – 4383 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 1937 | 1741 – 2010 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1296 | 1276 – 1964 | 3 | 6 | too few sandboxes |
| 13 | tama | 930 | 888 – 1402 | 3 | 6 | too few sandboxes |
| 14 | Modal (VM) | 814 | 798.5 – 1137 | 3 | 6 | too few sandboxes |
| 15 | E2B | 599.5 | 599 – 600 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Brezel leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, O_DIRECT (MB/s): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 8305 | 8270 – 8409 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 8272 | 7115 – 20990 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 7057 | 5620 – 7807 | 3 | 6 | too few sandboxes |
| 4 | Novita | 6711 | 6652 – 6838 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 6339 | 6111 – 7244 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 4324 | 3520 – 4346 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 3819 | 3683 – 5234 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 3228 | 2913 – 3266 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 2876 | 2430 – 3119 | 3 | 6 | too few sandboxes |
| 10 | boat | 2465 | 2035 – 4597 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 2033 | 1828 – 2110 | 3 | 6 | too few sandboxes |
| 12 | Runloop | 1360 | 1339 – 2060 | 3 | 6 | too few sandboxes |
| 13 | tama | 976.7 | 933.2 – 1471 | 3 | 6 | too few sandboxes |
| 14 | Modal (VM) | 855.6 | 838.9 – 1193 | 3 | 6 | too few sandboxes |
| 15 | E2B | 630.2 | 629.7 – 630.7 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.4× Blaxel on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 24.61 | 22.73 – 24.96 | 3 | 6 | — |
| 2 | Blaxel | 17.71 | 17.16 – 18.29 | 3 | 6 | too few sandboxes |
| 3 | Brezel | 16.62 | 16.55 – 16.68 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 15.31 | 14.8 – 15.34 | 3 | 6 | too few sandboxes |
| 5 | Runloop | 15.12 | 14.96 – 15.3 | 3 | 6 | too few sandboxes |
| 6 | Novita | 11.49 | 11.47 – 11.51 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 10.98 | 10.84 – 11 | 3 | 6 | too few sandboxes |
| 8 | boat | 9.93 | 9.615 – 10.31 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 8.475 | 8.275 – 8.655 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 8.075 | 8.055 – 28.62 | 3 | 6 | too few sandboxes |
| 11 | tama | 8.035 | 7.82 – 8.125 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 7.625 | 4.425 – 7.635 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 4.22 | 4.14 – 4.245 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 3.74 | 3.74 – 4.08 | 3 | 6 | too few sandboxes |
| 15 | E2B | 1.415 | 1.345 – 1.865 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 176400 | 112900 – 176500 | 3 | 6 | — |
| 2 | tama | 175600 | 145200 – 243000 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 135500 | 132900 – 166900 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 101700 | 98670 – 104300 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 74020 | 56898 – 97690 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 73040 | 72470 – 73120 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 59490 | 56490 – 59880 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 53540 | 53490 – 53910 | 3 | 6 | too few sandboxes |
| 9 | Novita | 53410 | 52430 – 53840 | 3 | 6 | too few sandboxes |
| 10 | E2B | 48960 | 43980 – 51460 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 45689 | 45559 – 45710 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 44940 | 44770 – 45270 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 41630 | 39810 – 45430 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 33180 | 31030 – 33410 | 3 | 6 | too few sandboxes |
| 15 | boat | 32500 | 29850 – 32920 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_tama leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | tama | 189600 | 182200 – 206600 | 3 | 6 | — |
| 2 | Daytona (VM) | 175700 | 113000 – 176200 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 138500 | 131100 – 166700 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 101600 | 98070 – 103684 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 72930 | 72320 – 73010 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 66960 | 48500 – 100500 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 58580 | 55170 – 59330 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 53540 | 53310 – 53760 | 3 | 6 | too few sandboxes |
| 9 | Novita | 53420 | 51830 – 53830 | 3 | 6 | too few sandboxes |
| 10 | E2B | 48950 | 44420 – 51660 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 45650 | 45490 – 45660 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 44950 | 44800 – 45290 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 39240 | 39060 – 44720 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 33060 | 31030 – 33350 | 3 | 6 | too few sandboxes |
| 15 | boat | 32440 | 29920 – 32840 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.1× tama on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 203600 | 134000 – 205300 | 3 | 6 | — |
| 2 | tama | 177520 | 152500 – 221900 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 152500 | 116100 – 170700 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 113000 | 102600 – 114600 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 109200 | 108632 – 109400 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 82610 | 82200 – 83060 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 74790 | 74380 – 79270 | 3 | 6 | too few sandboxes |
| 8 | E2B | 72280 | 67350 – 77810 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 66390 | 51250 – 99060 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 61570 | 61330 – 61700 | 3 | 6 | too few sandboxes |
| 11 | Novita | 58510 | 57400 – 58560 | 3 | 6 | too few sandboxes |
| 12 | Brezel | 48740 | 48670 – 48740 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 43570 | 42080 – 44260 | 3 | 6 | too few sandboxes |
| 14 | boat | 43150 | 39060 – 43890 | 3 | 6 | too few sandboxes |
| 15 | Runloop | 41900 | 39700 – 44030 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 167500 | 103400 – 167700 | 3 | 6 | — |
| 2 | tama | 164200 | 149761 – 197100 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 141300 | 133900 – 157800 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 92810 | 90300 – 95450 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 67020 | 66570 – 67120 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 61690 | 50500 – 90900 | 3 | 6 | too few sandboxes |
| 7 | Freestyle | 51580 | 49760 – 51610 | 3 | 6 | too few sandboxes |
| 8 | Novita | 50850 | 50040 – 51290 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 46320 | 45830 – 46420 | 3 | 6 | too few sandboxes |
| 10 | E2B | 43600 | 39510 – 44770 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 41400 | 41260 – 41420 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 40580 | 40410 – 40860 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 36610 | 35930 – 42070 | 3 | 6 | too few sandboxes |
| 14 | Namespace | 30140 | 28680 – 30250 | 3 | 6 | too few sandboxes |
| 15 | boat | 29610 | 27480 – 29880 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>22 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.1× tama on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 9138 | 8647 – 10250 | 3 | 6 | — |
| 2 | tama | 8043 | 5271 – 10810 | 2 | 4 | too few sandboxes |
| 3 | Daytona (VM) | 6687 | 6580 – 6873 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4785 | 4521 – 5796 | 3 | 6 | too few sandboxes |
| 5 | E2B | 3028 | 1151 – 3461 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 2167 | 1739 – 2322 | 3 | 6 | too few sandboxes |
| 7 | Modal (gVisor) | 1857 | 1749 – 2055 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 1816 | 1732 – 2071 | 3 | 6 | too few sandboxes |
| 9 | Freestyle | 1753 | 1637 – 2013 | 3 | 6 | too few sandboxes |
| 10 | Brezel | 1733 | 1729 – 1734 | 3 | 6 | too few sandboxes |
| 11 | Modal (VM) | 1424 | 528.2 – 2375 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 1165 | 1110 – 1335 | 3 | 6 | too few sandboxes |
| 13 | Microsandbox Cloud | 947.2 | 268.9 – 2038 | 3 | 6 | too few sandboxes |
| 14 | run.cloud | 937 | 933.6 – 937 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_Modal (VM) leads · ~1.1× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5906 | 5878 – 7513 | 3 | 6 | — |
| 2 | Vercel Sandbox | 5149 | 5077 – 5708 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 4670 | 4014 – 5538 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4549 | 3486 – 4753 | 3 | 6 | too few sandboxes |
| 5 | Freestyle | 3503 | 2603 – 3554 | 3 | 6 | too few sandboxes |
| 6 | tama | 2978 | 2058 – 3898 | 2 | 4 | too few sandboxes |
| 7 | Daytona (VM) | 2965 | 2573 – 4082 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 2885 | 2836 – 3815 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 2171 | 1957 – 2182 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 1765 | 1427 – 3603 | 3 | 6 | too few sandboxes |
| 11 | Brezel | 1308 | 1277 – 1309 | 3 | 6 | too few sandboxes |
| 12 | E2B | 1030 | 922 – 1396 | 3 | 6 | too few sandboxes |
| 13 | run.cloud | 934.4 | 934.3 – 934.4 | 3 | 6 | too few sandboxes |
| 14 | Modal (gVisor) | 142.8 | 117.6 – 2961 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Blaxel leads · ~1.1× Novita on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 165500 | 152300 – 167100 | 3 | 6 | — |
| 2 | Novita | 154200 | 153700 – 156800 | 3 | 6 | too few sandboxes |
| 3 | Brezel | 135606 | 134629 – 136600 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 77117 | 74430 – 82360 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 75880 | 64120 – 83060 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 67440 | 66160 – 67560 | 3 | 6 | too few sandboxes |
| 7 | tama | 61680 | 60834 – 62530 | 2 | 4 | too few sandboxes |
| 8 | E2B | 56690 | 48049 – 57810 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 38483 | 35157 – 40170 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 36680 | 36390 – 36980 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 33548 | 28104 – 34459 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 30270 | 15234 – 35870 | 3 | 6 | too few sandboxes |
| 13 | Modal (VM) | 19370 | 17590 – 60850 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 17980 | 16370 – 19480 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Brezel leads · ~1.2× Blaxel on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 201826 | 201500 – 202099 | 3 | 6 | — |
| 2 | Blaxel | 170903 | 169300 – 173200 | 3 | 6 | too few sandboxes |
| 3 | Novita | 155800 | 144200 – 159872 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 95638 | 95221 – 102900 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 86300 | 83390 – 94420 | 3 | 6 | too few sandboxes |
| 6 | E2B | 57036 | 54540 – 57891 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 56970 | 48110 – 60003 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 42100 | 40719 – 43897 | 3 | 6 | too few sandboxes |
| 9 | tama | 39080 | 38886 – 39267 | 2 | 4 | too few sandboxes |
| 10 | Runloop | 34881 | 33400 – 40650 | 3 | 6 | too few sandboxes |
| 11 | run.cloud | 33628 | 29527 – 35639 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 32024 | 15229 – 34530 | 3 | 6 | too few sandboxes |
| 13 | Freestyle | 23686 | 19747 – 29914 | 3 | 6 | too few sandboxes |
| 14 | Modal (VM) | 16719 | 15260 – 59560 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Brezel, Daytona (VM), E2B, Freestyle, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop, tama and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | Brezel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Freestyle | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | tama | 9999 | 9999 – 9999 | 2 | 4 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 14 | Modal (gVisor) | 470 | 428.5 – 484 | 3 | 6 | too few sandboxes |

### github.com HTTPS

ms · lower is better

_Namespace leads · Vercel Sandbox is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_github_com_total_ms.webp" width="960" alt="github.com HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | github.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 22 | 17.65 – 23.23 | 3 | 90 | — |
| 2 | Vercel Sandbox | 25.25 | 22.6 – 25.88 | 3 | 90 | too few sandboxes |
| 3 | tama | 32.23 | 30.06 – 34.39 | 2 | 60 | too few sandboxes |
| 4 | run.cloud | 61.74 | 58.71 – 62.6 | 3 | 90 | too few sandboxes |
| 5 | Modal (VM) | 63.76 | 60.56 – 222.5 | 3 | 90 | too few sandboxes |
| 6 | Modal (gVisor) | 65.83 | 55.87 – 108.2 | 3 | 90 | too few sandboxes |
| 7 | E2B | 70.5 | 68.43 – 102.6 | 3 | 90 | too few sandboxes |
| 8 | Daytona (VM) | 90.49 | 84.68 – 91.67 | 3 | 90 | too few sandboxes |
| 9 | Brezel | 100.9 | 97.06 – 103.8 | 3 | 90 | too few sandboxes |
| 10 | Blaxel | 120.9 | 120.5 – 122.1 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 193.7 | 186.8 – 200.7 | 3 | 90 | too few sandboxes |
| 12 | Microsandbox Cloud | 218.3 | 217.3 – 225.4 | 3 | 90 | too few sandboxes |
| 13 | Runloop | 280.6 | 278.5 – 289.2 | 3 | 90 | too few sandboxes |
| 14 | Novita | 583.3 | 545.9 – 600 | 3 | 90 | too few sandboxes |

### api.github.com HTTPS

ms · lower is better

_Namespace leads · Vercel Sandbox is ~1.7× higher (lower is better)._

<img src="docs/figures/network_https_api_github_com_total_ms.webp" width="960" alt="api.github.com HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | api.github.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.303 | 8.527 – 10.17 | 3 | 90 | — |
| 2 | Vercel Sandbox | 15.67 | 14.61 – 15.96 | 3 | 90 | too few sandboxes |
| 3 | tama | 18.05 | 17.43 – 18.67 | 2 | 60 | too few sandboxes |
| 4 | Modal (VM) | 24.39 | 24.38 – 77.21 | 3 | 90 | too few sandboxes |
| 5 | Modal (gVisor) | 27.47 | 25.49 – 30.53 | 3 | 90 | too few sandboxes |
| 6 | run.cloud | 32.75 | 29.26 – 33.03 | 3 | 90 | too few sandboxes |
| 7 | E2B | 37.57 | 34.13 – 39.22 | 3 | 90 | too few sandboxes |
| 8 | Daytona (VM) | 41.81 | 36.73 – 42.09 | 3 | 90 | too few sandboxes |
| 9 | Runloop | 48.03 | 43.53 – 48.51 | 3 | 90 | too few sandboxes |
| 10 | Brezel | 49.6 | 49.15 – 49.98 | 3 | 90 | too few sandboxes |
| 11 | Blaxel | 56.41 | 56.05 – 56.81 | 3 | 90 | too few sandboxes |
| 12 | Freestyle | 90.34 | 79.98 – 91.6 | 3 | 90 | too few sandboxes |
| 13 | Microsandbox Cloud | 98.25 | 93.35 – 100.1 | 3 | 90 | too few sandboxes |
| 14 | Novita | 192.7 | 192 – 195.8 | 3 | 90 | too few sandboxes |

### raw.githubusercontent.com HTTPS

ms · lower is better

_Brezel leads · Modal (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_raw_githubusercontent_com_total_ms.webp" width="960" alt="raw.githubusercontent.com HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | raw.githubusercontent.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 9.124 | 8.95 – 9.362 | 3 | 90 | — |
| 2 | Modal (VM) | 10.22 | 10.14 – 10.22 | 3 | 90 | too few sandboxes |
| 3 | Microsandbox Cloud | 14.67 | 11.93 – 21.69 | 3 | 90 | too few sandboxes |
| 4 | Vercel Sandbox | 15.72 | 14.16 – 16.66 | 3 | 90 | too few sandboxes |
| 5 | Runloop | 19.78 | 19.73 – 21.16 | 3 | 90 | too few sandboxes |
| 6 | Daytona (VM) | 23.83 | 13.93 – 24.27 | 3 | 90 | too few sandboxes |
| 7 | Namespace | 25.95 | 25.14 – 26.16 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 27.26 | 17.74 – 29.87 | 3 | 90 | too few sandboxes |
| 9 | E2B | 31.21 | 30.87 – 31.29 | 3 | 90 | too few sandboxes |
| 10 | Blaxel | 33.02 | 32.45 – 33.18 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 37.26 | 34.29 – 38.9 | 3 | 90 | too few sandboxes |
| 12 | Novita | 41.36 | 41.16 – 42.29 | 3 | 90 | too few sandboxes |
| 13 | run.cloud | 59.73 | 59.06 – 60.31 | 3 | 90 | too few sandboxes |
| 14 | tama | 219.3 | 219.3 – 219.4 | 2 | 60 | too few sandboxes |

### registry.npmjs.org HTTPS

ms · lower is better

_Namespace leads · Modal (VM) is ~1.3× higher (lower is better)._

<img src="docs/figures/network_https_registry_npmjs_org_total_ms.webp" width="960" alt="registry.npmjs.org HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | registry.npmjs.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 16.22 | 15.27 – 16.34 | 3 | 90 | — |
| 2 | Modal (VM) | 20.71 | 19.03 – 90.19 | 3 | 90 | too few sandboxes |
| 3 | Vercel Sandbox | 22.73 | 22.56 – 25.73 | 3 | 90 | too few sandboxes |
| 4 | Runloop | 25.9 | 25.88 – 26.38 | 3 | 90 | too few sandboxes |
| 5 | Brezel | 29.31 | 29.1 – 29.55 | 3 | 90 | too few sandboxes |
| 6 | Blaxel | 30.47 | 29.87 – 31.18 | 3 | 90 | too few sandboxes |
| 7 | Daytona (VM) | 32.92 | 23.5 – 33.63 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 35.22 | 28.6 – 35.36 | 3 | 90 | too few sandboxes |
| 9 | run.cloud | 44.24 | 43.84 – 45.42 | 3 | 90 | too few sandboxes |
| 10 | E2B | 45.63 | 44.43 – 47.08 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 56.63 | 45.32 – 59.03 | 3 | 90 | too few sandboxes |
| 12 | Microsandbox Cloud | 57.85 | 53.7 – 58.17 | 3 | 90 | too few sandboxes |
| 13 | Novita | 63.66 | 63.25 – 64.12 | 3 | 90 | too few sandboxes |
| 14 | tama | 229.9 | 229.3 – 230.5 | 2 | 60 | too few sandboxes |

### pypi.org HTTPS

ms · lower is better

_Brezel leads · Modal (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_pypi_org_total_ms.webp" width="960" alt="pypi.org HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pypi.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 9.982 | 9.724 – 10.1 | 3 | 90 | — |
| 2 | Modal (VM) | 10.86 | 10.37 – 12 | 3 | 90 | too few sandboxes |
| 3 | Namespace | 15.6 | 15.1 – 29.17 | 3 | 90 | too few sandboxes |
| 4 | Microsandbox Cloud | 16.23 | 13.14 – 17.23 | 3 | 90 | too few sandboxes |
| 5 | Vercel Sandbox | 17.1 | 16.55 – 19.44 | 3 | 90 | too few sandboxes |
| 6 | Runloop | 21.61 | 21.17 – 22.98 | 3 | 90 | too few sandboxes |
| 7 | Daytona (VM) | 25.69 | 15.99 – 25.92 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 29.8 | 19.14 – 34.25 | 3 | 90 | too few sandboxes |
| 9 | run.cloud | 31.7 | 31.42 – 34.06 | 3 | 90 | too few sandboxes |
| 10 | E2B | 33.19 | 32.41 – 33.74 | 3 | 90 | too few sandboxes |
| 11 | Blaxel | 34.97 | 34.78 – 35.16 | 3 | 90 | too few sandboxes |
| 12 | Freestyle | 43.57 | 37.12 – 44.13 | 3 | 89 | too few sandboxes |
| 13 | Novita | 45.99 | 43.68 – 46.56 | 3 | 90 | too few sandboxes |
| 14 | tama | 221.2 | 220.8 – 221.7 | 2 | 60 | too few sandboxes |

### files.pythonhosted.org HTTPS

ms · lower is better

_Modal (VM) leads · Namespace is ~1.2× higher (lower is better)._

<img src="docs/figures/network_https_files_pythonhosted_org_total_ms.webp" width="960" alt="files.pythonhosted.org HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | files.pythonhosted.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9.793 | 9.082 – 10.11 | 3 | 90 | — |
| 2 | Namespace | 11.57 | 8.28 – 24.65 | 3 | 90 | too few sandboxes |
| 3 | Microsandbox Cloud | 13.62 | 10.82 – 14.4 | 3 | 90 | too few sandboxes |
| 4 | Vercel Sandbox | 13.98 | 13.89 – 14.1 | 3 | 90 | too few sandboxes |
| 5 | Brezel | 15.21 | 15.1 – 15.27 | 3 | 90 | too few sandboxes |
| 6 | Daytona (VM) | 22.69 | 13.97 – 23.77 | 3 | 90 | too few sandboxes |
| 7 | Modal (gVisor) | 26.7 | 17.68 – 28.58 | 3 | 90 | too few sandboxes |
| 8 | run.cloud | 29.05 | 29.03 – 31.37 | 3 | 90 | too few sandboxes |
| 9 | Blaxel | 31.93 | 31.86 – 32.24 | 3 | 90 | too few sandboxes |
| 10 | E2B | 32.14 | 31.19 – 32.4 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 35.45 | 32.65 – 37.22 | 3 | 90 | too few sandboxes |
| 12 | Runloop | 37.81 | 31.93 – 38.45 | 3 | 90 | too few sandboxes |
| 13 | Novita | 40.94 | 40.42 – 41.02 | 3 | 90 | too few sandboxes |
| 14 | tama | 219.4 | 219.4 – 219.5 | 2 | 60 | too few sandboxes |

### ghcr.io/v2 HTTPS

ms · lower is better

_Namespace leads · Vercel Sandbox is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_ghcr_io_v2_total_ms.webp" width="960" alt="ghcr.io/v2 HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | ghcr.io/v2 HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 16.3 | 15.68 – 16.83 | 3 | 90 | — |
| 2 | Vercel Sandbox | 18.27 | 16.62 – 21.06 | 3 | 90 | too few sandboxes |
| 3 | tama | 23.69 | 23.31 – 24.08 | 2 | 60 | too few sandboxes |
| 4 | Modal (VM) | 31.84 | 31.51 – 85.15 | 3 | 90 | too few sandboxes |
| 5 | Runloop | 58.82 | 51.55 – 59.66 | 3 | 90 | too few sandboxes |
| 6 | Blaxel | 64.59 | 62.46 – 64.87 | 3 | 90 | too few sandboxes |
| 7 | Daytona (VM) | 98.09 | 94.01 – 101 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 100.6 | 35.11 – 103.5 | 3 | 90 | too few sandboxes |
| 9 | E2B | 107.6 | 107.3 – 109.6 | 3 | 90 | too few sandboxes |
| 10 | Microsandbox Cloud | 122.1 | 121.1 – 124.8 | 3 | 90 | too few sandboxes |
| 11 | run.cloud | 128.9 | 128 – 130.1 | 3 | 90 | too few sandboxes |
| 12 | Freestyle | 144.2 | 134.6 – 144.5 | 3 | 90 | too few sandboxes |
| 13 | Brezel | 148.5 | 147.7 – 149.1 | 3 | 90 | too few sandboxes |
| 14 | Novita | 201.9 | 201.7 – 203.8 | 3 | 90 | too few sandboxes |

### gcr.io/v2 HTTPS

ms · lower is better

_Namespace leads · E2B is ~1.3× higher (lower is better)._

<img src="docs/figures/network_https_gcr_io_v2_total_ms.webp" width="960" alt="gcr.io/v2 HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | gcr.io/v2 HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 14.42 | 13.82 – 14.5 | 3 | 90 | — |
| 2 | E2B | 18.24 | 15.84 – 18.45 | 3 | 90 | too few sandboxes |
| 3 | Vercel Sandbox | 18.32 | 18.1 – 19.19 | 3 | 90 | too few sandboxes |
| 4 | Modal (VM) | 32.66 | 29.32 – 40.95 | 3 | 90 | too few sandboxes |
| 5 | Modal (gVisor) | 46.8 | 33.25 – 49.66 | 3 | 90 | too few sandboxes |
| 6 | Daytona (VM) | 49.46 | 47.35 – 50.44 | 3 | 90 | too few sandboxes |
| 7 | Blaxel | 55.08 | 54.85 – 55.4 | 3 | 90 | too few sandboxes |
| 8 | Runloop | 68.15 | 66.53 – 97.87 | 3 | 90 | too few sandboxes |
| 9 | Freestyle | 109.3 | 100.5 – 111.4 | 3 | 89 | too few sandboxes |
| 10 | Microsandbox Cloud | 109.3 | 87.28 – 126.3 | 3 | 90 | too few sandboxes |
| 11 | run.cloud | 132.3 | 131.7 – 134.5 | 3 | 90 | too few sandboxes |
| 12 | Novita | 172.9 | 171.6 – 173 | 3 | 90 | too few sandboxes |
| 13 | tama | 267.6 | 266.4 – 268.7 | 2 | 60 | too few sandboxes |
| 14 | Brezel | 521.6 | 520.3 – 527.1 | 3 | 90 | too few sandboxes |

### auth.docker.io token HTTPS

ms · lower is better

_Namespace leads · Vercel Sandbox is ~1.4× higher (lower is better)._

<img src="docs/figures/network_https_auth_docker_io_registry_token_total_ms.webp" width="960" alt="auth.docker.io token HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | auth.docker.io token HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 26.75 | 25.93 – 26.84 | 3 | 90 | — |
| 2 | Vercel Sandbox | 36.38 | 34.66 – 37.05 | 3 | 90 | too few sandboxes |
| 3 | Modal (VM) | 37.6 | 36.41 – 84.58 | 3 | 90 | too few sandboxes |
| 4 | Blaxel | 43.1 | 40.21 – 43.17 | 3 | 90 | too few sandboxes |
| 5 | Runloop | 48.61 | 48.43 – 48.82 | 3 | 90 | too few sandboxes |
| 6 | Microsandbox Cloud | 53.92 | 53.91 – 55.05 | 3 | 90 | too few sandboxes |
| 7 | Daytona (VM) | 104.5 | 92.77 – 104.7 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 115.1 | 44.55 – 121.9 | 3 | 90 | too few sandboxes |
| 9 | Brezel | 115.4 | 114.9 – 115.8 | 3 | 90 | too few sandboxes |
| 10 | Novita | 120.1 | 119.5 – 122.4 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 128.4 | 126.5 – 133.1 | 3 | 90 | too few sandboxes |
| 12 | E2B | 130.5 | 129.6 – 134.4 | 3 | 90 | too few sandboxes |
| 13 | run.cloud | 143.5 | 140.5 – 145.1 | 3 | 90 | too few sandboxes |
| 14 | tama | 238.4 | 238.2 – 238.5 | 2 | 60 | too few sandboxes |

### crates.io HTTPS

ms · lower is better

_Modal (VM) leads · Brezel is ~1.4× higher (lower is better)._

<img src="docs/figures/network_https_crates_io_total_ms.webp" width="960" alt="crates.io HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | crates.io HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 12.27 | 11.99 – 12.55 | 2 | 60 | — |
| 2 | Brezel | 17.35 | 17.22 – 17.84 | 3 | 90 | too few sandboxes |
| 3 | Microsandbox Cloud | 19.45 | 15.38 – 20.17 | 3 | 90 | too few sandboxes |
| 4 | Namespace | 22.19 | 17.14 – 27.89 | 3 | 90 | too few sandboxes |
| 5 | Vercel Sandbox | 22.88 | 22.86 – 28.3 | 3 | 90 | too few sandboxes |
| 6 | Daytona (VM) | 23.26 | 21.05 – 28.33 | 3 | 90 | too few sandboxes |
| 7 | Runloop | 24.39 | 24.11 – 25.02 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 31.14 | 20.06 – 33.71 | 3 | 90 | too few sandboxes |
| 9 | run.cloud | 33.07 | 32.1 – 35.33 | 3 | 90 | too few sandboxes |
| 10 | Blaxel | 34.3 | 33.99 – 35.38 | 3 | 90 | too few sandboxes |
| 11 | E2B | 36.26 | 35.03 – 36.86 | 3 | 90 | too few sandboxes |
| 12 | Novita | 45.3 | 44.53 – 45.61 | 3 | 90 | too few sandboxes |
| 13 | Freestyle | 52.02 | 38.73 – 52.13 | 3 | 89 | too few sandboxes |
| 14 | tama | 235.9 | 234.3 – 237.4 | 2 | 60 | too few sandboxes |

### index.crates.io config HTTPS

ms · lower is better

_Modal (VM) leads · Microsandbox Cloud is ~1.3× higher (lower is better)._

<img src="docs/figures/network_https_index_crates_io_config_total_ms.webp" width="960" alt="index.crates.io config HTTPS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | index.crates.io config HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10.05 | 9.335 – 10.07 | 3 | 90 | — |
| 2 | Microsandbox Cloud | 12.81 | 10.91 – 13.15 | 3 | 90 | too few sandboxes |
| 3 | Vercel Sandbox | 14.05 | 13.52 – 15.85 | 3 | 90 | too few sandboxes |
| 4 | Blaxel | 21.16 | 21.13 – 24.71 | 3 | 90 | too few sandboxes |
| 5 | Brezel | 22.4 | 22.15 – 22.42 | 3 | 90 | too few sandboxes |
| 6 | Daytona (VM) | 24.14 | 13.97 – 24.2 | 3 | 90 | too few sandboxes |
| 7 | Namespace | 24.91 | 8.354 – 25.92 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 26.26 | 17.79 – 28.7 | 3 | 90 | too few sandboxes |
| 9 | run.cloud | 28.77 | 28.59 – 31.22 | 3 | 90 | too few sandboxes |
| 10 | E2B | 33.02 | 31.83 – 33.03 | 3 | 90 | too few sandboxes |
| 11 | Freestyle | 33.98 | 32.19 – 35.76 | 2 | 60 | too few sandboxes |
| 12 | Runloop | 34.47 | 32.31 – 35.11 | 3 | 90 | too few sandboxes |
| 13 | Novita | 40.76 | 40.18 – 41.5 | 3 | 90 | too few sandboxes |
| 14 | tama | 219.7 | 219.2 – 220.2 | 2 | 60 | too few sandboxes |

### github.com cold DNS

ms · lower is better

_Daytona (VM), Microsandbox Cloud and Vercel Sandbox share the top on this metric (lower is better)._

<img src="docs/figures/network_dns_cold_github_com_ms.webp" width="960" alt="github.com cold DNS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | github.com cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4 | 4 – 8 | 3 | 3 | — |
| 1 | Microsandbox Cloud | 4 | 4 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 4 | 4 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 4 | tama | 6 | 4 – 8 | 2 | 2 | too few sandboxes |
| 5 | Modal (gVisor) | 7 | 4 – 23 | 3 | 3 | too few sandboxes |
| 6 | Freestyle | 8 | 4 – 8 | 3 | 3 | too few sandboxes |
| 6 | Modal (VM) | 8 | 4 – 23 | 3 | 3 | too few sandboxes, equal medians |
| 6 | run.cloud | 8 | 8 – 8 | 3 | 3 | too few sandboxes, equal medians |
| 9 | Namespace | 10 | 4 – 16 | 2 | 2 | too few sandboxes |
| 10 | Blaxel | 12 | 8 – 12 | 3 | 3 | too few sandboxes |
| 10 | Brezel | 12 | 8 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 10 | E2B | 12 | 12 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 10 | Novita | 12 | 11 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 14 | Runloop | 16 | — | 1 | 1 | — |

### registry.npmjs.org cold DNS

ms · lower is better

_Namespace and Runloop share the top on this metric (lower is better)._

<img src="docs/figures/network_dns_cold_registry_npmjs_org_ms.webp" width="960" alt="registry.npmjs.org cold DNS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | registry.npmjs.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 4 | 4 – 8 | 3 | 3 | — |
| 1 | Runloop | 4 | 4 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 3 | Freestyle | 8 | 5 – 12 | 3 | 3 | too few sandboxes |
| 3 | Modal (VM) | 8 | 8 – 31 | 3 | 3 | too few sandboxes, equal medians |
| 3 | run.cloud | 8 | 8 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 6 | Modal (gVisor) | 9 | 5 – 22 | 3 | 3 | too few sandboxes |
| 7 | tama | 10 | 8 – 12 | 2 | 2 | too few sandboxes |
| 8 | Blaxel | 12 | 12 – 12 | 3 | 3 | too few sandboxes |
| 8 | Brezel | 12 | 12 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 8 | Daytona (VM) | 12 | 8 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 8 | E2B | 12 | 12 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 8 | Microsandbox Cloud | 12 | 12 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 13 | Novita | 16 | 16 – 71 | 3 | 3 | too few sandboxes |
| 14 | Vercel Sandbox | 28 | 23 – 35 | 3 | 3 | too few sandboxes |

### docker.io cold DNS

ms · lower is better

_Daytona (VM), Microsandbox Cloud, Modal (VM), Runloop, tama and Vercel Sandbox share the top on this metric (lower is better)._

<img src="docs/figures/network_dns_cold_docker_io_ms.webp" width="960" alt="docker.io cold DNS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | docker.io cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4 | 4 – 8 | 3 | 3 | — |
| 1 | Microsandbox Cloud | 4 | 4 – 4 | 2 | 2 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 4 | 4 – 24 | 3 | 3 | too few sandboxes, equal medians |
| 1 | Runloop | 4 | 4 – 4 | 2 | 2 | too few sandboxes, equal medians |
| 1 | tama | 4 | 4 – 4 | 2 | 2 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 4 | 4 – 4 | 2 | 2 | too few sandboxes, equal medians |
| 7 | Freestyle | 8 | 4 – 8 | 3 | 3 | too few sandboxes |
| 8 | Modal (gVisor) | 9 | 4 – 19 | 3 | 3 | too few sandboxes |
| 9 | Blaxel | 12 | 12 – 12 | 3 | 3 | too few sandboxes |
| 9 | run.cloud | 12 | 8 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 11 | Namespace | 14 | 12 – 16 | 2 | 2 | too few sandboxes |
| 12 | Brezel | 20 | 12 – 28 | 3 | 3 | too few sandboxes |
| 12 | E2B | 20 | 20 – 36 | 3 | 3 | too few sandboxes, equal medians |
| 14 | Novita | 48 | 23 – 52 | 3 | 3 | too few sandboxes |

### pypi.org cold DNS

ms · lower is better

_Namespace and Runloop share the top on this metric (lower is better)._

<img src="docs/figures/network_dns_cold_pypi_org_ms.webp" width="960" alt="pypi.org cold DNS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pypi.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 4 | 4 – 64 | 3 | 3 | — |
| 1 | Runloop | 4 | 4 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 3 | Vercel Sandbox | 6 | 4 – 8 | 2 | 2 | too few sandboxes |
| 4 | Freestyle | 8 | 4 – 8 | 3 | 3 | too few sandboxes |
| 5 | Blaxel | 12 | 12 – 12 | 3 | 3 | too few sandboxes |
| 5 | Daytona (VM) | 12 | 8 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 5 | run.cloud | 12 | 12 – 20 | 3 | 3 | too few sandboxes, equal medians |
| 8 | Modal (VM) | 16 | 12 – 35 | 3 | 3 | too few sandboxes |
| 9 | tama | 18 | 16 – 20 | 2 | 2 | too few sandboxes |
| 10 | Modal (gVisor) | 24 | 12 – 66 | 3 | 3 | too few sandboxes |
| 10 | Novita | 24 | 20 – 171 | 3 | 3 | too few sandboxes, equal medians |
| 12 | Brezel | 40 | 36 – 148 | 3 | 3 | too few sandboxes |
| 13 | Microsandbox Cloud | 60 | 60 – 152 | 3 | 3 | too few sandboxes |
| 14 | E2B | 64 | 28 – 76 | 3 | 3 | too few sandboxes |

### rubygems.org cold DNS

ms · lower is better

_Blaxel leads · run.cloud is ~1.3× higher (lower is better)._

<img src="docs/figures/network_dns_cold_rubygems_org_ms.webp" width="960" alt="rubygems.org cold DNS: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | rubygems.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 12 | 12 – 12 | 3 | 3 | — |
| 2 | run.cloud | 16 | 16 – 16 | 3 | 3 | too few sandboxes |
| 3 | Brezel | 28 | 24 – 28 | 3 | 3 | too few sandboxes |
| 4 | Runloop | 48 | 47 – 48 | 3 | 3 | too few sandboxes |
| 5 | Vercel Sandbox | 55 | 52 – 59 | 3 | 3 | too few sandboxes |
| 6 | Daytona (VM) | 60 | 60 – 64 | 3 | 3 | too few sandboxes |
| 6 | Freestyle | 60 | 56 – 60 | 3 | 3 | too few sandboxes, equal medians |
| 6 | tama | 60 | 60 – 60 | 2 | 2 | too few sandboxes, equal medians |
| 9 | Namespace | 64 | 60 – 64 | 3 | 3 | too few sandboxes |
| 10 | Novita | 68 | 68 – 71 | 3 | 3 | too few sandboxes |
| 11 | Modal (VM) | 75 | 64 – 84 | 3 | 3 | too few sandboxes |
| 12 | Modal (gVisor) | 83 | 64 – 83 | 3 | 3 | too few sandboxes |
| 13 | E2B | 96 | 96 – 100 | 3 | 3 | too few sandboxes |
| 14 | Microsandbox Cloud | 156 | 152 – 328 | 3 | 3 | too few sandboxes |

### Node 22 download

Mbits/sec · higher is better

_Runloop leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/network_download_node_v22_23_1_linux_x64_mbits_per_sec.webp" width="960" alt="Node 22 download: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | Node 22 download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Runloop | 2525 | 1920 – 2660 | 3 | 3 | — |
| 2 | Namespace | 2497 | 1302 – 2534 | 3 | 3 | too few sandboxes |
| 3 | Vercel Sandbox | 2377 | 2273 – 2613 | 3 | 3 | too few sandboxes |
| 4 | Brezel | 2000 | 1111 – 2360 | 3 | 3 | too few sandboxes |
| 5 | Daytona (VM) | 1700 | 1695 – 2484 | 3 | 3 | too few sandboxes |
| 6 | Microsandbox Cloud | 1458 | 1433 – 2249 | 3 | 3 | too few sandboxes |
| 7 | Modal (gVisor) | 1367 | 934.7 – 1378 | 3 | 3 | too few sandboxes |
| 8 | Novita | 1285 | 1163 – 1353 | 3 | 3 | too few sandboxes |
| 9 | Blaxel | 1214 | 607.2 – 2403 | 3 | 3 | too few sandboxes |
| 10 | Modal (VM) | 1199 | 850.4 – 1255 | 3 | 3 | too few sandboxes |
| 11 | E2B | 1011 | 892 – 1858 | 3 | 3 | too few sandboxes |
| 12 | Freestyle | 957.2 | 674.5 – 1035 | 3 | 3 | too few sandboxes |
| 13 | tama | 949.4 | 938.4 – 960.3 | 2 | 2 | too few sandboxes |
| 14 | run.cloud | 824.8 | 804.7 – 833.8 | 3 | 3 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Brezel leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 30.98 | 30.9 – 31.07 | 3 | 6 | — |
| 2 | Namespace | 33.5 | 33.16 – 34.02 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 36.37 | 35.99 – 36.56 | 3 | 6 | too few sandboxes |
| 4 | boat | 38.38 | 33.59 – 40.9 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 40.75 | 40.04 – 41.86 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 43 | 35.2 – 49.1 | 3 | 6 | too few sandboxes |
| 7 | Novita | 43.86 | 43.62 – 44.35 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 44.57 | 43.23 – 45.1 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 45.42 | 42.26 – 47.43 | 3 | 6 | too few sandboxes |
| 10 | tama | 49.48 | 48.6 – 61.43 | 3 | 6 | too few sandboxes |
| 11 | Freestyle | 60.58 | 55.55 – 61.14 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 62.74 | 62.29 – 64.01 | 3 | 6 | too few sandboxes |
| 13 | Vercel Sandbox | 64.56 | 63.65 – 86.79 | 3 | 6 | too few sandboxes |
| 14 | E2B | 67.08 | 59.95 – 67.33 | 3 | 6 | too few sandboxes |
| 15 | Runloop | 80.94 | 80.11 – 87.1 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Brezel leads · ~1.3× boat on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 499600 | 493000 – 501300 | 3 | 6 | — |
| 2 | boat | 396900 | 389600 – 402800 | 3 | 6 | too few sandboxes |
| 3 | tama | 357800 | 356500 – 536200 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 309500 | 306000 – 321000 | 3 | 6 | too few sandboxes |
| 5 | Novita | 305800 | 290800 – 310500 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 304600 | 301400 – 307000 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 241100 | 220500 – 243200 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 234500 | 227400 – 246100 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 193700 | 192000 – 196000 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 167500 | 127900 – 170000 | 3 | 6 | too few sandboxes |
| 11 | E2B | 167200 | 163100 – 177100 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 137600 | 135600 – 168900 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 114400 | 112100 – 116100 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 109100 | 103100 – 113900 | 3 | 6 | too few sandboxes |
| 15 | Modal (gVisor) | 105800 | 100900 – 122200 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Brezel leads · boat is ~1.3× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 0.1005 | 0.1 – 0.1015 | 3 | 6 | — |
| 2 | boat | 0.126 | 0.124 – 0.1285 | 3 | 6 | too few sandboxes |
| 3 | tama | 0.14 | 0.093 – 0.1405 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 0.1615 | 0.156 – 0.164 | 3 | 6 | too few sandboxes |
| 5 | Novita | 0.1635 | 0.1615 – 0.172 | 3 | 6 | too few sandboxes |
| 6 | Daytona (VM) | 0.1645 | 0.163 – 0.1655 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 0.208 | 0.2055 – 0.2265 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 0.2135 | 0.203 – 0.2195 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 0.2585 | 0.2555 – 0.2605 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 0.2985 | 0.294 – 0.391 | 3 | 6 | too few sandboxes |
| 11 | E2B | 0.299 | 0.282 – 0.3065 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 0.365 | 0.298 – 0.37 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 0.437 | 0.4305 – 0.446 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 0.4585 | 0.4395 – 0.485 | 3 | 6 | too few sandboxes |
| 15 | Modal (gVisor) | 0.473 | 0.409 – 0.4955 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Brezel leads · ~1.8× Novita on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 48230 | 47140 – 49300 | 3 | 6 | — |
| 2 | Novita | 27140 | 26460 – 27580 | 3 | 6 | too few sandboxes |
| 3 | boat | 26530 | 26370 – 27550 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 21850 | 21620 – 23370 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 20560 | 20300 – 20970 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 17600 | 12160 – 17710 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 16120 | 16080 – 16720 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 15380 | 15000 – 15470 | 3 | 6 | too few sandboxes |
| 9 | tama | 15290 | 13760 – 20160 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 15230 | 13100 – 16040 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 12090 | 10510 – 12650 | 3 | 6 | too few sandboxes |
| 12 | E2B | 11410 | 10540 – 11480 | 3 | 6 | too few sandboxes |
| 13 | run.cloud | 11120 | 10850 – 16320 | 3 | 6 | too few sandboxes |
| 14 | Runloop | 10490 | 8387 – 10880 | 3 | 6 | too few sandboxes |
| 15 | Freestyle | 7032 | 6738 – 8646 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Brezel leads · Novita is ~1.8× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 1.036 | 1.014 – 1.062 | 3 | 6 | — |
| 2 | Novita | 1.843 | 1.816 – 1.89 | 3 | 6 | too few sandboxes |
| 3 | boat | 1.885 | 1.816 – 1.897 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 2.288 | 2.14 – 2.314 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 2.434 | 2.386 – 2.463 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 2.841 | 2.824 – 4.111 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 3.101 | 2.992 – 3.109 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 3.251 | 3.232 – 3.335 | 3 | 6 | too few sandboxes |
| 9 | tama | 3.271 | 2.5 – 3.644 | 3 | 6 | too few sandboxes |
| 10 | Microsandbox Cloud | 3.284 | 3.125 – 3.848 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 4.138 | 3.954 – 4.76 | 3 | 6 | too few sandboxes |
| 12 | E2B | 4.38 | 4.359 – 4.742 | 3 | 6 | too few sandboxes |
| 13 | run.cloud | 4.498 | 3.064 – 4.61 | 3 | 6 | too few sandboxes |
| 14 | Runloop | 4.771 | 4.599 – 6.867 | 3 | 6 | too few sandboxes |
| 15 | Freestyle | 7.556 | 5.788 – 8.017 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Brezel leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 361 | 360 – 365 | 3 | 6 | — |
| 2 | Namespace | 368.5 | 368.5 – 387.5 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 408 | 405 – 413 | 3 | 6 | too few sandboxes |
| 4 | boat | 422 | 410 – 422 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 452 | 449.5 – 452.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 481 | 479 – 673.5 | 3 | 6 | too few sandboxes |
| 6 | Novita | 481 | 480 – 482.5 | 3 | 6 | too few sandboxes, equal medians |
| 8 | Blaxel | 493.5 | 486 – 497 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 505 | 502.5 – 521 | 3 | 6 | too few sandboxes |
| 10 | tama | 509 | 506 – 537 | 3 | 6 | too few sandboxes |
| 11 | E2B | 641.5 | 564 – 807.5 | 3 | 6 | too few sandboxes |
| 12 | Vercel Sandbox | 767 | 762 – 1182 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 771.5 | 771 – 772.5 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 833 | 770.5 – 833.5 | 3 | 6 | too few sandboxes |
| 15 | Runloop | 1176 | 1166 – 1177 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Brezel leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Brezel | 27.8 | 27.77 – 27.8 | 3 | 6 | — |
| 2 | Daytona (VM) | 31.67 | 31.42 – 31.76 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 33.88 | 32.92 – 38.26 | 3 | 6 | too few sandboxes |
| 4 | Novita | 39.7 | 39.43 – 42.09 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 41.21 | 36.34 – 65.11 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 42.23 | 40.06 – 42.34 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 48.22 | 47.11 – 48.94 | 3 | 6 | too few sandboxes |
| 8 | tama | 54.88 | 52.35 – 152.7 | 3 | 6 | too few sandboxes |
| 9 | boat | 61.29 | 45.6 – 63.75 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 68.25 | 66.61 – 117.5 | 3 | 6 | too few sandboxes |
| 11 | E2B | 68.72 | 63.1 – 72.12 | 3 | 6 | too few sandboxes |
| 12 | run.cloud | 81.77 | 60 – 95.96 | 3 | 6 | too few sandboxes |
| 13 | Runloop | 84.69 | 81.84 – 85.22 | 3 | 6 | too few sandboxes |
| 14 | Freestyle | 97.39 | 92.28 – 98.5 | 3 | 6 | too few sandboxes |
| 15 | Modal (gVisor) | 187.5 | 187 – 205.8 | 3 | 6 | too few sandboxes |

</details>

## economics

<img src="docs/figures/usd_per_hour.webp" width="960" alt="Hourly cost: 7 environments ranked best-first, with 95% intervals">

### Hourly cost _(headline)_

USD/hr · lower is better

_boat is cheapest · tama is ~2.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 0.036 | — | 1 | 1 | — |
| 2 | tama | 0.074 | — | 1 | 1 | — |
| 3 | Novita | 0.2333 | — | 1 | 1 | — |
| 4 | Freestyle | 0.2645 | — | 1 | 1 | — |
| 5 | Daytona (VM) | 0.3312 | — | 1 | 1 | — |
| 5 | E2B | 0.3312 | — | 1 | 1 | equal values |
| 7 | Runloop | 0.6336 | — | 1 | 1 | — |

## Coverage gaps

46 uncovered results across 10 providers (boat 2, Freestyle 1, Microsandbox Cloud 1, Modal (gVisor) 2, Modal (VM) 3, Namespace 2, run.cloud 5, Runloop 4, tama 24, Vercel Sandbox 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| boat | network | **skipped** | network-dns: jc not installed |
| boat | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload, network_https_github_com_total_ms, network_https_api_github_com_total_ms, network_https_raw_githubusercontent_com_total_ms, network_https_registry_npmjs_org_total_ms, network_https_pypi_org_total_ms, network_https_files_pythonhosted_org_total_ms, network_https_ghcr_io_v2_total_ms, network_https_gcr_io_v2_total_ms, network_https_auth_docker_io_registry_token_total_ms, network_https_crates_io_total_ms, network_https_index_crates_io_config_total_ms, network_dns_cold_github_com_ms, network_dns_cold_registry_npmjs_org_ms, network_dns_cold_docker_io_ms, network_dns_cold_pypi_org_ms, network_dns_cold_rubygems_org_ms, network_download_node_v22_23_1_linux_x64_mbits_per_sec |
| Freestyle | network | **failed** | Partial publication withheld unverified measurements: network_https_index_crates_io_config_total_ms |
| Microsandbox Cloud | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_docker_io_ms |
| Modal (gVisor) | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: computesdk exec failed: Sandbox sb-01M3ZM9MZ0VQ2BGYEF3KSZWA92 has already completed) — the sandbox stopped responding, not a quiet long step |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Modal (VM) | network | **failed** | Partial publication withheld unverified measurements: network_https_crates_io_total_ms |
| Modal (VM) | realworld-openclaw | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (VM) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Namespace | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_docker_io_ms |
| Namespace | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_github_com_ms |
| run.cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: run.cloud create failed ambiguously (run.cloud create did not settle within 30000ms) and reconciliation could not establish its outcome (no allocation visible during reconciliation), so it is unknown whether a sandbox was allocated; if one was it carries the name sandbox-benchmarks-efda2427-1008-4157-91d0-2a06215216e9 and manual cleanup may be required; cleanup failed: runcloud ComputeSDK failed-create recovery cleanup callback failed |
| run.cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| run.cloud | realworld-openclaw | **failed** | Failed to create sandbox: account runcloud admission stopped after runcloud-realworld-openclaw-r8: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r10: account runcloud admission stopped after runcloud-realworld-openclaw-r8: allocation ownership or journal release remains unresolved |
| run.cloud | realworld-openclaw | **failed** | runcloud-realworld-openclaw-r11: account runcloud admission stopped after runcloud-realworld-openclaw-r8: allocation ownership or journal release remains unresolved |
| Runloop | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_github_com_ms, network_dns_cold_docker_io_ms |
| Runloop | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_github_com_ms |
| Runloop | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Runloop | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| tama | network | **failed** | Failed to create sandbox: tama new bench-decc70d3-22b4-4197-a18c-943f5d61a98e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-decc70d3-22b4-4197-a18c-943f5d61a98e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload, network_https_github_com_total_ms, network_https_api_github_com_total_ms, network_https_raw_githubusercontent_com_total_ms, network_https_registry_npmjs_org_total_ms, network_https_pypi_org_total_ms, network_https_files_pythonhosted_org_total_ms, network_https_ghcr_io_v2_total_ms, network_https_gcr_io_v2_total_ms, network_https_auth_docker_io_registry_token_total_ms, network_https_crates_io_total_ms, network_https_index_crates_io_config_total_ms, network_dns_cold_github_com_ms, network_dns_cold_registry_npmjs_org_ms, network_dns_cold_docker_io_ms, network_dns_cold_pypi_org_ms, network_dns_cold_rubygems_org_ms, network_download_node_v22_23_1_linux_x64_mbits_per_sec |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-c10ec06d-eb62-48d1-80b8-a6f4c433e9a6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c10ec06d-eb62-48d1-80b8-a6f4c433e9a6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-bc4acb1b-6c3e-495f-9cb5-fc6603e3f157 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-bc4acb1b-6c3e-495f-9cb5-fc6603e3f157 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-9b86036a-6db3-4b81-8fef-d802ed890b97 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9b86036a-6db3-4b81-8fef-d802ed890b97 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-55f503bc-c205-4f6a-80ca-8b494c1338ea --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-55f503bc-c205-4f6a-80ca-8b494c1338ea failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-e6a88565-eabf-4bc2-a5f1-2ce9cf229bc6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e6a88565-eabf-4bc2-a5f1-2ce9cf229bc6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-95d5bba9-741e-4600-af44-826e8daabe68 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-95d5bba9-741e-4600-af44-826e8daabe68 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-4b2bd30a-badd-4681-8164-fc562d291b94 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4b2bd30a-badd-4681-8164-fc562d291b94 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-69ca470c-386e-4c3f-805e-444a889d5ca2 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-69ca470c-386e-4c3f-805e-444a889d5ca2 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-9b61b35b-ccbf-488b-badb-27da9aa19b63 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9b61b35b-ccbf-488b-badb-27da9aa19b63 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-646a1725-a9c5-47a5-bad8-5a9559a1bc93 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-646a1725-a9c5-47a5-bad8-5a9559a1bc93 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-007f8ad5-2d0e-4444-9954-e4c672639075 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-007f8ad5-2d0e-4444-9954-e4c672639075 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-94429f77-7d27-43b7-b0fb-1540cd35b767 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-94429f77-7d27-43b7-b0fb-1540cd35b767 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-81d1c3ea-5a64-46a3-9e50-83f9b53c1ee8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-81d1c3ea-5a64-46a3-9e50-83f9b53c1ee8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-4974a36e-9e18-4735-9a2b-78acdc83d48a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4974a36e-9e18-4735-9a2b-78acdc83d48a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-b27a50b6-8f64-4123-acda-3626d5b69a23 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-b27a50b6-8f64-4123-acda-3626d5b69a23 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-1d600e9c-c756-491d-ab05-3baf9d1aa6a9 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1d600e9c-c756-491d-ab05-3baf9d1aa6a9 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-0a29513d-df11-4213-b0f4-43541a17bc8e --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0a29513d-df11-4213-b0f4-43541a17bc8e failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-59c41415-f572-4047-8965-a7e203a73587 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-59c41415-f572-4047-8965-a7e203a73587 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-c62cb1e3-8ef3-40f4-a66b-cf75596683f9 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c62cb1e3-8ef3-40f4-a66b-cf75596683f9 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-edde5ff9-1cdb-41cd-aa96-4dc134a819de --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-edde5ff9-1cdb-41cd-aa96-4dc134a819de failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| Vercel Sandbox | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_pypi_org_ms |
| Vercel Sandbox | network | **failed** | Partial publication withheld unverified measurements: network_dns_cold_docker_io_ms |

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
The floor is a property of the design — here 2 v 2 sandboxes floors at p ≈ 1.0; 2 v 3 sandboxes floors at p ≈ 0.10; 2 v 3 sandboxes floors at p ≈ 0.20; 2 v 3 sandboxes floors at p ≈ 0.40; 2 v 3 sandboxes floors at p ≈ 1.0; 3 v 2 sandboxes floors at p ≈ 0.10; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 2 sandboxes floors at p ≈ 0.40; 3 v 2 sandboxes floors at p ≈ 0.60; 3 v 2 sandboxes floors at p ≈ 1.0; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.30; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 0.60; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Daytona (VM) | 0.0045 | 0.019 |
| realworld | Mastra: cold install | Blaxel | <0.001 | 0.0046 |
| realworld | Mastra: cold install | boat | 0.045 | 0.019 |
| realworld | Mastra: cold install | Novita | 0.20 (tied) | 0.19 |
| realworld | Mastra: cold install | Modal (VM) | 0.32 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.89 (tied) | 0.79 |
| realworld | Mastra: cold install | Brezel | 0.51 (tied) | 0.066 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.67 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: cold install | E2B | 1.0 (tied) | 0.46 |
| realworld | Mastra: cold install | tama | 0.38 (tied) | 0.19 |
| realworld | Mastra: cold install | Freestyle | 0.18 (tied) | 0.019 |
| realworld | Mastra: cold install | Runloop | 0.0011 | <0.001 |
| realworld | Mastra: cold install | run.cloud | 0.039 | <0.001 |
| realworld | Better-Auth: build | Brezel | — | — |
| realworld | Better-Auth: build | boat | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | 0.0045 | 0.0046 |
| realworld | Better-Auth: build | Daytona (VM) | 0.14 (tied) | 0.066 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.18 (tied) | 0.19 |
| realworld | Better-Auth: build | Blaxel | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: build | tama | 0.042 | 0.032 |
| realworld | Better-Auth: build | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: build | E2B | 0.020 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | 0.89 (tied) | 0.99 |
| realworld | Better-Auth: build | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: build | run.cloud | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: build | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Brezel | — | — |
| realworld | Better-Auth: cold install | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: cold install | boat | 0.32 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.0023 | 0.019 |
| realworld | Better-Auth: cold install | tama | 0.95 (tied) | 0.55 |
| realworld | Better-Auth: cold install | E2B | 0.21 (tied) | 0.16 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | run.cloud | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Freestyle | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | tama | 0.020 | 0.012 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.26 (tied) | 0.16 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.017 | <0.001 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.76 (tied) | 0.43 |
| realworld | Better-Auth: git clone | E2B | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: git clone | boat | 0.0014 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.90 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Brezel | 0.33 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.62 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Runloop | 0.40 (tied) | 0.066 |
| realworld | Better-Auth: git clone | run.cloud | 0.18 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Freestyle | 0.024 | 0.066 |
| realworld | Better-Auth: lint (Biome) | Brezel | — | — |
| realworld | Better-Auth: lint (Biome) | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.0018 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.80 (tied) | 0.79 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | tama | 0.030 | 0.032 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.95 (tied) | 0.98 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.010 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Freestyle | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Runloop | 0.18 (tied) | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Brezel | — | — |
| realworld | Better-Auth: lint deps (Knip) | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.63 (tied) | 0.79 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.10 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | tama | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.030 | 0.032 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.024 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Freestyle | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Brezel | — | — |
| realworld | Better-Auth: lint format | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | 0.017 | 0.019 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.0068 | 0.0046 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0045 | 0.0046 |
| realworld | Better-Auth: lint format | Novita | 0.47 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Blaxel | 0.58 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint format | tama | 0.17 (tied) | 0.032 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.033 | 0.019 |
| realworld | Better-Auth: lint format | run.cloud | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: lint format | E2B | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: lint format | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Brezel | — | — |
| realworld | Better-Auth: lint packages | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | boat | 0.012 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Novita | 0.0029 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.017 | 0.019 |
| realworld | Better-Auth: lint packages | Blaxel | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | tama | 0.68 (tied) | 0.32 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint packages | E2B | 0.014 | 0.0046 |
| realworld | Better-Auth: lint packages | run.cloud | 0.045 | 0.066 |
| realworld | Better-Auth: lint packages | Freestyle | 0.0029 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Brezel | — | — |
| realworld | Better-Auth: lint spell | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | 0.0014 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.0068 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Blaxel | 0.63 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | tama | 0.10 (tied) | 0.032 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.0011 | 0.0013 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Freestyle | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | run.cloud | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Runloop | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Brezel | — | — |
| realworld | Better-Auth: lint types | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.028 | 0.019 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Namespace | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Novita | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: lint types | tama | 0.078 (tied) | 0.077 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.86 (tied) | 0.32 |
| realworld | Better-Auth: lint types | Blaxel | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint types | Freestyle | 0.045 | 0.0046 |
| realworld | Better-Auth: lint types | run.cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Runloop | 0.13 (tied) | 0.0046 |
| realworld | Better-Auth: typecheck | Brezel | — | — |
| realworld | Better-Auth: typecheck | boat | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | 0.0018 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.98 (tied) | 0.99 |
| realworld | Better-Auth: typecheck | Novita | 0.71 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Blaxel | 0.0036 | <0.001 |
| realworld | Better-Auth: typecheck | tama | 0.0011 | 0.0013 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.030 | 0.077 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.089 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | E2B | 0.13 (tied) | 0.0046 |
| realworld | Better-Auth: typecheck | Freestyle | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | run.cloud | 0.18 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Runloop | <0.001 | 0.0046 |
| realworld | Mastra: build:core | Brezel | — | — |
| realworld | Mastra: build:core | boat | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | 0.078 (tied) | 0.066 |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.089 (tied) | 0.43 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.63 (tied) | 0.43 |
| realworld | Mastra: build:core | Blaxel | 0.27 (tied) | 0.066 |
| realworld | Mastra: build:core | tama | <0.001 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: build:core | E2B | 0.060 (tied) | 0.0046 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.53 (tied) | 0.20 |
| realworld | Mastra: build:core | run.cloud | 0.69 (tied) | 0.24 |
| realworld | Mastra: build:core | Freestyle | 0.29 (tied) | 0.19 |
| realworld | Mastra: build:core | Runloop | <0.001 | <0.001 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.41 (tied) | 0.43 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.85 (tied) | 0.19 |
| realworld | Mastra: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | 0.68 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (VM) | 0.76 (tied) | 0.43 |
| realworld | Mastra: git clone | tama | 0.44 (tied) | 0.19 |
| realworld | Mastra: git clone | boat | 0.017 | 0.019 |
| realworld | Mastra: git clone | Novita | 0.89 (tied) | 0.79 |
| realworld | Mastra: git clone | E2B | 0.55 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.94 (tied) | 0.99 |
| realworld | Mastra: git clone | Brezel | 0.0070 | 0.0017 |
| realworld | Mastra: git clone | run.cloud | 0.55 (tied) | 0.066 |
| realworld | Mastra: git clone | Runloop | 0.55 (tied) | 0.19 |
| realworld | Mastra: git clone | Freestyle | 0.089 (tied) | 0.19 |
| realworld | Mastra: lint:format | Brezel | — | — |
| realworld | Mastra: lint:format | boat | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Namespace | 0.0068 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | 0.0046 |
| realworld | Mastra: lint:format | Novita | 0.010 | 0.019 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.76 (tied) | 0.19 |
| realworld | Mastra: lint:format | Modal (VM) | 0.93 (tied) | 0.19 |
| realworld | Mastra: lint:format | Blaxel | 0.84 (tied) | 0.79 |
| realworld | Mastra: lint:format | tama | 0.0023 | 0.019 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.010 | 0.0046 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | E2B | 0.38 (tied) | 0.023 |
| realworld | Mastra: lint:format | Freestyle | 0.078 (tied) | 0.019 |
| realworld | Mastra: lint:format | run.cloud | 0.11 (tied) | 0.019 |
| realworld | Mastra: lint:format | Runloop | <0.001 | <0.001 |
| realworld | Mastra: test:core | Brezel | — | — |
| realworld | Mastra: test:core | boat | <0.001 | <0.001 |
| realworld | Mastra: test:core | Namespace | 0.0029 | <0.001 |
| realworld | Mastra: test:core | Daytona (VM) | 0.0029 | 0.0046 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.033 | 0.066 |
| realworld | Mastra: test:core | Modal (VM) | 0.045 | 0.019 |
| realworld | Mastra: test:core | Blaxel | 0.14 (tied) | 0.066 |
| realworld | Mastra: test:core | Novita | 0.84 (tied) | 0.43 |
| realworld | Mastra: test:core | tama | <0.001 | <0.001 |
| realworld | Mastra: test:core | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: test:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: test:core | E2B | 0.53 (tied) | 0.20 |
| realworld | Mastra: test:core | Freestyle | <0.001 | <0.001 |
| realworld | Mastra: test:core | run.cloud | 0.039 | <0.001 |
| realworld | Mastra: test:core | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Brezel | — | — |
| realworld | OpenClaw: cold install | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | 0.67 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.0073 | 0.029 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.79 (tied) | 0.86 |
| realworld | OpenClaw: cold install | boat | 0.88 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.0053 | 0.0046 |
| realworld | OpenClaw: cold install | E2B | 0.0056 | <0.001 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.0023 | 0.019 |
| realworld | OpenClaw: cold install | run.cloud | 0.85 (tied) | 0.29 |
| realworld | OpenClaw: cold install | Runloop | 0.16 (tied) | 0.045 |
| realworld | OpenClaw: cold install | Freestyle | 0.014 | 0.0046 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Blaxel | 0.045 | 0.0046 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.0045 | <0.001 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.35 (tied) | 0.019 |
| realworld | OpenClaw: git clone | boat | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.93 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.80 (tied) | 0.19 |
| realworld | OpenClaw: git clone | E2B | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.93 (tied) | 0.98 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.12 (tied) | 0.11 |
| realworld | OpenClaw: git clone | Runloop | 0.13 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Brezel | 1.0 (tied) | 0.066 |
| realworld | OpenClaw: git clone | run.cloud | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Freestyle | 0.0022 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Brezel | — | — |
| realworld | OpenClaw: lint (all extensions) | boat | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | 0.089 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | 0.51 (tied) | 0.19 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | 0.037 | 0.11 |
| realworld | OpenClaw: lint (all extensions) | Novita | 0.45 (tied) | 0.30 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.32 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | Freestyle | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | run.cloud | 0.68 (tied) | 0.29 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.47 (tied) | 0.41 |
| realworld | OpenClaw: lint (all extensions) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Brezel | — | — |
| realworld | OpenClaw: lint (Oxlint) | boat | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | 0.44 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.41 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.0036 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | <0.001 | 0.0019 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.35 (tied) | 0.71 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | 0.16 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | run.cloud | 0.0030 | 0.0018 |
| realworld | OpenClaw: lint (Oxlint) | Freestyle | 0.069 (tied) | 0.0038 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.22 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Runloop | 0.024 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Brezel | — | — |
| realworld | OpenClaw: typecheck (test tree) | boat | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.019 | 0.0087 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.61 (tied) | 0.35 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.27 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.0068 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.0041 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.16 (tied) | 0.12 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.18 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.017 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Freestyle | 0.48 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Runloop | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Brezel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | boat | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.0045 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.67 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.35 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.41 (tied) | 0.35 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.0036 | 0.0076 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.16 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.85 (tied) | 0.41 |
| realworld | OpenClaw: typecheck (tsgo) | Freestyle | 0.18 (tied) | 0.026 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.93 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Runloop | <0.001 | 0.0046 |
| cpu | Node.js web tooling | Brezel | — | — |
| cpu | Node.js web tooling | boat | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Namespace | 0.42 (tied) | 0.031 |
| cpu | Node.js web tooling | Daytona (VM) | 0.056 (tied) | 0.0012 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.69 (tied) | 0.31 |
| cpu | Node.js web tooling | Novita | 0.69 (tied) | 0.31 |
| cpu | Node.js web tooling | tama | 0.0079 | 0.0069 |
| cpu | Node.js web tooling | Blaxel | 0.42 (tied) | 0.31 |
| cpu | Node.js web tooling | Modal (VM) | 0.22 (tied) | 0.031 |
| cpu | Node.js web tooling | run.cloud | 0.42 (tied) | 0.11 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.15 (tied) | 0.0069 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.84 (tied) | 0.68 |
| cpu | Node.js web tooling | E2B | 0.31 (tied) | 0.031 |
| cpu | Node.js web tooling | Freestyle | 0.0079 | <0.001 |
| cpu | Node.js web tooling | Runloop | 0.0079 | <0.001 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Brezel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | boat | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.80 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Brezel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | boat | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Freestyle | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Brezel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | boat | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.50 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Freestyle | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Brezel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | boat | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes, equal medians) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | tama | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | boat | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.60 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | boat | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.20 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | tama | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.60 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Brezel | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Freestyle | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | tama | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Brezel | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Freestyle | 0.20 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | boat | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 0.40 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | tama | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.70 (too few sandboxes) | 0.81 |
| disk | Hardlink throughput | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | boat | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | tama | 0.40 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | tama | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Novita | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Brezel | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | boat | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | tama | — | — |
| memory | STREAM Add | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Novita | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | E2B | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Brezel | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Add | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Runloop | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Add | boat | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | tama | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Modal (VM) | 0.40 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Blaxel | 0.10 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Freestyle | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | E2B | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | boat | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Runloop | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | tama | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Modal (VM) | 0.20 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Freestyle | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Brezel | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Runloop | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | boat | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | tama | 1.0 (too few sandboxes) | 0.066 |
| network | iperf3 WAN download | Daytona (VM) | 1.0 (too few sandboxes) | 0.25 |
| network | iperf3 WAN download | Novita | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | E2B | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Runloop | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Brezel | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Blaxel | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Freestyle | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | tama | 1.0 (too few sandboxes) | 0.99 |
| network | iperf3 WAN upload | Daytona (VM) | 0.80 (too few sandboxes) | 0.89 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 WAN upload | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Brezel | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | run.cloud | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | — | — |
| network | iperf3 loopback TCP, 1 stream | Novita | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Brezel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | tama | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.20 (too few sandboxes) | 0.030 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Brezel | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 1.0 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | tama | 0.20 (too few sandboxes) | 0.0047 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.80 (too few sandboxes) | 0.14 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Freestyle | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Brezel | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Freestyle | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | github.com HTTPS | Namespace | — | — |
| network | github.com HTTPS | Vercel Sandbox | 0.20 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | run.cloud | 0.20 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Modal (VM) | 0.40 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | E2B | 0.70 (too few sandboxes) | 0.0014 |
| network | github.com HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Brezel | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Namespace | — | — |
| network | api.github.com HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Modal (VM) | 0.20 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | run.cloud | 0.20 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Daytona (VM) | 0.40 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Brezel | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Brezel | — | — |
| network | raw.githubusercontent.com HTTPS | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Vercel Sandbox | 1.0 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Namespace | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0026 |
| network | raw.githubusercontent.com HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Namespace | — | — |
| network | registry.npmjs.org HTTPS | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Vercel Sandbox | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Brezel | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | E2B | 0.20 (too few sandboxes) | 0.031 |
| network | registry.npmjs.org HTTPS | Freestyle | 0.40 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Microsandbox Cloud | 1.0 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Brezel | — | — |
| network | pypi.org HTTPS | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Namespace | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Microsandbox Cloud | 1.0 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Vercel Sandbox | 0.40 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | run.cloud | 0.70 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | E2B | 0.70 (too few sandboxes) | 0.012 |
| network | pypi.org HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Novita | 0.20 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Modal (VM) | — | — |
| network | files.pythonhosted.org HTTPS | Namespace | 0.70 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Microsandbox Cloud | 1.0 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Vercel Sandbox | 0.70 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Brezel | 0.10 (too few sandboxes) | 0.0026 |
| network | files.pythonhosted.org HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | E2B | 1.0 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Runloop | 0.70 (too few sandboxes) | 0.0026 |
| network | files.pythonhosted.org HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Namespace | — | — |
| network | ghcr.io/v2 HTTPS | Vercel Sandbox | 0.20 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Modal (VM) | 0.20 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Runloop | 0.70 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Brezel | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Namespace | — | — |
| network | gcr.io/v2 HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Vercel Sandbox | 0.70 (too few sandboxes) | 0.0014 |
| network | gcr.io/v2 HTTPS | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Modal (gVisor) | 0.20 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Daytona (VM) | 0.40 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Microsandbox Cloud | 1.0 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Brezel | 0.20 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Namespace | — | — |
| network | auth.docker.io token HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Modal (VM) | 0.20 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Blaxel | 0.70 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Runloop | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Brezel | 1.0 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Freestyle | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | E2B | 0.40 (too few sandboxes) | 0.38 |
| network | auth.docker.io token HTTPS | run.cloud | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Modal (VM) | — | — |
| network | crates.io HTTPS | Brezel | 0.20 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.031 |
| network | crates.io HTTPS | Namespace | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Vercel Sandbox | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Daytona (VM) | 1.0 (too few sandboxes) | 0.0074 |
| network | crates.io HTTPS | Runloop | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | run.cloud | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Blaxel | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | E2B | 0.20 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Freestyle | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Modal (VM) | — | — |
| network | index.crates.io config HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Brezel | 0.70 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | 0.0014 |
| network | index.crates.io config HTTPS | Namespace | 0.70 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | run.cloud | 0.20 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Freestyle | 0.80 (too few sandboxes) | 0.18 |
| network | index.crates.io config HTTPS | Runloop | 1.0 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | tama | 0.20 (too few sandboxes) | <0.001 |
| network | github.com cold DNS | Daytona (VM) | — | — |
| network | github.com cold DNS | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | github.com cold DNS | tama | 0.40 (too few sandboxes) | 0.78 |
| network | github.com cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.99 |
| network | github.com cold DNS | Freestyle | 1.0 (too few sandboxes) | 0.98 |
| network | github.com cold DNS | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | run.cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Namespace | 1.0 (too few sandboxes) | 0.78 |
| network | github.com cold DNS | Blaxel | 1.0 (too few sandboxes) | 0.78 |
| network | github.com cold DNS | Brezel | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | github.com cold DNS | E2B | 0.60 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Novita | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Runloop | — | — |
| network | registry.npmjs.org cold DNS | Namespace | — | — |
| network | registry.npmjs.org cold DNS | Runloop | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Freestyle | 0.10 (too few sandboxes) | 0.033 |
| network | registry.npmjs.org cold DNS | Modal (VM) | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | run.cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.98 |
| network | registry.npmjs.org cold DNS | tama | 1.0 (too few sandboxes) | 0.99 |
| network | registry.npmjs.org cold DNS | Blaxel | 0.40 (too few sandboxes) | 0.78 |
| network | registry.npmjs.org cold DNS | Brezel | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Daytona (VM) | 0.60 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | E2B | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | registry.npmjs.org cold DNS | Novita | 0.10 (too few sandboxes) | 0.033 |
| network | registry.npmjs.org cold DNS | Vercel Sandbox | 0.60 (too few sandboxes) | 0.32 |
| network | docker.io cold DNS | Daytona (VM) | — | — |
| network | docker.io cold DNS | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 0.99 |
| network | docker.io cold DNS | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.99 |
| network | docker.io cold DNS | Runloop | 1.0 (too few sandboxes, equal medians) | 0.99 |
| network | docker.io cold DNS | tama | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | docker.io cold DNS | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | docker.io cold DNS | Freestyle | 0.40 (too few sandboxes) | 0.42 |
| network | docker.io cold DNS | Modal (gVisor) | 0.50 (too few sandboxes) | 0.32 |
| network | docker.io cold DNS | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| network | docker.io cold DNS | run.cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Namespace | 0.60 (too few sandboxes) | 0.78 |
| network | docker.io cold DNS | Brezel | 0.50 (too few sandboxes) | 0.42 |
| network | docker.io cold DNS | E2B | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Novita | 0.20 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Namespace | — | — |
| network | pypi.org cold DNS | Runloop | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | pypi.org cold DNS | Vercel Sandbox | 0.40 (too few sandboxes) | 0.78 |
| network | pypi.org cold DNS | Freestyle | 1.0 (too few sandboxes) | 1.0 |
| network | pypi.org cold DNS | Blaxel | 0.10 (too few sandboxes) | 0.033 |
| network | pypi.org cold DNS | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | pypi.org cold DNS | run.cloud | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | pypi.org cold DNS | Modal (VM) | 0.70 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | tama | 0.90 (too few sandboxes) | 0.99 |
| network | pypi.org cold DNS | Modal (gVisor) | 0.80 (too few sandboxes) | 0.42 |
| network | pypi.org cold DNS | Novita | 0.80 (too few sandboxes, equal medians) | 0.98 |
| network | pypi.org cold DNS | Brezel | 0.70 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | E2B | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | Blaxel | — | — |
| network | rubygems.org cold DNS | run.cloud | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Brezel | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Runloop | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Vercel Sandbox | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Daytona (VM) | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Freestyle | 0.60 (too few sandboxes, equal medians) | 0.98 |
| network | rubygems.org cold DNS | tama | 1.0 (too few sandboxes, equal medians) | 0.99 |
| network | rubygems.org cold DNS | Namespace | 0.40 (too few sandboxes) | 0.42 |
| network | rubygems.org cold DNS | Novita | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Modal (VM) | 0.60 (too few sandboxes) | 0.32 |
| network | rubygems.org cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | E2B | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.033 |
| network | Node 22 download | Runloop | — | — |
| network | Node 22 download | Namespace | 0.70 (too few sandboxes) | 0.98 |
| network | Node 22 download | Vercel Sandbox | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Brezel | 0.20 (too few sandboxes) | 0.32 |
| network | Node 22 download | Daytona (VM) | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | Node 22 download | Modal (gVisor) | 0.10 (too few sandboxes) | 0.033 |
| network | Node 22 download | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | Node 22 download | Blaxel | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Modal (VM) | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | E2B | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Freestyle | 0.70 (too few sandboxes) | 0.98 |
| network | Node 22 download | tama | 1.0 (too few sandboxes) | 0.99 |
| network | Node 22 download | run.cloud | 0.20 (too few sandboxes) | 0.063 |
| system | Git common operations | Brezel | — | — |
| system | Git common operations | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | boat | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.012 |
| system | Git common operations | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Novita | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Brezel | — | — |
| system | pgbench RO (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Brezel | — | — |
| system | pgbench RO latency (s100, 50c) | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | tama | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.50 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Brezel | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | boat | 0.70 (too few sandboxes) | 1.0 |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Runloop | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Brezel | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | boat | 1.0 (too few sandboxes) | 1.0 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | tama | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Runloop | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Freestyle | 0.20 (too few sandboxes) | 0.012 |
| system | PyBench | Brezel | — | — |
| system | PyBench | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | boat | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 1.0 (too few sandboxes, equal medians) | 0.81 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | tama | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | Freestyle | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Brezel | — | — |
| system | SQLite Speedtest | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Namespace | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | tama | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | boat | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | E2B | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Freestyle | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | boat | — | — |
| economics | Hourly cost | tama | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Freestyle | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — (equal values) | — |
| economics | Hourly cost | Runloop | — | — |

</details>

