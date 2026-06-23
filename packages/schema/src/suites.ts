/**
 * The benchmark suite registry — the shared contract between the harness (which runs a suite's
 * commands inside a sandbox) and CI matrix planning (which fans suites out into jobs). Kept here in
 * schema, dependency-free, so both consumers import one source of truth and never disagree on the
 * suite list or its per-suite budgets.
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
		commands: ["mise run benchmark:cpu:node"],
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
