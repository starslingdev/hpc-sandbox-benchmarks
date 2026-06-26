#!/usr/bin/env bun
// `promote` — validate a candidate Run and publish it into the committed dataset. The promote half of
// candidate→promote: it gates on at least one validated provider (so a partial collection with no real
// metrics can't publish an empty run), then writes the Run into the published dataset + its index. With
// no publish target it stays a pure validation gate (the original behavior).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { summarizeRun, writeRunDocument } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const [runFile, datasetDir] = process.argv.slice(2);
	if (!runFile) {
		console.error("usage: promote <candidateRun.json> [datasetDir]");
		process.exit(1);
	}
	const run = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
	const validated = run.providers.filter((p) => p.validationStatus === "validated").length;
	for (const line of summarizeRun(run)) console.log(line);

	// Gate FIRST: a Run with nothing validated (e.g. a partial collection with no PTS XML) must never
	// reach the published dataset.
	if (validated === 0) {
		console.error("promote: refusing to promote a Run with zero validated providers");
		process.exit(1);
	}

	// Publish into the committed dataset (data/dataset/runs/<id>.json + index.json), newest-first index.
	if (datasetDir) {
		const outFile = join(datasetDir, "runs", `${run.runId}.json`);
		const indexFile = join(datasetDir, "index.json");
		writeRunDocument(run, outFile, indexFile);
		console.log(`\nPublished ${run.runId} → ${outFile}`);
	}

	console.log(JSON.stringify({ promoted: run.runId, validatedProviders: validated }));
}
