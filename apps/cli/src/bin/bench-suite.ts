#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.
//
//   bench-suite <provider> <suite> <runId> [--raw-only]
//
// --raw-only stops after writing the raw tree (no normalize). The bench-matrix fan-out uses it: each
// (provider, suite) cell produces ONLY its provider subtree, and the package-raw job normalizes the
// merged provider × suite tree into ONE Run — a per-cell normalize would emit a misleading
// single-provider Run and re-do the work package-raw must do anyway over the whole tree.

import { join } from "node:path";
import { runSuite, SuiteUsageError } from "@sandbox-benchmarks/harness";
import { summarizeRun, writeNormalizedRun } from "@sandbox-benchmarks/results";

if (import.meta.main) {
	// Positional args, skipping flags so `--raw-only` can sit anywhere on the command line.
	const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
	const provider = positional[0] ?? "daytona";
	const suite = positional[1] ?? "cpu-node";
	const runId = positional[2] ?? `local-${Date.now()}`;
	const rawOnly = process.argv.includes("--raw-only");
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

	if (rawOnly) {
		console.log(`\nRaw results for ${suite} on ${provider} → ${join(rawRoot, provider)}`);
	} else {
		const run = writeNormalizedRun({ rawRoot, runId, sha, outFile, updateIndexFile: indexFile });
		console.log(`\nNormalized Run ${runId} → ${outFile}`);
		for (const line of summarizeRun(run)) console.log(line);
	}
}
