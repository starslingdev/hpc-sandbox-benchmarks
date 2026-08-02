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
| `bench-suite.yml` | `bench` | Provider API keys (the reusable benchmark cell BOTH `bench-matrix.yml` and `bench-smoke.yml` call) |
| `commit-dataset.yml` | `commit` | Dataset JSON commit (`contents: write` + `pull-requests: write`) |
| `update-leaderboard.yml` | `leaderboard` | Public `LEADERBOARD.md` commit (`contents: write` + `pull-requests: write`) |

`bench-matrix.yml` and `bench-smoke.yml` are **not** listed: neither reads a provider secret itself.
`bench-smoke.yml` is a `plan` job plus a suite-matrix job that calls `bench-suite.yml`;
`bench-matrix.yml` is the same, plus a `publish` job that calls `commit-dataset.yml`. Both callees are
in the table above and carry their own `privileged` gate, so a dispatch lane's jobs only plan and
orchestrate. A smoke dispatch is gated exactly as a matrix cell is — same approval, same Environment
secrets, same callee — it simply has no third phase to gate.

Two of these are reusable workflows whose `privileged` gate lives on their own job, because a `uses:`
caller can't declare `environment:` (the workflow-hardening drift gate checks the callee and passes the
local caller):

- `bench-suite.yml` runs one suite across a provider matrix. It is the single benchmark-cell
  implementation: `bench-matrix.yml`'s suite-matrix job calls it once per planned suite, and
  `bench-smoke.yml`'s calls it once for the dispatched suite. Environment secrets on `privileged`
  resolve from the reusable job's own `environment:` declaration (a `uses:` caller can't set
  `environment:`). Both callers pass `secrets: inherit` for repository-level secrets / token context.
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
   `github.repository == 'starslingdev/hpc-sandbox-benchmarks'`. The benchmark matrix and the smoke
   dispatch additionally permit an explicitly opted-in non-main dispatch (`allow_branch`) for
   pre-merge validation; those runs still require `privileged` approval, and every mutation of the
   repo — dataset publishing, GHCR promote, leaderboard — remains main-only.
3. **Environment approval.** `privileged` must require at least one reviewer and restrict
   deployments to `main` plus whatever branch pattern you want `allow_branch` to reach. Write access
   alone cannot finish a release.
4. **Fork PRs.** Same-repo guard on self-hosted PR jobs; fork PR code never runs on
   `starsling-ubuntu-24.04-2`. Forks never receive Environment secrets on `pull_request`.
5. **Dataset lands via PR, lint-gated.** `main` is protected by a "changes must be made through a
   pull request" ruleset, so `commit-dataset.yml`'s `commit` job cannot push the promoted dataset
   straight to `main` (a direct push is rejected with `GH013`). It opens a `dataset/publish-<run-id>`
   PR instead (hence `pull-requests: write`) and merges it the same way the leaderboard flow does
   (rule 7): a direct `gh pr merge` — GitHub still enforces the ruleset on that call; it succeeds
   because the ruleset has no required status checks and `data/dataset/` is unowned. Deliberately not
   `--auto`: arming auto-merge on a `GITHUB_TOKEN` PR whose required check will never run would leave
   the PR stranded behind a green job. As a fast pre-flight, the job first runs the
   Biome gate on the generated dataset (`biome check data/dataset`, the same rules ci.yml runs) —
   Biome formats JSON, so an unformatted Run document would fail the PR — and aborts before opening a
   doomed PR on a miss. The push/PR step is idempotent: a re-run reuses the existing open PR instead of
   colliding on the deterministic branch. Leaderboard landing follows the same `GITHUB_TOKEN` + PR
   pattern, path-fenced to exactly `LEADERBOARD.md` (rule 7).

   > **`GITHUB_TOKEN` caveat.** A PR opened with the default `GITHUB_TOKEN` does **not** trigger
   > `ci.yml` (GitHub suppresses workflow events raised by the Actions token). So if the Biome/CI
   > check ever becomes a *required* status on the main ruleset, the direct merge fails and the
   > publish job goes red — a maintainer completes the merge (their merge to `main` runs `ci.yml`
   > normally). Today the ruleset requires no status checks, so this caveat only bites if one is
   > added — the in-job Biome pre-flights already guarantee the generated content is clean either
   > way. For fully hands-off merging *with* required checks, the PR would need to be opened with a
   > GitHub App installation token or PAT instead of `GITHUB_TOKEN`; we deliberately avoid
   > provisioning one until that trade-off is actually needed.
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

