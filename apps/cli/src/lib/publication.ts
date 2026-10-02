import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { aggregateExperiment, aggregateRepairedExperiment } from "@sandbox-benchmarks/results";
import { readExperimentAttempts, readExperimentPlan } from "./experiment-artifacts.ts";

export function publicationArgs(args: string[]) {
	const { values, positionals } = parseArgs({
		args,
		allowPositionals: true,
		options: { "allow-partial": { type: "boolean", default: false }, repair: { type: "string" } },
	});
	return { positionals, allowPartial: values["allow-partial"], repairRoot: values.repair };
}

export function aggregatePublication(
	planFile: string,
	attemptsRoot: string,
	options: { allowPartial?: boolean; repairRoot?: string },
) {
	const plan = readExperimentPlan(planFile);
	const attempts = readExperimentAttempts(attemptsRoot);
	if (!options.repairRoot) return aggregateExperiment(plan, attempts, options);
	const root = options.repairRoot;
	return aggregateRepairedExperiment(
		plan,
		attempts,
		readExperimentPlan(join(root, "plan.json")),
		readExperimentAttempts(join(root, "attempts")),
		JSON.parse(readFileSync(join(root, "repair.json"), "utf8")),
		{
			...options,
			...(existsSync(join(root, "unstarted-batches.json"))
				? {
						unstartedBatches: JSON.parse(
							readFileSync(join(root, "unstarted-batches.json"), "utf8"),
						),
					}
				: {}),
		},
	);
}
