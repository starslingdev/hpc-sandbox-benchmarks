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
4. **Fork PRs.** Same-repo guard on self-hosted PR jobs; fork PR code never runs on
   `starsling-ubuntu-24.04-2`. Forks never receive Environment secrets on `pull_request`.

> **Two approvals per bench-matrix run.** `bench` and `publish` both carry `environment:
> privileged` and run sequentially, so GitHub raises **two** separate pending-deployment gates: one
> before the matrix starts, and a second (after the long matrix finishes, ~150 min) before the
> dataset is committed. A reviewer who approves only `bench` and walks away leaves the run parked at
> `publish` until the second approval lands or the protection rule times out.

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
