import { describe, expect, it } from "bun:test";
import type { GapCause, MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import {
	aggregate,
	ECONOMICS_METRIC_IDS,
	getProvider,
	HARNESS_METRIC_IDS,
	hourlyCostAtTargetSpec,
	TARGET_SPEC,
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
			provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10, 11])]),
		]);
		const sysShard = shard([provider("daytona-vm", [metric("pybench_milliseconds", [900, 910])])]);

		const merged = aggregateRuns([cpuShard, sysShard]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona-vm");
		const ids = daytona?.metrics.map((m) => m.metricId) ?? [];
		expect(ids).toContain("node_web_tooling_runs_per_s");
		expect(ids).toContain("pybench_milliseconds");
		expect(daytona?.validationStatus).toBe("validated");
	});

	it("folds ≥2 replicate shards of one suite into a replicate breakdown with pooled samples", () => {
		const r0 = shard(
			[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const r1 = shard(
			[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [20, 21])])],
			"2026-06-01T00:00:00.000Z",
			1,
		);

		const merged = aggregateRuns([r0, r1]);
		const node = merged.providers
			.find((p) => p.providerId === "daytona-vm")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		// Two replicates, indexed and ordered; the pooled samples are their union; aggregates recomputed.
		expect(node?.replicates).toEqual([
			{ index: 0, samples: [10, 11] },
			{ index: 1, samples: [20, 21] },
		]);
		expect(node?.samples).toEqual([10, 11, 20, 21]);
		expect(node?.aggregates.n).toBe(4);
		// The merged Run is v4 (replicate-aware, mixture-aware, attributed, self-describing).
		expect(merged.schemaVersion).toBe("4");
	});

	it("keeps a single-replicate metric verbatim — no replicates field at R = 1", () => {
		const only = shard(
			[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const node = aggregateRuns([only])
			.providers.find((p) => p.providerId === "daytona-vm")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(node?.replicates).toBeUndefined();
		expect(node?.samples).toEqual([10, 11]);
	});

	it("first-wins for a duplicate metric WITHIN one replicate (result-name contamination)", () => {
		// Same replicate index, same metric id, divergent samples — a contaminated composite, not a
		// second sandbox. Keep the first and never build a replicate breakdown from it.
		const a = shard(
			[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10, 11])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const b = shard(
			[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [99, 99])])],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const node = aggregateRuns([a, b])
			.providers.find((p) => p.providerId === "daytona-vm")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(node?.replicates).toBeUndefined();
		expect(node?.samples).toEqual([10, 11]);
	});

	it("merges different providers' shards into one Run", () => {
		const a = shard([
			provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
			provider("e2b", []),
		]);
		const b = shard([
			provider("daytona-vm", []),
			provider("e2b", [metric("node_web_tooling_runs_per_s", [9])]),
		]);
		const merged = aggregateRuns([a, b]);
		expect(merged.providers.find((p) => p.providerId === "daytona-vm")?.validationStatus).toBe(
			"validated",
		);
		expect(merged.providers.find((p) => p.providerId === "e2b")?.validationStatus).toBe(
			"validated",
		);
	});

	it("RE-derives economics from the merged measured set (stale shard economics dropped)", () => {
		const hourly = hourlyCostAtTargetSpec(getProvider("daytona-vm")) ?? Number.NaN;
		// Shard carries a deliberately-wrong usd_per_hour; aggregate must recompute it from pricing.
		const lifecycleShard = shard([
			provider("daytona-vm", [
				metric(HARNESS_METRIC_IDS.spawn, [1000]),
				metric(ECONOMICS_METRIC_IDS.usdPerHour, [999.99]),
			]),
		]);
		const cpuShard = shard([provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])])]);

		const merged = aggregateRuns([lifecycleShard, cpuShard]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona-vm");
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
				[provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])])],
				"2026-06-01T00:00:00.000Z",
			),
			shard(
				[provider("daytona-vm", [metric("pybench_milliseconds", [900])])],
				"2026-06-02T00:00:00.000Z",
			),
		]);
		expect(merged.generatedAt).toBe("2026-06-02T00:00:00.000Z");
	});

	it("discloses differing host CPUs as distinct mixtures, naming each and how many saw it", () => {
		// Replaces the deleted `hostCpuModels` string array: it named the distinct models but not how many
		// sandboxes each covered, and nothing ever read it — the mixtures answer both.
		const a = shard([
			{
				...provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
				observedSpecs: { cpuModel: "AMD EPYC 9R14", cpuMicroarch: "Zen 4 (Genoa)" },
			},
		]);
		const b = shard([
			{
				...provider("daytona-vm", [metric("pybench_milliseconds", [900])]),
				observedSpecs: { cpuModel: "AMD EPYC 9R45", cpuMicroarch: "Zen 5 (Turin)" },
			},
		]);
		const daytona = aggregateRuns([a, b]).providers.find((p) => p.providerId === "daytona-vm");
		// Sorted by name for the assertion only: both counts are 1, so the map's own order is the id
		// tie-break, which is deliberately not alphabetical.
		expect(
			Object.values(daytona?.observedMixtures?.hostHardware ?? {})
				.map((m) => [m.specs.cpuModel, m.count] as const)
				.sort(([x], [y]) => String(x).localeCompare(String(y))),
		).toEqual([
			["AMD EPYC 9R14", 1],
			["AMD EPYC 9R45", 1],
		]);
	});

	it("counts the distinct host-hardware and host-network mixtures its sandboxes reported", () => {
		const genoa = {
			cpuModel: "AMD EPYC 9R14",
			cpuMicroarch: "Zen 4 (Genoa)",
			vcpus: 2,
			memoryGb: 8,
		};
		const turin = {
			cpuModel: "AMD EPYC 9R45",
			cpuMicroarch: "Zen 5 (Turin)",
			vcpus: 2,
			memoryGb: 8,
		};
		const ashburn = { egressAsn: "AS14618", egressOrg: "Amazon", city: "Ashburn", country: "US" };
		const frankfurt = {
			egressAsn: "AS16509",
			egressOrg: "Amazon",
			city: "Frankfurt",
			country: "DE",
		};
		// Three sandboxes on Genoa/Ashburn, one on Turin, one of the Genoa three in Frankfurt. Each carries
		// its OWN publicIp — a per-sandbox identity field that must not fragment the network mixtures.
		const sandbox = (specs: Record<string, unknown>, index: number, ip: string) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric("pybench_milliseconds", [900 + index])]),
						observedSpecs: { ...specs, publicIp: ip },
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		const merged = aggregateRuns([
			sandbox({ ...genoa, ...ashburn }, 0, "203.0.113.1"),
			sandbox({ ...genoa, ...ashburn }, 1, "203.0.113.2"),
			sandbox({ ...turin, ...ashburn }, 2, "203.0.113.3"),
			sandbox({ ...genoa, ...frankfurt }, 3, "198.51.100.4"),
		]);
		const mixtures = merged.providers.find((p) => p.providerId === "daytona-vm")?.observedMixtures;

		// The denominator, and the two counts — no inference required to read the heterogeneity off this.
		expect(mixtures?.sandboxes).toBe(4);
		const hardware = Object.values(mixtures?.hostHardware ?? {});
		const network = Object.values(mixtures?.hostNetwork ?? {});
		expect(hardware.map((m) => m.count)).toEqual([3, 1]); // most-common mixture first
		expect(network.map((m) => m.count)).toEqual([3, 1]);
		expect(hardware[0]?.specs).toEqual(genoa);
		expect(hardware[1]?.specs).toEqual(turin);
		expect(network[1]?.specs).toEqual(frankfurt);
		// Four distinct publicIps did NOT mint four network mixtures: identity fields are excluded from
		// both hashes, without which every count would be 1 and the disclosure would carry no signal. The
		// category types now make an identity field on a mixture unrepresentable, so the counts above are
		// the assertion — four sandboxes collapsing to 3 + 1 is only possible if the ip was excluded.
		expect(hardware.length + network.length).toBe(4);
	});

	it("keys mixtures by a stable hash that ignores shard arrival order", () => {
		const specs = { cpuModel: "AMD EPYC 9R45", egressAsn: "AS16509" };
		const sandbox = (index: number) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric("pybench_milliseconds", [900 + index])]),
						observedSpecs: specs,
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		const forward = aggregateRuns([sandbox(0), sandbox(1)]);
		const reversed = aggregateRuns([sandbox(1), sandbox(0)]);
		const of = (run: typeof forward) =>
			run.providers.find((p) => p.providerId === "daytona-vm")?.observedMixtures;
		// Byte-identical, so the committed dataset diff reflects real change rather than merge order — and
		// an id can be compared across runs to ask "same machine shape as last week?".
		expect(JSON.stringify(of(forward))).toBe(JSON.stringify(of(reversed)));
		expect(Object.keys(of(forward)?.hostHardware ?? {})).toHaveLength(1);
	});

	it("omits mixtures for a provider that reported nothing, and ignores its placeholder slices", () => {
		// The normalizer emits a zero-evidence ProviderRun for every registered provider in EVERY shard, so
		// a naive per-slice count would credit a 2-sandbox provider with one blind sandbox per shard in the
		// whole run — and would hand the never-dispatched provider a mixture block claiming sandboxes it
		// never had.
		const measured = (index: number) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric("pybench_milliseconds", [900 + index])]),
						observedSpecs: { cpuModel: "AMD EPYC 9R45" },
					},
					provider("daytona-container", []),
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		const merged = aggregateRuns([measured(0), measured(1)]);
		expect(
			merged.providers.find((p) => p.providerId === "daytona-vm")?.observedMixtures?.sandboxes,
		).toBe(2);
		expect(
			merged.providers.find((p) => p.providerId === "daytona-container")?.observedMixtures,
		).toBeUndefined();
	});

	it("names the machine behind each replicate, so a sample cluster resolves to its host", () => {
		const genoa = { cpuModel: "AMD EPYC 9R14", cpuMicroarch: "Zen 4 (Genoa)" };
		const xeon = { cpuModel: "Intel Xeon Platinum 8358", cpuMicroarch: "Ice Lake" };
		const sandbox = (specs: Record<string, unknown>, index: number) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric("pybench_milliseconds", [900 + index])]),
						observedSpecs: specs,
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		const merged = aggregateRuns([sandbox(genoa, 0), sandbox(xeon, 1), sandbox(genoa, 2)]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona-vm");
		const replicates =
			daytona?.metrics.find((m) => m.metricId === "pybench_milliseconds")?.replicates ?? [];
		expect(replicates).toHaveLength(3);

		// Every id resolves into the provider's own mixtures — the join the schema narrow guarantees.
		const hardware = daytona?.observedMixtures?.hostHardware ?? {};
		for (const replicate of replicates) {
			expect(replicate.hostHardwareId).toBeDefined();
			expect(hardware[replicate.hostHardwareId as string]).toBeDefined();
		}
		// r0 and r2 ran on one machine, r1 on the other: the between-machine axis is now decodable rather
		// than an anonymous set of clusters.
		expect(replicates[0]?.hostHardwareId).toBe(replicates[2]?.hostHardwareId as string);
		expect(replicates[1]?.hostHardwareId).not.toBe(replicates[0]?.hostHardwareId as string);
		expect(hardware[replicates[1]?.hostHardwareId as string]?.specs.cpuModel).toBe(
			"Intel Xeon Platinum 8358",
		);
		// No network probe ran, so no network id is invented for a mixture that does not exist.
		for (const replicate of replicates) expect(replicate.hostNetworkId).toBeUndefined();
	});

	it("names the machine on a single-replicate metric, where there is no breakdown to hold it", () => {
		// The R = 1 hole: `replicates` exists only at ≥2 clusters, so a provider whose suites each landed
		// one sandbox would publish its mixtures with nothing pointing at any of them. One sandbox
		// produced every Sample here, so naming one machine on the Metric is exactly true.
		const genoa = { cpuModel: "AMD EPYC 9R14", vcpus: 2, memoryGb: 8 };
		const turin = { cpuModel: "AMD EPYC 9R45", vcpus: 2, memoryGb: 8 };
		const cpu = shard(
			[
				{
					...provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
					observedSpecs: genoa,
				},
			],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const sys = shard(
			[
				{
					...provider("daytona-vm", [metric("pybench_milliseconds", [900])]),
					observedSpecs: turin,
				},
			],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const daytona = aggregateRuns([cpu, sys]).providers.find((p) => p.providerId === "daytona-vm");
		const idFor = (metricId: string) =>
			daytona?.metrics.find((m) => m.metricId === metricId)?.hostHardwareId;
		const specsFor = (metricId: string) => {
			const id = idFor(metricId);
			return id ? daytona?.observedMixtures?.hostHardware[id]?.specs.cpuModel : undefined;
		};
		// Each metric resolves to the machine ITS sandbox ran on — the two suites landed differently.
		expect(specsFor("node_web_tooling_runs_per_s")).toBe("AMD EPYC 9R14");
		expect(specsFor("pybench_milliseconds")).toBe("AMD EPYC 9R45");
		// And neither carries a breakdown; the ids are the whole attribution at R = 1.
		expect(daytona?.metrics.find((m) => m.metricId === "pybench_milliseconds")?.replicates).toBe(
			undefined,
		);
	});

	it("keeps the attribution per-replicate once there IS a breakdown", () => {
		// At ≥2 clusters a Metric-level id would have to name one machine for Samples spanning several,
		// so the schema refuses both levels at once and the merge must put them only on the replicates.
		const r0 = shard(
			[
				{
					...provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
					observedSpecs: { cpuModel: "AMD EPYC 9R14" },
				},
			],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const r1 = shard(
			[
				{
					...provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [20])]),
					observedSpecs: { cpuModel: "AMD EPYC 9R45" },
				},
			],
			"2026-06-01T00:00:00.000Z",
			1,
		);
		const node = aggregateRuns([r0, r1])
			.providers.find((p) => p.providerId === "daytona-vm")
			?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(node?.hostHardwareId).toBeUndefined();
		expect(node?.replicates?.every((r) => r.hostHardwareId !== undefined)).toBe(true);
	});

	it("attributes each suite's replicate to its OWN sandbox, not another suite's same-index cell", () => {
		// A replicate index is scoped to its (suite, provider) cell, so (system, r0) and (cpu-node, r0) are
		// different sandboxes. A provider-wide index→machine map would credit one suite's samples to the
		// other suite's host — a wrong attribution that reads exactly like a right one.
		const genoa = { cpuModel: "AMD EPYC 9R14" };
		const xeon = { cpuModel: "Intel Xeon Platinum 8358" };
		const cell = (metricId: string, specs: Record<string, unknown>, index: number) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric(metricId, [900 + index])]),
						observedSpecs: specs,
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		const merged = aggregateRuns([
			cell("pybench_milliseconds", genoa, 0),
			cell("pybench_milliseconds", genoa, 1),
			cell("node_web_tooling_runs_per_s", xeon, 0),
			cell("node_web_tooling_runs_per_s", xeon, 1),
		]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona-vm");
		const hardware = daytona?.observedMixtures?.hostHardware ?? {};
		const cpuOf = (metricId: string, index: number) => {
			const id = daytona?.metrics
				.find((m) => m.metricId === metricId)
				?.replicates?.find((r) => r.index === index)?.hostHardwareId;
			return hardware[id as string]?.specs.cpuModel;
		};
		expect(cpuOf("pybench_milliseconds", 0)).toBe("AMD EPYC 9R14");
		expect(cpuOf("node_web_tooling_runs_per_s", 0)).toBe("Intel Xeon Platinum 8358");
	});

	it("seats the representative observedSpecs on the dominant machine, not the first shard's", () => {
		// The failure this replaces: first-wins resolves to shard arrival order, so run 30510718771
		// published modal-vm with a headline cpuModel of one machine out of ten its sandboxes used.
		const rare = { cpuModel: "AMD EPYC 9J45 128-Core Processor" };
		const common = { cpuModel: "Intel Xeon Platinum 8358" };
		const sandbox = (specs: Record<string, unknown>, index: number) =>
			shard(
				[
					{
						...provider("daytona-vm", [metric("pybench_milliseconds", [900 + index])]),
						observedSpecs: specs,
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		// The rare machine arrives FIRST — under first-wins it would have become the headline.
		const merged = aggregateRuns([
			sandbox(rare, 0),
			sandbox(common, 1),
			sandbox(common, 2),
			sandbox(common, 3),
		]);
		const daytona = merged.providers.find((p) => p.providerId === "daytona-vm");
		expect(daytona?.observedSpecs.cpuModel).toBe("Intel Xeon Platinum 8358");
		// Both machines stay fully disclosed; only the single-value summary moved.
		expect(Object.keys(daytona?.observedMixtures?.hostHardware ?? {})).toHaveLength(2);
	});

	it("counts a sandbox that only reported a gap — a failed sandbox is still a sandbox report", () => {
		// A create failure or a disk skip produces no metric and no spec reading, but the provider was
		// asked for that sandbox. Counting it keeps `sandboxes` the true denominator, so a category whose
		// counts sum to less than it is visibly a partial disclosure rather than a complete one.
		const withGap = shard(
			[
				{
					...provider("daytona-vm", []),
					gaps: [
						{
							scope: "suite" as const,
							id: "realworld-mastra",
							outcome: "failed" as const,
							reason: "Failed to create sandbox",
						},
					],
				},
			],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const measured = shard(
			[
				{
					...provider("daytona-vm", [metric("pybench_milliseconds", [900])]),
					observedSpecs: { cpuModel: "AMD EPYC 9R45" },
				},
			],
			"2026-06-01T00:00:00.000Z",
			1,
		);
		const mixtures = aggregateRuns([withGap, measured]).providers.find(
			(p) => p.providerId === "daytona-vm",
		)?.observedMixtures;
		expect(mixtures?.sandboxes).toBe(2);
		// Two sandboxes, but only one disclosed hardware — the shortfall is readable from the counts.
		expect(Object.values(mixtures?.hostHardware ?? {}).map((m) => m.count)).toEqual([1]);
		expect(mixtures?.hostNetwork).toEqual({});
	});

	it("unions rich host metadata across shards and removes byte-identical duplicates", () => {
		const record = {
			source: "mise/system-provider" as const,
			sourceFile: "system/system-provider.json",
			fields: [{ path: "asn", value: "AS64500" }],
		};
		const a = shard([
			{
				...provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]),
				hostMetadata: [record],
			},
		]);
		const b = shard([
			{
				...provider("daytona-vm", [metric("pybench_milliseconds", [900])]),
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
			(p) => p.providerId === "daytona-vm",
		)?.hostMetadata;
		expect(metadata).toHaveLength(2);
		expect(metadata?.map((m) => m.source)).toEqual([
			"mise/system-provider",
			"phoronix/result-file-to-json",
		]);
	});

	it("throws on a shard-identity mismatch and on empty input", () => {
		const a = shard([provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])])]);
		const b: Run = { ...a, sha: "different" };
		expect(() => aggregateRuns([a, b])).toThrow(/identity mismatch/);
		expect(() => aggregateRuns([])).toThrow(/at least one/);
	});

	it("disqualifies a provider whose specMatched fold has any mismatched shard, regardless of order", () => {
		// A verdict must ride on observations (schema narrow), as the real probe always produces.
		const matched = provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]);
		matched.observedSpecs = { vcpus: 2, memoryGb: 8 };
		matched.specMatched = true;
		const mismatched = provider("daytona-vm", [metric("pybench_milliseconds", [900])]);
		mismatched.observedSpecs = { vcpus: 1, memoryGb: 8 };
		mismatched.specMatched = false;

		// false is sticky no matter which shard arrives first.
		for (const order of [
			[shard([matched]), shard([mismatched])],
			[shard([mismatched]), shard([matched])],
		]) {
			const daytona = aggregateRuns(order).providers.find((p) => p.providerId === "daytona-vm");
			expect(daytona?.specMatched).toBe(false);
		}
	});

	it("keeps specMatched undefined when no shard observed the spec, and true when only matches did", () => {
		const noProbe = shard([provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])])]);
		expect(
			aggregateRuns([noProbe]).providers.find((p) => p.providerId === "daytona-vm")?.specMatched,
		).toBeUndefined();

		const matchOnly = provider("daytona-vm", [metric("pybench_milliseconds", [900])]);
		matchOnly.observedSpecs = { vcpus: TARGET_SPEC.vcpus, memoryGb: TARGET_SPEC.memoryGb };
		matchOnly.specMatched = true;
		expect(
			aggregateRuns([noProbe, shard([matchOnly])]).providers.find(
				(p) => p.providerId === "daytona-vm",
			)?.specMatched,
		).toBe(true);
	});
});

