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
# on the faster paths, OOM the sandbox:
#
#   1. It emits its JSON and returns ONLY once fast.com flips the measurement to "succeeded". fast.com
#      keeps ramping until it is confident, and on a fast datacenter->Netflix path (multi-Gbps) that means
#      Chrome buffers in-flight download/upload bytes faster than fast.com's page consumes them; a single
#      renderer climbs past ~3.5 GiB and the cgroup OOM-killer reaps it (blaxel: 2 kills / 0 metrics;
#      novita: 1 kill / JSON truncated to 2 metrics), or the exec pipe wedges (daytona). The RAM-backed
#      root fs on the 8 GiB spec makes it worse — those buffers are counted twice.
#   2. Even when it DOES converge, cli.js closes the browser via `await browser.close()` in a `finally`.
#      In these minimal headless sandboxes that close never returns, so a trial that already measured
#      cleanly still hangs until the watchdog SIGKILLs it (confirmed: modal/e2b wrote perfect JSON yet
#      both trials still burned the full ~420s).
#
# An earlier fix bounded (1) with a fixed 90s wall-clock deadline. That stopped the OOMs and hangs but
# swapped them for unreliable numbers: 90s lands mid-ramp, before fast.com's convergence, so the driver
# banked whatever transient was on the page (e2b: 0.67 Mbps download next to an 830 Mbps upload; novita
# download swinging 14 -> 230 Mbps between trials). The page's #speed-value is also re-purposed once the
# upload phase starts, so reading download at the END of the run captured a cleared value, not the result.
#
# This driver instead bounds MEMORY, not time, so a healthy path runs to fast.com's real convergence:
#   * A cgroup-aware watchdog samples the SAME accounting the OOM-killer uses (memory.current vs
#     memory.max, minus reclaimable file cache) and stops the trial once usage crosses a safe fraction of
#     the limit — well below the kill threshold. /proc/meminfo is only a last-resort fallback because on
#     these sandboxes it reports the 755 GiB HOST, not the 8 GiB cgroup limit, and would never trip.
#   * A trial stopped by that watchdog (or by the long absolute backstop) is a genuine failure to measure,
#     so it exits nonzero and PTS records a failed trial instead of banking a truncated row.
#   * The download plateau is latched WHILE the upload phase is still zero, so the end-of-run re-purposing
#     of #speed-value can no longer zero it out.
#   * Completion is fast.com's own `succeeded`/isDone signal OR a stability fallback. The fallback exists
#     because on the fastest paths fast.com never flips the `succeeded` class, and gating on isDone alone
#     would fail providers that are in fact measuring cleanly. Bufferbloat-hold alone is NOT finality:
#     fast.com renders #bufferbloat-value DURING the download phase, ~10s before the first upload byte on
#     a healthy path (live probes 2026-07-21: bufferbloat positive at ~5-6s, upload first positive at
#     ~15-17s; the 29799034615 trials showed bufferbloat 6-11 with uploaded:0). So the fallback requires
#     the upload phase to have started AND its displayed max to have been stable for SETTLE_MS, on top of
#     the bufferbloat hold and MIN_MS, and only before the backstop instant. A run whose upload never
#     starts or never stabilizes runs to BACKSTOP_MS and exits 1 as a failed trial (the designed
#     failed-measurement shape).
#
# The generator is read by hand (never `for await`, whose implicit break would call the generator's
# .return() and trigger the hanging browser.close()); the driver then HARD-exits without closing the
# browser and the launcher below reaps the orphaned Chrome.
cat <<'DRIVER_EOF' >fast-driver.mjs
import fs from "node:fs";
// Relative ESM specifiers resolve against THIS module's location (the installed-tests dir), not the
// process CWD, so the driver finds fast-cli however PTS invokes the launcher.
import api from "./node_modules/fast-cli/distribution/api.js";
import { convertToMbps } from "./node_modules/fast-cli/distribution/utilities.js";

