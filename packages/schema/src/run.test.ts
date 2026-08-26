import { describe, expect, it } from "bun:test";
import { parseRun, parseRunIndex, runDocumentPath, runDocumentPaths } from "./index.ts";

const validRun = {
	schemaVersion: "2",
	runId: "run-1",
	sha: "deadbeef",
	generatedAt: "2026-06-20T00:00:00.000Z",
	targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
	providers: [
		{
			providerId: "daytona-vm",
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

	it("accepts every published schemaVersion from v2 through v6", () => {
		for (const schemaVersion of ["2", "3", "4"] as const) {
			expect(parseRun({ ...validRun, schemaVersion }).schemaVersion).toBe(schemaVersion);
		}
		const v5 = structuredClone(validRun);
		v5.schemaVersion = "5";
		for (const provider of v5.providers) {
			(provider as Record<string, unknown>).costEvidence = [];
		}
		expect(parseRun(v5).schemaVersion).toBe("5");

		const v6 = structuredClone(v5);
		v6.schemaVersion = "6";
		for (const provider of v6.providers) {
			(provider as Record<string, unknown>).artifactEvidence = [
				{
					cell: { runId: "run-1", providerId: "daytona-vm", suite: "cpu-node" },
					sandboxId: "isandbox",
					provenance: {
						source: "request-fallback",
						requested: { kind: "baked", ref: "toolchain-v8" },
					},
				},
			];
		}
		expect(parseRun(v6).schemaVersion).toBe("6");
	});

	it("gates artifact evidence at v6 in both directions", () => {
		const evidence = {
			cell: { runId: "run-1", providerId: "daytona-vm", suite: "cpu-node" },
			sandboxId: "isandbox",
			provenance: {
				source: "request-fallback",
				requested: { kind: "baked", ref: "toolchain-v8" },
			},
		};

		// Writing the field without bumping the version is rejected here, rather than reaching a
		// v6-gated consumer that would read the attribution as if the producer had declared it.
		const early = structuredClone(validRun);
		for (const provider of early.providers) {
			(provider as Record<string, unknown>).artifactEvidence = [evidence];
		}
		expect(() => parseRun(early)).toThrow(/v6 Run when a ProviderRun carries artifactEvidence/);

		// And a v6 Run cannot omit the attribution that is the whole point of the version.
		const missing = structuredClone(validRun);
		missing.schemaVersion = "6";
		for (const provider of missing.providers) {
			(provider as Record<string, unknown>).costEvidence = [];
		}
		expect(() => parseRun(missing)).toThrow(/v6 ProviderRun with an artifactEvidence array/);

		const valid = structuredClone(missing);
		for (const provider of valid.providers) {
			(provider as Record<string, unknown>).artifactEvidence = [evidence];
		}
		const parsed = parseRun(valid);
		expect(parsed.providers[0]?.artifactEvidence?.[0]?.provenance.source).toBe("request-fallback");
	});

	it("will not let a measured v6 provider claim it never booted", () => {
		// An empty array asserts "this provider booted nothing". A row carrying Metrics measured that
		// inside a sandbox, so the two cannot both be true — and an unattributed measurement is the
		// exact gap v6 exists to close.
		const unattributed = structuredClone(validRun);
		unattributed.schemaVersion = "6";
		for (const provider of unattributed.providers) {
			(provider as Record<string, unknown>).costEvidence = [];
			(provider as Record<string, unknown>).artifactEvidence = [];
		}
		expect(() => parseRun(unattributed)).toThrow(/metrics carry artifact attribution/);

		// A row that measured nothing may still legitimately carry an empty array.
		const noMetrics = structuredClone(unattributed);
		for (const provider of noMetrics.providers) {
			(provider as Record<string, unknown>).metrics = [];
			(provider as Record<string, unknown>).validationStatus = "pending";
		}
		expect(parseRun(noMetrics).schemaVersion).toBe("6");
	});

	it("rejects a persisted driver report that contradicts its request", () => {
		// ADR-0007 makes a differing report a create-time contradiction that tears down the orphan, so
		// a Run carrying the disagreement would mean that teardown never happened.
		const contradiction = structuredClone(validRun);
		contradiction.schemaVersion = "6";
		for (const provider of contradiction.providers) {
			(provider as Record<string, unknown>).costEvidence = [];
			(provider as Record<string, unknown>).artifactEvidence = [
				{
					cell: { runId: "run-1", providerId: "daytona-vm", suite: "cpu-node" },
					sandboxId: "isandbox",
					provenance: {
						source: "driver-reported",
						requested: { kind: "baked", ref: "toolchain-v8" },
						reported: { kind: "baked", ref: "toolchain-v7" },
					},
				},
			];
		}
		expect(() => parseRun(contradiction)).toThrow(/ref matches the request/);
	});

	it("keeps artifact attribution joined to one unambiguous benchmark cell", () => {
		const attributed = structuredClone(validRun);
		attributed.schemaVersion = "6";
		const provider = attributed.providers[0] as Record<string, unknown>;
		provider.costEvidence = [];
		provider.artifactEvidence = [
			{
				cell: { runId: "run-1", providerId: "daytona-vm", suite: "cpu-node" },
				sandboxId: "sb-1",
				provenance: {
					source: "request-fallback",
					requested: { kind: "baked", ref: "sandbox-benchmarks-toolchain-v8" },
				},
			},
		];
		expect(parseRun(attributed).schemaVersion).toBe("6");

		const wrongParent = structuredClone(attributed);
		const wrongEvidence = (
			(wrongParent.providers[0] as Record<string, unknown>).artifactEvidence as Array<
				Record<string, unknown>
			>
		)[0];
		if (wrongEvidence)
			wrongEvidence.cell = { runId: "other", providerId: "daytona-vm", suite: "cpu-node" };
		expect(() => parseRun(wrongParent)).toThrow(/match its parent Run/);

		const wrongShard = structuredClone(attributed);
		(wrongShard as Record<string, unknown>).replicateIndex = 1;
		expect(() => parseRun(wrongShard)).toThrow(/replicateIndex matches the Run/);

		const duplicateCell = structuredClone(attributed);
		const records = (duplicateCell.providers[0] as Record<string, unknown>)
			.artifactEvidence as Array<Record<string, unknown>>;
		records.push({ ...structuredClone(records[0]), sandboxId: "sb-2" });
		expect(() => parseRun(duplicateCell)).toThrow(/at most one artifact attribution/);

		const reusedSandbox = structuredClone(attributed);
		const reusedRecords = (reusedSandbox.providers[0] as Record<string, unknown>)
			.artifactEvidence as Array<Record<string, unknown>>;
		reusedRecords.push({
			...structuredClone(reusedRecords[0]),
			cell: { runId: "run-1", providerId: "daytona-vm", suite: "system" },
		});
		expect(() => parseRun(reusedSandbox)).toThrow(/sandbox id used by exactly one benchmark cell/);

		const sameArtifact = structuredClone(attributed);
		const sameRecords = (sameArtifact.providers[0] as Record<string, unknown>)
			.artifactEvidence as Array<Record<string, unknown>>;
		sameRecords.push({
			cell: { runId: "run-1", providerId: "daytona-vm", suite: "system" },
			sandboxId: "sb-2",
			provenance: {
				source: "request-fallback",
				// Deliberately reverse the JSON key order; identity is semantic, not byte-order-sensitive.
				requested: { ref: "sandbox-benchmarks-toolchain-v8", kind: "baked" },
			},
		});
		expect(parseRun(sameArtifact).providers[0]?.artifactEvidence).toHaveLength(2);

		const mixedArtifact = structuredClone(sameArtifact);
		const mixedRecords = (mixedArtifact.providers[0] as Record<string, unknown>)
			.artifactEvidence as Array<Record<string, unknown>>;
		const second = mixedRecords[1] as Record<string, unknown>;
		second.provenance = {
			source: "request-fallback",
			requested: { kind: "baked", ref: "different-template" },
		};
		expect(() => parseRun(mixedArtifact)).toThrow(/one effective artifact across every sandbox/);
	});

	it("gates cost evidence at v5 and checks its parent cell identity", () => {
		const evidence = {
			kind: "missing",
			cell: { runId: "run-1", providerId: "daytona-vm", suite: "cpu-node" },
			subject: { kind: "sandbox", sandboxId: "sb-1" },
			capturedAt: "2026-08-08T00:00:00.000Z",
			sdk: { packageName: "sdk", version: "1.0.0" },
			reason: "unsupported_public_api",
			detail: "No public endpoint.",
		};
		const preV5 = structuredClone(validRun);
		(preV5.providers[0] as Record<string, unknown>).costEvidence = [];
		expect(() => parseRun(preV5)).toThrow(/v5 Run/);
		expect(() => parseRun({ ...validRun, schemaVersion: "5" })).toThrow(/costEvidence array/);

		const v5 = structuredClone(validRun);
		v5.schemaVersion = "5";
		(v5.providers[0] as Record<string, unknown>).costEvidence = [evidence];
		expect(parseRun(v5).providers[0]?.costEvidence).toHaveLength(1);
		evidence.cell.runId = "other-run";
		expect(() => parseRun(v5)).toThrow(/match its parent Run/);
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

	it("names the machine on a single-sandbox metric, and refuses both attribution levels at once", () => {
		// `replicates` only exists at ≥2 clusters, so without a Metric-level id a provider whose suites each
		// landed one sandbox published its mixtures with nothing pointing at any of them.
		const withIds = (ids: Record<string, unknown>, replicates?: unknown) => {
			const run = structuredClone(validRun);
			run.schemaVersion = "4";
			const provider = run.providers[0] as Record<string, unknown>;
			provider.observedMixtures = {
				sandboxes: 1,
				hostHardware: { aaaaaaaaaaaaaaaa: { count: 1, specs: { cpuModel: "AMD EPYC 9R14" } } },
				hostNetwork: {},
			};
			const metric = (provider.metrics as Array<Record<string, unknown>>)[0] as Record<
				string,
				unknown
			>;
			Object.assign(metric, ids);
			if (replicates) metric.replicates = replicates;
			return run;
		};
		expect(
			parseRun(withIds({ hostHardwareId: "aaaaaaaaaaaaaaaa" })).providers[0]?.metrics[0]
				?.hostHardwareId,
		).toBe("aaaaaaaaaaaaaaaa");
		// The same referential-integrity rule as every other reference into observedMixtures.
		expect(() => parseRun(withIds({ hostHardwareId: "bbbbbbbbbbbbbbbb" }))).toThrow(
			/metric hostHardwareId resolves in observedMixtures/,
		);
		// A Metric-level id claims ONE machine for every Sample, which a replicate breakdown contradicts.
		// Carrying both would let the two levels disagree and leave a consumer to pick one.
		expect(() =>
			parseRun(
				withIds({ hostHardwareId: "aaaaaaaaaaaaaaaa" }, [
					{ index: 0, samples: [16.19, 16.3] },
					{ index: 1, samples: [16.08] },
				]),
			),
		).toThrow(/host attribution is per-replicate when it has a replicate breakdown/);
	});

	it("refuses mixture counts that outrun their own denominator", () => {
		// `sandboxes` is the whole reason the counts mean anything. Falling short is a real, visible
		// partial disclosure (a probe saw nothing); exceeding it describes a fleet that never existed,
		// and every proportion a reader computes from it is arithmetic on a lie.
		const withMixtures = (sandboxes: number, counts: number[]) => {
			const run = structuredClone(validRun);
			run.schemaVersion = "4";
			const provider = run.providers[0] as Record<string, unknown>;
			provider.observedMixtures = {
				sandboxes,
				hostHardware: Object.fromEntries(
					counts.map((count, i) => [
						`${"abcdef0123456789".slice(i, i + 1).repeat(16)}`,
						{ count, specs: { cpuModel: `cpu-${i}` } },
					]),
				),
				hostNetwork: {},
			};
			return run;
		};
		expect(() => parseRun(withMixtures(4, [3, 3]))).toThrow(
			/hostHardware counts sum to at most sandboxes \(got 6 of 4\)/,
		);
		// Summing to exactly the denominator, and falling short of it, are both fine.
		expect(parseRun(withMixtures(4, [3, 1])).providers[0]?.observedMixtures?.sandboxes).toBe(4);
		expect(parseRun(withMixtures(4, [1])).providers[0]?.observedMixtures?.sandboxes).toBe(4);
	});

	it("refuses a mixture that discloses nothing", () => {
		// A category the sandbox saw nothing for is represented by NO mixture and no id, so the counts
		// visibly fall short of `sandboxes`. An empty mixture would launder that shortfall into a phantom
		// machine every reader can join to.
		const run = structuredClone(validRun);
		run.schemaVersion = "4";
		const provider = run.providers[0] as Record<string, unknown>;
		provider.observedMixtures = {
			sandboxes: 1,
			hostHardware: { aaaaaaaaaaaaaaaa: { count: 1, specs: {} } },
			hostNetwork: {},
		};
		expect(() => parseRun(run)).toThrow(/mixture whose specs disclose at least one field/);
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
		// More metrics unrecorded than the suite ever declared — the unrecorded ones are by definition a
		// subset of the declared ones, so a count above `declared` describes metrics that do not exist.
		expect(() =>
			parseRun(
				withCause({ kind: "metrics-unrecorded", metricIds: ["a", "b"], declared: 1 }, "failed"),
			),
		).toThrow(/unrecorded metrics that are a subset of the declared ones/);
		// All of them unrecorded is the ordinary total-miss case, not a contradiction.
		expect(
			parseRun(
				withCause({ kind: "metrics-unrecorded", metricIds: ["a", "b"], declared: 2 }, "failed"),
			).providers[0]?.gaps[0]?.cause?.kind,
		).toBe("metrics-unrecorded");
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

	it("accepts aggregate Run ids and rejects path syntax in Run identities", () => {
		const aggregateId = structuredClone(validRun);
		aggregateId.runId = "29937467891+29967667026";
		expect(parseRun(aggregateId).runId).toBe("29937467891+29967667026");

		for (const runId of ["../outside", "nested/run", "nested\\run"]) {
			const bad = structuredClone(validRun);
			bad.runId = runId;
			expect(() => parseRun(bad)).toThrow(/invalid Run/);
		}
	});

	it("requires a RunIndex path to be the canonical path derived from its Run id", () => {
		for (const path of ["runs/../runs/run-1.json", "runs/other.json", "../run-1.json"]) {
			expect(() =>
				parseRunIndex({
					schemaVersion: "1",
					runs: [{ runId: "run-1", generatedAt: "2026-06-20T00:00:00.000Z", path }],
				}),
			).toThrow(/invalid RunIndex/);
		}
	});

	it("derives a replicate shard's path from its runId AND its replicate index", () => {
		expect(runDocumentPath("run-1")).toBe("runs/run-1.json");
		expect(runDocumentPath("run-1", 0)).toBe("runs/run-1-r0.json");

		const index = parseRunIndex({
			schemaVersion: "1",
			runs: [
				{
					runId: "run-1",
					generatedAt: "2026-06-20T00:00:00.000Z",
					path: "runs/run-1-r2.json",
					replicateIndex: 2,
				},
			],
		});
		expect(index.runs[0]?.replicateIndex).toBe(2);

		// The suffix is not free-floating: it has to be the entry's OWN replicate index, and an entry
		// that declares none is still held to the un-suffixed name.
		for (const entry of [
			{ path: "runs/run-1-r2.json", replicateIndex: 3 },
			{ path: "runs/run-1-r2.json" },
			{ path: "runs/run-2.json" },
			{ path: "run-1.json" },
		]) {
			expect(() =>
				parseRunIndex({
					schemaVersion: "1",
					runs: [{ runId: "run-1", generatedAt: "2026-06-20T00:00:00.000Z", ...entry }],
				}),
			).toThrow(/invalid RunIndex/);
		}
	});

	// The single-sandbox lane (`bench-suite --replicate <idx>`) stamps a replicate index onto the Run
	// but keeps the UN-suffixed filename, which commit-dataset.yml reads as the legacy shard shape. A
	// one-name-per-identity rule outlaws that pairing, and the lane then dies at its final write —
	// after the whole benchmark has run. Both names are legal for a replicate-stamped Run; a Run with
	// no replicate index still has exactly one, which is what keeps the dataset invariant intact.
	it("accepts either the suffixed or the un-suffixed name for a replicate-stamped Run", () => {
		expect(runDocumentPaths("run-1")).toEqual(["runs/run-1.json"]);
		expect(runDocumentPaths("run-1", 3)).toEqual(["runs/run-1-r3.json", "runs/run-1.json"]);

		const index = parseRunIndex({
			schemaVersion: "1",
			runs: [
				{
					runId: "run-1",
					generatedAt: "2026-06-20T00:00:00.000Z",
					path: "runs/run-1.json",
					replicateIndex: 3,
				},
			],
		});
		expect(index.runs[0]?.path).toBe("runs/run-1.json");
	});

	// The dataset index is the published artifact update-leaderboard.yml resolves a run through, and
	// its entries never carry a replicate index (a promoted Run spans every replicate). Nothing about
	// the shard names above may loosen what IT accepts.
	it("still admits exactly one path for an entry that declares no replicate index", () => {
		for (const path of ["runs/run-1-r0.json", "runs/run-1-r.json", "runs/run-1-rx.json"]) {
			expect(() =>
				parseRunIndex({
					schemaVersion: "1",
					runs: [{ runId: "run-1", generatedAt: "2026-06-20T00:00:00.000Z", path }],
				}),
			).toThrow(/invalid RunIndex/);
		}
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
