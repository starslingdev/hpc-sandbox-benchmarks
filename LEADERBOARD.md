# Sandbox provider leaderboard

Run `29304925497` · commit `de957636ad1e7229069de8b6fc5dca52bb4d2ab3` · generated 2026-07-14T05:32:37.562Z

Each table ranks the providers on that dimension's headline metric. Generated from the published Run dataset — do not edit by hand.

## cpu

Headline: **Node.js web tooling** (runs/s, higher is better)

| Rank | Provider | Node.js web tooling (runs/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 19.27 | 18.61 – 19.53 | 3 | — | — |
| 2 | Novita | 14.13 | 13.34 – 14.42 | 15 | 0.0098 | 0.0085 |
| 3 | Blaxel | 13.29 | 13.21 – 13.44 | 12 | 0.0099 | <0.001 |
| 4 | Modal | 9.22 | 8.845 – 9.685 | 12 | <0.001 | <0.001 |

## memory

Headline: **STREAM Triad** (MB/s, higher is better)

| Rank | Provider | STREAM Triad (MB/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 100900 | 100200 – 101400 | 5 | — | — |
| 2 | Blaxel | 71260 | 70890 – 71902 | 5 | 0.0079 | 0.0038 |
| 3 | Novita | 51650 | 51620 – 51880 | 5 | 0.0079 | 0.0038 |
| 3 | Modal | 50410 | 43500 – 54490 | 5 | 0.55 (tied) | 0.21 |

## system

Headline: **PyBench** (Milliseconds, lower is better)

| Rank | Provider | PyBench (Milliseconds) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Blaxel | 840 | 835 – 842 | 3 | — | — |

## realworld

Headline: **Mastra: cold install** (Seconds, lower is better)

| Rank | Provider | Mastra: cold install (Seconds) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Novita | 39.48 | 39.22 – 39.74 | 2 | — | — |

## economics

Headline: **Hourly cost** (USD/hr, lower is better)

| Rank | Provider | Hourly cost (USD/hr) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 | — | — |
| 2 | Novita | 0.1627 | — | 1 | — | — |
| 3 | E2B | 0.2304 | — | 1 | — | — |
| 4 | Modal | 0.4774 | — | 1 | — | — |

## Coverage gaps

Benchmarks that produced **no result** on a provider. A gap is a missing result, not a comparable
one — read it as the provider **failing to cover** that workload, never as a tie or a zero.

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Blaxel | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 30 GiB |
| Blaxel | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 12.5 GiB free, suite needs 25 GiB |
| Daytona | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 30 GiB |
| Daytona | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 25 GiB |
| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 30 GiB |
| E2B | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 19.7 GiB free, suite needs 25 GiB |
| E2B | cpu-node | **failed** | Step "mise run benchmark:cpu:node" lost its sandbox: 12 consecutive detached polls failed (last: [unavailable] The sandbox was not found: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.) — the sandbox stopped responding, not a quiet long step |
| E2B | memory | **failed** | Step "mise run benchmark:memory:all" lost its sandbox: 12 consecutive detached polls failed (last: [unavailable] The sandbox was not found: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.) — the sandbox stopped responding, not a quiet long step |
| E2B | realworld-better-auth | **failed** | Step "mise run benchmark:realworld:pts:better-auth" lost its sandbox: 12 consecutive detached polls failed (last: [unavailable] The sandbox was not found: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.) — the sandbox stopped responding, not a quiet long step |
| E2B | system | **failed** | Step "mise run benchmark:system:all" lost its sandbox: 12 consecutive detached polls failed (last: [unavailable] The sandbox was not found: This error is likely due to sandbox timeout. You can modify the sandbox timeout by passing 'timeoutMs' when starting the sandbox or calling '.setTimeout' on the sandbox with the desired timeout.) — the sandbox stopped responding, not a quiet long step |
| Modal | realworld-mastra | **failed** | Step "mise run benchmark:realworld:pts:mastra" timed out after 5400s |
| Modal | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.
Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.

**missing** — nothing was reported at all: no result, and no marker explaining why. The suite ran
elsewhere in this run, so it was part of the comparison, and this provider is simply absent from
it — a dropped job, a lost artifact, or a sandbox that died before it could say anything. Treat it
as unmeasured, never as a pass: the provider has not been shown to run this workload.

---

**Reading this table.** The value is the median (p50) of the retained per-trial Samples, not the
mean — a single stalled pass drags a mean far more than it moves a median. The 95% CI is a
percentile bootstrap of that median (10,000 resamples, seeded from the Run id so the table is
reproducible byte-for-byte), not a normal-theory interval: these Samples are neither normal nor
independent of the host's scheduling.

Rows are separated only when their full Sample distributions differ (Mann-Whitney U, two-sided, α = 0.05,
enumerated exactly over the permutation null rather than approximated — at these sample sizes the
normal approximation can report a p the exact test cannot actually produce).

**A shared rank always says why, in the `p vs. above` cell, and the reasons are not interchangeable.**
`(tied)` — the test could have separated those providers and did not, so a faster median earned
inside the noise is not a faster provider. This is the only one that claims two providers are
statistically indistinguishable.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide CI or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

`p (KS)` is a two-sample Kolmogorov-Smirnov test against the same row above. It does **not** drive
the ranking — it compares the two empirical distributions' *shapes* rather than their central
tendency. Read it where it disagrees with `p vs. above`: a tied rank (large Mann-Whitney p) beside a
small `p (KS)` means two providers with the same typical speed but different behaviour — usually one
of them alternating between fast and stalled passes. That bimodality is what environmental noise
looks like, and it is the reason a median alone cannot rank these providers.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

