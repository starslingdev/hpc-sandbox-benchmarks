import type { Dimension } from "./metrics.ts";

/**
 * The benchmark suite registry — the shared contract between the harness (which runs a suite's
 * commands inside a sandbox) and CI matrix planning (which fans suites out into jobs). Kept here in
 * schema, dependency-free, so both consumers import one source of truth and never disagree on the
 * suite list or its per-suite budgets.
 *
 * Each suite also declares the {@link Suite.dimensions} it measures and the catalogued
 * {@link Suite.metrics} it emits — the producer↔catalog half of the contract. `./suite-contract.ts`
 * checks that declaration against the Metric Catalog at schema load, so a suite emitting an
 * uncatalogued or off-dimension metric fails fast at the boundary instead of silently corrupting the
 * comparison once it runs. The `Dimension` import is type-only, so this module stays runtime
 * dependency-free; the catalog coupling lives entirely in the contract checker.
 *
 * A suite's `commands` are mise tasks (e.g. `mise run benchmark:cpu:node`) implemented by the
 * in-sandbox producer under `/.mise/tasks/benchmark/**` + `/lib/bench.sh`. This slice ships a single
 * cpu-node suite; adding the next is one entry here plus its thin task file (see the producer's
 * `bench.sh` helpers), not a reshape of the harness.
 */

export interface Suite {
	/** Install the Phoronix Test Suite during setup (PTS-backed suites need it). */
	setupPts?: boolean;
	/** Install Node 22 + pnpm 10 during setup. */
	setupNode?: boolean;
	/** Timeout applied to each benchmark command, in minutes. */
	commandTimeoutMinutes: number;
	/** Requested sandbox lifetime, in minutes (covers setup + the suite). */
	timeoutMinutes: number;
	/** Skip (with a marker) when the sandbox has less than this much free disk, in GiB. */
	minDiskGb?: number;
	/**
	 * The Dimensions this suite measures — the axes its metrics land on. Every id in {@link metrics}
	 * must sit on one of these, and every dimension here must be covered by at least one declared
	 * metric (both enforced by `./suite-contract.ts` at load). Declared alongside `metrics` rather than
	 * derived from them so a metric catalogued on an unexpected dimension is rejected (off-dimension)
	 * rather than silently widening the suite's axes; it also lets the leaderboard/matrix group suites
	 * by axis without expanding the metric list.
	 */
	dimensions: readonly Dimension[];
	/**
	 * The catalogued Metric ids this suite emits. Each must exist in `METRIC_CATALOG` and sit on one of
	 * {@link dimensions} — the producer↔catalog contract, checked fail-fast at schema load. A suite may
	 * list a subset of a multi-result test's catalogued metrics when its `commands` run only some option
	 * combinations (the unrun entries simply never receive samples).
	 */
	metrics: readonly string[];
	/** Commands run sequentially in the repo checkout. Sandboxes run as root, so no `sudo` prefix. */
	commands: string[];
}

/**
 * The suite registry. Suite names fan out into the in-sandbox mise tasks under
 * `/.mise/tasks/benchmark/**`; keep the two in sync (a drift gate lands with the multi-suite work).
 */
