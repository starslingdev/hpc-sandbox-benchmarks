import { afterAll, describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Run } from "@sandbox-benchmarks/schema";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";
import { writeNormalizedRun, writeRunDocument } from "./write-run.ts";

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

	// The fan-out lane: R shards of one cell share a runId and differ only by replicate index, so the
	// index has to hold one entry per SANDBOX. Keyed by the id alone, r1 would evict r0 and the index
	// would describe a 1-sandbox cell that never happened.
	it("indexes every replicate shard of one runId, newest first", () => {
		const shardDir = mkdtempSync(join(tmpdir(), "sandbox-bench-shards-"));
		const shardIndex = join(shardDir, "index.json");
		for (const replicateIndex of [0, 1]) {
			writeNormalizedRun({
				rawRoot,
				runId: "fan-1",
				sha: "abc123",
				generatedAt: `2026-06-20T00:0${replicateIndex}:00.000Z`,
				outFile: join(shardDir, "runs", `fan-1-r${replicateIndex}.json`),
				updateIndexFile: shardIndex,
				replicateIndex,
			});
		}
		const index = parseRunIndex(JSON.parse(readFileSync(shardIndex, "utf8")));
		expect(index.runs).toEqual([
			{
				runId: "fan-1",
				generatedAt: "2026-06-20T00:01:00.000Z",
				path: "runs/fan-1-r1.json",
				replicateIndex: 1,
			},
			{
				runId: "fan-1",
				generatedAt: "2026-06-20T00:00:00.000Z",
				path: "runs/fan-1-r0.json",
				replicateIndex: 0,
			},
		]);
		rmSync(shardDir, { recursive: true, force: true });
	});

	// The bug this pairing exists to prevent: an index nested inside runs/ can only ever derive entries
	// no RunIndex accepts, and it used to surface as an arktype summary AFTER a whole benchmark had run.
	it("refuses an index that does not sit at the root of its Run tree", () => {
		const nestedDir = mkdtempSync(join(tmpdir(), "sandbox-bench-nested-"));
		expect(() =>
			writeNormalizedRun({
				rawRoot,
				runId: "nested-1",
				sha: "abc123",
				generatedAt: "2026-06-20T00:00:00.000Z",
				outFile: join(nestedDir, "runs", "nested-1.json"),
				// Beside the Run rather than at the root of the tree holding it.
				updateIndexFile: join(nestedDir, "runs", "index.json"),
			}),
		).toThrow(/must sit at the ROOT/);
		rmSync(nestedDir, { recursive: true, force: true });
	});
});

describe("writeRunDocument (publish primitive)", () => {
	const run: Run = {
		schemaVersion: "2",
		runId: "pub-1",
		sha: "deadbeef",
		generatedAt: "2026-06-21T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers: [
			{
				providerId: "daytona",
				validationStatus: "pending",
				observedSpecs: {},
				metrics: [],
				suitesCovered: [],
				gaps: [],
				uncatalogued: [],
			},
		],
	};
	const outFile = join(outDir, "dataset", "runs", "pub-1.json");
	const indexFile = join(outDir, "dataset", "index.json");

	it("writes an already-built Run + indexes it (no normalization)", () => {
		writeRunDocument(run, outFile, indexFile);
		expect(parseRun(JSON.parse(readFileSync(outFile, "utf8")))).toEqual(run);
		const index = parseRunIndex(JSON.parse(readFileSync(indexFile, "utf8")));
		expect(index.runs[0]).toEqual({
			runId: "pub-1",
			generatedAt: "2026-06-21T00:00:00.000Z",
			path: "runs/pub-1.json",
		});
	});
});
