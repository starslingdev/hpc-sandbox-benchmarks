# Sandbox provider leaderboard

Run `29365910084` · commit `0343acb5c1cfd3a0aac81afc3262d4af0fa69bc7` · generated 2026-07-14T22:52:05.191Z

Requested target for every provider: **2 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **146 metric records**
backed by **702 retained trial observations**, across **35 metrics** and
**5 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset — do not edit by hand. Methodology:
[`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% bootstrap interval around that median · ranks split only
when distributions differ (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

> **Comparability warning:** Blaxel's observed compute did not match the requested CPU/RAM target; its observed allocation was **6 vCPU · 15.63 GiB RAM · 12.5 GB disk**. Its measured ranks are not like-for-like with compute-matched providers.

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Daytona leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 19.14 | 18.48 – 19.89 | 5 |
| 2 | Novita | 17.59 | 17.22 – 18.65 | 5 |
| 3 | Blaxel | 14.01 | 13.64 – 14.25 | 5 |
| 4 | E2B | 10.58 | 10.25 – 10.83 | 5 |
| 5 | Modal | 9.25 | 8.7 – 9.58 | 5 |

## disk

### fio rand read 4KB, O_DIRECT (IOPS) _(headline)_

IOPS · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 556000 | 549000 – 580000 | 5 |
| 2 | Daytona | 246000 | 241000 – 255000 | 5 |
| 3 | Novita | 68100 | 66600 – 71500 | 5 |
| 4 | E2B | 40800 | 39800 – 42000 | 5 |
| 5 | Modal | 34900 | 33600 – 35200 | 5 |

### fio rand read 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2173 | 2144 – 2264 | 5 |
| 2 | Daytona | 960 | 941 – 996 | 5 |
| 3 | Novita | 266 | 260 – 279 | 5 |
| 4 | E2B | 159 | 155 – 164 | 5 |
| 5 | Modal | 136 | 131 – 138 | 5 |

### fio rand write 4KB, O_DIRECT (IOPS)

IOPS · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 492000 | 471000 – 500000 | 5 |
| 2 | Daytona | 218000 | 213000 – 236000 | 5 |
| 3 | Novita | 69400 | 67200 – 75500 | 5 |
| 4 | E2B | 41800 | 40200 – 43300 | 5 |
| 5 | Modal | 29500 | 29200 – 30000 | 5 |

### fio rand write 4KB, O_DIRECT (MB/s)

MB/s · higher is better

_Blaxel leads · ~2.3× Daytona on median (higher is better)._

| Rank | Provider | fio rand write 4KB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 1923 | 1842 – 1955 | 5 |
| 2 | Daytona | 850 | 833 – 923 | 5 |
| 3 | Novita | 271 | 263 – 295 | 5 |
| 4 | E2B | 163 | 157 – 169 | 5 |
| 5 | Modal | 115 | 114 – 117 | 5 |

### fio seq read 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Modal, Novita and Daytona share the top on this metric (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Modal | 12300 | 9000 – 13100 | 5 | — |
| 1 | Novita | 11000 | 9742 – 12300 | 5 | tied |
| 1 | Daytona | 10800 | 5160 – 15400 | 5 | tied |
| 4 | Blaxel | 4535 | 4336 – 4815 | 5 | — |
| 5 | E2B | 600 | 599 – 600 | 5 | — |

### fio seq read 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.1× Modal on median (higher is better)._

| Rank | Provider | fio seq read 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 9744 | — | 1 |
| 2 | Modal | 9001 | — | 1 |
| 3 | Daytona | 5161 | — | 1 |
| 4 | Blaxel | 4536 | 4338 – 4816 | 5 |
| 5 | E2B | 601 | 601 – 601 | 5 |

### fio seq write 1MB, O_DIRECT (IOPS)

IOPS · higher is better

_Novita leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (IOPS) (IOPS) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6435 | 6005 – 6854 | 5 | — |
| 2 | Daytona | 5188 | 3227 – 5992 | 5 | — |
| 2 | Blaxel | 3630 | 3486 – 3780 | 5 | tied |
| 4 | Modal | 2537 | 2230 – 2930 | 5 | — |
| 5 | E2B | 599 | 599 – 600 | 5 | — |

### fio seq write 1MB, O_DIRECT (MB/s)

MB/s · higher is better

_Novita leads · ~1.2× Daytona on median (higher is better)._

| Rank | Provider | fio seq write 1MB, O_DIRECT (MB/s) (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Novita | 6437 | 6006 – 6855 | 5 | — |
| 2 | Daytona | 5189 | 3228 – 5993 | 5 | — |
| 2 | Blaxel | 3632 | 3487 – 3782 | 5 | tied |
| 4 | Modal | 2538 | 2232 – 2932 | 5 | — |
| 5 | E2B | 601 | 601 – 602 | 5 | — |

### Hardlink throughput

bogo ops/s · higher is better

_Daytona leads · ~1.3× Novita on median (higher is better)._

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 23.42 | 23.29 – 23.66 | 5 |
| 2 | Novita | 18.49 | 18.35 – 18.75 | 5 |
| 3 | Blaxel | 11.53 | 11.49 – 12.07 | 5 |
| 4 | Modal | 3.22 | 3.09 – 3.28 | 5 |
| 5 | E2B | 1.5 | 1.46 – 1.5 | 5 |

## memory

### STREAM Triad _(headline)_

MB/s · higher is better

_Daytona and Blaxel share the top on this metric (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 71508 | 69090 – 78270 | 5 | — |
| 1 | Blaxel | 70090 | 66760 – 79980 | 5 | tied |
| 3 | Modal | 53700 | 45390 – 57730 | 5 | — |
| 3 | Novita | 53140 | 52970 – 53313 | 5 | tied |
| 5 | E2B | 23850 | 22450 – 25430 | 5 | — |

### STREAM Add

MB/s · higher is better

_Daytona and Blaxel share the top on this metric (higher is better)._

| Rank | Provider | STREAM Add (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 73370 | 68930 – 78380 | 5 | — |
| 1 | Blaxel | 70610 | 66050 – 79130 | 5 | tied |
| 3 | Novita | 53070 | 52840 – 53350 | 5 | — |
| 3 | Modal | 52420 | 43647 – 53400 | 5 | tied |
| 5 | E2B | 23460 | 22180 – 25530 | 5 | — |

### STREAM Copy

MB/s · higher is better

_Blaxel leads · ~1.3× Daytona on median (higher is better)._

| Rank | Provider | STREAM Copy (MB/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 110100 | 107500 – 124600 | 5 |
| 2 | Daytona | 81820 | 79960 – 87430 | 5 |
| 3 | Modal | 75810 | 65240 – 79250 | 5 |
| 4 | Novita | 56950 | 56640 – 57050 | 5 |
| 5 | E2B | 48480 | 43450 – 50283 | 5 |

### STREAM Scale

MB/s · higher is better

_Daytona and Blaxel share the top on this metric (higher is better)._

| Rank | Provider | STREAM Scale (MB/s) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 69760 | 63140 – 73820 | 5 | — |
| 1 | Blaxel | 60580 | 58210 – 72340 | 5 | tied |
| 3 | Novita | 50510 | 50390 – 50560 | 5 | — |
| 3 | Modal | 46810 | 35800 – 51220 | 5 | tied |
| 5 | E2B | 21740 | 21120 – 23930 | 5 | — |

## network

### Loopback TCP (10GB) _(headline)_

Seconds · lower is better

_Daytona leads · ~1.5× lower than Blaxel (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 4.898 | 4.682 – 5.402 | 5 | — |
| 2 | Blaxel | 7.252 | 6.38 – 7.791 | 5 | — |
| 2 | E2B | 7.764 | 7.373 – 8.467 | 5 | tied |
| 4 | Novita | 11.32 | 10.03 – 11.45 | 5 | — |
| 5 | Modal | 52.14 | 51.04 – 55.37 | 5 | — |

## system

### PyBench _(headline)_

Milliseconds · lower is better

_Blaxel is the only ranked provider (841 Milliseconds; lower is better)._

| Rank | Provider | PyBench (Milliseconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 841 | 838 – 855 | 5 |

### SQLite Speedtest

Seconds · lower is better

_Daytona leads · ~1.2× lower than Novita (lower is better)._

| Rank | Provider | SQLite Speedtest (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 34.02 | 33.71 – 34.27 | 5 |
| 2 | Novita | 41.26 | 41.01 – 41.75 | 5 |
| 3 | Blaxel | 67.77 | 66.05 – 69.22 | 5 |
| 4 | E2B | 71.99 | 71.59 – 73.35 | 5 |
| 5 | Modal | 516.3 | 510 – 539.9 | 5 |

## realworld

### Mastra: cold install _(headline)_

Seconds · lower is better

_Daytona and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 31.68 | 31.27 – 33.71 | 5 | — |
| 1 | Novita | 33.12 | 32.84 – 33.84 | 5 | tied |

### Better-Auth: build

Seconds · lower is better

_Blaxel leads · ~1.3× lower than Daytona (lower is better)._

| Rank | Provider | Better-Auth: build (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 9.993 | 9.834 – 10.4 | 5 |
| 2 | Daytona | 12.68 | 12.47 – 12.75 | 5 |
| 3 | Novita | 14.27 | 14.21 – 14.71 | 5 |
| 4 | E2B | 22.24 | 22.15 – 22.99 | 5 |
| 5 | Modal | 39.61 | 37.55 – 40.28 | 5 |

### Better-Auth: cold install

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Better-Auth: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 10.43 | 10.31 – 11.03 | 5 |
| 2 | Novita | 11.42 | 11.34 – 11.62 | 5 |
| 3 | Blaxel | 16.11 | 15.64 – 16.21 | 5 |
| 4 | E2B | 20.08 | 19.88 – 20.28 | 5 |
| 5 | Modal | 30.84 | 30.2 – 34.26 | 5 |

### Better-Auth: git clone

Seconds · lower is better

_Blaxel, Daytona and E2B share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Blaxel | 1.614 | 1.469 – 1.989 | 5 | — |
| 1 | Daytona | 1.653 | 1.331 – 1.937 | 5 | tied |
| 1 | E2B | 1.723 | 1.642 – 1.861 | 5 | tied |
| 4 | Novita | 2.297 | 1.748 – 318.2 | 5 | — |
| 4 | Modal | 5.609 | 2.559 – 6.714 | 5 | tied |

### Better-Auth: lint (Biome)

Seconds · lower is better

_Blaxel leads · ~1.4× lower than Daytona (lower is better)._

| Rank | Provider | Better-Auth: lint (Biome) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 3.402 | 3.311 – 3.479 | 5 |
| 2 | Daytona | 4.881 | 4.851 – 4.904 | 5 |
| 3 | Novita | 5.301 | 5.28 – 5.429 | 5 |
| 4 | E2B | 8.622 | 8.489 – 8.657 | 5 |
| 5 | Modal | 16.36 | 15.72 – 16.66 | 5 |

### Better-Auth: lint deps (Knip)

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Better-Auth: lint deps (Knip) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 10.92 | 10.73 – 11.04 | 5 |
| 2 | Novita | 11.49 | 11.39 – 11.74 | 5 |
| 3 | Blaxel | 15.41 | 14.74 – 15.55 | 5 |
| 4 | E2B | 19.72 | 19.57 – 20.09 | 5 |
| 5 | Modal | 28.71 | 26.79 – 29.23 | 5 |

### Better-Auth: lint format

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Better-Auth: lint format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 2.785 | 2.7 – 2.901 | 5 |
| 2 | Novita | 3.008 | 2.904 – 3.026 | 5 |
| 3 | Blaxel | 4.42 | 4.287 – 4.463 | 5 |
| 4 | E2B | 5.392 | 5.272 – 5.469 | 5 |
| 5 | Modal | 6.129 | 6.071 – 6.6 | 5 |

### Better-Auth: lint packages

Seconds · lower is better

_Blaxel leads · ~1.5× lower than Daytona (lower is better)._

| Rank | Provider | Better-Auth: lint packages (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 2.794 | 2.697 – 2.859 | 5 |
| 2 | Daytona | 4.061 | 4.006 – 4.062 | 5 |
| 3 | Novita | 4.555 | 4.477 – 4.642 | 5 |
| 4 | E2B | 7.39 | 7.347 – 7.483 | 5 |
| 5 | Modal | 14.83 | 14.35 – 15.09 | 5 |

### Better-Auth: lint spell

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Better-Auth: lint spell (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 6.738 | 6.693 – 6.827 | 5 |
| 2 | Novita | 7.492 | 7.454 – 7.583 | 5 |
| 3 | Blaxel | 10.85 | 10.63 – 11.12 | 5 |
| 4 | E2B | 13.48 | 13.08 – 14.04 | 5 |
| 5 | Modal | 14.13 | 13.87 – 14.68 | 5 |

### Better-Auth: lint types

Seconds · lower is better

_Blaxel leads · ~1.7× lower than Daytona (lower is better)._

| Rank | Provider | Better-Auth: lint types (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Blaxel | 30.17 | 29.43 – 31.45 | 5 |
| 2 | Daytona | 50.34 | 49.89 – 51.16 | 5 |
| 3 | Novita | 58.52 | 57.86 – 59.01 | 5 |
| 4 | E2B | 103.4 | 101.3 – 107.6 | 5 |
| 5 | Modal | 166 | 162.4 – 170.1 | 5 |

### Better-Auth: typecheck

Seconds · lower is better

_Daytona and Novita share the top on this metric (lower is better)._

| Rank | Provider | Better-Auth: typecheck (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 1.43 | 1.413 – 1.47 | 5 | — |
| 1 | Novita | 1.447 | 1.407 – 1.461 | 5 | tied |
| 3 | Blaxel | 1.72 | 1.673 – 1.778 | 5 | — |
| 4 | E2B | 2.359 | 2.276 – 2.416 | 5 | — |
| 5 | Modal | 3.093 | 2.968 – 3.316 | 5 | — |

### Mastra: build:core

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Mastra: build:core (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 88.35 | 87.2 – 88.81 | 5 |
| 2 | Novita | 94.01 | 93.5 – 94.85 | 5 |

### Mastra: git clone

Seconds · lower is better

_Daytona and Novita share the top on this metric (lower is better)._

| Rank | Provider | Mastra: git clone (Seconds) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 6.36 | 2.617 – 6.993 | 5 | — |
| 1 | Novita | 6.844 | 3.157 – 7.166 | 5 | tied |

### Mastra: lint:format

Seconds · lower is better

_Daytona leads · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Mastra: lint:format (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 92.22 | 91.09 – 93.24 | 5 |
| 2 | Novita | 97.96 | 96.87 – 99.5 | 5 |

### OpenClaw: cold install

Seconds · lower is better

_Novita is the only ranked provider (7.025 Seconds; lower is better)._

| Rank | Provider | OpenClaw: cold install (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 7.025 | 6.871 – 7.463 | 5 |

### OpenClaw: git clone

Seconds · lower is better

_Novita is the only ranked provider (9.353 Seconds; lower is better)._

| Rank | Provider | OpenClaw: git clone (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 9.353 | 4.083 – 11.68 | 5 |

### OpenClaw: typecheck (tsgo)

Seconds · lower is better

_Novita is the only ranked provider (49.13 Seconds; lower is better)._

| Rank | Provider | OpenClaw: typecheck (tsgo) (Seconds) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Novita | 49.13 | 47.39 – 50.68 | 5 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Daytona is cheapest · ~1.1× lower than Novita (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 |
| 2 | Novita | 0.1627 | — | 1 |
| 3 | E2B | 0.2304 | — | 1 |
| 4 | Modal | 0.4774 | — | 1 |

## Coverage gaps

12 uncovered results across 5 providers (Blaxel 3, Daytona 2, E2B 3, Modal 3, Novita 1). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.

<details>
<summary>Full coverage table</summary>

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 30 GiB |
| Blaxel | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 25 GiB |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 25 GiB |
| Blaxel | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Daytona | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Daytona | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" lost its sandbox: 12 consecutive detached polls failed (last: done-file fs exists) — the sandbox stopped responding, not a quiet long step |
| E2B | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |
| Modal | realworld-mastra | **failed** | Step "mise run benchmark:realworld:pts:mastra" timed out after 8400s |
| Modal | realworld-openclaw | **failed** | Step "mise run benchmark:realworld:pts:openclaw" timed out after 8400s |
| Novita | cpu-generic | **failed** | Step "mise run benchmark:cpu:generic" timed out after 7800s |

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
over the permutation null rather than approximated) finds a shift in central tendency — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is
reported separately for distribution *shape* and does not drive the ranking.

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`tied` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only note that claims two providers are
statistically indistinguishable.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

### Pairwise tests (vs. row above)

`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution
*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).
These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate
correction is applied across providers or metrics.

