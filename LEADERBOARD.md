# Sandbox provider leaderboard

Run [`31009659726`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/31009659726) · commit [`398c60d74e0b29bcb2abfe61a8b8a6428185c00f`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/398c60d74e0b29bcb2abfe61a8b8a6428185c00f) ·
dataset [`data/dataset/runs/31009659726.json`](data/dataset/runs/31009659726.json) · generated 2026-08-05T14:19:54.384Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **470 metric records**
backed by **4660 retained trial observations**, across **46 metrics** and
**11 providers**; every emitted, catalogued metric has a ranked table below
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
| run.cloud | Firecracker microVM | vm |
| Runloop | microVM | vm |
| Vercel Sandbox | Firecracker microVM | vm |

_Not present in this run: Daytona (container), Microsandbox (local) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 10 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 10 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 9 environments, 2 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 36.36 | 35.83 – 36.71 | 12 | 12 | — |
| 2 | Daytona (VM) | 38.96 | 37.64 – 40.49 | 12 | 12 | — |
| 3 | Novita | 45.97 | 40.26 – 56.3 | 12 | 12 | — |
| 3 | Modal (VM) | 52.03 | 45.08 – 55.21 | 12 | 12 | tied |
| 3 | Namespace | 56.81 | 49.91 – 61.72 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 58.1 | 56.25 – 64.09 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 61.09 | 54.89 – 73.99 | 12 | 12 | tied |
| 3 | run.cloud | 62.06 | 58.31 – 83.65 | 12 | 12 | tied |
| 3 | E2B | 68.33 | 64.76 – 72.36 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 94.79 | 88.28 – 101.3 | 11 | 11 | — |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 56.51 | 53.95 – 57.75 | 12 | 12 | — |
| 1 | Blaxel | 58.18 | 57.02 – 58.55 | 12 | 12 | tied |
| 3 | Novita | 70.46 | 65.14 – 74.46 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 73.06 | 71.65 – 77.27 | 12 | 12 | tied |
| 3 | Modal (VM) | 78.44 | 74.17 – 88.4 | 12 | 12 | tied |
| 3 | run.cloud | 94.59 | 68.08 – 99.96 | 11 | 11 | tied |
| 3 | Namespace | 96.65 | 65.84 – 101.9 | 12 | 12 | tied |
| 3 | E2B | 100.1 | 98.08 – 101.4 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 106 | 90.53 – 120.6 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 137 | 134.2 – 139.9 | 12 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.88 | 11.68 – 12.01 | 12 | 12 | — |
| 2 | Daytona (VM) | 12.51 | 12.18 – 13.37 | 12 | 12 | — |
| 2 | Novita | 13.32 | 13.02 – 13.62 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 17.44 | 16.26 – 18.22 | 12 | 12 | — |
| 4 | run.cloud | 17.65 | 14.67 – 18.74 | 11 | 11 | tied |
| 6 | E2B | 19.69 | 19.3 – 19.99 | 12 | 12 | — |
| 6 | Modal (VM) | 20.24 | 19.1 – 22.29 | 12 | 12 | tied |
| 6 | Vercel Sandbox | 23.81 | 20.39 – 26.18 | 12 | 12 | tied |
| 9 | Namespace | 33.2 | 28.52 – 38.02 | 12 | 12 | — |
| 9 | Modal (gVisor) | 34.95 | 34.24 – 35.78 | 12 | 12 | tied |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.64 | 0.637 – 0.8335 | 12 | 12 | — |
| 2 | Modal (VM) | 0.8875 | 0.7835 – 1.198 | 12 | 12 | — |
| 2 | Vercel Sandbox | 0.9355 | 0.852 – 1.035 | 12 | 12 | tied |
| 4 | E2B | 1.486 | 1.42 – 2.095 | 12 | 12 | — |
| 4 | Daytona (VM) | 1.532 | 1.378 – 1.668 | 12 | 12 | tied |
| 4 | Namespace | 1.651 | 1.047 – 2.166 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 1.692 | 1.591 – 1.951 | 12 | 12 | tied |
| 4 | Novita | 1.802 | 1.655 – 1.965 | 12 | 12 | tied |
| 4 | run.cloud | 1.963 | 1.874 – 2.377 | 11 | 11 | tied |
| 10 | Modal (gVisor) | 2.417 | 2.359 – 2.545 | 12 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 3.048 | 3.014 – 3.192 | 12 | 12 | — |
| 2 | Blaxel | 3.221 | 3.192 – 3.248 | 12 | 12 | — |
| 3 | Novita | 3.661 | 3.414 – 3.882 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 4.07 | 4.035 – 4.113 | 12 | 12 | — |
| 4 | run.cloud | 4.158 | 3.232 – 4.898 | 11 | 11 | tied |
| 4 | Namespace | 4.292 | 3.25 – 4.63 | 12 | 12 | tied |
| 4 | Modal (VM) | 4.325 | 4.139 – 4.679 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 4.958 | 4.316 – 5.609 | 12 | 12 | — |
| 8 | E2B | 5.292 | 5.178 – 5.457 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 10.66 | 10.38 – 11.38 | 12 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 9.894 | 9.81 – 10.29 | 12 | 12 | — |
| 1 | Blaxel | 10.25 | 10 – 10.37 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 11.88 | 11.56 – 12.25 | 12 | 12 | — |
| 3 | Novita | 12.07 | 11.54 – 12.65 | 12 | 12 | tied |
| 3 | Namespace | 12.93 | 10.58 – 16.1 | 12 | 12 | tied |
| 3 | Modal (VM) | 14.13 | 13.63 – 15.11 | 12 | 12 | tied |
| 3 | run.cloud | 15 | 11.56 – 16.04 | 11 | 11 | tied |
| 3 | Vercel Sandbox | 17.52 | 14.69 – 20.33 | 12 | 12 | tied |
| 3 | E2B | 19.3 | 18.99 – 19.73 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 28.73 | 28.23 – 29.33 | 12 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.803 | 2.689 – 2.927 | 12 | 12 | — |
| 2 | Blaxel | 2.922 | 2.897 – 3.018 | 12 | 12 | — |
| 3 | Novita | 3.247 | 3.119 – 3.347 | 12 | 12 | — |
| 3 | Microsandbox Cloud | 3.386 | 3.306 – 3.446 | 12 | 12 | tied |
| 3 | Namespace | 3.899 | 2.816 – 4.261 | 12 | 12 | tied |
| 3 | Modal (VM) | 4.108 | 3.809 – 4.744 | 12 | 12 | tied |
| 3 | run.cloud | 4.257 | 2.937 – 4.567 | 11 | 11 | tied |
| 3 | Vercel Sandbox | 5.08 | 4.379 – 5.883 | 12 | 12 | tied |
| 3 | E2B | 5.601 | 5.399 – 5.758 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 7.234 | 7.054 – 7.313 | 12 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.435 | 2.425 – 2.481 | 12 | 12 | — |
| 1 | Daytona (VM) | 2.456 | 2.345 – 2.532 | 12 | 12 | tied |
| 3 | Novita | 2.87 | 2.655 – 3.258 | 12 | 12 | — |
| 3 | Namespace | 3.179 | 2.978 – 3.504 | 12 | 12 | tied |
| 3 | run.cloud | 3.349 | 2.622 – 3.998 | 11 | 11 | tied |
| 3 | Microsandbox Cloud | 3.354 | 3.276 – 3.433 | 12 | 12 | tied |
| 3 | Modal (VM) | 3.469 | 3.274 – 3.74 | 12 | 12 | tied |
| 8 | Vercel Sandbox | 4.23 | 3.664 – 4.717 | 12 | 12 | — |
| 8 | E2B | 4.28 | 4.19 – 4.348 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 10.8 | 10.4 – 10.99 | 12 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 6.849 | 6.668 – 7.469 | 12 | 12 | — |
| 1 | Blaxel | 6.89 | 6.764 – 6.92 | 12 | 12 | tied |
| 3 | Novita | 7.975 | 7.801 – 8.212 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 9.689 | 9.259 – 9.969 | 12 | 12 | — |
| 4 | Modal (VM) | 10.1 | 9.241 – 11.39 | 12 | 12 | tied |
| 4 | Namespace | 10.28 | 8.04 – 10.66 | 12 | 12 | tied |
| 4 | run.cloud | 10.65 | 7.393 – 11.48 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 13.05 | 11.1 – 14.85 | 12 | 12 | — |
| 8 | E2B | 13.22 | 13 – 13.94 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 15.68 | 15.33 – 16.06 | 12 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.41 | 23.77 – 25.66 | 12 | 12 | — |
| 2 | Blaxel | 27.31 | 25.95 – 27.77 | 12 | 12 | — |
| 3 | Novita | 32.32 | 30.43 – 33.79 | 12 | 12 | — |
| 4 | Modal (VM) | 37.26 | 35.45 – 43.13 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 39.04 | 37.75 – 39.5 | 12 | 12 | tied |
| 4 | run.cloud | 40.42 | 35.15 – 49.71 | 11 | 11 | tied |
| 4 | Namespace | 47.78 | 41.15 – 51.93 | 12 | 12 | tied |
| 4 | E2B | 50.3 | 48.72 – 52.03 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 51.09 | 43.49 – 58.29 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 104 | 102 – 107.5 | 12 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.05 | 38.29 – 40.9 | 12 | 12 | — |
| 2 | Blaxel | 40.04 | 39.28 – 42 | 12 | 12 | — |
| 3 | Novita | 45.54 | 44.27 – 47.51 | 12 | 12 | — |
| 3 | Namespace | 50.1 | 39.18 – 61.53 | 12 | 12 | tied |
| 3 | Modal (VM) | 55.5 | 52 – 63.21 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 57.89 | 56.99 – 59.94 | 12 | 12 | tied |
| 3 | run.cloud | 65.74 | 46.36 – 71.23 | 11 | 11 | tied |
| 8 | E2B | 73.48 | 71.83 – 73.99 | 12 | 12 | — |
| 8 | Vercel Sandbox | 78.17 | 66.74 – 89.04 | 12 | 12 | tied |
| 8 | Modal (gVisor) | 78.27 | 76.94 – 80.97 | 12 | 12 | tied |

