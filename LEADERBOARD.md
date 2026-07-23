# Sandbox provider leaderboard

Run `29937467891+29967667026` · commit `ef3189896d04e3c87bef999af95052f7e5838219` · generated 2026-07-23T00:04:42.739Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **254 metric records**
backed by **408 retained trial observations**, across **44 metrics** and
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
| 1 | Blaxel | 20.2 | 20.09 – 20.3 | 2 | — |
| 2 | Daytona (VM) | 18.56 | 18.41 – 18.71 | 2 | n too small |
| 3 | Modal (VM) | 15.72 | 15.66 – 15.78 | 2 | n too small |
| 4 | Novita | 14.73 | 13.44 – 16.01 | 2 | n too small |
| 5 | E2B | 14.09 | 13.94 – 14.24 | 2 | n too small |
| 6 | Modal (gVisor) | 9.45 | 8.99 – 9.91 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 247500 | 222000 – 273000 | 2 | — |
| 2 | Daytona (VM) | 244500 | 244000 – 245000 | 2 | n too small |
| 3 | Blaxel | 238000 | 217000 – 259000 | 2 | n too small |
| 4 | Novita | 69100 | 62700 – 75500 | 2 | n too small |
| 5 | E2B | 45600 | 45300 – 45900 | 2 | n too small |
| 6 | Modal (gVisor) | 31850 | 30700 – 33000 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 966 | 867 – 1065 | 2 | — |
| 2 | Daytona (VM) | 956 | 954 – 958 | 2 | n too small |
| 3 | Blaxel | 930.5 | 849 – 1012 | 2 | n too small |
| 4 | Novita | 270 | 245 – 295 | 2 | n too small |
| 5 | E2B | 178 | 177 – 179 | 2 | n too small |
| 6 | Modal (gVisor) | 124.5 | 120 – 129 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 280500 | 275000 – 286000 | 2 | — |
| 2 | Daytona (VM) | 216500 | 210000 – 223000 | 2 | n too small |
| 3 | Blaxel | 210500 | 202000 – 219000 | 2 | n too small |
| 4 | Novita | 67750 | 67200 – 68300 | 2 | n too small |
| 5 | E2B | 48500 | 48300 – 48700 | 2 | n too small |
| 6 | Modal (gVisor) | 27150 | 26800 – 27500 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.3× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1096 | 1076 – 1116 | 2 | — |
| 2 | Daytona (VM) | 845.5 | 820 – 871 | 2 | n too small |
| 3 | Blaxel | 822.5 | 790 – 855 | 2 | n too small |
| 4 | Novita | 265 | 263 – 267 | 2 | n too small |
| 5 | E2B | 189.5 | 189 – 190 | 2 | n too small |
| 6 | Modal (gVisor) | 106 | 105 – 107 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (gVisor) leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 18350 | 17700 – 19000 | 2 | — |
| 2 | Novita | 11084 | 9868 – 12300 | 2 | n too small |
| 3 | Blaxel | 7888 | 7729 – 8046 | 2 | n too small |
| 4 | Daytona (VM) | 7564 | 6343 – 8784 | 2 | n too small |
| 5 | Modal (VM) | 1745 | 1724 – 1765 | 2 | n too small |
| 6 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 9870 | — | 1 | — |
| 2 | Blaxel | 7889 | 7730 – 8047 | 2 | — |
| 3 | Daytona (VM) | 7566 | 6345 – 8786 | 2 | n too small |
| 4 | Modal (VM) | 1746 | 1725 – 1766 | 2 | n too small |
| 5 | E2B | 601.5 | 601 – 602 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5971 | 5679 – 6262 | 2 | — |
| 2 | Blaxel | 5885 | 5732 – 6037 | 2 | n too small |
| 3 | Daytona (VM) | 3993 | 3918 – 4068 | 2 | n too small |
| 4 | Modal (gVisor) | 2657 | 2231 – 3083 | 2 | n too small |
| 5 | Modal (VM) | 2328 | 2327 – 2328 | 2 | n too small |
| 6 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 5973 | 5681 – 6264 | 2 | — |
| 2 | Blaxel | 5886 | 5733 – 6038 | 2 | n too small |
| 3 | Daytona (VM) | 3995 | 3920 – 4069 | 2 | n too small |
| 4 | Modal (gVisor) | 2659 | 2232 – 3085 | 2 | n too small |
| 5 | Modal (VM) | 2329 | 2328 – 2329 | 2 | n too small |
| 6 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 25.67 | 25.32 – 26.02 | 2 | — |
| 2 | Blaxel | 19.87 | 19.75 – 19.99 | 2 | n too small |
| 3 | Novita | 16.52 | 15.55 – 17.49 | 2 | n too small |
| 4 | Modal (VM) | 15.67 | 15.62 – 15.72 | 2 | n too small |
| 5 | Modal (gVisor) | 3.34 | 3.2 – 3.48 | 2 | n too small |
| 6 | E2B | 1.345 | 1.33 – 1.36 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 184100 | 184000 – 184100 | 2 | — |
| 2 | Blaxel | 105500 | 105200 – 105800 | 2 | n too small |
| 3 | Modal (VM) | 77290 | 76740 – 77840 | 2 | n too small |
| 4 | Novita | 52050 | 51770 – 52330 | 2 | n too small |
| 5 | Modal (gVisor) | 49150 | 44820 – 53470 | 2 | n too small |
| 6 | E2B | 43460 | 41990 – 44930 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 183400 | 183300 – 183500 | 2 | — |
| 2 | Blaxel | 105100 | 104800 – 105400 | 2 | n too small |
| 3 | Modal (VM) | 76300 | 76060 – 76530 | 2 | n too small |
| 4 | Novita | 51990 | 51821 – 52160 | 2 | n too small |
| 5 | Modal (gVisor) | 48500 | 43880 – 53113 | 2 | n too small |
| 6 | E2B | 43190 | 41841 – 44550 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 213900 | 213000 – 214918 | 2 | — |
| 2 | Blaxel | 122400 | 121700 – 123000 | 2 | n too small |
| 3 | Modal (VM) | 93270 | 92850 – 93680 | 2 | n too small |
| 4 | Modal (gVisor) | 85580 | 83570 – 87580 | 2 | n too small |
| 5 | E2B | 72100 | 71550 – 72640 | 2 | n too small |
| 6 | Novita | 56560 | 56550 – 56570 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.8× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 174800 | 174600 – 174900 | 2 | — |
| 2 | Blaxel | 97330 | 96800 – 97870 | 2 | n too small |
| 3 | Modal (VM) | 73680 | 73250 – 74100 | 2 | n too small |
| 4 | Novita | 49630 | 49420 – 49836 | 2 | n too small |
| 5 | Modal (gVisor) | 44310 | 43132 – 45480 | 2 | n too small |
| 6 | E2B | 42570 | 41800 – 43340 | 2 | n too small |

