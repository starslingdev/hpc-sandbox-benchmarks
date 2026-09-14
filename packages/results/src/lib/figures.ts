/**
 * The seam between the dataset and the figure package: which registries feed the figure
 * model, where the rendered files live, and the caption under each chart.
 *
 * `@sandbox-benchmarks/figures` takes the Run and the registries as ARGUMENTS (typed by the
 * schema, so there is nothing to cast and nothing to drift) — something still has to pass the
 * REAL ones and own the file naming. It is this module rather than the CLI bin because two
 * consumers need it: the bin, which renders and writes, and `tooling/repo-checks`, which
 * re-derives the published surface and diffs. A helper private to the bin would leave the
 * gate re-implementing it, and a gate that re-implements what it checks is checking its own
 * copy.
 */
import type {
	MetricFigure,
	MetricFigureModel,
	PipelineSuite,
	RealworldFigureModel,
} from "@sandbox-benchmarks/figures";
import {
	buildMetricChartModel,
	buildPipelineChartModel,
	buildRealworldFigureModel,
	FIGURE_WIDTH,
	metricChartHtml,
	pipelineChartHtml,
} from "@sandbox-benchmarks/figures";
import type { Run } from "@sandbox-benchmarks/schema";
import { METRIC_CATALOG, PROVIDERS, SUITES } from "@sandbox-benchmarks/schema";
import type { Leaderboard, LeaderboardFigure, LeaderboardMetricFigure } from "./leaderboard.ts";
import { buildLeaderboard, FIGURE_DIMENSION } from "./leaderboard.ts";

/**
 * Where the rendered leaderboard figures are written, relative to the directory holding the
 * Markdown. A relative directory rather than a repo-absolute path: the CLI resolves it against
 * whatever `outFile` it was given, and the Markdown links it verbatim, so the two agree for a
 * render into a scratch directory exactly as they do for `LEADERBOARD.md` at the repo root.
 */
export const LEADERBOARD_FIGURE_DIR = "docs/figures";

/** The file one suite's chart is written to, and the path the Markdown links. */
export function suiteFigureFile(suiteId: string): string {
	return `${LEADERBOARD_FIGURE_DIR}/${suiteId}.webp`;
}

/** The file one metric's chart is written to, and the path the Markdown links. Named by the
 *  catalog id — the one stable, unique identity a metric has — so a relabelled metric keeps its
 *  file and two metrics can never collide on a prettier name. Suite ids are hyphenated and
 *  metric ids underscored, so the two kinds share the directory without ever sharing a name. */
export function metricFigureFile(metricId: string): string {
	return `${LEADERBOARD_FIGURE_DIR}/${metricId}.webp`;
}

/**
 * Raster density of the committed charts: the WebP is this many device pixels per CSS px, and the
 * Markdown's `<img width>` shows it at logical size. One constant with two consumers — the CLI
 * rasterises at it, the artifact gate asserts the committed files against it — so the pixels and
 * the check cannot drift apart.
 */
export const FIGURE_DEVICE_SCALE = 2;

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
 *
 * It also says the scale is this chart's own. The charts once shared one time scale across the
 * run, and the caption claimed it; now that each scales to its own slowest pipeline, a reader
 * comparing two charts must be told to read the totals rather than the lengths.
 */
export function suiteFigureNote(suite: PipelineSuite): string {
	const counts = suite.bars.flatMap((bar) => bar.segments.map((segment) => segment.n));
	const low = Math.min(...counts);
	const high = Math.max(...counts);
	const trials = low === high ? `${low}` : `${low}–${high}`;
	const plural = low === 1 && high === 1 ? "trial" : "trials";
	const scale = " The scale is this chart's own: compare bars within it, totals across charts.";
	// Missing measurements must be disclosed. The current catalog can also name tasks added
	// after a historical run, so absence alone does not establish a failed or skipped execution.
	const dropped =
		suite.droppedTasks.length === 0
			? ""
			: ` Tasks without recorded measurements in this run are excluded from all bars: ` +
				`**${suite.droppedTasks.join("**, **")}**.`;
	return (
		`Each segment is that task's median over ${trials} retained ${plural}; the bar is their sum, ` +
		`so it is the cost of the pipeline and not the timing of any single run.${dropped}${scale}`
	);
}

