---
status: accepted
---

# GitHub Environment protection tiers (interactive vs. scheduled)

## Context

Bench-matrix and toolchain-release jobs cross two different trust boundaries. First, PR-triggered
code may be untrusted (public forks): those jobs must never see provider secrets or elevate
permissions, so `ci.yml`/`ci-lint.yml` never reference the privileged environment at all. Second,
even for a trusted maintainer, spending real provider budget across the live matrix, publishing the
committed dataset, or cutting a GHCR release is consequential enough to want a second human sign-off
beyond ordinary repo write access — `docs/ci-secrets.md` puts it as "write access alone cannot finish
a release."

The repo answers the second boundary with a single GitHub Environment, `privileged`: required
reviewers (≥1 maintainer) plus a deployment-branch restriction to `main`. `tooling/repo-checks`'s
`checkPrivilegedEnvironment` makes this a CI-enforced invariant — any job that reads a custom secret
or elevates to `contents:write`/`packages:write` must declare `environment: privileged`.

That one environment conflates two different questions, though. The reviewer gate is really standing
in for: "is this the *ref* we actually intended?" `workflow_dispatch` lets the caller name an
arbitrary branch or commit, so a human has to confirm the target before secrets are spent — that's
the scenario `CONTRIBUTING.md` describes ("we won't want public repo contributors to be able to run
on random commits or branches"). A `schedule` trigger can't be pointed at an arbitrary ref by anyone:
it always fires the workflow file committed on the default branch, against the default branch's
latest commit. The only way to change what a scheduled run does is to land a change to the workflow
file itself, which already went through ordinary PR review to reach `main`. Requiring a *second*,
live, every-night human approval on top of that adds toil without a matching security benefit —
nobody is at a keyboard at 00:00 PST to click approve, so a reviewer gate on a nightly cron either
means the run expires unapproved (defeating "runs automatically") or a maintainer builds a habit of
rubber-stamping it every morning (defeating what the review was for).

## Decision

Split environment protection into two tiers, keyed on *how the ref was chosen* rather than *who is
asking*:

- **`privileged`** — for triggers where a caller can name an arbitrary ref or input
  (`workflow_dispatch`). Keeps required reviewers + `main`-only deployment branch: a second human
  confirms the target before secrets are spent or a release/dataset is published.
- **`privileged-scheduled`** — for triggers where the ref is structurally pinned to `main`'s latest
  commit by GitHub itself (`schedule`). Same secrets, same `main`-only branch restriction, but **no
  required reviewers** — the property the reviewer gate exists to protect ("no arbitrary branch or
  commit") already holds without one, because only a reviewed PR merge can change what fires.

A job picks its tier at run time from the event that triggered it, e.g.:

```yaml
environment: ${{ github.event_name == 'schedule' && 'privileged-scheduled' || 'privileged' }}
```

Both tiers keep the same `github.ref == 'refs/heads/main' && github.repository ==
'starslingdev/sandbox-benchmarks'` `if:` guard already used by privileged jobs — the tier split
changes *who has to click approve*, not *what ref or repo is allowed to run at all*.
`checkPrivilegedEnvironment` treats both names as satisfying the "must be privileged" requirement (a
set, not one string), so a job still can't reference a bare or unlisted environment and slip past
with custom secrets.

## Consequences

- Nightly scheduled benches (see the `schedule` trigger on `bench-matrix.yml`) can finish unattended
  end to end (`plan` → `bench` → `publish`) instead of expiring while waiting on an approval nobody is
  present to give.
- On-demand `workflow_dispatch` keeps the existing two-approval flow (`bench` and `publish` each
  raise a separate pending-deployment gate) unchanged — that path gets no weaker.
- Provider secrets are duplicated across two Environments instead of one; each copy is still scoped
  only to jobs that declare that Environment, but rotation now touches both. See the operator
  checklist in `docs/ci-secrets.md`.
- A PR that only edits the workflow file cannot itself reach `privileged-scheduled`: the edit has to
  land on `main` (reviewed) before the next scheduled run picks it up, and `schedule` events always
  execute the workflow version committed to the default branch, never a PR head.
- `tooling/repo-checks`'s `PRIVILEGED_ENVIRONMENT` constant and `checkPrivilegedEnvironment` need to
  become environment-*set*-shaped (`PRIVILEGED_ENVIRONMENTS = new Set(["privileged",
  "privileged-scheduled"])`) instead of a single string, with tests updated to match — until that
  lands, a job that references `privileged-scheduled` fails the hardening gate.
