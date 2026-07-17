#!/usr/bin/env bun
// `aggregate` — merge the per-shard Run documents of one benchmark run (the CI matrix emits one per
// `(provider, suite)` cell) into a single candidate Run, written to a candidate dataset + index. This
// is the collect half of candidate→promote: `promote` then validates and publishes the candidate.
// Uses @actions/core for foldable groups, debug metadata, annotations, and a job summary in CI.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as core from "@actions/core";
import { aggregateRuns, writeRunDocument } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import {
	fail,
	inActions,
	logInfo,
	logProviderStatuses,
	providerSummaryRows,
	withGroup,
	writeJobSummary,
} from "../lib/actions-log.ts";

if (import.meta.main) {
	const [runId, outDir, ...shardFiles] = process.argv.slice(2);
	if (!runId || !outDir || shardFiles.length === 0) {
		fail("usage: aggregate <runId> <candidateDir> <shardRun.json...>", {
			properties: { title: "aggregate usage" },
			exitCode: 2,
		});
	}

	logInfo(`Aggregating ${shardFiles.length} shard(s) for run ${runId}`);
	if (inActions()) core.debug(JSON.stringify({ runId, outDir, shards: shardFiles }));

	// Parse every shard at the boundary so a malformed artifact fails loudly here, not mid-merge.
	const shards = await withGroup(`Parse ${shardFiles.length} shard Run document(s)`, async () => {
		return shardFiles.map((file) => {
			if (inActions()) core.debug(`parse ${file}`);
			return parseRun(JSON.parse(readFileSync(file, "utf8")));
		});
	});

	const merged = await withGroup("Merge shards", async () => {
		const result = aggregateRuns(shards);
		logInfo(`Merged runId=${result.runId} providers=${result.providers.length} sha=${result.sha}`);
		return result;
	});

	// The caller-supplied runId must match the id the shards agree on (aggregateRuns enforces shard
	// agreement); otherwise a wrong argument would be silently ignored in favour of merged.runId.
	if (merged.runId !== runId) {
		fail(`runId mismatch: argument "${runId}" but the shards agree on "${merged.runId}"`, {
			properties: { title: "aggregate runId mismatch" },
		});
	}

	const outFile = join(outDir, "runs", `${merged.runId}.json`);
	const indexFile = join(outDir, "index.json");
	await withGroup(`Write candidate ${outFile}`, async () => {
		writeRunDocument(merged, outFile, indexFile);
		logInfo(`Wrote candidate Run → ${outFile}`);
		// Already inside withGroup — don't nest another ::group::.
		await logProviderStatuses(merged, { grouped: false });
	});

	const validated = merged.providers.filter((p) => p.validationStatus === "validated").length;
	await writeJobSummary({
		heading: `Aggregate ${runId}`,
		fields: [
			["Status", "success", "plain"],
			["Run id", runId, "code"],
			["Shards", String(shards.length), "plain"],
			["Providers", String(merged.providers.length), "plain"],
			["Validated", String(validated), "plain"],
			["SHA", merged.sha, "code"],
			["Candidate", outFile, "code"],
		],
		tables: [{ heading: "Provider status", rows: providerSummaryRows(merged) }],
		annotation: {
			failed: false,
			title: `Aggregate ${runId}`,
			message: `${shards.length} shard(s) → ${validated} validated provider(s)`,
		},
	});
}
