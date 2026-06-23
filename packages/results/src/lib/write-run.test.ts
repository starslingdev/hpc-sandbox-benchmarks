import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";
import { writeNormalizedRun } from "./write-run.ts";

const rawRoot = join(import.meta.dir, "__fixtures__");
const outDir = mkdtempSync(join(tmpdir(), "sandbox-bench-write-run-"));

afterAll(() => rmSync(outDir, { recursive: true, force: true }));

describe("writeNormalizedRun", () => {
	const outFile = join(outDir, "runs", "run-1.json");
	const indexFile = join(outDir, "index.json");
	const run = writeNormalizedRun({
		rawRoot,
		runId: "run-1",
		sha: "abc123",
		generatedAt: "2026-06-20T00:00:00.000Z",
		outFile,
		updateIndexFile: indexFile,
	});

	it("writes a Run document that re-parses against the schema", () => {
		const written = parseRun(JSON.parse(readFileSync(outFile, "utf8")));
		expect(written.runId).toBe("run-1");
		expect(written).toEqual(run);
	});

	it("records the run in the index with a path relative to the index file", () => {
		const index = parseRunIndex(JSON.parse(readFileSync(indexFile, "utf8")));
		expect(index.runs).toEqual([
			{ runId: "run-1", generatedAt: "2026-06-20T00:00:00.000Z", path: "runs/run-1.json" },
		]);
	});
});
