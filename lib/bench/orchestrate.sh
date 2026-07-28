#!/usr/bin/env bash
# Orchestration: run child tasks, collect failures, report once at the end.
#
# Callers use `set -uo pipefail` WITHOUT -e here: the point is to run every child and report at the
# end, which `run_task` isolates and `summary` turns into the exit code.
#
# Sourced via lib/bench.sh — do not source directly.

# --- Orchestrator helpers ---
_failures=()

# Run a mise subtask inside a GHA collapsible group. Never aborts; records failures for summary.
run_task() {
	local task="$1" label="${1##*:}"
	[ "${GITHUB_ACTIONS:-}" = "true" ] && echo "::group::${label}"
	if ! mise run "$task"; then
		_failures+=("$task")
		[ "${GITHUB_ACTIONS:-}" = "true" ] && echo "::warning::${task} failed"
	fi
	[ "${GITHUB_ACTIONS:-}" = "true" ] && echo "::endgroup::"
	return 0
}

# Print a run summary. Returns non-zero if any run_task recorded a failure.
summary() {
	echo ""
	if [ ${#_failures[@]} -eq 0 ]; then
		echo "All tasks passed."
		return 0
	fi
	echo "WARNING: ${#_failures[@]} task(s) had issues:"
	printf '  - %s\n' "${_failures[@]}"
	return 1
}
