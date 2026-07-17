# Sandbox provider leaderboard

Run `29546060837` · commit `dd1f6ef472e3de4b76043c74f3cce5ff0d636af2` · generated 2026-07-17T03:31:38.992Z

Requested target for every provider: **2 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **204 metric records**
backed by **401 retained trial observations**, across **54 metrics** and
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

_Daytona leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 19.51 | 19.46 – 19.55 | 2 | — |
| 2 | Novita | 17.5 | 17.43 – 17.58 | 2 | n too small |
| 3 | Blaxel | 12.8 | 12.67 – 12.94 | 2 | n too small |
| 4 | E2B | 11.05 | 10.99 – 11.12 | 2 | n too small |
| 5 | Modal | 8.82 | 8.71 – 8.93 | 2 | n too small |

### C-Ray (1080p, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (1080p, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 127.6 | 127.6 – 127.7 | 2 | — |
| 2 | Daytona | 199.7 | 199.4 – 200.1 | 2 | n too small |
| 3 | Novita | 240.6 | 240.2 – 241 | 2 | n too small |

### C-Ray (4K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (4K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 509.7 | 509.7 – 509.8 | 2 | — |
| 2 | Daytona | 799.3 | 798.1 – 800.4 | 2 | n too small |
| 3 | Novita | 961.9 | 961.5 – 962.3 | 2 | n too small |

### C-Ray (5K, 16 RPP)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.6× higher (lower is better)._

| Rank | Provider | C-Ray (5K, 16 RPP) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 907.5 | 907 – 908.1 | 2 | — |
| 2 | Daytona | 1422 | 1418 – 1426 | 2 | n too small |
| 3 | Novita | 1705 | 1704 – 1705 | 2 | n too small |

### Zstd 12 compress

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | Zstd 12 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 117.1 | 115.9 – 118.3 | 2 | — |
| 2 | Daytona | 99.45 | 99.3 – 99.6 | 2 | n too small |
| 3 | Novita | 71.4 | 71.2 – 71.6 | 2 | n too small |

### Zstd 12 decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 12 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2304 | 2299 – 2309 | 2 | — |
| 2 | Novita | 1906 | 1897 – 1915 | 2 | n too small |
| 3 | Blaxel | 1052 | 1044 – 1060 | 2 | n too small |

### Zstd 19 compress

MB/s · higher is better

_Blaxel leads · ~1.4× Daytona on median (higher is better)._

| Rank | Provider | Zstd 19 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 11.1 | 11 – 11.2 | 2 | — |
| 2 | Daytona | 8.09 | 8.04 – 8.14 | 2 | n too small |
| 3 | Novita | 5.7 | 5.69 – 5.71 | 2 | n too small |

### Zstd 19 decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 19 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1916 | 1915 – 1918 | 2 | — |
| 2 | Novita | 1622 | 1617 – 1627 | 2 | n too small |
| 3 | Blaxel | 881.8 | 868.9 – 894.6 | 2 | n too small |

### Zstd 19 (long) compress

MB/s · higher is better

_Daytona leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | Zstd 19 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 7.075 | 7.03 – 7.12 | 2 | — |
| 2 | Blaxel | 5.875 | 5.8 – 5.95 | 2 | n too small |
| 3 | Novita | 5.225 | 5.22 – 5.23 | 2 | n too small |

### Zstd 19 (long) decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 19 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1842 | 1840 – 1845 | 2 | — |
| 2 | Novita | 1544 | 1536 – 1552 | 2 | n too small |
| 3 | Blaxel | 894.4 | 886.3 – 902.5 | 2 | n too small |

### Zstd 3 compress

MB/s · higher is better

_Blaxel leads · ~1.7× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1300 | 1294 – 1306 | 2 | — |
| 2 | Daytona | 781.8 | 781.2 – 782.3 | 2 | n too small |
| 3 | Novita | 677.7 | 673.2 – 682.1 | 2 | n too small |

### Zstd 3 decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 3 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2113 | 2112 – 2115 | 2 | — |
| 2 | Novita | 1747 | 1743 – 1751 | 2 | n too small |
| 3 | Blaxel | 1117 | — | 1 | — |

### Zstd 3 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 3 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 847.9 | 841.7 – 854.1 | 2 | — |
| 2 | Daytona | 535.7 | 534.9 – 536.5 | 2 | n too small |
| 3 | Novita | 529.5 | 527.9 – 531 | 2 | n too small |

