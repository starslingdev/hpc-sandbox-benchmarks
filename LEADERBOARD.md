# Sandbox provider leaderboard

Run `29562866807` · commit `74ccfe2aeba48cf36b287b15fbc765960c6395e9` · generated 2026-07-17T09:52:57.028Z

Requested target for every provider: **2 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **155 metric records**
backed by **307 retained trial observations**, across **54 metrics** and
**4 providers**; every emitted, catalogued metric has a ranked table below
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

_Daytona leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 19.43 | 19.36 – 19.5 | 2 | — |
| 2 | Blaxel | 11.72 | 11.47 – 11.97 | 2 | n too small |
| 3 | E2B | 10.32 | 10.22 – 10.43 | 2 | n too small |
| 4 | Modal | 8.78 | 8.77 – 8.79 | 2 | n too small |

### C-Ray (1080p, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (1080p, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 128.9 | 128.8 – 129 | 2 | — |
| 2 | Daytona | 201 | 200.8 – 201.1 | 2 | n too small |

### C-Ray (4K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (4K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 514.1 | 513.8 – 514.4 | 2 | — |
| 2 | Daytona | 800.8 | 799.6 – 801.9 | 2 | n too small |

### C-Ray (5K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (5K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 912.9 | 912.5 – 913.2 | 2 | — |
| 2 | Daytona | 1419 | 1418 – 1420 | 2 | n too small |

### Zstd 12 compress

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona on median (higher is better)._

| Rank | Provider | Zstd 12 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 107.4 | 106.3 – 108.5 | 2 | — |
| 2 | Daytona | 98.75 | 98.6 – 98.9 | 2 | n too small |

### Zstd 12 decompress

MB/s · higher is better

_Daytona leads · ~2.3× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 12 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2294 | 2288 – 2301 | 2 | — |
| 2 | Blaxel | 998.7 | 998.2 – 999.2 | 2 | n too small |

### Zstd 19 compress

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | Zstd 19 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 10.05 | 10 – 10.1 | 2 | — |
| 2 | Daytona | 8.15 | 8.14 – 8.16 | 2 | n too small |

### Zstd 19 decompress

MB/s · higher is better

_Daytona leads · ~2.3× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1927 | 1923 – 1931 | 2 | — |
| 2 | Blaxel | 841 | 823.6 – 858.5 | 2 | n too small |

### Zstd 19 (long) compress

MB/s · higher is better

_Daytona leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7.16 | 7.13 – 7.19 | 2 | — |
| 2 | Blaxel | 5.095 | 5.06 – 5.13 | 2 | n too small |

### Zstd 19 (long) decompress

MB/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1859 | 1850 – 1869 | 2 | — |
| 2 | Blaxel | 861.2 | 852.1 – 870.3 | 2 | n too small |

### Zstd 3 compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1240 | 1235 – 1246 | 2 | — |
| 2 | Daytona | 787.5 | 787.5 – 787.6 | 2 | n too small |

### Zstd 3 decompress

MB/s · higher is better

_Daytona is the only ranked provider (2114 MB/s; higher is better)._

