# Sandbox provider leaderboard

Run `30019301067` · commit `702d8f4082525c7b8f81fdd959f07d7c8e5e4306` · generated 2026-07-23T16:40:10.630Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **255 metric records**
backed by **2533 retained trial observations**, across **44 metrics** and
**6 providers**; every emitted, catalogued metric has a ranked table below
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
| Modal (VM) | microVM (VM runtime) | vm |
| Novita | microVM | vm |

_Not present in this run: Daytona (container) — registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 19.8 | 18.51 – 20.56 | 42 | — |
| 2 | Daytona (VM) | 18.6 | 18.21 – 18.88 | 21 | n too small |
| 3 | Modal (VM) | 15.07 | 12.92 – 15.27 | 21 | n too small |
| 4 | Novita | 13.52 | 13.07 – 18.43 | 10 | n too small |
| 5 | E2B | 11.24 | 11.14 – 12.09 | 21 | n too small |
| 6 | Modal (gVisor) | 9.56 | 8.95 – 10.36 | 33 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 248500 | 217000 – 284500 | 6 | — |
| 2 | Daytona (VM) | 245000 | 239000 – 284000 | 6 | n too small |
| 3 | Modal (VM) | 229500 | 228000 – 235000 | 6 | n too small |
| 4 | Novita | 79350 | 73800 – 93400 | 6 | n too small |
| 5 | E2B | 47750 | 45900 – 60700 | 6 | n too small |
| 6 | Modal (gVisor) | 31050 | 28800 – 33800 | 6 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 970 | 847 – 1148 | 6 | — |
| 2 | Daytona (VM) | 955.5 | 934 – 1111 | 6 | n too small |
| 3 | Modal (VM) | 895.5 | 890 – 917 | 6 | n too small |
| 4 | Novita | 310 | 288 – 365 | 6 | n too small |
| 5 | E2B | 186.5 | 179 – 237 | 6 | n too small |
| 6 | Modal (gVisor) | 121 | 112 – 132 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 218500 | 213000 – 239000 | 6 | — |
| 2 | Blaxel | 217500 | 210000 – 261000 | 6 | n too small |
| 3 | Modal (VM) | 209500 | 207500 – 211000 | 6 | n too small |
| 4 | Novita | 77200 | 76000 – 110000 | 6 | n too small |
| 5 | E2B | 49300 | 48100 – 58600 | 6 | n too small |
| 6 | Modal (gVisor) | 26200 | 24700 – 27200 | 6 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 854.5 | 811 – 909 | 6 | — |
| 2 | Blaxel | 850 | 822 – 1018 | 6 | n too small |
| 3 | Modal (VM) | 818 | 810 – 828 | 6 | n too small |
| 4 | Novita | 301.5 | 297 – 430 | 6 | n too small |
| 5 | E2B | 192.5 | 188 – 229 | 6 | n too small |
| 6 | Modal (gVisor) | 102.5 | 96.4 – 106 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.1× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 19950 | 17500 – 21600 | 6 | — |
| 2 | Novita | 9492 | 7358 – 11400 | 6 | n too small |
| 3 | Blaxel | 8644 | 8372 – 10450 | 6 | n too small |
| 4 | Daytona (VM) | 8352 | 7605 – 9883 | 6 | n too small |
| 5 | Modal (VM) | 2018 | 1884 – 2182 | 6 | n too small |
| 6 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 8631 | 8374 – 9702 | 5 | — |
| 2 | Novita | 8545 | 7359 – 8786 | 3 | n too small |
| 3 | Daytona (VM) | 8354 | 7606 – 9884 | 6 | n too small |
| 4 | Modal (VM) | 2019 | 1885 – 2184 | 6 | n too small |
| 5 | E2B | 601 | 601 – 601 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5874 | 5602 – 6325 | 6 | — |
| 2 | Novita | 5405 | 3967 – 6180 | 6 | n too small |
| 3 | Daytona (VM) | 3973 | 3516 – 4339 | 6 | n too small |
| 4 | Modal (VM) | 3127 | 2474 – 3318 | 6 | n too small |
| 5 | Modal (gVisor) | 2888 | 1088 – 3249 | 6 | n too small |
| 6 | E2B | 599 | 599 – 600 | 6 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5875 | 5603 – 6327 | 6 | — |
| 2 | Novita | 5406 | 3968 – 6182 | 6 | n too small |
| 3 | Daytona (VM) | 3974 | 3517 – 4341 | 6 | n too small |
| 4 | Modal (VM) | 3129 | 2476 – 3463 | 6 | n too small |
| 5 | Modal (gVisor) | 2890 | 1090 – 3251 | 6 | n too small |
| 6 | E2B | 601 | 600 – 601 | 6 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.82 | 25.55 – 26.56 | 6 | — |
| 2 | Blaxel | 19.48 | 19.02 – 19.69 | 6 | n too small |
| 3 | Novita | 15.88 | 15.22 – 16.45 | 6 | n too small |
| 4 | Modal (VM) | 8.09 | 8.03 – 8.12 | 6 | n too small |
| 5 | Modal (gVisor) | 3.015 | 2.85 – 3.23 | 6 | n too small |
| 6 | E2B | 1.4 | 1.345 – 1.66 | 6 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 178200 | 91650 – 186500 | 15 | — |
| 2 | Blaxel | 100600 | 60180 – 108400 | 15 | n too small |
| 3 | Modal (gVisor) | 67030 | 57940 – 69100 | 10 | n too small |
| 4 | Modal (VM) | 55850 | 48430 – 68670 | 15 | n too small |
| 5 | Novita | 49300 | 48800 – 63990 | 15 | n too small |
| 6 | E2B | 48700 | 45710 – 49970 | 15 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 177500 | 89400 – 185900 | 15 | — |
| 2 | Blaxel | 102000 | 59877 – 110100 | 15 | n too small |
| 3 | Modal (gVisor) | 64920 | 57240 – 67970 | 10 | n too small |
| 4 | Modal (VM) | 55280 | 48230 – 67630 | 15 | n too small |
| 5 | Novita | 49250 | 48870 – 63470 | 15 | n too small |
| 6 | E2B | 48460 | 45570 – 50250 | 15 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.9× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 191600 | 102200 – 215700 | 55 | — |
| 2 | Blaxel | 102100 | 86930 – 117100 | 65 | n too small |
| 3 | Modal (gVisor) | 83563 | 77760 – 89710 | 45 | n too small |
| 4 | Modal (VM) | 81870 | 77420 – 89640 | 35 | n too small |
| 5 | E2B | 75240 | 67100 – 77950 | 55 | n too small |
| 6 | Novita | 57120 | 55797 – 57250 | 35 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 170500 | 82510 – 177000 | 15 | — |
| 2 | Blaxel | 94970 | 58540 – 100300 | 15 | n too small |
| 3 | Modal (gVisor) | 54680 | 49510 – 60060 | 10 | n too small |
| 4 | Modal (VM) | 48130 | 43400 – 63420 | 15 | n too small |
| 5 | Novita | 47120 | 46770 – 60880 | 15 | n too small |
| 6 | E2B | 43027 | 42340 – 43330 | 15 | n too small |

