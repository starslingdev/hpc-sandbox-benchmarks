#!/usr/bin/env bash
# Realworld-machinery selftest — the IN-CONTAINER payload behind `mise run benchmark:realworld:selftest`.
# Exercises the full production chain (run_realworld_pts -> install_local_pts_profile -> shared
# install.sh -> PTS batch-install/batch-run -> realworld-runner.sh -> sentinel -> composite.xml)
# against a tiny synthetic fixture repo with second-scale task commands, then asserts the contract:
#   - every task produced a numeric sample in composite.xml,
#   - tasks execute in Task-menu order (TEST_EXECUTION_SORT=none),
#   - a TASK_PREP command's duration is EXCLUDED from its task's measured value,
#   - the no-prep warm-up executes the command exactly once before the measured run.
# Runs on any Docker host in ~2-4 minutes; no provider credentials, no real OSS repo.
set -euo pipefail

PTS_VERSION=10.8.4
COUNTS=/tmp/counts
FIXTURE=/tmp/fixture
WORK=/work
RESULTS=/tmp/results

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
cat > package.json <<'EOF'
{
	"name": "selftest-fixture",
	"private": true,
	"packageManager": "pnpm@10.12.1",
	"scripts": {
		"build": "mkdir -p dist && echo ok > dist/out.txt && echo x >> /tmp/counts/build && sleep 2",
		"lint": "echo x >> /tmp/counts/lint && sleep 0.5",
		"test": "test -f dist/out.txt && echo x >> /tmp/counts/test && sleep 1"
	}
}
EOF
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
mkdir -p "$WORK/packages/schema/src/pts-profiles/local/realworld-selftest-1.0.0"
cp -r /repo/lib "$WORK/lib"
PROFILE="$WORK/packages/schema/src/pts-profiles/local/realworld-selftest-1.0.0"
cat > "$PROFILE/test-definition.xml" <<EOF
<?xml version="1.0"?>
<PhoronixTestSuite>
  <TestInformation>
    <Title>Realworld Selftest</Title>
    <AppVersion>${PIN_SHA}</AppVersion>
    <Description>Synthetic fixture exercising the realworld runner contract.</Description>
    <Executable>realworld-run</Executable>
    <ResultScale>Seconds</ResultScale>
    <Proportion>LIB</Proportion>
    <TimesToRun>1</TimesToRun>
  </TestInformation>
  <TestProfile>
    <Version>1.0.0</Version>
    <SupportedPlatforms>Linux</SupportedPlatforms>
    <SoftwareType>Benchmark</SoftwareType>
    <TestType>System</TestType>
    <License>Free</License>
    <Status>Verified</Status>
    <EnvironmentSize>1</EnvironmentSize>
    <ProjectURL>https://example.com</ProjectURL>
    <Maintainer>StarSling</Maintainer>
  </TestProfile>
  <TestSettings>
    <Option>
      <DisplayName>Task</DisplayName>
      <Identifier>task</Identifier>
      <Menu>
        <Entry><Name>Git Clone</Name><Value>git_clone</Value></Entry>
        <Entry><Name>Cold Install</Name><Value>cold_install</Value></Entry>
        <Entry><Name>Build</Name><Value>build</Value></Entry>
        <Entry><Name>Plain</Name><Value>plain</Value></Entry>
        <Entry><Name>Prepped</Name><Value>prepped</Value></Entry>
      </Menu>
    </Option>
  </TestSettings>
</PhoronixTestSuite>
EOF
cat > "$PROFILE/results-definition.xml" <<'EOF'
<?xml version="1.0"?>
<PhoronixTestSuite>
  <ResultsParser>
    <OutputTemplate>REALWORLD_RESULT_SECONDS: #_RESULT_#</OutputTemplate>
    <LineHint>REALWORLD_RESULT_SECONDS:</LineHint>
    <ResultScale>Seconds</ResultScale>
    <ResultProportion>LIB</ResultProportion>
  </ResultsParser>
</PhoronixTestSuite>
EOF
cat > "$PROFILE/target.env" <<EOF
REPO_URL="file://${FIXTURE}"
PIN_SHA="${PIN_SHA}"
NODE_VERSION="22"
TASK_CMD_git_clone=""
TASK_CMD_cold_install="pnpm install --frozen-lockfile"
TASK_CMD_build="pnpm run build"
TASK_CMD_plain="pnpm run lint"
TASK_PREP_prepped="pnpm run build"
TASK_CMD_prepped="pnpm run test"
EOF