export const SUITES = {
	"cpu-node": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 110,
		timeoutMinutes: 120,
		// cpu-node runs only `benchmark:cpu:node` (node-web-tooling); the catalog's c-ray entries belong
		// to the cpu-generic suite below, so they are deliberately not declared here.
		dimensions: ["cpu"],
		metrics: ["node_web_tooling_runs_per_s"],
		commands: ["mise run benchmark:cpu:node"],
	},
	// The system dimension: PyBench (Python interpreter) + SQLite Speedtest (single-result PTS
	// profiles) + PostgreSQL via pgbench, pinned to one (scale 100, 50 clients) point per mode —
	// each mode posts a TPS and an Average Latency metric. pgbench runs server + client fully
	// in-sandbox (same topology on every provider). The harness fixes two trials per case, so pgbench
	// makes four timed passes (two per mode), each with its own scale-100 `pgbench -i`. That and the
	// ~1.5 GB dataset set the budgets and disk floor. Requires the baked image (postgres pre-built,
	// libicu-dev present); on a stock image the from-source postgres build lands inside this budget too.
	system: {
		setupPts: true,
		commandTimeoutMinutes: 120,
		timeoutMinutes: 135,
		minDiskGb: 5,
		dimensions: ["system"],
		metrics: [
			"pybench_milliseconds",
			"sqlite_speedtest_seconds",
			"git_seconds",
			"pgbench_scaling_factor_100_clients_50_mode_read_only",
			"pgbench_scaling_factor_100_clients_50_mode_read_only_average_latency",
			"pgbench_scaling_factor_100_clients_50_mode_read_write",
			"pgbench_scaling_factor_100_clients_50_mode_read_write_average_latency",
		],
		commands: ["mise run benchmark:system:all"],
	},
	// The memory dimension: STREAM (Copy/Scale/Add/Triad). Short — STREAM runs in a couple of minutes.
	memory: {
		setupPts: true,
		commandTimeoutMinutes: 30,
		timeoutMinutes: 40,
		dimensions: ["memory"],
		metrics: ["stream_type_copy", "stream_type_scale", "stream_type_add", "stream_type_triad"],
		commands: ["mise run benchmark:memory:all"],
	},
	// The disk dimension: pts/fio across four pinned scenarios (seq read/write 1MB, rand read/write
	// 4KB; Engine Linux AIO, Job Count 1, Default Test Directory) plus hardlink throughput (stress-ng
	// --link, a repo-local PTS profile). Each fio scenario posts a bandwidth AND an IOPS result —
	// scale-pinned twin metrics. Direct is probed per sandbox (O_DIRECT fails on some sandbox
	// filesystems), so every scenario declares an O_DIRECT and a buffered variant; each provider emits
	// exactly one of the two and the mode travels in the metric identity (the contract allows declared-
	// but-unrun combinations). Budgets cover five fixed trials of each of the four timed 60s scenarios
	// plus the hardlink profile; fio writes 1 GiB test files, hence the raised disk floor.
	disk: {
		setupPts: true,
		commandTimeoutMinutes: 75,
		timeoutMinutes: 90,
		minDiskGb: 4,
		dimensions: ["disk"],
		metrics: [
			"hardlink_bogo_ops_per_s",
			"fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_sequential_read_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_sequential_write_engine_linux_aio_direct_yes_block_size_1mb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_random_read_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_random_write_engine_linux_aio_direct_yes_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_sequential_read_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_sequential_write_engine_linux_aio_direct_no_block_size_1mb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_random_read_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
			"fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_mb_per_s",
			"fio_type_random_write_engine_linux_aio_direct_no_block_size_4kb_job_count_1_disk_target_default_test_directory_iops",
		],
		commands: ["mise run benchmark:disk:all"],
	},
	// The network dimension: fast-cli performs sustained real-world download/upload transfers through
	// Netflix's fast.com CDN and reports idle/loaded latency; loopback TCP (10GB via nc) is the paired
	// self-contained synthetic that isolates the sandbox's network stack from Internet weather. The
	// suite task also runs latency/DNS and a small GitHub control-download probe as raw provenance.
	network: {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 45,
		timeoutMinutes: 55,
		dimensions: ["network"],
		metrics: [
			"fast_cli_internet_download_speed",
			"fast_cli_internet_upload_speed",
			"fast_cli_internet_latency",
			"fast_cli_internet_loaded_latency_bufferbloat",
			"network_loopback_seconds",
		],
		commands: ["mise run benchmark:network:all"],
	},
	// The generic-compute dimension slice next to cpu-node: c-ray (float/thread scaling — the seam the
	// catalog's c-ray entries have waited on) and Zstd compression across its level matrix. Budgets
	// cover the zstd build + silesia download, 7 zstd levels × compress+decompress, and c-ray's three
	// resolutions × 5 fixed passes on a 2-vCPU target (the 5K pass alone runs several minutes per
	// repeat). Fixed counts bound noisy hosts while giving every provider equal statistical weight.
	"cpu-generic": {
		setupPts: true,
		commandTimeoutMinutes: 130,
		timeoutMinutes: 145,
		minDiskGb: 2,
		dimensions: ["cpu"],
		metrics: [
			"c_ray_resolution_1080p_rays_per_pixel_16",
			"c_ray_resolution_4k_rays_per_pixel_16",
			"c_ray_resolution_5k_rays_per_pixel_16",
			"compress_zstd_compression_level_3_compression_speed",
			"compress_zstd_compression_level_3_decompression_speed",
			"compress_zstd_compression_level_3_long_mode_compression_speed",
			"compress_zstd_compression_level_3_long_mode_decompression_speed",
			"compress_zstd_compression_level_8_compression_speed",
			"compress_zstd_compression_level_8_decompression_speed",
			"compress_zstd_compression_level_8_long_mode_compression_speed",
			"compress_zstd_compression_level_8_long_mode_decompression_speed",
			"compress_zstd_compression_level_12_compression_speed",
			"compress_zstd_compression_level_12_decompression_speed",
			"compress_zstd_compression_level_19_compression_speed",
			"compress_zstd_compression_level_19_decompression_speed",
			"compress_zstd_compression_level_19_long_mode_compression_speed",
			"compress_zstd_compression_level_19_long_mode_decompression_speed",
		],
		commands: ["mise run benchmark:cpu:generic"],
	},
	// The realworld dimension (ENG-135/136/137/138): real OSS repos run through their own CI tasks,
	// each a repo-local PTS profile with a Task option axis. Budgets are starting points (tuned from
	// smoke); mastra's task matrix is the narrowest (scoped to packages/core) but its monorepo has
	// the largest install/build footprint — hence the biggest minDiskGb. better-auth and openclaw
	// run their full task matrices including a cold pnpm install and a full build.
	"realworld-mastra": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 140,
		timeoutMinutes: 155,
		minDiskGb: 30,
		dimensions: ["realworld"],
		metrics: [
			"realworld_mastra_task_git_clone",
			"realworld_mastra_task_cold_install",
			"realworld_mastra_task_lint_format",
			"realworld_mastra_task_build_core",
			"realworld_mastra_task_test_core",
		],
		commands: ["mise run benchmark:realworld:pts:mastra"],
	},
	// The five fixed trials multiply every task case, including the per-run git-clean/install resets;
	// the 140-minute command budget covers slower virtualized filesystems while the 155-minute sandbox
	// lifetime leaves setup and collection headroom. The workflow timeout gate independently reserves
	// host-job margin beyond the longest sandbox lifetime.
	"realworld-better-auth": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 140,
		timeoutMinutes: 155,
		minDiskGb: 10,
		dimensions: ["realworld"],
		metrics: [
			"realworld_better_auth_task_git_clone",
			"realworld_better_auth_task_cold_install",
			"realworld_better_auth_task_lint_biome",
			"realworld_better_auth_task_lint_deps_knip",
			"realworld_better_auth_task_lint_format",
			"realworld_better_auth_task_lint_spell",
			"realworld_better_auth_task_lint_types",
			"realworld_better_auth_task_lint_packages",
			"realworld_better_auth_task_typecheck",
			"realworld_better_auth_task_build",
		],
		commands: ["mise run benchmark:realworld:pts:better-auth"],
	},
	"realworld-openclaw": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 140,
		timeoutMinutes: 155,
		minDiskGb: 25,
		dimensions: ["realworld"],
		metrics: [
			"realworld_openclaw_task_git_clone",
			"realworld_openclaw_task_cold_install",
			"realworld_openclaw_task_lint_oxlint",
			"realworld_openclaw_task_lint_format",
			"realworld_openclaw_task_typecheck",
			"realworld_openclaw_task_shrinkwrap_check",
			"realworld_openclaw_task_test_unit_fast",
			"realworld_openclaw_task_build",
		],
		commands: ["mise run benchmark:realworld:pts:openclaw"],
	},
} as const satisfies Record<string, Suite>;

/** A registered suite name. */
export type SuiteName = keyof typeof SUITES;

/** The known suite names. */
export const SUITE_NAMES = Object.keys(SUITES) as SuiteName[];

/**
 * The comma-padded token for one suite, e.g. `cpu-node` → `,cpu-node,`. GitHub Actions `if:`
 * expressions can't split strings, so the setup job emits the planned suites as a padded list
 * ({@link padSuiteList}) and each suite job matches its own token with `contains(..., ',<suite>,')`.
 * One owner for the padding so the emitter and any drift gate can never disagree on the spelling.
 */
export function paddedSuiteToken(suite: string): string {
	return `,${suite},`;
}

/** The full padded list the setup job emits, e.g. `[a, b]` → `,a,b,`. */
export function padSuiteList(suites: readonly string[]): string {
	return `,${suites.join(",")},`;
}
