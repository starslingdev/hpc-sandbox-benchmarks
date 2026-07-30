/**
 * The seam between the schema and the figure package: the catalog document the figures' ingest
 * consumes, where the rendered files live, and the caption under each chart.
 *
 * `@sandbox-benchmarks/figures` deliberately imports nothing from this repo — it takes a Run
 * document and a catalog document as ARGUMENTS, which is what lets its own guards render against
 * a synthetic fixture. Something therefore has to know both sides. It is this module rather than
 * the CLI bin because two consumers need it: the bin, which renders and writes, and
 * `tooling/repo-checks`, which re-derives the whole published surface and diffs. A helper private
 * to the bin would leave the gate re-implementing it, and a gate that re-implements what it
 * checks is checking its own copy.
 */
import type { PipelineSuite, SandboxBenchmarkData } from "@sandbox-benchmarks/figures/domain";
import type { Catalog, CatalogMetric, RunDoc } from "@sandbox-benchmarks/figures/ingest";
import { buildSandboxBenchmarkData } from "@sandbox-benchmarks/figures/ingest";
import type { Run, Suite } from "@sandbox-benchmarks/schema";
import { DIMENSIONS, METRIC_CATALOG, PROVIDERS, SUITES } from "@sandbox-benchmarks/schema";
import type { LeaderboardFigure } from "./leaderboard.ts";
import { DATASET_RUNS_DIR } from "./leaderboard.ts";

/**
 * Where the rendered leaderboard figures are written, relative to the directory holding the
 * Markdown. A relative directory rather than a repo-absolute path: the CLI resolves it against
 * whatever `outFile` it was given, and the Markdown links it verbatim, so the two agree for a
 * render into a scratch directory exactly as they do for `LEADERBOARD.md` at the repo root.
 */
export const LEADERBOARD_FIGURE_DIR = "docs/figures";

/** The file one suite's chart is written to, and the path the Markdown links. */
export function suiteFigureFile(suiteId: string): string {
	return `${LEADERBOARD_FIGURE_DIR}/${suiteId}.svg`;
}

/**
 * The catalog document, derived from the schema registries rather than snapshotted.
 *
 * `derived` defaults to `false` because the schema leaves the field off a Metric that is
 * measured; the figures' shape requires it, and reading an absent one as "derived" would mark
 * every measured metric as computed.
 *
 * `source.sha` says the catalog is not a snapshot, and that is the whole truth of it. The field
 * exists because the figure package's other consumer reads a COMMITTED snapshot of this repo's
 * schema and needs to know which commit produced it; here the catalog is the registry in the same
 * process, so there is no other commit to name. Reading one from `git rev-parse` would be worse
 * than useless: it would make an otherwise deterministic render depend on the checkout, and
 * `leaderboard-artifact-sync` gates that render byte-for-byte.
 */
export function catalogDocument(): Catalog {
	const metrics: CatalogMetric[] = METRIC_CATALOG.map((metric) => ({
		id: metric.id,
		dimension: metric.dimension,
		unit: metric.unit,
		direction: metric.direction,
		headline: metric.headline,
		label: metric.label,
		derived: metric.derived ?? false,
	}));
	return {
		source: { repo: "sandbox-benchmarks", sha: "derived-in-process", module: "packages/schema" },
		dimensions: [...DIMENSIONS],
		providers: PROVIDERS.map((provider) => ({
			id: provider.id,
			displayName: provider.displayName,
		})),
		metrics,
		suites: Object.fromEntries(
			// Widened to the declared `Suite` interface. `SUITES` is `as const`, so its inferred type is
			// the union of the nine literal shapes, and `minDiskGb` is absent from the members that do
			// not set it — reading it off the union is an error even though the interface declares it
			// optional.
			Object.entries(SUITES as Record<string, Suite>).map(([name, suite]) => [
				name,
				{ minDiskGb: suite.minDiskGb ?? null, metrics: [...suite.metrics] },
			]),
		),
	};
}

/**
 * The paragraph under a chart's title.
 *
 * It states the two things the picture cannot: that a bar is a SUM OF MEDIANS rather than a
 * measured single run, and how many trials each of those medians rests on. Both matter for
 * reading the chart honestly — the segments add up to the bar by construction (that is what a
 * stacked bar means), which is exactly why the total is not the median of any pipeline that ever
 * executed, and saying so is cheaper than letting a reader assume otherwise.
 *
 * `n` is read off the segments rather than from the suite registry's `defaultReplicas`: the
 * registry says what was REQUESTED, and a lost replicate shard makes the retained count smaller
 * without changing the request. A range is printed when the tasks disagree, because they can.
 */
export function suiteFigureNote(suite: PipelineSuite): string {
	const counts = suite.bars.flatMap((bar) => bar.segments.map((segment) => segment.n));
	const low = Math.min(...counts);
	const high = Math.max(...counts);
	const trials = low === high ? `${low}` : `${low}–${high}`;
	const plural = low === 1 && high === 1 ? "trial" : "trials";
	return (
		`Each segment is that task's median over ${trials} retained ${plural}; the bar is their sum, ` +
		`so it is the cost of the pipeline and not the timing of any single run. All three charts ` +
		`share one time scale.`
	);
}

/** What `buildSandboxBenchmarkData` records about where its inputs came from. Only `runFile` names
 *  a real path: the catalog is this process's own schema registry rather than a file (see
 *  {@link catalogDocument}), and the generator is the bin that renders the published surface. */
const GENERATOR = "apps/cli/src/bin/leaderboard.ts";

/**
 * Derive the figure model from a Run: which suites are chartable, and with what in them.
 *
 * Satori-free, so a caller that only needs the LIST — the Markdown renderer's argument, and the
 * artifact gate reproducing it — pays for no renderer. The suite selection is entirely the ingest's
 * (it drops a suite nobody exercised, and one where fewer than two environments completed every
 * exercised task); this function adds only where the file goes.
 */
export function benchmarkDataOf(run: Run): SandboxBenchmarkData {
	return buildSandboxBenchmarkData({
		// The ingest declares the READ SLICE of a Run document rather than importing the schema's
		// type, which is what keeps the figure package free of any dependency on this repo. The two
		// shapes are structurally compatible but not nominally identical, so the cast lives here, at
		// the one boundary, on a value `parseRun` has already validated.
		run: run as unknown as RunDoc,
		catalog: catalogDocument(),
		provenance: {
			runFile: `${DATASET_RUNS_DIR}/${run.runId}.json`,
			catalogFile: "packages/schema (in-process)",
			backfillRunFile: "",
			generator: GENERATOR,
		},
	});
}

/** The figures the Markdown links, in the order it links them. */
export function leaderboardFigures(data: SandboxBenchmarkData): LeaderboardFigure[] {
	return data.suites.map((suite) => ({
		suiteId: suite.id,
		suiteName: suite.name,
		file: suiteFigureFile(suite.id),
		charted: suite.bars.length,
		incomplete: suite.incomplete.length,
		tasks: suite.tasks.length,
	}));
}
