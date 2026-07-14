import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ProviderTransport } from "@sandbox-benchmarks/schema";
import { harnessGapMarkerJson } from "@sandbox-benchmarks/schema";
import { collectResults, writeGapMarker } from "./collect.ts";
import type { SandboxHandle } from "./execute.ts";
import { StepRunner } from "./execute.ts";

const work = mkdtempSync(join(tmpdir(), "harness-collect-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

// Marker extraction is transport-agnostic, so run collect synchronously (uncapped) — the dumb payload
// fakes return their stdout for every command, which the detached cat-poll would misread as a done-file.
// The detached collect path is covered by execute.test.ts and end-to-end in index.test.ts.
const UNCAPPED: ProviderTransport = { streaming: false, syncCapMs: null, detachedPoll: false };

// Build the exact stdout the in-sandbox collect command emits: markers around a base64'd tar of a
// benchmark-results/ directory holding the given files (name → contents).
function collectPayload(files: Record<string, string>): string {
	const src = mkdtempSync(join(tmpdir(), "harness-src-"));
	mkdirSync(join(src, "benchmark-results"), { recursive: true });
	for (const [name, contents] of Object.entries(files)) {
		writeFileSync(join(src, "benchmark-results", name), contents);
	}
	const b64 = execFileSync("bash", ["-c", "tar -czf - benchmark-results | base64 | tr -d '\\n'"], {
		cwd: src,
		encoding: "utf8",
	});
	rmSync(src, { recursive: true, force: true });
	return `noise\n__BENCH_RESULTS_TGZ_BEGIN__\n${b64}\n__BENCH_RESULTS_TGZ_END__\ntrailing\n`;
}

function payloadSandbox(files: Record<string, string>): SandboxHandle {
	return {
		runCommand: async () => ({ exitCode: 0, stdout: collectPayload(files) }),
		destroy: async () => undefined,
	};
}

const sandbox = payloadSandbox({ "pts_node-web-tooling.xml": "<xml/>" });

describe("collectResults", () => {
	it("extracts the base64 tar stream into the results directory", async () => {
		const resultsDir = join(work, "daytona");
		await collectResults(new StepRunner(sandbox, UNCAPPED), resultsDir);
		expect(existsSync(join(resultsDir, "pts_node-web-tooling.xml"))).toBe(true);
		expect(readFileSync(join(resultsDir, "pts_node-web-tooling.xml"), "utf8")).toBe("<xml/>");
	});

	it("accepts a results tree whose only signal is a skip marker", async () => {
		const resultsDir = join(work, "skip-only");
		const skipped = payloadSandbox({
			"pts_node-web-tooling--skipped.json": '{"skipped":true,"benchmark":"pts_node-web-tooling"}',
			"manifest.ndjson": "{}\n",
		});
		await collectResults(new StepRunner(skipped, UNCAPPED), resultsDir);
		expect(existsSync(join(resultsDir, "pts_node-web-tooling--skipped.json"))).toBe(true);
	});

	it("accepts a results tree whose only signal is a FAILURE marker", async () => {
		// The guard keys on the filename, so it has to recognise BOTH marker suffixes: a suite that ran and
		// crashed reports a `--failed.json` and nothing else, and rejecting that as "no usable output" would
		// throw away the one file that says what went wrong.
		const resultsDir = join(work, "fail-only");
		const failed = payloadSandbox({
			"sandbox-daytona-cpu-node--failed.json":
				'{"provider":"daytona","suite":"cpu-node","outcome":"failed","reason":"PTS died"}',
			"manifest.ndjson": "{}\n",
		});
		await collectResults(new StepRunner(failed, UNCAPPED), resultsDir);
		expect(existsSync(join(resultsDir, "sandbox-daytona-cpu-node--failed.json"))).toBe(true);
	});

	it("throws when the collected tree has no PTS result or gap marker (silent data loss)", async () => {
		// A suite that produced only provenance/timing files and neither a result nor a marker must
		// fail collection, not upload an empty-of-signal directory as a green run.
		const empty = payloadSandbox({ "manifest.ndjson": "{}\n", "cpu-info.json": "{}" });
		await expect(
			collectResults(new StepRunner(empty, UNCAPPED), join(work, "no-signal")),
		).rejects.toThrow(/no PTS result or gap marker/);
	});

	it("throws when the payload markers are missing", async () => {
		const noMarkers: SandboxHandle = {
			runCommand: async () => ({ exitCode: 0, stdout: "no markers here" }),
			destroy: async () => undefined,
		};
		await expect(
			collectResults(new StepRunner(noMarkers, UNCAPPED), join(work, "x")),
		).rejects.toThrow(/markers/);
	});
});

describe("writeGapMarker", () => {
	it("writes the harness skip marker the normalizer reads", () => {
		const dir = join(work, "skip");
		writeGapMarker(dir, "daytona", "cpu-node", "skipped", "Missing credentials");
		// Pin the exact bytes, not just a shape: the producer/harness/normalizer share
		// harnessGapMarkerJson as the single source of truth, so a key-order or newline drift here
		// would silently break the cross-package contract.
		expect(readFileSync(join(dir, "sandbox-daytona-cpu-node--skipped.json"), "utf8")).toBe(
			harnessGapMarkerJson("daytona", "cpu-node", "skipped", "Missing credentials"),
		);
	});

	it("writes a FAILED marker to its own filename, so the outcome survives in the name alone", () => {
		// The suffix is what the collector's "did this suite report anything?" guard and the extractor both
		// key on, so a crash and a deliberate skip must not land in the same file. A failure recorded as a
		// skip would publish an outage as a decision we made.
		const dir = join(work, "fail");
		writeGapMarker(dir, "daytona", "cpu-node", "failed", "PTS produced no pts_*.xml");
		expect(readFileSync(join(dir, "sandbox-daytona-cpu-node--failed.json"), "utf8")).toBe(
			harnessGapMarkerJson("daytona", "cpu-node", "failed", "PTS produced no pts_*.xml"),
		);
		expect(existsSync(join(dir, "sandbox-daytona-cpu-node--skipped.json"))).toBe(false);
	});
});
