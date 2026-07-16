# Sandbox provider leaderboard

Run `29365910084` · commit `0343acb5c1cfd3a0aac81afc3262d4af0fa69bc7` · generated 2026-07-14T22:52:05.191Z

Same pinned target for every provider (**2 vCPU · 8 GiB RAM · 40 GB disk**). Each table ranks providers on that
dimension's headline metric (median of retained trials). Generated from the published Run
dataset — do not edit by hand. Methodology: [`docs/methodology.md`](docs/methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.

## cpu

Headline: **Node.js web tooling** (runs/s, higher is better)

_Daytona leads · ~1.1× Novita on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% CI | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 19.14 | 18.48 – 19.89 | 5 |
| 2 | Novita | 17.59 | 17.22 – 18.65 | 5 |
| 3 | E2B | 10.58 | 10.25 – 10.83 | 5 |
| 4 | Modal | 9.25 | 8.7 – 9.58 | 5 |

## disk

Headline: **fio rand read 4KB, O_DIRECT (IOPS)** (higher is better)

_Daytona leads · ~3.6× Novita on median (higher is better)._

| Rank | Provider | fio rand read 4KB, O_DIRECT (IOPS) | 95% CI | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 246000 | 241000 – 255000 | 5 |
| 2 | Novita | 68100 | 66600 – 71500 | 5 |
| 3 | E2B | 40800 | 39800 – 42000 | 5 |
| 4 | Modal | 34900 | 33600 – 35200 | 5 |

## memory

Headline: **STREAM Triad** (MB/s, higher is better)

_Daytona leads · ~1.3× Modal on median (higher is better)._

| Rank | Provider | STREAM Triad (MB/s) | 95% CI | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 71508 | 69090 – 78270 | 5 | — |
| 2 | Modal | 53700 | 45390 – 57730 | 5 | — |
| 2 | Novita | 53140 | 52970 – 53313 | 5 | tied |
| 4 | E2B | 23850 | 22450 – 25430 | 5 | — |

## network

Headline: **Loopback TCP (10GB)** (Seconds, lower is better)

_Daytona leads · E2B is ~1.6× higher (lower is better)._

| Rank | Provider | Loopback TCP (10GB) (Seconds) | 95% CI | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 4.898 | 4.682 – 5.402 | 5 |
| 2 | E2B | 7.764 | 7.373 – 8.467 | 5 |
| 3 | Novita | 11.32 | 10.03 – 11.45 | 5 |
| 4 | Modal | 52.14 | 51.04 – 55.37 | 5 |

## realworld

Headline: **Mastra: cold install** (Seconds, lower is better)

_Daytona and Novita share the top on this headline (lower is better)._

| Rank | Provider | Mastra: cold install (Seconds) | 95% CI | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Daytona | 31.68 | 31.27 – 33.71 | 5 | — |
| 1 | Novita | 33.12 | 32.84 – 33.84 | 5 | tied |

## economics

Headline: **Hourly cost** (USD/hr, lower is better)

_Daytona is cheapest · Novita is ~1.1× higher (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% CI | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 |
| 2 | Novita | 0.1627 | — | 1 |
| 3 | E2B | 0.2304 | — | 1 |
| 4 | Modal | 0.4774 | — | 1 |

## Not ranked

These providers produced measurements, but their results are **not included in any ranking**
because validation or target-spec comparability was not established.

| Provider | Reason | Detail |
| --- | --- | --- |
| Blaxel | **target spec mismatch** | Target: 2 vCPU / 8 GiB RAM / 40 GB disk; observed: 6 vCPU / 15.63 GiB RAM / 12.5 GB disk. |

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
pass drags a mean far more than it moves a median. The 95% CI is a percentile bootstrap of that
median (10,000 resamples, seeded from the Run id so the table is reproducible byte-for-byte), not
a normal-theory interval: these Samples are neither normal nor independent of the host's scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering — at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is
reported separately for distribution *shape* and does not drive the ranking.

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`tied` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only note that claims two providers are
statistically indistinguishable.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide CI or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

### Pairwise tests (vs. row above)

`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution
*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).

| Dimension | Provider | p vs. above | p (KS) |
| --- | --- | ---: | ---: |
| cpu | Daytona | — | — |
| cpu | Novita | 0.016 | 0.036 |
| cpu | E2B | 0.0079 | 0.0038 |
| cpu | Modal | 0.0079 | 0.0038 |
| disk | Daytona | — | — |
| disk | Novita | 0.0079 | 0.0038 |
| disk | E2B | 0.0079 | 0.0038 |
| disk | Modal | 0.0079 | 0.0038 |
| memory | Daytona | — | — |
| memory | Modal | 0.0079 | 0.0038 |
| memory | Novita | 0.69 (tied) | 0.21 |
| memory | E2B | 0.0079 | 0.0038 |
| network | Daytona | — | — |
| network | E2B | 0.0079 | 0.0038 |
| network | Novita | 0.0079 | 0.0038 |
| network | Modal | 0.0079 | 0.0038 |
| realworld | Daytona | — | — |
| realworld | Novita | 0.095 (tied) | 0.036 |
| economics | Daytona | — | — |
| economics | Novita | — | — |
| economics | E2B | — | — |
| economics | Modal | — | — |

</details>

