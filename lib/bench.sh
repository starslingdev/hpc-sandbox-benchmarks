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

# The toolchain bakes profiles as root under /var/lib, but E2B-compatible providers inject an
# unprivileged runtime user. PTS 10.8.4 supports this official override when the directory exists.
# Set it here as a fallback in case an image importer strips the Docker ENV; the harness preamble does
# the same before setup/smoke commands, so all PTS call sites see one registry.
if [ -d /var/lib/phoronix-test-suite ]; then
	export PTS_USER_PATH_OVERRIDE=/var/lib/phoronix-test-suite/
fi

# Locate PTS's effective data directory. Prefer its supported override, then probe legacy root/user
# locations by core.pt2so, which pts_init guarantees exists. Cached for the shell.
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
	local cand dir="${PTS_USER_PATH_OVERRIDE:-${HOME}/.phoronix-test-suite}"
	for cand in "${PTS_USER_PATH_OVERRIDE:-}" "${HOME}/.phoronix-test-suite" "/var/lib/phoronix-test-suite" "/root/.phoronix-test-suite"; do
		[ -n "$cand" ] || continue
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
# root, user-config.xml is the file PTS never touches, and /etc is the live config. An unprivileged
# run falls through to ${PTS_USER_PATH}/user-config.xml (the baked override here) — and even then a
# writable /etc/phoronix-test-suite.xml, if one exists, still wins.
pts_config_file() {
	if { [ -w /var/lib ] && [ -w /etc ]; } || [ -w /etc/phoronix-test-suite.xml ]; then
		echo /etc/phoronix-test-suite.xml
		return 0
	fi
	echo "$(pts_user_dir)/user-config.xml"
}

# Ask PTS whether the fully-qualified profile is installed. The on-disk manifest name is an internal,
# version-dependent detail (10.8.4 writes pts-install.json; older releases wrote .xml), while this is
# the same public command the image bake uses to verify every preinstalled profile.
_pts_is_installed() {
	phoronix-test-suite list-installed-tests 2>/dev/null | awk '{print $1}' | grep -qxF -- "$1"
}

# Installation failures are otherwise opaque because PTS can exit 0 after a compiler/dependency
# failure. Emit its own installed list, candidate data roots, and the newest install-failed.log. This
# is diagnostic-only and callers run it best-effort, so it cannot turn an honest skip into a crash.
_pts_install_diagnostics() {
	local test_name="$1"
	# Build this list at call time: provider preambles can change HOME or the supported PTS override
	# after bench.sh is sourced. Normalize trailing slashes and deduplicate before handing the roots to
	# find, otherwise the baked /var/lib override is traversed twice and every diagnostic is repeated.
	local d existing seen pts_dir
	local -a data_dirs=()
	for d in "${PTS_USER_PATH_OVERRIDE:-${HOME}/.phoronix-test-suite}" "${HOME}/.phoronix-test-suite" /var/lib/phoronix-test-suite /root/.phoronix-test-suite; do
		[ -n "$d" ] || continue
		[ "$d" = "/" ] || d="${d%/}"
		seen=0
		for existing in "${data_dirs[@]}"; do
			if [ "$existing" = "$d" ]; then
				seen=1
				break
			fi
		done
		[ "$seen" -eq 1 ] || data_dirs+=("$d")
	done

	# Initialize before the first pts_user_dir lookup so its process-lifetime cache records the data
	# directory PTS actually selected, rather than a pre-initialization fallback.
	pts_init
	pts_dir="$(pts_user_dir)"
	echo "--- PTS install diagnostics: ${test_name} ---"
	echo "user=$(id -un 2>/dev/null) HOME=${HOME}"
	echo "resolved pts_user_dir=${pts_dir}"
	echo "resolved pts_config_file=$(pts_config_file)"
	for d in "${data_dirs[@]}"; do
		[ -e "$d/core.pt2so" ] && echo "  core.pt2so present in: $d"
	done
	echo "  phoronix-test-suite list-installed-tests:"
	phoronix-test-suite list-installed-tests 2>/dev/null | sed 's/^/    /' || true
	echo "  install manifests on disk:"
	find "${data_dirs[@]}" -maxdepth 5 \( -name pts-install.json -o -name pts-install.xml \) \
		2>/dev/null | sed 's/^/    /' || true
	echo "  installed-tests tree (${pts_dir}/installed-tests):"
	find "${pts_dir}/installed-tests" -maxdepth 3 2>/dev/null | sed 's/^/    /' | head -40 || true
	local log
	log=$(find "${data_dirs[@]}" -name install-failed.log -exec ls -t {} + 2>/dev/null | head -1)
	if [ -n "$log" ] && [ -f "$log" ]; then
		echo "  install-failed.log ($log), last 40 lines:"
		tail -40 "$log" 2>/dev/null | sed 's/^/    /' || true
	else
		echo "  (no install-failed.log found under any candidate data dir)"
	fi
	echo "--- end diagnostics ---"
}

