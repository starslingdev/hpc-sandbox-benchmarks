#!/usr/bin/env bash
# Results: where a task writes, what it writes, and how a measured command is timed.
#
# This is the producer's side of the contract the results extractor reads — the marker files
# (`<prefix>--skipped.json`, `--failed.json`), the manifest record, and `bench_cmd`'s timing. Changing
# a filename or a JSON key here is a change to that contract.
#
# Sourced via lib/bench.sh — do not source directly.

# --- Results helpers ---

# Absolute results directory, created if needed. Uses REPO_ROOT so results land at the repo root even
# after a task cd's elsewhere; the harness pulls this directory back out of the sandbox.
results_dir() {
	local dir="${BENCHMARK_RESULTS_DIR:-${REPO_ROOT:-.}/benchmark-results}"
	mkdir -p "$dir"
	echo "$dir"
}

# Derive a result filename from the calling task's path, e.g.
#   /.mise/tasks/benchmark/cpu/info → cpu-info     (+ "--<suffix>" when given).
task_result_name() {
	local suffix="${1:-}"
	# The task script is at the bottom of the BASH_SOURCE stack (this helper may be several frames up).
	local script_path="${BASH_SOURCE[${#BASH_SOURCE[@]} - 1]}"
	local tasks_dir="${REPO_ROOT}/.mise/tasks/benchmark/"
	local relative="${script_path#"$tasks_dir"}"
	local name="${relative//\//-}"
	[ -n "$suffix" ] && name="${name}--${suffix}"
	echo "$name"
}

# Minimal JSON string escaping (backslash + double quote) for the hand-built records below.
_json_escape() {
	local s="${1//\\/\\\\}"
	s="${s//\"/\\\"}"
	printf '%s' "$s"
}

# Record a deliberately-skipped benchmark (instead of a bare `exit 0`) so the normalizer can tell
# "skipped" apart from "broken". The marker is keyed to <name> (defaulting to the calling task's
# derived result name) so `<name>--skipped.json` is the exact negative of the `<name>.xml` a successful
# run would have written. PTS paths pass their result prefix (e.g. `pts_node-web-tooling`) for that
# pairing. Usage: skip_result <reason> [name]
skip_result() {
	local reason="$1" name="${2:-}"
	[ -n "$name" ] || name="$(task_result_name)"
	printf '{"schema_version":"1.0","benchmark":"%s","skipped":true,"skip_reason":"%s"}\n' \
		"$(_json_escape "$name")" "$(_json_escape "$reason")" \
		>"$(results_dir)/${name}--skipped.json"
	echo "SKIPPED: ${reason}"
}

# Record that a leaf RAN and errored — the failure sibling of skip_result, writing the
# `--failed.json` marker the normalizer folds into a suite-scope failed gap (the filename suffix
# decides the outcome; the body carries the leaf identity and reason). Best-effort write: the marker
# is the paper trail for a failure the caller is about to propagate anyway, so a results-dir hiccup
# must not replace that failure with a filesystem error.
# Usage: fail_result <reason> [name]
fail_result() {
	local reason="$1" name="${2:-}"
	[ -n "$name" ] || name="$(task_result_name)"
	printf '{"schema_version":"1.0","outcome":"failed","benchmark":"%s","reason":"%s"}\n' \
		"$(_json_escape "$name")" "$(_json_escape "$reason")" \
		>"$(results_dir)/${name}--failed.json" 2>/dev/null || true
	echo "FAILED: ${reason}"
}

# Append one measurement to manifest.ndjson — a uniform machine-readable log every timing helper
# writes, independent of the tool-specific output the benchmark itself produces.
_manifest_record() {
	local prefix="$1" label="$2" ms="$3" exit_code="$4" started_at="$5"
	printf '{"schema_version":"1.0","benchmark":"%s","label":"%s","duration_ms":%s,"exit_code":%s,"started_at":"%s"}\n' \
		"$(_json_escape "$prefix")" "$(_json_escape "$label")" "$ms" "$exit_code" "$started_at" \
		>>"$(results_dir)/manifest.ndjson"
}

# Current time in milliseconds, portably. GNU date supports nanoseconds (`%N`); BSD/macOS date does
# not and echoes a literal "%N", so fall back to whole-second precision there (the real measurement
# runs on the Linux sandbox; this just keeps local testing from producing a bash arithmetic error).
_now_ms() {
	local ns
	ns=$(date +%s%N 2>/dev/null)
	case "$ns" in
	*N | "") echo $(($(date +%s) * 1000)) ;;
	*) echo $((ns / 1000000)) ;;
	esac
}

# Time a command, tee its output to <prefix>.log, and record timing. Never aborts.
# Writes: <prefix>.log, <prefix>_ms.txt, <prefix>-exit-code.txt (on failure), a manifest record.
# Usage: bench_cmd <label> <results-prefix> <command...>
bench_cmd() {
	local label="$1" prefix="$2"
	shift 2
	local dir
	dir="$(results_dir)"

	echo "=== ${label} ==="

	local start end ms exit_code started_at
	started_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
	start=$(_now_ms)
	local prev_errexit=0
	[[ $- == *e* ]] && prev_errexit=1
	set +e
	"$@" 2>&1 | tee "${dir}/${prefix}.log"
	exit_code=${PIPESTATUS[0]}
	((prev_errexit)) && set -e
	end=$(_now_ms)

	ms=$((end - start))
	echo "${ms}" >"${dir}/${prefix}_ms.txt"

	if [ "$exit_code" -ne 0 ]; then
		echo "WARNING: ${label} exited with code ${exit_code}"
		echo "$exit_code" >"${dir}/${prefix}-exit-code.txt"
	fi
	_manifest_record "$prefix" "$label" "$ms" "$exit_code" "$started_at"

	echo "${label} completed in ${ms}ms (exit code: ${exit_code})"
	return 0
}
