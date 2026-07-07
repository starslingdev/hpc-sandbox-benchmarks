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
	// Disk dimension: Hardlink throughput (a repo-local PTS profile sourced from runner-benchmarking).
	hardlink_bogo_ops_per_s: { headline: true, label: "Hardlink throughput" },

	// Realworld dimension (ENG-135/136/137/138): real OSS repos run through their own CI tasks, one
	// repo-local PTS profile each with a Task option axis. TestType System's default dimension is
	// corrected to realworld here for every metric these three profiles generate -- a forgotten entry
	// fails fast at catalog load (an off-dimension metric would otherwise land under the wrong axis).
	// Mastra's cold install is the dimension's headline: cold install is the phase every CI pipeline
	// pays regardless of language/framework, and Mastra's is the fastest of the three to run.
	realworld_mastra_task_cold_install: {
		dimension: "realworld",
		headline: true,
		label: "Mastra: cold install",
	},
	realworld_mastra_task_git_clone: { dimension: "realworld", label: "Mastra: git clone" },
	realworld_mastra_task_lint_format: { dimension: "realworld", label: "Mastra: lint:format" },
	realworld_mastra_task_build_core: { dimension: "realworld", label: "Mastra: build:core" },
	realworld_mastra_task_test_core: { dimension: "realworld", label: "Mastra: test:core" },

	realworld_better_auth_task_git_clone: { dimension: "realworld", label: "Better-Auth: git clone" },
	realworld_better_auth_task_cold_install: {
		dimension: "realworld",
		label: "Better-Auth: cold install",
	},
	realworld_better_auth_task_lint_biome: {
		dimension: "realworld",
		label: "Better-Auth: lint (Biome)",
	},
	realworld_better_auth_task_lint_deps_knip: {
		dimension: "realworld",
		label: "Better-Auth: lint deps (Knip)",
	},
	realworld_better_auth_task_lint_format: {
		dimension: "realworld",
		label: "Better-Auth: lint format",
	},
	realworld_better_auth_task_lint_spell: {
		dimension: "realworld",
		label: "Better-Auth: lint spell",
	},
	realworld_better_auth_task_lint_types: {
		dimension: "realworld",
		label: "Better-Auth: lint types",
	},
	realworld_better_auth_task_lint_packages: {
		dimension: "realworld",
		label: "Better-Auth: lint packages",
	},
	realworld_better_auth_task_typecheck: { dimension: "realworld", label: "Better-Auth: typecheck" },
	realworld_better_auth_task_build: { dimension: "realworld", label: "Better-Auth: build" },
	realworld_better_auth_task_test: { dimension: "realworld", label: "Better-Auth: test" },

	realworld_openclaw_task_git_clone: { dimension: "realworld", label: "OpenClaw: git clone" },
	realworld_openclaw_task_cold_install: { dimension: "realworld", label: "OpenClaw: cold install" },
	realworld_openclaw_task_lint_oxlint: { dimension: "realworld", label: "OpenClaw: lint (Oxlint)" },
	realworld_openclaw_task_lint_format: { dimension: "realworld", label: "OpenClaw: lint format" },
	realworld_openclaw_task_typecheck: {
		dimension: "realworld",
		label: "OpenClaw: typecheck (tsgo)",
	},
	realworld_openclaw_task_shrinkwrap_check: {
		dimension: "realworld",
		label: "OpenClaw: shrinkwrap check",
	},
	realworld_openclaw_task_test_unit_fast: {
		dimension: "realworld",
		label: "OpenClaw: test (unit, fast)",
	},
	realworld_openclaw_task_build: { dimension: "realworld", label: "OpenClaw: build" },
};
