/**
 * The view-model for one ranked metric chart: a horizontal bar per environment, best first.
 *
 * As with the pipeline chart, everything the picture CLAIMS is decided here as plain data, and
 * the template only marks it up:
 *
 *  - **Bars are the board's own order** — rank-sorted, best first — and every row the board
 *    ranked first wears the badge. A statistical tie at the top is two badges, not one, because
 *    the board could not tell them apart and the chart must not pretend it can.
 *  - **The scale is this metric's own**: a bar's `scaleFraction` is its value over the chart's
 *    scale maximum, which is the largest interval bound IN THIS CHART — but never more than
 *    {@link WHISKER_OVERRUN} times the largest value. Metrics have different units, so there is
 *    no shared scale to keep — the caption says so. The cap is what keeps one wide interval
 *    (a 93× bound has been published) from shrinking every bar to a sliver.
 *  - **The interval is drawn as a whisker** from `lo` to `hi` on the same scale. A bound past the
 *    scale maximum is CUT at the chart's edge (fraction 1), and the legend discloses the cut.
 *  - **Environments without a result are listed under the bars** with outcome and reason.
 */

import type { MetricFigure, MetricFigureModel } from "../metric-model.ts";
import type { FigureProvider } from "../model.ts";
import { PHASE_RAMP } from "../phases.ts";
import { formatMetricValue } from "./format.ts";

/** The one bar colour. Every environment is the same series — the metric — so there is one hue;
 *  identity is the label, not the paint. The mid step of the brand ramp. */
export const METRIC_BAR_COLOR: string = PHASE_RAMP[2];
/** The whisker's ink. */
export const METRIC_WHISKER_COLOR = "#222222";
/** How far past the longest bar the scale may stretch to fit a whisker, in percent of the
 *  largest value. An integer percentage so the cap is exact arithmetic (`× 115 / 100`), not a
 *  binary-float `× 1.15` that lands a hair under the intended bound. */
export const WHISKER_OVERRUN_PERCENT = 15;

export interface MetricChartBar {
	/** Display label. Off-spec providers carry the report's dagger: `name †`. */
	readonly label: string;
	readonly isolation?: FigureProvider["isolation"];
	/** Formatted value with its unit, e.g. `24.27 runs/s`. */
	readonly value: string;
	/** This bar's length as a fraction of the chart's largest value. */
	readonly scaleFraction: number;
	/** The interval's ends on the same scale, or null when no interval was estimable. Both cut
	 *  to [0, 1]; `clipped` says whether the cut changed anything. */
	readonly interval: { readonly lo: number; readonly hi: number; readonly clipped: boolean } | null;
	/** True on every row the board ranked first. */
	readonly best: boolean;
	readonly rank: number;
}

export interface MetricChartModel {
	/** The catalog id. Names the output file. */
	readonly metricId: string;
	readonly dimension: string;
	/** The chart's title — the catalog label. */
	readonly title: string;
	/** The eyebrow: `cpu · runs/s · higher is better · 12 environments`. */
	readonly summary: string;
	/** The authored paragraph; inline `**bold**` and `` `code` `` markdown allowed. */
	readonly note: string;
	readonly legend: readonly { readonly label: string; readonly color: string }[];
	readonly legendNote: string;
	/** Best first. */
	readonly bars: readonly MetricChartBar[];
	readonly unmeasured: readonly {
		readonly label: string;
		readonly isolation?: FigureProvider["isolation"];
		readonly outcome: string;
		readonly reason: string;
	}[];
}

function requireProvider(
	byId: ReadonlyMap<string, FigureProvider>,
	providerId: string,
): FigureProvider {
	const provider = byId.get(providerId);
	if (!provider) {
		throw new Error(`metric chart names provider "${providerId}", which the run does not list`);
	}
	return provider;
}

function presentation(provider: FigureProvider): {
	label: string;
	isolation?: FigureProvider["isolation"];
} {
	return {
		label: provider.specMatched ? provider.name : `${provider.name} †`,
		...(provider.isolation ? { isolation: provider.isolation } : {}),
	};
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function buildMetricChartModel(
	figure: MetricFigure,
	model: MetricFigureModel,
	note: string,
): MetricChartModel {
	const providerById = new Map(model.providers.map((p) => [p.id, p]));
	// The chart's own maximum: the widest interval bound, capped at WHISKER_OVERRUN × the largest
	// value so one wide interval cannot shrink every bar. 0 for an all-zero metric keeps the
	// fractions finite.
	const largestValue = Math.max(0, ...figure.rows.map((row) => row.value));
	const largestBound = Math.max(0, ...figure.rows.map((row) => row.hi));
	const scaleMax = Math.min(largestBound, (largestValue * (100 + WHISKER_OVERRUN_PERCENT)) / 100);
	const fraction = (value: number): number => (scaleMax > 0 ? clamp01(value / scaleMax) : 0);
	const bestRank = figure.rows[0]?.rank;
	const better = figure.direction === "HIB" ? "higher is better" : "lower is better";
	const environments = `${figure.rows.length} environment${figure.rows.length === 1 ? "" : "s"}`;
	const bars = figure.rows.map((row): MetricChartBar => {
		const hasInterval = row.lo !== row.hi;
		const interval = hasInterval
			? {
					lo: fraction(row.lo),
					hi: fraction(row.hi),
					clipped: scaleMax > 0 && (row.hi > scaleMax || row.lo < 0),
				}
			: null;
		return {
			...presentation(requireProvider(providerById, row.provider)),
			value: `${formatMetricValue(row.value)} ${figure.unit}`,
			scaleFraction: fraction(row.value),
			interval,
			best: row.rank === bestRank,
			rank: row.rank,
		};
	});
	const anyInterval = bars.some((bar) => bar.interval !== null);
	const anyClipped = bars.some((bar) => bar.interval?.clipped === true);
	// A chart of single observations (a published price per environment) has no median in it, and
	// the legend must not claim one.
	const singleObservations = figure.rows.every((row) => row.n === 1);
	return {
		metricId: figure.id,
		dimension: figure.dimension,
		title: figure.label,
		summary: `${figure.dimension} · ${figure.unit} · ${better} · ${environments}${figure.headline ? " · headline" : ""}`,
		note,
		legend: [
			{
				label: singleObservations ? "retained value" : "median across sandboxes",
				color: METRIC_BAR_COLOR,
			},
			...(anyInterval ? [{ label: "95% interval", color: METRIC_WHISKER_COLOR }] : []),
		],
		legendNote: `sorted best first${anyClipped ? " · interval cut at chart edge" : ""}`,
		bars,
		unmeasured: figure.unmeasured.map((row) => ({
			...presentation(requireProvider(providerById, row.provider)),
			outcome: row.outcome,
			reason: row.reason,
		})),
	};
}
