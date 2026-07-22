#!/usr/bin/env bash
# Realworld-machinery selftest — the IN-CONTAINER payload behind `mise run benchmark:realworld:selftest`.
# Exercises the full production chain (run_realworld_pts -> install_local_pts_profile -> shared
# install.sh -> PTS batch-install/batch-run -> realworld-runner.sh -> sentinel -> composite.xml)
# against a tiny synthetic fixture repo with second-scale task commands, then asserts the contract:
#   - every task produced a numeric sample in composite.xml,
#   - tasks execute in Task-menu order (TEST_EXECUTION_SORT=none),
#   - a TASK_PREP command's duration is EXCLUDED from its task's measured value,
#   - the no-prep warm-up executes the command exactly once before the measured run.
# Fixture + profile templates and the assertion script live in ./selftest/ (real .xml/.json/.mjs
# files, not heredocs); @PIN_SHA@/@FIXTURE@ placeholders are substituted here at runtime.
# Runs on any Docker host in ~2-4 minutes; no provider credentials, no real OSS repo.
set -euo pipefail

PTS_VERSION=10.8.4
COUNTS=/tmp/counts
FIXTURE=/tmp/fixture
WORK=/work
RESULTS=/tmp/results
SELFTEST_SRC=/repo/lib/pts/realworld/selftest

# Registered BEFORE any failable step: under set -e an early failure (PTS install, fixture build,
# the production run itself) must still export its forensics. /out is a host mount (the mise task
# provides it) — the only thing surviving --rm.
export_artifacts() {
	if [ -d /out ]; then
		cp -r "$COUNTS" /out/counts 2>/dev/null || true
		cp -r "$RESULTS" /out/results 2>/dev/null || true
		cp -r /var/lib/phoronix-test-suite/test-results /out/pts-test-results 2>/dev/null || true
	fi
}
trap 'export_artifacts' EXIT

echo "=== [selftest] install PTS + php ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
# procps: the runner's timeout sweep (pkill/ps) and this payload's leak assertion (pgrep) need it;
# installed explicitly instead of trusting the base image's package set.
apt-get install -y -qq php-cli php-xml procps >/dev/null
curl -fsSL --retry 3 -o /tmp/pts.deb \
	"https://github.com/phoronix-test-suite/phoronix-test-suite/releases/download/v${PTS_VERSION}/phoronix-test-suite_${PTS_VERSION}_all.deb"
dpkg -i /tmp/pts.deb >/dev/null 2>&1 || apt-get install -y -qq -f >/dev/null
phoronix-test-suite version | head -1

echo "=== [selftest] build fixture repo ==="
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack enable
mkdir -p "$COUNTS" "$FIXTURE" "$RESULTS"
cd "$FIXTURE"
cp "$SELFTEST_SRC/fixture-package.json" package.json
mkdir -p scripts
cp "$SELFTEST_SRC/fixture-hang.mjs" scripts/hang.mjs
printf 'node_modules/\ndist/\n' > .gitignore
pnpm install --silent
git init -q .
git config user.email selftest@example.com
git config user.name selftest
git add -A
git commit -qm fixture
# git_clone / install.sh fetch a bare SHA over the file:// transport; upload-pack refuses
# unadvertised-object requests unless the serving repo opts in.
git config uploadpack.allowAnySHA1InWant true
PIN_SHA="$(git rev-parse HEAD)"

echo "=== [selftest] assemble workspace + synthetic profile ==="
PROFILE="$WORK/packages/schema/src/pts-profiles/local/realworld-selftest-1.0.0"
mkdir -p "$PROFILE"
cp -r /repo/lib "$WORK/lib"
sed -e "s|@PIN_SHA@|${PIN_SHA}|g" "$SELFTEST_SRC/test-definition.xml" > "$PROFILE/test-definition.xml"
sed -e "s|@PIN_SHA@|${PIN_SHA}|g" -e "s|@FIXTURE@|${FIXTURE}|g" "$SELFTEST_SRC/target.env" > "$PROFILE/target.env"
# The REAL parser definition, not a copy — the selftest validates the sentinel against exactly what
# production profiles ship.
cp /repo/packages/schema/src/pts-profiles/local/realworld-mastra-1.0.0/results-definition.xml \
	"$PROFILE/results-definition.xml"

echo "=== [selftest] cgroup v2 init-leaf dance ==="
# The runner's memory-cap path needs +memory enabled in this container's cgroup subtree. Two
# blockers, handled in order: (1) the mount may be read-only (Docker Desktop; native-Linux Docker
# with a private cgroupns mounts it rw) — remounted below; (2) the no-internal-processes rule:
# enabling +memory in the namespaced root's subtree_control fails EBUSY while processes sit in
# that root (--privileged does NOT fix this). Move every root-cgroup process into an init leaf
# first, then enable. Hard-fail when impossible: this selftest is a local dev tool, and silently
# skipping the containment assertion would make it worthless.
if [ ! -f /sys/fs/cgroup/cgroup.controllers ]; then
	echo "FAIL: /sys/fs/cgroup is not cgroup v2 — the selftest needs Docker with cgroup v2 (default on modern Linux and Docker Desktop)" >&2
	exit 1
fi
if ! mkdir -p /sys/fs/cgroup/init 2>/dev/null; then
	# Docker Desktop (macOS/Windows) mounts cgroup2 READ-ONLY even with a private cgroupns
	# (verified on Docker Desktop 29.3.1); native-Linux Docker mounts it rw. The remount needs
	# CAP_SYS_ADMIN in the container.
	mount -o remount,rw /sys/fs/cgroup 2>/dev/null || {
		echo "FAIL: /sys/fs/cgroup is read-only and remount was denied — run the selftest container with --cap-add SYS_ADMIN (Docker Desktop mounts cgroup2 ro; the remount needs the cap)" >&2
		exit 1
	}
	mkdir -p /sys/fs/cgroup/init
