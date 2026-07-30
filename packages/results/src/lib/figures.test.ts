// The schema↔figures seam. Everything here is about a document the figure package will PARSE, and
// the failure mode being guarded is a field that is present but wrong — which no type catches,
// because the seam's whole job is to satisfy a shape defined somewhere else.
import { describe, expect, it } from "bun:test";
import type { PipelineSuite } from "@sandbox-benchmarks/figures/domain";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, METRIC_CATALOG, PROVIDERS, SUITES } from "@sandbox-benchmarks/schema";
import {
	benchmarkDataOf,
	catalogDocument,
	LEADERBOARD_FIGURE_DIR,
	leaderboardFigures,
	suiteFigureFile,
	suiteFigureNote,
} from "./figures.ts";

/** The suite's canonical task order, widened off the `as const` tuple so the fixtures below can
 *  take the first one or two without restating their ids. */
const MASTRA: readonly string[] = SUITES["realworld-mastra"].metrics;
const [CLONE, INSTALL] = MASTRA as [string, string];

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(providerId: string, metrics: MetricResult[]): ProviderRun {
	return {
		providerId,
		validationStatus: "validated",
		observedSpecs: {},
		metrics,
		suitesCovered: ["realworld-mastra"],
		gaps: [],
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

/** Two environments that both completed the same two tasks — the minimum a suite needs to chart. */
function chartableRun(): Run {
	return run([
		provider("daytona-vm", [metric(CLONE, [1, 2]), metric(INSTALL, [30, 32])]),
		provider("modal-vm", [metric(CLONE, [3, 4]), metric(INSTALL, [50, 52])]),
	]);
}

describe("catalogDocument", () => {
	it("carries every catalogued metric with the fields the figure package's parse requires", () => {
		const catalog = catalogDocument();
		expect(catalog.metrics.length).toBe(METRIC_CATALOG.length);
		expect(catalog.providers.length).toBe(PROVIDERS.length);
		expect(Object.keys(catalog.suites).sort()).toEqual(Object.keys(SUITES).sort());
		for (const metric of catalog.metrics) {
			expect(typeof metric.derived, metric.id).toBe("boolean");
			expect(metric.label.length, metric.id).toBeGreaterThan(0);
			expect(metric.unit.length, metric.id).toBeGreaterThan(0);
		}
	});

	it("reads an absent `derived` as measured, not as computed", () => {
		// The schema leaves the flag off a metric it measured; the figure shape requires it. Coercing
		// `undefined` the wrong way would relabel the entire measured catalog as derived — a claim the
		// document would then make about every number in it.
		const measured = METRIC_CATALOG.filter((m) => m.derived === undefined);
		expect(measured.length).toBeGreaterThan(0);
		const byId = new Map(catalogDocument().metrics.map((m) => [m.id, m]));
		for (const metric of measured) {
			expect(byId.get(metric.id)?.derived, metric.id).toBe(false);
		}
	});

	it("keeps a suite's declared minDiskGb, and reads an absent one as null", () => {
		// `SUITES` is `as const`, so the members that do not set the field genuinely lack it. Widening
		// to the declared interface is what makes this readable at all — and `undefined` reaching the
		// document would fail the parse rather than defaulting.
		const suites = catalogDocument().suites;
		expect(suites["realworld-mastra"]?.minDiskGb).toBe(30);
		expect(suites["cpu-node"]?.minDiskGb).toBe(null);
	});

	it("is deterministic — no clock, no environment, no git", () => {
		// The published document is gated byte-identical against a fresh render, so anything that
		// varied per checkout would make a local regeneration differ from CI's for no visible reason.
		expect(catalogDocument()).toEqual(catalogDocument());
	});
});

describe("suiteFigureFile", () => {
	it("names the file after the suite, under the figure directory", () => {
		expect(suiteFigureFile("realworld-mastra")).toBe(
			`${LEADERBOARD_FIGURE_DIR}/realworld-mastra.svg`,
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
				file: `${LEADERBOARD_FIGURE_DIR}/realworld-mastra.svg`,
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

describe("suiteFigureNote", () => {
	const suite = (counts: number[][]): PipelineSuite => ({
		id: "realworld-mastra",
		name: "Mastra",
		minDiskGb: 30,
		tasks: [],
		bars: counts.map((row, index) => ({
			provider: `p${index}`,
			totalS: 1,
			costPerRunUsd: null,
			segments: row.map((n) => ({
				id: "t",
				label: "t",
				shortLabel: "t",
				phase: "clone",
				p50: 1,
				n,
			})),
		})),
		incomplete: [],
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
});