### Zstd 3 (long) decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 3 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2166 | 2161 – 2171 | 2 | — |
| 2 | Novita | 1808 | 1805 – 1811 | 2 | n too small |

### Zstd 8 compress

MB/s · higher is better

_Blaxel leads · ~1.7× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 352.4 | 352 – 352.7 | 2 | — |
| 2 | Daytona | 210.4 | 208.8 – 212 | 2 | n too small |
| 3 | Novita | 179.4 | 178.7 – 180.2 | 2 | n too small |

### Zstd 8 decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 8 decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2269 | 2269 – 2269 | 2 | — |
| 2 | Novita | 1910 | 1908 – 1912 | 2 | n too small |
| 3 | Blaxel | 1122 | 1117 – 1126 | 2 | n too small |

### Zstd 8 (long) compress

MB/s · higher is better

_Blaxel leads · ~1.6× Daytona on median (higher is better)._

| Rank | Provider | Zstd 8 (long) compress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 325.3 | 323.7 – 326.9 | 2 | — |
| 2 | Daytona | 202.7 | 202.3 – 203 | 2 | n too small |
| 3 | Novita | 174.7 | 174.5 – 174.8 | 2 | n too small |

### Zstd 8 (long) decompress

MB/s · higher is better

_Daytona leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | Zstd 8 (long) decompress (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2308 | 2305 – 2311 | 2 | — |
| 2 | Novita | 1913 | 1912 – 1915 | 2 | n too small |
| 3 | Blaxel | 1135 | 1135 – 1136 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 576000 | 570000 – 582000 | 2 | — |
| 2 | Daytona | 248500 | 240000 – 257000 | 2 | n too small |
| 3 | Novita | 59500 | 55300 – 63700 | 2 | n too small |
| 4 | E2B | 40000 | 38700 – 41300 | 2 | n too small |
| 5 | Modal | 33900 | 33200 – 34600 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2251 | 2226 – 2275 | 2 | — |
| 2 | Daytona | 971 | 936 – 1006 | 2 | n too small |
| 3 | Novita | 232.5 | 216 – 249 | 2 | n too small |
| 4 | E2B | 156.5 | 151 – 162 | 2 | n too small |
| 5 | Modal | 132.5 | 130 – 135 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~2.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 495000 | 484000 – 506000 | 2 | — |
| 2 | Daytona | 231500 | 208000 – 255000 | 2 | n too small |
| 3 | Novita | 85150 | 75700 – 94600 | 2 | n too small |
| 4 | E2B | 43900 | 43500 – 44300 | 2 | n too small |
| 5 | Modal | 28300 | 27000 – 29600 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.1× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1934 | 1891 – 1977 | 2 | — |
| 2 | Daytona | 902.5 | 811 – 994 | 2 | n too small |
| 3 | Novita | 332.5 | 296 – 369 | 2 | n too small |
| 4 | E2B | 171.5 | 170 – 173 | 2 | n too small |
| 5 | Modal | 110.5 | 105 – 116 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal | 12350 | 11900 – 12800 | 2 | — |
| 2 | Novita | 11250 | 11200 – 11300 | 2 | n too small |
| 3 | Daytona | 9142 | 5584 – 12700 | 2 | n too small |
| 4 | Blaxel | 4709 | 4609 – 4809 | 2 | n too small |
| 5 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5585 | — | 1 | — |
| 2 | Blaxel | 4711 | 4611 – 4811 | 2 | — |
| 3 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5821 | 5714 – 5928 | 2 | — |
| 2 | Novita | 5390 | 5210 – 5570 | 2 | n too small |
| 3 | Blaxel | 3658 | 3616 – 3700 | 2 | n too small |
| 4 | Modal | 3458 | 3362 – 3554 | 2 | n too small |
| 5 | E2B | 599 | 598 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5823 | 5716 – 5930 | 2 | — |
| 2 | Novita | 5391 | 5211 – 5571 | 2 | n too small |
| 3 | Blaxel | 3660 | 3618 – 3702 | 2 | n too small |
| 4 | Modal | 3460 | 3363 – 3556 | 2 | n too small |
| 5 | E2B | 600.5 | 600 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~1.3× Novita on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 23.66 | 23.62 – 23.69 | 2 | — |
| 2 | Novita | 18.52 | 18.45 – 18.59 | 2 | n too small |
| 3 | Blaxel | 12.43 | 12.39 – 12.46 | 2 | n too small |
| 4 | Modal | 3.05 | 2.98 – 3.12 | 2 | n too small |
| 5 | E2B | 1.46 | 1.46 – 1.46 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 73890 | 70330 – 77460 | 2 | — |
| 2 | Daytona | 56000 | 55980 – 56010 | 2 | n too small |
| 3 | Novita | 46030 | 45840 – 46210 | 2 | n too small |
| 4 | Modal | 45370 | 42050 – 48700 | 2 | n too small |
| 5 | E2B | 22020 | 21770 – 22260 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 73910 | 70140 – 77690 | 2 | — |
| 2 | Daytona | 55740 | 55730 – 55760 | 2 | n too small |
| 3 | Modal | 45920 | 41170 – 50670 | 2 | n too small |
| 4 | Novita | 45850 | 45780 – 45930 | 2 | n too small |
| 5 | E2B | 22020 | 21840 – 22210 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.7× Daytona on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 113800 | 107300 – 120400 | 2 | — |
| 2 | Daytona | 65680 | 65676 – 65690 | 2 | n too small |
| 3 | Modal | 62010 | 56590 – 67440 | 2 | n too small |
| 4 | Novita | 54820 | 54520 – 55130 | 2 | n too small |
| 5 | E2B | 45120 | 43480 – 46760 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Blaxel leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 62620 | 58680 – 66567 | 2 | — |
| 2 | Daytona | 50120 | 50050 – 50180 | 2 | n too small |
| 3 | Novita | 45410 | 45210 – 45610 | 2 | n too small |
| 4 | Modal | 37400 | 34140 – 40662 | 2 | n too small |
| 5 | E2B | 20880 | 20700 – 21050 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 5.441 | 5.286 – 5.595 | 2 | — |
| 2 | Blaxel | 6.603 | 6.339 – 6.867 | 2 | n too small |
| 3 | Novita | 7.944 | 7.928 – 7.959 | 2 | n too small |
| 4 | E2B | 10.44 | 9.903 – 10.97 | 2 | n too small |
| 5 | Modal | 54.1 | 51.35 – 56.86 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_E2B is the only ranked provider (3.25 Mbit/s; higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 3.25 | 3 – 3.5 | 2 |

### fast.com latency

ms · lower is better

_E2B is the only ranked provider (7 ms; lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 7 | 7 – 7 | 2 |

### fast.com loaded latency

ms · lower is better

_E2B is the only ranked provider (9 ms; lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 9 | — | 1 |

### fast.com upload

Mbit/s · higher is better

_E2B is the only ranked provider (770 Mbit/s; higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | E2B | 770 | 760 – 780 | 2 |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (844 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 844 | 839 – 849 | 2 |

### Git common operations

Seconds · lower is better

_Daytona leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 36.06 | 35.96 – 36.16 | 2 | — |
| 2 | Novita | 43.59 | 43.49 – 43.68 | 2 | n too small |
| 3 | Blaxel | 61.48 | 61.37 – 61.59 | 2 | n too small |
| 4 | E2B | 70.21 | 69.92 – 70.51 | 2 | n too small |
| 5 | Modal | 81.37 | 80.74 – 82 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · Novita is ~1.3× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 30.54 | 30.41 – 30.67 | 2 | — |
| 2 | Novita | 38.81 | 38.53 – 39.09 | 2 | n too small |
| 3 | Blaxel | 68.11 | 67.98 – 68.25 | 2 | n too small |
| 4 | E2B | 69.84 | 69.82 – 69.86 | 2 | n too small |
| 5 | Modal | 514.7 | 505.6 – 523.8 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona leads · Novita is ~1.5× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 28.84 | 28.66 – 29.03 | 2 | — |
| 2 | Novita | 42.48 | 42.08 – 42.88 | 2 | n too small |
| 3 | Modal | 73.78 | 72.94 – 74.61 | 2 | n too small |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 10.93 | 10.79 – 11.08 | 2 | — |
| 2 | Daytona | 12.78 | 12.62 – 12.94 | 2 | n too small |
| 3 | Novita | 14.52 | 14.52 – 14.53 | 2 | n too small |
| 4 | E2B | 21.4 | 21.28 – 21.52 | 2 | n too small |
| 5 | Modal | 40.92 | 39.94 – 41.9 | 2 | n too small |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 10.89 | 10.74 – 11.04 | 2 | — |
| 2 | Novita | 11.86 | 11.77 – 11.95 | 2 | n too small |
| 3 | Blaxel | 16.87 | 16.56 – 17.17 | 2 | n too small |
| 4 | E2B | 19.64 | 19.3 – 19.98 | 2 | n too small |
| 5 | Modal | 31.14 | 30.67 – 31.61 | 2 | n too small |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Daytona is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.571 | 1.555 – 1.586 | 2 | — |
| 2 | Daytona | 1.669 | 1.57 – 1.768 | 2 | n too small |
| 3 | E2B | 1.777 | 1.768 – 1.787 | 2 | n too small |
| 4 | Novita | 1.956 | 1.726 – 2.187 | 2 | n too small |
| 5 | Modal | 2.388 | 2.251 – 2.524 | 2 | n too small |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel leads · Daytona is ~1.2× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3.939 | 3.936 – 3.942 | 2 | — |
| 2 | Daytona | 4.869 | 4.869 – 4.869 | 2 | n too small |
| 3 | Novita | 5.394 | 5.378 – 5.411 | 2 | n too small |
| 4 | E2B | 8.346 | 8.259 – 8.433 | 2 | n too small |
| 5 | Modal | 17.18 | 17.13 – 17.23 | 2 | n too small |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 10.96 | 10.96 – 10.97 | 2 | — |
| 2 | Novita | 11.67 | 11.64 – 11.7 | 2 | n too small |
| 3 | Blaxel | 16.78 | 16.59 – 16.97 | 2 | n too small |
| 4 | E2B | 18.75 | 18.72 – 18.78 | 2 | n too small |
| 5 | Modal | 28.5 | 28.34 – 28.66 | 2 | n too small |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 2.681 | 2.679 – 2.683 | 2 | — |
| 2 | Novita | 3.045 | 3.038 – 3.053 | 2 | n too small |
| 3 | Blaxel | 4.946 | 4.946 – 4.946 | 2 | n too small |
| 4 | E2B | 5.212 | 5.157 – 5.266 | 2 | n too small |
| 5 | Modal | 6.581 | 6.494 – 6.668 | 2 | n too small |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads · Daytona is ~1.3× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.984 | 2.966 – 3.001 | 2 | — |
| 2 | Daytona | 4.015 | 4.01 – 4.02 | 2 | n too small |
| 3 | Novita | 4.635 | 4.632 – 4.638 | 2 | n too small |
| 4 | E2B | 7.606 | 7.593 – 7.619 | 2 | n too small |
| 5 | Modal | 15.76 | 15.56 – 15.97 | 2 | n too small |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.838 | 6.769 – 6.908 | 2 | — |
| 2 | Novita | 7.691 | 7.457 – 7.925 | 2 | n too small |
| 3 | Blaxel | 12.2 | 12.19 – 12.21 | 2 | n too small |
| 4 | E2B | 12.43 | 12.29 – 12.57 | 2 | n too small |
| 5 | Modal | 15.18 | 14.7 – 15.65 | 2 | n too small |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads · Daytona is ~1.5× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 33.64 | 33.48 – 33.8 | 2 | — |
| 2 | Daytona | 51.07 | 50.95 – 51.19 | 2 | n too small |
| 3 | Novita | 60.08 | 59.63 – 60.53 | 2 | n too small |
| 4 | E2B | 98.64 | 97.8 – 99.48 | 2 | n too small |
| 5 | Modal | 183.3 | 178.9 – 187.7 | 2 | n too small |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1.388 | 1.378 – 1.398 | 2 | — |
| 2 | Novita | 1.474 | 1.465 – 1.483 | 2 | n too small |
| 3 | Blaxel | 2.037 | 2.037 – 2.038 | 2 | n too small |
| 4 | E2B | 2.613 | 2.436 – 2.79 | 2 | n too small |
| 5 | Modal | 3.308 | 3.29 – 3.326 | 2 | n too small |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · Novita is ~1.5× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 83 | 82.98 – 83.02 | 2 | — |
| 2 | Novita | 125.6 | 125.2 – 126 | 2 | n too small |
| 3 | Modal | 203 | 201.1 – 205 | 2 | n too small |

### Mastra: git clone

Seconds · lower is better

_Daytona leads · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.626 | 6.425 – 6.827 | 2 | — |
| 2 | Novita | 7.014 | 6.931 – 7.096 | 2 | n too small |
| 3 | Modal | 9.957 | 9.35 – 10.56 | 2 | n too small |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 90.71 | 90.34 – 91.08 | 2 | — |
| 2 | Novita | 128.7 | 128.5 – 128.8 | 2 | n too small |
| 3 | Modal | 199.7 | 198.2 – 201.1 | 2 | n too small |

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

13 uncovered results across 5 providers (Blaxel 3, Daytona 2, E2B 3, Modal 3, Novita 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

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
| Daytona | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 8400s |
| E2B | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 8400s |
| Novita | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Novita | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |

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
| cpu | C-Ray (1080p, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (1080p, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (1080p, 16 RPP) | Novita | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (4K, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (4K, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (4K, 16 RPP) | Novita | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (5K, 16 RPP) | Blaxel | — | — |
| cpu | C-Ray (5K, 16 RPP) | Daytona | 0.33 (n too small) | 0.097 |
| cpu | C-Ray (5K, 16 RPP) | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 compress | Blaxel | — | — |
| cpu | Zstd 12 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 decompress | Daytona | — | — |
| cpu | Zstd 12 decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 12 decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 compress | Blaxel | — | — |
| cpu | Zstd 19 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 decompress | Daytona | — | — |
| cpu | Zstd 19 decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) compress | Daytona | — | — |
| cpu | Zstd 19 (long) compress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) decompress | Daytona | — | — |
| cpu | Zstd 19 (long) decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 19 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 compress | Blaxel | — | — |
| cpu | Zstd 3 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 decompress | Daytona | — | — |
| cpu | Zstd 3 decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 decompress | Blaxel | — | — |
| cpu | Zstd 3 (long) compress | Blaxel | — | — |
| cpu | Zstd 3 (long) compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 (long) compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 3 (long) decompress | Daytona | — | — |
| cpu | Zstd 3 (long) decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 compress | Blaxel | — | — |
| cpu | Zstd 8 compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 decompress | Daytona | — | — |
| cpu | Zstd 8 decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 decompress | Blaxel | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) compress | Blaxel | — | — |
| cpu | Zstd 8 (long) compress | Daytona | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) compress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) decompress | Daytona | — | — |
| cpu | Zstd 8 (long) decompress | Novita | 0.33 (n too small) | 0.097 |
| cpu | Zstd 8 (long) decompress | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona | — | — |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Blaxel | — | — |
| memory | STREAM Triad | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal | 1.0 (n too small) | 0.84 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Blaxel | — | — |
| memory | STREAM Add | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 1.0 (n too small) | 0.84 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal | 1.0 (n too small) | 0.84 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Blaxel | — | — |
| memory | STREAM Scale | Daytona | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Daytona | — | — |
| network | Loopback TCP (10GB) | Blaxel | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Novita | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal | 0.33 (n too small) | 0.097 |
| network | fast.com download | E2B | — | — |
| network | fast.com latency | E2B | — | — |
| network | fast.com loaded latency | E2B | — | — |
| network | fast.com upload | E2B | — | — |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona | — | — |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Novita | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: build | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: cold install | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Daytona | 0.67 (n too small) | 0.84 |
| realworld | Better-Auth: git clone | E2B | 0.67 (n too small) | 0.84 |
| realworld | Better-Auth: git clone | Novita | 1.0 (n too small) | 0.84 |
| realworld | Better-Auth: git clone | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint (Biome) | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | Daytona | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint deps (Knip) | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | Daytona | — | — |
| realworld | Better-Auth: lint format | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint format | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint packages | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint spell | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Daytona | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: lint types | Modal | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | Daytona | — | — |
| realworld | Better-Auth: typecheck | Novita | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | Blaxel | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | E2B | 0.33 (n too small) | 0.097 |
| realworld | Better-Auth: typecheck | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: build:core | Daytona | — | — |
| realworld | Mastra: build:core | Novita | 0.33 (n too small) | 0.097 |
| realworld | Mastra: build:core | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Novita | 0.33 (n too small) | 0.097 |
| realworld | Mastra: git clone | Modal | 0.33 (n too small) | 0.097 |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Novita | 0.33 (n too small) | 0.097 |
| realworld | Mastra: lint:format | Modal | 0.33 (n too small) | 0.097 |
| economics | Hourly cost | Daytona | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

