import { afterAll, describe, expect, it } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Run } from "@sandbox-benchmarks/schema";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";
import { writeNormalizedRun, writeRunDocument } from "./write-run.ts";

const fixtureRoot = join(import.meta.dir, "__fixtures__");
const outDir = mkdtempSync(join(tmpdir(), "sandbox-bench-write-run-"));
const rawRoots: string[] = [];

function rawRootFor(runId: string, replicateIndex?: number): string {
	const root = mkdtempSync(join(tmpdir(), "sandbox-bench-write-raw-"));
	rawRoots.push(root);
	cpSync(join(fixtureRoot, "daytona-vm"), join(root, "daytona-vm"), { recursive: true });
	writeFileSync(
		join(root, "daytona-vm", "cpu-node", "provider-artifact-evidence.json"),
		`${JSON.stringify(
			{
				cell: {
					runId,
					providerId: "daytona-vm",
					suite: "cpu-node",
					...(replicateIndex !== undefined ? { replicateIndex } : {}),
				},
				sandboxId: `fixture-${runId}-${replicateIndex ?? "single"}`,
				provenance: {
					source: "request-fallback",
					requested: { kind: "baked", ref: "sandbox-benchmarks-toolchain-v8" },
				},
			},
			null,
			2,
		)}\n`,
	);
	return root;
}

afterAll(() => {
	rmSync(outDir, { recursive: true, force: true });
	for (const root of rawRoots) rmSync(root, { recursive: true, force: true });
});

describe("writeNormalizedRun", () => {
	const outFile = join(outDir, "runs", "run-1.json");
	const indexFile = join(outDir, "index.json");
	const run = writeNormalizedRun({
		rawRoot: rawRootFor("run-1"),
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
				rawRoot: rawRootFor("fan-1", replicateIndex),
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

	// The OTHER lane: `bench-suite --replicate <idx>` drives one sandbox, stamps its index onto the Run,
	// and deliberately writes the un-suffixed name (commit-dataset.yml's legacy shard shape). Holding it
	// to the suffixed derivation moved the very failure this PR fixes onto that lane — benchmark green,
	// shard on disk, process exit 1 at the index write.
	it("indexes a replicate-stamped Run written under the un-suffixed single-sandbox name", () => {
		const singleDir = mkdtempSync(join(tmpdir(), "sandbox-bench-single-"));
		const singleIndex = join(singleDir, "index.json");
		const outFile = join(singleDir, "runs", "solo-1.json");
		writeNormalizedRun({
			rawRoot: rawRootFor("solo-1", 3),
			runId: "solo-1",
			sha: "abc123",
			generatedAt: "2026-06-20T00:00:00.000Z",
			outFile,
			updateIndexFile: singleIndex,
			replicateIndex: 3,
		});
		expect(parseRunIndex(JSON.parse(readFileSync(singleIndex, "utf8"))).runs).toEqual([
			{
				runId: "solo-1",
				generatedAt: "2026-06-20T00:00:00.000Z",
				path: "runs/solo-1.json",
				replicateIndex: 3,
			},
		]);

		// Re-running that lane at a DIFFERENT index overwrites the same file, so the entry it replaces is
		// the one naming that file — keyed on identity alone, the index would keep a second entry
		// pointing at a document that now holds another sandbox's results.
		writeNormalizedRun({
			rawRoot: rawRootFor("solo-1", 4),
			runId: "solo-1",
			sha: "abc123",
			generatedAt: "2026-06-20T00:05:00.000Z",
			outFile,
			updateIndexFile: singleIndex,
			replicateIndex: 4,
		});
		expect(parseRunIndex(JSON.parse(readFileSync(singleIndex, "utf8"))).runs).toEqual([
			{
				runId: "solo-1",
				generatedAt: "2026-06-20T00:05:00.000Z",
				path: "runs/solo-1.json",
				replicateIndex: 4,
			},
		]);
		rmSync(singleDir, { recursive: true, force: true });
	});

	// The bug this pairing exists to prevent: an index nested inside runs/ can only ever produce entries
	// no RunIndex accepts, and it used to surface as an arktype summary AFTER a whole benchmark had run.
	it("refuses an index that does not sit at the root of its Run tree", () => {
		const nestedDir = mkdtempSync(join(tmpdir(), "sandbox-bench-nested-"));
		expect(() =>
			writeNormalizedRun({
				rawRoot: rawRootFor("nested-1"),
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

	// A correctly placed index handed a Run under a name its identity does not allow is a DIFFERENT
	// mistake from a misplaced index, and saying "the index is in the wrong place" about a perfectly
	// placed index is what sent the last reader looking in the wrong direction.
	it("names the accepted filenames when the Run document is misnamed", () => {
		const oddDir = mkdtempSync(join(tmpdir(), "sandbox-bench-odd-"));
		expect(() =>
			writeNormalizedRun({
				rawRoot: rawRootFor("odd-1", 2),
				runId: "odd-1",
				sha: "abc123",
				generatedAt: "2026-06-20T00:00:00.000Z",
				outFile: join(oddDir, "runs", "odd-1-r9.json"),
				updateIndexFile: join(oddDir, "index.json"),
				// The file claims replicate 9; the Run carries replicate 2.
				replicateIndex: 2,
			}),
		).toThrow(/must be written as "runs\/odd-1-r2.json" or "runs\/odd-1.json"/);
		rmSync(oddDir, { recursive: true, force: true });
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
