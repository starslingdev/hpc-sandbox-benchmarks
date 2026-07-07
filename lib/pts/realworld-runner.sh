#!/bin/sh
# Shared realworld-suite runner (ENG-135/136/137/138), byte-identical for every
# realworld-<repo>-1.0.0 profile. install.sh (packages/schema/src/pts-profiles/local/realworld-*)
# overlays this script and the profile's target.env into the PTS install dir; the generated PTS
# executable wrapper invokes it as `realworld-runner.sh <task-value>`, with stdout/stderr already
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
	git clean -xdff -e node_modules
	rm -rf node_modules/.cache
	if [ ! -d node_modules ]; then
		eval "$TASK_CMD_cold_install" >/dev/null 2>&1
	fi
	cmd_var="TASK_CMD_${TASK}"
	eval "cmd=\"\${${cmd_var}:-}\""
	if [ -z "$cmd" ]; then
		echo "no ${cmd_var} in target.env for task '${TASK}'" >&2
		exit 1
	fi
	start_ns=$(date +%s%N)
	eval "$cmd"
	end_ns=$(date +%s%N)
	;;
esac

# A failing measured command aborts above (set -e) before this prints -- no sentinel, non-zero exit,
# so PTS records a missing sample for that option while the remaining options continue.
awk -v ns="$((end_ns - start_ns))" 'BEGIN { printf "REALWORLD_RESULT_SECONDS: %.3f\n", ns / 1000000000 }'
