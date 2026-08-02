# Sandbox provider leaderboard

Run [`30730328892`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30730328892) · commit [`5e49ab4d44aa75cacc93d4954890ec38fd6c56da`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/5e49ab4d44aa75cacc93d4954890ec38fd6c56da) ·
dataset [`data/dataset/runs/30730328892.json`](data/dataset/runs/30730328892.json) · generated 2026-08-02T04:02:22.316Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **402 metric records**
backed by **4047 retained trial observations**, across **46 metrics** and
**9 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first — some behind a disclosure triangle, none omitted.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
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

## Providers in this run

Each provider's isolation technology — the **declared** technology is authoritative; **detected**
is a best-effort in-sandbox probe that cannot separate every isolation type (a container and a
microVM can both read `kvm`; gVisor and a microVM can both read `unknown`), shown only as a
cross-check.

| Provider | Isolation (declared) | Detected |
| --- | --- | --- |
| Blaxel | microVM | vm |
| Daytona (VM) | microVM (Linux VM) | vm |
| E2B | Firecracker microVM | vm |
| Microsandbox Cloud | libkrun microVM (cloud) | vm |
| Modal (gVisor) | gVisor container | gvisor |
| Modal (VM) | microVM (VM runtime) | vm |
| Namespace | microVM (dedicated instance) | vm |
| Novita | microVM | vm |
| Vercel Sandbox | Firecracker microVM | vm |

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 9 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 8 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 8 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 36.79 | 35.69 – 37.73 | 12 | — |
| 1 | Daytona (VM) | 39.27 | 36.45 – 40.87 | 11 | tied |
| 3 | Novita | 43.94 | 41.99 – 46.02 | 12 | — |
| 3 | Namespace | 47.79 | 43.63 – 54.73 | 12 | tied |
| 3 | Modal (VM) | 49.97 | 43.91 – 53.69 | 12 | tied |
| 6 | Microsandbox Cloud | 61.09 | 55.25 – 68.22 | 12 | — |
| 6 | E2B | 63.84 | 63.1 – 69.36 | 12 | tied |
| 8 | Modal (gVisor) | 95.57 | 92.24 – 102 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 46.5 | 46.31 – 47.29 | 12 | — |
| 2 | Daytona (VM) | 55.73 | 55.01 – 57.57 | 12 | — |
| 3 | Blaxel | 60.74 | 58.94 – 62.67 | 12 | — |
| 4 | Novita | 69.42 | 68.5 – 79.05 | 12 | — |
| 4 | Microsandbox Cloud | 78.83 | 76.14 – 79.64 | 12 | tied |
| 4 | Modal (VM) | 80.44 | 68.88 – 86.32 | 12 | tied |
| 7 | Vercel Sandbox | 92.01 | 89.56 – 96.94 | 12 | — |
| 7 | E2B | 95.26 | 94.52 – 97.49 | 12 | tied |
| 9 | Modal (gVisor) | 142 | 136.9 – 145.6 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.54 | 11.37 – 11.9 | 12 | — |
| 1 | Daytona (VM) | 12.03 | 11.62 – 12.42 | 12 | tied |
| 3 | Novita | 14.3 | 13.69 – 15.27 | 12 | — |
| 4 | Microsandbox Cloud | 18.09 | 17.61 – 19.34 | 12 | — |
| 4 | Modal (VM) | 18.48 | 18.15 – 19.51 | 12 | tied |
| 6 | E2B | 19.19 | 18.92 – 19.92 | 12 | — |
| 7 | Vercel Sandbox | 20.77 | 19.6 – 22.57 | 12 | — |
| 8 | Namespace | 25.24 | 24.7 – 26.27 | 12 | — |
| 9 | Modal (gVisor) | 36.36 | 34.35 – 38.01 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Vercel Sandbox is ~1.6× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.5495 | 0.539 – 0.602 | 12 | — |
| 2 | Vercel Sandbox | 0.8795 | 0.7945 – 0.9185 | 12 | — |
| 2 | Modal (VM) | 0.9025 | 0.74 – 1.466 | 12 | tied |
| 2 | Namespace | 1.177 | 1.146 – 1.706 | 12 | tied |
| 2 | E2B | 1.344 | 1.272 – 1.398 | 12 | tied |
| 2 | Daytona (VM) | 1.351 | 1.233 – 1.607 | 12 | tied |
| 7 | Microsandbox Cloud | 1.868 | 1.603 – 12.59 | 12 | — |
| 7 | Novita | 1.882 | 1.8 – 2.017 | 12 | tied |
| 9 | Modal (gVisor) | 2.442 | 2.329 – 2.533 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.696 | 2.679 – 2.728 | 12 | — |
| 2 | Daytona (VM) | 3.105 | 3.046 – 3.132 | 12 | — |
| 3 | Blaxel | 3.234 | 3.181 – 3.263 | 12 | — |
| 4 | Novita | 3.583 | 3.482 – 3.802 | 12 | — |
| 5 | Microsandbox Cloud | 4.168 | 4.107 – 4.239 | 12 | — |
| 6 | Vercel Sandbox | 4.282 | 4.264 – 4.602 | 12 | — |
| 6 | Modal (VM) | 4.29 | 3.994 – 4.731 | 12 | tied |
| 8 | E2B | 5.144 | 5.047 – 5.216 | 12 | — |
| 9 | Modal (gVisor) | 10.87 | 10.7 – 11.55 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 8.069 | 8.037 – 8.101 | 12 | — |
| 2 | Blaxel | 9.953 | 9.769 – 10.17 | 12 | — |
| 2 | Daytona (VM) | 10.42 | 9.926 – 10.53 | 12 | tied |
| 4 | Novita | 11.96 | 11.61 – 12.48 | 12 | — |
| 5 | Microsandbox Cloud | 12.64 | 12.4 – 12.73 | 12 | — |
| 6 | Modal (VM) | 14.01 | 13.35 – 15.45 | 12 | — |
| 6 | Vercel Sandbox | 15.16 | 14.89 – 15.68 | 12 | tied |
| 8 | E2B | 18.42 | 18.32 – 18.63 | 12 | — |
| 9 | Modal (gVisor) | 30.05 | 28.72 – 30.79 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.221 | 2.175 – 2.252 | 12 | — |
| 2 | Blaxel | 2.842 | 2.72 – 2.982 | 12 | — |
| 2 | Daytona (VM) | 2.944 | 2.877 – 2.964 | 12 | tied |
| 4 | Novita | 3.223 | 3.16 – 3.3 | 12 | — |
| 5 | Microsandbox Cloud | 3.542 | 3.444 – 3.576 | 12 | — |
| 6 | Modal (VM) | 4.25 | 3.753 – 4.748 | 12 | — |
| 6 | Vercel Sandbox | 4.54 | 4.391 – 4.71 | 12 | tied |
| 8 | E2B | 5.231 | 5.175 – 5.325 | 12 | — |
| 9 | Modal (gVisor) | 7.579 | 7.284 – 7.712 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.055 | 2.042 – 2.073 | 12 | — |
| 2 | Daytona (VM) | 2.41 | 2.388 – 2.478 | 12 | — |
| 3 | Blaxel | 2.487 | 2.457 – 2.539 | 12 | — |
| 4 | Novita | 2.908 | 2.795 – 3.142 | 12 | — |
| 5 | Microsandbox Cloud | 3.397 | 3.296 – 3.502 | 12 | — |
| 5 | Modal (VM) | 3.453 | 3.182 – 3.829 | 12 | tied |
| 5 | Vercel Sandbox | 3.798 | 3.675 – 3.92 | 12 | tied |
| 8 | E2B | 4.191 | 4.058 – 4.341 | 12 | — |
| 9 | Modal (gVisor) | 10.86 | 10.46 – 11.16 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.344 | 5.316 – 5.367 | 12 | — |
| 2 | Blaxel | 7.082 | 6.859 – 7.194 | 12 | — |
| 3 | Daytona (VM) | 7.381 | 7.021 – 7.521 | 12 | — |
| 4 | Novita | 7.86 | 7.732 – 8.159 | 12 | — |
| 5 | Microsandbox Cloud | 9.61 | 9.354 – 9.806 | 12 | — |
| 5 | Modal (VM) | 10.07 | 9.003 – 11.59 | 12 | tied |
| 5 | Vercel Sandbox | 11.2 | 10.89 – 11.45 | 12 | tied |
| 8 | E2B | 12.97 | 12.56 – 13.63 | 12 | — |
| 9 | Modal (gVisor) | 16.37 | 16.02 – 16.98 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.75 | 23.13 – 25.03 | 12 | — |
| 1 | Namespace | 24.59 | 24.33 – 24.9 | 12 | tied |
| 3 | Blaxel | 26.83 | 26.04 – 27.18 | 12 | — |
| 4 | Novita | 33.67 | 32.41 – 35.47 | 12 | — |
| 4 | Modal (VM) | 37.33 | 33.2 – 42.82 | 12 | tied |
| 4 | Microsandbox Cloud | 39.54 | 38.1 – 41.09 | 12 | tied |
| 7 | Vercel Sandbox | 44.77 | 43.63 – 46.63 | 12 | — |
| 8 | E2B | 48.94 | 47.86 – 49.66 | 12 | — |
| 9 | Modal (gVisor) | 107.4 | 103.2 – 112 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 30.12 | 29.86 – 30.52 | 12 | — |
| 2 | Daytona (VM) | 39.44 | 39.13 – 41.06 | 12 | — |
| 3 | Blaxel | 41.7 | 40.83 – 43.3 | 12 | — |
| 4 | Novita | 44.51 | 42.79 – 46.4 | 12 | — |
| 5 | Modal (VM) | 55.93 | 49.74 – 64.04 | 12 | — |
| 5 | Microsandbox Cloud | 59.01 | 57.82 – 60.71 | 12 | tied |
| 7 | Vercel Sandbox | 66.2 | 64.38 – 67.33 | 12 | — |
| 8 | E2B | 71.09 | 69.76 – 74.09 | 12 | — |
| 9 | Modal (gVisor) | 80.29 | 76.41 – 85.55 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 55.77 | 55.32 – 56.13 | 12 | — |
| 2 | Daytona (VM) | 69.82 | 69.04 – 71.83 | 11 | — |
| 3 | Blaxel | 73.91 | 72.49 – 75.52 | 12 | — |
| 4 | Novita | 79.79 | 78.41 – 87.3 | 12 | — |
| 4 | Modal (VM) | 91.85 | 81.74 – 93.4 | 12 | tied |
| 6 | Microsandbox Cloud | 97.82 | 94.6 – 100.8 | 12 | — |
| 7 | E2B | 122.5 | 120.6 – 125.2 | 12 | — |
| 8 | Modal (gVisor) | 169.8 | 167.8 – 177.8 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.123 | 2.092 – 2.313 | 12 | — |
| 2 | Modal (VM) | 2.586 | 2.582 – 2.76 | 12 | — |
| 3 | Microsandbox Cloud | 3.17 | 2.999 – 3.373 | 12 | — |
| 3 | Novita | 3.425 | 3.125 – 5.139 | 12 | tied |
| 3 | E2B | 3.644 | 3.419 – 3.923 | 12 | tied |
| 3 | Namespace | 4.037 | 3.49 – 4.663 | 12 | tied |
| 3 | Daytona (VM) | 4.094 | 2.444 – 6.275 | 11 | tied |
| 8 | Modal (gVisor) | 6.233 | 5.797 – 6.428 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 67.1 | 66.47 – 67.37 | 12 | — |
| 2 | Daytona (VM) | 88.19 | 84.23 – 93.56 | 11 | — |
| 2 | Blaxel | 92.27 | 89.11 – 93.47 | 12 | tied |
| 4 | Novita | 101.4 | 97.74 – 106.4 | 12 | — |
| 5 | Microsandbox Cloud | 115 | 111.2 – 119.9 | 12 | — |
| 5 | Modal (VM) | 115.6 | 101 – 117.1 | 12 | tied |
| 7 | E2B | 153.3 | 152.2 – 158.4 | 12 | — |
| 8 | Modal (gVisor) | 197.8 | 190.9 – 200.7 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.21 | 10.74 – 12.07 | 12 | — |
| 2 | Daytona (VM) | 12.61 | 12.43 – 12.86 | 12 | — |
| 3 | Novita | 14.84 | 14.29 – 16.91 | 12 | — |
| 3 | Namespace | 17.37 | 12.26 – 17.99 | 12 | tied |
| 3 | Modal (VM) | 17.58 | 14.72 – 18.37 | 12 | tied |
| 3 | Vercel Sandbox | 17.82 | 17.61 – 19.07 | 12 | tied |
| 3 | Microsandbox Cloud | 19.21 | 18.07 – 20.94 | 12 | tied |
| 3 | E2B | 20.32 | 19.39 – 21.81 | 12 | tied |
| 9 | Modal (gVisor) | 28.03 | 26.97 – 29.27 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.393 | 2.307 – 2.46 | 12 | — |
| 2 | Daytona (VM) | 3.203 | 2.935 – 5.424 | 12 | — |
| 2 | Modal (VM) | 3.505 | 3.066 – 3.835 | 12 | tied |
| 4 | Vercel Sandbox | 3.699 | 3.594 – 4.343 | 12 | — |
| 5 | E2B | 4.522 | 4.353 – 7.659 | 12 | — |
| 5 | Microsandbox Cloud | 5.125 | 4.212 – 18.85 | 12 | tied |
| 5 | Novita | 6.812 | 4.548 – 9.781 | 12 | tied |
| 5 | Namespace | 8.508 | 5.34 – 11 | 12 | tied |
| 5 | Modal (gVisor) | 9.193 | 8.845 – 9.704 | 12 | tied |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 52.11 | 51.72 – 52.66 | 12 | — |
| 2 | Daytona (VM) | 60.87 | 59.94 – 61.99 | 12 | — |
| 2 | Blaxel | 62.53 | 60.79 – 63.78 | 12 | tied |
| 4 | Novita | 68.49 | 65.67 – 81.09 | 12 | — |
| 4 | Modal (VM) | 74.37 | 59.58 – 87.55 | 12 | tied |
| 6 | Microsandbox Cloud | 90.76 | 86.83 – 100.8 | 12 | — |
| 6 | Vercel Sandbox | 97.36 | 94.04 – 102.8 | 12 | tied |
| 8 | E2B | 107.9 | 102.7 – 111.8 | 12 | — |
| 9 | Modal (gVisor) | 163.2 | 137.6 – 185.7 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 80.49 | 80.05 – 81.39 | 12 | — |
| 2 | Daytona (VM) | 92.71 | 90.32 – 97.27 | 12 | — |
| 3 | Modal (VM) | 117 | 100.2 – 124.7 | 12 | — |
| 3 | Novita | 127.4 | 113.4 – 146.1 | 12 | tied |
| 3 | Microsandbox Cloud | 130 | 126.2 – 136.5 | 12 | tied |
| 6 | Vercel Sandbox | 147.7 | 145.9 – 152.2 | 12 | — |
| 7 | E2B | 179.4 | 176.2 – 184.8 | 12 | — |
| 8 | Modal (gVisor) | 266.9 | 251.3 – 293.4 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 13.96 | 13.74 – 14.26 | 12 | — |
| 2 | Daytona (VM) | 17.08 | 16.32 – 17.67 | 12 | — |
| 2 | Blaxel | 17.61 | 16.97 – 18.23 | 12 | tied |
| 4 | Modal (VM) | 21.33 | 17.8 – 24.06 | 12 | — |
| 5 | Microsandbox Cloud | 23.92 | 22.83 – 25.17 | 12 | — |
| 5 | Novita | 24.77 | 20.66 – 28.37 | 12 | tied |
| 5 | Vercel Sandbox | 26.9 | 25.74 – 27.79 | 12 | tied |
| 8 | E2B | 34.65 | 33.91 – 36.82 | 12 | — |
| 9 | Modal (gVisor) | 56.15 | 36.33 – 74.3 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 28.14 | 27.86 – 28.66 | 9 | — |
| 2 | Daytona (VM) | 20.59 | 18.61 – 21.73 | 23 | n too small |
| 3 | Blaxel | 20.07 | 19.59 – 20.92 | 35 | n too small |
| 4 | Novita | 19.63 | 15.94 – 19.92 | 24 | n too small |
| 5 | Microsandbox Cloud | 16.95 | 16.48 – 17.58 | 43 | n too small |
| 6 | Modal (VM) | 14.82 | 13.49 – 14.99 | 10 | n too small |
| 7 | Vercel Sandbox | 13.63 | 13.46 – 13.82 | 9 | n too small |
| 8 | E2B | 11.67 | 11.28 – 11.89 | 9 | n too small |
| 9 | Modal (gVisor) | 9.42 | 9.11 – 9.72 | 21 | n too small |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.3× Namespace on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 328000 | 266000 – 358000 | 6 | — |
| 2 | Namespace | 255000 | 232000 – 272000 | 6 | n too small |
| 3 | Daytona (VM) | 244000 | 221000 – 343000 | 6 | n too small |
| 4 | Vercel Sandbox | 235500 | 127500 – 239000 | 6 | n too small |
| 5 | Modal (VM) | 235000 | 169000 – 291000 | 6 | n too small |
| 6 | Blaxel | 222000 | 219000 – 261000 | 6 | n too small |
| 7 | Novita | 86350 | 55500 – 140000 | 6 | n too small |
| 8 | E2B | 46550 | 45300 – 48300 | 6 | n too small |
| 9 | Modal (gVisor) | 32250 | 31100 – 35200 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.3× Namespace on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1280 | 1040 – 1360 | 6 | — |
| 2 | Namespace | 996 | 906 – 1062 | 6 | n too small |
| 3 | Daytona (VM) | 953.5 | 863 – 1340 | 6 | n too small |
| 4 | Vercel Sandbox | 919 | 477 – 935 | 6 | n too small |
| 5 | Modal (VM) | 918 | 476 – 1137 | 6 | n too small |
| 6 | Blaxel | 867 | 853 – 1020 | 6 | n too small |
| 7 | Novita | 338 | 217 – 548 | 6 | n too small |
| 8 | E2B | 182 | 177 – 189 | 6 | n too small |
| 9 | Modal (gVisor) | 126 | 121 – 138 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 314000 | 187000 – 345000 | 6 | — |
| 2 | Vercel Sandbox | 261000 | 155000 – 289000 | 6 | n too small |
| 3 | Namespace | 243500 | 231000 – 267000 | 6 | n too small |
| 4 | Blaxel | 227000 | 211500 – 266000 | 6 | n too small |
| 5 | Daytona (VM) | 224500 | 204000 – 245000 | 6 | n too small |
| 6 | Modal (VM) | 208500 | 190000 – 286000 | 6 | n too small |
| 7 | Novita | 99350 | 70100 – 158000 | 6 | n too small |
| 8 | E2B | 48600 | 47400 – 48900 | 6 | n too small |
| 9 | Modal (gVisor) | 27400 | 25000 – 28300 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1227 | 732 – 1347 | 6 | — |
| 2 | Vercel Sandbox | 1021 | 606 – 1130 | 6 | n too small |
| 3 | Namespace | 951.5 | 920.5 – 1029 | 6 | n too small |
| 4 | Blaxel | 887 | 824 – 1116 | 6 | n too small |
| 5 | Daytona (VM) | 876.5 | 797 – 959 | 6 | n too small |
| 6 | Modal (VM) | 814 | 744 – 1072 | 6 | n too small |
| 7 | Novita | 387 | 288 – 616 | 6 | n too small |
| 8 | E2B | 190 | 185 – 191 | 6 | n too small |
| 9 | Modal (gVisor) | 107.5 | 97.7 – 110 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.0× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 21700 | 17600 – 22900 | 6 | — |
| 2 | Daytona (VM) | 10950 | 8864 – 14500 | 6 | n too small |
| 3 | Novita | 8437 | 6790 – 10160 | 6 | n too small |
| 4 | Blaxel | 8289 | 7151 – 10400 | 6 | n too small |
| 5 | Microsandbox Cloud | 6708 | 4262 – 7733 | 6 | n too small |
| 6 | Vercel Sandbox | 4916 | 3537 – 5663 | 6 | n too small |
| 7 | Namespace | 4033 | 4007 – 4059 | 6 | n too small |
| 8 | Modal (VM) | 1743 | 1680 – 2090 | 6 | n too small |
| 9 | E2B | 600 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 8866 | 8101 – 9630 | 2 | — |
| 2 | Blaxel | 8191 | 7153 – 9573 | 5 | n too small |
| 3 | Novita | 8033 | 5672 – 9587 | 5 | n too small |
| 4 | Microsandbox Cloud | 6709 | 4263 – 7734 | 6 | n too small |
| 5 | Vercel Sandbox | 4918 | 3539 – 5664 | 6 | n too small |
| 6 | Namespace | 4035 | 4019 – 4060 | 6 | n too small |
| 7 | Modal (VM) | 1745 | 1682 – 2091 | 6 | n too small |
| 8 | E2B | 601 | 601 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5835 | 5584 – 6362 | 6 | — |
| 2 | Microsandbox Cloud | 5736 | 3644 – 5930 | 6 | n too small |
| 3 | Daytona (VM) | 4523 | 3008 – 6031 | 6 | n too small |
| 4 | Novita | 4146 | 3702 – 6910 | 6 | n too small |
| 5 | Vercel Sandbox | 3693 | 2616 – 5314 | 6 | n too small |
| 6 | Modal (gVisor) | 3090 | 2233 – 4384 | 6 | n too small |
| 7 | Modal (VM) | 2865 | 2076 – 5247 | 6 | n too small |
| 8 | Namespace | 2798 | 2586 – 2829 | 6 | n too small |
| 9 | E2B | 599 | 598 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5837 | 5632 – 6364 | 6 | — |
| 2 | Microsandbox Cloud | 5738 | 3646 – 5932 | 6 | n too small |
| 3 | Daytona (VM) | 4524 | 3009 – 5792 | 6 | n too small |
| 4 | Novita | 4147 | 3704 – 5766 | 6 | n too small |
| 5 | Vercel Sandbox | 3695 | 2617 – 5315 | 6 | n too small |
| 6 | Modal (gVisor) | 3091 | 2235 – 4386 | 6 | n too small |
| 7 | Modal (VM) | 2866 | 2077 – 5249 | 6 | n too small |
| 8 | Namespace | 2800 | 2587 – 2833 | 6 | n too small |
| 9 | E2B | 601 | 600 – 601 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.89 | 23.13 – 26.36 | 6 | — |
| 2 | Blaxel | 19.83 | 19.02 – 20.19 | 6 | n too small |
| 3 | Vercel Sandbox | 10.78 | 8.1 – 10.92 | 6 | n too small |
| 4 | Microsandbox Cloud | 9.66 | 9.29 – 9.76 | 6 | n too small |
| 5 | Novita | 9.295 | 8.97 – 11.3 | 6 | n too small |
| 6 | Modal (VM) | 8.085 | 8.03 – 15.55 | 6 | n too small |
| 7 | Namespace | 5.22 | 5.16 – 5.39 | 6 | n too small |
| 8 | Modal (gVisor) | 3.17 | 2.92 – 3.36 | 6 | n too small |
| 9 | E2B | 1.43 | 1.365 – 1.43 | 6 | n too small |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 181500 | 78650 – 184100 | 15 | — |
| 2 | Blaxel | 111200 | 109500 – 116400 | 15 | n too small |
| 3 | Modal (VM) | 95913 | 55314 – 131100 | 15 | n too small |
| 4 | Modal (gVisor) | 70280 | 63720 – 73750 | 15 | n too small |
| 5 | Microsandbox Cloud | 57050 | 55920 – 58160 | 15 | n too small |
| 6 | Novita | 55180 | 53350 – 81555 | 15 | n too small |
| 7 | Vercel Sandbox | 54030 | 53360 – 54270 | 15 | n too small |
| 8 | E2B | 49595 | 44670 – 52349 | 15 | n too small |
| 9 | Namespace | 33690 | 33620 – 33750 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 180100 | 77970 – 183300 | 15 | — |
| 2 | Blaxel | 115800 | 107745 – 121400 | 15 | n too small |
| 3 | Modal (VM) | 95030 | 54970 – 127500 | 15 | n too small |
| 4 | Modal (gVisor) | 69530 | 61280 – 73360 | 15 | n too small |
| 5 | Microsandbox Cloud | 57090 | 55510 – 58250 | 15 | n too small |
| 6 | Novita | 55590 | 53350 – 83370 | 15 | n too small |
| 7 | Vercel Sandbox | 53840 | 53360 – 54100 | 15 | n too small |
| 8 | E2B | 50170 | 44940 – 52190 | 15 | n too small |
| 9 | Namespace | 33650 | 33570 – 33690 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 132700 | 126400 – 134000 | 35 | — |
| 2 | Daytona (VM) | 111245 | 90920 – 213700 | 38 | n too small |
| 3 | Modal (gVisor) | 92400 | 89990 – 94580 | 50 | n too small |
| 4 | Modal (VM) | 89340 | 87590 – 116500 | 35 | n too small |
| 5 | Vercel Sandbox | 83690 | 82293 – 85670 | 15 | n too small |
| 6 | Microsandbox Cloud | 82430 | 81755 – 83140 | 51 | n too small |
| 7 | E2B | 76630 | 73480 – 78110 | 75 | n too small |
| 8 | Novita | 63160 | 57320 – 69070 | 50 | n too small |
| 9 | Namespace | 44760 | 44210 – 44980 | 15 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 172700 | 70180 – 175600 | 15 | — |
| 2 | Blaxel | 105400 | 97870 – 119000 | 15 | n too small |
| 3 | Modal (VM) | 90870 | 47690 – 134000 | 15 | n too small |
| 4 | Modal (gVisor) | 58440 | 54130 – 66690 | 15 | n too small |
| 5 | Novita | 55140 | 50600 – 70860 | 15 | n too small |
| 6 | Microsandbox Cloud | 47370 | 45870 – 48450 | 15 | n too small |
| 7 | Vercel Sandbox | 46440 | 46230 – 47460 | 15 | n too small |
| 8 | E2B | 44580 | 36560 – 45080 | 15 | n too small |
| 9 | Namespace | 30650 | 30600 – 30680 | 15 | n too small |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Blaxel leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 121900 | 95330 – 140354 | 6 | — |
| 2 | Daytona (VM) | 75710 | 62290 – 84070 | 6 | n too small |
| 3 | Vercel Sandbox | 75290 | 72620 – 77144 | 6 | n too small |
| 4 | Namespace | 71830 | 54491 – 72681 | 6 | n too small |
| 5 | Microsandbox Cloud | 59080 | 35361 – 68551 | 6 | n too small |
| 6 | E2B | 58370 | 46160 – 64790 | 6 | n too small |
| 7 | Novita | 47640 | 47217 – 141115 | 6 | n too small |
| 8 | Modal (VM) | 14630 | 13888 – 74647 | 6 | n too small |
| 9 | Modal (gVisor) | 13911 | 10923 – 37478 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads · ~1.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 117600 | 89797 – 192369 | 6 | — |
| 2 | Daytona (VM) | 72440 | 54615 – 104186 | 6 | n too small |
| 3 | Vercel Sandbox | 71480 | 67896 – 73613 | 6 | n too small |
| 4 | Namespace | 65624 | 31816 – 69056 | 6 | n too small |
| 5 | Novita | 60045 | 56817 – 155604 | 6 | n too small |
| 6 | Microsandbox Cloud | 51978 | 31080 – 72920 | 6 | n too small |
| 7 | E2B | 43350 | 40944 – 51679 | 6 | n too small |
| 8 | Modal (VM) | 14810 | 13732 – 77019 | 6 | n too small |
| 9 | Modal (gVisor) | 12850 | 8260 – 34002 | 6 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 6 | — |
| 2 | Blaxel | 9999 | 9999 – 9999 | 6 | n too small |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 2 | Namespace | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 9 | Modal (gVisor) | 167 | 164 – 548 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 5566 | 2462 – 5922 | 6 | — |
| 2 | Modal (gVisor) | 5397 | 965.6 – 8260 | 6 | n too small |
| 3 | Daytona (VM) | 5020 | 3219 – 11920 | 6 | n too small |
| 4 | Namespace | 4813 | 3691 – 19570 | 6 | n too small |
| 5 | Novita | 4120 | 27.95 – 4873 | 6 | n too small |
| 6 | E2B | 3162 | 401.6 – 3888 | 6 | n too small |
| 7 | Blaxel | 2286 | 1378 – 2762 | 6 | n too small |
| 8 | Modal (VM) | 974 | 619.7 – 1473 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Daytona (VM) leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4264 | 2040 – 4631 | 6 | — |
| 2 | Modal (VM) | 3515 | 1403 – 9301 | 6 | n too small |
| 3 | E2B | 3309 | 2689 – 3366 | 6 | n too small |
| 4 | Novita | 2580 | 1103 – 4423 | 6 | n too small |
| 5 | Namespace | 2475 | 1525 – 4280 | 6 | n too small |
| 6 | Microsandbox Cloud | 1899 | 1232 – 2373 | 6 | n too small |
| 7 | Blaxel | 1887 | 1483 – 2290 | 6 | n too small |
| 8 | Modal (gVisor) | 196.1 | 126.1 – 1147 | 6 | n too small |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 361.5 | 360 – 366 | 6 | — |
| 2 | Daytona (VM) | 440.5 | 407 – 442 | 6 | n too small |
| 3 | Novita | 483 | 481 – 673 | 6 | n too small |
| 4 | Blaxel | 485 | 484 – 495 | 6 | n too small |
| 5 | Microsandbox Cloud | 507.5 | 505 – 513 | 6 | n too small |
| 6 | Modal (VM) | 672 | 444 – 819 | 6 | n too small |
| 7 | Vercel Sandbox | 766.5 | 760 – 1181 | 6 | n too small |
| 8 | E2B | 809 | 807 – 826 | 6 | n too small |
| 9 | Modal (gVisor) | 896 | 894 – 908 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.77 | 31.53 – 32.13 | 6 | — |
| 2 | Daytona (VM) | 39.23 | 37.14 – 40.46 | 6 | n too small |
| 3 | Blaxel | 43.73 | 42.17 – 44.42 | 6 | n too small |
| 4 | Novita | 43.98 | 43.81 – 50.81 | 6 | n too small |
| 5 | Modal (VM) | 47.32 | 38.59 – 62.61 | 6 | n too small |
| 6 | Microsandbox Cloud | 53.47 | 50.77 – 56.26 | 6 | n too small |
| 7 | Vercel Sandbox | 60.71 | 59.88 – 81.91 | 6 | n too small |
| 8 | E2B | 64.37 | 63.84 – 66.62 | 6 | n too small |
| 9 | Modal (gVisor) | 85.8 | 83.57 – 87.56 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 338100 | 316500 – 344000 | 6 | — |
| 2 | Daytona (VM) | 288800 | 279300 – 298700 | 4 | n too small |
| 3 | Namespace | 253000 | 244700 – 377600 | 6 | n too small |
| 4 | Novita | 231300 | 189800 – 255800 | 6 | n too small |
| 5 | Microsandbox Cloud | 229100 | 171800 – 235600 | 6 | n too small |
| 6 | Modal (VM) | 203400 | 198100 – 206300 | 6 | n too small |
| 7 | E2B | 176600 | 169600 – 179200 | 6 | n too small |
| 8 | Vercel Sandbox | 172200 | 168700 – 174200 | 6 | n too small |
| 9 | Modal (gVisor) | 10930 | 10770 – 11190 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.148 | 0.145 – 0.158 | 6 | — |
| 2 | Daytona (VM) | 0.1735 | 0.167 – 0.179 | 4 | n too small |
| 3 | Namespace | 0.1975 | 0.132 – 0.205 | 6 | n too small |
| 4 | Novita | 0.216 | 0.196 – 0.263 | 6 | n too small |
| 5 | Microsandbox Cloud | 0.218 | 0.212 – 0.291 | 6 | n too small |
| 6 | Modal (VM) | 0.246 | 0.242 – 0.252 | 6 | n too small |
| 7 | E2B | 0.283 | 0.279 – 0.295 | 6 | n too small |
| 8 | Vercel Sandbox | 0.2905 | 0.287 – 0.296 | 6 | n too small |
| 9 | Modal (gVisor) | 4.575 | 4.47 – 4.645 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 27980 | 26430 – 39660 | 6 | — |
| 2 | Blaxel | 25200 | 22950 – 27030 | 6 | n too small |
| 3 | Novita | 20020 | 14930 – 23830 | 6 | n too small |
| 4 | Microsandbox Cloud | 17600 | 16990 – 18000 | 6 | n too small |
| 5 | Modal (VM) | 17560 | 13920 – 18340 | 6 | n too small |
| 6 | Vercel Sandbox | 17180 | 16660 – 17650 | 6 | n too small |
| 7 | Daytona (VM) | 15690 | 15500 – 16170 | 4 | n too small |
| 8 | E2B | 11280 | 10610 – 12080 | 6 | n too small |
| 9 | Modal (gVisor) | 1868 | 1798 – 1936 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.788 | 1.254 – 1.892 | 6 | — |
| 2 | Blaxel | 1.984 | 1.85 – 2.2 | 6 | n too small |
| 3 | Novita | 2.498 | 2.105 – 3.35 | 6 | n too small |
| 4 | Microsandbox Cloud | 2.841 | 2.778 – 2.943 | 6 | n too small |
| 5 | Modal (VM) | 2.848 | 2.714 – 3.592 | 6 | n too small |
| 6 | Vercel Sandbox | 2.91 | 2.833 – 3.001 | 6 | n too small |
| 7 | Daytona (VM) | 3.186 | 3.092 – 3.225 | 4 | n too small |
| 8 | E2B | 4.434 | 4.141 – 4.711 | 6 | n too small |
| 9 | Modal (gVisor) | 26.77 | 25.83 – 27.8 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 34.56 | 32.56 – 35.96 | 6 | — |
| 2 | Blaxel | 38.97 | 38.32 – 40.44 | 6 | n too small |
| 3 | Novita | 41.21 | 39.8 – 56.93 | 6 | n too small |
| 4 | Namespace | 48.45 | 47.96 – 48.94 | 6 | n too small |
| 5 | Microsandbox Cloud | 53.08 | 51.93 – 56.79 | 6 | n too small |
| 6 | Modal (VM) | 60.65 | 32.39 – 62.24 | 6 | n too small |
| 7 | Vercel Sandbox | 66.81 | 64.42 – 86.63 | 6 | n too small |
| 8 | E2B | 68.82 | 68.1 – 70.32 | 6 | n too small |
| 9 | Modal (gVisor) | 424.7 | 367.6 – 461 | 6 | n too small |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 0.2333 | — | 1 | — |
| 2 | Daytona (VM) | 0.2502 | — | 1 | — |
| 3 | E2B | 0.3312 | — | 1 | — |
| 4 | Modal (gVisor) | 0.7612 | — | 1 | — |
| 4 | Modal (VM) | 0.7612 | — | 1 | equal values |

