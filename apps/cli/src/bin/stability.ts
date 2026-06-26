#!/usr/bin/env bun
// `stability` — compare two Run documents and report cross-run metric shifts, exiting non-zero when a
// provider's metric regressed beyond the noise threshold. A CI gate against silent provider drift; only
// provenance-matched (same appVersion + arguments) measured metrics are compared.

import { readFileSync } from "node:fs";
import { compareRuns, describeShift, regressions } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const [previousFile, currentFile, thresholdArg] = process.argv.slice(2);
	if (!previousFile || !currentFile) {
		console.error("usage: stability <previousRun.json> <currentRun.json> [threshold]");
		process.exit(1);
	}
	const previous = parseRun(JSON.parse(readFileSync(previousFile, "utf8")));
	const current = parseRun(JSON.parse(readFileSync(currentFile, "utf8")));
	const threshold = thresholdArg ? Number(thresholdArg) : undefined;
	if (threshold !== undefined && !Number.isFinite(threshold)) {
		console.error(`stability: invalid threshold "${thresholdArg}"`);
		process.exit(1);
	}

	const shifts = compareRuns(
		previous,
		current,
		threshold !== undefined ? { threshold } : undefined,
	);
	for (const shift of shifts) console.log(describeShift(shift));

	const regressed = regressions(shifts);
	console.log(
		`\n${regressed.length} regression(s) across ${shifts.length} compared metric(s) ` +
			`(${current.runId} vs ${previous.runId}).`,
	);
	// Gate: any regression fails the run so CI surfaces the drift.
	if (regressed.length > 0) process.exit(1);
}
