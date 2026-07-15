import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, ECONOMICS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import { buildLeaderboard, renderLeaderboardMarkdown } from "./leaderboard.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(
	providerId: string,
	metrics: MetricResult[],
	gaps: ProviderRun["gaps"] = [],
	suitesCovered: ProviderRun["suitesCovered"] = [],
): ProviderRun {
	return {
		providerId,
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		suitesCovered,
		gaps,
		uncatalogued: [],
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
		expect(modal?.verdict).toBe("separated");
		expect(modal?.tiedWithAbove).toBeNull();
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
		// e2b sorts first on the median, but cannot be separated → both hold rank 1, on the test's verdict.
		expect(rows.map((r) => r.rank)).toEqual([1, 1]);
		expect(rows[1]?.verdict).toBe("tied");
		expect(rows[1]?.tiedWithAbove).toBe("statistical");
		expect(rows[1]?.pVsPrevious?.mannWhitney).toBeGreaterThan(0.05);
		// Takeaway must not claim a sole provider when the top cohort is a statistical tie.
		expect(renderLeaderboardMarkdown(board)).toContain("share the top on this headline");
		expect(renderLeaderboardMarkdown(board)).not.toContain("is the only ranked provider");
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
		expect(rows[1]?.verdict).toBe("untested");
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

	it("renders CI, n and a Note for a statistical tie", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
					provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
				]),
			),
		);
		expect(md).toContain("95% CI");
		expect(md).toContain("| Note |");
		expect(md).toContain("| tied |");
		// The reader must be told what a shared rank means, not left to infer it.
		expect(md).toContain("statistically indistinguishable");
		expect(md).toContain("Mann-Whitney");
	});

	it("surfaces the KS p-value in the details section, not only on the row object", () => {
		// Regression: `ks` was computed and stored on every LeaderboardRow, documented as the way to spot
		// a bimodal provider, and then never rendered — so no reader of LEADERBOARD.md could ever see it.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 12, 11, 13, 9])]),
				provider("e2b", [metric(HEADLINE, [11, 12, 10, 14, 13])]),
			]),
		);
		const md = renderLeaderboardMarkdown(board);

		expect(md).toContain("p (KS)");
		expect(md).toContain("Kolmogorov-Smirnov");

		expect(board.dimensions[0]?.rows[1]?.pVsPrevious).not.toBeNull();

		// Main ranking table stays slim (Note column because of the tie); KS lives in the details table.
		const mainRows = md.split("\n").filter((l) => /^\| \d+ \| (Daytona|E2B) \|/.test(l));
		expect(mainRows).toHaveLength(2);
		for (const row of mainRows) {
			expect(row.split("|").filter((c) => c.trim() !== "").length).toBe(6);
		}

		const detailRows = md.split("\n").filter((l) => /^\| cpu \| (Daytona|E2B) \|/.test(l));
		expect(detailRows).toHaveLength(2);
		const [first, second] = detailRows as [string, string];
		expect(first).toContain("| — |");
		const secondKs = second.trimEnd().split("|").at(-2)?.trim() as string;
		expect(secondKs).not.toBe("—");
		expect(secondKs).toMatch(/^(<0\.001|\d+(\.\d+)?(e[+-]?\d+)?)$/);
	});

	it("renders a point value with no interval for a single-Sample Metric", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("daytona", [metric(HEADLINE, [10])])])),
		);
		// n=1 → em-dash for the CI; no Note column when nothing needs calling out.
		expect(md).toMatch(/\| 1 \| Daytona \| 10 \| — \| 1 \|\n/);
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

