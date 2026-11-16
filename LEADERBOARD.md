# Sandbox provider leaderboard

Run [`43863642458`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/43863642458) · commit [`8d58408dc4ca36bfae7d9eb83be4b21963562311`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/8d58408dc4ca36bfae7d9eb83be4b21963562311) ·
dataset [`data/dataset/runs/43863642458.json`](data/dataset/runs/43863642458.json) · generated 2026-11-16T15:04:24.980Z

**Partial results — incomplete experiment.** 689 of 1008 planned cells complete; 319 incomplete; 0 excluded.
Only verified measurements are ranked. Missing trials and failed cells remain in the dataset's frozen coverage; provider coverage is uneven and these results do not establish a complete comparison.

Comparison cohort: `sha256:9b9e457d45b6f6285e9407f988ec38bd085838595a4f2504c58691174515a6a7`. Compare scores only with the same workload and eligible metric cohort.

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **833 metric records**
backed by **18218 retained trial observations**, across **64 metrics** and
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
| Baseten Sandboxes | Baseten sandbox runtime (undocumented) | firecracker (microVM, confirmed) |
| Blaxel | microVM | firecracker (microVM, confirmed) |
| boat | KVM virtual machine | qemu-kvm (vm, confirmed) |
| CreateOS | Firecracker microVM | firecracker (microVM, confirmed) |
| Daytona (container) | container (Sysbox/OCI) | docker-runc (container, likely) |
| Daytona (VM) | microVM (Linux VM) | firecracker (microVM, confirmed) |
| DigitalOcean MicroVMs | Firecracker microVM (one container image per VM) | containerd-runc (container, confirmed) on firecracker |
| E2B | Firecracker microVM | firecracker (microVM, confirmed) |
| Freestyle | KVM virtual machine | — |
| Microsandbox Cloud | libkrun microVM (cloud) | libkrun (microVM, strong) |
| Modal (gVisor) | gVisor container | gvisor (user-kernel, confirmed) |
| Modal (VM) | microVM (VM runtime) | cloud-hypervisor (microVM, confirmed) |
| Namespace | microVM (dedicated instance) | oci-container (container, likely) on firecracker |
| Novita | microVM | firecracker (microVM, confirmed) |
| run.cloud | Firecracker microVM | — |
| tama | container (shared kernel) | — |
| Tangle Sandbox | Deployment-dependent (Docker observed during qualification) | docker-runc (container, strong) |
| Vercel Sandbox | Firecracker microVM | firecracker (microVM, confirmed) |

_Not present in this run: Brezel — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

> **Comparability warning:** Daytona (VM)'s observed compute did not match the requested CPU/RAM target; its observed allocation was **8 vCPU · 7.77 GiB RAM · 250.9 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

> **Comparability warning:** DigitalOcean MicroVMs's observed compute did not match the requested CPU/RAM target; its observed allocation was **8 vCPU · 15.64 GiB RAM · 310.4 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

> **Comparability warning:** Modal (gVisor)'s observed compute did not match the requested CPU/RAM target; its observed allocation was **20 vCPU · 8 GiB RAM · 512 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

> **Comparability warning:** Modal (VM)'s observed compute did not match the requested CPU/RAM target; its observed allocation was **20 vCPU · 7.76 GiB RAM · 504 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. Each chart scales to its own slowest pipeline, so compare bar lengths within a chart and the printed totals across charts.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 12 environments, 3 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 5 pipeline tasks across 12 environments, 3 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 6 pipeline tasks across 12 environments, 3 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 21 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.63 | 32.06 – 33.21 | 12 | 12 | — |
| 2 | Namespace | 37.49 | 36.68 – 39.01 | 12 | 12 | — |
| 2 | Modal (VM) | 39.29 | 38.26 – 39.6 | 11 | 11 | tied |
| 4 | Modal (gVisor) | 44.68 | 44.54 – 45.13 | 12 | 12 | — |
| 4 | Blaxel | 44.85 | 44.6 – 46.56 | 12 | 12 | tied |
| 4 | Novita | 47.65 | 45.22 – 49.19 | 12 | 12 | tied |
| 4 | DigitalOcean MicroVMs | 48.25 | 47.01 – 49.11 | 12 | 12 | tied |
| 8 | Microsandbox Cloud | 55.47 | 53.92 – 58.73 | 12 | 12 | — |
| 9 | Vercel Sandbox | 61.16 | 56.42 – 69.81 | 12 | 12 | — |
| 9 | CreateOS | 61.45 | 57.22 – 67.12 | 12 | 12 | tied |
| 9 | boat | 62.44 | 56.66 – 75.36 | 12 | 12 | tied |
| 9 | E2B | 67.09 | 63.42 – 76.47 | 12 | 12 | tied |

### Better-Auth: build

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 35.85 | 35.23 – 37.31 | 12 | 12 | — |
| 2 | Daytona (VM) | 40.55 | 40.17 – 40.79 | 12 | 12 | — |
| 3 | Modal (gVisor) | 42.87 | 42.28 – 45.21 | 12 | 12 | — |
| 4 | DigitalOcean MicroVMs | 53.79 | 53.22 – 60.05 | 12 | 12 | — |
| 4 | Namespace | 58.8 | 53.64 – 73.29 | 12 | 12 | tied |
| 4 | boat | 66.15 | 62.82 – 82.53 | 12 | 12 | tied |
| 4 | CreateOS | 68.04 | 62.3 – 70.55 | 12 | 12 | tied |
| 4 | Novita | 68.5 | 66.99 – 69.2 | 12 | 12 | tied |
| 4 | Blaxel | 68.89 | 67 – 70.87 | 12 | 12 | tied |
| 10 | Microsandbox Cloud | 82.05 | 77.45 – 86.68 | 12 | 12 | — |
| 11 | Vercel Sandbox | 94.94 | 91.35 – 105 | 12 | 12 | — |
| 11 | E2B | 103.5 | 94.97 – 107.4 | 12 | 12 | tied |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 7.852 | 7.796 – 8.013 | 12 | 12 | — |
| 2 | Namespace | 10.7 | 10.15 – 11.15 | 12 | 12 | — |
| 3 | Modal (VM) | 12.74 | 12.35 – 14.63 | 12 | 12 | — |
| 3 | Novita | 13.26 | 12.71 – 13.99 | 12 | 12 | tied |
| 5 | Microsandbox Cloud | 14.94 | 14.65 – 15.28 | 12 | 12 | — |
| 5 | DigitalOcean MicroVMs | 15.38 | 14.99 – 15.94 | 12 | 12 | tied |
| 5 | boat | 15.76 | 13.99 – 20.16 | 12 | 12 | tied |
| 5 | Blaxel | 17.07 | 16.55 – 17.58 | 12 | 12 | tied |
| 9 | Vercel Sandbox | 19.19 | 18.02 – 20.79 | 12 | 12 | — |
| 9 | Modal (gVisor) | 19.53 | 19.38 – 20.92 | 12 | 12 | tied |
| 9 | E2B | 21.64 | 18.83 – 26.89 | 12 | 12 | tied |
| 9 | CreateOS | 28.13 | 19.45 – 29.81 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 0.552 | 0.532 – 0.5925 | 12 | 12 | — |
| 2 | Daytona (VM) | 0.62 | 0.586 – 0.641 | 12 | 12 | — |
| 2 | Modal (VM) | 0.621 | 0.5815 – 3.321 | 12 | 12 | tied |
| 2 | Blaxel | 0.7005 | 0.671 – 0.7365 | 12 | 12 | tied |
| 5 | Modal (gVisor) | 0.8035 | 0.739 – 0.9185 | 12 | 12 | — |
| 5 | Vercel Sandbox | 0.849 | 0.802 – 0.9795 | 12 | 12 | tied |
| 7 | Microsandbox Cloud | 1.113 | 1.071 – 1.143 | 12 | 12 | — |
| 8 | DigitalOcean MicroVMs | 1.415 | 1.313 – 1.546 | 12 | 12 | — |
| 9 | boat | 1.719 | 1.635 – 1.81 | 12 | 12 | — |
| 9 | CreateOS | 1.777 | 1.724 – 1.96 | 12 | 12 | tied |
| 11 | Novita | 2.083 | 2.016 – 2.235 | 12 | 12 | — |
| 11 | E2B | 3.226 | 1.659 – 5.393 | 12 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1.33 | 1.3 – 1.369 | 12 | 12 | — |
| 2 | Daytona (VM) | 1.788 | 1.761 – 1.807 | 12 | 12 | — |
| 3 | DigitalOcean MicroVMs | 2.039 | 2.025 – 2.091 | 12 | 12 | — |
| 4 | Namespace | 2.82 | 2.585 – 3.193 | 12 | 12 | — |
| 4 | boat | 3.146 | 2.806 – 3.519 | 12 | 12 | tied |
| 4 | CreateOS | 3.237 | 3.106 – 3.557 | 12 | 12 | tied |
| 4 | Novita | 3.335 | 3.22 – 3.431 | 12 | 12 | tied |
| 8 | Blaxel | 3.572 | 3.516 – 3.674 | 12 | 12 | — |
| 9 | Microsandbox Cloud | 3.899 | 3.699 – 4.24 | 12 | 12 | — |
| 10 | Vercel Sandbox | 4.418 | 4.306 – 5.04 | 12 | 12 | — |
| 11 | E2B | 5.064 | 4.76 – 5.217 | 12 | 12 | — |
| 12 | Modal (gVisor) | 5.957 | 5.822 – 6.175 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 9.692 | 9.663 – 9.8 | 12 | 12 | — |
| 2 | Modal (VM) | 9.908 | 9.823 – 10.11 | 12 | 12 | — |
| 2 | boat | 10.78 | 9.898 – 11.66 | 12 | 12 | tied |
| 2 | Blaxel | 11.39 | 11.05 – 11.67 | 12 | 12 | tied |
| 2 | Novita | 11.54 | 11.18 – 12.08 | 12 | 12 | tied |
| 2 | DigitalOcean MicroVMs | 11.57 | 11.46 – 11.89 | 12 | 12 | tied |
| 2 | Namespace | 11.6 | 10.39 – 13.43 | 12 | 12 | tied |
| 2 | CreateOS | 11.91 | 10.99 – 12.17 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 12.85 | 12.69 – 13.06 | 12 | 12 | — |
| 9 | Microsandbox Cloud | 13.71 | 12.46 – 14.83 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 16.46 | 15.51 – 18.09 | 12 | 12 | — |
| 12 | E2B | 19.15 | 17.33 – 19.86 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.555 | 2.467 – 2.571 | 12 | 12 | — |
| 2 | Modal (VM) | 2.657 | 2.609 – 2.724 | 12 | 12 | — |
| 2 | DigitalOcean MicroVMs | 2.718 | 2.685 – 2.749 | 12 | 12 | tied |
| 2 | Namespace | 2.772 | 2.425 – 3.305 | 12 | 12 | tied |
| 2 | boat | 2.784 | 2.583 – 3.547 | 12 | 12 | tied |
| 2 | Modal (gVisor) | 2.917 | 2.902 – 2.993 | 12 | 12 | tied |
| 2 | CreateOS | 2.936 | 2.826 – 3.114 | 12 | 12 | tied |
| 2 | Blaxel | 3.05 | 3.03 – 3.076 | 12 | 12 | tied |
| 2 | Novita | 3.062 | 3.006 – 3.215 | 12 | 12 | tied |
| 10 | Microsandbox Cloud | 3.627 | 3.367 – 4.123 | 12 | 12 | — |
| 11 | Vercel Sandbox | 4.951 | 4.727 – 5.628 | 12 | 12 | — |
| 11 | E2B | 5.207 | 4.601 – 5.499 | 12 | 12 | tied |

### Better-Auth: lint packages

Seconds · lower is better

_Modal (VM) leads · DigitalOcean MicroVMs is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1.569 | 1.542 – 1.599 | 12 | 12 | — |
| 2 | DigitalOcean MicroVMs | 1.668 | 1.613 – 1.689 | 12 | 12 | — |
| 3 | Daytona (VM) | 1.707 | 1.697 – 1.718 | 12 | 12 | — |
| 4 | Modal (gVisor) | 2.143 | 2.099 – 2.162 | 12 | 12 | — |
| 5 | Namespace | 2.329 | 2.194 – 3.064 | 12 | 12 | — |
| 5 | CreateOS | 2.558 | 2.435 – 2.92 | 12 | 12 | tied |
| 5 | Novita | 2.736 | 2.683 – 2.819 | 12 | 12 | tied |
| 5 | boat | 2.839 | 2.542 – 3.046 | 12 | 12 | tied |
| 5 | Blaxel | 3.042 | 2.925 – 3.079 | 12 | 12 | tied |
| 10 | Microsandbox Cloud | 3.446 | 3.144 – 3.691 | 12 | 12 | — |
| 11 | Vercel Sandbox | 4.026 | 3.867 – 4.38 | 12 | 12 | — |
| 11 | E2B | 4.277 | 4.063 – 4.494 | 12 | 12 | tied |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM) and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6.464 | 6.426 – 6.53 | 12 | 12 | — |
| 1 | Modal (VM) | 6.492 | 6.455 – 6.633 | 12 | 12 | tied |
| 3 | DigitalOcean MicroVMs | 6.971 | 6.934 – 7.215 | 12 | 12 | — |
| 3 | boat | 7.059 | 6.864 – 8.302 | 12 | 12 | tied |
| 3 | CreateOS | 7.231 | 7.024 – 7.419 | 12 | 12 | tied |
| 6 | Modal (gVisor) | 7.696 | 7.575 – 7.984 | 12 | 12 | — |
| 6 | Novita | 7.782 | 7.615 – 8.145 | 12 | 12 | tied |
| 8 | Blaxel | 8.974 | 8.726 – 9.243 | 12 | 12 | — |
| 8 | Namespace | 9.3 | 6.76 – 10.22 | 12 | 12 | tied |
| 8 | Microsandbox Cloud | 9.706 | 8.492 – 11.05 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 12.61 | 11.9 – 13.77 | 12 | 12 | — |
| 11 | E2B | 13.57 | 13.1 – 14.67 | 12 | 12 | tied |

### Better-Auth: lint types

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9.905 | 9.531 – 10.36 | 12 | 12 | — |
| 2 | Daytona (VM) | 13.95 | 13.41 – 14.1 | 12 | 12 | — |
| 3 | DigitalOcean MicroVMs | 15.96 | 15.36 – 17.57 | 12 | 12 | — |
| 4 | Modal (gVisor) | 22.01 | 21.7 – 23.43 | 12 | 12 | — |
| 5 | boat | 31.87 | 30.05 – 44.09 | 12 | 12 | — |
| 5 | Novita | 33.81 | 31.59 – 34.26 | 12 | 12 | tied |
| 5 | Blaxel | 33.94 | 32.21 – 34.66 | 12 | 12 | tied |
| 5 | Namespace | 35.81 | 29.9 – 45.08 | 12 | 12 | tied |
| 5 | CreateOS | 38.24 | 33.05 – 39.77 | 12 | 12 | tied |
| 10 | Microsandbox Cloud | 41.91 | 41.11 – 46.77 | 12 | 12 | — |
| 11 | E2B | 52.14 | 46.85 – 60.96 | 12 | 12 | — |
| 11 | Vercel Sandbox | 52.41 | 49.45 – 55.32 | 12 | 12 | tied |

### Better-Auth: typecheck

Seconds · lower is better

_Modal (VM) and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 35.36 | 34.95 – 36.29 | 12 | 12 | — |
| 1 | Daytona (VM) | 36.17 | 35.95 – 36.41 | 12 | 12 | tied |
| 3 | DigitalOcean MicroVMs | 37.44 | 36.81 – 39.2 | 12 | 12 | — |
| 4 | Modal (gVisor) | 40.66 | 39.56 – 43.87 | 12 | 12 | — |
| 4 | Namespace | 43.5 | 38.31 – 60.97 | 12 | 12 | tied |
| 4 | boat | 45.03 | 42.55 – 61.77 | 12 | 12 | tied |
| 4 | CreateOS | 45.33 | 42.64 – 49.09 | 12 | 12 | tied |
| 4 | Novita | 46.18 | 45.47 – 47.27 | 12 | 12 | tied |
| 9 | Blaxel | 48.15 | 47.77 – 49.28 | 12 | 12 | — |
| 10 | Microsandbox Cloud | 54.02 | 49.85 – 61.17 | 12 | 12 | — |
| 11 | Vercel Sandbox | 67.74 | 66.14 – 71.52 | 12 | 12 | — |
| 11 | E2B | 77.57 | 69.83 – 84.35 | 12 | 12 | tied |

### Mastra: build:core

Seconds · lower is better

_Modal (VM) and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 59.3 | 58.71 – 61.72 | 11 | 11 | — |
| 1 | Daytona (VM) | 60.82 | 60.58 – 60.99 | 12 | 12 | tied |
| 3 | Namespace | 65.35 | 62.69 – 70.6 | 12 | 12 | — |
| 4 | Modal (gVisor) | 68.42 | 67.99 – 70.73 | 12 | 12 | — |
| 4 | DigitalOcean MicroVMs | 70.5 | 69.34 – 71.79 | 12 | 12 | tied |
| 4 | CreateOS | 75.15 | 66.29 – 82.06 | 12 | 12 | tied |
| 4 | Novita | 80.02 | 76.6 – 83.66 | 12 | 12 | tied |
| 4 | Blaxel | 82.96 | 81.68 – 83.88 | 12 | 12 | tied |
| 9 | Microsandbox Cloud | 87.8 | 85.8 – 90.97 | 12 | 12 | — |
| 9 | boat | 93.39 | 70.91 – 116.3 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 120.2 | 115.8 – 127 | 12 | 12 | — |
| 11 | E2B | 131.3 | 104.4 – 139.4 | 12 | 12 | tied |

### Mastra: git clone

Seconds · lower is better

