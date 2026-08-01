# Sandbox provider leaderboard

Run [`30655876610`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30655876610) · commit [`92eac748f1478a5e147a49186a9562ed6c494df2`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/92eac748f1478a5e147a49186a9562ed6c494df2) ·
dataset [`data/dataset/runs/30655876610.json`](data/dataset/runs/30655876610.json) · generated 2026-07-31T19:30:09.041Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **354 metric records**
backed by **3636 retained trial observations**, across **46 metrics** and
**8 providers**; every emitted, catalogued metric has a ranked table below
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

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 8 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 7 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 6 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 37.96 | 37.77 – 39.15 | 12 | — |
| 1 | Daytona (VM) | 39.12 | 38.17 – 41.04 | 10 | tied |
| 3 | Novita | 44.86 | 42.31 – 48.44 | 12 | — |
| 4 | Modal (VM) | 51.61 | 49.28 – 53.54 | 12 | — |
| 4 | Namespace | 55.07 | 50.41 – 63.59 | 12 | tied |
| 4 | Microsandbox Cloud | 59.15 | 55.83 – 61.4 | 12 | tied |
| 7 | Modal (gVisor) | 98.56 | 94.82 – 101.9 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM), Blaxel and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 59.48 | 58.21 – 61.03 | 12 | — |
| 1 | Blaxel | 59.53 | 58.37 – 62.31 | 12 | tied |
| 1 | Namespace | 62.35 | 55.82 – 65.85 | 12 | tied |
| 4 | Novita | 69.91 | 65.03 – 78.54 | 12 | — |
| 5 | Microsandbox Cloud | 79.17 | 76.59 – 80.51 | 12 | — |
| 5 | Modal (VM) | 79.61 | 69.3 – 88.39 | 12 | tied |
| 7 | E2B | 102.7 | 100.1 – 106.5 | 12 | — |
| 8 | Modal (gVisor) | 140 | 138 – 142.1 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.87 | 11.67 – 12.18 | 12 | — |
| 2 | Daytona (VM) | 13.3 | 12.68 – 13.99 | 12 | — |
| 3 | Novita | 14.14 | 13.92 – 15.64 | 12 | — |
| 4 | Microsandbox Cloud | 17.48 | 16.58 – 19.33 | 12 | — |
| 4 | Modal (VM) | 19.26 | 19.02 – 19.7 | 12 | tied |
| 6 | E2B | 20.01 | 19.44 – 20.62 | 12 | — |
| 7 | Namespace | 31.2 | 27.4 – 33.4 | 12 | — |
| 8 | Modal (gVisor) | 35.52 | 34.68 – 38.44 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Daytona (VM), Modal (VM), E2B, Novita, Modal (gVisor), Blaxel, Microsandbox Cloud and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 1.596 | 1.538 – 6.22 | 12 | — |
| 1 | Modal (VM) | 1.655 | 1.448 – 2.134 | 12 | tied |
| 1 | E2B | 2.022 | 1.392 – 4.072 | 12 | tied |
| 1 | Novita | 2.076 | 1.935 – 3.721 | 12 | tied |
| 1 | Modal (gVisor) | 4.649 | 2.635 – 6.531 | 12 | tied |
| 1 | Blaxel | 5.135 | 2.697 – 9.423 | 12 | tied |
| 1 | Microsandbox Cloud | 6.514 | 4.476 – 7.043 | 12 | tied |
| 1 | Namespace | 6.933 | 4.918 – 9.709 | 12 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM), Namespace and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 3.131 | 3.095 – 3.186 | 12 | — |
| 1 | Namespace | 3.221 | 2.99 – 3.522 | 12 | tied |
| 1 | Blaxel | 3.297 | 3.234 – 3.353 | 12 | tied |
| 4 | Novita | 3.567 | 3.351 – 4.064 | 12 | — |
| 5 | Microsandbox Cloud | 4.22 | 4.074 – 4.332 | 12 | — |
| 5 | Modal (VM) | 4.297 | 4.092 – 4.655 | 12 | tied |
| 7 | E2B | 5.395 | 5.236 – 5.585 | 12 | — |
| 8 | Modal (gVisor) | 11.2 | 10.99 – 12.1 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 9.873 | 9.259 – 11.39 | 12 | — |
| 1 | Daytona (VM) | 10.03 | 9.781 – 10.4 | 12 | tied |
| 1 | Blaxel | 10.13 | 9.909 – 10.54 | 12 | tied |
| 4 | Novita | 11.76 | 11.6 – 12.51 | 12 | — |
| 5 | Microsandbox Cloud | 12.77 | 12.27 – 13.06 | 12 | — |
| 6 | Modal (VM) | 14.66 | 13.52 – 15.3 | 12 | — |
| 7 | E2B | 19.37 | 19.18 – 20.15 | 12 | — |
| 8 | Modal (gVisor) | 30.25 | 28.65 – 32.32 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.567 | 2.41 – 3.159 | 12 | — |
| 1 | Daytona (VM) | 2.872 | 2.724 – 3.064 | 12 | tied |
| 3 | Blaxel | 3.042 | 2.939 – 3.151 | 12 | — |
| 4 | Novita | 3.149 | 3.103 – 3.411 | 12 | — |
| 5 | Microsandbox Cloud | 3.474 | 3.429 – 3.585 | 12 | — |
| 6 | Modal (VM) | 4.302 | 3.817 – 4.716 | 12 | — |
| 7 | E2B | 5.534 | 5.386 – 6.224 | 12 | — |
| 8 | Modal (gVisor) | 7.434 | 7.136 – 7.781 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.311 | 2.169 – 2.51 | 12 | — |
| 1 | Daytona (VM) | 2.431 | 2.347 – 2.512 | 12 | tied |
| 3 | Blaxel | 2.515 | 2.453 – 2.674 | 12 | — |
| 4 | Novita | 2.922 | 2.601 – 3.276 | 12 | — |
| 5 | Microsandbox Cloud | 3.327 | 3.194 – 3.521 | 12 | — |
| 5 | Modal (VM) | 3.453 | 3.178 – 3.824 | 12 | tied |
| 7 | E2B | 4.381 | 4.277 – 4.693 | 12 | — |
| 8 | Modal (gVisor) | 11.02 | 10.7 – 11.32 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 6.567 | 5.979 – 7.979 | 12 | — |
| 1 | Daytona (VM) | 6.835 | 6.777 – 7.679 | 12 | tied |
| 1 | Blaxel | 6.998 | 6.965 – 7.272 | 12 | tied |
| 4 | Novita | 7.79 | 7.699 – 8.193 | 12 | — |
| 5 | Microsandbox Cloud | 9.861 | 9.412 – 10.07 | 12 | — |
| 5 | Modal (VM) | 10.2 | 9.064 – 11.48 | 12 | tied |
| 7 | E2B | 13.71 | 13.17 – 15.3 | 12 | — |
| 8 | Modal (gVisor) | 17.02 | 16.57 – 20.47 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM), Blaxel, Namespace, Novita, Microsandbox Cloud and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.73 | 25.45 – 27.03 | 12 | — |
| 1 | Blaxel | 27.04 | 26.3 – 27.93 | 12 | tied |
| 1 | Namespace | 30.35 | 27.17 – 36.09 | 12 | tied |
| 1 | Novita | 34.49 | 29.92 – 41.8 | 12 | tied |
| 1 | Microsandbox Cloud | 38.77 | 37.75 – 40.74 | 12 | tied |
| 1 | Modal (VM) | 39.17 | 33.29 – 43.53 | 12 | tied |
| 7 | E2B | 53.31 | 50.24 – 59 | 12 | — |
| 8 | Modal (gVisor) | 106.6 | 102.6 – 113.5 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace, Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 40.42 | 39.43 – 51.79 | 12 | — |
| 1 | Blaxel | 42.24 | 41.59 – 43.89 | 12 | tied |
| 1 | Daytona (VM) | 42.29 | 40.85 – 43.39 | 12 | tied |
| 4 | Novita | 44.19 | 41.93 – 44.97 | 12 | — |
| 5 | Microsandbox Cloud | 56.61 | 55.07 – 59.16 | 12 | — |
| 5 | Modal (VM) | 56.62 | 50.1 – 64.52 | 12 | tied |
| 7 | E2B | 77.08 | 73 – 84.6 | 12 | — |
| 7 | Modal (gVisor) | 78.76 | 76.52 – 84.25 | 12 | tied |

