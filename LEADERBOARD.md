# Sandbox provider leaderboard

Run `29700250241` · commit `d61097c50949eeeddb3cd14b2a785690e8f5966e` · generated 2026-07-20T04:30:37.319Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **164 metric records**
backed by **250 retained trial observations**, across **40 metrics** and
**5 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 18.77 | 18.76 – 18.79 | 2 | — |
| 2 | Novita | 18.22 | 14.77 – 21.67 | 2 | n too small |
| 3 | Blaxel | 13.27 | 13.08 – 13.46 | 2 | n too small |
| 4 | E2B | 11.4 | 10.93 – 11.87 | 2 | n too small |
| 5 | Modal | 8.795 | 8.67 – 8.92 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 262000 | 258000 – 266000 | 2 | — |
| 2 | Daytona | 247000 | 243000 – 251000 | 2 | n too small |
| 3 | Novita | 78100 | 75600 – 80600 | 2 | n too small |
| 4 | E2B | 44350 | 43200 – 45500 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1024 | 1008 – 1039 | 2 | — |
| 2 | Daytona | 963.5 | 948 – 979 | 2 | n too small |
| 3 | Novita | 305 | 295 – 315 | 2 | n too small |
| 4 | E2B | 173.5 | 169 – 178 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 238000 | 235000 – 241000 | 2 | — |
| 2 | Daytona | 223500 | 221000 – 226000 | 2 | n too small |
| 3 | Novita | 81250 | 81100 – 81400 | 2 | n too small |
| 4 | E2B | 45350 | 45000 – 45700 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 930 | 918 – 942 | 2 | — |
| 2 | Daytona | 873.5 | 864 – 883 | 2 | n too small |
| 3 | Novita | 317.5 | 317 – 318 | 2 | n too small |
| 4 | E2B | 177 | 176 – 178 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 12284 | 7568 – 17000 | 2 | — |
| 2 | Novita | 12150 | 11800 – 12500 | 2 | n too small |
| 3 | Blaxel | 3087 | 3050 – 3123 | 2 | n too small |
| 4 | E2B | 600 | 600 – 600 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~2.5× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7570 | — | 1 | — |
| 2 | Blaxel | 3089 | 3052 – 3125 | 2 | — |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.8× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6417 | 6117 – 6717 | 2 | — |
| 2 | Daytona | 3578 | 3202 – 3953 | 2 | n too small |
| 3 | Blaxel | 2537 | 2442 – 2632 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.8× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6419 | 6119 – 6719 | 2 | — |
| 2 | Daytona | 3579 | 3203 – 3955 | 2 | n too small |
| 3 | Blaxel | 2539 | 2444 – 2634 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~1.4× Novita on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 26.23 | 26.13 – 26.32 | 2 | — |
| 2 | Novita | 19.34 | 19.32 – 19.36 | 2 | n too small |
| 3 | E2B | 1.48 | 1.46 – 1.5 | 2 | n too small |
| 4 | Blaxel | 0.33 | 0.33 – 0.33 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona leads · ~3.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 185500 | 185100 – 185900 | 2 | — |
| 2 | Blaxel | 53610 | 53430 – 53780 | 2 | n too small |
| 3 | Novita | 51240 | 51210 – 51280 | 2 | n too small |
| 4 | E2B | 49470 | 48680 – 50250 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona leads · ~3.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 185000 | 184900 – 185100 | 2 | — |
| 2 | Blaxel | 53450 | 53400 – 53500 | 2 | n too small |
| 3 | Novita | 51310 | 51010 – 51620 | 2 | n too small |
| 4 | E2B | 49460 | 49410 – 49500 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona leads · ~2.4× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 216500 | 216300 – 216700 | 2 | — |
| 2 | Blaxel | 89290 | 87180 – 91400 | 2 | n too small |
| 3 | E2B | 85900 | 81290 – 90500 | 2 | n too small |
| 4 | Novita | 56500 | 56180 – 56820 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona leads · ~3.6× Novita on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 177000 | 176800 – 177100 | 2 | — |
| 2 | Novita | 48710 | 48380 – 49040 | 2 | n too small |
| 3 | Blaxel | 45940 | 45450 – 46420 | 2 | n too small |
| 4 | E2B | 44320 | 43300 – 45340 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5.021 | 4.932 – 5.11 | 2 | — |
| 2 | Blaxel | 5.644 | 5.359 – 5.929 | 2 | n too small |
| 3 | Novita | 9.005 | 8.981 – 9.03 | 2 | n too small |
| 4 | E2B | 10.18 | 9.836 – 10.52 | 2 | n too small |
| 5 | Modal | 44.32 | 42.83 – 45.81 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Modal leads · ~3.4× Novita on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal | 565 | 550 – 580 | 2 | — |
| 2 | Novita | 166.5 | 13 – 320 | 2 | n too small |
| 3 | E2B | 1.03 | 0.86 – 1.2 | 2 | n too small |
| 4 | Blaxel | 0.575 | 0.56 – 0.59 | 2 | n too small |

