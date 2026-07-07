#!/usr/bin/env bash
# Shared helpers for the in-sandbox benchmark producer. Source from any mise task under
# /.mise/tasks/benchmark/**:
#   REPO_ROOT="$(git -C "$(dirname "${BASH_SOURCE[0]}")" rev-parse --show-toplevel)"
#   source "${REPO_ROOT}/lib/bench.sh"
#
# Error-mode conventions (every task follows one):
#   1. Orchestrators (run_task + summary):        set -uo pipefail   (NO -e: run every child, report
#      at the end; run_task isolates failures and summary exits non-zero if any failed).
#   2. Measurement leaves (run_pts_benchmark/bench_cmd): set -euo pipefail  (the measured command is
#      isolated by bench_cmd; -e only guards the scaffolding around it).
#   3. Tolerant probes (cpu/info, cpu/cache):     set -uo pipefail   ("print whatever this runner
#      exposes, never fail" — built on try/get).
#
# This slice ships the cpu-node path (info, cache, PTS node-web-tooling). Helpers stay safe to call
# from `set -e` scripts: wrap anything that may legitimately fail in `|| true` or a conditional.

# --- Tolerant probes ---

# Run a command; on failure print why and return 0 (never abort).
try() {
	"$@" 2>/dev/null && return 0
	local rc=$?
	if [ "$rc" -eq 127 ]; then echo "(${1} not found)"; else echo "(${1} failed — exit $rc)"; fi
	return 0
}

# Echo command output, or a fallback value on failure/empty.
get() {
	local fallback="$1"
	shift
	local out
	if out=$("$@" 2>/dev/null) && [ -n "$out" ]; then echo "$out"; else echo "$fallback"; fi
}

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

# --- Phoronix Test Suite (PTS) helpers ---

# Locate PTS's data directory. PTS uses $HOME/.phoronix-test-suite for an unprivileged user but
# /var/lib/phoronix-test-suite for root (the case on sandbox runners). Detected by core.pt2so, which
# pts_init guarantees exists. Cached for the shell.
_pts_user_dir_cached=""
pts_init() {
	# system-info is cheap and writes core.pt2so on first run; swallow all output.
	phoronix-test-suite system-info >/dev/null 2>&1 || true
}
pts_user_dir() {
	if [ -n "$_pts_user_dir_cached" ]; then
		echo "$_pts_user_dir_cached"
		return 0
	fi
	local cand dir="${HOME}/.phoronix-test-suite"
	for cand in "${HOME}/.phoronix-test-suite" "/var/lib/phoronix-test-suite" "/root/.phoronix-test-suite"; do
		if [ -e "${cand}/core.pt2so" ]; then
			dir="$cand"
			break
		fi
	done
	_pts_user_dir_cached="$dir"
	echo "$dir"
}

# Configure PTS batch mode in the current process. Must run before batch-run, since mise subtasks
# don't inherit the parent's env.
_configure_pts_batch() {
	# Disable PTS system monitoring. With MONITOR set, PTS appends sensor <Result> nodes to
	# composite.xml that carry an empty <Identifier> and a non-numeric, <Parent>-linked <Value>; that
	# shape makes the results parser (parsePtsComposite) throw and abort extraction of the whole file.
	# The readings are host-level sensors anyway (unattributable for provider comparison). Unset any
	# value inherited from the image/harness env defensively — the producer never sets it.
	unset MONITOR PERFORMANCE_PER_WATT
	export TEST_RESULTS_NAME=benchmark
	export TEST_RESULTS_DESCRIPTION=ci
	export TEST_RESULTS_IDENTIFIER=ci
	# FORCE_TIMES_TO_RUN=1 pins every test to a single pass (fast, but no in-sandbox repeats to
	# aggregate). The sandbox harness sets PTS_RESPECT_TIMES_TO_RUN=1 to opt out, so PTS honours each
	# profile's TimesToRun (3 by default) and writes the repeated samples our normalizer reads from
	# RawString — the statistical confidence we want there.
	if [ -z "${PTS_RESPECT_TIMES_TO_RUN:-}" ]; then
		export FORCE_TIMES_TO_RUN=1
	fi
	# batch-setup answers: SaveResults, OpenBrowser, UploadResults, PromptForTestIdentifier,
	# PromptForTestDescription, PromptSaveName, RunAllTestCombinations.
	printf 'y\nn\nn\nn\nn\nn\ny\n' | phoronix-test-suite batch-setup 2>/dev/null || true
}

