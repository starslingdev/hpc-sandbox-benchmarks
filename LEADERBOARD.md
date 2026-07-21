# Sandbox provider leaderboard

Run `29850811070` · commit `b54d799425ef7ad49dc8b2a344b7c7b1b68eed34` · generated 2026-07-21T18:22:33.981Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **182 metric records**
backed by **269 retained trial observations**, across **40 metrics** and
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
| Daytona (container) | container (Sysbox/OCI) | — |
| Daytona (VM) | microVM (Linux VM) | vm |
| E2B | Firecracker microVM | vm |
| Modal (gVisor) | gVisor container | gvisor |
| Modal (VM) | microVM (VM runtime) | vm |
| Novita | microVM | vm |

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Blaxel leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 20.96 | 20.9 – 21.02 | 2 | — |
| 2 | Daytona (VM) | 20.38 | 20.13 – 20.62 | 2 | n too small |
| 3 | Novita | 17.64 | 17.3 – 17.98 | 2 | n too small |
| 4 | Modal (VM) | 16.13 | 15.92 – 16.33 | 2 | n too small |
| 5 | E2B | 10.23 | 10.07 – 10.39 | 2 | n too small |
| 6 | Modal (gVisor) | 8.76 | 8.68 – 8.84 | 2 | n too small |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 279500 | 270000 – 289000 | 2 | — |
| 2 | Daytona (VM) | 248500 | 247000 – 250000 | 2 | n too small |
| 3 | Blaxel | 243500 | 243000 – 244000 | 2 | n too small |
| 4 | Novita | 67900 | 62500 – 73300 | 2 | n too small |
| 5 | E2B | 44050 | 43400 – 44700 | 2 | n too small |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.1× Daytona (VM) on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1091 | 1054 – 1128 | 2 | — |
| 2 | Daytona (VM) | 971 | 964 – 978 | 2 | n too small |
| 3 | Blaxel | 950.5 | 949 – 952 | 2 | n too small |
| 4 | Novita | 265 | 244 – 286 | 2 | n too small |
| 5 | E2B | 172.5 | 170 – 175 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal (VM) leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 304500 | 302000 – 307000 | 2 | — |
| 2 | Blaxel | 222500 | 210000 – 235000 | 2 | n too small |
| 3 | Daytona (VM) | 213000 | 210000 – 216000 | 2 | n too small |
| 4 | Novita | 66500 | 65800 – 67200 | 2 | n too small |
| 5 | E2B | 44650 | 44400 – 44900 | 2 | n too small |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~1.4× Blaxel on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1189 | 1180 – 1198 | 2 | — |
| 2 | Blaxel | 869.5 | 820 – 919 | 2 | n too small |
| 3 | Daytona (VM) | 832.5 | 820 – 845 | 2 | n too small |
| 4 | Novita | 259.5 | 257 – 262 | 2 | n too small |
| 5 | E2B | 174 | 173 – 175 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Daytona (VM) leads · ~1.1× Blaxel on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 11650 | 11200 – 12100 | 2 | — |
| 2 | Blaxel | 10550 | 10500 – 10600 | 2 | n too small |
| 3 | Novita | 10500 | 10300 – 10700 | 2 | n too small |
| 4 | Modal (VM) | 1729 | 1710 – 1748 | 2 | n too small |
| 5 | E2B | 599 | 599 – 599 | 2 | n too small |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Modal (VM) leads · ~2.9× E2B on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal (VM) | 1731 | 1711 – 1750 | 2 | — |
| 2 | E2B | 601 | 601 – 601 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6193 | 5721 – 6665 | 2 | — |
| 2 | Blaxel | 6091 | 6073 – 6108 | 2 | n too small |
| 3 | Daytona (VM) | 4614 | 4474 – 4753 | 2 | n too small |
| 4 | Modal (VM) | 2502 | 2409 – 2595 | 2 | n too small |
| 5 | E2B | 599.5 | 599 – 600 | 2 | n too small |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads on median (higher is better); see notes for how ranks are decided._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6195 | 5723 – 6667 | 2 | — |
| 2 | Blaxel | 6092 | 6075 – 6109 | 2 | n too small |
| 3 | Daytona (VM) | 4615 | 4475 – 4754 | 2 | n too small |
| 4 | Modal (VM) | 2504 | 2410 – 2597 | 2 | n too small |
| 5 | E2B | 601 | 601 – 601 | 2 | n too small |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 26.31 | 26.18 – 26.45 | 2 | — |
| 2 | Blaxel | 19.71 | 19.63 – 19.79 | 2 | n too small |
| 3 | Novita | 18.41 | 18.36 – 18.46 | 2 | n too small |
| 4 | Modal (VM) | 15.72 | 15.65 – 15.79 | 2 | n too small |
| 5 | E2B | 1.36 | 1.36 – 1.36 | 2 | n too small |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 127500 | 109172 – 145900 | 2 | — |
| 2 | Blaxel | 106600 | 106400 – 106700 | 2 | n too small |
| 3 | Modal (VM) | 79800 | 78750 – 80856 | 2 | n too small |
| 4 | Novita | 71010 | 65780 – 76250 | 2 | n too small |
| 5 | E2B | 44430 | 44187 – 44680 | 2 | n too small |

