#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describeIncompleteExperiment, writeRunDocument } from "@sandbox-benchmarks/results";
import { aggregatePublication, publicationArgs } from "../lib/publication.ts";

if (import.meta.main) {
	const { positionals, ...options } = publicationArgs(process.argv.slice(2));
	const [planFile, attemptsRoot, output] = positionals;
	if (!planFile || !attemptsRoot || !output)
		throw new Error(
			"usage: aggregate-experiment <plan.json> <attempts-directory> <candidate-directory> [--allow-partial] [--repair <recovery-directory>]",
		);
	// Persist the independently evaluated coverage even when publication cannot proceed.
	const aggregation = aggregatePublication(planFile, attemptsRoot, options);
	const { coverage, run } = aggregation;
	mkdirSync(output, { recursive: true });
	writeFileSync(join(output, "coverage.json"), `${JSON.stringify(coverage, null, 2)}\n`);
	if (!run) {
		console.error(
			[
				"Experiment is incomplete; retained attempt artifacts and coverage report are diagnostic evidence.",
				...describeIncompleteExperiment(aggregation),
			].join("\n"),
		);
		process.exitCode = 1;
	} else {
		writeRunDocument(run, join(output, "runs", `${run.runId}.json`), join(output, "index.json"));
	}
}