7. **Updating the public leaderboard (github-actions bot, path-fenced).** `LEADERBOARD.md` is regenerated
   separately from the dataset commit, on a deliberate maintainer action: **Actions → Update
   leaderboard → Run workflow** — or `scripts/update-leaderboard.sh [run-id]` from a gh-authenticated
   clone. Leave `run_id` blank to render from the newest committed dataset run (the first entry in
   `data/dataset/index.json`), or pass an explicit run id to point the table at a specific run. The
   workflow renders `LEADERBOARD.md` from `data/dataset/runs/<run-id>.json` — the **committed** dataset,
   never the gitignored `data/runs/` scratch tree (what the `leaderboard-artifact-sync` gate enforces) —
   so the run must already be committed (via a bench-matrix run or rule 6) before the leaderboard can
   name it. It then:

   1. Pushes `leaderboard/update-<run-id>` and opens the PR as the built-in **github-actions bot**
      (`GITHUB_TOKEN` — no extra App or PAT; requires the "Allow GitHub Actions to create and approve
      pull requests" toggle, see operator setup).
   2. Runs `scripts/assert-paths-allowlisted.sh` on the staged index **and** the PR file list; anything
      other than `LEADERBOARD.md` aborts before any merge is attempted.
   3. Merges the PR with a direct `gh pr merge` (deliberately not `--auto`: on a `GITHUB_TOKEN` PR a
      required check never runs, so arming auto-merge could only ever strand the PR behind a green
      job). GitHub still enforces the ruleset on the merge call; this is not a bypass — it succeeds
      only because the ruleset has no required status checks, code-owner review is the sole review
      requirement, and `LEADERBOARD.md` is intentionally unowned.

   Because the render is deterministic, the resulting `LEADERBOARD.md` is exactly what
   `leaderboard-artifact-sync` expects, so subsequent CI stays green. The job also pre-flights the
   repo-wide Biome gate (`biome check .`, the same command ci.yml's lint job runs) before opening the
   PR — it must be repo-wide, not `biome check LEADERBOARD.md`: Biome has no Markdown handler under
   this config, so a Markdown-only invocation processes zero files and exits non-zero.

   This is intentionally **not** a ruleset bypass for `github-actions`. Public contributors who open a
   PR that modifies `.github/` still need a code-owner approval (see operator setup), and the dispatch
   itself is gated by Environment `privileged` (main-only + required reviewer), so fork PRs can never
   drive this flow.

8. **Adding one provider to a version everyone else already runs (scoped backfill).** A provider added
   after a toolchain version was cut has no artifact for it, and the two obvious recoveries are both
   wrong: a version bump re-benches the whole fleet, and `force_republish` regenerates *every*
   provider's artifact in place — destructively for Daytona, which deletes each snapshot before
   recreating it. `toolchain-image.yml` therefore takes three optional dispatch inputs that narrow the
   release instead (all default to the full release, so a normal version bump is unchanged):

   | Input | Effect |
   | --- | --- |
   | `providers` | Comma-separated provider ids the release covers; blank = all. Scoping produces only those bake cells, and makes promote a **backfill**: it publishes just those providers' version artifacts onto the already-published version and never rewrites the public base or anyone else's artifact. Every provider a scoped dispatch names is **required** — you asked for it, so it must ship. |
   | `build` | `full` rebuilds the base (the default). `variants` restages only the registry-served provider variants on top of the **published** base — minutes instead of an hour, and the new provider gets the same bytes the fleet already runs (the toolchain build is not reproducible, so a rebuild would quietly hand it a different `:vN`). `skip` skips the build job outright and reuses what the registry holds. |
   | `promote` | Uncheck to bake + verify only; the publish job is skipped. |

   `force_republish` is rejected together with a `providers` list — they are opposite operations, and
   silently picking one would do something the operator did not ask for. A scoped promote also refuses
   if the version is **not** yet published: there is nothing to backfill onto, so run a full release
   first. Two more refusals keep a scoped release honest, both fail-fast in the plan or before the
   public base moves:

   - **`providers: blaxel` is refused.** Blaxel boots the vendor's stock image rather than the
     toolchain, so the release lane carries no `BL_API_KEY`/`BL_WORKSPACE` (they are bench-lane only,
     see the table above) and has no artifact to publish for it. An *unscoped* release just skips it.
   - **A drifted candidate base is refused** when the scope contains a provider that bakes its artifact
     *from* the base (e2b, daytona, novita). Those providers' candidates are verified but their version
     artifacts are rebuilt, so the two are the same bytes only while `:vN-candidate` still is `:vN` —
     re-stage with `build: variants`, or bump `TOOLCHAIN_VERSION` and cut a full release. Providers
     that don't bake from the base (vercel, modal, namespace, microsandbox) are unaffected: their
     version artifact is a retag of the exact candidate that was just booted.

   The Vercel-on-v7 flow, as an example — two dispatches, neither of which touches another provider:

   1. **Actions → Toolchain image → Run workflow** with `providers=vercel`, `build=variants`,
      `promote` unchecked. Stages `…-vercel:v7-candidate` in GHCR from the published `:v7`, mirrors it
      into VCR, boots it and runs the smoke spec. Nothing public moves.
   2. Same dispatch with `build=skip` and `promote` checked. Re-validates the VCR candidate and
      publishes it as the Vercel `v7` image. The GHCR base `:v7` is never rewritten.

   Each registry-served variant is its own GHCR package (`sandbox-benchmarks-toolchain-vercel`), and the
   bake cell pulls it **anonymously**, so it needs the same one-time Public bootstrap as the base
   package — GHCR creates a package private on first push and offers no API to flip it. The plan's
   visibility guard checks every package the release needs and warns when one does not exist yet, so on
   the very first dispatch expect: build pushes the variant (creating it private) → the bake cell's pull
   fails → set the package Public in the org package settings → re-run the same dispatch. Every dispatch
   after that is clean.

> **Two approval gates per bench-matrix run.** The suite-matrix fan-out (each cell calling
> `bench-suite.yml` with `environment: privileged`) and the `publish` job both carry the environment
> and run sequentially. Every suite × provider cell becomes pending together the moment `plan`
> finishes, so they surface as one batch in "Review pending deployments" and a single approval of the
> `privileged` environment releases the whole matrix; `publish` becomes pending only after the long
> matrix (~150 min), raising a **second** gate before the dataset is committed. A reviewer who
> approves only the matrix and walks away leaves the run parked at `publish` until the second approval
> lands or the protection rule times out.

## Operator setup (before flipping the repo public)

Do this in the GitHub UI (Settings → Environments / Rules / Actions), then delete any matching
**repository** secrets.

### Environment `privileged`

1. Create Environment **`privileged`**.
2. **Required reviewers:** at least one maintainer (two preferred).
3. **Deployment branches:** `Selected branches` → `main`.

   This rule is a SECOND gate, independent of each workflow's `if:`. `bench-matrix.yml` and
   `bench-smoke.yml` both offer an `allow_branch` dispatch input for pre-merge validation, but a
   branch dispatch still fails at the environment with *"Branch is not allowed to deploy to
   privileged"* until this list admits the branch. To use `allow_branch`, add the branch patterns you
   want to reach it — e.g. `claude/*`, or a dedicated `bench/*` prefix maintainers push validation
   branches to. Prefer a narrow pattern over `All branches`: anyone who can push a matching branch can
   then request a `privileged` run (a reviewer still has to approve it, and the workflows' own
   same-repo guard still excludes forks, so this widens *who can ask*, not *what runs unattended*).
   Leave the list at `main` alone if you do not want branch dispatches at all — the input is inert
   without it.
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
   | `MSB_API_KEY` | Microsandbox Cloud toolchain validation and bench matrix/smoke |
   | `VERCEL_TOKEN` | Bootstrap only: Vercel CLI pulls a short-lived project OIDC token |
   | `VERCEL_ORG_ID` | Links the Vercel CLI to the repository's organization (`team_*`) |
   | `VERCEL_PROJECT_ID` | Links the Vercel CLI to the repository's project (`prj_*`) |

   `MSB_API_URL` is an optional Microsandbox Cloud endpoint override for staging or private deployments. Leave it unset to use the SDK's `https://api.microsandbox.dev` default.

   Enable **OIDC Federation** in the linked Vercel project's Security settings and create the
   `sandbox-benchmarks-toolchain-vercel` VCR repository once (for example with `vercel vcr add`). The
   shared `vercel-auth` composite runs the pinned Vercel CLI's `pull` and `env pull` commands, masks
   `VERCEL_OIDC_TOKEN`, exports it through `GITHUB_ENV`, and immediately deletes its temporary env
   file. Toolchain jobs additionally run `vercel vcr login docker`, use `vercel vcr push docker` for
   publication, and always run `docker logout vcr.vercel.com`.

   GitHub Actions **variables** (Settings → Secrets and variables → Actions → Variables), *not*
   secrets — a team slug and a project name are not credentials, and leaving them readable in job logs
   is what makes a mirror into the wrong namespace diagnosable:

   | Variable | Purpose |
   | --- | --- |
   | `VERCEL_TEAM_SLUG` | Vercel team slug (org) the VCR namespace is rooted at |
   | `VERCEL_PROJECT_NAME` | Vercel project name the VCR namespace is scoped to |

   Both are optional: unset, they fall back to `VERCEL_TEAM_SLUG_DEFAULT` /
   `VERCEL_PROJECT_NAME_DEFAULT` in `packages/schema/src/toolchain.ts`, which is the single place the
   default namespace is defined. Set them only to publish into a different team or project.

   These are the human-readable **names**; `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` are the `team_*` /
   `prj_*` **API IDs** that `vercel pull` links with. The two pairs are not interchangeable, and
   passing an ID where a name belongs is rejected at config load rather than becoming a registry path
   segment. `VERCEL_PROJECT_NAME` must name the same project as `VERCEL_PROJECT_ID`: the mirror step
   passes it to `vercel vcr push --project`, so a mismatch fails the push instead of publishing into a
   repository the providers never pull from.

### Main ruleset (public-safe bot merges)

Configure the `main` ruleset so the bot-authored dataset/leaderboard PRs can merge hands-off
**without** letting a public contributor merge a PR that edits `.github/`:

1. Ruleset on `main` (or default branch):
   - Require a pull request before merging.
   - **Required approving review count: `0`.**
   - **Require review from Code Owners: on.**
   - **No required status checks** — `GITHUB_TOKEN`-authored PRs never run them (the caveat in
     rule 5), so a required check would strand every bot PR on a maintainer merge. The bot-landed
     content is guarded instead by the in-job Biome pre-flights, the deterministic renderer, and the
     path allowlist.
2. Keep [`.github/CODEOWNERS`](../.github/CODEOWNERS) owning **everything by default** (`*` owner)
   with ownerless overrides for exactly the bot-landed artifacts (`/LEADERBOARD.md`,
   `/data/dataset/` — a CODEOWNERS entry with no owner un-owns its paths; last match wins). Those
   two must stay unowned so code-owner review is not required for the bot's PRs; everything else —
   in particular the leaderboard renderer and its backing packages, whose output a `privileged` job
   commits — must stay owned so no code change can merge without maintainer review.
3. **Do not** add `github-actions` (or a broad actor) as a ruleset bypass. The bot does not need
   bypass when code-owner review is the only review requirement and its two landing paths are
   unowned.
4. **Settings → General → Pull Requests → Allow auto-merge** is not needed by these flows: the
   workflows use a direct `gh pr merge`, never `--auto` (arming auto-merge on a `GITHUB_TOKEN` PR
   whose required check can never run would strand it behind a green job).

With that posture: a fork/public PR that touches `/.github/` still needs `@dbworku`; a
`leaderboard/update-*` PR that only changes `LEADERBOARD.md` merges as soon as the workflow opens it.

### Other Actions settings

1. Confirm the GHCR package `sandbox-benchmarks-toolchain` is **public** so providers can pull
   the candidate base anonymously (Org → Packages → package settings).
2. Enable **Settings → Actions → General → Workflow permissions → "Allow GitHub Actions to create
   and approve pull requests"** — both `commit-dataset.yml` and `update-leaderboard.yml` use
   `GITHUB_TOKEN` for `gh pr create`. Prefer the default **Read** repository contents permission;
   elevated `contents` / `pull-requests` stay on individual jobs.

Optional bootstrap (creates the empty environment; reviewers/secrets still need a human):

```sh
./scripts/setup-privileged-environment.sh
```

## Local credentials

Copy [`.env.example`](../.env.example) to a gitignored `.env` and fill in the providers you have
(Bun auto-loads `.env` when you run a bin). A missing credential is a skip, not a failure. Never
commit them; never paste them into issues or pull requests. See [SECURITY.md](../SECURITY.md).

`microsandbox-local` uses `MICROSANDBOX_LOCAL_BENCH=1` as an explicit capability opt-in rather than a credential. The runner must provide KVM on Linux or Hypervisor.framework on macOS. `microsandbox-cloud` needs `MSB_API_KEY`; `MSB_API_URL` is an optional endpoint override. The cloud adapter keeps the key in the SDK control-plane backend and never adds it to sandbox metadata, create-time environment variables, or guest commands.

The `tooling/repo-checks` secret-hygiene gate enforces this: it fails CI if any tracked file is a
credential file (`.env`, `*.pem`, `id_rsa`, …) or contains a high-signal secret token.