## Coverage gaps

25 uncovered results across 9 providers (Blaxel 2, Daytona (VM) 5, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 3, Modal (VM) 2, Namespace 2, Novita 2, Vercel Sandbox 5). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Vercel Sandbox | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 27.3 GiB free, suite needs 30 GiB |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Daytona (VM) | pgbench | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-download: pts_iperf-wan-download did not produce 1 numeric metric value(s) |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-upload: PTS batch-run of local/iperf-wan-1.0.0 completed but every trial errored (composite carries no values) |
| Vercel Sandbox | network | **failed** | Step "mise run benchmark:network:suite" failed with exit code 1 |
| Vercel Sandbox | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

</details>

<details>
<summary>How rankings are decided</summary>

The value is the median (p50) of the retained per-trial Samples, not the mean — a single stalled
pass drags a mean far more than it moves a median. The 95% interval is a percentile bootstrap of
that median (10,000 resamples, seeded from the Run id so the table is reproducible byte-for-byte).
It is a descriptive interval conditional on the retained trials, **not a calibrated frequentist
confidence interval**: n is small and within-sandbox trials may be dependent on host scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is
reported separately for distribution *shape* and does not drive the ranking.

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`tied` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only note that claims two providers are
statistically indistinguishable.
`equal medians` / `equal values` — arithmetic, not a finding: the ranking sorts on the value,
and two identical values have no order between them. It says nothing about the distributions.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

