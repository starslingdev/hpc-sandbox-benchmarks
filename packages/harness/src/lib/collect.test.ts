import { afterAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { harnessSkipMarkerJson } from "@sandbox-benchmarks/schema";
import { collectResults, writeSkipMarker } from "./collect.ts";
import type { SandboxHandle } from "./execute.ts";
import { StepRunner } from "./execute.ts";

const work = mkdtempSync(join(tmpdir(), "harness-collect-"));
afterAll(() => rmSync(work, { recursive: true, force: true }));

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
		await collectResults(new StepRunner(sandbox), resultsDir);
		expect(existsSync(join(resultsDir, "pts_node-web-tooling.xml"))).toBe(true);
		expect(readFileSync(join(resultsDir, "pts_node-web-tooling.xml"), "utf8")).toBe("<xml/>");
	});

	it("accepts a results tree whose only signal is a skip marker", async () => {
		const resultsDir = join(work, "skip-only");
		const skipped = payloadSandbox({
			"pts_node-web-tooling--skipped.json": '{"skipped":true,"benchmark":"pts_node-web-tooling"}',
			"manifest.ndjson": "{}\n",
		});
		await collectResults(new StepRunner(skipped), resultsDir);
		expect(existsSync(join(resultsDir, "pts_node-web-tooling--skipped.json"))).toBe(true);
	});

	it("throws when the collected tree has no PTS result or skip marker (silent data loss)", async () => {
		// A suite that produced only provenance/timing files and neither a result nor a marker must
		// fail collection, not upload an empty-of-signal directory as a green run.
		const empty = payloadSandbox({ "manifest.ndjson": "{}\n", "cpu-info.json": "{}" });
		await expect(collectResults(new StepRunner(empty), join(work, "no-signal"))).rejects.toThrow(
			/no PTS result or skip marker/,
		);
	});

	it("throws when the payload markers are missing", async () => {
		const noMarkers: SandboxHandle = {
			runCommand: async () => ({ exitCode: 0, stdout: "no markers here" }),
			destroy: async () => undefined,
		};
		await expect(collectResults(new StepRunner(noMarkers), join(work, "x"))).rejects.toThrow(
			/markers/,
		);
	});
});

describe("writeSkipMarker", () => {
	it("writes the harness skip marker the normalizer reads", () => {
		const dir = join(work, "skip");
		writeSkipMarker(dir, "daytona", "cpu-node", "Missing credentials");
		// Pin the exact bytes, not just a shape: the producer/harness/normalizer share
		// harnessSkipMarkerJson as the single source of truth, so a key-order or newline drift here
		// would silently break the cross-package contract.
		expect(readFileSync(join(dir, "sandbox-daytona-cpu-node--skipped.json"), "utf8")).toBe(
			harnessSkipMarkerJson("daytona", "cpu-node", "Missing credentials"),
		);
	});
});