// Tunables (all overridable via env; defaults are internally self-consistent). A non-numeric or
// non-positive override falls back to the default rather than degrading the bound.
function positiveEnv(name, fallback, max = Infinity) {
	const value = Number(process.env[name]);
	return Number.isFinite(value) && value > 0 && value < max ? value : fallback;
}
// Stop the trial once cgroup memory usage crosses this percent of the limit. The OOM'ing renderer sat
// near ~3.5 GiB on an 8 GiB box (~44%); tripping at 60% (used) leaves ~40% headroom for the hard-exit
// and Chrome reap while still letting most paths converge first.
const MEM_STOP_PCT = positiveEnv("FAST_CLI_MEM_STOP_PCT", 60, 100);
// Absolute last-resort stop. Parsed with the launcher's digits-only rule (its shell `case` below), NOT
// positiveEnv's looser Number(): the launcher derives its watchdog (= backstop + 30s) from the same var
// and drops any non-integer (fractional/scientific) string back to 180000. Honoring such an override
// here alone would let the watchdog undershoot the backstop and SIGKILL a still-measuring trial. The
// upper bound is setTimeout's 32-bit limit: a larger delay silently wraps to fire ~immediately, which
// would make the backstop end every trial at once, so an over-max override falls back to the default.
const backstopRaw = process.env.FAST_CLI_BACKSTOP_MS ?? "";
const BACKSTOP_MS =
	/^[0-9]+$/.test(backstopRaw) && Number(backstopRaw) > 0 && Number(backstopRaw) <= 2147483647
		? Number(backstopRaw)
		: 180000;
const MIN_MS = positiveEnv("FAST_CLI_MIN_MS", 20000); // no settle before this much measuring has happened
const SETTLE_MS = positiveEnv("FAST_CLI_SETTLE_MS", 5000); // bufferbloat must hold AND upload max must be stable this long to settle
const POLL_MS = 500; // memory sampling cadence

// --- Memory accounting -----------------------------------------------------------------------------
// The kill this replaces was the cgroup killer, so we watch what the killer watches. Try cgroup v2, then
// v1, then /proc/meminfo, and take the MOST-pressured view: on a host-reporting sandbox meminfo shows a
// tiny fraction while the cgroup shows the real one, so max() picks the signal that actually matters.
function readIntFile(path) {
	try {
		return Number.parseInt(fs.readFileSync(path, "utf8").trim(), 10);
	} catch {
		return Number.NaN;
	}
}
function cgroupV2() {
	let raw;
	try {
		raw = fs.readFileSync("/sys/fs/cgroup/memory.max", "utf8").trim();
	} catch {
		return null;
	}
	const limit = raw === "max" ? Number.POSITIVE_INFINITY : Number.parseInt(raw, 10);
	let used = readIntFile("/sys/fs/cgroup/memory.current");
	if (!Number.isFinite(used)) return null;
	// Reclaimable file cache is evicted before the cgroup OOMs, so counting it as pressure would trip us
	// early; subtract the clean, first-to-be-evicted slice.
	try {
		const match = fs.readFileSync("/sys/fs/cgroup/memory.stat", "utf8").match(/^inactive_file (\d+)$/m);
		if (match) used = Math.max(0, used - Number.parseInt(match[1], 10));
	} catch {}
	return { limit, used };
}
function cgroupV1() {
	const limit = readIntFile("/sys/fs/cgroup/memory/memory.limit_in_bytes");
	let used = readIntFile("/sys/fs/cgroup/memory/memory.usage_in_bytes");
	if (!Number.isFinite(limit) || !Number.isFinite(used)) return null;
	// memory.usage_in_bytes counts reclaimable page cache, so subtract the file-backed inactive slice the
	// kernel evicts before OOM — the same working-set treatment cgroupV2 applies above, or Chrome's
	// in-flight download buffers would inflate usage past MEM_STOP_PCT and fail a healthy trial. v1
	// memory.stat's hierarchical total_inactive_file is the documented reclaimable-cache figure.
	try {
		const match = fs
			.readFileSync("/sys/fs/cgroup/memory/memory.stat", "utf8")
			.match(/^total_inactive_file (\d+)$/m);
		if (match) used = Math.max(0, used - Number.parseInt(match[1], 10));
	} catch {}
	return { limit, used };
}
function meminfo() {
	try {
		const text = fs.readFileSync("/proc/meminfo", "utf8");
		const total = Number(text.match(/^MemTotal:\s+(\d+) kB$/m)?.[1]) * 1024;
		const available = Number(text.match(/^MemAvailable:\s+(\d+) kB$/m)?.[1]) * 1024;
		if (Number.isFinite(total) && Number.isFinite(available)) {
			return { limit: total, used: total - available };
		}
	} catch {}
	return null;
}
function memoryUsedFraction() {
	let fraction = 0;
	for (const source of [cgroupV2(), cgroupV1(), meminfo()]) {
		if (
			source &&
			Number.isFinite(source.limit) &&
			source.limit > 0 &&
			Number.isFinite(source.used) &&
			source.used >= 0
		) {
			fraction = Math.max(fraction, source.used / source.limit);
		}
	}
	return fraction; // 0 when the limit is unknown/unbounded -> never trip on memory
}