### STREAM Add

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 130700 | 108500 – 152800 | 2 | — |
| 2 | Blaxel | 106300 | 106176 – 106400 | 2 | n too small |
| 3 | Modal (VM) | 79920 | 78890 – 80950 | 2 | n too small |
| 4 | Novita | 68640 | 65560 – 71710 | 2 | n too small |
| 5 | E2B | 44350 | 44030 – 44660 | 2 | n too small |

### STREAM Copy

MB/s · higher is better

_Daytona (VM) leads · ~1.2× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 148700 | 128500 – 168900 | 2 | — |
| 2 | Blaxel | 124000 | 123800 – 124200 | 2 | n too small |
| 3 | Modal (VM) | 113500 | 113200 – 113800 | 2 | n too small |
| 4 | E2B | 80980 | 80909 – 81060 | 2 | n too small |
| 5 | Novita | 76630 | 74840 – 78430 | 2 | n too small |

### STREAM Scale

MB/s · higher is better

_Daytona (VM) leads · ~1.3× Blaxel on median (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 123700 | 99640 – 147800 | 2 | — |
| 2 | Blaxel | 98550 | 98304 – 98800 | 2 | n too small |
| 3 | Modal (VM) | 97610 | 97280 – 97940 | 2 | n too small |
| 4 | Novita | 65190 | 62201 – 68170 | 2 | n too small |
| 5 | E2B | 42340 | 41723 – 42950 | 2 | n too small |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Blaxel leads · Daytona (VM) is ~1.6× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 3.541 | 3.341 – 3.741 | 2 | — |
| 2 | Daytona (VM) | 5.832 | 5.163 – 6.5 | 2 | n too small |
| 3 | Modal (VM) | 7.154 | 7.08 – 7.228 | 2 | n too small |
| 4 | Novita | 8.973 | 8.664 – 9.283 | 2 | n too small |
| 5 | E2B | 10.37 | 10.23 – 10.51 | 2 | n too small |
| 6 | Modal (gVisor) | 11.78 | 11.66 – 11.91 | 2 | n too small |

### fast.com download

Mbit/s · higher is better

_Modal (VM) leads · ~3.8× Blaxel on median (higher is better)._

| Rank | Provider | fast.com download (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 2000 | — | 1 |
| 2 | Blaxel | 520 | — | 1 |

### fast.com latency

ms · lower is better

_Modal (VM) leads · Blaxel is ~2.0× higher (lower is better)._

| Rank | Provider | fast.com latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 1 | — | 1 |
| 2 | Blaxel | 2 | — | 1 |

### fast.com loaded latency

ms · lower is better

_Modal (VM) leads · Blaxel is ~3.0× higher (lower is better)._

| Rank | Provider | fast.com loaded latency (ms) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 2 | — | 1 |
| 2 | Blaxel | 6 | — | 1 |

### fast.com upload

Mbit/s · higher is better

_Modal (VM) leads · ~5076.9× Blaxel on median (higher is better)._

| Rank | Provider | fast.com upload (Mbit/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Modal (VM) | 660 | — | 1 |
| 2 | Blaxel | 0.13 | — | 1 |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (473 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 473 | 471 – 475 | 2 |

### Git common operations

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Git common operations (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 37.57 | 37.29 – 37.84 | 2 | — |
| 2 | Blaxel | 42.33 | 42.14 – 42.51 | 2 | n too small |
| 3 | Novita | 50.94 | 50.68 – 51.21 | 2 | n too small |
| 4 | E2B | 64.74 | 64.47 – 65 | 2 | n too small |
| 5 | Modal (VM) | 65.98 | 65.72 – 66.25 | 2 | n too small |
| 6 | Modal (gVisor) | 81.6 | 80.58 – 82.61 | 2 | n too small |

### SQLite Speedtest

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona (VM) | 32.07 | 32 – 32.13 | 2 | — |
| 2 | Blaxel | 36.54 | 36.24 – 36.84 | 2 | n too small |
| 3 | Novita | 55.72 | 55.7 – 55.74 | 2 | n too small |
| 4 | Modal (VM) | 68.6 | 67.42 – 69.77 | 2 | n too small |
| 5 | E2B | 71.05 | 71 – 71.1 | 2 | n too small |
| 6 | Modal (gVisor) | 513.2 | 434.9 – 591.5 | 2 | n too small |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona (VM) leads · Modal (VM) is ~1.7× higher (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 24.98 | — | 1 |
| 2 | Modal (VM) | 41.49 | — | 1 |
| 3 | Novita | 43.84 | — | 1 |
| 4 | Modal (gVisor) | 99.38 | — | 1 |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 55.62 | — | 1 |
| 2 | Daytona (VM) | 55.83 | — | 1 |
| 3 | Novita | 65.35 | — | 1 |
| 4 | Modal (VM) | 90.93 | — | 1 |
| 5 | E2B | 92.25 | — | 1 |
| 6 | Modal (gVisor) | 139.7 | — | 1 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 10.02 | — | 1 |
| 2 | Blaxel | 10.52 | — | 1 |
| 3 | Novita | 10.67 | — | 1 |
| 4 | Modal (VM) | 16.88 | — | 1 |
| 5 | E2B | 18.13 | — | 1 |
| 6 | Modal (gVisor) | 30.08 | — | 1 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel leads · E2B is ~3.4× higher (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 0.551 | — | 1 |
| 2 | E2B | 1.88 | — | 1 |
| 3 | Novita | 1.91 | — | 1 |
| 4 | Daytona (VM) | 1.971 | — | 1 |
| 5 | Modal (gVisor) | 2.31 | — | 1 |
| 6 | Modal (VM) | 2.438 | — | 1 |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.94 | — | 1 |
| 2 | Blaxel | 3.14 | — | 1 |
| 3 | Novita | 3.389 | — | 1 |
| 4 | Modal (VM) | 4.3 | — | 1 |
| 5 | E2B | 5.016 | — | 1 |
| 6 | Modal (gVisor) | 13.74 | — | 1 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 9.594 | — | 1 |
| 2 | Blaxel | 10.19 | — | 1 |
| 3 | Novita | 12.09 | — | 1 |
| 4 | Modal (VM) | 15.54 | — | 1 |
| 5 | E2B | 17.64 | — | 1 |
| 6 | Modal (gVisor) | 37.01 | — | 1 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.615 | — | 1 |
| 2 | Blaxel | 2.828 | — | 1 |
| 3 | Novita | 3.175 | — | 1 |
| 4 | Modal (VM) | 4.464 | — | 1 |
| 5 | E2B | 4.953 | — | 1 |
| 6 | Modal (gVisor) | 6.725 | — | 1 |

### Better-Auth: lint packages

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 2.385 | — | 1 |
| 2 | Blaxel | 2.433 | — | 1 |
| 3 | Novita | 2.516 | — | 1 |
| 4 | Modal (VM) | 3.659 | — | 1 |
| 5 | E2B | 4.055 | — | 1 |
| 6 | Modal (gVisor) | 9.428 | — | 1 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 6.542 | — | 1 |
| 2 | Blaxel | 6.904 | — | 1 |
| 3 | Novita | 7.741 | — | 1 |
| 4 | Modal (VM) | 11.26 | — | 1 |
| 5 | E2B | 12.1 | — | 1 |
| 6 | Modal (gVisor) | 15.77 | — | 1 |

### Better-Auth: lint types

Seconds · lower is better

_Daytona (VM) leads · Blaxel is ~1.1× higher (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 24.88 | — | 1 |
| 2 | Blaxel | 26.14 | — | 1 |
| 3 | Novita | 27.48 | — | 1 |
| 4 | Modal (VM) | 43.95 | — | 1 |
| 5 | E2B | 45.35 | — | 1 |
| 6 | Modal (gVisor) | 109.2 | — | 1 |

### Better-Auth: typecheck

Seconds · lower is better

_Blaxel leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 38.1 | — | 1 |
| 2 | Daytona (VM) | 38.38 | — | 1 |
| 3 | Novita | 43.34 | — | 1 |
| 4 | Modal (VM) | 63.09 | — | 1 |
| 5 | E2B | 64.55 | — | 1 |
| 6 | Modal (gVisor) | 76.76 | — | 1 |

### Mastra: build:core

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.5× higher (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 71.09 | — | 1 |
| 2 | Novita | 108.8 | — | 1 |
| 3 | Modal (VM) | 114.7 | — | 1 |
| 4 | Modal (gVisor) | 189.7 | — | 1 |

### Mastra: git clone

Seconds · lower is better

_Daytona (VM) leads on median (lower is better); see notes for how ranks are decided._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 7.021 | — | 1 |
| 2 | Modal (VM) | 7.167 | — | 1 |
| 3 | Novita | 8.664 | — | 1 |
| 4 | Modal (gVisor) | 9.168 | — | 1 |

### Mastra: lint:format

Seconds · lower is better

_Daytona (VM) leads · Novita is ~1.4× higher (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona (VM) | 94.2 | — | 1 |
| 2 | Novita | 128 | — | 1 |
| 3 | Modal (VM) | 149.1 | — | 1 |
| 4 | Modal (gVisor) | 200 | — | 1 |

### OpenClaw: cold install

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 4.827 | — | 1 |
| 2 | Modal (VM) | 6.623 | — | 1 |

### OpenClaw: git clone

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~4.4× higher (lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.214 | — | 1 |
| 2 | Modal (VM) | 9.71 | — | 1 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Blaxel leads · Modal (VM) is ~1.4× higher (lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 38.27 | — | 1 |
| 2 | Modal (VM) | 52.13 | — | 1 |

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

20 uncovered results across 6 providers (Blaxel 1, Daytona (container) 8, Daytona (VM) 2, E2B 3, Modal (gVisor) 4, Novita 2). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 20.0 GiB free, suite needs 25 GiB |
| Blaxel | realworld-mastra | **failed** | Could not locate results payload markers in sandbox output |
| Daytona (VM) | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Daytona (VM) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| E2B | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal (gVisor) | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Modal (gVisor) | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 4800s |
| Novita | network | **failed** | Step "mise run benchmark:network:all" failed with exit code 1 |
| Novita | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| Daytona (container) | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | network | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| Daytona (container) | system | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal (gVisor) | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal (gVisor) | memory | **missing** | No result and no marker — the suite never reported for this provider. |

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
| cpu | Node.js web tooling | Novita | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal (VM) | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | E2B | 0.33 (n too small) | 0.097 |
| cpu | Node.js web tooling | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona (VM) | 1.0 (n too small) | 0.84 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.33 (n too small) | 0.097 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 1.0 (n too small) | 0.84 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal (VM) | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 1.0 (n too small) | 0.84 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Daytona (VM) | — | — |
| disk | Hardlink throughput | Blaxel | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Novita | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | Modal (VM) | 0.33 (n too small) | 0.097 |
| disk | Hardlink throughput | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Daytona (VM) | — | — |
| memory | STREAM Triad | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Triad | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Daytona (VM) | — | — |
| memory | STREAM Add | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Add | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Daytona (VM) | — | — |
| memory | STREAM Copy | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | E2B | 0.33 (n too small) | 0.097 |
| memory | STREAM Copy | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Daytona (VM) | — | — |
| memory | STREAM Scale | Blaxel | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Modal (VM) | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | Novita | 0.33 (n too small) | 0.097 |
| memory | STREAM Scale | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Blaxel | — | — |
| network | Loopback TCP (10GB) | Daytona (VM) | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal (VM) | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Novita | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | E2B | 0.33 (n too small) | 0.097 |
| network | Loopback TCP (10GB) | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| network | fast.com download | Modal (VM) | — | — |
| network | fast.com download | Blaxel | — | — |
| network | fast.com latency | Modal (VM) | — | — |
| network | fast.com latency | Blaxel | — | — |
| network | fast.com loaded latency | Modal (VM) | — | — |
| network | fast.com loaded latency | Blaxel | — | — |
| network | fast.com upload | Modal (VM) | — | — |
| network | fast.com upload | Blaxel | — | — |
| system | PyBench | Blaxel | — | — |
| system | Git common operations | Daytona (VM) | — | — |
| system | Git common operations | Blaxel | 0.33 (n too small) | 0.097 |
| system | Git common operations | Novita | 0.33 (n too small) | 0.097 |
| system | Git common operations | E2B | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | Git common operations | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Daytona (VM) | — | — |
| system | SQLite Speedtest | Blaxel | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Novita | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (VM) | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | E2B | 0.33 (n too small) | 0.097 |
| system | SQLite Speedtest | Modal (gVisor) | 0.33 (n too small) | 0.097 |
| realworld | Mastra: cold install | Daytona (VM) | — | — |
| realworld | Mastra: cold install | Modal (VM) | — | — |
| realworld | Mastra: cold install | Novita | — | — |
| realworld | Mastra: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Daytona (VM) | — | — |
| realworld | Better-Auth: build | Novita | — | — |
| realworld | Better-Auth: build | Modal (VM) | — | — |
| realworld | Better-Auth: build | E2B | — | — |
| realworld | Better-Auth: build | Modal (gVisor) | — | — |
| realworld | Better-Auth: cold install | Daytona (VM) | — | — |
| realworld | Better-Auth: cold install | Blaxel | — | — |
| realworld | Better-Auth: cold install | Novita | — | — |
| realworld | Better-Auth: cold install | Modal (VM) | — | — |
| realworld | Better-Auth: cold install | E2B | — | — |
| realworld | Better-Auth: cold install | Modal (gVisor) | — | — |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | E2B | — | — |
| realworld | Better-Auth: git clone | Novita | — | — |
| realworld | Better-Auth: git clone | Daytona (VM) | — | — |
| realworld | Better-Auth: git clone | Modal (gVisor) | — | — |
| realworld | Better-Auth: git clone | Modal (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Novita | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (VM) | — | — |
| realworld | Better-Auth: lint (Biome) | E2B | — | — |
| realworld | Better-Auth: lint (Biome) | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Daytona (VM) | — | — |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | — | — |
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
| realworld | Better-Auth: lint spell | Daytona (VM) | — | — |
| realworld | Better-Auth: lint spell | Blaxel | — | — |
| realworld | Better-Auth: lint spell | Novita | — | — |
| realworld | Better-Auth: lint spell | Modal (VM) | — | — |
| realworld | Better-Auth: lint spell | E2B | — | — |
| realworld | Better-Auth: lint spell | Modal (gVisor) | — | — |
| realworld | Better-Auth: lint types | Daytona (VM) | — | — |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Novita | — | — |
| realworld | Better-Auth: lint types | Modal (VM) | — | — |
| realworld | Better-Auth: lint types | E2B | — | — |
| realworld | Better-Auth: lint types | Modal (gVisor) | — | — |
| realworld | Better-Auth: typecheck | Blaxel | — | — |
| realworld | Better-Auth: typecheck | Daytona (VM) | — | — |
| realworld | Better-Auth: typecheck | Novita | — | — |
| realworld | Better-Auth: typecheck | Modal (VM) | — | — |
| realworld | Better-Auth: typecheck | E2B | — | — |
| realworld | Better-Auth: typecheck | Modal (gVisor) | — | — |
| realworld | Mastra: build:core | Daytona (VM) | — | — |
| realworld | Mastra: build:core | Novita | — | — |
| realworld | Mastra: build:core | Modal (VM) | — | — |
| realworld | Mastra: build:core | Modal (gVisor) | — | — |
| realworld | Mastra: git clone | Daytona (VM) | — | — |
| realworld | Mastra: git clone | Modal (VM) | — | — |
| realworld | Mastra: git clone | Novita | — | — |
| realworld | Mastra: git clone | Modal (gVisor) | — | — |
| realworld | Mastra: lint:format | Daytona (VM) | — | — |
| realworld | Mastra: lint:format | Novita | — | — |
| realworld | Mastra: lint:format | Modal (VM) | — | — |
| realworld | Mastra: lint:format | Modal (gVisor) | — | — |
| realworld | OpenClaw: cold install | Blaxel | — | — |
| realworld | OpenClaw: cold install | Modal (VM) | — | — |
| realworld | OpenClaw: git clone | Blaxel | — | — |
| realworld | OpenClaw: git clone | Modal (VM) | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Blaxel | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Modal (VM) | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | Daytona (VM) | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal (gVisor) | — | — |
| economics | Hourly cost | Modal (VM) | — (equal values) | — |

</details>

