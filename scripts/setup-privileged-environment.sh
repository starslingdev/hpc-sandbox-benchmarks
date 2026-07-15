#!/usr/bin/env bash
# Create the empty GitHub Environment `privileged` for this repo.
# Required reviewers, deployment-branch rules, and secrets must still be set in the GitHub UI —
# see docs/ci-secrets.md. Requires `gh` authenticated with admin rights on the repository.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-starslingdev/sandbox-benchmarks}"
ENV_NAME="privileged"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required (https://cli.github.com/)" >&2
  exit 1
fi

echo "Ensuring Environment '${ENV_NAME}' exists on ${REPO}…"
# PUT is idempotent: creates the environment or no-ops if it already exists.
gh api --method PUT "repos/${REPO}/environments/${ENV_NAME}" >/dev/null

echo "Created/verified Environment '${ENV_NAME}'."
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