const start = Date.now();
let stopReason = null;
let downloadPhaseMax = 0; // max download seen WHILE upload was still 0 (the true download plateau)
let downloadAnyMax = 0; // fallback if the upload phase never begins
let uploadMax = 0;
let uploadMaxChangedAt = 0; // 0 = the upload phase never produced a positive reading
let latencyLast = 0;
let bufferBloatLast = 0;
let bufferBloatSince = 0;
let last = {};

// Stops raced against each generator step. These are TIMER-driven, not yield-driven, on purpose:
// fast-cli's generator only yields on CHANGE (`!isDeepStrictEqual`), so once a fast path plateaus it stops
// yielding and `iterator.next()` blocks forever. A settle/memory check that only ran on a new value would
// never fire on exactly that plateau; timers keep evaluating regardless. A resolved promise stays
// resolved, so once one fires the very next race returns it and we break.
function stopWhen(reason, predicate) {
	return new Promise((resolve) => {
		const timer = setInterval(() => {
			if (predicate()) {
				clearInterval(timer);
				resolve(reason);
			}
		}, POLL_MS);
		timer.unref?.();
	});
}
const memoryStop = stopWhen("__memory__", () => memoryUsedFraction() * 100 >= MEM_STOP_PCT);
// Stability fallback for the fastest paths, where `succeeded` never flips. fast.com renders
// #bufferbloat-value DURING the download phase (~10s before the first upload byte on a healthy path;
// live probes 2026-07-21, and the 29799034615 trials showed bufferbloat 6-11 with uploaded:0), so a
// bufferbloat hold alone is NOT finality — it can finalize with uploadSpeed=0 before the upload phase
// was given a chance. Settle therefore also requires the upload phase to have STARTED and its displayed
// max to have STOPPED INCREASING for SETTLE_MS (mere positivity would bank an early-ramp value: the
// display keeps ramping for 2-10s after the first positive byte), and it can never fire at/after the
// backstop instant, so a timer tie at the ceiling is labeled backstop, honestly. A run whose upload
// never starts or never stabilizes runs to BACKSTOP_MS and exits 1 as a failed trial.
const settleStop = stopWhen("__settle__", () => {
	const now = Date.now();
	return (
		now - start < BACKSTOP_MS &&
		uploadMaxChangedAt !== 0 &&
		now - uploadMaxChangedAt >= SETTLE_MS &&
		bufferBloatSince &&
		now - start >= MIN_MS &&
		now - bufferBloatSince >= SETTLE_MS
	);
});
const backstop = new Promise((resolve) => {
	setTimeout(() => resolve("__backstop__"), BACKSTOP_MS).unref?.();
});