### Mastra: build:core

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 65.37 | 59.74 – 71.78 | 12 | 12 | — |
| 1 | Daytona (VM) | 69.39 | 68.8 – 71.55 | 12 | 12 | tied |
| 1 | Blaxel | 70 | 69.33 – 71.46 | 12 | 12 | tied |
| 4 | Novita | 82.15 | 75.5 – 100.3 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 89.29 | 85.07 – 90.62 | 12 | 12 | tied |
| 4 | Modal (VM) | 92.84 | 76.25 – 97.45 | 12 | 12 | tied |
| 7 | run.cloud | 108.2 | 107.1 – 113.9 | 12 | 12 | — |
| 8 | Vercel Sandbox | 115.6 | 112.3 – 159.3 | 12 | 12 | — |
| 8 | E2B | 129.7 | 123.6 – 132.7 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 170.4 | 161.9 – 174.5 | 11 | 11 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.24 | 2.152 – 2.344 | 12 | 12 | — |
| 2 | Daytona (VM) | 2.44 | 2.369 – 2.768 | 12 | 12 | — |
| 2 | Modal (VM) | 2.598 | 2.034 – 3.539 | 12 | 12 | tied |
| 4 | Vercel Sandbox | 3.063 | 2.954 – 31.02 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 3.159 | 3.016 – 3.322 | 12 | 12 | tied |
| 6 | E2B | 3.434 | 3.25 – 3.765 | 12 | 12 | — |
| 6 | Novita | 3.496 | 3.192 – 3.957 | 12 | 12 | tied |
| 6 | run.cloud | 3.694 | 3.392 – 4.271 | 12 | 12 | tied |
| 6 | Namespace | 4.227 | 3.955 – 4.648 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 6.242 | 5.722 – 7.157 | 11 | 11 | — |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 75.44 | 71.09 – 78.04 | 12 | 12 | — |
| 2 | Daytona (VM) | 85.08 | 84.26 – 91.19 | 12 | 12 | — |
| 2 | Blaxel | 86.45 | 85.38 – 88.11 | 12 | 12 | tied |
| 4 | Novita | 98.96 | 94.1 – 124.3 | 12 | 12 | — |
| 4 | Microsandbox Cloud | 106.4 | 105.4 – 110 | 12 | 12 | tied |
| 4 | Modal (VM) | 116.3 | 100.3 – 121.7 | 12 | 12 | tied |
| 7 | Vercel Sandbox | 143.8 | 138.5 – 197.1 | 12 | 12 | — |
| 7 | run.cloud | 148.4 | 141.4 – 152.2 | 12 | 12 | tied |
| 9 | E2B | 163 | 157.5 – 166.6 | 12 | 12 | — |
| 10 | Modal (gVisor) | 197.8 | 186.1 – 217.7 | 11 | 11 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.92 | 11.78 – 12.24 | 12 | 12 | — |
| 2 | Daytona (VM) | 13.57 | 12.9 – 13.79 | 12 | 12 | — |
| 3 | Novita | 16.11 | 15.72 – 29.94 | 12 | 12 | — |
| 3 | Modal (VM) | 18.71 | 15.11 – 19.34 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 18.8 | 17.78 – 19.49 | 12 | 12 | tied |
| 3 | Namespace | 19.61 | 18.54 – 21.27 | 12 | 12 | tied |
| 3 | run.cloud | 19.9 | 19.45 – 20.28 | 11 | 11 | tied |
| 3 | E2B | 20.09 | 19.83 – 21.26 | 12 | 12 | tied |
| 3 | Vercel Sandbox | 22.79 | 20.21 – 23.89 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 28.75 | 27.54 – 30.66 | 12 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.421 | 2.385 – 2.446 | 12 | 12 | — |
| 2 | Daytona (VM) | 3.221 | 3.153 – 5.216 | 12 | 12 | — |
| 2 | Modal (VM) | 3.29 | 3.071 – 4 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 4.076 | 3.954 – 4.149 | 12 | 12 | — |
| 4 | Novita | 4.13 | 3.87 – 4.536 | 12 | 12 | tied |
| 6 | run.cloud | 4.498 | 4.25 – 4.849 | 11 | 11 | — |
| 6 | Vercel Sandbox | 4.517 | 4.024 – 4.683 | 12 | 12 | tied |
| 8 | E2B | 4.788 | 4.601 – 7.012 | 12 | 12 | — |
| 9 | Namespace | 6.807 | 6.223 – 8.883 | 12 | 12 | — |
| 10 | Modal (gVisor) | 9.791 | 9.347 – 10.48 | 12 | 12 | — |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Blaxel, Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 60.05 | 58.64 – 62.27 | 12 | 12 | — |
| 1 | Namespace | 61.52 | 56.56 – 67.66 | 12 | 12 | tied |
| 1 | Daytona (VM) | 61.73 | 60.22 – 63.21 | 12 | 12 | tied |
| 4 | Novita | 68.33 | 67.59 – 71.47 | 12 | 12 | — |
| 4 | Modal (VM) | 77.32 | 63.98 – 81.59 | 12 | 12 | tied |
| 4 | Microsandbox Cloud | 79.91 | 77.07 – 80.68 | 12 | 12 | tied |
| 7 | run.cloud | 92.91 | 91.04 – 102.2 | 11 | 11 | — |
| 8 | E2B | 110.2 | 106.5 – 115.4 | 12 | 12 | — |
| 8 | Vercel Sandbox | 126.4 | 97.49 – 128.1 | 12 | 12 | tied |
| 10 | Modal (gVisor) | 151.5 | 125.8 – 167 | 12 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 95.44 | 88.23 – 106.5 | 12 | 12 | — |
| 1 | Daytona (VM) | 97.3 | 93.99 – 100 | 12 | 12 | tied |
| 3 | Modal (VM) | 119.1 | 104.3 – 131.1 | 12 | 12 | — |
| 3 | Novita | 128.2 | 126.3 – 133.1 | 12 | 12 | tied |
| 3 | Microsandbox Cloud | 128.5 | 126.4 – 130.8 | 12 | 12 | tied |
| 6 | run.cloud | 150.8 | 145.7 – 155.1 | 11 | 11 | — |
| 7 | E2B | 183.9 | 181.1 – 187.9 | 12 | 12 | — |
| 7 | Vercel Sandbox | 192.5 | 151.5 – 197.3 | 12 | 12 | tied |
| 9 | Modal (gVisor) | 306.3 | 262.7 – 339.8 | 12 | 12 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 15.11 | 14.03 – 16.62 | 12 | 12 | — |
| 2 | Blaxel | 16.7 | 16.47 – 16.98 | 12 | 12 | — |
| 2 | Daytona (VM) | 17.54 | 16.55 – 18.32 | 12 | 12 | tied |
| 4 | Modal (VM) | 21.15 | 19.17 – 22.87 | 12 | 12 | — |
| 5 | Microsandbox Cloud | 23.17 | 22.55 – 25.13 | 12 | 12 | — |
| 5 | Novita | 24.74 | 23.08 – 27.37 | 12 | 12 | tied |
| 5 | run.cloud | 26.19 | 23.68 – 26.69 | 11 | 11 | tied |
| 8 | Vercel Sandbox | 33.94 | 26.42 – 35.48 | 12 | 12 | — |
| 9 | E2B | 36.67 | 35.44 – 37.27 | 12 | 12 | — |
| 10 | Modal (gVisor) | 59.56 | 36.84 – 78.52 | 12 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 20.87 | 19.22 – 21.7 | 3 | 9 | — |
| 2 | Blaxel | 19.64 | 19.4 – 21.28 | 3 | 9 | too few sandboxes |
| 3 | Microsandbox Cloud | 18.69 | 18.05 – 19.02 | 3 | 27 | too few sandboxes |
| 4 | Novita | 17.68 | 14.79 – 17.92 | 3 | 9 | too few sandboxes |
| 5 | Modal (VM) | 15.22 | 14.59 – 19.59 | 3 | 10 | too few sandboxes |
| 6 | Namespace | 14.76 | 14 – 15.3 | 3 | 40 | too few sandboxes |
| 7 | Vercel Sandbox | 13.19 | 9.31 – 13.43 | 3 | 9 | too few sandboxes |
| 8 | run.cloud | 12.26 | 12.22 – 12.42 | 3 | 9 | too few sandboxes |
| 9 | E2B | 11.4 | 11.33 – 11.61 | 3 | 18 | too few sandboxes |
| 10 | Modal (gVisor) | 9.63 | 9.26 – 9.92 | 3 | 33 | too few sandboxes |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 301500 | 239000 – 322000 | 3 | 6 | — |
| 2 | Modal (VM) | 259500 | 197500 – 287500 | 3 | 6 | too few sandboxes |
| 3 | run.cloud | 257500 | 132500 – 259500 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 248500 | 225500 – 275000 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 237500 | 220000 – 266500 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 210500 | 207000 – 213500 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 209000 | 206500 – 237500 | 3 | 6 | too few sandboxes |
| 8 | Novita | 159500 | 69450 – 165500 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 138500 | 133650 – 143000 | 3 | 6 | too few sandboxes |
| 10 | E2B | 47350 | 46800 – 57100 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 34850 | 30250 – 200000 | 3 | 6 | too few sandboxes |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1178 | 933.5 – 1257 | 3 | 6 | — |
| 2 | Modal (VM) | 1014 | 769.5 – 1123 | 3 | 6 | too few sandboxes |
| 3 | run.cloud | 1006 | 517 – 1012 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 971.5 | 882.5 – 1075 | 3 | 6 | too few sandboxes |
| 5 | Blaxel | 928.5 | 860.5 – 1040 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 823 | 809 – 835.5 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 816.5 | 807.5 – 927.5 | 3 | 6 | too few sandboxes |
| 8 | Novita | 623.5 | 271.5 – 647 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 542.5 | 522 – 559.5 | 3 | 6 | too few sandboxes |
| 10 | E2B | 185 | 183 – 223 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 136 | 118.5 – 780 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.2× run.cloud on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 278000 | 213000 – 286000 | 3 | 6 | — |
| 2 | run.cloud | 232500 | 118000 – 258000 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 227000 | 227000 – 230000 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 223000 | 211000 – 311000 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 221500 | 196000 – 234500 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 209000 | 205500 – 216000 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 204000 | 190500 – 205500 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 183000 | 183000 – 185500 | 3 | 6 | too few sandboxes |
| 9 | Novita | 164000 | 68100 – 165500 | 3 | 6 | too few sandboxes |
| 10 | E2B | 50000 | 48900 – 58450 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 26400 | 25250 – 216500 | 3 | 6 | too few sandboxes |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.2× run.cloud on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1084 | 831 – 1118 | 3 | 6 | — |
| 2 | run.cloud | 908 | 461.5 – 1007 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 887.5 | 886.5 – 897.5 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 871.5 | 825.5 – 1215 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 865 | 764 – 916 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 815.5 | 803 – 843 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 798 | 744.5 – 803 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 715.5 | 714 – 724 | 3 | 6 | too few sandboxes |
| 9 | Novita | 639.5 | 266 – 647.5 | 3 | 6 | too few sandboxes |
| 10 | E2B | 195 | 191 – 228.5 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 103 | 98.7 – 846.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 22750 | 17100 – 24400 | 3 | 6 | — |
| 2 | Daytona (VM) | 10450 | 7792 – 11150 | 3 | 6 | too few sandboxes |
| 3 | Novita | 9652 | 8390 – 10400 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 8332 | 7015 – 9357 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 8243 | 7249 – 8908 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 6146 | 5750 – 8476 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3700 | 3573 – 3845 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 2476 | 2227 – 5051 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 2238 | 2230 – 2834 | 3 | 6 | too few sandboxes |
| 10 | Modal (VM) | 1985 | 1962 – 3650 | 3 | 6 | too few sandboxes |
| 11 | E2B | 599 | 599 – 599.5 | 3 | 6 | too few sandboxes |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 9023 | 8392 – 9654 | 2 | 4 | — |
| 2 | Blaxel | 8334 | 7016 – 9358 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 8245 | 7250 – 8909 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 7794 | 6876 – 8711 | 1 | 2 | too few sandboxes |
| 5 | run.cloud | 6147 | 5752 – 6454 | 3 | 5 | too few sandboxes |
| 6 | Vercel Sandbox | 3701 | 3574 – 3847 | 3 | 6 | too few sandboxes |
| 7 | Runloop | 2477 | 2229 – 5052 | 3 | 6 | too few sandboxes |
| 8 | Namespace | 2240 | 2231 – 2836 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1987 | 1963 – 3652 | 3 | 6 | too few sandboxes |
| 10 | E2B | 601 | 600.5 – 601 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 5909 | 4704 – 6737 | 3 | 6 | — |
| 2 | Blaxel | 5826 | 5328 – 6086 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4281 | 3855 – 4513 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4184 | 3526 – 6067 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 3723 | 2877 – 5872 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3086 | 2217 – 3889 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 2810 | 2375 – 2911 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 2580 | 2393 – 3501 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1577 | 1379 – 1686 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1453 | 1384 – 2145 | 3 | 6 | too few sandboxes |
| 11 | E2B | 600 | 599 – 603.5 | 3 | 6 | too few sandboxes |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 5910 | 4706 – 6738 | 3 | 6 | — |
| 2 | Blaxel | 5827 | 5329 – 6087 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 4283 | 3856 – 4514 | 3 | 6 | too few sandboxes |
| 4 | Novita | 4186 | 3528 – 6068 | 3 | 6 | too few sandboxes |
| 5 | Modal (gVisor) | 3724 | 2878 – 5874 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3087 | 2218 – 3890 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 2811 | 2376 – 2913 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 2581 | 2395 – 3503 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 1579 | 1381 – 1687 | 3 | 6 | too few sandboxes |
| 10 | Namespace | 1455 | 1386 – 2147 | 3 | 6 | too few sandboxes |
| 11 | E2B | 601 | 600.5 – 605 | 3 | 6 | too few sandboxes |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.09 | 23.05 – 23.34 | 3 | 6 | — |
| 2 | Blaxel | 20.13 | 20.09 – 20.2 | 3 | 6 | too few sandboxes |
| 3 | Runloop | 18.16 | 17.88 – 18.22 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 15.71 | 8.22 – 29.3 | 3 | 6 | too few sandboxes |
| 5 | run.cloud | 11.55 | 5.59 – 11.97 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 9.74 | 9.205 – 9.755 | 3 | 6 | too few sandboxes |
| 7 | Novita | 9.31 | 9.24 – 11.93 | 3 | 6 | too few sandboxes |
| 8 | Vercel Sandbox | 8.17 | 8.135 – 8.24 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 5.175 | 5.075 – 5.175 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 3.55 | 3.11 – 5.01 | 3 | 6 | too few sandboxes |
| 11 | E2B | 1.4 | 1.38 – 1.415 | 3 | 6 | too few sandboxes |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 147100 | 111700 – 148200 | 3 | 15 | — |
| 2 | Daytona (VM) | 108500 | 72820 – 184200 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 107900 | 67780 – 125100 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 72280 | 67940 – 72670 | 3 | 15 | too few sandboxes |
| 5 | Microsandbox Cloud | 58300 | 57730 – 58440 | 3 | 15 | too few sandboxes |
| 6 | Vercel Sandbox | 53990 | 53710 – 54050 | 3 | 15 | too few sandboxes |
| 7 | Novita | 51270 | 42970 – 86280 | 3 | 15 | too few sandboxes |
| 8 | E2B | 47350 | 44310 – 50224 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 31500 | 30760 – 32310 | 3 | 15 | too few sandboxes |
| 10 | run.cloud | 25900 | 25822 – 32770 | 3 | 15 | too few sandboxes |

