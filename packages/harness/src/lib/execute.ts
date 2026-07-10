/**
 * Suite-step execution against a live sandbox: the in-sandbox shell preamble, a liveness heartbeat,
 * a per-step timeout, and per-phase wall-time accounting. Two transports, and a capability-driven
 * selector ({@link StepRunner.step}) that picks between them per provider instead of hardcoding one
 * provider's quirks:
 *
 *   - {@link StepRunner.run}: a direct synchronous exec. Fine for short steps, but NOT durable for
 *     long ones on a capped provider: Daytona's synchronous executeCommand returns HTTP 408 on
 *     multi-minute commands while the process keeps running server-side, and computesdk's Daytona
 *     adapter doesn't stream (it ignores onStdout/onStderr).
 *   - {@link StepRunner.runDetached}: starts the step in the background (computesdk's `background:true`,
 *     double-fork daemonized so it detaches even on e2b's envd) writing its output to a log file and
 *     its exit code to a done-file, then polls until the done-file appears — via the sandbox filesystem
 *     when one is exposed, else by `cat`-ing the done-file over `exec`. The poll interval backs off
 *     adaptively so a short step isn't over-charged for polling. This survives the 408-prone exec
 *     round-trip, so multi-minute benchmarks complete on every provider.
 *
 * {@link StepRunner.step} reads the provider's declared {@link ProviderTransport} (via
 * {@link selectTransport}) and dispatches: a step that could outlast the provider's synchronous cap
 * runs detached where the provider supports it; everything else runs synchronously. So Daytona keeps
 * its detached+poll path while an uncapped provider (e.g. Modal) runs the same step directly — the
 * harness adapts to the capability rather than hardcoding one provider's transport.
 */

import { randomUUID } from "node:crypto";
import type { ProviderTransport } from "@sandbox-benchmarks/schema";

export const MIN = 60_000;

/**
 * Adaptive poll backoff for {@link StepRunner.runDetached} while it waits on a detached step's
 * done-file. Setup steps no-op in ~1s on a pre-baked image, so a fixed quantum charged most of a
 * short run to pure polling overhead (~44% of one measured suite). Start tight, grow geometrically,
 * and cap so a multi-minute benchmark still settles at a cheap steady cadence.
 */
const POLL_START_MS = 1_500;
const POLL_BACKOFF = 1.5;
const POLL_CAP_MS = 10_000;
/** How much of a timed-out detached step's log to surface — enough to diagnose, not enough to flood. */
const TIMEOUT_LOG_TAIL_LINES = 50;
/** Done-file sentinel for the no-filesystem cat-poll fallback: printed while the file isn't there yet. */
const RUNNING_SENTINEL = "__RUNNING__";
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export type Phase = "create" | "setup" | "benchmark" | "collect";

export interface StepLogEntry {
	phase: Phase;
	label: string;
	ms: number;
	exitCode: number | null;
}

/** The result of one in-sandbox command. */
export interface CommandResult {
	exitCode: number;
	stdout?: string;
	stderr?: string;
}

/** Options for one in-sandbox command (a subset of computesdk's RunCommandOptions). */
export interface RunCommandOptions {
	/** Start detached and return immediately, rather than waiting for the command to finish. */
	background?: boolean;
}

/** Which transport {@link StepRunner.step} chose for a step. */
export type TransportKind = "sync" | "detached";

/**
 * Conservative transport profile used when a {@link StepRunner} is built without a declared one (the
 * unit-test fakes). Mirrors a single-round-trip-capped provider: short execs go direct, anything
 * budgeted past ~1 minute detaches — the safe default when a provider's real capability is unknown.
 */
export const DEFAULT_TRANSPORT: ProviderTransport = Object.freeze({
	streaming: false,
	syncCapMs: MIN,
	detachedPoll: true,
});

/**
 * Pick the exec transport for a step from the provider's declared {@link ProviderTransport} and the
 * step's timeout budget. A step runs detached when it could reach or outlast the provider's synchronous
 * cap (`syncCapMs`) AND the provider supports detached+poll; otherwise it runs as a direct synchronous
 * exec. A `null` cap (uncapped) always stays synchronous; a provider without `detachedPoll` has no
 * durable alternative, so it stays synchronous and best-effort even past its cap.
 *
 * The budget is the comparison key (worst case = a step that runs its full timeout), so the choice is
 * deterministic and provider-driven, not a guess about a step's actual runtime. The comparison is `>=`,
 * not `>`: when `syncCapMs` equals a provider's hard limit (E2B's `syncCapMs` *is* its SDK
 * `defaultProcessConnectionTimeout`), a step budgeted at exactly the cap could run right up to it and
 * drop the connection with no margin — so a budget that *reaches* the cap detaches, not just one that
 * exceeds it. `streaming` is modeled on the capability but does not tip this decision today: no shipped
 * `@computesdk/*` adapter delivers incremental output, so there is no streaming transport to prefer —
 * when one lands, it is selected here.
 */
