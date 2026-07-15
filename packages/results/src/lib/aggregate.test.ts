import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import {
	aggregate,
	ECONOMICS_METRIC_IDS,
	getProvider,
	HARNESS_METRIC_IDS,
	hourlyCostAtTargetSpec,
} from "@sandbox-benchmarks/schema";
import { aggregateRuns } from "./aggregate.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(providerId: string, metrics: MetricResult[]): ProviderRun {
	return {
		providerId,
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
	};
}

function shard(providers: ProviderRun[], generatedAt = "2026-06-01T00:00:00.000Z"): Run {
	return {
		schemaVersion: "2",
		runId: "run-1",
		sha: "abc123",
		generatedAt,
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers,
	};
}

describe("aggregateRuns", () => {
	it("unions a provider's measured metrics across per-suite shards", () => {
		const cpuShard = shard([
			provider("daytona", [metric("node_web_tooling_runs_per_s", [10, 11])]),
		]);
		const sysShard = shard([provider("daytona", [metric("pybench_milliseconds", [900, 910])])]);

		const merged = aggregateRuns([cpuShard, sysShard]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona");
		const ids = daytona?.metrics.map((m) => m.metricId) ?? [];
		expect(ids).toContain("node_web_tooling_runs_per_s");
		expect(ids).toContain("pybench_milliseconds");
		expect(daytona?.validationStatus).toBe("validated");
	});

	it("merges different providers' shards into one Run", () => {
		const a = shard([
			provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
			provider("e2b", []),
		]);
		const b = shard([
			provider("daytona", []),
			provider("e2b", [metric("node_web_tooling_runs_per_s", [9])]),
		]);
		const merged = aggregateRuns([a, b]);
		expect(merged.providers.find((p) => p.providerId === "daytona")?.validationStatus).toBe(
			"validated",
		);
		expect(merged.providers.find((p) => p.providerId === "e2b")?.validationStatus).toBe(
			"validated",
		);
	});

	it("RE-derives economics from the merged measured set (stale shard economics dropped)", () => {
		const hourly = hourlyCostAtTargetSpec(getProvider("daytona")) ?? Number.NaN;
		// Shard carries a deliberately-wrong usd_per_hour; aggregate must recompute it from pricing.
		const lifecycleShard = shard([
			provider("daytona", [
				metric(HARNESS_METRIC_IDS.spawn, [1000]),
				metric(ECONOMICS_METRIC_IDS.usdPerHour, [999.99]),
			]),
		]);
		const cpuShard = shard([provider("daytona", [metric("node_web_tooling_runs_per_s", [10])])]);

		const merged = aggregateRuns([lifecycleShard, cpuShard]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona");
		const usdPerHour = daytona?.metrics.find((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerHour);
		const usdPerLifecycle = daytona?.metrics.find(
			(m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerLifecycle,
		);
		// Recomputed, not the stale 999.99.
		expect(usdPerHour?.samples).toEqual([hourly]);
		// Lifecycle cost derived from the merged spawn timing.
		expect(usdPerLifecycle?.samples[0]).toBeCloseTo(hourly * (1000 / 3_600_000), 12);
	});

	it("takes the latest generatedAt across shards", () => {
		const merged = aggregateRuns([
			shard(
				[provider("daytona", [metric("node_web_tooling_runs_per_s", [10])])],
				"2026-06-01T00:00:00.000Z",
			),
			shard(
				[provider("daytona", [metric("pybench_milliseconds", [900])])],
				"2026-06-02T00:00:00.000Z",
			),
		]);
		expect(merged.generatedAt).toBe("2026-06-02T00:00:00.000Z");
	});

	it("discloses the conflicting host CPUs when a provider's shards saw differing models", () => {
		const a = shard([
			{
				...provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
				observedSpecs: { cpuModel: "AMD EPYC 9R14", cpuMicroarch: "Zen 4 (Genoa)" },
			},
		]);
		const b = shard([
			{
				...provider("daytona", [metric("pybench_milliseconds", [900])]),
				observedSpecs: { cpuModel: "AMD EPYC 9R45", cpuMicroarch: "Zen 5 (Turin)" },
			},
		]);
		const merged = aggregateRuns([a, b]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona");
		// Sorted, distinct — names both machines rather than a bare "heterogeneous" flag.
		expect(daytona?.observedSpecs.hostCpuModels).toEqual(["AMD EPYC 9R14", "AMD EPYC 9R45"]);
	});

	it("does not disclose host CPUs when every shard saw the same host CPU", () => {
		const same = { cpuModel: "AMD EPYC 9R45", cpuMicroarch: "Zen 5 (Turin)" };
		const a = shard([
			{
				...provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
				observedSpecs: same,
			},
		]);
		const b = shard([
			{ ...provider("daytona", [metric("pybench_milliseconds", [900])]), observedSpecs: same },
		]);
		const merged = aggregateRuns([a, b]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona");
		expect(daytona?.observedSpecs.hostCpuModels).toBeUndefined();
	});

	it("throws on a shard-identity mismatch and on empty input", () => {
		const a = shard([provider("daytona", [metric("node_web_tooling_runs_per_s", [10])])]);
		const b: Run = { ...a, sha: "different" };
		expect(() => aggregateRuns([a, b])).toThrow(/identity mismatch/);
		expect(() => aggregateRuns([])).toThrow(/at least one/);
	});

	it("disqualifies a provider whose specMatched fold has any mismatched shard, regardless of order", () => {
		const matched = provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]);
		matched.specMatched = true;
		const mismatched = provider("daytona", [metric("pybench_milliseconds", [900])]);
		mismatched.specMatched = false;

		// false is sticky no matter which shard arrives first.
		for (const order of [
			[shard([matched]), shard([mismatched])],
			[shard([mismatched]), shard([matched])],
		]) {
			const daytona = aggregateRuns(order).providers.find((p) => p.providerId === "daytona");
			expect(daytona?.specMatched).toBe(false);
		}
	});

	it("keeps specMatched undefined when no shard observed the spec, and true when only matches did", () => {
		const noProbe = shard([provider("daytona", [metric("node_web_tooling_runs_per_s", [10])])]);
		expect(
			aggregateRuns([noProbe]).providers.find((p) => p.providerId === "daytona")?.specMatched,
		).toBeUndefined();

		const matchOnly = provider("daytona", [metric("pybench_milliseconds", [900])]);
		matchOnly.specMatched = true;
		expect(
			aggregateRuns([noProbe, shard([matchOnly])]).providers.find((p) => p.providerId === "daytona")
				?.specMatched,
		).toBe(true);
	});
});
