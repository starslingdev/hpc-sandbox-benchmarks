#!/usr/bin/env bash
# Regenerate the public LEADERBOARD.md from a committed dataset run by dispatching update-leaderboard.yml.
#
# The dataset accumulates one committed Run per matrix run automatically (commit-dataset.yml); moving the
# published comparison surface is a deliberate codeowner action. This is a thin wrapper over
# `gh workflow run` so the dispatch is one command instead of a hand-assembled API call; the same thing
# is doable from the Actions UI (Actions → Update leaderboard → Run workflow). See docs/ci-secrets.md
# rule 7.
#
# Requires `gh` authenticated with rights to dispatch workflows on this repo. The dispatch is gated by
# Environment `privileged` (main-only + required reviewer), so it parks for maintainer approval.
#
# Usage: scripts/update-leaderboard.sh [run-id]
#   [run-id]   Committed dataset run id to render from. Omit to render from the newest committed run.
set -euo pipefail

# update-leaderboard.yml only runs on main (its job `if:` pins to refs/heads/main), and workflow_dispatch
# is only offered for workflows present on the default branch — so always dispatch the main copy.
WORKFLOW="update-leaderboard.yml"
REF="main"

RUN_ID="${1:-}"
# Optional, but if given it must be a numeric GitHub run id (blank = newest committed run).
#
# COMPOSITE runs are deliberately out of scope here. The dataset can hold a Run spliced from two CI
# runs, named `<baseRunId>+<otherRunId>` (see data/dataset/index.json) — an id no GitHub run has, so
# this dispatch wrapper rejects it. update-leaderboard.yml itself has no such constraint: render a
# composite from the Actions UI (Actions -> Update leaderboard -> Run workflow), or locally with
#   bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json LEADERBOARD.md
if [ -n "$RUN_ID" ] && ! printf '%s' "$RUN_ID" | grep -qE '^[0-9]+$'; then
  echo "run-id must be a numeric GitHub run id when provided (got '${RUN_ID}')" >&2
  echo "Usage: scripts/update-leaderboard.sh [run-id]   (omit to render from the newest committed run)" >&2
  echo "Composite run ids (<runA>+<runB>) are not dispatchable here — use the Actions UI or render" >&2
  echo "locally: bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/<id>.json LEADERBOARD.md" >&2
  exit 2
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required (https://cli.github.com/)" >&2
  exit 1
fi

# Prefer the repo gh is pointed at; GITHUB_REPOSITORY wins. Fail closed rather than default to a
# hardcoded repo.
if [ -n "${GITHUB_REPOSITORY:-}" ]; then
  REPO="$GITHUB_REPOSITORY"
elif REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)" && [ -n "$REPO" ]; then
  :
else
  echo "Could not determine the repository. Set GITHUB_REPOSITORY, or run inside a gh-authenticated clone." >&2
  exit 1
fi

if [ -n "$RUN_ID" ]; then
  echo "Dispatching ${WORKFLOW} on ${REF} of ${REPO} to render the leaderboard from run ${RUN_ID}…"
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$REF" -f "run_id=${RUN_ID}"
else
  echo "Dispatching ${WORKFLOW} on ${REF} of ${REPO} to render the leaderboard from the newest committed run…"
  gh workflow run "$WORKFLOW" --repo "$REPO" --ref "$REF"
fi

echo
echo "Dispatched. The run is gated by Environment 'privileged' — it waits for a required reviewer to"
echo "approve. On success it opens the leaderboard/update-<run-id> pull request. Watch it:"
echo "  gh run list --repo ${REPO} --workflow ${WORKFLOW}"
