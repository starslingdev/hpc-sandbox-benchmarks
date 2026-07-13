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
	hardlink_bogo_ops_per_s: { label: "Hardlink throughput" },

	// Disk dimension: pts/fio, pinned per scenario by the benchmark:disk:pts:fio-* producer tasks
	// (Engine: Linux AIO, Job Count: 1, Disk Target: Default Test Directory; seq 1MB / rand 4KB). Only
	// the 16 combinations those tasks can emit are curated — the generator's other fio entries keep
	// their verbose draft labels and never receive samples. Direct is probed at run time (O_DIRECT
	// fails on some sandbox filesystems), so each scenario has an O_DIRECT and a buffered variant —
	// the mode travels in the metric identity rather than being silently mixed across providers.
	// 4K random-read IOPS (O_DIRECT) is the dimension's headline — the canonical disk figure, and the
	// honest one (buffered 4K reads measure the page cache). Two consequences of pinning the headline
	// to the O_DIRECT variant: the leaderboard omits its disk row until a matrix run publishes fio
	// samples, and a provider whose filesystem rejects O_DIRECT (the probe's buffered fallback) never
	// appears in the disk ranking — its numbers land on the buffered variants, visible on the Run but
	// deliberately not ranked against O_DIRECT results.
	fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio seq read 1MB, O_DIRECT (MB/s)" },
	fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio seq read 1MB, O_DIRECT (IOPS)" },
	fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio seq write 1MB, O_DIRECT (MB/s)" },
	fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio seq write 1MB, O_DIRECT (IOPS)" },
	fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops:
		{ headline: true, label: "fio rand read 4KB, O_DIRECT (IOPS)" },
	fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio rand read 4KB, O_DIRECT (MB/s)" },
	fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio rand write 4KB, O_DIRECT (IOPS)" },
	fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio rand write 4KB, O_DIRECT (MB/s)" },
	fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio seq read 1MB, buffered (MB/s)" },
	fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio seq read 1MB, buffered (IOPS)" },
	fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio seq write 1MB, buffered (MB/s)" },
	fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio seq write 1MB, buffered (IOPS)" },
	fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio rand read 4KB, buffered (IOPS)" },
	fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio rand read 4KB, buffered (MB/s)" },
	fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops:
		{ label: "fio rand write 4KB, buffered (IOPS)" },
	fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s:
		{ label: "fio rand write 4KB, buffered (MB/s)" },

	// Realworld dimension (ENG-135/137): mastra-ai/mastra run through its own CI tasks, a repo-local
	// PTS profile with a Task option axis. TestType System's default dimension is corrected to
	// realworld here for every metric this profile generates -- a forgotten entry fails fast at
	// catalog load (an off-dimension metric would otherwise land under the wrong axis). Mastra's cold
	// install is the dimension's headline: cold install is the phase every CI pipeline pays regardless
	// of language/framework, and Mastra's is the fastest of the three realworld repos to run.
	realworld_mastra_task_cold_install: {
		dimension: "realworld",
		headline: true,
		label: "Mastra: cold install",
	},
	realworld_mastra_task_git_clone: { dimension: "realworld", label: "Mastra: git clone" },
	realworld_mastra_task_lint_format: { dimension: "realworld", label: "Mastra: lint:format" },
	realworld_mastra_task_build_core: { dimension: "realworld", label: "Mastra: build:core" },
	realworld_mastra_task_test_core: { dimension: "realworld", label: "Mastra: test:core" },

	// Realworld dimension (ENG-136): better-auth/better-auth run through its own CI tasks, a
	// repo-local PTS profile with a Task option axis. TestType System's default dimension is
	// corrected to realworld here for every metric this profile generates.
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

	// Realworld dimension (ENG-138): openclaw/openclaw run through its own CI tasks, a repo-local PTS
	// profile with a Task option axis. TestType System's default dimension is corrected to realworld
	// here for every metric this profile generates.
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