describe("underpowered comparisons", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("does not claim a tie when the sample sizes make the test structurally powerless", () => {
		// 3 v 3, completely separated and 2x apart: Mann-Whitney's best attainable p (0.1) is already above
		// α, so the old code grouped these at rank 1 — reporting the trial count as a finding about the
		// providers. Rank on value, return the `underpowered` verdict, and say so in the cell.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [19.63, 19.72, 19.96])]),
				provider("modal", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.displayName, r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			["Daytona", 1, null, null],
			["Modal", 2, "underpowered", null],
		]);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain("n too small");
		expect(md).not.toMatch(/\| tied \|/);
		expect(md).not.toContain("(tied)");
	});

	it("quotes each underpowered row's own floor, not one recomputed from its sample sizes", () => {
		// A 4-v-3 comparison is still underpowered, but floors at 2/C(7,4) ≈ 0.057, not 3 v 3's 0.1. The
		// footer must quote the shape the table actually contains, or it explains a number no row has.
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [19.6, 19.7, 19.9, 20.1])]),
					provider("modal", [metric(HEADLINE, [9.5, 9.6, 9.8])]),
				]),
			),
		);
		expect(md).toContain("(here 4 v 3 floors at p ≈ 0.057)");
		expect(md).not.toContain("0.1)");
	});

	it("omits the n-too-small explanation entirely when no comparison was underpowered", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [10, 11, 12, 13, 14])]),
					provider("modal", [metric(HEADLINE, [1, 2, 3, 4, 5])]),
				]),
			),
		);
		expect(md).not.toContain("n too small");
		expect(md).not.toContain("floors at p");
	});

	it("SHARES a rank between underpowered rows whose medians are exactly equal — on the VALUE, not a tie", () => {
		// Ranking on the value cannot split rows that HAVE the same value: an underpowered comparison must
		// not let the providerId sort tie-break decide who is faster. But the shared rank is the equality
		// speaking, not the test — so the row records WHY it shares it, and the cell says so. The footer
		// used to flatly assert underpowered rows are "not claimed to be tied" while this branch quietly
		// gave them the same rank; now the two agree because the basis is a field, not a footnote.
		const board = buildLeaderboard(
			run([
				provider("modal", [metric(HEADLINE, [9, 10, 11])]),
				provider("daytona", [metric(HEADLINE, [8, 10, 12])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.providerId, r.value, r.rank])).toEqual([
			["daytona", 10, 1],
			["modal", 10, 1],
		]);
		expect(rows[1]?.verdict).toBe("underpowered");
		expect(rows[1]?.tiedWithAbove).toBe("identical-value");
		const md = renderLeaderboardMarkdown(board);
		// The cell distinguishes the two reasons the rank is shared; it never reads as a statistical tie.
		expect(md).toContain("n too small, equal medians");
		expect(md).not.toMatch(/\| tied \|/);
		expect(md).not.toContain("(tied)");
	});

	it("marks a shared rank between untested (n<2) rows with equal values as equal, not tied", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
				provider("modal", [metric(ECONOMICS_METRIC_IDS.usdPerHour, [0.2])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "economics")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			[1, null, null],
			[1, "untested", "identical-value"],
		]);
		expect(renderLeaderboardMarkdown(board)).toContain("equal values");
	});

	it("never marks a row `tied` unless the test could have separated it", () => {
		// The invariant behind the whole fix: `tied` is a verdict, and a verdict requires the power to have
		// reached the opposite one. An underpowered comparison may share a rank, but never on that basis.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [19.63, 19.72, 19.96])]),
				provider("modal", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
				provider("e2b", [metric(HEADLINE, [9.79, 9.52, 9.59])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		for (const row of rows) {
			if (row.verdict === "underpowered") expect(row.tiedWithAbove).not.toBe("statistical");
			if (row.tiedWithAbove === "statistical") expect(row.verdict).toBe("tied");
		}
	});

	it("still groups a genuine statistical tie when the test HAD the power to separate", () => {
		// 8 v 8 near-identical samples: the test could have separated them (its floor is well under α) and
		// did not, so this is a real tie and the rows must share a rank — the underpowered guard must not
		// swallow the tie case it sits next to.
		const near = [10, 10.1, 9.9, 10.2, 9.8, 10.05, 9.95, 10.15];
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, near)]),
				provider("modal", [
					metric(
						HEADLINE,
						near.map((v) => v - 0.01),
					),
				]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows.map((r) => [r.rank, r.verdict, r.tiedWithAbove])).toEqual([
			[1, null, null],
			[1, "tied", "statistical"],
		]);
		expect(renderLeaderboardMarkdown(board)).toContain("| tied |");
	});

	it("does not let the tie-corrected approximation crown a provider the exact test cannot separate", () => {
		// The reported bug, end to end: mannWhitneyU([1,1,1],[2,2,2]) returned p = 0.047 under the normal
		// approximation — below α, and below the 0.081 that was claimed as the 3-v-3 floor. Had the guard
		// not (accidentally) blocked it first, that p would have SEPARATED these two providers on evidence
		// the permutation null cannot produce. Exactly: p = 0.1, and 3 v 3 stays untestable.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [2, 2, 2])]),
				provider("modal", [metric(HEADLINE, [1, 1, 1])]),
			]),
		);
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.rows ?? [];
		expect(rows[1]?.pVsPrevious?.mannWhitney).toBeCloseTo(0.1, 12);
		expect(rows[1]?.pVsPrevious?.floor).toBeCloseTo(0.1, 12);
		expect(rows[1]?.verdict).toBe("underpowered");
		expect(rows[1]?.verdict).not.toBe("separated");
	});
});

