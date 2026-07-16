#!/usr/bin/env bash
# Create the empty GitHub Environment `privileged` for this repo.
# Required reviewers, deployment-branch rules, and secrets must still be set in the GitHub UI —
# see docs/ci-secrets.md. Requires `gh` authenticated with admin rights on the repository.
set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required (https://cli.github.com/)" >&2
  exit 1
fi

# Prefer the repo gh is pointed at (so a fork or renamed remote just works). GITHUB_REPOSITORY wins
# if the caller set it. Fail closed if we can't resolve a name: silently defaulting to a hardcoded
# repo could create/modify the environment on the WRONG repository.
if [ -n "${GITHUB_REPOSITORY:-}" ]; then
  REPO="$GITHUB_REPOSITORY"
elif REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)" && [ -n "$REPO" ]; then
  :
else
  echo "Could not determine the repository. Set GITHUB_REPOSITORY, or run inside a gh-authenticated clone." >&2
  exit 1
fi
ENV_NAME="privileged"

echo "Ensuring Environment '${ENV_NAME}' exists on ${REPO}…"
# A bodyless PUT to /environments/{name} is a FULL REPLACE, not a no-op: re-running it against an
# already-configured environment would silently reset every protection rule (required reviewers,
# deployment-branch restriction, wait timer) to none. So probe first and create ONLY on a confirmed
# 404 — a 403, rate limit, or transient network error must NOT be mistaken for "absent" and fall
# through to the protection-wiping PUT. Fail closed on any non-404 error.
set +e
probe="$(gh api --include "repos/${REPO}/environments/${ENV_NAME}" 2>&1)"
probe_status=$?
set -e
if [ "$probe_status" -eq 0 ]; then
  echo "Environment '${ENV_NAME}' already exists — leaving its protection rules untouched."
  echo "(Not re-PUTting: a bodyless PUT would wipe reviewers, branch rules, and the wait timer.)"
elif printf '%s\n' "$probe" | grep -qiE '^HTTP/[0-9.]+ 404\b'; then
  gh api --method PUT "repos/${REPO}/environments/${ENV_NAME}" >/dev/null
  echo "Created empty Environment '${ENV_NAME}' — NOT YET PROTECTED."
  echo "It has no required reviewers, no branch restriction, and no secrets until you finish the"
  echo "steps below. Do not treat '${ENV_NAME}' as hardened until docs/ci-secrets.md is fully applied."
else
  echo "Could not determine whether Environment '${ENV_NAME}' exists (the API returned an error other" >&2
  echo "than 404). Refusing to touch it — a blind PUT could wipe its protection rules. First response line:" >&2
  printf '%s\n' "$probe" | head -n1 >&2
  exit 1
fi
echo
echo "Still required in the GitHub UI (Settings → Environments → ${ENV_NAME}):"
echo "  1. Required reviewers (at least one maintainer)"
echo "  2. Deployment branches: main only"
echo "  3. Move provider secrets onto this environment; delete repository-level copies"
echo
echo "Secret checklist:"
echo "  E2B_API_KEY, DAYTONA_API_KEY, DAYTONA_TARGET,"
echo "  MODAL_TOKEN_ID, MODAL_TOKEN_SECRET, NOVITA_API_KEY,"
echo "  BL_API_KEY, BL_WORKSPACE"
echo
echo "Full runbook: docs/ci-secrets.md"