describe("aggregateRuns suite-shortfall gap folding", () => {
	// The normalizer's shortfall reason is byte-deterministic exactly so this (scope, id, outcome,
	// reason) fold collapses identical shortfalls across replicate shards to ONE recorded gap.
	const shortfall = (reason: string) => ({
		scope: "suite" as const,
		id: "memory" as const,
		outcome: "failed" as const,
		reason,
	});
	const reason =
		"PTS ran but every trial failed for 2 of 4 declared metrics: stream_type_add (memory/pts_stream.xml), stream_type_triad (memory/pts_stream.xml) — attempted, no value recorded";

	it("folds byte-identical shortfall gaps across replicate shards into one", () => {
		const r0 = shard(
			[{ ...provider("daytona-vm", []), gaps: [shortfall(reason)] }],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const r1 = shard(
			[{ ...provider("daytona-vm", []), gaps: [shortfall(reason)] }],
			"2026-06-01T00:00:00.000Z",
			1,
		);
		const daytona = aggregateRuns([r0, r1]).providers.find((p) => p.providerId === "daytona-vm");
		expect(daytona?.gaps).toEqual([shortfall(reason)]);
	});

	it("keeps both gaps when replicate shards report divergent shortfall reasons", () => {
		// Divergent replicates are two distinct facts (different metrics were lost in each sandbox);
		// folding them would drop whichever arrived second — accepted keep+warn behavior.
		const other =
			"PTS ran but every trial failed for 1 of 4 declared metrics: stream_type_add (memory/pts_stream.xml) — attempted, no value recorded";
		const r0 = shard(
			[{ ...provider("daytona-vm", []), gaps: [shortfall(reason)] }],
			"2026-06-01T00:00:00.000Z",
			0,
		);
		const r1 = shard(
			[{ ...provider("daytona-vm", []), gaps: [shortfall(other)] }],
			"2026-06-01T00:00:00.000Z",
			1,
		);
		const daytona = aggregateRuns([r0, r1]).providers.find((p) => p.providerId === "daytona-vm");
		expect(daytona?.gaps).toEqual([shortfall(reason), shortfall(other)]);
	});
});

describe("aggregateRuns gap-cause folding", () => {
	const gap = (cause?: GapCause) => ({
		scope: "suite" as const,
		id: "realworld-mastra" as const,
		outcome: "skipped" as const,
		reason: "Insufficient disk: 20.0 GiB free, suite needs 30 GiB",
		...(cause ? { cause } : {}),
	});
	const withGap = (cause: GapCause | undefined, index: number) =>
		shard(
			[{ ...provider("e2b", [metric("pybench_milliseconds", [900 + index])]), gaps: [gap(cause)] }],
			"2026-06-01T00:00:00.000Z",
			index,
		);
	const disk = { kind: "disk-shortfall", freeGb: 20, requiredGb: 30 } as const satisfies GapCause;

	it("keeps the classified gap when shards straddle a producer upgrade, in either order", () => {
		// `cause` is not part of the dedupe key, so plain first-wins would let shard arrival order decide
		// whether the published gap carries its classification.
		for (const order of [
			[withGap(undefined, 0), withGap(disk, 1)],
			[withGap(disk, 0), withGap(undefined, 1)],
		]) {
			const gaps = aggregateRuns(order).providers.find((p) => p.providerId === "e2b")?.gaps ?? [];
			expect(gaps).toHaveLength(1);
			expect(gaps[0]?.cause).toEqual(disk);
		}
	});
});

describe("aggregateRuns derived-metric marking", () => {
	it("marks the economics rows it re-derives, so the document says what is computed", () => {
		// The guarantee the schema deliberately does NOT enforce (a published Run's validity must not track
		// the live catalog) is pinned here instead, on the producer that owns catalog knowledge.
		const merged = aggregateRuns([
			shard([provider("daytona-vm", [metric(HARNESS_METRIC_IDS.spawn, [1000])])]),
		]);
		const metrics = merged.providers.find((p) => p.providerId === "daytona-vm")?.metrics ?? [];
		const economics = metrics.filter((m) => m.metricId.startsWith("usd_"));
		expect(economics.length).toBeGreaterThan(0);
		for (const row of economics) expect(row.derived).toBe(true);
		// And measurements stay unmarked — the marker means "computed", not "present".
		expect(metrics.find((m) => m.metricId === HARNESS_METRIC_IDS.spawn)?.derived).toBeUndefined();
	});

	it("drops a shard's stale economics row even when the catalog no longer knows the id", () => {
		// isDerivedMetric prefers the document's marker: a marked row is never re-admitted as a measurement
		// and pooled into a ranking, which a catalog-only test would do for a renamed or retired id.
		const stale = provider("daytona-vm", [metric("node_web_tooling_runs_per_s", [10])]);
		stale.metrics.push({
			metricId: "usd_per_retired_thing",
			samples: [42],
			aggregates: aggregate([42]),
			derived: true,
		});
		const merged = aggregateRuns([shard([stale])]);
		const ids =
			merged.providers.find((p) => p.providerId === "daytona-vm")?.metrics.map((m) => m.metricId) ??
			[];
		expect(ids).not.toContain("usd_per_retired_thing");
		expect(ids).toContain("node_web_tooling_runs_per_s");
	});
});

describe("aggregateRuns gap-cause determinism", () => {
	// One reason, two causes. Reachable because a reason can be lossier than its cause: the disk-shortfall
	// sentence rounds free space with toFixed(1), so 20.04 and 20.049 GiB render one identical sentence.
	const reason = "Insufficient disk: 20.0 GiB free, suite needs 30 GiB";
	const cause = (freeGb: number) =>
		({ kind: "disk-shortfall", freeGb, requiredGb: 30 }) as const satisfies GapCause;
	const withCause = (freeGb: number | undefined, index: number) =>
		shard(
			[
				{
					...provider("e2b", [metric("pybench_milliseconds", [900 + index])]),
					gaps: [
						{
							scope: "suite" as const,
							id: "realworld-mastra" as const,
							outcome: "skipped" as const,
							reason,
							...(freeGb === undefined ? {} : { cause: cause(freeGb) }),
						},
					],
				},
			],
			"2026-06-01T00:00:00.000Z",
			index,
		);

	it("resolves two different classified causes the same way in either arrival order", () => {
		// Keeping whichever arrived first would make the published freeGb depend on shard order — churn in
		// a committed dataset that a schema bump re-aggregates wholesale.
		const causeOf = (order: ReturnType<typeof withCause>[]) => {
			const gaps = aggregateRuns(order).providers.find((p) => p.providerId === "e2b")?.gaps ?? [];
			expect(gaps).toHaveLength(1);
			return gaps[0]?.cause;
		};
		const forward = causeOf([withCause(20.04, 0), withCause(20.049, 1)]);
		const reversed = causeOf([withCause(20.049, 0), withCause(20.04, 1)]);
		expect(forward).toEqual(reversed);
	});

	it("compares causes by content, not by the key order a producer wrote them in", () => {
		// The tie-break must not be re-decidable by reformatting a cause literal at its construction
		// site: `{ requiredGb, freeGb, kind }` serializes to a different string than `{ kind, freeGb,
		// requiredGb }` while describing the identical fact.
		const scrambled = (freeGb: number, index: number) =>
			shard(
				[
					{
						...provider("e2b", [metric("pybench_milliseconds", [900 + index])]),
						gaps: [
							{
								scope: "suite" as const,
								id: "realworld-mastra" as const,
								outcome: "skipped" as const,
								reason,
								cause: { requiredGb: 30, freeGb, kind: "disk-shortfall" } as GapCause,
							},
						],
					},
				],
				"2026-06-01T00:00:00.000Z",
				index,
			);
		// Same winner as the canonically-keyed pair above: the smaller freeGb, whichever literal it came in.
		for (const order of [
			[scrambled(20.04, 0), withCause(20.049, 1)],
			[withCause(20.049, 0), scrambled(20.04, 1)],
		]) {
			const gaps = aggregateRuns(order).providers.find((p) => p.providerId === "e2b")?.gaps ?? [];
			expect(gaps[0]?.cause).toEqual(cause(20.04));
		}
	});

	it("still upgrades an unclassified gap when another shard classified it, in either order", () => {
		for (const order of [
			[withCause(undefined, 0), withCause(20.04, 1)],
			[withCause(20.04, 0), withCause(undefined, 1)],
		]) {
			const gaps = aggregateRuns(order).providers.find((p) => p.providerId === "e2b")?.gaps ?? [];
			expect(gaps).toHaveLength(1);
			expect(gaps[0]?.cause).toEqual(cause(20.04));
		}
	});
});
