# Sandbox provider leaderboard

Run `29743570333` · commit `b5e93145866d53d9378fa70823fd7d770e8ee8ae` · generated 2026-07-20T14:09:39.579Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **158 metric records**
backed by **245 retained trial observations**, across **37 metrics** and
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

_Blaxel leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 20.14 | 20.06 – 20.23 | 2 | — |
| 2 | Novita | 18.6 | 18.56 – 18.64 | 2 | n too small |
| 3 | Daytona (VM) | 18.53 | 18.51 – 18.55 | 2 | n too small |
| 4 | E2B | 11.81 | 11.77 – 11.85 | 2 | n too small |
| 5 | Modal | 8.13 | 7.95 – 8.31 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 228500 | 221000 – 236000 | 2 | — |
| 2 | Daytona (VM) | 225500 | 225000 – 226000 | 2 | n too small |
| 3 | Novita | 71500 | 70900 – 72100 | 2 | n too small |
| 4 | E2B | 44200 | 43000 – 45400 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 894.5 | 865 – 924 | 2 | — |
| 2 | Daytona (VM) | 879 | 877 – 881 | 2 | n too small |
| 3 | Novita | 279.5 | 277 – 282 | 2 | n too small |
| 4 | E2B | 173 | 168 – 178 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 214500 | 195000 – 234000 | 2 | — |
| 2 | Blaxel | 212500 | 209000 – 216000 | 2 | n too small |
| 3 | Novita | 73600 | 68100 – 79100 | 2 | n too small |
| 4 | E2B | 46500 | 46300 – 46700 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 838 | 760 – 916 | 2 | — |
| 2 | Blaxel | 832 | 818 – 846 | 2 | n too small |
| 3 | Novita | 287.5 | 266 – 309 | 2 | n too small |
| 4 | E2B | 181.5 | 181 – 182 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 12600 | 12000 – 13200 | 2 | — |
| 2 | Blaxel | 8596 | 7937 – 9254 | 2 | n too small |
| 3 | Daytona (VM) | 7044 | 6663 – 7424 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 8597 | 7939 – 9255 | 2 | — |
| 2 | Daytona (VM) | 7046 | 6665 – 7426 | 2 | n too small |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6778 | 6646 – 6909 | 2 | — |
| 2 | Blaxel | 5679 | 5612 – 5745 | 2 | n too small |
| 3 | Daytona (VM) | 3800 | 3673 – 3926 | 2 | n too small |
| 4 | E2B | 600 | 600 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6779 | 6647 – 6911 | 2 | — |
| 2 | Blaxel | 5680 | 5614 – 5746 | 2 | n too small |
| 3 | Daytona (VM) | 3802 | 3675 – 3928 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 23.59 | 23.55 – 23.62 | 2 | — |
| 2 | Blaxel | 19.48 | 19.46 – 19.49 | 2 | n too small |
| 3 | Novita | 19.18 | 19.15 – 19.22 | 2 | n too small |
| 4 | E2B | 1.445 | 1.43 – 1.46 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 108800 | 99960 – 117600 | 2 | — |
| 2 | Blaxel | 108700 | 108700 – 108700 | 2 | n too small |
| 3 | Novita | 85780 | 67450 – 104115 | 2 | n too small |
| 4 | E2B | 37850 | 37600 – 38110 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 114600 | 105500 – 123700 | 2 | — |
| 2 | Blaxel | 111400 | 111400 – 111400 | 2 | n too small |
| 3 | Novita | 89260 | 74610 – 103900 | 2 | n too small |
| 4 | E2B | 37430 | 37110 – 37750 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 134600 | 128100 – 141000 | 2 | — |
| 2 | Blaxel | 129500 | 129000 – 130000 | 2 | n too small |
| 3 | Novita | 93630 | 75080 – 112200 | 2 | n too small |
| 4 | E2B | 67680 | 66225 – 69130 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 108500 | 100300 – 116700 | 2 | — |
| 2 | Blaxel | 101300 | 101200 – 101300 | 2 | n too small |
| 3 | Novita | 81420 | 63670 – 99170 | 2 | n too small |
| 4 | E2B | 31600 | 31170 – 32030 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 4.041 | 3.992 – 4.09 | 2 | — |
| 2 | Daytona (VM) | 5.305 | 4.964 – 5.646 | 2 | n too small |
| 3 | Novita | 7.848 | 7.513 – 8.184 | 2 | n too small |
| 4 | E2B | 8.68 | 8.495 – 8.866 | 2 | n too small |
| 5 | Modal | 40.32 | 38 – 42.63 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Modal leads · ~5.6× Novita on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal | 500 | 490 – 510 | 2 | — |
| 2 | Novita | 89 | 28 – 150 | 2 | n too small |
| 3 | Blaxel | 3.3 | 3.3 – 3.3 | 2 | n too small |
| 4 | E2B | 0.89 | 0.58 – 1.2 | 2 | n too small |

### fast.com latency

ms · lower is better

