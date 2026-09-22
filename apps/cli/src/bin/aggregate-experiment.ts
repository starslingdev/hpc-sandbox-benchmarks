#!/usr/bin/env bun
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	aggregateExperiment,
	describeIncompleteExperiment,
	writeRunDocument,
} from "@sandbox-benchmarks/results";
import { readExperimentAttempts, readExperimentPlan } from "../lib/experiment-artifacts.ts";

if (import.meta.main) {
	const args = process.argv.slice(2);
	const allowPartial = args.includes("--allow-partial");
	const [planFile, attemptsRoot, output] = args.filter((arg) => arg !== "--allow-partial");
	if (!planFile || !attemptsRoot || !output)
		throw new Error(
			"usage: aggregate-experiment <plan.json> <attempts-directory> <candidate-directory> [--allow-partial]",
		);
	const plan = readExperimentPlan(planFile);
	const attempts = readExperimentAttempts(attemptsRoot);
	// Persist the independently evaluated coverage even when publication cannot proceed.
	const aggregation = aggregateExperiment(plan, attempts, { allowPartial });
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
