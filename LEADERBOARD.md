# Sandbox provider leaderboard

Run `29472826358` · commit `d85e6a9f905d428b9efd469a1d287f4075fddef7` · generated 2026-07-16T07:25:11.693Z

Requested target for every provider: **2 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **146 metric records**
backed by **288 retained trial observations**, across **49 metrics** and
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

_Daytona leads · ~1.5× Blaxel on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 19.43 | 18.79 – 20.08 | 2 | — |
| 2 | Blaxel | 12.7 | 12.67 – 12.73 | 2 | n too small |
| 3 | E2B | 10.63 | 10.59 – 10.66 | 2 | n too small |
| 4 | Modal | 9.24 | 9 – 9.48 | 2 | n too small |

### C-Ray (1080p, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (1080p, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 128.4 | 128.1 – 128.8 | 2 | — |
| 2 | Daytona | 201.8 | 201.5 – 202.1 | 2 | n too small |

### C-Ray (4K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (4K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 512.4 | 511.2 – 513.5 | 2 | — |
| 2 | Daytona | 806.1 | 803.3 – 809 | 2 | n too small |

### C-Ray (5K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (5K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 907.6 | 906.9 – 908.3 | 2 | — |
| 2 | Daytona | 1420 | 1417 – 1423 | 2 | n too small |

### Zstd 12 compress

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | Zstd 12 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 115.9 | 115.3 – 116.5 | 2 | — |
| 2 | Daytona | 99.4 | 99.3 – 99.5 | 2 | n too small |

### Zstd 12 decompress

MB/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 12 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2294 | 2283 – 2305 | 2 | — |
| 2 | Blaxel | 1054 | 1052 – 1056 | 2 | n too small |

### Zstd 19 compress

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona on median (higher is better)._

| Rank | Provider | Zstd 19 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.35 | 11.1 – 11.6 | 2 | — |
| 2 | Daytona | 8.155 | 8.15 – 8.16 | 2 | n too small |

### Zstd 19 decompress

MB/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1921 | 1920 – 1922 | 2 | — |
| 2 | Blaxel | 887.8 | 882 – 893.6 | 2 | n too small |

### Zstd 19 (long) compress

MB/s · higher is better

_Daytona leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7.055 | 6.96 – 7.15 | 2 | — |
| 2 | Blaxel | 6.135 | 6.09 – 6.18 | 2 | n too small |

### Zstd 19 (long) decompress

MB/s · higher is better

_Daytona leads · ~2.0× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1828 | 1810 – 1846 | 2 | — |
| 2 | Blaxel | 896.6 | 893.3 – 900 | 2 | n too small |

### Zstd 3 compress

MB/s · higher is better

_Blaxel leads · ~1.7× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1299 | 1295 – 1304 | 2 | — |
| 2 | Daytona | 781.2 | 778.7 – 783.7 | 2 | n too small |

### Zstd 3 decompress

MB/s · higher is better

_Daytona is the only ranked provider (2112 MB/s; higher is better)._