export function selectTransport(transport: ProviderTransport, timeoutMs: number): TransportKind {
	const couldExceedSyncCap = transport.syncCapMs !== null && timeoutMs >= transport.syncCapMs;
	return couldExceedSyncCap && transport.detachedPoll ? "detached" : "sync";
}

/** The slice of a computesdk sandbox filesystem the detached transport polls (its `filesystem` satisfies this). */
export interface SandboxFilesystem {
	readFile(path: string): Promise<string>;
	exists(path: string): Promise<boolean>;
}

/** The slice of a computesdk sandbox the suite runner needs (its `Sandbox` satisfies this). */
export interface SandboxHandle {
	runCommand(command: string, options?: RunCommandOptions): Promise<CommandResult>;
	destroy(): Promise<unknown>;
	/** Present on real computesdk sandboxes; enables the durable detached transport for long steps. */
	filesystem?: SandboxFilesystem;
}

export interface StepOptions {
	allowFailure?: boolean;
	/** Suppress echoing stdout/stderr (for steps that emit bulk data, e.g. the base64 results tar).
	 *  A silent step that fails still emits its stderr, so failures stay debuggable. */
	silent?: boolean;
}

/** Race a promise against a timeout, clearing the timer either way. */
export async function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			promise,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new Error(message)), ms);
			}),
		]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

