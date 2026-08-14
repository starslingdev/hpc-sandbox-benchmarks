// Public surface of @sandbox-benchmarks/harness — drives a provider to produce raw benchmark output.
import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type {
	DirectProvider,
	ProviderConfig,
	ProviderCostEvidenceCapability,
	SandboxTeardownResult,
} from "@sandbox-benchmarks/providers";
import {
	isRetryableCreateError,
	providers,
	sanitizeEvidenceDetail,
	sanitizeProviderResponse,
} from "@sandbox-benchmarks/providers";
import type {
	BenchmarkLabel,
	ProviderCostCell,
	ProviderCostEvidence,
	ProviderId,
	ProviderTransport,
	RawRun,
	ResultGap,
	RunId,
	Suite,
	SuiteName,
} from "@sandbox-benchmarks/schema";
import {
	canonicalJsonEqual,
	canonicalJsonString,
	HARNESS_METRIC_IDS,
	isPtsResultFile,
	PROVIDER_EVIDENCE_JSON_LIMITS,
	PTS_BAKED_ROOT,
	parseProviderCostEvidence,
	SUITE_NAMES,
	SUITES,
} from "@sandbox-benchmarks/schema";
// `collectResults` is no longer called here — the execution plan owns collection — but stays
// re-exported below for callers, and is the sandbox plan's own `collect`.
import { writeGapMarker, writeProviderCostEvidence } from "./lib/collect.ts";
import type { SandboxHandle } from "./lib/execute.ts";
import { MIN, resolvePtsPassPolicy, StepRunner, withTimeout } from "./lib/execute.ts";
import { gapCauseOf } from "./lib/gap-cause.ts";
import { time } from "./lib/internal.ts";
import type { LifecycleAggregate, LifecycleCompute } from "./lib/lifecycle.ts";
import { aggregateLifecycle, measureLifecycle } from "./lib/lifecycle.ts";
import type { SuiteExecutionPlan } from "./lib/plan.ts";
import { SANDBOX_SUITE_PLAN } from "./lib/plan.ts";
import type { WaitUntilReadyOptions } from "./lib/readiness.ts";
import { neverReadyReason, waitUntilReady } from "./lib/readiness.ts";
import { createOwnedSandbox, withOwnedSandbox } from "./lib/sandbox-owner.ts";
import { REPO_REF, REPO_URL } from "./lib/setup.ts";

export { collectResults, writeGapMarker } from "./lib/collect.ts";
export type { CommandResult, SandboxHandle } from "./lib/execute.ts";
export { StepRunner } from "./lib/execute.ts";
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
// The bare-metal lane: a SandboxHandle over local child processes, and the plan that runs a suite in
// the developer's own checkout instead of a cloned one.
export { createLocalSandbox, LOCAL_TRANSPORT, localSuitePlan } from "./lib/local.ts";
// The execution seam itself, so a caller can name a mode (or build one) rather than passing four
// unrelated overrides.
export { SANDBOX_SUITE_PLAN, type SuiteExecutionPlan } from "./lib/plan.ts";
export {
	createOwnedSandbox,
	exitAfterSandboxCleanup,
	shutdownOwnedSandboxes,
	withCleanupPreservingPrimaryError,
	withOwnedSandbox,
} from "./lib/sandbox-owner.ts";
export { localSetupSteps, type SetupStep } from "./lib/setup.ts";

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
	/** Run identity carried into sandbox-scoped provider cost evidence. */
	runId: RunId;
	/** Replicate sandbox identity; omitted for a single unindexed run. */
	replicateIndex?: number;
	/** Provider to create the sandbox on — must be in the provider registry. */
	providerName: string;
	/** Suite to run — must be a key of SUITES. */
	suiteName: string;
	/** Host directory to extract results into. The CI fan-out gives each replicate sandbox its own
	 *  root, so this is `data/raw/<runId>/r<idx>/<provider>/<suite>` there and
	 *  `data/raw/<runId>/<provider>/<suite>` for a single-sandbox run. */
	resultsDir: string;
	/** Credential source for the provider's required env vars (default: process.env). */
	env?: Record<string, string | undefined>;
}

