import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderCostEvidence, Run } from "@sandbox-benchmarks/schema";
import { aggregate, ECONOMICS_METRIC_IDS, HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { rederiveRunEconomics } from "./reprice.ts";

const measured = (metricId = "node_web_tooling_runs_per_s"): MetricResult => ({
	metricId,
	samples: [10],
	aggregates: aggregate([10]),
});
const stale = (metricId: string = ECONOMICS_METRIC_IDS.usdPerHour): MetricResult => ({
	metricId,
	samples: [999],
	aggregates: aggregate([999]),
});

function fixture(
	schemaVersion: Run["schemaVersion"],
	providerId = "daytona-vm",
	targetSpec: Run["targetSpec"] = { vcpus: 4, memoryGb: 8, diskGb: 40 },
): Run {
	return {
		schemaVersion,
		runId: `v${schemaVersion}`,
		sha: "abc",
		generatedAt: "2026-08-01T00:00:00.000Z",
		targetSpec,
		providers: [
			{
				providerId,
				validationStatus: "validated",
				observedSpecs: { vcpus: 4, memoryGb: 8 },
				metrics: [
					measured(),
					...(Number(schemaVersion) >= 4 ? [{ ...stale(), derived: true as const }] : [stale()]),
				],
				...(schemaVersion === "5" ? { costEvidence: [] } : {}),
				suitesCovered: ["cpu-node"],
				gaps: [],
				uncatalogued: [],
			},
		],
	};
}

const withoutMetrics = (run: Run) => ({
	...run,
	providers: run.providers.map(({ metrics: _metrics, ...provider }) => provider),
});

describe("rederiveRunEconomics", () => {
	it.each([
		"2",
		"3",
		"4",
	] as const)("replaces stale exact economics while preserving v%s compatibility", (version) => {
		const input = fixture(version);
		const output = rederiveRunEconomics(input);
		const economics = output.providers[0]?.metrics.find(
			(metric) => metric.metricId === ECONOMICS_METRIC_IDS.usdPerHour,
		);
		expect(economics?.samples[0]).toBeCloseTo(0.3312);
		expect(economics?.derived).toBe(version === "4" ? true : undefined);
		expect(withoutMetrics(output)).toEqual(withoutMetrics(input));
	});

	it("removes dynamic stale economics without changing validation or measured data", () => {
		const input = fixture("4", "runcloud");
		const output = rederiveRunEconomics(input);
		expect(output.providers[0]?.metrics).toEqual([measured()]);
		expect(output.providers[0]?.validationStatus).toBe("validated");
	});

	it("preserves future v5 cost evidence unchanged while repricing catalog economics", () => {
		const input = fixture("5");
		const record: ProviderCostEvidence = {
			kind: "missing" as const,
			cell: { runId: "v5", providerId: "daytona-vm", suite: "cpu-node" },
			subject: { kind: "sandbox" as const, sandboxId: "sb-1" },
			capturedAt: "2026-08-08T00:00:00.000Z",
			sdk: { packageName: "sdk", version: "1.0.0" },
			reason: "unsupported_public_api" as const,
			detail: "No public endpoint.",
		};
		if (input.providers[0]) input.providers[0].costEvidence = [record];
		const before = structuredClone(input.providers[0]?.costEvidence);
		const output = rederiveRunEconomics(input);
		expect(output.schemaVersion).toBe("5");
		expect(output.providers[0]?.costEvidence).toEqual(before);
	});

	it("prices a historical 2-vCPU Run from its own target spec", () => {
		const output = rederiveRunEconomics(
			fixture("2", "daytona-vm", { vcpus: 2, memoryGb: 8, diskGb: 20 }),
		);
		expect(
			output.providers[0]?.metrics.find(
				(metric) => metric.metricId === ECONOMICS_METRIC_IDS.usdPerHour,
			)?.samples,
		).toEqual([0.2304]);
	});

	it("preserves unrelated derived rows while replacing only economics ids", () => {
		const input = fixture("4");
		const unrelated: MetricResult = {
			metricId: "derived_unrelated",
			samples: [42],
			aggregates: aggregate([42]),
			derived: true,
		};
		input.providers[0]?.metrics.push(unrelated);
		const output = rederiveRunEconomics(input);
		expect(output.providers[0]?.metrics).toContainEqual(unrelated);
		expect(
			output.providers[0]?.metrics.filter((metric) => metric.metricId === unrelated.metricId),
		).toEqual([unrelated]);
	});

	it("does not feed a retained unrelated derived row into lifecycle economics", () => {
		const input = fixture("4");
		const unrelatedDerivedLifecycle: MetricResult = {
			metricId: HARNESS_METRIC_IDS.spawn,
			samples: [3_600_000],
			aggregates: aggregate([3_600_000]),
			derived: true,
		};
		input.providers[0]?.metrics.push(unrelatedDerivedLifecycle);
		const output = rederiveRunEconomics(input);
		expect(output.providers[0]?.metrics).toContainEqual(unrelatedDerivedLifecycle);
		expect(
			output.providers[0]?.metrics.some(
				(metric) => metric.metricId === ECONOMICS_METRIC_IDS.usdPerLifecycle,
			),
		).toBe(false);
	});

	it("is idempotent and leaves unknown providers measured rather than treating them as free", () => {
		const unknown = fixture("2", "retired-unknown");
		const once = rederiveRunEconomics(unknown);
		expect(once.providers[0]?.metrics).toEqual([measured()]);
		expect(rederiveRunEconomics(once)).toEqual(once);
		const exact = rederiveRunEconomics(fixture("4"));
		expect(rederiveRunEconomics(exact)).toEqual(exact);
	});

	it("refuses to guess a compute-run cost without retained pipeline runtime", () => {
		const input = fixture("2");
		input.providers[0]?.metrics.push(stale(ECONOMICS_METRIC_IDS.usdPerComputeRun));
		expect(() => rederiveRunEconomics(input)).toThrow(/whole-pipeline runtime/);
	});
});
