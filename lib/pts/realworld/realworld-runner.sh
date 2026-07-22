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

# Per-command hard bound. A wedged task (openclaw's oxlint --type-aware spawns tsgolint, which
# needs >8GB and thrashes forever under gVisor where no in-sandbox OOM killer exists) must fail
# ALONE after a bounded wait instead of eating the harness's whole 4800s step budget — PTS only
# writes composite.xml when the batch completes, so an unbounded hang loses every already-measured
# sample. Default 1200s gives 1.7x headroom over the slowest legitimate sample ever observed
# (708s, novita openclaw git_clone). Overridable via env or target.env; do NOT add per-profile
# knobs beyond that.
TASK_TIMEOUT_SECONDS="${REALWORLD_TASK_TIMEOUT_SECONDS:-1200}"
# GNU timeout treats 0 as "no timer at all" — the exact unbounded hang this bound exists to
# prevent — so anything but a positive integer count of seconds is a misconfiguration, answered
# loudly here instead of with a silently unbounded batch.
case "$TASK_TIMEOUT_SECONDS" in
'' | *[!0-9]*)
	echo "REALWORLD_TASK_TIMEOUT_SECONDS must be a positive integer (seconds), got '${TASK_TIMEOUT_SECONDS}'" >&2
	exit 1
	;;
esac
if [ "$TASK_TIMEOUT_SECONDS" -eq 0 ]; then
	echo "REALWORLD_TASK_TIMEOUT_SECONDS=0 would disable the timer (GNU timeout semantics), refusing" >&2
	exit 1
fi

# Memory containment: task commands run inside a cgroup-v2 child capped below MemTotal so a task
# that exhausts RAM is OOM-killed ALONE instead of driving a VM guest into global OOM — on
# daytona-vm that killed the in-guest Daytona daemon and the whole benchmark tree ("lost its
# sandbox"). Container providers are unchanged: the outer container limit already contains the
# kill; the guarded writes below no-op without a writable cgroup fs and run_task falls back to
# oom_score_adj-only victim biasing.
if [ -n "${REALWORLD_TASK_MEM_MAX_BYTES:-}" ]; then
	# Escape hatch, set per-profile in target.env (sourced above — a guaranteed transport, unlike
	# assuming PTS passes arbitrary env through to the test wrapper). The selftest pins 256 MiB to
	# exercise the OOM path deterministically; production profiles leave it unset.
	cap_bytes="$REALWORLD_TASK_MEM_MAX_BYTES"
else
	mem_total_kb="$(awk '/^MemTotal:/ { print $2; exit }' /proc/meminfo 2>/dev/null || echo 0)"
	# MemTotal minus 1 GiB headroom keeps the sandbox agent/kernel alive through a task OOM. On a
	# host small enough that this leaves under 1 GiB, take HALF of MemTotal instead — a fixed floor
	# at or above visible RAM would hand the task the very headroom the reserve exists to protect.
	# memory.max also counts page cache, so a task whose working set lands inside the headroom band
	# would reclaim instead of using all RAM — no currently-passing task does;
	# REALWORLD_TASK_MEM_MAX_BYTES is the escape hatch if one ever appears. An unreadable
	# /proc/meminfo (mem_total_kb=0) yields cap 0, which the setup below treats as
	# cap-unavailable rather than writing a kill-everything memory.max=0.
	cap_bytes=$((mem_total_kb * 1024 - 1073741824))
	[ "$cap_bytes" -ge 1073741824 ] || cap_bytes=$((mem_total_kb * 1024 / 2))
fi
[ "${cap_bytes:-0}" -gt 0 ] || cap_bytes=""
BENCH_CG=""
if [ -n "$cap_bytes" ] && [ -f /sys/fs/cgroup/cgroup.controllers ] &&
	grep -qw memory /sys/fs/cgroup/cgroup.controllers 2>/dev/null; then
	# Idempotent on a real root cgroup (root is exempt from the no-internal-processes rule, and
	# systemd guests already have it enabled); fails EBUSY on a namespaced root that still holds
	# processes, which the fallback below tolerates.
	# 2>/dev/null must come FIRST: redirections apply left to right, so a failed open of the
	# target (ro cgroup fs on container providers) would otherwise print shell noise into every
	# task log before the stderr redirect takes effect.
	echo +memory 2>/dev/null > /sys/fs/cgroup/cgroup.subtree_control || true
	bench_cg="/sys/fs/cgroup/bench-task-$$"
	# memory.swap.max=0 only where the knob exists (load-bearing for measurement fidelity when the
	# guest has swap: an uncapped-swap task would thrash instead of OOM-ing).
	if mkdir "$bench_cg" 2>/dev/null &&
		echo "$cap_bytes" 2>/dev/null > "$bench_cg/memory.max" &&
		{ [ ! -f "$bench_cg/memory.swap.max" ] || echo 0 2>/dev/null > "$bench_cg/memory.swap.max"; } &&
		# Writable knobs alone do not prove a child can MIGRATE (delegated setups can lack
		# common-ancestor cgroup.procs permission — the writes above would succeed while every task
		# silently ran uncontained). Prove the join with a probe child before advertising the cap.
		BENCH_CG="$bench_cg" sh -ec 'echo $$ 2>/dev/null >"$BENCH_CG/cgroup.procs" &&
			grep -q "bench-task" /proc/self/cgroup' 2>/dev/null; then
		BENCH_CG="$bench_cg"
	else
		rmdir "$bench_cg" 2>/dev/null || true
	fi