_Blaxel leads · E2B is ~3.0× higher (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2 | 2 – 2 | 2 | — |
| 2 | E2B | 6 | 6 – 6 | 2 | n too small |
| 3 | Novita | 10.5 | 10 – 11 | 2 | n too small |
| 4 | Modal | 79 | 79 – 79 | 2 | n too small |

### fast.com loaded latency

ms · lower is better

_Blaxel leads · E2B is ~1.3× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 7 | 7 – 7 | 2 | — |
| 2 | E2B | 9 | — | 1 | — |
| 3 | Novita | 10.5 | 10 – 11 | 2 | — |
| 4 | Modal | 81.5 | 81 – 82 | 2 | n too small |

### fast.com upload

Mbit/s · higher is better

_Novita leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 2900 | 2800 – 3000 | 2 | — |
| 2 | Blaxel | 2050 | 1900 – 2200 | 2 | n too small |
| 3 | E2B | 925 | 850 – 1000 | 2 | n too small |
| 4 | Modal | 235 | 190 – 280 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (471.5 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 471.5 | 467 – 476 | 2 |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 36 | 36 – 36 | 2 | — |
| 2 | Blaxel | 41.77 | 41.63 – 41.91 | 2 | n too small |
| 3 | Novita | 43.62 | 43.54 – 43.7 | 2 | n too small |
| 4 | E2B | 73.49 | 72.99 – 73.98 | 2 | n too small |
| 5 | Modal | 79.43 | 78.16 – 80.69 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.4 | 30.4 – 30.41 | 2 | — |
| 2 | Blaxel | 36.55 | 36.3 – 36.8 | 2 | n too small |
| 3 | Novita | 39.71 | 39.17 – 40.24 | 2 | n too small |
| 4 | E2B | 74.81 | 74.21 – 75.41 | 2 | n too small |
| 5 | Modal | 466.1 | 445 – 487.2 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 24.38 | — | 1 |
| 2 | Daytona (VM) | 24.47 | — | 1 |
| 3 | Novita | 29.33 | — | 1 |
| 4 | Modal | 64.55 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 56.73 | — | 1 |
| 2 | Blaxel | 57.91 | — | 1 |
| 3 | Novita | 65.61 | — | 1 |
| 4 | E2B | 89.11 | — | 1 |
| 5 | Modal | 141.6 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 10.39 | — | 1 |
| 2 | Blaxel | 10.56 | — | 1 |
| 3 | Novita | 10.71 | — | 1 |
| 4 | E2B | 16.01 | — | 1 |
| 5 | Modal | 29.2 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.6× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1.09 | — | 1 |
| 2 | Daytona (VM) | 1.722 | — | 1 |
| 3 | E2B | 1.877 | — | 1 |
| 4 | Novita | 2.447 | — | 1 |
| 5 | Modal | 2.528 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.99 | — | 1 |
| 2 | Blaxel | 3.153 | — | 1 |
| 3 | Novita | 3.508 | — | 1 |
| 4 | E2B | 5.162 | — | 1 |
| 5 | Modal | 10.64 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 9.707 | — | 1 |
| 2 | Blaxel | 10.11 | — | 1 |
| 3 | Novita | 11.91 | — | 1 |
| 4 | E2B | 18.11 | — | 1 |
| 5 | Modal | 29.67 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.644 | — | 1 |
| 2 | Blaxel | 2.825 | — | 1 |
| 3 | Novita | 3.044 | — | 1 |
| 4 | E2B | 4.782 | — | 1 |
| 5 | Modal | 6.316 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.409 | — | 1 |
| 2 | Daytona (VM) | 2.44 | — | 1 |
| 3 | Novita | 2.869 | — | 1 |
| 4 | E2B | 4.172 | — | 1 |
| 5 | Modal | 9.239 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 6.503 | — | 1 |
| 2 | Blaxel | 6.67 | — | 1 |
| 3 | Novita | 7.688 | — | 1 |
| 4 | E2B | 12.57 | — | 1 |
| 5 | Modal | 14.47 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 24.44 | — | 1 |
| 2 | Daytona (VM) | 24.98 | — | 1 |
| 3 | Novita | 35.6 | — | 1 |
| 4 | E2B | 51.62 | — | 1 |
| 5 | Modal | 104.4 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 36.36 | — | 1 |
| 2 | Blaxel | 39.09 | — | 1 |
| 3 | Novita | 44.13 | — | 1 |
| 4 | E2B | 71.44 | — | 1 |
| 5 | Modal | 80.7 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Novita leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 71.32 | — | 1 |
| 2 | Daytona (VM) | 71.61 | — | 1 |
| 3 | Blaxel | 71.77 | — | 1 |
| 4 | Modal | 170.3 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 6.118 | — | 1 |
| 2 | Daytona (VM) | 6.624 | — | 1 |
| 3 | Novita | 6.998 | — | 1 |
| 4 | Modal | 10.39 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Blaxel leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 86.63 | — | 1 |
| 2 | Novita | 93.62 | — | 1 |
| 3 | Daytona (VM) | 95.52 | — | 1 |
| 4 | Modal | 192.8 | — | 1 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Novita is cheapest · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 0.2333 | — | 1 |
| 2 | Daytona (VM) | 0.2502 | — | 1 |
| 3 | E2B | 0.3312 | — | 1 |
| 4 | Modal | 0.7612 | — | 1 |

## Coverage gaps

9 uncovered results across 5 providers (Blaxel 1, Daytona (VM) 2, E2B 2, Modal 3, Novita 1). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Daytona (VM) | network | **failed** | Step "mise run benchmark:network:all" timed out after 2700s |
| Daytona (VM) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Novita | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Blaxel | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
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
| cpu | Node.js web tooling | Blaxel | — | — |
| cpu | Node.js web tooling | Novita | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Daytona (VM) | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.84 |
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
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 1.0 (n too small) | 0.84 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 1.0 (n too small) | 0.84 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 1.0 (n too small) | 0.84 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 1.0 (n too small) | 0.84 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Blaxel | — | — |
| network | Loopback TCP (10GB) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Novita | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com download | Modal | — | — |
| network | fast.com download | Novita | 0.33 (n too small) | 0.097 |
| network | fast.com download | Blaxel | 0.33 (n too small) | 0.097 |
| network | fast.com download | E2B | 0.33 (n too small) | 0.097 |
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
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal | — | — |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | — | — |
| realworld | Mastra: build:core | Modal | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Modal | — | — |
| realworld | Mastra: lint:format | Blaxel | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Modal | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

