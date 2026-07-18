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
apt-get install -y -qq php-cli php-xml >/dev/null
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
echo "execution-count assertions OK (build=3 lint=2 test=1 build-cache=0)"
echo "SELFTEST PASS"