/** Single-quote a script for safe embedding in `bash -c '<script>'`. */
export function shellQuote(script: string): string {
	return `'${script.replace(/'/g, `'\\''`)}'`;
}

/** Parse a done-file's exit-code contents, defaulting a malformed value to a failure (1). */
function parseExitCode(raw: string): number {
	const code = Number.parseInt(raw, 10);
	return Number.isFinite(code) ? code : 1;
}

/**
 * Re-establish env + PATH on every step (each runCommand is a fresh shell). `$SUDO` covers both root
 * images (no prefix) and non-root images with sudo. The toolchain image (packages/templates/images)
 * installs mise globally under /mise, so prefer it when present.
 */
export const PREAMBLE = [
	"set -eo pipefail",
	"export DEBIAN_FRONTEND=noninteractive",
	// biome-ignore lint/suspicious/noTemplateCurlyInString: bash expansion, not a JS template
	'export HOME="${HOME:-/root}"',
	'export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$PATH"',
	'if [ -d /mise ]; then export MISE_DATA_DIR=/mise MISE_CONFIG_DIR=/mise MISE_CACHE_DIR=/mise/cache PATH="/mise/shims:$PATH"; fi',
	// Some sandbox networks reset connections to *.jdx.dev — fetch versions/tools from GitHub instead.
	"export MISE_USE_VERSIONS_HOST=0",
	// The precompiled-python index is jdx.dev-only (no GitHub fallback) — use the distro python3.
	"export MISE_DISABLE_TOOLS=python",
	// Distro pythons are PEP 668 externally-managed, but PTS profiles pip-install their harness —
	// fine in a throwaway sandbox; the baked image sets the same.
	"export PIP_BREAK_SYSTEM_PACKAGES=1",
	// Honour each PTS profile's TimesToRun (lib/bench.sh otherwise forces a single pass). The sandbox
	// is the statistical-confidence path: the in-sandbox repeats give p50/stdev per Metric.
	// BENCH_PASSES=1 (host env) opts a run out for fast contract-verification iteration -- one pass
	// per task, ~3x faster on multi-pass suites; never set it for a run whose numbers you publish.
	...(process.env.BENCH_PASSES === "1" ? [] : ["export PTS_RESPECT_TIMES_TO_RUN=1"]),
	'if [ "$(id -u)" = 0 ]; then SUDO=""; elif command -v sudo >/dev/null 2>&1; then SUDO="sudo -E"; else SUDO=""; fi',
].join("; ");

/** Print liveness every 2 min while a long step runs — exec transports buffer output, so without
 *  this a healthy multi-minute benchmark looks hung in the CI log. */
const HEARTBEAT_MS = 2 * MIN;
function startHeartbeat(label: string, startedAt: number, timeoutMs: number): () => void {
	const timer = setInterval(() => {
		const elapsedMin = Math.round((performance.now() - startedAt) / MIN);
		console.log(`    [${label}] still running (${elapsedMin}m of ${Math.round(timeoutMs / MIN)}m)`);
	}, HEARTBEAT_MS);
	timer.unref?.();
	return () => clearInterval(timer);
}

/**
 * Runs suite steps against one sandbox, charging each step's elapsed wall time to the current Phase
 * (`phase` is mutated by the orchestrator as the job progresses). One instance per sandbox/suite job.
 */
export class StepRunner {
	/** The phase subsequent steps are charged to. */
	phase: Phase = "setup";
	/** Every executed step with its phase, elapsed ms, and exit code. */
	readonly stepLog: StepLogEntry[] = [];

	constructor(
		private readonly sandbox: SandboxHandle,
		/** The provider's exec transport capability — {@link step} selects sync vs detached from it. */
		private readonly transport: ProviderTransport = DEFAULT_TRANSPORT,
		/** The inter-poll sleep used by {@link runDetached}; injectable so tests can assert the backoff
		 *  schedule without real waiting. */
		private readonly sleep: (ms: number) => Promise<void> = delay,
	) {}

	/**
	 * Run a step on the transport the provider's {@link ProviderTransport} calls for: detached+poll when
	 * the step's budget could outlast the provider's synchronous cap and the provider supports it,
	 * otherwise a direct synchronous exec (see {@link selectTransport}). This is the capability-driven
	 * entry point the orchestrator uses for every step whose runtime can reach into the minutes (setup
	 * installs, the benchmark, result collection); trivial sub-second probes can call {@link run}
	 * directly. Both underlying transports populate `result.stdout`, so callers read it identically.
	 */
	async step(
		label: string,
		script: string,
		timeoutMs: number,
		opts: StepOptions = {},
	): Promise<CommandResult> {
		return selectTransport(this.transport, timeoutMs) === "detached"
			? this.runDetached(label, script, timeoutMs, opts)
			: this.run(label, script, timeoutMs, opts);
	}

	/**
	 * Synchronous foreground exec — for short steps. The timeout is a wait-cap, not a kill: on timeout
	 * the host stops waiting but the in-sandbox process keeps running server-side until job teardown
	 * destroys the sandbox. Use {@link runDetached} for long steps, which can 408 here and which it
	 * best-effort kills on timeout.
	 */
	async run(
		label: string,
		script: string,
		timeoutMs: number,
		opts: StepOptions = {},
	): Promise<CommandResult> {
		console.log(`\n=== [${label}] ===`);
		const started = performance.now();
		const stopHeartbeat = startHeartbeat(label, started, timeoutMs);
		let result: CommandResult;
		try {
			result = await withTimeout(
				this.sandbox.runCommand(`bash -c ${shellQuote(`${PREAMBLE}; ${script}`)}`),
				timeoutMs,
				`Step "${label}" timed out after ${Math.round(timeoutMs / 1000)}s`,
			);
		} finally {
			stopHeartbeat();
		}
		return this.finishStep(label, started, result, opts);
	}

	/**
	 * Run a long step on the durable detached transport: start it in the background (output → log
	 * file, exit code → done-file), then poll until the done-file appears and read both back. Survives
	 * Daytona's 408 on multi-minute synchronous execs. On timeout the detached job is best-effort
	 * killed; the job teardown's `destroy()` is the backstop either way.
	 *
	 * The background launch is double-fork daemonized: a single nohup/setsid still blocks e2b's envd,
	 * which holds the exec open for as long as its direct child lives (probed live), so the direct
	 * child backgrounds the real job via a second nohup and exits at once — the step truly detaches
	 * across providers. Completion is observed through the sandbox filesystem when one is exposed;
	 * otherwise (providers whose adapter has no filesystem API, and the unit-test fakes) it falls back
	 * to reading the done-file with a `cat` exec. The poll interval backs off adaptively
	 * ({@link POLL_START_MS} → ×{@link POLL_BACKOFF}, capped at {@link POLL_CAP_MS}) so a step that
	 * finishes quickly isn't over-charged for polling.
	 */
	async runDetached(
		label: string,
		script: string,
		timeoutMs: number,
		opts: StepOptions = {},
	): Promise<CommandResult> {
		console.log(`\n=== [${label}] (detached) ===`);
		const fs = this.sandbox.filesystem;
		const started = performance.now();
		const stopHeartbeat = startHeartbeat(label, started, timeoutMs);
		const tag = `bench-${randomUUID()}`;
		const logPath = `/tmp/${tag}.log`;
		const donePath = `/tmp/${tag}.done`;
		try {
			// Start fully detached so the job outlives the (short-lived, 408-prone) exec round-trip.
			// Run preamble+script in a nested `bash -c` so `set -eo pipefail` governs the inner shell:
			// as part of the outer `&&/||` list a `{ … }` group has `set -e` suspended, so a mid-script
			// failure followed by a passing command would exit 0 and be recorded as success. The inner
			// shell aborts on first failure and its real exit code flows through the `&&/||` capture —
			// success writes 0, failure writes the real code.
			const wrapped =
				`bash -c ${shellQuote(`${PREAMBLE}; ${script}`)} > ${logPath} 2>&1 ` +
				`&& echo 0 > ${donePath} || echo $? > ${donePath}`;
			// Double-fork daemonization: a single nohup/setsid still blocks e2b's envd, which holds the
			// exec open for as long as its DIRECT child lives (probed live: even `nohup ... &` pins the
			// exec for the child's whole life; setsid doesn't help). So the direct child backgrounds the
			// real job via a second nohup and exits at once — Daytona/Blaxel detach fine either way.
			const daemonized = `nohup bash -c ${shellQuote(wrapped)} </dev/null >/dev/null 2>&1 &`;
			const launch = `nohup bash -c ${shellQuote(daemonized)} </dev/null >/dev/null 2>&1 & echo launched`;
			await this.sandbox.runCommand(`bash -c ${shellQuote(launch)}`, { background: true });

			// Poll for the done-file, backing off adaptively so a quick step isn't over-charged for polls.
			const deadline = started + timeoutMs;
			let pollDelayMs = POLL_START_MS;
			for (;;) {
				const exitCode = fs
					? await this.pollDoneViaFs(fs, donePath)
					: await this.pollDoneViaCat(donePath);
				if (exitCode !== undefined) {
					const stdout = fs
						? await withTimeout(fs.readFile(logPath), POLL_CAP_MS, "log fs read").catch(() => "")
						: await this.catFile(logPath);
					return this.finishStep(label, started, { exitCode, stdout }, opts);
				}
				if (performance.now() > deadline) {
					// Recover the detached job's own output BEFORE killing it and tearing the sandbox down.
					// A timed-out step is otherwise a black box: the log lives only inside the sandbox, and
					// a step that hangs is exactly the one whose output we need. Best-effort — a failed read
					// must not mask the timeout.
					const tail = await this.readLogTail(fs, logPath);
					// Best-effort stop the detached job; don't let a failing kill mask the timeout.
					await this.sandbox
						.runCommand(`pkill -f ${shellQuote(tag)} || true`)
						.catch(() => undefined);
					if (tail === null) {
						console.log(
							`--- "${label}" timed out and its log could not be read: the sandbox stopped ` +
								`responding (memory exhaustion or a dead agent), rather than running quietly ---`,
						);
					} else if (tail) {
						console.log(`--- last output from "${label}" before timeout ---\n${tail}`);
					}
					throw new Error(`Step "${label}" timed out after ${Math.round(timeoutMs / 1000)}s`);
				}
				await this.sleep(pollDelayMs);
				pollDelayMs = Math.min(pollDelayMs * POLL_BACKOFF, POLL_CAP_MS);
			}
		} finally {
			stopHeartbeat();
		}
	}

	/** Check the filesystem-backed done-file: its trimmed contents are the exit code, or `undefined`
	 *  while the detached step is still running. */
	private async pollDoneViaFs(
		fs: SandboxFilesystem,
		donePath: string,
	): Promise<number | undefined> {
		try {
			// Bound both fs calls so a hung filesystem API (some adapters go over the network) can't
			// stall the poll loop indefinitely — the outer deadline only advances between iterations.
			if (!(await withTimeout(fs.exists(donePath), POLL_CAP_MS, "done-file fs exists"))) {
				return undefined;
			}
			// The background script writes the done-file non-atomically (truncate, then echo the code),
			// so an empty read means "created but not yet written" — still running, not exit 0.
			const raw = (
				await withTimeout(fs.readFile(donePath), POLL_CAP_MS, "done-file fs read")
			).trim();
			return raw === "" ? undefined : parseExitCode(raw);
		} catch {
			// A transient fs blip counts as not-yet-done; the caller's deadline bounds total retry time.
			return undefined;
		}
	}

	/** Poll fallback for providers whose adapter exposes no filesystem API: read the done-file with a
	 *  `cat` exec, treating the {@link RUNNING_SENTINEL} (or empty output) as not-done-yet. */
	private async pollDoneViaCat(donePath: string): Promise<number | undefined> {
		// Bound the exec so a hung `cat` can't outlast the step budget, and treat any transient
		// exec error as not-yet-done (the caller's deadline bounds total retry time).
		const probe = await withTimeout(
			this.sandbox.runCommand(
				`bash -c ${shellQuote(`cat ${donePath} 2>/dev/null || echo ${RUNNING_SENTINEL}`)}`,
			),
			POLL_CAP_MS,
			"done-file cat poll",
		).catch(() => undefined);
		const out = (probe?.stdout ?? "").trim();
		if (out === "" || out === RUNNING_SENTINEL) return undefined;
		return parseExitCode(out);
	}

	/** The last {@link TIMEOUT_LOG_TAIL_LINES} lines of a detached step's log, or `null` when the log
	 *  could not be read at all. The distinction matters: an empty tail means the step ran quietly,
	 *  whereas an unreadable one means the sandbox stopped answering — a very different diagnosis, and
	 *  collapsing both to "" once sent us hunting a detach bug that was really memory exhaustion.
	 *  Bounded so a runaway log can't flood the CI transcript; never throws. */
	private async readLogTail(
		fs: SandboxFilesystem | undefined,
		logPath: string,
	): Promise<string | null> {
		const text = fs
			? await withTimeout(fs.readFile(logPath), POLL_CAP_MS, "log fs read").catch(() => null)
			: await this.catLogOrNull(logPath);
		if (text === null) return null;
		const lines = text.trimEnd().split("\n");
		return lines.slice(-TIMEOUT_LOG_TAIL_LINES).join("\n");
	}

	/** `cat` the log for {@link readLogTail}, preserving a read failure as `null`. Deliberately NOT
	 *  {@link catFile}: that one folds every failure into `""`, which is right for the poll loop (an
	 *  absent done-file is not an error) but would make a wedged sandbox indistinguishable from a step
	 *  that simply printed nothing — the one distinction this diagnostic exists to draw. */
	private async catLogOrNull(logPath: string): Promise<string | null> {
		return withTimeout(
			this.sandbox.runCommand(`bash -c ${shellQuote(`cat ${logPath} 2>/dev/null || true`)}`),
			POLL_CAP_MS,
			"log cat read",
		)
			.then((res) => res.stdout ?? "")
			.catch(() => null);
	}

	/** Read the detached step's log over `exec` — the output transport for the no-filesystem path. */
	private async catFile(logPath: string): Promise<string> {
		const res = await withTimeout(
			this.sandbox.runCommand(`bash -c ${shellQuote(`cat ${logPath} 2>/dev/null || true`)}`),
			POLL_CAP_MS,
			"log cat read",
		).catch(() => undefined);
		return res?.stdout ?? "";
	}

	/** Shared post-step bookkeeping: record the step, echo output (unless silent), enforce exit code. */
	private finishStep(
		label: string,
		started: number,
		result: CommandResult,
		opts: StepOptions,
	): CommandResult {
		const elapsedMs = Math.round(performance.now() - started);
		const elapsedS = (elapsedMs / 1000).toFixed(1);
		this.stepLog.push({
			phase: this.phase,
			label,
			ms: elapsedMs,
			exitCode: result.exitCode,
		});

		if (result.stdout && !opts.silent) {
			process.stdout.write(result.stdout.endsWith("\n") ? result.stdout : `${result.stdout}\n`);
		}
		if (result.stderr && !opts.silent) {
			process.stderr.write(result.stderr.endsWith("\n") ? result.stderr : `${result.stderr}\n`);
		}
		console.log(`=== [${label}] exit ${result.exitCode} in ${elapsedS}s ===`);

		if (result.exitCode !== 0 && !opts.allowFailure) {
			// A silent step withheld its output above; surface it now so the failure is debuggable. The
			// detached transport merges stderr into stdout (2>&1), so fall back to stdout when no stderr.
			if (opts.silent) {
				const tail = result.stderr || result.stdout;
				if (tail) process.stderr.write(tail.endsWith("\n") ? tail : `${tail}\n`);
			}
			throw new Error(`Step "${label}" failed with exit code ${result.exitCode}`);
		}
		return result;
	}
}
