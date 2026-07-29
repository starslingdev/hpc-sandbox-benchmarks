/**
 * Tests for `lib/jq/curl-phases.jq` — the phase decomposition and summary statistics the network
 * probes (.mise/tasks/benchmark/network/latency) compute over curl's `%{json}` write-out.
 *
 * This is the producer's arithmetic, not TypeScript's, and it is tested here for one reason: it is
 * the only part of those bash tasks where a mistake yields a WRONG NUMBER rather than a wrong log
 * line. Extracting it into a .jq module made it executable outside the task; this file is what
 * makes that extraction worth doing.
 *
 * That the probe actually INCLUDES this module, rather than carrying its own copy, is a structural
 * invariant guarded separately in tooling/repo-checks/src/curl-phases-module.test.ts — it must keep
 * running on a machine without jq, where the tests below skip themselves.
 *
 * The records under __fixtures__/probes/curl-records.ndjson are REAL captures (`curl --write-out
 * '%{json}'`, `certs` stripped), covering the four shapes the decomposition has to survive: an HTTP/2
 * 200, a 301, a 401 auth challenge, a plain-HTTP request with no TLS milestone at all, and a
 * transport failure that returned no response. Expected values below are computed by hand from the
 * fixture's own cumulative timers — never copied from the implementation's output, which would make
 * the test agree with any bug it happens to contain.
 */
import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../../..");
const jqModules = join(repoRoot, "lib/jq");
const fixture = join(import.meta.dir, "__fixtures__/probes/curl-records.ndjson");

/** jq is baked into the toolchain image, but a contributor's machine may not have it. */
const jqAvailable = (() => {
	try {
		execFileSync("jq", ["--version"], { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
})();

/** Run a jq program with the module loaded, over a file or over literal stdin. Returns parsed lines. */
function runJq(program: string, options: { file?: string; input?: string } = {}): unknown[] {
	const args = ["-L", jqModules, "-c", `include "curl-phases"; ${program}`];
	if (options.file) args.push(options.file);
	const out = execFileSync("jq", args, { input: options.input ?? "", encoding: "utf8" });
	return out
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line));
}

/** One fixture record by the URL it was captured against — plain JSON, no jq program involved. */
function record(url: string): Record<string, unknown> {
	const rows = readFileSync(fixture, "utf8")
		.split("\n")
		.filter((line) => line.length > 0)
		.map((line) => JSON.parse(line) as Record<string, unknown>)
		.filter((row) => row.url === url);
	expect(rows).toHaveLength(1);
	return rows[0] as Record<string, unknown>;
}

const suite = jqAvailable ? describe : describe.skip;

suite("curl-phases.jq: phases", () => {
	it("decomposes cumulative timers into per-phase durations (HTTPS, hand-computed)", () => {
		// index.crates.io: namelookup .002843, connect .003363, appconnect .029185,
		// starttransfer .050828, total .050902 — each phase is the gap to the previous milestone.
		const [phases] = runJq('select(.url | contains("index.crates.io")) | phases', {
			file: fixture,
		});
		expect(phases).toEqual({
			dns: 2.843,
			tcp: 0.52, // .003363 - .002843
			tls: 25.822, // .029185 - .003363
			server: 21.643, // .050828 - .029185
			body: 0.074, // .050902 - .050828
			total: 50.902,
		});
	});

	it("reports null TLS on plain HTTP and measures server time from the TCP connect", () => {
		// http://pypi.org/ has no appconnect milestone (0). Charging .036762 - 0 to the server would
		// invent 36ms of think-time out of the connection setup; the correct base is time_connect.
		const [phases] = runJq('select(.url == "http://pypi.org/") | phases', { file: fixture });
		expect(phases).toMatchObject({
			dns: 1.849,
			tcp: 0.776, // .002625 - .001849
			tls: null,
			server: 34.137, // .036762 - .002625, NOT .036762 - 0
			total: 36.807,
		});
	});

	it("keeps sub-millisecond readings instead of rounding them to zero", () => {
		// A warm resolver answers in microseconds. Truncating to whole ms would report 0 and make a
		// cached lookup indistinguishable from one that never happened.
		const [phases] = runJq('select(.url | contains("raw.githubusercontent")) | phases', {
			file: fixture,
		});
		expect((phases as { dns: number }).dns).toBe(0.025);
		expect((phases as { body: number }).body).toBe(0.063);
	});

	it("accounts for the whole request: the phases sum to the total", () => {
		const rows = runJq(
			"select(responded) | phases | { total, sum: ([.dns, .tcp, (.tls // 0), .server, .body] | add) }",
			{ file: fixture },
		) as { total: number; sum: number }[];
		expect(rows.length).toBeGreaterThan(0);
		for (const row of rows) expect(row.sum).toBeCloseTo(row.total, 2);
	});
});

suite("curl-phases.jq: responded", () => {
	it("accepts any real response, including auth challenges and redirects", () => {
		// 401 from ghcr.io/v2/ IS the registry handshake and 301 is a complete round trip. Gating on
		// 2xx would discard the container and raw-file endpoints entirely.
		const codes = runJq("select(responded) | .response_code", { file: fixture });
		expect(codes).toEqual([200, 301, 401, 301]);
	});

	it("rejects a transport failure that never got a response", () => {
		const failed = record("https://this-host-does-not-exist.invalid/");
		expect(failed.exitcode).toBe(56);
		expect(failed.response_code).toBe(0);
		expect(runJq("select(.response_code == 0) | responded", { file: fixture })).toEqual([false]);
	});

	it("classifies a write-out with no exitcode field by its response code", () => {
		// Older curls omit `exitcode`; `// 0` keeps such a record readable rather than dropping it.
		expect(runJq("responded", { input: '{"response_code":200}' })).toEqual([true]);
		expect(runJq("responded", { input: '{"response_code":0}' })).toEqual([false]);
	});

	it("is why the statistics gate on it: an unanswered request has nonsense phases", () => {
		// time_starttransfer stays 0 on a connection that never opened, so `server` goes NEGATIVE and
		// `body` absorbs the whole timeout. Harmless only because `responded` keeps it out of stats.
		const [phases] = runJq("select(.response_code == 0) | phases", { file: fixture });
		expect((phases as { server: number }).server).toBeLessThan(0);
	});
});

suite("curl-phases.jq: stats", () => {
	it("takes the middle value of an odd-length sample", () => {
		expect(runJq("stats", { input: "[3,1,2]" })).toEqual([{ min: 1, median: 2, mean: 2, max: 3 }]);
	});

	it("averages the two middle values of an even-length sample", () => {
		expect(runJq("stats", { input: "[1,2,3,4]" })).toEqual([
			{ min: 1, median: 2.5, mean: 2.5, max: 4 },
		]);
	});

	it("rounds derived values to three decimals", () => {
		expect(runJq("stats", { input: "[0.1,0.2]" })).toEqual([
			{ min: 0.1, median: 0.15, mean: 0.15, max: 0.2 },
		]);
	});

	it("drops nulls rather than counting them as zero", () => {
		// A null phase is an ABSENT measurement (no TLS on plain HTTP). Treating it as 0 would drag
		// every mean toward a handshake that never happened.
		expect(runJq("stats", { input: "[1,null,3]" })).toEqual([
			{ min: 1, median: 2, mean: 2, max: 3 },
		]);
	});

	it("returns null for an empty sample, never a zero-valued distribution", () => {
		expect(runJq("stats", { input: "[]" })).toEqual([null]);
		expect(runJq("stats", { input: "[null,null]" })).toEqual([null]);
	});
});