### STREAM Add

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 146700 | 116966 – 148000 | 3 | 15 | — |
| 2 | Daytona (VM) | 108500 | 73540 – 184100 | 3 | 15 | too few sandboxes |
| 3 | Modal (VM) | 107800 | 66620 – 122846 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 71280 | 68990 – 72420 | 3 | 15 | too few sandboxes |
| 5 | Microsandbox Cloud | 58110 | 58010 – 58960 | 3 | 15 | too few sandboxes |
| 6 | Vercel Sandbox | 53660 | 53520 – 53910 | 3 | 15 | too few sandboxes |
| 7 | Novita | 51250 | 43010 – 86684 | 3 | 15 | too few sandboxes |
| 8 | E2B | 47097 | 44010 – 50390 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 31930 | 31918 – 32680 | 3 | 15 | too few sandboxes |
| 10 | run.cloud | 26150 | 25890 – 32830 | 3 | 15 | too few sandboxes |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 161638 | 134600 – 162100 | 3 | 15 | — |
| 2 | Daytona (VM) | 114300 | 99330 – 216700 | 3 | 55 | too few sandboxes |
| 3 | Modal (VM) | 112600 | 80770 – 113300 | 3 | 75 | too few sandboxes |
| 4 | Modal (gVisor) | 91440 | 89130 – 91650 | 3 | 66 | too few sandboxes |
| 5 | Vercel Sandbox | 84471 | 82670 – 84670 | 3 | 17 | too few sandboxes |
| 6 | Microsandbox Cloud | 81990 | 80450 – 84150 | 3 | 36 | too few sandboxes |
| 7 | E2B | 75390 | 66860 – 78230 | 3 | 53 | too few sandboxes |
| 8 | Novita | 56870 | 52230 – 57630 | 3 | 50 | too few sandboxes |
| 9 | Namespace | 43100 | 42130 – 43190 | 3 | 38 | too few sandboxes |
| 10 | run.cloud | 37090 | 37000 – 44150 | 3 | 39 | too few sandboxes |

