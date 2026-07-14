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

# Resolve the config file PTS itself reads and writes, mirroring its own selection order
# (pts_config::get_config_file_location + pts_config_nye_XmlReader::__construct, v10.8.4). PTS sets
# PTS_IS_DAEMONIZED_SERVER_PROCESS whenever /var/lib AND /etc are both writable — i.e. whenever it
# runs as root, which is every sandbox provider here — and in that mode it uses
# /etc/phoronix-test-suite.xml UNCONDITIONALLY, without so much as probing the user dir. So under
# root, user-config.xml is the file PTS never touches, and /etc is the live config. Only an
# unprivileged run falls through to ${PTS_USER_PATH}/user-config.xml — and even then a writable
# /etc/phoronix-test-suite.xml, if one exists, still wins.
pts_config_file() {
	if { [ -w /var/lib ] && [ -w /etc ]; } || [ -w /etc/phoronix-test-suite.xml ]; then
		echo /etc/phoronix-test-suite.xml
		return 0
	fi
	echo "$(pts_user_dir)/user-config.xml"
}

# Dump the PTS on-disk layout and the most recent install-failed.log when an install did not land its
# pts-install.xml. Distinguishes the two failure shapes that both surface as "not installed": a real
# build failure (install-failed.log names the missing dependency / compiler error) versus a data-dir
# mismatch (pts-install.xml exists, but under a directory pts_user_dir did not resolve to). Prints to
# stdout so it lands in the CI job log; never fails the caller.
_pts_install_diagnostics() {
	local test_name="$1"
	echo "--- PTS install diagnostics: ${test_name} ---"
	echo "user=$(id -un 2>/dev/null) HOME=${HOME}"
	echo "resolved pts_user_dir=$(pts_user_dir)"
	echo "resolved pts_config_file=$(pts_config_file)"
	local d
	for d in "${HOME}/.phoronix-test-suite" /var/lib/phoronix-test-suite /root/.phoronix-test-suite; do
		if [ -e "$d/core.pt2so" ]; then
			echo "  core.pt2so present in: $d"
		fi
	done
	# Where did PTS actually write this test's manifest, if anywhere? A hit outside pts_user_dir is the
	# smoking gun for a data-dir mismatch.
	echo "  pts-install.xml locations for ${test_name}:"
	find "${HOME}/.phoronix-test-suite" /var/lib/phoronix-test-suite /root/.phoronix-test-suite \
		-path "*installed-tests/${test_name}/pts-install.xml" 2>/dev/null | sed 's/^/    /' || true
	# The newest install-failed.log across the candidate data dirs — its tail names the real cause.
	local log
	log=$(find "${HOME}/.phoronix-test-suite" /var/lib/phoronix-test-suite /root/.phoronix-test-suite \
		-name install-failed.log 2>/dev/null -exec ls -t {} + 2>/dev/null | head -1)
	if [ -n "$log" ] && [ -f "$log" ]; then
		echo "  install-failed.log ($log), last 40 lines:"
		tail -40 "$log" 2>/dev/null | sed 's/^/    /' || true
	else
		echo "  (no install-failed.log found under any candidate data dir)"
	fi
	echo "--- end diagnostics ---"
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
	# TEST_RESULTS_NAME is set per leaf by run_pts_benchmark (benchmark-<prefix>): PTS MERGES batch-runs
	# that share a save name into one result dir and rewrites its composite.xml even when a run produced
	# zero successful results (pts_test_run_manager::standard_run → post_execution_process), so a shared
	# name would let a failed later leaf collect an earlier leaf's merged composite as its own.
	export TEST_RESULTS_DESCRIPTION=ci
	export TEST_RESULTS_IDENTIFIER=ci
	# FORCE_TIMES_TO_RUN=1 pins every test to a single pass (fast, but no in-sandbox repeats to
	# aggregate). The sandbox harness sets PTS_RESPECT_TIMES_TO_RUN=1 to opt out, so PTS honours each
	# profile's TimesToRun (our profiles pin 2 — the floor; PTS re-runs beyond it when a test's
	# stddev stays high) and writes the repeated samples our normalizer reads from RawString — the
	# statistical confidence we want there.
	if [ -z "${PTS_RESPECT_TIMES_TO_RUN:-}" ]; then
		export FORCE_TIMES_TO_RUN=1
	fi
	# batch-setup answers: SaveResults, OpenBrowser, UploadResults, PromptForTestIdentifier,
	# PromptForTestDescription, PromptSaveName, RunAllTestCombinations.
	#
	# The last answer is overridable because PTS's batch runner consults PRESET_OPTIONS ONLY when
	# RunAllTestCombinations is off (pts_test_run_manager::test_prompts_to_result_objects) — a
	# pinned-scenario caller (run_pinned_pts) exports PTS_RUN_ALL_TEST_COMBINATIONS=n around its run,
	# and the next unpinned caller's reconfigure restores the run-all default the option-matrix suites
	# (STREAM's Type axis, the realworld Task axis, compress-zstd's levels) rely on.
	printf 'y\nn\nn\nn\nn\nn\n%s\n' "${PTS_RUN_ALL_TEST_COMBINATIONS:-y}" | phoronix-test-suite batch-setup 2>/dev/null || true
	# batch-setup's failure is swallowed above, so verify the on-disk config in BOTH directions — the
	# flip is a state change either way. A PINNED caller depends on FALSE landing (PTS would otherwise
	# ignore its presets and fan out the whole option matrix); an UNPINNED caller depends on TRUE being
	# restored after a pinned leaf left FALSE behind (a persisted FALSE with no PRESET_OPTIONS drops
	# PTS into its interactive option prompt, which loops on EOF stdin until the command timeout).
	# The config lives at /etc/phoronix-test-suite.xml for root (the sandbox case) or under $HOME for
	# unprivileged runs. Idempotent under retry: once any call has landed the wanted value on disk,
	# later verifications pass even if their own batch-setup hiccuped.
	local want cfg
	if [ "${PTS_RUN_ALL_TEST_COMBINATIONS:-y}" = "n" ]; then
		want="FALSE"
	else
		want="TRUE"
	fi
	# pts_init BEFORE the first pts_user_dir: pts_user_dir detects the data dir by probing for
	# core.pt2so and then CACHES the answer for the life of the process. This function is the first
	# thing to touch PTS in a run, so without an explicit init the probe can miss (no core.pt2so yet)
	# and permanently cache ${HOME}/.phoronix-test-suite — the wrong dir for the root sandbox, where
	# PTS keeps its state under /var/lib. Every later lookup (this check, the install probe, the
	# composite search) would then read a path PTS never writes. pts_init is idempotent and cheap.
	pts_init
	# Verify the ONE file PTS actually consults (pts_config_file), never a first-match-wins OR across
	# both candidates: a stale copy of the OTHER file holding the wanted value would green-light a
	# pinned run that then ignores PRESET_OPTIONS and fans out the whole option matrix — precisely the
	# failure this check exists to prevent. A missing config means batch-setup wrote nothing at all.
	cfg="$(pts_config_file)"
	[ -f "$cfg" ] || return 1
	grep -q "<RunAllTestCombinations>${want}</RunAllTestCombinations>" "$cfg"
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
			# The package list mirrors the harness setup fallback (packages/harness/src/lib/setup.ts):
			# php for PTS itself, the build toolchain for the source-built profiles, libaio-dev (fio's
			# Linux AIO engine), libicu-dev (postgres's configure hard-requires ICU), and the probe deps
			# — without them the profiles install "successfully" and then burn their timed runs failing.
			(curl -fsSL "$deb_url" -o "$tmp_deb" &&
				${SUDO:-} apt-get update -qq &&
				${SUDO:-} apt-get install -y -qq php-cli php-xml build-essential flex bison bc \
					libelf-dev libssl-dev libaio-dev libicu-dev dnsutils jq netcat-openbsd iputils-ping &&
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
	if ! _configure_pts_batch; then
		# batch-setup never landed a usable config (see _configure_pts_batch): batch-run would either
		# error out or fall into an interactive prompt loop that burns the whole command budget.
		skip_result "PTS batch mode could not be configured (batch-setup failed)" "$prefix"
		return 0
	fi

	# Isolate this leaf's results under its own save name (see _configure_pts_batch on why sharing one
	# name would let a failed leaf collect a predecessor's merged composite). Sanitized to the
	# lowercase-alnum-dash alphabet PTS save names pass through unchanged, so the find below matches
	# the directory PTS actually creates.
	local save_name
	save_name="benchmark-$(printf '%s' "$prefix" | tr -cs 'a-z0-9' '-')"
	export TEST_RESULTS_NAME="$save_name"

	# Skip the install for a version-pinned test that is already on disk (the toolchain image
	# pre-installs every registered profile): batch-install would only no-op through several seconds
	# of PHP. Probe the ONE data dir this PTS invocation will actually use (pts_init first, so
	# pts_user_dir doesn't cache the $HOME fallback on a fresh machine — the fio_direct_choice
	# precedent), and require the pts-install.xml manifest, not the bare directory: PTS only treats a
	# test as installed once that manifest exists, so a batch-install killed mid-build would otherwise
	# permanently disable both install and run. (Trade-off vs full batch-install: PTS's same-version
	# reinstall triggers — installer checksum, system hash — are bypassed for baked profiles.)
	local installed=""
	pts_init
	if [ -f "$(pts_user_dir)/installed-tests/${test_name}/pts-install.xml" ]; then
		installed=1
	fi
	if [ -n "$installed" ]; then
		echo "=== PTS test already installed (baked): ${test_name} ==="
	else
		echo "=== Installing PTS test: ${test_name} ==="
		phoronix-test-suite batch-install "$test_name" 2>&1 || {
			echo "WARNING: PTS install of ${test_name} failed"
			_pts_install_diagnostics "$test_name"
			skip_result "PTS install of ${test_name} failed" "$prefix"
			return 0
		}
		# PTS EXITS 0 EVEN WHEN AN INSTALL FAILS (it writes install-failed.log and moves on), so the
		# `||` branch above is dead for the common failure — a missing build dependency. Without this
		# the leaf proceeds to batch-run, burns its whole budget producing nothing, and lands on the
		# generic "produced no composite.xml" skip that names the wrong cause. Re-probe the manifest.
		if [ ! -f "$(pts_user_dir)/installed-tests/${test_name}/pts-install.xml" ]; then
			echo "WARNING: PTS reported success but ${test_name} is not installed (see install-failed.log)"
			_pts_install_diagnostics "$test_name"
			skip_result "PTS install of ${test_name} failed (exit 0, no pts-install.xml)" "$prefix"
			return 0
		fi
	fi

	# Stamp the instant before the run: the composite search below must only accept output THIS
	# batch-run wrote. Suites now run several PTS leaves in one sandbox (fio ×4 + hardlink; pybench +
	# sqlite + pgbench ×2), so a bare "newest composite" would, when a later batch-run produces
	# nothing, silently copy the PREVIOUS leaf's composite under this leaf's prefix — masking the
	# failure AND suppressing the skip marker. (A merged-into result dir still matches: PTS rewrites
	# composite.xml, updating its mtime past the stamp.)
	local run_stamp
	run_stamp="$(mktemp)"

	bench_cmd "PTS: ${test_name}" "$prefix" phoronix-test-suite batch-run "$test_name"

	# PTS saves results under <data-dir>/test-results/<name>/composite.xml. The name is set by
	# TEST_RESULTS_NAME but PTS may append a -1/-2 suffix if the dir exists — copy the newest.
	local pts_base xml_found=""
	pts_base="$(pts_user_dir)/test-results"
	if [ -d "$pts_base" ]; then
		# `find … -exec ls -t {} +` is portable (no GNU `-printf`, which crashes BSD/macOS `find` under
		# `set -e`) and runs `ls -t` only when matches exist (so an empty match can't list `.` and copy a
		# stray file). `ls -t` orders newest-first; head -1 takes it.
		# Scope to THIS leaf's save name (TEST_RESULTS_NAME=benchmark-<prefix>, plus PTS's -1/-2
		# suffixes) so another leaf's composite can never be misattributed to this one, and to files
		# newer than the pre-run stamp so a stale dir from a previous run of the SAME leaf can't stand
		# in for a failed run (see run_stamp above).
		xml_found=$(find "$pts_base" -path "*${save_name}*/composite.xml" -newer "$run_stamp" -exec ls -t {} + 2>/dev/null | head -1)
	fi
	rm -f "$run_stamp"
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
# _configure_pts_batch itself verifies the flip landed on disk when pinning is requested (returning
# non-zero on failure), so the pre-call below exists to catch that failure and skip honestly rather
# than let a silently-ignored preset fan out the matrix until the suite timeout kills the cell.
# run_pts_benchmark's own (idempotent) reconfigure re-verifies against the already-flipped config.
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
	if ! _configure_pts_batch; then
		skip_result "could not disable RunAllTestCombinations (batch-setup failed?) — refusing to fan out the full ${test_name} option matrix" "$prefix"
		unset PRESET_OPTIONS PTS_RUN_ALL_TEST_COMBINATIONS
		return 0
	fi

	run_pts_benchmark "$test_name" "$prefix"
	unset PRESET_OPTIONS PTS_RUN_ALL_TEST_COMBINATIONS
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
