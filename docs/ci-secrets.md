# CI & secrets

Provider credentials and release mutations live only in **GitHub Environments** — never as
repository-level secrets. Repository-level copies must not exist: that is how we keep them
unavailable to PR workflows, forks, and any job that forgot to declare an environment.

There are two privileged-tier environments, split by how the ref they run against was chosen (see
[ADR-0006](./adr/0006-environment-protection-tiers.md) for the full rationale):

| Environment | Used by | Required reviewers | Why |
| --- | --- | --- | --- |
| `privileged` | `workflow_dispatch` jobs | Yes (≥1 maintainer) | A caller can name an arbitrary branch/commit/input; a human confirms the target before secrets are spent. |
| `privileged-scheduled` | `schedule` (cron) jobs | No | The ref is structurally pinned to `main`'s latest commit by GitHub itself — only a reviewed PR merge can change what a scheduled run does, so a second live approval adds toil with no matching safety benefit. |

> **Status:** `privileged-scheduled` is a target design, documented here so it can be configured and
> wired up. As of this doc, `bench-matrix.yml`'s nightly `schedule` trigger still runs its `bench` and
> `publish` jobs under the single `privileged` environment, so those jobs currently sit pending a
> manual approval every night like a `workflow_dispatch` run would — see
> [Scheduled (cron) runs](#scheduled-cron-runs-the-privileged-scheduled-environment) below for what
> else has to change before that stops being true.

`tooling/repo-checks` enforces the workflow side of this posture (see `workflow-hardening.ts`):
custom secrets and `contents: write` / `packages: write` jobs must set `environment: privileged`,
and toolchain publish must not trigger on `push`. That check currently only accepts the literal name
`privileged` (`PRIVILEGED_ENVIRONMENT` in `workflow-hardening.ts`) — wiring up `privileged-scheduled`
also means generalizing it to a set of accepted privileged-tier names, per
[ADR-0006](./adr/0006-environment-protection-tiers.md#consequences).

## What is gated

| Workflow | Job | Why |
| --- | --- | --- |
| `toolchain-image.yml` | `publish` | Provider bake secrets + `packages: write` (GHCR release) |
| `bench-matrix.yml` | `bench` | Provider API keys |
| `bench-matrix.yml` | `publish` | Dataset + leaderboard commit (`contents: write`) |
| `bench-smoke.yml` | `smoke` | Provider API keys |

Ungated: `ci.yml`, `ci-lint.yml`, and the toolchain `pr-gate` (Docker smoke, no secrets).

## Release rules (public-safe)

1. **No publish on merge.** Toolchain GHCR promote is `workflow_dispatch` only (never `push`).
2. **Main only, this repo only.** Privileged jobs require
   `github.ref == 'refs/heads/main'` and
   `github.repository == 'starslingdev/sandbox-benchmarks'`.
3. **Environment approval.** `privileged` must require at least one reviewer and restrict
   deployments to the `main` branch. Write access alone cannot finish a release.
   `privileged-scheduled` (nightly cron only, see below) restricts deployments to `main` the same
   way but requires no reviewer — see [ADR-0006](./adr/0006-environment-protection-tiers.md) for why
   that's still safe.
4. **Fork PRs.** Same-repo guard on self-hosted PR jobs; fork PR code never runs on
   `starsling-ubuntu-24.04-2`. Forks never receive Environment secrets on `pull_request`.

> **Two approvals per on-demand bench-matrix run.** `bench` and `publish` both carry `environment:
> privileged` and run sequentially, so GitHub raises **two** separate pending-deployment gates: one
> before the matrix starts, and a second (after the long matrix finishes, ~150 min) before the
> dataset is committed. A reviewer who approves only `bench` and walks away leaves the run parked at
> `publish` until the second approval lands or the protection rule times out. This applies to
> `workflow_dispatch` runs; a `schedule` run wired to `privileged-scheduled` (below) skips both gates.

## Operator setup — `privileged` (before flipping the repo public)

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

## Scheduled (cron) runs: the `privileged-scheduled` environment

`bench-matrix.yml` has a nightly `schedule` trigger (00:00 PST, every registered provider) meant to
run unattended. Making that true takes **two separate changes**, and creating the environment below
is only the first — read to the end before assuming cron is "done" once the GitHub UI side is set up.

**1. GitHub UI (this part you can do yourself):**

1. Create Environment **`privileged-scheduled`**.
2. **Required reviewers:** none. (This is the entire point of the split — see
   [ADR-0006](./adr/0006-environment-protection-tiers.md#decision) for why that's safe here and not
   for `privileged`.)
3. **Deployment branches:** `Selected branches` → `main` only — same restriction as `privileged`,
   just without the reviewer gate on top of it.
4. Add the **same** environment secrets as `privileged` (the table above). They are not inherited
   between environments — each one needs its own copy, and rotating a provider key means updating it
   in both places.
5. Optional bootstrap, mirroring `scripts/setup-privileged-environment.sh` (creates the empty
   environment only; reviewers-off is already the default for a brand-new environment, but branch
   restriction and secrets still need the UI steps above):

   ```sh
   ENV_NAME=privileged-scheduled ./scripts/setup-privileged-environment.sh
   ```

   (`setup-privileged-environment.sh` hardcodes `ENV_NAME="privileged"` today; parameterizing it —
   or adding a second script — is a small follow-up, not yet done.)

**2. Code changes (not yet made — flagging so "configure it and it'll work" doesn't turn into a
silent no-op):**

- `bench-matrix.yml`'s `bench` and `publish` jobs must pick their environment from the triggering
  event instead of hardcoding `environment: privileged`:

  ```yaml
  environment: ${{ github.event_name == 'schedule' && 'privileged-scheduled' || 'privileged' }}
  ```

- `tooling/repo-checks/src/lib/workflow-hardening.ts`'s `checkPrivilegedEnvironment` compares a job's
  environment name against the single `PRIVILEGED_ENVIRONMENT` constant; it needs to accept either
  name (a set) or the hardening gate fails the workflow the moment it references
  `privileged-scheduled`. Update its tests (`workflow-hardening.test.ts`) alongside it.

Until both land, `bench-matrix.yml`'s `schedule`-triggered `bench`/`publish` jobs stay on
`privileged` and will sit pending a manual approval every night, same as a `workflow_dispatch` run —
creating `privileged-scheduled` in the GitHub UI ahead of time is harmless (an unused environment) but
doesn't change that on its own.

## Local credentials

Copy [`.env.example`](../.env.example) to a gitignored `.env` and fill in the providers you have
(Bun auto-loads `.env` when you run a bin). A missing credential is a skip, not a failure. Never
commit them; never paste them into issues or pull requests. See [SECURITY.md](../SECURITY.md).

The `tooling/repo-checks` secret-hygiene gate enforces this: it fails CI if any tracked file is a
credential file (`.env`, `*.pem`, `id_rsa`, …) or contains a high-signal secret token.
