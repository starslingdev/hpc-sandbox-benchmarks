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

	it("orders equal headline values deterministically by providerId and shares their rank", () => {
		// Input order is modal-then-daytona; equal values must reorder to alphabetical providerId AND
		// share a rank — an exact tie is not a ranking win for whoever sorts first.
		const board = buildLeaderboard(
			run([
				provider("modal", [metric("node_web_tooling_runs_per_s", [10])]),
				provider("daytona", [metric("node_web_tooling_runs_per_s", [10])]),
			]),
		);
		const cpu = board.dimensions.find((d) => d.dimension === "cpu");
		expect(cpu?.rows.map((r) => r.providerId)).toEqual(["daytona", "modal"]);
		expect(cpu?.rows.map((r) => r.rank)).toEqual([1, 1]);
	});

	it("renders a placeholder when nothing is ranked", () => {
		const md = renderLeaderboardMarkdown(buildLeaderboard(run([provider("daytona", [])])));
		expect(md).toContain("No ranked dimensions yet");
	});
});

describe("buildLeaderboard statistical ranking", () => {
	// Real Samples from a live `memory` smoke run: modal's noisy gVisor STREAM Copy trials vs daytona's.
	const MODAL_COPY = [10127, 34120, 9719, 59952, 29815];
	const DAYTONA_COPY = [66500, 66510, 66495, 66505, 66502];
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("attaches a bootstrapped interval that is wider for the noisier provider", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, DAYTONA_COPY)]),
				provider("modal", [metric(HEADLINE, MODAL_COPY)]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		const daytona = rows.find((r) => r.providerId === "daytona");
		const modal = rows.find((r) => r.providerId === "modal");

		expect(daytona?.interval.level).toBe(0.95);
		expect(daytona?.interval.resamples).toBeGreaterThan(0);
		expect(daytona?.n).toBe(5);
		// The interval must expose modal's instability rather than hide it behind a median.
		const width = (r?: (typeof rows)[number]) => (r ? r.interval.hi - r.interval.lo : 0);
		expect(width(modal)).toBeGreaterThan(width(daytona));
	});

	it("is deterministic: the same Run yields byte-identical markdown", () => {
		const build = () =>
			renderLeaderboardMarkdown(
				buildLeaderboard(
					run([
						provider("daytona", [metric(HEADLINE, DAYTONA_COPY)]),
						provider("modal", [metric(HEADLINE, MODAL_COPY)]),
					]),
				),
			);
		expect(build()).toBe(build());
	});

	it("separates providers whose distributions genuinely differ", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, DAYTONA_COPY)]),
				provider("modal", [metric(HEADLINE, MODAL_COPY)]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.providerId])).toEqual([
			[1, "daytona"],
			[2, "modal"],
		]);
		const modal = rows[1];
		expect(modal?.separated).toBe(true);
		expect(modal?.pVsPrevious?.mannWhitney).toBeLessThan(0.05);
		expect(modal?.pVsPrevious?.ks).toBeLessThan(0.05);
	});

	it("SHARES a rank when the difference is environmental noise, not a faster provider", () => {
		// Overlapping distributions: e2b's median edges daytona's, but the samples interleave. Ranking on
		// p50 alone would crown e2b; the U test refuses to.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
				provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		// e2b sorts first on the median, but cannot be separated → both hold rank 1.
		expect(rows.map((r) => r.rank)).toEqual([1, 1]);
		expect(rows[1]?.separated).toBe(false);
		expect(rows[1]?.pVsPrevious?.mannWhitney).toBeGreaterThan(0.05);
	});

	it("leaves a single-Sample Metric untested and ranked on its exact value", () => {
		// `usd_per_hour` is a published price, not a trial: one Sample, no distribution to test. Ranking
		// must NOT collapse every provider into a tie just because n=1 can never reach significance.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
				provider("modal", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.providerId])).toEqual([
			[1, "modal"],
			[2, "daytona"],
		]);
		expect(rows[1]?.separated).toBeNull();
		expect(rows[1]?.pVsPrevious).toBeNull();
		expect(rows[0]?.interval.resamples).toBe(0);
	});

	it("SHARES a rank between single-Sample Metrics with exactly equal values", () => {
		// Two providers publishing the same price are a genuine tie: they must share a rank rather
		// than being split by the providerId sort tie-break alone.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
				provider("modal", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => r.rank)).toEqual([1, 1]);
	});
});

describe("renderLeaderboardMarkdown statistics", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("renders CI, n and the p-value, and marks a statistical tie", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
					provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
				]),
			),
		);
		expect(md).toContain("95% CI");
		expect(md).toContain("p vs. above");
		expect(md).toContain("(tied)");
		// The reader must be told what a shared rank means, not left to infer it.
		expect(md).toContain("statistically indistinguishable");
		expect(md).toContain("Mann-Whitney");
	});

	it("renders a point value with no interval for a single-Sample Metric", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("daytona", [metric(HEADLINE, [10])])])),
		);
		// n=1 → em-dash for both CI and p, never a fabricated bound.
		expect(md).toMatch(/\| 1 \| Daytona \| 10 \| — \| 1 \| — \|/);
	});

	it("never prints a p-value as a misleading 0", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [1, 2, 3, 4, 5, 6, 7, 8])]),
					provider("modal", [metric(HEADLINE, [90, 91, 92, 93, 94, 95, 96, 97])]),
				]),
			),
		);
		expect(md).toContain("<0.001");
	});
});