# Profile names become both source and destructive destination paths below. Restrict them to one
# ordinary path segment before either function reaches rm -rf.
_pts_profile_name_is_safe() {
	[[ "$1" =~ ^[a-z0-9][a-z0-9._-]*$ ]]
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
	# FORCE_TIMES_TO_RUN=1 pins contract-verification runs to a single pass. Published sandbox runs
	# export PTS_RESPECT_TIMES_TO_RUN=1 plus a per-suite FORCE_TIMES_TO_RUN (k) in the harness preamble
	# (Suite.ptsTimesToRun: realworld k=1, long synthetic k=2), while disabling PTS's adaptive
	# variance policy (which otherwise expanded noisy fio cases to 20-40 runs and exhausted the suite).
	# Between-sandbox variance is captured by REPLICATE sandboxes, not by more in-sandbox passes.
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
			# ensure_pts's contract is to return 1 gracefully so the caller can skip. This is the
			# last-resort stock-image path; keep the package set aligned with setup.ts and 00-apt.sh.
			# php for PTS itself, the build toolchain for the source-built profiles, libaio-dev (fio's
			# Linux AIO engine), libicu-dev (postgres), tcl (sqlite), stress-ng (hardlink), and probes.
			(curl -fsSL "$deb_url" -o "$tmp_deb" &&
				${SUDO:-} apt-get -o Acquire::Retries=3 update -qq &&
				${SUDO:-} apt-get install -y -qq php-cli php-xml build-essential autoconf flex bison bc \
					libelf-dev libssl-dev libaio-dev libicu-dev dnsutils jq netcat-openbsd iputils-ping \
					tcl stress-ng unzip procps &&
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
	if ! _pts_profile_name_is_safe "$name"; then
		echo "ERROR: install_local_pts_profile: invalid profile name: ${name}" >&2
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

# Stage a vendored override for one pinned upstream `pts/` profile and discard the baked installed
# copy so run_pts_benchmark verifies and installs the override. This preserves the upstream
# `pts/<name>` identifier (and therefore the catalog join key) while letting us repair a broken
# runner reproducibly instead of depending on a mutable OpenBenchmarking copy.
# Usage: install_vendored_pts_profile <name-version>
install_vendored_pts_profile() {
	local name="${1:-}"
	if [ -z "$name" ]; then
		echo "ERROR: install_vendored_pts_profile requires a profile name" >&2
		return 1
	fi
	if ! _pts_profile_name_is_safe "$name"; then
		echo "ERROR: install_vendored_pts_profile: invalid profile name: ${name}" >&2
		return 1
	fi
	local src="${REPO_ROOT}/packages/schema/src/pts-profiles/${name}"
	if [ ! -d "$src" ]; then
		echo "ERROR: install_vendored_pts_profile: source profile not found: ${src}" >&2
		return 1
	fi

	pts_init
	local pts_dir profile_dst installed_dst
	pts_dir="$(pts_user_dir)"
	profile_dst="${pts_dir}/test-profiles/pts/${name}"
	installed_dst="${pts_dir}/installed-tests/pts/${name}"
	mkdir -p "$(dirname "$profile_dst")"
	rm -rf "$profile_dst"
	cp -r "$src" "$profile_dst"
	# The image bakes the upstream profile. Removing only this pinned install makes the ordinary
	# run_pts_benchmark path reinstall our staged source and retain all of its exit/registry checks.
	rm -rf "$installed_dst"

	echo "Staged vendored PTS override: ${profile_dst} (removed ${installed_dst})"
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

	# Skip the install for a profile PTS itself reports installed. Do not infer this from an internal
	# manifest filename; `_pts_is_installed` is version-agnostic and matches the bake verification.
	pts_init
	if _pts_is_installed "$test_name"; then
		echo "=== PTS test already installed (baked): ${test_name} ==="
	else
		echo "=== Installing PTS test: ${test_name} ==="
		phoronix-test-suite batch-install "$test_name" 2>&1 || {
			echo "WARNING: PTS install of ${test_name} failed"
			( set +e; _pts_install_diagnostics "$test_name" ) || true
			skip_result "PTS install of ${test_name} failed" "$prefix"
			return 0
		}
		# PTS can exit 0 even when compilation failed, so verify through its installed-test registry.
		if ! _pts_is_installed "$test_name"; then
			echo "WARNING: PTS reported success but ${test_name} is not installed"
			( set +e; _pts_install_diagnostics "$test_name" ) || true
			skip_result "PTS install of ${test_name} failed (exit 0, not in list-installed-tests)" "$prefix"
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
		# Preserve PTS's own structured system record too. composite.xml carries Hardware/Software as
		# comma-delimited prose; result-file-to-json expands those into component maps and also retains
		# PTS's timestamp, client version, user, notes and collected JSON data. OUTPUT_FILE is an exact
		# path in PTS 10.8.4, so every leaf gets a deterministic sibling that cannot collide with the
		# metric XML predicate. Metadata export is provenance: warn but do not void a valid benchmark if
		# an older/partial PTS install lacks the command.
		local result_dir pts_metadata_file
		result_dir="$(dirname "$xml_found")"
		pts_metadata_file="$(results_dir)/${prefix}--metadata.json"
		if OUTPUT_FILE="$pts_metadata_file" phoronix-test-suite result-file-to-json "$(basename "$result_dir")" >/dev/null 2>&1 && [ -s "$pts_metadata_file" ]; then
			echo "Structured host metadata: ${prefix}--metadata.json"
		else
			echo "WARNING: PTS structured metadata export failed for ${test_name}" >&2
			rm -f "$pts_metadata_file"
		fi
		# Capture the whole result dir (composite.xml + installation-logs/ + test-logs/) as a forensics
		# tarball for debugging. A .tar.gz — not a flattened copy — so its nested .xml files can't be
		# misrouted by the extractor (the name ends --forensics.tar.gz, which isPtsResultFile never
		# matches). `|| true` so a /var/lib perms hiccup can't abort this `set -e` measurement leaf.
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
	local dir probe cache choice
	# Without PTS the answer is irrelevant (the leaf's availability guard skips before running fio) —
	# return without probing OR caching, so a dep-less dry run can't persist a verdict probed against
	# the wrong filesystem for a later, properly-provisioned run to reuse.
	if ! command -v phoronix-test-suite >/dev/null 2>&1; then
		echo "No"
		return 0
	fi
	# Each mise leaf is a fresh process, so cache the answer for the suite run — the filesystem's
	# O_DIRECT support cannot change between the four scenarios, and each probe otherwise pays a
	# pts_init (a multi-second PTS PHP invocation) per leaf. Cached under /tmp (per-sandbox,
	# ephemeral), NOT results_dir: the harness tars results_dir back verbatim into the curated raw
	# tree, and a bash-internal dotfile must not ship as a dataset artifact.
	cache="${TMPDIR:-/tmp}/.bench-fio-direct-choice"
	if [ -f "$cache" ]; then
		cat "$cache"
		return 0
	fi
	# pts_init BEFORE pts_user_dir (the install_local_pts_profile precedent): this probe is the fio
	# leaf's first PTS-dir touch, and on a stock image with no core.pt2so yet the detector would
	# cache the $HOME fallback for the whole shell — batch-run then writes results under
	# /var/lib/phoronix-test-suite while run_pts_benchmark's composite finder searches the stale
	# cached dir and records a bogus "produced no composite.xml" skip for every scenario.
	pts_init
	dir="$(pts_user_dir)"
	mkdir -p "$dir"
	probe="${dir}/.o-direct-probe"
	# bs=4096, not 512: O_DIRECT requires logical-sector alignment, so a 512-byte write EINVALs on a
	# 4Kn-sector filesystem even where the real scenarios' 4KB/1MB blocks would run fine. 4096 is
	# aligned on both 512e and 4Kn and matches the smallest fio scenario block size.
	if dd if=/dev/zero of="$probe" bs=4096 count=1 oflag=direct >/dev/null 2>&1; then
		choice="Yes"
	else
		choice="No"
	fi
	rm -f "$probe"
	echo "$choice" >"$cache"
	echo "$choice"
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
# the SHARED install.sh + runner + realworld-env.sh overlaid from lib/pts/realworld/ (the profiles
# vendor only XML + target.env — no per-profile scripts to drift), then batch-run it. The single
# body behind every benchmark:realworld:pts:<repo> mise leaf.
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
		"${REPO_ROOT}/lib/pts/realworld/realworld-runner.sh" \
		"${REPO_ROOT}/lib/pts/realworld/realworld-env.sh"

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
