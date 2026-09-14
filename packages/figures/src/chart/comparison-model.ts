/**
 * The view-model for one comparison chart: each environment as a pair of stacked pipeline bars,
 * the older run's above the newer run's, each chipped with its run label, and the change in
 * the summed medians printed beside the newer bar.
 *
 * Decisions, as data:
 *
 *  - **Rows sort by the newer run's total, fastest first.** Environments charted only in the
 *    older run follow, sorted by that total. The chart is read top-down as "where things stand
 *    now"; the older bar in each row is the reference.
 *  - **One scale for both runs**: a bar's `scaleFraction` is its total over the slowest bar of
 *    EITHER run in this suite. That is the whole point — a shift in the distribution is a
 *    visible change in length only if both runs are drawn on one scale.
 *  - **The older run's bars are drawn faded** so the pair reads as reference → current without
 *    a second colour ramp; the chip on every bar names the run regardless.
 *  - **`fastest` is per run**: the fastest bar in each run wears the badge, so a reader can
 *    see whether the leader changed as well as whether everyone moved.
 *  - **The delta is the newer total against the older**, signed, as a percentage; negative is
 *    faster. Printed only where both bars exist.
 */

import type { ComparisonFigureModel, ComparisonSuite } from "../comparison-model.ts";
import type { FigureIsolation, FigureProvider } from "../model.ts";
import type { PhaseId } from "../phases.ts";
import { PHASE_RAMP, phaseOf } from "../phases.ts";
import { formatSeconds } from "./format.ts";
import type { ChartSegment } from "./model.ts";

export interface ComparisonChartBar {
	/** The run's chip label, e.g. `Sep 2026`. */
	readonly runLabel: string;
	readonly total: string;
	/** Against the slowest bar of either run in this suite. */
	readonly scaleFraction: number;
	readonly segments: readonly ChartSegment[];
	/** The fastest bar of ITS run. */
	readonly fastest: boolean;
	/** True on the older run's bars — drawn lighter. */
	readonly faded: boolean;
}

export interface ComparisonChartRow {
	readonly label: string;
	readonly isolation?: FigureIsolation;
	/** The older run's bar, or the run label and reason when it did not complete the suite. */
	readonly before:
		| { readonly bar: ComparisonChartBar }
		| { readonly runLabel: string; readonly outcome: string; readonly reason: string };
	readonly after:
		| { readonly bar: ComparisonChartBar }
		| { readonly runLabel: string; readonly outcome: string; readonly reason: string };
	/** Signed change of the newer summed median against the older, e.g. `-12.3%`. Null when
	 *  either side is missing. */
	readonly delta: {
		readonly text: string;
		readonly direction: "faster" | "slower" | "same";
	} | null;
}

export interface ComparisonChartModel {
	readonly suiteId: string;
	readonly suiteName: string;
	readonly before: { readonly id: string; readonly label: string };
	readonly after: { readonly id: string; readonly label: string };
	/** The eyebrow: `8 tasks · git clone → … · Aug 2026 vs Sep 2026`. */
	readonly summary: string;
	readonly note: string;
	readonly diskNote: string | null;
	readonly legend: readonly { readonly label: string; readonly color: string }[];
	readonly legendNote: string;
	readonly rows: readonly ComparisonChartRow[];
	/** Environments that completed the suite in neither run. */
	readonly incomplete: readonly {
		readonly label: string;
		readonly isolation?: FigureIsolation;
		/** One line per run that recorded a reason. */
		readonly reasons: readonly {
			readonly runLabel: string;
			readonly outcome: string;
			readonly reason: string;
		}[];
	}[];
}

function requireProvider(
	byId: ReadonlyMap<string, FigureProvider>,
	providerId: string,
): FigureProvider {
	const provider = byId.get(providerId);
	if (!provider) {
		throw new Error(`comparison chart names provider "${providerId}", which neither run lists`);
	}
	return provider;
}

function presentation(provider: FigureProvider): { label: string; isolation?: FigureIsolation } {
	return {
		label: provider.specMatched ? provider.name : `${provider.name} †`,
		...(provider.isolation ? { isolation: provider.isolation } : {}),
	};
}

