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

function shard(
	providers: ProviderRun[],
	generatedAt = "2026-06-01T00:00:00.000Z",
	replicateIndex?: number,
): Run {
	return {
		// A shard carrying a replicate index is a v3 shard; the plain per-suite shards stay v2.
		schemaVersion: replicateIndex === undefined ? "2" : "3",
		runId: "run-1",
		sha: "abc123",
		generatedAt,
		...(replicateIndex !== undefined ? { replicateIndex } : {}),
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

	it("folds ≥2 replicate shards of one suite into a replicate breakdown with pooled samples", () => {
		const r0 = shard(
			[provider("daytona", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const r1 = shard(
			[provider("daytona", [metric("node_web_tooling_runs_per_s", [20, 21])])],
			"2026-06-01T00:00:00.000Z",
			1,
		);

		const merged = aggregateRuns([r0, r1]);
		const node = merged.providers
			.find((p) => p.providerId === "daytona")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		// Two replicates, indexed and ordered; the pooled samples are their union; aggregates recomputed.
		expect(node?.replicates).toEqual([
			{ index: 0, samples: [10, 11] },
			{ index: 1, samples: [20, 21] },
		]);
		expect(node?.samples).toEqual([10, 11, 20, 21]);
		expect(node?.aggregates.n).toBe(4);
		// The merged Run is v3 (replicate-aware); its Metric carries no single replicateIndex.
		expect(merged.schemaVersion).toBe("3");
	});

	it("keeps a single-replicate metric verbatim — no replicates field at R = 1", () => {
		const only = shard(
			[provider("daytona", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const node = aggregateRuns([only])
			.providers.find((p) => p.providerId === "daytona")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(node?.replicates).toBeUndefined();
		expect(node?.samples).toEqual([10, 11]);
	});

	it("first-wins for a duplicate metric WITHIN one replicate (result-name contamination)", () => {
		// Same replicate index, same metric id, divergent samples — a contaminated composite, not a
		// second sandbox. Keep the first and never build a replicate breakdown from it.
		const a = shard(
			[provider("daytona", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const b = shard(
			[provider("daytona", [metric("node_web_tooling_runs_per_s", [99, 99])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const node = aggregateRuns([a, b])
			.providers.find((p) => p.providerId === "daytona")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(node?.replicates).toBeUndefined();
		expect(node?.samples).toEqual([10, 11]);
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

	it("unions rich host metadata across shards and removes byte-identical duplicates", () => {
		const record = {
			source: "mise/system-provider" as const,
			sourceFile: "system/system-provider.json",
			fields: [{ path: "asn", value: "AS64500" }],
		};
		const a = shard([
			{
				...provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
				hostMetadata: [record],
			},
		]);
		const b = shard([
			{
				...provider("daytona", [metric("pybench_milliseconds", [900])]),
				hostMetadata: [
					record,
					{
						source: "phoronix/result-file-to-json" as const,
						sourceFile: "system/pts_git--metadata.json",
						fields: [{ path: "sandbox.hardware.Processor", value: "AMD EPYC" }],
					},
				],
			},
		]);

		const metadata = aggregateRuns([a, b]).providers.find(
			(p) => p.providerId === "daytona",
		)?.hostMetadata;
		expect(metadata).toHaveLength(2);
		expect(metadata?.map((m) => m.source)).toEqual([
			"mise/system-provider",
			"phoronix/result-file-to-json",
		]);
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