`n too small` is the extreme of that: Mann-Whitney's best attainable p already exceeds α for those
Samples, so the test could not have separated the rows at any effect size (here 10 v 9 floors at p ≈ <0.001; 15 v 15 floors at p ≈ <0.001; 15 v 51 floors at p ≈ <0.001; 2 v 5 floors at p ≈ 0.095; 23 v 35 floors at p ≈ <0.001; 24 v 43 floors at p ≈ <0.001; 35 v 15 floors at p ≈ <0.001; 35 v 24 floors at p ≈ <0.001; 35 v 38 floors at p ≈ <0.001; 38 v 50 floors at p ≈ <0.001; 4 v 6 floors at p ≈ 0.0095; 43 v 10 floors at p ≈ <0.001; 5 v 5 floors at p ≈ 0.0079; 5 v 6 floors at p ≈ 0.0043; 50 v 15 floors at p ≈ <0.001; 50 v 35 floors at p ≈ <0.001; 51 v 75 floors at p ≈ <0.001; 6 v 4 floors at p ≈ 0.0095; 6 v 6 floors at p ≈ 0.0022; 75 v 50 floors at p ≈ <0.001; 9 v 21 floors at p ≈ <0.001; 9 v 23 floors at p ≈ <0.001; 9 v 9 floors at p ≈ <0.001).
Such rows are ranked on their observed medians and are **not** claimed to be tied — read the gap
between the values, and treat the p-value as unable to settle them either way. Where such a row
nevertheless shares the rank above it, the note reads `equal medians`: the two values are simply
identical, which is the ranking having nothing to order them by — never a finding that the
providers are alike.