| Dimension | Metric | Provider | p vs. above | p (KS) |
| --- | --- | --- | ---: | ---: |
| cpu | Node.js web tooling | Daytona | — | — |
| cpu | Node.js web tooling | Novita | 0.016 | 0.036 |
| cpu | Node.js web tooling | Blaxel | 0.0079 | 0.0038 |
| cpu | Node.js web tooling | E2B | 0.0079 | 0.0038 |
| cpu | Node.js web tooling | Modal | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Daytona | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Novita | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | E2B | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (IOPS) | Modal | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Daytona | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Novita | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | E2B | 0.0079 | 0.0038 |
| disk | fio rand read 4KB, O_DIRECT (MB/s) | Modal | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Daytona | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Novita | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | E2B | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (IOPS) | Modal | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Daytona | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Novita | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | E2B | 0.0079 | 0.0038 |
| disk | fio rand write 4KB, O_DIRECT (MB/s) | Modal | 0.0079 | 0.0038 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Modal | — | — |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Novita | 0.38 (tied) | 0.70 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Daytona | 0.89 (tied) | 0.70 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | Blaxel | 0.0079 | 0.0038 |
| disk | fio seq read 1MB, O_DIRECT (IOPS) | E2B | 0.0079 | 0.0038 |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Modal | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Daytona | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | Blaxel | — | — |
| disk | fio seq read 1MB, O_DIRECT (MB/s) | E2B | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Daytona | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Blaxel | 0.42 (tied) | 0.21 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | Modal | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (IOPS) | E2B | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Novita | — | — |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Daytona | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Blaxel | 0.42 (tied) | 0.21 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | Modal | 0.0079 | 0.0038 |
| disk | fio seq write 1MB, O_DIRECT (MB/s) | E2B | 0.0079 | 0.0038 |
| disk | Hardlink throughput | Daytona | — | — |
| disk | Hardlink throughput | Novita | 0.0079 | 0.0038 |
| disk | Hardlink throughput | Blaxel | 0.0079 | 0.0038 |
| disk | Hardlink throughput | Modal | 0.0079 | 0.0038 |
| disk | Hardlink throughput | E2B | 0.0079 | 0.0038 |
| memory | STREAM Triad | Daytona | — | — |
| memory | STREAM Triad | Blaxel | 0.55 (tied) | 0.70 |
| memory | STREAM Triad | Modal | 0.0079 | 0.0038 |
| memory | STREAM Triad | Novita | 0.69 (tied) | 0.21 |
| memory | STREAM Triad | E2B | 0.0079 | 0.0038 |
| memory | STREAM Add | Daytona | — | — |
| memory | STREAM Add | Blaxel | 0.69 (tied) | 0.70 |
| memory | STREAM Add | Novita | 0.0079 | 0.0038 |
| memory | STREAM Add | Modal | 0.15 (tied) | 0.036 |
| memory | STREAM Add | E2B | 0.0079 | 0.0038 |
| memory | STREAM Copy | Blaxel | — | — |
| memory | STREAM Copy | Daytona | 0.0079 | 0.0038 |
| memory | STREAM Copy | Modal | 0.0079 | 0.0038 |
| memory | STREAM Copy | Novita | 0.0079 | 0.0038 |
| memory | STREAM Copy | E2B | 0.0079 | 0.0038 |
| memory | STREAM Scale | Daytona | — | — |
| memory | STREAM Scale | Blaxel | 0.056 (tied) | 0.036 |
| memory | STREAM Scale | Novita | 0.0079 | 0.0038 |
| memory | STREAM Scale | Modal | 0.15 (tied) | 0.036 |
| memory | STREAM Scale | E2B | 0.0079 | 0.0038 |
| network | Loopback TCP (10GB) | Daytona | — | — |
| network | Loopback TCP (10GB) | Blaxel | 0.0079 | 0.0038 |
| network | Loopback TCP (10GB) | E2B | 0.095 (tied) | 0.21 |
| network | Loopback TCP (10GB) | Novita | 0.0079 | 0.0038 |
| network | Loopback TCP (10GB) | Modal | 0.0079 | 0.0038 |
| system | PyBench | Blaxel | — | — |
| system | SQLite Speedtest | Daytona | — | — |
| system | SQLite Speedtest | Novita | 0.0079 | 0.0038 |
| system | SQLite Speedtest | Blaxel | 0.0079 | 0.0038 |
| system | SQLite Speedtest | E2B | 0.0079 | 0.0038 |
| system | SQLite Speedtest | Modal | 0.0079 | 0.0038 |
| realworld | Mastra: cold install | Daytona | — | — |
| realworld | Mastra: cold install | Novita | 0.095 (tied) | 0.036 |
| realworld | Better-Auth: build | Blaxel | — | — |
| realworld | Better-Auth: build | Daytona | 0.0079 | 0.0038 |
| realworld | Better-Auth: build | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: build | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: build | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: cold install | Daytona | — | — |
| realworld | Better-Auth: cold install | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: cold install | Blaxel | 0.0079 | 0.0038 |
| realworld | Better-Auth: cold install | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: cold install | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: git clone | Blaxel | — | — |
| realworld | Better-Auth: git clone | Daytona | 1.0 (tied) | 0.70 |
| realworld | Better-Auth: git clone | E2B | 0.69 (tied) | 0.70 |
| realworld | Better-Auth: git clone | Novita | 0.032 | 0.036 |
| realworld | Better-Auth: git clone | Modal | 0.69 (tied) | 0.21 |
| realworld | Better-Auth: lint (Biome) | Blaxel | — | — |
| realworld | Better-Auth: lint (Biome) | Daytona | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint (Biome) | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint (Biome) | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint (Biome) | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint deps (Knip) | Daytona | — | — |
| realworld | Better-Auth: lint deps (Knip) | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint deps (Knip) | Blaxel | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint deps (Knip) | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint deps (Knip) | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint format | Daytona | — | — |
| realworld | Better-Auth: lint format | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint format | Blaxel | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint format | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint format | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint packages | Blaxel | — | — |
| realworld | Better-Auth: lint packages | Daytona | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint packages | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint packages | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint packages | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint spell | Daytona | — | — |
| realworld | Better-Auth: lint spell | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint spell | Blaxel | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint spell | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint spell | Modal | 0.032 | 0.036 |
| realworld | Better-Auth: lint types | Blaxel | — | — |
| realworld | Better-Auth: lint types | Daytona | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint types | Novita | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint types | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: lint types | Modal | 0.0079 | 0.0038 |
| realworld | Better-Auth: typecheck | Daytona | — | — |
| realworld | Better-Auth: typecheck | Novita | 0.55 (tied) | 0.21 |
| realworld | Better-Auth: typecheck | Blaxel | 0.0079 | 0.0038 |
| realworld | Better-Auth: typecheck | E2B | 0.0079 | 0.0038 |
| realworld | Better-Auth: typecheck | Modal | 0.0079 | 0.0038 |
| realworld | Mastra: build:core | Daytona | — | — |
| realworld | Mastra: build:core | Novita | 0.0079 | 0.0038 |
| realworld | Mastra: git clone | Daytona | — | — |
| realworld | Mastra: git clone | Novita | 0.22 (tied) | 0.21 |
| realworld | Mastra: lint:format | Daytona | — | — |
| realworld | Mastra: lint:format | Novita | 0.0079 | 0.0038 |
| realworld | OpenClaw: cold install | Novita | — | — |
| realworld | OpenClaw: git clone | Novita | — | — |
| realworld | OpenClaw: typecheck (tsgo) | Novita | — | — |
| economics | Hourly cost | Daytona | — | — |
| economics | Hourly cost | Novita | — | — |
| economics | Hourly cost | E2B | — | — |
| economics | Hourly cost | Modal | — | — |

</details>

