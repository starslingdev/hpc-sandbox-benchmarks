import { describe, expect, it } from "bun:test";
import {
	DIMENSIONS,
	getMetric,
	headlineMetric,
	METRIC_CATALOG,
	metricsForDimension,
} from "./index.ts";

describe("metric catalog", () => {
	it("has unique metric ids", () => {
		const ids = METRIC_CATALOG.map((metric) => metric.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("places every metric in a known dimension and gives PTS metrics a test profile", () => {
		for (const metric of METRIC_CATALOG) {
			expect(DIMENSIONS).toContain(metric.dimension);
			if (metric.pts) expect(metric.pts.test.length).toBeGreaterThan(0);
		}
	});

	it("has at most one headline metric per dimension", () => {
		for (const dimension of DIMENSIONS) {
			const headlines = metricsForDimension(dimension).filter((metric) => metric.headline);
			expect(headlines.length).toBeLessThanOrEqual(1);
		}
	});

	it("resolves the node-web-tooling headline for cpu", () => {
		const metric = headlineMetric("cpu");
		expect(metric.id).toBe("node_web_tooling_runs_per_s");
		expect(metric.direction).toBe("HIB");
		expect(metric.pts?.test).toBe("pts/node-web-tooling");
		expect(getMetric(metric.id)).toBe(metric);
	});

	it("returns undefined for an unknown metric id", () => {
		expect(getMetric("not_a_metric")).toBeUndefined();
	});

	it("throws when a dimension has no headline metric", () => {
		expect(() => headlineMetric("economics")).toThrow();
	});
});