### Pairwise tests (vs. row above)

`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution
*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).
These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate
correction is applied across providers or metrics.

| Dimension | Metric | Provider | p vs. above | p (KS) |
| --- | --- | --- | ---: | ---: |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Daytona (VM) | 0.079 (tied) | 0.11 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Namespace | 0.14 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (VM) | 0.55 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: cold install | E2B | 0.16 (tied) | 0.066 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.052 (tied) | 0.019 |
| realworld | Better-Auth: build | Modal (VM) | 0.89 (tied) | 0.19 |
| realworld | Better-Auth: build | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: build | E2B | 0.078 (tied) | 0.019 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.052 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.0018 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: cold install | E2B | 0.045 | 0.019 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.0056 | 0.066 |
| realworld | Better-Auth: cold install | Namespace | 0.0014 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | 0.98 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Namespace | 0.24 (tied) | 0.066 |
| realworld | Better-Auth: git clone | E2B | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.97 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.0018 | 0.0046 |
| realworld | Better-Auth: git clone | Novita | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.028 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Namespace | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.0018 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.0023 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.020 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.0045 | <0.001 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0036 | <0.001 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.38 (tied) | 0.066 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Blaxel | 0.017 | 0.0046 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.039 | 0.019 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.0023 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.80 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Namespace | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: lint types | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.63 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | 0.014 | 0.066 |
| realworld | Better-Auth: typecheck | Novita | 0.0056 | 0.019 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.0029 | <0.001 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.48 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 0.0029 | <0.001 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.024 | 0.019 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | <0.001 | 0.0017 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.20 (tied) | 0.019 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.017 | 0.019 |
| realworld | Mastra: build:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (VM) | 0.0027 | <0.001 |
| realworld | Mastra: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: git clone | Novita | 0.078 (tied) | 0.19 |
| realworld | Mastra: git clone | E2B | 0.38 (tied) | 0.19 |
| realworld | Mastra: git clone | Namespace | 0.48 (tied) | 0.19 |
| realworld | Mastra: git clone | Daytona (VM) | 0.83 (tied) | 0.65 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.016 | 0.0019 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.19 (tied) | 0.12 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.0014 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 0.93 (tied) | 0.79 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | 0.98 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.48 (tied) | 0.79 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: cold install | E2B | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.80 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.033 | 0.019 |
| realworld | OpenClaw: git clone | E2B | 0.0029 | <0.001 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.71 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Novita | 0.76 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Namespace | 0.22 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.59 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Namespace | — | — |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Blaxel | 0.22 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | Novita | <0.001 | 0.0046 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.89 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.0036 | 0.0046 |
| realworld | OpenClaw: lint (extension channels) | Vercel Sandbox | 0.13 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | E2B | 0.017 | 0.019 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | <0.001 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.16 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.38 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.16 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.012 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.017 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.76 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.24 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.017 | 0.0046 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | Daytona (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Blaxel | 0.21 (n too small) | 0.30 |
| cpu | Node.js web tooling | Novita | 0.0078 (n too small) | 0.089 |
| cpu | Node.js web tooling | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.12 (n too small) | 0.038 |
| cpu | Node.js web tooling | E2B | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.0087 (n too small) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.59 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.071 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.79 (n too small) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.0087 (n too small) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.59 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.065 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.94 (n too small) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.13 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.59 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.31 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.94 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.67 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.13 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.59 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.31 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.94 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.039 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.94 (n too small) | 1.0 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.026 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.065 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.57 (n too small) | 0.71 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 1.0 (n too small) | 1.0 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.052 (n too small) | 0.026 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.065 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.39 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.31 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 1.0 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.31 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.94 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 1.0 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.31 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 1.0 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.31 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.94 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 1.0 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.37 (n too small) | 0.077 |
| disk | Hardlink throughput | Novita | 0.50 (n too small) | 0.32 |
| disk | Hardlink throughput | Modal (VM) | 0.37 (n too small) | 0.077 |
| disk | Hardlink throughput | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.037 (n too small) | 0.0011 |
| memory | STREAM Triad | Modal (VM) | 0.13 (n too small) | 0.0011 |
| memory | STREAM Triad | Modal (gVisor) | 0.089 (n too small) | 0.0011 |
| memory | STREAM Triad | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Novita | 0.65 (n too small) | 0.14 |
| memory | STREAM Triad | Vercel Sandbox | 0.35 (n too small) | 0.051 |
| memory | STREAM Triad | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.041 (n too small) | 0.0011 |
| memory | STREAM Add | Modal (VM) | 0.13 (n too small) | 0.0011 |
| memory | STREAM Add | Modal (gVisor) | 0.11 (n too small) | 0.0011 |
| memory | STREAM Add | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Novita | 0.74 (n too small) | 0.14 |
| memory | STREAM Add | Vercel Sandbox | 0.29 (n too small) | 0.017 |
| memory | STREAM Add | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona (VM) | 0.049 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.36 (n too small) | 0.026 |
| memory | STREAM Copy | Vercel Sandbox | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.019 (n too small) | 0.11 |
| memory | STREAM Copy | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Novita | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.041 (n too small) | 0.0011 |
| memory | STREAM Scale | Modal (VM) | 0.13 (n too small) | 0.0011 |
| memory | STREAM Scale | Modal (gVisor) | 0.12 (n too small) | 0.0011 |
| memory | STREAM Scale | Novita | 0.54 (n too small) | 0.31 |
| memory | STREAM Scale | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Vercel Sandbox | 0.15 (n too small) | 0.051 |
| memory | STREAM Scale | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Namespace | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | — | — |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.94 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.026 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.94 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Novita | 0.82 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.13 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 1.0 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.015 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.82 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.13 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.48 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.13 (n too small) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.18 (n too small) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Microsandbox Cloud | — | — |
| network | iperf3 WAN download | Modal (gVisor) | 0.94 (n too small) | 0.32 |
| network | iperf3 WAN download | Daytona (VM) | 1.0 (n too small) | 0.81 |
| network | iperf3 WAN download | Namespace | 0.94 (n too small) | 1.0 |
| network | iperf3 WAN download | Novita | 0.18 (n too small) | 0.32 |
| network | iperf3 WAN download | E2B | 0.48 (n too small) | 0.32 |
| network | iperf3 WAN download | Blaxel | 0.065 (n too small) | 0.012 |
| network | iperf3 WAN download | Modal (VM) | 0.0087 (n too small) | 0.012 |
| network | iperf3 WAN upload | Daytona (VM) | — | — |
| network | iperf3 WAN upload | Modal (VM) | 0.70 (n too small) | 0.81 |
| network | iperf3 WAN upload | E2B | 0.70 (n too small) | 0.32 |
| network | iperf3 WAN upload | Novita | 0.48 (n too small) | 0.32 |
| network | iperf3 WAN upload | Namespace | 0.94 (n too small) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.13 (n too small) | 0.077 |
| network | iperf3 WAN upload | Blaxel | 0.94 (n too small) | 0.81 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Blaxel | 0.45 (n too small) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Modal (VM) | 0.36 (n too small) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.12 (n too small) | 0.077 |
| system | PyBench | E2B | 0.37 (n too small) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Novita | 0.31 (n too small) | 0.32 |
| system | Git common operations | Modal (VM) | 0.82 (n too small) | 0.81 |
| system | Git common operations | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | E2B | 0.39 (n too small) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.0095 (n too small) | 0.0047 |
| system | pgbench RO (s100, 50c) | Namespace | 0.48 (n too small) | 0.14 |
| system | pgbench RO (s100, 50c) | Novita | 0.065 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.48 (n too small) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.065 (n too small) | 0.012 |
| system | pgbench RO (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.093 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.0095 (n too small) | 0.0047 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.43 (n too small) | 0.14 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.065 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.58 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.078 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.10 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.0043 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Novita | 0.015 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (n too small) | 0.81 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.59 (n too small) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.0095 (n too small) | 0.0047 |
| system | pgbench RW (s100, 50c) | E2B | 0.0095 (n too small) | 0.0047 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.0043 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.015 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.97 (n too small) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.59 (n too small) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.0095 (n too small) | 0.0047 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.0095 (n too small) | 0.0047 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.015 (n too small) | 0.012 |
| system | SQLite Speedtest | Namespace | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | Vercel Sandbox | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | E2B | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