async function destroySandbox(sandbox: SandboxHandle | undefined): Promise<SandboxTeardownResult> {
	const attemptedAt = new Date().toISOString();
	if (!sandbox) return { completed: false, attemptedAt };
	try {
		await withTimeout(Promise.resolve(sandbox.destroy()), 15_000, "Destroy timeout");
		return { completed: true, attemptedAt, completedAt: new Date().toISOString() };
	} catch (err) {
		console.warn(`[cleanup] destroy failed: ${err instanceof Error ? err.message : String(err)}`);
		return { completed: false, attemptedAt };
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

	const knownSuiteName = SUITE_NAMES.find((name) => name === suiteName);
	if (!knownSuiteName) {
		throw new SuiteUsageError(
			`Unknown suite "${suiteName}". Known suites: ${Object.keys(SUITES).join(", ")}`,
		);
	}
	const suite = SUITES[knownSuiteName];

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
		writeGapMarker(resultsDir, providerName, suiteName, "skipped", reason, {
			kind: "missing-credentials",
			variables: missingVars,
		});
		return;
	}

	console.log(`\n--- Sandbox suite: ${suiteName} on ${providerName} (${REPO_URL}@${REPO_REF}) ---`);

	// Pass the adapter as a factory, not an already-built compute: `createCompute()` can itself throw
	// (bad provider config, a missing SDK) BEFORE `sandbox.create` is ever reached, and that path must
	// record the same failed marker — otherwise the exact incident this guards (an empty Run for a dead
	// provider config) slips through the one seam creation-failure handling would otherwise leave open.
	const sandbox = await createSuiteSandbox(() => config.createCompute(), {
		suite,
		suiteName: knownSuiteName,
		providerName: config.name,
		resultsDir,
		createOptions: config.createOptions,
		createTimeoutMs: config.createTimeoutMs,
		createAttemptCeilingMs: config.createAttemptCeilingMs,
	});

	await runSuiteOnSandbox(sandbox, {
		runId: options.runId,
		replicateIndex: options.replicateIndex,
		suite,
		suiteName: knownSuiteName,
		providerName: config.name,
		resultsDir,
		transport: config.transport,
		// The adapter's capability and the cell's ProviderId are the same provider by construction here;
		// pairing them at this one call site is what lets the context type keep them together.
		...(config.costEvidence
			? { costEvidence: { providerId: config.name, capability: config.costEvidence } }
			: {}),
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
 *  destroyed). Generous: a cold provider image can take minutes to provision. Adequate only for
 *  providers whose `create` returns once the control plane ACCEPTS the sandbox, with the image pull
 *  absorbed by a readiness probe afterwards; one that boots the image inline needs its own budget via
 *  {@link ProviderConfig.createTimeoutMs}, or `null` when its adapter owns readiness + cleanup and its
 *  create promise must never be abandoned. */
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
	/** Per-attempt create timeout, ms. Defaults to {@link CREATE_ATTEMPT_TIMEOUT_MS}; set per provider
	 *  (see {@link ProviderConfig.createTimeoutMs}) for adapters whose `create` boots the image inline,
	 *  or `null` when the adapter owns readiness + failed-allocation cleanup and abandoning its promise
	 *  would terminate that cleanup. Injectable so both paths are exercisable in tests. */
	createTimeoutMs?: number | null;
	/** Worst case one attempt can cost when `createTimeoutMs` is `null` — the ceiling the ADAPTER
	 *  enforces (see {@link ProviderConfig.createAttemptCeilingMs}), which the registry requires such an
	 *  adapter to declare. Ignored when the harness bounds the attempt itself: `createTimeoutMs` is then
	 *  the ceiling. */
	createAttemptCeilingMs?: number;
	/** Test seams for the capacity-retry loop. Production always uses the module constants; a test that
	 *  had to spend the real 2-minute delay to reach the second attempt would not be written, and an
	 *  unexercised retry path is what let a hard-failing create reach production in the first place. */
	retryDelayMs?: number;
	retryBudgetMs?: number;
	/** Test seam for the backoff itself, so a timer that fires LATE (the case the post-sleep deadline
	 *  recheck exists for) is reproducible instead of dependent on event-loop pressure. Production uses
	 *  `setTimeout`. */
	sleep?: (ms: number) => Promise<void>;
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
 * The retry budget bounds the whole call, not just the sleeps between attempts: a new attempt starts
 * only while the budget can still cover the backoff PLUS that attempt's worst case, so the failure
 * marker lands inside the budget rather than one attempt past it.
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
	const createTimeoutMs =
		ctx.createTimeoutMs === undefined ? CREATE_ATTEMPT_TIMEOUT_MS : ctx.createTimeoutMs;
	const retryDelayMs = ctx.retryDelayMs ?? CREATE_RETRY_DELAY_MS;
	// What one more attempt can cost, so the loop only starts an attempt the budget can still absorb.
	// When the harness races the create, its own timeout IS that ceiling; when the adapter owns the
	// bound (`createTimeoutMs: null`) it declares the ceiling instead, and the provider registry refuses
	// an adapter that disables the race without a POSITIVE one. Zero only for a hand-built context that
	// disables the race and declares nothing — nothing can be reserved for an attempt of unknown cost.
	const attemptCeilingMs = createTimeoutMs ?? ctx.createAttemptCeilingMs ?? 0;
	const sleep = ctx.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
	const createDeadline = Date.now() + (ctx.retryBudgetMs ?? CREATE_RETRY_BUDGET_MS);
	/** True while the budget can still absorb a whole attempt, starting `inMs` from now. The one place
	 *  patience is decided, asked both before the backoff (is another round worth sleeping for?) and
	 *  after it (did the sleep overrun what was reserved?). */
	const fitsInBudget = (inMs: number): boolean =>
		Date.now() + inMs + attemptCeilingMs <= createDeadline;
	/**
	 * Record the creation failure and rethrow the provider's own error — the single exit for every way
	 * this function gives up, so the marker can never be skipped on one of them.
	 *
	 * The write is best-effort: a marker-write failure (full/read-only results dir) must not REPLACE the
	 * provider error — the creation failure is the fact worth propagating, the marker is its paper
	 * trail. Log the write failure and rethrow the original either way. The ORIGINAL error propagates
	 * unwrapped: bench-suite matches on the provider's own message, and `createSuiteSandbox` is called
	 * outside {@link runSuiteOnSandbox}, so this throw never reaches the suite-level marker writer that
	 * reads a classification. The marker written here already carries the cause as a plain value, which
	 * is the only place it is read.
	 */
	const giveUp = (err: unknown, message: string): never => {
		try {
			writeGapMarker(
				resultsDir,
				providerName,
				suiteName,
				"failed",
				`${CREATE_FAILURE_PREFIX}${message}`,
				{ kind: "sandbox-create-failed", detail: message },
			);
		} catch (markerErr) {
			console.error(
				`Could not write the creation-failure gap marker (${
					markerErr instanceof Error ? markerErr.message : String(markerErr)
				}); the sandbox-creation error below is unaffected`,
			);
		}
		throw err;
	};
	for (let attempt = 1; ; attempt++) {
		// Undefined until `sandbox.create` is actually invoked: a factory throw leaves it unset (nothing
		// was created, so there is nothing to clean up), while a create that outlives the timeout leaves it
		// a pending promise whose late handle must still be destroyed (see the catch).
		let createPromise: Promise<SandboxHandle> | undefined;
		try {
			const compute = computeFactory();
			createPromise = createOwnedSandbox(() =>
				compute.sandbox.create({
					...createOptions,
					// Ask for a sandbox lifetime covering setup + the suite, where supported.
					timeout: suite.timeoutMinutes * MIN,
				}),
			);
			return createTimeoutMs === null
				? await createPromise
				: await withTimeout(createPromise, createTimeoutMs, "Sandbox creation timed out");
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
			// An adapter that KNOWS its create failure is transient and allocated nothing says so explicitly;
			// the message match is the fallback for providers that only express capacity limits in prose. The
			// explicit mark covers a control plane that expresses saturation by stalling, whose timeout message
			// matches none of these words — the shape that hard-failed every runcloud cell of run
			// 30960125032 in seconds instead of letting the cells queue.
			const retryable =
				isRetryableCreateError(err) || /quota|rate.?limit|too many|capacity|429/i.test(message);
			// The budget bounds the CELL, not just the sleeps: an attempt is only started when the backoff
			// AND the attempt's own worst case still fit inside it. Checking the delay alone let a provider
			// whose attempts run long (run.cloud's adapter-owned readiness wait) begin one final attempt at
			// the edge of the budget and land its failure marker — and the matrix cell — far outside the
			// hour the budget promises.
			if (!retryable || !fitsInBudget(retryDelayMs)) giveUp(err, message);
			console.log(
				`Sandbox create attempt ${attempt} failed transiently (${message.slice(0, 140)}); ` +
					`retrying in ${retryDelayMs / 1000}s...`,
			);
			await sleep(retryDelayMs);
			// `setTimeout` guarantees a floor, not a ceiling: a loaded runner (or a suspended process) can
			// return from that sleep well after `retryDelayMs`, and the reservation made before it was
			// arithmetic on a time that has since passed. Re-ask against the clock now, so a late timer
			// spends the budget rather than silently pushing the next attempt past it.
			if (!fitsInBudget(0)) giveUp(err, message);
		}
	}
}

/**
 * Readiness budget for the suite path, which must cover a COLD IMAGE PULL and not just a container
 * handshake: the toolchain image is ~1.5 GiB compressed across 7 layers, and a provider that pulls it
 * at create time (Namespace) is fetching all of it while the harness holds a resolved handle. Sized
 * generously in wall time because the alternative is a false failure on a sandbox that was merely slow
 * to arrive, and it costs a ready provider exactly one probe. The lifecycle driver keeps its own
 * tighter default — there, how long readiness takes is the measurement, not an obstacle.
 */
const SUITE_READINESS = {
	maxAttempts: 30,
	retryDelayMs: 2_000,
	probeTimeoutMs: 20_000,
} as const;

/** The already-resolved context {@link runSuiteOnSandbox} runs against. */
export interface SuiteRunContext {
	runId: RunId;
	replicateIndex?: number;
	suite: Suite;
	suiteName: SuiteName;
	/**
	 * Who this run is attributed to — the raw-tree directory and the gap-marker filename. A
	 * {@link ProviderId} on the sandbox path, a local label on the bare-metal one, typed by the
	 * schema's one attribution vocabulary rather than widened to `string`: the value reaches
	 * `sandboxGapMarkerFile`, so an unchecked string here would be a path-traversal seam and a way to
	 * write another provider's marker.
	 */
	providerName: BenchmarkLabel;
	resultsDir: string;
	/** The provider's exec transport capability — drives the per-step sync/detached choice. */
	transport: ProviderTransport;
	/**
	 * Post-teardown billing capture. The closed {@link ProviderId} the cost CELL requires travels HERE
	 * rather than being read off `providerName`, which is what makes a local label unable to reach
	 * `providerCostCellSchema` at all: a lane with no billable subject simply omits this field, and the
	 * type system — not a runtime check — is what keeps `local` out of a billing record.
	 */
	costEvidence?: {
		readonly providerId: ProviderId;
		readonly capability: ProviderCostEvidenceCapability;
	};
	/** Readiness budget override. Defaults to {@link SUITE_READINESS}; tests inject a fast one so a
	 *  never-ready case doesn't really sleep out the live budget. */
	readiness?: WaitUntilReadyOptions;
	/** Where and how the suite runs. Defaults to {@link SANDBOX_SUITE_PLAN} — the provider path. */
	plan?: SuiteExecutionPlan;
}

function sanitizeHookResponseJson(value: unknown): string {
	if (typeof value !== "string") throw new Error("provider responseJson must be a JSON string");
	return sanitizeProviderResponse(JSON.parse(value));
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
	const plan = ctx.plan ?? SANDBOX_SUITE_PLAN;
	const sandboxId = sandbox.sandboxId;
	// Create the results directory ONCE, before anything can write to or read from it. The sandbox path
	// used to get this as a side effect of the collect step's `cp`, which left every other reader
	// depending on collection having succeeded: the "produced no pts_*.xml" guard below `readdirSync`s
	// this path unconditionally, so a plan whose collect writes nothing (the bare-metal lane, whose
	// producer already wrote in place) turned a meaningful "PTS failed silently" into an opaque ENOENT.
	mkdirSync(resolve(resultsDir), { recursive: true });
	let suiteError: unknown;
	let evidencePersistenceError: unknown;
	let suiteSkipped = false;
	try {
		// Resolve the PTS pass policy from the suite's own default (converge on cpu-node + memory; a fixed
		// count on every other suite) and the BENCH_PTS_PASSES override. Constructed inside the
		// try so a bad policy (buildPreamble rejects a fixed k < 1) is still torn down by the finally below;
		// a throw before the try would leak the already-created sandbox.
		const runner = new StepRunner(sandbox, transport, undefined, resolvePtsPassPolicy(suite));
		runner.phase = "setup";
		// Wait for the sandbox to become usable before the first real step. `create()` resolving means
		// ALLOCATED, not ready: a provider that cold-pulls its image at create time (Namespace takes the
		// toolchain OCI ref straight through `options.image` — it has no template to pre-bake) is still
		// fetching image layers when its handle resolves, and an exec against a not-yet-running container
		// hangs instead of erroring. Without this gate the pull is charged to whatever step happens to run
		// first, which reports the pull as that step's timeout — a 60s "check free disk" failure that had
		// nothing to do with disk. Pre-baked providers answer the first probe and pay one round-trip.
		const readiness = await waitUntilReady(sandbox, ctx.readiness ?? SUITE_READINESS);
		if (!readiness.ready) throw new Error(neverReadyReason(readiness.attempts));
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
				`d=${PTS_BAKED_ROOT}; [ -d "$d" ] || d=/; df -Pk "$d" | awk 'NR==2 {print $4}'`,
				MIN,
			);
			// Treat non-numeric df output as 0 free (skip) — a NaN comparison would silently pass the check.
			const freeKb = Number.parseInt((df.stdout || "").trim(), 10);
			const freeGb = Number.isNaN(freeKb) ? 0 : freeKb / 1024 / 1024;
			if (freeGb < suite.minDiskGb) {
				const reason = `Insufficient disk: ${freeGb.toFixed(1)} GiB free, suite needs ${suite.minDiskGb} GiB`;
				console.log(`SKIPPED ${providerName}/${suiteName}: ${reason}`);
				writeGapMarker(resultsDir, providerName, suiteName, "skipped", reason, {
					kind: "disk-shortfall",
					freeGb,
					requiredGb: suite.minDiskGb,
				});
				suiteSkipped = true;
			}
		}

		if (!suiteSkipped) {
			for (const step of plan.setup(suite)) {
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
			await runner.run("capture observed specs", plan.observedSpecs(resultsDir), MIN, {
				allowFailure: true,
			});

			try {
				runner.phase = "benchmark";
				for (const command of suite.commands) {
					// The cpu-node command budgets 110 min — far past a capped provider's synchronous-exec
					// limit (Daytona's 408), so step() detaches there; an uncapped provider runs it directly.
					await runner.step(
						command,
						plan.command(command, resultsDir),
						suite.commandTimeoutMinutes * MIN,
					);
				}
			} catch (err) {
				// Still pull whatever results were produced before failing the job.
				suiteError = err;
			}

			try {
				await plan.collect(runner, resultsDir);
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
		}
	} catch (err) {
		// Everything before the benchmark — the readiness gate, the disk probe, every setup step — used to
		// throw straight past the marker-writing exit below, because only the benchmark and collect blocks
		// recorded into `suiteError`. A cell that died in setup therefore left NO trace in the raw tree:
		// the published Run could not tell "this provider broke during setup" from "never scheduled", and
		// the job log was the only evidence. Route those throws through the same single exit; the disk
		// gate's deliberate skip (already marked) is untouched.
		suiteError = err;
	} finally {
		const teardown = await destroySandbox(sandbox);
		if (ctx.costEvidence) {
			const { providerId, capability } = ctx.costEvidence;
			const cell: ProviderCostCell = {
				runId: ctx.runId,
				// From the capability, NOT from `providerName`: the cell's id is the closed ProviderId a
				// billing record is keyed by, and a lane whose label is not one simply carries no capability.
				providerId,
				suite: suiteName,
				...(ctx.replicateIndex !== undefined ? { replicateIndex: ctx.replicateIndex } : {}),
			};
			const missingEvidence = (
				reason: "provider_api_error" | "invalid_provider_response",
				detail: string,
			): ProviderCostEvidence => ({
				kind: "missing",
				cell,
				subject: {
					kind: "sandbox",
					...(sandboxId !== undefined ? { sandboxId } : {}),
				},
				capturedAt: new Date().toISOString(),
				sdk: capability.sdk,
				reason,
				detail,
			});
			let evidence: ProviderCostEvidence;
			try {
				if (sandboxId === undefined) {
					evidence = missingEvidence("provider_api_error", "ComputeSDK sandboxId is unavailable.");
				} else {
					const returned = await withTimeout(
						capability.captureAfterTeardown({
							cell,
							// The capability's own ProviderId, for the same reason the cell uses it: this is the
							// provider whose billing API is called, which only the closed vocabulary can name.
							providerId,
							sandboxId,
							teardown,
						}),
						30_000,
						"Provider cost evidence capture timeout",
					);
					try {
						// Canonicalize the unknown hook object through bounded, descriptor-only traversal before
						// ArkType sees it. The JSON round-trip yields inert plain data: no accessors/proxies and no
						// structure beyond the evidence envelope limits can reach schema traversal.
						const inert: unknown = JSON.parse(
							canonicalJsonString(returned, PROVIDER_EVIDENCE_JSON_LIMITS),
						);
						// The schema deliberately requires canonical responseJson, but the provider hook is an
						// untrusted boundary and may return valid, non-canonical JSON. Sanitize that string on the
						// inert copy before ArkType validates it so raw successful-response credentials never need
						// to pass through (or be accepted by) the durable evidence contract.
						if (inert !== null && typeof inert === "object" && !Array.isArray(inert)) {
							const response = Object.getOwnPropertyDescriptor(inert, "responseJson");
							if (response !== undefined) {
								Object.defineProperty(inert, "responseJson", {
									...response,
									value: sanitizeHookResponseJson("value" in response ? response.value : undefined),
								});
							}
						}
						const parsed = parseProviderCostEvidence(inert);
						const bindingMismatch =
							!canonicalJsonEqual(parsed.cell, cell) ||
							parsed.subject.sandboxId !== sandboxId ||
							!canonicalJsonEqual(parsed.sdk, capability.sdk);
						const sanitized =
							"responseJson" in parsed && parsed.responseJson !== undefined
								? {
										...parsed,
										responseJson: sanitizeProviderResponse(JSON.parse(parsed.responseJson)),
									}
								: parsed;
						evidence = bindingMismatch
							? missingEvidence(
									"invalid_provider_response",
									"Provider response failed structural or requested-cell binding validation.",
								)
							: sanitized;
					} catch {
						evidence = missingEvidence(
							"invalid_provider_response",
							"Provider response failed structural or requested-cell binding validation.",
						);
					}
				}
			} catch (err) {
				evidence = missingEvidence("provider_api_error", sanitizeEvidenceDetail(err));
			}
			try {
				writeProviderCostEvidence(resultsDir, evidence);
			} catch (err) {
				if (suiteError !== undefined) {
					console.warn(
						`[cost-evidence] persistence failed after primary suite error: ${sanitizeEvidenceDetail(err)}`,
					);
				} else {
					evidencePersistenceError = err;
				}
			}
		}
	}
	if (evidencePersistenceError !== undefined) throw evidencePersistenceError;

	if (suiteError) {
		// Record the failure INTO the results tree before the job goes red. Without this the suite leaves
		// no trace at all: it produced no result, and a job that throws writes no marker, so the published
		// Run cannot tell "this provider crashed on the workload" from "this cell was never scheduled".
		// The leaderboard still derives a `missing` gap when even this marker is lost (the artifact upload
		// is itself best-effort), but a marker that survives says WHY, and that is the whole difference.
		const reason = suiteError instanceof Error ? suiteError.message : String(suiteError);
		// The thrower classified it (a step timeout knows its budget, a lost sandbox knows its step);
		// this frame only knows a message. `gapCauseOf` returns undefined for anything unclassified,
		// which records the gap exactly as before rather than inventing a kind from the prose.
		writeGapMarker(resultsDir, providerName, suiteName, "failed", reason, gapCauseOf(suiteError));
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
	return withOwnedSandbox(
		() => compute.sandbox.create(config.createOptions),
		fn,
		`withSandbox (${config.name})`,
	);
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
