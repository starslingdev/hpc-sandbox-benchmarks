#!/bin/sh
# Shared realworld-suite runner (ENG-135/136/137/138), one copy for every realworld-<repo>-1.0.0
# profile. run_realworld_pts (lib/bench.sh) overlays this script and the adjacent install.sh into
# the installed profile dir next to the profile's vendored target.env; the generated PTS executable
# wrapper invokes it as `realworld-runner.sh <task-value>`, with stdout/stderr already
# redirected to $LOG_FILE by that wrapper. One measured task per invocation -- the unmeasured
# "prepare" step below runs first on every invocation so every sample starts from the same state
# regardless of what task ran before it.
set -eu

TASK="${1:?usage: realworld-runner.sh <task-value>}"
# shellcheck disable=SC1007 # CDPATH= (no value) is the idiom that disables CDPATH's cd-echoes-a-path
# behavior for this one invocation; shellcheck misreads it as a mistyped assignment.
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
# shellcheck source=/dev/null
. "${SCRIPT_DIR}/target.env"

WORK_DIR="${SCRIPT_DIR}/work"

# Fixed env, never ambient-HOME-dependent, so PTS's env quirks (it runs tests under varying HOME
# handling) can't leak cache state across runs or providers.
export XDG_CACHE_HOME="${SCRIPT_DIR}/.cache"
export COREPACK_HOME="${SCRIPT_DIR}/.corepack"
export npm_config_store_dir="${SCRIPT_DIR}/.pnpm-store"
export CI=true
export TZ=UTC
export LC_ALL=C.UTF-8
export GIT_TERMINAL_PROMPT=0
export DO_NOT_TRACK=1
export TURBO_TELEMETRY_DISABLED=1
export TURBO_FORCE=true
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

start_ns=""
end_ns=""

case "$TASK" in
git_clone)
	# Measured clone: what actions/checkout does -- deterministic content, network-inclusive on
	# purpose. Every iteration fully cold by construction (rm -rf first).
	rm -rf "$WORK_DIR"
	mkdir -p "$WORK_DIR"
	cd "$WORK_DIR"
	start_ns=$(date +%s%N)
	git init -q .
	git remote add origin "$REPO_URL"
	git fetch --depth 1 origin "$PIN_SHA"
	git checkout -q FETCH_HEAD
	end_ns=$(date +%s%N)
	head_sha="$(git rev-parse HEAD)"
	if [ "$head_sha" != "$PIN_SHA" ]; then
		echo "git_clone: HEAD $head_sha != PIN_SHA $PIN_SHA" >&2
		exit 1
	fi
	;;
cold_install)
	# Workspace reset: full node_modules removal + store/cache wipe, then assert cold before
	# measuring -- provably cold, not just "probably cold".
	cd "$WORK_DIR"
	git checkout -f -q "$PIN_SHA"
	git clean -xdff
	rm -rf "$npm_config_store_dir" "$XDG_CACHE_HOME"
	if [ -d node_modules ]; then
		echo "cold_install: node_modules survived the cold reset" >&2
		exit 1
	fi
	start_ns=$(date +%s%N)
	# shellcheck disable=SC2154 # sourced dynamically from target.env (per-profile config, not
	# assigned in this file).
	eval "$TASK_CMD_cold_install"
	end_ns=$(date +%s%N)
	;;
*)
	# lint/typecheck/build/test: reset build artifacts but keep node_modules (gitignore-pattern
	# exclude), then ensure deps exist so tasks are order-independent regardless of whether
	# cold_install has run yet in this batch.
	cd "$WORK_DIR"
	prep_var="TASK_PREP_${TASK}"
	eval "prep=\"\${${prep_var}:-}\""
	if [ -n "$prep" ]; then
		# Build-dependent task (declared via TASK_PREP_<value>): keep dist + node_modules + .turbo
		# (turbo 2's local cache dir) through the reset, so the UNMEASURED prep below is a
		# near-instant turbo cache REPLAY of the build the Task menu already measured earlier in the
		# batch — never a duplicate slow build (a full build happens only when the task runs
		# standalone). TURBO_FORCE is lifted for the prep only; the measured command keeps
		# TURBO_FORCE=true so it is always a genuine execution, never a cache replay.
		git clean -xdff -e node_modules -e dist -e .turbo
		if [ ! -d node_modules ]; then
			eval "$TASK_CMD_cold_install"
		fi
		(unset TURBO_FORCE && eval "$prep")
	else
		# Turbo's cache dirs (.turbo/ at the root, node_modules/.cache/turbo) survive EVERY generic
		# reset — not just prep tasks' — so the cache the measured build wrote is still there when a
		# later prep replays it, regardless of which tasks ran in between. Measurement-safe: every
		# measured turbo command runs with TURBO_FORCE=true, so preserved cache is never read inside
		# a timed window; all other tool caches in node_modules/.cache are still wiped.
		git clean -xdff -e node_modules -e .turbo
		if [ -d node_modules/.cache ]; then
			find node_modules/.cache -mindepth 1 -maxdepth 1 ! -name turbo -exec rm -rf {} +
		fi
		if [ ! -d node_modules ]; then
			# Recovery install: output stays on the (already-redirected) log — discarding it would
			# hide the one diagnostic that explains a subsequent task failure.
			eval "$TASK_CMD_cold_install"
		fi
	fi
	cmd_var="TASK_CMD_${TASK}"
	eval "cmd=\"\${${cmd_var}:-}\""
	if [ -z "$cmd" ]; then
		echo "no ${cmd_var} in target.env for task '${TASK}'" >&2
		exit 1
	fi
	if [ -z "$prep" ]; then
		# Steady-state warm-up (fio's ramp_time, adapted): the FIRST execution of a JS toolchain in a
		# fresh sandbox pays one-time JIT/compile-cache costs that live outside work/ and survive the
		# per-pass reset — observed 75s vs ~10s on an identical better-auth build, an asymmetry that
		# poisons the sample set and trips PTS's dynamic run count. One unmeasured execution, then
		# the same reset again, so the measured run is warm-toolchain + cold-artifact on every pass.
		# Prep-carrying tasks skip this: their prep already exercised the toolchain.
		eval "$cmd"
		# Same PRESERVING reset as above — the old destructive form here wiped the turbo cache the
		# measured build had written, killing the replay for any prep task downstream of a no-prep
		# task's warm-up cycle.
		git clean -xdff -e node_modules -e .turbo
		if [ -d node_modules/.cache ]; then
			find node_modules/.cache -mindepth 1 -maxdepth 1 ! -name turbo -exec rm -rf {} +
		fi
	fi
	start_ns=$(date +%s%N)
	eval "$cmd"
	end_ns=$(date +%s%N)
	;;
esac

# A failing measured command aborts above (set -e) before this prints -- no sentinel, non-zero exit,
# so PTS records a missing sample for that option while the remaining options continue.
awk -v ns="$((end_ns - start_ns))" 'BEGIN { printf "REALWORLD_RESULT_SECONDS: %.3f\n", ns / 1000000000 }'