### STREAM Scale

MB/s · higher is better

_Blaxel leads · ~1.3× Modal (VM) on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 138500 | 106044 – 140100 | 3 | 15 | — |
| 2 | Modal (VM) | 103000 | 64820 – 127600 | 3 | 15 | too few sandboxes |
| 3 | Daytona (VM) | 100000 | 66010 – 176400 | 3 | 15 | too few sandboxes |
| 4 | Modal (gVisor) | 57170 | 55280 – 59400 | 3 | 15 | too few sandboxes |
| 5 | Microsandbox Cloud | 49430 | 48160 – 50094 | 3 | 15 | too few sandboxes |
| 6 | Novita | 49120 | 42720 – 80450 | 3 | 15 | too few sandboxes |
| 7 | Vercel Sandbox | 46190 | 46120 – 46300 | 3 | 15 | too few sandboxes |
| 8 | E2B | 40620 | 39880 – 43160 | 3 | 15 | too few sandboxes |
| 9 | Namespace | 29300 | 28410 – 29520 | 3 | 15 | too few sandboxes |
| 10 | run.cloud | 23380 | 23130 – 29820 | 3 | 15 | too few sandboxes |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 154228 | 124700 – 154725 | 3 | 6 | — |
| 2 | Blaxel | 100100 | 96532 – 116102 | 3 | 6 | too few sandboxes |
| 3 | Modal (VM) | 74271 | 13934 – 94630 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 73150 | 72880 – 96438 | 3 | 6 | too few sandboxes |
| 5 | E2B | 64130 | 59610 – 66270 | 3 | 6 | too few sandboxes |
| 6 | Vercel Sandbox | 63560 | 48934 – 71488 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 61480 | 44570 – 62490 | 3 | 6 | too few sandboxes |
| 8 | Microsandbox Cloud | 61420 | 47310 – 82168 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 57000 | 56155 – 62960 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 53870 | 49247 – 54135 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 16156 | 13945 – 16246 | 3 | 6 | too few sandboxes |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 154745 | 113400 – 156200 | 3 | 6 | — |
| 2 | Blaxel | 121440 | 112400 – 148900 | 3 | 6 | too few sandboxes |
| 3 | Daytona (VM) | 83475 | 72369 – 95303 | 3 | 6 | too few sandboxes |
| 4 | Modal (VM) | 77180 | 28040 – 94830 | 3 | 6 | too few sandboxes |
| 5 | Vercel Sandbox | 66580 | 44620 – 71240 | 3 | 6 | too few sandboxes |
| 6 | Microsandbox Cloud | 64899 | 58910 – 92386 | 3 | 6 | too few sandboxes |
| 7 | E2B | 56440 | 54269 – 60780 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 55900 | 55000 – 68620 | 3 | 6 | too few sandboxes |
| 9 | Namespace | 52000 | 31560 – 62050 | 3 | 6 | too few sandboxes |
| 10 | Runloop | 48227 | 47344 – 48736 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 14514 | 12930 – 14530 | 3 | 6 | too few sandboxes |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Microsandbox Cloud, Modal (VM), Namespace, Novita, run.cloud, Runloop and Vercel Sandbox share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 3 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Microsandbox Cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 10000 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Namespace | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | run.cloud | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Runloop | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 1 | Vercel Sandbox | 9999 | 9999 – 9999 | 3 | 6 | too few sandboxes, equal medians |
| 11 | Modal (gVisor) | 181.5 | 177 – 191 | 3 | 6 | too few sandboxes |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.3× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 5803 | 4609 – 8093 | 3 | 6 | — |
| 2 | Novita | 4335 | 3688 – 4972 | 3 | 6 | too few sandboxes |
| 3 | Microsandbox Cloud | 4269 | 4233 – 4524 | 3 | 6 | too few sandboxes |
| 4 | Daytona (VM) | 3531 | 2568 – 3997 | 3 | 6 | too few sandboxes |
| 5 | E2B | 3137 | 3100 – 3760 | 3 | 6 | too few sandboxes |
| 6 | Runloop | 2271 | 2237 – 2285 | 3 | 6 | too few sandboxes |
| 7 | Namespace | 2181 | 1618 – 4154 | 3 | 6 | too few sandboxes |
| 8 | Blaxel | 2021 | 1728 – 2435 | 3 | 6 | too few sandboxes |
| 9 | Modal (VM) | 1749 | 1229 – 2025 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 937.1 | 277.7 – 1801 | 3 | 6 | too few sandboxes |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.5× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5717 | 4448 – 8594 | 3 | 6 | — |
| 2 | Daytona (VM) | 3941 | 2166 – 4693 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 3464 | 3257 – 5826 | 3 | 6 | too few sandboxes |
| 4 | Novita | 3461 | 1104 – 4034 | 3 | 6 | too few sandboxes |
| 5 | E2B | 3048 | 2909 – 3276 | 3 | 6 | too few sandboxes |
| 6 | Blaxel | 2000 | 1970 – 2163 | 3 | 6 | too few sandboxes |
| 7 | Microsandbox Cloud | 1662 | 1323 – 1708 | 3 | 6 | too few sandboxes |
| 8 | Runloop | 1421 | 1377 – 1443 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 935.2 | 935.2 – 1102 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 154.6 | 145.4 – 174 | 3 | 6 | too few sandboxes |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 365 | 364 – 369 | 3 | 6 | — |
| 2 | Daytona (VM) | 442.5 | 438.5 – 445.5 | 3 | 6 | too few sandboxes |
| 3 | Novita | 481 | 478.5 – 680 | 3 | 6 | too few sandboxes |
| 4 | Blaxel | 485 | 475 – 492 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 502.5 | 497 – 502.5 | 3 | 6 | too few sandboxes |
| 6 | E2B | 748 | 650.5 – 811 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 764.5 | 764 – 1176 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 816.5 | 480.5 – 816.5 | 3 | 6 | too few sandboxes |
| 9 | run.cloud | 832 | 831.5 – 835 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 907.5 | 901.5 – 910 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 1175 | 1175 – 1179 | 3 | 6 | too few sandboxes |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Namespace | 34.55 | 32.9 – 37.5 | 3 | 6 | — |
| 2 | Daytona (VM) | 39.43 | 39.19 – 40.35 | 3 | 6 | too few sandboxes |
| 3 | Blaxel | 41.89 | 41.31 – 41.99 | 3 | 6 | too few sandboxes |
| 4 | Novita | 44.8 | 43.73 – 50.15 | 3 | 6 | too few sandboxes |
| 5 | Microsandbox Cloud | 51.5 | 50.15 – 53.28 | 3 | 6 | too few sandboxes |
| 6 | run.cloud | 52.19 | 52.15 – 54.31 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 61.03 | 60.59 – 82.74 | 3 | 6 | too few sandboxes |
| 8 | Modal (VM) | 63.79 | 42.26 – 68.01 | 3 | 6 | too few sandboxes |
| 9 | E2B | 67.09 | 66.16 – 72.35 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 80.92 | 80.23 – 85.43 | 3 | 6 | too few sandboxes |
| 11 | Runloop | 82.8 | 80.34 – 83.05 | 3 | 6 | too few sandboxes |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 336900 | 319700 – 357100 | 3 | 6 | — |
| 2 | Daytona (VM) | 280600 | 276500 – 296300 | 3 | 6 | too few sandboxes |
| 3 | Novita | 253800 | 210500 – 284700 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 222000 | 201900 – 224000 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 214900 | 209400 – 220000 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 194600 | 187500 – 199800 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 184800 | 182200 – 236800 | 3 | 6 | too few sandboxes |
| 8 | E2B | 171200 | 170500 – 173000 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 127400 | 124100 – 171000 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 11880 | 11270 – 11890 | 3 | 6 | too few sandboxes |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.1485 | 0.14 – 0.1565 | 3 | 6 | — |
| 2 | Daytona (VM) | 0.1785 | 0.169 – 0.181 | 3 | 6 | too few sandboxes |
| 3 | Novita | 0.1975 | 0.1755 – 0.2375 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 0.2255 | 0.223 – 0.2485 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 0.2325 | 0.2275 – 0.24 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 0.257 | 0.2505 – 0.2665 | 3 | 6 | too few sandboxes |
| 7 | run.cloud | 0.2705 | 0.211 – 0.274 | 3 | 6 | too few sandboxes |
| 8 | E2B | 0.292 | 0.289 – 0.2935 | 3 | 6 | too few sandboxes |
| 9 | Vercel Sandbox | 0.3925 | 0.2925 – 0.403 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 4.216 | 4.206 – 4.44 | 3 | 6 | too few sandboxes |