# Ensure phoronix-test-suite is available, configuring batch mode. The toolchain image bakes PTS, so
# this normally just configures batch mode; the apt fallback is for stock images. Returns 1 (without
# aborting) when PTS can't be made available, so the caller can skip rather than fail.
ensure_pts() {
	if ! command -v phoronix-test-suite &>/dev/null; then
		echo "phoronix-test-suite not found, attempting install..."
		if command -v apt-get &>/dev/null; then
			local pts_version="10.8.4"
			local deb_url="https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${pts_version}/phoronix-test-suite_${pts_version}_all.deb"
			local tmp_deb
			tmp_deb="$(mktemp /tmp/pts-XXXXXX.deb)"
			# Group with `|| true` so a failed install can't abort a caller running under `set -e` —
			# ensure_pts's contract is to return 1 gracefully so the caller can skip.
			(curl -fsSL "$deb_url" -o "$tmp_deb" &&
				${SUDO:-} apt-get update -qq &&
				${SUDO:-} apt-get install -y -qq php-cli php-xml &&
				${SUDO:-} dpkg -i "$tmp_deb") || true
			rm -f "$tmp_deb"
		fi
	fi
	if ! command -v phoronix-test-suite &>/dev/null; then
		echo "(could not install phoronix-test-suite, skipping PTS benchmarks)"
		return 1
	fi
	_configure_pts_batch
	return 0
}

# Install and run one PTS test, capturing timing via bench_cmd and copying the result XML to
# benchmark-results/<prefix>.xml (the contract the results extractor reads).
# Usage: run_pts_benchmark <test-name> <results-prefix>
run_pts_benchmark() {
	local test_name="$1" prefix="$2"
	_configure_pts_batch

	echo "=== Installing PTS test: ${test_name} ==="
	phoronix-test-suite batch-install "$test_name" 2>&1 || {
		echo "WARNING: PTS install of ${test_name} failed"
		skip_result "PTS install of ${test_name} failed" "$prefix"
		return 0
	}

	bench_cmd "PTS: ${test_name}" "$prefix" phoronix-test-suite batch-run "$test_name"

	# PTS saves results under <data-dir>/test-results/<name>/composite.xml. The name is set by
	# TEST_RESULTS_NAME but PTS may append a -1/-2 suffix if the dir exists — copy the newest.
	local pts_base xml_found=""
	pts_base="$(pts_user_dir)/test-results"
	if [ -d "$pts_base" ]; then
		# `find … -exec ls -t {} +` is portable (no GNU `-printf`, which crashes BSD/macOS `find` under
		# `set -e`) and runs `ls -t` only when matches exist (so an empty match can't list `.` and copy a
		# stray file). `ls -t` orders newest-first; head -1 takes it.
		# Scope to benchmark-named result dirs (TEST_RESULTS_NAME=benchmark, plus PTS's -1/-2 suffixes)
		# so a stray composite.xml under another result name can't be misattributed as suites accumulate.
		xml_found=$(find "$pts_base" -path "*benchmark*/composite.xml" -exec ls -t {} + 2>/dev/null | head -1)
	fi
	if [ -n "$xml_found" ] && [ -f "$xml_found" ]; then
		cp "$xml_found" "$(results_dir)/${prefix}.xml" 2>/dev/null || true
		echo "Structured result: ${prefix}.xml (from $(dirname "$xml_found"))"
		# Capture the whole result dir (composite.xml + installation-logs/ + test-logs/) as a forensics
		# tarball for debugging. A .tar.gz — not a flattened copy — so its nested .xml files can't be
		# misrouted by the extractor (the name ends --forensics.tar.gz, which isPtsResultFile never
		# matches). `|| true` so a /var/lib perms hiccup can't abort this `set -e` measurement leaf.
		local result_dir
		result_dir="$(dirname "$xml_found")"
		tar -czf "$(results_dir)/${prefix}--forensics.tar.gz" \
			-C "$(dirname "$result_dir")" "$(basename "$result_dir")" 2>/dev/null || true
	else
		echo "No PTS composite.xml found under ${pts_base}/"
		ls -la "$pts_base"/ 2>/dev/null || true
		# batch-run exited 0 but produced no composite.xml. Record a skip marker keyed to the result
		# prefix so the collector/normalizer sees an explicit "ran, produced nothing" rather than the
		# silent absence of any file — which a bare success would otherwise report as green.
		skip_result "PTS batch-run of ${test_name} produced no composite.xml" "$prefix"
	fi
	return 0
}

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
