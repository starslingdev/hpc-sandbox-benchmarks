import { describe, expect, it } from "bun:test";
import type { ProviderCostEvidence, ProviderRun, SuiteName } from "@sandbox-benchmarks/schema";
import { buildMeasuredCost } from "./measured-cost.ts";

const sdk = { packageName: "modal", version: "0.11.1" };
const cell = (suite: SuiteName, replicateIndex: number) => ({
	runId: "run-1",
	providerId: "modal-gvisor" as const,
	suite,
	replicateIndex,
});

function observed(suite: SuiteName, index: number, amount: number): ProviderCostEvidence {
	return {
		kind: "observed",
		cell: cell(suite, index),
		subject: { kind: "sandbox", sandboxId: `${suite}-${index}` },
		capturedAt: "2026-11-14T00:00:00.000Z",
		sdk,
		apiOperation: "SandboxGetTimeRangeStats",
		usage: [{ resource: "cpu", quantity: 1, unit: "CPU-seconds" }],
		amount,
		currency: "USD",
		source: "provider_reported",
		responseJson: `{"cost":"${amount}"}`,
	};
}

function missing(suite: SuiteName, index: number): ProviderCostEvidence {
	return {
		kind: "missing",
		cell: cell(suite, index),
		subject: { kind: "sandbox", sandboxId: `${suite}-${index}` },
		capturedAt: "2026-11-14T00:00:00.000Z",
		sdk,
		reason: "provider_api_error",
		detail: "Stats query throttled.",
	};
}

function provider(
	costEvidence: ProviderCostEvidence[],
	ranWithoutRecord: [SuiteName, number][] = [],
): ProviderRun {
	return {
		providerId: "modal-gvisor" as const,
		validationStatus: "validated",
		observedSpecs: {},
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
		metrics: [],
		costEvidence,
		artifactEvidence: ranWithoutRecord.map(([suite, index]) => ({
			cell: cell(suite, index),
			sandboxId: `${suite}-${index}`,
			provenance: { source: "request-fallback", requested: { kind: "baked", ref: "fixture" } },
		})),
	} as ProviderRun;
}

describe("buildMeasuredCost", () => {
	it("omits providers that recorded no cost evidence", () => {
		expect(buildMeasuredCost([provider([])])).toEqual([]);
	});

	it("gives medians and exact totals when every expected sandbox was measured", () => {
		const [modal] = buildMeasuredCost([
			provider([
				observed("cpu-node", 0, 0.3),
				observed("realworld-mastra", 0, 0.1),
				observed("realworld-mastra", 1, 0.2),
			]),
		]);
		expect(modal?.total).toBeCloseTo(0.6);
		expect(modal?.amounts).toHaveLength(3);
		// Realworld leads, and its k = 1 suite is a per-pipeline-run figure.
		expect(modal?.suites.map((suite) => [suite.suite, suite.perPipelineRun])).toEqual([
			["realworld-mastra", true],
			["cpu-node", false],
		]);
		const [mastra] = modal?.suites ?? [];
		expect(mastra?.median).toBeCloseTo(0.15);
		expect(mastra?.total).toBeCloseTo(0.3);
		expect(mastra?.unmeasured).toEqual([]);
	});

	it("counts unmeasured sandboxes by reason and never as zero", () => {
		const [modal] = buildMeasuredCost([
			provider(
				[observed("cpu-node", 0, 0.4), missing("cpu-node", 1), missing("cpu-node", 2)],
				[["cpu-node", 3]],
			),
		]);
		const [suite] = modal?.suites ?? [];
		expect(suite?.expected).toBe(4);
		expect(suite?.amounts).toEqual([0.4]);
		expect(suite?.median).toBe(0.4);
		expect(suite?.total).toBeNull();
		expect(suite?.unmeasured).toEqual([
			{ reason: "provider_api_error", count: 2 },
			{ reason: "no_cost_record", count: 1 },
		]);
		expect(modal?.total).toBeNull();
	});

	it("prices nothing when observed currencies disagree", () => {
		const eur = { ...observed("cpu-node", 1, 0.2), currency: "EUR" } as ProviderCostEvidence;
		const [modal] = buildMeasuredCost([provider([observed("cpu-node", 0, 0.1), eur])]);
		expect(modal?.currency).toBeNull();
		expect(modal?.suites[0]?.median).toBeNull();
		expect(modal?.total).toBeNull();
	});
});
