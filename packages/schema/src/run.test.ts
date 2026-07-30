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
		// The v4 aggregate carries BOTH observedMixtures and the v3 replicate breakdown. An "=== '3'" gate
		// would have rejected its own predecessor's field on every version bump, so the floors compare
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

	it("rejects a pre-v4 Run that carries observedMixtures", () => {
		// A pre-v4 consumer handed a Run with mixtures would fall back to the single representative
		// observedSpecs reading and report a heterogeneous fleet as homogeneous — so the producer must bump
		// the version rather than smuggle the field into a v3 document.
		const mixtures = {
			sandboxes: 2,
			hostHardware: { abc0123456789def: { count: 2, specs: { cpuModel: "AMD EPYC 9R14" } } },
			hostNetwork: {},
		};
		for (const schemaVersion of ["2", "3"]) {
			const run = structuredClone(validRun);
			run.schemaVersion = schemaVersion;
			const provider = run.providers[0];
			if (provider) (provider as Record<string, unknown>).observedMixtures = mixtures;
			expect(() => parseRun(run)).toThrow(/v4-or-later Run/);
		}
		const v4 = structuredClone(validRun);
		v4.schemaVersion = "4";
		const provider = v4.providers[0];
		if (provider) (provider as Record<string, unknown>).observedMixtures = mixtures;
		expect(parseRun(v4).providers[0]?.observedMixtures?.sandboxes).toBe(2);
	});

	it("rejects a replicate mixture id that resolves to nothing", () => {
		// A dangling id is worse than an absent one: both read as `undefined` at the point of use, so a
		// consumer cannot tell "this sandbox disclosed nothing" from "this machine cannot be looked up".
		const withDangling = structuredClone(validRun);
		withDangling.schemaVersion = "4";
		const provider = withDangling.providers[0] as Record<string, unknown>;
		provider.observedMixtures = {
			sandboxes: 2,
			hostHardware: { aaaaaaaaaaaaaaaa: { count: 2, specs: { cpuModel: "AMD EPYC 9R14" } } },
			hostNetwork: {},
		};
		const metric = (provider.metrics as Array<Record<string, unknown>>)[0];
		if (metric)
			metric.replicates = [
				{ index: 0, samples: [16.19, 16.3], hostHardwareId: "aaaaaaaaaaaaaaaa" },
				{ index: 1, samples: [16.08], hostHardwareId: "bbbbbbbbbbbbbbbb" }, // no such mixture
			];
		expect(() => parseRun(withDangling)).toThrow(/hostHardwareId resolves in observedMixtures/);

		// The same document with both ids resolving is accepted.
		const replicates = metric?.replicates as Array<Record<string, unknown>>;
		if (replicates[1]) replicates[1].hostHardwareId = "aaaaaaaaaaaaaaaa";
		expect(parseRun(withDangling).providers[0]?.metrics[0]?.replicates?.[1]?.hostHardwareId).toBe(
			"aaaaaaaaaaaaaaaa",
		);
	});

	it("rejects a pre-v4 Run whose replicate names a mixture, without needing its own version gate", () => {
		// A replicate id is unreachable pre-v4 by CONSTRUCTION, not by a second rule: it must resolve into
		// observedMixtures, and observedMixtures is itself v4-gated. Both routes are pinned here so the
		// absent gate stays absent for the right reason rather than by oversight.
		const withIds = (mixtures?: Record<string, unknown>) => {
			const run = structuredClone(validRun);
			run.schemaVersion = "3";
			const provider = run.providers[0] as Record<string, unknown>;
			if (mixtures) provider.observedMixtures = mixtures;
			const metric = (provider.metrics as Array<Record<string, unknown>>)[0] as Record<
				string,
				unknown
			>;
			metric.replicates = [
				{ index: 0, samples: [16.19, 16.3], hostHardwareId: "aaaaaaaaaaaaaaaa" },
				{ index: 1, samples: [16.08] },
			];
			return run;
		};
		// No mixtures to resolve against: referential integrity refuses it.
		expect(() => parseRun(withIds())).toThrow(/hostHardwareId resolves in observedMixtures/);
		// Mixtures present so the id resolves — now the version gate on observedMixtures refuses it.
		expect(() =>
			parseRun(
				withIds({
					sandboxes: 2,
					hostHardware: { aaaaaaaaaaaaaaaa: { count: 2, specs: { cpuModel: "AMD EPYC 9R14" } } },
					hostNetwork: {},
				}),
			),
		).toThrow(/v4-or-later Run when a ProviderRun carries observedMixtures/);
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

	it("keeps the derived marker out of a pre-v4 Run, and says nothing about the catalog", () => {
		// The marker is version-gated, which is a property of the DOCUMENT. Whether it agrees with the
		// Metric Catalog is deliberately NOT checked here: `parseRun` must not make an already-published
		// Run's validity a function of the current catalog, or reclassifying one metric would retroactively
		// invalidate the whole committed series. That agreement is a producer-side gate (see isDerivedMetric).
		const withMarker = (schemaVersion: string) => {
			const run = structuredClone(validRun);
			run.schemaVersion = schemaVersion;
			const metric = run.providers[0]?.metrics[0] as Record<string, unknown>;
			metric.derived = true;
			return run;
		};
		expect(() => parseRun(withMarker("3"))).toThrow(/v4-or-later Run/);
		// At v4 the marker is legal on any metric — including one the catalog calls measured, because the
		// catalog is not consulted. The value is the document's own claim about itself.
		expect(parseRun(withMarker("4")).providers[0]?.metrics[0]?.derived).toBe(true);
	});

	it("rejects a replicate breakdown on a derived Metric", () => {
		// A computed row is one value derived from the merged measured set, so per-sandbox clusters would
		// claim a between-machine spread nobody measured. Document-internal, so it needs no catalog.
		const run = structuredClone(validRun);
		run.schemaVersion = "4";
		const metric = run.providers[0]?.metrics[0] as Record<string, unknown>;
		metric.derived = true;
		metric.replicates = [
			{ index: 0, samples: [16.19, 16.3] },
			{ index: 1, samples: [16.08] },
		];
		expect(() => parseRun(run)).toThrow(/derived MetricResult without a replicate breakdown/);
	});

	it("rejects a provider verdict kinder than its per-machine verdicts", () => {
		// The provider fold cannot be kinder than its parts: one machine off-spec contaminates the shared
		// aggregate. Checking it here makes the fold rule a property of the document.
		const run = structuredClone(validRun);
		run.schemaVersion = "4";
		const provider = run.providers[0] as Record<string, unknown>;
		provider.specMatched = true;
		provider.observedMixtures = {
			sandboxes: 2,
			hostHardware: {
				aaaaaaaaaaaaaaaa: { count: 1, specs: { vcpus: 4 }, specMatched: true },
				bbbbbbbbbbbbbbbb: { count: 1, specs: { vcpus: 1 }, specMatched: false },
			},
			hostNetwork: {},
		};
		expect(() => parseRun(run)).toThrow(/specMatched false when any host-hardware mixture failed/);
		provider.specMatched = false;
		expect(parseRun(run).providers[0]?.specMatched).toBe(false);
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

describe("mixture category partition", () => {
	const mixtures = (specs: Record<string, unknown>) => {
		const run = structuredClone(validRun);
		run.schemaVersion = "4";
		const provider = run.providers[0] as Record<string, unknown>;
		provider.observedMixtures = {
			sandboxes: 1,
			hostHardware: { aaaaaaaaaaaaaaaa: { count: 1, specs } },
			hostNetwork: {},
		};
		return run;
	};

	it("rejects a cross-category or identity field inside a mixture's specs", () => {
		// arktype IGNORES undeclared keys by default, so without onUndeclaredKey("reject") the partition
		// was only a producer convention: a hostHardware mixture could carry `egressAsn`, or the `publicIp`
		// whose inclusion the design says destroys the signal, and still validate.
		expect(() => parseRun(mixtures({ cpuModel: "AMD EPYC 9R14", egressAsn: "AS14618" }))).toThrow(
			/must be removed/,
		);
		expect(() =>
			parseRun(mixtures({ cpuModel: "AMD EPYC 9R14", publicIp: "203.0.113.1" })),
		).toThrow(/must be removed/);
		expect(parseRun(mixtures({ cpuModel: "AMD EPYC 9R14" })).schemaVersion).toBe("4");
	});

	it("still ignores undeclared keys on observedSpecs, so published Runs keep parsing", () => {
		// The rejection is scoped to the category schemas ALONE. observedSpecs must stay permissive: every
		// committed Run predating this change carries `hostCpuModels`, a field since deleted from the schema.
		const legacy = structuredClone(validRun);
		const provider = legacy.providers[0] as Record<string, unknown>;
		(provider.observedSpecs as Record<string, unknown>).hostCpuModels = ["AMD EPYC 9R14"];
		expect(parseRun(legacy).providers[0]?.observedSpecs.cpuModel).toBeUndefined();
	});
});
