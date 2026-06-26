/**
 * Cross-run stability gate: compare a provider's metrics between two {@link Run}s and flag movements
 * beyond a noise threshold. Provider performance drifts and PTS profiles get re-versioned, so a silent
 * shift would erode trust in the dataset.
 *
 * Provenance is load-bearing. A metric is only comparable when its `appVersion` AND `arguments` match
 * across the two Runs — otherwise the profile/option matrix changed and a value move is expected, not a
 * regression. Such pairs are classified `incomparable` (reported, never a gate failure). Derived metrics
 * (economics) are excluded: they carry no measurement provenance and would double-count the measured
 * shift they're computed from.
 *
 * SDK-free: the Run model + the Catalog (for each metric's Direction) only.
 */
import type { Direction, Run } from "@sandbox-benchmarks/schema";
import { getMetric } from "@sandbox-benchmarks/schema";

/** The default noise threshold (relative): movements within ±10% are treated as stable. */
export const DEFAULT_THRESHOLD = 0.1;

/** How a metric moved between two Runs for one provider. */
export interface MetricShift {
	providerId: string;
	metricId: string;
	direction: Direction;
	/** Representative (p50) values in the previous and current Run. */
	previous: number;
	current: number;
	/** Signed relative change `(current - previous) / previous` (Infinity when previous is 0). */
	relativeChange: number;
	classification: "regression" | "improvement" | "stable" | "incomparable";
	/** Why a pair is `incomparable` — the provenance that changed. */
	note?: string;
}

export interface CompareRunsOptions {
	/** Relative movement (e.g. 0.1 = 10%) under which a change is `stable`. Defaults to {@link DEFAULT_THRESHOLD}. */
	threshold?: number;
}

/**
 * Compare every measured metric present for the same provider in both Runs. Returns one
 * {@link MetricShift} per comparable (and per incomparable) metric, in provider-then-metric order.
 */
export function compareRuns(
	previous: Run,
	current: Run,
	options?: CompareRunsOptions,
): MetricShift[] {
	const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
	const prevByProvider = new Map(previous.providers.map((p) => [p.providerId, p]));
	const shifts: MetricShift[] = [];

	for (const cur of current.providers) {
		const prev = prevByProvider.get(cur.providerId);
		if (!prev) continue;
		const prevMetrics = new Map(prev.metrics.map((m) => [m.metricId, m]));

		for (const curMetric of cur.metrics) {
			const def = getMetric(curMetric.metricId);
			// Derived metrics (economics) carry no provenance and mirror a measured shift — skip them.
			if (def?.derived === true) continue;
			const prevMetric = prevMetrics.get(curMetric.metricId);
			if (!prevMetric) continue;

			const direction: Direction = def?.direction ?? "HIB";
			const base = {
				providerId: cur.providerId,
				metricId: curMetric.metricId,
				direction,
				previous: prevMetric.aggregates.p50,
				current: curMetric.aggregates.p50,
			};

			// Apples-to-apples only when the profile version AND option arguments are unchanged.
			if (
				prevMetric.appVersion !== curMetric.appVersion ||
				prevMetric.arguments !== curMetric.arguments
			) {
				shifts.push({
					...base,
					relativeChange: Number.NaN,
					classification: "incomparable",
					note: `provenance changed (appVersion ${prevMetric.appVersion ?? "-"}→${curMetric.appVersion ?? "-"}, arguments ${prevMetric.arguments ?? "-"}→${curMetric.arguments ?? "-"})`,
				});
				continue;
			}

			const { previous: p, current: c } = base;
			const relativeChange = p === 0 ? (c === 0 ? 0 : Number.POSITIVE_INFINITY) : (c - p) / p;
			let classification: MetricShift["classification"];
			if (Math.abs(relativeChange) <= threshold) {
				classification = "stable";
			} else {
				// "Worse" depends on Direction: HIB regresses when it falls, LIB when it rises.
				const worse = direction === "HIB" ? c < p : c > p;
				classification = worse ? "regression" : "improvement";
			}
			shifts.push({ ...base, relativeChange, classification });
		}
	}

	return shifts;
}

/** Only the regressions from {@link compareRuns} — what a CI gate fails on. */
export function regressions(shifts: readonly MetricShift[]): MetricShift[] {
	return shifts.filter((s) => s.classification === "regression");
}

/** One human-readable line per shift, for CLI/CI logs. */
export function describeShift(shift: MetricShift): string {
	if (shift.classification === "incomparable") {
		return `~ ${shift.providerId}/${shift.metricId}: incomparable — ${shift.note}`;
	}
	const pct = `${(shift.relativeChange * 100).toFixed(1)}%`;
	const mark =
		shift.classification === "regression"
			? "✗"
			: shift.classification === "improvement"
				? "✓"
				: "·";
	return `${mark} ${shift.providerId}/${shift.metricId}: ${shift.previous} → ${shift.current} (${pct}, ${shift.classification})`;
}
