import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate } from "@sandbox-benchmarks/schema";
import { compareRuns, regressions } from "./stability.ts";

function metric(
	metricId: string,
	value: number,
	provenance?: { appVersion?: string; arguments?: string },
): MetricResult {
	return {
		metricId,
		samples: [value],
		aggregates: aggregate([value]),
		...(provenance?.appVersion !== undefined ? { appVersion: provenance.appVersion } : {}),
		...(provenance?.arguments !== undefined ? { arguments: provenance.arguments } : {}),
	};
}

function run(providerId: string, metrics: MetricResult[]): Run {
	const provider: ProviderRun = {
		providerId,
		validationStatus: "validated",
		observedSpecs: {},
		metrics,
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
	};
	return {
		schemaVersion: "2",
		runId: "r",
		sha: "s",
		generatedAt: "2026-06-20T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers: [provider],
	};
}

describe("compareRuns", () => {
	it("flags a HIB drop beyond threshold as a regression", () => {
		// node-web-tooling is HIB: 10 → 8 is a 20% drop.
		const shifts = compareRuns(
			run("daytona", [metric("node_web_tooling_runs_per_s", 10)]),
			run("daytona", [metric("node_web_tooling_runs_per_s", 8)]),
		);
		expect(shifts).toHaveLength(1);
		expect(shifts[0]?.classification).toBe("regression");
		expect(regressions(shifts)).toHaveLength(1);
	});

	it("treats a HIB rise as an improvement and a small move as stable", () => {
		expect(
			compareRuns(
				run("daytona", [metric("node_web_tooling_runs_per_s", 10)]),
				run("daytona", [metric("node_web_tooling_runs_per_s", 12)]),
			)[0]?.classification,
		).toBe("improvement");
		// 10 → 10.5 is 5%, within the default 10% threshold.
		expect(
			compareRuns(
				run("daytona", [metric("node_web_tooling_runs_per_s", 10)]),
				run("daytona", [metric("node_web_tooling_runs_per_s", 10.5)]),
			)[0]?.classification,
		).toBe("stable");
	});

	it("flags a LIB rise as a regression (pybench is lower-is-better)", () => {
		const shifts = compareRuns(
			run("daytona", [metric("pybench_milliseconds", 900)]),
			run("daytona", [metric("pybench_milliseconds", 1100)]),
		);
		expect(shifts[0]?.classification).toBe("regression");
	});

	it("classifies a provenance change as incomparable, never a regression", () => {
		const shifts = compareRuns(
			run("daytona", [metric("node_web_tooling_runs_per_s", 10, { appVersion: "1.0" })]),
			run("daytona", [metric("node_web_tooling_runs_per_s", 5, { appVersion: "2.0" })]),
		);
		expect(shifts[0]?.classification).toBe("incomparable");
		expect(shifts[0]?.note).toMatch(/appVersion 1.0→2.0/);
		expect(regressions(shifts)).toHaveLength(0);
	});

	it("excludes derived economics metrics from the comparison", () => {
		const shifts = compareRuns(
			run("daytona", [metric("usd_per_hour", 0.2)]),
			run("daytona", [metric("usd_per_hour", 0.9)]),
		);
		expect(shifts).toHaveLength(0);
	});

	it("reports a zero-baseline metric as incomparable, not an Infinity regression", () => {
		// Previous p50 of 0 has no ratio; the pair is surfaced but never gates.
		const shifts = compareRuns(
			run("daytona", [metric("node_web_tooling_runs_per_s", 0)]),
			run("daytona", [metric("node_web_tooling_runs_per_s", 10)]),
		);
		expect(shifts[0]?.classification).toBe("incomparable");
		expect(shifts[0]?.relativeChange).toBeNaN();
		expect(shifts[0]?.note).toMatch(/no baseline/);
		expect(regressions(shifts)).toHaveLength(0);
	});

	it("treats an unchanged zero metric as stable", () => {
		const shifts = compareRuns(
			run("daytona", [metric("node_web_tooling_runs_per_s", 0)]),
			run("daytona", [metric("node_web_tooling_runs_per_s", 0)]),
		);
		expect(shifts[0]?.classification).toBe("stable");
		expect(shifts[0]?.relativeChange).toBe(0);
	});

	it("honors a custom threshold", () => {
		// 10 → 9 is a 10% drop: stable at the default, a regression at a 5% threshold.
		const a = run("daytona", [metric("node_web_tooling_runs_per_s", 10)]);
		const b = run("daytona", [metric("node_web_tooling_runs_per_s", 9)]);
		expect(compareRuns(a, b)[0]?.classification).toBe("stable");
		expect(compareRuns(a, b, { threshold: 0.05 })[0]?.classification).toBe("regression");
	});
});
