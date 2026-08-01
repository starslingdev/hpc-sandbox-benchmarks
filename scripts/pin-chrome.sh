#!/usr/bin/env bash
# Install the headless Chrome build the lockfile pins, and print its executable path.
#
# ONE mechanism for the release workflow and a maintainer regenerating figures locally, so "the
# pinned browser" is not a CI-only special case: the Update-leaderboard job exports the printed
# path as BUN_CHROME_PATH, and a local render can do the same
# (`BUN_CHROME_PATH="$(./scripts/pin-chrome.sh)" bun apps/cli/src/bin/leaderboard.ts …`).
#
# The pin is the locked `playwright-core` version: `bunx` resolves the workspace's installed copy,
# and each playwright-core release pins one chromium-headless-shell build. The install location is
# then asked OF PLAYWRIGHT-CORE ITSELF (`install --dry-run`) rather than globbed out of the cache
# directory, because the cache is shared state: it moves with PLAYWRIGHT_BROWSERS_PATH, its layout
# differs by platform/arch, and it can hold stale revisions from earlier versions — a
# `find ~/.cache/ms-playwright | head -1` can silently pick a browser the lockfile does not pin.
# Searching only the resolved revision directory makes that impossible.
set -euo pipefail

# Idempotent: playwright skips the ~100 MB download when the revision is already installed
# (e.g. restored from the workflow's cache). Progress goes to stderr; stdout is the path.
bunx playwright-core install chromium-headless-shell >&2

dir="$(bunx playwright-core install --dry-run chromium-headless-shell | sed -n 's/^ *Install location: *//p' | head -1)"
if [ -z "$dir" ] || [ ! -d "$dir" ]; then
  echo "could not resolve the chromium-headless-shell install location (got: '${dir}')" >&2
  exit 1
fi

# The executable's name is the one platform-dependent part (`chrome-headless-shell` in the
# Chrome-for-Testing layouts, `headless_shell` in some arm64 chromium layouts) — search for
# either, but only inside the exact revision directory resolved above.
shell="$(find "$dir" -type f \( -name chrome-headless-shell -o -name headless_shell \) | head -1)"
if [ -z "$shell" ]; then
  echo "no headless-shell executable under $dir" >&2
  exit 1
fi
printf '%s\n' "$shell"
