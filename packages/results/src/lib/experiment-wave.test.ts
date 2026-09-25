import { expect, test } from "bun:test";
import type { ExperimentPlan } from "@sandbox-benchmarks/schema";
import { evidenceDigest, verifyExperimentPlan } from "./experiment.ts";

function basePlan(
	overrides: Partial<ExperimentPlan> & {
		batches: ExperimentPlan["batches"];
		rounds: ExperimentPlan["rounds"];
	},
): ExperimentPlan {
	const body = {
		schemaVersion: "1" as const,
		id: "wave-test",
		sha: "a".repeat(40),
		createdOn: "2026-09-10",
		retryPolicy: "premeasurement-only" as const,
		maxPremeasurementRetries: 0,
		accounts: [{ quotaDomain: "e2b", sandboxes: 2 }],
		cells: [
			{
				id: "e2b-memory-r0",
				provider: "e2b" as const,
				quotaDomain: "e2b",
				suite: "memory",
				replicate: 0,
				workloadRevision: "w",
				artifactIdentity: "a",
				environmentRevision: "e",
				target: { vcpus: 4, memoryGb: 8 },
				metrics: ["stream_type_copy"],
				exclusions: [],
				passes: 1,
				startupMinutes: 10,
				workloadMinutes: 10,
				finishMinutes: 5,
			},
			{
				id: "e2b-system-r0",
				provider: "e2b" as const,
				quotaDomain: "e2b",
				suite: "system",
				replicate: 0,
				workloadRevision: "w-system",
				artifactIdentity: "a",
				environmentRevision: "e",
				target: { vcpus: 4, memoryGb: 8 },
				metrics: ["pybench_milliseconds"],
				exclusions: [],
				passes: 1,
				startupMinutes: 10,
				workloadMinutes: 10,
				finishMinutes: 5,
			},
			{
				id: "e2b-realworld-mastra-r0",
				provider: "e2b" as const,
				quotaDomain: "e2b",
				suite: "realworld-mastra",
				replicate: 0,
				workloadRevision: "w2",
				artifactIdentity: "a",
				environmentRevision: "e",
				target: { vcpus: 4, memoryGb: 8 },
				metrics: ["realworld_mastra_task_git_clone"],
				exclusions: [],
				passes: 1,
				startupMinutes: 10,
				workloadMinutes: 10,
				finishMinutes: 5,
			},
		],
		...overrides,
	};
	return { ...body, digest: evidenceDigest(body) } as ExperimentPlan;
}

test("pre-wave mixed batches verify when wave is undeclared", () => {
	const plan = basePlan({
		batches: [
			{
				id: "batch-0",
				quotaDomain: "e2b",
				cells: ["e2b-memory-r0", "e2b-system-r0", "e2b-realworld-mastra-r0"],
				maxConcurrency: 2,
				budgetMinutes: 80,
			},
		],
		rounds: [{ id: "round-0", quotaDomain: "e2b", batches: ["batch-0"] }],
	});
	expect(() => verifyExperimentPlan(plan)).not.toThrow();
});

test("declared Synthetic - System wave rejects mixed members", () => {
	const plan = basePlan({
		batches: [
			{
				id: "batch-0",
				quotaDomain: "e2b",
				wave: "synthetic-system",
				cells: ["e2b-memory-r0", "e2b-system-r0", "e2b-realworld-mastra-r0"],
				maxConcurrency: 2,
				budgetMinutes: 80,
			},
		],
		rounds: [
			{
				id: "round-0",
				quotaDomain: "e2b",
				wave: "synthetic-system",
				batches: ["batch-0"],
			},
		],
	});
	expect(() => verifyExperimentPlan(plan)).toThrow(/mixes benchmark waves/);
});

test("declared synthetic waves reject memory/non-memory mixes", () => {
	for (const wave of ["synthetic-memory", "synthetic-system"] as const) {
		const plan = basePlan({
			batches: [
				{
					id: "batch-0",
					quotaDomain: "e2b",
					wave,
					cells: ["e2b-memory-r0", "e2b-system-r0"],
					maxConcurrency: 2,
					budgetMinutes: 40,
				},
				{
					id: "batch-1",
					quotaDomain: "e2b",
					wave: "realworld",
					cells: ["e2b-realworld-mastra-r0"],
					maxConcurrency: 1,
					budgetMinutes: 40,
				},
			],
			rounds: [
				{ id: "round-0", quotaDomain: "e2b", wave, batches: ["batch-0"] },
				{ id: "round-1", quotaDomain: "e2b", wave: "realworld", batches: ["batch-1"] },
			],
		});
		expect(() => verifyExperimentPlan(plan)).toThrow(/mixes benchmark waves/);
	}
});

test("a declared Synthetic - Memory round rejects an undeclared mixed batch", () => {
	const plan = basePlan({
		batches: [
			{
				id: "batch-0",
				quotaDomain: "e2b",
				cells: ["e2b-memory-r0", "e2b-system-r0", "e2b-realworld-mastra-r0"],
				maxConcurrency: 2,
				budgetMinutes: 80,
			},
		],
		rounds: [
			{
				id: "round-0",
				quotaDomain: "e2b",
				wave: "synthetic-memory",
				batches: ["batch-0"],
			},
		],
	});
	expect(() => verifyExperimentPlan(plan)).toThrow(/invalid round assignment/);
});
