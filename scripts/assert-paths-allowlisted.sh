#!/usr/bin/env bash
# Fail unless every path in a change set is on an explicit allowlist.
#
# Usage:
#   scripts/assert-paths-allowlisted.sh staged -- PATH [PATH...]
#   scripts/assert-paths-allowlisted.sh pr <pr-number-or-url-or-branch> -- PATH [PATH...]
#
# `staged` inspects `git diff --cached --name-only` (the index about to be committed).
# `pr` inspects `gh pr diff --name-only` for an open/closed PR reference `gh` accepts.
#
# Used by update-leaderboard.yml so a compromised or drifted release job cannot arm auto-merge for a
# PR that touches anything beyond LEADERBOARD.md (in particular `.github/` workflows).
set -euo pipefail

usage() {
  echo "Usage:" >&2
  echo "  $0 staged -- PATH [PATH...]" >&2
  echo "  $0 pr <pr-ref> -- PATH [PATH...]" >&2
  exit 2
}

if [ "$#" -lt 1 ]; then
  usage
fi

mode="$1"
shift

case "$mode" in
  staged)
    pr_ref=""
    ;;
  pr)
    if [ "$#" -lt 1 ]; then
      usage
    fi
    pr_ref="$1"
    shift
    ;;
  *)
    usage
    ;;
esac

# Expect: -- PATH [PATH...]
if [ "$#" -lt 2 ] || [ "$1" != "--" ]; then
  usage
fi
shift

if [ "$#" -eq 0 ]; then
  echo "allowlist must contain at least one path" >&2
  exit 2
fi

# Build an allowlist set keyed by exact repo-relative path.
declare -A allow=()
for path in "$@"; do
  if [ -z "$path" ] || [[ "$path" == /* ]] || [[ "$path" == *..* ]]; then
    echo "refusing non-repo-relative allowlist path: $path" >&2
    exit 2
  fi
  allow["$path"]=1
done

mapfile -t changed < <(
  case "$mode" in
    staged)
      git diff --cached --name-only --diff-filter=ACDMRTUXB
      ;;
    pr)
      gh pr diff "$pr_ref" --name-only
      ;;
  esac
)

if [ "${#changed[@]}" -eq 0 ]; then
  echo "change set is empty — nothing to allowlist-check" >&2
  exit 1
fi

blocked=0
for path in "${changed[@]}"; do
  # Skip blank lines gh/git sometimes emit.
  if [ -z "$path" ]; then
    continue
  fi
  if [ -z "${allow[$path]+x}" ]; then
    echo "path not allowlisted: $path" >&2
    blocked=1
  fi
done

if [ "$blocked" -ne 0 ]; then
  echo "allowed paths only:" >&2
  printf '  %s\n' "$@" >&2
  exit 1
fi

echo "allowlist ok (${#changed[@]} path(s))"
