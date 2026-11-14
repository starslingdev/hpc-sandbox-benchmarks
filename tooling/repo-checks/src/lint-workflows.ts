import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
	ACTIONLINT_QUEUE_COMPATIBILITY,
	checkConcurrencyQueues,
} from "./lib/workflow-concurrency.ts";
import {
	ACTIONLINT_PARALLEL_STEPS_COMPATIBILITY,
	checkParallelSteps,
} from "./lib/workflow-parallel-steps.ts";

if (import.meta.main) {
	for (const file of readdirSync(".github/workflows").filter((file) => /\.ya?ml$/.test(file))) {
		const source = readFileSync(join(".github/workflows", file), "utf8");
		try {
			checkConcurrencyQueues(source);
		} catch (error) {
			throw new Error(`Invalid concurrency queue in ${file}`, { cause: error });
		}
		try {
			checkParallelSteps(source);
		} catch (error) {
			throw new Error(`Invalid step in ${file}`, { cause: error });
		}
	}
	const result = Bun.spawnSync(
		[
			"mise",
			"exec",
			"--",
			"actionlint",
			"-no-color",
			"-ignore",
			ACTIONLINT_QUEUE_COMPATIBILITY,
			"-ignore",
			ACTIONLINT_PARALLEL_STEPS_COMPATIBILITY,
		],
		{ stdout: "inherit", stderr: "inherit" },
	);
	process.exitCode = result.exitCode;
}
