// Public surface of @sandbox-benchmarks/harness — drives a provider to produce raw benchmark output.
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { DirectProvider, ProviderConfig } from "@sandbox-benchmarks/providers";
import { providers } from "@sandbox-benchmarks/providers";
import type { ProviderTransport, RawRun, ResultGap, Suite } from "@sandbox-benchmarks/schema";
import { HARNESS_METRIC_IDS, isPtsResultFile, SUITES } from "@sandbox-benchmarks/schema";
import { collectResults, writeGapMarker } from "./lib/collect.ts";
import type { SandboxHandle } from "./lib/execute.ts";
import { MIN, resolvePtsPassPolicy, StepRunner, withTimeout } from "./lib/execute.ts";
import { time } from "./lib/internal.ts";
import type { LifecycleAggregate, LifecycleCompute } from "./lib/lifecycle.ts";
import { aggregateLifecycle, measureLifecycle } from "./lib/lifecycle.ts";
import { DIR, OBSERVED_SPECS_SCRIPT, REPO_REF, REPO_URL, setupSteps } from "./lib/setup.ts";

// Re-export the lifecycle measurement surface so consumers import it from the package root, never
// from `src/lib` (the package-boundary rule the other modules follow).
export type {
	LifecycleAggregate,
	LifecycleCompute,
	LifecycleMeasurement,
	LifecycleSandbox,
	LifecycleSnapshots,
	MeasureLifecycleOptions,
} from "./lib/lifecycle.ts";
export { aggregateLifecycle, measureLifecycle } from "./lib/lifecycle.ts";

/**
 * The universal sandbox a provider's `sandbox.create` returns (computesdk's `Sandbox`). Derived from
 * {@link DirectProvider} so the harness depends only on providers — it never imports computesdk
 * directly — while still being exactly typed (runCommand/destroy/filesystem).
 */
export type Sandbox = Awaited<ReturnType<DirectProvider["sandbox"]["create"]>>;

/** Time a single operation against a provider, producing a {@link RawRun}. */
export async function timeOperation(
	config: ProviderConfig,
	operation: string,
	run: () => Promise<void> | void,
): Promise<RawRun> {
	// NOTE: a rejected `run` currently propagates and no sample is recorded. Capturing failed-run
	// duration as an error sample lands when `rawRunSchema` grows an error shape.
	const { ms } = await time(run);
	return { provider: config.name, operation, durationMs: ms };
}

export interface BenchmarkLifecycleOptions {
	/** Full cold-start cycles to run, each a fresh sandbox — the cold-start/teardown Sample count. Default `5`. */
	iterations?: number;
	/** Control-plane read probes per cycle (cheap, share one sandbox). Default `5`. */
	controlPlaneSamples?: number;
	/** Trivial command timed for the exec round-trip floor. Default `"true"`. */
	execCommand?: string;
	/** Attempt a snapshot each cycle (skipped+recorded when the SDK exposes none). Default `true`. */
	snapshot?: boolean;
	/** Readiness probes per cold start before giving up. Default `40` (the driver's default). */
	readinessMaxAttempts?: number;
	/** Delay between failed readiness probes, in ms. Default `250` (the driver's default). */
	readinessRetryDelayMs?: number;
	/** Time a 64KiB-stdout exec each cycle (the payload control-plane Metric). Default `true`. */
	payload?: boolean;
}

/** A provider's lifecycle/control-plane measurement: raw Samples, per-Metric distributions, and gaps. */
export interface LifecycleBenchmark {
	provider: string;
	samples: RawRun[];
	aggregates: LifecycleAggregate[];
	/** Operation-scoped gaps — `skipped` (never attempted) or `failed` (attempted, errored). */
	gaps: ResultGap[];
}

/**
 * Benchmark a provider's lifecycle and control-plane timings: run `iterations` cold-start cycles
 * (spawn → readiness probe → exec → control-plane probes → payload exec → snapshot → teardown) via
 * {@link measureLifecycle}, then aggregate the Samples per catalogued Metric id. Each cycle is a fresh
 * sandbox, so spawn/cold-start/teardown yield one Sample per iteration; the cheap control-plane reads
 * are sampled within each sandbox.
 *
 * The provider's `createCompute()` returns a computesdk `DirectProvider`, which structurally satisfies
 * {@link LifecycleCompute} (the minimal create/list/snapshot/destroy slice the driver times). A spawn
 * failure rejects (no sandbox to tear down); every other per-op failure is recorded as a FAILED gap, so
 * a single flaky probe can't sink the whole benchmark — while still being published as the outage it is.
 */
