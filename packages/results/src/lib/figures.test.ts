// The dataset↔figures seam: the real registries feeding the figure model, the figure list the
// Markdown links, and the caption under each chart — tested against synthetic Runs so the rules
// hold regardless of what the committed dataset contains.
import { describe, expect, it } from "bun:test";
import type { PipelineSuite } from "@sandbox-benchmarks/figures";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, SUITES } from "@sandbox-benchmarks/schema";
import {
	benchmarkDataOf,
	comparisonFigureFile,
	comparisonRunLabels,
	LEADERBOARD_FIGURE_DIR,
	leaderboardFigures,
	leaderboardMetricFigures,
	metricFigureFile,
	metricFigureModelOf,
	metricFigureNote,
	renderComparisonFigureHtml,
	renderLeaderboardFigureHtml,
	suiteFigureFile,
	suiteFigureNote,
} from "./figures.ts";
import { buildLeaderboard } from "./leaderboard.ts";

/** The suite's canonical task order, widened off the `as const` tuple so the fixtures below can
 *  take the first one or two without restating their ids. */
const MASTRA: readonly string[] = SUITES["realworld-mastra"].metrics;
const [CLONE, INSTALL] = MASTRA as [string, string];

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
		suitesCovered: ["realworld-mastra"],
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

/** Two environments that both completed the same two tasks — the minimum a suite needs to chart. */
function chartableRun(): Run {
	return run([
		provider("daytona-vm", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
		provider("modal-vm", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
	]);
}

describe("suiteFigureFile", () => {
	it("names the file after the suite, under the figure directory", () => {
		expect(suiteFigureFile("realworld-mastra")).toBe(
			`${LEADERBOARD_FIGURE_DIR}/realworld-mastra.webp`,
		);
	});
});

describe("leaderboardFigures", () => {
	it("lists one figure per chartable suite, with its own counts", () => {
		const figures = leaderboardFigures(benchmarkDataOf(chartableRun()));
		expect(figures).toEqual([
			{
				suiteId: "realworld-mastra",
				suiteName: "Mastra",
				file: `${LEADERBOARD_FIGURE_DIR}/realworld-mastra.webp`,
				width: 960,
				charted: 2,
				incomplete: 0,
				tasks: 2,
			},
		]);
	});

	it("lists nothing when only one environment completed the suite", () => {
		// The ingest's rule, restated here because the Markdown depends on it: a chart of one bar is
		// not a comparison, and the document must then keep its tables in the open.
		const figures = leaderboardFigures(
			benchmarkDataOf(run([provider("daytona-vm", [metric(CLONE, [1, 2])])])),
		);
		expect(figures).toEqual([]);
	});

	it("does not chart an environment that ran only part of the pipeline", () => {
		// The understated-total failure: summing the tasks a provider DID run and drawing it beside
		// providers that ran them all would show a fast bar for an environment that skipped the work.
		const figures = leaderboardFigures(
			benchmarkDataOf(
				run([
					provider("daytona-vm", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
					provider("modal-vm", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
					provider("e2b", [metric(CLONE, [1, 1])]),
				]),
			),
		);
		expect(figures[0]?.charted).toBe(2);
		expect(figures[0]?.incomplete).toBe(1);
	});
});

describe("renderLeaderboardFigureHtml", () => {
	it("passes declared and aggregated detected isolation into figure labels", () => {
		const withRuntime = (providerId: string, runtime: string) =>
			provider(providerId, [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])], {
				hostMetadata: [
					{
						source: "mise/system-provider",
						sourceFile: "system/system-provider.json",
						fields: [{ path: "isolation_runtime", value: runtime }],
					},
				],
			});
		const data = benchmarkDataOf(
			run([
				withRuntime("namespace", "firecracker"),
				withRuntime("daytona-vm", "firecracker"),
				withRuntime("modal-gvisor", "gvisor"),
				withRuntime("microsandbox-cloud", "libkrun"),
			]),
		);
		expect(data.providers).toEqual([
			{
				id: "namespace",
				name: "Namespace",
				specMatched: true,
				isolation: { kind: "microVM", technology: "Firecracker" },
			},
			{
				id: "daytona-vm",
				name: "Daytona",
				specMatched: true,
				isolation: { kind: "microVM", technology: "Firecracker" },
			},
			{
				id: "modal-gvisor",
				name: "Modal",
				specMatched: true,
				isolation: { kind: "Userspace", technology: "gVisor" },
			},
			{
				id: "microsandbox-cloud",
				name: "microsandbox",
				specMatched: true,
				isolation: { kind: "microVM", technology: "libkrun" },
			},
		]);
	});

	it("returns one self-contained document per chartable suite, paired with its figure", () => {
		const rendered = renderLeaderboardFigureHtml(chartableRun());
		expect(
			rendered.map(({ figure }) => ("suiteId" in figure ? figure.suiteId : figure.metricId)),
		).toEqual(["realworld-mastra"]);
		const html = rendered[0]?.html as string;
		// The document must carry everything the screenshot needs: the chart, the caption, the
		// faces. A reference to anything outside the string would make the WebP depend on the
		// machine that rendered it.
		expect(html).toContain("<title>Mastra</title>");
		expect(html).toContain("retained trials");
		expect(html).toContain("data:font/woff2;base64,");
	});

	it("is deterministic — same run, same strings", () => {
		// The browser's pixels are not byte-stable across machines; the HTML must be, everywhere,
		// or a figure regeneration reviews as unexplainable churn.
		const [first, second] = [
			renderLeaderboardFigureHtml(chartableRun()),
			renderLeaderboardFigureHtml(chartableRun()),
		];
		expect(first.map(({ html }) => html)).toEqual(second.map(({ html }) => html));
	});
});

describe("suiteFigureNote", () => {
	const suite = (counts: number[][]): PipelineSuite => ({
		id: "realworld-mastra",
		name: "Mastra",
		minDiskGb: 30,
		tasks: [],
		droppedTasks: [],
		bars: counts.map((row, index) => ({
			provider: `p${index}`,
			totalS: 1,
			segments: row.map((n) => ({ id: "t", phase: "clone" as const, p50: 1, n })),
		})),
		incomplete: [],
	});

	it("discloses missing measurements without inventing an execution outcome", () => {
		const rows: number[][] = [
			[12, 12],
			[12, 12],
		];
		const withDropped = { ...suite(rows), droppedTasks: ["test core"] };
		expect(suiteFigureNote(withDropped)).toContain(
			"Tasks without recorded measurements in this run are excluded from all bars: **test core**.",
		);
		expect(suiteFigureNote(withDropped)).not.toContain("failed");
		expect(suiteFigureNote(withDropped)).not.toContain("skipped");
		expect(suiteFigureNote(suite(rows))).not.toContain("excluded from all bars");
	});

	it("prints one trial count when every task agrees", () => {
		expect(
			suiteFigureNote(
				suite([
					[12, 12],
					[12, 12],
				]),
			),
		).toContain("median over 12 retained trials");
	});

	it("prints a range when they do not, rather than one task's count as if it were the suite's", () => {
		// A lost replicate shard lowers the RETAINED count for one task only. Printing "12" there
		// would be the note claiming evidence the run does not have.
		expect(
			suiteFigureNote(
				suite([
					[12, 9],
					[12, 12],
				]),
			),
		).toContain("median over 9–12 retained trials");
	});

	it("says the bar is a sum of medians, not a measured run", () => {
		// The one thing a stacked bar cannot say for itself, and the thing a reader would otherwise
		// assume: the total is arithmetic over per-task medians, so no single pipeline ever took it.
		const note = suiteFigureNote(
			suite([
				[12, 12],
				[12, 12],
			]),
		);
		expect(note).toContain("the bar is their sum");
		expect(note).toContain("not the timing of any single run");
	});

	it("says the scale is this chart's own, so a reader compares totals across charts", () => {
		// The charts once shared one time scale and the caption claimed it; each now scales to
		// its own slowest pipeline, and the caption must say so or a reader will read one chart's
		// bar length against another's.
		const rows: number[][] = [
			[12, 12],
			[12, 12],
		];
		expect(suiteFigureNote(suite(rows))).toContain("The scale is this chart's own");
		expect(suiteFigureNote(suite(rows))).not.toContain("share one time scale");
	});
});

describe("metric figures", () => {
	const CPU = "node_web_tooling_runs_per_s";
	const STREAM = "stream_type_triad";
	/** Two environments ranked on a cpu metric and one on a memory metric; one provider with a
	 *  gap marker for the cpu suite and no cpu result. */
	function rankedRun(): Run {
		return run([
			provider("daytona-vm", [metric(CPU, [10, 12, 11]), metric(STREAM, [100, 110])], {
				suitesCovered: ["cpu-node", "memory"],
			}),
			provider("modal-vm", [metric(CPU, [5, 6, 7])], { suitesCovered: ["cpu-node"] }),
			provider("e2b", [metric(INSTALL, [30, 32])], {
				suitesCovered: ["realworld-mastra"],
				gaps: [
					{
						scope: "suite",
						id: "cpu-node",
						outcome: "failed",
						reason: "PTS ran but every trial failed",
					},
				],
			}),
		]);
	}
	const modelOf = (r: Run) => metricFigureModelOf(r, buildLeaderboard(r));

	it("names the file after the metric id, under the figure directory", () => {
		expect(metricFigureFile(STREAM)).toBe(`${LEADERBOARD_FIGURE_DIR}/${STREAM}.webp`);
	});

	it("charts every synthetic metric with at least two ranked environments, never a realworld task", () => {
		const model = modelOf(rankedRun());
		expect(model.metrics.map((entry) => entry.id)).toEqual([CPU]);
		expect(leaderboardMetricFigures(model)).toEqual([
			{
				metricId: CPU,
				label: "Node.js web tooling",
				dimension: "cpu",
				headline: true,
				file: `${LEADERBOARD_FIGURE_DIR}/${CPU}.webp`,
				width: 960,
				charted: 2,
				unmeasured: 1,
			},
		]);
	});

	it("takes its rows from the board, already ranked, with the board's own values", () => {
		const r = rankedRun();
		const board = buildLeaderboard(r);
		const figure = metricFigureModelOf(r, board).metrics[0];
		const rows = board.dimensions.find((d) => d.dimension === "cpu")?.metrics[0]?.rows ?? [];
		expect(figure?.rows.map((row) => row.provider)).toEqual(rows.map((row) => row.providerId));
		expect(figure?.rows.map((row) => [row.value, row.rank, row.n])).toEqual(
			rows.map((row) => [row.value, row.rank, row.n]),
		);
	});

	it("discloses a validated environment without a result, with the run's gap marker when it has one", () => {
		const figure = modelOf(rankedRun()).metrics[0];
		expect(figure?.unmeasured).toEqual([
			{ provider: "e2b", outcome: "failed", reason: "PTS ran but every trial failed" },
		]);
	});

	it("lists no unmeasured environment for a derived metric — a missing price is not a gap", () => {
		const priced = run([
			provider("daytona-vm", [metric("usd_per_hour", [0.3])], { suitesCovered: [] }),
			provider("modal-vm", [metric("usd_per_hour", [0.5])], { suitesCovered: [] }),
			provider("e2b", [metric(INSTALL, [30, 32])]),
		]);
		const figure = modelOf(priced).metrics.find((entry) => entry.id === "usd_per_hour");
		expect(figure?.derived).toBe(true);
		expect(figure?.unmeasured).toEqual([]);
		expect(metricFigureNote(figure as NonNullable<typeof figure>)).toContain(
			"only environments with a published price are charted",
		);
	});

	it("renders the metric charts after the suite charts, each paired with its figure", () => {
		const r = rankedRun();
		const rendered = renderLeaderboardFigureHtml(r, buildLeaderboard(r));
		expect(rendered.map(({ figure }) => figure.file)).toEqual([
			`${LEADERBOARD_FIGURE_DIR}/${CPU}.webp`,
		]);
		expect(rendered[0]?.html).toContain("<title>Node.js web tooling</title>");
		expect(rendered[0]?.html).toContain(`<span class="badge">best</span>`);
	});
});

describe("metricFigureNote", () => {
	const figure = (rows: { n: number; sandboxes: number; lo: number; hi: number }[]) => ({
		id: "m",
		label: "M",
		dimension: "cpu",
		unit: "u",
		direction: "HIB" as const,
		headline: false,
		derived: false,
		rows: rows.map((row, index) => ({ provider: `p${index}`, value: 1, rank: 1, ...row })),
		unmeasured: [],
	});

	it("says the bar is a median across sandboxes and the whisker its interval", () => {
		const note = metricFigureNote(
			figure([
				{ n: 6, sandboxes: 3, lo: 0.9, hi: 1.1 },
				{ n: 6, sandboxes: 3, lo: 0.8, hi: 1.2 },
			]),
		);
		expect(note).toContain(
			"median across 3 sandboxes (one machine, one vote) of 6 retained trials",
		);
		expect(note).toContain("95% cluster-bootstrap interval");
		expect(note).toContain("The scale is this metric's own");
	});

	it("prints ranges when the rows disagree, rather than one row's count as if it were the chart's", () => {
		const note = metricFigureNote(
			figure([
				{ n: 6, sandboxes: 3, lo: 0.9, hi: 1.1 },
				{ n: 4, sandboxes: 2, lo: 0.8, hi: 1.2 },
			]),
		);
		expect(note).toContain("across 2–3 sandboxes");
		expect(note).toContain("of 4–6 retained trials");
	});

	it("describes single observations without claiming a median or an interval", () => {
		const note = metricFigureNote(
			figure([
				{ n: 1, sandboxes: 1, lo: 1, hi: 1 },
				{ n: 1, sandboxes: 1, lo: 1, hi: 1 },
			]),
		);
		expect(note).toContain("one retained value");
		expect(note).toContain("no interval is drawn");
		expect(note).not.toContain("median");
	});
});

describe("comparison figures", () => {
	const at = (runId: string, generatedAt: string, providers: ProviderRun[]): Run => ({
		...run(providers),
		runId,
		generatedAt,
	});
	const TEST = SUITES["realworld-mastra"].metrics[2] as string;
	const older = () =>
		at("111", "2026-08-14T00:00:00.000Z", [
			provider("daytona-vm", [metric(CLONE, [2, 2]), metric(INSTALL, [40, 40])]),
			provider("modal-vm", [metric(CLONE, [4, 4]), metric(INSTALL, [60, 60])]),
		]);
	const newer = () =>
		at("222", "2026-09-14T00:00:00.000Z", [
			provider("daytona-vm", [
				metric(CLONE, [1, 1]),
				metric(INSTALL, [30, 30]),
				metric(TEST, [500]),
			]),
			provider("modal-vm", [metric(CLONE, [4, 4]), metric(INSTALL, [66, 66]), metric(TEST, [500])]),
		]);

	it("labels rows by month, by day when the months coincide, by run id when the days do", () => {
		expect(comparisonRunLabels(older(), newer())).toEqual(["Aug 2026", "Sep 2026"]);
		expect(
			comparisonRunLabels(
				{ runId: "1", generatedAt: "2026-09-03T01:00:00Z" },
				{ runId: "2", generatedAt: "2026-09-14T01:00:00Z" },
			),
		).toEqual(["Sep 3", "Sep 14"]);
		expect(
			comparisonRunLabels(
				{ runId: "1", generatedAt: "2026-09-14T00:12:00Z" },
				{ runId: "2", generatedAt: "2026-09-14T05:26:00Z" },
			),
		).toEqual(["run 1", "run 2"]);
	});

	it("names the file after the suite and both runs, older first", () => {
		expect(comparisonFigureFile("realworld-mastra", "111", "222")).toBe(
			"realworld-mastra-111-vs-222.webp",
		);
	});

	it("orders the runs by date whichever way they are given, and compares shared tasks only", () => {
		const forward = renderComparisonFigureHtml(older(), newer());
		const backward = renderComparisonFigureHtml(newer(), older());
		expect(forward.older.id).toBe("111");
		expect(backward.older.id).toBe("111");
		expect(forward.figures.map(({ html }) => html)).toEqual(
			backward.figures.map(({ html }) => html),
		);
		const [figure] = forward.figures;
		expect(figure?.file).toBe("realworld-mastra-111-vs-222.webp");
		expect(figure?.charted).toEqual({ older: 2, newer: 2 });
		// The newer run's extra task is excluded from both bars and named in the caption.
		expect(figure?.html).toContain("ran in only one of them");
		expect(figure?.html).toContain("<title>Mastra</title>");
		// Daytona: 42 s → 31 s; Modal: 64 s → 70 s.
		expect(figure?.html).toContain(`<span class="delta faster">-26.2%</span>`);
		expect(figure?.html).toContain(`<span class="delta slower">+9.4%</span>`);
	});

	it("refuses to compare a run with itself", () => {
		expect(() => renderComparisonFigureHtml(older(), older())).toThrow(/with itself/);
	});
});
