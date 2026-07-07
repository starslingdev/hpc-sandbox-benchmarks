import { describe, expect, it } from "bun:test";
import { catalogSchema } from "./catalog.ts";
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

	it("wires the generated PTS catalog (curated), not a hand-authored stand-in", () => {
		// Guards against a revert to the old hand-authored `ptsCpu`: the c-ray option matrix only exists
		// in the generated module, and the override-supplied short label proves curation was applied.
		const cRay = getMetric("c_ray_resolution_1080p_rays_per_pixel_16");
		expect(cRay?.pts).toEqual({
			test: "pts/c-ray",
			description: "Resolution: 1080p - Rays Per Pixel: 16",
		});
		expect(cRay?.label).toBe("C-Ray (1080p, 16 RPP)");
		expect(getMetric("node_web_tooling_runs_per_s")?.headline).toBe(true);
	});

	it("resolves the PyBench headline for the system dimension (both system metrics catalogued)", () => {
		const metric = headlineMetric("system");
		expect(metric.id).toBe("pybench_milliseconds");
		expect(metric.label).toBe("PyBench"); // curated short label
		expect(metric.pts?.test).toBe("pts/pybench");
		// Single-result wildcard: no pts.description (so the byte-match gate needs no recorded composite).
		expect(metric.pts?.description).toBeUndefined();
		expect(getMetric("sqlite_speedtest_seconds")?.dimension).toBe("system");
	});

	it("resolves the STREAM Triad headline for the memory dimension (multi-result option matrix)", () => {
		const metric = headlineMetric("memory");
		expect(metric.id).toBe("stream_type_triad");
		expect(metric.label).toBe("STREAM Triad"); // curated short label
		expect(metric.unit).toBe("MB/s");
		expect(metric.direction).toBe("HIB");
		// Multi-result: the description disambiguator is the byte-match the golden gate proves.
		expect(metric.pts).toEqual({ test: "pts/stream", description: "Type: Triad" });
		expect(
			metricsForDimension("memory")
				.map((m) => m.id)
				.sort(),
		).toEqual(["stream_type_add", "stream_type_copy", "stream_type_scale", "stream_type_triad"]);
	});

	it("resolves the Hardlink headline for the disk dimension via a non-`pts/` (local) join key", () => {
		const metric = headlineMetric("disk");
		expect(metric.id).toBe("hardlink_bogo_ops_per_s");
		expect(metric.label).toBe("Hardlink throughput");
		expect(metric.direction).toBe("HIB");
		// Repo-local profile: the join prefix is `local/`, proving the generator is source-segment-aware.
		expect(metric.pts).toEqual({ test: "local/hardlink" });
	});

	it("returns undefined for an unknown metric id", () => {
		expect(getMetric("not_a_metric")).toBeUndefined();
	});

	it("throws when a dimension has no headline metric", () => {
		expect(() => headlineMetric("economics")).toThrow();
	});
});

describe("catalogSchema PTS-mapping invariant", () => {
	// A valid non-PTS scaffold; each case overrides only id + pts to exercise the .narrow.
	const base = {
		dimension: "cpu",
		unit: "runs/s",
		direction: "HIB",
		headline: false,
		label: "x",
		description: "x",
	} as const;

	it("accepts a wildcard and a described entry for DIFFERENT tests", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/b", description: "Foo" } },
			]),
		).not.toThrow();
	});

	it("accepts multiple described entries for the same test (the multi-result matrix)", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a", description: "Compression" } },
				{ ...base, id: "b", pts: { test: "pts/a", description: "Decompression" } },
			]),
		).not.toThrow();
	});

	it("rejects two description-less wildcards for the same test", () => {
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/a" } },
			]),
		).toThrow();
	});

	it("rejects a wildcard coexisting with a described entry for the same test", () => {
		// This is the exact shape that would let ptsResultToMetric misattribute a non-matching
		// <Description> to the wildcard — forbidden at load so the runtime fallback is safe.
		expect(() =>
			catalogSchema.assert([
				{ ...base, id: "a", pts: { test: "pts/a" } },
				{ ...base, id: "b", pts: { test: "pts/a", description: "Foo" } },
			]),
		).toThrow();
	});
});