### fast.com latency

ms · lower is better

_Blaxel leads · E2B is ~3.0× higher (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2 | 2 – 2 | 2 | — |
| 2 | E2B | 6 | 6 – 6 | 2 | n too small |
| 3 | Novita | 9.5 | 9 – 10 | 2 | n too small |
| 4 | Modal | 94.5 | 94 – 95 | 2 | n too small |

### fast.com loaded latency

ms · lower is better

_Blaxel leads · E2B is ~1.1× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 7 | 7 – 7 | 2 | — |
| 2 | E2B | 8 | — | 1 | — |
| 3 | Novita | 10.5 | 10 – 11 | 2 | — |
| 4 | Modal | 96 | 96 – 96 | 2 | n too small |

### fast.com upload

Mbit/s · higher is better

_Novita leads · ~2.1× Blaxel on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 2700 | 2500 – 2900 | 2 | — |
| 2 | Blaxel | 1300 | 1100 – 1500 | 2 | n too small |
| 3 | E2B | 960 | 920 – 1000 | 2 | n too small |
| 4 | Modal | 250 | 220 – 280 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (841 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 841 | 839 – 843 | 2 |

### Git common operations

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 39.26 | 39.07 – 39.46 | 2 | — |
| 2 | Novita | 44.32 | 43.73 – 44.91 | 2 | n too small |
| 3 | E2B | 63.74 | 63.54 – 63.94 | 2 | n too small |
| 4 | Blaxel | 74.66 | 74.43 – 74.89 | 2 | n too small |
| 5 | Modal | 80.27 | 80.15 – 80.39 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 34.28 | 34.24 – 34.32 | 2 | — |
| 2 | Novita | 41.96 | 40.47 – 43.46 | 2 | n too small |
| 3 | E2B | 65.97 | 65.81 – 66.14 | 2 | n too small |
| 4 | Blaxel | 68.42 | 66.97 – 69.87 | 2 | n too small |
| 5 | Modal | 480.4 | 467.9 – 493 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 24.21 | — | 1 |
| 2 | Novita | 28.33 | — | 1 |
| 3 | Blaxel | 46.25 | — | 1 |
| 4 | Modal | 66.84 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 51.56 | — | 1 |
| 2 | Novita | 67.97 | — | 1 |
| 3 | E2B | 96.53 | — | 1 |
| 4 | Blaxel | 102.3 | — | 1 |
| 5 | Modal | 137.2 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 9.387 | — | 1 |
| 2 | Novita | 10.55 | — | 1 |
| 3 | E2B | 17.07 | — | 1 |
| 4 | Blaxel | 30.35 | — | 1 |
| 5 | Modal | 30.88 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 1.797 | — | 1 |
| 2 | Novita | 2.205 | — | 1 |
| 3 | E2B | 2.606 | — | 1 |
| 4 | Blaxel | 2.957 | — | 1 |
| 5 | Modal | 3.379 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.821 | — | 1 |
| 2 | Novita | 3.384 | — | 1 |
| 3 | E2B | 4.996 | — | 1 |
| 4 | Blaxel | 7.692 | — | 1 |
| 5 | Modal | 9.526 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 10.06 | — | 1 |
| 2 | Novita | 11.24 | — | 1 |
| 3 | E2B | 18.06 | — | 1 |
| 4 | Blaxel | 23.94 | — | 1 |
| 5 | Modal | 28.1 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.722 | — | 1 |
| 2 | Novita | 2.86 | — | 1 |
| 3 | E2B | 5.091 | — | 1 |
| 4 | Blaxel | 5.305 | — | 1 |
| 5 | Modal | 6.548 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.273 | — | 1 |
| 2 | Novita | 2.855 | — | 1 |
| 3 | E2B | 4.048 | — | 1 |
| 4 | Blaxel | 4.465 | — | 1 |
| 5 | Modal | 10.11 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 7.046 | — | 1 |
| 2 | Novita | 7.279 | — | 1 |
| 3 | Blaxel | 13.66 | — | 1 |
| 4 | E2B | 13.73 | — | 1 |
| 5 | Modal | 14.85 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona leads · Novita is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 22.36 | — | 1 |
| 2 | Novita | 33.16 | — | 1 |
| 3 | E2B | 50.4 | — | 1 |
| 4 | Blaxel | 58.78 | — | 1 |
| 5 | Modal | 101.8 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 37.4 | — | 1 |
| 2 | Novita | 40.29 | — | 1 |
| 3 | Blaxel | 70.3 | — | 1 |
| 4 | E2B | 70.46 | — | 1 |
| 5 | Modal | 82.27 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 71.06 | — | 1 |
| 2 | Novita | 71.42 | — | 1 |
| 3 | Blaxel | 129.5 | — | 1 |
| 4 | Modal | 160.4 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Daytona leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.653 | — | 1 |
| 2 | Novita | 3.784 | — | 1 |
| 3 | Modal | 9.881 | — | 1 |
| 4 | Blaxel | 11.78 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 90.86 | — | 1 |
| 2 | Daytona | 94.94 | — | 1 |
| 3 | Blaxel | 163.4 | — | 1 |
| 4 | Modal | 192.4 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Novita leads · Blaxel is ~2.9× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 5.832 | — | 1 |
| 2 | Blaxel | 16.87 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Novita leads · Blaxel is ~4.1× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 4.889 | — | 1 |
| 2 | Blaxel | 20.17 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Novita leads · Blaxel is ~1.7× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 41.84 | — | 1 |
| 2 | Blaxel | 72.26 | — | 1 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 0.2333 | — | 1 |
| 2 | Daytona | 0.2502 | — | 1 |
| 3 | E2B | 0.3312 | — | 1 |
| 4 | Modal | 0.7612 | — | 1 |

## Coverage gaps

7 uncovered results across 3 providers (Daytona 2, E2B 2, Modal 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Daytona | network | **failed** | Step "mise run benchmark:network:all" timed out after 2700s |
| Daytona | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Modal | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | memory | **missing** | No result and no marker — the suite never reported for this provider. |

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
| cpu | Node.js web tooling | Daytona | — | — |
| cpu | Node.js web tooling | Novita | 1.0 (n too small) | 0.84 |
| cpu | Node.js web tooling | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona | — | — |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.67 (n too small) | 0.84 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona | — | — |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Daytona | — | — |
| network | Loopback TCP (10GB) | Blaxel | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Novita | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com download | Modal | — | — |
| network | fast.com download | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com download | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com download | Blaxel | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Blaxel | — | — |
| network | fast.com latency | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com loaded latency | Blaxel | — | — |
| network | fast.com loaded latency | E2B | — | — |
| network | fast.com loaded latency | Novita | — | — |
| network | fast.com loaded latency | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com upload | Novita | — | — |
| network | fast.com upload | Blaxel | 0.33 (n too small) | 0.097 |
| network | fast.com upload | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com upload | Modal | 0.33 (n too small) | 0.097 |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona | — | — |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Modal | — | — |
| realworld | Better-Auth: build | Daytona | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Modal | — | — |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Modal | — | — |
| realworld | Better-Auth: git clone | Daytona | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Modal | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Modal | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal | — | — |
| realworld | Better-Auth: lint format | Daytona | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | Modal | — | — |
| realworld | Better-Auth: lint packages | Daytona | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Modal | — | — |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal | — | — |
| realworld | Better-Auth: lint types | Daytona | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Modal | — | — |
| realworld | Better-Auth: typecheck | Daytona | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal | — | — |
| realworld | Mastra: build:core | Daytona | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Blaxel | — | — |
| realworld | Mastra: build:core | Modal | — | — |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Modal | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Blaxel | — | — |
| realworld | Mastra: lint:format | Modal | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

