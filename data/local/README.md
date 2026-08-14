# Local dataset

Where `bench-local --promote` publishes: one Run document per run id under `runs/`, plus a
newest-first `index.json` — the same two-part shape as [`../dataset/`](../dataset/), written by the
same `promoteRun` gate (≥1 validated provider).

## Why this is not `data/dataset/`

`data/dataset/` is the **cross-provider comparison**: every number in `LEADERBOARD.md` is drawn from
it, and only the `bench-matrix` workflow produces it — one pinned target spec, R replicate sandboxes
per `(provider, suite)` cell, every provider measured the same way on the same commit.

A local Run answers a different question. It measures **one machine**, against no provider, at
whatever spec that machine happens to have. Both are useful; mixing them would not be:

- The leaderboard reads `runs[0]` of an index as "the latest run". A laptop landing there would move
  the published comparison surface without a provider ever having been measured.
- `specMatched` is computed against the same pinned `TARGET_SPEC` (4 vCPU / 8 GiB / 40 GB), so a
  local Run on anything else is honestly `false` — a comparability warning, not a ranking.
- A local `providerId` is not in the provider registry, so it carries no economics and no isolation
  roster entry. Beside provider rows that do, the absence would read as a gap rather than as the
  correct answer for a machine with no vendor rate.

Separate roots keep both first-class and neither confusable for the other. Nothing in CI reads this
directory: `dataset-integrity` and `leaderboard-artifact-sync` both gate `data/dataset/` only.

## Working with it

```sh
# Measure this machine and publish here.
mise run bench-local --suites memory --promote

# Render one of these Runs (note the dataset path, so the header links resolve).
bun apps/cli/src/bin/leaderboard.ts data/local/runs/<runId>.json /tmp/local.md

# Compare two of your own runs — same tooling the CI lane uses.
bun apps/cli/src/bin/stability.ts data/local/runs/<older>.json data/local/runs/<newer>.json
```

Committing what lands here is a judgement call: these are measurements of a particular machine, so
they are meaningful to whoever owns it and to anyone reproducing on comparable hardware, and noise to
everyone else. The candidate directory `data/local/candidate/` is gitignored.
