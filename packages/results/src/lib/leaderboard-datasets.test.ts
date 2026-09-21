import { describe, expect, it } from "bun:test";
import type { Run } from "@sandbox-benchmarks/schema";
import { aggregate } from "@sandbox-benchmarks/schema";
import { datasetImpact } from "./dataset-impact.ts";
import { buildLeaderboard, renderLeaderboardMarkdown } from "./leaderboard.ts";
import { combineLeaderboardDatasets } from "./leaderboard-datasets.ts";

const id = "node_web_tooling_runs_per_s";
const options = { cohortReview: "Controlled fixture with identical measurement settings" };
function run(runId: string, clusters: number[][]): Run {
	const samples = clusters.flat();
	return {
		schemaVersion: "3",
		runId,
		sha: "test",
		generatedAt: "2026-09-14T00:00:00.000Z",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		providers: [
			{
				providerId: "e2b",
				validationStatus: "validated",
				observedSpecs: {},
				suitesCovered: ["cpu-node"],
				gaps: [],
				uncatalogued: [],
				metrics: [
					{
						metricId: id,
						samples,
						aggregates: aggregate(samples),
						sourceFile: "cpu-node/pts.xml",
						appVersion: "1",
						arguments: "fixed",
						...(clusters.length > 1
							? { replicates: clusters.map((samples, index) => ({ samples, index })) }
							: {}),
					},
				],
			},
		],
	};
}
const row = (input: Parameters<typeof buildLeaderboard>[0]) =>
	buildLeaderboard(input).dimensions[0]?.rows[0];