## network

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 149100 | 110445 – 155440 | 6 | — |
| 2 | Blaxel | 109237 | 83568 – 129085 | 6 | n too small |
| 3 | Daytona (VM) | 78354 | 69253 – 89325 | 6 | n too small |
| 4 | E2B | 56870 | 50833 – 68299 | 6 | n too small |
| 5 | Modal (gVisor) | 15574 | 13455 – 16276 | 6 | n too small |
| 6 | Modal (VM) | 15200 | 13605 – 21495 | 6 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 127400 | 80710 – 154386 | 6 | — |
| 2 | Blaxel | 105700 | 62796 – 172020 | 6 | n too small |
| 3 | Daytona (VM) | 98210 | 74749 – 107573 | 6 | n too small |
| 4 | E2B | 52622 | 46629 – 58790 | 6 | n too small |
| 5 | Modal (VM) | 15400 | 13764 – 21326 | 6 | n too small |
| 6 | Modal (gVisor) | 13950 | 12455 – 14501 | 6 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Blaxel, Daytona (VM), E2B, Modal (VM) and Novita share the top on this metric (higher is better)._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 9999 | 9999 – 9999 | 6 | — |
| 1 | Daytona (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | E2B | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Modal (VM) | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 1 | Novita | 9999 | 9999 – 9999 | 6 | n too small, equal medians |
| 6 | Modal (gVisor) | 169 | 167 – 189 | 6 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.8× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 7936 | 4573 – 10590 | 6 | — |
| 2 | Novita | 4401 | 3612 – 5238 | 6 | n too small |
| 3 | Daytona (VM) | 3421 | 2834 – 5079 | 6 | n too small |
| 4 | E2B | 2477 | 1099 – 3241 | 6 | n too small |
| 5 | Modal (VM) | 1415 | 1369 – 1463 | 6 | n too small |
| 6 | Blaxel | 1054 | 618.3 – 2030 | 6 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Novita leads · ~1.1× Modal (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5589 | 2635 – 6613 | 6 | — |
| 2 | Modal (VM) | 5095 | 4048 – 5831 | 6 | n too small |
| 3 | Daytona (VM) | 4746 | 4728 – 4821 | 6 | n too small |
| 4 | E2B | 1909 | 1024 – 3358 | 6 | n too small |
| 5 | Blaxel | 1622 | 1178 – 2176 | 6 | n too small |
| 6 | Modal (gVisor) | 157.6 | 52.98 – 2970 | 6 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 411.5 | 403.5 – 421 | 6 | — |
| 2 | Blaxel | 486 | 472 – 496 | 6 | n too small |
| 3 | Novita | 677 | 525 – 692 | 6 | n too small |
| 4 | E2B | 805.5 | 803 – 814.5 | 6 | n too small |
| 5 | Modal (VM) | 815.5 | 598 – 818.5 | 6 | n too small |
| 6 | Modal (gVisor) | 897 | 890 – 902 | 6 | n too small |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.14 | 37.16 – 40.17 | 6 | — |
| 2 | Blaxel | 45.06 | 43.26 – 48.21 | 6 | n too small |
| 3 | Novita | 51.28 | 50.61 – 52.02 | 6 | n too small |
| 4 | Modal (VM) | 63.07 | 44.7 – 63.59 | 6 | n too small |
| 5 | E2B | 65.15 | 64.98 – 68.59 | 6 | n too small |
| 6 | Modal (gVisor) | 84.66 | 81.92 – 93.15 | 6 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 289700 | 281100 – 334400 | 6 | — |
| 2 | Daytona (VM) | 279900 | 265300 – 296200 | 6 | n too small |
| 3 | Modal (VM) | 192900 | 175900 – 198700 | 6 | n too small |
| 4 | Novita | 184900 | 134600 – 304100 | 6 | n too small |
| 5 | E2B | 182100 | 170100 – 187700 | 6 | n too small |
| 6 | Modal (gVisor) | 10990 | 10750 – 12840 | 6 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.1725 | 0.149 – 0.178 | 6 | — |
| 2 | Daytona (VM) | 0.179 | 0.169 – 0.191 | 6 | n too small |
| 3 | Modal (VM) | 0.259 | 0.252 – 0.284 | 6 | n too small |
| 4 | Novita | 0.2715 | 0.164 – 0.371 | 6 | n too small |
| 5 | E2B | 0.2745 | 0.266 – 0.294 | 6 | n too small |
| 6 | Modal (gVisor) | 4.549 | 3.893 – 4.606 | 6 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 17790 | 16410 – 24060 | 6 | — |
| 2 | Daytona (VM) | 15740 | 14840 – 16040 | 6 | n too small |
| 3 | Novita | 14100 | 11160 – 26330 | 6 | n too small |
| 4 | Modal (VM) | 13710 | 11380 – 17200 | 6 | n too small |
| 5 | E2B | 12640 | 12070 – 13540 | 6 | n too small |
| 6 | Modal (gVisor) | 1905 | 1853 – 2157 | 6 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.815 | 2.078 – 3.047 | 6 | — |
| 2 | Daytona (VM) | 3.177 | 3.142 – 3.369 | 6 | n too small |
| 3 | Novita | 3.55 | 1.899 – 4.482 | 6 | n too small |
| 4 | Modal (VM) | 3.647 | 2.906 – 4.394 | 6 | n too small |
| 5 | E2B | 3.958 | 3.694 – 4.144 | 6 | n too small |
| 6 | Modal (gVisor) | 26.25 | 23.18 – 26.98 | 6 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.18 | 31.67 – 34.4 | 6 | — |
| 2 | Blaxel | 38.95 | 37.53 – 40.19 | 6 | n too small |
| 3 | Novita | 58.63 | 52.47 – 61.2 | 6 | n too small |
| 4 | Modal (VM) | 62.89 | 57.67 – 64.1 | 6 | n too small |
| 5 | E2B | 71.8 | 69.93 – 78.11 | 6 | n too small |
| 6 | Modal (gVisor) | 429.7 | 390.6 – 480.4 | 6 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 25.39 | 25.2 – 26.49 | 10 |
| 2 | Blaxel | 27.2 | 27.04 – 27.59 | 12 |
| 3 | Modal (VM) | 33.93 | 31.02 – 39.37 | 12 |
| 4 | Novita | 41.43 | 35.29 – 46.79 | 12 |
| 5 | Modal (gVisor) | 66.79 | 63.05 – 73.41 | 12 |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 57.72 | 56 – 60.14 | 11 | — |
| 2 | Blaxel | 59.35 | 58.32 – 61.08 | 11 | — |
| 3 | Modal (VM) | 76.19 | 72.32 – 87.89 | 12 | — |
| 3 | Novita | 83.36 | 77.66 – 89.78 | 12 | tied |
| 5 | E2B | 97.95 | 95.98 – 102.5 | 12 | — |
| 6 | Modal (gVisor) | 142.9 | 137.2 – 144.4 | 11 | — |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 10.15 | 9.931 – 10.25 | 11 | — |
| 2 | Blaxel | 10.82 | 10.67 – 11.07 | 11 | — |
| 3 | Novita | 12.74 | 11.42 – 14.21 | 12 | — |
| 4 | Modal (VM) | 17.25 | 15.76 – 20.9 | 12 | — |
| 4 | E2B | 17.86 | 17.53 – 18.56 | 12 | tied |
| 6 | Modal (gVisor) | 31.27 | 29.83 – 33.54 | 11 | — |

### Better-Auth: git clone

Seconds · lower is better

_Modal (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 0.7925 | 0.738 – 1.05 | 12 | — |
| 1 | Blaxel | 0.821 | 0.791 – 1.144 | 11 | tied |
| 3 | Daytona (VM) | 1.488 | 1.4 – 1.547 | 11 | — |
| 3 | E2B | 1.49 | 1.458 – 1.608 | 12 | tied |
| 5 | Novita | 1.915 | 1.731 – 2.045 | 12 | — |
| 6 | Modal (gVisor) | 2.444 | 2.361 – 2.661 | 11 | — |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 3.11 | 3.03 – 3.244 | 11 | — |
| 2 | Blaxel | 3.311 | 3.292 – 3.356 | 11 | — |
| 3 | Modal (VM) | 4.09 | 4.05 – 4.627 | 12 | — |
| 3 | Novita | 4.235 | 4.095 – 4.665 | 12 | tied |
| 5 | E2B | 5.295 | 5.209 – 5.375 | 12 | — |
| 6 | Modal (gVisor) | 10.93 | 10.7 – 11.68 | 11 | — |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 10.44 | 10.22 – 10.77 | 11 | — |
| 1 | Daytona (VM) | 10.57 | 9.507 – 10.9 | 11 | tied |
| 3 | Modal (VM) | 13.47 | 13.27 – 15.41 | 12 | — |
| 3 | Novita | 13.89 | 12.68 – 15.85 | 12 | tied |
| 5 | E2B | 18.9 | 18.35 – 19.41 | 12 | — |
| 6 | Modal (gVisor) | 29.66 | 29.55 – 30.45 | 11 | — |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.859 | 2.811 – 3.093 | 11 | — |
| 2 | Blaxel | 3.086 | 2.924 – 3.175 | 11 | — |
| 3 | Modal (VM) | 3.75 | 3.7 – 4.706 | 12 | — |
| 3 | Novita | 3.976 | 3.529 – 4.289 | 12 | tied |
| 5 | E2B | 5.22 | 5.104 – 5.547 | 12 | — |
| 6 | Modal (gVisor) | 7.413 | 7.018 – 7.891 | 11 | — |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 2.408 | 2.344 – 2.445 | 11 | — |
| 2 | Blaxel | 2.565 | 2.439 – 2.627 | 11 | — |
| 3 | Modal (VM) | 3.24 | 3.189 – 3.733 | 12 | — |
| 3 | Novita | 3.271 | 3.127 – 3.787 | 12 | tied |
| 5 | E2B | 4.24 | 4.165 – 4.304 | 12 | — |
| 6 | Modal (gVisor) | 11.02 | 10.55 – 11.49 | 11 | — |

### Better-Auth: lint spell

Seconds · lower is better

_Blaxel and Daytona (VM) share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 7.193 | 6.969 – 7.426 | 11 | — |
| 1 | Daytona (VM) | 7.284 | 6.538 – 7.544 | 11 | tied |
| 3 | Modal (VM) | 9.132 | 9.018 – 11.38 | 12 | — |
| 3 | Novita | 9.177 | 8.447 – 10.29 | 12 | tied |
| 5 | E2B | 13.36 | 12.9 – 14.09 | 12 | — |
| 6 | Modal (gVisor) | 16.41 | 15.86 – 17.41 | 11 | — |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.4 | 24.87 – 26.01 | 11 | — |
| 2 | Blaxel | 26.8 | 25.93 – 28.23 | 11 | — |
| 3 | Modal (VM) | 35.72 | 34.38 – 42.44 | 12 | — |
| 3 | Novita | 39.7 | 37.78 – 46.07 | 12 | tied |
| 5 | E2B | 50.5 | 47.42 – 52.86 | 12 | — |
| 6 | Modal (gVisor) | 109.3 | 102.3 – 111 | 11 | — |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.59 | 38.77 – 40.46 | 11 | — |
| 2 | Blaxel | 43.45 | 41.81 – 46.02 | 11 | — |
| 3 | Modal (VM) | 51.3 | 50.37 – 62.06 | 12 | — |
| 3 | Novita | 52.91 | 47.76 – 57.62 | 12 | tied |
| 5 | E2B | 72.17 | 69.35 – 77.08 | 12 | — |
| 6 | Modal (gVisor) | 81.22 | 80.12 – 86.15 | 11 | — |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 73.21 | 71.09 – 74.46 | 10 | — |
| 2 | Blaxel | 75.49 | 73.52 – 76.91 | 12 | — |
| 3 | Modal (VM) | 92.99 | 82.75 – 99.24 | 12 | — |
| 3 | Novita | 106.3 | 86.48 – 115.5 | 12 | tied |
| 5 | Modal (gVisor) | 173.3 | 165.6 – 179.2 | 12 | — |

### Mastra: git clone

Seconds · lower is better

_Blaxel, Daytona (VM), Modal (VM) and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.988 | 1.786 – 5.592 | 12 | — |
| 1 | Daytona (VM) | 2.835 | 2.296 – 3.266 | 10 | tied |
| 1 | Modal (VM) | 2.958 | 2.055 – 4.317 | 12 | tied |
| 1 | Novita | 3.343 | 3.244 – 3.643 | 12 | tied |
| 5 | Modal (gVisor) | 6.357 | 6.002 – 6.563 | 12 | — |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 93.56 | 89.07 – 96.21 | 10 | — |
| 1 | Blaxel | 95.25 | 93.15 – 98.67 | 12 | tied |
| 3 | Modal (VM) | 115.9 | 104.6 – 117.6 | 12 | — |
| 3 | Novita | 130.9 | 109.7 – 140.8 | 12 | tied |
| 5 | Modal (gVisor) | 199.2 | 193.9 – 212.2 | 12 | — |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 5.436 | 5.322 – 5.593 | 12 |
| 2 | Daytona (VM) | 5.954 | 5.707 – 6.051 | 12 |
| 3 | Modal (VM) | 6.596 | 6.486 – 6.867 | 12 |
| 4 | Novita | 8.151 | 7.405 – 8.994 | 12 |
| 5 | Modal (gVisor) | 14.86 | 13.67 – 16.12 | 8 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.64 | 2.521 – 3.079 | 12 | — |
| 2 | Daytona (VM) | 3.188 | 2.963 – 3.889 | 12 | — |
| 2 | Modal (VM) | 3.598 | 3.055 – 8.236 | 12 | tied |
| 2 | Novita | 4.506 | 4.197 – 5.226 | 12 | tied |
| 5 | Modal (gVisor) | 9.388 | 9.32 – 9.961 | 8 | — |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) and Blaxel share the top on this metric (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 39.84 | 35.27 – 40.43 | 12 | — |
| 1 | Blaxel | 40.59 | 39.1 – 41.52 | 12 | tied |
| 3 | Modal (VM) | 47.99 | 46.97 – 48.95 | 11 | — |
| 4 | Novita | 55.85 | 51.37 – 59.5 | 12 | — |
| 5 | Modal (gVisor) | 91.16 | 73.44 – 116.7 | 8 | — |

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

19 uncovered results across 6 providers (Blaxel 2, Daytona (VM) 5, E2B 2, Modal (gVisor) 5, Modal (VM) 3, Novita 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | cpu-node | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-better-auth | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-mastra | **failed** | Failed to create sandbox: Failed to create Daytona sandbox: Sandbox failed to start: internal error |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | memory | **failed** | Step "mise run benchmark:memory:all" timed out after 1800s |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 6 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_typecheck (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Novita | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |

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
Samples, so the test could not have separated the rows at any effect size (here 10 v 15 floors at p ≈ <0.001; 10 v 21 floors at p ≈ <0.001; 15 v 10 floors at p ≈ <0.001; 15 v 15 floors at p ≈ <0.001; 21 v 10 floors at p ≈ <0.001; 21 v 21 floors at p ≈ <0.001; 21 v 33 floors at p ≈ <0.001; 3 v 6 floors at p ≈ 0.024; 35 v 55 floors at p ≈ <0.001; 42 v 21 floors at p ≈ <0.001; 45 v 35 floors at p ≈ <0.001; 5 v 3 floors at p ≈ 0.036; 55 v 35 floors at p ≈ <0.001; 55 v 65 floors at p ≈ <0.001; 6 v 6 floors at p ≈ 0.0022; 65 v 45 floors at p ≈ <0.001).
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
| cpu | Node.js web tooling | Daytona (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (VM) | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Novita | 0.52 (n too small) | 0.082 |
| cpu | Node.js web tooling | E2B | <0.001 (n too small) | <0.001 |
| cpu | Node.js web tooling | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.73 (n too small) | 0.81 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.70 (n too small) | 0.32 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | 0.015 (n too small) | 0.077 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.81 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | 0.0087 (n too small) | 0.012 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.59 (n too small) | 0.81 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.24 (n too small) | 0.32 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | 0.79 (n too small) | 0.95 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.90 (n too small) | 0.93 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.041 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.015 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.041 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.015 (n too small) | 0.012 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.18 (n too small) | 0.077 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Novita | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| disk | Hardlink throughput | E2B | 0.0022 (n too small) | 0.0013 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Triad | Modal (gVisor) | 0.031 (n too small) | 0.0046 |
| memory | STREAM Triad | Modal (VM) | 0.10 (n too small) | 0.10 |
| memory | STREAM Triad | Novita | 0.35 (n too small) | 0.051 |
| memory | STREAM Triad | E2B | 0.074 (n too small) | 0.051 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | <0.001 (n too small) | 0.0011 |
| memory | STREAM Add | Modal (gVisor) | 0.019 (n too small) | 0.0046 |
| memory | STREAM Add | Modal (VM) | 0.16 (n too small) | 0.10 |
| memory | STREAM Add | Novita | 0.41 (n too small) | 0.051 |
| memory | STREAM Add | E2B | 0.12 (n too small) | 0.017 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Modal (VM) | 0.60 (n too small) | 0.034 |
| memory | STREAM Copy | E2B | <0.001 (n too small) | <0.001 |
| memory | STREAM Copy | Novita | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | <0.001 (n too small) | 0.0011 |
| memory | STREAM Scale | Modal (gVisor) | <0.001 (n too small) | <0.001 |
| memory | STREAM Scale | Modal (VM) | 0.53 (n too small) | 0.10 |
| memory | STREAM Scale | Novita | 0.81 (n too small) | 0.31 |
| memory | STREAM Scale | E2B | <0.001 (n too small) | <0.001 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.041 (n too small) | 0.077 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.0043 (n too small) | 0.012 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.94 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.70 (n too small) | 0.81 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.59 (n too small) | 0.32 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.065 (n too small) | 0.077 |
| network | iperf3 loopback UDP, 10G objective | Blaxel | — | — |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Novita | 0.026 (n too small) | 0.077 |
| network | iperf3 WAN download | Daytona (VM) | 0.39 (n too small) | 0.32 |
| network | iperf3 WAN download | E2B | 0.041 (n too small) | 0.077 |
| network | iperf3 WAN download | Modal (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN download | Blaxel | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN upload | Novita | — | — |
| network | iperf3 WAN upload | Modal (VM) | 0.39 (n too small) | 0.32 |
| network | iperf3 WAN upload | Daytona (VM) | 0.39 (n too small) | 0.077 |
| network | iperf3 WAN upload | E2B | 0.0022 (n too small) | 0.0013 |
| network | iperf3 WAN upload | Blaxel | 0.82 (n too small) | 0.81 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.065 (n too small) | 0.012 |
| system | PyBench | Daytona (VM) | — | — |
| system | PyBench | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Novita | 0.0022 (n too small) | 0.0013 |
| system | PyBench | E2B | 0.0022 (n too small) | 0.0013 |
| system | PyBench | Modal (VM) | 0.67 (n too small) | 0.32 |
| system | PyBench | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Novita | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (VM) | 0.39 (n too small) | 0.077 |
| system | Git common operations | E2B | 0.0022 (n too small) | 0.0013 |
| system | Git common operations | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.24 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO (s100, 50c) | Novita | 0.82 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | E2B | 0.94 (n too small) | 0.32 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.24 (n too small) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.85 (n too small) | 0.32 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.94 (n too small) | 0.32 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Blaxel | — | — |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW (s100, 50c) | Novita | 0.39 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.94 (n too small) | 0.81 |
| system | pgbench RW (s100, 50c) | E2B | 0.24 (n too small) | 0.077 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.0022 (n too small) | 0.0013 |
| system | pgbench RW latency (s100, 50c) | Novita | 0.39 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.94 (n too small) | 0.81 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.24 (n too small) | 0.077 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Novita | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (VM) | 0.065 (n too small) | 0.077 |
| system | SQLite Speedtest | E2B | 0.0022 (n too small) | 0.0013 |
| system | SQLite Speedtest | Modal (gVisor) | 0.0022 (n too small) | 0.0013 |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Mastra: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Mastra: cold install | Novita | 0.012 | 0.019 |
| realworld | Mastra: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | 0.023 | 0.047 |
| realworld | Better-Auth: build | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: build | Novita | 0.14 (tied) | 0.19 |
| realworld | Better-Auth: build | E2B | 0.0023 | <0.001 |
| realworld | Better-Auth: build | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | Novita | <0.001 | 0.0014 |
| realworld | Better-Auth: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: cold install | E2B | 0.29 (tied) | 0.066 |
| realworld | Better-Auth: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | Modal (VM) | — | — |
| realworld | Better-Auth: git clone | Blaxel | 0.37 (tied) | 0.075 |
| realworld | Better-Auth: git clone | Daytona (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: git clone | E2B | 0.51 (tied) | 0.65 |
| realworld | Better-Auth: git clone | Novita | 0.0011 | <0.001 |
| realworld | Better-Auth: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | 0.010 | 0.0025 |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.48 (tied) | 0.19 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.0014 | <0.001 |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | 0.90 (tied) | 0.15 |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.76 (tied) | 0.43 |
| realworld | Better-Auth: lint deps (Knip) | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Blaxel | 0.047 | 0.047 |
| realworld | Better-Auth: lint format | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Novita | 0.80 (tied) | 0.79 |
| realworld | Better-Auth: lint format | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Blaxel | 0.0031 | 0.012 |
| realworld | Better-Auth: lint packages | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint packages | Novita | 0.89 (tied) | 0.99 |
| realworld | Better-Auth: lint packages | E2B | 0.0014 | <0.001 |
| realworld | Better-Auth: lint packages | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | 0.75 (tied) | 0.99 |
| realworld | Better-Auth: lint spell | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Novita | 0.59 (tied) | 0.79 |
| realworld | Better-Auth: lint spell | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: lint spell | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | 0.0083 | 0.012 |
| realworld | Better-Auth: lint types | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: lint types | Novita | 0.32 (tied) | 0.19 |
| realworld | Better-Auth: lint types | E2B | 0.0068 | <0.001 |
| realworld | Better-Auth: lint types | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (VM) | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Novita | 0.59 (tied) | 0.43 |
| realworld | Better-Auth: typecheck | E2B | <0.001 | <0.001 |
| realworld | Better-Auth: typecheck | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | 0.014 | 0.045 |
| realworld | Mastra: build:core | Modal (VM) | 0.012 | <0.001 |
| realworld | Mastra: build:core | Novita | 0.16 (tied) | 0.19 |
| realworld | Mastra: build:core | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Daytona (VM) | 0.23 (tied) | 0.028 |
| realworld | Mastra: git clone | Modal (VM) | 0.87 (tied) | 0.49 |
| realworld | Mastra: git clone | Novita | 0.35 (tied) | 0.066 |
| realworld | Mastra: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Blaxel | 0.12 (tied) | 0.32 |
| realworld | Mastra: lint:format | Modal (VM) | 0.014 | <0.001 |
| realworld | Mastra: lint:format | Novita | 0.27 (tied) | 0.19 |
| realworld | Mastra: lint:format | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Novita | <0.001 | <0.001 |
| realworld | OpenClaw: cold install | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | 0.010 | 0.0046 |
| realworld | OpenClaw: git clone | Modal (VM) | 0.32 (tied) | 0.43 |
| realworld | OpenClaw: git clone | Novita | 0.55 (tied) | 0.066 |
| realworld | OpenClaw: git clone | Modal (gVisor) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | 0.13 (tied) | 0.19 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | <0.001 | <0.001 |
| realworld | OpenClaw: typecheck (tsgo) | Novita | 0.011 | 0.0076 |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | <0.001 | 0.0018 |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

