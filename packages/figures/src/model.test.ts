import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate } from "@sandbox-benchmarks/schema";
import { buildRealworldFigureModel } from "./model.ts";

/** Synthetic registries — the model takes them as arguments precisely so these tests never
 *  depend on what the committed dataset happens to contain. */
const METRICS = [
	{ id: "realworld_demo_task_git_clone", label: "Demo: git clone" },
	{ id: "realworld_demo_task_cold_install", label: "Demo: cold install" },
];
const PROVIDERS = [
	{ id: "alpha", displayName: "Alpha" },
	{ id: "beta", displayName: "Beta" },
];
const SUITES = {
	"realworld-demo": {
		dimensions: ["realworld" as const],
		minDiskGb: 30,
		metrics: ["realworld_demo_task_git_clone", "realworld_demo_task_cold_install"],
	},
	"cpu-demo": { dimensions: ["cpu" as const], metrics: ["cpu_bench"] },
};

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(
	providerId: string,
	metrics: MetricResult[],
	over: Partial<ProviderRun> = {},
): ProviderRun {
	return {
		providerId,
		validationStatus: "validated",
		observedSpecs: {},
		metrics,
		suitesCovered: ["realworld-demo"],
		gaps: [],
		uncatalogued: [],
		...over,
	};
}

function run(providers: ProviderRun[]): Run {
	return {
		schemaVersion: "2",
		runId: "run-1",
		sha: "abc123",
		generatedAt: "2026-06-20T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers,
	};
}

const CLONE = "realworld_demo_task_git_clone";
const INSTALL = "realworld_demo_task_cold_install";

function build(providers: ProviderRun[]) {
	return buildRealworldFigureModel({
		run: run(providers),
		metrics: METRICS,
		providers: PROVIDERS,
		suites: SUITES,
	});
}

describe("buildRealworldFigureModel", () => {
	it("charts a suite two environments completed, named from its task labels", () => {
		const model = build([
			provider("alpha", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
			provider("beta", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
		]);
		expect(model.suites.map((s) => s.id)).toEqual(["realworld-demo"]);
		expect(model.suites[0]?.name).toBe("Demo");
		expect(model.suites[0]?.minDiskGb).toBe(30);
		expect(model.suites[0]?.bars.map((b) => b.provider).sort()).toEqual(["alpha", "beta"]);
	});

	it("drops a suite with fewer than two completing environments — one bar is not a comparison", () => {
		expect(build([provider("alpha", [metric(CLONE, [1, 2])])]).suites).toEqual([]);
	});

	it("does not chart an environment that ran only part of the pipeline, and discloses it", () => {
		// Summing the tasks a provider DID run would show a fast bar for an environment that
		// skipped the work. The partial provider lands under the bars with its gap's own words.
		const model = build([
			provider("alpha", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
			provider("beta", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
			provider("gamma", [metric(CLONE, [1, 1])], {
				gaps: [{ scope: "suite", id: "realworld-demo", outcome: "failed", reason: "install died" }],
			}),
		]);
		expect(model.suites[0]?.bars.length).toBe(2);
		expect(model.suites[0]?.incomplete).toEqual([
			{ provider: "gamma", outcome: "failed", reason: "install died" },
		]);
	});

	it("covers validated providers only, and carries the run's own spec verdict", () => {
		// A provider that reported nothing is `pending` — charting it would draw a data-less
		// row; disclosing the absence is the published board's job, not a figure's.
		const model = build([
			provider("alpha", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
			provider("beta", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])], {
				specMatched: false,
			}),
			provider("ghost", [], { validationStatus: "pending" }),
		]);
		expect(model.providers).toEqual([
			{ id: "alpha", name: "Alpha", specMatched: true },
			{ id: "beta", name: "Beta", specMatched: false },
		]);
	});

	it("discloses a declared task that NO environment completed instead of silently dropping it", () => {
		// The failure this guards happened in committed data: mastra's test_core failed in
		// every environment, silently left the exercised set, and the published chart showed
		// a universally-failed suite as a clean comparison. The suite still charts (the
		// remaining columns are comparable across providers) but the drop must surface.
		const SUITES_WITH_TEST = {
			"realworld-demo": {
				dimensions: ["realworld" as const],
				minDiskGb: 30,
				metrics: [CLONE, INSTALL, "realworld_demo_task_test_core"],
			},
		};
		const model = buildRealworldFigureModel({
			run: run([
				provider("alpha", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
				provider("beta", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
			]),
			metrics: [...METRICS, { id: "realworld_demo_task_test_core", label: "Demo: test core" }],
			providers: PROVIDERS,
			suites: SUITES_WITH_TEST,
		});
		expect(model.suites[0]?.tasks.length).toBe(2);
		expect(model.suites[0]?.droppedTasks).toEqual(["test core"]);
	});

	it("totals a bar as the sum of its task medians, in canonical task order", () => {
		const model = build([
			provider("alpha", [metric(CLONE, [2, 2]), metric(INSTALL, [40, 40])]),
			provider("beta", [metric(CLONE, [4, 4]), metric(INSTALL, [60, 60])]),
		]);
		const alpha = model.suites[0]?.bars.find((b) => b.provider === "alpha");
		expect(alpha?.segments.map((s) => s.id)).toEqual([CLONE, INSTALL]);
		expect(alpha?.totalS).toBe(42);
	});
});
