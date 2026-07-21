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
| `bench-suite.yml` | `bench` | Provider API keys (reusable fan-out `bench-matrix.yml`'s suite-matrix job calls) |
| `commit-dataset.yml` | `commit` | Dataset JSON commit (`contents: write` + `pull-requests: write`) |
| `update-leaderboard.yml` | `leaderboard` | Public `LEADERBOARD.md` commit (`contents: write` + `pull-requests: write`) |
| `bench-smoke.yml` | `smoke` | Provider API keys |

Two of these are reusable workflows whose `privileged` gate lives on their own job, because a `uses:`
caller can't declare `environment:` (the workflow-hardening drift gate checks the callee and passes the
local caller):

- `bench-suite.yml` runs one suite across a provider matrix; `bench-matrix.yml`'s suite-matrix job
  calls it once per suite. Environment secrets on `privileged` resolve from the reusable job's own
  `environment:` declaration (a `uses:` caller can't set `environment:`). The caller still passes
  `secrets: inherit` for repository-level secrets / token context.
- `commit-dataset.yml` commits the machine-readable dataset: `bench-matrix.yml`'s `publish` job calls it
  at the end of a matrix run, and a maintainer can dispatch it standalone to backfill (see rule 6). It
  lands `data/dataset/` only — the public `LEADERBOARD.md` is regenerated separately (see rule 7), so the
  dataset can accumulate a run per matrix run without moving the published comparison surface.
- `update-leaderboard.yml` regenerates `LEADERBOARD.md` from a committed dataset run. It is
  maintainer-dispatched (never called by the matrix), so the published table only moves on a deliberate
  action — see rule 7.

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
   pull request" ruleset, so `commit-dataset.yml`'s `commit` job cannot push the promoted dataset
   straight to `main` (a direct push is rejected with `GH013`). It opens a `dataset/publish-<run-id>`
   PR instead (hence `pull-requests: write`) and arms GitHub-native auto-merge (`gh pr merge --auto`),
   which merges only once branch protection is satisfied — required status checks green and any
   required reviews in. It never bypasses those rules. As a fast pre-flight, the job first runs the
   Biome gate on the generated dataset (`biome check data/dataset`, the same rules ci.yml runs) —
   Biome formats JSON, so an unformatted Run document would fail the PR — and aborts before opening a
   doomed PR on a miss. The push/PR step is idempotent: a re-run reuses the existing open PR instead of
   colliding on the deterministic branch. `update-leaderboard.yml` lands `LEADERBOARD.md` the same way
   (a `leaderboard/update-<run-id>` PR, Biome-preflighted, auto-merge armed).

   > **`GITHUB_TOKEN` caveat.** A PR opened with the default `GITHUB_TOKEN` does **not** trigger
   > `ci.yml` (GitHub suppresses workflow events raised by the Actions token). The dataset commit step
   > therefore prefers the optional `DATASET_PR_TOKEN` environment secret (a fine-grained PAT — operator
   > setup items 4 and 6), falling back to `GITHUB_TOKEN`. The PAT-authored PR triggers its own checks;
   > with the fallback, a maintainer completes the merge and that merge to `main` runs `ci.yml` normally.
   > The in-job Biome pre-flight guarantees the dataset content is already clean either way.
6. **Backfilling a failed dataset commit.** The commit logic is the reusable `commit-dataset.yml`, so
   when a matrix run's dataset commit fails (or was never reached) a maintainer can re-run it standalone:
   **Actions → Commit dataset → Run workflow**, passing the original run's id — or, from a
   gh-authenticated clone, `scripts/backfill-dataset.sh <run-id>` (a thin `gh workflow run` wrapper that
   also warns if the run's shard artifacts have already expired). It re-downloads that run's `bench-*`
   shard artifacts by run-id (needs `actions: read`), re-aggregates, and opens the same lint-gated
   dataset PR — no re-benching. This only works while that run's shard artifacts are still within the
   repo's artifact-retention window. Dispatch is still gated by Environment `privileged` (main-only,
   required reviewer), so it is effectively maintainer-only. (`workflow_dispatch` is only offered for the
   copy of the workflow on the default branch, so `commit-dataset.yml` must be merged to `main` before
   it can be dispatched.)

7. **Updating the public leaderboard.** `LEADERBOARD.md` is regenerated separately from the dataset
   commit, on a deliberate maintainer action: **Actions → Update leaderboard → Run workflow** — or
   `scripts/update-leaderboard.sh [run-id]` from a gh-authenticated clone. Leave `run_id` blank to render
   from the newest committed dataset run (the first entry in `data/dataset/index.json`), or pass an
   explicit run id to point the table at a specific run. The
   workflow renders `LEADERBOARD.md` from `data/dataset/runs/<run-id>.json` — the **committed** dataset,
   never the gitignored `data/runs/` scratch tree (what the `leaderboard-artifact-sync` gate enforces) —
   so the run must already be committed (via a bench-matrix run or rule 6) before the leaderboard can
   name it. It then opens the lint-gated `leaderboard/update-<run-id>` PR (rule 5). Because the render is
   deterministic, the resulting `LEADERBOARD.md` is exactly what `leaderboard-artifact-sync` expects, so
   the PR's own CI stays green.

> **Two approval gates per bench-matrix run.** The suite-matrix fan-out (each cell calling
> `bench-suite.yml` with `environment: privileged`) and the `publish` job both carry the environment
> and run sequentially. Every suite × provider cell becomes pending together the moment `plan`
> finishes, so they surface as one batch in "Review pending deployments" and a single approval of the
> `privileged` environment releases the whole matrix; `publish` becomes pending only after the long
> matrix (~150 min), raising a **second** gate before the dataset is committed. A reviewer who
> approves only the matrix and walks away leaves the run parked at `publish` until the second approval
> lands or the protection rule times out.

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
   | `DATASET_PR_TOKEN` | optional; dataset commit only (fine-grained PAT — see below and item 6) |

   `DATASET_PR_TOKEN` is a fine-grained PAT — machine-account owned preferred — scoped to
   `starslingdev/hpc-sandbox-benchmarks` with **Contents: read/write** and **Pull requests:
   read/write**; `commit-dataset.yml`'s `gh pr list`/`create`/`merge` calls prefer it, falling back to
   `GITHUB_TOKEN`. It MUST be an **environment** secret on `privileged`: a repository-level copy
   would violate the posture above AND would not reach the matrix-call path (repository secrets are
   not passed to a called workflow without `secrets: inherit`; environment secrets resolve from the
   commit job's own `environment:` declaration on both entry points). Note the expiry date when
   creating it — and calendar the rotation: an expired/revoked PAT does NOT fall back (the workflow's
   `||` only engages when the secret is UNSET/empty; a set-but-dead PAT is still selected and
   `gh pr create` fails with an authentication error). Rotate or delete the secret before expiry.

5. Confirm the GHCR package `sandbox-benchmarks-toolchain` is **public** so providers can pull
   the candidate base anonymously (Org → Packages → package settings).
6. Give `commit-dataset.yml`'s `gh pr create` a token that may open PRs — one of:

   - **Path A (recommended): add `DATASET_PR_TOKEN`** per the table in item 4. Works regardless of
     the Actions toggle below, and the PAT-authored PR triggers `ci.yml` so reviewers see green
     checks. Calendar-remind on the PAT's expiry and rotate BEFORE it lapses: an expired/revoked
     PAT remains a non-empty secret, so the workflow still selects it (the `||` fallback engages
     only when the secret is unset/empty) and `gh pr create` fails with an authentication error —
     the error message names this case. Deleting the dead secret restores the `GITHUB_TOKEN`
     fallback (and with it the Path B requirement).
   - **Path B: enable Settings → Actions → General → Workflow permissions → "Allow GitHub Actions
     to create and approve pull requests"** (currently off: `can_approve_pull_request_reviews=false`;
     if the repo checkbox is greyed out, the org-level toggle forces it and only an org admin can
     flip it — the org state was not readable with repo credentials). Strictly worse than Path A:
     a `GITHUB_TOKEN`-opened PR never triggers `ci.yml` (rule 5 caveat), so reviewers see a
     check-less PR.

   With neither in place, `gh pr create` fails outright (`GraphQL: GitHub Actions is not permitted
   to create or approve pull requests`): the dataset job pushes the `dataset/publish-<run-id>` branch,
   then fails loudly with the remediation steps, and a maintainer must open the PR by hand.
   `update-leaderboard.yml` still uses `GITHUB_TOKEN`, so its separate
   `leaderboard/update-<run-id>` PR requires Path B or a manual open.

   Current end state either way (so expectations are honest): repo "Allow auto-merge" is **off**
   (`allow_auto_merge=false`), so `gh pr merge --auto` falls to its best-effort "PR left open for a
   maintainer" echo; and `main`'s ruleset ("Require PR approval on main") has NO required status
   checks — its gates are one approving review (repository-admin bypass: always) plus linear
   history. So after the PAT fix the dataset PR opens automatically and an admin completes the
   merge in one click; that human step is the designed second gate, not a bug.

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
