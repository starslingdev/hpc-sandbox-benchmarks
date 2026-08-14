// The LOCAL dataset (`data/local/`) is the bare-metal lane's own two-part artifact: index.json plus
// every Run document it names. Validated the same way the committed dataset is, for the same reason —
// a malformed or orphaned Run there would break `leaderboard`/`stability` for whoever produced it.
//
// Two differences from `dataset-integrity.test.ts`, both deliberate:
//   1. An EMPTY dataset is valid. This tree ships with `runs: []`, and a checkout that never ran a
//      local benchmark must stay green.
//   2. This file also pins the SEPARATION: `data/dataset/` is produced only by the CI matrix, and the
//      published comparison surface must never be rendered from a machine-local Run. That is the whole
//      reason the local lane got its own root rather than a subdirectory of the committed one.
import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const LOCAL = join(ROOT, "data", "local");
const RUNS = join(LOCAL, "runs");

describe("local dataset integrity", () => {
	it("indexes every committed local Run exactly once, with matching identity and timestamp", () => {
		const index = parseRunIndex(JSON.parse(readFileSync(join(LOCAL, "index.json"), "utf8")));
		const seen = new Set<string>();

		for (const entry of index.runs) {
			expect(seen.has(entry.runId), `duplicate Run index entry: ${entry.runId}`).toBe(false);
			seen.add(entry.runId);
			// `promoteRun` owns this canonical shape, shared with the CI lane's `promote` bin. Pinning it
			// also prevents an index path from escaping the dataset or aliasing a different Run document.
			expect(entry.path).toBe(`runs/${entry.runId}.json`);
			const run = parseRun(JSON.parse(readFileSync(join(LOCAL, entry.path), "utf8")));
			expect(run.runId).toBe(entry.runId);
			expect(run.generatedAt).toBe(entry.generatedAt);
		}

		const indexedFiles = index.runs.map((entry) => basename(entry.path)).sort();
		const committedFiles = readdirSync(RUNS)
			.filter((file) => file.endsWith(".json"))
			.sort();
		expect(indexedFiles).toEqual(committedFiles);
	});

	// The separation is the point of the directory existing. If the published comparison surface were
	// ever rendered from here, a laptop would set the ranks every reader sees.
	it("is not what LEADERBOARD.md is rendered from", () => {
		const leaderboard = readFileSync(join(ROOT, "LEADERBOARD.md"), "utf8");
		expect(leaderboard).not.toContain("data/local/runs/");
		expect(leaderboard).toContain("data/dataset/runs/");
	});

	it("keeps the committed CI dataset free of local-lane Runs", () => {
		const dataset = join(ROOT, "data", "dataset");
		const index = parseRunIndex(JSON.parse(readFileSync(join(dataset, "index.json"), "utf8")));
		for (const entry of index.runs) {
			const run = parseRun(JSON.parse(readFileSync(join(dataset, entry.path), "utf8")));
			for (const provider of run.providers) {
				expect(
					provider.providerId.startsWith("local"),
					`${entry.runId} carries a local-lane provider row (${provider.providerId})`,
				).toBe(false);
			}
		}
	});
});
