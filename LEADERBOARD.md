# Sandbox provider leaderboard

Run `29619093940` · commit `1c7233261fc50e8060e500ee53a00e7690a76dca` · generated 2026-07-18T00:26:58.978Z

Requested target for every provider: **2 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **164 metric records**
backed by **258 retained trial observations**, across **40 metrics** and
**5 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

> **Comparability warning:** Blaxel's observed compute did not match the requested CPU/RAM target; its observed allocation was **6 vCPU · 15.63 GiB RAM · 12.5 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 19.02 | 18.87 – 19.17 | 2 | — |
| 2 | Novita | 16.36 | 16.2 – 16.52 | 2 | n too small |
| 3 | Blaxel | 12.79 | 12.7 – 12.89 | 2 | n too small |
| 4 | E2B | 10.85 | 10.85 – 10.85 | 2 | n too small |
| 5 | Modal | 9.465 | 9.31 – 9.62 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~1.9× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 510500 | 495000 – 526000 | 2 | — |
| 2 | Daytona | 263500 | 260000 – 267000 | 2 | n too small |
| 3 | Modal | 170500 | 170000 – 171000 | 2 | n too small |
| 4 | Novita | 68600 | 67000 – 70200 | 2 | n too small |
| 5 | E2B | 39300 | 38500 – 40100 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.9× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1996 | 1935 – 2056 | 2 | — |
| 2 | Daytona | 1029 | 1014 – 1043 | 2 | n too small |
| 3 | Modal | 665 | 662 – 668 | 2 | n too small |
| 4 | Novita | 268 | 262 – 274 | 2 | n too small |
| 5 | E2B | 153.5 | 150 – 157 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 470500 | 467000 – 474000 | 2 | — |
| 2 | Daytona | 210500 | 191000 – 230000 | 2 | n too small |
| 3 | Modal | 172500 | 169000 – 176000 | 2 | n too small |
| 4 | Novita | 70800 | 69500 – 72100 | 2 | n too small |
| 5 | E2B | 41550 | 41500 – 41600 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1839 | 1825 – 1852 | 2 | — |
| 2 | Daytona | 820.5 | 744 – 897 | 2 | n too small |
| 3 | Modal | 674 | 660 – 688 | 2 | n too small |
| 4 | Novita | 277 | 272 – 282 | 2 | n too small |
| 5 | E2B | 162.5 | 162 – 163 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.2× Modal on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 12600 | 12400 – 12800 | 2 | — |
| 2 | Modal | 10700 | 10200 – 11200 | 2 | n too small |
| 3 | Daytona | 6845 | 4313 – 9376 | 2 | n too small |
| 4 | Blaxel | 3862 | 3442 – 4282 | 2 | n too small |
| 5 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6846 | 4315 – 9377 | 2 | — |
| 2 | Blaxel | 3864 | 3444 – 4283 | 2 | n too small |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5532 | 5130 – 5934 | 2 | — |
| 2 | Daytona | 4904 | 4899 – 4909 | 2 | n too small |
| 3 | Modal | 4193 | 4037 – 4348 | 2 | n too small |
| 4 | Blaxel | 3186 | 3154 – 3218 | 2 | n too small |
| 5 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5534 | 5132 – 5936 | 2 | — |
| 2 | Daytona | 4906 | 4900 – 4911 | 2 | n too small |
| 3 | Modal | 4194 | 4038 – 4350 | 2 | n too small |
| 4 | Blaxel | 3188 | 3156 – 3219 | 2 | n too small |
| 5 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~1.4× Novita on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 25.7 | 25.63 – 25.76 | 2 | — |
| 2 | Novita | 18.7 | 18.59 – 18.82 | 2 | n too small |
| 3 | Blaxel | 11.55 | 11.52 – 11.59 | 2 | n too small |
| 4 | Modal | 4.59 | 4.59 – 4.59 | 2 | n too small |
| 5 | E2B | 1.46 | 1.46 – 1.46 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 80920 | 80650 – 81190 | 2 | — |
| 2 | Blaxel | 70360 | 69960 – 70770 | 2 | n too small |
| 3 | Novita | 51550 | 51390 – 51720 | 2 | n too small |
| 4 | E2B | 24140 | 23780 – 24500 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 80510 | 80280 – 80740 | 2 | — |
| 2 | Blaxel | 70270 | 69792 – 70760 | 2 | n too small |
| 3 | Novita | 51590 | 51410 – 51770 | 2 | n too small |
| 4 | E2B | 24330 | 24300 – 24360 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 107474 | 106600 – 108400 | 2 | — |
| 2 | Daytona | 86940 | 86670 – 87210 | 2 | n too small |
| 3 | Novita | 56300 | 56230 – 56370 | 2 | n too small |
| 4 | E2B | 45670 | 45090 – 46250 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 76030 | 75940 – 76120 | 2 | — |
| 2 | Blaxel | 59230 | 58930 – 59525 | 2 | n too small |
| 3 | Novita | 49490 | 49250 – 49740 | 2 | n too small |
| 4 | E2B | 22700 | 22499 – 22910 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5.104 | 4.981 – 5.226 | 2 | — |
| 2 | Blaxel | 6.242 | 6.056 – 6.427 | 2 | n too small |
| 3 | Novita | 8.384 | 7.754 – 9.015 | 2 | n too small |
| 4 | E2B | 14.45 | 14.25 – 14.64 | 2 | n too small |
| 5 | Modal | 57.1 | 57.02 – 57.17 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Blaxel leads · ~13.9× Modal on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3200 | 3100 – 3300 | 2 | — |
| 2 | Modal | 230 | 220 – 240 | 2 | n too small |
| 3 | Novita | 15 | 12 – 18 | 2 | n too small |
| 4 | E2B | 3.55 | 2.7 – 4.4 | 2 | n too small |