### Mastra: build:core

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 69 | 64.23 – 84.29 | 12 | — |
| 1 | Daytona (VM) | 71.18 | 69.5 – 71.58 | 10 | tied |
| 1 | Blaxel | 72.82 | 68.59 – 74.41 | 12 | tied |
| 4 | Novita | 78.45 | 76.76 – 83.49 | 12 | — |
| 5 | Modal (VM) | 92.03 | 88.07 – 95.67 | 12 | — |
| 5 | Microsandbox Cloud | 94.5 | 92.36 – 97.17 | 12 | tied |
| 7 | Modal (gVisor) | 168.9 | 164.2 – 174.2 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Microsandbox Cloud, Novita, Daytona (VM), Blaxel, Modal (VM), Modal (gVisor) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 3.405 | 3.136 – 7.079 | 12 | — |
| 1 | Novita | 3.407 | 3.113 – 46.69 | 12 | tied |
| 1 | Daytona (VM) | 3.599 | 2.413 – 15.81 | 10 | tied |
| 1 | Blaxel | 5.809 | 3.128 – 10.39 | 12 | tied |
| 1 | Modal (VM) | 8.476 | 2.913 – 18.35 | 12 | tied |
| 1 | Modal (gVisor) | 9.179 | 6.017 – 17.1 | 12 | tied |
| 1 | Namespace | 19.59 | 7.766 – 40.64 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Namespace, Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 82.78 | 78.07 – 90.98 | 12 | — |
| 1 | Blaxel | 88.97 | 86.37 – 90.6 | 12 | tied |
| 1 | Daytona (VM) | 93.28 | 85.83 – 93.76 | 10 | tied |
| 4 | Novita | 98.2 | 95.71 – 103.2 | 12 | — |
| 5 | Microsandbox Cloud | 112.7 | 111.1 – 116.1 | 12 | — |
| 5 | Modal (VM) | 114.7 | 109 – 115.9 | 12 | tied |
| 7 | Modal (gVisor) | 197.8 | 193.2 – 203.1 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.78 | 11.54 – 12.41 | 12 | — |
| 2 | Daytona (VM) | 13.74 | 13.18 – 15.51 | 12 | — |
| 3 | Novita | 16.29 | 15.59 – 17.62 | 12 | — |
| 3 | Modal (VM) | 17.57 | 13.59 – 18.43 | 12 | tied |
| 5 | Microsandbox Cloud | 19.74 | 19.01 – 20.27 | 12 | — |
| 6 | Modal (gVisor) | 29.85 | 21.41 – 33.38 | 9 | — |
| 6 | Namespace | 30.43 | 27.54 – 40.49 | 12 | tied |

