# Sandbox provider leaderboard

Run [`30730328892`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30730328892) · commit [`5e49ab4d44aa75cacc93d4954890ec38fd6c56da`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/5e49ab4d44aa75cacc93d4954890ec38fd6c56da) ·
dataset [`data/dataset/runs/30730328892.json`](data/dataset/runs/30730328892.json) · generated 2026-08-02T04:02:22.316Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **402 metric records**
backed by **4047 retained trial observations**, across **46 metrics** and
**9 providers**; every emitted, catalogued metric has a ranked table below
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

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 36.79 | 35.69 – 37.73 | 12 | 12 | — |
| 1 | Daytona (VM) | 39.27 | 36.45 – 40.87 | 11 | 11 | tied |
| 3 | Novita | 43.94 | 41.99 – 46.02 | 12 | 12 | — |
| 3 | Namespace | 47.79 | 43.63 – 54.73 | 12 | 12 | tied |
| 3 | Modal (VM) | 49.97 | 43.91 – 53.69 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 61.09 | 55.25 – 68.22 | 12 | 12 | — |
| 6 | E2B | 63.84 | 63.1 – 69.36 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 95.57 | 92.24 – 102 | 12 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 46.5 | 46.31 – 47.29 | 12 | 12 | — |
| 2 | Daytona (VM) | 55.73 | 55.01 – 57.57 | 12 | 12 | — |
| 3 | Blaxel | 60.74 | 58.94 – 62.67 | 12 | 12 | — |
| 4 | Novita | 69.42 | 68.5 – 79.05 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 78.83 | 76.14 – 79.64 | 12 | 12 | tied |
| 4 | Modal (VM) | 80.44 | 68.88 – 86.32 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 92.01 | 89.56 – 96.94 | 12 | 12 | — |
| 7 | E2B | 95.26 | 94.52 – 97.49 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 142 | 136.9 – 145.6 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.54 | 11.37 – 11.9 | 12 | 12 | — |
| 1 | Daytona (VM) | 12.03 | 11.62 – 12.42 | 12 | 12 | tied |
| 3 | Novita | 14.3 | 13.69 – 15.27 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 18.09 | 17.61 – 19.34 | 12 | 12 | — |
| 4 | Modal (VM) | 18.48 | 18.15 – 19.51 | 12 | 12 | tied |
| 6 | E2B | 19.19 | 18.92 – 19.92 | 12 | 12 | — |
| 7 | Vercel Sandbox | 20.77 | 19.6 – 22.57 | 12 | 12 | — |
| 8 | Namespace | 25.24 | 24.7 – 26.27 | 12 | 12 | — |
| 9 | Modal (gVisor) | 36.36 | 34.35 – 38.01 | 12 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Vercel Sandbox is ~1.6× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.5495 | 0.539 – 0.602 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.8795 | 0.7945 – 0.9185 | 12 | 12 | — |
| 2 | Modal (VM) | 0.9025 | 0.74 – 1.466 | 12 | 12 | tied |
| 2 | Namespace | 1.177 | 1.146 – 1.706 | 12 | 12 | tied |
| 2 | E2B | 1.344 | 1.272 – 1.398 | 12 | 12 | tied |
| 2 | Daytona (VM) | 1.351 | 1.233 – 1.607 | 12 | 12 | tied |
| 7 | Microsandbox Cloud | 1.868 | 1.603 – 12.59 | 12 | 12 | — |
| 7 | Novita | 1.882 | 1.8 – 2.017 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 2.442 | 2.329 – 2.533 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.696 | 2.679 – 2.728 | 12 | 12 | — |
| 2 | Daytona (VM) | 3.105 | 3.046 – 3.132 | 12 | 12 | — |
| 3 | Blaxel | 3.234 | 3.181 – 3.263 | 12 | 12 | — |
| 4 | Novita | 3.583 | 3.482 – 3.802 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 4.168 | 4.107 – 4.239 | 12 | 12 | — |
| 6 | Vercel Sandbox | 4.282 | 4.264 – 4.602 | 12 | 12 | — |
| 6 | Modal (VM) | 4.29 | 3.994 – 4.731 | 12 | 12 | tied |
| 8 | E2B | 5.144 | 5.047 – 5.216 | 12 | 12 | — |
| 9 | Modal (gVisor) | 10.87 | 10.7 – 11.55 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 8.069 | 8.037 – 8.101 | 12 | 12 | — |
| 2 | Blaxel | 9.953 | 9.769 – 10.17 | 12 | 12 | — |
| 2 | Daytona (VM) | 10.42 | 9.926 – 10.53 | 12 | 12 | tied |
| 4 | Novita | 11.96 | 11.61 – 12.48 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 12.64 | 12.4 – 12.73 | 12 | 12 | — |
| 6 | Modal (VM) | 14.01 | 13.35 – 15.45 | 12 | 12 | — |
| 6 | Vercel Sandbox | 15.16 | 14.89 – 15.68 | 12 | 12 | tied |
| 8 | E2B | 18.42 | 18.32 – 18.63 | 12 | 12 | — |
| 9 | Modal (gVisor) | 30.05 | 28.72 – 30.79 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.221 | 2.175 – 2.252 | 12 | 12 | — |
| 2 | Blaxel | 2.842 | 2.72 – 2.982 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.944 | 2.877 – 2.964 | 12 | 12 | tied |
| 4 | Novita | 3.223 | 3.16 – 3.3 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 3.542 | 3.444 – 3.576 | 12 | 12 | — |
| 6 | Modal (VM) | 4.25 | 3.753 – 4.748 | 12 | 12 | — |
| 6 | Vercel Sandbox | 4.54 | 4.391 – 4.71 | 12 | 12 | tied |
| 8 | E2B | 5.231 | 5.175 – 5.325 | 12 | 12 | — |
| 9 | Modal (gVisor) | 7.579 | 7.284 – 7.712 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.055 | 2.042 – 2.073 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.41 | 2.388 – 2.478 | 12 | 12 | — |
| 3 | Blaxel | 2.487 | 2.457 – 2.539 | 12 | 12 | — |
| 4 | Novita | 2.908 | 2.795 – 3.142 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 3.397 | 3.296 – 3.502 | 12 | 12 | — |
| 5 | Modal (VM) | 3.453 | 3.182 – 3.829 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 3.798 | 3.675 – 3.92 | 12 | 12 | tied |
| 8 | E2B | 4.191 | 4.058 – 4.341 | 12 | 12 | — |
| 9 | Modal (gVisor) | 10.86 | 10.46 – 11.16 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.344 | 5.316 – 5.367 | 12 | 12 | — |
| 2 | Blaxel | 7.082 | 6.859 – 7.194 | 12 | 12 | — |
| 3 | Daytona (VM) | 7.381 | 7.021 – 7.521 | 12 | 12 | — |
| 4 | Novita | 7.86 | 7.732 – 8.159 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 9.61 | 9.354 – 9.806 | 12 | 12 | — |
| 5 | Modal (VM) | 10.07 | 9.003 – 11.59 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 11.2 | 10.89 – 11.45 | 12 | 12 | tied |
| 8 | E2B | 12.97 | 12.56 – 13.63 | 12 | 12 | — |
| 9 | Modal (gVisor) | 16.37 | 16.02 – 16.98 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.75 | 23.13 – 25.03 | 12 | 12 | — |
| 1 | Namespace | 24.59 | 24.33 – 24.9 | 12 | 12 | tied |
| 3 | Blaxel | 26.83 | 26.04 – 27.18 | 12 | 12 | — |
| 4 | Novita | 33.67 | 32.41 – 35.47 | 12 | 12 | — |
| 4 | Modal (VM) | 37.33 | 33.2 – 42.82 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 39.54 | 38.1 – 41.09 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 44.77 | 43.63 – 46.63 | 12 | 12 | — |
| 8 | E2B | 48.94 | 47.86 – 49.66 | 12 | 12 | — |
| 9 | Modal (gVisor) | 107.4 | 103.2 – 112 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 30.12 | 29.86 – 30.52 | 12 | 12 | — |
| 2 | Daytona (VM) | 39.44 | 39.13 – 41.06 | 12 | 12 | — |
| 3 | Blaxel | 41.7 | 40.83 – 43.3 | 12 | 12 | — |
| 4 | Novita | 44.51 | 42.79 – 46.4 | 12 | 12 | — |
| 5 | Modal (VM) | 55.93 | 49.74 – 64.04 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 59.01 | 57.82 – 60.71 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 66.2 | 64.38 – 67.33 | 12 | 12 | — |
| 8 | E2B | 71.09 | 69.76 – 74.09 | 12 | 12 | — |
| 9 | Modal (gVisor) | 80.29 | 76.41 – 85.55 | 12 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 55.77 | 55.32 – 56.13 | 12 | 12 | — |
| 2 | Daytona (VM) | 69.82 | 69.04 – 71.83 | 11 | 11 | — |
| 3 | Blaxel | 73.91 | 72.49 – 75.52 | 12 | 12 | — |
| 4 | Novita | 79.79 | 78.41 – 87.3 | 12 | 12 | — |
| 4 | Modal (VM) | 91.85 | 81.74 – 93.4 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 97.82 | 94.6 – 100.8 | 12 | 12 | — |
| 7 | E2B | 122.5 | 120.6 – 125.2 | 12 | 12 | — |
| 8 | Modal (gVisor) | 169.8 | 167.8 – 177.8 | 12 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.123 | 2.092 – 2.313 | 12 | 12 | — |
| 2 | Modal (VM) | 2.586 | 2.582 – 2.76 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.17 | 2.999 – 3.373 | 12 | 12 | — |
| 3 | Novita | 3.425 | 3.125 – 5.139 | 12 | 12 | tied |
| 3 | E2B | 3.644 | 3.419 – 3.923 | 12 | 12 | tied |
| 3 | Namespace | 4.037 | 3.49 – 4.663 | 12 | 12 | tied |
| 3 | Daytona (VM) | 4.094 | 2.444 – 6.275 | 11 | 11 | tied |
| 8 | Modal (gVisor) | 6.233 | 5.797 – 6.428 | 12 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 67.1 | 66.47 – 67.37 | 12 | 12 | — |
| 2 | Daytona (VM) | 88.19 | 84.23 – 93.56 | 11 | 11 | — |
| 2 | Blaxel | 92.27 | 89.11 – 93.47 | 12 | 12 | tied |
| 4 | Novita | 101.4 | 97.74 – 106.4 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 115 | 111.2 – 119.9 | 12 | 12 | — |
| 5 | Modal (VM) | 115.6 | 101 – 117.1 | 12 | 12 | tied |
| 7 | E2B | 153.3 | 152.2 – 158.4 | 12 | 12 | — |
| 8 | Modal (gVisor) | 197.8 | 190.9 – 200.7 | 12 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.21 | 10.74 – 12.07 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.61 | 12.43 – 12.86 | 12 | 12 | — |
| 3 | Novita | 14.84 | 14.29 – 16.91 | 12 | 12 | — |
| 3 | Namespace | 17.37 | 12.26 – 17.99 | 12 | 12 | tied |
| 3 | Modal (VM) | 17.58 | 14.72 – 18.37 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 17.82 | 17.61 – 19.07 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 19.21 | 18.07 – 20.94 | 12 | 12 | tied |
| 3 | E2B | 20.32 | 19.39 – 21.81 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 28.03 | 26.97 – 29.27 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.393 | 2.307 – 2.46 | 12 | 12 | — |
| 2 | Daytona (VM) | 3.203 | 2.935 – 5.424 | 12 | 12 | — |
| 2 | Modal (VM) | 3.505 | 3.066 – 3.835 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 3.699 | 3.594 – 4.343 | 12 | 12 | — |
| 5 | E2B | 4.522 | 4.353 – 7.659 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 5.125 | 4.212 – 18.85 | 12 | 12 | tied |
| 5 | Novita | 6.812 | 4.548 – 9.781 | 12 | 12 | tied |
| 5 | Namespace | 8.508 | 5.34 – 11 | 12 | 12 | tied |
| 5 | Modal (gVisor) | 9.193 | 8.845 – 9.704 | 12 | 12 | tied |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 52.11 | 51.72 – 52.66 | 12 | 12 | — |
| 2 | Daytona (VM) | 60.87 | 59.94 – 61.99 | 12 | 12 | — |
| 2 | Blaxel | 62.53 | 60.79 – 63.78 | 12 | 12 | tied |
| 4 | Novita | 68.49 | 65.67 – 81.09 | 12 | 12 | — |
| 4 | Modal (VM) | 74.37 | 59.58 – 87.55 | 12 | 12 | tied |
| 6 | Microsandbox Cloud | 90.76 | 86.83 – 100.8 | 12 | 12 | — |
| 6 | Vercel Sandbox | 97.36 | 94.04 – 102.8 | 12 | 12 | tied |
| 8 | E2B | 107.9 | 102.7 – 111.8 | 12 | 12 | — |
| 9 | Modal (gVisor) | 163.2 | 137.6 – 185.7 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 80.49 | 80.05 – 81.39 | 12 | 12 | — |
| 2 | Daytona (VM) | 92.71 | 90.32 – 97.27 | 12 | 12 | — |
| 3 | Modal (VM) | 117 | 100.2 – 124.7 | 12 | 12 | — |
| 3 | Novita | 127.4 | 113.4 – 146.1 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 130 | 126.2 – 136.5 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 147.7 | 145.9 – 152.2 | 12 | 12 | — |
| 7 | E2B | 179.4 | 176.2 – 184.8 | 12 | 12 | — |
| 8 | Modal (gVisor) | 266.9 | 251.3 – 293.4 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 13.96 | 13.74 – 14.26 | 12 | 12 | — |
| 2 | Daytona (VM) | 17.08 | 16.32 – 17.67 | 12 | 12 | — |
| 2 | Blaxel | 17.61 | 16.97 – 18.23 | 12 | 12 | tied |
| 4 | Modal (VM) | 21.33 | 17.8 – 24.06 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 23.92 | 22.83 – 25.17 | 12 | 12 | — |
| 5 | Novita | 24.77 | 20.66 – 28.37 | 12 | 12 | tied |
| 5 | Vercel Sandbox | 26.9 | 25.74 – 27.79 | 12 | 12 | tied |
| 8 | E2B | 34.65 | 33.91 – 36.82 | 12 | 12 | — |
| 9 | Modal (gVisor) | 56.15 | 36.33 – 74.3 | 12 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 28.09 | 27.86 – 28.47 | 3 | 9 | — |
| 2 | Daytona (VM) | 20.39 | 18.61 – 21.73 | 3 | 23 | too few sandboxes |
| 3 | Blaxel | 19.91 | 19.87 – 20.92 | 3 | 35 | too few sandboxes |
| 4 | Novita | 19.72 | 15.92 – 19.79 | 3 | 24 | too few sandboxes |
| 5 | Microsandbox Cloud | 16.82 | 16.53 – 17.58 | 3 | 43 | too few sandboxes |
| 6 | Modal (VM) | 14.82 | 13.5 – 14.99 | 3 | 10 | too few sandboxes |
| 7 | Vercel Sandbox | 13.77 | 13.46 – 13.77 | 3 | 9 | too few sandboxes |
| 8 | E2B | 11.67 | 11.28 – 11.82 | 3 | 9 | too few sandboxes |
| 9 | Modal (gVisor) | 9.38 | 9.11 – 9.62 | 3 | 21 | too few sandboxes |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.3× Namespace on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 328000 | 266500 – 348500 | 3 | 6 | — |
| 2 | Namespace | 252000 | 239500 – 268500 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 249000 | 238000 – 282000 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 240000 | 219000 – 240500 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 236500 | 127500 – 237000 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 235000 | 169000 – 264500 | 3 | 6 | too few sandboxes |
| 7 | Novita | 79750 | 68650 – 133000 | 3 | 6 | too few sandboxes |
| 8 | E2B | 46950 | 45900 – 47300 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 31850 | 31800 – 33900 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.3× Namespace on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1280 | 1043 – 1360 | 3 | 6 | — |
| 2 | Namespace | 983 | 936 – 1048 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 973.5 | 929 – 1102 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 937 | 856.5 – 940 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 923 | 498.5 – 926.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 918 | 661 – 1034 | 3 | 6 | too few sandboxes |
| 7 | Novita | 312.5 | 268 – 520.5 | 3 | 6 | too few sandboxes |
| 8 | E2B | 183.5 | 179.5 – 185 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 124.5 | 124 – 132.5 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 323500 | 189500 – 327000 | 3 | 6 | — |
| 2 | Vercel Sandbox | 268000 | 170000 – 281000 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 243500 | 235500 – 263500 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 229000 | 223000 – 252500 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 222500 | 221500 – 236000 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 205000 | 201000 – 274500 | 3 | 6 | too few sandboxes |
| 7 | Novita | 99350 | 73750 – 155500 | 3 | 6 | too few sandboxes |
| 8 | E2B | 48400 | 47850 – 48900 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 26950 | 26250 – 27800 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.2× Vercel Sandbox on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1264 | 741 – 1277 | 3 | 6 | — |
| 2 | Vercel Sandbox | 1048 | 663.5 – 1099 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 951.5 | 920.5 – 1029 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 893 | 871 – 986 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 869.5 | 864.5 – 922.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 800.5 | 785.5 – 1072 | 3 | 6 | too few sandboxes |
| 7 | Novita | 387 | 288 – 606 | 3 | 6 | too few sandboxes |
| 8 | E2B | 189 | 187 – 191 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 105.5 | 102.8 – 108.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.0× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 22250 | 18400 – 22300 | 3 | 6 | — |
| 2 | Daytona (VM) | 11300 | 9964 – 11600 | 3 | 6 | too few sandboxes |
| 3 | Novita | 8000 | 7257 – 10143 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 7791 | 7671 – 9986 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 7102 | 4803 – 7213 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 5169 | 3658 – 5276 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 4033 | 4017 – 4059 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 1742 | 1700 – 2027 | 3 | 6 | too few sandboxes |
| 9 | E2B | 599.5 | 599.5 – 600 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 8866 | 8101 – 9630 | 2 | 2 | — |
| 2 | Novita | 8001 | 7258 – 9587 | 3 | 5 | too few sandboxes |
| 3 | Blaxel | 7793 | 7672 – 9573 | 3 | 5 | too few sandboxes |
| 4 | Microsandbox Cloud | 7104 | 4804 – 7214 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 5171 | 3660 – 5278 | 3 | 6 | too few sandboxes |
| 6 | Namespace | 4035 | 4019 – 4060 | 3 | 6 | too few sandboxes |
| 7 | Modal (VM) | 1744 | 1701 – 2029 | 3 | 6 | too few sandboxes |
| 8 | E2B | 601 | 601 – 601 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5932 | 5735 – 6020 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 5761 | 3911 – 5854 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4061 | 3752 – 5791 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4000 | 3989 – 5764 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3465 | 3025 – 5084 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 3080 | 2639 – 3823 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2798 | 2673 – 2829 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 2681 | 2302 – 4586 | 3 | 6 | too few sandboxes |
| 9 | E2B | 599.5 | 598 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5934 | 5737 – 6022 | 3 | 6 | — |
| 2 | Microsandbox Cloud | 5763 | 3912 – 5856 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4062 | 3754 – 5792 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4002 | 3990 – 5766 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 3467 | 3027 – 5085 | 3 | 6 | too few sandboxes |
| 6 | Modal (gVisor) | 3082 | 2641 – 3825 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2800 | 2675 – 2831 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 2682 | 2303 – 4588 | 3 | 6 | too few sandboxes |
| 9 | E2B | 601 | 600 – 601 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.98 | 23.17 – 26.19 | 3 | 6 | — |
| 2 | Blaxel | 19.61 | 19.47 – 20.13 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 10.81 | 8.16 – 10.87 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 9.675 | 9.355 – 9.71 | 3 | 6 | too few sandboxes |
| 5 | Novita | 9.295 | 9.095 – 11.3 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 8.075 | 8.05 – 15.52 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 5.22 | 5.16 – 5.38 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 3.125 | 3.045 – 3.305 | 3 | 6 | too few sandboxes |
| 9 | E2B | 1.415 | 1.38 – 1.43 | 3 | 6 | too few sandboxes |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 182100 | 78650 – 182500 | 3 | 15 | — |
| 2 | Blaxel | 111331 | 109500 – 116400 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 95913 | 55314 – 131100 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 69260 | 63720 – 73750 | 3 | 15 | too few sandboxes |
| 5 | Novita | 63690 | 53450 – 81555 | 3 | 15 | too few sandboxes |
| 6 | Microsandbox Cloud | 57050 | 56570 – 57350 | 3 | 15 | too few sandboxes |
| 7 | Vercel Sandbox | 53760 | 53360 – 54270 | 3 | 15 | too few sandboxes |
| 8 | E2B | 49595 | 44670 – 52349 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 33690 | 33620 – 33750 | 3 | 15 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 182100 | 77970 – 182100 | 3 | 15 | — |
| 2 | Blaxel | 115900 | 107745 – 121400 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 95030 | 54970 – 127500 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 68070 | 61280 – 73360 | 3 | 15 | too few sandboxes |
| 5 | Novita | 61980 | 53360 – 83370 | 3 | 15 | too few sandboxes |
| 6 | Microsandbox Cloud | 57090 | 57000 – 57090 | 3 | 15 | too few sandboxes |
| 7 | Vercel Sandbox | 53680 | 53460 – 54100 | 3 | 15 | too few sandboxes |
| 8 | E2B | 50410 | 44940 – 52190 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 33650 | 33570 – 33690 | 3 | 15 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 213000 | 92890 – 213600 | 3 | 38 | — |
| 2 | Blaxel | 133500 | 126400 – 133683 | 3 | 35 | too few sandboxes |
| 3 | Modal (VM) | 98430 | 87620 – 116500 | 3 | 35 | too few sandboxes |
| 4 | Modal (gVisor) | 92550 | 91620 – 93730 | 3 | 50 | too few sandboxes |
| 5 | Vercel Sandbox | 83440 | 82293 – 85670 | 3 | 15 | too few sandboxes |
| 6 | Microsandbox Cloud | 82450 | 81800 – 82480 | 3 | 51 | too few sandboxes |
| 7 | E2B | 77136 | 73480 – 77530 | 3 | 75 | too few sandboxes |
| 8 | Novita | 58470 | 57320 – 68830 | 3 | 50 | too few sandboxes |
| 9 | Namespace | 44680 | 44210 – 44980 | 3 | 15 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 173800 | 70180 – 174200 | 3 | 15 | — |
| 2 | Blaxel | 105700 | 97870 – 119000 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 90870 | 47690 – 134000 | 3 | 15 | too few sandboxes |
| 4 | Novita | 60900 | 50700 – 67790 | 3 | 15 | too few sandboxes |
| 5 | Modal (gVisor) | 57850 | 55470 – 66690 | 3 | 15 | too few sandboxes |
| 6 | Microsandbox Cloud | 47830 | 45870 – 47990 | 3 | 15 | too few sandboxes |
| 7 | Vercel Sandbox | 46332 | 46230 – 47460 | 3 | 15 | too few sandboxes |
| 8 | E2B | 44730 | 36560 – 45080 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 30650 | 30600 – 30680 | 3 | 15 | too few sandboxes |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Blaxel leads · ~1.5× Vercel Sandbox on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 115900 | 108900 – 133468 | 3 | 6 | — |
| 2 | Vercel Sandbox | 75792 | 72640 – 76347 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 75370 | 65022 – 80583 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 71830 | 63110 – 72600 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 59080 | 40880 – 67180 | 3 | 6 | too few sandboxes |
| 6 | E2B | 54592 | 49945 – 63883 | 3 | 6 | too few sandboxes |
| 7 | Novita | 47470 | 47391 – 140900 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 14630 | 14010 – 71320 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 13911 | 11594 – 36480 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads · ~1.5× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 117600 | 97934 – 181000 | 3 | 6 | — |
| 2 | Daytona (VM) | 80210 | 71060 – 80780 | 3 | 6 | too few sandboxes |
| 3 | Vercel Sandbox | 71480 | 67896 – 73325 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 65624 | 40120 – 68029 | 3 | 6 | too few sandboxes |
| 5 | Novita | 58710 | 58610 – 155500 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 43813 | 43146 – 70850 | 3 | 6 | too few sandboxes |
| 7 | E2B | 42480 | 42139 – 50144 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 14590 | 14385 – 74228 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 12850 | 9883 – 33450 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 9999 – 10000 | 3 | 6 | — |
| 2 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 2 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 9 | Modal (gVisor) | 165.5 | 165.5 – 548 | 3 | 6 | too few sandboxes |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 5748 | 1054 – 7094 | 3 | 6 | — |
| 2 | Namespace | 5747 | 4276 – 11640 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 5418 | 4166 – 5724 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 4729 | 4272 – 8318 | 3 | 6 | too few sandboxes |
| 5 | Novita | 4120 | 379.7 – 4664 | 3 | 6 | too few sandboxes |
| 6 | E2B | 3066 | 1944 – 3634 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 2348 | 1566 – 2576 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 974 | 619.7 – 1471 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload

