/**
 * Two runs of the same realworld suites, side by side: the comparison figure model.
 *
 * A leaderboard chart answers "who is fastest now". It cannot answer "did everything get
 * faster since last month" — when the order is unchanged and the whole distribution shifted,
 * one chart per run shows two identical-looking pictures with different numbers printed on
 * them. This model puts the two runs' pipelines for each environment in one row, so the shift
 * is a visible length difference and the delta is printed beside it.
 *
 * Built from two {@link RealworldFigureModel}s (one per run) rather than from the Runs: the
 * per-suite chartability rule, the per-task medians and the provider roster are already that
 * model's decisions, and this one only pairs them up. The pairing has one rule of its own:
 *
 *  - **Bars are summed over the tasks BOTH runs exercised.** A suite gains and loses tasks
 *    between runs (openclaw went from four to six); summing each run's own task set would
 *    compare a four-task pipeline to a six-task one and call the difference a slowdown. The
 *    tasks only one run exercised are excluded from both bars and disclosed.
 */
import type { BarSegment, FigureProvider, PipelineSuite, RealworldFigureModel } from "./model.ts";
import type { PhaseId } from "./phases.ts";

/** One run's identity as the chart names it: the id for provenance, the label for the row chip. */
export interface ComparisonRunIdentity {
	readonly id: string;
	/** Short, distinct between the two runs — a month (`Sep 2026`), a day when the months
	 *  coincide, the run id when the days do. The seam that knows the dates decides. */
	readonly label: string;
	readonly generatedAt: string;
}

/** One environment's pipeline in one run, summed over the compared tasks only. */
export interface ComparisonBar {
	readonly totalS: number;
	readonly segments: readonly BarSegment[];
}

export interface ComparisonRow {
	readonly provider: string;
	/** Null when the environment did not complete the suite in that run. */
	readonly before: ComparisonBar | null;
	readonly after: ComparisonBar | null;
}

export interface ComparisonSuite {
	readonly id: string;
	readonly name: string;
	readonly minDiskGb: number | null;
	/** The compared tasks: exercised in BOTH runs, in the suite's canonical order. */
	readonly tasks: readonly { readonly id: string; readonly phase: PhaseId }[];
	/** Short labels of tasks only one run exercised — excluded from every bar, and disclosed. */
	readonly excludedTasks: {
		readonly beforeOnly: readonly string[];
		readonly afterOnly: readonly string[];
	};
	/** Every environment charted in at least one run. */
	readonly rows: readonly ComparisonRow[];
	/** Environments that completed the suite in neither run, with each run's recorded reason. */
	readonly incomplete: readonly {
		readonly provider: string;
		readonly before: { readonly outcome: string; readonly reason: string } | null;
		readonly after: { readonly outcome: string; readonly reason: string } | null;
	}[];
}

export interface ComparisonFigureModel {
	readonly before: ComparisonRunIdentity;
	readonly after: ComparisonRunIdentity;
	/** Suites chartable in BOTH runs, widest comparison first. */
	readonly suites: readonly ComparisonSuite[];
	/** The union roster; where both runs list a provider, the newer run's entry wins. */
	readonly providers: readonly FigureProvider[];
}

export interface ComparisonModelInput {
	readonly before: { readonly run: ComparisonRunIdentity; readonly model: RealworldFigureModel };
	readonly after: { readonly run: ComparisonRunIdentity; readonly model: RealworldFigureModel };
	/** The metric catalog, for the excluded-task labels ("Better-Auth: test core" → "test core"). */
	readonly metrics: readonly { readonly id: string; readonly label: string }[];
}

const round = (v: number, dp: number) => Number(v.toFixed(dp));

function restrict(
	suite: PipelineSuite,
	provider: string,
	tasks: ReadonlySet<string>,
): ComparisonBar | null {
	const bar = suite.bars.find((entry) => entry.provider === provider);
	if (!bar) return null;
	const segments = bar.segments.filter((segment) => tasks.has(segment.id));
	return {
		totalS: round(
			segments.reduce((sum, segment) => sum + segment.p50, 0),
			3,
		),
		segments,
	};
}

export function buildComparisonFigureModel(input: ComparisonModelInput): ComparisonFigureModel {
	const { before, after, metrics } = input;
	const labelOf = new Map(metrics.map((m) => [m.id, m.label]));
	const shortLabel = (id: string): string => {
		const label = labelOf.get(id);
		if (!label) throw new Error(`metric "${id}" is in a run but not in the metric catalog`);
		return label.replace(/^[^:]+:\s*/, "");
	};

	const suites = after.model.suites.flatMap((afterSuite): ComparisonSuite[] => {
		const beforeSuite = before.model.suites.find((entry) => entry.id === afterSuite.id);
		// A suite one run could not chart has nothing to be compared against.
		if (!beforeSuite) return [];
		const beforeTasks = new Set(beforeSuite.tasks.map((task) => task.id));
		const tasks = afterSuite.tasks.filter((task) => beforeTasks.has(task.id));
		if (tasks.length === 0) return [];
		const compared = new Set(tasks.map((task) => task.id));
		const providers = [
			...new Set([
				...afterSuite.bars.map((bar) => bar.provider),
				...beforeSuite.bars.map((bar) => bar.provider),
			]),
		];
		const rows = providers.map((provider) => ({
			provider,
			before: restrict(beforeSuite, provider, compared),
			after: restrict(afterSuite, provider, compared),
		}));
		const charted = new Set(providers);
		const incompleteIn = (suite: PipelineSuite, provider: string) => {
			const entry = suite.incomplete.find((row) => row.provider === provider);
			return entry ? { outcome: entry.outcome, reason: entry.reason } : null;
		};
		const incomplete = [
			...new Set([
				...afterSuite.incomplete.map((row) => row.provider),
				...beforeSuite.incomplete.map((row) => row.provider),
			]),
		]
			.filter((provider) => !charted.has(provider))
			.map((provider) => ({
				provider,
				before: incompleteIn(beforeSuite, provider),
				after: incompleteIn(afterSuite, provider),
			}));
		// Rows exist only where there is something to compare or show; a suite with no bar in
		// either run cannot happen here (both suites were chartable), but the guard is cheap.
		if (rows.length === 0) return [];
		return [
			{
				id: afterSuite.id,
				name: afterSuite.name,
				minDiskGb: afterSuite.minDiskGb,
				tasks,
				excludedTasks: {
					beforeOnly: beforeSuite.tasks
						.filter((task) => !compared.has(task.id))
						.map((task) => shortLabel(task.id)),
					afterOnly: afterSuite.tasks
						.filter((task) => !compared.has(task.id))
						.map((task) => shortLabel(task.id)),
				},
				rows,
				incomplete,
			},
		];
	});

	const providerById = new Map<string, FigureProvider>();
	for (const provider of before.model.providers) providerById.set(provider.id, provider);
	for (const provider of after.model.providers) providerById.set(provider.id, provider);

	return {
		before: before.run,
		after: after.run,
		suites: suites.toSorted(
			(a, b) => b.rows.length - a.rows.length || a.id.localeCompare(b.id, "en"),
		),
		providers: [...providerById.values()],
	};
}