### OpenClaw: git clone

Seconds · lower is better

_Novita, Daytona (VM) and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 4.624 | 4.296 – 19.44 | 12 | — |
| 1 | Daytona (VM) | 5.076 | 3.843 – 14.2 | 12 | tied |
| 1 | Modal (VM) | 9.57 | 4.532 – 13.64 | 12 | tied |
| 4 | Namespace | 14.66 | 12.62 – 22 | 12 | — |
| 4 | Blaxel | 15.47 | 10.52 – 27.63 | 12 | tied |
| 4 | Modal (gVisor) | 16.15 | 9.403 – 23.23 | 9 | tied |
| 4 | Microsandbox Cloud | 22.65 | 13.72 – 27.99 | 12 | tied |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Daytona (VM), Blaxel, Novita, Modal (VM) and Namespace share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 62.83 | 61.54 – 67.15 | 12 | — |
| 1 | Blaxel | 66.22 | 62.57 – 70.09 | 12 | tied |
| 1 | Novita | 70.52 | 66.19 – 80.68 | 12 | tied |
| 1 | Modal (VM) | 74.65 | 59.96 – 75.91 | 12 | tied |
| 1 | Namespace | 76.09 | 71.35 – 79.5 | 12 | tied |
| 6 | Microsandbox Cloud | 89.85 | 83.88 – 94.97 | 12 | — |
| 7 | Modal (gVisor) | 169.1 | 93.73 – 179.5 | 9 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Daytona (VM) leads · Modal (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 98.3 | 93.37 – 102.5 | 12 | — |
| 2 | Modal (VM) | 117.9 | 100.9 – 120.6 | 12 | — |
| 2 | Namespace | 127.1 | 96.16 – 140 | 12 | tied |
| 2 | Microsandbox Cloud | 127.8 | 124.9 – 132.3 | 12 | tied |
| 2 | Novita | 134.9 | 111.4 – 155.3 | 12 | tied |
| 6 | Modal (gVisor) | 315.3 | 145.2 – 398 | 9 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel, Daytona (VM), Namespace and Modal (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 17.9 | 16.88 – 19.6 | 11 | — |
| 1 | Daytona (VM) | 18.5 | 16.3 – 18.9 | 12 | tied |
| 1 | Namespace | 19.63 | 15.68 – 22.43 | 12 | tied |
| 1 | Modal (VM) | 20.93 | 17.93 – 22.38 | 12 | tied |
| 5 | Microsandbox Cloud | 23.56 | 22.34 – 27 | 12 | — |
| 5 | Novita | 25.09 | 21.73 – 29.74 | 12 | tied |
| 7 | Modal (gVisor) | 69.29 | 25.83 – 87.73 | 9 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 20.64 | 20.12 – 20.77 | 45 | — |
| 2 | Blaxel | 20.55 | 20.35 – 20.95 | 45 | n too small |
| 3 | Daytona (VM) | 19.35 | 18.53 – 19.7 | 21 | n too small |
| 4 | Novita | 17.87 | 14.69 – 20.18 | 9 | n too small |
| 5 | Microsandbox Cloud | 17.13 | 16.23 – 17.86 | 22 | n too small |
| 6 | Modal (VM) | 12.06 | 11.52 – 13.07 | 9 | n too small |
| 7 | E2B | 10.87 | 10.71 – 11.11 | 12 | n too small |
| 8 | Modal (gVisor) | 9.22 | 8.94 – 9.33 | 9 | n too small |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 330500 | 267000 – 378000 | 6 | — |
| 2 | Daytona (VM) | 273500 | 232000 – 462000 | 6 | n too small |
| 3 | Modal (VM) | 232500 | 137000 – 290000 | 6 | n too small |
| 4 | Blaxel | 217500 | 213000 – 292000 | 6 | n too small |
| 5 | Namespace | 139000 | 105000 – 212000 | 6 | n too small |
| 6 | Novita | 89800 | 62700 – 155000 | 6 | n too small |
| 7 | E2B | 47100 | 45100 – 47700 | 6 | n too small |
| 8 | Modal (gVisor) | 32950 | 31400 – 37200 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1291 | 872 – 1476 | 6 | — |
| 2 | Daytona (VM) | 1068 | 905 – 1806 | 6 | n too small |
| 3 | Modal (VM) | 907 | 612 – 1178 | 6 | n too small |
| 4 | Blaxel | 849 | 833 – 1011 | 6 | n too small |
| 5 | Namespace | 542.5 | 410 – 828 | 6 | n too small |
| 6 | Novita | 350.5 | 245 – 605 | 6 | n too small |
| 7 | E2B | 184 | 176.5 – 185.5 | 6 | n too small |
| 8 | Modal (gVisor) | 128.5 | 123 – 145 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.4× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 314500 | 216000 – 358000 | 6 | — |
| 2 | Modal (VM) | 226000 | 208000 – 276000 | 6 | n too small |
| 3 | Blaxel | 224000 | 217000 – 345000 | 6 | n too small |
| 4 | Daytona (VM) | 222000 | 217000 – 241000 | 6 | n too small |
| 5 | Namespace | 161500 | 147000 – 217000 | 6 | n too small |
| 6 | Novita | 113500 | 65800 – 137500 | 6 | n too small |
| 7 | E2B | 48800 | 47950 – 49500 | 6 | n too small |
| 8 | Modal (gVisor) | 27100 | 26700 – 27400 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.4× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1229 | 852 – 1399 | 6 | — |
| 2 | Modal (VM) | 883.5 | 805 – 1076 | 6 | n too small |
| 3 | Blaxel | 876 | 848 – 1346 | 6 | n too small |
| 4 | Daytona (VM) | 867 | 850 – 905.8 | 6 | n too small |
| 5 | Namespace | 630 | 573 – 838 | 6 | n too small |
| 6 | Novita | 443.5 | 257 – 551 | 6 | n too small |
| 7 | E2B | 190.5 | 186 – 193 | 6 | n too small |
| 8 | Modal (gVisor) | 106 | 104 – 107 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.2× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 20500 | 18400 – 22600 | 6 | — |
| 2 | Novita | 9246 | 8188 – 11500 | 6 | n too small |
| 3 | Blaxel | 8517 | 8238 – 9730 | 6 | n too small |
| 4 | Microsandbox Cloud | 8491 | 7997 – 8619 | 6 | n too small |
| 5 | Daytona (VM) | 7022 | 5333 – 9971 | 6 | n too small |
| 6 | Namespace | 2128 | 1968 – 3697 | 6 | n too small |
| 7 | Modal (VM) | 2042 | 1855 – 2545 | 6 | n too small |
| 8 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 8518 | 8240 – 9732 | 6 | — |
| 2 | Microsandbox Cloud | 8492 | 7999 – 8580 | 6 | n too small |
| 3 | Novita | 8452 | 8190 – 9979 | 4 | n too small |
| 4 | Daytona (VM) | 7023 | 5335 – 9973 | 6 | n too small |
| 5 | Namespace | 2130 | 1969 – 3699 | 6 | n too small |
| 6 | Modal (VM) | 2044 | 1856 – 2547 | 6 | n too small |
| 7 | E2B | 601 | 600 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 7021 | 4132 – 7347 | 6 | — |
| 2 | Blaxel | 5723 | 5294 – 6092 | 6 | n too small |
| 3 | Novita | 4125 | 3761 – 6159 | 6 | n too small |
| 4 | Daytona (VM) | 3461 | 3066 – 4564 | 6 | n too small |
| 5 | Modal (gVisor) | 2604 | 1963 – 3930 | 6 | n too small |
| 6 | Modal (VM) | 2592 | 2202 – 3394 | 6 | n too small |
| 7 | Namespace | 1765 | 1372 – 2567 | 6 | n too small |
| 8 | E2B | 599 | 598.5 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 7023 | 4134 – 7349 | 6 | — |
| 2 | Blaxel | 5725 | 5295 – 6094 | 6 | n too small |
| 3 | Novita | 4127 | 3763 – 6160 | 6 | n too small |
| 4 | Daytona (VM) | 3463 | 3068 – 4565 | 6 | n too small |
| 5 | Modal (gVisor) | 2606 | 1687 – 4172 | 6 | n too small |
| 6 | Modal (VM) | 2593 | 2203 – 3460 | 6 | n too small |
| 7 | Namespace | 1766 | 1374 – 2615 | 6 | n too small |
| 8 | E2B | 601 | 600 – 601 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.99 | 23.45 – 26.36 | 6 | — |
| 2 | Blaxel | 19.13 | 18.56 – 20.4 | 6 | n too small |
| 3 | Novita | 13.65 | 13.53 – 18.49 | 6 | n too small |
| 4 | Namespace | 10.94 | 4.52 – 11.13 | 6 | n too small |
| 5 | Microsandbox Cloud | 9.64 | 9.515 – 9.685 | 6 | n too small |
| 6 | Modal (VM) | 9.02 | 8.02 – 15.39 | 6 | n too small |
| 7 | Modal (gVisor) | 3.195 | 2.76 – 3.57 | 6 | n too small |
| 8 | E2B | 1.345 | 1.3 – 1.36 | 6 | n too small |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 173100 | 101000 – 184500 | 15 | — |
| 2 | Blaxel | 103000 | 97980 – 105500 | 15 | n too small |
| 3 | Modal (gVisor) | 71610 | 66850 – 77210 | 15 | n too small |
| 4 | Microsandbox Cloud | 58960 | 58560 – 60400 | 15 | n too small |
| 5 | Modal (VM) | 55620 | 43020 – 77470 | 15 | n too small |
| 6 | Novita | 53830 | 51350 – 71040 | 15 | n too small |
| 7 | E2B | 49240 | 47820 – 53160 | 15 | n too small |
| 8 | Namespace | 30890 | 29160 – 33040 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 172600 | 98160 – 184400 | 15 | — |
| 2 | Blaxel | 103400 | 98256 – 105300 | 15 | n too small |
| 3 | Modal (gVisor) | 72100 | 62540 – 76980 | 15 | n too small |
| 4 | Microsandbox Cloud | 58920 | 58500 – 60630 | 15 | n too small |
| 5 | Modal (VM) | 55060 | 43004 – 77530 | 15 | n too small |
| 6 | Novita | 53823 | 51260 – 72110 | 15 | n too small |
| 7 | E2B | 48870 | 48009 – 52610 | 15 | n too small |
| 8 | Namespace | 31010 | 29390 – 32740 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 190000 | 110100 – 220500 | 50 | — |
| 2 | Blaxel | 120343 | 118200 – 122100 | 55 | n too small |
| 3 | Modal (gVisor) | 94250 | 86860 – 107600 | 72 | n too small |
| 4 | Modal (VM) | 83780 | 68540 – 92540 | 50 | n too small |
| 5 | Microsandbox Cloud | 82450 | 82010 – 84010 | 55 | n too small |
| 6 | E2B | 74620 | 70090 – 77030 | 55 | n too small |
| 7 | Novita | 57740 | 57670 – 75290 | 35 | n too small |
| 8 | Namespace | 42140 | 40950 – 43220 | 47 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 164400 | 88860 – 177100 | 15 | — |
| 2 | Blaxel | 95150 | 89740 – 97760 | 15 | n too small |
| 3 | Modal (gVisor) | 61940 | 52200 – 65070 | 15 | n too small |
| 4 | Novita | 51650 | 49240 – 69875 | 15 | n too small |
| 5 | Microsandbox Cloud | 49440 | 48920 – 52410 | 15 | n too small |
| 6 | Modal (VM) | 47940 | 38640 – 71610 | 15 | n too small |
| 7 | E2B | 44870 | 42490 – 45710 | 15 | n too small |
| 8 | Namespace | 28250 | 26290 – 29860 | 15 | n too small |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 92112 | 85082 – 99830 | 6 | — |
| 2 | Daytona (VM) | 74670 | 53829 – 86528 | 6 | n too small |
| 3 | Modal (VM) | 69591 | 15878 – 75062 | 6 | n too small |
| 4 | Namespace | 69040 | 59293 – 70020 | 6 | n too small |
| 5 | E2B | 62818 | 49653 – 64614 | 6 | n too small |
| 6 | Microsandbox Cloud | 58210 | 49090 – 84595 | 6 | n too small |
| 7 | Novita | 50380 | 41631 – 153934 | 6 | n too small |
| 8 | Modal (gVisor) | 15299 | 13210 – 17961 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 120500 | 99420 – 152470 | 6 | — |
| 2 | Daytona (VM) | 85281 | 79743 – 101500 | 6 | n too small |
| 3 | Microsandbox Cloud | 65590 | 57745 – 90175 | 6 | n too small |
| 4 | Novita | 59280 | 36441 – 153206 | 6 | n too small |
| 5 | Namespace | 53015 | 46489 – 60563 | 6 | n too small |
| 6 | Modal (VM) | 52670 | 13747 – 73478 | 6 | n too small |
| 7 | E2B | 49220 | 47941 – 50265 | 6 | n too small |
| 8 | Modal (gVisor) | 13684 | 11924 – 14918 | 6 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace and Novita share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 6 | n too small, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 8 | Modal (gVisor) | 166 | 156 – 186 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Microsandbox Cloud leads · ~1.1× Modal (gVisor) on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 4942 | 4692 – 5192 | 6 | — |
| 2 | Modal (gVisor) | 4685 | 4340 – 9853 | 6 | n too small |
| 3 | Daytona (VM) | 4113 | 3377 – 7772 | 6 | n too small |
| 4 | Novita | 3546 | 2168 – 4690 | 6 | n too small |
| 5 | Modal (VM) | 1725 | 1407 – 1879 | 6 | n too small |
| 6 | E2B | 1131 | 946.4 – 4058 | 6 | n too small |
| 7 | Blaxel | 654.8 | 207.2 – 2239 | 6 | n too small |
| 8 | Namespace | 60.22 | 46.44 – 82.25 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Daytona (VM) leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 4723 | 4659 – 7965 | 6 | — |
| 2 | Modal (VM) | 3938 | 700.6 – 15850 | 6 | n too small |
| 3 | Novita | 3349 | 894.4 – 6610 | 6 | n too small |
| 4 | Namespace | 3297 | 3136 – 3385 | 6 | n too small |
| 5 | E2B | 1969 | 344.3 – 3653 | 6 | n too small |
| 6 | Microsandbox Cloud | 1857 | 1503 – 2258 | 6 | n too small |
| 7 | Blaxel | 1554 | 1174 – 1808 | 6 | n too small |
| 8 | Modal (gVisor) | 114.7 | 49.88 – 1763 | 6 | n too small |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 367 | 365 – 368 | 6 | — |
| 2 | Daytona (VM) | 404 | 401 – 414 | 6 | n too small |
| 3 | Blaxel | 474.5 | 472.5 – 481 | 6 | n too small |
| 4 | Novita | 483.5 | 479 – 487 | 6 | n too small |
| 5 | Microsandbox Cloud | 499 | 497 – 506 | 6 | n too small |
| 6 | Modal (VM) | 672.5 | 663 – 817 | 6 | n too small |
| 7 | E2B | 804 | 797 – 811 | 6 | n too small |
| 8 | Modal (gVisor) | 898 | 894 – 900 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 34.42 | 33.28 – 37.79 | 6 | — |
| 2 | Daytona (VM) | 36.32 | 36.14 – 36.77 | 6 | n too small |
| 3 | Blaxel | 42.39 | 42.08 – 43.42 | 6 | n too small |
| 4 | Novita | 44.52 | 43.95 – 44.99 | 6 | n too small |
| 5 | Modal (VM) | 47.52 | 47.21 – 63.2 | 6 | n too small |
| 6 | Microsandbox Cloud | 52.68 | 51.12 – 55.01 | 6 | n too small |
| 7 | E2B | 66.26 | 65.27 – 69.67 | 6 | n too small |
| 8 | Modal (gVisor) | 83.98 | 82.76 – 85.5 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 322100 | 309900 – 348200 | 6 | — |
| 2 | Daytona (VM) | 266600 | 259600 – 280500 | 6 | n too small |
| 3 | Microsandbox Cloud | 221100 | 185500 – 229200 | 6 | n too small |
| 4 | Novita | 220100 | 203100 – 260100 | 6 | n too small |
| 5 | Namespace | 208700 | 199100 – 307100 | 6 | n too small |
| 6 | Modal (VM) | 197500 | 194600 – 198400 | 6 | n too small |
| 7 | E2B | 172700 | 142000 – 211900 | 6 | n too small |
| 8 | Modal (gVisor) | 11060 | 10720 – 12060 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.1555 | 0.147 – 0.161 | 6 | — |
| 2 | Daytona (VM) | 0.1875 | 0.178 – 0.196 | 6 | n too small |
| 3 | Microsandbox Cloud | 0.2265 | 0.218 – 0.248 | 6 | n too small |
| 4 | Novita | 0.228 | 0.192 – 0.249 | 6 | n too small |
| 5 | Namespace | 0.24 | 0.163 – 0.251 | 6 | n too small |
| 6 | Modal (VM) | 0.2535 | 0.252 – 0.257 | 6 | n too small |
| 7 | E2B | 0.2895 | 0.232 – 0.352 | 6 | n too small |
| 8 | Modal (gVisor) | 4.521 | 4.146 – 4.663 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.3× Novita on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 24330 | 23040 – 25950 | 6 | — |
| 2 | Novita | 19250 | 17720 – 23170 | 6 | n too small |
| 3 | Microsandbox Cloud | 17110 | 15900 – 18040 | 6 | n too small |
| 4 | Namespace | 16320 | 12890 – 33450 | 6 | n too small |
| 5 | Daytona (VM) | 15330 | 14950 – 15890 | 6 | n too small |
| 6 | Modal (VM) | 13170 | 12750 – 14330 | 6 | n too small |
| 7 | E2B | 11740 | 9948 – 12990 | 6 | n too small |
| 8 | Modal (gVisor) | 1859 | 1846 – 2019 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Blaxel leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.055 | 1.926 – 2.17 | 6 | — |
| 2 | Novita | 2.6 | 2.17 – 2.826 | 6 | n too small |
| 3 | Microsandbox Cloud | 2.925 | 2.787 – 3.144 | 6 | n too small |
| 4 | Namespace | 3.068 | 1.495 – 4.27 | 6 | n too small |
| 5 | Daytona (VM) | 3.263 | 3.159 – 3.346 | 6 | n too small |
| 6 | Modal (VM) | 3.798 | 3.489 – 3.92 | 6 | n too small |
| 7 | E2B | 4.26 | 3.798 – 5.239 | 6 | n too small |
| 8 | Modal (gVisor) | 26.89 | 24.76 – 27.08 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Namespace is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 31.19 | 30.27 – 31.28 | 6 | — |
| 2 | Namespace | 33.63 | 33.2 – 58.75 | 6 | n too small |
| 3 | Blaxel | 37.7 | 37.39 – 39.15 | 6 | n too small |
| 4 | Novita | 40.81 | 39.82 – 42.56 | 6 | n too small |
| 5 | Microsandbox Cloud | 53.53 | 50.58 – 60.22 | 6 | n too small |
| 6 | Modal (VM) | 62.95 | 62.52 – 64.36 | 6 | n too small |
| 7 | E2B | 74.03 | 70.44 – 78.66 | 6 | n too small |
| 8 | Modal (gVisor) | 403.3 | 377.8 – 457.1 | 6 | n too small |

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

21 uncovered results across 8 providers (Blaxel 3, Daytona (VM) 3, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 4, Modal (VM) 2, Namespace 2, Novita 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_typecheck (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

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
Samples, so the test could not have separated the rows at any effect size (here 12 v 9 floors at p ≈ <0.001; 15 v 15 floors at p ≈ <0.001; 21 v 9 floors at p ≈ <0.001; 22 v 9 floors at p ≈ <0.001; 35 v 47 floors at p ≈ <0.001; 4 v 6 floors at p ≈ 0.0095; 45 v 21 floors at p ≈ <0.001; 45 v 45 floors at p ≈ <0.001; 50 v 55 floors at p ≈ <0.001; 55 v 35 floors at p ≈ <0.001; 55 v 55 floors at p ≈ <0.001; 55 v 72 floors at p ≈ <0.001; 6 v 4 floors at p ≈ 0.0095; 6 v 6 floors at p ≈ 0.0022; 72 v 50 floors at p ≈ <0.001; 9 v 12 floors at p ≈ <0.001; 9 v 22 floors at p ≈ <0.001).
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
| realworld | Mastra: cold install | Daytona (VM) | 0.12 (tied) | 0.32 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | 0.0018 | 0.0046 |
| realworld | Mastra: cold install | Namespace | 0.24 (tied) | 0.19 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.14 (tied) | 0.19 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | 0.76 (tied) | 0.99 |
| realworld | Better-Auth: build | Namespace | 0.38 (tied) | 0.43 |
| realworld | Better-Auth: build | Novita | 0.033 | 0.019 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.020 | <0.001 |
| realworld | Better-Auth: build | Modal (VM) | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: build | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.0056 | 0.019 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.089 (tied) | 0.0046 |
| realworld | Better-Auth: cold install | E2B | 0.033 | 0.066 |
| realworld | Better-Auth: cold install | Namespace | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.012 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | 0.76 (tied) | 0.79 |
| realworld | Better-Auth: git clone | E2B | 0.41 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Novita | 0.41 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Blaxel | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.80 (tied) | 0.79 |
| realworld | Better-Auth: git clone | Namespace | 0.48 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.58 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.44 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.0023 | 0.0046 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.020 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.47 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.55 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.59 (tied) | 0.79 |
| realworld | Better-Auth: lint deps (Knip) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | 0.024 | 0.0046 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | 0.16 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Blaxel | 0.047 | 0.066 |
| realworld | Better-Auth: lint format | Novita | 0.014 | 0.019 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.0059 | 0.0046 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.0014 | <0.001 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.22 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Blaxel | 0.046 | 0.19 |
| realworld | Better-Auth: lint packages | Novita | 0.0029 | 0.019 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.028 | 0.0046 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Blaxel | 0.20 (tied) | 0.019 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | 0.0045 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | 0.20 (tied) | 0.43 |
| realworld | Better-Auth: lint types | Namespace | 0.060 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Novita | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.10 (tied) | 0.0046 |
| realworld | Better-Auth: lint types | Modal (VM) | 0.67 (tied) | 0.066 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | — | — |
| realworld | Better-Auth: typecheck | Blaxel | 0.55 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Daytona (VM) | 0.59 (tied) | 0.99 |
| realworld | Better-Auth: typecheck | Novita | 0.039 | 0.19 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.98 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 0.55 (tied) | 0.79 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | 0.46 (tied) | 0.23 |
| realworld | Mastra: build:core | Blaxel | 0.18 (tied) | 0.028 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.0036 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.18 (tied) | 0.19 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Microsandbox Cloud | — | — |
| realworld | Mastra: git clone | Novita | 0.64 (tied) | 0.43 |
| realworld | Mastra: git clone | Daytona (VM) | 0.47 (tied) | 0.56 |
| realworld | Mastra: git clone | Blaxel | 0.87 (tied) | 0.43 |
| realworld | Mastra: git clone | Modal (VM) | 0.41 (tied) | 0.79 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.63 (tied) | 0.43 |
| realworld | Mastra: git clone | Namespace | 0.060 (tied) | 0.19 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Blaxel | 0.11 (tied) | 0.066 |
| realworld | Mastra: lint:format | Daytona (VM) | 0.54 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (VM) | 0.76 (tied) | 0.43 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | 0.0011 | 0.0046 |
| realworld | OpenClaw: cold install | Novita | 0.0023 | 0.0046 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.59 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.0045 | <0.001 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | 0.42 (tied) | 0.52 |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.44 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.51 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Namespace | 0.024 | 0.019 |
| realworld | OpenClaw: git clone | Blaxel | 1.0 (tied) | 0.99 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.60 (tied) | 0.64 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.25 (tied) | 0.33 |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | — | — |
| realworld | OpenClaw: lint (extension channels) | Blaxel | 0.24 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Novita | 0.10 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: lint (extension channels) | Namespace | 0.29 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | 0.0013 | 0.0015 |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | 0.010 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | 0.67 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.59 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 1.0 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | 0.0013 | 0.0015 |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | 0.74 (tied) | 0.46 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | 0.27 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.35 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.0056 | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.84 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.0033 | 0.0065 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | Blaxel | 0.68 (n too small) | 0.12 |
| cpu | Node.js web tooling | Daytona (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Novita | 0.035 (n too small) | 0.0083 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.56 (n too small) | 0.40 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | E2B | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.48 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.13 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.82 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.056 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.48 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.13 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.82 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.065 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.13 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.94 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.74 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.0043 (n too small) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.13 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.94 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.73 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.59 (n too small) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.59 (n too small) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.065 (n too small) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.24 (n too small) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.59 (n too small) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 1.0 (n too small) | 0.99 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.067 (n too small) | 0.030 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.24 (n too small) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.065 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.065 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.041 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.94 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.041 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.065 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.065 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.041 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.94 (n too small) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.041 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| disk | Hardlink throughput | Modal (VM) | 0.39 (n too small) | 0.077 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Modal (VM) | 0.14 (n too small) | 0.0047 |
| memory | STREAM Triad | Novita | 0.62 (n too small) | 0.051 |
| memory | STREAM Triad | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.0020 (n too small) | <0.001 |
| memory | STREAM Add | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Microsandbox Cloud | 0.0027 (n too small) | <0.001 |
| memory | STREAM Add | Modal (VM) | 0.13 (n too small) | 0.0011 |
| memory | STREAM Add | Novita | 0.51 (n too small) | 0.051 |
| memory | STREAM Add | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (VM) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.72 (n too small) | <0.001 |
| memory | STREAM Copy | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Novita | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.0020 (n too small) | <0.001 |
| memory | STREAM Scale | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Novita | 0.57 (n too small) | 0.14 |
| memory | STREAM Scale | Microsandbox Cloud | 0.019 (n too small) | 0.051 |
| memory | STREAM Scale | Modal (VM) | 0.15 (n too small) | 0.0047 |
| memory | STREAM Scale | E2B | 0.74 (n too small) | 0.017 |
| memory | STREAM Scale | Namespace | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | — | — |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.0043 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.24 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.94 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.13 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.94 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Novita | 0.70 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.0087 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.026 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.59 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.59 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 1.0 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.70 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Microsandbox Cloud | — | — |
| network | iperf3 WAN download | Modal (gVisor) | 0.48 (n too small) | 0.32 |
| network | iperf3 WAN download | Daytona (VM) | 0.13 (n too small) | 0.077 |
| network | iperf3 WAN download | Novita | 0.065 (n too small) | 0.077 |
| network | iperf3 WAN download | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | E2B | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.13 (n too small) | 0.077 |
| network | iperf3 WAN download | Namespace | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN upload | Daytona (VM) | — | — |
| network | iperf3 WAN upload | Modal (VM) | 0.24 (n too small) | 0.077 |
| network | iperf3 WAN upload | Novita | 1.0 (n too small) | 0.81 |
| network | iperf3 WAN upload | Namespace | 0.59 (n too small) | 0.81 |
| network | iperf3 WAN upload | E2B | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN upload | Microsandbox Cloud | 1.0 (n too small) | 0.32 |
| network | iperf3 WAN upload | Blaxel | 0.13 (n too small) | 0.32 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.026 (n too small) | 0.012 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.0065 (n too small) | 0.012 |
| system | PyBench | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | E2B | 0.37 (n too small) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.31 (n too small) | 0.077 |
| system | Git common operations | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Novita | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| system | Git common operations | E2B | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.70 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | Namespace | 0.82 (n too small) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | E2B | 0.39 (n too small) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.73 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.78 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.37 (n too small) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Blaxel | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.0043 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.026 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Namespace | 0.70 (n too small) | 0.32 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.59 (n too small) | 0.32 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | E2B | 0.026 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.0043 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.026 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.70 (n too small) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.59 (n too small) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.026 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Namespace | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Blaxel | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | Novita | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | E2B | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