export async function benchmarkLifecycle(
	config: ProviderConfig,
	options: BenchmarkLifecycleOptions = {},
): Promise<LifecycleBenchmark> {
	// `?? 5` only catches undefined; a non-finite iterations would make `i < iterations` never run
	// (NaN) or never stop (Infinity), so it falls back to a single cycle.
	const rawIterations = options.iterations ?? 5;
	const iterations = Number.isFinite(rawIterations) ? Math.max(1, Math.floor(rawIterations)) : 1;
	const compute: LifecycleCompute = config.createCompute();

	const samples: RawRun[] = [];
	const gaps: ResultGap[] = [];
	for (let i = 0; i < iterations; i++) {
		try {
			const pass = await measureLifecycle(compute, {
				provider: config.name,
				createOptions: config.createOptions,
				execCommand: options.execCommand,
				controlPlaneSamples: options.controlPlaneSamples ?? 5,
				snapshot: options.snapshot,
				readinessMaxAttempts: options.readinessMaxAttempts,
				readinessRetryDelayMs: options.readinessRetryDelayMs,
				payload: options.payload,
			});
			samples.push(...pass.samples);
			gaps.push(...pass.gaps);
		} catch (err) {
			// Only a spawn failure rejects measureLifecycle (every later step is best-effort). A failed
			// cold start shouldn't discard the cycles that already succeeded, so record it as a FAILED spawn
			// gap and keep going; the dedup below collapses an identical failure repeated across cycles. It
			// is a failure, not a skip: the provider was asked for a sandbox and did not produce one.
			const reason = err instanceof Error ? err.message : String(err);
			gaps.push({
				scope: "operation",
				id: HARNESS_METRIC_IDS.spawn,
				outcome: "failed",
				reason,
			});
		}
	}

	// A gap that's the same every cycle (an unsupported op) would otherwise repeat `iterations` times;
	// collapse to one per (outcome, op, reason) so the summary stays readable while real per-cycle
	// variation (e.g. a transient error one cycle, success the next) is still preserved distinctly.
	// `outcome` is in the key: an op that was skipped on one cycle and failed on another is two facts.
	const seen = new Set<string>();
	const dedupedGaps = gaps.filter((gap) => {
		// NUL-separate the key so a metric id (or reason) that ever contains a space can't blur the
		// boundary and collapse two genuinely-distinct gaps into one.
		const key = [gap.outcome, gap.id, gap.reason].join("\u0000");
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});

	return {
		provider: config.name,
		samples,
		aggregates: aggregateLifecycle(samples),
		gaps: dedupedGaps,
	};
}

/** An unknown provider or suite is a usage error, distinct from an operational failure mid-run. */
export class SuiteUsageError extends Error {}

export interface RunSuiteOptions {
	/** Provider to create the sandbox on — must be in the provider registry. */
	providerName: string;
	/** Suite to run — must be a key of SUITES. */
	suiteName: string;
	/** Host directory to extract results into (e.g. `data/raw/<runId>/<provider>`). */
	resultsDir: string;
	/** Credential source for the provider's required env vars (default: process.env). */
	env?: Record<string, string | undefined>;
}