| Rank | Provider | Zstd 3 decompress (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2112 | 2110 – 2115 | 2 |

### Zstd 3 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 840.3 | 832.3 – 848.2 | 2 | — |
| 2 | Daytona | 534 | 530.4 – 537.7 | 2 | n too small |

### Zstd 3 (long) decompress

MB/s · higher is better

_Daytona is the only ranked provider (2162 MB/s; higher is better)._

| Rank | Provider | Zstd 3 (long) decompress (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2162 | 2162 – 2163 | 2 |

### Zstd 8 compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 344.6 | 344.2 – 345 | 2 | — |
| 2 | Daytona | 209.2 | 208.9 – 209.5 | 2 | n too small |

### Zstd 8 decompress

MB/s · higher is better

_Blaxel is the only ranked provider (1118 MB/s; higher is better)._

| Rank | Provider | Zstd 8 decompress (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1118 | 1111 – 1126 | 2 |

### Zstd 8 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 327 | 323.5 – 330.5 | 2 | — |
| 2 | Daytona | 202.9 | 202.3 – 203.6 | 2 | n too small |

### Zstd 8 (long) decompress

MB/s · higher is better

_Daytona leads · ~2.0× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 8 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2314 | 2307 – 2321 | 2 | — |
| 2 | Blaxel | 1134 | 1130 – 1137 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~2.0× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 540000 | 525000 – 555000 | 2 | — |
| 2 | Daytona | 266500 | 264000 – 269000 | 2 | n too small |
| 3 | Modal | 33200 | 32800 – 33600 | 2 | n too small |
| 4 | E2B | 32550 | 31600 – 33500 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.0× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2110 | 2050 – 2169 | 2 | — |
| 2 | Daytona | 1041 | 1031 – 1050 | 2 | n too small |
| 3 | Modal | 129.5 | 128 – 131 | 2 | n too small |
| 4 | E2B | 127 | 123 – 131 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 493500 | 492000 – 495000 | 2 | — |
| 2 | Daytona | 228500 | 228000 – 229000 | 2 | n too small |
| 3 | E2B | 53950 | 52600 – 55300 | 2 | n too small |
| 4 | Modal | 29200 | 29000 – 29400 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.2× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1929 | 1922 – 1935 | 2 | — |
| 2 | Daytona | 893.5 | 891 – 896 | 2 | n too small |
| 3 | E2B | 211 | 206 – 216 | 2 | n too small |
| 4 | Modal | 114 | 113 – 115 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona leads · ~1.2× Modal on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 13900 | 8801 – 19000 | 2 | — |
| 2 | Modal | 12000 | 10700 – 13300 | 2 | n too small |
| 3 | Blaxel | 4603 | 4535 – 4670 | 2 | n too small |
| 4 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.9× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 8803 | — | 1 | — |
| 2 | Blaxel | 4605 | 4537 – 4672 | 2 | — |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5732 | 5697 – 5766 | 2 | — |
| 2 | Blaxel | 3583 | 3544 – 3622 | 2 | n too small |
| 3 | Modal | 2233 | 1695 – 2770 | 2 | n too small |
| 4 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5733 | 5699 – 5767 | 2 | — |
| 2 | Blaxel | 3585 | 3545 – 3624 | 2 | n too small |
| 3 | Modal | 2235 | 1697 – 2772 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~2.2× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 26.21 | 26.13 – 26.29 | 2 | — |
| 2 | Blaxel | 12.13 | 11.96 – 12.29 | 2 | n too small |
| 3 | Modal | 3.195 | 3.18 – 3.21 | 2 | n too small |
| 4 | E2B | 1.43 | 1.43 – 1.43 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 78310 | 77380 – 79250 | 2 | — |
| 2 | Blaxel | 72290 | 72270 – 72320 | 2 | n too small |
| 3 | Modal | 46230 | 44680 – 47780 | 2 | n too small |
| 4 | E2B | 23460 | 22640 – 24280 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 78090 | 77810 – 78380 | 2 | — |
| 2 | Blaxel | 72160 | 72130 – 72180 | 2 | n too small |
| 3 | Modal | 49240 | 47414 – 51060 | 2 | n too small |
| 4 | E2B | 23300 | 22660 – 23940 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 108200 | 107200 – 109200 | 2 | — |
| 2 | Daytona | 86490 | 85820 – 87150 | 2 | n too small |
| 3 | Modal | 62510 | 61910 – 63110 | 2 | n too small |
| 4 | E2B | 48850 | 46640 – 51070 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 72730 | 71570 – 73890 | 2 | — |
| 2 | Blaxel | 61560 | 61410 – 61710 | 2 | n too small |
| 3 | Modal | 37960 | 35060 – 40860 | 2 | n too small |
| 4 | E2B | 21510 | 21140 – 21880 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.5× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 4.531 | 4.326 – 4.737 | 2 | — |
| 2 | Blaxel | 6.957 | 6.732 – 7.183 | 2 | n too small |
| 3 | E2B | 14.98 | 14.89 – 15.07 | 2 | n too small |
| 4 | Modal | 56.93 | 55.71 – 58.15 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (839.5 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 839.5 | 838 – 841 | 2 |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · E2B is ~2.0× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 34.47 | 34.31 – 34.64 | 2 | — |
| 2 | E2B | 67.73 | 67.64 – 67.82 | 2 | n too small |
| 3 | Blaxel | 69.59 | 69.38 – 69.81 | 2 | n too small |
| 4 | Modal | 539.9 | 504.9 – 575 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Modal is ~2.4× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 29 | 28.73 – 29.26 | 2 | — |
| 2 | Modal | 70.32 | 70.28 – 70.36 | 2 | n too small |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads · Daytona is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9.915 | 9.754 – 10.08 | 2 | — |
| 2 | Daytona | 12.45 | 12.44 – 12.47 | 2 | n too small |
| 3 | E2B | 22.88 | 22.26 – 23.5 | 2 | n too small |
| 4 | Modal | 40.77 | 40.48 – 41.06 | 2 | n too small |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads · Blaxel is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 11.6 | 11.09 – 12.12 | 2 | — |
| 2 | Blaxel | 17.52 | 16.53 – 18.51 | 2 | n too small |
| 3 | E2B | 19.92 | 19.8 – 20.04 | 2 | n too small |
| 4 | Modal | 30.8 | 30.66 – 30.95 | 2 | n too small |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.409 | 1.286 – 1.532 | 2 | — |
| 2 | Daytona | 1.72 | 1.696 – 1.745 | 2 | n too small |
| 3 | E2B | 1.738 | 1.724 – 1.753 | 2 | n too small |
| 4 | Modal | 2.73 | 2.588 – 2.872 | 2 | n too small |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3.892 | 3.827 – 3.957 | 2 | — |
| 2 | Daytona | 4.863 | 4.849 – 4.876 | 2 | n too small |
| 3 | E2B | 8.624 | 8.502 – 8.746 | 2 | n too small |
| 4 | Modal | 17.45 | 17.33 – 17.58 | 2 | n too small |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · Blaxel is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 10.82 | 10.77 – 10.87 | 2 | — |
| 2 | Blaxel | 15.32 | 14.89 – 15.75 | 2 | n too small |
| 3 | E2B | 19.86 | 19.78 – 19.95 | 2 | n too small |
| 4 | Modal | 29 | 28.67 – 29.32 | 2 | n too small |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Blaxel is ~1.8× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2.719 | 2.679 – 2.759 | 2 | — |
| 2 | Blaxel | 4.885 | 4.834 – 4.936 | 2 | n too small |
| 3 | E2B | 5.392 | 5.18 – 5.604 | 2 | n too small |
| 4 | Modal | 6.547 | 6.486 – 6.608 | 2 | n too small |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads · Daytona is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.952 | 2.939 – 2.965 | 2 | — |
| 2 | Daytona | 4.024 | 3.999 – 4.05 | 2 | n too small |
| 3 | E2B | 7.285 | 7.226 – 7.345 | 2 | n too small |
| 4 | Modal | 15.76 | 15.72 – 15.81 | 2 | n too small |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · Blaxel is ~1.7× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.757 | 6.711 – 6.803 | 2 | — |
| 2 | Blaxel | 11.73 | 11.7 – 11.76 | 2 | n too small |
| 3 | E2B | 13.38 | 13.36 – 13.4 | 2 | n too small |
| 4 | Modal | 15.39 | 14.8 – 15.98 | 2 | n too small |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads · Daytona is ~1.7× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 30.36 | 30.16 – 30.57 | 2 | — |
| 2 | Daytona | 51.09 | 49.97 – 52.21 | 2 | n too small |
| 3 | E2B | 103.2 | 102.5 – 103.9 | 2 | n too small |
| 4 | Modal | 187.6 | 187.2 – 188 | 2 | n too small |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona leads · Blaxel is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1.443 | 1.439 – 1.447 | 2 | — |
| 2 | Blaxel | 2.044 | 2.014 – 2.074 | 2 | n too small |
| 3 | E2B | 2.335 | 2.301 – 2.369 | 2 | n too small |
| 4 | Modal | 3.367 | 3.288 – 3.447 | 2 | n too small |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · Modal is ~2.4× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 85.3 | 82.89 – 87.72 | 2 | — |
| 2 | Modal | 205.6 | 203.4 – 207.9 | 2 | n too small |

### Mastra: git clone

Seconds · lower is better

_Daytona leads · Modal is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7.524 | 7.144 – 7.904 | 2 | — |
| 2 | Modal | 10.33 | 10.11 – 10.54 | 2 | n too small |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · Modal is ~2.3× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 91.36 | 91.29 – 91.43 | 2 | — |
| 2 | Modal | 206.6 | 201 – 212.1 | 2 | n too small |

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

17 uncovered results across 5 providers (Blaxel 2, Daytona 1, E2B 3, Modal 2, Novita 9). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 30 GiB |
| Blaxel | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 25 GiB |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 25 GiB |
| Daytona | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| E2B | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
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
| cpu | Zstd 8 compress | Blaxel | — | — |
| cpu | Zstd 8 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 decompress | Blaxel | — | — |
| cpu | Zstd 8 (long) compress | Blaxel | — | — |
| cpu | Zstd 8 (long) compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) decompress | Daytona | — | — |
| cpu | Zstd 8 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.67 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
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
| memory | STREAM Triad | Daytona | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Daytona | — | — |
| network | Loopback TCP (10GB) | Blaxel | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal | 0.33 (n too small) | 0.097 |
| system | PyBench | Blaxel | — | — |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
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
| realworld | Better-Auth: git clone | E2B | 0.67 (n too small) | 0.84 |
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