fi
while read -r pid; do
	echo "$pid" > /sys/fs/cgroup/init/cgroup.procs 2>/dev/null || true # tolerate per-PID races
done < /sys/fs/cgroup/cgroup.procs
echo +memory > /sys/fs/cgroup/cgroup.subtree_control || {
	echo "FAIL: could not enable the memory controller in the container's cgroup root" >&2
	exit 1
}

echo "=== [selftest] run the production path ==="
export REPO_ROOT="$WORK"
export BENCHMARK_RESULTS_DIR="$RESULTS"
# shellcheck source=/dev/null
source "$WORK/lib/bench.sh"
run_realworld_pts selftest

echo "=== [selftest] assertions ==="
COMPOSITE="$RESULTS/pts_realworld-selftest.xml"
test -f "$COMPOSITE" || { echo "FAIL: no composite.xml at $COMPOSITE" >&2; exit 1; }
node "$SELFTEST_SRC/assert-composite.mjs" "$COMPOSITE"

# Execution-count proofs (fixture scripts append one line per run to /tmp/counts/<name>):
#   build:  Build task = warm-up + measured (2) + Prepped's prep (1)          = 3
#   lint:   Plain task = warm-up + measured                                    = 2
#   test:   Prepped is prep-carrying, so NO warm-up: measured only             = 1
count() { if [ -f "$COUNTS/$1" ]; then wc -l < "$COUNTS/$1" | tr -d ' '; else echo 0; fi; }
[ "$(count build)" = "3" ] || { echo "FAIL: build executed $(count build)x, expected 3 (warm-up+measured+prep)" >&2; exit 1; }
[ "$(count lint)" = "2" ] || { echo "FAIL: lint executed $(count lint)x, expected 2 (warm-up+measured)" >&2; exit 1; }
[ "$(count test)" = "1" ] || { echo "FAIL: test executed $(count test)x, expected 1 (no warm-up on prep tasks)" >&2; exit 1; }
# better-auth-shaped per-package TS cache must not survive cold-artifact resets (root-only wipe
# left packages/*/node_modules/.cache/ts warm and under-measured build/typecheck).
[ "$(count build-cache)" = "0" ] || {
	echo "FAIL: per-package TS cache hits=$(count build-cache), expected 0" >&2
	exit 1
}
# Positive counterpart to build-cache=0: the turbo sentinel primed by the first build must survive
# every subsequent wipe_tool_caches reset (build runs 2 and 3 of 3), proving the `! -name turbo`
# exception actually preserves turbo's own cache rather than the assertion passing by wiping
# everything indiscriminately.
[ "$(count turbo-survived)" = "2" ] || {
	echo "FAIL: turbo cache survived $(count turbo-survived)x resets, expected 2" >&2
	exit 1
}
echo "execution-count assertions OK (build=3 lint=2 test=1 build-cache=0 turbo-survived=2)"

# Containment proofs (per-command timeout + cgroup memory cap):
#   hang: warm-up runs once, timeout kills it, set -e aborts before the measured pass = 1.
[ "$(count hang)" = "1" ] || {
	echo "FAIL: hang executed $(count hang)x, expected 1 (timeout must abort after the warm-up)" >&2
	exit 1
}
# The hang fixture's detached grandchild escapes timeout's process-group kill AND carries no
# workspace path in its argv, so the runner's argv-matching pkill cannot see it — only the
# cgroup-membership / cwd sweep layers can reap it, and this asserts one of them did. Explicit
# if — a bare `! pgrep` is exempt from set -e and would assert nothing.
if pgrep -f 'setInterval' >/dev/null; then
	echo "FAIL: a hang-fixture process survived (group kill + pkill sweep both missed it):" >&2
	pgrep -af 'setInterval' >&2 || true
	exit 1
fi
# Prove the cap path — not the oom_score_adj fallback — engaged: the runner emits exactly one
# bench-cgroup stderr line per invocation, which lands in $LOG_FILE and is saved by PTS under
# test-results/*/test-logs.
grep -rq "bench-cgroup: capped at 268435456 bytes" /var/lib/phoronix-test-suite/test-results || {
	echo "FAIL: no 'bench-cgroup: capped at 268435456 bytes' line in PTS test logs — the cgroup cap path never engaged" >&2
	exit 1
}
# ...and that the OOM probe actually RAN inside the cgroup: the probe verifies its own membership
# before allocating and prints this marker when placement failed. Capped-but-not-placed would
# otherwise pass every assertion above while proving nothing about task containment.
if grep -rq "OOM-PROBE-NOT-CONTAINED" /var/lib/phoronix-test-suite/test-results; then
	echo "FAIL: the OOM probe ran OUTSIDE the bench-task cgroup — cap engaged but task placement is broken" >&2
	exit 1
fi
# ...and that the cap KILLED, not merely engaged: the runner dumps the bench cgroup's
# memory.events on a killed task, and only a genuine cgroup OOM increments oom_kill — exit 137
# alone cannot distinguish the cgroup OOM killer from timeout's kill-after escalation.
grep -rEq "bench-cgroup: memory\.events oom_kill [1-9]" /var/lib/phoronix-test-suite/test-results || {
	echo "FAIL: no oom_kill increment in the bench cgroup's memory.events — the 256 MiB cap never actually OOM-killed the probe" >&2
	exit 1
}
echo "containment assertions OK (hang=1, no leaked processes, cgroup cap engaged + probe placed + oom_kill observed)"
echo "SELFTEST PASS"
