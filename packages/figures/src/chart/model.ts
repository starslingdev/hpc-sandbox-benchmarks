/**
 * `better-auth` / `mastra` / `openclaw` — the view-model for one stacked pipeline chart.
 *
 * One builder over the model's own suite list rather than three near-copies: a suite added
 * upstream becomes a figure automatically and cannot be the one somebody forgot.
 *
 * This is the layer the tests hold onto. Everything the picture CLAIMS is decided here, as
 * plain data a unit test can assert on — the template below it only turns these fields into
 * markup, and the browser only rasterises what the template says:
 *
 *  - **Bars share ONE time scale across all charts** (`pipelineScaleMaxS`): a bar's
 *    `scaleFraction` is its total over the slowest charted total in the RUN, not in the
 *    suite. Scaling each chart to its own maximum would make three unrelated pictures out
 *    of one comparison.
 *  - **Segment order is the suite's real execution order**, one segment per task, coloured
 *    on the ordinal ramp by the phase's position IN THIS SUITE — later here is darker here,
 *    so "color order = execution order" is true by construction (a fixed phase→colour map
 *    could not promise that: suites disagree about order — openclaw checks before it tests).
 *  - **Rows are sorted fastest-first and the fastest is flagged.**
 *  - **Environments that did not complete the suite are listed under the bars** with their
 *    outcome and reason. Dropping them would turn a chart that discloses its gaps into one
 *    that appears to have none.
 */
import type { FigureProvider, PipelineSuite, RealworldFigureModel } from "../model.ts";
import type { PhaseId } from "../phases.ts";
import { PHASE_RAMP, phaseOf } from "../phases.ts";
import { formatSeconds } from "./format.ts";

/** One task's slice of a bar. `share` is the task's fraction OF ITS OWN BAR (the p50 over
 *  the bar's total), so a template can hand it straight to `flex-grow` and let the layout
 *  engine distribute the track. */
export interface ChartSegment {
	/** The task's registry id, carried for the segment's `title` tooltip. */
	readonly task: string;
	readonly share: number;
	readonly color: string;
}

/** One environment's whole pipeline, as one stacked bar. */
export interface ChartBar {
	/** Display label. Off-spec providers carry the report's dagger: `name †`. */
	readonly label: string;
	/** Formatted total, e.g. `61.9 s` — the sum of the segments' medians. */
	readonly total: string;
	/** This bar's length as a fraction of the SHARED scale (the run's slowest charted
	 *  total), so a second is the same length in every chart drawn from the same run. */
	readonly scaleFraction: number;
	/** True on every bar whose total equals the suite's best — the page's badge rule. */
	readonly fastest: boolean;
	readonly segments: readonly ChartSegment[];
}

/** An environment disclosed as not having completed the suite: outcome and reason, no bar. */
export interface ChartIncompleteRow {
	readonly label: string;
	readonly outcome: string;
	readonly reason: string;
}

export interface PipelineChartModel {
	/** The suite's registry id, e.g. `realworld-better-auth`. Names the output file. */
	readonly suiteId: string;
	/** Display name from the tasks' catalog labels, e.g. `Better-Auth`. */
	readonly suiteName: string;
	/** The eyebrow under the title: `10 tasks · git clone → cold install → …`. */
	readonly summary: string;
	/** The authored paragraph. May carry inline `**bold**` and `` `code` `` markdown, which
	 *  the template renders. */
	readonly note: string;
	/** The disk-requirement aside appended to the note, or null when the suite has none. */
	readonly diskNote: string | null;
	/** One swatch per phase PRESENT in this suite, in execution order. */
	readonly legend: readonly { readonly label: string; readonly color: string }[];
	readonly legendNote: string;
	/** Sorted fastest-first. */
	readonly bars: readonly ChartBar[];
	readonly incomplete: readonly ChartIncompleteRow[];
}

/**
 * The provider a chart row names. The model builder maps rows and providers from the same
 * validated set, so this cannot miss on its output — it throws rather than asserting because
 * the alternative under `noUncheckedIndexedAccess` is a `!` that would read `undefined.name`
 * and crash with no clue which row was at fault.
 */
