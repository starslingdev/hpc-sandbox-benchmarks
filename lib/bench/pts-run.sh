#!/usr/bin/env bash
# Phoronix Test Suite: running a benchmark.
#
# `run_pts_benchmark` is the one measured path; the wrappers below it pin a specific scenario's option
# matrix so a leaf task states only what it measures. Availability and configuration live in
# ./pts-install.sh, which this file assumes has already been sourced.
#
# NOTE: `run_fio_pts` and `run_realworld_pts` carry the profile pins that
# apps/cli/src/lib/suite-tasks.ts mines for summary metadata. Moving them means updating that miner —
# it reads these files by name.
#
# Sourced via lib/bench.sh — do not source directly.

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
	# errexit does not protect this scaffolding: run_pts_benchmark is reached through run_pinned_pts's
	# `run_pts_benchmark ... || rc=$?`, and bash disables errexit for the whole dynamic extent of a
	# function invoked in a `||`/`if` condition. So a failed mktemp would NOT abort here — run_stamp
	# would be empty, `find … -newer ""` would error out to no match, and the leaf would record a benign
	# "produced no composite.xml" skip for what is really a broken sandbox. Guard it explicitly and fail
	# the leaf loudly (red job + recorded gap) instead.
	local run_stamp
	if ! run_stamp="$(mktemp)"; then
		echo "ERROR: could not create pre-run stamp for ${test_name} (mktemp failed)" >&2
		fail_result "mktemp failed before PTS run of ${test_name}" "$prefix"
		return 1
	fi

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
		local copied_xml
		copied_xml="$(results_dir)/${prefix}.xml"
		cp "$xml_found" "$copied_xml" 2>/dev/null || true
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
		# PTS batch-run exits 0 and still writes a composite even when EVERY trial failed — the
		# <Value> elements are simply empty, the extractor drops them without record, and the job
		# stays green with zero metrics (pgbench shipped that shape for three consecutive runs).
		# TOTAL loss fails the leaf loudly: the harness then writes the sandbox failed marker and the
		# job goes red with a recorded gap, the designed shape. A PARTIAL shortfall must NOT fail
		# here — realworld suites legitimately post empty Values for individual failed tasks (the
		# normalizer's shortfall cross-check records those as gaps); single-test leaves layer the
		# stricter assert_pts_numeric_values on top. A failed cp lands here too: a composite that
		# never reached results_dir is the same silent hole.
		if [ ! -s "$copied_xml" ] || [ "$(_pts_numeric_value_count "$copied_xml")" -eq 0 ]; then
			echo "ERROR: ${test_name} wrote a composite but no Result carries a numeric value (all trials failed)" >&2
			# The per-leaf marker keeps the LEAF identity in the recorded gap (the normalizer folds it
			# under the suite with the leaf in the reason) even when the harness also records the
			# whole-suite failure this non-zero return triggers.
			fail_result "PTS batch-run of ${test_name} completed but every trial errored (composite carries no values)" "$prefix"
			return 1
		fi
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

	# run_pts_benchmark now fails on an all-empty composite. Capture its status so the pin vars are
	# unset on BOTH paths (a bare call would leak them past a failure in a non-errexit caller — and
	# the unset returning 0 would swallow the failure entirely).
	local rc=0
	run_pts_benchmark "$test_name" "$prefix" || rc=$?
	unset PRESET_OPTIONS PTS_RUN_ALL_TEST_COMBINATIONS
	return "$rc"
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