/** The same wording the pipeline chart's disclosure row uses for a hole nobody marked. */
const UNMARKED = "No result and no marker: the suite never reported for this provider.";

export function buildComparisonChartModel(
	suite: ComparisonSuite,
	model: ComparisonFigureModel,
	note: string,
): ComparisonChartModel {
	const providerById = new Map(model.providers.map((p) => [p.id, p]));
	const presentPhases: PhaseId[] = [];
	for (const task of suite.tasks) {
		if (!presentPhases.includes(task.phase)) presentPhases.push(task.phase);
	}
	const colorOf = (phase: PhaseId): string => PHASE_RAMP[presentPhases.indexOf(phase)] as string;

	const totals = suite.rows.flatMap((row) =>
		[row.before, row.after].flatMap((bar) => (bar ? [bar.totalS] : [])),
	);
	const scaleMaxS = totals.length === 0 ? 0 : Math.max(...totals);
	const bestOf = (side: "before" | "after"): number =>
		Math.min(...suite.rows.flatMap((row) => (row[side] ? [row[side].totalS] : [])));
	const best = { before: bestOf("before"), after: bestOf("after") };
	const runs = { before: model.before, after: model.after };

	const rows = [...suite.rows]
		.sort((a, b) => {
			// Newer total first; environments without one after those that have one.
			const keyA = a.after?.totalS ?? Number.POSITIVE_INFINITY;
			const keyB = b.after?.totalS ?? Number.POSITIVE_INFINITY;
			return (
				keyA - keyB ||
				(a.before?.totalS ?? Number.POSITIVE_INFINITY) -
					(b.before?.totalS ?? Number.POSITIVE_INFINITY) ||
				a.provider.localeCompare(b.provider, "en")
			);
		})
		.map((row): ComparisonChartRow => {
			const provider = requireProvider(providerById, row.provider);
			const side = (which: "before" | "after"): ComparisonChartRow["before"] => {
				const bar = row[which];
				if (!bar) {
					return { runLabel: runs[which].label, outcome: "not completed", reason: UNMARKED };
				}
				return {
					bar: {
						runLabel: runs[which].label,
						total: formatSeconds(bar.totalS),
						scaleFraction: scaleMaxS > 0 ? bar.totalS / scaleMaxS : 0,
						segments: bar.segments.map((segment) => ({
							task: segment.id,
							share: bar.totalS > 0 ? segment.p50 / bar.totalS : 0,
							color: colorOf(segment.phase),
						})),
						fastest: bar.totalS === best[which],
						faded: which === "before",
					},
				};
			};
			let delta: ComparisonChartRow["delta"] = null;
			if (row.before && row.after && row.before.totalS > 0) {
				const change = (row.after.totalS / row.before.totalS - 1) * 100;
				const rounded = Number(change.toFixed(1));
				const direction = rounded < 0 ? "faster" : rounded > 0 ? "slower" : "same";
				delta = {
					text: `${rounded > 0 ? "+" : ""}${rounded.toFixed(1)}%`,
					direction,
				};
			}
			return { ...presentation(provider), before: side("before"), after: side("after"), delta };
		});

	const declared = suite.tasks.length;
	return {
		suiteId: suite.id,
		suiteName: suite.name,
		before: { id: model.before.id, label: model.before.label },
		after: { id: model.after.id, label: model.after.label },
		summary: `${declared} task${declared === 1 ? "" : "s"} · ${presentPhases.map((p) => phaseOf(p).label).join(" → ")} · ${model.before.label} vs ${model.after.label}`,
		note,
		diskNote: suite.minDiskGb === null ? null : `Needs ${suite.minDiskGb} GB free disk.`,
		legend: presentPhases.map((phase) => ({ label: phaseOf(phase).label, color: colorOf(phase) })),
		legendNote: `color order = execution order · lighter = ${model.before.label}`,
		rows,
		incomplete: suite.incomplete.map((entry) => ({
			...presentation(requireProvider(providerById, entry.provider)),
			reasons: (["before", "after"] as const).flatMap((which) => {
				const recorded = entry[which];
				return recorded ? [{ runLabel: runs[which].label, ...recorded }] : [];
			}),
		})),
	};
}