### pgbench RW (s100, 50c)

TPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 24770 | 17760 – 28250 | 3 | 6 | — |
| 2 | Blaxel | 24140 | 23690 – 25440 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 19300 | 18640 – 26840 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 15990 | 15480 – 16290 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 15890 | 15180 – 16320 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 14720 | 14210 – 15870 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 12950 | 12950 – 17520 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 12510 | 12040 – 16080 | 3 | 6 | too few sandboxes |
| 9 | E2B | 11480 | 11400 – 12060 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 2064 | 1875 – 2087 | 3 | 6 | too few sandboxes |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Novita | 2.019 | 1.77 – 2.816 | 3 | 6 | — |
| 2 | Blaxel | 2.072 | 1.968 – 2.115 | 3 | 6 | too few sandboxes |
| 3 | Namespace | 2.613 | 1.864 – 2.682 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 3.136 | 3.079 – 3.244 | 3 | 6 | too few sandboxes |
| 5 | Daytona (VM) | 3.147 | 3.065 – 3.295 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 3.407 | 3.152 – 3.521 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 3.86 | 2.853 – 3.862 | 3 | 6 | too few sandboxes |
| 8 | run.cloud | 4 | 3.116 – 4.155 | 3 | 6 | too few sandboxes |
| 9 | E2B | 4.363 | 4.149 – 4.387 | 3 | 6 | too few sandboxes |
| 10 | Modal (gVisor) | 24.23 | 23.96 – 26.67 | 3 | 6 | too few sandboxes |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 34.67 | 34.39 – 37.37 | 3 | 6 | — |
| 2 | Blaxel | 36.77 | 35.56 – 37.03 | 3 | 6 | too few sandboxes |
| 3 | Novita | 42.47 | 39.71 – 55.95 | 3 | 6 | too few sandboxes |
| 4 | Microsandbox Cloud | 52.02 | 50.32 – 53.44 | 3 | 6 | too few sandboxes |
| 5 | Namespace | 52.79 | 52.53 – 53.08 | 3 | 6 | too few sandboxes |
| 6 | Modal (VM) | 62.12 | 36.88 – 65.12 | 3 | 6 | too few sandboxes |
| 7 | Vercel Sandbox | 67.79 | 65.75 – 116.2 | 3 | 6 | too few sandboxes |
| 8 | E2B | 70.62 | 67.23 – 73.51 | 3 | 6 | too few sandboxes |
| 9 | Runloop | 82.77 | 80.29 – 82.78 | 3 | 6 | too few sandboxes |
| 10 | run.cloud | 122.3 | 70.4 – 174.8 | 3 | 6 | too few sandboxes |
| 11 | Modal (gVisor) | 419.7 | 397.7 – 422 | 3 | 6 | too few sandboxes |