echo "=== [selftest] run the production path ==="
export REPO_ROOT="$WORK"
export BENCHMARK_RESULTS_DIR="$RESULTS"
# shellcheck source=/dev/null
source "$WORK/lib/bench.sh"
run_realworld_pts selftest

echo "=== [selftest] assertions ==="
# On any failure below, dump the PTS per-task logs first — the container is --rm'd, so this is the
# only forensic window.
export_artifacts() {
	# /out is a host mount (the mise task provides it) — the only thing surviving --rm.
	if [ -d /out ]; then
		cp -r "$COUNTS" /out/counts 2>/dev/null || true
		cp -r "$RESULTS" /out/results 2>/dev/null || true
		cp -r /var/lib/phoronix-test-suite/test-results /out/pts-test-results 2>/dev/null || true
	fi
}
trap 'export_artifacts' EXIT
COMPOSITE="$RESULTS/pts_realworld-selftest.xml"
test -f "$COMPOSITE" || { echo "FAIL: no composite.xml at $COMPOSITE" >&2; exit 1; }

node - "$COMPOSITE" <<'EOF'
const fs = require("fs");
const xml = fs.readFileSync(process.argv[2], "utf8");
// Scope to <Result> blocks: the composite header carries its own <Description> which must not
// shift the pairing, and a failed task's <Value> is empty.
const results = [...xml.matchAll(/<Result>[\s\S]*?<\/Result>/g)].map(([block]) => {
	const desc = block.match(/<Description>([^<]*)<\/Description>/)?.[1];
	const value = block.match(/<Value>([^<]*)<\/Value>/)?.[1] ?? "";
	return [desc, Number(value)];
});
const byDesc = Object.fromEntries(results);
const fail = (msg) => { console.error("FAIL:", msg); process.exit(1); };

const expected = ["Task: Git Clone", "Task: Cold Install", "Task: Build", "Task: Plain", "Task: Prepped"];
for (const d of expected) {
	if (!(d in byDesc)) fail(`missing result for "${d}"`);
	if (!Number.isFinite(byDesc[d]) || byDesc[d] <= 0) fail(`non-numeric value for "${d}": ${byDesc[d]}`);
}
// Execution order == menu order (TEST_EXECUTION_SORT=none). composite preserves run order.
const order = results.map(([d]) => d).filter((d) => expected.includes(d));
if (JSON.stringify(order) !== JSON.stringify(expected)) fail(`execution order ${order} != menu order`);
// Timing windows. build sleeps 2s, lint 0.5s, test 1s (+ small pnpm overhead, generous upper bounds).
const inWindow = (d, lo, hi) => byDesc[d] >= lo && byDesc[d] <= hi;
if (!inWindow("Task: Build", 1.9, 4.0)) fail(`Build ${byDesc["Task: Build"]}s outside [1.9, 4.0]`);
if (!inWindow("Task: Plain", 0.4, 2.0)) fail(`Plain ${byDesc["Task: Plain"]}s outside [0.4, 2.0]`);
// THE core assertion: Prepped measures only its 1s test — the 2s prep must be excluded. A leak
// would land it at >= 3s.
if (!inWindow("Task: Prepped", 0.9, 2.4)) fail(`Prepped ${byDesc["Task: Prepped"]}s outside [0.9, 2.4] — prep time leaked into the measured window?`);
console.log("composite assertions OK:", JSON.stringify(byDesc));
EOF

# Execution-count proofs (fixture scripts append one byte per run to /tmp/counts/<name>):
#   build:  Build task = warm-up + measured (2) + Prepped's prep (1)          = 3
#   lint:   Plain task = warm-up + measured                                    = 2
#   test:   Prepped is prep-carrying, so NO warm-up: measured only             = 1
count() { wc -l < "$COUNTS/$1" | tr -d ' '; }
[ "$(count build)" = "3" ] || { echo "FAIL: build executed $(count build)x, expected 3 (warm-up+measured+prep)" >&2; exit 1; }
[ "$(count lint)" = "2" ] || { echo "FAIL: lint executed $(count lint)x, expected 2 (warm-up+measured)" >&2; exit 1; }
[ "$(count test)" = "1" ] || { echo "FAIL: test executed $(count test)x, expected 1 (no warm-up on prep tasks)" >&2; exit 1; }
echo "execution-count assertions OK (build=3 lint=2 test=1)"
echo "SELFTEST PASS"