async function destroySandbox(sandbox: SandboxHandle | undefined): Promise<void> {
	if (!sandbox) return;
	try {
		await withTimeout(Promise.resolve(sandbox.destroy()), 15_000, "Destroy timeout");
	} catch (err) {
		console.warn(`[cleanup] destroy failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Run a benchmark suite inside a provider sandbox: clone the repo (carrying the in-sandbox producer),
 * run the suite's mise commands, and pull benchmark-results/ back to `resultsDir`. Uses the sandbox
 * as a CI runner — it does NOT measure the sandbox lifecycle itself (that's the lifecycle path).
 * Missing credentials or insufficient disk are recorded as skip markers, not failures.
 */
export async function runSuite(options: RunSuiteOptions): Promise<void> {
	const { providerName, suiteName, env = process.env } = options;
	const resultsDir = resolve(options.resultsDir);

	const suite: Suite | undefined = (SUITES as Record<string, Suite>)[suiteName];
	if (!suite) {
		throw new SuiteUsageError(
			`Unknown suite "${suiteName}". Known suites: ${Object.keys(SUITES).join(", ")}`,
		);
	}

	const config = providers.find((p) => p.name === providerName);
	if (!config) {
		throw new SuiteUsageError(
			`Unknown provider "${providerName}". Known providers: ${providers.map((p) => p.name).join(", ")}`,
		);
	}

	const missingVars = config.requiredEnvVars.filter((v) => !env[v]);
	if (missingVars.length > 0) {
		const reason = `Missing credentials: ${missingVars.join(", ")}`;
		console.log(`SKIPPED ${providerName}/${suiteName}: ${reason}`);
		writeGapMarker(resultsDir, providerName, suiteName, "skipped", reason);
		return;
	}

	console.log(`\n--- Sandbox suite: ${suiteName} on ${providerName} (${REPO_URL}@${REPO_REF}) ---`);

	// Pass the adapter as a factory, not an already-built compute: `createCompute()` can itself throw
	// (bad provider config, a missing SDK) BEFORE `sandbox.create` is ever reached, and that path must
	// record the same failed marker — otherwise the exact incident this guards (an empty Run for a dead
	// provider config) slips through the one seam creation-failure handling would otherwise leave open.
	const sandbox = await createSuiteSandbox(() => config.createCompute(), {
		suite,
		suiteName,
		providerName,
		resultsDir,
		createOptions: config.createOptions,
	});

	await runSuiteOnSandbox(sandbox, {
		suite,
		suiteName,
		providerName,
		resultsDir,
		transport: config.transport,
	});
}

/** A provider's pinned create-time options ({@link ProviderConfig.createOptions}), recovered
 *  structurally so the harness keeps importing only from providers, never computesdk directly. */
type SandboxCreateOptions = NonNullable<ProviderConfig["createOptions"]>;

/** The create slice of a computesdk provider that {@link createSuiteSandbox} drives — structural
 *  (like `LifecycleCompute`) so the marker-on-throw contract is testable against a fake compute. */
export interface SuiteSandboxCompute {
	sandbox: {
		create(options?: SandboxCreateOptions): Promise<SandboxHandle>;
	};
}

// Concurrent jobs share one provider account; quota/capacity errors mean "no slot right now", not
// "broken" — retry patiently so jobs self-serialize as earlier sandboxes are destroyed.
const CREATE_RETRY_BUDGET_MS = 60 * MIN;
const CREATE_RETRY_DELAY_MS = 2 * MIN;
/** How long a single `sandbox.create` may run before the attempt is abandoned (and any late handle
 *  destroyed). Generous: a cold provider image can take minutes to provision. */
const CREATE_ATTEMPT_TIMEOUT_MS = 5 * MIN;

/**
 * Prefix on a creation-failure gap marker's reason. The single source of truth for BOTH sides of the
 * contract: {@link createSuiteSandbox} builds the marker reason from it, and bench-suite matches on it
 * to confirm the marker it expected actually survived. Exported so a wording change can't drift the two
 * apart silently — an edit here moves both the writer and the verifier at once.
 */
export const CREATE_FAILURE_PREFIX = "Failed to create sandbox: ";

/** The cell {@link createSuiteSandbox} creates for, plus where a creation failure must be recorded. */
export interface CreateSuiteSandboxContext {
	suite: Suite;
	suiteName: string;
	providerName: string;
	/** Host results dir the FAILED marker lands in when creation ultimately throws. */
	resultsDir: string;
	/** The provider's pinned create-time options; the suite's lifetime is layered on top. */
	createOptions?: SandboxCreateOptions;
	/** Per-attempt create timeout, ms. Defaults to {@link CREATE_ATTEMPT_TIMEOUT_MS}; injectable so the
	 *  timeout-leak path (a create that resolves after the race is lost) is exercisable in tests. */
	createTimeoutMs?: number;
}

/**
 * Create the sandbox a suite will run on, retrying patiently through capacity errors. Any error that
 * ESCAPES — a factory (adapter-construction) throw, a non-capacity create failure, the per-attempt
 * timeout, or the capacity-retry budget exhausting — writes a FAILED gap marker before rethrowing:
 * creation failed BEFORE any result could exist, so without the marker the shard normalizes into an
 * empty Run (no result, no gap) and the published Run cannot tell "the provider refused a sandbox"
 * from "this cell was never scheduled" (the same contract as the post-run failure marker in
 * {@link runSuiteOnSandbox}). Capacity errors are unchanged: each retry stays unmarked, and only the
 * throw that finally spends the budget records the failure. Split from {@link runSuite} (the
 * runSuiteOnSandbox precedent) so this is testable against a fake compute.
 *
 * `computeFactory` (not a pre-built compute) so adapter construction lives INSIDE the marker path — a
 * computesdk provider can throw before `sandbox.create`, and that throw must be recorded too. The
 * factory is cheap and idempotent, so re-invoking it per capacity retry is harmless.
 */
export async function createSuiteSandbox(
	computeFactory: () => SuiteSandboxCompute,
	ctx: CreateSuiteSandboxContext,
): Promise<SandboxHandle> {
	const { suite, suiteName, providerName, resultsDir, createOptions } = ctx;
	const createTimeoutMs = ctx.createTimeoutMs ?? CREATE_ATTEMPT_TIMEOUT_MS;
	const createDeadline = Date.now() + CREATE_RETRY_BUDGET_MS;
	for (let attempt = 1; ; attempt++) {
		// Undefined until `sandbox.create` is actually invoked: a factory throw leaves it unset (nothing
		// was created, so there is nothing to clean up), while a create that outlives the timeout leaves it
		// a pending promise whose late handle must still be destroyed (see the catch).
		let createPromise: Promise<SandboxHandle> | undefined;
		try {
			const compute = computeFactory();
			createPromise = Promise.resolve(
				compute.sandbox.create({
					...createOptions,
					// Ask for a sandbox lifetime covering setup + the suite, where supported.
					timeout: suite.timeoutMinutes * MIN,
				}),
			);
			return await withTimeout(createPromise, createTimeoutMs, "Sandbox creation timed out");
		} catch (err) {
			// `withTimeout` only RACES the create — it cannot cancel it. A create that resolves after the
			// timeout (or after a capacity error on a later attempt) leaves a live sandbox no one awaits, and
			// some providers never auto-stop it (Daytona's `autoStopInterval: 0`), so it would run until its
			// own lifetime expires. Destroy the late arrival once it lands. No-op when `createPromise` is
			// undefined (factory threw) or already rejected (the create itself failed): nothing was created.
			if (createPromise !== undefined) {
				void createPromise.then(
					(late) => destroySandbox(late),
					() => {},
				);
			}
			const message = err instanceof Error ? err.message : String(err);
			const capacity = /quota|rate.?limit|too many|capacity|429/i.test(message);
			if (!capacity || Date.now() + CREATE_RETRY_DELAY_MS > createDeadline) {
				// Best-effort: a marker-write failure (full/read-only results dir) must not REPLACE the
				// provider error — the creation failure is the fact worth propagating, the marker is its
				// paper trail. Log the write failure and rethrow the original either way.
				try {
					writeGapMarker(
						resultsDir,
						providerName,
						suiteName,
						"failed",
						`${CREATE_FAILURE_PREFIX}${message}`,
					);
				} catch (markerErr) {
					console.error(
						`Could not write the creation-failure gap marker (${
							markerErr instanceof Error ? markerErr.message : String(markerErr)
						}); the sandbox-creation error below is unaffected`,
					);
				}
				throw err;
			}
			console.log(
				`Sandbox create attempt ${attempt} hit a capacity limit (${message.slice(0, 140)}); ` +
					`retrying in ${CREATE_RETRY_DELAY_MS / 1000}s...`,
			);
			await new Promise((r) => setTimeout(r, CREATE_RETRY_DELAY_MS));
		}
	}
}

/** The already-resolved context {@link runSuiteOnSandbox} runs against. */
export interface SuiteRunContext {
	suite: Suite;
	suiteName: string;
	providerName: string;
	resultsDir: string;
	/** The provider's exec transport capability — drives the per-step sync/detached choice. */
	transport: ProviderTransport;
}

/**
 * Run a suite against an already-created sandbox, then tear it down (run-and-dispose). Split from
 * {@link runSuite} so the orchestration — disk gate, setup, benchmark, result collection, the
 * benchmark-vs-collect error precedence, and the always-runs teardown — is testable against a fake
 * sandbox without provisioning a real one. Long steps (setup installs, the benchmark, result
 * collection) run through the capability-driven {@link StepRunner.step}, which picks the detached
 * transport for a provider whose synchronous exec is capped (e.g. Daytona's 408 on multi-minute
 * commands) and a direct exec for an uncapped one.
 */
export async function runSuiteOnSandbox(
	sandbox: SandboxHandle,
	ctx: SuiteRunContext,
): Promise<void> {
	const { suite, suiteName, providerName, resultsDir, transport } = ctx;
	let suiteError: unknown;
	try {
		// Resolve the PTS pass policy from the suite's own default (converge for the synthetic suites, a
		// fixed single pass for realworld) and the BENCH_PTS_PASSES override. Constructed inside the try so
		// a bad policy (buildPreamble rejects a fixed k < 1) is still torn down by the finally below; a
		// throw before the try would leak the already-created sandbox.
		const runner = new StepRunner(sandbox, transport, undefined, resolvePtsPassPolicy(suite));
		runner.phase = "setup";
		if (suite.minDiskGb) {
			// Measure free space where the disk-heavy suites actually write, not the sandbox root. The
			// heavy PTS data (realworld clones/builds, pgbench cluster, fio test files, installed-tests)
			// lives under the PTS data dir; on Blaxel a 40 GiB volume is mounted there while / stays a
			// small RAM-overlay tmpfs, so gating on `/` would wrongly skip suites the volume has room for.
			// The dir exists on every baked-image provider (on the root fs → identical to `/`) and on
			// Blaxel (the mount); it's absent only pre-PTS on a stock gVisor root (Modal), where the `/`
			// fallback preserves today's behavior.
			const df = await runner.run(
				"check free disk",
				'd=/var/lib/phoronix-test-suite; [ -d "$d" ] || d=/; df -Pk "$d" | awk \'NR==2 {print $4}\'',
				MIN,
			);
			// Treat non-numeric df output as 0 free (skip) — a NaN comparison would silently pass the check.
			const freeKb = Number.parseInt((df.stdout || "").trim(), 10);
			const freeGb = Number.isNaN(freeKb) ? 0 : freeKb / 1024 / 1024;
			if (freeGb < suite.minDiskGb) {
				const reason = `Insufficient disk: ${freeGb.toFixed(1)} GiB free, suite needs ${suite.minDiskGb} GiB`;
				console.log(`SKIPPED ${providerName}/${suiteName}: ${reason}`);
				writeGapMarker(resultsDir, providerName, suiteName, "skipped", reason);
				return;
			}
		}

		for (const step of setupSteps(suite)) {
			const attempts = (step.retries ?? 0) + 1;
			for (let attempt = 1; ; attempt++) {
				try {
					// A multi-minute install (mise/PTS/apt) would 408 a synchronous exec on a capped
					// provider — step() detaches it there and runs it directly on an uncapped one.
					await runner.step(step.label, step.script, step.timeoutMs);
					break;
				} catch (err) {
					if (attempt >= attempts) throw err;
					console.log(`Step "${step.label}" failed, retrying (${attempt + 1}/${attempts})...`);
				}
			}
		}

		// Observed specs are best-effort: a spec probe must never fail a Run (hence allowFailure below).
		await runner.run("capture observed specs", OBSERVED_SPECS_SCRIPT, MIN, { allowFailure: true });

		try {
			runner.phase = "benchmark";
			for (const command of suite.commands) {
				// The cpu-node command budgets 110 min — far past a capped provider's synchronous-exec
				// limit (Daytona's 408), so step() detaches there; an uncapped provider runs it directly.
				await runner.step(command, `cd ${DIR} && ${command}`, suite.commandTimeoutMinutes * MIN);
			}
		} catch (err) {
			// Still pull whatever results were produced before failing the job.
			suiteError = err;
		}

		try {
			await collectResults(runner, resultsDir);
		} catch (collectErr) {
			// A failed result-pull must not mask an in-flight benchmark error. Recorded rather than
			// rethrown here so both error paths converge on the single exit below — which is what writes
			// the failure marker.
			if (suiteError) {
				console.warn(
					`[collect] failed after benchmark error: ${collectErr instanceof Error ? collectErr.message : String(collectErr)}`,
				);
			} else {
				suiteError = collectErr;
			}
		}

		// PTS exits 0 even when a profile fails to install, so a broken environment yields a green job
		// with an empty artifact — treat "no pts_*.xml from a PTS suite" as a failure.
		if (!suiteError && suite.setupPts && !readdirSync(resultsDir).some(isPtsResultFile)) {
			suiteError = new Error(
				`Suite "${suiteName}" on ${providerName} produced no pts_*.xml — PTS likely failed silently`,
			);
		}
	} finally {
		await destroySandbox(sandbox);
	}

	if (suiteError) {
		// Record the failure INTO the results tree before the job goes red. Without this the suite leaves
		// no trace at all: it produced no result, and a job that throws writes no marker, so the published
		// Run cannot tell "this provider crashed on the workload" from "this cell was never scheduled".
		// The leaderboard still derives a `missing` gap when even this marker is lost (the artifact upload
		// is itself best-effort), but a marker that survives says WHY, and that is the whole difference.
		const reason = suiteError instanceof Error ? suiteError.message : String(suiteError);
		writeGapMarker(resultsDir, providerName, suiteName, "failed", reason);
		throw suiteError;
	}
	console.log(`\nDone: ${suiteName} on ${providerName}`);
}

/**
 * Run `fn` against a freshly created sandbox and guarantee teardown. Constructs the provider lazily
 * (so importing the registry needs no credentials), creates a sandbox with the adapter's pinned
 * {@link ProviderConfig.createOptions}, and always destroys it — even if `fn` throws. This is the
 * boot→exec→teardown chain the benchmarks and bench-smoke drive.
 */
export async function withSandbox<T>(
	config: ProviderConfig,
	fn: (sandbox: Sandbox) => Promise<T>,
): Promise<T> {
	const compute = config.createCompute();
	const sandbox = await compute.sandbox.create(config.createOptions);
	let result: T;
	try {
		result = await fn(sandbox);
	} catch (err) {
		// fn failed: tear down once, but never let a destroy error mask the root cause (a
		// `finally { await destroy() }` would swallow it). Log the secondary failure and rethrow fn's.
		try {
			await sandbox.destroy();
		} catch (destroyErr) {
			console.error(
				`withSandbox: destroy failed after an error in fn (${config.name}):`,
				destroyErr,
			);
		}
		throw err;
	}
	// fn succeeded: tear down once. A teardown failure here is the only error, so let it surface
	// (a leaked sandbox is worth failing on) — the result is already captured by the caller's fn.
	await sandbox.destroy();
	return result;
}

/**
 * The credentials a provider needs that are missing (unset/empty) from `env`. A runner can both
 * decide to skip and report exactly which vars are absent from this one list — the e2e surface is
 * CI-with-secrets. `env` is injectable so this stays unit-testable without touching `process.env`.
 */
export function missingCreds(
	config: ProviderConfig,
	env: Record<string, string | undefined> = process.env,
): string[] {
	return config.requiredEnvVars.filter((name) => (env[name]?.length ?? 0) === 0);
}

/** Whether every credential a provider needs is present (non-empty) in `env`. */
export function hasRequiredCreds(
	config: ProviderConfig,
	env: Record<string, string | undefined> = process.env,
): boolean {
	return missingCreds(config, env).length === 0;
}

/**
 * The providers a run is *required* to exercise — parsed from `--require <ids>` (or `--require=<ids>`)
 * in `argv`, falling back to the `REQUIRE_PROVIDERS` env var; both a comma-separated id list. Empty
 * when neither is set, which is the lenient local-dev default (missing creds simply skip). CI passes
 * `--require e2b,daytona-vm,modal-gvisor` at the publish boundary so a missing/misnamed secret fails loudly
 * instead of silently shipping a version whose provider artifacts were never built/validated. Tokens
 * are returned verbatim (not filtered to known ids) so a typo'd id surfaces as unmet rather than being
 * dropped. `argv`/`env` are injectable to keep this unit-testable.
 */
export function requiredProviders(
	argv: string[] = process.argv,
	env: Record<string, string | undefined> = process.env,
): string[] {
	let raw = "";
	const eq = argv.find((a) => a.startsWith("--require="));
	if (eq) {
		raw = eq.slice("--require=".length);
	} else {
		const i = argv.indexOf("--require");
		const next = i === -1 ? undefined : argv[i + 1];
		if (next !== undefined && !next.startsWith("-")) raw = next;
	}
	if (!raw) raw = env.REQUIRE_PROVIDERS ?? "";
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
}

/**
 * Of the `required` providers, those NOT satisfied by `reports` — i.e. no report with status `"ok"`.
 * Skipped, failed, and entirely-absent providers all count as unmet. `reports` is typed structurally
 * (`provider`/`status`) so both a {@link ProviderRun} list and a bake/promote report list fit without
 * coupling the harness to either shape. A caller enforces the requirement by exiting non-zero when the
 * result is non-empty (and `required` was non-empty).
 */
export function unmetRequirements(
	reports: ReadonlyArray<{ provider: string; status: string }>,
	required: readonly string[],
): string[] {
	const passed = new Set(reports.filter((r) => r.status === "ok").map((r) => r.provider));
	return required.filter((id) => !passed.has(id));
}
