# Sandbox provider leaderboard

Run `29130741476` · commit `663be0904797890a24fdaf1cc6e3ea8d77b3b89c` · generated 2026-07-11T00:18:19.295Z

Each table ranks the providers on that dimension's headline metric. Generated from the published Run dataset — do not edit by hand.

## cpu

Headline: **Node.js web tooling** (runs/s, higher is better)

| Rank | Provider | Node.js web tooling (runs/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 19.72 | 19.63 – 19.96 | 3 | — | — |
| 2 | Modal | 9.59 | 9.52 – 9.79 | 3 | 0.10 (n too small) | 0.033 |

## memory

Headline: **STREAM Triad** (MB/s, higher is better)

| Rank | Provider | STREAM Triad (MB/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 54530 | 54030 – 54590 | 5 | — | — |
| 2 | Modal | 40510 | 38810 – 53440 | 5 | 0.0079 | 0.0038 |

## economics

Headline: **Hourly cost** (USD/hr, lower is better)

| Rank | Provider | Hourly cost (USD/hr) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 | — | — |
| 2 | Modal | 0.4774 | — | 1 | — | — |

## Coverage gaps

Benchmarks that produced **no result** on a provider. A gap is a missing result, not a comparable
one — read it as the provider **failing to cover** that workload, never as a tie or a zero.

| Provider | Benchmark | Outcome | Detail |
| --- | --- | --- | --- |
| Daytona | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 30 GiB |
| Daytona | realworld-openclaw | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 25 GiB |
| Blaxel | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| Blaxel | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| Blaxel | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| Blaxel | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| Blaxel | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Blaxel | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | cpu-node | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | disk | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | memory | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-better-auth | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| E2B | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | realworld-mastra | **missing** | No result and no marker — the suite never reported for this provider. |
| Modal | realworld-openclaw | **missing** | No result and no marker — the suite never reported for this provider. |

**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the
loud one: the provider could not supply the disk the suite needs, so the workload does not run on
its current allocation at all. That is a structural absence, not a slow result.

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

`n too small` is the extreme of that: Mann-Whitney's best attainable p already exceeds α for those
Samples, so the test could not have separated the rows at any effect size (here 3 v 3 floors at p ≈ 0.10).
Such rows are ranked on their observed medians and are **not** claimed to be tied — read the gap
between the values, and treat the p-value as unable to settle them either way. Where such a row
nevertheless shares the rank above it, the cell reads `equal medians`: the two values are simply
identical, which is the ranking having nothing to order them by — never a finding that the
providers are alike.

