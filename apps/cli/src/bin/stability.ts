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
		console.error(
			"usage: stability <previousRun.json> <currentRun.json> [threshold]\n" +
				"  threshold: relative decimal fraction, e.g. 0.05 = 5% (default 0.10)",
		);
		process.exit(1);
	}
	const previous = parseRun(JSON.parse(readFileSync(previousFile, "utf8")));
	const current = parseRun(JSON.parse(readFileSync(currentFile, "utf8")));
	const threshold = thresholdArg ? Number(thresholdArg) : undefined;
	if (threshold !== undefined && (!Number.isFinite(threshold) || threshold < 0)) {
		// A negative noise margin would reclassify every metric as regression/improvement.
		console.error(
			`stability: invalid threshold "${thresholdArg}" (must be a non-negative decimal fraction, e.g. 0.1 for 10%)`,
		);
		process.exit(1);
	}
	// A threshold ≥ 1 (100%) is almost always a percentage typo (e.g. `10` meant as "10%"), which would
	// silently mark every metric stable and neuter the gate. It's a legal value, so warn loudly on stderr
	// rather than fail — the operator sees the mistake without a rare wide-margin run being rejected.
	if (threshold !== undefined && threshold >= 1) {
		console.error(
			`stability: warning — threshold ${threshold} is a ${threshold * 100}% margin (thresholds are decimal fractions); did you mean ${threshold / 100}?`,
		);
	}

	const shifts = compareRuns(
		previous,
		current,
		threshold !== undefined ? { threshold } : undefined,
	);
	for (const shift of shifts) console.log(describeShift(shift));

	const regressed = regressions(shifts);
	const incomparable = shifts.filter((s) => s.classification === "incomparable").length;
	const compared = shifts.length - incomparable;
	console.log(
		`\n${regressed.length} regression(s) across ${compared} compared metric(s)` +
			`${incomparable > 0 ? ` (${incomparable} incomparable)` : ""} ` +
			`(${current.runId} vs ${previous.runId}).`,
	);
	// Gate: any regression fails the run so CI surfaces the drift.
	if (regressed.length > 0) process.exit(1);
}
