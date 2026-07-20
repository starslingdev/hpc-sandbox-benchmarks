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
import { getMetric, LEGACY_PROVIDER_ALIASES } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/** The default noise threshold (relative): movements within ±10% are treated as stable. */
export const DEFAULT_THRESHOLD = 0.1;

/**
 * How a current p50 relates to the previous one, as an explicit state rather than a sentinel number.
 * A previous value of 0 has no ratio, so that case is its own arm — Infinity never leaks into the
 * reported percentage or the gate decision. arktype is the single source of truth for the shape (the
 * {@link Comparison} type is inferred from it).
 */
const comparisonSchema = type({
	status: "'comparable'",
	/** Signed relative change `(current - previous) / previous`. */
	relativeChange: "number",
})
	.or({
		// Previous and current p50 are both 0 — identical, no movement.
		status: "'unchanged'",
	})
	.or({
		// Previous p50 was 0 while current is not — no ratio exists; only the absolute current is meaningful.
		status: "'no-baseline'",
		current: "number",
	});

/** One of the three comparison states — see {@link comparisonSchema}. */
type Comparison = typeof comparisonSchema.infer;

/** Relate a current p50 to a previous one without ever producing a non-finite `relativeChange`. */
function compareP50(previous: number, current: number): Comparison {
	if (previous !== 0) {
		return { status: "comparable", relativeChange: (current - previous) / previous };
	}
	return current === 0 ? { status: "unchanged" } : { status: "no-baseline", current };
}

/** How a metric moved between two Runs for one provider. */
export interface MetricShift {
	providerId: string;
	metricId: string;
	direction: Direction;
	/** Representative (p50) values in the previous and current Run. */
	previous: number;
	current: number;
	/** Signed relative change `(current - previous) / previous`; `NaN` when the pair is incomparable. */
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
	// Canonicalize retired provider ids (LEGACY_PROVIDER_ALIASES, e.g. daytona -> daytona-vm) on both
	// sides, so a comparison spanning a variant rename still matches the previous run's `daytona` entry
	// to the new run's `daytona-vm` and keeps that provider's regression history continuous.
	const canonicalId = (id: string): string => LEGACY_PROVIDER_ALIASES[id] ?? id;
	const prevByProvider = new Map(previous.providers.map((p) => [canonicalId(p.providerId), p]));
	const shifts: MetricShift[] = [];

	for (const cur of current.providers) {
		const prev = prevByProvider.get(canonicalId(cur.providerId));
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
			const provenanceParts: string[] = [];
			if (prevMetric.appVersion !== curMetric.appVersion) {
				provenanceParts.push(
					`appVersion ${prevMetric.appVersion ?? "-"}→${curMetric.appVersion ?? "-"}`,
				);
			}
			if (prevMetric.arguments !== curMetric.arguments) {
				provenanceParts.push(
					`arguments ${prevMetric.arguments ?? "-"}→${curMetric.arguments ?? "-"}`,
				);
			}
			if (provenanceParts.length > 0) {
				shifts.push({
					...base,
					relativeChange: Number.NaN,
					classification: "incomparable",
					// Only name the field(s) that actually changed, so an unchanged field isn't implied to differ.
					note: `provenance changed (${provenanceParts.join(", ")})`,
				});
				continue;
			}

			const { previous: p, current: c } = base;
			const comparison = compareP50(p, c);
			if (comparison.status === "no-baseline") {
				// Previous p50 was 0: with no baseline there is no ratio to threshold, so surface it as
				// incomparable (reported, never a gate failure) rather than inventing an Infinity regression.
				shifts.push({
					...base,
					relativeChange: Number.NaN,
					classification: "incomparable",
					note: `no baseline (previous p50 was 0, current ${c})`,
				});
				continue;
			}
			const relativeChange = comparison.status === "comparable" ? comparison.relativeChange : 0;
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
