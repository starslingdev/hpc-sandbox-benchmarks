#!/usr/bin/env bun
// `aggregate` — merge the per-shard Run documents of one benchmark run (the CI matrix emits one per
// `(provider, suite)` cell) into a single candidate Run, written to a candidate dataset + index. This
// is the collect half of candidate→promote: `promote` then validates and publishes the candidate.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { aggregateRuns, summarizeRun, writeRunDocument } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const [runId, outDir, ...shardFiles] = process.argv.slice(2);
	if (!runId || !outDir || shardFiles.length === 0) {
		console.error("usage: aggregate <runId> <candidateDir> <shardRun.json...>");
		process.exit(1);
	}

	// Parse every shard at the boundary so a malformed artifact fails loudly here, not mid-merge.
	const shards = shardFiles.map((file) => parseRun(JSON.parse(readFileSync(file, "utf8"))));
	const merged = aggregateRuns(shards);

	// The caller-supplied runId must match the id the shards agree on (aggregateRuns enforces shard
	// agreement); otherwise a wrong argument would be silently ignored in favour of merged.runId.
	if (merged.runId !== runId) {
		console.error(`runId mismatch: argument "${runId}" but the shards agree on "${merged.runId}"`);
		process.exit(1);
	}

	const outFile = join(outDir, "runs", `${merged.runId}.json`);
	const indexFile = join(outDir, "index.json");
	writeRunDocument(merged, outFile, indexFile);

	console.log(`\nAggregated ${shards.length} shard(s) for ${runId} → ${outFile}`);
	for (const line of summarizeRun(merged)) console.log(line);
}
