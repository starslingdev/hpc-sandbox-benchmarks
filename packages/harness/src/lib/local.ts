/**
 * The bare-metal lane: a {@link SandboxHandle} backed by local child processes, and the
 * {@link SuiteExecutionPlan} that runs a suite in the developer's own checkout.
 *
 * `SandboxHandle` is structural (see ./execute.ts), so "run this benchmark on this machine" needs no
 * parallel driver — it needs an implementation of the same three methods the provider adapters
 * satisfy. Everything above it (the step runner, the PTS pass policy, the disk gate, the gap markers,
 * the normalizer) is then shared with the remote path by construction rather than by discipline.
 *
 * What genuinely differs is gathered in {@link localSuitePlan}: nothing is cloned (the checkout is
 * already here), nothing is installed (the toolchain is the developer's — see `localSetupSteps`), and
 * nothing is collected (the producer writes straight into the host raw tree).
 */
import { constants } from "node:os";
import type { ProviderTransport } from "@sandbox-benchmarks/schema";
import type { CommandResult, RunCommandOptions, SandboxHandle } from "./execute.ts";
import { shellQuote } from "./execute.ts";
import type { SuiteExecutionPlan } from "./plan.ts";
import { observedSpecsScript } from "./setup.ts";

/**
 * A local process has no control plane, no HTTP round trip and no durability threshold, so
 * `syncCapMs: null` makes `selectTransport` return "sync" for every step regardless of budget — the
 * `/tmp` done-file poll, the log read-back and their failure modes are never engaged. `detachedPoll:
 * false` states the same thing independently, so neither field alone is load-bearing.
 */
export const LOCAL_TRANSPORT: ProviderTransport = Object.freeze({
	streaming: false,
	syncCapMs: null,
	detachedPoll: false,
});

export interface LocalSandboxOptions {
	/** Working directory for every command — the checkout being benchmarked. */
	readonly cwd: string;
}

/**
 * Run commands as local child processes, tracking every live one so teardown can reap it.
 *
 * The tracking is not bookkeeping for its own sake. `StepRunner.run`'s timeout is a WAIT-cap, not a
 * kill: it stops awaiting and moves on, which is harmless in a sandbox that is about to be destroyed
 * wholesale, and leaves a `fio` or a `pgbench` running forever on a developer's machine. `destroy()`
 * is already called from `runSuiteOnSandbox`'s `finally` on every path, so reaping there closes the
 * leak without introducing any new control flow.
 */
class LocalShellSandbox implements SandboxHandle {
	/** Deliberately absent: there is no provider sandbox, so no cost evidence has a billable subject. */
	readonly sandboxId: undefined;
	// No `filesystem`: LOCAL_TRANSPORT never selects the detached transport, which is its only reader.

	private readonly cwd: string;
	private readonly live = new Set<Bun.Subprocess>();
	/** Set by {@link destroy}; a command started afterwards would outlive the run that owns it. */
	private destroyed = false;

	constructor(options: LocalSandboxOptions) {
		this.cwd = options.cwd;
	}

	async runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult> {
		if (this.destroyed) throw new Error("local sandbox has been destroyed");
		// `setsid` puts the child in its OWN process group, so killing it reaches the whole tree a
		// benchmark spawns (PTS forks compilers, fio workers, a postgres cluster) rather than only the
		// bash leader — which would exit and orphan everything it started. Absent on some hosts, hence
		// the probe rather than a hard requirement.
		const argv = HAS_SETSID ? ["setsid", "bash", "-c", command] : ["bash", "-c", command];

		// Unreachable under LOCAL_TRANSPORT — `selectTransport` never returns "detached" at any budget
		// (pinned in ./local.test.ts) — so refuse rather than implement a mode nothing can exercise.
		// A silent `{ exitCode: 0 }` for a process nobody observes would be the worse failure if a
		// future plan ever wired a detached transport into this lane.
		if (options?.background) throw new Error("local sandbox has no detached transport");

		const proc = Bun.spawn(argv, {
			cwd: this.cwd,
			stdin: "ignore",
			stdout: "pipe",
			stderr: "pipe",
		});
		this.live.add(proc);
		try {
			// CONCURRENTLY, not one then the other. Pipes hold ~64 KiB; a PTS suite emits megabytes, so
			// draining stdout to completion before touching stderr blocks the child on a full stderr pipe
			// while we wait for a stdout EOF that can never arrive. The deadlock presents as a benchmark
			// that hangs until its step budget expires, which is the hardest possible way to see it.
			const [stdout, stderr, exitCode] = await Promise.all([
				new Response(proc.stdout).text(),
				new Response(proc.stderr).text(),
				proc.exited,
			]);
			return { exitCode: normalizeExitCode(exitCode, proc.signalCode), stdout, stderr };
		} finally {
			this.live.delete(proc);
		}
	}

