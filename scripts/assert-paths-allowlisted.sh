#!/usr/bin/env bash
# Fail unless every path in a change set is on an explicit allowlist.
#
# Usage:
#   scripts/assert-paths-allowlisted.sh staged -- PATH [PATH...]
#   scripts/assert-paths-allowlisted.sh pr <pr-number-or-url-or-branch> -- PATH [PATH...]
#
# `staged` inspects `git diff --cached --name-only --no-renames` (the index about to be committed).
# `--no-renames` matters: with rename detection a rename prints only its DESTINATION, so renaming a
# sensitive file into an allowlisted path would hide the source; disabling it decomposes the rename
# into a delete + add and the deleted source path fails the allowlist.
# `pr` inspects the PR's file list via the pulls/files API and checks BOTH `filename` and
# `previous_filename` — `gh pr diff --name-only` prints only destinations, same blind spot.
#
# Used by update-leaderboard.yml so a compromised or drifted release job cannot merge a PR that
# touches anything beyond LEADERBOARD.md (in particular `.github/` workflows).
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

# Collect the change set via command substitution, NOT `mapfile < <(...)`: a process substitution's
# exit status is invisible to `set -e`, so a source command that fails mid-stream (e.g. a later
# `--paginate` page erroring after earlier pages printed) would leave a PARTIAL list that the fence
# then happily validates. With `$(...)` the assignment itself fails and `set -e` aborts — fail
# closed on any collection error.
changed_raw="$(
  case "$mode" in
    staged)
      git diff --cached --name-only --no-renames
      ;;
    pr)
      # Resolve whatever PR reference gh accepts (number, URL, branch) through its canonical URL,
      # then list that exact PR's files through the API: unlike `gh pr diff --name-only`, this
      # exposes `previous_filename`, so a rename's source path is checked too (fail-closed on
      # renames of sensitive files into an allowlisted path). Deriving owner/repo from the resolved
      # URL (not `{owner}/{repo}` placeholders, which name the current checkout) keeps the files
      # listing bound to the same PR the reference resolved to, even for a cross-repo URL.
      pr_url="$(gh pr view "$pr_ref" --json url --jq .url)"
      pr_number="${pr_url##*/}"
      repo_path="${pr_url#*://*/}"
      repo_path="${repo_path%/pull/*}"
      if [ -z "$pr_number" ] || [ -z "$repo_path" ] || [ "$repo_path" = "$pr_url" ]; then
        echo "could not parse owner/repo and PR number from resolved PR url: $pr_url" >&2
        exit 2
      fi
      gh api "repos/${repo_path}/pulls/${pr_number}/files" --paginate \
        --jq '.[] | .filename, (.previous_filename // empty)'
      ;;
  esac
)"

if [ -z "$changed_raw" ]; then
  echo "change set is empty — nothing to allowlist-check" >&2
  exit 1
fi
mapfile -t changed <<< "$changed_raw"

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