function requireProvider(
	byId: ReadonlyMap<string, FigureProvider>,
	providerId: string,
): FigureProvider {
	const provider = byId.get(providerId);
	if (!provider) {
		throw new Error(`pipeline chart names provider "${providerId}", which the run does not list`);
	}
	return provider;
}

/** The off-spec badge on the provider name is a bordered pill on the page; the report and
 *  these charts draw it as the plain dagger. The disclosure survives either way, which is
 *  the part that matters. */
function providerLabel(provider: FigureProvider): string {
	return provider.specMatched ? provider.name : `${provider.name} †`;
}

/** Shared x-scale across the pipeline charts: the slowest charted total in the run — and 0,
 *  not `Math.max()`'s -Infinity, for a model with nothing charted: a caller sizing an axis or
 *  printing the scale must never see a sentinel that renders as "-Infinity". */
export function pipelineScaleMaxSOf(model: RealworldFigureModel): number {
	const totals = model.suites.flatMap((s) => s.bars.map((b) => b.totalS));
	return totals.length === 0 ? 0 : Math.max(...totals);
}

export function buildPipelineChartModel(
	suite: PipelineSuite,
	model: RealworldFigureModel,
	suiteNote: string,
): PipelineChartModel {
	const providerById = new Map(model.providers.map((p) => [p.id, p]));
	const pipelineScaleMaxS = pipelineScaleMaxSOf(model);
	const bars = [...suite.bars].sort((a, b) => a.totalS - b.totalS);
	const bestTotal = bars[0]?.totalS ?? 0;
	// THIS suite's phases, in THIS suite's execution order (first occurrence over its own
	// tasks) — never a run-wide order, which another suite's sorting could have set and which
	// would print an execution order this suite does not have.
	const presentPhases: PhaseId[] = [];
	for (const task of suite.tasks) {
		if (!presentPhases.includes(task.phase)) presentPhases.push(task.phase);
	}
	// Ordinal colour: position in this suite's own phase sequence. PHASE_RAMP carries one
	// shade per vocabulary entry, so the index cannot run off the end.
	const colorOf = (phase: PhaseId): string => PHASE_RAMP[presentPhases.indexOf(phase)] as string;
	// "4 of 5 tasks" when the suite declares tasks nobody completed — the drop itself is
	// disclosed in the caption; the eyebrow keeps the count honest at a glance.
	const declared = suite.tasks.length + suite.droppedTasks.length;
	const taskCount =
		suite.droppedTasks.length === 0
			? `${suite.tasks.length} tasks`
			: `${suite.tasks.length} of ${declared} tasks`;

	return {
		suiteId: suite.id,
		suiteName: suite.name,
		summary: `${taskCount} · ${presentPhases.map((p) => phaseOf(p).label).join(" → ")}`,
		note: suiteNote,
		diskNote: suite.minDiskGb === null ? null : `Needs ${suite.minDiskGb} GB free disk.`,
		legend: presentPhases.map((phase) => ({
			label: phaseOf(phase).label,
			color: colorOf(phase),
		})),
		legendNote: "color order = execution order",
		// The zero guards below are about arithmetic, not plausibility: a schema-valid 0 makes
		// 0/0 NaN — which CSS reads as a broken flex/width, silently collapsing the bar. A
		// zero-duration bar or segment draws at zero width instead.
		bars: bars.map((bar) => ({
			label: providerLabel(requireProvider(providerById, bar.provider)),
			total: formatSeconds(bar.totalS),
			scaleFraction: pipelineScaleMaxS > 0 ? bar.totalS / pipelineScaleMaxS : 0,
			fastest: bar.totalS === bestTotal,
			segments: bar.segments.map((segment) => ({
				task: segment.id,
				share: bar.totalS > 0 ? segment.p50 / bar.totalS : 0,
				color: colorOf(segment.phase),
			})),
		})),
		incomplete: suite.incomplete.map((row) => ({
			label: providerLabel(requireProvider(providerById, row.provider)),
			outcome: row.outcome,
			reason: row.reason,
		})),
	};
}
