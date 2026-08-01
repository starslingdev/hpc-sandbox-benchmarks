# Sandbox provider leaderboard

Run [`30691551759`](https://github.com/starslingdev/hpc-sandbox-benchmarks/actions/runs/30691551759) · commit [`6da0dce9d1c37fa2d45517f63c02591292075d20`](https://github.com/starslingdev/hpc-sandbox-benchmarks/commit/6da0dce9d1c37fa2d45517f63c02591292075d20) ·
dataset [`data/dataset/runs/30691551759.json`](data/dataset/runs/30691551759.json) · generated 2026-08-01T09:08:16.544Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **358 metric records**
backed by **3690 retained trial observations**, across **46 metrics** and
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

_Not present in this run: Daytona (container), Microsandbox (local), Vercel Sandbox — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## realworld

What a developer or a CI job actually waits on: each bar is one environment's whole pipeline
for that repo, segmented by task in execution order. The charts share one time scale, so a second is the same length in all of them.

<img src="docs/figures/realworld-better-auth.webp" width="960" alt="Better-Auth: 10 pipeline tasks across 8 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-mastra.webp" width="960" alt="Mastra: 4 pipeline tasks across 8 environments, stacked by task and sorted fastest-first">

<img src="docs/figures/realworld-openclaw.webp" width="960" alt="OpenClaw: 5 pipeline tasks across 7 environments, 1 disclosed as incomplete, stacked by task and sorted fastest-first">

<details>
<summary><strong>Per-task rankings</strong> · 19 tasks, with medians, intervals and trial counts</summary>

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 38.86 | 37.55 – 40.76 | 12 | — |
| 1 | Daytona (VM) | 39.96 | 38.43 – 43.23 | 12 | tied |
| 3 | Novita | 48.14 | 43.39 – 59.96 | 12 | — |
| 3 | Modal (VM) | 52.91 | 46.03 – 55.32 | 12 | tied |
| 3 | Namespace | 54.84 | 48.68 – 57.62 | 12 | tied |
| 6 | Microsandbox Cloud | 58.31 | 56.93 – 61.66 | 12 | — |
| 7 | E2B | 66.28 | 64.77 – 67.26 | 12 | — |
| 8 | Modal (gVisor) | 94.88 | 93.44 – 98.66 | 12 | — |

### Better-Auth: build

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 46.48 | 45.93 – 46.93 | 12 | — |
| 2 | Daytona (VM) | 57.98 | 56.12 – 59.98 | 12 | — |
| 3 | Blaxel | 60.91 | 59.52 – 61.58 | 12 | — |
| 4 | Modal (VM) | 70.65 | 68.9 – 76.22 | 12 | — |
| 4 | Novita | 75.58 | 68.51 – 86.28 | 12 | tied |
| 4 | Microsandbox Cloud | 77.42 | 76.55 – 79.62 | 12 | tied |
| 7 | E2B | 94.97 | 92.57 – 96.32 | 12 | — |
| 8 | Modal (gVisor) | 135.1 | 133 – 137.5 | 12 | — |

### Better-Auth: cold install

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.49 | 11.39 – 11.65 | 12 | — |
| 2 | Daytona (VM) | 11.85 | 11.56 – 13.41 | 12 | — |
| 3 | Novita | 15.09 | 14.05 – 19.41 | 12 | — |
| 3 | Microsandbox Cloud | 17.82 | 16.91 – 19.31 | 12 | tied |
| 5 | E2B | 18.93 | 18.59 – 19.11 | 12 | — |
| 5 | Modal (VM) | 19.13 | 18.64 – 23.18 | 12 | tied |
| 5 | Namespace | 24.84 | 18.44 – 25.88 | 12 | tied |
| 8 | Modal (gVisor) | 34.51 | 32.64 – 36.05 | 12 | — |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.8× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.5855 | 0.564 – 0.612 | 12 | — |
| 2 | Modal (VM) | 1.051 | 0.7185 – 1.131 | 12 | — |
| 3 | E2B | 1.329 | 1.284 – 1.381 | 12 | — |
| 3 | Daytona (VM) | 1.401 | 1.322 – 1.441 | 12 | tied |
| 3 | Namespace | 1.703 | 0.9115 – 1.937 | 12 | tied |
| 6 | Novita | 2.006 | 1.87 – 2.096 | 12 | — |
| 7 | Modal (gVisor) | 2.413 | 2.239 – 2.702 | 12 | — |
| 8 | Microsandbox Cloud | 30.69 | 18.6 – 34.93 | 12 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.673 | 2.611 – 2.688 | 12 | — |
| 2 | Daytona (VM) | 3.067 | 3.046 – 3.228 | 12 | — |
| 3 | Blaxel | 3.213 | 3.153 – 3.363 | 12 | — |
| 4 | Modal (VM) | 4.06 | 3.987 – 4.162 | 12 | — |
| 4 | Microsandbox Cloud | 4.087 | 4.01 – 4.351 | 12 | tied |
| 4 | Novita | 4.11 | 3.564 – 4.558 | 12 | tied |
| 7 | E2B | 5.127 | 5.048 – 5.171 | 12 | — |
| 8 | Modal (gVisor) | 10.55 | 10.34 – 10.75 | 12 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 8.043 | 7.926 – 8.093 | 12 | — |
| 2 | Blaxel | 10.2 | 9.785 – 10.4 | 12 | — |
| 2 | Daytona (VM) | 10.49 | 10.13 – 10.65 | 12 | tied |
| 4 | Microsandbox Cloud | 12.65 | 12.42 – 12.78 | 12 | — |
| 4 | Novita | 13.39 | 11.95 – 15.67 | 12 | tied |
| 4 | Modal (VM) | 13.4 | 13.27 – 13.67 | 12 | tied |
| 7 | E2B | 18.18 | 17.78 – 18.36 | 12 | — |
| 8 | Modal (gVisor) | 28.78 | 27.92 – 29.19 | 12 | — |

### Better-Auth: lint format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.206 | 2.159 – 2.259 | 12 | — |
| 2 | Daytona (VM) | 2.865 | 2.757 – 3.004 | 12 | — |
| 2 | Blaxel | 2.997 | 2.961 – 3.12 | 12 | tied |
| 4 | Microsandbox Cloud | 3.45 | 3.384 – 3.575 | 12 | — |
| 4 | Novita | 3.581 | 3.132 – 4.221 | 12 | tied |
| 4 | Modal (VM) | 3.763 | 3.673 – 3.835 | 12 | tied |
| 7 | E2B | 5.128 | 5.047 – 5.238 | 12 | — |
| 8 | Modal (gVisor) | 7.208 | 7.004 – 7.435 | 12 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 2.04 | 2.008 – 2.063 | 12 | — |
| 2 | Daytona (VM) | 2.424 | 2.383 – 2.457 | 12 | — |
| 3 | Blaxel | 2.51 | 2.438 – 2.575 | 12 | — |
| 4 | Modal (VM) | 3.205 | 3.161 – 3.252 | 12 | — |
| 4 | Novita | 3.215 | 2.673 – 3.476 | 12 | tied |
| 4 | Microsandbox Cloud | 3.28 | 3.174 – 3.408 | 12 | tied |
| 7 | E2B | 4.089 | 4.026 – 4.19 | 12 | — |
| 8 | Modal (gVisor) | 10.74 | 10.45 – 11 | 12 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 5.332 | 5.302 – 5.356 | 12 | — |
| 2 | Blaxel | 7.099 | 6.859 – 7.412 | 12 | — |
| 2 | Daytona (VM) | 7.181 | 6.772 – 7.612 | 12 | tied |
| 4 | Modal (VM) | 9.072 | 8.741 – 9.348 | 12 | — |
| 4 | Novita | 9.274 | 7.744 – 10.21 | 12 | tied |
| 4 | Microsandbox Cloud | 9.69 | 9.636 – 9.976 | 12 | tied |
| 7 | E2B | 12.49 | 12.34 – 12.74 | 12 | — |
| 8 | Modal (gVisor) | 15.79 | 15.48 – 16.19 | 12 | — |

### Better-Auth: lint types

Seconds · lower is better

_Namespace, Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 24.42 | 23.93 – 24.9 | 12 | — |
| 1 | Daytona (VM) | 25.16 | 24.04 – 27.54 | 12 | tied |
| 1 | Blaxel | 27.38 | 26.57 – 28.14 | 12 | tied |
| 4 | Modal (VM) | 34.58 | 33.48 – 34.98 | 12 | — |
| 4 | Novita | 35.64 | 33.65 – 42.11 | 12 | tied |
| 4 | Microsandbox Cloud | 38.55 | 37.84 – 38.75 | 12 | tied |
| 7 | E2B | 47.21 | 45.91 – 48 | 12 | — |
| 8 | Modal (gVisor) | 103.2 | 100 – 105.4 | 12 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 30.37 | 29.89 – 30.63 | 12 | — |
| 2 | Daytona (VM) | 40.46 | 38.89 – 40.92 | 12 | — |
| 3 | Blaxel | 42.14 | 41.01 – 43.62 | 12 | — |
| 3 | Novita | 48.08 | 41.84 – 56.83 | 12 | tied |
| 3 | Modal (VM) | 49.71 | 48.61 – 53.6 | 12 | tied |
| 6 | Microsandbox Cloud | 56.82 | 56.25 – 58.46 | 12 | — |
| 7 | E2B | 67.72 | 66.43 – 70.25 | 12 | — |
| 8 | Modal (gVisor) | 77.75 | 75.13 – 81.94 | 12 | — |

### Mastra: build:core

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 55.52 | 55.21 – 55.88 | 12 | — |
| 2 | Daytona (VM) | 70.66 | 69.96 – 71.11 | 12 | — |
| 3 | Blaxel | 73.06 | 71.97 – 73.31 | 12 | — |
| 4 | Novita | 85.03 | 80.05 – 100.3 | 12 | — |
| 4 | Modal (VM) | 91.94 | 80.86 – 96.01 | 12 | tied |
| 4 | Microsandbox Cloud | 93.14 | 90.96 – 94.74 | 12 | tied |
| 7 | E2B | 120.9 | 118.2 – 122.8 | 12 | — |
| 8 | Modal (gVisor) | 170.5 | 167.8 – 174.9 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.138 | 1.559 – 2.269 | 12 | — |
| 2 | Modal (VM) | 2.593 | 2.512 – 2.644 | 12 | — |
| 2 | Daytona (VM) | 2.643 | 2.23 – 2.819 | 12 | tied |
| 4 | Novita | 3.341 | 3.07 – 3.583 | 12 | — |
| 4 | E2B | 3.479 | 3.213 – 4.08 | 12 | tied |
| 4 | Namespace | 3.92 | 3.554 – 5.223 | 12 | tied |
| 4 | Microsandbox Cloud | 5.205 | 3.115 – 19.67 | 12 | tied |
| 4 | Modal (gVisor) | 5.982 | 5.642 – 6.431 | 12 | tied |

### Mastra: lint:format

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 66.68 | 66.06 – 67.39 | 12 | — |
| 2 | Daytona (VM) | 87.97 | 84.36 – 94.22 | 12 | — |
| 2 | Blaxel | 91.58 | 89.58 – 94.34 | 12 | tied |
| 4 | Novita | 103.4 | 100.8 – 124.3 | 12 | — |
| 4 | Microsandbox Cloud | 110.5 | 108.4 – 113.3 | 12 | tied |
| 4 | Modal (VM) | 116.2 | 103 – 116.9 | 12 | tied |
| 7 | E2B | 154.4 | 151.1 – 155.8 | 12 | — |
| 8 | Modal (gVisor) | 197.4 | 189.6 – 206.9 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.06 | 10.68 – 11.86 | 12 | — |
| 2 | Daytona (VM) | 12.69 | 12.56 – 13.09 | 10 | — |
| 2 | Namespace | 16.9 | 10.31 – 17.37 | 12 | tied |
| 4 | Novita | 17.82 | 15.87 – 19.2 | 12 | — |
| 4 | Modal (VM) | 18.03 | 17.73 – 19.47 | 12 | tied |
| 4 | E2B | 19.59 | 19.35 – 20.63 | 12 | tied |
| 7 | Modal (gVisor) | 28.36 | 27.48 – 29.3 | 12 | — |
| 8 | Microsandbox Cloud | 36.69 | 28.89 – 41.87 | 12 | — |

### OpenClaw: git clone

Seconds · lower is better

_Modal (VM) and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 3.095 | 3.045 – 6.528 | 12 | — |
| 1 | Daytona (VM) | 3.149 | 3.013 – 3.223 | 10 | tied |
| 3 | Novita | 4.38 | 4.144 – 4.562 | 12 | — |
| 3 | Microsandbox Cloud | 4.381 | 4.274 – 17.47 | 12 | tied |
| 3 | E2B | 4.426 | 4.375 – 5.822 | 12 | tied |
| 3 | Namespace | 5.966 | 2.645 – 6.024 | 12 | tied |
| 7 | Blaxel | 7.947 | 4.823 – 8.264 | 12 | — |
| 8 | Modal (gVisor) | 9.224 | 8.983 – 9.73 | 12 | — |

### OpenClaw: lint (extension channels)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: lint (extension channels) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 52.44 | 48.57 – 54.91 | 12 | — |
| 2 | Blaxel | 60.64 | 58.99 – 62.21 | 12 | — |
| 2 | Daytona (VM) | 62.25 | 60.52 – 71.89 | 10 | tied |
| 4 | Modal (VM) | 75.66 | 73.24 – 76.47 | 12 | — |
| 4 | Novita | 80.77 | 73.39 – 85.65 | 12 | tied |
| 6 | Microsandbox Cloud | 86.5 | 82.93 – 89.63 | 12 | — |
| 7 | E2B | 107.3 | 103.1 – 110.5 | 12 | — |
| 8 | Modal (gVisor) | 143.9 | 133.8 – 158.9 | 12 | — |

### OpenClaw: typecheck (test tree)

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (test tree) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Namespace | 80.78 | 79.24 – 82.82 | 12 |
| 2 | Daytona (VM) | 100.2 | 94.96 – 103.7 | 10 |
| 3 | Modal (VM) | 119 | 117.5 – 126.7 | 12 |
| 4 | Microsandbox Cloud | 128.8 | 125.3 – 133.4 | 12 |
| 5 | Novita | 144.5 | 135.3 – 153.8 | 12 |
| 6 | E2B | 183.2 | 176.6 – 187.4 | 12 |
| 7 | Modal (gVisor) | 329.1 | 288.8 – 396 | 12 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Namespace leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 13.79 | 13.1 – 14.33 | 12 | — |
| 2 | Blaxel | 17.26 | 16.8 – 17.72 | 12 | — |
| 2 | Daytona (VM) | 18.08 | 16.81 – 18.55 | 10 | tied |
| 4 | Modal (VM) | 21.56 | 21.03 – 22.53 | 12 | — |
| 5 | Microsandbox Cloud | 24.01 | 22.54 – 26.33 | 12 | — |
| 5 | Novita | 27.52 | 25.55 – 28.87 | 12 | tied |
| 7 | E2B | 35.44 | 34.49 – 36.38 | 12 | — |
| 8 | Modal (gVisor) | 59.42 | 43.1 – 68.84 | 12 | — |

</details>

## cpu

<details>
<summary><strong>1 synthetic metric</strong> · headline: Node.js web tooling</summary>

### Node.js web tooling _(headline)_

runs/s · higher is better

_Namespace leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 28.63 | 28.15 – 28.96 | 9 | — |
| 2 | Daytona (VM) | 20.99 | 18.79 – 21.1 | 21 | n too small |
| 3 | Blaxel | 20.28 | 18.73 – 21.04 | 39 | n too small |
| 4 | Novita | 18.18 | 14.39 – 19.38 | 33 | n too small |
| 5 | Microsandbox Cloud | 17.73 | 17.07 – 18.04 | 42 | n too small |
| 6 | Modal (VM) | 14.11 | 11.55 – 19.42 | 21 | n too small |
| 7 | E2B | 12.02 | 11.66 – 12.38 | 9 | n too small |
| 8 | Modal (gVisor) | 9.29 | 9.09 – 9.7 | 33 | n too small |

</details>

## disk

<details>
<summary><strong>9 synthetic metrics</strong> · headline: fio rand read 4KB, O_DIRECT (IOPS)</summary>

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Microsandbox Cloud leads · ~1.1× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 317500 | 254000 – 356000 | 6 | — |
| 2 | Modal (VM) | 280000 | 230000 – 332000 | 6 | n too small |
| 3 | Namespace | 251500 | 246000 – 254000 | 6 | n too small |
| 4 | Daytona (VM) | 250500 | 232000 – 261000 | 6 | n too small |
| 5 | Blaxel | 232000 | 212000 – 254000 | 6 | n too small |
| 6 | Novita | 71500 | 64200 – 77900 | 6 | n too small |
| 7 | E2B | 46450 | 45500 – 48200 | 6 | n too small |
| 8 | Modal (gVisor) | 32850 | 30800 – 33600 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.1× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1241 | 993 – 1391 | 6 | — |
| 2 | Modal (VM) | 1093 | 917.5 – 1265 | 6 | n too small |
| 3 | Namespace | 983 | 961 – 992 | 6 | n too small |
| 4 | Daytona (VM) | 978.5 | 905 – 1020 | 6 | n too small |
| 5 | Blaxel | 906.5 | 828 – 992 | 6 | n too small |
| 6 | Novita | 279.5 | 253.5 – 304 | 6 | n too small |
| 7 | E2B | 181.5 | 178 – 189 | 6 | n too small |
| 8 | Modal (gVisor) | 128.5 | 123 – 131 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.1× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 304000 | 225000 – 369000 | 6 | — |
| 2 | Modal (VM) | 289000 | 257000 – 305000 | 6 | n too small |
| 3 | Namespace | 241500 | 231000 – 253000 | 6 | n too small |
| 4 | Blaxel | 220500 | 203000 – 335000 | 6 | n too small |
| 5 | Daytona (VM) | 219500 | 206000 – 227000 | 6 | n too small |
| 6 | Novita | 71600 | 67600 – 78000 | 6 | n too small |
| 7 | E2B | 47950 | 47000 – 49000 | 6 | n too small |
| 8 | Modal (gVisor) | 26800 | 25800 – 27600 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.1× Modal (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 1189 | 879 – 1441 | 6 | — |
| 2 | Modal (VM) | 1129 | 1003 – 1192 | 6 | n too small |
| 3 | Namespace | 944 | 919.5 – 987 | 6 | n too small |
| 4 | Blaxel | 861 | 799.5 – 1308 | 6 | n too small |
| 5 | Daytona (VM) | 857.5 | 803 – 886 | 6 | n too small |
| 6 | Novita | 280 | 264 – 305 | 6 | n too small |
| 7 | E2B | 187.5 | 183 – 191 | 6 | n too small |
| 8 | Modal (gVisor) | 104.5 | 101 – 108 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 21200 | 17800 – 23800 | 6 | — |
| 2 | Novita | 12300 | 10850 – 14400 | 6 | n too small |
| 3 | Blaxel | 9847 | 7896 – 12100 | 6 | n too small |
| 4 | Daytona (VM) | 9329 | 7735 – 13300 | 6 | n too small |
| 5 | Microsandbox Cloud | 7654 | 5394 – 8610 | 6 | n too small |
| 6 | Namespace | 3983 | 3942 – 4053 | 6 | n too small |
| 7 | Modal (VM) | 1725 | 1502 – 1994 | 6 | n too small |
| 8 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 8954 | 6854 – 9372 | 4 | — |
| 2 | Blaxel | 8094 | 7898 – 9594 | 3 | n too small |
| 3 | Microsandbox Cloud | 7655 | 4725 – 8642 | 6 | n too small |
| 4 | Namespace | 3985 | 3944 – 4055 | 6 | n too small |
| 5 | Modal (VM) | 1727 | 1503 – 2003 | 6 | n too small |
| 6 | E2B | 601 | 601 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Microsandbox Cloud leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 7150 | 6050 – 7350 | 6 | — |
| 2 | Novita | 6252 | 5278 – 7092 | 6 | n too small |
| 3 | Blaxel | 5786 | 4934 – 6370 | 6 | n too small |
| 4 | Daytona (VM) | 4344 | 3137 – 6004 | 6 | n too small |
| 5 | Modal (gVisor) | 3639 | 2561 – 4073 | 6 | n too small |
| 6 | Namespace | 2501 | 2435 – 2705 | 6 | n too small |
| 7 | Modal (VM) | 2480 | 2246 – 2986 | 6 | n too small |
| 8 | E2B | 599 | 598 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Microsandbox Cloud leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Microsandbox Cloud | 7152 | 6052 – 7352 | 6 | — |
| 2 | Novita | 6254 | 5280 – 7585 | 6 | n too small |
| 3 | Blaxel | 5787 | 4936 – 6371 | 6 | n too small |
| 4 | Daytona (VM) | 4345 | 3405 – 6006 | 6 | n too small |
| 5 | Modal (gVisor) | 3641 | 2563 – 4074 | 6 | n too small |
| 6 | Namespace | 2502 | 2445 – 2707 | 6 | n too small |
| 7 | Modal (VM) | 2481 | 2247 – 2988 | 6 | n too small |
| 8 | E2B | 601 | 600 – 601 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.26 | 22.82 – 26.49 | 6 | — |
| 2 | Blaxel | 19.34 | 18.39 – 19.66 | 6 | n too small |
| 3 | Modal (VM) | 15.64 | 15.39 – 15.69 | 6 | n too small |
| 4 | Novita | 12.12 | 11.62 – 12.19 | 6 | n too small |
| 5 | Microsandbox Cloud | 9.525 | 8.69 – 9.86 | 6 | n too small |
| 6 | Namespace | 5.22 | 5.16 – 5.23 | 6 | n too small |
| 7 | Modal (gVisor) | 3.145 | 2.905 – 3.32 | 6 | n too small |
| 8 | E2B | 1.415 | 1.4 – 1.43 | 6 | n too small |

</details>

## memory

<details>
<summary><strong>4 synthetic metrics</strong> · headline: STREAM Triad</summary>

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 103600 | 97620 – 105900 | 15 | — |
| 2 | Daytona (VM) | 90450 | 72100 – 99910 | 15 | n too small |
| 3 | Modal (VM) | 78470 | 76080 – 123900 | 15 | n too small |
| 4 | Modal (gVisor) | 66970 | 63420 – 70620 | 15 | n too small |
| 5 | Microsandbox Cloud | 58750 | 58430 – 59160 | 15 | n too small |
| 6 | Novita | 50219 | 41930 – 78340 | 15 | n too small |
| 7 | E2B | 48870 | 46180 – 50660 | 15 | n too small |
| 8 | Namespace | 33700 | 33670 – 33710 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 102400 | 100800 – 105300 | 15 | — |
| 2 | Daytona (VM) | 89700 | 70780 – 99610 | 15 | n too small |
| 3 | Modal (VM) | 77710 | 75080 – 121400 | 15 | n too small |
| 4 | Modal (gVisor) | 64350 | 61870 – 69840 | 15 | n too small |
| 5 | Microsandbox Cloud | 58652 | 58087 – 59370 | 15 | n too small |
| 6 | Novita | 50150 | 42050 – 77860 | 15 | n too small |
| 7 | E2B | 48890 | 46360 – 50880 | 15 | n too small |
| 8 | Namespace | 33650 | 33630 – 33690 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.2× Modal (VM) on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 110600 | 100800 – 120000 | 70 | — |
| 2 | Modal (VM) | 94360 | 90720 – 114600 | 15 | n too small |
| 3 | Daytona (VM) | 92870 | 83900 – 110600 | 70 | n too small |
| 4 | Modal (gVisor) | 88480 | 85340 – 91070 | 45 | n too small |
| 5 | Microsandbox Cloud | 82770 | 81020 – 84050 | 21 | n too small |
| 6 | E2B | 77750 | 75510 – 79240 | 58 | n too small |
| 7 | Novita | 56600 | 51210 – 61600 | 55 | n too small |
| 8 | Namespace | 44390 | 44170 – 44970 | 15 | n too small |

### STREAM Scale

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 94170 | 91500 – 98200 | 15 | — |
| 2 | Daytona (VM) | 79790 | 63900 – 95510 | 15 | n too small |
| 3 | Modal (VM) | 74280 | 71790 – 132700 | 15 | n too small |
| 4 | Modal (gVisor) | 57410 | 56730 – 62926 | 15 | n too small |
| 5 | Microsandbox Cloud | 49804 | 49210 – 50670 | 15 | n too small |
| 6 | Novita | 48340 | 41880 – 77460 | 15 | n too small |
| 7 | E2B | 45160 | 44980 – 46050 | 15 | n too small |
| 8 | Namespace | 30600 | 30580 – 30670 | 15 | n too small |

</details>

## network

<details>
<summary><strong>5 synthetic metrics</strong> · headline: iperf3 loopback TCP, 1 stream</summary>

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 147200 | 37922 – 155500 | 6 | — |
| 2 | Blaxel | 110843 | 92399 – 140570 | 6 | n too small |
| 3 | Daytona (VM) | 82424 | 75170 – 92123 | 6 | n too small |
| 4 | Namespace | 72010 | 71636 – 72350 | 6 | n too small |
| 5 | Microsandbox Cloud | 61110 | 52321 – 86139 | 6 | n too small |
| 6 | E2B | 53030 | 49128 – 67092 | 6 | n too small |
| 7 | Modal (VM) | 18790 | 13753 – 24303 | 6 | n too small |
| 8 | Modal (gVisor) | 14760 | 12533 – 15990 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 162832 | 100920 – 204234 | 6 | — |
| 2 | Novita | 132367 | 52541 – 158069 | 6 | n too small |
| 3 | Microsandbox Cloud | 73916 | 61490 – 86429 | 6 | n too small |
| 4 | Daytona (VM) | 68600 | 40898 – 99814 | 6 | n too small |
| 5 | Namespace | 64460 | 63543 – 69580 | 6 | n too small |
| 6 | E2B | 47310 | 39471 – 59371 | 6 | n too small |
| 7 | Modal (VM) | 15300 | 13700 – 19217 | 6 | n too small |
| 8 | Modal (gVisor) | 14326 | 12896 – 14904 | 6 | n too small |

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
| 8 | Modal (gVisor) | 186.5 | 174 – 195 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.5× Microsandbox Cloud on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 8365 | 5751 – 9617 | 6 | — |
| 2 | Microsandbox Cloud | 5697 | 604.1 – 5874 | 6 | n too small |
| 3 | Namespace | 4500 | 2342 – 20400 | 6 | n too small |
| 4 | Daytona (VM) | 4419 | 3202 – 6661 | 6 | n too small |
| 5 | E2B | 3211 | 936.5 – 4192 | 6 | n too small |
| 6 | Novita | 2951 | 129.5 – 4889 | 6 | n too small |
| 7 | Modal (VM) | 1403 | 1196 – 1480 | 6 | n too small |
| 8 | Blaxel | 1044 | 883.7 – 1639 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.9× E2B on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 6263 | 5539 – 9283 | 6 | — |
| 2 | E2B | 3314 | 1073 – 3674 | 6 | n too small |
| 3 | Daytona (VM) | 3243 | 987.4 – 4610 | 6 | n too small |
| 4 | Novita | 3193 | 1143 – 5453 | 6 | n too small |
| 5 | Namespace | 1689 | 803.3 – 4845 | 6 | n too small |
| 6 | Blaxel | 1521 | 863 – 2241 | 6 | n too small |
| 7 | Microsandbox Cloud | 1463 | 614.1 – 1857 | 6 | n too small |
| 8 | Modal (gVisor) | 142.2 | 126 – 164.9 | 6 | n too small |

</details>

## system

<details>
<summary><strong>7 synthetic metrics</strong> · headline: PyBench</summary>

### PyBench _(headline)_

Milliseconds · lower is better

_Namespace leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 364.5 | 361 – 369 | 6 | — |
| 2 | Daytona (VM) | 413.5 | 402.5 – 448 | 6 | n too small |
| 3 | Novita | 484 | 483 – 679 | 6 | n too small |
| 4 | Blaxel | 490 | 475 – 503 | 6 | n too small |
| 5 | Microsandbox Cloud | 507 | 503 – 516 | 6 | n too small |
| 6 | Modal (VM) | 672 | 447 – 828 | 6 | n too small |
| 7 | E2B | 802.5 | 729 – 808 | 6 | n too small |
| 8 | Modal (gVisor) | 899.5 | 893 – 912 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Namespace leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 31.91 | 31.72 – 32.2 | 6 | — |
| 2 | Daytona (VM) | 37.77 | 36.05 – 42.57 | 6 | n too small |
| 3 | Blaxel | 42.12 | 41.89 – 46.55 | 6 | n too small |
| 4 | Novita | 44.3 | 44.09 – 50.71 | 6 | n too small |
| 5 | Microsandbox Cloud | 51.39 | 50.98 – 54.05 | 6 | n too small |
| 6 | Modal (VM) | 59.83 | 38.82 – 65.85 | 6 | n too small |
| 7 | E2B | 64.11 | 63.16 – 68.37 | 6 | n too small |
| 8 | Modal (gVisor) | 83.33 | 78.8 – 84.07 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Namespace on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 288600 | 249700 – 300400 | 6 | — |
| 2 | Namespace | 245800 | 197200 – 253000 | 6 | n too small |
| 3 | Microsandbox Cloud | 216000 | 175000 – 229400 | 6 | n too small |
| 4 | Modal (VM) | 200700 | 197600 – 326400 | 6 | n too small |
| 5 | Novita | 191500 | 164500 – 219100 | 6 | n too small |
| 6 | E2B | 180200 | 171800 – 228800 | 6 | n too small |
| 7 | Modal (gVisor) | 12040 | 11080 – 12150 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Namespace is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.1735 | 0.164 – 0.2 | 6 | — |
| 2 | Namespace | 0.2035 | 0.198 – 0.254 | 6 | n too small |
| 3 | Microsandbox Cloud | 0.2315 | 0.218 – 0.286 | 6 | n too small |
| 4 | Modal (VM) | 0.249 | 0.153 – 0.253 | 6 | n too small |
| 5 | Novita | 0.261 | 0.228 – 0.304 | 6 | n too small |
| 6 | E2B | 0.2775 | 0.2225 – 0.291 | 6 | n too small |
| 7 | Modal (gVisor) | 4.151 | 4.117 – 4.512 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Namespace leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 26400 | 16260 – 27800 | 6 | — |
| 2 | Blaxel | 22120 | 19550 – 25030 | 6 | n too small |
| 3 | Microsandbox Cloud | 17260 | 16830 – 18220 | 6 | n too small |
| 4 | Novita | 14570 | 13260 – 17470 | 6 | n too small |
| 5 | Modal (VM) | 14120 | 13660 – 21720 | 6 | n too small |
| 6 | E2B | 12140 | 10820 – 14190 | 6 | n too small |
| 7 | Modal (gVisor) | 1991 | 1884 – 2026 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Namespace leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Namespace | 1.894 | 1.807 – 3.075 | 6 | — |
| 2 | Blaxel | 2.261 | 1.962 – 2.558 | 6 | n too small |
| 3 | Microsandbox Cloud | 2.897 | 2.659 – 2.97 | 6 | n too small |
| 4 | Novita | 3.434 | 2.829 – 3.77 | 6 | n too small |
| 5 | Modal (VM) | 3.54 | 2.302 – 3.661 | 6 | n too small |
| 6 | E2B | 4.127 | 3.523 – 4.622 | 6 | n too small |
| 7 | Modal (gVisor) | 25.11 | 24.67 – 26.53 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 33.41 | 31.05 – 40.27 | 6 | — |
| 2 | Blaxel | 39.03 | 36.88 – 42.34 | 6 | n too small |
| 3 | Novita | 41.12 | 40.47 – 59.21 | 6 | n too small |
| 4 | Namespace | 48.51 | 47.88 – 48.75 | 6 | n too small |
| 5 | Microsandbox Cloud | 58.67 | 54.39 – 60.41 | 6 | n too small |
| 6 | Modal (VM) | 66.81 | 32.89 – 92.4 | 6 | n too small |
| 7 | E2B | 67.54 | 66.8 – 68.92 | 6 | n too small |
| 8 | Modal (gVisor) | 423 | 404.1 – 429.9 | 6 | n too small |

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

22 uncovered results across 8 providers (Blaxel 3, Daytona (VM) 5, E2B 2, Microsandbox Cloud 2, Modal (gVisor) 3, Modal (VM) 2, Namespace 2, Novita 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 4 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_types (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Daytona (VM) | pgbench | **failed** | sandbox never ready: no successful "echo ok" in 30 attempts |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
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
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 3 of 8 declared metrics: realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

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
Samples, so the test could not have separated the rows at any effect size (here 15 v 15 floors at p ≈ <0.001; 15 v 70 floors at p ≈ <0.001; 21 v 39 floors at p ≈ <0.001; 21 v 58 floors at p ≈ <0.001; 21 v 9 floors at p ≈ <0.001; 3 v 6 floors at p ≈ 0.024; 33 v 42 floors at p ≈ <0.001; 39 v 33 floors at p ≈ <0.001; 4 v 3 floors at p ≈ 0.057; 42 v 21 floors at p ≈ <0.001; 45 v 21 floors at p ≈ <0.001; 55 v 15 floors at p ≈ <0.001; 58 v 55 floors at p ≈ <0.001; 6 v 6 floors at p ≈ 0.0022; 70 v 15 floors at p ≈ <0.001; 70 v 45 floors at p ≈ <0.001; 9 v 21 floors at p ≈ <0.001; 9 v 33 floors at p ≈ <0.001).
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
| realworld | Mastra: cold install | Daytona (VM) | 0.48 (tied) | 0.79 |
| realworld | Mastra: cold install | Novita | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | 0.98 (tied) | 0.79 |
| realworld | Mastra: cold install | Namespace | 0.51 (tied) | 0.43 |
| realworld | Mastra: cold install | Microsandbox Cloud | 0.010 | 0.066 |
| realworld | Mastra: cold install | E2B | 0.028 | 0.0046 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Namespace | — | — |
| realworld | Better-Auth: build | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Blaxel | 0.039 | 0.019 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.35 (tied) | 0.79 |
| realworld | Better-Auth: build | Microsandbox Cloud | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: build | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | 0.028 | 0.066 |
| realworld | Better-Auth: cold install | Novita | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Microsandbox Cloud | 0.10 (tied) | 0.019 |
| realworld | Better-Auth: cold install | E2B | 0.045 | 0.0046 |
| realworld | Better-Auth: cold install | Modal (VM) | 0.24 (tied) | 0.19 |
| realworld | Better-Auth: cold install | Namespace | 0.51 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | E2B | 0.0029 | <0.001 |
| realworld | Better-Auth: git clone | Daytona (VM) | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: git clone | Namespace | 0.71 (tied) | 0.066 |
| realworld | Better-Auth: git clone | Novita | 0.0029 | 0.066 |
| realworld | Better-Auth: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Namespace | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.028 | 0.066 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Microsandbox Cloud | 0.51 (tied) | 0.43 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Namespace | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.054 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.38 (tied) | 0.066 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Namespace | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Blaxel | 0.078 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Novita | 1.0 (tied) | 0.066 |
| realworld | Better-Auth: lint format | Modal (VM) | 0.97 (tied) | 0.19 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Namespace | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Blaxel | 0.039 | 0.066 |
| realworld | Better-Auth: lint packages | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Novita | 0.84 (tied) | 0.19 |
| realworld | Better-Auth: lint packages | Microsandbox Cloud | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint packages | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Namespace | — | — |
| realworld | Better-Auth: lint spell | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.93 (tied) | 0.43 |
| realworld | Better-Auth: lint spell | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | 0.93 (tied) | 0.19 |
| realworld | Better-Auth: lint spell | Microsandbox Cloud | 0.59 (tied) | 0.066 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Namespace | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | 0.20 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Blaxel | 0.068 (tied) | 0.019 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.29 (tied) | 0.19 |
| realworld | Better-Auth: lint types | Microsandbox Cloud | 0.20 (tied) | 0.019 |
| realworld | Better-Auth: lint types | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Namespace | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Blaxel | 0.0011 | 0.0046 |
| realworld | Better-Auth: typecheck | Novita | 0.13 (tied) | 0.066 |
| realworld | Better-Auth: typecheck | Modal (VM) | 0.76 (tied) | 0.19 |
| realworld | Better-Auth: typecheck | Microsandbox Cloud | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Namespace | — | — |
| realworld | Mastra: build:core | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Blaxel | 0.014 | 0.019 |
| realworld | Mastra: build:core | Novita | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (VM) | 0.80 (tied) | 0.79 |
| realworld | Mastra: build:core | Microsandbox Cloud | 0.63 (tied) | 0.43 |
| realworld | Mastra: build:core | E2B | <0.001 | <0.001 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Daytona (VM) | 0.90 (tied) | 0.43 |
| realworld | Mastra: git clone | Novita | <0.001 | <0.001 |
| realworld | Mastra: git clone | E2B | 0.14 (tied) | 0.19 |
| realworld | Mastra: git clone | Namespace | 0.14 (tied) | 0.19 |
| realworld | Mastra: git clone | Microsandbox Cloud | 0.76 (tied) | 0.066 |
| realworld | Mastra: git clone | Modal (gVisor) | 1.0 (tied) | 0.066 |
| realworld | Mastra: lint:format | Namespace | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Blaxel | 0.24 (tied) | 0.19 |
| realworld | Mastra: lint:format | Novita | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Microsandbox Cloud | 0.41 (tied) | 0.019 |
| realworld | Mastra: lint:format | Modal (VM) | 0.63 (tied) | 0.19 |
| realworld | Mastra: lint:format | E2B | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Namespace | 0.54 (tied) | 0.028 |
| realworld | OpenClaw: cold install | Novita | 0.033 | 0.019 |
| realworld | OpenClaw: cold install | Modal (VM) | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: cold install | E2B | 0.068 (tied) | 0.019 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Microsandbox Cloud | 0.017 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (VM) | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.54 (tied) | 0.49 |
| realworld | OpenClaw: git clone | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Microsandbox Cloud | 0.48 (tied) | 0.43 |
| realworld | OpenClaw: git clone | E2B | 0.80 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Namespace | 0.67 (tied) | 0.19 |
| realworld | OpenClaw: git clone | Blaxel | 0.045 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Namespace | — | — |
| realworld | OpenClaw: lint (extension channels) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Daytona (VM) | 0.12 (tied) | 0.27 |
| realworld | OpenClaw: lint (extension channels) | Modal (VM) | <0.001 | 0.0017 |
| realworld | OpenClaw: lint (extension channels) | Novita | 0.29 (tied) | 0.066 |
| realworld | OpenClaw: lint (extension channels) | Microsandbox Cloud | 0.039 | 0.066 |
| realworld | OpenClaw: lint (extension channels) | E2B | 0.0018 | <0.001 |
| realworld | OpenClaw: lint (extension channels) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Namespace | — | — |
| realworld | OpenClaw: typecheck (test tree) | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Microsandbox Cloud | 0.024 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | Novita | 0.012 | 0.019 |
| realworld | OpenClaw: typecheck (test tree) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (test tree) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Namespace | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | 0.14 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | 0.0015 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Microsandbox Cloud | 0.0068 | 0.0046 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.078 (tied) | 0.019 |
| realworld | OpenClaw: typecheck (tsgo) | E2B | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | 0.0068 | <0.001 |
| cpu | Node.js web tooling | Namespace | — | — |
| cpu | Node.js web tooling | Daytona (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Blaxel | 0.084 (n too small) | 0.27 |
| cpu | Node.js web tooling | Novita | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Microsandbox Cloud | 0.92 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | E2B | 0.0012 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.31 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Namespace | 0.39 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.85 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.093 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.31 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Namespace | 0.39 (n too small) | 0.077 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.82 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.13 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.59 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.093 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.97 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.59 (n too small) | 0.32 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.093 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.94 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.0087 (n too small) | 0.012 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | 0.026 (n too small) | 0.077 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.82 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | 0.55 (n too small) | 0.53 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.31 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.093 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Namespace | 0.0087 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.70 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Microsandbox Cloud | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.31 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.093 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.13 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Namespace | 0.0087 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.70 (n too small) | 0.32 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Namespace | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Blaxel | — | — |
| memory | STREAM Triad | Daytona (VM) | 0.0032 (n too small) | 0.0011 |
| memory | STREAM Triad | Modal (VM) | 0.71 (n too small) | 0.31 |
| memory | STREAM Triad | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Microsandbox Cloud | 0.0032 (n too small) | <0.001 |
| memory | STREAM Triad | Novita | 0.13 (n too small) | 0.0011 |
| memory | STREAM Triad | E2B | 0.97 (n too small) | 0.14 |
| memory | STREAM Triad | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Blaxel | — | — |
| memory | STREAM Add | Daytona (VM) | 0.0032 (n too small) | 0.0011 |
| memory | STREAM Add | Modal (VM) | 0.68 (n too small) | 0.31 |
| memory | STREAM Add | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Add | Microsandbox Cloud | 0.0012 (n too small) | <0.001 |
| memory | STREAM Add | Novita | 0.13 (n too small) | 0.0011 |
| memory | STREAM Add | E2B | 0.90 (n too small) | 0.14 |
| memory | STREAM Add | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Modal (VM) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Daytona (VM) | 0.29 (n too small) | 0.065 |
| memory | STREAM Copy | Modal (gVisor) | 0.0015 (n too small) | <0.001 |
| memory | STREAM Copy | Microsandbox Cloud | 0.0012 (n too small) | <0.001 |
| memory | STREAM Copy | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Novita | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Namespace | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Blaxel | — | — |
| memory | STREAM Scale | Daytona (VM) | 0.0099 (n too small) | 0.0047 |
| memory | STREAM Scale | Modal (VM) | 0.49 (n too small) | 0.31 |
| memory | STREAM Scale | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Microsandbox Cloud | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Novita | 0.39 (n too small) | 0.017 |
| memory | STREAM Scale | E2B | 0.37 (n too small) | 0.0047 |
| memory | STREAM Scale | Namespace | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Namespace | 0.065 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.18 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.24 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.31 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Microsandbox Cloud | 0.39 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.82 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | Namespace | 1.0 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.39 (n too small) | 0.32 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Microsandbox Cloud | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Namespace | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Microsandbox Cloud | 0.026 (n too small) | 0.012 |
| network | iperf3 WAN download | Namespace | 0.82 (n too small) | 0.32 |
| network | iperf3 WAN download | Daytona (VM) | 1.0 (n too small) | 0.81 |
| network | iperf3 WAN download | E2B | 0.041 (n too small) | 0.077 |
| network | iperf3 WAN download | Novita | 0.94 (n too small) | 0.81 |
| network | iperf3 WAN download | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.18 (n too small) | 0.077 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN upload | Daytona (VM) | 0.82 (n too small) | 0.81 |
| network | iperf3 WAN upload | Novita | 1.0 (n too small) | 0.81 |
| network | iperf3 WAN upload | Namespace | 0.59 (n too small) | 0.81 |
| network | iperf3 WAN upload | Blaxel | 0.59 (n too small) | 0.81 |
| network | iperf3 WAN upload | Microsandbox Cloud | 0.82 (n too small) | 0.81 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Namespace | — | — |
| system | PyBench | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Blaxel | 0.82 (n too small) | 0.81 |
| system | PyBench | Microsandbox Cloud | 0.0043 (n too small) | 0.012 |
| system | PyBench | Modal (VM) | 0.37 (n too small) | 0.077 |
| system | PyBench | E2B | 0.37 (n too small) | 0.077 |
| system | PyBench | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Namespace | — | — |
| system | Git common operations | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Blaxel | 0.13 (n too small) | 0.077 |
| system | Git common operations | Novita | 0.13 (n too small) | 0.077 |
| system | Git common operations | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | Git common operations | E2B | 0.093 (n too small) | 0.077 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Namespace | 0.0087 (n too small) | 0.012 |
| system | pgbench RO (s100, 50c) | Microsandbox Cloud | 0.041 (n too small) | 0.012 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.82 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | Novita | 0.026 (n too small) | 0.012 |
| system | pgbench RO (s100, 50c) | E2B | 0.82 (n too small) | 0.81 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Namespace | 0.0087 (n too small) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Microsandbox Cloud | 0.039 (n too small) | 0.012 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.79 (n too small) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.022 (n too small) | 0.012 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.82 (n too small) | 0.81 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Namespace | — | — |
| system | pgbench RW (s100, 50c) | Blaxel | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | 0.13 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 1.0 (n too small) | 0.81 |
| system | pgbench RW (s100, 50c) | E2B | 0.015 (n too small) | 0.012 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Namespace | — | — |
| system | pgbench RW latency (s100, 50c) | Blaxel | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.13 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 1.0 (n too small) | 0.81 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.015 (n too small) | 0.012 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.093 (n too small) | 0.077 |
| system | SQLite Speedtest | Novita | 0.13 (n too small) | 0.077 |
| system | SQLite Speedtest | Namespace | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | Microsandbox Cloud | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | SQLite Speedtest | E2B | 0.70 (n too small) | 0.32 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

