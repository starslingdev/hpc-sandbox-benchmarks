# Sandbox provider leaderboard

Run `local-cpu-comparison-20260824` · commit `local-cpu-comparison` · generated 2026-08-24T14:01:58.859Z

Requested target for every provider: **4 vCPU · 8 GiB RAM · 40 GB disk**. This run contains **6 metric records**
backed by **93 retained trial observations**, across **2 metrics** and
**3 providers**; every emitted, catalogued metric has a ranked table below
(median of retained trials), grouped by dimension with its headline first.
Generated from the published Run dataset - do not edit by hand. Methodology:
[`docs/methodology.md`](../../methodology.md).

**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only
when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.
CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate
surfaced through coverage gaps, not part of the compute-match verdict.

## Providers in this run

Each provider's isolation technology - the **declared** technology is authoritative; **detected**
is a best-effort in-sandbox probe that cannot separate every isolation type (a container and a
microVM can both read `kvm`; gVisor and a microVM can both read `unknown`), shown only as a
cross-check.

| Provider | Isolation (declared) | Detected |
| --- | --- | --- |
| Ascii Box (Hetzner) | dedicated VM (Hetzner CX33) | vm |
| Ascii Box (bare metal) | bare metal | vm |
| Freestyle | VM | vm |

_Not present in this run: Blaxel, Daytona (container), Daytona (VM), E2B, Modal (gVisor), Modal (VM), Novita - registered providers that reported no data (not dispatched, or every cell was lost before reporting anything)._

## cpu

### Node.js web tooling _(headline)_

runs/s · higher is better

_Ascii Box (bare metal) leads · ~2.6× Freestyle on median (higher is better)._

| Rank | Provider | Node.js web tooling (runs/s) | 95% bootstrap interval | n |
| ---: | --- | ---: | ---: | ---: |
| 1 | Ascii Box (bare metal) | 25.3 | 22.63 – 28.63 | 9 |
| 2 | Freestyle | 9.64 | 9.27 – 10.11 | 54 |
| 3 | Ascii Box (Hetzner) | 6.2 | 6.07 – 8.84 | 27 |

## economics

### Hourly cost _(headline)_

USD/hr · lower is better

_Ascii Box (Hetzner) and Ascii Box (bare metal) share the top on this metric (lower is better)._

| Rank | Provider | Hourly cost (USD/hr) | 95% bootstrap interval | n | Note |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | Ascii Box (Hetzner) | 0.036 | - | 1 | - |
| 1 | Ascii Box (bare metal) | 0.036 | - | 1 | equal values |
| 3 | Freestyle | 0.2645 | - | 1 | - |

<details>
<summary>How rankings are decided</summary>

The value is the median (p50) of the retained per-trial Samples, not the mean - a single stalled
pass drags a mean far more than it moves a median. The 95% interval is a percentile bootstrap of
that median (10,000 resamples, seeded from the Run id so the table is reproducible byte-for-byte).
It is a descriptive interval conditional on the retained trials, **not a calibrated frequentist
confidence interval**: n is small and within-sandbox trials may be dependent on host scheduling.

Rows are separated only when Mann-Whitney U (two-sided, α = 0.05, enumerated exactly
over the permutation null rather than approximated) finds evidence of stochastic ordering - at these
sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is
reported separately for distribution *shape* and does not drive the ranking.

**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**
`equal medians` / `equal values` - arithmetic, not a finding: the ranking sorts on the value,
and two identical values have no order between them. It says nothing about the distributions.

Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host
contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not
converge) is itself the signal that the provider's performance is unstable, not that the measurement
is imprecise.

At the small `n` this suite produces, a non-significant result means *not enough evidence to
separate*, never *the providers are equal*.

### Pairwise tests (vs. row above)

`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution
*shape* - it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the
same typical speed with different behaviour (e.g. bimodal stalls).
These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate
correction is applied across providers or metrics.

| Dimension | Metric | Provider | p vs. above | p (KS) |
| --- | --- | --- | ---: | ---: |
| cpu | Node.js web tooling | Ascii Box (bare metal) | - | - |
| cpu | Node.js web tooling | Freestyle | <0.001 | <0.001 |
| cpu | Node.js web tooling | Ascii Box (Hetzner) | <0.001 | <0.001 |
| economics | Hourly cost | Ascii Box (Hetzner) | - | - |
| economics | Hourly cost | Ascii Box (bare metal) | - (equal values) | - |
| economics | Hourly cost | Freestyle | - | - |

</details>

