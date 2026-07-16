import { describe, expect, it } from "bun:test";
import { parseRun, parseRunIndex } from "./index.ts";

const validRun = {
	schemaVersion: "2",
	runId: "run-1",
	sha: "deadbeef",
	generatedAt: "2026-06-20T00:00:00.000Z",
	targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
	providers: [
		{
			providerId: "daytona",
			validationStatus: "validated",
			observedSpecs: { vcpus: 2, memoryGb: 8 },
			metrics: [
				{
					metricId: "node_web_tooling_runs_per_s",
					samples: [16.19, 16.3, 16.08],
					aggregates: {
						p50: 16.19,
						p95: 16.3,
						mean: 16.19,
						stdev: 0.11,
						min: 16.08,
						max: 16.3,
						n: 3,
					},
					sourceFile: "pts_node-web-tooling.xml",
				},
			],
			suitesCovered: [],
			gaps: [],
			uncatalogued: [],
		},
	],
};

describe("Run schema", () => {
	it("accepts a well-formed Run and infers through to the nested aggregates", () => {
		const run = parseRun(validRun);
		expect(run.providers[0]?.metrics[0]?.aggregates.n).toBe(3);
		expect(run.providers[0]?.validationStatus).toBe("validated");
	});

	it("accepts both the v2 and v3 schemaVersion", () => {
		expect(parseRun({ ...validRun, schemaVersion: "2" }).schemaVersion).toBe("2");
		expect(parseRun({ ...validRun, schemaVersion: "3" }).schemaVersion).toBe("3");
	});

	it("rejects an unknown schemaVersion", () => {
		expect(() => parseRun({ ...validRun, schemaVersion: "1" })).toThrow();
		expect(() => parseRun({ ...validRun, schemaVersion: "4" })).toThrow();
	});

	it("accepts a v3 Metric carrying a consistent replicate breakdown", () => {
		const withReplicates = structuredClone(validRun);
		withReplicates.schemaVersion = "3";
		const provider = withReplicates.providers[0];
		const metric = provider?.metrics[0];
		if (metric) {
			// Pooled samples are the union of the two replicate slices, aggregates match the pooled set.
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3] },
				{ index: 1, samples: [16.08] },
			];
		}
		expect(parseRun(withReplicates).providers[0]?.metrics[0]?.replicates).toHaveLength(2);
	});

	it("rejects a replicate breakdown that disagrees with the pooled samples", () => {
		const bad = structuredClone(validRun);
		bad.schemaVersion = "3";
		const metric = bad.providers[0]?.metrics[0];
		// samples are [16.19, 16.3, 16.08]; the replicates below pool to a different multiset.
		if (metric)
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3] },
				{ index: 1, samples: [99] },
			];
		expect(() => parseRun(bad)).toThrow();
	});

	it("rejects a lone replicate (a single sandbox is just samples)", () => {
		const bad = structuredClone(validRun);
		bad.schemaVersion = "3";
		const metric = bad.providers[0]?.metrics[0];
		if (metric)
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3, 16.08] },
			];
		expect(() => parseRun(bad)).toThrow();
	});

	it("rejects a non-positive target spec", () => {
		expect(() => parseRun({ ...validRun, targetSpec: { vcpus: 0, memoryGb: 8 } })).toThrow();
	});

	it("rejects a fractional sample count in aggregates", () => {
		const bad = structuredClone(validRun);
		const provider = bad.providers[0];
		const metric = provider?.metrics[0];
		if (metric) metric.aggregates.n = 2.5;
		expect(() => parseRun(bad)).toThrow();
	});

	it("rejects a validated ProviderRun with no metrics", () => {
		const bad = structuredClone(validRun);
		const provider = bad.providers[0];
		if (provider) provider.metrics = [];
		expect(() => parseRun(bad)).toThrow();
	});

	it("accepts a pending ProviderRun with no metrics", () => {
		const pending = structuredClone(validRun);
		const provider = pending.providers[0];
		if (provider) {
			provider.validationStatus = "pending";
			provider.metrics = [];
		}
		expect(parseRun(pending).providers[0]?.validationStatus).toBe("pending");
	});

	it("rejects a non-finite sample", () => {
		const bad = structuredClone(validRun);
		const metric = bad.providers[0]?.metrics[0];
		if (metric) metric.samples = [16.19, Number.POSITIVE_INFINITY, 16.08];
		expect(() => parseRun(bad)).toThrow();
	});

	it("rejects aggregates.n disagreeing with samples.length", () => {
		const bad = structuredClone(validRun);
		const metric = bad.providers[0]?.metrics[0];
		if (metric) metric.aggregates.n = 999;
		expect(() => parseRun(bad)).toThrow();
	});

	it("round-trips a RunIndex", () => {
		const index = parseRunIndex({
			schemaVersion: "1",
			runs: [{ runId: "run-1", generatedAt: "2026-06-20T00:00:00.000Z", path: "runs/run-1.json" }],
		});
		expect(index.runs).toHaveLength(1);
		expect(index.runs[0]?.runId).toBe("run-1");
	});

	it("rejects a RunIndex that isn't newest-first", () => {
		expect(() =>
			parseRunIndex({
				schemaVersion: "1",
				runs: [
					{ runId: "old", generatedAt: "2026-06-19T00:00:00.000Z", path: "runs/old.json" },
					{ runId: "new", generatedAt: "2026-06-20T00:00:00.000Z", path: "runs/new.json" },
				],
			}),
		).toThrow();
	});
});
