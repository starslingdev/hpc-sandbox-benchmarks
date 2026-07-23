# Sandbox provider leaderboard

Run `29982453127` · commit `b3d59fb52b5bad1b1e651be5b8a9dee5d029fc4b` · generated 2026-07-23T07:22:16.313Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **254 metric records**
backed by **407 retained trial observations**, across **44 metrics** and
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

_Daytona (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 20.93 | 20.91 – 20.95 | 2 | — |
| 2 | Modal (VM) | 20.03 | 19.9 – 20.16 | 2 | n too small |
| 3 | Blaxel | 19.87 | 19.07 – 20.66 | 2 | n too small |
| 4 | Novita | 12.89 | 11.44 – 14.35 | 2 | n too small |
| 5 | E2B | 12.01 | 11.83 – 12.19 | 2 | n too small |
| 6 | Modal (gVisor) | 8.83 | 8.79 – 8.87 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 248000 | 236000 – 260000 | 2 | — |
| 2 | Daytona (VM) | 244500 | 242000 – 247000 | 2 | n too small |
| 3 | Blaxel | 229500 | 228000 – 231000 | 2 | n too small |
| 4 | Modal (gVisor) | 212500 | 209000 – 216000 | 2 | n too small |
| 5 | Novita | 76000 | 74500 – 77500 | 2 | n too small |
| 6 | E2B | 45950 | 45600 – 46300 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 968 | 922 – 1014 | 2 | — |
| 2 | Daytona (VM) | 956.5 | 947 – 966 | 2 | n too small |
| 3 | Blaxel | 896.5 | 890 – 903 | 2 | n too small |
| 4 | Modal (gVisor) | 830.5 | 816 – 845 | 2 | n too small |
| 5 | Novita | 297 | 291 – 303 | 2 | n too small |
| 6 | E2B | 179.5 | 178 – 181 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 291000 | 289000 – 293000 | 2 | — |
| 2 | Blaxel | 239500 | 233000 – 246000 | 2 | n too small |
| 3 | Daytona (VM) | 212000 | 210000 – 214000 | 2 | n too small |
| 4 | Modal (gVisor) | 207000 | 202000 – 212000 | 2 | n too small |
| 5 | Novita | 76500 | 76400 – 76600 | 2 | n too small |
| 6 | E2B | 47800 | 47200 – 48400 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1136 | 1128 – 1143 | 2 | — |
| 2 | Blaxel | 935 | 910 – 960 | 2 | n too small |
| 3 | Daytona (VM) | 829.5 | 822 – 837 | 2 | n too small |
| 4 | Modal (gVisor) | 808 | 789 – 827 | 2 | n too small |
| 5 | Novita | 298.5 | 298 – 299 | 2 | n too small |
| 6 | E2B | 186.5 | 184 – 189 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~2.1× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 22500 | 22100 – 22900 | 2 | — |
| 2 | Novita | 10900 | 10700 – 11100 | 2 | n too small |
| 3 | Daytona (VM) | 10694 | 9388 – 12000 | 2 | n too small |
| 4 | Blaxel | 8031 | 8027 – 8034 | 2 | n too small |
| 5 | Modal (VM) | 2120 | 2065 – 2175 | 2 | n too small |
| 6 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 9390 | — | 1 | — |
| 2 | Blaxel | 8033 | 8029 – 8036 | 2 | — |
| 3 | Modal (VM) | 2122 | 2067 – 2176 | 2 | n too small |
| 4 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5963 | 5847 – 6078 | 2 | — |
| 2 | Daytona (VM) | 5491 | 5175 – 5807 | 2 | n too small |
| 3 | Novita | 5100 | 4982 – 5217 | 2 | n too small |
| 4 | Modal (gVisor) | 4998 | 4794 – 5201 | 2 | n too small |
| 5 | Modal (VM) | 2819 | 2634 – 3004 | 2 | n too small |
| 6 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 5964 | 5848 – 6079 | 2 | — |
| 2 | Daytona (VM) | 5492 | 5176 – 5808 | 2 | n too small |
| 3 | Novita | 5102 | 4984 – 5219 | 2 | n too small |
| 4 | Modal (gVisor) | 5000 | 4796 – 5203 | 2 | n too small |
| 5 | Modal (VM) | 2821 | 2636 – 3005 | 2 | n too small |
| 6 | E2B | 600.5 | 600 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.16 | 25.95 – 26.36 | 2 | — |
| 2 | Blaxel | 19.89 | 19.8 – 19.99 | 2 | n too small |
| 3 | Modal (VM) | 16.52 | 16.49 – 16.55 | 2 | n too small |
| 4 | Novita | 15.93 | 15.69 – 16.16 | 2 | n too small |
| 5 | Modal (gVisor) | 5.165 | 5.15 – 5.18 | 2 | n too small |
| 6 | E2B | 1.36 | 1.36 – 1.36 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 184800 | 183300 – 186400 | 2 | — |
| 2 | Blaxel | 111900 | 111100 – 112800 | 2 | n too small |
| 3 | Modal (gVisor) | 52100 | 51030 – 53170 | 2 | n too small |
| 4 | Novita | 51800 | 51570 – 52030 | 2 | n too small |
| 5 | E2B | 50340 | 50304 – 50380 | 2 | n too small |
| 6 | Modal (VM) | 39340 | 36700 – 41984 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 184400 | 182800 – 185900 | 2 | — |
| 2 | Blaxel | 117100 | 116000 – 118300 | 2 | n too small |
| 3 | Novita | 51810 | 51800 – 51821 | 2 | n too small |
| 4 | Modal (gVisor) | 51770 | 50570 – 52960 | 2 | n too small |
| 5 | E2B | 50590 | 50530 – 50660 | 2 | n too small |
| 6 | Modal (VM) | 38830 | 36120 – 41530 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.6× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 218500 | 217000 – 219900 | 2 | — |
| 2 | Blaxel | 135700 | 134600 – 136800 | 2 | n too small |
| 3 | Modal (gVisor) | 86870 | 86070 – 87670 | 2 | n too small |
| 4 | E2B | 67210 | 67200 – 67220 | 2 | n too small |
| 5 | Novita | 57130 | 56940 – 57320 | 2 | n too small |
| 6 | Modal (VM) | 49190 | 47390 – 51000 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 176400 | 175000 – 177753 | 2 | — |
| 2 | Blaxel | 105500 | 105000 – 106000 | 2 | n too small |
| 3 | Novita | 49320 | 49280 – 49360 | 2 | n too small |
| 4 | Modal (gVisor) | 47430 | 45590 – 49260 | 2 | n too small |
| 5 | E2B | 43560 | 43360 – 43760 | 2 | n too small |
| 6 | Modal (VM) | 35810 | 33290 – 38332 | 2 | n too small |

## network

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Blaxel leads · ~1.5× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 108800 | 95795 – 121852 | 2 | — |
| 2 | Daytona (VM) | 73650 | 73192 – 74108 | 2 | n too small |
| 3 | E2B | 65816 | 64004 – 67628 | 2 | n too small |
| 4 | Novita | 47950 | 47886 – 48007 | 2 | n too small |
| 5 | Modal (gVisor) | 15237 | 15083 – 15391 | 2 | n too small |
| 6 | Modal (VM) | 14020 | 13658 – 14387 | 2 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 111000 | 100915 – 121002 | 2 | — |
| 2 | Daytona (VM) | 92604 | 91565 – 93643 | 2 | n too small |
| 3 | Novita | 57670 | 57585 – 57760 | 2 | n too small |
| 4 | E2B | 57490 | 53387 – 61588 | 2 | n too small |
| 5 | Modal (VM) | 14837 | 14572 – 15102 | 2 | n too small |
| 6 | Modal (gVisor) | 12833 | 12787 – 12879 | 2 | n too small |

### iperf3 loopback UDP, 10G objective

Mbits/sec · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | iperf3 loopback UDP, 10G objective (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 10000 | 10000 – 10000 | 2 | — |
| 2 | Blaxel | 9999 | 9999 – 9999 | 2 | n too small |
| 2 | Daytona (VM) | 9999 | 9999 – 9999 | 2 | n too small, equal medians |
| 2 | E2B | 9999 | 9999 – 9999 | 2 | n too small, equal medians |
| 2 | Novita | 9999 | 9999 – 9999 | 2 | n too small, equal medians |
| 6 | Modal (gVisor) | 161 | 157 – 165 | 2 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~2.3× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 9103 | 8963 – 9243 | 2 | — |
| 2 | Novita | 3925 | 3884 – 3965 | 2 | n too small |
| 3 | E2B | 3733 | 3522 – 3943 | 2 | n too small |
| 4 | Daytona (VM) | 3125 | 2882 – 3368 | 2 | n too small |
| 5 | Blaxel | 1488 | 1458 – 1519 | 2 | n too small |
| 6 | Modal (VM) | 1345 | 1323 – 1366 | 2 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Novita leads · ~1.4× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6480 | 6453 – 6508 | 2 | — |
| 2 | Daytona (VM) | 4762 | 4755 – 4769 | 2 | n too small |
| 3 | Modal (VM) | 4084 | 4067 – 4101 | 2 | n too small |
| 4 | E2B | 3760 | 3720 – 3799 | 2 | n too small |
| 5 | Blaxel | 1106 | 855.3 – 1357 | 2 | n too small |
| 6 | Modal (gVisor) | 149.6 | 146.2 – 153 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 406 | 405 – 407 | 2 | — |
| 2 | Blaxel | 475.5 | 469 – 482 | 2 | n too small |
| 3 | Novita | 487 | 487 – 487 | 2 | n too small |
| 4 | E2B | 808.5 | 799 – 818 | 2 | n too small |
| 5 | Modal (VM) | 818 | 815 – 821 | 2 | n too small |
| 6 | Modal (gVisor) | 896 | 895 – 897 | 2 | n too small |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 36.32 | 36.16 – 36.48 | 2 | — |
| 2 | Blaxel | 41.94 | 41.8 – 42.08 | 2 | n too small |
| 3 | Novita | 45.88 | 45.73 – 46.03 | 2 | n too small |
| 4 | Modal (VM) | 63.22 | 63.12 – 63.33 | 2 | n too small |
| 5 | E2B | 67.19 | 66.99 – 67.4 | 2 | n too small |
| 6 | Modal (gVisor) | 83.34 | 82.78 – 83.91 | 2 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 329300 | 323900 – 334800 | 2 | — |
| 2 | Daytona (VM) | 303400 | 302000 – 304800 | 2 | n too small |
| 3 | Novita | 230100 | 222100 – 238200 | 2 | n too small |
| 4 | Modal (VM) | 194800 | 192000 – 197600 | 2 | n too small |
| 5 | E2B | 178300 | 175900 – 180800 | 2 | n too small |
| 6 | Modal (gVisor) | 10430 | 9699 – 11170 | 2 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.1515 | 0.149 – 0.154 | 2 | — |
| 2 | Daytona (VM) | 0.165 | 0.164 – 0.166 | 2 | n too small |
| 3 | Novita | 0.2175 | 0.21 – 0.225 | 2 | n too small |
| 4 | Modal (VM) | 0.2565 | 0.253 – 0.26 | 2 | n too small |
| 5 | E2B | 0.2805 | 0.277 – 0.284 | 2 | n too small |
| 6 | Modal (gVisor) | 4.816 | 4.478 – 5.155 | 2 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Novita on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 22450 | 22410 – 22490 | 2 | — |
| 2 | Novita | 18760 | 18450 – 19080 | 2 | n too small |
| 3 | Daytona (VM) | 15870 | 15840 – 15890 | 2 | n too small |
| 4 | Modal (VM) | 12490 | 12070 – 12910 | 2 | n too small |
| 5 | E2B | 12410 | 12290 – 12520 | 2 | n too small |
| 6 | Modal (gVisor) | 1959 | 1935 – 1984 | 2 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Blaxel leads · Novita is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.228 | 2.224 – 2.232 | 2 | — |
| 2 | Novita | 2.665 | 2.621 – 2.709 | 2 | n too small |
| 3 | Daytona (VM) | 3.151 | 3.146 – 3.156 | 2 | n too small |
| 4 | Modal (VM) | 4.007 | 3.872 – 4.142 | 2 | n too small |
| 5 | E2B | 4.03 | 3.993 – 4.068 | 2 | n too small |
| 6 | Modal (gVisor) | 25.52 | 25.21 – 25.84 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.39 | 30.24 – 30.54 | 2 | — |
| 2 | Blaxel | 37.55 | 36.94 – 38.17 | 2 | n too small |
| 3 | Novita | 44.05 | 43.81 – 44.29 | 2 | n too small |
| 4 | Modal (VM) | 63.26 | 63.2 – 63.33 | 2 | n too small |
| 5 | E2B | 72.77 | 72.27 – 73.27 | 2 | n too small |
| 6 | Modal (gVisor) | 407.5 | 394.7 – 420.3 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 25.89 | — | 1 |
| 2 | Blaxel | 25.98 | — | 1 |
| 3 | Novita | 31.16 | — | 1 |
| 4 | Modal (VM) | 36.87 | — | 1 |
| 5 | Modal (gVisor) | 80.17 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 51.31 | — | 1 |
| 2 | Modal (VM) | 53.37 | — | 1 |
| 3 | Blaxel | 57.12 | — | 1 |
| 4 | Novita | 83.33 | — | 1 |
| 5 | E2B | 96.73 | — | 1 |
| 6 | Modal (gVisor) | 145 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Modal (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 9.841 | — | 1 |
| 2 | Daytona (VM) | 9.923 | — | 1 |
| 3 | Blaxel | 10.95 | — | 1 |
| 4 | Novita | 14.33 | — | 1 |
| 5 | E2B | 17.24 | — | 1 |
| 6 | Modal (gVisor) | 30.33 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · E2B is ~1.4× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1.247 | — | 1 |
| 2 | E2B | 1.744 | — | 1 |
| 3 | Daytona (VM) | 1.765 | — | 1 |
| 4 | Modal (VM) | 1.897 | — | 1 |
| 5 | Novita | 2.212 | — | 1 |
| 6 | Modal (gVisor) | 2.924 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.889 | — | 1 |
| 2 | Modal (VM) | 3.001 | — | 1 |
| 3 | Blaxel | 3.29 | — | 1 |
| 4 | Novita | 4.147 | — | 1 |
| 5 | E2B | 5.038 | — | 1 |
| 6 | Modal (gVisor) | 10.91 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 9.52 | — | 1 |
| 2 | Daytona (VM) | 10.38 | — | 1 |
| 3 | Blaxel | 10.39 | — | 1 |
| 4 | Novita | 14.71 | — | 1 |
| 5 | E2B | 20.65 | — | 1 |
| 6 | Modal (gVisor) | 29.17 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 2.709 | — | 1 |
| 2 | Daytona (VM) | 2.9 | — | 1 |
| 3 | Blaxel | 3.049 | — | 1 |
| 4 | Novita | 3.975 | — | 1 |
| 5 | E2B | 5.175 | — | 1 |
| 6 | Modal (gVisor) | 7.021 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.357 | — | 1 |
| 2 | Modal (VM) | 2.391 | — | 1 |
| 3 | Blaxel | 2.485 | — | 1 |
| 4 | Novita | 3.248 | — | 1 |
| 5 | E2B | 4.175 | — | 1 |
| 6 | Modal (gVisor) | 11.17 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Modal (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 6.646 | — | 1 |
| 2 | Blaxel | 7.19 | — | 1 |
| 3 | Daytona (VM) | 7.329 | — | 1 |
| 4 | Novita | 10.04 | — | 1 |
| 5 | E2B | 12.6 | — | 1 |
| 6 | Modal (gVisor) | 16.64 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Modal (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 21.94 | — | 1 |
| 2 | Modal (VM) | 24.54 | — | 1 |
| 3 | Blaxel | 26.11 | — | 1 |
| 4 | Novita | 37.06 | — | 1 |
| 5 | E2B | 48.03 | — | 1 |
| 6 | Modal (gVisor) | 117.5 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Modal (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 36.56 | — | 1 |
| 2 | Daytona (VM) | 38 | — | 1 |
| 3 | Blaxel | 41.37 | — | 1 |
| 4 | Novita | 55.25 | — | 1 |
| 5 | E2B | 69.07 | — | 1 |
| 6 | Modal (gVisor) | 84.24 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 71.03 | — | 1 |
| 2 | Blaxel | 72.35 | — | 1 |
| 3 | Novita | 76.87 | — | 1 |
| 4 | Modal (VM) | 95.19 | — | 1 |
| 5 | Modal (gVisor) | 187.9 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 6.281 | — | 1 |
| 2 | Daytona (VM) | 6.415 | — | 1 |
| 3 | Modal (VM) | 6.754 | — | 1 |
| 4 | Novita | 6.9 | — | 1 |
| 5 | Modal (gVisor) | 9.885 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 86.09 | — | 1 |
| 2 | Daytona (VM) | 93.74 | — | 1 |
| 3 | Novita | 96.98 | — | 1 |
| 4 | Modal (VM) | 116.6 | — | 1 |
| 5 | Modal (gVisor) | 192 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.911 | — | 1 |
| 2 | Daytona (VM) | 6.065 | — | 1 |
| 3 | Novita | 7.283 | — | 1 |
| 4 | Modal (VM) | 7.744 | — | 1 |
| 5 | Modal (gVisor) | 15.01 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 8.925 | — | 1 |
| 2 | Daytona (VM) | 9.163 | — | 1 |
| 3 | Modal (VM) | 9.378 | — | 1 |
| 4 | Novita | 9.65 | — | 1 |
| 5 | Modal (gVisor) | 15.98 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 35.72 | — | 1 |
| 2 | Blaxel | 36.63 | — | 1 |
| 3 | Modal (VM) | 46.43 | — | 1 |
| 4 | Novita | 51.25 | — | 1 |
| 5 | Modal (gVisor) | 117.7 | — | 1 |

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

14 uncovered results across 6 providers (Blaxel 2, Daytona (VM) 2, E2B 2, Modal (gVisor) 3, Modal (VM) 2, Novita 3). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Blaxel | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Daytona (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (gVisor) | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
| Modal (gVisor) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (gVisor) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Modal (VM) | realworld-mastra | **failed** | PTS ran but every trial failed for 1 of 5 declared metrics: realworld_mastra_task_test_core (realworld-mastra/pts_realworld-mastra.xml) — attempted, no value recorded |
| Modal (VM) | realworld-openclaw | **failed** | PTS ran but every trial failed for 5 of 8 declared metrics: realworld_openclaw_task_build (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_format (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_lint_oxlint (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_shrinkwrap_check (realworld-openclaw/pts_realworld-openclaw.xml), realworld_openclaw_task_test_unit_fast (realworld-openclaw/pts_realworld-openclaw.xml) — attempted, no value recorded |
| Novita | disk | **failed** | PTS duplicate-value dedup dropped 1 fio twin result (MB/s == IOPS at this block size, so the duplicate-valued &lt;Result&gt; was never written): fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s (twin survived in disk/pts_fio-seq-read.xml) |
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
| cpu | Node.js web tooling | Daytona (VM) | — | — |
| cpu | Node.js web tooling | Modal (VM) | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Blaxel | 1.0 (n too small) | 0.84 |
| cpu | Node.js web tooling | Novita | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 1.0 (n too small) | 0.84 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 1.0 (n too small) | 0.84 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal (gVisor) | 1.0 (n too small) | 0.84 |
| memory | STREAM Add | E2B | 0.67 (n too small) | 0.84 |
| memory | STREAM Add | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Blaxel | — | — |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Novita | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | Blaxel | — | — |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | Novita | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | E2B | 1.0 (n too small) | 0.84 |
| network | iperf3 loopback TCP, 10 streams | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback UDP, 10G objective | Modal (VM) | — | — |
| network | iperf3 loopback UDP, 10G objective | Blaxel | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback UDP, 10G objective | Daytona (VM) | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | E2B | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Novita | 1.0 (n too small, equal medians) | 1.0 |
| network | iperf3 loopback UDP, 10G objective | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | Modal (gVisor) | — | — |
| network | iperf3 WAN download | Novita | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | E2B | 0.67 (n too small) | 0.84 |
| network | iperf3 WAN download | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | Blaxel | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN upload | Novita | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN upload | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN upload | E2B | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN upload | Blaxel | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | PyBench | Daytona (VM) | — | — |
| system | PyBench | Blaxel | 0.33 (n too small) | 0.097 |
| system | PyBench | Novita | 0.33 (n too small) | 0.097 |
| system | PyBench | E2B | 0.33 (n too small) | 0.097 |
| system | PyBench | Modal (VM) | 0.67 (n too small) | 0.84 |
| system | PyBench | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Novita | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | E2B | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Novita | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Blaxel | — | — |
| system | pgbench RW (s100, 50c) | Novita | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | E2B | 1.0 (n too small) | 0.84 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RW latency (s100, 50c) | Novita | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | E2B | 1.0 (n too small) | 0.84 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal (VM) | — | — |
| realworld | Mastra: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Modal (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal (gVisor) | — | — |
| realworld | Better-Auth: cold install | Modal (VM) | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint format | Modal (VM) | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Modal (VM) | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint spell | Modal (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Modal (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal (gVisor) | — | — |
| realworld | Better-Auth: typecheck | Modal (VM) | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal (gVisor) | — | — |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Modal (VM) | — | — |
| realworld | Mastra: build:core | Modal (gVisor) | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Modal (VM) | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Modal (gVisor) | — | — |
| realworld | Mastra: lint:format | Blaxel | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Modal (VM) | — | — |
| realworld | Mastra: lint:format | Modal (gVisor) | — | — |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: cold install | Modal (VM) | — | — |
| realworld | OpenClaw: cold install | Modal (gVisor) | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | Modal (gVisor) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

