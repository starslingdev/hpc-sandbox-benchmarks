#!/usr/bin/env bun
import { readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { rederiveRunEconomics, writeRunDocument } from "@sandbox-benchmarks/results";
import { parseRun, parseRunIndex } from "@sandbox-benchmarks/schema";

/** Reprice every canonical Run referenced by an existing dataset index, without rewriting the index. */
export function repriceDataset(datasetDirectory: string): void {
	// This is a local maintenance command, not a hostile-concurrency boundary. The root may intentionally
	// be supplied through a symlink; canonicalize it once and reject symlinks already present below it.
	const dataset = realpathSync(resolve(datasetDirectory));
	const indexPath = join(dataset, "index.json");
	const runsDirectory = join(dataset, "runs");
	if (realpathSync(runsDirectory) !== runsDirectory) {
		throw new Error(`dataset runs directory must not be a symlink: ${runsDirectory}`);
	}
	const index = parseRunIndex(JSON.parse(readFileSync(indexPath, "utf8")));

	// Parse and reprice every document before writing any, so malformed input cannot leave a partial pass.
	const repriced = index.runs.map((entry) => {
		const path = resolve(dataset, entry.path);
		if (realpathSync(path) !== path) {
			throw new Error(`Run document must not be a symlink: ${entry.path}`);
		}
		const run = parseRun(JSON.parse(readFileSync(path, "utf8")));
		if (run.runId !== entry.runId) {
			throw new Error(
				`Run id mismatch for ${entry.path}: index=${entry.runId}, document=${run.runId}`,
			);
		}
		return { path, run: rederiveRunEconomics(run) };
	});

	for (const { path, run } of repriced) writeRunDocument(run, path);
}

if (import.meta.main) {
	const [datasetDirectory, ...extra] = process.argv.slice(2);
	if (!datasetDirectory || extra.length > 0) {
		console.error("usage: reprice-dataset <dataset-directory>");
		process.exit(2);
	}
	repriceDataset(datasetDirectory);
}