describe("combineLeaderboardDatasets", () => {
	it("preserves clusters rather than weighting sandboxes by their trial count", () => {
		const a = run("a", [Array(50).fill(0), [100], [100]]);
		const b = run("b", [[200], [200], [200]]);
		const original = JSON.stringify([a, b]);
		const combined = combineLeaderboardDatasets([a, b], options);
		expect(row(combined)?.value).toBe(150);
		expect(row(combined)?.sandboxes).toBe(6);
		expect(combined.providers[0]?.metrics[0]?.aggregates.p50).toBe(0);
		expect(combined.providers[0]?.metrics[0]?.replicates?.map((r) => r.index)).toEqual([
			0, 1, 2, 3, 4, 5,
		]);
		expect(combined.cells?.map((c) => [c.runId, c.replicateIndex])).toEqual([
			["a", 0],
			["a", 1],
			["a", 2],
			["b", 0],
			["b", 1],
			["b", 2],
		]);
		expect(JSON.stringify([a, b])).toBe(original);
	});
	it("deduplicates identical datasets, rejects conflicting copies, and is order independent", () => {
		const a = run("a", [[1], [2], [3]]),
			b = run("b", [[4], [5], [6]]);
		expect(combineLeaderboardDatasets([b, a, a], options)).toEqual(
			combineLeaderboardDatasets([a, b], options),
		);
		expect(() => combineLeaderboardDatasets([a, run("a", [[9]])], options)).toThrow(
			"Conflicting dataset",
		);
		expect(buildLeaderboard([a, b], options)).toEqual(
			buildLeaderboard(combineLeaderboardDatasets([a, b], options)),
		);
	});
	it("rejects an overlapping historical dataset union", () => {
		expect(() => combineLeaderboardDatasets([run("a+b", [[1]]), run("a", [[2]])], options)).toThrow(
			"Overlapping source run",
		);
	});

	it("rejects several inputs that all name one run, while distinct repeats stay idempotent", () => {
		// Otherwise this returns the single-input arm: a PUBLISHED board for a request to pool, with no
		// pooling notes and nothing saying a source was dropped. Identity is only knowable here.
		const a = run("a", [[1]]);
		expect(() => combineLeaderboardDatasets([a, a], options)).toThrow("all name Run a");
		expect(() => combineLeaderboardDatasets([a, structuredClone(a)], options)).toThrow(
			"all name Run a",
		);
		expect(combineLeaderboardDatasets([a], options)).toEqual(a);
	});

	it("requires explicit cohort review and rejects hard measurement mismatches even with review", () => {
		const a = run("a", [[1]]),
			b = run("b", [[2]]);
		expect(() => combineLeaderboardDatasets([a, b])).toThrow("cohort");
		b.targetSpec.memoryGb = 16;
		expect(() => combineLeaderboardDatasets([a, b], options)).toThrow("resource targets");
		b.targetSpec.memoryGb = 8;
		const metric = b.providers[0]?.metrics[0];
		if (!metric) throw new Error("fixture");
		metric.arguments = "different";
		expect(() => combineLeaderboardDatasets([a, b], options)).toThrow("Incompatible measurement");
	});
	it("preserves single-run output and does not change uncertainty for a missing addition", () => {
		const a = run("a", [[1, 2, 4]]),
			b = run("b", [[3]]);
		b.providers = [];
		expect(buildLeaderboard([a])).toEqual(buildLeaderboard(a));
		expect(row(combineLeaderboardDatasets([a, b], options))).toEqual(row(a));
		const impact = datasetImpact(a, [b], options);
		expect(impact.summary.unchanged).toBe(1);
	});
	it("does not label a combined view as a new completed experiment", () => {
		const combined = combineLeaderboardDatasets([run("a", [[1]]), run("b", [[2]])], options);
		expect(combined.experiment).toBeUndefined();
		const markdown = renderLeaderboardMarkdown(buildLeaderboard(combined), []);
		expect(markdown).toContain("not a new published experiment");
		expect(markdown).toContain("Source `a`");
		expect(markdown).toContain("Source `b`");
	});
	it("can widen an interval when an added run shifts, rather than promising automatic precision", () => {
		const impact = datasetImpact(
			run("a", [[10], [10], [10]]),
			[run("b", [[100], [100], [100]])],
			options,
		);
		expect(impact.metrics[0]?.combined.value).toBe(55);
		expect(impact.metrics[0]?.intervalChange).toBe("wider");
		expect(impact.metrics[0]?.widthChangePercent).toBeNull();
	});
	it("rejects reused attempts and physical sandboxes across distinct datasets", () => {
		const a = run("a", [[1]]),
			b = run("b", [[2]]);
		for (const source of [a, b]) {
			source.schemaVersion = "7";
			source.experiment = {
				planDigest: `sha256:${"a".repeat(64)}`,
				cohortDigest: `sha256:${"b".repeat(64)}`,
				attemptIds: ["same-attempt"],
			};
			for (const provider of source.providers) {
				provider.costEvidence = [];
				provider.artifactEvidence = [
					{
						cell: { runId: source.runId, providerId: "e2b", suite: "cpu-node", replicateIndex: 0 },
						sandboxId: source.runId,
						provenance: {
							source: "request-fallback",
							requested: { kind: "baked", ref: "fixture-template" },
						},
					},
				];
			}
		}
		expect(() => combineLeaderboardDatasets([a, b])).toThrow("Overlapping attempt");
		if (!b.experiment) throw new Error("fixture");
		b.experiment.attemptIds = ["other-attempt"];
		for (const source of [a, b]) {
			const provider = source.providers[0];
			if (!provider) throw new Error("fixture");
			provider.artifactEvidence = [
				{
					cell: { runId: source.runId, providerId: "e2b", suite: "cpu-node", replicateIndex: 0 },
					sandboxId: "same-sandbox",
					provenance: {
						source: "request-fallback",
						requested: { kind: "baked", ref: "fixture-template" },
					},
				},
			];
		}
		expect(() => combineLeaderboardDatasets([a, b])).toThrow("Reused sandbox");
	});

	it("keeps the latest hourly price as one observation instead of bootstrapping prices", () => {
		const a = run("a", [[1]]),
			b = run("b", [[2]]);
		for (const [index, source] of [a, b].entries()) {
			source.schemaVersion = "4";
			source.providers[0]?.metrics.push({
				metricId: "usd_per_hour",
				derived: true,
				samples: [index + 1],
				aggregates: aggregate([index + 1]),
			});
		}
		const price = combineLeaderboardDatasets([b, a], options).providers[0]?.metrics.find(
			(m) => m.metricId === "usd_per_hour",
		);
		expect(price?.samples).toEqual([2]);
		expect(price?.replicates).toBeUndefined();
	});
});