	/** Kill every still-running child. Never throws: teardown runs in a `finally`. */
	destroy(): Promise<unknown> {
		this.destroyed = true;
		for (const proc of this.live) {
			try {
				// SIGKILL, not SIGTERM: this runs after the step that owned the process already gave up on
				// it, so there is nothing left to shut down gracefully and a benchmark ignoring SIGTERM
				// would simply survive. Negated pid targets the setsid process GROUP where we made one.
				if (HAS_SETSID) process.kill(-proc.pid, "SIGKILL");
				else proc.kill("SIGKILL");
			} catch {
				// Already exited between the iteration and the kill — the outcome we wanted either way.
			}
		}
		this.live.clear();
		return Promise.resolve();
	}
}

/** Whether `setsid` is available, probed once: it decides whether a kill can reach a process GROUP. */
const HAS_SETSID = Bun.which("setsid") !== null;

/**
 * A signalled child reports `exitCode: null`, and `finishStep` tests `exitCode !== 0` — so passing the
 * null through would report a process killed by SIGKILL (a step timeout, an OOM) as a clean success
 * and let the suite continue on results that were never produced. Map it to the shell's own
 * convention, 128 + signal, so the number is both non-zero and diagnostic.
 */
function normalizeExitCode(exitCode: number | null, signalCode: NodeJS.Signals | null): number {
	if (typeof exitCode === "number") return exitCode;
	const signalNumber = signalCode ? (constants.signals[signalCode] ?? 0) : 0;
	return 128 + signalNumber;
}

/** Build a {@link SandboxHandle} that runs commands on this machine. */
export function createLocalSandbox(options: LocalSandboxOptions): SandboxHandle {
	return new LocalShellSandbox(options);
}

export interface LocalSuitePlanOptions {
	/** The checkout whose mise tasks are run. */
	readonly repoRoot: string;
	/**
	 * What `$SUDO` expands to inside the producer. Empty by default — see the plan's own comment; set
	 * it to `sudo` only when the operator has already established a passwordless session.
	 */
	readonly sudo?: string;
}

/**
 * The bare-metal plan: run the suite in `repoRoot`, with the producer writing STRAIGHT into the host
 * raw tree. No clone, no toolchain install, no tarball.
 */
export function localSuitePlan(options: LocalSuitePlanOptions): SuiteExecutionPlan {
	const repoRoot = shellQuote(options.repoRoot);
	// Empty by DEFAULT, and that default is load-bearing rather than cautious. `buildPreamble` sets
	// SUDO="sudo -E" whenever the user is not root, so `ensure_pts` in lib/bench.sh would reach
	// `sudo apt-get` and block on an interactive password prompt in the middle of a benchmark — with
	// stdout quarantined for the JSON contract, the operator would see a command that simply hangs.
	// Pinning it empty makes that install branch fail fast and return 1, which every orchestrator task
	// already absorbs (`ensure_pts || true`), so a missing PTS surfaces as the precondition it is.
	const sudo = shellQuote(options.sudo ?? "");
	return {
		// Nothing to install: the toolchain is the developer's. `localSetupSteps` verifies it instead,
		// and the driver runs those checks up front across every selected suite.
		setup: () => [],
		observedSpecs: (resultsDir) =>
			observedSpecsScript({ dir: repoRoot, outFile: `${resultsDir}/observed-specs.json` }),
		// BENCHMARK_RESULTS_DIR is what `lib/bench.sh`'s `results_dir()` reads, so every artifact lands
		// in this suite's raw directory directly. Deliberately not the repo-root `benchmark-results/`
		// default followed by a copy: that directory is where manual leaf runs accumulate, so copying it
		// would sweep a stale pts_*.xml from last week into today's Run as a real measurement.
		command: (command, resultsDir) =>
			`cd ${repoRoot} && BENCHMARK_RESULTS_DIR=${shellQuote(resultsDir)} SUDO=${sudo} ${command}`,
		// Nothing to collect: the producer wrote into `resultsDir` directly. `runSuiteOnSandbox` creates
		// that directory in its prologue, before any plan hook runs, so this does not need to either.
		collect: async () => {},
	};
}
