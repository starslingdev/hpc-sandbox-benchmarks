import { expect, test } from "bun:test";
import { workflowAxes, workflowBatch, workflowExperiment } from "./workflow-experiment.ts";

const env = {
	GITHUB_RUN_ID: "123",
	GITHUB_SHA: "a".repeat(40),
	BENCH_PROVIDERS: "daytona-vm,daytona-container,tama",
	BENCH_SUITES: "system,realworld-mastra",
};
test("workflow planning preserves samples and defaults shared accounts to one sandbox", () => {
	const plan = workflowExperiment(env, "2026-09-10");
	expect(plan.cells).toHaveLength(45);
	// sandboxes=1 chunks compatible account-wave work to the job ceiling, across variants.
	expect(plan.batches).toHaveLength(23);
	expect(workflowAxes(plan)).toEqual(["daytona", "tama"]);
	expect(plan.accounts.every((account) => account.sandboxes === 1)).toBe(true);
	expect(workflowAxes(plan, "daytona")).toEqual(["synthetic", "realworld"]);
	expect(workflowAxes(plan, "daytona", "synthetic")).toEqual([
		{ batch: "batch-0", providers: ["daytona-vm"], suite: "system", wave: "synthetic" },
		{
			batch: "batch-1",
			providers: ["daytona-vm", "daytona-container"],
			suite: "system",
			wave: "synthetic",
		},
		{ batch: "batch-2", providers: ["daytona-container"], suite: "system", wave: "synthetic" },
	]);
	expect(
		plan.cells.filter((cell) => cell.suite === "realworld-mastra").map((cell) => cell.replicate),
	).toEqual([
		...Array.from({ length: 12 }, (_, i) => i),
		...Array.from({ length: 12 }, (_, i) => i),
		...Array.from({ length: 12 }, (_, i) => i),
	]);
});
test("convergence and implicit per-cell quota overrides fail admission", () => {
	expect(() =>
		workflowExperiment(
			{ ...env, BENCH_SUITES: "memory", BENCH_PTS_PASSES: "converge" },
			"2026-09-10",
		),
	).toThrow("convergence");
	expect(() => workflowExperiment({ ...env, BENCH_MAX_CONCURRENCY: "12" }, "2026-09-10")).toThrow(
		"retired",
	);
});
test("workflow waves retain cells within the released queue limit and reject overflow at planning", () => {
	const plan = workflowExperiment(
		{ ...env, BENCH_PROVIDERS: "tama", BENCH_SUITES: "system", BENCH_REPLICAS: "128" },
		"2026-09-10",
	);
	expect(plan.batches).toHaveLength(64);
	expect(plan.batches.flatMap((batch) => batch.cells)).toHaveLength(128);
	expect(plan.batches.every((batch) => batch.maxConcurrency === 1)).toBe(true);
	expect(plan.rounds.map((round) => round.batches.length)).toEqual([64]);
	expect(plan.cells.at(-1)?.replicate).toBe(127);
	for (const replicas of ["129", "257"]) {
		expect(() =>
			workflowExperiment(
				{ ...env, BENCH_PROVIDERS: "tama", BENCH_SUITES: "system", BENCH_REPLICAS: replicas },
				"2026-09-10",
			),
		).toThrow("partition the experiment");
	}
	// Wave ordering permits each wave's full queue budget, even when the account total is larger.
	const twoWaves = workflowExperiment(
		{ ...env, BENCH_PROVIDERS: "tama", BENCH_REPLICAS: "128" },
		"2026-09-10",
	);
	expect(twoWaves.batches).toHaveLength(128);
	expect(twoWaves.rounds.map((round) => round.batches.length)).toEqual([64, 64]);
});

test("full provider plans separate synthetic and realworld under the account cap", () => {
	const plan = workflowExperiment(
		{
			...env,
			BENCH_PROVIDERS: "e2b",
			BENCH_SUITES: "",
			BENCH_ACCOUNT_CAPACITY: JSON.stringify({ e2b: { sandboxes: 30 } }),
		},
		"2026-09-10",
	);
	expect(plan.cells).toHaveLength(54);
	expect(plan.batches.map((batch) => batch.cells.length)).toEqual([18, 36]);
	expect(plan.batches.map((batch) => batch.wave)).toEqual(["synthetic", "realworld"]);
	expect(plan.batches.every((batch) => batch.maxConcurrency === 30)).toBe(true);
	expect(plan.batches.map((batch) => batch.budgetMinutes)).toEqual([145, 300]);
	expect(plan.batches.every((batch) => batch.budgetMinutes <= 330)).toBe(true);
	for (const suite of new Set(plan.cells.map((cell) => cell.suite))) {
		const cells = plan.cells.filter((cell) => cell.suite === suite);
		const realworld = suite.startsWith("realworld-");
		expect(cells.map((cell) => cell.replicate)).toEqual(
			Array.from({ length: realworld ? 12 : 3 }, (_, i) => i),
		);
		expect(cells.every((cell) => cell.passes === (realworld ? 1 : 2))).toBe(true);
	}
	expect(workflowAxes(plan, "e2b", "synthetic")).toEqual([
		{ batch: "batch-0", providers: ["e2b"], suite: "synthetic", wave: "synthetic" },
	]);
	expect(workflowAxes(plan, "e2b", "realworld")).toEqual([
		{ batch: "batch-1", providers: ["e2b"], suite: "realworld", wave: "realworld" },
	]);
});

test("Modal variants share one owner and fill both waves together at account capacity 75", () => {
	const plan = workflowExperiment(
		{
			...env,
			BENCH_PROVIDERS: "modal-gvisor,modal-vm",
			BENCH_SUITES: "",
			BENCH_ACCOUNT_CAPACITY: '{"modal":{"sandboxes":75}}',
		},
		"2026-09-13",
	);
	expect(plan.cells).toHaveLength(108);
	expect(plan.batches.map((batch) => batch.cells.length)).toEqual([36, 72]);
	expect(plan.batches.map((batch) => batch.budgetMinutes)).toEqual([145, 150]);
	for (const batch of plan.batches) {
		expect(batch.maxConcurrency).toBe(75);
		expect(
			new Set(batch.cells.map((id) => plan.cells.find((cell) => cell.id === id)?.provider)),
		).toEqual(new Set(["modal-gvisor", "modal-vm"]));
		expect(workflowBatch(plan, batch.id, "modal", '["modal-vm","modal-gvisor"]')).toBe(batch);
		for (const providers of ['["modal-vm"]', '["modal-vm","tama"]', '["modal-vm","modal-vm"]']) {
			expect(() => workflowBatch(plan, batch.id, "modal", providers)).toThrow("frozen batch");
		}
		expect(() => workflowBatch(plan, batch.id, "tama", '["modal-vm","modal-gvisor"]')).toThrow(
			"frozen batch",
		);
	}
});