describe("coverage gaps", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";
	const diskSkip = (needed: number): ProviderRun["gaps"][number] => ({
		scope: "suite",
		id: "realworld-mastra",
		outcome: "skipped",
		reason: `Insufficient disk: 16.7 GiB free, suite needs ${needed} GiB`,
	});

	it("collects each skip, flags disk gaps, and orders disk-first then by provider/suite", () => {
		const board = buildLeaderboard(
			run([
				// daytona covers both exercised suites, so its only absence is the one e2b records — no
				// derived `missing` gap enters the ordering under test.
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "realworld-mastra"]),
				provider(
					"e2b",
					[],
					[
						{
							scope: "suite",
							id: "cpu-node",
							outcome: "skipped",
							reason: "Missing credentials: E2B_API_KEY",
						},
						diskSkip(30),
					],
				),
			]),
		);
		expect(board.coverageGaps).toEqual([
			// disk gap first, marked disk:true, carrying the verbatim free-vs-needed reason
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "realworld-mastra",
				outcome: "skipped",
				reason: "Insufficient disk: 16.7 GiB free, suite needs 30 GiB",
				disk: true,
			},
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "cpu-node",
				outcome: "skipped",
				reason: "Missing credentials: E2B_API_KEY",
				disk: false,
			},
		]);
	});

	it("renders a Coverage gaps section that marks disk gaps ❌ and reads as a failure, not a tie", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [10, 11])], [], ["realworld-mastra"]),
					provider("e2b", [], [diskSkip(30)]),
				]),
			),
		);
		expect(md).toContain("## Coverage gaps");
		expect(md).toContain("failing to cover");
		// The disk row is marked and carries the free-vs-needed detail.
		expect(md).toContain(
			"| E2B | realworld-mastra | ❌ **disk** (skipped) | Insufficient disk: 16.7 GiB free, suite needs 30 GiB |",
		);
		// The disk explanation (platform-fixed providers can't close the gap) only appears with a disk gap.
		expect(md).toContain("could not supply the disk the suite needs");
	});

	it("renders coverage gaps even when no dimension ranked (all-skipped run)", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("e2b", [], [diskSkip(30)])])),
		);
		expect(md).toContain("_No ranked dimensions yet");
		expect(md).toContain("## Coverage gaps");
		expect(md).toContain("realworld-mastra");
	});

	it("omits the section and the disk note entirely when nothing was skipped", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(run([provider("daytona", [metric(HEADLINE, [10, 11])])])),
		);
		expect(md).not.toContain("## Coverage gaps");
		expect(md).not.toContain("❌");
	});

	it("escapes pipes and newlines in the verbatim gap reason so the table stays intact", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider(
						"e2b",
						[],
						[
							{
								scope: "suite",
								id: "cpu-node",
								outcome: "failed",
								reason: "exit 1 | killed\nsee step log",
							},
						],
					),
				]),
			),
		);
		expect(md).toContain("| E2B | cpu-node | **failed** | exit 1 \\| killed see step log |");
	});
});

