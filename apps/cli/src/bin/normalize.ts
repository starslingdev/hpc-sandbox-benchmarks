#!/usr/bin/env bun
// `normalize` — read a raw results tree (`data/raw/<runId>/<provider>/`) and emit a validated Run
// document, optionally appending it to a Run index.

import { summarizeRun, writeNormalizedRun } from "@sandbox-benchmarks/results";

if (import.meta.main) {
	const [rawRoot, runId, sha, outFile, indexFile] = process.argv.slice(2);
	if (!rawRoot || !runId || !sha || !outFile) {
		console.error("usage: normalize <rawRoot> <runId> <sha> <outFile> [indexFile]");
		process.exit(1);
	}
	const run = writeNormalizedRun({
		rawRoot,
		runId,
		sha,
		outFile,
		...(indexFile ? { updateIndexFile: indexFile } : {}),
	});
	for (const line of summarizeRun(run)) console.log(line);
}