fi
if [ -n "$BENCH_CG" ]; then
	export BENCH_CG # the contained child shell in run_task reads it
	trap 'rmdir "$BENCH_CG" 2>/dev/null || true' EXIT
	# Exactly ONE diagnostic line, on STDERR (stdout carries the REALWORLD_RESULT_SECONDS sentinel
	# parsed by results-definition.xml). The selftest asserts on it to prove the cap path — not
	# the fallback — engaged.
	echo "bench-cgroup: capped at ${cap_bytes} bytes" >&2
else
	echo "bench-cgroup: unavailable (oom_score_adj only)" >&2
fi

# Time-bound an execution. Composition order matters: timeout sits OUTSIDE the cgroup exec of
# run_task, so a memory-stalled task (reclaim-thrashing at the cap) is still time-bounded. A
# non-zero return in statement position aborts the runner via set -e exactly as a bare eval does
# today, so PTS records a missing sample for this Task option and the batch continues.
run_bounded() {
	status=0
	timeout --kill-after=30 "$TASK_TIMEOUT_SECONDS" "$@" || status=$?
	if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
		echo "task '${TASK}' command timed out or was killed after ${TASK_TIMEOUT_SECONDS}s (exit ${status})" >&2
		# Terminal-state snapshot into the (already-redirected) task log so the forensics tarball
		# can settle thrash-vs-deadlock for a hung provider.
		head -3 /proc/meminfo >&2 2>/dev/null || true
		ps -eo pid,ppid,pgid,rss,etime,comm --sort=-rss 2>/dev/null | head -15 >&2 || true
		# The cap's own verdict, for the same tarball: a real cgroup OOM increments oom_kill in
		# memory.events, which exit 137 alone cannot distinguish from timeout's kill-after
		# escalation. The selftest asserts on the oom_kill line to prove the cap KILLED, not
		# merely engaged.
		if [ -n "${BENCH_CG:-}" ] && [ -f "$BENCH_CG/memory.events" ]; then
			sed 's/^/bench-cgroup: memory.events /' "$BENCH_CG/memory.events" >&2 2>/dev/null || true
		fi
		# timeout signals its own process group, but children that made a NEW group (openclaw's
		# run-oxlint-shards spawns shards detached) survive — and an escapee need not carry the
		# workspace path in its argv at all, so a leaked memory hog is swept three ways before it
		# can poison the remaining tasks. 137 also matches a kernel OOM-SIGKILL of the direct
		# child, where the sweep is equally correct; 125/126/127 are not timeout kills and pass
		# through as plain failures without it.
		# (1) argv: safe because the runner/wrapper/PTS cmdlines never contain the .../work suffix.
		pkill -KILL -f "$WORK_DIR" 2>/dev/null || true
		# (2) cgroup membership: inherited through detach/setpgid, so this reaps a child that
		# scrubbed or never had the path in its argv. cgroup.kill (5.14+) takes the whole subtree
		# atomically; older kernels fall back to signalling each listed member. Only task
		# descendants ever join BENCH_CG — the runner itself never migrates.
		if [ -n "${BENCH_CG:-}" ] && ! echo 1 2>/dev/null > "$BENCH_CG/cgroup.kill"; then
			while IFS= read -r cg_pid; do
				kill -KILL "$cg_pid" 2>/dev/null || true
			done 2>/dev/null < "$BENCH_CG/cgroup.procs" || true
		fi
		# (3) cwd: the no-cgroup fallback for a relative-argv child that inherited the workspace
		# cwd without ever naming it. $$ is excluded — the runner cd's into the workspace itself
		# and must survive to return non-zero (see the run_task trailer contract).
		for proc_dir in /proc/[0-9]*; do
			escapee="${proc_dir#/proc/}"
			[ "$escapee" != "$$" ] || continue
			case "$(readlink "$proc_dir/cwd" 2>/dev/null || true)" in
			"$WORK_DIR" | "$WORK_DIR"/*) kill -KILL "$escapee" 2>/dev/null || true ;;
			esac
		done
	fi
	return "$status"
}

# Time-bound AND memory-contain a task command string. CRITICAL: no subshell + `echo $$` here —
# POSIX $$ inside a subshell is the PARENT shell's PID, which would move the runner itself into
# the capped cgroup and defeat the survive-to-exit-nonzero contract (the failing command must
# abort the still-alive runner, see the trailer comment). A child sh's own $$ is correct.
# oom_score_adj=1000 applies unconditionally and is inherited by the task subtree, so even
# without a usable cgroup fs the task is the kernel's preferred OOM victim, never the agent.
run_task() {
	# shellcheck disable=SC2016 # single quotes are the point: $$/"$1"/BENCH_CG must expand in the
	# CHILD sh, not here.
	run_bounded sh -ec '
		echo 1000 2>/dev/null >/proc/self/oom_score_adj || true
		# Setup verified migration with a probe child, so a failed join here is unexpected — say so
		# on stderr (the task log) instead of silently running uncontained; the task still runs
		# under the oom_score_adj biasing above.
		if [ -n "${BENCH_CG:-}" ]; then
			echo $$ 2>/dev/null >"$BENCH_CG/cgroup.procs" ||
				echo "bench-cgroup: task join failed — running uncontained (oom_score_adj only)" >&2
		fi
		eval "$1"
	' contained-task "$1"
}

start_ns=""
end_ns=""

# Wipe every workspace node_modules/.cache entry except turbo. A root-only wipe misses
# per-package paths (e.g. better-auth packages/<pkg>/node_modules/.cache/ts), which made
# warm-up leave an incremental TS cache and under-measure build/typecheck. Anchored to
# WORK_DIR (not `.`) so the blast radius is explicit even if a future call site forgets
# to cd first.
wipe_tool_caches() {
	find "$WORK_DIR" -type d -path '*/node_modules/.cache' 2>/dev/null |
		while IFS= read -r cache_dir; do
			find "$cache_dir" -mindepth 1 -maxdepth 1 ! -name turbo -exec rm -rf {} +
		done
}

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
	# Only the fetch gets the bound (the 708s legitimate outlier WAS this fetch); init/remote/
	# checkout stay bare — local and instant — and no memory containment here, keeping the timed
	# window byte-identical apart from timeout's single fork.
	run_bounded git fetch --depth 1 origin "$PIN_SHA"
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
	run_task "$TASK_CMD_cold_install"
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
		wipe_tool_caches
		if [ ! -d node_modules ]; then
			run_task "$TASK_CMD_cold_install"
		fi
		(unset TURBO_FORCE && run_task "$prep")
		# Prep may restore turbo outputs under per-package node_modules/.cache; clear them so the
		# timed command keeps dist warm but does not inherit incremental TS/vitest caches.
		wipe_tool_caches
	else
		# Turbo's cache dirs (.turbo/ at the root, node_modules/.cache/turbo) survive EVERY generic
		# reset — not just prep tasks' — so the cache the measured build wrote is still there when a
		# later prep replays it, regardless of which tasks ran in between. Measurement-safe: every
		# measured turbo command runs with TURBO_FORCE=true, so preserved cache is never read inside
		# a timed window; all other tool caches under any node_modules/.cache are wiped.
		git clean -xdff -e node_modules -e .turbo
		wipe_tool_caches
		if [ ! -d node_modules ]; then
			# Recovery install: output stays on the (already-redirected) log — discarding it would
			# hide the one diagnostic that explains a subsequent task failure.
			run_task "$TASK_CMD_cold_install"
		fi
	fi
	cmd_var="TASK_CMD_${TASK}"
	eval "cmd=\"\${${cmd_var}:-}\""
	if [ -z "$cmd" ]; then
		echo "no ${cmd_var} in target.env for task '${TASK}'" >&2
		exit 1
	fi
	if [ -z "$prep" ]; then
		# Steady-state warm-up (fio's ramp_time, adapted): one unmeasured execution, then the same
		# cold-artifact reset again so every sample is warm-toolchain + cold-artifact. Artifact
		# caches (including per-package node_modules/.cache/ts) must be wiped here.
		run_task "$cmd"
		# Same PRESERVING reset as above — the old destructive form here wiped the turbo cache the
		# measured build had written, killing the replay for any prep task downstream of a no-prep
		# task's warm-up cycle.
		git clean -xdff -e node_modules -e .turbo
		wipe_tool_caches
	fi
	start_ns=$(date +%s%N)
	run_task "$cmd"
	end_ns=$(date +%s%N)
	;;
esac

# A failing measured command aborts above (set -e) before this prints -- no sentinel, non-zero exit,
# so PTS records a missing sample for that option while the remaining options continue.
awk -v ns="$((end_ns - start_ns))" 'BEGIN { printf "REALWORLD_RESULT_SECONDS: %.3f\n", ns / 1000000000 }'
