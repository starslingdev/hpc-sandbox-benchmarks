#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.

import { join } from "node:path";
import { runSuite, SuiteUsageError } from "@sandbox-benchmarks/harness";
import { summarizeRun, writeNormalizedRun } from "@sandbox-benchmarks/results";

if (import.meta.main) {
	const provider = process.argv[2] ?? "daytona";
	const suite = process.argv[3] ?? "cpu-node";
	const runId = process.argv[4] ?? `local-${Date.now()}`;
	const sha = process.env.GITHUB_SHA ?? "local";

	const rawRoot = join("data", "raw", runId);
	const outFile = join("data", "runs", `${runId}.json`);
	const indexFile = join("data", "runs", "index.json");

	try {
		await runSuite({
			providerName: provider,
			suiteName: suite,
			resultsDir: join(rawRoot, provider),
		});
	} catch (err) {
		if (err instanceof SuiteUsageError) {
			console.error(err.message);
			process.exit(1);
		}
		throw err;
	}

	const run = writeNormalizedRun({ rawRoot, runId, sha, outFile, updateIndexFile: indexFile });
	console.log(`\nNormalized Run ${runId} → ${outFile}`);
	for (const line of summarizeRun(run)) console.log(line);
}