### fast.com latency

ms · lower is better

_Blaxel leads · E2B is ~1.1× higher (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 6 | 6 – 6 | 2 | — |
| 2 | E2B | 6.5 | 6 – 7 | 2 | n too small |
| 3 | Novita | 10 | 10 – 10 | 2 | n too small |
| 4 | Modal | 79 | 78 – 80 | 2 | n too small |

### fast.com loaded latency

ms · lower is better

_E2B leads · Novita is ~1.7× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | E2B | 6.5 | 6 – 7 | 2 | — |
| 2 | Novita | 11 | 11 – 11 | 2 | n too small |
| 3 | Modal | 79.5 | 78 – 81 | 2 | n too small |

### fast.com upload

Mbit/s · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 1900 | 1900 – 1900 | 2 | — |
| 2 | Blaxel | 1650 | 1600 – 1700 | 2 | n too small |
| 3 | E2B | 820 | 820 – 820 | 2 | n too small |
| 4 | Modal | 230 | — | 1 | — |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (845 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 845 | 842 – 848 | 2 |

### Git common operations

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 39.04 | 39.01 – 39.08 | 2 | — |
| 2 | Novita | 44.38 | 44.09 – 44.66 | 2 | n too small |
| 3 | Blaxel | 61.47 | 61.44 – 61.49 | 2 | n too small |
| 4 | E2B | 65.04 | 65 – 65.08 | 2 | n too small |
| 5 | Modal | 79.13 | 76.64 – 81.62 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 34.99 | 34.45 – 35.52 | 2 | — |
| 2 | Novita | 42.24 | 42.24 – 42.24 | 2 | n too small |
| 3 | Blaxel | 69.18 | 68.45 – 69.91 | 2 | n too small |
| 4 | E2B | 69.57 | 69.48 – 69.65 | 2 | n too small |
| 5 | Modal | 548.8 | 509.2 – 588.4 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 32.7 | — | 1 |
| 2 | Novita | 34.39 | — | 1 |
| 3 | Modal | 77.88 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 10.73 | — | 1 |
| 2 | Daytona | 12.61 | — | 1 |
| 3 | Novita | 14.18 | — | 1 |
| 4 | E2B | 22.42 | — | 1 |
| 5 | Modal | 42.74 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 12.24 | — | 1 |
| 2 | Daytona | 12.58 | — | 1 |
| 3 | Blaxel | 16.39 | — | 1 |
| 4 | E2B | 20.74 | — | 1 |
| 5 | Modal | 31.8 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 1.675 | — | 1 |
| 2 | Blaxel | 1.703 | — | 1 |
| 3 | E2B | 2.219 | — | 1 |
| 4 | Novita | 2.343 | — | 1 |
| 5 | Modal | 3.443 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 3.674 | — | 1 |
| 2 | Daytona | 4.813 | — | 1 |
| 3 | Novita | 5.306 | — | 1 |
| 4 | E2B | 8.113 | — | 1 |
| 5 | Modal | 18.32 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 11 | — | 1 |
| 2 | Novita | 11.37 | — | 1 |
| 3 | Blaxel | 16.11 | — | 1 |
| 4 | E2B | 19.44 | — | 1 |
| 5 | Modal | 33.81 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.842 | — | 1 |
| 2 | Novita | 3.013 | — | 1 |
| 3 | Blaxel | 4.975 | — | 1 |
| 4 | E2B | 5.395 | — | 1 |
| 5 | Modal | 7.767 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 3.214 | — | 1 |
| 2 | Daytona | 3.977 | — | 1 |
| 3 | Novita | 4.474 | — | 1 |
| 4 | E2B | 7.403 | — | 1 |
| 5 | Modal | 15.84 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 6.74 | — | 1 |
| 2 | Novita | 7.498 | — | 1 |
| 3 | Blaxel | 12.25 | — | 1 |
| 4 | E2B | 14.85 | — | 1 |
| 5 | Modal | 17.22 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads · Daytona is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 32.9 | — | 1 |
| 2 | Daytona | 49.95 | — | 1 |
| 3 | Novita | 58.85 | — | 1 |
| 4 | E2B | 108.3 | — | 1 |
| 5 | Modal | 192.8 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 1.463 | — | 1 |
| 2 | Daytona | 1.467 | — | 1 |
| 3 | Blaxel | 2.061 | — | 1 |
| 4 | E2B | 2.258 | — | 1 |
| 5 | Modal | 3.415 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 89.48 | — | 1 |
| 2 | Novita | 94.83 | — | 1 |
| 3 | Modal | 214.2 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 6.332 | — | 1 |
| 2 | Novita | 7.128 | — | 1 |
| 3 | Modal | 10.06 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 90.95 | — | 1 |
| 2 | Novita | 100.5 | — | 1 |
| 3 | Modal | 201.8 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Novita is the only ranked provider (7.694 Seconds; lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 7.694 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Novita is the only ranked provider (9.689 Seconds; lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 9.689 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Novita is the only ranked provider (60.98 Seconds; lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 60.98 | — | 1 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Daytona is cheapest · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 |
| 2 | Novita | 0.1627 | — | 1 |
| 3 | E2B | 0.2304 | — | 1 |
| 4 | Modal | 0.4774 | — | 1 |

## Coverage gaps

9 uncovered results across 4 providers (Blaxel 3, Daytona 2, E2B 2, Modal 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 30 GiB |
| Blaxel | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 25 GiB |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Daytona | network | **failed** | Step "mise run benchmark:network:all" timed out after 2700s |
| Daytona | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
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
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona | — | — |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
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
| network | fast.com latency | E2B | 1.0 (n too small) | 0.84 |
| network | fast.com latency | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com latency | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com loaded latency | E2B | — | — |
| network | fast.com loaded latency | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com loaded latency | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com upload | Novita | — | — |
| network | fast.com upload | Blaxel | 0.33 (n too small) | 0.097 |
| network | fast.com upload | E2B | 0.33 (n too small) | 0.097 |
| network | fast.com upload | Modal | — | — |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona | — | — |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 1.0 (n too small) | 0.84 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Daytona | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal | — | — |
| realworld | Better-Auth: git clone | Daytona | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal | — | — |
| realworld | Better-Auth: lint format | Daytona | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal | — | — |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Daytona | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | Daytona | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal | — | — |
| realworld | Mastra: build:core | Daytona | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Modal | — | — |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Modal | — | — |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Modal | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| economics | Hourly cost | Daytona | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