| Rank | Provider | Zstd 3 decompress (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2114 | 2110 – 2119 | 2 |

### Zstd 3 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.5× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 777.7 | 770.9 – 784.5 | 2 | — |
| 2 | Daytona | 534.2 | 532.1 – 536.3 | 2 | n too small |

### Zstd 3 (long) decompress

MB/s · higher is better

_Daytona leads · ~1.9× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 3 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2165 | 2156 – 2175 | 2 | — |
| 2 | Blaxel | 1147 | 1144 – 1151 | 2 | n too small |

### Zstd 8 compress

MB/s · higher is better

_Blaxel leads · ~1.5× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 321.1 | 320.1 – 322.1 | 2 | — |
| 2 | Daytona | 210.5 | 210.1 – 210.9 | 2 | n too small |

### Zstd 8 decompress

MB/s · higher is better

_Blaxel is the only ranked provider (1088 MB/s; higher is better)._

| Rank | Provider | Zstd 8 decompress (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1088 | 1088 – 1088 | 2 |

### Zstd 8 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.5× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 306.1 | 301.7 – 310.5 | 2 | — |
| 2 | Daytona | 202.8 | 202.1 – 203.4 | 2 | n too small |

### Zstd 8 (long) decompress

MB/s · higher is better

_Daytona leads · ~2.1× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 8 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2313 | 2301 – 2326 | 2 | — |
| 2 | Blaxel | 1101 | 1098 – 1104 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 545000 | 531000 – 559000 | 2 | — |
| 2 | Daytona | 247500 | 243000 – 252000 | 2 | n too small |
| 3 | E2B | 40600 | 38600 – 42600 | 2 | n too small |
| 4 | Modal | 36500 | 36400 – 36600 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2128 | 2073 – 2183 | 2 | — |
| 2 | Daytona | 967.5 | 949 – 986 | 2 | n too small |
| 3 | E2B | 158.5 | 151 – 166 | 2 | n too small |
| 4 | Modal | 142.5 | 142 – 143 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~2.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 489500 | 487000 – 492000 | 2 | — |
| 2 | Daytona | 230000 | 229000 – 231000 | 2 | n too small |
| 3 | E2B | 42200 | 41900 – 42500 | 2 | n too small |
| 4 | Modal | 30300 | 30100 – 30500 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1912 | 1903 – 1921 | 2 | — |
| 2 | Daytona | 898.5 | 895 – 902 | 2 | n too small |
| 3 | E2B | 165 | 164 – 166 | 2 | n too small |
| 4 | Modal | 118.5 | 118 – 119 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal | 13000 | 12700 – 13300 | 2 | — |
| 2 | Daytona | 8041 | 7583 – 8499 | 2 | n too small |
| 3 | Blaxel | 4489 | 4313 – 4664 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 8043 | 7585 – 8501 | 2 | — |
| 2 | Blaxel | 4491 | 4315 – 4666 | 2 | n too small |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 4773 | 4767 – 4778 | 2 | — |
| 2 | Blaxel | 3571 | 3549 – 3592 | 2 | n too small |
| 3 | Modal | 2192 | 1872 – 2511 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 4774 | 4769 – 4779 | 2 | — |
| 2 | Blaxel | 3572 | 3550 – 3593 | 2 | n too small |
| 3 | Modal | 2193 | 1873 – 2512 | 2 | n too small |
| 4 | E2B | 600.5 | 600 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~2.0× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 23.27 | 23.09 – 23.45 | 2 | — |
| 2 | Blaxel | 11.59 | 11.53 – 11.66 | 2 | n too small |
| 3 | Modal | 3.23 | 3.23 – 3.23 | 2 | n too small |
| 4 | E2B | 1.43 | 1.43 – 1.43 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 70360 | 69840 – 70880 | 2 | — |
| 2 | Daytona | 54670 | 54550 – 54790 | 2 | n too small |
| 3 | Modal | 42090 | 37810 – 46380 | 2 | n too small |
| 4 | E2B | 22450 | 22320 – 22570 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 69360 | 67700 – 71020 | 2 | — |
| 2 | Daytona | 54460 | 54290 – 54630 | 2 | n too small |
| 3 | Modal | 42880 | 40280 – 45481 | 2 | n too small |
| 4 | E2B | 22338 | 22060 – 22610 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.7× Daytona on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 111000 | 109600 – 112400 | 2 | — |
| 2 | Daytona | 66780 | 66560 – 66990 | 2 | n too small |
| 3 | Modal | 60448 | 54860 – 66030 | 2 | n too small |
| 4 | E2B | 46760 | 46530 – 46980 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 61270 | 59900 – 62630 | 2 | — |
| 2 | Daytona | 49730 | 49620 – 49840 | 2 | n too small |
| 3 | Modal | 36520 | 35350 – 37680 | 2 | n too small |
| 4 | E2B | 21130 | 20730 – 21520 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.3× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5.191 | 4.68 – 5.702 | 2 | — |
| 2 | Blaxel | 6.553 | 6.395 – 6.712 | 2 | n too small |
| 3 | E2B | 13.57 | 12.57 – 14.56 | 2 | n too small |
| 4 | Modal | 57.48 | 56.03 – 58.93 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_E2B is the only ranked provider (3.5 Mbit/s; higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 3.5 | 3.4 – 3.6 | 2 |

### fast.com latency

ms · lower is better

_E2B is the only ranked provider (7 ms; lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 7 | 7 – 7 | 2 |

### fast.com loaded latency

ms · lower is better

_E2B is the only ranked provider (7.5 ms; lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 7.5 | 6 – 9 | 2 |

### fast.com upload

Mbit/s · higher is better

_E2B is the only ranked provider (690 Mbit/s; higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 690 | 660 – 720 | 2 |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (841.5 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 841.5 | 840 – 843 | 2 |

### Git common operations

Seconds · lower is better

_Daytona leads · Blaxel is ~1.6× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 39.13 | 39.12 – 39.13 | 2 | — |
| 2 | Blaxel | 60.99 | 60.6 – 61.38 | 2 | n too small |
| 3 | E2B | 71.76 | 71.15 – 72.37 | 2 | n too small |
| 4 | Modal | 80.56 | 79.5 – 81.63 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · Blaxel is ~2.0× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 34.07 | 33.94 – 34.2 | 2 | — |
| 2 | Blaxel | 68.08 | 67.44 – 68.71 | 2 | n too small |
| 3 | E2B | 71.03 | 70.97 – 71.08 | 2 | n too small |
| 4 | Modal | 520.9 | 513.2 – 528.6 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Modal is ~2.5× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 29.45 | 29.26 – 29.64 | 2 | — |
| 2 | Modal | 73.47 | 73.17 – 73.77 | 2 | n too small |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads · Daytona is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 10.1 | 9.952 – 10.25 | 2 | — |
| 2 | Daytona | 13.6 | 13.48 – 13.72 | 2 | n too small |
| 3 | E2B | 21.87 | 21.69 – 22.04 | 2 | n too small |
| 4 | Modal | 38.58 | 38.54 – 38.61 | 2 | n too small |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads · Blaxel is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 11.9 | 11.61 – 12.19 | 2 | — |
| 2 | Blaxel | 16.97 | 16.4 – 17.54 | 2 | n too small |
| 3 | E2B | 19.92 | 19.66 – 20.19 | 2 | n too small |
| 4 | Modal | 30.31 | 30.22 – 30.41 | 2 | n too small |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Daytona is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.567 | 1.556 – 1.579 | 2 | — |
| 2 | Daytona | 1.688 | 1.687 – 1.688 | 2 | n too small |
| 3 | E2B | 1.691 | 1.621 – 1.76 | 2 | n too small |
| 4 | Modal | 3.407 | 2.7 – 4.114 | 2 | n too small |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3.696 | 3.59 – 3.802 | 2 | — |
| 2 | Daytona | 5.073 | 5.011 – 5.135 | 2 | n too small |
| 3 | E2B | 8.113 | 8.014 – 8.212 | 2 | n too small |
| 4 | Modal | 16.07 | 16 – 16.15 | 2 | n too small |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · Blaxel is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 11.19 | 10.89 – 11.49 | 2 | — |
| 2 | Blaxel | 15.66 | 15.62 – 15.7 | 2 | n too small |
| 3 | E2B | 20.01 | 19.01 – 21.01 | 2 | n too small |
| 4 | Modal | 28.22 | 27.8 – 28.64 | 2 | n too small |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Blaxel is ~1.6× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2.898 | 2.885 – 2.912 | 2 | — |
| 2 | Blaxel | 4.776 | 4.673 – 4.878 | 2 | n too small |
| 3 | E2B | 5.412 | 5.258 – 5.567 | 2 | n too small |
| 4 | Modal | 6.41 | 6.109 – 6.712 | 2 | n too small |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads · Daytona is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.987 | 2.946 – 3.028 | 2 | — |
| 2 | Daytona | 4.014 | 4.013 – 4.014 | 2 | n too small |
| 3 | E2B | 7.51 | 7.33 – 7.689 | 2 | n too small |
| 4 | Modal | 14.85 | 14.67 – 15.02 | 2 | n too small |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · Blaxel is ~1.7× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.873 | 6.801 – 6.944 | 2 | — |
| 2 | Blaxel | 11.85 | 11.7 – 12 | 2 | n too small |
| 3 | E2B | 13.27 | 13.06 – 13.48 | 2 | n too small |
| 4 | Modal | 14.87 | 14.71 – 15.03 | 2 | n too small |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads · Daytona is ~1.7× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 30.94 | 30.56 – 31.32 | 2 | — |
| 2 | Daytona | 53.2 | 51.83 – 54.57 | 2 | n too small |
| 3 | E2B | 100.7 | 98.25 – 103.2 | 2 | n too small |
| 4 | Modal | 175 | 170.4 – 179.5 | 2 | n too small |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona leads · Blaxel is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1.421 | 1.407 – 1.436 | 2 | — |
| 2 | Blaxel | 2.103 | 2.101 – 2.104 | 2 | n too small |
| 3 | E2B | 2.423 | 2.371 – 2.474 | 2 | n too small |
| 4 | Modal | 3.358 | 3.255 – 3.461 | 2 | n too small |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · Modal is ~2.4× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 84.87 | 83.83 – 85.91 | 2 | — |
| 2 | Modal | 201.4 | 197.2 – 205.5 | 2 | n too small |

### Mastra: git clone

Seconds · lower is better

_Daytona leads · Modal is ~1.5× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.64 | 6.59 – 6.69 | 2 | — |
| 2 | Modal | 10.05 | 9.667 – 10.43 | 2 | n too small |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · Modal is ~2.2× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 89.87 | 89.42 – 90.32 | 2 | — |
| 2 | Modal | 194.8 | 193.6 – 196 | 2 | n too small |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Daytona is cheapest · E2B is ~1.5× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 |
| 2 | E2B | 0.2304 | — | 1 |
| 3 | Modal | 0.4774 | — | 1 |

## Coverage gaps

20 uncovered results across 5 providers (Blaxel 3, Daytona 2, E2B 3, Modal 3, Novita 9). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

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
| E2B | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 8400s |
| Novita | cpu-generic | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | network | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| Novita | system | **missing** | No result and no marker — the suite never reported for this provider. |

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
| cpu | Node.js web tooling | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (1080p, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (1080p, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (4K, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (4K, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (5K, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (5K, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 compress | Blaxel | — | — |
| cpu | Zstd 12 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 decompress | Daytona | — | — |
| cpu | Zstd 12 decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 compress | Blaxel | — | — |
| cpu | Zstd 19 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 decompress | Daytona | — | — |
| cpu | Zstd 19 decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) compress | Daytona | — | — |
| cpu | Zstd 19 (long) compress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) decompress | Daytona | — | — |
| cpu | Zstd 19 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 compress | Blaxel | — | — |
| cpu | Zstd 3 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 decompress | Daytona | — | — |
| cpu | Zstd 3 (long) compress | Blaxel | — | — |
| cpu | Zstd 3 (long) compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 (long) decompress | Daytona | — | — |
| cpu | Zstd 3 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 compress | Blaxel | — | — |
| cpu | Zstd 8 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 decompress | Blaxel | — | — |
| cpu | Zstd 8 (long) compress | Blaxel | — | — |
| cpu | Zstd 8 (long) compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) decompress | Daytona | — | — |
| cpu | Zstd 8 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Blaxel | — | — |
| memory | STREAM Triad | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Blaxel | — | — |
| memory | STREAM Add | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Blaxel | — | — |
| memory | STREAM Scale | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Daytona | — | — |
| network | Loopback TCP (10GB) | Blaxel | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com download | E2B | — | — |
| network | fast.com latency | E2B | — | — |
| network | fast.com loaded latency | E2B | — | — |
| network | fast.com upload | E2B | — | — |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: git clone | E2B | 1.0 (n too small) | 0.84 |
| realworld | Better-Auth: git clone | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | Daytona | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | Daytona | — | — |
| realworld | Better-Auth: lint format | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | Daytona | — | — |
| realworld | Better-Auth: typecheck | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: build:core | Daytona | — | — |
| realworld | Mastra: build:core | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Modal | 0.33 (n too small) | 0.097 |
| economics | Hourly cost | Daytona | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

