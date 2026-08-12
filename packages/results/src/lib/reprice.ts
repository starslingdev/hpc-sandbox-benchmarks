import type { MetricResult, Run } from "@sandbox-benchmarks/schema";
import {
	deriveEconomics,
	ECONOMICS_METRIC_IDS,
	getProvider,
	isDerivedMetric,
	parseRun,
} from "@sandbox-benchmarks/schema";

const ECONOMICS_IDS = new Set<string>(Object.values(ECONOMICS_METRIC_IDS));

/** Replace only derivable economics in a historical Run, preserving its schema version and evidence. */
export function rederiveRunEconomics(run: Run): Run {
	if (
		run.providers.some((provider) =>
			provider.metrics.some((metric) => metric.metricId === ECONOMICS_METRIC_IDS.usdPerComputeRun),
		)
	) {
		throw new Error(
			"cannot reprice a Run containing usd_per_compute_run: whole-pipeline runtime is not retained",
		);
	}

	const keepDerivedMarker = Number(run.schemaVersion) >= 4;
	const providers = run.providers.map((provider) => {
		const retained = provider.metrics.filter((metric) => !ECONOMICS_IDS.has(metric.metricId));
		const measured = retained.filter((metric) => !isDerivedMetric(metric));
		const metrics: MetricResult[] = [...retained];
		const meta = getProvider(provider.providerId);
		if (meta && measured.length > 0) {
			for (const economics of deriveEconomics(
				meta,
				measured.map((metric) => ({ metricId: metric.metricId, mean: metric.aggregates.mean })),
				undefined,
				run.targetSpec,
			)) {
				if (keepDerivedMarker) metrics.push(economics);
				else {
					const { derived: _derived, ...legacyEconomics } = economics;
					metrics.push(legacyEconomics);
				}
			}
		}
		metrics.sort((a, b) => a.metricId.localeCompare(b.metricId));
		return { ...provider, metrics };
	});

	return parseRun({ ...run, providers });
}