const iterator = api({ measureUpload: true })[Symbol.asyncIterator]();
try {
	while (true) {
		const step = await Promise.race([iterator.next(), memoryStop, settleStop, backstop]);
		if (step === "__memory__") {
			stopReason = "memory";
			break;
		}
		if (step === "__settle__") {
			stopReason = "settle";
			break;
		}
		if (step === "__backstop__") {
			stopReason = "backstop";
			break;
		}
		// fast-cli 5.2.0 RETURNS once fast.com reports success — it never yields a value with isDone=true
		// (it checks isDone and returns before the next yield). So a finished generator IS the natural
		// convergence, not a failure; classify it as "done". The isDone value branch below is kept as a
		// defensive catch in case a future fast-cli yields that final value instead of returning.
		if (step.done) {
			stopReason = "done";
			break;
		}
		last = step.value;
		const download = convertToMbps(step.value.downloadSpeed ?? 0, step.value.downloadUnit ?? "Mbps");
		const upload = convertToMbps(step.value.uploadSpeed ?? 0, step.value.uploadUnit ?? "Mbps");
		// Stamp the stability clock ONLY on a strict increase of the displayed max: yields where just the
		// uploaded-bytes counter changes, fluctuations at/below the max, or a late 0 reading (the page
		// re-purposes and clears elements) must not extend the settle window, and uploadMax stays monotone.
		if (upload > uploadMax) {
			uploadMax = upload;
			uploadMaxChangedAt = Date.now();
		}
		// Latch the download plateau only while the upload phase hasn't started (uploadMax still 0); once
		// it has, fast.com re-purposes #speed-value so later download readings are noise.
		if (uploadMax === 0) downloadPhaseMax = Math.max(downloadPhaseMax, download);
		downloadAnyMax = Math.max(downloadAnyMax, download);
		if (step.value.latency > 0) latencyLast = step.value.latency;
		if (step.value.bufferBloat > 0) {
			bufferBloatLast = step.value.bufferBloat;
			if (!bufferBloatSince) bufferBloatSince = Date.now();
		} else {
			// A yielded drop back to zero means bufferbloat is not currently present; restart the settle
			// window so it can only fire after CONTINUOUS presence, never on a stale early-transient stamp.
			// (bufferBloatLast keeps the last positive value for the output.)
			bufferBloatSince = 0;
		}
		if (step.value.isDone) {
			stopReason = "done";
			break;
		}
	}
} catch (error) {
	// A dead renderer or failed navigation surfaces here; keep whatever partial values we gathered.
	process.stderr.write(String((error && error.message) || error) + "\n");
	stopReason = "error";
}

// Match fast-cli's own createJsonOutput exactly: the results parser reads the tab-indented
// "downloadSpeed"/"uploadSpeed"/"latency"/"bufferBloat" lines JSON.stringify(.., "\t") produces. Report
// the latched download plateau rather than the possibly-cleared end-of-run #speed-value.
const out = {
	downloadSpeed: downloadPhaseMax > 0 ? downloadPhaseMax : downloadAnyMax,
	uploadSpeed: uploadMax,
	downloadUnit: "Mbps",
	uploadUnit: "Mbps",
	downloaded: last.downloaded,
	uploaded: last.uploaded,
	latency: latencyLast,
	bufferBloat: bufferBloatLast,
	userLocation: last.userLocation,
	serverLocations: last.serverLocations,
	userIp: last.userIp,
};
// Decide completeness from the TRUE measured values, BEFORE the de-collision nudge below, so a genuine
// zero can never be perturbed into a passing metric.
const complete =
	out.downloadSpeed > 0 && out.uploadSpeed > 0 && out.latency > 0 && out.bufferBloat > 0;

