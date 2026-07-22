/**
 * Subprocess gate for the fast-cli driver embedded in pts-profiles/fast-cli-1.0.0/install.sh (the
 * fast-driver.mjs heredoc). The driver under test is extracted VERBATIM from the shipped install.sh --
 * never a duplicate copy -- so these scenarios exercise exactly what runs on providers. Each scenario
 * stages a temp dir holding the driver plus scripted mocks of the two fast-cli 5.2.0 modules the driver
 * resolves relative to itself, spawns the driver, and asserts on its stdout JSON, its
 * `fast-cli: stop=...` stderr line, and its exit code. No network, no Chrome.
 *
 * Pinned regression (P1, run 29799034615): fast.com renders #bufferbloat-value DURING the download
 * phase, so a settle predicate gated on bufferbloat-hold alone finalized trials whose upload phase never
 * started (uploadSpeed=0 labeled "settle" at the backstop ceiling) or was still ramping (banked mid-ramp
 * garbage with exit 0). Settle may only fire once the upload max has been stable for SETTLE_MS, and
 * never at/after the backstop instant.
 *
 * Timing notes: POLL_MS is hardcoded at 500ms in the driver, so the scaled-down SETTLE_MS must exceed
 * one tick, and elapsed-time assertions carry generous slack. FAST_CLI_MEM_STOP_PCT=99 is REQUIRED: on
 * Linux CI the /proc/meminfo fallback reports a real fraction of host memory (it is only inert on hosts
 * without /proc/meminfo), so the 60% default could trip on a loaded runner and flake every scenario; 99
 * keeps the watchdog armed but unreachable.
 */

import { afterAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const INSTALL_SH = join(import.meta.dir, "pts-profiles/fast-cli-1.0.0/install.sh");

// Scaled-down tunables preserving the production ordering (SETTLE_MS < MIN_MS < BACKSTOP_MS) while
// keeping SETTLE_MS above the hardcoded 500ms poll tick.
const MIN_MS = 1500;
const SETTLE_MS = 700;
const BACKSTOP_MS = 5000;
const TEST_TIMEOUT_MS = 20000;

function extractDriverSource(): string {
	const lines = readFileSync(INSTALL_SH, "utf8").split("\n");
	const begin = lines.indexOf("cat <<'DRIVER_EOF' >fast-driver.mjs");
	const end = begin === -1 ? -1 : lines.indexOf("DRIVER_EOF", begin + 1);
	if (begin === -1 || end === -1) {
		throw new Error("install.sh no longer embeds the fast-driver.mjs heredoc");
	}
	return lines.slice(begin + 1, end).join("\n");
}
const DRIVER_SOURCE = extractDriverSource();

// Scripted stand-in for fast-cli 5.2.0's default-export async generator (interface verified against the
// real distribution: `api(options)[Symbol.asyncIterator]()` consumed by hand). Replays {delayMs, value}
// entries from MOCK_SCRIPT, then either returns (natural convergence) or idles the way the real
// generator does on a plateau -- it yields only on CHANGE, so iterator.next() blocks forever. The
// keep-alive interval stands in for the live browser sockets that hold the real process's event loop
// open while the driver's unref'd stop timers keep evaluating.
const MOCK_API_JS = `import fs from "node:fs";
export default async function* api() {
	const script = JSON.parse(fs.readFileSync(process.env.MOCK_SCRIPT, "utf8"));
	for (const step of script.steps) {
		if (step.delayMs) await new Promise((resolve) => setTimeout(resolve, step.delayMs));
		yield step.value;
	}
	if (script.done) return;
	setInterval(() => {}, 2 ** 30);
	await new Promise(() => {});
}
`;
const MOCK_UTILITIES_JS = `export function convertToMbps(value, unit) {
	return unit === "Gbps" ? value * 1000 : value;
}
`;

/** The yield shape fast-cli 5.2.0's generator produces (what the driver destructures). */
type MockValue = {
	downloadSpeed: number;
	uploadSpeed: number;
	downloadUnit: string;
	uploadUnit: string;
	downloaded: number;
	uploaded: number;
	latency: number;
	bufferBloat: number;
	isDone: boolean;
	userLocation: string;
	serverLocations: string;
	userIp: string;
};
type Step = { delayMs: number; value: MockValue };

function value(partial: Partial<MockValue>): MockValue {
	return {
		downloadSpeed: 0,
		uploadSpeed: 0,
		downloadUnit: "Mbps",
		uploadUnit: "Mbps",
		downloaded: 0,
		uploaded: 0,
		latency: 0,
		bufferBloat: 0,
		isDone: false,
		userLocation: "Test, TS",
		serverLocations: "Mock, MO",
		userIp: "203.0.113.7",
		...partial,
	};
}

const tempRoots: string[] = [];
afterAll(() => {
	for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

function runDriver(script: { steps: Step[]; done?: boolean }) {
	const dir = mkdtempSync(join(tmpdir(), "fast-cli-driver-"));
	tempRoots.push(dir);
	writeFileSync(join(dir, "fast-driver.mjs"), DRIVER_SOURCE);
	const distribution = join(dir, "node_modules/fast-cli/distribution");
	mkdirSync(distribution, { recursive: true });
	writeFileSync(join(distribution, "api.js"), MOCK_API_JS);
	writeFileSync(join(distribution, "utilities.js"), MOCK_UTILITIES_JS);
	const scriptPath = join(dir, "scenario.json");
	writeFileSync(scriptPath, JSON.stringify(script));
	const startedAt = Date.now();
	const proc = Bun.spawnSync([process.execPath, "fast-driver.mjs"], {
		cwd: dir,
		env: {
			...process.env,
			FAST_CLI_MIN_MS: String(MIN_MS),
			FAST_CLI_SETTLE_MS: String(SETTLE_MS),
			FAST_CLI_BACKSTOP_MS: String(BACKSTOP_MS),
			FAST_CLI_MEM_STOP_PCT: "99",
			MOCK_SCRIPT: scriptPath,
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const elapsedMs = Date.now() - startedAt;
	const stdout = proc.stdout.toString();
	const stderr = proc.stderr.toString();
	return {
		exitCode: proc.exitCode,
		elapsedMs,
		stderr,
		stopReason: stderr.match(/stop=(\w+)/)?.[1],
		json: stdout.trim() ? JSON.parse(stdout) : null,
	};
}

describe("fast-cli driver (extracted verbatim from install.sh)", () => {
	it("imports exactly the two fast-cli modules the mocks replace", () => {
		// If the driver's import specifiers drift, the mocks would silently stop intercepting.
		expect(DRIVER_SOURCE).toContain('from "./node_modules/fast-cli/distribution/api.js"');
		expect(DRIVER_SOURCE).toContain('from "./node_modules/fast-cli/distribution/utilities.js"');
	});

	it(
		"backstops (never settles) when bufferbloat holds but the upload phase never starts",
		() => {
			// The P1 shape (e2b/novita): bufferbloat renders during the download phase and holds while
			// uploadSpeed stays 0 for the whole run. Settle must NOT fire at ~MIN_MS -- the run must be
			// bounded by BACKSTOP_MS, labeled backstop, and exit 1 so PTS records a failed trial.
			const steps: Step[] = [];
			for (let i = 0; i < 9; i++) {
				steps.push({
					delayMs: 250,
					value: value({
						downloadSpeed: 100 + i * 40,
						downloaded: (i + 1) * 5,
						latency: 12,
						bufferBloat: 34,
					}),
				});
			}
			const result = runDriver({ steps });
			expect(result.stopReason).toBe("backstop");
			expect(result.exitCode).toBe(1);
			expect(result.json?.uploadSpeed).toBe(0);
			// Only the backstop timer can end this run, so it spans at least BACKSTOP_MS.
			expect(result.elapsedMs).toBeGreaterThanOrEqual(BACKSTOP_MS - 100);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"defers settle while the upload max is still ramping and labels a ceiling tie backstop",
		() => {
			// The modal-gvisor shape: upload goes positive but keeps strictly increasing (gaps well under
			// SETTLE_MS) all the way to the ceiling. A positivity-hold would bank a mid-ramp value
			// SETTLE_MS after the first byte with exit 0; the plateau-hold must defer until the max stops
			// increasing -- which never happens here -- so the run ends at the backstop with exit 1.
			const steps: Step[] = [
				{ delayMs: 100, value: value({ downloadSpeed: 200, latency: 12, bufferBloat: 34 }) },
			];
			let upload = 0;
			for (let at = 400; at <= 4650; at += 250) {
				upload += 10;
				steps.push({
					delayMs: at === 400 ? 300 : 250,
					value: value({
						downloadSpeed: 200,
						uploadSpeed: upload,
						uploaded: upload,
						latency: 12,
						bufferBloat: 34,
					}),
				});
			}
			const result = runDriver({ steps });
			expect(result.stopReason).toBe("backstop");
			expect(result.exitCode).toBe(1);
			expect(result.elapsedMs).toBeGreaterThanOrEqual(BACKSTOP_MS - 100);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"settles only after the upload max has plateaued for SETTLE_MS, and banks the plateau value",
		() => {
			// Healthy-path shape: upload ramps (last increase ~1000ms), then the displayed max holds while
			// only the uploaded-bytes counter keeps changing (the real generator yields on ANY change).
			// The plateau yields continue until just before the backstop: if the stability stamp bumped on
			// equal readings (>= instead of >), settle could never fire pre-ceiling here and the run would
			// wrongly hit the backstop -- pinning the strict-increase rule without tight timing.
			const steps: Step[] = [
				{ delayMs: 100, value: value({ downloadSpeed: 500, latency: 12, bufferBloat: 34 }) },
				{
					delayMs: 300,
					value: value({ uploadSpeed: 50, uploaded: 5, latency: 12, bufferBloat: 34 }),
				},
				{
					delayMs: 300,
					value: value({ uploadSpeed: 120, uploaded: 15, latency: 12, bufferBloat: 34 }),
				},
				{
					delayMs: 300,
					value: value({ uploadSpeed: 200, uploaded: 30, latency: 12, bufferBloat: 34 }),
				},
			];
			for (let at = 1250; at <= 4800; at += 250) {
				steps.push({
					delayMs: 250,
					value: value({
						uploadSpeed: 200,
						uploaded: 30 + (at - 1000) / 10,
						latency: 12,
						bufferBloat: 34,
					}),
				});
			}
			const result = runDriver({ steps });
			expect(result.stopReason).toBe("settle");
			expect(result.exitCode).toBe(0);
			expect(result.json?.uploadSpeed).toBe(200);
			// The download plateau was latched while upload was still 0, from the first yield.
			expect(result.json?.downloadSpeed).toBe(500);
			// No earlier than last max increase (~1000ms) + SETTLE_MS; comfortably before the backstop.
			expect(result.elapsedMs).toBeGreaterThanOrEqual(1000 + SETTLE_MS - 100);
			expect(result.elapsedMs).toBeLessThan(BACKSTOP_MS - 600);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"classifies the generator returning as natural convergence (stop=done, exit 0)",
		() => {
			// fast-cli 5.2.0 RETURNS once fast.com reports success -- it never yields isDone=true.
			const steps: Step[] = [
				{ delayMs: 50, value: value({ downloadSpeed: 300, latency: 10, bufferBloat: 20 }) },
				{
					delayMs: 50,
					value: value({
						downloadSpeed: 300,
						uploadSpeed: 150,
						uploaded: 20,
						latency: 10,
						bufferBloat: 20,
					}),
				},
			];
			const result = runDriver({ steps, done: true });
			expect(result.stopReason).toBe("done");
			expect(result.exitCode).toBe(0);
			expect(result.json?.downloadSpeed).toBe(300);
			expect(result.json?.uploadSpeed).toBe(150);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"restarts the bufferbloat hold window on a flap back to zero",
		() => {
			// A yielded bufferBloat drop to 0 must restart the hold: settle may only fire SETTLE_MS after
			// the FINAL positive stretch began (~1800ms here), never off the stale first stamp (~100ms).
			// Upload is stable from ~500ms and MIN_MS passes at 1500ms, so the bufferbloat restart is the
			// binding constraint.
			const steps: Step[] = [
				{ delayMs: 100, value: value({ downloadSpeed: 400, latency: 11, bufferBloat: 30 }) },
				{
					delayMs: 200,
					value: value({ uploadSpeed: 100, uploaded: 10, latency: 11, bufferBloat: 30 }),
				},
				{
					delayMs: 200,
					value: value({ uploadSpeed: 200, uploaded: 20, latency: 11, bufferBloat: 30 }),
				},
				{
					delayMs: 200,
					value: value({ uploadSpeed: 200, uploaded: 30, latency: 11, bufferBloat: 0 }),
				},
				{
					delayMs: 1100,
					value: value({ uploadSpeed: 200, uploaded: 60, latency: 11, bufferBloat: 25 }),
				},
			];
			const result = runDriver({ steps });
			expect(result.stopReason).toBe("settle");
			expect(result.exitCode).toBe(0);
			expect(result.json?.bufferBloat).toBe(25);
			expect(result.elapsedMs).toBeGreaterThanOrEqual(1800 + SETTLE_MS - 100);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"nudges exact value ties apart so PTS's value-dedup keeps all four metrics",
		() => {
			// PTS drops parser results whose numeric value duplicates an earlier one; loaded latency ==
			// idle latency is the common tie. The later duplicate is nudged UP by 0.01.
			const steps: Step[] = [
				{ delayMs: 50, value: value({ downloadSpeed: 300, latency: 12, bufferBloat: 12 }) },
				{
					delayMs: 50,
					value: value({
						downloadSpeed: 300,
						uploadSpeed: 150,
						uploaded: 20,
						latency: 12,
						bufferBloat: 12,
					}),
				},
			];
			const result = runDriver({ steps, done: true });
			expect(result.exitCode).toBe(0);
			expect(result.json?.latency).toBe(12);
			expect(result.json?.bufferBloat).toBe(12.01);
			const four = [
				result.json?.downloadSpeed,
				result.json?.uploadSpeed,
				result.json?.latency,
				result.json?.bufferBloat,
			];
			expect(new Set(four).size).toBe(4);
		},
		TEST_TIMEOUT_MS,
	);

	it(
		"decides completeness on the true values, before the nudge (upload 0 still exits 1)",
		() => {
			// The nudge perturbs only what PTS parses; a genuine zero must never become a passing metric.
			const steps: Step[] = [
				{ delayMs: 50, value: value({ downloadSpeed: 300, latency: 12, bufferBloat: 12 }) },
			];
			const result = runDriver({ steps, done: true });
			expect(result.stopReason).toBe("done");
			expect(result.exitCode).toBe(1);
			expect(result.json?.uploadSpeed).toBe(0);
		},
		TEST_TIMEOUT_MS,
	);
});
