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
#
# 420s (not 240s): novita's fast-cli trials (run 29587815350) exited cleanly on plain SIGTERM at ~240s
# with no crash/stderr — unlike modal's immediate Chrome-library crash — meaning the run was still
# making progress (Chrome launched, fast.com loaded) and simply hadn't converged yet. novita's sandbox
# is single-vCPU (vs. 2+ on e2b/modal/daytona), and fast-cli's own issue tracker documents Puppeteer's
# Chrome needing generous headroom on constrained hardware (sindresorhus/fast-cli#81). 2 trials at 420s
# is at most ~840s, still well inside the 2700s suite budget. Live-confirmed fixed on novita AND modal
# (run 29603585550: both validated 6/6 metrics, 0 failures).
#
# Plain `timeout` — even with `-k 10` SIGKILL escalation — cannot fix daytona's hang: it only signals
# the ONE process it directly launches (node). SIGKILL gives node zero chance to run its own
# browser.close() cleanup, so Puppeteer's Chrome (and Chrome's own zygote/renderer children, which node
# spawns but does not own in the same process group) survive as orphans after node is reaped. Something
# downstream still tracking that process tree's output then blocks indefinitely on it, independent of
# node's own exit — confirmed live: run 29603585550's daytona cell hung the full 2700s outer timeout
# even with `-k 10` in place, identical to the pre-`-k` hang. Reaping node alone is not enough.
#
# Fix: `setsid` starts node as its own process group leader (PGID = its PID), so every process it
# spawns — including Chrome and Chrome's own children — inherits that same PGID unless it explicitly
# detaches. A negative PID passed to `kill` targets the WHOLE group at once, so both the timeout and
# the final kill below reach Chrome's entire subprocess tree, not just the top-level node process.
setsid node node_modules/fast-cli/distribution/cli.js --upload --json > "$LOG_FILE" 2>&1 &
pid=$!
(
	sleep 420
	kill -TERM -"$pid" 2>/dev/null
	sleep 10
	kill -KILL -"$pid" 2>/dev/null
) &
watcher=$!
wait "$pid"
status=$?
kill "$watcher" 2>/dev/null
wait "$watcher" 2>/dev/null
echo "$status" > ~/test-exit-status
exit "$status"
EOF
chmod +x fast-cli

echo 0 >~/install-exit-status