// PTS's results parser de-duplicates results by exact numeric VALUE across parser blocks
// (pts_test_result_parser::parse_result_process -> `in_array($result, $avoid_duplicates)`), NOT by
// which parser matched. On a fast, uncongested path the loaded latency equals the idle latency (e.g.
// both 2 ms), so PTS silently DROPS the bufferBloat result and the trial banks only three metrics —
// tripping the four-metric gate even though the driver measured cleanly. The dedup ignores unit/scale,
// so any two of the four parsed values that coincide (latency==bufferBloat is the common case) collapse.
// Guarantee the four are pairwise distinct: nudge any exact tie UP by 0.01, the smallest step that
// survives the dedup. Loaded latency is physically >= idle latency, so nudging the later duplicate up is
// direction-correct, and 0.01 is far below fast.com's whole-millisecond resolution — negligible on the
// Mbps throughput values too. The completeness gate above already ran on the true values, so this only
// affects what PTS parses, never whether the trial is banked.
const seenValues = new Set();
for (const key of ["downloadSpeed", "uploadSpeed", "latency", "bufferBloat"]) {
	let value = out[key];
	while (seenValues.has(value)) value = Number((value + 0.01).toFixed(2));
	out[key] = value;
	seenValues.add(value);
}

// writeSync so the JSON is flushed to the log fd before we exit; process.exit() could truncate an
// in-flight async write.
fs.writeSync(1, JSON.stringify(out, (_key, value) => (value === undefined ? undefined : value), "\t") + "\n");
process.stderr.write(
	`fast-cli: stop=${stopReason} download=${out.downloadSpeed} upload=${out.uploadSpeed} latency=${out.latency} bufferbloat=${out.bufferBloat}\n`,
);

// Bank a trial ONLY when it converged on its own (isDone or the stability fallback) AND had all four
// metrics. A memory-watchdog or backstop stop is a real failure to measure, so exit nonzero and let PTS
// record a failed trial rather than banking a truncated/garbage row. Hard-exit WITHOUT closing the
// browser — awaiting browser.close() is the hang we are avoiding; the launcher's process-group kill reaps
// the orphaned Chrome.
const converged = stopReason === "done" || stopReason === "settle";
process.exit(converged && complete ? 0 : 1);
DRIVER_EOF

# Launcher PTS executes per trial. `setsid` makes node its own process-group leader, so a negative-PID
# `kill` reaches Chrome and Chrome's own zygote/renderer children (which node spawns but does not own)
# rather than node alone. We reap that whole group on EVERY exit — clean or timed-out — because the
# driver hard-exits while Chrome is still alive: a surviving Chrome would hold its buffers into the next
# trial and can wedge this command's output pipe. The driver self-bounds (memory watchdog + absolute
# backstop), so this watchdog is only a backstop-of-the-backstop against node itself wedging; its default
# is DERIVED from the driver's backstop so it strictly outlasts it and can never SIGKILL a driver that is
# still legitimately measuring.
cat <<'LAUNCHER_EOF' >fast-cli
#!/bin/sh
setsid node "$(dirname "$0")/fast-driver.mjs" >"$LOG_FILE" 2>&1 &
pid=$!
# Watchdog default = driver backstop + 30s grace. Normalize the backstop to a positive integer FIRST,
# matching the driver's rules above so both layers resolve the SAME backstop for every input
# (a fractional/scientific OR over-max override all drop to 180000): a non-numeric value would
# otherwise arithmetic-evaluate to 0 (a 30s watchdog while the driver runs 180s), and a fractional
# one would fatally error POSIX integer arithmetic and terminate the launcher before it reaps Chrome.
bs_ms=${FAST_CLI_BACKSTOP_MS:-180000}
case "$bs_ms" in '' | *[!0-9]*) bs_ms=180000 ;; esac
# Mirror the driver's 32-bit setTimeout cap: an over-max backstop makes the driver fall back to
# 180000, so drop it here too, or the watchdog would outlast a backstop the driver never honors.
# Gate on digit length first so a value long enough to overflow POSIX arithmetic short-circuits
# out before the numeric compare, keeping the launcher alive to reap Chrome.
if [ "${#bs_ms}" -gt 10 ] || [ "$bs_ms" -gt 2147483647 ]; then bs_ms=180000; fi
backstop_s=$(( bs_ms / 1000 ))
[ "$backstop_s" -ge 1 ] || backstop_s=180
(
	sleep "${FAST_CLI_WATCHDOG_S:-$(( backstop_s + 30 ))}"
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
