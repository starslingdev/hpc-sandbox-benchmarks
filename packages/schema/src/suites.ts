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
		// to a future cpu-generic suite, so they are deliberately not declared here.
		dimensions: ["cpu"],
		metrics: ["node_web_tooling_runs_per_s"],
		commands: ["mise run benchmark:cpu:node"],
	},
	// The system dimension: PyBench (Python interpreter) + SQLite Speedtest, both single-result PTS
	// profiles. Lighter than cpu-node (no Node toolchain, shorter runtime), so smaller budgets.
	system: {
		setupPts: true,
		commandTimeoutMinutes: 40,
		timeoutMinutes: 50,
		dimensions: ["system"],
		metrics: ["pybench_milliseconds", "sqlite_speedtest_seconds"],
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
	// The disk dimension: hardlink throughput (stress-ng --link), a repo-local PTS profile installed
	// into PTS by the producer task. Needs a little free disk for the link storm.
	disk: {
		setupPts: true,
		commandTimeoutMinutes: 30,
		timeoutMinutes: 40,
		minDiskGb: 2,
		dimensions: ["disk"],
		metrics: ["hardlink_bogo_ops_per_s"],
		commands: ["mise run benchmark:disk:all"],
	},
	// The realworld dimension (ENG-135/136/137/138): real OSS repos run through their own CI tasks,
	// each a repo-local PTS profile with a Task option axis. Budgets are starting points (tuned from
	// smoke); mastra is the lightest (scoped to packages/core), better-auth and openclaw run their
	// full task matrices including a cold pnpm install and a full build.
	"realworld-mastra": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 90,
		timeoutMinutes: 105,
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
	"realworld-better-auth": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 60,
		timeoutMinutes: 75,
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
			"realworld_better_auth_task_test",
		],
		commands: ["mise run benchmark:realworld:pts:better-auth"],
	},
	"realworld-openclaw": {
		setupPts: true,
		setupNode: true,
		commandTimeoutMinutes: 90,
		timeoutMinutes: 105,
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
