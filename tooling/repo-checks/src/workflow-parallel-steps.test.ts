import { expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkParallelSteps } from "./lib/workflow-parallel-steps.ts";
import { findRepoRoot } from "./lib/workspace.ts";

const jobWith = (steps: string) => `jobs:\n  check:\n    steps:\n${steps}`;

test("parallel compatibility accepts runnable steps and groups of runnable members", () => {
	expect(() =>
		checkParallelSteps(
			jobWith(
				"      - uses: actions/checkout@v6\n      - parallel:\n          - run: a\n          - name: b\n            uses: ./x\n      - run: c\n",
			),
		),
	).not.toThrow();
});

test("parallel compatibility rejects what actionlint's ignored diagnostic would have caught", () => {
	for (const steps of [
		// A plain step that runs nothing, or both a script and an action.
		"      - name: nothing\n",
		"      - run: a\n        uses: ./x\n",
		// A group with a non-runnable, nested, or lone member, or keys beside `parallel`.
		"      - parallel:\n          - run: a\n          - name: nothing\n",
		"      - parallel:\n          - run: a\n          - parallel:\n              - run: b\n              - run: c\n",
		"      - parallel:\n          - run: a\n",
		"      - name: group\n        parallel:\n          - run: a\n          - run: b\n",
	]) {
		expect(() => checkParallelSteps(jobWith(steps))).toThrow();
	}
});

test("every committed workflow passes the parallel-step compatibility check", () => {
	const directory = join(findRepoRoot(), ".github/workflows");
	for (const file of readdirSync(directory).filter((name) => /\.ya?ml$/.test(name)))
		expect(() => checkParallelSteps(readFileSync(join(directory, file), "utf8"))).not.toThrow();
});