## network

### iperf3 loopback TCP, 1 stream _(headline)_

Mbits/sec · higher is better

_Novita leads · ~1.7× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 1 stream (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 145800 | 145334 – 146285 | 2 | — |
| 2 | Blaxel | 86391 | 86171 – 86611 | 2 | n too small |
| 3 | E2B | 66477 | 66321 – 66633 | 2 | n too small |
| 4 | Daytona (VM) | 66170 | 62626 – 69715 | 2 | n too small |
| 5 | Modal (VM) | 14210 | 13871 – 14542 | 2 | n too small |
| 6 | Modal (gVisor) | 12593 | 11130 – 14056 | 2 | n too small |

### iperf3 loopback TCP, 10 streams

Mbits/sec · higher is better

_Novita leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | iperf3 loopback TCP, 10 streams (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 135911 | 134032 – 137790 | 2 | — |
| 2 | Blaxel | 107363 | 101488 – 113238 | 2 | n too small |
| 3 | Daytona (VM) | 79663 | 78329 – 80997 | 2 | n too small |
| 4 | E2B | 52380 | 49436 – 55317 | 2 | n too small |
| 5 | Modal (VM) | 16040 | 14915 – 17174 | 2 | n too small |
| 6 | Modal (gVisor) | 11760 | 10621 – 12894 | 2 | n too small |

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
| 6 | Modal (gVisor) | 149.5 | 137 – 162 | 2 | n too small |

### iperf3 WAN download

Mbits/sec · higher is better

_Modal (gVisor) leads · ~1.7× Novita on median (higher is better)._

| Rank | Provider | iperf3 WAN download (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (gVisor) | 6896 | 6622 – 7170 | 2 | — |
| 2 | Novita | 4063 | 3376 – 4751 | 2 | n too small |
| 3 | Daytona (VM) | 3066 | 2812 – 3319 | 2 | n too small |
| 4 | E2B | 3058 | 2998 – 3118 | 2 | n too small |
| 5 | Modal (VM) | 1426 | 1423 – 1428 | 2 | n too small |
| 6 | Blaxel | 1095 | 700.4 – 1489 | 2 | n too small |

### iperf3 WAN upload

Mbits/sec · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | iperf3 WAN upload (Mbits/sec) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 5035 | 4546 – 5523 | 2 | — |
| 2 | Daytona (VM) | 4718 | 4685 – 4751 | 2 | n too small |
| 3 | Novita | 4308 | 2279 – 6338 | 2 | n too small |
| 4 | E2B | 2925 | 2667 – 3184 | 2 | n too small |
| 5 | Modal (gVisor) | 1448 | 154.7 – 2741 | 2 | n too small |
| 6 | Blaxel | 1295 | 1066 – 1524 | 2 | n too small |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 406.5 | 406 – 407 | 2 | — |
| 2 | Blaxel | 475.5 | 469 – 482 | 2 | n too small |
| 3 | Modal (VM) | 658 | 658 – 658 | 2 | n too small |
| 4 | Novita | 690.5 | 671 – 710 | 2 | n too small |
| 5 | E2B | 811.5 | 805 – 818 | 2 | n too small |
| 6 | Modal (gVisor) | 903 | 901 – 905 | 2 | n too small |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 37 | 36.73 – 37.28 | 2 | — |
| 2 | Blaxel | 41.19 | 40.95 – 41.42 | 2 | n too small |
| 3 | Modal (VM) | 46.69 | 46.69 – 46.69 | 2 | n too small |
| 4 | Novita | 55.42 | 53.03 – 57.8 | 2 | n too small |
| 5 | E2B | 64.54 | 64.3 – 64.78 | 2 | n too small |
| 6 | Modal (gVisor) | 87.44 | 86.55 – 88.33 | 2 | n too small |

### pgbench RO (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.2× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RO (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 348000 | 335500 – 360500 | 2 | — |
| 2 | Daytona (VM) | 301000 | 300700 – 301300 | 2 | n too small |
| 3 | Modal (VM) | 199200 | 198200 – 200300 | 2 | n too small |
| 4 | E2B | 175600 | 175300 – 175900 | 2 | n too small |
| 5 | Novita | 169900 | 160900 – 178900 | 2 | n too small |
| 6 | Modal (gVisor) | 11850 | 11690 – 12020 | 2 | n too small |

### pgbench RO latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.2× higher (lower is better)._

| Rank | Provider | pgbench RO latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 0.144 | 0.139 – 0.149 | 2 | — |
| 2 | Daytona (VM) | 0.166 | 0.166 – 0.166 | 2 | n too small |
| 3 | Modal (VM) | 0.251 | 0.25 – 0.252 | 2 | n too small |
| 4 | E2B | 0.2845 | 0.284 – 0.285 | 2 | n too small |
| 5 | Novita | 0.295 | 0.279 – 0.311 | 2 | n too small |
| 6 | Modal (gVisor) | 4.219 | 4.161 – 4.277 | 2 | n too small |

### pgbench RW (s100, 50c)

TPS · higher is better

_Blaxel leads · ~1.5× Daytona (VM) on median (higher is better)._

| Rank | Provider | pgbench RW (s100, 50c) (TPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 24330 | 24280 – 24380 | 2 | — |
| 2 | Daytona (VM) | 15730 | 15720 – 15740 | 2 | n too small |
| 3 | Modal (VM) | 13230 | 12910 – 13560 | 2 | n too small |
| 4 | Novita | 12720 | 11870 – 13560 | 2 | n too small |
| 5 | E2B | 11830 | 11160 – 12500 | 2 | n too small |
| 6 | Modal (gVisor) | 2032 | 2030 – 2034 | 2 | n too small |

### pgbench RW latency (s100, 50c)

ms · lower is better

_Blaxel leads · Daytona (VM) is ~1.5× higher (lower is better)._

| Rank | Provider | pgbench RW latency (s100, 50c) (ms) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 2.055 | 2.051 – 2.059 | 2 | — |
| 2 | Daytona (VM) | 3.179 | 3.177 – 3.182 | 2 | n too small |
| 3 | Modal (VM) | 3.78 | 3.687 – 3.874 | 2 | n too small |
| 4 | Novita | 3.949 | 3.686 – 4.212 | 2 | n too small |
| 5 | E2B | 4.24 | 4 – 4.48 | 2 | n too small |
| 6 | Modal (gVisor) | 24.6 | 24.58 – 24.63 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.2× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 30.86 | 30.59 – 31.13 | 2 | — |
| 2 | Blaxel | 36.25 | 35.76 – 36.75 | 2 | n too small |
| 3 | Modal (VM) | 62.5 | 62.48 – 62.52 | 2 | n too small |
| 4 | Novita | 65.14 | 64.51 – 65.78 | 2 | n too small |
| 5 | E2B | 68.91 | 68.71 – 69.12 | 2 | n too small |
| 6 | Modal (gVisor) | 425.5 | 415.2 – 435.7 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 27.06 | — | 1 |
| 2 | Daytona (VM) | 27.87 | — | 1 |
| 3 | Modal (VM) | 36.48 | — | 1 |
| 4 | Novita | 40.98 | — | 1 |
| 5 | Modal (gVisor) | 79.7 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 52.22 | — | 1 |
| 2 | Blaxel | 56.16 | — | 1 |
| 3 | Modal (VM) | 69.5 | — | 1 |
| 4 | Novita | 77.99 | — | 1 |
| 5 | E2B | 97.51 | — | 1 |
| 6 | Modal (gVisor) | 146.7 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 10.09 | — | 1 |
| 2 | Blaxel | 10.49 | — | 1 |
| 3 | Novita | 11.68 | — | 1 |
| 4 | Modal (VM) | 13.86 | — | 1 |
| 5 | E2B | 17.66 | — | 1 |
| 6 | Modal (gVisor) | 31.26 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1.105 | — | 1 |
| 2 | Modal (VM) | 1.177 | — | 1 |
| 3 | E2B | 1.644 | — | 1 |
| 4 | Daytona (VM) | 2.035 | — | 1 |
| 5 | Novita | 2.294 | — | 1 |
| 6 | Modal (gVisor) | 2.757 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.99 | — | 1 |
| 2 | Blaxel | 3.165 | — | 1 |
| 3 | Novita | 3.918 | — | 1 |
| 4 | Modal (VM) | 4.096 | — | 1 |
| 5 | E2B | 5.406 | — | 1 |
| 6 | Modal (gVisor) | 10.65 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 9.92 | — | 1 |
| 2 | Daytona (VM) | 10.3 | — | 1 |
| 3 | Novita | 12.38 | — | 1 |
| 4 | Modal (VM) | 13.35 | — | 1 |
| 5 | E2B | 18.41 | — | 1 |
| 6 | Modal (gVisor) | 29.93 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.893 | — | 1 |
| 2 | Blaxel | 2.929 | — | 1 |
| 3 | Novita | 3.388 | — | 1 |
| 4 | Modal (VM) | 3.798 | — | 1 |
| 5 | E2B | 5.125 | — | 1 |
| 6 | Modal (gVisor) | 8.011 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.331 | — | 1 |
| 2 | Blaxel | 2.47 | — | 1 |
| 3 | Novita | 3.086 | — | 1 |
| 4 | Modal (VM) | 3.143 | — | 1 |
| 5 | E2B | 4.232 | — | 1 |
| 6 | Modal (gVisor) | 11.04 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 6.743 | — | 1 |
| 2 | Daytona (VM) | 7.523 | — | 1 |
| 3 | Novita | 8.348 | — | 1 |
| 4 | Modal (VM) | 8.98 | — | 1 |
| 5 | E2B | 13.22 | — | 1 |
| 6 | Modal (gVisor) | 16.87 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 22.07 | — | 1 |
| 2 | Blaxel | 24.39 | — | 1 |
| 3 | Modal (VM) | 33.36 | — | 1 |
| 4 | Novita | 38.28 | — | 1 |
| 5 | E2B | 47.99 | — | 1 |
| 6 | Modal (gVisor) | 118.9 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 37.69 | — | 1 |
| 2 | Daytona (VM) | 38.36 | — | 1 |
| 3 | Novita | 47.69 | — | 1 |
| 4 | Modal (VM) | 49.09 | — | 1 |
| 5 | E2B | 71.4 | — | 1 |
| 6 | Modal (gVisor) | 81.11 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 69.5 | — | 1 |
| 2 | Blaxel | 70.94 | — | 1 |
| 3 | Novita | 84.97 | — | 1 |
| 4 | Modal (VM) | 91.45 | — | 1 |
| 5 | Modal (gVisor) | 184.1 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Modal (VM) leads · Daytona (VM) is ~2.2× higher (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 3.218 | — | 1 |
| 2 | Daytona (VM) | 7.057 | — | 1 |
| 3 | Novita | 7.294 | — | 1 |
| 4 | Blaxel | 7.493 | — | 1 |
| 5 | Modal (gVisor) | 11.3 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 86.37 | — | 1 |
| 2 | Blaxel | 87.92 | — | 1 |
| 3 | Novita | 104.7 | — | 1 |
| 4 | Modal (VM) | 114.4 | — | 1 |
| 5 | Modal (gVisor) | 199 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.3× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.915 | — | 1 |
| 2 | Daytona (VM) | 6.525 | — | 1 |
| 3 | Modal (VM) | 6.573 | — | 1 |
| 4 | Novita | 7.358 | — | 1 |
| 5 | Modal (gVisor) | 16.96 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 3.272 | — | 1 |
| 2 | Novita | 4.559 | — | 1 |
| 3 | Blaxel | 8.313 | — | 1 |
| 4 | Modal (VM) | 9.199 | — | 1 |
| 5 | Modal (gVisor) | 15.18 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 37.35 | — | 1 |
| 2 | Daytona (VM) | 38.21 | — | 1 |
| 3 | Novita | 42.14 | — | 1 |
| 4 | Modal (gVisor) | 125.7 | — | 1 |

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

13 uncovered results across 6 providers (Blaxel 2, Daytona (VM) 2, E2B 2, Modal (gVisor) 3, Modal (VM) 2, Novita 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

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
| cpu | Node.js web tooling | Daytona (VM) | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal (VM) | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Novita | 1.0 (n too small) | 0.84 |
| cpu | Node.js web tooling | E2B | 1.0 (n too small) | 0.84 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.67 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.67 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (gVisor) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal (VM) | 1.0 (n too small) | 0.84 |
| disk | Hardlink throughput | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal (gVisor) | 1.0 (n too small) | 0.84 |
| memory | STREAM Triad | E2B | 0.67 (n too small) | 0.84 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal (gVisor) | 1.0 (n too small) | 0.84 |
| memory | STREAM Add | E2B | 0.67 (n too small) | 0.84 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.67 (n too small) | 0.84 |
| network | iperf3 loopback TCP, 1 stream | Novita | — | — |
| network | iperf3 loopback TCP, 1 stream | Blaxel | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | E2B | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Daytona (VM) | 1.0 (n too small) | 0.84 |
| network | iperf3 loopback TCP, 1 stream | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 1 stream | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| network | iperf3 loopback TCP, 10 streams | Novita | — | — |
| network | iperf3 loopback TCP, 10 streams | Blaxel | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 loopback TCP, 10 streams | E2B | 0.33 (n too small) | 0.097 |
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
| network | iperf3 WAN download | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | E2B | 1.0 (n too small) | 0.84 |
| network | iperf3 WAN download | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | iperf3 WAN download | Blaxel | 1.0 (n too small) | 0.84 |
| network | iperf3 WAN upload | Modal (VM) | — | — |
| network | iperf3 WAN upload | Daytona (VM) | 1.0 (n too small) | 0.84 |
| network | iperf3 WAN upload | Novita | 1.0 (n too small) | 0.84 |
| network | iperf3 WAN upload | E2B | 1.0 (n too small) | 0.84 |
| network | iperf3 WAN upload | Modal (gVisor) | 0.67 (n too small) | 0.84 |
| network | iperf3 WAN upload | Blaxel | 1.0 (n too small) | 0.84 |
| system | PyBench | Daytona (VM) | — | — |
| system | PyBench | Blaxel | 0.33 (n too small) | 0.097 |
| system | PyBench | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | PyBench | Novita | 0.33 (n too small) | 0.097 |
| system | PyBench | E2B | 0.33 (n too small) | 0.097 |
| system | PyBench | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Blaxel | — | — |
| system | pgbench RO (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | E2B | 0.33 (n too small) | 0.097 |
| system | pgbench RO (s100, 50c) | Novita | 1.0 (n too small) | 0.84 |
| system | pgbench RO (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RO latency (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | E2B | 0.33 (n too small) | 0.097 |
| system | pgbench RO latency (s100, 50c) | Novita | 1.0 (n too small) | 0.84 |
| system | pgbench RO latency (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Blaxel | — | — |
| system | pgbench RW (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW (s100, 50c) | Novita | 1.0 (n too small) | 0.84 |
| system | pgbench RW (s100, 50c) | E2B | 0.67 (n too small) | 0.84 |
| system | pgbench RW (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Blaxel | — | — |
| system | pgbench RW latency (s100, 50c) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | pgbench RW latency (s100, 50c) | Novita | 1.0 (n too small) | 0.84 |
| system | pgbench RW latency (s100, 50c) | E2B | 0.67 (n too small) | 0.84 |
| system | pgbench RW latency (s100, 50c) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Blaxel | — | — |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Modal (VM) | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Modal (VM) | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal (gVisor) | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | Modal (VM) | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | E2B | — | — |
| realworld | Better-Auth: lint deps (Knip) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint format | Daytona (VM) | — | — |
| realworld | Better-Auth: lint format | Blaxel | — | — |
| realworld | Better-Auth: lint format | Novita | — | — |
| realworld | Better-Auth: lint format | Modal (VM) | — | — |
| realworld | Better-Auth: lint format | E2B | — | — |
| realworld | Better-Auth: lint format | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint packages | Daytona (VM) | — | — |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Novita | — | — |
| realworld | Better-Auth: lint packages | Modal (VM) | — | — |
| realworld | Better-Auth: lint packages | E2B | — | — |
| realworld | Better-Auth: lint packages | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | Modal (VM) | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Modal (VM) | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal (gVisor) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | Modal (VM) | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal (gVisor) | — | — |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Blaxel | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Modal (VM) | — | — |
| realworld | Mastra: build:core | Modal (gVisor) | — | — |
| realworld | Mastra: git clone | Modal (VM) | — | — |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Blaxel | — | — |
| realworld | Mastra: git clone | Modal (gVisor) | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Blaxel | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Modal (VM) | — | — |
| realworld | Mastra: lint:format | Modal (gVisor) | — | — |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Daytona (VM) | — | — |
| realworld | OpenClaw: cold install | Modal (VM) | — | — |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: cold install | Modal (gVisor) | — | — |
| realworld | OpenClaw: git clone | Daytona (VM) | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | — | — |
| realworld | OpenClaw: git clone | Modal (gVisor) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Daytona (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (gVisor) | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

