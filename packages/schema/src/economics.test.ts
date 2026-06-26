import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import type { ProviderMeta } from "./index.ts";
import {
	deriveEconomics,
	ECONOMICS_METRIC_IDS,
	economicsMetrics,
	getMetric,
	getProvider,
	HARNESS_METRIC_IDS,
	headlineMetric,
	hourlyCostAtTargetSpec,
	METRIC_CATALOG,
	metricDefSchema,
	metricResultSchema,
	metricsForDimension,
} from "./index.ts";

describe("economics catalog slice", () => {
	it("ECONOMICS_METRIC_IDS and economicsMetrics describe the same id set", () => {
		const idValues = new Set(Object.values(ECONOMICS_METRIC_IDS));
		const defIds = new Set(economicsMetrics.map((m) => m.id));
		expect(defIds).toEqual(idValues);
		expect(economicsMetrics.length).toBe(idValues.size);
	});

	it("registers every economics Metric as a valid, derived, non-PTS economics MetricDef", () => {
		for (const def of economicsMetrics) {
			expect(metricDefSchema(def)).not.toBeInstanceOf(type.errors);
			expect(METRIC_CATALOG).toContainEqual(def);
			expect(def.dimension).toBe("economics");
			// Economics is computed from pricing + measured runtime, never parsed or timed.
			expect(def.derived).toBe(true);
			expect(def.pts).toBeUndefined();
		}
	});

	it("headlines usd_per_hour for the economics dimension, exactly once", () => {
		expect(headlineMetric("economics").id).toBe(ECONOMICS_METRIC_IDS.usdPerHour);
		expect(metricsForDimension("economics").filter((m) => m.headline).length).toBe(1);
	});
});

describe("deriveEconomics", () => {
	it("emits usd_per_hour = hourlyCostAtTargetSpec for a vetted-rate provider with no lifecycle data", () => {
		const meta = getProvider("e2b");
		const measured = [{ metricId: "node_web_tooling_runs_per_s", mean: 10.5 }];
		const econ = deriveEconomics(meta, measured);

		expect(econ.map((m) => m.metricId)).toEqual([ECONOMICS_METRIC_IDS.usdPerHour]);
		expect(econ[0]?.samples).toEqual([hourlyCostAtTargetSpec(meta) ?? Number.NaN]);
		// Each derived result is a valid single-Sample MetricResult.
		for (const r of econ) expect(metricResultSchema(r)).not.toBeInstanceOf(type.errors);
	});

	it("adds usd_per_lifecycle = hourly × summed lifecycle ms when lifecycle Metrics are present", () => {
		const meta = getProvider("daytona");
		const hourly = hourlyCostAtTargetSpec(meta) ?? Number.NaN;
		const measured = [
			{ metricId: HARNESS_METRIC_IDS.spawn, mean: 1000 },
			{ metricId: HARNESS_METRIC_IDS.exec, mean: 500 },
			// A non-lifecycle measured Metric must not feed the lifecycle sum.
			{ metricId: "node_web_tooling_runs_per_s", mean: 10.5 },
		];
		const econ = deriveEconomics(meta, measured);

		const lifecycle = econ.find((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerLifecycle);
		expect(lifecycle?.samples[0]).toBeCloseTo(hourly * (1500 / 3_600_000), 12);
		// Headline hourly cost is still present alongside it.
		expect(econ.map((m) => m.metricId)).toContain(ECONOMICS_METRIC_IDS.usdPerHour);
	});

	it("omits usd_per_lifecycle when no lifecycle Metric was measured", () => {
		const econ = deriveEconomics(getProvider("modal"), [
			{ metricId: HARNESS_METRIC_IDS.controlPlaneInfo, mean: 42 },
		]);
		// control-plane timings are not lifecycle runtime, so no per-lifecycle cost.
		expect(econ.map((m) => m.metricId)).toEqual([ECONOMICS_METRIC_IDS.usdPerHour]);
	});

	it("returns nothing for a provider with no vetted rate (a null rate must never read as free)", () => {
		const unpriced: ProviderMeta = {
			...getProvider("e2b"),
			pricing: { model: "unknown", notes: "no vetted rate" },
		};
		expect(deriveEconomics(unpriced, [{ metricId: HARNESS_METRIC_IDS.spawn, mean: 1000 }])).toEqual(
			[],
		);
	});

	it("keeps every lifecycle harness Metric in the lifecycle sum", () => {
		// Guards the LIFECYCLE_METRIC_IDS set: each lifecycle-dimension harness Metric contributes.
		const meta = getProvider("daytona");
		const hourly = hourlyCostAtTargetSpec(meta) ?? Number.NaN;
		const lifecycleIds = Object.values(HARNESS_METRIC_IDS).filter(
			(id) => getMetric(id)?.dimension === "lifecycle",
		);
		const measured = lifecycleIds.map((metricId) => ({ metricId, mean: 100 }));
		const econ = deriveEconomics(meta, measured);
		const lifecycle = econ.find((m) => m.metricId === ECONOMICS_METRIC_IDS.usdPerLifecycle);
		expect(lifecycle?.samples[0]).toBeCloseTo(
			hourly * ((100 * lifecycleIds.length) / 3_600_000),
			12,
		);
	});
});
