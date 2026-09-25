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

function separatedBatches(): ExperimentPlan["batches"] {
	return [
		{
			id: "batch-memory",
			quotaDomain: "e2b",
			cells: ["e2b-memory-r0"],
			maxConcurrency: 1,
			budgetMinutes: 40,
		},
		{
			id: "batch-system",
			quotaDomain: "e2b",
			cells: ["e2b-system-r0"],
			maxConcurrency: 1,
			budgetMinutes: 40,
		},
		{
			id: "batch-realworld",
			quotaDomain: "e2b",
			cells: ["e2b-realworld-mastra-r0"],
			maxConcurrency: 1,
			budgetMinutes: 40,
		},
	];
}

function separatedRounds(): ExperimentPlan["rounds"] {
	return [
		{ id: "round-memory", quotaDomain: "e2b", batches: ["batch-memory"] },
		{ id: "round-system", quotaDomain: "e2b", batches: ["batch-system"] },
		{ id: "round-realworld", quotaDomain: "e2b", batches: ["batch-realworld"] },
	];
}

test("homogeneous undeclared waves verify in canonical order", () => {
	expect(() =>
		verifyExperimentPlan(basePlan({ batches: separatedBatches(), rounds: separatedRounds() })),
	).not.toThrow();
});

test("mixed batch members are rejected with or without declared wave metadata", () => {
	for (const wave of [undefined, "synthetic-system"] as const) {
		const mixed = {
			id: "batch-mixed",
			quotaDomain: "e2b",
			...(wave ? { wave } : {}),
			cells: ["e2b-memory-r0", "e2b-system-r0", "e2b-realworld-mastra-r0"],
			maxConcurrency: 2,
			budgetMinutes: 80,
		};
		const plan = basePlan({
			batches: [mixed],
			rounds: [{ id: "round-mixed", quotaDomain: "e2b", batches: [mixed.id] }],
		});
		expect(() => verifyExperimentPlan(plan)).toThrow(/batch mixes benchmark waves/);
	}
});

test("an undeclared round cannot combine homogeneous batches from different waves", () => {
	const plan = basePlan({
		batches: separatedBatches(),
		rounds: [
			{
				id: "round-mixed",
				quotaDomain: "e2b",
				batches: ["batch-memory", "batch-system"],
			},
			{ id: "round-realworld", quotaDomain: "e2b", batches: ["batch-realworld"] },
		],
	});
	expect(() => verifyExperimentPlan(plan)).toThrow(/round mixes benchmark waves/);
});

test("declared batch and round waves must agree with their members", () => {
	const batches = separatedBatches();
	const rounds = separatedRounds();
	const memoryBatch = batches[0];
	const memoryRound = rounds[0];
	if (!memoryBatch || !memoryRound) throw new Error("wave fixture is incomplete");
	const cases = [
		{
			plan: basePlan({
				batches: [{ ...memoryBatch, wave: "synthetic-system" }, ...batches.slice(1)],
				rounds,
			}),
			error: /batch wave disagrees with its cells/,
		},
		{
			plan: basePlan({
				batches,
				rounds: [{ ...memoryRound, wave: "synthetic-system" }, ...rounds.slice(1)],
			}),
			error: /round wave disagrees with its batches/,
		},
	];
	for (const { plan, error } of cases) expect(() => verifyExperimentPlan(plan)).toThrow(error);
});

test("batch and round wave order is mandatory per account", () => {
	const batches = separatedBatches();
	const rounds = separatedRounds();
	const [memoryBatch, systemBatch, realworldBatch] = batches;
	const [memoryRound, systemRound, realworldRound] = rounds;
	if (
		!memoryBatch ||
		!systemBatch ||
		!realworldBatch ||
		!memoryRound ||
		!systemRound ||
		!realworldRound
	)
		throw new Error("wave fixture is incomplete");
	const cases = [
		basePlan({ batches: [systemBatch, memoryBatch, realworldBatch], rounds }),
		basePlan({ batches, rounds: [systemRound, memoryRound, realworldRound] }),
	];
	expect(() => verifyExperimentPlan(cases[0])).toThrow(/batches are out of wave order/);
	expect(() => verifyExperimentPlan(cases[1])).toThrow(/rounds are out of wave order/);
});

test('legacy "synthetic" wave metadata fails with an explicit cutover error', () => {
	const current = basePlan({ batches: separatedBatches(), rounds: separatedRounds() });
	const { digest: _, ...body } = current;
	const legacyBody = {
		...body,
		batches: body.batches.map((batch, index) =>
			index === 1 ? { ...batch, wave: "synthetic" } : batch,
		),
	};
	const legacy = { ...legacyBody, digest: evidenceDigest(legacyBody) };
	expect(() => verifyExperimentPlan(legacy)).toThrow(
		/legacy experiment wave "synthetic" is unsupported/,
	);
});
