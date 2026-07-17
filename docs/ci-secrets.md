# CI & secrets

Provider credentials and release mutations live only in the GitHub Environment **`privileged`**.
Repository-level copies of those secrets must not exist: that is how we keep them unavailable to
PR workflows, forks, and any job that forgot to declare the environment.

`tooling/repo-checks` enforces the workflow side of this posture (see `workflow-hardening.ts`):
custom secrets and `contents: write` / `packages: write` jobs must set `environment: privileged`,
and toolchain publish must not trigger on `push`.

## What is gated

| Workflow | Job | Why |
| --- | --- | --- |
| `toolchain-image.yml` | `publish` | Provider bake secrets + `packages: write` (GHCR release) |
| `bench-suite.yml` | `bench` | Provider API keys (reusable fan-out `bench-matrix.yml`'s per-suite jobs call) |
| `publish-dataset.yml` | `publish` | Dataset + leaderboard publish (`contents: write` + `pull-requests: write`) |
| `bench-smoke.yml` | `smoke` | Provider API keys |

Two of these are reusable workflows whose `privileged` gate lives on their own job, because a `uses:`
caller can't declare `environment:` (the workflow-hardening drift gate checks the callee and passes the
local caller):

- `bench-suite.yml` runs one suite across a provider matrix; `bench-matrix.yml`'s named per-suite jobs
  each call it with `secrets: inherit` — required because the provider API keys are Environment secrets
  on `privileged` (no repository copy), so only a job that declares that environment can resolve them,
  and the `uses:` caller can't.
- `publish-dataset.yml` runs the dataset publish: `bench-matrix.yml`'s `publish` job calls it at the end
  of a matrix run, and a maintainer can dispatch it standalone to backfill (see rule 6).

Ungated: `ci.yml`, `ci-lint.yml`, and the toolchain `pr-gate` (Docker smoke, no secrets).

## Release rules (public-safe)

1. **No publish on merge.** Toolchain GHCR promote is `workflow_dispatch` only (never `push`).
2. **Main only, this repo only.** Privileged jobs require
   `github.ref == 'refs/heads/main'` and
   `github.repository == 'starslingdev/hpc-sandbox-benchmarks'`. The benchmark matrix additionally
   permits an explicitly opted-in non-main dispatch for pre-merge validation; those cells still
   require `privileged` approval, and dataset publishing remains main-only.
3. **Environment approval.** `privileged` must require at least one reviewer and restrict
   deployments to the `main` branch. Write access alone cannot finish a release.
4. **Fork PRs.** Same-repo guard on self-hosted PR jobs; fork PR code never runs on
   `starsling-ubuntu-24.04-2`. Forks never receive Environment secrets on `pull_request`.
5. **Dataset lands via PR, lint-gated.** `main` is protected by a "changes must be made through a
   pull request" ruleset, so `publish-dataset.yml`'s `publish` job cannot push the promoted dataset
   straight to `main` (a direct push is rejected with `GH013`). It opens a `dataset/publish-<run-id>`
   PR instead (hence `pull-requests: write`) and arms GitHub-native auto-merge (`gh pr merge --auto`),
   which merges only once branch protection is satisfied — required status checks green and any
   required reviews in. It never bypasses those rules. As a fast pre-flight, the job first runs the
   Biome gate on the generated dataset + leaderboard (`biome check data/dataset LEADERBOARD.md`, the
   same rules ci.yml runs) — Biome formats JSON, so an unformatted Run document would fail the PR — and
   aborts before opening a doomed PR on a miss. The push/PR step is idempotent: a re-run reuses the
   existing open PR instead of colliding on the deterministic branch.

   > **`GITHUB_TOKEN` caveat.** A PR opened with the default `GITHUB_TOKEN` does **not** trigger
   > `ci.yml` (GitHub suppresses workflow events raised by the Actions token). So if the Biome/CI check
   > is a *required* status, auto-merge waits for a check that never runs, and a maintainer completes
   > the merge (their merge to `main` runs `ci.yml` normally); the in-job pre-flight guarantees the
   > content is already clean. For fully hands-off auto-merge, open the PR with a GitHub App
   > installation token or PAT instead of `GITHUB_TOKEN` so the PR's own checks run.
6. **Backfilling a failed publish.** The publish logic is the reusable `publish-dataset.yml`, so when
   a matrix run's publish fails (or was never reached) a maintainer can re-run it standalone:
   **Actions → Publish dataset → Run workflow**, passing the original run's id. It re-downloads that
   run's `bench-*` shard artifacts by run-id (needs `actions: read`), re-aggregates, and opens the
   same lint-gated dataset PR — no re-benching. This only works while that run's shard artifacts are
   still within the repo's artifact-retention window. Dispatch is still gated by Environment
   `privileged` (main-only, required reviewer), so it is effectively maintainer-only.

> **Two approval gates per bench-matrix run.** The per-suite fan-out jobs (each calling
> `bench-suite.yml`) and the `publish` job all carry `environment: privileged` and run sequentially.
> The suite jobs all become pending together the moment `plan` finishes, so they surface as one batch
> in "Review pending deployments" and a single approval of the `privileged` environment releases the
> whole matrix; `publish` becomes pending only after the long matrix (~150 min), raising a **second**
> gate before the dataset is committed. A reviewer who approves only the matrix and walks away leaves
> the run parked at `publish` until the second approval lands or the protection rule times out.

## Operator setup (before flipping the repo public)

Do this in the GitHub UI (Settings → Environments), then delete any matching **repository** secrets.

1. Create Environment **`privileged`**.
2. **Required reviewers:** at least one maintainer (two preferred).
3. **Deployment branches:** `Selected branches` → `main` only.
4. Add these **environment** secrets (then delete repository-level copies if present):

   | Secret | Used by |
   | --- | --- |
   | `E2B_API_KEY` | toolchain bake, bench matrix/smoke |
   | `DAYTONA_API_KEY` | toolchain bake, bench matrix/smoke |
   | `DAYTONA_TARGET` | optional; workflows default to `us-west-2` |
   | `MODAL_TOKEN_ID` | toolchain bake, bench matrix/smoke |
   | `MODAL_TOKEN_SECRET` | toolchain bake, bench matrix/smoke |
   | `NOVITA_API_KEY` | optional for toolchain; bench matrix/smoke |
   | `BL_API_KEY` | bench matrix/smoke only |
   | `BL_WORKSPACE` | bench matrix/smoke only |

5. Confirm the GHCR package `sandbox-benchmarks-toolchain` is **public** so providers can pull
   the candidate base anonymously (Org → Packages → package settings).

Optional bootstrap (creates the empty environment; reviewers/secrets still need a human):

```sh
./scripts/setup-privileged-environment.sh
```

## Local credentials

Copy [`.env.example`](../.env.example) to a gitignored `.env` and fill in the providers you have
(Bun auto-loads `.env` when you run a bin). A missing credential is a skip, not a failure. Never
commit them; never paste them into issues or pull requests. See [SECURITY.md](../SECURITY.md).

The `tooling/repo-checks` secret-hygiene gate enforces this: it fails CI if any tracked file is a
credential file (`.env`, `*.pem`, `id_rsa`, …) or contains a high-signal secret token.
