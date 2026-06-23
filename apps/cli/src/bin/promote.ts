#!/usr/bin/env bun
// `promote` — validate a normalized Run document and stage it for the published dataset. Publishing
// to the public dataset lands with the dataset/web slice; for now this is the validation gate.

import { readFileSync } from "node:fs";
import { summarizeRun } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";

if (import.meta.main) {
	const [runFile] = process.argv.slice(2);
	if (!runFile) {
		console.error("usage: promote <run.json>");
		process.exit(1);
	}
	const run = parseRun(JSON.parse(readFileSync(runFile, "utf8")));
	const validated = run.providers.filter((p) => p.validationStatus === "validated").length;
	for (const line of summarizeRun(run)) console.log(line);
	console.log(JSON.stringify({ promoted: run.runId, validatedProviders: validated }));

	// Gate on the exit code: a Run with nothing validated (e.g. a partial collection with no PTS XML)
	// must fail so a CI promote step can't silently publish an empty run.
	if (validated === 0) {
		console.error("promote: refusing to promote a Run with zero validated providers");
		process.exit(1);
	}
}
