# Sandbox provider leaderboard

Run `29130741476` · commit `663be0904797890a24fdaf1cc6e3ea8d77b3b89c` · generated 2026-07-11T00:18:19.295Z

Each table ranks the providers on that dimension's headline metric. Generated from the published Run dataset — do not edit by hand.

## cpu

Headline: **Node.js web tooling** (runs/s, higher is better)

| Rank | Provider | Node.js web tooling (runs/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 19.72 | 19.63 – 19.96 | 3 | — | — |
| 1 | Modal | 9.59 | 9.52 – 9.79 | 3 | 0.081 (tied) | 0.033 |

## disk

Headline: **Hardlink throughput** (bogo ops/s, higher is better)

| Rank | Provider | Hardlink throughput (bogo ops/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 23.39 | 23.35 – 23.42 | 3 | — | — |
| 2 | Modal | 3.25 | 3.18 – 3.34 | 15 | 0.0090 | 0.0038 |

## memory

Headline: **STREAM Triad** (MB/s, higher is better)

| Rank | Provider | STREAM Triad (MB/s) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 54530 | 54030 – 54590 | 5 | — | — |
| 2 | Modal | 40510 | 38810 – 53440 | 5 | 0.012 | 0.0038 |

## economics

Headline: **Hourly cost** (USD/hr, lower is better)

| Rank | Provider | Hourly cost (USD/hr) | 95% CI | n | p vs. above | p (KS) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 | — | — |
| 2 | Modal | 0.4774 | — | 1 | — | — |

---

**Reading this table.** The value is the median (p50) of the retained per-trial Samples, not the
mean — a single stalled pass drags a mean far more than it moves a median. The 95% CI is a
percentile bootstrap of that median (10,000 resamples, seeded from the Run id so the table is
reproducible byte-for-byte), not a normal-theory interval: these Samples are neither normal nor
independent of the host's scheduling.

Rows are separated only when their full Sample distributions differ (Mann-Whitney U, two-sided, α = 0.05).
**Providers sharing a rank are statistically indistinguishable on this Metric** — a faster median
earned inside the noise is not a faster provider. Samples are repeated trials inside one sandbox,
so their spread is environmental (neighbours, host contention, virtualization), and a wide CI or a
large `n` (the harness re-runs a test that will not converge) is itself the signal that the
provider's performance is unstable, not that the measurement is imprecise.

`p (KS)` is a two-sample Kolmogorov-Smirnov test against the same row above. It does **not** drive
the ranking — it compares the two empirical distributions' *shapes* rather than their central
tendency. Read it where it disagrees with `p vs. above`: a tied rank (large Mann-Whitney p) beside a
small `p (KS)` means two providers with the same typical speed but different behaviour — usually one
of them alternating between fast and stalled passes. That bimodality is what environmental noise
looks like, and it is the reason a median alone cannot rank these providers.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

