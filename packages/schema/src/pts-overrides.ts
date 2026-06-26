// Hand-authored curation for the generated PTS catalog (pts-generated.ts), keyed by metric id. The
// generator owns the XML-derived fields and emits an uncurated draft (verbose `label`,
// `headline:false`, a TestType-default `dimension`); this map supplies the editorial fields the XML
// can't: a curated short `label`, the single `headline:true` per dimension the leaderboard shows, and
// any `dimension` correction. The seam merges them at import time (`{ ...generated, ...override }`);
// the catalog drift gate diffs only pts-generated.ts, so editing this file never trips it.
//
// Not yet wired into the catalog — committed alongside the generator output so the curation is
// reviewable now and the seam is a pure import-time merge when it lands.
import type { MetricDef } from "./metrics.ts";

/** The curatable subset of a MetricDef; everything else is owned by the generator. */
export type MetricOverride = Partial<Pick<MetricDef, "dimension" | "headline" | "label">>;

export const ptsOverrides: Record<string, MetricOverride> = {
	// Node.js web tooling is the cpu dimension's headline (the existing hand-authored choice).
	node_web_tooling_runs_per_s: { headline: true, label: "Node.js web tooling" },
	// c-ray's verbose generated labels fold the option matrix into a short, chart-friendly form.
	c_ray_resolution_1080p_rays_per_pixel_16: { label: "C-Ray (1080p, 16 RPP)" },
	c_ray_resolution_4k_rays_per_pixel_16: { label: "C-Ray (4K, 16 RPP)" },
	c_ray_resolution_5k_rays_per_pixel_16: { label: "C-Ray (5K, 16 RPP)" },
	// System dimension: PyBench is its headline (a broad Python interpreter workload); SQLite Speedtest
	// rounds it out. Both single-result wildcards, so curation only supplies labels + the one headline.
	pybench_milliseconds: { headline: true, label: "PyBench" },
	sqlite_speedtest_seconds: { label: "SQLite Speedtest" },
	// Memory dimension: STREAM Triad is the canonical headline (the fused multiply-add is the most
	// representative memory-bandwidth figure); the other three operations round out the matrix.
	stream_type_triad: { headline: true, label: "STREAM Triad" },
	stream_type_copy: { label: "STREAM Copy" },
	stream_type_scale: { label: "STREAM Scale" },
	stream_type_add: { label: "STREAM Add" },
};
