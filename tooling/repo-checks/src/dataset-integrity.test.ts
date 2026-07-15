// The committed dataset is a two-part artifact: index.json and every Run document it names. Validate
// the real tree in both directions so a malformed/orphaned Run or stale/misdirected index entry cannot
// merge merely because LEADERBOARD.md happens to render an older Run.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const DATASET = join(findRepoRoot(), "data", "dataset");
const RUNS = join(DATASET, "runs");

describe("committed dataset integrity", () => {
	it("indexes every valid Run exactly once with matching identity and timestamp", () => {
		const index = parseRunIndex(JSON.parse(readFileSync(join(DATASET, "index.json"), "utf8")));
		const seen = new Set<string>();

		for (const entry of index.runs) {
			expect(seen.has(entry.runId), `duplicate Run index entry: ${entry.runId}`).toBe(false);
			seen.add(entry.runId);
			// Promotion owns this canonical shape. Pinning it also prevents an index path from escaping the
			// dataset or aliasing a different Run document.
			expect(entry.path).toBe(`runs/${entry.runId}.json`);
			const run = parseRun(JSON.parse(readFileSync(join(DATASET, entry.path), "utf8")));
			expect(run.runId).toBe(entry.runId);
			expect(run.generatedAt).toBe(entry.generatedAt);
		}

		const indexedFiles = index.runs.map((entry) => basename(entry.path)).sort();
		const committedFiles = readdirSync(RUNS)
			.filter((file) => file.endsWith(".json"))
			.sort();
		expect(indexedFiles).toEqual(committedFiles);
	});
});