</details>

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_run.cloud is cheapest · Novita is ~3.9× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | Sandboxes | Trials | Note |
| ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | run.cloud | 0.05938 | — | 1 | 1 | — |
| 2 | Novita | 0.2333 | — | 1 | 1 | — |
| 3 | Daytona (VM) | 0.2502 | — | 1 | 1 | — |
| 4 | E2B | 0.3312 | — | 1 | 1 | — |
| 5 | Runloop | 0.6336 | — | 1 | 1 | — |
| 6 | Modal (gVisor) | 0.7612 | — | 1 | 1 | — |
| 6 | Modal (VM) | 0.7612 | — | 1 | 1 | equal values |

## Coverage gaps

38 uncovered results across 11 providers (Blaxel 2, Daytona (VM) 3, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 5, Modal (VM) 2, Namespace 2, Novita 3, run.cloud 4, Runloop 8, Vercel Sandbox 5). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Modal (gVisor) | realworld-mastra | **skipped** | pts_realworld-mastra: PTS install of local/realworld-mastra-1.0.0 failed (exit 0, not in list-installed-tests) |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| E2B | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| E2B | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Microsandbox Cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-mastra | **failed** | Suite "realworld-mastra" on modal-gvisor produced no pts_*.xml — PTS likely failed silently |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Namespace | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Namespace | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | realworld-better-auth | **failed** | Failed to create sandbox: run.cloud create did not settle within 30000ms |
| run.cloud | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| run.cloud | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| run.cloud | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file cat poll) — the sandbox stopped responding, not a quiet long step |
| Runloop | cpu-node | **failed** | Step "setup node 22 + pnpm 10" failed with exit code 1 |
| Runloop | memory | **failed** | Step "mise run benchmark:memory:all" failed with exit code 1 |
| Runloop | pgbench | **failed** | pts_pgbench-read-only: pts_pgbench-read-only did not produce 2 numeric metric value(s) |
| Runloop | pgbench | **failed** | pts_pgbench-read-write: PTS batch-run of pts/pgbench-1.15.0 completed but every trial errored (composite carries no values) |
| Runloop | pgbench | **failed** | Step "mise run benchmark:pgbench:all" failed with exit code 1 |
| Runloop | realworld-better-auth | **failed** | Step "setup node 22 + pnpm 10" failed with exit code 1 |
| Runloop | realworld-mastra | **failed** | Step "setup node 22 + pnpm 10" failed with exit code 1 |
| Runloop | realworld-openclaw | **failed** | Step "setup node 22 + pnpm 10" failed with exit code 1 |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-download: pts_iperf-wan-download did not produce 1 numeric metric value(s) |
| Vercel Sandbox | network | **failed** | pts_iperf-wan-upload: PTS batch-run of local/iperf-wan-1.0.0 completed but every trial errored (composite carries no values) |
| Vercel Sandbox | network | **failed** | Step "mise run benchmark:network:suite" failed with exit code 1 |
| Vercel Sandbox | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
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
The floor is a property of the design — here 1 v 3 sandboxes floors at p ≈ 0.50; 2 v 3 sandboxes floors at p ≈ 0.20; 3 v 1 sandboxes floors at p ≈ 0.50; 3 v 3 sandboxes floors at p ≈ 0.10; 3 v 3 sandboxes floors at p ≈ 0.20; 3 v 3 sandboxes floors at p ≈ 1.0.
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
| realworld | Mastra: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Novita | <0.001 | 0.0046 |
| realworld | Mastra: cold install | Modal (VM) | 0.51 (tied) | 0.43 |
| realworld | Mastra: cold install | Namespace | 0.13 (tied) | 0.066 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.32 (tied) | 0.19 |
| realworld | Mastra: cold install | Vercel Sandbox | 0.76 (tied) | 0.43 |
| realworld | Mastra: cold install | run.cloud | 0.48 (tied) | 0.43 |
| realworld | Mastra: cold install | E2B | 0.35 (tied) | 0.19 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | 0.068 (tied) | 0.19 |
| realworld | Better-Auth: build | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.11 (tied) | 0.066 |
| realworld | Better-Auth: build | Modal (VM) | 0.13 (tied) | 0.19 |
| realworld | Better-Auth: build | run.cloud | 0.41 (tied) | 0.036 |
| realworld | Better-Auth: build | Namespace | 0.98 (tied) | 0.81 |
| realworld | Better-Auth: build | E2B | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: build | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.0056 | <0.001 |
| realworld | Better-Auth: cold install | Novita | 0.052 (tied) | 0.019 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | run.cloud | 0.93 (tied) | 0.68 |
| realworld | Better-Auth: cold install | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Vercel Sandbox | 0.052 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Namespace | 0.0056 | <0.001 |
| realworld | Better-Auth: cold install | Modal (gVisor) | 0.20 (tied) | 0.019 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | 0.0066 | 0.0046 |
| realworld | Better-Auth: git clone | Vercel Sandbox | 0.68 (tied) | 0.19 |
| realworld | Better-Auth: git clone | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.71 (tied) | 0.79 |
| realworld | Better-Auth: git clone | Namespace | 0.80 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | 0.48 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.89 (tied) | 0.79 |
| realworld | Better-Auth: git clone | run.cloud | 0.12 (tied) | 0.24 |
| realworld | Better-Auth: git clone | Modal (gVisor) | 0.023 | 0.0098 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.0056 | 0.019 |
| realworld | Better-Auth: lint (Biome) | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | run.cloud | 0.36 (tied) | 0.11 |
| realworld | Better-Auth: lint (Biome) | Namespace | 0.69 (tied) | 0.81 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | 0.59 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | Vercel Sandbox | 0.033 | 0.066 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.84 (tied) | 0.066 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.63 (tied) | 0.79 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | 0.18 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.41 (tied) | 0.019 |
| realworld | Better-Auth: lint deps (Knip) | run.cloud | 0.83 (tied) | 0.35 |
| realworld | Better-Auth: lint deps (Knip) | Vercel Sandbox | 0.17 (tied) | 0.22 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.80 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Blaxel | 0.039 | 0.019 |
| realworld | Better-Auth: lint format | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | 0.12 (tied) | 0.19 |
| realworld | Better-Auth: lint format | Namespace | 0.38 (tied) | 0.019 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.27 (tied) | 0.19 |
| realworld | Better-Auth: lint format | run.cloud | 0.69 (tied) | 0.35 |
| realworld | Better-Auth: lint format | Vercel Sandbox | 0.059 (tied) | 0.12 |
| realworld | Better-Auth: lint format | E2B | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | 0.84 (tied) | 0.43 |
| realworld | Better-Auth: lint packages | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | 0.14 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | run.cloud | 0.49 (tied) | 0.58 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.79 (tied) | 0.33 |
| realworld | Better-Auth: lint packages | Modal (VM) | 0.16 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Vercel Sandbox | 0.0029 | 0.019 |
| realworld | Better-Auth: lint packages | E2B | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | 0.83 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (VM) | 0.10 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Namespace | 0.63 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | run.cloud | 0.19 (tied) | 0.13 |
| realworld | Better-Auth: lint spell | Vercel Sandbox | 0.016 | 0.040 |
| realworld | Better-Auth: lint spell | E2B | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | 0.0056 | <0.001 |
| realworld | Better-Auth: lint types | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: lint types | run.cloud | 0.35 (tied) | 0.036 |
| realworld | Better-Auth: lint types | Namespace | 0.35 (tied) | 0.30 |
| realworld | Better-Auth: lint types | E2B | 0.35 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | 0.045 | 0.066 |
| realworld | Better-Auth: typecheck | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | 0.76 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.20 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | 0.41 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | run.cloud | 0.29 (tied) | 0.0098 |
| realworld | Better-Auth: typecheck | E2B | 0.0070 | 0.0067 |
| realworld | Better-Auth: typecheck | Vercel Sandbox | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | 0.16 (tied) | 0.019 |
| realworld | Mastra: build:core | Blaxel | 0.38 (tied) | 0.79 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.51 (tied) | 0.066 |
| realworld | Mastra: build:core | Modal (VM) | 0.44 (tied) | 0.066 |
| realworld | Mastra: build:core | run.cloud | 0.0068 | <0.001 |
| realworld | Mastra: build:core | Vercel Sandbox | 0.0018 | 0.0046 |
| realworld | Mastra: build:core | E2B | 0.63 (tied) | 0.066 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.0036 | 0.0046 |
| realworld | Mastra: git clone | Modal (VM) | 0.93 (tied) | 0.43 |
| realworld | Mastra: git clone | Vercel Sandbox | 0.0068 | 0.019 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.89 (tied) | 0.19 |
| realworld | Mastra: git clone | E2B | 0.045 | 0.019 |
| realworld | Mastra: git clone | Novita | 0.94 (tied) | 0.43 |
| realworld | Mastra: git clone | run.cloud | 0.63 (tied) | 0.79 |
| realworld | Mastra: git clone | Namespace | 0.11 (tied) | 0.066 |
| realworld | Mastra: git clone | Modal (gVisor) | 0.0022 | <0.001 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.51 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.51 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (VM) | 0.32 (tied) | 0.066 |
| realworld | Mastra: lint:format | Vercel Sandbox | <0.001 | <0.001 |
| realworld | Mastra: lint:format | run.cloud | 0.98 (tied) | 0.43 |
| realworld | Mastra: lint:format | E2B | 0.045 | 0.019 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.59 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.59 (tied) | 0.43 |
| realworld | OpenClaw: cold install | Namespace | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: cold install | run.cloud | 0.83 (tied) | 0.46 |
| realworld | OpenClaw: cold install | E2B | 0.24 (tied) | 0.46 |
| realworld | OpenClaw: cold install | Vercel Sandbox | 0.11 (tied) | 0.19 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.67 (tied) | 0.79 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.017 | <0.001 |
| realworld | OpenClaw: git clone | Novita | 0.90 (tied) | 0.43 |
| realworld | OpenClaw: git clone | run.cloud | 0.044 | 0.20 |
| realworld | OpenClaw: git clone | Vercel Sandbox | 0.88 (tied) | 0.81 |
| realworld | OpenClaw: git clone | E2B | 0.0065 | 0.066 |
| realworld | OpenClaw: git clone | Namespace | 0.017 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (gVisor) | 0.024 | 0.0046 |
| realworld | OpenClaw: lint (extension channels) | Blaxel | — | — |
| realworld | OpenClaw: lint (extension channels) | Namespace | 0.63 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | 0.80 (tied) | 0.43 |
| realworld | OpenClaw: lint (extension channels) | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | 0.55 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.35 (tied) | 0.19 |
| realworld | OpenClaw: lint (extension channels) | run.cloud | 0.0086 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Vercel Sandbox | 0.41 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | 0.0083 | 0.0046 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | 0.89 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.089 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.98 (tied) | 0.79 |
| realworld | OpenClaw: typecheck (test tree) | run.cloud | 0.0086 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Vercel Sandbox | 0.20 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.028 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | 0.11 (tied) | 0.066 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.012 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.18 (tied) | 0.43 |
| realworld | OpenClaw: typecheck (tsgo) | run.cloud | 0.74 (tied) | 0.55 |
| realworld | OpenClaw: typecheck (tsgo) | Vercel Sandbox | 0.0070 | 0.0059 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.020 | 0.0046 |
| cpu | Node.js web tooling | Daytona (VM) | — | — |
| cpu | Node.js web tooling | Blaxel | 1.0 (too few sandboxes) | 0.60 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Novita | 0.10 (too few sandboxes) | 0.0048 |
| cpu | Node.js web tooling | Modal (VM) | 1.0 (too few sandboxes) | 0.34 |
| cpu | Node.js web tooling | Namespace | 0.70 (too few sandboxes) | 0.080 |
| cpu | Node.js web tooling | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0019 |
| cpu | Node.js web tooling | run.cloud | 0.70 (too few sandboxes) | 0.019 |
| cpu | Node.js web tooling | E2B | 0.10 (too few sandboxes) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.10 (too few sandboxes) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | run.cloud | 0.50 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.60 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.60 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.70 (too few sandboxes) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.20 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.40 (too few sandboxes) | 0.25 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (too few sandboxes) | 0.68 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | run.cloud | 0.50 (too few sandboxes) | 0.038 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0023 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Runloop | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 1.0 (too few sandboxes) | 0.81 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| disk | Hardlink throughput | Novita | 1.0 (too few sandboxes) | 0.81 |
| disk | Hardlink throughput | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.10 (too few sandboxes) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.10 (too few sandboxes) | 0.012 |
| disk | Hardlink throughput | E2B | 0.10 (too few sandboxes) | 0.0013 |
| memory | STREAM Triad | Blaxel | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.70 (too few sandboxes) | 0.017 |
| memory | STREAM Triad | Modal (VM) | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Triad | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | Novita | 0.70 (too few sandboxes) | 0.0047 |
| memory | STREAM Triad | E2B | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Triad | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Triad | run.cloud | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Blaxel | — | — |
| memory | STREAM Add | Daytona (VM) | 0.70 (too few sandboxes) | 0.0047 |
| memory | STREAM Add | Modal (VM) | 0.70 (too few sandboxes) | 0.31 |
| memory | STREAM Add | Modal (gVisor) | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | Novita | 0.70 (too few sandboxes) | 0.0047 |
| memory | STREAM Add | E2B | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Add | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Add | run.cloud | 0.70 (too few sandboxes) | 0.0011 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona (VM) | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.40 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | 0.70 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Vercel Sandbox | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.20 (too few sandboxes) | 0.85 |
| memory | STREAM Copy | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Novita | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Copy | run.cloud | 0.70 (too few sandboxes) | 0.021 |
| memory | STREAM Scale | Blaxel | — | — |
| memory | STREAM Scale | Modal (VM) | 0.20 (too few sandboxes) | 0.0011 |
| memory | STREAM Scale | Daytona (VM) | 1.0 (too few sandboxes) | 0.31 |
| memory | STREAM Scale | Modal (gVisor) | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Microsandbox Cloud | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Novita | 1.0 (too few sandboxes) | 0.14 |
| memory | STREAM Scale | Vercel Sandbox | 0.70 (too few sandboxes) | 0.017 |
| memory | STREAM Scale | E2B | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | Namespace | 0.10 (too few sandboxes) | <0.001 |
| memory | STREAM Scale | run.cloud | 0.70 (too few sandboxes) | 0.0011 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Vercel Sandbox | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | run.cloud | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.40 (too few sandboxes) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 loopback TCP, 10 streams | run.cloud | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Runloop | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | run.cloud | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Runloop | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Vercel Sandbox | 1.0 (too few sandboxes, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Novita | 0.20 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Microsandbox Cloud | 1.0 (too few sandboxes) | 1.0 |
| network | iperf3 WAN download | Daytona (VM) | 0.10 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | E2B | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN download | Runloop | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN download | Namespace | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Blaxel | 1.0 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | Modal (VM) | 0.70 (too few sandboxes) | 0.32 |
| network | iperf3 WAN download | run.cloud | 0.40 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 0.20 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Namespace | 1.0 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Novita | 0.70 (too few sandboxes) | 0.077 |
| network | iperf3 WAN upload | E2B | 0.70 (too few sandboxes) | 0.81 |
| network | iperf3 WAN upload | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | Runloop | 0.70 (too few sandboxes) | 0.012 |
| network | iperf3 WAN upload | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Vercel Sandbox | 0.40 (too few sandboxes) | 0.077 |
| system | PyBench | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | PyBench | run.cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | PyBench | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Blaxel | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.012 |
| system | Git common operations | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| system | Git common operations | Vercel Sandbox | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Modal (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | Git common operations | E2B | 0.40 (too few sandboxes) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | Git common operations | Runloop | 1.0 (too few sandboxes) | 0.32 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 1.0 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.40 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 1.0 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.10 (too few sandboxes) | 0.012 |
| system | pgbench RO latency (s100, 50c) | run.cloud | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Vercel Sandbox | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW (s100, 50c) | E2B | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Namespace | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.10 (too few sandboxes) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 1.0 (too few sandboxes) | 0.81 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.20 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | Vercel Sandbox | 0.70 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | run.cloud | 0.40 (too few sandboxes) | 0.32 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.20 (too few sandboxes) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Novita | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Modal (VM) | 0.70 (too few sandboxes) | 0.077 |
| system | SQLite Speedtest | Vercel Sandbox | 0.10 (too few sandboxes) | 0.012 |
| system | SQLite Speedtest | E2B | 1.0 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Runloop | 0.10 (too few sandboxes) | 0.0013 |
| system | SQLite Speedtest | run.cloud | 0.70 (too few sandboxes) | 0.32 |
| system | SQLite Speedtest | Modal (gVisor) | 0.10 (too few sandboxes) | 0.0013 |
| economics | Hourly cost | run.cloud | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Runloop | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

