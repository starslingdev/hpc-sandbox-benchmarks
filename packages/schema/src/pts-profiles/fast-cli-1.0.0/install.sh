#!/bin/sh
set -eu

# Upstream fast-cli-1.0.0 installs the mutable latest npm package, then generates a launcher for its
# historical cli.js path. fast-cli 5.2.0 exposes distribution/cli.js instead, so the upstream profile
# installs successfully but every trial exits before producing a value. Pin the package and generate
# the launcher for that version. When the baked image already contains 5.2.0, avoid reinstalling it.
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: fast-cli requires node and npm" >&2
	echo 2 >~/install-exit-status
	exit 2
fi

installed_version="$(node -p "try { require('./node_modules/fast-cli/package.json').version } catch { '' }" 2>/dev/null || true)"
if [ "$installed_version" != "5.2.0" ]; then
	npm install --prefix . --no-audit --no-fund fast-cli@5.2.0
fi

cat <<'EOF' >fast-cli
#!/bin/sh
# fast.com's transfer can stall mid-measurement instead of erroring (observed: a daytona run hung the
# whole 45-minute network suite budget with no exit). Bound the CLI itself so a stalled trial fails
# fast — as a normal nonzero trial, letting PTS's own TimesToRun retry the next trial or the composite
# report a failed result — rather than consuming the outer suite's step timeout.
timeout 240 node node_modules/fast-cli/distribution/cli.js --upload --json > "$LOG_FILE" 2>&1
status=$?
echo "$status" > ~/test-exit-status
exit "$status"
EOF
chmod +x fast-cli

echo 0 >~/install-exit-status
