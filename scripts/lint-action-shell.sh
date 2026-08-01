#!/usr/bin/env bash
# shellcheck the bash embedded in GitHub composite-action files (.github/actions/**/action.y?ml).
#
# actionlint only lints .github/workflows/, so composite-action `run:` literals would otherwise
# escape every shell gate. This runs the same pinned shellcheck as lint:shell (via `mise exec`)
# against each `run: |` block, paired with its step `- name:` so a failure names both the file
# and the step.
set -euo pipefail

# No args: lint every composite action the repo ships. Unmatched globs stay literal under
# bash's default nullglob=off, and the `[ -e "$file" ]` guard below skips them.
if [ "$#" -eq 0 ]; then
	set -- .github/actions/*/action.yml .github/actions/*/action.yaml
fi

status=0
while [ "$#" -gt 0 ]; do
	file="$1"
	shift
	[ -e "$file" ] || continue

	# awk lifts each `run: |` literal out of the YAML, pairing it with its step's `- name:`. A
	# block starts at `run: |` and ends at the first non-blank line indented no deeper than the
	# `run:` key itself; the trailing `@@step:`/`@@end` markers delimit blocks for the reader.
	step=""
	block=""
	while IFS= read -r marker; do
		case "$marker" in
			@@step:*) step="${marker#@@step: }" ;;
			@@end)
				if ! printf '%s\n' "$block" | mise exec -- shellcheck --shell=bash -; then
					echo "shellcheck failed: $file (step: ${step:-unnamed})" >&2
					status=1
				fi
				step=""
				block=""
				;;
			*) block="${block}${block:+$'\n'}${marker}" ;;
		esac
	done < <(awk '
		/^[[:space:]]*- name: / { step = $0; sub(/^[[:space:]]*- name:[[:space:]]*/, "", step) }
		/^[[:space:]]*run:[[:space:]]*\|[[:space:]]*$/ {
			indent = index($0, "r") - 1
			block = ""
			in_run = 1
			next
		}
		{
			if (in_run) {
				lead = match($0, /[^[:space:]]/)
				if (lead > 0 && lead - 1 <= indent) {
					printf "@@step: %s\n", step
					print block
					print "@@end"
					block = ""
					in_run = 0
					next
				}
				block = block "\n" (lead == 0 ? "" : substr($0, indent + 1))
			}
		}
		END {
			if (in_run && block != "") {
				printf "@@step: %s\n", step
				print block
				print "@@end"
			}
		}
	' "$file")
done

exit "$status"
