# Sandbox provider leaderboard

Run `29692210375` · commit `81e641fed66fc981d1e2b4fedc6a646d318b361c` · generated 2026-07-19T19:23:28.838Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **163 metric records**
backed by **247 retained trial observations**, across **40 metrics** and
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
| 1 | Daytona | 18.46 | 18.29 – 18.64 | 2 | — |
| 2 | Novita | 17.8 | 17.63 – 17.97 | 2 | n too small |
| 3 | Blaxel | 13.64 | 13.54 – 13.75 | 2 | n too small |
| 4 | E2B | 11.38 | 11.26 – 11.5 | 2 | n too small |
| 5 | Modal | 8.965 | 8.96 – 8.97 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 268000 | 264000 – 272000 | 2 | — |
| 2 | Daytona | 264000 | 264000 – 264000 | 2 | n too small |
| 3 | Novita | 75900 | 73800 – 78000 | 2 | n too small |
| 4 | E2B | 45000 | 44100 – 45900 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1047 | 1030 – 1063 | 2 | — |
| 2 | Daytona | 1031 | 1030 – 1032 | 2 | n too small |
| 3 | Novita | 296.5 | 288 – 305 | 2 | n too small |
| 4 | E2B | 175.5 | 172 – 179 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 249000 | 248000 – 250000 | 2 | — |
| 2 | Daytona | 228500 | 228000 – 229000 | 2 | n too small |
| 3 | Novita | 78050 | 76900 – 79200 | 2 | n too small |
| 4 | E2B | 45900 | 45700 – 46100 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 973.5 | 970 – 977 | 2 | — |
| 2 | Daytona | 894.5 | 893 – 896 | 2 | n too small |
| 3 | Novita | 305 | 301 – 309 | 2 | n too small |
| 4 | E2B | 179 | 178 – 180 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.5× Daytona on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 11000 | 10700 – 11300 | 2 | — |
| 2 | Daytona | 7243 | 6765 – 7720 | 2 | n too small |
| 3 | Blaxel | 3054 | 3030 – 3077 | 2 | n too small |
| 4 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~2.4× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7245 | 6767 – 7722 | 2 | — |
| 2 | Blaxel | 3055 | 3031 – 3079 | 2 | n too small |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.8× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6580 | 6485 – 6675 | 2 | — |
| 2 | Daytona | 3695 | 3660 – 3729 | 2 | n too small |
| 3 | Blaxel | 2600 | 2562 – 2637 | 2 | n too small |
| 4 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.8× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6582 | 6486 – 6677 | 2 | — |
| 2 | Daytona | 3696 | 3661 – 3731 | 2 | n too small |
| 3 | Blaxel | 2601 | 2563 – 2639 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~1.4× Novita on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 26.23 | 26.06 – 26.39 | 2 | — |
| 2 | Novita | 19.22 | 19.22 – 19.22 | 2 | n too small |
| 3 | E2B | 1.445 | 1.43 – 1.46 | 2 | n too small |
| 4 | Blaxel | 0.35 | 0.35 – 0.35 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 121600 | 113600 – 129600 | 2 | — |
| 2 | Blaxel | 54290 | 53940 – 54640 | 2 | n too small |
| 3 | Novita | 53320 | 53210 – 53420 | 2 | n too small |
| 4 | E2B | 47210 | 46960 – 47470 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 118300 | 115400 – 121172 | 2 | — |
| 2 | Blaxel | 53580 | 53070 – 54100 | 2 | n too small |
| 3 | Novita | 53440 | 53310 – 53580 | 2 | n too small |
| 4 | E2B | 47680 | 47600 – 47760 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 141500 | 137100 – 145800 | 2 | — |
| 2 | Blaxel | 91561 | 90900 – 92230 | 2 | n too small |
| 3 | E2B | 81810 | 80415 – 83200 | 2 | n too small |
| 4 | Novita | 58420 | 58330 – 58510 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona leads · ~2.2× Novita on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 110100 | 105300 – 114900 | 2 | — |
| 2 | Novita | 50590 | 50540 – 50640 | 2 | n too small |
| 3 | Blaxel | 48160 | 46790 – 49530 | 2 | n too small |
| 4 | E2B | 42190 | 41957 – 42430 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 4.783 | 4.697 – 4.868 | 2 | — |
| 2 | Blaxel | 5.386 | 5.299 – 5.473 | 2 | n too small |
| 3 | Novita | 7.949 | 7.777 – 8.121 | 2 | n too small |
| 4 | E2B | 9.771 | 9.272 – 10.27 | 2 | n too small |
| 5 | Modal | 42.22 | 40.95 – 43.49 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Blaxel leads · ~5.5× Modal on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3150 | 2500 – 3800 | 2 | — |
| 2 | Modal | 575 | 400 – 750 | 2 | n too small |
| 3 | Novita | 122 | 14 – 230 | 2 | n too small |
| 4 | E2B | 1.235 | 0.67 – 1.8 | 2 | n too small |

### fast.com latency

ms · lower is better

