# Sandbox provider leaderboard

Run `29799034615` · commit `b54d799425ef7ad49dc8b2a344b7c7b1b68eed34` · generated 2026-07-21T04:59:23.073Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **160 metric records**
backed by **240 retained trial observations**, across **40 metrics** and
**5 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

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
| Modal (gVisor) | gVisor container | gvisor |
| Novita | microVM | vm |

_Not present in this run: Daytona (container), Modal (VM) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 20.98 | 20.67 – 21.29 | 2 | — |
| 2 | Daytona (VM) | 20.62 | 20.51 – 20.73 | 2 | n too small |
| 3 | Novita | 19 | 18.8 – 19.19 | 2 | n too small |
| 4 | E2B | 13.46 | 13.45 – 13.48 | 2 | n too small |
| 5 | Modal (gVisor) | 8.79 | 8.69 – 8.89 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 245000 | 240000 – 250000 | 2 | — |
| 2 | Blaxel | 217000 | 215000 – 219000 | 2 | n too small |
| 3 | Novita | 72700 | 71100 – 74300 | 2 | n too small |
| 4 | E2B | 43850 | 43400 – 44300 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 958.5 | 939 – 978 | 2 | — |
| 2 | Blaxel | 847 | 839 – 855 | 2 | n too small |
| 3 | Novita | 284 | 278 – 290 | 2 | n too small |
| 4 | E2B | 171.5 | 170 – 173 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 226500 | 203000 – 250000 | 2 | — |
| 2 | Daytona (VM) | 217000 | 212000 – 222000 | 2 | n too small |
| 3 | Novita | 73550 | 72900 – 74200 | 2 | n too small |
| 4 | E2B | 46200 | 46200 – 46200 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 883.5 | 791 – 976 | 2 | — |
| 2 | Daytona (VM) | 847 | 827 – 867 | 2 | n too small |
| 3 | Novita | 287.5 | 285 – 290 | 2 | n too small |
| 4 | E2B | 180 | 180 – 180 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 11900 | 11600 – 12200 | 2 | — |
| 2 | Blaxel | 7191 | 6871 – 7511 | 2 | n too small |
| 3 | Daytona (VM) | 5512 | 5435 – 5589 | 2 | n too small |
| 4 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 7193 | 6873 – 7512 | 2 | — |
| 2 | Daytona (VM) | 5514 | 5437 – 5591 | 2 | n too small |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5278 | 5011 – 5544 | 2 | — |
| 2 | Blaxel | 4980 | 4916 – 5043 | 2 | n too small |
| 3 | Daytona (VM) | 3058 | 2913 – 3202 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5279 | 5012 – 5546 | 2 | — |
| 2 | Blaxel | 4982 | 4918 – 5045 | 2 | n too small |
| 3 | Daytona (VM) | 3059 | 2915 – 3203 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.26 | 26.16 – 26.35 | 2 | — |
| 2 | Blaxel | 19.55 | 19.49 – 19.62 | 2 | n too small |
| 3 | Novita | 18.13 | 18.09 – 18.16 | 2 | n too small |
| 4 | E2B | 1.4 | 1.4 – 1.4 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 184500 | 184300 – 184600 | 2 | — |
| 2 | Blaxel | 148700 | 148100 – 149300 | 2 | n too small |
| 3 | Novita | 53980 | 53950 – 54003 | 2 | n too small |
| 4 | E2B | 44930 | 44900 – 44950 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 183800 | 183663 – 184000 | 2 | — |
| 2 | Blaxel | 148700 | 147500 – 149900 | 2 | n too small |
| 3 | Novita | 53810 | 53739 – 53870 | 2 | n too small |
| 4 | E2B | 45050 | 44910 – 45180 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 213300 | 212600 – 214000 | 2 | — |
| 2 | Blaxel | 163700 | 161800 – 165700 | 2 | n too small |
| 3 | E2B | 78200 | 76690 – 79714 | 2 | n too small |
| 4 | Novita | 58160 | 58150 – 58160 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 176000 | 175600 – 176500 | 2 | — |
| 2 | Blaxel | 141100 | 138900 – 143300 | 2 | n too small |
| 3 | Novita | 51530 | 51410 – 51660 | 2 | n too small |
| 4 | E2B | 42810 | 42530 – 43090 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 4.393 | 4.253 – 4.533 | 2 | — |
| 2 | Daytona (VM) | 4.785 | 4.675 – 4.895 | 2 | n too small |
| 3 | Novita | 8.637 | 8.39 – 8.884 | 2 | n too small |
| 4 | E2B | 10.65 | 10.16 – 11.15 | 2 | n too small |
| 5 | Modal (gVisor) | 43.16 | 41.41 – 44.9 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Modal (gVisor) leads · ~225.6× Daytona (VM) on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (gVisor) | 970 | 740 – 1200 | 2 |
| 2 | Daytona (VM) | 4.3 | — | 1 |
| 3 | Blaxel | 3.6 | 3.4 – 3.8 | 2 |

