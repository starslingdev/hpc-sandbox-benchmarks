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

	it("accepts every published schemaVersion from v2 through v4", () => {
		for (const schemaVersion of ["2", "3", "4"] as const) {
			expect(parseRun({ ...validRun, schemaVersion }).schemaVersion).toBe(schemaVersion);
		}
	});

	it("rejects a v2 Run that carries a v3-only replicate field", () => {
		// replicateIndex and MetricResult.replicates are v3-or-later; a v2 document that carries either is
		// a producer that wrote a replicate field without bumping schemaVersion — rejected at the boundary
		// so "v2 == the pre-replicate schema" stays a real guarantee.
		expect(() => parseRun({ ...validRun, schemaVersion: "2", replicateIndex: 0 })).toThrow(
			/v3-or-later Run/,
		);
		const v2WithReplicates = structuredClone(validRun);
		v2WithReplicates.schemaVersion = "2"; // stays v2 while carrying an otherwise-consistent breakdown
		const metric = v2WithReplicates.providers[0]?.metrics[0];
		if (metric)
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3] },
				{ index: 1, samples: [16.08] },
			];
		expect(() => parseRun(v2WithReplicates)).toThrow(/v3-or-later Run/);
		// A v3 shard legitimately carries the replicateIndex.
		expect(parseRun({ ...validRun, schemaVersion: "3", replicateIndex: 2 }).replicateIndex).toBe(2);
	});

	it("keeps the v3 replicate fold legal at v4 — version floors are not equality checks", () => {
		// The v4 aggregate carries the v3 replicate breakdown as well as its own new fields. An "=== '3'"
		// gate would have rejected its own predecessor's field on every version bump, so the floors compare
		// numerically; this pins that so a future v5 can't silently re-break v3 documents.
		const v4WithReplicates = structuredClone(validRun);
		v4WithReplicates.schemaVersion = "4";
		const metric = v4WithReplicates.providers[0]?.metrics[0];
		if (metric)
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3] },
				{ index: 1, samples: [16.08] },
			];
		expect(parseRun(v4WithReplicates).providers[0]?.metrics[0]?.replicates).toHaveLength(2);
	});

	it("pins a gap's cause to its outcome — a crash cannot be filed as a precondition", () => {
		// A skip and a failure are different facts about a provider. Letting the cause disagree with the
		// outcome inside one gap would leave a consumer to pick a side.
		const withGap = (outcome: string, cause: Record<string, unknown>) => {
			const run = structuredClone(validRun);
			run.schemaVersion = "4";
			const provider = run.providers[0] as Record<string, unknown>;
			provider.gaps = [{ scope: "suite", id: "disk", outcome, reason: "x", cause }];
			return run;
		};
		expect(() =>
			parseRun(withGap("skipped", { kind: "step-timeout", step: "s", timeoutSeconds: 600 })),
		).toThrow(/skipped gap whose cause describes one.*a failed cause/);
		expect(() =>
			parseRun(withGap("failed", { kind: "disk-shortfall", freeGb: 20, requiredGb: 30 })),
		).toThrow(/failed gap whose cause describes one.*a skipped cause/);
		// The coherent pairings are accepted.
		expect(
			parseRun(withGap("skipped", { kind: "disk-shortfall", freeGb: 20, requiredGb: 30 }))
				.providers[0]?.gaps[0]?.cause?.kind,
		).toBe("disk-shortfall");
	});

	it("keeps a structured cause out of a pre-v4 Run", () => {
		// The version gate is what stops a pre-v4 consumer from being handed a field it will ignore and
		// then re-deriving the same fact by parsing `reason` — a quietly wrong answer. Pinned separately
		// from the pairing narrow above so removing or inverting the boundary cannot regress unnoticed.
		const withCause = (schemaVersion: string) => {
			const run = structuredClone(validRun);
			run.schemaVersion = schemaVersion;
			const provider = run.providers[0] as Record<string, unknown>;
			provider.gaps = [
				{
					scope: "suite",
					id: "disk",
					outcome: "skipped",
					reason: "x",
					cause: { kind: "disk-shortfall", freeGb: 20, requiredGb: 30 },
				},
			];
			return run;
		};
		for (const schemaVersion of ["2", "3"]) {
			expect(() => parseRun(withCause(schemaVersion))).toThrow(
				/v4-or-later Run when a ResultGap carries a structured cause/,
			);
		}
		expect(parseRun(withCause("4")).providers[0]?.gaps[0]?.cause?.kind).toBe("disk-shortfall");
	});

	it("rejects a cause whose own numbers contradict it", () => {
		// A structured diagnosis that disagrees with itself is worse than an absent one: consumers stopped
		// re-reading the prose precisely because they trust this field.
		const withCause = (cause: Record<string, unknown>, outcome = "skipped") => {
			const run = structuredClone(validRun);
			run.schemaVersion = "4";
			const provider = run.providers[0] as Record<string, unknown>;
			provider.gaps = [{ scope: "suite", id: "disk", outcome, reason: "x", cause }];
			return run;
		};
		// A shortfall that is not short — the suite would have fit, so nothing was refused.
		expect(() =>
			parseRun(withCause({ kind: "disk-shortfall", freeGb: 30, requiredGb: 30 })),
		).toThrow(/disk shortfall whose freeGb is below requiredGb/);
		// A "failed" step that exited cleanly.
		expect(() =>
			parseRun(withCause({ kind: "step-failed", step: "s", exitCode: 0 }, "failed")),
		).toThrow(/failed step whose exitCode is non-zero/);
		// An absent exitCode stays legal — the producer may not have one to report.
		expect(
			parseRun(withCause({ kind: "step-failed", step: "s" }, "failed")).providers[0]?.gaps[0]?.cause
				?.kind,
		).toBe("step-failed");
	});

	it("keeps unsupported-operation scoped to an operation", () => {
		// On a suite the cause would read as "this provider cannot run this benchmark at all" — a much
		// larger claim than the producer made, which only ever says one SDK call is missing.
		const withScope = (scope: string) => {
			const run = structuredClone(validRun);
			run.schemaVersion = "4";
			const provider = run.providers[0] as Record<string, unknown>;
			provider.gaps = [
				{
					scope,
					id: scope === "suite" ? "disk" : "sandbox_snapshot_ms",
					outcome: "skipped",
					reason: "x",
					cause: { kind: "unsupported-operation", detail: "no snapshot op" },
				},
			];
			return run;
		};
		expect(() => parseRun(withScope("suite"))).toThrow(
			/operation-scoped gap when its cause is "unsupported-operation"/,
		);
		expect(parseRun(withScope("operation")).providers[0]?.gaps[0]?.cause?.kind).toBe(
			"unsupported-operation",
		);
		// measurement-disabled is deliberately NOT coupled to a scope: turning a whole suite off is a
		// choice we could legitimately make, so pinning it would invent a rule rather than record one.
		const suiteDisabled = structuredClone(validRun);
		suiteDisabled.schemaVersion = "4";
		const provider = suiteDisabled.providers[0] as Record<string, unknown>;
		provider.gaps = [
			{
				scope: "suite",
				id: "disk",
				outcome: "skipped",
				reason: "x",
				cause: { kind: "measurement-disabled" },
			},
		];
		expect(parseRun(suiteDisabled).providers[0]?.gaps[0]?.cause?.kind).toBe("measurement-disabled");
	});

	it("rejects an unknown schemaVersion", () => {
		expect(() => parseRun({ ...validRun, schemaVersion: "1" })).toThrow();
		expect(() => parseRun({ ...validRun, schemaVersion: "5" })).toThrow();
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

	it("rejects a v3 Run that carries both a shard replicateIndex and folded replicates", () => {
		// replicateIndex marks a per-replicate SHARD (pre-fold); MetricResult.replicates marks the AGGREGATE
		// (the fold across shards, which drops replicateIndex). A Run with both is neither — reject it.
		const both = structuredClone(validRun);
		both.schemaVersion = "3";
		(both as Record<string, unknown>).replicateIndex = 0;
		const metric = both.providers[0]?.metrics[0];
		if (metric)
			(metric as Record<string, unknown>).replicates = [
				{ index: 0, samples: [16.19, 16.3] },
				{ index: 1, samples: [16.08] },
			];
		expect(() => parseRun(both)).toThrow(/never both/);
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

	it("rejects a specMatched verdict on a ProviderRun that observed nothing", () => {
		// specMatched is computed FROM observations; a row carrying a verdict with an empty
		// observedSpecs would render both as "not present in this run" and under a comparability
		// warning about measured ranks it doesn't have. Unrepresentable beats contradictory.
		const bad = structuredClone(validRun);
		const provider = bad.providers[0];
		if (provider) {
			provider.validationStatus = "pending";
			provider.metrics = [];
			(provider as Record<string, unknown>).observedSpecs = {};
			(provider as Record<string, unknown>).specMatched = false;
		}
		expect(() => parseRun(bad)).toThrow(/observedSpecs when specMatched/);
	});

	it("accepts a specMatched verdict backed by observations", () => {
		const good = structuredClone(validRun);
		const provider = good.providers[0];
		if (provider) (provider as Record<string, unknown>).specMatched = true;
		expect(parseRun(good).providers[0]?.specMatched).toBe(true);
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
