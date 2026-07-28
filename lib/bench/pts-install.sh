#!/usr/bin/env bash
# Phoronix Test Suite: making it available and configured.
#
# Everything up to the point where a benchmark can be RUN — locating PTS's data directory, the batch
# config, install diagnostics, profile seeding from the vendored/local trees, and the numeric-value
# assertion that catches a "successful" run which produced nothing. Execution lives in ./pts-run.sh.
#
# Sourced via lib/bench.sh — do not source directly.

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
	# Pass-count policy, set by the harness preamble (buildPreamble → ptsTrialVars):
	#   * Fixed count (published runs): the preamble exports PTS_RESPECT_TIMES_TO_RUN=1 plus a per-suite
	#     FORCE_TIMES_TO_RUN (k) — a pinned pass count with PTS's adaptive variance policy disabled (it
	#     otherwise expanded noisy fio cases to 20-40 runs and exhausted the suite). Nothing to do here.
	#   * Convergence (BENCH_PTS_CONVERGE=1): let PTS's own DynamicRunCount decide the pass count — run a
	#     minimum, then keep going while the standard deviation exceeds PTS's threshold. Clear any forced
	#     count / respect flag so neither pins it, and DynamicRunCount (on by PTS default) governs.
	#   * Neither set (contract-verification / bare host runs): force a single pass.
	# Between-sandbox variance is captured by REPLICATE sandboxes, not by more in-sandbox passes.
	if [ -n "${BENCH_PTS_CONVERGE:-}" ]; then
		unset FORCE_TIMES_TO_RUN PTS_RESPECT_TIMES_TO_RUN
	elif [ -z "${PTS_RESPECT_TIMES_TO_RUN:-}" ]; then
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
			# Linux AIO engine), libicu-dev + pkg-config (postgres — 17's configure discovers ICU
			# exclusively via PKG_CHECK_MODULES, so without a pkg-config binary the headers are
			# invisible and the build aborts "ICU library not found"), tcl (sqlite), stress-ng
			# (hardlink), and probes.
			(curl -fsSL "$deb_url" -o "$tmp_deb" &&
				${SUDO:-} apt-get -o Acquire::Retries=3 update -qq &&
				${SUDO:-} apt-get install -y -qq php-cli php-xml build-essential autoconf flex bison bc \
					libelf-dev libssl-dev libaio-dev libicu-dev pkg-config dnsutils jq netcat-openbsd \
					iputils-ping tcl stress-ng unzip procps &&
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

# Seed PTS's download cache with one profile source file, fetched with retries and a SHA256-verified
# mirror fallback. PTS's own downloader is single-shot per URL: one upstream hiccup during
# `batch-install` fails the whole profile install, which the leaf then records as a suite-wide gap
# (run 29964910698: downloads.es.net refused 4 of 6 providers' single-shot fetches within one
# minute while the other 2 succeeded). A baked toolchain image already ships the file in this cache
# (the bake pre-installs the profile), making this a verified no-op; the seed exists for stock-image
# providers (blaxel installs every profile at run time) and for validation runs on a not-yet-rebaked
# toolchain. Never fatal: on total failure PTS's own downloader still gets its chance, and the
# leaf's existing skip/assert machinery owns the failure story.
#
# That "never fatal" promise is a TIME budget as much as an exit-code one, hence --retry-max-time.
# curl resets --max-time on every retry ("the maximum time counter is reset each time the transfer
# is retried" — curl(1)), so a per-attempt cap alone bounds nothing: 1+8 attempts at 300s plus the
# retry delays is ~45m per URL, ~91m across a primary and one mirror, against the network suite's
# 30-minute commandTimeoutMinutes. The leaf would be killed mid-seed and PTS's downloader — the
# fallback this exists to preserve — would never run at all. The bound below is ~150s per URL
# (retry window, plus one in-flight attempt that may start just under it), so a primary + mirror
# costs at most ~5m. A small source tarball that cannot arrive in 60s is not going to arrive.
# Usage: seed_pts_download_cache <file-name> <sha256> <url> [mirror-url...]
seed_pts_download_cache() {
	local filename="$1" sha256="$2" cache tmp url
	shift 2
	pts_init
	cache="$(pts_user_dir)/download-cache"
	mkdir -p "$cache"
	if [ -f "${cache}/${filename}" ] && echo "${sha256}  ${cache}/${filename}" | sha256sum -c - &>/dev/null; then
		echo "PTS download cache already holds ${filename} (sha256 verified)"
		return 0
	fi
	tmp="${cache}/.${filename}.part"
	for url in "$@"; do
		if curl -fsSL --retry 3 --retry-all-errors --retry-delay 3 --retry-max-time 90 \
			--connect-timeout 10 --max-time 60 -o "$tmp" "$url" &&
			echo "${sha256}  ${tmp}" | sha256sum -c - &>/dev/null; then
			mv "$tmp" "${cache}/${filename}"
			echo "Seeded PTS download cache: ${filename} <- ${url}"
			return 0
		fi
		rm -f "$tmp"
		echo "WARNING: could not seed ${filename} from ${url} (trying next source, else PTS's own downloader)" >&2
	done
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

# Count the <Value> elements in a PTS composite whose content is a plain number. Failed PTS trials
# leave empty <Value></Value> elements behind while batch-run still exits 0, so this count is the
# only in-sandbox signal separating a measured composite from an all-trials-failed one. Always
# succeeds; an unreadable/missing file counts as 0 (callers gate on -s separately).
_pts_numeric_value_count() {
	awk '
		match($0, /<Value>[^<]*<\/Value>/) {
			value = substr($0, RSTART + 7, RLENGTH - 15)
			if (value ~ /^[0-9]+([.][0-9]+)?$/) numeric++
		}
		END { print numeric + 0 }
	' "$1" 2>/dev/null || echo 0
}

# Exact-count result guard for single-test leaves: the copied composite must carry exactly
# <expected> numeric values (per-leaf counts mirror packages/schema/src/suites.ts metrics[]). A
# recorded --skipped.json marker passes — run_pts_benchmark/run_pinned_pts already recorded an
# honest gap (PTS missing, batch-setup failed, install failed, no composite), and
# green-with-recorded-skip is the designed keep+warn shape. Any other shortfall records a per-leaf
# --failed.json marker and fails the leaf (non-zero) so the job goes red with a recorded gap that
# names THIS prefix — not just the whole-suite failure the harness derives from the exit code —
# instead of silently green with partial metrics (the missing-Chrome-libs incident fast-cli's
# original inline guard caught, generalized). The marker mirrors run_pts_benchmark's all-empty
# path so a shortfall caught here and one caught there leave the same shape of evidence.
# Usage: assert_pts_numeric_values <results-prefix> <expected-count>
assert_pts_numeric_values() {
	local prefix="$1" expected="$2"
	local dir
	dir="$(results_dir)"
	if [ -f "${dir}/${prefix}--skipped.json" ]; then
		return 0
	fi
	local xml="${dir}/${prefix}.xml"
	if [ ! -s "$xml" ] || [ "$(_pts_numeric_value_count "$xml")" -ne "$expected" ]; then
		echo "ERROR: ${prefix} did not produce ${expected} numeric metric value(s)" >&2
		fail_result "${prefix} did not produce ${expected} numeric metric value(s)" "$prefix"
		return 1
	fi
}

# Install and run one PTS test, capturing timing via bench_cmd and copying the result XML to
# benchmark-results/<prefix>.xml (the contract the results extractor reads).
# Usage: run_pts_benchmark <test-name> <results-prefix>
