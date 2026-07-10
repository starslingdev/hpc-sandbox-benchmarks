# Sandbox provider leaderboard

Run `zen5-collected-1782365479` · commit `zen5-ssh` · generated 2026-06-25T05:31:48.987Z

Each table ranks the providers on that dimension's headline metric. Generated from the published Run dataset — do not edit by hand.

## cpu

Headline: **Node.js web tooling** (runs/s, higher is better)

| Rank | Provider | Node.js web tooling (runs/s) | 95% CI | n | p vs. above |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Daytona | 22.77 | 22.66 – 23 | 3 | — |

## economics

Headline: **Hourly cost** (USD/hr, lower is better)

| Rank | Provider | Hourly cost (USD/hr) | 95% CI | n | p vs. above |
| ---: | --- | ---: | ---: | ---: | ---: |
| 1 | Daytona | 0.1494 | — | 1 | — |

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

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

