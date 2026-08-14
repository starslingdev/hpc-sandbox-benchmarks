/**
 * How a suite is executed, as data — the seam between "what a suite run does" and "where it runs".
 *
 * `runSuiteOnSandbox` owns the ORDER and the error handling of a suite run: the readiness gate, the
 * disk precondition, setup, the spec probe, the command loop under the PTS pass policy, the
 * "a PTS suite that produced no `pts_*.xml` failed silently" guard, the failed-marker exit, the
 * always-runs teardown. None of that is sandbox-specific — it is the definition of a benchmark run.
 *
 * Exactly four things are. Gathering them into one object rather than four optional context fields
 * makes each MODE nameable ({@link SANDBOX_SUITE_PLAN} and the bare-metal plan in `./local.ts`),
 * so a reader can see a whole execution strategy in one place instead of reconstructing it from
 * scattered `??` fallbacks — and so a future mode has one thing to implement rather than four
 * defaults to remember not to miss.
 */
import type { Suite } from "@sandbox-benchmarks/schema";
import { collectResults } from "./collect.ts";
import type { StepRunner } from "./execute.ts";
import type { SetupStep } from "./setup.ts";
import { DIR, OBSERVED_SPECS_SCRIPT, setupSteps } from "./setup.ts";

export interface SuiteExecutionPlan {
	/** Steps run before the benchmark: install the toolchain, or verify it is already there. */
	readonly setup: (suite: Suite) => SetupStep[];
	/**
	 * The observed-specs probe, given the HOST results directory. Takes the directory because the
	 * probe is the one artifact `lib/bench.sh`'s `results_dir()` does NOT place — the harness writes
	 * it — so a producer writing straight into the raw tree must still be told where that is.
	 */
	readonly observedSpecs: (hostResultsDir: string) => string;
	/** One of `suite.commands`, wrapped for this host (working directory, environment). */
	readonly command: (command: string, hostResultsDir: string) => string;
	/** Bring the produced results to `hostResultsDir`; a no-op when the producer already wrote there. */
	readonly collect: (runner: StepRunner, hostResultsDir: string) => Promise<void>;
}

/**
 * The provider-sandbox plan: clone the repo into `$HOME/sandbox-benchmarks`, install the toolchain,
 * run the suite there, and tar the results back over stdout. Byte-for-byte what the harness did
 * before the seam existed, so the remote lane is unchanged by its introduction.
 */
export const SANDBOX_SUITE_PLAN: SuiteExecutionPlan = Object.freeze({
	setup: setupSteps,
	observedSpecs: () => OBSERVED_SPECS_SCRIPT,
	command: (command: string) => `cd ${DIR} && ${command}`,
	collect: collectResults,
});
