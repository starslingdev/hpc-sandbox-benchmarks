import { describe, expect, it } from "bun:test";
import type { ProviderCostEvidence, ProviderRun, TargetSpec } from "@sandbox-benchmarks/schema";
import { BILLED_WALL_SECONDS } from "@sandbox-benchmarks/schema";
import { buildPipelineCost } from "./pipeline-cost.ts";

const SPEC: TargetSpec = { vcpus: 4, memoryGb: 8, diskGb: 40 };
// boat publishes an exact $0.036/hr for the target, so the estimate is checkable by hand.
const BOAT_USD_PER_SECOND = 0.036 / 3600;

/** Two Mastra tasks per sandbox: replicate 0 times 100 + 200 s, replicate 1 times 150 + 150 s. */
const metrics = [
	{
		metricId: "realworld_mastra_task_git_clone",
		samples: [100, 150],
		replicates: [
			{ index: 0, samples: [100] },
			{ index: 1, samples: [150] },
		],
	},
	{
		metricId: "realworld_mastra_task_build_core",
		samples: [200, 150],
		replicates: [
			{ index: 0, samples: [200] },
			{ index: 1, samples: [150] },
		],
	},
];

function bill(index: number, amount: number, billedSeconds?: number): ProviderCostEvidence {
	return {
		kind: "observed",
		cell: { runId: "run-1", providerId: "boat", suite: "realworld-mastra", replicateIndex: index },
		subject: { kind: "sandbox", sandboxId: `sb-${index}` },
		capturedAt: "2026-11-16T00:00:00.000Z",
		sdk: { packageName: "boat", version: "rest" },
		apiOperation: "GET /api/v1/sandboxes/{sandboxId}/usage",
		usage:
			billedSeconds === undefined
				? [{ resource: "dollars", quantity: amount, unit: "USD" }]
				: [{ ...BILLED_WALL_SECONDS, quantity: billedSeconds }],
		amount,
		currency: "USD",
		source: "provider_reported",
		responseJson: `{"dollars":${amount}}`,
	};
}

const boat = (costEvidence: ProviderCostEvidence[]) =>
	({ providerId: "boat", metrics, costEvidence }) as unknown as ProviderRun;

const mastraRow = (provider: ProviderRun) =>
	buildPipelineCost([provider], SPEC).find((s) => s.suite === "realworld-mastra")?.rows[0];

describe("buildPipelineCost", () => {
	it("prices each bill over its sandbox's timed seconds, not its whole billed lifetime", () => {
		// 300 timed s of a 600 s bill, and 300 of a 900 s bill: half of $0.10, a third of $0.30.
		const row = mastraRow(boat([bill(0, 0.1, 600), bill(1, 0.3, 900)]));
		expect(row?.basis).toBe("Billed");
		expect(row?.lo).toBeCloseTo(0.05);
		expect(row?.hi).toBeCloseTo(0.1);
		expect(row?.value).toBeCloseTo(0.075);
		expect(row?.sandboxes).toBe(2);
		expect(row?.seconds).toBe(300);
	});

	it.each([
		["no sandbox has a bill", []],
		["a bill records no billed seconds", [bill(0, 0.1, 600), bill(1, 0.3)]],
		["a completed sandbox has no bill", [bill(0, 0.1, 600)]],
		[
			"a billed lifetime is shorter than the timed steps inside it",
			[bill(0, 0.1, 600), bill(1, 0.3, 200)],
		],
	])("estimates the whole row from published prices when %s", (_, records) => {
		const row = mastraRow(boat(records));
		expect(row?.basis).toBe("Estimated");
		expect(row?.value).toBeCloseTo(300 * BOAT_USD_PER_SECOND);
	});
});