Mbits/sec · higher is better

_Daytona (VM) leads · ~1.3× Modal (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4403 | 2789 – 4470 | 3 | 6 | — |
| 2 | Modal (VM) | 3515 | 1496 – 9292 | 3 | 6 | too few sandboxes |
| 3 | E2B | 3289 | 3028 – 3309 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 2944 | 1987 – 2966 | 3 | 6 | too few sandboxes |
| 5 | Novita | 2580 | 1103 – 4423 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 1826 | 1724 – 1899 | 3 | 6 | too few sandboxes |
| 7 | Blaxel | 1697 | 1673 – 2150 | 3 | 6 | too few sandboxes |
| 8 | Modal (gVisor) | 172.1 | 164 – 1135 | 3 | 6 | too few sandboxes |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 361.5 | 360 – 365 | 3 | 6 | — |
| 2 | Daytona (VM) | 440.5 | 413.5 – 442 | 3 | 6 | too few sandboxes |
| 3 | Novita | 483 | 481 – 672.5 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 488.5 | 484.5 – 490 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 508 | 507.5 – 508.5 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 672 | 446.5 – 818.5 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 765 | 763.5 – 1181 | 3 | 6 | too few sandboxes |
| 8 | E2B | 808.5 | 807.5 – 818.5 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 896 | 894 – 903.5 | 3 | 6 | too few sandboxes |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.73 | 31.58 – 32.08 | 3 | 6 | — |
| 2 | Daytona (VM) | 39.55 | 37.31 – 39.78 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 43.88 | 42.18 – 44.2 | 3 | 6 | too few sandboxes |
| 4 | Novita | 43.95 | 43.84 – 50.56 | 3 | 6 | too few sandboxes |
| 5 | Modal (VM) | 47.32 | 38.93 – 62.61 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 53.47 | 50.85 – 55.28 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 60.36 | 60.27 – 81.09 | 3 | 6 | too few sandboxes |
| 8 | E2B | 64.49 | 64.29 – 65.49 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 85.84 | 84.4 – 86.04 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 331300 | 327600 – 340900 | 3 | 6 | — |
| 2 | Daytona (VM) | 288900 | 279500 – 298200 | 2 | 4 | too few sandboxes |
| 3 | Namespace | 253000 | 244700 – 376600 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 232000 | 189200 – 232400 | 3 | 6 | too few sandboxes |
| 5 | Novita | 231300 | 199700 – 251800 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 203400 | 198300 – 205800 | 3 | 6 | too few sandboxes |
| 7 | E2B | 175400 | 172200 – 178600 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 171800 | 170000 – 173200 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 10980 | 10790 – 11090 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.151 | 0.1465 – 0.153 | 3 | 6 | — |
| 2 | Daytona (VM) | 0.1733 | 0.1675 – 0.179 | 2 | 4 | too few sandboxes |
| 3 | Namespace | 0.1975 | 0.1325 – 0.2045 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 0.2155 | 0.215 – 0.2665 | 3 | 6 | too few sandboxes |
| 5 | Novita | 0.216 | 0.199 – 0.251 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 0.246 | 0.243 – 0.252 | 3 | 6 | too few sandboxes |
| 7 | E2B | 0.285 | 0.28 – 0.2905 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 0.291 | 0.289 – 0.294 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 4.557 | 4.511 – 4.635 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 27840 | 27050 – 39660 | 3 | 6 | — |
| 2 | Blaxel | 24430 | 23720 – 26690 | 3 | 6 | too few sandboxes |
| 3 | Novita | 20020 | 15320 – 23830 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 17930 | 14160 – 17960 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 17600 | 17250 – 17840 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 17160 | 16970 – 17370 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 15770 | 15660 – 15870 | 2 | 4 | too few sandboxes |
| 8 | E2B | 11340 | 11200 – 11490 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 1885 | 1815 – 1908 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.796 | 1.261 – 1.849 | 3 | 6 | — |
| 2 | Blaxel | 2.051 | 1.873 – 2.111 | 3 | 6 | too few sandboxes |
| 3 | Novita | 2.498 | 2.105 – 3.266 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 2.79 | 2.785 – 3.532 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 2.841 | 2.804 – 2.899 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 2.914 | 2.88 – 2.947 | 3 | 6 | too few sandboxes |
| 7 | Daytona (VM) | 3.172 | 3.151 – 3.193 | 2 | 4 | too few sandboxes |
| 8 | E2B | 4.426 | 4.354 – 4.464 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 26.55 | 26.2 – 27.55 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 35.04 | 32.58 – 35.37 | 3 | 6 | — |
| 2 | Blaxel | 39.1 | 38.7 – 39.39 | 3 | 6 | too few sandboxes |
| 3 | Novita | 41.21 | 39.98 – 56.48 | 3 | 6 | too few sandboxes |
| 4 | Namespace | 48.31 | 48.18 – 48.83 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 54.52 | 52.25 – 54.53 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 60.65 | 32.39 – 62.21 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 66.81 | 65.08 – 85.95 | 3 | 6 | too few sandboxes |
| 8 | E2B | 69.28 | 68.38 – 69.81 | 3 | 6 | too few sandboxes |
| 9 | Modal (gVisor) | 419.5 | 397.9 – 441 | 3 | 6 | too few sandboxes |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 0.2333 | — | 1 | 1 | — |
| 2 | Daytona (VM) | 0.2502 | — | 1 | 1 | — |
| 3 | E2B | 0.3312 | — | 1 | 1 | — |
| 4 | Modal (gVisor) | 0.7612 | — | 1 | 1 | — |
| 4 | Modal (VM) | 0.7612 | — | 1 | 1 | equal values |

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
The floor is a property of the design — here 2 v 3 sandboxes floors at p ≈ 0.20; 3 v 2 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 0.10.
At three sandboxes a side the floor is 2/C(6,3) = 0.1, which is above α, so **no** three-sandbox
comparison in this table can ever be declared separated. That is a fact about the replicate count,
not about the providers.
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
| cpu | Node.js web tooling | Daytona (VM) | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Blaxel | 1.0 (too few sandboxes) | 0.30 |
| cpu | Node.js web tooling | Novita | 0.10 (too few sandboxes) | 0.089 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.70 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.40 (too few sandboxes) | 0.038 |
| cpu | Node.js web tooling | E2B | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.10 (too few sandboxes) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.20 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 1.0 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.012 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.40 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 1.0 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.40 (too few sandboxes) | 0.47 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 1.0 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.099 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Modal (VM) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.017 |
| memory | STREAM Triad | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.14 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Modal (VM) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Novita | 1.0 (too few sandboxes) | 0.017 |
| memory | STREAM Add | Microsandbox Cloud | 0.60 (too few sandboxes) | 0.14 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | 0.70 (too few sandboxes) | 0.026 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.11 |
| memory | STREAM Copy | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Modal (VM) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Novita | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Modal (gVisor) | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.051 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | — | — |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Novita | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.20 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Novita | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Novita | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Blaxel | 0.40 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Daytona (VM) | — | — |
| network | iperf3 WAN upload | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Namespace | 0.10 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Novita | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.70 (too few sandboxes) | 0.32 |
| system | Git common operations | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RO (s100, 50c) | Namespace | 0.80 (too few sandboxes) | 0.14 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.80 (too few sandboxes) | 0.14 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW (s100, 50c) | E2B | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.20 (too few sandboxes) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.20 (too few sandboxes) | 0.0047 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | E2B | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