_Blaxel leads · E2B is ~1.2× higher (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 6 | 6 – 6 | 2 | — |
| 2 | E2B | 7 | 7 – 7 | 2 | n too small |
| 3 | Novita | 10 | 9 – 11 | 2 | n too small |
| 4 | Modal | 79.5 | 78 – 81 | 2 | n too small |

### fast.com loaded latency

ms · lower is better

_E2B leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 8 | — | 1 |
| 2 | Novita | 10 | — | 1 |
| 3 | Modal | 80 | — | 1 |

### fast.com upload

Mbit/s · higher is better

_Novita leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 2900 | 2700 – 3100 | 2 | — |
| 2 | Blaxel | 1750 | 1600 – 1900 | 2 | n too small |
| 3 | E2B | 965 | 830 – 1100 | 2 | n too small |
| 4 | Modal | 245 | 220 – 270 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (841 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 841 | 837 – 845 | 2 |

### Git common operations

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 36.07 | 35.8 – 36.35 | 2 | — |
| 2 | Novita | 43.32 | 43.23 – 43.4 | 2 | n too small |
| 3 | E2B | 64.34 | 63.92 – 64.77 | 2 | n too small |
| 4 | Blaxel | 71.15 | 70.76 – 71.53 | 2 | n too small |
| 5 | Modal | 89.35 | 86.9 – 91.8 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 30.72 | 30.58 – 30.86 | 2 | — |
| 2 | Novita | 39.01 | 38.85 – 39.17 | 2 | n too small |
| 3 | Blaxel | 68.08 | 66.68 – 69.48 | 2 | n too small |
| 4 | E2B | 71.16 | 69.36 – 72.95 | 2 | n too small |
| 5 | Modal | 493.6 | 481.6 – 505.7 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 25.41 | — | 1 |
| 2 | Novita | 32.93 | — | 1 |
| 3 | Blaxel | 41.65 | — | 1 |
| 4 | Modal | 63.26 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 56.23 | — | 1 |
| 2 | Novita | 63.5 | — | 1 |
| 3 | Blaxel | 97.76 | — | 1 |
| 4 | E2B | 110.2 | — | 1 |
| 5 | Modal | 141.5 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 10.47 | — | 1 |
| 2 | Novita | 10.79 | — | 1 |
| 3 | E2B | 18.78 | — | 1 |
| 4 | Modal | 29.84 | — | 1 |
| 5 | Blaxel | 31.24 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_E2B leads · Daytona is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 1.697 | — | 1 |
| 2 | Daytona | 1.787 | — | 1 |
| 3 | Novita | 2.354 | — | 1 |
| 4 | Modal | 2.706 | — | 1 |
| 5 | Blaxel | 3.505 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.909 | — | 1 |
| 2 | Novita | 3.173 | — | 1 |
| 3 | E2B | 6.168 | — | 1 |
| 4 | Blaxel | 7.247 | — | 1 |
| 5 | Modal | 11.19 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 9.632 | — | 1 |
| 2 | Novita | 10.5 | — | 1 |
| 3 | E2B | 20.02 | — | 1 |
| 4 | Blaxel | 23.05 | — | 1 |
| 5 | Modal | 30.08 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.62 | — | 1 |
| 2 | Novita | 2.815 | — | 1 |
| 3 | Blaxel | 5.146 | — | 1 |
| 4 | E2B | 5.485 | — | 1 |
| 5 | Modal | 6.694 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.466 | — | 1 |
| 2 | Novita | 2.58 | — | 1 |
| 3 | Blaxel | 4.542 | — | 1 |
| 4 | E2B | 4.644 | — | 1 |
| 5 | Modal | 11.65 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 6.559 | — | 1 |
| 2 | Novita | 7.3 | — | 1 |
| 3 | Blaxel | 12.56 | — | 1 |
| 4 | E2B | 14.86 | — | 1 |
| 5 | Modal | 17.09 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 25.14 | — | 1 |
| 2 | Novita | 29.19 | — | 1 |
| 3 | Blaxel | 55.6 | — | 1 |
| 4 | E2B | 56.49 | — | 1 |
| 5 | Modal | 108.5 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 39.74 | — | 1 |
| 2 | Novita | 43.39 | — | 1 |
| 3 | Blaxel | 66.09 | — | 1 |
| 4 | E2B | 83.5 | — | 1 |
| 5 | Modal | 87.87 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 68.77 | — | 1 |
| 2 | Novita | 85.56 | — | 1 |
| 3 | Blaxel | 122.6 | — | 1 |
| 4 | Modal | 171 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Novita leads · Daytona is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 7.021 | — | 1 |
| 2 | Daytona | 7.665 | — | 1 |
| 3 | Modal | 9.662 | — | 1 |
| 4 | Blaxel | 11.86 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 84.33 | — | 1 |
| 2 | Novita | 98.22 | — | 1 |
| 3 | Blaxel | 142.1 | — | 1 |
| 4 | Modal | 190.5 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Novita leads · Blaxel is ~2.5× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 5.201 | — | 1 |
| 2 | Blaxel | 13.15 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Novita leads · Blaxel is ~2.1× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 9.333 | — | 1 |
| 2 | Blaxel | 20.02 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Novita leads · Blaxel is ~1.6× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 42.1 | — | 1 |
| 2 | Blaxel | 67.41 | — | 1 |

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

8 uncovered results across 4 providers (Blaxel 1, Daytona 2, E2B 2, Modal 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
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
| cpu | Node.js web tooling | Novita | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 1.0 (n too small) | 0.84 |
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
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
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
| memory | STREAM Add | Novita | 1.0 (n too small) | 0.84 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
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
| network | fast.com download | Blaxel | — | — |
| network | fast.com download | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com download | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com download | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Blaxel | — | — |
| network | fast.com latency | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com loaded latency | E2B | — | — |
| network | fast.com loaded latency | Novita | — | — |
| network | fast.com loaded latency | Modal | — | — |
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
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.67 (n too small) | 0.84 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Modal | — | — |
| realworld | Better-Auth: build | Daytona | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal | — | — |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Daytona | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
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
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal | — | — |
| realworld | Better-Auth: lint packages | Daytona | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal | — | — |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal | — | — |
| realworld | Better-Auth: lint types | Daytona | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
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
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Modal | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
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

