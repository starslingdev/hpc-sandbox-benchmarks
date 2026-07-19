#!/bin/sh
set -eu

# Upstream fast-cli-1.0.0 installs the mutable latest npm package, then generates a launcher for its
# historical cli.js path. fast-cli 5.2.0 exposes distribution/cli.js instead, so the upstream profile
# installs successfully but every trial exits before producing a value. Pin the package and generate
# our own launcher against that version. When the baked image already contains 5.2.0, avoid reinstalling.
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
	echo "ERROR: fast-cli requires node and npm" >&2
	echo 2 >~/install-exit-status
	exit 2
fi

installed_version="$(node -p "try { require('./node_modules/fast-cli/package.json').version } catch { '' }" 2>/dev/null || true)"
if [ "$installed_version" != "5.2.0" ]; then
	npm install --prefix . --no-audit --no-fund fast-cli@5.2.0
fi

# We drive fast-cli's browser generator ourselves instead of running its `cli.js`, because that CLI has
# two failure modes that made every trial on every provider run to the outer watchdog (~850s/suite) and,
# on the slower paths, OOM the sandbox:
#
#   1. It emits its JSON and returns ONLY once fast.com flips the measurement to "succeeded". On a
#      degraded datacenter->Netflix path that state can take minutes or never arrive, and until then the
#      generator loops, Chrome keeps buffering the ongoing download, and a single renderer climbs past
#      ~3.5 GiB — the kernel OOM-killer then reaps it (blaxel: 2 kills / 0 metrics; novita: 1 kill /
#      JSON truncated to 2 metrics), or the exec pipe wedges with no output at all (daytona). On the 8
#      GiB spec — worse where the root fs is RAM-backed and the buffers are counted twice — this is fatal.
#   2. Even when it DOES converge, cli.js closes the browser via `await browser.close()` in a `finally`.
#      In these minimal headless sandboxes that close never returns, so a trial that already measured
#      cleanly still hangs until the watchdog SIGKILLs it (confirmed: modal/e2b wrote perfect JSON yet
#      both trials still burned the full ~420s).
#
# The driver reads the same generator by hand (never `for await`, whose implicit break would call the
# generator's .return() and trigger that hanging browser.close()), stops at fast.com's own "succeeded"
# signal OR a hard deadline, writes the exact JSON shape the PTS results parser keys on, then HARD-exits
# without closing the browser. The launcher below reaps the orphaned Chrome. A run that never produced a
# download figure exits nonzero so PTS records a failed trial rather than parsing a bogus 0.
cat <<'DRIVER_EOF' >fast-driver.mjs
import fs from "node:fs";
// Relative ESM specifiers resolve against THIS module's location (the installed-tests dir), not the
// process CWD, so the driver finds fast-cli however PTS invokes the launcher.
import api from "./node_modules/fast-cli/distribution/api.js";
import { convertToMbps } from "./node_modules/fast-cli/distribution/utilities.js";

// fast.com normally converges in ~30-60s; a healthy path exits well before this on the "succeeded"
// signal, so the deadline only bites degraded paths — bounding Chrome's download buffers below the OOM
// threshold and turning an indefinite hang into a fast, clean trial result.
const DEADLINE_MS = Number(process.env.FAST_CLI_DEADLINE_MS || 90000);
const deadline = new Promise((resolve) => setTimeout(() => resolve("__deadline__"), DEADLINE_MS));

let data = {};
const iterator = api({ measureUpload: true })[Symbol.asyncIterator]();
try {
	while (true) {
		// Race each step against the shared deadline: a wedged CDP call against a dead/OOM'd renderer
		// would otherwise stall ~180s on Puppeteer's protocolTimeout, outlasting the bound.
		const step = await Promise.race([iterator.next(), deadline]);
		if (step === "__deadline__") break;
		if (step.done) break;
		data = step.value;
		if (data.isDone) break;
	}
} catch (error) {
	// A dead renderer or failed navigation surfaces here; keep whatever partial values we gathered.
	process.stderr.write(String((error && error.message) || error) + "\n");
}

// Match fast-cli's own createJsonOutput exactly: the results parser reads the tab-indented
// "downloadSpeed"/"uploadSpeed"/"latency"/"bufferBloat" lines JSON.stringify(.., "\t") produces.
const out = {
	downloadSpeed: convertToMbps(data.downloadSpeed ?? 0, data.downloadUnit ?? "Mbps"),
	uploadSpeed: convertToMbps(data.uploadSpeed ?? 0, data.uploadUnit ?? "Mbps"),
	downloadUnit: "Mbps",
	uploadUnit: "Mbps",
	downloaded: data.downloaded,
	uploaded: data.uploaded,
	latency: data.latency,
	bufferBloat: data.bufferBloat,
	userLocation: data.userLocation,
	serverLocations: data.serverLocations,
	userIp: data.userIp,
};
// writeSync so the JSON is flushed to the log fd before we exit; process.exit() could truncate an
// in-flight async write.
fs.writeSync(1, JSON.stringify(out, (_key, value) => (value === undefined ? undefined : value), "\t") + "\n");

// Hard-exit WITHOUT closing the browser — awaiting browser.close() is the hang we are avoiding, and the
// launcher's process-group kill reaps the orphaned Chrome. Nonzero when no download was measured at all.
process.exit(out.downloadSpeed > 0 ? 0 : 1);
DRIVER_EOF

# Launcher PTS executes per trial. `setsid` makes node its own process-group leader, so a negative-PID
# `kill` reaches Chrome and Chrome's own zygote/renderer children (which node spawns but does not own)
# rather than node alone. We reap that whole group on EVERY exit — clean or timed-out — because the
# driver hard-exits while Chrome is still alive: a surviving Chrome would hold its buffers into the next
# trial and can wedge this command's output pipe. The watchdog is now only a backstop against node
# itself wedging (the driver self-bounds via DEADLINE_MS); keep it just above that deadline.
cat <<'LAUNCHER_EOF' >fast-cli
#!/bin/sh
setsid node "$(dirname "$0")/fast-driver.mjs" >"$LOG_FILE" 2>&1 &
pid=$!
(
	sleep "${FAST_CLI_WATCHDOG_S:-120}"
	kill -TERM -"$pid" 2>/dev/null
	sleep 10
	kill -KILL -"$pid" 2>/dev/null
) &
watcher=$!
wait "$pid"
status=$?
kill "$watcher" 2>/dev/null
wait "$watcher" 2>/dev/null
kill -KILL -"$pid" 2>/dev/null
echo "$status" >~/test-exit-status
exit "$status"
LAUNCHER_EOF
chmod +x fast-cli

echo 0 >~/install-exit-status