describe("combineLeaderboardDatasets — provisioning", () => {
	/** A v4 Run whose single provider carries mixtures plus a provisioning tally. */
	function runWithProvisioning(
		runId: string,
		provisioning: NonNullable<
			NonNullable<Run["providers"][number]["observedMixtures"]>["provisioning"]
		>,
		sandboxes: number,
	): Run {
		const base = run(runId, [[10, 11]]);
		const provider = base.providers[0];
		if (provider) {
			(provider as Record<string, unknown>).observedMixtures = {
				sandboxes,
				hostHardware: { aaaaaaaaaaaaaaaa: { count: sandboxes, specs: { cpuModel: "EPYC" } } },
				hostNetwork: {},
				provisioning,
			};
		}
		return { ...base, schemaVersion: "4" };
	}

	it("adds the sandbox counts of the pooled runs", () => {
		const combined = combineLeaderboardDatasets(
			[
				runWithProvisioning("run-p1", { preBooted: 2, bootOnCreate: 1, indeterminate: 0 }, 3),
				runWithProvisioning("run-p2", { preBooted: 1, bootOnCreate: 0, indeterminate: 2 }, 3),
			],
			options,
		);
		expect(combined.providers[0]?.observedMixtures?.provisioning).toEqual({
			preBooted: 3,
			bootOnCreate: 1,
			indeterminate: 2,
		});
	});

	it("drops the median rather than averaging medians across runs", () => {
		// A median of medians is not a median, and the per-sandbox margins it would need were discarded by
		// aggregation. Absent reads as "not available at this grain", which is exactly true.
		const combined = combineLeaderboardDatasets(
			[
				runWithProvisioning(
					"run-p1",
					{ preBooted: 2, bootOnCreate: 0, indeterminate: 0, medianPreBootedByS: 100 },
					2,
				),
				runWithProvisioning(
					"run-p2",
					{ preBooted: 2, bootOnCreate: 0, indeterminate: 0, medianPreBootedByS: 900 },
					2,
				),
			],
			options,
		);
		expect(
			combined.providers[0]?.observedMixtures?.provisioning?.medianPreBootedByS,
		).toBeUndefined();
	});

	it("sums boot-id counters in the direction that can only under-report reuse", () => {
		// Summing distinct ids double-counts a machine that appeared in both runs, which can only CLOSE
		// the distinct<disclosing gap that signals reuse — never open one that was not there.
		const combined = combineLeaderboardDatasets(
			[
				runWithProvisioning(
					"run-p1",
					{
						preBooted: 2,
						bootOnCreate: 0,
						indeterminate: 0,
						bootIdSandboxes: 2,
						distinctBootIds: 1,
					},
					2,
				),
				runWithProvisioning(
					"run-p2",
					{
						preBooted: 2,
						bootOnCreate: 0,
						indeterminate: 0,
						bootIdSandboxes: 2,
						distinctBootIds: 2,
					},
					2,
				),
			],
			options,
		);
		expect(combined.providers[0]?.observedMixtures?.provisioning).toMatchObject({
			bootIdSandboxes: 4,
			distinctBootIds: 3,
		});
	});

	it("leaves the pooled mixtures without a tally when no run recorded one", () => {
		// Pooling Runs from before the probe existed must not manufacture a tally of zeros, which would
		// read as "checked, nothing pooled".
		const withoutTally = (runId: string): Run => {
			const base = run(runId, [[10, 11]]);
			const provider = base.providers[0];
			if (provider) {
				(provider as Record<string, unknown>).observedMixtures = {
					sandboxes: 1,
					hostHardware: { aaaaaaaaaaaaaaaa: { count: 1, specs: { cpuModel: "EPYC" } } },
					hostNetwork: {},
				};
			}
			return { ...base, schemaVersion: "4" };
		};
		const combined = combineLeaderboardDatasets(
			[withoutTally("run-p1"), withoutTally("run-p2")],
			options,
		);
		expect(combined.providers[0]?.observedMixtures?.hostHardware).toBeDefined();
		expect(combined.providers[0]?.observedMixtures?.provisioning).toBeUndefined();
	});
});
