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
	# Pin the batch run queue to each profile's natural (menu) order. PTS's AutoSortRunQueue
	# otherwise usort()s the queue (pts_test_run_manager.php) — effectively arbitrary within one
	# test's option matrix — which would run build-dependent tasks before the measured `build`
	# their unmeasured prep replays (correct either way, but the prep then pays a full rebuild).
	export TEST_EXECUTION_SORT=none
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
	#
	# The last answer is overridable because PTS's batch runner consults PRESET_OPTIONS ONLY when
	# RunAllTestCombinations is off (pts_test_run_manager::test_prompts_to_result_objects) — a
	# pinned-scenario caller (run_fio_pts) exports PTS_RUN_ALL_TEST_COMBINATIONS=n around its run, and
	# the next unpinned caller's reconfigure restores the run-all default the option-matrix suites
	# (STREAM's Type axis, the realworld Task axis, compress-zstd's levels) rely on.
	printf 'y\nn\nn\nn\nn\nn\n%s\n' "${PTS_RUN_ALL_TEST_COMBINATIONS:-y}" | phoronix-test-suite batch-setup 2>/dev/null || true
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

# Install a repo-local PTS profile (packages/schema/src/pts-profiles/local/<name>) into PTS's
# local-profile dir, so `phoronix-test-suite batch-install local/<name>` can find it — PTS won't fetch
# a repo-local profile itself. The dir depends on the run user ($HOME/.phoronix-test-suite vs
# /var/lib/... for root); pts_init creates it and pts_user_dir locates it, so installing elsewhere
# makes PTS reject it with "Invalid Argument: local/<name>". Any `overlay-file` args are copied into
# the installed dir alongside the vendored XML+install.sh — for a runner script shared across several
# profiles (kept once with the rest of the producer bash, not duplicated per-profile in schema).
# Usage: install_local_pts_profile <name> [overlay-file...]
install_local_pts_profile() {
	# Empty name would make dst the whole local-profile dir — which rm -rf below would wipe.
	local name="${1:-}"
	if [ -z "$name" ]; then
		echo "ERROR: install_local_pts_profile requires a profile name" >&2
		return 1
	fi
	shift
	local src="${REPO_ROOT}/packages/schema/src/pts-profiles/local/${name}"
	# Fail before the rm -rf below: a missing source (typo'd name, wrong REPO_ROOT) must not delete
	# the previously-installed copy.
	if [ ! -d "$src" ]; then
		echo "ERROR: install_local_pts_profile: source profile not found: ${src}" >&2
		return 1
	fi

	pts_init
	local pts_dir dst
	pts_dir="$(pts_user_dir)"
	dst="${pts_dir}/test-profiles/local/${name}"
	mkdir -p "$(dirname "$dst")"
	rm -rf "$dst"
	cp -r "$src" "$dst"

	local overlay
	for overlay in "$@"; do
		cp "$overlay" "$dst/"
	done

	echo "Installed local PTS profile: ${dst} (PTS data dir: ${pts_dir})"
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

# Whether the filesystem PTS's fio writes its test files to supports O_DIRECT: echoes the fio
# profile's Direct option NAME ("Yes"/"No"). Probed with dd against the PTS data dir (the same
# filesystem installed-tests/.../fiofile lands on) because sandbox filesystems differ here — overlay
# and gVisor gofer mounts can reject O_DIRECT outright, and a hard fio failure would void the whole
# scenario. The chosen mode is part of the fio option matrix, so it travels in the metric identity
# (each scenario has an O_DIRECT and a buffered catalog variant) instead of being silently mixed.
fio_direct_choice() {
	local dir probe
	dir="$(pts_user_dir)"
	mkdir -p "$dir"
	probe="${dir}/.o-direct-probe"
	if dd if=/dev/zero of="$probe" bs=512 count=1 oflag=direct >/dev/null 2>&1; then
		rm -f "$probe"
		echo "Yes"
	else
		rm -f "$probe"
		echo "No"
	fi
}

# Run ONE PTS test with a fully-pinned option combination. PRESET_OPTIONS pins every axis so
# batch-run executes exactly one combination instead of the profile's whole matrix. Owns the
# phoronix-test-suite availability guard (like run_realworld_pts), so pinned leaves don't replicate it.
#
# RunAllTestCombinations MUST be off for the run: PTS's batch path only consults PRESET_OPTIONS on
# that branch (pts_test_run_manager::test_prompts_to_result_objects) — with the repo's run-all default
# it ignores the presets and fans out the full option matrix (for fio, hundreds of 60s runs).
# PTS_RUN_ALL_TEST_COMBINATIONS=n reaches batch-setup via _configure_pts_batch INSIDE
# run_pts_benchmark (setting the config before the call would be undone by that reconfigure); the
# next unpinned PTS child's reconfigure restores the run-all default the option-matrix suites rely on.
# batch-setup's failure is swallowed elsewhere (harmless when the answers only re-assert the default),
# but pinned semantics DEPEND on the flip landing on disk — so verify it and skip rather than let a
# silently-ignored preset fan out the matrix until the suite timeout kills the cell.
#
# Preset values are the runtime option NAMES (PTS matches non-numeric presets by entry name), with
# ONE trap: a NUMERIC preset that is < the menu's entry count is interpreted as a 0-based menu INDEX,
# never a name (pts_test_option::is_valid_select_choice) — pin small numeric menus by index, larger
# numeric names (pgbench's "100"/"50") match by name because they exceed the entry count.
# Usage: run_pinned_pts <versioned-test> <results-prefix> <preset-options>
run_pinned_pts() {
	local test_name="$1" prefix="$2" presets="$3"
	if ! command -v phoronix-test-suite &>/dev/null; then
		skip_result "phoronix-test-suite not installed" "$prefix"
		return 0
	fi

	export PTS_RUN_ALL_TEST_COMBINATIONS=n
	export PRESET_OPTIONS="$presets"
	_configure_pts_batch
	# The user config lives at /etc/phoronix-test-suite.xml for root (the sandbox case) or under
	# $HOME for unprivileged runs; check whichever exists. run_pts_benchmark re-runs the (idempotent)
	# batch-setup, so verifying here covers the write it performs too.
	local cfg verified=""
	for cfg in /etc/phoronix-test-suite.xml "${HOME}/.phoronix-test-suite/user-config.xml"; do
		if [ -f "$cfg" ] && grep -q "<RunAllTestCombinations>FALSE</RunAllTestCombinations>" "$cfg"; then
			verified=1
			break
		fi
	done
	if [ -z "$verified" ]; then
		skip_result "could not disable RunAllTestCombinations (batch-setup failed?) — refusing to fan out the full ${test_name} option matrix" "$prefix"
		unset PRESET_OPTIONS PTS_RUN_ALL_TEST_COMBINATIONS
		return 0
	fi

	run_pts_benchmark "$test_name" "$prefix"
	unset PRESET_OPTIONS PTS_RUN_ALL_TEST_COMBINATIONS
}

# Run ONE pinned pts/fio scenario; Direct comes from fio_direct_choice above.
#
# Axis notes on top of run_pinned_pts's rules: "Job Count" is a numeric menu expanded from the
# machine's core count at run time (cpu-threads: 1,2,…,N), so it must be pinned by INDEX 0 — the
# first entry, name "1" on every machine ("cpu-threads=1" would select index 1 = "Job Count: 2").
# "Disk Target" is also runtime-expanded (auto-disk-mount-points) but pins cleanly by name:
# "Default Test Directory" always exists. These are the same pins the catalog generator synthesizes
# descriptions for. Version-pinned (unlike the older versionless leaves): the catalog vendors
# fio-2.1.0's exact option matrix and PRESET_OPTIONS addresses its axes by identifier, so a
# versionless install resolving to a newer upstream fio would silently unmap every description. Keep
# in lockstep with packages/schema/src/pts-profiles/fio-2.1.0 (and the golden fixture) when bumping.
# Usage: run_fio_pts <type-name> <block-size-name> <results-prefix>   (e.g. "Sequential Read" 1MB pts_fio-seq-read)
run_fio_pts() {
	local type_name="$1" bs_name="$2" prefix="$3"
	local direct
	direct="$(fio_direct_choice)"
	echo "fio scenario: Type=${type_name} Block Size=${bs_name} Direct=${direct} (O_DIRECT probe)"

	run_pinned_pts "pts/fio-2.1.0" "$prefix" \
		"fio.type=${type_name};fio.engine=Linux AIO;fio.direct=${direct};fio.size=${bs_name};fio.cpu-threads=0;fio.auto-disk-mount-points=Default Test Directory"
}

# Run one realworld suite end to end: gate on the toolchain, install the repo-local profile with
# the SHARED install.sh + runner overlaid from lib/pts/realworld/ (the profiles vendor only
# XML + target.env — no per-profile scripts to drift), then batch-run it. The single body behind
# every benchmark:realworld:pts:<repo> mise leaf.
# Usage: run_realworld_pts <repo>   (repo = mastra | better-auth | openclaw)
run_realworld_pts() {
	local repo="$1"
	local profile="realworld-${repo}-1.0.0"
	local prefix="pts_realworld-${repo}"

	if ! command -v phoronix-test-suite &>/dev/null; then
		skip_result "phoronix-test-suite not installed" "$prefix"
		return 0
	fi
	if ! command -v node &>/dev/null; then
		skip_result "node not installed" "$prefix"
		return 0
	fi

	install_local_pts_profile "$profile" \
		"${REPO_ROOT}/lib/pts/realworld/install.sh" \
		"${REPO_ROOT}/lib/pts/realworld/realworld-runner.sh"

	run_pts_benchmark "local/${profile}" "$prefix"
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