/**
 * Derive the figure model from a Run: which suites are chartable, and with what in them.
 *
 * Pure and browser-free, so a caller that only needs the LIST — the Markdown renderer's argument,
 * and the artifact gate reproducing it — pays for nothing. The suite selection is entirely the
 * figure model's (it drops a suite nobody exercised, and one where fewer than two environments
 * completed every exercised task); this module adds only where the file goes. The registries go
 * in here, once, typed by the schema that owns them.
 */
export function benchmarkDataOf(run: Run): RealworldFigureModel {
	return buildRealworldFigureModel({
		run,
		metrics: METRIC_CATALOG,
		providers: PROVIDERS.map((provider) => ({
			id: provider.id,
			displayName: provider.displayName,
			isolationTechnology: provider.isolation.technology,
		})),
		suites: SUITES,
	});
}

/** The figures the Markdown links, in the order it links them. */
export function leaderboardFigures(data: RealworldFigureModel): LeaderboardFigure[] {
	return data.suites.map((suite) => ({
		suiteId: suite.id,
		suiteName: suite.name,
		file: suiteFigureFile(suite.id),
		width: FIGURE_WIDTH,
		charted: suite.bars.length,
		incomplete: suite.incomplete.length,
		tasks: suite.tasks.length,
	}));
}

/**
 * The wording the leaderboard's coverage table uses for a provider that reported nothing for a
 * metric with no gap marker to explain it — restated on the chart's disclosure row so the two
 * surfaces describe one hole in one voice.
 */
const UNMARKED_ABSENCE = "No result and no marker: the metric never reported for this provider.";

/**
 * Derive the metric figure model: one ranked bar chart per synthetic metric the board ranked,
 * with the board's own rows.
 *
 * The rows come from the BOARD, not from the Run: the median across sandboxes, its cluster
 * bootstrap and the rank (with ties) are `buildLeaderboard`'s derivation, and the chart must
 * show exactly the numbers in the table beneath it. The figure package therefore takes them
 * already ranked (see its `metric-model.ts`), and this seam is where the board is turned into
 * that input. The realworld dimension is excluded — its metrics are the segments of the
 * pipeline charts, drawn once already as a whole pipeline per environment.
 *
 * A metric with one ranked environment is not charted: a chart of one bar is not a comparison,
 * exactly as a suite one environment completed is not.
 */
export function metricFigureModelOf(run: Run, board: Leaderboard): MetricFigureModel {
	const providers = benchmarkDataOf(run).providers;
	const validated = new Set(providers.map((provider) => provider.id));
	const suiteOf = new Map<string, string>();
	for (const [suiteId, suite] of Object.entries(SUITES)) {
		for (const metricId of suite.metrics) suiteOf.set(metricId, suiteId);
	}
	const metrics: MetricFigure[] = board.dimensions
		.filter((dimension) => dimension.dimension !== FIGURE_DIMENSION)
		.flatMap((dimension) =>
			dimension.metrics
				.filter(({ rows }) => rows.length >= 2)
				.map(({ metric, rows }) => {
					const ranked = new Set(rows.map((row) => row.providerId));
					const suiteId = suiteOf.get(metric.id);
					return {
						id: metric.id,
						label: metric.label,
						dimension: dimension.dimension,
						unit: metric.unit,
						direction: metric.direction,
						headline: metric.headline,
						derived: metric.derived === true,
						// The board's rows are the run's providers; a validated provider the chart cannot
						// name has no row to draw, so a pending placeholder never reaches the chart either.
						rows: rows
							.filter((row) => validated.has(row.providerId))
							.map((row) => ({
								provider: row.providerId,
								value: row.value,
								lo: row.interval.resamples === 0 ? row.value : row.interval.lo,
								hi: row.interval.resamples === 0 ? row.value : row.interval.hi,
								rank: row.rank,
								n: row.n,
								sandboxes: row.sandboxes ?? 1,
							})),
						// A derived metric (a price) has no coverage to fall short of: an environment with
						// no published price is not a gap, and the board's coverage table does not list
						// it as one either — so the chart lists nothing.
						unmeasured: (metric.derived === true ? [] : run.providers)
							.filter((p) => validated.has(p.providerId) && !ranked.has(p.providerId))
							.map((p) => {
								const gap = p.gaps.find(
									(g) =>
										(g.scope === "suite" && g.id === suiteId) ||
										(g.scope !== "suite" && g.id === metric.id),
								);
								return {
									provider: p.providerId,
									outcome: gap?.outcome ?? "missing",
									reason: gap?.reason ?? UNMARKED_ABSENCE,
								};
							}),
					};
				}),
		);
	return { metrics, providers };
}