### fast.com latency

ms · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2 | 2 – 2 | 2 | — |
| 1 | Daytona (VM) | 2 | — | 1 | equal values |
| 3 | Modal (gVisor) | 77.5 | 77 – 78 | 2 | — |

### fast.com loaded latency

ms · lower is better

_Daytona (VM) leads · Blaxel is ~3.5× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.01 | — | 1 | — |
| 2 | Blaxel | 7 | 7 – 7 | 2 | — |
| 3 | Modal (gVisor) | 79.5 | 79 – 80 | 2 | n too small |

### fast.com upload

Mbit/s · higher is better

_Modal (gVisor) leads · ~255.0× Daytona (VM) on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (gVisor) | 25.5 | 18 – 33 | 2 |
| 2 | Daytona (VM) | 0.1 | — | 1 |
| 3 | Blaxel | 0.075 | 0.068 – 0.082 | 2 |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (464 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 464 | 464 – 464 | 2 |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 36.08 | 36.02 – 36.14 | 2 | — |
| 2 | Blaxel | 40.91 | 40.9 – 40.91 | 2 | n too small |
| 3 | Novita | 43.96 | 43.95 – 43.96 | 2 | n too small |
| 4 | E2B | 63.6 | 63.45 – 63.75 | 2 | n too small |
| 5 | Modal (gVisor) | 81.78 | 80.63 – 82.93 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.54 | 30.4 – 30.68 | 2 | — |
| 2 | Blaxel | 36.13 | 36.01 – 36.24 | 2 | n too small |
| 3 | Novita | 39.81 | 39.66 – 39.96 | 2 | n too small |
| 4 | E2B | 67.67 | 67.17 – 68.17 | 2 | n too small |
| 5 | Modal (gVisor) | 394.8 | 383.8 – 405.8 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 25.16 | — | 1 |
| 2 | Blaxel | 26.5 | — | 1 |
| 3 | Novita | 29.55 | — | 1 |
| 4 | Modal (gVisor) | 46.27 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 55.45 | — | 1 |
| 2 | Blaxel | 55.87 | — | 1 |
| 3 | Novita | 70.53 | — | 1 |
| 4 | E2B | 94.08 | — | 1 |
| 5 | Modal (gVisor) | 143.5 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 9.716 | — | 1 |
| 2 | Blaxel | 10.3 | — | 1 |
| 3 | Novita | 10.84 | — | 1 |
| 4 | E2B | 17.05 | — | 1 |
| 5 | Modal (gVisor) | 31.21 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · E2B is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1.085 | — | 1 |
| 2 | E2B | 1.628 | — | 1 |
| 3 | Daytona (VM) | 1.688 | — | 1 |
| 4 | Novita | 2.088 | — | 1 |
| 5 | Modal (gVisor) | 2.717 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.953 | — | 1 |
| 2 | Blaxel | 3.015 | — | 1 |
| 3 | Novita | 3.574 | — | 1 |
| 4 | E2B | 4.87 | — | 1 |
| 5 | Modal (gVisor) | 10 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 9.696 | — | 1 |
| 2 | Blaxel | 9.906 | — | 1 |
| 3 | Novita | 11.47 | — | 1 |
| 4 | E2B | 18.1 | — | 1 |
| 5 | Modal (gVisor) | 29.01 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.636 | — | 1 |
| 2 | Novita | 2.904 | — | 1 |
| 3 | Blaxel | 2.91 | — | 1 |
| 4 | E2B | 4.873 | — | 1 |
| 5 | Modal (gVisor) | 6.548 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.488 | — | 1 |
| 2 | Blaxel | 2.491 | — | 1 |
| 3 | Novita | 2.878 | — | 1 |
| 4 | E2B | 4.142 | — | 1 |
| 5 | Modal (gVisor) | 9.76 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 6.47 | — | 1 |
| 2 | Blaxel | 6.679 | — | 1 |
| 3 | Novita | 7.442 | — | 1 |
| 4 | E2B | 11.95 | — | 1 |
| 5 | Modal (gVisor) | 15 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 24.53 | — | 1 |
| 2 | Blaxel | 25.4 | — | 1 |
| 3 | Novita | 34.4 | — | 1 |
| 4 | E2B | 46.7 | — | 1 |
| 5 | Modal (gVisor) | 119.2 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 39.55 | — | 1 |
| 2 | Blaxel | 41.1 | — | 1 |
| 3 | Novita | 44.01 | — | 1 |
| 4 | E2B | 68.59 | — | 1 |
| 5 | Modal (gVisor) | 78.23 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 71.37 | — | 1 |
| 2 | Blaxel | 72.6 | — | 1 |
| 3 | Novita | 72.83 | — | 1 |
| 4 | Modal (gVisor) | 119.8 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Modal (gVisor) is ~1.7× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.123 | — | 1 |
| 2 | Modal (gVisor) | 3.708 | — | 1 |
| 3 | Daytona (VM) | 6.532 | — | 1 |
| 4 | Novita | 6.86 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 89.32 | — | 1 |
| 2 | Novita | 92.72 | — | 1 |
| 3 | Daytona (VM) | 94 | — | 1 |
| 4 | Modal (gVisor) | 142.5 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.9 | — | 1 |
| 2 | Novita | 6.651 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Novita leads · Blaxel is ~2.3× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 3.73 | — | 1 |
| 2 | Blaxel | 8.611 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 38.23 | — | 1 |
| 2 | Novita | 46.66 | — | 1 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 0.2333 | — | 1 |
| 2 | Daytona (VM) | 0.2502 | — | 1 |
| 3 | E2B | 0.3312 | — | 1 |
| 4 | Modal (gVisor) | 0.7612 | — | 1 |

## Coverage gaps

8 uncovered results across 4 providers (Daytona (VM) 1, E2B 3, Modal (gVisor) 3, Novita 1). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Daytona (VM) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| E2B | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Novita | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal (gVisor) | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal (gVisor) | memory | **missing** | No result and no marker — the suite never reported for this provider. |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

**missing** — nothing was reported at all: no result, and no marker explaining why. The suite ran
elsewhere in this run, so it was part of the comparison, and this provider is simply absent from
it — a dropped job, a lost artifact, or a sandbox that died before it could say anything. Treat it
as unmeasured, never as a pass: the provider has not been shown to run this workload.

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
`equal medians` / `equal values` — arithmetic, not a finding: the ranking sorts on the value,
and two identical values have no order between them. It says nothing about the distributions.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

`n too small` is the extreme of that: Mann-Whitney's best attainable p already exceeds α for those
Samples, so the test could not have separated the rows at any effect size (here 2 v 2 floors at p ≈ 0.33).
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
| cpu | Node.js web tooling | Blaxel | — | — |
| cpu | Node.js web tooling | Daytona (VM) | 0.67 (n too small) | 0.84 |
| cpu | Node.js web tooling | Novita | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Blaxel | — | — |
| network | Loopback TCP (10GB) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Novita | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | fast.com download | Modal (gVisor) | — | — |
| network | fast.com download | Daytona (VM) | — | — |
| network | fast.com download | Blaxel | — | — |
| network | fast.com latency | Blaxel | — | — |
| network | fast.com latency | Daytona (VM) | — (equal values) | — |
| network | fast.com latency | Modal (gVisor) | — | — |
| network | fast.com loaded latency | Daytona (VM) | — | — |
| network | fast.com loaded latency | Blaxel | — | — |
| network | fast.com loaded latency | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | fast.com upload | Modal (gVisor) | — | — |
| network | fast.com upload | Daytona (VM) | — | — |
| network | fast.com upload | Blaxel | — | — |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal (gVisor) | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal (gVisor) | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal (gVisor) | — | — |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Modal (gVisor) | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (gVisor) | — | — |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: lint:format | Blaxel | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Modal (gVisor) | — | — |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |

</details>

