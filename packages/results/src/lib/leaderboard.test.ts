import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, ECONOMICS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { buildLeaderboard, renderLeaderboardMarkdown } from "./leaderboard.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(providerId: string, metrics: MetricResult[]): ProviderRun {
	return {
		providerId,
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		skips: [],
		uncatalogued: [],
	};
}

function run(providers: ProviderRun[]): Run {
	return {
		schemaVersion: "1",
		runId: "run-1",
		sha: "abc123",
		generatedAt: "2026-06-20T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 20 },
		providers,
	};
}

describe("buildLeaderboard", () => {
	it("ranks the cpu headline HIB (highest first) and includes only providers with the metric", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
				provider("e2b", [metric("node_web_tooling_runs_per_s", [12])]),
				provider("modal", []), // no metric → excluded from the row set
			]),
		);
		const cpu = board.dimensions.find((d) => d.dimension === "cpu");
		expect(cpu?.metric.id).toBe("node_web_tooling_runs_per_s");
		// HIB: e2b (12) outranks daytona (10); modal absent.
		expect(cpu?.rows.map((r) => [r.rank, r.providerId, r.value])).toEqual([
			[1, "e2b", 12],
			[2, "daytona", 10],
		]);
	});

	it("ranks an economics (LIB) dimension cheapest-first and uses display names", () => {
		const board = buildLeaderboard(
			run([
				provider("modal", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.37])]),
				provider("e2b", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.23])]),
			]),
		);
		const econ = board.dimensions.find((d) => d.dimension === "economics");
		// LIB: cheapest first.
		expect(econ?.rows.map((r) => r.providerId)).toEqual(["e2b", "modal"]);
		expect(econ?.rows[0]?.displayName).toBe("E2B"); // resolved from the provider registry
	});

	it("omits dimensions with no headline value and renders Markdown tables", () => {
		const board = buildLeaderboard(
			run([provider("daytona", [metric("node_web_tooling_runs_per_s", [10])])]),
		);
		// Only cpu is populated; disk/memory/etc. are absent.
		expect(board.dimensions.map((d) => d.dimension)).toEqual(["cpu"]);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("## cpu");
		expect(md).toContain("Node.js web tooling");
		expect(md).toContain("higher is better");
		expect(md).toMatch(/\| 1 \| Daytona \| 10 \|/);
	});

	it("breaks ties on equal headline values deterministically by providerId", () => {
		// Input order is modal-then-daytona; equal values must reorder to alphabetical providerId.
		const board = buildLeaderboard(
			run([
				provider("modal", [metric("node_web_tooling_runs_per_s", [10])]),
				provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
			]),
		);
		const cpu = board.dimensions.find((d) => d.dimension === "cpu");
		expect(cpu?.rows.map((r) => r.providerId)).toEqual(["daytona", "modal"]);
		expect(cpu?.rows.map((r) => r.rank)).toEqual([1, 2]);
	});

	it("renders a placeholder when nothing is ranked", () => {
		const md = renderLeaderboardMarkdown(buildLeaderboard(run([provider("daytona", [])])));
		expect(md).toContain("No ranked dimensions yet");
	});
});