/** The metric figures the Markdown links, in the board's dimension and metric order. */
export function leaderboardMetricFigures(model: MetricFigureModel): LeaderboardMetricFigure[] {
	return model.metrics.map((metric) => ({
		metricId: metric.id,
		label: metric.label,
		dimension: metric.dimension,
		headline: metric.headline,
		file: metricFigureFile(metric.id),
		width: FIGURE_WIDTH,
		charted: metric.rows.length,
		unmeasured: metric.unmeasured.length,
	}));
}

/**
 * The paragraph under a metric chart's title: what the bar is (a median across sandboxes, one
 * machine one vote — not a pooled median of trials), what the whisker is, and that the scale is
 * this chart's own. Counts are read off the rows, as ranges when they disagree, for the same
 * reason the suite note reads them off its segments: the registry says what was requested, and
 * the retained count is what the run actually has.
 */
export function metricFigureNote(figure: MetricFigure): string {
	const range = (values: number[]): string => {
		const low = Math.min(...values);
		const high = Math.max(...values);
		return low === high ? `${low}` : `${low}–${high}`;
	};
	const sandboxes = range(figure.rows.map((row) => row.sandboxes));
	const trials = range(figure.rows.map((row) => row.n));
	const anyInterval = figure.rows.some((row) => row.lo !== row.hi);
	const singleTrial = trials === "1";
	const interval = anyInterval
		? " The whisker is the 95% cluster-bootstrap interval of that median; environments whose intervals the test cannot separate share a rank and a badge."
		: singleTrial
			? " One observation per environment, so no interval is drawn."
			: "";
	const bar = singleTrial
		? `Each bar is the environment's one retained value`
		: `Each bar is the median across ${sandboxes} sandbox${sandboxes === "1" ? "" : "es"} (one machine, one vote) of ${trials} retained trials`;
	const derived = figure.derived
		? " Derived from published pricing, not measured: only environments with a published price are charted."
		: "";
	return `${bar}.${interval}${derived} The scale is this metric's own, not shared with other charts.`;
}

/** One chart, ready to be rasterised — or compared, which is why the HTML travels with the
 *  figure the Markdown will link. */
export interface RenderedLeaderboardFigureHtml {
	/** What the Markdown links it as — the same value the renderer is handed. A suite chart
	 *  (stacked pipeline) or a metric chart (ranked bars); `file` and `width` are common. */
	readonly figure: LeaderboardFigure | LeaderboardMetricFigure;
	/** The complete, self-contained chart document. Deterministic: same run, same code, same
	 *  string — the pixels Chrome makes of it are not, which is why gates hold onto THIS. */
	readonly html: string;
}

/**
 * Render every chartable suite in `run`, then every chartable synthetic metric, to HTML.
 *
 * Pure and browser-free — rasterising the documents is the CLI's job
 * (`@sandbox-benchmarks/figures/screenshot`). One map over each model's list produces the figure
 * and its document TOGETHER, so the Markdown cannot link an image this function did not
 * produce — there is no second derivation to disagree with. Suites come first, so the first
 * entries are the pipeline charts that lead the document.
 *
 * `board` is the leaderboard the metric charts are drawn from. It defaults to a fresh build,
 * but building one is the most expensive thing in this package (a seeded 10 000-resample
 * bootstrap per row), so a caller that already has the board — the CLI, the artifact gate —
 * passes it in rather than paying twice.
 */
export function renderLeaderboardFigureHtml(
	run: Run,
	board: Leaderboard = buildLeaderboard(run),
): RenderedLeaderboardFigureHtml[] {
	const data = benchmarkDataOf(run);
	const figures = leaderboardFigures(data);
	const suites = data.suites.map((suite, index) => ({
		// Indexed, not looked up: both lists are the same map over `data.suites`.
		figure: figures[index] as LeaderboardFigure,
		html: pipelineChartHtml(buildPipelineChartModel(suite, data, suiteFigureNote(suite))),
	}));
	const model = metricFigureModelOf(run, board);
	const metricFigures = leaderboardMetricFigures(model);
	const metrics = model.metrics.map((metric, index) => ({
		figure: metricFigures[index] as LeaderboardMetricFigure,
		html: metricChartHtml(buildMetricChartModel(metric, model, metricFigureNote(metric))),
	}));
	return [...suites, ...metrics];
}
