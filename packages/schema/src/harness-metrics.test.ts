import { describe, expect, it } from "bun:test";
import { type } from "arktype";
import {
	getMetric,
	HARNESS_METRIC_IDS,
	harnessMetrics,
	headlineMetric,
	METRIC_CATALOG,
	metricDefSchema,
	metricsForDimension,
} from "./index.ts";

describe("harness-measured metrics", () => {
	it("every HARNESS_METRIC_IDS value resolves to a catalogued, non-PTS, lower-is-better ms Metric", () => {
		for (const id of Object.values(HARNESS_METRIC_IDS)) {
			const metric = getMetric(id);
			expect(metric, `catalog is missing ${id}`).toBeDefined();
			// Harness Metrics are populated from timings, never a parsed PTS <Result>.
			expect(metric?.pts).toBeUndefined();
			expect(metric?.unit).toBe("ms");
			expect(metric?.direction).toBe("LIB");
		}
	});

	it("HARNESS_METRIC_IDS and harnessMetrics describe the same id set", () => {
		const idValues = new Set(Object.values(HARNESS_METRIC_IDS));
		const defIds = new Set(harnessMetrics.map((m) => m.id));
		expect(defIds).toEqual(idValues);
		// No stray non-harness id slipped into the array.
		expect(harnessMetrics.length).toBe(idValues.size);
	});

	it("places the lifecycle ops in the lifecycle dimension and the control-plane ops in control-plane", () => {
		expect(getMetric(HARNESS_METRIC_IDS.spawn)?.dimension).toBe("lifecycle");
		expect(getMetric(HARNESS_METRIC_IDS.exec)?.dimension).toBe("lifecycle");
		expect(getMetric(HARNESS_METRIC_IDS.snapshot)?.dimension).toBe("lifecycle");
		expect(getMetric(HARNESS_METRIC_IDS.teardown)?.dimension).toBe("lifecycle");
		expect(getMetric(HARNESS_METRIC_IDS.controlPlaneInfo)?.dimension).toBe("control-plane");
		expect(getMetric(HARNESS_METRIC_IDS.controlPlaneList)?.dimension).toBe("control-plane");
	});

	it("headlines spawn for lifecycle and sandbox-info for control-plane", () => {
		expect(headlineMetric("lifecycle").id).toBe(HARNESS_METRIC_IDS.spawn);
		expect(headlineMetric("control-plane").id).toBe(HARNESS_METRIC_IDS.controlPlaneInfo);
		// Exactly one headline per harness dimension (catalog.ts also fails fast on a second).
		for (const dimension of ["lifecycle", "control-plane"] as const) {
			const headlines = metricsForDimension(dimension).filter((m) => m.headline);
			expect(headlines.length).toBe(1);
		}
	});

	it("registers every harness Metric in the singleton catalog as a valid MetricDef", () => {
		for (const def of harnessMetrics) {
			// not.toBeInstanceOf prints the arktype error summary on failure, unlike toBe(false).
			expect(metricDefSchema(def)).not.toBeInstanceOf(type.errors);
			expect(METRIC_CATALOG).toContainEqual(def);
		}
	});
});