_Namespace leads · Modal (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.505 | 1.466 – 1.55 | 12 | 12 | — |
| 2 | Modal (VM) | 1.678 | 1.622 – 2.126 | 11 | 11 | — |
| 2 | Daytona (VM) | 1.75 | 1.729 – 1.772 | 12 | 12 | tied |
| 4 | Blaxel | 1.929 | 1.909 – 1.991 | 12 | 12 | — |
| 5 | Modal (gVisor) | 2.141 | 2.112 – 2.194 | 12 | 12 | — |
| 6 | Microsandbox Cloud | 2.304 | 2.223 – 2.386 | 12 | 12 | — |
| 7 | Vercel Sandbox | 2.417 | 2.298 – 2.581 | 12 | 12 | — |
| 8 | Novita | 3.227 | 2.814 – 3.425 | 12 | 12 | — |
| 9 | E2B | 3.449 | 3.309 – 4.244 | 12 | 12 | — |
| 9 | DigitalOcean MicroVMs | 4.37 | 2.964 – 4.447 | 12 | 12 | tied |
| 9 | CreateOS | 4.814 | 3.316 – 14.2 | 12 | 12 | tied |
| 9 | boat | 4.977 | 3.541 – 5.963 | 12 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 84.28 | 84.17 – 84.66 | 12 | 12 | — |
| 2 | DigitalOcean MicroVMs | 87.2 | 86.09 – 87.67 | 12 | 12 | — |
| 2 | Modal (VM) | 88.27 | 85.67 – 88.82 | 11 | 11 | tied |
| 4 | CreateOS | 94.55 | 93.95 – 109.4 | 12 | 12 | — |
| 4 | Modal (gVisor) | 96.51 | 95.87 – 97.81 | 12 | 12 | tied |
| 4 | Namespace | 96.62 | 87.6 – 120.2 | 12 | 12 | tied |
| 4 | Novita | 100.4 | 99.58 – 106.1 | 12 | 12 | tied |
| 4 | Blaxel | 101.7 | 100.6 – 103 | 12 | 12 | tied |
| 4 | boat | 101.7 | 93.48 – 121.2 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 121.9 | 108.2 – 125.8 | 12 | 12 | tied |
| 11 | E2B | 156.9 | 131.1 – 179 | 12 | 12 | — |
| 11 | Vercel Sandbox | 160.1 | 156.6 – 169.6 | 12 | 12 | tied |

### Mastra: test:core

Seconds · lower is better

_CreateOS leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: test:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | CreateOS | 890.6 | 889.5 – 900.5 | 12 | 12 | — |
| 2 | Daytona (VM) | 905.2 | 901.5 – 908.1 | 12 | 12 | — |
| 3 | Modal (VM) | 922.9 | 914.4 – 937.1 | 11 | 11 | — |
| 3 | Namespace | 933.4 | 910.1 – 1002 | 12 | 12 | tied |
| 3 | DigitalOcean MicroVMs | 953.7 | 950.8 – 954.4 | 12 | 12 | tied |
| 6 | Novita | 1020 | 1015 – 1054 | 12 | 12 | — |
| 6 | Microsandbox Cloud | 1022 | 994.8 – 1054 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 1058 | 1053 – 1065 | 11 | 11 | — |
| 9 | Blaxel | 1071 | 1065 – 1079 | 12 | 12 | — |
| 9 | boat | 1094 | 997 – 1425 | 10 | 10 | tied |
| 9 | Vercel Sandbox | 1303 | 1286 – 1342 | 12 | 12 | tied |
| 9 | E2B | 1446 | 1318 – 1590 | 12 | 12 | tied |

### OpenClaw: cold install

Seconds · lower is better

_Daytona (VM) leads · Modal (VM) is ~1.5× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 7.637 | 7.357 – 7.889 | 12 | 12 | — |
| 2 | Modal (VM) | 11.22 | 10.98 – 13.31 | 12 | 12 | — |
| 2 | Namespace | 11.58 | 10.35 – 12.36 | 12 | 12 | tied |
| 4 | Modal (gVisor) | 14.41 | 14.18 – 14.72 | 12 | 12 | — |
| 4 | Novita | 15.14 | 14.13 – 15.57 | 12 | 12 | tied |
| 6 | Blaxel | 15.76 | 15.19 – 16.16 | 12 | 12 | — |
| 7 | Microsandbox Cloud | 17.42 | 16.98 – 18.54 | 3 | 3 | — |
| 7 | boat | 17.85 | 15.21 – 18.92 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 18.57 | 17.01 – 20.92 | 12 | 12 | tied |
| 10 | CreateOS | 20.22 | — | 1 | 1 | — |
| 11 | E2B | 23.21 | 19.16 – 34.71 | 12 | 12 | — |
| 11 | DigitalOcean MicroVMs | 29.11 | 22.92 – 32.28 | 12 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Namespace leads · Modal (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.294 | 2.222 – 2.7 | 12 | 12 | — |
| 2 | Modal (VM) | 2.764 | 2.639 – 8.819 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.775 | 2.736 – 2.864 | 12 | 12 | tied |
| 4 | Blaxel | 3.027 | 2.897 – 3.33 | 12 | 12 | — |
| 5 | Modal (gVisor) | 3.673 | 3.649 – 3.7 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 3.761 | 3.738 – 4.111 | 3 | 3 | tied |
| 5 | Vercel Sandbox | 3.8 | 3.556 – 8.097 | 12 | 12 | tied |
| 8 | CreateOS | 4.721 | — | 1 | 1 | — |
| 9 | Novita | 5.294 | 4.671 – 7.858 | 12 | 12 | — |
| 9 | E2B | 6.043 | 4.863 – 9.574 | 12 | 12 | tied |
| 9 | boat | 6.233 | 4.932 – 9.768 | 12 | 12 | tied |
| 9 | DigitalOcean MicroVMs | 8.979 | 8.807 – 9.062 | 12 | 12 | tied |

### OpenClaw: lint (all extensions)

Seconds · lower is better

_Daytona (VM) leads · Modal (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (all extensions) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 104.6 | 104.1 – 106.1 | 12 | 12 | — |
| 2 | Modal (VM) | 133.5 | 130.6 – 135.3 | 12 | 12 | — |
| 2 | Modal (gVisor) | 138.2 | 129.9 – 154.1 | 12 | 12 | tied |
| 4 | CreateOS | 139.6 | — | 1 | 1 | — |
| 5 | Microsandbox Cloud | 156 | 154.4 – 172.9 | 3 | 3 | — |
| 5 | boat | 165.6 | 155 – 204.1 | 12 | 12 | tied |
| 5 | Namespace | 167.8 | 160.2 – 173.6 | 12 | 12 | tied |
| 8 | Blaxel | 177.1 | 174.8 – 183.8 | 12 | 12 | — |
| 9 | Novita | 192.8 | 191.1 – 198.6 | 12 | 12 | — |
| 10 | DigitalOcean MicroVMs | 209.9 | 200.5 – 221.7 | 12 | 12 | — |
| 11 | Vercel Sandbox | 218.5 | 213.5 – 236.8 | 12 | 12 | — |
| 12 | E2B | 313.8 | 279 – 335.5 | 12 | 12 | — |

### OpenClaw: lint (Oxlint)

Seconds · lower is better

_Daytona (VM) leads · Modal (gVisor) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (Oxlint) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 179.4 | 179 – 180.5 | 12 | 12 | — |
| 2 | Modal (gVisor) | 231.5 | 229.2 – 237.7 | 12 | 12 | — |
| 3 | Modal (VM) | 239.1 | 235.8 – 244.3 | 12 | 12 | — |
| 4 | CreateOS | 285.8 | — | 1 | 1 | — |
| 5 | Microsandbox Cloud | 308.6 | 307.9 – 329.1 | 3 | 3 | — |
| 5 | boat | 318.2 | 283.8 – 349.9 | 12 | 12 | tied |
| 5 | Blaxel | 340 | 334.8 – 350.4 | 12 | 12 | tied |
| 5 | Namespace | 350.4 | 320.3 – 422.6 | 12 | 12 | tied |
| 5 | DigitalOcean MicroVMs | 370.5 | 363.5 – 381.3 | 12 | 12 | tied |
| 5 | Novita | 389.6 | 379.7 – 396 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 410.6 | 403.3 – 419 | 12 | 12 | — |
| 12 | E2B | 599.5 | 571.7 – 644.4 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · CreateOS is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 94.94 | 94.06 – 97.39 | 12 | 12 | — |
| 2 | CreateOS | 101.4 | — | 1 | 1 | — |
| 3 | Microsandbox Cloud | 110.9 | 106.6 – 112.8 | 3 | 3 | — |
| 4 | Namespace | 116.4 | 113.7 – 120.4 | 12 | 12 | — |
| 4 | boat | 119.5 | 113 – 165.4 | 12 | 12 | tied |
| 4 | Novita | 120.4 | 118.7 – 123.1 | 12 | 12 | tied |
| 4 | Blaxel | 121.3 | 119 – 123.4 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 146 | 144.6 – 148.4 | 12 | 12 | — |
| 8 | Vercel Sandbox | 147 | 141.7 – 154.1 | 12 | 12 | tied |
| 10 | Modal (VM) | 157.9 | 157 – 159.4 | 12 | 12 | — |
| 10 | DigitalOcean MicroVMs | 161.8 | 154.8 – 165.1 | 12 | 12 | tied |
| 12 | E2B | 190.2 | 170.1 – 200.5 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) leads · Modal (gVisor) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 10.88 | 10.68 – 10.94 | 12 | 12 | — |
| 2 | Modal (gVisor) | 12.07 | 11.7 – 12.77 | 12 | 12 | — |
| 2 | Modal (VM) | 12.57 | 12.45 – 12.76 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 18.32 | 17.52 – 20.59 | 3 | 3 | — |
| 4 | boat | 19.2 | 17.5 – 28.44 | 12 | 12 | tied |
| 6 | CreateOS | 19.32 | — | 1 | 1 | — |
| 7 | Blaxel | 20.57 | 20.06 – 20.97 | 12 | 12 | — |
| 7 | Namespace | 21.01 | 20.17 – 22.28 | 12 | 12 | tied |
| 7 | DigitalOcean MicroVMs | 22.07 | 20.92 – 22.88 | 12 | 12 | tied |
| 7 | Novita | 22.95 | 22.23 – 23.58 | 12 | 12 | tied |
| 11 | Vercel Sandbox | 26.82 | 25.32 – 30.88 | 12 | 12 | — |
| 12 | E2B | 36.57 | 33.2 – 39.79 | 12 | 12 | — |

</details>

## cpu

<img src="docs/figures/node_web_tooling_runs_per_s.webp" width="960" alt="Node.js web tooling: 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace, CreateOS, Daytona (VM), Modal (VM), DigitalOcean MicroVMs, Baseten Sandboxes, Blaxel, Modal (gVisor), Novita, boat, Daytona (container), Microsandbox Cloud, E2B and Vercel Sandbox share the top on this metric (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 23.86 | 20.05 – 25.81 | 5 | 10 | — |
| 1 | CreateOS | 21.91 | 21.15 – 22.94 | 5 | 10 | tied |
| 1 | Daytona (VM) | 21.7 | 21.5 – 21.91 | 5 | 10 | tied |
| 1 | Modal (VM) | 21.46 | 17.79 – 21.81 | 5 | 10 | tied |
| 1 | DigitalOcean MicroVMs | 21.32 | 20.69 – 21.64 | 5 | 10 | tied |
| 1 | Baseten Sandboxes | 20.67 | 20.23 – 20.74 | 4 | 8 | tied |
| 1 | Blaxel | 20.23 | 19.98 – 20.34 | 5 | 10 | tied |
| 1 | Modal (gVisor) | 20.07 | 19.21 – 20.47 | 5 | 10 | tied |
| 1 | Novita | 19.31 | 18.79 – 19.93 | 5 | 10 | tied |
| 1 | boat | 18.02 | 13.62 – 22.73 | 5 | 10 | tied |
| 1 | Daytona (container) | 16.54 | 14.54 – 16.64 | 5 | 10 | tied |
| 1 | Microsandbox Cloud | 16.46 | 15.72 – 17.5 | 5 | 10 | tied |
| 1 | E2B | 14.29 | 10.31 – 17.57 | 5 | 10 | tied |
| 1 | Vercel Sandbox | 11.32 | 8.455 – 12.24 | 5 | 10 | tied |
| 15 | Tangle Sandbox | 8.335 | 8.28 – 8.4 | 5 | 10 | — |

</details>

## disk

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand write 4KB, O_DIRECT (MB/s): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand write 4KB, O_DIRECT (MB/s)</summary>

### fio rand write 4KB, O_DIRECT (MB/s) _(headline)_

MB/s · higher is better

_Tangle Sandbox leads · ~2.0× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Tangle Sandbox | 2524 | 1665 – 2810 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1250 | 902.8 – 1447 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 895.5 | 871.9 – 898.6 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 829.4 | 774.4 – 889.2 | 3 | 6 | too few sandboxes |
| 5 | boat | 825.8 | 691 – 909.1 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 774.4 | 745.5 – 800.1 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 654.8 | 600.3 – 1310 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 475.5 | 412.1 – 482.9 | 3 | 6 | too few sandboxes |
| 9 | DigitalOcean MicroVMs | 424.7 | 423.1 – 470.3 | 3 | 6 | too few sandboxes |
| 10 | CreateOS | 349.2 | 338.7 – 358.6 | 3 | 6 | too few sandboxes |
| 11 | Novita | 320.9 | 320.9 – 321.9 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 249 | 243.3 – 250.1 | 3 | 6 | too few sandboxes |
| 13 | E2B | 242.2 | 241.2 – 245.4 | 3 | 6 | too few sandboxes |
| 14 | Daytona (container) | 232.8 | 223.9 – 233.3 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Tangle Sandbox leads · ~2.2× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand read 4KB, O_DIRECT (IOPS): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Tangle Sandbox | 640500 | 411500 – 681500 | 3 | 6 | — |
| 2 | boat | 296500 | 296500 – 296500 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 269000 | 177000 – 276000 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 250000 | 243000 – 254000 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 178000 | 177500 – 179000 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 168000 | 162500 – 176000 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 156500 | 148000 – 420500 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 139000 | 123750 – 176000 | 3 | 6 | too few sandboxes |
| 9 | DigitalOcean MicroVMs | 117000 | 81150 – 132000 | 3 | 6 | too few sandboxes |
| 10 | Daytona (container) | 110000 | 110000 – 120500 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 96900 | 88500 – 124000 | 3 | 6 | too few sandboxes |
| 12 | Novita | 78450 | 73400 – 80000 | 3 | 6 | too few sandboxes |
| 13 | E2B | 58350 | 57700 – 59850 | 3 | 6 | too few sandboxes |
| 14 | CreateOS | 51950 | 51700 – 53650 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Tangle Sandbox leads · ~2.2× boat on median (higher is better)._

<img src="docs/figures/fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio rand read 4KB, O_DIRECT (MB/s): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Tangle Sandbox | 2625 | 1686 – 2791 | 3 | 6 | — |
| 2 | boat | 1214 | 1213 – 1214 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 1103 | 724 – 1131 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 1022 | 996.7 – 1040 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 727.7 | 726.7 – 731.9 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 687.3 | 665.8 – 720.9 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 642.3 | 604.5 – 1721 | 3 | 6 | too few sandboxes |
| 8 | Daytona (VM) | 568.3 | 507 – 719.8 | 3 | 6 | too few sandboxes |
| 9 | DigitalOcean MicroVMs | 478.2 | 331.9 – 540.5 | 3 | 6 | too few sandboxes |
| 10 | Daytona (container) | 449.8 | 449.8 – 492.8 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 396.9 | 362.3 – 507 | 3 | 6 | too few sandboxes |
| 12 | Novita | 321.4 | 300.4 – 327.7 | 3 | 6 | too few sandboxes |
| 13 | E2B | 239.1 | 236.5 – 244.8 | 3 | 6 | too few sandboxes |
| 14 | CreateOS | 212.9 | 211.8 – 219.7 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Tangle Sandbox leads · ~2.0× Vercel Sandbox on median (higher is better)._

<img src="docs/figures/fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio rand write 4KB, O_DIRECT (IOPS): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Tangle Sandbox | 616000 | 406500 – 686000 | 3 | 6 | — |
| 2 | Vercel Sandbox | 305000 | 220500 – 353000 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 218500 | 213000 – 219500 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 202500 | 189000 – 217500 | 3 | 6 | too few sandboxes |
| 5 | boat | 202000 | 169000 – 222000 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 189000 | 182000 – 195000 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 159500 | 146500 – 320000 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 116000 | 100500 – 118000 | 3 | 6 | too few sandboxes |
| 9 | DigitalOcean MicroVMs | 103700 | 103300 – 114600 | 3 | 6 | too few sandboxes |
| 10 | CreateOS | 85250 | 82650 – 87650 | 3 | 6 | too few sandboxes |
| 11 | Novita | 78400 | 78300 – 78650 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 60850 | 59400 – 61100 | 3 | 6 | too few sandboxes |
| 13 | E2B | 59200 | 58950 – 59850 | 3 | 6 | too few sandboxes |
| 14 | Daytona (container) | 56850 | 54700 – 56950 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~5.0× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq read 1MB, O_DIRECT (IOPS): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 105000 | 102000 – 107500 | 3 | 6 | — |
| 2 | Daytona (VM) | 21000 | 20650 – 21200 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 13800 | 13350 – 17550 | 3 | 6 | too few sandboxes |
| 4 | Daytona (container) | 10200 | 9241 – 10640 | 3 | 6 | too few sandboxes |
| 5 | Novita | 8580 | 8529 – 9514 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 8097 | 8025 – 8342 | 3 | 6 | too few sandboxes |
| 7 | boat | 7339 | 4718 – 7452 | 3 | 6 | too few sandboxes |
| 8 | Tangle Sandbox | 6887 | 6174 – 7422 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 5291 | 4825 – 5564 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 3968 | 3365 – 3974 | 3 | 6 | too few sandboxes |
| 11 | CreateOS | 2804 | 2724 – 2817 | 3 | 6 | too few sandboxes |
| 12 | DigitalOcean MicroVMs | 2793 | 2682 – 3085 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 2286 | 2243 – 2388 | 3 | 6 | too few sandboxes |
| 14 | E2B | 599.5 | 599 – 600 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (gVisor) leads · ~5.0× Daytona (VM) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq read 1MB, O_DIRECT (MB/s): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 110100 | 107200 – 112700 | 3 | 6 | — |
| 2 | Daytona (VM) | 22070 | 21640 – 22230 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 14500 | 14010 – 18360 | 3 | 6 | too few sandboxes |
| 4 | Daytona (container) | 10660 | 9691 – 11150 | 3 | 6 | too few sandboxes |
| 5 | Novita | 8998 | 8945 – 10000 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 8492 | 8416 – 8748 | 3 | 6 | too few sandboxes |
| 7 | boat | 7697 | 4949 – 7815 | 3 | 6 | too few sandboxes |
| 8 | Tangle Sandbox | 7223 | 6475 – 7785 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 5550 | 5060 – 5836 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 4162 | 3530 – 4168 | 3 | 6 | too few sandboxes |
| 11 | CreateOS | 2941 | 2858 – 2955 | 3 | 6 | too few sandboxes |
| 12 | DigitalOcean MicroVMs | 2930 | 2814 – 3236 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 2398 | 2353 – 2505 | 3 | 6 | too few sandboxes |
| 14 | E2B | 630.2 | 630.2 – 630.2 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.7× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops.webp" width="960" alt="fio seq write 1MB, O_DIRECT (IOPS): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 16450 | 16450 – 16450 | 3 | 6 | — |
| 2 | Modal (gVisor) | 9656 | 7193 – 10150 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 9313 | 3549 – 10950 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 6293 | 5458 – 6681 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 5854 | 5007 – 5930 | 3 | 6 | too few sandboxes |
| 6 | Tangle Sandbox | 5794 | 5056 – 5989 | 3 | 6 | too few sandboxes |
| 7 | Novita | 5494 | 5172 – 5727 | 3 | 6 | too few sandboxes |
| 8 | Daytona (container) | 4059 | 3756 – 4184 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 3433 | 2566 – 3452 | 3 | 6 | too few sandboxes |
| 10 | DigitalOcean MicroVMs | 3016 | 2669 – 3127 | 3 | 6 | too few sandboxes |
| 11 | CreateOS | 2429 | 2325 – 2614 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 1855 | 1601 – 2007 | 3 | 6 | too few sandboxes |
| 13 | boat | 1685 | 1478 – 3118 | 3 | 6 | too few sandboxes |
| 14 | E2B | 599 | 571.5 – 600 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s.webp" width="960" alt="fio seq write 1MB, O_DIRECT (MB/s): 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 17290 | 17230 – 17290 | 3 | 6 | — |
| 2 | Modal (gVisor) | 10150 | 7545 – 10670 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 9738 | 3723 – 11490 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 6601 | 5724 – 7008 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 6140 | 5252 – 6220 | 3 | 6 | too few sandboxes |
| 6 | Tangle Sandbox | 6076 | 5303 – 6281 | 3 | 6 | too few sandboxes |
| 7 | Novita | 5762 | 5425 – 6007 | 3 | 6 | too few sandboxes |
| 8 | Daytona (container) | 4257 | 3940 – 4388 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 3601 | 2692 – 3620 | 3 | 6 | too few sandboxes |
| 10 | DigitalOcean MicroVMs | 3164 | 2800 – 3280 | 3 | 6 | too few sandboxes |
| 11 | CreateOS | 2548 | 2439 – 2742 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 1946 | 1680 – 2106 | 3 | 6 | too few sandboxes |
| 13 | boat | 1768 | 1550 – 3271 | 3 | 6 | too few sandboxes |
| 14 | E2B | 630.2 | 601.4 – 630.7 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_CreateOS leads · ~1.1× Daytona (VM) on median (higher is better)._

<img src="docs/figures/hardlink_bogo_ops_per_s.webp" width="960" alt="Hardlink throughput: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | CreateOS | 18.36 | 18 – 18.54 | 3 | 6 | — |
| 2 | Daytona (VM) | 16.98 | 16.89 – 17.13 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 16.94 | 16.92 – 17.05 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 14.16 | 11.91 – 15.17 | 3 | 6 | too few sandboxes |
| 5 | Novita | 12.04 | 12.03 – 12.04 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 10.76 | 8.315 – 10.8 | 3 | 6 | too few sandboxes |
| 7 | DigitalOcean MicroVMs | 9.405 | 9.335 – 9.49 | 3 | 6 | too few sandboxes |
| 8 | Tangle Sandbox | 8.75 | 6.92 – 12.23 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 8.32 | 8.255 – 8.405 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 7.04 | 6.92 – 26.59 | 3 | 6 | too few sandboxes |
| 11 | boat | 6.79 | 6.155 – 7.42 | 3 | 6 | too few sandboxes |
| 12 | Modal (gVisor) | 4.52 | 4.455 – 4.575 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 1.955 | 1.92 – 1.96 | 3 | 6 | too few sandboxes |
| 14 | E2B | 1.76 | 1.76 – 2 | 3 | 6 | too few sandboxes |

</details>

## memory

<img src="docs/figures/stream_type_triad.webp" width="960" alt="STREAM Triad: 15 environments ranked best-first, with 95% intervals">

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 260200 | 258800 – 260800 | 3 | 6 | — |
| 2 | Novita | 155200 | 50790 – 166900 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 150300 | 143100 – 176900 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 145900 | 144700 – 175300 | 3 | 6 | too few sandboxes |
| 5 | DigitalOcean MicroVMs | 141300 | 130000 – 170500 | 3 | 6 | too few sandboxes |
| 6 | Baseten Sandboxes | 67417 | 66720 – 69830 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 67410 | 67350 – 67710 | 3 | 6 | too few sandboxes |
| 8 | boat | 57950 | 26140 – 68560 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 56590 | 56460 – 56660 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 52850 | 46200 – 52990 | 3 | 6 | too few sandboxes |
| 11 | E2B | 47230 | 43830 – 55180 | 3 | 6 | too few sandboxes |
| 12 | CreateOS | 45010 | 41950 – 45240 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 33280 | 32630 – 33310 | 3 | 6 | too few sandboxes |
| 14 | Daytona (container) | 26090 | 17140 – 28460 | 3 | 6 | too few sandboxes |
| 15 | Tangle Sandbox | 20760 | 19790 – 30110 | 3 | 6 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Novita on median (higher is better)._

<img src="docs/figures/stream_type_add.webp" width="960" alt="STREAM Add: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 257805 | 256200 – 258100 | 3 | 6 | — |
| 2 | Novita | 156471 | 50790 – 166400 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 144600 | 141700 – 173500 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 144462 | 143900 – 173100 | 3 | 6 | too few sandboxes |
| 5 | DigitalOcean MicroVMs | 141800 | 129900 – 166800 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 67060 | 67010 – 67300 | 3 | 6 | too few sandboxes |
| 7 | Baseten Sandboxes | 67050 | 66350 – 69894 | 3 | 6 | too few sandboxes |
| 8 | boat | 56920 | 26260 – 71550 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 56520 | 56410 – 56684 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 52030 | 45270 – 52520 | 3 | 6 | too few sandboxes |
| 11 | E2B | 47390 | 44690 – 54530 | 3 | 6 | too few sandboxes |
| 12 | CreateOS | 44870 | 41800 – 45090 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 33190 | 32660 – 33280 | 3 | 6 | too few sandboxes |
| 14 | Tangle Sandbox | 20900 | 20290 – 30320 | 3 | 6 | too few sandboxes |
| 15 | Daytona (container) | 18320 | 17420 – 25220 | 3 | 6 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.5× Modal (VM) on median (higher is better)._

<img src="docs/figures/stream_type_copy.webp" width="960" alt="STREAM Copy: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 277400 | 275900 – 277500 | 3 | 6 | — |
| 2 | Modal (VM) | 190600 | 188400 – 218900 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 190100 | 189200 – 212200 | 3 | 6 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 174900 | 156400 – 206700 | 3 | 6 | too few sandboxes |
| 5 | Novita | 162300 | 57540 – 171600 | 3 | 6 | too few sandboxes |
| 6 | Baseten Sandboxes | 90020 | 87837 – 95350 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 89590 | 89460 – 90420 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 86520 | 86290 – 87060 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 84580 | 39940 – 84830 | 3 | 6 | too few sandboxes |
| 10 | E2B | 75400 | 70430 – 78810 | 3 | 6 | too few sandboxes |
| 11 | boat | 75320 | 35290 – 88950 | 3 | 6 | too few sandboxes |
| 12 | CreateOS | 47970 | 45290 – 48000 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 43900 | 43670 – 44290 | 3 | 6 | too few sandboxes |
| 14 | Tangle Sandbox | 30440 | 23850 – 40660 | 3 | 6 | too few sandboxes |
| 15 | Daytona (container) | 22770 | 12060 – 23266 | 3 | 6 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Novita on median (higher is better)._

<img src="docs/figures/stream_type_scale.webp" width="960" alt="STREAM Scale: 15 environments ranked best-first, with 95% intervals">

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 241900 | 241100 – 242300 | 3 | 6 | — |
| 2 | Novita | 150200 | 48420 – 158834 | 3 | 6 | too few sandboxes |
| 3 | DigitalOcean MicroVMs | 139400 | 125200 – 158700 | 3 | 6 | too few sandboxes |
| 4 | Modal (gVisor) | 134400 | 132800 – 158300 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 134400 | 130700 – 161200 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 61840 | 61550 – 61990 | 3 | 6 | too few sandboxes |
| 7 | Baseten Sandboxes | 61830 | 61150 – 64769 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 52230 | 52090 – 52280 | 3 | 6 | too few sandboxes |
| 9 | boat | 49590 | 23490 – 66230 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 44640 | 41130 – 45250 | 3 | 6 | too few sandboxes |
| 11 | E2B | 43570 | 38580 – 48210 | 3 | 6 | too few sandboxes |
| 12 | CreateOS | 41220 | 38290 – 41370 | 3 | 6 | too few sandboxes |
| 13 | Namespace | 30200 | 29580 – 30210 | 3 | 6 | too few sandboxes |
| 14 | Daytona (container) | 22990 | 12060 – 23400 | 3 | 6 | too few sandboxes |
| 15 | Tangle Sandbox | 19910 | 16030 – 27480 | 3 | 6 | too few sandboxes |

</details>

## network

<img src="docs/figures/iperf_wan_direction_download.webp" width="960" alt="iperf3 WAN download: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

<img src="docs/figures/iperf_wan_direction_upload.webp" width="960" alt="iperf3 WAN upload: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>22 synthetic metrics</strong> · headlines: iperf3 WAN download · iperf3 WAN upload</summary>

### iperf3 WAN download _(headline)_

Mbits/sec · higher is better

_Vercel Sandbox leads · ~1.3× Namespace on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 9219 | 6919 – 11870 | 3 | 6 | — |
| 2 | Namespace | 7086 | 7012 – 7142 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 6285 | 5949 – 12130 | 3 | 6 | too few sandboxes |
| 4 | Novita | 5066 | 4274 – 5688 | 3 | 6 | too few sandboxes |
| 5 | boat | 4775 | 779.2 – 9057 | 3 | 6 | too few sandboxes |
| 6 | DigitalOcean MicroVMs | 4101 | 3962 – 5553 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 3789 | 3177 – 4016 | 3 | 6 | too few sandboxes |
| 8 | Daytona (container) | 3661 | 2080 – 6046 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 2147 | 2061 – 2293 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1774 | 320.9 – 2156 | 3 | 6 | too few sandboxes |
| 11 | E2B | 1522 | 481.1 – 3282 | 3 | 6 | too few sandboxes |
| 12 | Microsandbox Cloud | 1047 | 1043 – 1056 | 3 | 6 | too few sandboxes |
| 13 | CreateOS | 233.2 | 201.8 – 297.6 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload _(headline)_

Mbits/sec · higher is better

_DigitalOcean MicroVMs leads · ~3.3× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | DigitalOcean MicroVMs | 18080 | 17240 – 19610 | 3 | 6 | — |
| 2 | Vercel Sandbox | 5550 | 2305 – 6801 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 5036 | 4512 – 5118 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 4369 | 1447 – 4399 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4110 | 3870 – 5670 | 3 | 6 | too few sandboxes |
| 6 | Daytona (container) | 4087 | 2467 – 4139 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 3931 | 3817 – 4222 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 2429 | 2291 – 2523 | 3 | 6 | too few sandboxes |
| 9 | boat | 1831 | 797.8 – 1894 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 1508 | 1454 – 2006 | 3 | 6 | too few sandboxes |
| 11 | Microsandbox Cloud | 1055 | 898.4 – 1059 | 3 | 6 | too few sandboxes |
| 12 | CreateOS | 901.7 | 866.7 – 920.1 | 3 | 6 | too few sandboxes |
| 13 | E2B | 871 | 678.7 – 1333 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 1 stream

Mbits/sec · higher is better

_Novita leads · ~1.3× DigitalOcean MicroVMs on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1.webp" width="960" alt="iperf3 loopback TCP, 1 stream: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 152972 | 145407 – 154432 | 3 | 6 | — |
| 2 | DigitalOcean MicroVMs | 116869 | 108418 – 118173 | 3 | 6 | too few sandboxes |
| 3 | CreateOS | 93360 | 82780 – 93850 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 84620 | 82794 – 84690 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 69027 | 62528 – 73396 | 3 | 6 | too few sandboxes |
| 6 | boat | 66240 | 53900 – 75667 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 64205 | 59941 – 64790 | 3 | 6 | too few sandboxes |
| 8 | E2B | 60730 | 57570 – 64045 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 59413 | 53747 – 78570 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 57895 | 53257 – 113561 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 40920 | 38993 – 41462 | 3 | 6 | too few sandboxes |
| 12 | Namespace | 34751 | 33670 – 37040 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 33910 | 33330 – 34430 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_DigitalOcean MicroVMs leads · ~1.1× Novita on median (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10.webp" width="960" alt="iperf3 loopback TCP, 10 streams: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | DigitalOcean MicroVMs | 166700 | 117368 – 171200 | 3 | 6 | — |
| 2 | Novita | 153200 | 145626 – 153300 | 3 | 6 | too few sandboxes |
| 3 | CreateOS | 126200 | 122300 – 141300 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 99299 | 94078 – 101781 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 89540 | 76310 – 91952 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 75470 | 74762 – 92003 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 66693 | 58794 – 90300 | 3 | 6 | too few sandboxes |
| 8 | boat | 56171 | 51710 – 76629 | 3 | 6 | too few sandboxes |
| 9 | E2B | 48830 | 45430 – 65839 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 46410 | 45605 – 49272 | 3 | 6 | too few sandboxes |
| 11 | Namespace | 39290 | 38140 – 41069 | 3 | 6 | too few sandboxes |
| 12 | Daytona (container) | 37217 | 36150 – 46916 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 36615 | 34629 – 36860 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, boat, CreateOS, Daytona (container), Daytona (VM), DigitalOcean MicroVMs, E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita and Vercel Sandbox share the top on this metric (higher is better)._

<img src="docs/figures/iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1.webp" width="960" alt="iperf3 loopback UDP, 10G objective: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | boat | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | CreateOS | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (container) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | DigitalOcean MicroVMs | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 13 | Modal (gVisor) | 514 | 503.5 – 538.5 | 3 | 6 | too few sandboxes |

### github.com HTTPS

ms · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_github_com_total_ms.webp" width="960" alt="github.com HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | github.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 17.55 | 16.14 – 510.7 | 3 | 90 | — |
| 2 | Daytona (VM) | 18.85 | 18.29 – 19.54 | 3 | 90 | too few sandboxes |
| 3 | Namespace | 20.23 | 18.73 – 21.32 | 3 | 90 | too few sandboxes |
| 4 | Vercel Sandbox | 26.42 | 24.6 – 31.77 | 3 | 90 | too few sandboxes |
| 5 | Blaxel | 26.68 | 26.52 – 27.76 | 3 | 90 | too few sandboxes |
| 6 | CreateOS | 41.29 | 41.12 – 43.1 | 3 | 90 | too few sandboxes |
| 7 | boat | 62.69 | 40.3 – 171.5 | 3 | 90 | too few sandboxes |
| 8 | Daytona (container) | 86.38 | 58.88 – 87.83 | 3 | 90 | too few sandboxes |
| 9 | E2B | 111.3 | 99.81 – 299.5 | 3 | 90 | too few sandboxes |
| 10 | Microsandbox Cloud | 206.1 | 202.7 – 212 | 3 | 90 | too few sandboxes |
| 11 | DigitalOcean MicroVMs | 312.9 | 312.3 – 313.4 | 3 | 90 | too few sandboxes |
| 12 | Novita | 519.1 | 504.2 – 557.6 | 3 | 90 | too few sandboxes |
| 13 | Modal (gVisor) | 530 | 22.54 – 575.6 | 3 | 90 | too few sandboxes |

### api.github.com HTTPS

ms · lower is better

_Modal (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_api_github_com_total_ms.webp" width="960" alt="api.github.com HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | api.github.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10.92 | 10.25 – 197.5 | 3 | 90 | — |
| 2 | Namespace | 11.8 | 10.9 – 12.06 | 3 | 90 | too few sandboxes |
| 3 | Daytona (VM) | 12.38 | 12.2 – 12.74 | 3 | 90 | too few sandboxes |
| 4 | Blaxel | 14.75 | 14.31 – 14.96 | 3 | 90 | too few sandboxes |
| 5 | Vercel Sandbox | 15.98 | 15.81 – 16.58 | 3 | 90 | too few sandboxes |
| 6 | boat | 21.35 | 21.16 – 63.44 | 3 | 90 | too few sandboxes |
| 7 | CreateOS | 22.91 | 22.49 – 23.28 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 26.41 | 15.79 – 196.5 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 39.83 | 25.91 – 41.73 | 3 | 90 | too few sandboxes |
| 10 | E2B | 45.94 | 45.36 – 46.36 | 3 | 90 | too few sandboxes |
| 11 | Microsandbox Cloud | 98.86 | 97.33 – 112 | 3 | 90 | too few sandboxes |
| 12 | DigitalOcean MicroVMs | 121.2 | 120.8 – 122.2 | 3 | 90 | too few sandboxes |
| 13 | Novita | 194.7 | 193.1 – 195.4 | 3 | 90 | too few sandboxes |

### raw.githubusercontent.com HTTPS

ms · lower is better

_Modal (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_raw_githubusercontent_com_total_ms.webp" width="960" alt="raw.githubusercontent.com HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | raw.githubusercontent.com HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 8.261 | 8.178 – 15.3 | 3 | 90 | — |
| 2 | Namespace | 9.364 | 8.133 – 9.669 | 3 | 90 | too few sandboxes |
| 3 | Daytona (VM) | 10.09 | 10.05 – 10.21 | 3 | 90 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 10.3 | 10.1 – 10.48 | 3 | 90 | too few sandboxes |
| 5 | Blaxel | 12 | 11.98 – 12.01 | 3 | 90 | too few sandboxes |
| 6 | Vercel Sandbox | 13.83 | 13.73 – 14.01 | 3 | 90 | too few sandboxes |
| 7 | Microsandbox Cloud | 14.38 | 12.25 – 16.26 | 3 | 90 | too few sandboxes |
| 8 | Daytona (container) | 16.72 | 16.43 – 214.9 | 3 | 90 | too few sandboxes |
| 9 | Modal (gVisor) | 16.8 | 13.47 – 17.16 | 3 | 90 | too few sandboxes |
| 10 | CreateOS | 20.95 | 20.61 – 20.96 | 3 | 90 | too few sandboxes |
| 11 | boat | 21.31 | 21.24 – 31.84 | 3 | 90 | too few sandboxes |
| 12 | E2B | 31.85 | 30.17 – 33.48 | 3 | 90 | too few sandboxes |
| 13 | Novita | 40.16 | 39.26 – 41.62 | 3 | 90 | too few sandboxes |

### registry.npmjs.org HTTPS

ms · lower is better

_Namespace leads · DigitalOcean MicroVMs is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_registry_npmjs_org_total_ms.webp" width="960" alt="registry.npmjs.org HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | registry.npmjs.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 14.98 | 13.46 – 15.66 | 3 | 90 | — |
| 2 | DigitalOcean MicroVMs | 16.92 | 16.74 – 17.02 | 3 | 90 | too few sandboxes |
| 3 | Modal (VM) | 19.31 | 14.78 – 44.75 | 3 | 90 | too few sandboxes |
| 4 | Blaxel | 20.86 | 20.63 – 21.16 | 3 | 90 | too few sandboxes |
| 5 | Daytona (VM) | 21.97 | 21.23 – 22.87 | 3 | 90 | too few sandboxes |
| 6 | Vercel Sandbox | 22.65 | 21.76 – 23.72 | 3 | 90 | too few sandboxes |
| 7 | Modal (gVisor) | 24.62 | 20.9 – 25.46 | 3 | 90 | too few sandboxes |
| 8 | Daytona (container) | 26.61 | 25.65 – 221.7 | 3 | 90 | too few sandboxes |
| 9 | CreateOS | 30.92 | 30.56 – 31.04 | 3 | 90 | too few sandboxes |
| 10 | boat | 33.86 | 33 – 47.17 | 3 | 90 | too few sandboxes |
| 11 | E2B | 47.08 | 46.57 – 48.38 | 3 | 90 | too few sandboxes |
| 12 | Microsandbox Cloud | 57.85 | 56.61 – 59.42 | 3 | 90 | too few sandboxes |
| 13 | Novita | 61.42 | 61.27 – 62.38 | 3 | 90 | too few sandboxes |

### pypi.org HTTPS

ms · lower is better

_Modal (VM) and Namespace share the top on this metric (lower is better)._

<img src="docs/figures/network_https_pypi_org_total_ms.webp" width="960" alt="pypi.org HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pypi.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 9.713 | 9.583 – 15.04 | 3 | 90 | — |
| 1 | Namespace | 9.713 | 9.207 – 10.27 | 3 | 90 | too few sandboxes, equal medians |
| 3 | Daytona (VM) | 10.72 | 10.52 – 11.38 | 3 | 90 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 11.72 | 11.68 – 11.81 | 3 | 90 | too few sandboxes |
| 5 | Blaxel | 14.04 | 13.79 – 14.08 | 3 | 90 | too few sandboxes |
| 6 | Microsandbox Cloud | 14.84 | 14.72 – 16.46 | 3 | 90 | too few sandboxes |
| 7 | Vercel Sandbox | 15.21 | 15.06 – 18.33 | 3 | 90 | too few sandboxes |
| 8 | Daytona (container) | 18.67 | 17.58 – 213.4 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 18.67 | 14.83 – 19.79 | 3 | 90 | too few sandboxes, equal medians |
| 10 | CreateOS | 22.31 | 21.9 – 22.71 | 3 | 90 | too few sandboxes |
| 11 | boat | 25.93 | 24.75 – 33.76 | 3 | 90 | too few sandboxes |
| 12 | E2B | 31.84 | 31.34 – 35.05 | 3 | 90 | too few sandboxes |
| 13 | Novita | 44.65 | 44.4 – 45.06 | 3 | 90 | too few sandboxes |

### files.pythonhosted.org HTTPS

ms · lower is better

_Modal (VM) leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/network_https_files_pythonhosted_org_total_ms.webp" width="960" alt="files.pythonhosted.org HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | files.pythonhosted.org HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 8.175 | 8.147 – 14.03 | 3 | 90 | — |
| 2 | Namespace | 8.192 | 8.138 – 8.973 | 3 | 90 | too few sandboxes |
| 3 | DigitalOcean MicroVMs | 10.19 | 9.91 – 10.4 | 3 | 90 | too few sandboxes |
| 4 | Daytona (VM) | 10.26 | 10.18 – 10.44 | 3 | 90 | too few sandboxes |
| 5 | Blaxel | 11.86 | 11.71 – 11.9 | 3 | 90 | too few sandboxes |
| 6 | Microsandbox Cloud | 12.72 | 12.38 – 14.19 | 3 | 90 | too few sandboxes |
| 7 | Vercel Sandbox | 13.53 | 13.17 – 15.46 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 16.9 | 13.38 – 16.95 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 17.69 | 16.3 – 212.9 | 3 | 90 | too few sandboxes |
| 10 | CreateOS | 20.41 | 20.33 – 20.91 | 3 | 90 | too few sandboxes |
| 11 | boat | 21.2 | 20.53 – 31.61 | 3 | 90 | too few sandboxes |
| 12 | E2B | 31.12 | 31.02 – 35.42 | 3 | 90 | too few sandboxes |
| 13 | Novita | 40.16 | 39.72 – 40.62 | 3 | 90 | too few sandboxes |

### ghcr.io/v2 HTTPS

ms · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_ghcr_io_v2_total_ms.webp" width="960" alt="ghcr.io/v2 HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | ghcr.io/v2 HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 18.03 | 16.82 – 107 | 3 | 90 | — |
| 2 | Daytona (VM) | 19.94 | 19.48 – 20.18 | 3 | 90 | too few sandboxes |
| 3 | Namespace | 20.06 | 18.44 – 20.48 | 3 | 90 | too few sandboxes |
| 4 | Blaxel | 20.2 | 19.41 – 22.21 | 3 | 90 | too few sandboxes |
| 5 | Vercel Sandbox | 20.6 | 19.62 – 21.35 | 3 | 90 | too few sandboxes |
| 6 | CreateOS | 26.5 | 25.88 – 26.86 | 3 | 90 | too few sandboxes |
| 7 | Modal (gVisor) | 90.43 | 19.84 – 207.1 | 3 | 90 | too few sandboxes |
| 8 | Daytona (container) | 95.37 | 37.15 – 96.79 | 3 | 90 | too few sandboxes |
| 9 | E2B | 111.2 | 110.6 – 113.4 | 3 | 90 | too few sandboxes |
| 10 | Microsandbox Cloud | 120.8 | 119.5 – 120.8 | 3 | 90 | too few sandboxes |
| 11 | boat | 127.5 | 119.4 – 151.3 | 3 | 90 | too few sandboxes |
| 12 | DigitalOcean MicroVMs | 130.7 | 129.6 – 131.4 | 3 | 90 | too few sandboxes |
| 13 | Novita | 204.6 | 199.3 – 205.4 | 3 | 90 | too few sandboxes |

### gcr.io/v2 HTTPS

ms · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_gcr_io_v2_total_ms.webp" width="960" alt="gcr.io/v2 HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | gcr.io/v2 HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 14.75 | 13.5 – 15.33 | 3 | 90 | — |
| 2 | Blaxel | 16.91 | 16.44 – 17.83 | 3 | 90 | too few sandboxes |
| 3 | Novita | 18.55 | 17.75 – 19.37 | 3 | 90 | too few sandboxes |
| 4 | Vercel Sandbox | 19.16 | 18.73 – 20.23 | 3 | 90 | too few sandboxes |
| 5 | E2B | 19.91 | 16.79 – 24.05 | 3 | 90 | too few sandboxes |
| 6 | Modal (VM) | 27.78 | 15.85 – 30.54 | 3 | 90 | too few sandboxes |
| 7 | Daytona (VM) | 30.94 | 28.76 – 32.84 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 32.37 | 19.1 – 35.07 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 39.75 | 38.21 – 232.2 | 3 | 90 | too few sandboxes |
| 10 | CreateOS | 60.78 | 60.04 – 62.72 | 3 | 90 | too few sandboxes |
| 11 | Microsandbox Cloud | 87.24 | 86 – 88.69 | 3 | 90 | too few sandboxes |
| 12 | DigitalOcean MicroVMs | 118.4 | 117.9 – 118.5 | 3 | 90 | too few sandboxes |
| 13 | boat | 536.8 | 202 – 643.7 | 3 | 90 | too few sandboxes |

### auth.docker.io token HTTPS

ms · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/network_https_auth_docker_io_registry_token_total_ms.webp" width="960" alt="auth.docker.io token HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | auth.docker.io token HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 29.19 | 27 – 29.76 | 3 | 90 | — |
| 2 | Modal (VM) | 30.13 | 27.23 – 113.8 | 3 | 90 | too few sandboxes |
| 3 | Blaxel | 32.35 | 32.26 – 33.13 | 3 | 90 | too few sandboxes |
| 4 | Daytona (VM) | 33.16 | 32.46 – 33.2 | 3 | 90 | too few sandboxes |
| 5 | Vercel Sandbox | 35.8 | 34.15 – 37.5 | 3 | 90 | too few sandboxes |
| 6 | CreateOS | 42.92 | 41.17 – 43.3 | 3 | 90 | too few sandboxes |
| 7 | Microsandbox Cloud | 52.89 | 52.03 – 54.75 | 3 | 90 | too few sandboxes |
| 8 | DigitalOcean MicroVMs | 66.41 | 60.99 – 66.92 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 101.9 | 101.6 – 240.7 | 3 | 90 | too few sandboxes |
| 10 | Modal (gVisor) | 115.1 | 33.13 – 117.8 | 3 | 90 | too few sandboxes |
| 11 | Novita | 126.8 | 123.6 – 127.9 | 3 | 90 | too few sandboxes |
| 12 | E2B | 138 | 130.6 – 139.2 | 3 | 90 | too few sandboxes |
| 13 | boat | 138.4 | 133.4 – 182.6 | 3 | 90 | too few sandboxes |

### crates.io HTTPS

ms · lower is better

_Modal (VM) leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/network_https_crates_io_total_ms.webp" width="960" alt="crates.io HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | crates.io HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 13.23 | 11.67 – 16.84 | 3 | 90 | — |
| 2 | DigitalOcean MicroVMs | 13.74 | 13.35 – 14.18 | 3 | 90 | too few sandboxes |
| 3 | Namespace | 13.99 | 13.41 – 14.13 | 3 | 90 | too few sandboxes |
| 4 | Daytona (VM) | 14.75 | 14.46 – 15.34 | 3 | 90 | too few sandboxes |
| 5 | Microsandbox Cloud | 15.35 | 14.91 – 17.38 | 3 | 90 | too few sandboxes |
| 6 | Blaxel | 16.87 | 16.75 – 17.83 | 3 | 90 | too few sandboxes |
| 7 | Vercel Sandbox | 18.64 | 18.23 – 24.28 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 20.36 | 17.46 – 20.49 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 21.06 | 19.51 – 216.5 | 3 | 90 | too few sandboxes |
| 10 | CreateOS | 27.17 | 24.18 – 27.29 | 3 | 90 | too few sandboxes |
| 11 | boat | 31.45 | 29.12 – 45.13 | 3 | 90 | too few sandboxes |
| 12 | E2B | 33.31 | 32.69 – 38.06 | 3 | 90 | too few sandboxes |
| 13 | Novita | 43.08 | 43 – 43.66 | 3 | 90 | too few sandboxes |

### index.crates.io config HTTPS

ms · lower is better

_Modal (VM) leads · Namespace is ~1.1× higher (lower is better)._

<img src="docs/figures/network_https_index_crates_io_config_total_ms.webp" width="960" alt="index.crates.io config HTTPS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | index.crates.io config HTTPS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 8.403 | 8.248 – 11.95 | 3 | 90 | — |
| 2 | Namespace | 8.945 | 7.638 – 9.301 | 3 | 90 | too few sandboxes |
| 3 | DigitalOcean MicroVMs | 10.18 | 10.18 – 10.29 | 3 | 90 | too few sandboxes |
| 4 | Daytona (VM) | 10.69 | 10.6 – 10.97 | 3 | 90 | too few sandboxes |
| 5 | Blaxel | 11.75 | 11.74 – 11.76 | 3 | 90 | too few sandboxes |
| 6 | Microsandbox Cloud | 12.43 | 12.1 – 13.95 | 3 | 90 | too few sandboxes |
| 7 | Vercel Sandbox | 15.17 | 12.84 – 15.9 | 3 | 90 | too few sandboxes |
| 8 | Modal (gVisor) | 16.28 | 13.28 – 16.59 | 3 | 90 | too few sandboxes |
| 9 | Daytona (container) | 18.56 | 17.33 – 213.3 | 3 | 90 | too few sandboxes |
| 10 | CreateOS | 20.69 | 20.18 – 22.34 | 3 | 90 | too few sandboxes |
| 11 | boat | 21.53 | 21.12 – 36.14 | 3 | 90 | too few sandboxes |
| 12 | E2B | 31.06 | 29.73 – 33.47 | 3 | 90 | too few sandboxes |
| 13 | Novita | 39.57 | 39.51 – 40.37 | 3 | 90 | too few sandboxes |

### github.com cold DNS

ms · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/network_dns_cold_github_com_ms.webp" width="960" alt="github.com cold DNS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | github.com cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0 | 0 – 4 | 3 | 3 | — |
| 2 | Vercel Sandbox | 3 | 3 – 7 | 3 | 3 | too few sandboxes |
| 3 | Microsandbox Cloud | 4 | 4 – 4 | 3 | 3 | too few sandboxes |
| 3 | Modal (VM) | 4 | 4 – 28 | 3 | 3 | too few sandboxes, equal medians |
| 3 | Namespace | 4 | 0 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 6 | boat | 5 | 4 – 23 | 3 | 3 | too few sandboxes |
| 6 | Daytona (VM) | 5 | 5 – 6 | 3 | 3 | too few sandboxes, equal medians |
| 8 | Daytona (container) | 6 | 5 – 6 | 3 | 3 | too few sandboxes |
| 9 | CreateOS | 8 | 4 – 8 | 3 | 3 | too few sandboxes |
| 10 | E2B | 12 | 8 – 12 | 3 | 3 | too few sandboxes |
| 11 | DigitalOcean MicroVMs | 16 | 16 – 48 | 3 | 3 | too few sandboxes |
| 11 | Novita | 16 | 12 – 52 | 3 | 3 | too few sandboxes, equal medians |
| 13 | Modal (gVisor) | 17 | 3 – 26 | 3 | 3 | too few sandboxes |

### registry.npmjs.org cold DNS

ms · lower is better

_Vercel Sandbox leads · Blaxel is ~1.3× higher (lower is better)._

<img src="docs/figures/network_dns_cold_registry_npmjs_org_ms.webp" width="960" alt="registry.npmjs.org cold DNS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | registry.npmjs.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 3 | 3 – 3 | 3 | 3 | — |
| 2 | Blaxel | 4 | 3 – 7 | 3 | 3 | too few sandboxes |
| 2 | Modal (VM) | 4 | 4 – 16 | 3 | 3 | too few sandboxes, equal medians |
| 2 | Namespace | 4 | 0 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 5 | Daytona (container) | 7 | 6 – 8 | 3 | 3 | too few sandboxes |
| 6 | DigitalOcean MicroVMs | 8 | 8 – 8 | 3 | 3 | too few sandboxes |
| 6 | Microsandbox Cloud | 8 | 4 – 8 | 3 | 3 | too few sandboxes, equal medians |
| 8 | CreateOS | 12 | 8 – 15 | 3 | 3 | too few sandboxes |
| 8 | Daytona (VM) | 12 | 11 – 14 | 3 | 3 | too few sandboxes, equal medians |
| 8 | E2B | 12 | 12 – 12 | 3 | 3 | too few sandboxes, equal medians |
| 11 | Modal (gVisor) | 15 | 3 – 20 | 3 | 3 | too few sandboxes |
| 12 | boat | 16 | 11 – 22 | 3 | 3 | too few sandboxes |
| 12 | Novita | 16 | 16 – 68 | 3 | 3 | too few sandboxes, equal medians |

### docker.io cold DNS

ms · lower is better

_Vercel Sandbox leads on median (lower is better); see notes for how ranks are decided._

<img src="docs/figures/network_dns_cold_docker_io_ms.webp" width="960" alt="docker.io cold DNS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | docker.io cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 0 | 0 – 7 | 3 | 3 | — |
| 2 | Blaxel | 4 | 0 – 4 | 3 | 3 | too few sandboxes |
| 2 | Microsandbox Cloud | 4 | 4 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 2 | Modal (VM) | 4 | 4 – 40 | 3 | 3 | too few sandboxes, equal medians |
| 2 | Namespace | 4 | 0 – 4 | 3 | 3 | too few sandboxes, equal medians |
| 6 | Daytona (VM) | 5 | 4 – 6 | 3 | 3 | too few sandboxes |
| 7 | Daytona (container) | 6 | 4 – 8 | 3 | 3 | too few sandboxes |
| 8 | CreateOS | 8 | 4 – 8 | 3 | 3 | too few sandboxes |
| 9 | boat | 18 | 17 – 18 | 3 | 3 | too few sandboxes |
| 10 | E2B | 24 | 20 – 48 | 3 | 3 | too few sandboxes |
| 11 | DigitalOcean MicroVMs | 44 | 32 – 52 | 3 | 3 | too few sandboxes |
| 12 | Novita | 52 | 20 – 52 | 3 | 3 | too few sandboxes |
| 13 | Modal (gVisor) | 58 | 3 – 81 | 3 | 3 | too few sandboxes |

### pypi.org cold DNS

ms · lower is better

_Vercel Sandbox leads · Blaxel is ~1.3× higher (lower is better)._

<img src="docs/figures/network_dns_cold_pypi_org_ms.webp" width="960" alt="pypi.org cold DNS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pypi.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 3 | 3 – 3 | 3 | 3 | — |
| 2 | Blaxel | 4 | 4 – 4 | 3 | 3 | too few sandboxes |
| 3 | boat | 5 | 4 – 10 | 3 | 3 | too few sandboxes |
| 4 | Modal (VM) | 8 | 8 – 28 | 3 | 3 | too few sandboxes |
| 5 | Daytona (container) | 14 | 4 – 18 | 3 | 3 | too few sandboxes |
| 6 | Daytona (VM) | 18 | 6 – 18 | 3 | 3 | too few sandboxes |
| 7 | CreateOS | 20 | 16 – 23 | 3 | 3 | too few sandboxes |
| 8 | E2B | 32 | 20 – 60 | 3 | 3 | too few sandboxes |
| 9 | Namespace | 36 | 4 – 148 | 3 | 3 | too few sandboxes |
| 10 | DigitalOcean MicroVMs | 60 | 32 – 68 | 3 | 3 | too few sandboxes |
| 11 | Microsandbox Cloud | 80 | 68 – 104 | 3 | 3 | too few sandboxes |
| 12 | Modal (gVisor) | 92 | 5 – 132 | 3 | 3 | too few sandboxes |
| 13 | Novita | 120 | 52 – 124 | 3 | 3 | too few sandboxes |

### rubygems.org cold DNS

ms · lower is better

_boat leads · DigitalOcean MicroVMs is ~2.3× higher (lower is better)._

<img src="docs/figures/network_dns_cold_rubygems_org_ms.webp" width="960" alt="rubygems.org cold DNS: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | rubygems.org cold DNS (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | boat | 16 | 15 – 19 | 3 | 3 | — |
| 2 | DigitalOcean MicroVMs | 36 | 36 – 36 | 3 | 3 | too few sandboxes |
| 3 | Vercel Sandbox | 51 | 51 – 51 | 3 | 3 | too few sandboxes |
| 4 | Blaxel | 55 | 55 – 55 | 3 | 3 | too few sandboxes |
| 5 | Namespace | 56 | 48 – 56 | 3 | 3 | too few sandboxes |
| 6 | CreateOS | 59 | 55 – 60 | 3 | 3 | too few sandboxes |
| 6 | Daytona (container) | 59 | 57 – 82 | 3 | 3 | too few sandboxes, equal medians |
| 6 | Daytona (VM) | 59 | 56 – 74 | 3 | 3 | too few sandboxes, equal medians |
| 9 | Modal (VM) | 60 | 52 – 84 | 3 | 3 | too few sandboxes |
| 10 | E2B | 80 | 80 – 112 | 3 | 3 | too few sandboxes |
| 11 | Novita | 88 | 60 – 140 | 3 | 3 | too few sandboxes |
| 12 | Modal (gVisor) | 98 | 54 – 109 | 3 | 3 | too few sandboxes |
| 13 | Microsandbox Cloud | 160 | 152 – 324 | 3 | 3 | too few sandboxes |

### Node 22 download

Mbits/sec · higher is better

_Vercel Sandbox leads on median (higher is better); see notes for how ranks are decided._

<img src="docs/figures/network_download_node_v22_23_1_linux_x64_mbits_per_sec.webp" width="960" alt="Node 22 download: 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | Node 22 download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Vercel Sandbox | 2945 | 2665 – 3042 | 3 | 3 | — |
| 2 | Blaxel | 2885 | 2088 – 3097 | 3 | 3 | too few sandboxes |
| 3 | DigitalOcean MicroVMs | 2852 | 2231 – 3116 | 3 | 3 | too few sandboxes |
| 4 | Namespace | 2744 | 2483 – 3000 | 3 | 3 | too few sandboxes |
| 5 | Daytona (VM) | 2675 | 1673 – 3001 | 3 | 3 | too few sandboxes |
| 6 | Microsandbox Cloud | 2074 | 2047 – 2389 | 3 | 3 | too few sandboxes |
| 7 | Modal (gVisor) | 1655 | 1262 – 2562 | 3 | 3 | too few sandboxes |
| 8 | Daytona (container) | 1430 | 1225 – 2907 | 3 | 3 | too few sandboxes |
| 9 | boat | 1255 | 761.4 – 2207 | 3 | 3 | too few sandboxes |
| 10 | Novita | 1066 | 1064 – 1423 | 3 | 3 | too few sandboxes |
| 11 | Modal (VM) | 1032 | 276.8 – 1962 | 3 | 3 | too few sandboxes |
| 12 | CreateOS | 870.9 | 866.3 – 871.5 | 3 | 3 | too few sandboxes |
| 13 | E2B | 77.1 | 20.87 – 1295 | 3 | 3 | too few sandboxes |

</details>

## system

<img src="docs/figures/git_seconds.webp" width="960" alt="Git common operations: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

<details>
<summary><strong>7 synthetic metrics</strong> · headline: Git common operations</summary>

### Git common operations _(headline)_

Seconds · lower is better

_Namespace leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 36.15 | 33.65 – 41.94 | 3 | 6 | — |
| 2 | CreateOS | 37.09 | 36.63 – 37.72 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 38.77 | 38.36 – 39.06 | 3 | 6 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 40.77 | 40.53 – 40.92 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 42.36 | 40.77 – 44.05 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 43.79 | 43.72 – 44.35 | 3 | 6 | too few sandboxes |
| 7 | Novita | 44.46 | 43.79 – 44.55 | 3 | 6 | too few sandboxes |
| 8 | Daytona (container) | 46.43 | 45.96 – 49.13 | 3 | 6 | too few sandboxes |
| 9 | boat | 46.89 | 41.83 – 62.2 | 3 | 6 | too few sandboxes |
| 10 | Blaxel | 50.91 | 50.91 – 51.64 | 3 | 6 | too few sandboxes |
| 11 | Tangle Sandbox | 52.92 | 52.62 – 72.23 | 3 | 6 | too few sandboxes |
| 12 | Daytona (VM) | 60.72 | 60.27 – 60.74 | 3 | 6 | too few sandboxes |
| 13 | Vercel Sandbox | 63.74 | 60.61 – 64.77 | 3 | 6 | too few sandboxes |
| 14 | E2B | 69.24 | 57.27 – 70.26 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Modal (VM) leads · ~1.6× Daytona (VM) on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only.webp" width="960" alt="pgbench RO (s100, 50c): 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1098000 | 1096000 – 1525000 | 3 | 6 | — |
| 2 | Daytona (VM) | 672600 | 664300 – 672800 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 639000 | 432900 – 651400 | 3 | 6 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 616800 | 611800 – 670000 | 3 | 6 | too few sandboxes |
| 5 | CreateOS | 284100 | 280300 – 286000 | 3 | 6 | too few sandboxes |
| 6 | Novita | 282900 | 236100 – 299300 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 256200 | 238100 – 290600 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 238600 | 175700 – 246700 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 218000 | 207200 – 227300 | 3 | 6 | too few sandboxes |
| 10 | boat | 217000 | 200400 – 250400 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 178900 | 152400 – 181100 | 3 | 6 | too few sandboxes |
| 12 | E2B | 156100 | 124100 – 219500 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 96850 | 84860 – 101200 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.6× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency.webp" width="960" alt="pgbench RO latency (s100, 50c): 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 0.0455 | 0.0325 – 0.046 | 3 | 6 | — |
| 2 | Daytona (VM) | 0.0745 | 0.0745 – 0.075 | 3 | 6 | too few sandboxes |
| 3 | Modal (gVisor) | 0.078 | 0.077 – 0.1155 | 3 | 6 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 0.081 | 0.0745 – 0.0815 | 3 | 6 | too few sandboxes |
| 5 | CreateOS | 0.1765 | 0.175 – 0.1785 | 3 | 6 | too few sandboxes |
| 6 | Novita | 0.177 | 0.167 – 0.2125 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 0.1955 | 0.172 – 0.21 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 0.2095 | 0.2025 – 0.288 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 0.229 | 0.22 – 0.241 | 3 | 6 | too few sandboxes |
| 10 | boat | 0.2305 | 0.2025 – 0.25 | 3 | 6 | too few sandboxes |
| 11 | Vercel Sandbox | 0.2795 | 0.2765 – 0.3285 | 3 | 6 | too few sandboxes |
| 12 | E2B | 0.321 | 0.228 – 0.4035 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 0.516 | 0.494 – 0.5905 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Modal (VM) leads · ~1.5× Modal (gVisor) on median (higher is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write.webp" width="960" alt="pgbench RW (s100, 50c): 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 66110 | 64500 – 68220 | 3 | 6 | — |
| 2 | Modal (gVisor) | 44740 | 30610 – 46020 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 38550 | 38150 – 39280 | 3 | 6 | too few sandboxes |
| 4 | Novita | 25180 | 19190 – 28530 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 20820 | 19930 – 20910 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 20550 | 16720 – 21560 | 3 | 6 | too few sandboxes |
| 7 | DigitalOcean MicroVMs | 20510 | 19750 – 20770 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 16510 | 15220 – 17280 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 16270 | 14020 – 16860 | 3 | 6 | too few sandboxes |
| 10 | CreateOS | 15810 | 15460 – 16880 | 3 | 6 | too few sandboxes |
| 11 | E2B | 9465 | 5956 – 13550 | 3 | 6 | too few sandboxes |
| 12 | boat | 9283 | 8343 – 15110 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 6687 | 6110 – 6842 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Modal (VM) leads · Modal (gVisor) is ~1.5× higher (lower is better)._

<img src="docs/figures/pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency.webp" width="960" alt="pgbench RW latency (s100, 50c): 13 environments ranked best-first, 2 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 0.7565 | 0.7335 – 0.776 | 3 | 6 | — |
| 2 | Modal (gVisor) | 1.118 | 1.087 – 1.636 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 1.297 | 1.273 – 1.312 | 3 | 6 | too few sandboxes |
| 4 | Novita | 1.99 | 1.754 – 2.605 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 2.401 | 2.393 – 2.511 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 2.433 | 2.321 – 2.992 | 3 | 6 | too few sandboxes |
| 7 | DigitalOcean MicroVMs | 2.45 | 2.413 – 2.534 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 3.034 | 2.896 – 3.287 | 3 | 6 | too few sandboxes |
| 9 | Microsandbox Cloud | 3.072 | 2.966 – 3.567 | 3 | 6 | too few sandboxes |
| 10 | CreateOS | 3.188 | 2.968 – 3.245 | 3 | 6 | too few sandboxes |
| 11 | E2B | 5.284 | 3.691 – 8.416 | 3 | 6 | too few sandboxes |
| 12 | boat | 5.717 | 3.308 – 6.459 | 3 | 6 | too few sandboxes |
| 13 | Daytona (container) | 7.682 | 7.497 – 8.203 | 3 | 6 | too few sandboxes |

### PyBench

Milliseconds · lower is better

_Namespace leads · boat is ~1.2× higher (lower is better)._

<img src="docs/figures/pybench_milliseconds.webp" width="960" alt="PyBench: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 366 | 364.5 – 375 | 3 | 6 | — |
| 2 | boat | 431 | 424 – 459.5 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 431.5 | 431 – 434.5 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 435 | 434 – 436 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 438.5 | 434.5 – 442.5 | 3 | 6 | too few sandboxes |
| 6 | DigitalOcean MicroVMs | 443.5 | 443 – 445.5 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 475 | 469.5 – 476.5 | 3 | 6 | too few sandboxes |
| 8 | Novita | 481 | 478.5 – 483.5 | 3 | 6 | too few sandboxes |
| 9 | Blaxel | 527 | 526.5 – 528.5 | 3 | 6 | too few sandboxes |
| 10 | CreateOS | 552.5 | 547 – 572.5 | 3 | 6 | too few sandboxes |
| 11 | Tangle Sandbox | 555 | 553 – 1134 | 3 | 6 | too few sandboxes |
| 12 | Daytona (container) | 599 | 595 – 604.5 | 3 | 6 | too few sandboxes |
| 13 | Vercel Sandbox | 765.5 | 765.5 – 767.5 | 3 | 6 | too few sandboxes |
| 14 | E2B | 804.5 | 545 – 807.5 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Namespace leads · CreateOS is ~1.1× higher (lower is better)._

<img src="docs/figures/sqlite_speedtest_seconds.webp" width="960" alt="SQLite Speedtest: 14 environments ranked best-first, 1 disclosed as unmeasured, with 95% intervals">

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 32.52 | 31.46 – 48.89 | 3 | 6 | — |
| 2 | CreateOS | 35.36 | 34.24 – 36.91 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 35.76 | 35.59 – 35.89 | 3 | 6 | too few sandboxes |
| 4 | DigitalOcean MicroVMs | 39.52 | 39.21 – 40.74 | 3 | 6 | too few sandboxes |
| 5 | Novita | 42.01 | 40.86 – 43.08 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 48.09 | 47.71 – 49.07 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 51 | 50.91 – 51.5 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 53.95 | 53.26 – 56.28 | 3 | 6 | too few sandboxes |
| 9 | Tangle Sandbox | 56.55 | 54.65 – 103.8 | 3 | 6 | too few sandboxes |
| 10 | Vercel Sandbox | 67.69 | 67.09 – 69.79 | 3 | 6 | too few sandboxes |
| 11 | E2B | 76.45 | 56.33 – 77.96 | 3 | 6 | too few sandboxes |
| 12 | boat | 81.12 | 74.18 – 128.2 | 3 | 6 | too few sandboxes |
| 13 | Modal (gVisor) | 85.42 | 76.66 – 91.46 | 3 | 6 | too few sandboxes |
| 14 | Daytona (container) | 105.3 | 105.3 – 118.4 | 3 | 6 | too few sandboxes |

</details>

## economics

What one run of each realworld pipeline costs, in USD. Lower is better. Not ranked: the two
kinds of cost are not directly comparable.

The first chart plots each environment's three-pipeline total: cost against time, bottom left
best. The three after it show each pipeline's cost per run, the median across sandboxes.

- **Billed**: the provider's own bill rate × pipeline time: each sandbox's bill × its timed
  seconds ÷ its billed seconds.
- **Estimated**: the provider's published prices × pipeline time.

Both price the pipeline's timed steps alone. A sandbox's whole bill also covers boot, setup
and an untimed warm-up of each task; it is under provider bills.

<img src="docs/figures/pipeline-cost-value.webp" width="960" alt="Cost vs. time: all three pipelines: three-pipeline total cost against time for 12 environments, log scales, bottom left is faster and cheaper, solid dots billed and hollow dots estimated">

<img src="docs/figures/pipeline-cost-realworld-mastra.webp" width="960" alt="Cost per Mastra pipeline run: median USD for 12 environments, each labelled billed or estimated, lowest first, not ranked, with a line from the lowest to the highest sandbox">

<img src="docs/figures/pipeline-cost-realworld-better-auth.webp" width="960" alt="Cost per Better-Auth pipeline run: median USD for 12 environments, each labelled billed or estimated, lowest first, not ranked, with a line from the lowest to the highest sandbox">

<img src="docs/figures/pipeline-cost-realworld-openclaw.webp" width="960" alt="Cost per OpenClaw pipeline run: median USD for 12 environments, each labelled billed or estimated, lowest first, not ranked, with a line from the lowest to the highest sandbox">

<details>
<summary>Cost per run table and provider bills</summary>

| Pipeline | Provider | Cost | Median USD per run | Lowest – highest | Sandboxes |
| --- | --- | --- | ---: | ---: | ---: |
| Mastra | boat | **Billed** | 0.01359 | 0.01076 – 0.02183 | 10 |
| Mastra | Namespace | **Billed** | 0.07698 | 0.07202 – 0.09872 | 12 |
| Mastra | CreateOS | Estimated | 0.07701 | 0.07611 – 0.0791 | 12 |
| Mastra | Microsandbox Cloud | **Billed** | 0.07785 | 0.07406 – 0.08443 | 12 |
| Mastra | Novita | Estimated | 0.08104 | 0.07917 – 0.08785 | 12 |
| Mastra | DigitalOcean MicroVMs | Estimated | 0.1009 | 0.09864 – 0.1016 | 12 |
| Mastra | Blaxel | **Billed** | 0.1199 | 0.1186 – 0.123 | 12 |
| Mastra | E2B | Estimated | 0.1671 | 0.1336 – 0.2025 | 12 |
| Mastra | Modal (gVisor) | **Billed** | 0.2136 | 0.2124 – 0.2161 | 11 |
| Mastra | Modal (VM) | **Billed** | 0.2423 | 0.24 – 0.263 | 11 |
| Mastra | Daytona (VM) | **Billed** | 0.2968 | 0.2712 – 0.3168 | 12 |
| Mastra | Vercel Sandbox | Estimated (at most) | 0.3137 | 0.2967 – 0.4271 | 12 |
| Better-Auth | boat | **Billed** | 0.001982 | 0.001716 – 0.003797 | 12 |
| Better-Auth | Namespace | **Billed** | 0.01182 | 0.01045 – 0.02041 | 12 |
| Better-Auth | Novita | Estimated | 0.01246 | 0.01188 – 0.01298 | 12 |
| Better-Auth | DigitalOcean MicroVMs | Estimated | 0.01289 | 0.01256 – 0.01541 | 12 |
| Better-Auth | Microsandbox Cloud | **Billed** | 0.01431 | 0.01231 – 0.01507 | 12 |
| Better-Auth | CreateOS | Estimated | 0.01436 | 0.01103 – 0.01636 | 12 |
| Better-Auth | Blaxel | **Billed** | 0.01821 | 0.0173 – 0.01912 | 12 |
| Better-Auth | Daytona (VM) | **Billed** | 0.02414 | 0.02397 – 0.02452 | 12 |
| Better-Auth | Modal (VM) | **Billed** | 0.02777 | 0.02693 – 0.03166 | 12 |
| Better-Auth | Modal (gVisor) | **Billed** | 0.02841 | 0.02788 – 0.03273 | 12 |
| Better-Auth | E2B | Estimated | 0.02919 | 0.02143 – 0.03418 | 12 |
| Better-Auth | Vercel Sandbox | Estimated (at most) | 0.0522 | 0.05028 – 0.09697 | 12 |
| OpenClaw | boat | **Billed** | 0.006698 | 0.005252 – 0.0124 | 12 |
| OpenClaw | Microsandbox Cloud | **Billed** | 0.03745 | 0.03713 – 0.03955 | 3 |
| OpenClaw | CreateOS | Estimated | 0.03866 | — | 1 |
| OpenClaw | Namespace | **Billed** | 0.04511 | 0.04134 – 0.06061 | 12 |
| OpenClaw | Novita | Estimated | 0.0482 | 0.04493 – 0.05005 | 12 |
| OpenClaw | Blaxel | **Billed** | 0.06219 | 0.06107 – 0.06717 | 12 |
| OpenClaw | DigitalOcean MicroVMs | Estimated | 0.06913 | 0.06719 – 0.08139 | 12 |
| OpenClaw | Daytona (VM) | **Billed** | 0.09955 | 0.09678 – 0.1179 | 12 |
| OpenClaw | E2B | Estimated | 0.1084 | 0.08775 – 0.1468 | 12 |
| OpenClaw | Vercel Sandbox | Estimated (at most) | 0.1568 | 0.1488 – 0.2896 | 12 |
| OpenClaw | Modal (gVisor) | **Billed** | 0.1816 | 0.1732 – 0.249 | 12 |
| OpenClaw | Modal (VM) | **Billed** | 0.2382 | 0.2315 – 0.2871 | 12 |

#### Provider bills

What each provider's billing API charged for each whole sandbox (boot, setup and untimed
warm-ups included), read after the sandbox was deleted.
A sandbox with no bill shows why; it never counts as zero. A total appears only when every
sandbox was billed.

| Provider | Billed sandboxes | Total billed (USD) | No bill (reason) |
| --- | ---: | ---: | --- |
| Blaxel | 56 of 56 | 5.311 USD | — |
| boat | 56 of 56 | 0.6389 USD | — |
| Daytona (container) | 56 of 56 | 1.003 USD | — |
| Daytona (VM) | 56 of 56 | 12.11 USD | — |
| Microsandbox Cloud | 47 of 47 | 2.722 USD | — |
| Modal (gVisor) | 56 of 56 | 13.29 USD | — |
| Modal (VM) | 55 of 55 | 15.48 USD | — |
| Namespace | 56 of 56 | 3.698 USD | — |
| Tangle Sandbox | 56 of 56 | 0.7277 USD | — |

#### Provider bills per suite

Median and lowest – highest bill across the suite's billed sandboxes. A total appears only when
every sandbox in the suite was billed.

| Provider | Suite | Median bill | Lowest – highest | Billed sandboxes | Suite total | No bill (reason) | Source |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| Blaxel | realworld-mastra | 0.1629 USD | 0.1617 – 0.1677 | 12 of 12 | 1.964 USD | — | provider-reported |
| Blaxel | realworld-better-auth | 0.06026 USD | 0.05824 – 0.06201 | 12 of 12 | 0.7245 USD | — | provider-reported |
| Blaxel | realworld-openclaw | 0.1486 USD | 0.1449 – 0.1564 | 12 of 12 | 1.798 USD | — | provider-reported |
| Blaxel | cpu-node | 0.0219 USD | 0.0207 – 0.02328 | 5 of 5 | 0.1095 USD | — | provider-reported |
| Blaxel | system | 0.03717 USD | 0.03662 – 0.03726 | 3 of 3 | 0.111 USD | — | provider-reported |
| Blaxel | pgbench | 0.06624 USD | 0.06615 – 0.06633 | 3 of 3 | 0.1987 USD | — | provider-reported |
| Blaxel | memory | 0.0126 USD | 0.01233 – 0.0127 | 3 of 3 | 0.03763 USD | — | provider-reported |
| Blaxel | disk | 0.08933 USD | 0.08924 – 0.08952 | 3 of 3 | 0.2681 USD | — | provider-reported |
| Blaxel | network | 0.0334 USD | 0.03294 – 0.03367 | 3 of 3 | 0.1 USD | — | provider-reported |
| boat | realworld-mastra | 0.01843 USD | 0.01617 – 0.03017 | 12 of 12 | 0.2408 USD | — | provider-reported |
| boat | realworld-better-auth | 0.006865 USD | 0.00605 – 0.01019 | 12 of 12 | 0.08496 USD | — | provider-reported |
| boat | realworld-openclaw | 0.0156 USD | 0.0134 – 0.02732 | 12 of 12 | 0.2011 USD | — | provider-reported |
| boat | cpu-node | 0.00343 USD | 0.00328 – 0.00365 | 5 of 5 | 0.01733 USD | — | provider-reported |
| boat | system | 0.00616 USD | 0.00557 – 0.007 | 3 of 3 | 0.01873 USD | — | provider-reported |
| boat | pgbench | 0.00819 USD | 0.00815 – 0.009 | 3 of 3 | 0.02534 USD | — | provider-reported |
| boat | memory | 0.00225 USD | 0.00166 – 0.00255 | 3 of 3 | 0.00646 USD | — | provider-reported |
| boat | disk | 0.0102 USD | 0.01019 – 0.01062 | 3 of 3 | 0.03101 USD | — | provider-reported |
| boat | network | 0.00414 USD | 0.00406 – 0.00494 | 3 of 3 | 0.01314 USD | — | provider-reported |
| Daytona (container) | realworld-mastra | 0.0007543 USD | 0.0002648 – 0.009063 | 12 of 12 | 0.03842 USD | — | provider-reported |
| Daytona (container) | realworld-better-auth | 0.0003116 USD | 0.0002329 – 0.0007305 | 12 of 12 | 0.004568 USD | — | provider-reported |
| Daytona (container) | realworld-openclaw | 0.0004064 USD | 0.0002294 – 0.0006091 | 12 of 12 | 0.004613 USD | — | provider-reported |
| Daytona (container) | cpu-node | 0.0273 USD | 0.0257 – 0.02848 | 5 of 5 | 0.1366 USD | — | provider-reported |
| Daytona (container) | system | 0.04712 USD | 0.04691 – 0.05064 | 3 of 3 | 0.1447 USD | — | provider-reported |
| Daytona (container) | pgbench | 0.06746 USD | 0.06648 – 0.07199 | 3 of 3 | 0.2059 USD | — | provider-reported |
| Daytona (container) | memory | 0.02663 USD | 0.02449 – 0.02988 | 3 of 3 | 0.08101 USD | — | provider-reported |
| Daytona (container) | disk | 0.08982 USD | 0.08911 – 0.09155 | 3 of 3 | 0.2705 USD | — | provider-reported |
| Daytona (container) | network | 0.03806 USD | 0.0379 – 0.04064 | 3 of 3 | 0.1166 USD | — | provider-reported |
| Daytona (VM) | realworld-mastra | 0.4261 USD | 0.3893 – 0.4573 | 12 of 12 | 5.081 USD | — | provider-reported |
| Daytona (VM) | realworld-better-auth | 0.1145 USD | 0.113 – 0.1162 | 12 of 12 | 1.375 USD | — | provider-reported |
| Daytona (VM) | realworld-openclaw | 0.2737 USD | 0.2664 – 0.3224 | 12 of 12 | 3.411 USD | — | provider-reported |
| Daytona (VM) | cpu-node | 0.06361 USD | 0.0636 – 0.06398 | 5 of 5 | 0.3184 USD | — | provider-reported |
| Daytona (VM) | system | 0.09063 USD | 0.09061 – 0.0908 | 3 of 3 | 0.272 USD | — | provider-reported |
| Daytona (VM) | pgbench | 0.2328 USD | 0.2175 – 0.2336 | 3 of 3 | 0.6839 USD | — | provider-reported |
| Daytona (VM) | memory | 0.03142 USD | 0.03085 – 0.03333 | 3 of 3 | 0.09559 USD | — | provider-reported |
| Daytona (VM) | disk | 0.2005 USD | 0.2003 – 0.2008 | 3 of 3 | 0.6015 USD | — | provider-reported |
| Daytona (VM) | network | 0.08869 USD | 0.0885 – 0.09233 | 3 of 3 | 0.2695 USD | — | provider-reported |
| Microsandbox Cloud | realworld-mastra | 0.1103 USD | 0.1042 – 0.1168 | 12 of 12 | 1.325 USD | — | calculated from provider usage |
| Microsandbox Cloud | realworld-better-auth | 0.04419 USD | 0.04029 – 0.04545 | 12 of 12 | 0.5221 USD | — | calculated from provider usage |
| Microsandbox Cloud | realworld-openclaw | 0.09426 USD | 0.09315 – 0.1014 | 3 of 3 | 0.2888 USD | — | calculated from provider usage |
| Microsandbox Cloud | cpu-node | 0.01587 USD | 0.01492 – 0.01645 | 5 of 5 | 0.07864 USD | — | calculated from provider usage |
| Microsandbox Cloud | system | 0.02547 USD | 0.02526 – 0.02585 | 3 of 3 | 0.07658 USD | — | calculated from provider usage |
| Microsandbox Cloud | pgbench | 0.04469 USD | 0.04469 – 0.04492 | 3 of 3 | 0.1343 USD | — | calculated from provider usage |
| Microsandbox Cloud | memory | 0.009507 USD | 0.009476 – 0.00951 | 3 of 3 | 0.02849 USD | — | calculated from provider usage |
| Microsandbox Cloud | disk | 0.06186 USD | 0.06106 – 0.06229 | 3 of 3 | 0.1852 USD | — | calculated from provider usage |
| Microsandbox Cloud | network | 0.02757 USD | 0.02643 – 0.02818 | 3 of 3 | 0.08218 USD | — | calculated from provider usage |
| Modal (gVisor) | realworld-mastra | 0.2984 USD | 0.2963 – 0.331 | 12 of 12 | 3.612 USD | — | provider-reported |
| Modal (gVisor) | realworld-better-auth | 0.1155 USD | 0.1139 – 0.1314 | 12 of 12 | 1.419 USD | — | provider-reported |
| Modal (gVisor) | realworld-openclaw | 0.4596 USD | 0.4435 – 0.6526 | 12 of 12 | 5.686 USD | — | provider-reported |
| Modal (gVisor) | cpu-node | 0.04164 USD | 0.04053 – 0.04344 | 5 of 5 | 0.2095 USD | — | provider-reported |
| Modal (gVisor) | system | 0.0834 USD | 0.06993 – 0.08418 | 3 of 3 | 0.2375 USD | — | provider-reported |
| Modal (gVisor) | pgbench | 0.3798 USD | 0.3778 – 0.381 | 3 of 3 | 1.139 USD | — | provider-reported |
| Modal (gVisor) | memory | 0.02504 USD | 0.0247 – 0.02516 | 3 of 3 | 0.07491 USD | — | provider-reported |
| Modal (gVisor) | disk | 0.2351 USD | 0.2349 – 0.2351 | 3 of 3 | 0.705 USD | — | provider-reported |
| Modal (gVisor) | network | 0.06956 USD | 0.06565 – 0.07188 | 3 of 3 | 0.2071 USD | — | provider-reported |
| Modal (VM) | realworld-mastra | 0.3448 USD | 0.3423 – 0.3776 | 11 of 11 | 3.843 USD | — | provider-reported |
| Modal (VM) | realworld-better-auth | 0.1309 USD | 0.1282 – 0.1524 | 12 of 12 | 1.606 USD | — | provider-reported |
| Modal (VM) | realworld-openclaw | 0.593 USD | 0.5852 – 0.7046 | 12 of 12 | 7.304 USD | — | provider-reported |
| Modal (VM) | cpu-node | 0.04994 USD | 0.04796 – 0.05424 | 5 of 5 | 0.2525 USD | — | provider-reported |
| Modal (VM) | system | 0.07608 USD | 0.07573 – 0.07631 | 3 of 3 | 0.2281 USD | — | provider-reported |
| Modal (VM) | pgbench | 0.4341 USD | 0.4275 – 0.4362 | 3 of 3 | 1.298 USD | — | provider-reported |
| Modal (VM) | memory | 0.02822 USD | 0.02735 – 0.02848 | 3 of 3 | 0.08405 USD | — | provider-reported |
| Modal (VM) | disk | 0.2038 USD | 0.2014 – 0.2039 | 3 of 3 | 0.6091 USD | — | provider-reported |
| Modal (VM) | network | 0.07947 USD | 0.07906 – 0.09262 | 3 of 3 | 0.2512 USD | — | provider-reported |
| Namespace | realworld-mastra | 0.1068 USD | 0.09932 – 0.1344 | 12 of 12 | 1.305 USD | — | calculated from provider usage |
| Namespace | realworld-better-auth | 0.03895 USD | 0.03584 – 0.0518 | 12 of 12 | 0.4899 USD | — | calculated from provider usage |
| Namespace | realworld-openclaw | 0.1089 USD | 0.0967 – 0.1378 | 12 of 12 | 1.346 USD | — | calculated from provider usage |
| Namespace | cpu-node | 0.01465 USD | 0.01273 – 0.0156 | 5 of 5 | 0.07077 USD | — | calculated from provider usage |
| Namespace | system | 0.02106 USD | 0.01866 – 0.02211 | 3 of 3 | 0.06183 USD | — | calculated from provider usage |
| Namespace | pgbench | 0.04536 USD | 0.04362 – 0.04605 | 3 of 3 | 0.135 USD | — | calculated from provider usage |
| Namespace | memory | 0.01077 USD | 0.01067 – 0.0121 | 3 of 3 | 0.03354 USD | — | calculated from provider usage |
| Namespace | disk | 0.06324 USD | 0.06318 – 0.0636 | 3 of 3 | 0.19 USD | — | calculated from provider usage |
| Namespace | network | 0.02223 USD | 0.02156 – 0.02225 | 3 of 3 | 0.06603 USD | — | calculated from provider usage |
| Tangle Sandbox | realworld-mastra | 0.01051 USD | 0.007009 – 0.01418 | 12 of 12 | 0.1197 USD | — | provider-reported |
| Tangle Sandbox | realworld-better-auth | 0.009635 USD | 0.007275 – 0.01416 | 12 of 12 | 0.1196 USD | — | provider-reported |
| Tangle Sandbox | realworld-openclaw | 0.01656 USD | 0.007046 – 0.01825 | 12 of 12 | 0.1789 USD | — | provider-reported |
| Tangle Sandbox | cpu-node | 0.01194 USD | 0.01192 – 0.01235 | 5 of 5 | 0.06022 USD | — | provider-reported |
| Tangle Sandbox | system | 0.01657 USD | 0.01595 – 0.02159 | 3 of 3 | 0.05411 USD | — | provider-reported |
| Tangle Sandbox | pgbench | 0.005913 USD | 0.005903 – 0.005934 | 3 of 3 | 0.01775 USD | — | provider-reported |
| Tangle Sandbox | memory | 0.01157 USD | 0.01125 – 0.01158 | 3 of 3 | 0.0344 USD | — | provider-reported |
| Tangle Sandbox | disk | 0.03544 USD | 0.0351 – 0.03581 | 3 of 3 | 0.1063 USD | — | provider-reported |
| Tangle Sandbox | network | 0.01205 USD | 0.012 – 0.01272 | 3 of 3 | 0.03676 USD | — | provider-reported |

</details>

## Coverage gaps

142 uncovered results across 11 providers (Baseten Sandboxes 18, boat 2, CreateOS 2, Daytona (container) 6, Freestyle 9, Microsandbox Cloud 10, Modal (gVisor) 2, Modal (VM) 2, run.cloud 9, tama 65, Tangle Sandbox 17). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Daytona (container) | realworld-better-auth | ❌ **disk** (skipped) | Insufficient disk: 10.0 GiB free, suite needs 10 GiB |
| Daytona (container) | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 10.0 GiB free, suite needs 30 GiB |
| Daytona (container) | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 10.0 GiB free, suite needs 25 GiB |
| Tangle Sandbox | pgbench | **skipped** | pts_pgbench-read-only: could not claim the root-owned baked postgres data dir (needs sudo) |
| Tangle Sandbox | pgbench | **skipped** | pts_pgbench-read-write: could not claim the root-owned baked postgres data dir (needs sudo) |
| Tangle Sandbox | realworld-better-auth | **skipped** | pts_realworld-better-auth: PTS install of local/realworld-better-auth-1.0.0 failed (exit 0, not in list-installed-tests) |
| Tangle Sandbox | realworld-mastra | **skipped** | pts_realworld-mastra: PTS install of local/realworld-mastra-1.0.0 failed (exit 0, not in list-installed-tests) |
| Tangle Sandbox | realworld-openclaw | **skipped** | pts_realworld-openclaw: PTS install of local/realworld-openclaw-1.0.0 failed (exit 0, not in list-installed-tests) |
| Baseten Sandboxes | cpu-node | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | cpu-node | **failed** | Partial publication withheld unverified measurements: node_web_tooling_runs_per_s |
| Baseten Sandboxes | disk | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | disk | **failed** | Partial publication withheld unverified measurements: hardlink_bogo_ops_per_s, fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops |
| Baseten Sandboxes | network | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload, network_https_github_com_total_ms, network_https_api_github_com_total_ms, network_https_raw_githubusercontent_com_total_ms, network_https_registry_npmjs_org_total_ms, network_https_pypi_org_total_ms, network_https_files_pythonhosted_org_total_ms, network_https_ghcr_io_v2_total_ms, network_https_gcr_io_v2_total_ms, network_https_auth_docker_io_registry_token_total_ms, network_https_crates_io_total_ms, network_https_index_crates_io_config_total_ms, network_dns_cold_github_com_ms, network_dns_cold_registry_npmjs_org_ms, network_dns_cold_docker_io_ms, network_dns_cold_pypi_org_ms, network_dns_cold_rubygems_org_ms, network_download_node_v22_23_1_linux_x64_mbits_per_sec |
| Baseten Sandboxes | pgbench | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| Baseten Sandboxes | realworld-better-auth | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Baseten Sandboxes | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: computesdk filesystem exists failed: sandbox API error (HTTP 403)) — the sandbox stopped responding, not a quiet long step |
| Baseten Sandboxes | realworld-mastra | **failed** | Step "REALWORLD_TASK_TIMEOUT_SECONDS=2400 mise run benchmark:realworld:pts:mastra" lost its sandbox: 12 consecutive detached polls failed (last: computesdk filesystem exists failed: sandbox API error (HTTP 403)) — the sandbox stopped responding, not a quiet long step |
| Baseten Sandboxes | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Baseten Sandboxes | realworld-mastra | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Baseten Sandboxes | system | **failed** | Failed to create sandbox: computesdk create failed: sandbox API error (HTTP 403) FORBIDDEN: This API key does not have permission to perform this operation. |
| Baseten Sandboxes | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| boat | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| boat | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| CreateOS | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: service unavailable |
| CreateOS | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Daytona (container) | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Daytona (container) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Daytona (container) | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Freestyle | cpu-node | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | disk | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | memory | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | network | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | pgbench | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | realworld-better-auth | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | realworld-mastra | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | realworld-openclaw | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Freestyle | system | **failed** | Publication withheld for freestyle: unresolved cleanup: freestyle-system-r2-a1-80e57791-ce1e-42e4-a36b-e033b58801ba; unresolved cleanup: freestyle-cpu-node-r0-a1-82a01ca5-84ee-4483-8ed0-34ff84533935; unresolved cleanup: freestyle-system-r1-a1-9f0fabd3-27ef-46d6-9792-9bc0d9d1d72f; unresolved cleanup: freestyle-system-r0-a1-d63f38c8-34af-487c-8d6c-145c5dc4ac63; unresolved cleanup: freestyle-cpu-node-r3-a1-bf7a6182-638a-4b88-9ee7-043bb15afae5; and 6 more |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-198c006d-63eb-425c-b53e-2dc641c6b43c" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-b1f2648a-488f-446e-9249-0e5803bac324" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-3027dc27-ae1a-4265-a2b8-5ef09bbad38e" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-adecad41-020c-47b4-9c97-f997ab29cd71" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-53e936ef-717a-45ab-a099-ccccf9992ce4" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-dd2564dd-150b-4029-b071-87f951f3b156" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-b48b9def-f970-462f-ab54-10c6df8d7ee2" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-54b853c3-80d5-4a0b-851f-f753324e3cde" did not reach running before the readiness wait expired |
| Microsandbox Cloud | realworld-openclaw | **failed** | Failed to create sandbox: computesdk create failed: runtime error: cloud sandbox "bench-cloud-4d4b401c-403b-469a-bc7f-01c0bcbb2d1a" did not reach running before the readiness wait expired |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_test_core |
| Modal (VM) | realworld-mastra | **failed** | Failed to create sandbox: computesdk created-request preparation and verification failed: Modal control operation exceeded 5000ms |
| Modal (VM) | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| run.cloud | cpu-node | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | disk | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | memory | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | network | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | pgbench | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | realworld-better-auth | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | realworld-mastra | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | realworld-openclaw | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| run.cloud | system | **failed** | Publication withheld for runcloud: unresolved cleanup: runcloud-memory-r1-a1-b931f2ad-6b34-495b-bfcb-958a2f95a0be |
| tama | cpu-node | **failed** | Failed to create sandbox: tama new bench-c0278a50-af09-40bf-8f4f-c396e6f7ac7c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c0278a50-af09-40bf-8f4f-c396e6f7ac7c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | cpu-node | **failed** | Partial publication withheld unverified measurements: node_web_tooling_runs_per_s |
| tama | cpu-node | **failed** | Failed to create sandbox: tama new bench-fe054915-241e-40e3-812b-2b787c53bc3a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-fe054915-241e-40e3-812b-2b787c53bc3a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | cpu-node | **failed** | Failed to create sandbox: tama new bench-9187de00-9f05-463f-aa7a-6f32b68f7da6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9187de00-9f05-463f-aa7a-6f32b68f7da6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | cpu-node | **failed** | Failed to create sandbox: tama new bench-5a218176-696a-470e-bc68-070778439e37 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5a218176-696a-470e-bc68-070778439e37 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | cpu-node | **failed** | Failed to create sandbox: tama new bench-7765c1a4-b5c5-4472-9424-ed9134e51479 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7765c1a4-b5c5-4472-9424-ed9134e51479 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | disk | **failed** | Failed to create sandbox: tama new bench-d8af712e-d36a-4563-913d-861305b8c5f4 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d8af712e-d36a-4563-913d-861305b8c5f4 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | disk | **failed** | Partial publication withheld unverified measurements: hardlink_bogo_ops_per_s, fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops, fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s, fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops |
| tama | disk | **failed** | Failed to create sandbox: tama new bench-96cb4a9a-8d62-4468-be08-be47f9dbec00 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-96cb4a9a-8d62-4468-be08-be47f9dbec00 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | disk | **failed** | Failed to create sandbox: tama new bench-fa55fc38-131c-4c90-a00b-7f62b10c2250 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-fa55fc38-131c-4c90-a00b-7f62b10c2250 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | memory | **failed** | Failed to create sandbox: tama new bench-7695c65b-035f-49eb-b294-928de2c55414 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7695c65b-035f-49eb-b294-928de2c55414 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | memory | **failed** | Partial publication withheld unverified measurements: stream_type_copy, stream_type_scale, stream_type_add, stream_type_triad |
| tama | memory | **failed** | Failed to create sandbox: tama new bench-83da0391-68ef-466d-9815-b4b28f316ec9 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-83da0391-68ef-466d-9815-b4b28f316ec9 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | memory | **failed** | Failed to create sandbox: tama new bench-cce6d101-7aed-4872-b5d4-62be0d9af92f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-cce6d101-7aed-4872-b5d4-62be0d9af92f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Failed to create sandbox: tama new bench-1d37d2ca-31b2-4629-a83c-09180e855d13 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1d37d2ca-31b2-4629-a83c-09180e855d13 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload, network_https_github_com_total_ms, network_https_api_github_com_total_ms, network_https_raw_githubusercontent_com_total_ms, network_https_registry_npmjs_org_total_ms, network_https_pypi_org_total_ms, network_https_files_pythonhosted_org_total_ms, network_https_ghcr_io_v2_total_ms, network_https_gcr_io_v2_total_ms, network_https_auth_docker_io_registry_token_total_ms, network_https_crates_io_total_ms, network_https_index_crates_io_config_total_ms, network_dns_cold_github_com_ms, network_dns_cold_registry_npmjs_org_ms, network_dns_cold_docker_io_ms, network_dns_cold_pypi_org_ms, network_dns_cold_rubygems_org_ms, network_download_node_v22_23_1_linux_x64_mbits_per_sec |
| tama | network | **failed** | Failed to create sandbox: tama new bench-ddeeb1cb-e8b2-4d3e-8251-4aad463ee717 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ddeeb1cb-e8b2-4d3e-8251-4aad463ee717 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | network | **failed** | Failed to create sandbox: tama new bench-d1fafc04-6a9f-4850-b530-f88138be8349 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-d1fafc04-6a9f-4850-b530-f88138be8349 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | pgbench | **failed** | Failed to create sandbox: tama new bench-bf91ffc8-9925-46b5-8c82-207c510ae843 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-bf91ffc8-9925-46b5-8c82-207c510ae843 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| tama | pgbench | **failed** | Failed to create sandbox: tama new bench-8d278d29-3bcc-4ff0-afe6-4dac86842265 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-8d278d29-3bcc-4ff0-afe6-4dac86842265 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | pgbench | **failed** | Failed to create sandbox: tama new bench-1419b710-8329-4a07-880e-ca2f5356f463 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-1419b710-8329-4a07-880e-ca2f5356f463 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-6077fcb0-daf6-48d8-a9e6-941d22c963d5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6077fcb0-daf6-48d8-a9e6-941d22c963d5 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-7669aa83-73c5-402c-90d4-d2c99cb4426f --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7669aa83-73c5-402c-90d4-d2c99cb4426f failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-c67e4ef1-0767-478f-ac86-ad83c284a4e8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c67e4ef1-0767-478f-ac86-ad83c284a4e8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-4bebb41b-850e-436e-aa6d-4b9317aaf545 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4bebb41b-850e-436e-aa6d-4b9317aaf545 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-5bba7e94-e081-4f6d-b190-74a362e915f1 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-5bba7e94-e081-4f6d-b190-74a362e915f1 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-a77d4813-68a2-4680-b6e4-c15922722418 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a77d4813-68a2-4680-b6e4-c15922722418 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-f9dfb00c-d360-48f1-aa69-f2df66094ef6 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f9dfb00c-d360-48f1-aa69-f2df66094ef6 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-6016c3eb-f3a2-4532-87e5-a6b8eedec940 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-6016c3eb-f3a2-4532-87e5-a6b8eedec940 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-9e557010-14d4-4791-b5aa-fa7ecb780eac --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9e557010-14d4-4791-b5aa-fa7ecb780eac failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-85c2b17f-fbbb-419e-88b1-e23b85534269 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-85c2b17f-fbbb-419e-88b1-e23b85534269 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-7ff8f0a4-16ac-4e08-98ff-7eb681d41b09 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-7ff8f0a4-16ac-4e08-98ff-7eb681d41b09 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-better-auth | **failed** | Failed to create sandbox: tama new bench-0e18ea4f-ce82-4257-a98d-6f30c0ebb01c --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0e18ea4f-ce82-4257-a98d-6f30c0ebb01c failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-563024c8-b453-44db-8db0-dc9dc974f747 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-563024c8-b453-44db-8db0-dc9dc974f747 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-229c1286-fd92-486d-9f65-82f90c7aca05 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-229c1286-fd92-486d-9f65-82f90c7aca05 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-ff07dd0e-e9ff-432c-b2d7-d620e0b24bcf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-ff07dd0e-e9ff-432c-b2d7-d620e0b24bcf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-c5d9f9b9-49d2-4613-bce2-8cdea814bd6d --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c5d9f9b9-49d2-4613-bce2-8cdea814bd6d failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-74474e15-1d81-43e5-a369-8ab1cdf3e957 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-74474e15-1d81-43e5-a369-8ab1cdf3e957 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-e51ffad3-d087-4394-a4da-9f3836499b2a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e51ffad3-d087-4394-a4da-9f3836499b2a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-a9e9cf45-519d-4396-babb-70da7fa804ba --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a9e9cf45-519d-4396-babb-70da7fa804ba failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-91f437ba-fde6-484b-9fcb-7b61c5662400 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-91f437ba-fde6-484b-9fcb-7b61c5662400 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-4232eac3-d0b6-4a2e-9c92-14a4edfc4b92 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-4232eac3-d0b6-4a2e-9c92-14a4edfc4b92 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-459f6d8b-5366-41fc-a75d-38cb3ffb1f84 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-459f6d8b-5366-41fc-a75d-38cb3ffb1f84 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-a4e2388f-c2d0-477b-9c9d-7f7dba2bca25 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a4e2388f-c2d0-477b-9c9d-7f7dba2bca25 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-mastra | **failed** | Failed to create sandbox: tama new bench-0cfcf7a5-29f4-4266-9865-aedfbf719f53 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0cfcf7a5-29f4-4266-9865-aedfbf719f53 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-a0ad1a7f-5d76-4fc8-9c53-84f9677632ce --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-a0ad1a7f-5d76-4fc8-9c53-84f9677632ce failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-c2664c5b-0c6f-4d25-a96f-8933177db5af --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-c2664c5b-0c6f-4d25-a96f-8933177db5af failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-9dc2e447-1a24-461f-814a-2000048f22a1 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9dc2e447-1a24-461f-814a-2000048f22a1 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-73f8aec7-6803-4d0a-a6c2-de68d14b6d78 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-73f8aec7-6803-4d0a-a6c2-de68d14b6d78 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-60eeb88c-ef95-4c69-806d-203fc6d14751 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-60eeb88c-ef95-4c69-806d-203fc6d14751 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-f3a69118-6c59-4b48-8b84-cfcfc86dacb8 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-f3a69118-6c59-4b48-8b84-cfcfc86dacb8 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-0f424d2a-c960-47a8-8252-1a741ef09b22 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-0f424d2a-c960-47a8-8252-1a741ef09b22 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-e53d7da0-1ecb-42c2-8e85-1d05d1103a9a --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e53d7da0-1ecb-42c2-8e85-1d05d1103a9a failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-3a455b60-4693-4538-a89b-7961ed79cd05 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-3a455b60-4693-4538-a89b-7961ed79cd05 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-9790afc8-4b93-41ff-9d88-7f3f9ad8d6a5 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9790afc8-4b93-41ff-9d88-7f3f9ad8d6a5 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-bc6b107e-252b-4289-9d52-12b7b1e58a82 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-bc6b107e-252b-4289-9d52-12b7b1e58a82 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | realworld-openclaw | **failed** | Failed to create sandbox: tama new bench-8ce90a84-0353-4b9c-800b-b42b402439ef --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-8ce90a84-0353-4b9c-800b-b42b402439ef failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | system | **failed** | Failed to create sandbox: tama new bench-128f8f4a-b328-44dc-b72b-63a805af1dcf --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-128f8f4a-b328-44dc-b72b-63a805af1dcf failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | system | **failed** | Partial publication withheld unverified measurements: pybench_milliseconds, sqlite_speedtest_seconds, git_seconds |
| tama | system | **failed** | Failed to create sandbox: tama new bench-e94f94ef-99ba-4bfc-84ca-2cf755d18929 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-e94f94ef-99ba-4bfc-84ca-2cf755d18929 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| tama | system | **failed** | Failed to create sandbox: tama new bench-9a23a6dd-82e1-4a60-bd6f-7c48cab47157 --ttl 0 --json --image ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8 --cpu 4 --memory 8192: exit 1; tama: bench-9a23a6dd-82e1-4a60-bd6f-7c48cab47157 failed to provision; inspect it in the console; provisioning: status=failed; process exit 1 |
| Tangle Sandbox | network | **failed** | pts_iperf-wan-download: pts_iperf-wan-download did not produce 1 numeric metric value(s) |
| Tangle Sandbox | network | **failed** | pts_iperf-wan-upload: PTS batch-run of local/iperf-wan-1.0.0 completed but every trial errored (composite carries no values) |
| Tangle Sandbox | network | **failed** | Step "mise run benchmark:network:suite" failed with exit code 1 |
| Tangle Sandbox | network | **failed** | Partial publication withheld unverified measurements: iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_1, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_tcp_parallel_10, iperf_server_address_localhost_server_port_5201_duration_10_seconds_test_udp_10000mbit_objective_parallel_1, iperf_wan_direction_download, iperf_wan_direction_upload, network_https_github_com_total_ms, network_https_api_github_com_total_ms, network_https_raw_githubusercontent_com_total_ms, network_https_registry_npmjs_org_total_ms, network_https_pypi_org_total_ms, network_https_files_pythonhosted_org_total_ms, network_https_ghcr_io_v2_total_ms, network_https_gcr_io_v2_total_ms, network_https_auth_docker_io_registry_token_total_ms, network_https_crates_io_total_ms, network_https_index_crates_io_config_total_ms, network_dns_cold_github_com_ms, network_dns_cold_registry_npmjs_org_ms, network_dns_cold_docker_io_ms, network_dns_cold_pypi_org_ms, network_dns_cold_rubygems_org_ms, network_download_node_v22_23_1_linux_x64_mbits_per_sec |
| Tangle Sandbox | pgbench | **failed** | Suite "pgbench" on tangle produced no pts_*.xml — PTS likely failed silently |
| Tangle Sandbox | pgbench | **failed** | Partial publication withheld unverified measurements: pgbench_scaling_factor_100_clients_50_mode_read_only, pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency, pgbench_scaling_factor_100_clients_50_mode_read_write, pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency |
| Tangle Sandbox | realworld-better-auth | **failed** | Suite "realworld-better-auth" on tangle produced no pts_*.xml — PTS likely failed silently |
| Tangle Sandbox | realworld-better-auth | **failed** | Partial publication withheld unverified measurements: realworld_better_auth_task_git_clone, realworld_better_auth_task_cold_install, realworld_better_auth_task_lint_biome, realworld_better_auth_task_lint_deps_knip, realworld_better_auth_task_lint_format, realworld_better_auth_task_lint_spell, realworld_better_auth_task_lint_types, realworld_better_auth_task_lint_packages, realworld_better_auth_task_typecheck, realworld_better_auth_task_build |
| Tangle Sandbox | realworld-mastra | **failed** | Suite "realworld-mastra" on tangle produced no pts_*.xml — PTS likely failed silently |
| Tangle Sandbox | realworld-mastra | **failed** | Partial publication withheld unverified measurements: realworld_mastra_task_git_clone, realworld_mastra_task_cold_install, realworld_mastra_task_lint_format, realworld_mastra_task_build_core, realworld_mastra_task_test_core |
| Tangle Sandbox | realworld-openclaw | **failed** | Suite "realworld-openclaw" on tangle produced no pts_*.xml — PTS likely failed silently |
| Tangle Sandbox | realworld-openclaw | **failed** | Partial publication withheld unverified measurements: realworld_openclaw_task_git_clone, realworld_openclaw_task_cold_install, realworld_openclaw_task_lint_oxlint, realworld_openclaw_task_lint_extensions_all, realworld_openclaw_task_typecheck, realworld_openclaw_task_test_types |

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
The floor is a property of the design — here 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.30; 3 v 3 sandboxes floors at p ≈ 0.40; 3 v 3 sandboxes floors at p ≈ 0.60; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Namespace | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | 0.17 (tied) | 0.091 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Blaxel | 0.47 (tied) | 0.79 |
| realworld | Mastra: cold install | Novita | 0.20 (tied) | 0.19 |
| realworld | Mastra: cold install | DigitalOcean MicroVMs | 0.59 (tied) | 0.79 |
| realworld | Mastra: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.012 | 0.066 |
| realworld | Mastra: cold install | CreateOS | 0.80 (tied) | 0.79 |
| realworld | Mastra: cold install | boat | 0.63 (tied) | 0.19 |
| realworld | Mastra: cold install | E2B | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: build | Modal (VM) | — | — |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | 0.20 (tied) | 0.43 |
| realworld | Better-Auth: build | boat | 0.052 (tied) | 0.066 |
| realworld | Better-Auth: build | CreateOS | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: build | Novita | 0.80 (tied) | 0.43 |
| realworld | Better-Auth: build | Blaxel | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: build | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: build | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: build | E2B | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | DigitalOcean MicroVMs | 0.11 (tied) | 0.19 |
| realworld | Better-Auth: cold install | boat | 0.67 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Blaxel | 0.41 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Vercel Sandbox | <0.001 | 0.0046 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: cold install | E2B | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: cold install | CreateOS | 0.22 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Namespace | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.0010 | 0.0046 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.62 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Blaxel | 0.22 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.0029 | 0.019 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0023 | <0.001 |
| realworld | Better-Auth: git clone | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | boat | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | CreateOS | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Novita | 0.028 | 0.019 |
| realworld | Better-Auth: git clone | E2B | 0.44 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | boat | 0.18 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | CreateOS | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.66 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.0011 | <0.001 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.039 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.032 | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | boat | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | DigitalOcean MicroVMs | 0.71 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.93 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | CreateOS | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.039 | 0.066 |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | DigitalOcean MicroVMs | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Namespace | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: lint format | boat | 0.54 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Modal (gVisor) | 0.83 (tied) | 0.066 |
| realworld | Better-Auth: lint format | CreateOS | 1.0 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Blaxel | 0.26 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Novita | 0.68 (tied) | 0.79 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | E2B | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: lint packages | Modal (VM) | — | — |
| realworld | Better-Auth: lint packages | DigitalOcean MicroVMs | 0.0023 | 0.0046 |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.0038 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | CreateOS | 0.40 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Novita | 0.32 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | boat | 0.55 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Blaxel | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | E2B | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.24 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | boat | 0.44 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | CreateOS | 0.93 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | 0.44 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | E2B | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Modal (VM) | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | boat | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Blaxel | 0.89 (tied) | 0.99 |
| realworld | Better-Auth: lint types | Namespace | 0.63 (tied) | 0.066 |
| realworld | Better-Auth: lint types | CreateOS | 0.89 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.0036 | 0.0046 |
| realworld | Better-Auth: lint types | E2B | 0.0036 | 0.019 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 0.67 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Modal (VM) | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: typecheck | DigitalOcean MicroVMs | 0.0029 | 0.0046 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.0023 | 0.019 |
| realworld | Better-Auth: typecheck | Namespace | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | boat | 0.35 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | CreateOS | 0.76 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | Novita | 0.51 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Blaxel | 0.028 | 0.0046 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | <0.001 | 0.0046 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | E2B | 0.11 (tied) | 0.066 |
| realworld | Mastra: build:core | Modal (VM) | — | — |
| realworld | Mastra: build:core | Daytona (VM) | 0.13 (tied) | 0.036 |
| realworld | Mastra: build:core | Namespace | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | 0.033 | <0.001 |
| realworld | Mastra: build:core | DigitalOcean MicroVMs | 0.32 (tied) | 0.19 |
| realworld | Mastra: build:core | CreateOS | 0.41 (tied) | 0.019 |
| realworld | Mastra: build:core | Novita | 0.11 (tied) | 0.066 |
| realworld | Mastra: build:core | Blaxel | 0.052 (tied) | 0.0046 |
| realworld | Mastra: build:core | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: build:core | boat | 0.76 (tied) | 0.19 |
| realworld | Mastra: build:core | Vercel Sandbox | 0.010 | <0.001 |
| realworld | Mastra: build:core | E2B | 0.84 (tied) | 0.19 |
| realworld | Mastra: git clone | Namespace | — | — |
| realworld | Mastra: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Daytona (VM) | 0.15 (tied) | 0.0098 |
| realworld | Mastra: git clone | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.0029 | 0.0046 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.046 | 0.19 |
| realworld | Mastra: git clone | Novita | <0.001 | <0.001 |
| realworld | Mastra: git clone | E2B | 0.045 | 0.19 |
| realworld | Mastra: git clone | DigitalOcean MicroVMs | 0.93 (tied) | 0.19 |
| realworld | Mastra: git clone | CreateOS | 0.16 (tied) | 0.019 |
| realworld | Mastra: git clone | boat | 0.98 (tied) | 0.43 |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 0.57 (tied) | 0.12 |
| realworld | Mastra: lint:format | CreateOS | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | 0.67 (tied) | 0.066 |
| realworld | Mastra: lint:format | Namespace | 0.98 (tied) | 0.066 |
| realworld | Mastra: lint:format | Novita | 0.59 (tied) | 0.066 |
| realworld | Mastra: lint:format | Blaxel | 0.71 (tied) | 0.43 |
| realworld | Mastra: lint:format | boat | 0.84 (tied) | 0.19 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.068 (tied) | 0.066 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Vercel Sandbox | 0.44 (tied) | 0.19 |
| realworld | Mastra: test:core | CreateOS | — | — |
| realworld | Mastra: test:core | Daytona (VM) | <0.001 | 0.0046 |
| realworld | Mastra: test:core | Modal (VM) | <0.001 | 0.0012 |
| realworld | Mastra: test:core | Namespace | 0.38 (tied) | 0.49 |
| realworld | Mastra: test:core | DigitalOcean MicroVMs | 0.51 (tied) | 0.019 |
| realworld | Mastra: test:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: test:core | Microsandbox Cloud | 0.55 (tied) | 0.43 |
| realworld | Mastra: test:core | Modal (gVisor) | 0.019 | 0.0012 |
| realworld | Mastra: test:core | Blaxel | <0.001 | 0.0059 |
| realworld | Mastra: test:core | boat | 1.0 (tied) | 0.087 |
| realworld | Mastra: test:core | Vercel Sandbox | 0.069 (tied) | 0.0043 |
| realworld | Mastra: test:core | E2B | 0.16 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Daytona (VM) | — | — |
| realworld | OpenClaw: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | 0.93 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Modal (gVisor) | 0.0036 | <0.001 |
| realworld | OpenClaw: cold install | Novita | 0.51 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Blaxel | 0.045 | 0.19 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.0088 | 0.012 |
| realworld | OpenClaw: cold install | boat | 0.95 (tied) | 0.67 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: cold install | CreateOS | — | — |
| realworld | OpenClaw: cold install | E2B | — | — |
| realworld | OpenClaw: cold install | DigitalOcean MicroVMs | 0.44 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Namespace | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | 0.0036 | <0.001 |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.80 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Blaxel | 0.0022 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.0028 | <0.001 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.10 (tied) | 0.030 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.95 (tied) | 0.44 |
| realworld | OpenClaw: git clone | CreateOS | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | E2B | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: git clone | boat | 0.67 (tied) | 0.99 |
| realworld | OpenClaw: git clone | DigitalOcean MicroVMs | 0.63 (tied) | 0.066 |
| realworld | OpenClaw: lint (all extensions) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (all extensions) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Modal (gVisor) | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | CreateOS | — | — |
| realworld | OpenClaw: lint (all extensions) | Microsandbox Cloud | — | — |
| realworld | OpenClaw: lint (all extensions) | boat | 0.54 (tied) | 0.67 |
| realworld | OpenClaw: lint (all extensions) | Namespace | 0.89 (tied) | 0.43 |
| realworld | OpenClaw: lint (all extensions) | Blaxel | 0.0083 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | DigitalOcean MicroVMs | <0.001 | <0.001 |
| realworld | OpenClaw: lint (all extensions) | Vercel Sandbox | 0.039 | 0.066 |
| realworld | OpenClaw: lint (all extensions) | E2B | 0.0036 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (Oxlint) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (Oxlint) | Modal (VM) | 0.028 | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | CreateOS | — | — |
| realworld | OpenClaw: lint (Oxlint) | Microsandbox Cloud | — | — |
| realworld | OpenClaw: lint (Oxlint) | boat | 0.95 (tied) | 0.67 |
| realworld | OpenClaw: lint (Oxlint) | Blaxel | 0.10 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Namespace | 0.55 (tied) | 0.19 |
| realworld | OpenClaw: lint (Oxlint) | DigitalOcean MicroVMs | 0.29 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Novita | 0.052 (tied) | 0.019 |
| realworld | OpenClaw: lint (Oxlint) | Vercel Sandbox | <0.001 | 0.0046 |
| realworld | OpenClaw: lint (Oxlint) | E2B | 0.0011 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | CreateOS | — | — |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | — | — |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.031 | 0.030 |
| realworld | OpenClaw: typecheck (test tree) | boat | 0.41 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.67 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Blaxel | 0.84 (tied) | 0.99 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.80 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.0083 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | DigitalOcean MicroVMs | 0.59 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | E2B | 0.0036 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.35 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.0044 | 0.0047 |
| realworld | OpenClaw: typecheck (tsgo) | boat | 0.62 (tied) | 0.67 |
| realworld | OpenClaw: typecheck (tsgo) | CreateOS | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | DigitalOcean MicroVMs | 0.20 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.068 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | 0.0056 | <0.001 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | CreateOS | 0.42 (tied) | 0.31 |
| cpu | Node.js web tooling | Daytona (VM) | 0.74 (tied) | 0.11 |
| cpu | Node.js web tooling | Modal (VM) | 0.22 (tied) | 0.31 |
| cpu | Node.js web tooling | DigitalOcean MicroVMs | 1.0 (tied) | 0.68 |
| cpu | Node.js web tooling | Baseten Sandboxes | 0.063 (tied) | 0.012 |
| cpu | Node.js web tooling | Blaxel | 0.079 (tied) | 0.0058 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.55 (tied) | 0.31 |
| cpu | Node.js web tooling | Novita | 0.095 (tied) | 0.031 |
| cpu | Node.js web tooling | boat | 0.69 (tied) | 0.11 |
| cpu | Node.js web tooling | Daytona (container) | 0.55 (tied) | 0.031 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.69 (tied) | 0.68 |
| cpu | Node.js web tooling | E2B | 0.15 (tied) | 0.031 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.056 (tied) | 0.0012 |
| cpu | Node.js web tooling | Tangle Sandbox | 0.0079 | <0.001 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Tangle Sandbox | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | CreateOS | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Tangle Sandbox | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | DigitalOcean MicroVMs | 0.20 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (container) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.60 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Tangle Sandbox | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | boat | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | DigitalOcean MicroVMs | 0.20 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (container) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.60 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Tangle Sandbox | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | boat | 1.0 (too few sandboxes) | 1.0 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | CreateOS | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | boat | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | boat | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | CreateOS | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.70 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | CreateOS | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.10 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | boat | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | CreateOS | — | — |
| disk | Hardlink throughput | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.70 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Tangle Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | boat | 0.40 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.60 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | Modal (gVisor) | 1.0 (too few sandboxes) | 1.0 |
| memory | STREAM Triad | DigitalOcean MicroVMs | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Baseten Sandboxes | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | boat | 0.70 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Triad | CreateOS | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (container) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Triad | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | DigitalOcean MicroVMs | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Baseten Sandboxes | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | boat | 0.70 (too few sandboxes) | 0.012 |
| memory | STREAM Add | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Add | CreateOS | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Tangle Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Add | Daytona (container) | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | DigitalOcean MicroVMs | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Novita | 0.40 (too few sandboxes) | 0.32 |
| memory | STREAM Copy | Baseten Sandboxes | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Copy | E2B | 0.70 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | boat | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Copy | CreateOS | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Tangle Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Copy | Daytona (container) | 0.10 (too few sandboxes) | 0.012 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Novita | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Modal (gVisor) | 1.0 (too few sandboxes) | 0.32 |
| memory | STREAM Scale | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Baseten Sandboxes | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | boat | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | E2B | 1.0 (too few sandboxes) | 0.81 |
| memory | STREAM Scale | CreateOS | 0.40 (too few sandboxes) | 0.077 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Scale | Tangle Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Vercel Sandbox | — | — |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN download | Novita | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | boat | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Blaxel | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Daytona (container) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | DigitalOcean MicroVMs | — | — |
| network | iperf3 WAN upload | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Daytona (container) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | boat | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | CreateOS | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | E2B | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | CreateOS | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | boat | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (container) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | DigitalOcean MicroVMs | — | — |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | CreateOS | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | boat | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Daytona (container) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | boat | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | CreateOS | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (container) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | DigitalOcean MicroVMs | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | github.com HTTPS | Modal (VM) | — | — |
| network | github.com HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Namespace | 0.40 (too few sandboxes) | 0.0014 |
| network | github.com HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Blaxel | 0.70 (too few sandboxes) | 0.21 |
| network | github.com HTTPS | CreateOS | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | boat | 0.70 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Daytona (container) | 1.0 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Microsandbox Cloud | 0.70 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | github.com HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Modal (VM) | — | — |
| network | api.github.com HTTPS | Namespace | 1.0 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Daytona (container) | 1.0 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | api.github.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Modal (VM) | — | — |
| network | raw.githubusercontent.com HTTPS | Namespace | 1.0 (too few sandboxes) | 0.031 |
| network | raw.githubusercontent.com HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | DigitalOcean MicroVMs | 0.20 (too few sandboxes) | 0.031 |
| network | raw.githubusercontent.com HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Microsandbox Cloud | 0.70 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Daytona (container) | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | CreateOS | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | E2B | 0.20 (too few sandboxes) | <0.001 |
| network | raw.githubusercontent.com HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Namespace | — | — |
| network | registry.npmjs.org HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Modal (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Blaxel | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | 0.031 |
| network | registry.npmjs.org HTTPS | Vercel Sandbox | 0.70 (too few sandboxes) | 0.031 |
| network | registry.npmjs.org HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Daytona (container) | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | E2B | 0.40 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | registry.npmjs.org HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Modal (VM) | — | — |
| network | pypi.org HTTPS | Namespace | 0.80 (too few sandboxes, equal medians) | <0.001 |
| network | pypi.org HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Vercel Sandbox | 0.40 (too few sandboxes) | 0.020 |
| network | pypi.org HTTPS | Daytona (container) | 0.20 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Modal (gVisor) | 0.80 (too few sandboxes, equal medians) | <0.001 |
| network | pypi.org HTTPS | CreateOS | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | E2B | 0.40 (too few sandboxes) | <0.001 |
| network | pypi.org HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Modal (VM) | — | — |
| network | files.pythonhosted.org HTTPS | Namespace | 1.0 (too few sandboxes) | 0.0026 |
| network | files.pythonhosted.org HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | 0.047 |
| network | files.pythonhosted.org HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Vercel Sandbox | 0.40 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Daytona (container) | 0.40 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | boat | 0.20 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | E2B | 0.40 (too few sandboxes) | <0.001 |
| network | files.pythonhosted.org HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Modal (VM) | — | — |
| network | ghcr.io/v2 HTTPS | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Namespace | 1.0 (too few sandboxes) | 0.94 |
| network | ghcr.io/v2 HTTPS | Blaxel | 0.70 (too few sandboxes) | 0.0044 |
| network | ghcr.io/v2 HTTPS | Vercel Sandbox | 1.0 (too few sandboxes) | 0.74 |
| network | ghcr.io/v2 HTTPS | CreateOS | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Daytona (container) | 1.0 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | boat | 0.70 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | <0.001 |
| network | ghcr.io/v2 HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Namespace | — | — |
| network | gcr.io/v2 HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Novita | 0.20 (too few sandboxes) | 0.0026 |
| network | gcr.io/v2 HTTPS | Vercel Sandbox | 0.40 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | E2B | 1.0 (too few sandboxes) | 0.0074 |
| network | gcr.io/v2 HTTPS | Modal (VM) | 0.70 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Daytona (VM) | 0.20 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.21 |
| network | gcr.io/v2 HTTPS | Daytona (container) | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | gcr.io/v2 HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Namespace | — | — |
| network | auth.docker.io token HTTPS | Modal (VM) | 0.40 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Blaxel | 0.70 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Daytona (VM) | 0.20 (too few sandboxes) | 0.047 |
| network | auth.docker.io token HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | CreateOS | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Daytona (container) | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | E2B | 0.10 (too few sandboxes) | <0.001 |
| network | auth.docker.io token HTTPS | boat | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Modal (VM) | — | — |
| network | crates.io HTTPS | DigitalOcean MicroVMs | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Namespace | 1.0 (too few sandboxes) | 0.031 |
| network | crates.io HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.0074 |
| network | crates.io HTTPS | Blaxel | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.15 |
| network | crates.io HTTPS | Daytona (container) | 0.40 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | boat | 0.10 (too few sandboxes) | <0.001 |
| network | crates.io HTTPS | E2B | 0.70 (too few sandboxes) | 0.0014 |
| network | crates.io HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Modal (VM) | — | — |
| network | index.crates.io config HTTPS | Namespace | 1.0 (too few sandboxes) | 0.047 |
| network | index.crates.io config HTTPS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Blaxel | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Vercel Sandbox | 0.20 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Modal (gVisor) | 0.40 (too few sandboxes) | 0.0044 |
| network | index.crates.io config HTTPS | Daytona (container) | 0.10 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | CreateOS | 0.70 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | boat | 0.40 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | E2B | 0.70 (too few sandboxes) | <0.001 |
| network | index.crates.io config HTTPS | Novita | 0.10 (too few sandboxes) | <0.001 |
| network | github.com cold DNS | Blaxel | — | — |
| network | github.com cold DNS | Vercel Sandbox | 0.30 (too few sandboxes) | 0.32 |
| network | github.com cold DNS | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | github.com cold DNS | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Namespace | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | boat | 0.50 (too few sandboxes) | 0.98 |
| network | github.com cold DNS | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Daytona (container) | 1.0 (too few sandboxes) | 0.98 |
| network | github.com cold DNS | CreateOS | 0.60 (too few sandboxes) | 0.32 |
| network | github.com cold DNS | E2B | 0.30 (too few sandboxes) | 0.32 |
| network | github.com cold DNS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.033 |
| network | github.com cold DNS | Novita | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | github.com cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.98 |
| network | registry.npmjs.org cold DNS | Vercel Sandbox | — | — |
| network | registry.npmjs.org cold DNS | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| network | registry.npmjs.org cold DNS | Modal (VM) | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Namespace | 0.60 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Daytona (container) | 0.10 (too few sandboxes) | 0.033 |
| network | registry.npmjs.org cold DNS | DigitalOcean MicroVMs | 0.40 (too few sandboxes) | 0.32 |
| network | registry.npmjs.org cold DNS | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | CreateOS | 0.30 (too few sandboxes) | 0.32 |
| network | registry.npmjs.org cold DNS | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | E2B | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | registry.npmjs.org cold DNS | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | registry.npmjs.org cold DNS | boat | 0.70 (too few sandboxes) | 0.98 |
| network | registry.npmjs.org cold DNS | Novita | 0.70 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Vercel Sandbox | — | — |
| network | docker.io cold DNS | Blaxel | 1.0 (too few sandboxes) | 0.98 |
| network | docker.io cold DNS | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Namespace | 0.60 (too few sandboxes, equal medians) | 0.98 |
| network | docker.io cold DNS | Daytona (VM) | 0.30 (too few sandboxes) | 0.32 |
| network | docker.io cold DNS | Daytona (container) | 0.80 (too few sandboxes) | 0.98 |
| network | docker.io cold DNS | CreateOS | 1.0 (too few sandboxes) | 0.98 |
| network | docker.io cold DNS | boat | 0.10 (too few sandboxes) | 0.033 |
| network | docker.io cold DNS | E2B | 0.10 (too few sandboxes) | 0.033 |
| network | docker.io cold DNS | DigitalOcean MicroVMs | 0.40 (too few sandboxes) | 0.32 |
| network | docker.io cold DNS | Novita | 1.0 (too few sandboxes) | 0.98 |
| network | docker.io cold DNS | Modal (gVisor) | 0.60 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Vercel Sandbox | — | — |
| network | pypi.org cold DNS | Blaxel | 0.10 (too few sandboxes) | 0.033 |
| network | pypi.org cold DNS | boat | 0.40 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Daytona (container) | 1.0 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | Daytona (VM) | 0.70 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | CreateOS | 0.40 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | E2B | 0.30 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Namespace | 1.0 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.32 |
| network | pypi.org cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.98 |
| network | pypi.org cold DNS | Novita | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | boat | — | — |
| network | rubygems.org cold DNS | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Vercel Sandbox | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Blaxel | 0.10 (too few sandboxes) | 0.033 |
| network | rubygems.org cold DNS | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | rubygems.org cold DNS | CreateOS | 0.40 (too few sandboxes) | 0.32 |
| network | rubygems.org cold DNS | Daytona (container) | 0.80 (too few sandboxes, equal medians) | 0.98 |
| network | rubygems.org cold DNS | Daytona (VM) | 0.80 (too few sandboxes, equal medians) | 0.98 |
| network | rubygems.org cold DNS | Modal (VM) | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | E2B | 0.40 (too few sandboxes) | 0.32 |
| network | rubygems.org cold DNS | Novita | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | Modal (gVisor) | 1.0 (too few sandboxes) | 0.98 |
| network | rubygems.org cold DNS | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.033 |
| network | Node 22 download | Vercel Sandbox | — | — |
| network | Node 22 download | Blaxel | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Namespace | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Daytona (VM) | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | Node 22 download | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| network | Node 22 download | Daytona (container) | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | boat | 0.70 (too few sandboxes) | 0.98 |
| network | Node 22 download | Novita | 1.0 (too few sandboxes) | 0.98 |
| network | Node 22 download | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | Node 22 download | CreateOS | 0.70 (too few sandboxes) | 0.32 |
| network | Node 22 download | E2B | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | CreateOS | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Novita | 0.20 (too few sandboxes) | 0.077 |
| system | Git common operations | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | boat | 1.0 (too few sandboxes) | 0.32 |
| system | Git common operations | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Tangle Sandbox | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (VM) | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Modal (VM) | — | — |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | CreateOS | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Daytona (container) | 0.10 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | — | — |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | DigitalOcean MicroVMs | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | CreateOS | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | boat | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Daytona (container) | 0.10 (too few sandboxes) | 0.077 |
| system | PyBench | Namespace | — | — |
| system | PyBench | boat | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Daytona (VM) | 0.80 (too few sandboxes) | 0.32 |
| system | PyBench | Modal (VM) | 0.20 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | PyBench | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | CreateOS | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Tangle Sandbox | 0.40 (too few sandboxes) | 0.81 |
| system | PyBench | Daytona (container) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.60 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Namespace | — | — |
| system | SQLite Speedtest | CreateOS | 0.70 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | DigitalOcean MicroVMs | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Tangle Sandbox | 0.20 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | boat | 0.40 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Modal (gVisor) | 1.0 (too few sandboxes) | 0.81 |
| system | SQLite Speedtest | Daytona (container) | 0.10 (too few sandboxes) | 0.0013 |

</details>