describe("coverage gaps: the holes nobody recorded", () => {
	const HEADLINE = "node_web_tooling_runs_per_s";

	it("derives a `missing` gap for a suite that ran elsewhere but never reported here", () => {
		// The case the whole derivation exists for, and the one that was previously invisible: e2b produced
		// no result AND left no marker, so it appears in no ranked table (no value) and in no recorded gap
		// (no marker). Without deriving it, a provider that contributed nothing to the run reads as absent
		// from the comparison rather than as failing to cover it.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "disk"]),
				provider("e2b", []),
			]),
		);
		expect(board.coverageGaps).toEqual([
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "cpu-node",
				outcome: "missing",
				reason: "No result and no marker — the suite never reported for this provider.",
				disk: false,
			},
			{
				providerId: "e2b",
				displayName: "E2B",
				scope: "suite",
				id: "disk",
				outcome: "missing",
				reason: "No result and no marker — the suite never reported for this provider.",
				disk: false,
			},
		]);
	});

	it("never accuses a provider of missing a suite this run never exercised anywhere", () => {
		// The denominator is the run's OWN evidence, not the suite registry. A run that only ever ran
		// cpu-node has not "failed to cover" the other five suites, and reporting five phantom holes per
		// provider would bury the real ones in noise the reader has to learn to ignore.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider("e2b", [metric(HEADLINE, [12, 13])], [], ["cpu-node"]),
			]),
		);
		expect(board.coverageGaps).toEqual([]);
	});

	it("does not derive a gap for a suite the provider actually covered", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider("e2b", [metric(HEADLINE, [12, 13])], [], ["cpu-node", "disk"]),
			]),
		);
		// daytona is missing `disk` (e2b ran it), but NOT `cpu-node`, which it covered.
		expect(board.coverageGaps.map((g) => `${g.providerId}/${g.id}/${g.outcome}`)).toEqual([
			"daytona/disk/missing",
		]);
	});

	it("does not derive a `missing` gap on top of a recorded one — a marker accounts for the suite", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
				provider(
					"e2b",
					[],
					[{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "PTS died" }],
				),
			]),
		);
		// One row, not two: the failure marker already explains cpu-node's absence on e2b.
		expect(board.coverageGaps).toHaveLength(1);
		expect(board.coverageGaps[0]).toMatchObject({ id: "cpu-node", outcome: "failed" });
	});

	it("never flags a FAILED gap as a ❌ disk gap, however its error message begins", () => {
		// ❌ disk means "the provider cannot host this workload at all" — a precondition checked BEFORE the
		// suite ran. A failure's reason is an error message, and one that happens to start with the same
		// words is the workload running out of space mid-flight: a different fact, and not a structural one.
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["realworld-mastra"]),
				provider(
					"e2b",
					[],
					[
						{
							scope: "suite",
							id: "realworld-mastra",
							outcome: "failed",
							reason: "Insufficient disk space while extracting node_modules",
						},
					],
				),
			]),
		);
		expect(board.coverageGaps[0]).toMatchObject({ outcome: "failed", disk: false });
		const md = renderLeaderboardMarkdown(board);
		expect(md).not.toContain("❌");
		expect(md).toContain("| E2B | realworld-mastra | **failed** |");
	});

	it("renders an operation-scoped gap as a lifecycle op, not as a suite", () => {
		const board = buildLeaderboard(
			run([
				provider(
					"daytona",
					[metric(HEADLINE, [10, 11])],
					[
						{
							scope: "operation",
							id: "lifecycle_snapshot_ms",
							outcome: "skipped",
							reason: "provider SDK exposes no snapshot operation",
						},
					],
					["cpu-node"],
				),
			]),
		);
		const md = renderLeaderboardMarkdown(board);
		expect(md).toContain(
			"| Daytona | lifecycle_snapshot_ms _(lifecycle op)_ | **skipped** | provider SDK exposes no snapshot operation |",
		);
		// An operation is not a suite, so it must never enter the missing-suite denominator.
		expect(board.coverageGaps.every((g) => g.outcome !== "missing")).toBe(true);
	});

	it("explains only the outcomes the table actually contains", () => {
		const md = renderLeaderboardMarkdown(
			buildLeaderboard(
				run([
					provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node"]),
					provider("e2b", []),
				]),
			),
		);
		expect(md).toContain("**missing** — nothing was reported at all");
		// No skip and no failure in this run, so neither legend is emitted: the section never explains a
		// category the reader cannot see.
		expect(md).not.toContain("**skipped** — a precondition said no");
		expect(md).not.toContain("**failed** — the benchmark was attempted and broke");
	});

	it("orders disk skips first, then failures, then the unexplained absences", () => {
		const board = buildLeaderboard(
			run([
				provider("daytona", [metric(HEADLINE, [10, 11])], [], ["cpu-node", "disk", "memory"]),
				provider(
					"e2b",
					[],
					[
						{ scope: "suite", id: "cpu-node", outcome: "failed", reason: "PTS died" },
						{
							scope: "suite",
							id: "disk",
							outcome: "skipped",
							reason: "Insufficient disk: 1 GiB free, suite needs 20 GiB",
						},
					],
				),
			]),
		);
		expect(board.coverageGaps.map((g) => `${g.id}/${g.outcome}`)).toEqual([
			"disk/skipped", // ❌ disk leads: a structural absence
			"cpu-node/failed", // then what broke
			"memory/missing", // then what never said anything at all
		]);
	});
});
