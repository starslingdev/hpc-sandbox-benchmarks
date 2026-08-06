// ComputeSDK provider built directly over run.cloud's native SDK. The SDK reads
// RUN_CLOUD_API_KEY itself; construction stays lazy so importing the provider registry never needs
// credentials. One benchmark cell drives one provider, so a process-local client is sufficient.
import { randomUUID } from "node:crypto";
import type {
	CommandResult,
	CreateSandboxOptions,
	RunCommandOptions,
	SandboxInfo,
	SandboxMethods,
} from "@computesdk/provider";
import { defineProvider } from "@computesdk/provider";
import type { Sandbox } from "@run-cloud/sdk";
import { Client, RunCloudError } from "@run-cloud/sdk";
import { markRetryableCreate } from "./retryable-create.ts";

const PROVIDER = "runcloud";

/** Create returns as soon as the control plane accepts the sandbox; the OCI pull/boot happens
 *  asynchronously (`building_image`). The harness expects `create()` to resolve only once commands
 *  can run, so the adapter polls until `running` (or a terminal failure). */
const CREATE_READY_POLL_MS = 2_000;
/** Cold pulls of the ~1.5 GiB toolchain image on a first-use host can take several minutes. */
export const RUNCLOUD_READY_TIMEOUT_MS = 20 * 60 * 1000;
/** A destroy request can fail transiently after allocation succeeded. Retry inside create(), because
 * the harness has no sandbox handle (and therefore no generic cleanup path) until create resolves. */
const CREATE_FAILURE_CLEANUP_ATTEMPTS = 5;
const CREATE_FAILURE_CLEANUP_RETRY_MS = 2_000;
/** Bound each REST control-plane call independently. The adapter owns the longer readiness window,
 * but a fetch that never settles must not suspend its deadline check or failed-create cleanup. */
const CONTROL_PLANE_REQUEST_TIMEOUT_MS = 30_000;
/** Prefix for the caller-owned `name` stamped on every create. The name is the RECOVERY HANDLE: it is
 * chosen locally before the request, so a create whose response is lost still leaves an allocation the
 * control plane can be QUERIED for by name. It also makes a benchmark sandbox identifiable in the
 * dashboard and to any account-wide sweep. */
const RECOVERY_NAME_PREFIX = "sandbox-benchmarks";
/** An allocation can take a moment to become visible to `list()`, so an ambiguous create polls before
 * concluding that nothing was allocated. Observed visibility is well under a second; this window is
 * deliberately generous because guessing "nothing was allocated" too early is what leaks a sandbox. */
const CREATE_RECONCILE_ATTEMPTS = 5;
const CREATE_RECONCILE_RETRY_MS = 2_000;

/**
 * Worst-case wall time ONE `create` call can spend before it settles, summed over every bound the
 * adapter enforces on its longest path: the create POST, reconciling an ambiguous response, the
 * readiness wait, and destroying an allocation that failed readiness.
 *
 * Exported because this adapter turns the harness's own per-attempt race OFF
 * (`createTimeoutMs: null`, so its cleanup is never abandoned mid-teardown) and the harness must
 * still know what an attempt can cost: without a number it can start a retry that finishes long
 * after the retry budget it promised the matrix job. Derived from the constants above rather than
 * written as a literal, so tightening any one of them tightens this in the same edit.
 *
 * It is a CEILING, not an expectation — the observed create is seconds. Reserving it costs patience
 * (the harness stops starting new attempts this much earlier), which is the deliberate trade: a cell
 * that gives up slightly sooner beats one whose failure marker lands after the budget expired.
 */
export const RUNCLOUD_CREATE_CEILING_MS =
	// The create POST itself.
	CONTROL_PLANE_REQUEST_TIMEOUT_MS +
	// Reconciling an ambiguous create: one bounded lookup per attempt, with a wait between attempts.
	CREATE_RECONCILE_ATTEMPTS * CONTROL_PLANE_REQUEST_TIMEOUT_MS +
	(CREATE_RECONCILE_ATTEMPTS - 1) * CREATE_RECONCILE_RETRY_MS +
	// Readiness: the deadline is checked BEFORE each poll, so the last poll can start just under it and
	// still spend one bounded get plus one inter-poll sleep on top of the window.
	RUNCLOUD_READY_TIMEOUT_MS +
	CONTROL_PLANE_REQUEST_TIMEOUT_MS +
	CREATE_READY_POLL_MS +
	// Cleanup of a failed allocation: each attempt is a bounded destroy plus a bounded confirming get.
	CREATE_FAILURE_CLEANUP_ATTEMPTS * 2 * CONTROL_PLANE_REQUEST_TIMEOUT_MS +
	(CREATE_FAILURE_CLEANUP_ATTEMPTS - 1) * CREATE_FAILURE_CLEANUP_RETRY_MS;

type RuncloudSandboxClient = Pick<
	Client["sandboxes"],
	"create" | "get" | "list" | "destroy" | "exec" | "openTunnel"
>;

interface RuncloudComputeOptions {
	/** Test seam; production keeps constructing the native SDK client lazily from the environment. */
	client?: RuncloudSandboxClient;
	readyPollMs?: number;
	readyTimeoutMs?: number;
	cleanupAttempts?: number;
	cleanupRetryMs?: number;
	controlPlaneTimeoutMs?: number;
	reconcileAttempts?: number;
	reconcileRetryMs?: number;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
}

let cachedClient: Client | undefined;

const controlPlaneFetch: typeof fetch = Object.assign(
	(...args: Parameters<typeof fetch>) =>
		fetch(args[0], {
			...args[1],
			signal: AbortSignal.timeout(CONTROL_PLANE_REQUEST_TIMEOUT_MS),
		}),
	{ preconnect: fetch.preconnect },
);

function defaultClient(): Client {
	// Promise deadlines below bound every adapter call, while the fetch signal also cancels the actual
	// socket so a timed-out request does not remain as floating work until process exit.
	cachedClient ??= new Client({ fetch: controlPlaneFetch });
	return cachedClient;
}

class NativeCallTimeoutError extends Error {
	constructor(
		readonly operation: string,
		readonly timeoutMs: number,
	) {
		super(`run.cloud ${operation} did not settle within ${timeoutMs}ms`);
		this.name = "NativeCallTimeoutError";
	}
}

/** A non-timeout 4xx is a definitive rejection: the create endpoint itself said no allocation was
 * accepted. Reconciliation still runs, but settles for a single confirming pass rather than the full
 * polling window, so a 429 still reaches the harness's capacity retry promptly.
 *
 * 409 is excluded, because a conflict asserts the OPPOSITE of absence: something already exists under
 * this request's identity. Treating it as a definitive rejection would let an unanswered lookup be
 * written off as "nothing was allocated" on the one status code that says otherwise. It gets the full
 * window and stays subject to the unanswered report. */
function isDefinitiveCreateFailure(error: unknown): boolean {
	return (
		error instanceof RunCloudError &&
		error.status >= 400 &&
		error.status < 500 &&
		error.status !== 408 &&
		error.status !== 409
	);
}

/**
 * Race one native control-plane operation with a local deadline. Production's fetch signal cancels
 * the underlying HTTP request too; the race remains necessary for injected clients and runtimes whose
 * fetch ignores abort. Promise.race attaches a rejection handler to late promises, so they cannot
 * become unhandled rejections after the deadline wins.
 */
async function boundedNativeCall<T>(
	operation: string,
	call: () => Promise<T>,
	options: RuncloudComputeOptions,
): Promise<T> {
	const timeoutMs = Math.max(
		1,
		Math.floor(options.controlPlaneTimeoutMs ?? CONTROL_PLANE_REQUEST_TIMEOUT_MS),
	);
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			Promise.resolve().then(call),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new NativeCallTimeoutError(operation, timeoutMs)),
					timeoutMs,
				);
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

function isNotFound(error: unknown): boolean {
	return error instanceof RunCloudError && error.status === 404;
}

function mapStatus(state: Sandbox["state"]): SandboxInfo["status"] {
	if (state === "running") return "running";
	// Interrupted / failed are hard errors (not a clean stop); match the official SDK adapter.
	if (state === "interrupted" || state === "failed") return "error";
	// Clean stops and transitional boot states (building_image / starting) report as stopped —
	// create() waits for running before returning, so getInfo rarely sees a transitional state. The SDK
	// intentionally ends SandboxState with `| string`, so unknown future/control-plane states cannot be
	// made compile-time exhaustive and must retain a safe fallback.
	return "stopped";
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Terminal states that mean boot failed and we should stop waiting. */
function isTerminalBootFailure(state: Sandbox["state"]): boolean {
	return ["failed", "interrupted", "destroyed", "destroying", "stopped"].includes(state);
}

/**
 * Poll until the sandbox can accept execs. Returns the freshest record so callers don't keep a
 * stale `building_image` handle from the original create response.
 */
async function waitUntilRunning(
	native: RuncloudSandboxClient,
	sandboxId: string,
	options: RuncloudComputeOptions,
): Promise<Sandbox> {
	const now = options.now ?? Date.now;
	const wait = options.sleep ?? sleep;
	const pollMs = options.readyPollMs ?? CREATE_READY_POLL_MS;
	const timeoutMs = options.readyTimeoutMs ?? RUNCLOUD_READY_TIMEOUT_MS;
	const deadline = now() + timeoutMs;
	let last: Sandbox | undefined;
	while (now() < deadline) {
		last = await boundedNativeCall(
			`readiness get for sandbox ${sandboxId}`,
			() => native.get(sandboxId),
			options,
		);
		if (last.state === "running") return last;
		if (isTerminalBootFailure(last.state)) {
			throw new Error(
				`run.cloud sandbox ${sandboxId} entered terminal state "${last.state}" while booting`,
			);
		}
		await wait(pollMs);
	}
	throw new Error(
		`run.cloud sandbox ${sandboxId} not running after ${timeoutMs}ms (last state: ${last?.state ?? "unknown"})`,
	);
}

async function destroySandbox(
	native: RuncloudSandboxClient,
	sandboxId: string,
	options: RuncloudComputeOptions,
): Promise<void> {
	try {
		await boundedNativeCall(
			`destroy sandbox ${sandboxId}`,
			() => native.destroy(sandboxId),
			options,
		);
	} catch (error) {
		if (isNotFound(error)) return;
		throw error;
	}
}

/**
 * Tear down an allocation whose readiness wait failed. A rejected destroy is ambiguous: the request
 * may have reached the control plane before the response was lost. Confirm an accepted teardown via
 * get(), otherwise retry. Exhaustion is surfaced together with the readiness error by create().
 */
async function cleanupFailedCreate(
	native: RuncloudSandboxClient,
	sandboxId: string,
	options: RuncloudComputeOptions,
): Promise<void> {
	const attempts = Math.max(
		1,
		Math.floor(options.cleanupAttempts ?? CREATE_FAILURE_CLEANUP_ATTEMPTS),
	);
	const retryMs = Math.max(0, options.cleanupRetryMs ?? CREATE_FAILURE_CLEANUP_RETRY_MS);
	const wait = options.sleep ?? sleep;
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			await destroySandbox(native, sandboxId, options);
			return;
		} catch (error) {
			lastError = error;
			// A lost response after an accepted destroy must not turn into a false leak report. Both states
			// mean the control plane owns the remaining teardown; 404 means it has already completed.
			try {
				const current = await boundedNativeCall(
					`confirm cleanup for sandbox ${sandboxId}`,
					() => native.get(sandboxId),
					options,
				);
				if (current.state === "destroying" || current.state === "destroyed") return;
			} catch (confirmError) {
				if (isNotFound(confirmError)) return;
			}
			if (attempt < attempts) await wait(retryMs);
		}
	}
	throw lastError;
}

/**
 * Resolve what a failed create actually DID, by querying the control plane for the caller-owned name
 * stamped on the request. This is a read: unlike replaying the create POST it cannot allocate a second
 * sandbox, it needs no cooperation from an overloaded create endpoint, and it answers the only question
 * that matters — does an allocation carrying this name exist?
 *
 * A lookup that itself fails is not proof of absence, so it costs an attempt rather than ending the
 * search: concluding "nothing was allocated" is what strands a billable sandbox, and that conclusion
 * has to be earned. It is earned only by a lookup that actually answered, which is why exhausting the
 * window without a single answer reports `unanswered` rather than `absent`. The overload that makes a
 * create ambiguous is the same overload that can take `list` down with it, so collapsing those two
 * outcomes would silently reinstate the guess this whole design exists to remove.
 */
type ReconcileOutcome =
	| { status: "adopted"; sandbox: Sandbox }
	| { status: "absent" }
	| { status: "unanswered"; lastError: unknown };

async function reconcileAmbiguousCreate(
	native: RuncloudSandboxClient,
	name: string,
	options: RuncloudComputeOptions,
	attemptOverride?: number,
): Promise<ReconcileOutcome> {
	const attempts = Math.max(
		1,
		Math.floor(attemptOverride ?? options.reconcileAttempts ?? CREATE_RECONCILE_ATTEMPTS),
	);
	const retryMs = Math.max(0, options.reconcileRetryMs ?? CREATE_RECONCILE_RETRY_MS);
	const wait = options.sleep ?? sleep;
	let answered = false;
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			const matches = (
				await boundedNativeCall(`reconcile create ${name}`, () => native.list({ name }), options)
			).filter(
				// Defend against a server-side prefix/fuzzy match: only an exact name is this create's
				// allocation. Tombstones are not something to adopt or clean up.
				(sandbox) =>
					sandbox.name === name && sandbox.state !== "destroyed" && sandbox.state !== "destroying",
			);
			// The control plane answered, so a later empty window is a real "nothing was allocated"
			// rather than an unanswered question wearing the same shape.
			answered = true;
			// One unique name per create call, so a second match would mean the server allocated twice.
			// Prefer the oldest: adopting the later one would orphan the original.
			const [oldest] = matches.sort(
				(a, b) => createdAt(a.createdAt).getTime() - createdAt(b.createdAt).getTime(),
			);
			if (oldest) return { status: "adopted", sandbox: oldest };
		} catch (error) {
			// Swallowed deliberately — see the doc comment. The next attempt re-asks.
			lastError = error;
		}
		if (attempt < attempts) await wait(retryMs);
	}
	return answered ? { status: "absent" } : { status: "unanswered", lastError };
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function createdAt(value: string | undefined): Date {
	if (!value) return new Date(0);
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function streamCallback(
	callback: ((data: string) => void) | undefined,
): ((chunk: Uint8Array) => void) | undefined {
	if (!callback) return undefined;
	const decoder = new TextDecoder();
	return (chunk) => {
		const text = decoder.decode(chunk, { stream: true });
		if (text) callback(text);
	};
}

async function runCommand(
	native: RuncloudSandboxClient,
	sandbox: Sandbox,
	command: string,
	options?: RunCommandOptions,
): Promise<CommandResult> {
	const started = Date.now();
	// The native SDK does not have a detached exec flag. Its command endpoint does run a shell, so
	// daemonize explicitly and return once that short launch command exits. StepRunner observes the
	// actual job through its done file, exactly as it does for native-background providers.
	const executable = options?.background
		? `nohup /bin/sh -lc ${shellQuote(command)} </dev/null >/dev/null 2>&1 &`
		: command;
	const result = await native.exec(sandbox.id, executable, {
		...(options?.cwd ? { cwd: options.cwd } : {}),
		...(options?.env ? { env: options.env } : {}),
		...(options?.timeout ? { timeoutSeconds: Math.max(1, Math.ceil(options.timeout / 1000)) } : {}),
		...(options?.background
			? {}
			: {
					onStdout: streamCallback(options?.onStdout),
					onStderr: streamCallback(options?.onStderr),
				}),
	});
	return {
		stdout: options?.background ? "" : result.stdout,
		stderr: options?.background ? "" : result.stderr,
		exitCode: result.exitCode,
		durationMs: Date.now() - started,
	};
}

export function sandboxMethods(
	adapterOptions: RuncloudComputeOptions,
): SandboxMethods<Sandbox, undefined> {
	const native = () => adapterOptions.client ?? defaultClient().sandboxes;
	return {
		create: async (_config, createOptions?: CreateSandboxOptions) => {
			if (createOptions?.snapshotId) {
				throw new Error("run.cloud snapshots are not supported by this adapter");
			}
			const sdk = native();
			// The name is chosen HERE, before the request, which is what makes it a recovery handle: a
			// create whose response never arrives still leaves an allocation carrying it, so the control
			// plane can be asked what happened instead of the answer depending on a second create response.
			// A caller-supplied name is kept as a readable prefix; the unique suffix is what makes the
			// later lookup unambiguous. The idempotency key remains, so an internal server-side retry
			// cannot turn one logical create into two allocations.
			const recoveryName = `${createOptions?.name ?? RECOVERY_NAME_PREFIX}-${randomUUID()}`;
			const createInput = {
				// Same string as the name, so one identifier locates both the request and the allocation
				// in control-plane logs when an ambiguous create has to be investigated after the fact.
				idempotencyKey: recoveryName,
				name: recoveryName,
				...(createOptions?.templateId || createOptions?.image
					? { image: createOptions.templateId ?? createOptions.image }
					: {}),
				...(createOptions?.cpu !== undefined ? { cpu: createOptions.cpu } : {}),
				...(createOptions?.memory !== undefined ? { memory: createOptions.memory } : {}),
				...(createOptions?.disk !== undefined ? { disk: createOptions.disk } : {}),
				...(createOptions?.idlePauseSeconds !== undefined
					? { idlePauseSeconds: createOptions.idlePauseSeconds }
					: {}),
				...(createOptions?.timeoutSeconds !== undefined
					? { timeoutSeconds: createOptions.timeoutSeconds }
					: {}),
				...(createOptions?.region ? { region: createOptions.region } : {}),
			};
			let created: Sandbox;
			try {
				created = await boundedNativeCall("create", () => sdk.create(createInput), adapterOptions);
			} catch (error) {
				// Ask what the request actually did rather than assuming. A definitive 4xx says no
				// allocation was accepted, so one confirming pass is enough — but it is not skipped
				// outright, because even a rejection can sit on top of a real allocation. A 409 is not
				// definitive at all (see isDefinitiveCreateFailure) and gets the full window.
				const definitive = isDefinitiveCreateFailure(error);
				const reconciled = await reconcileAmbiguousCreate(
					sdk,
					recoveryName,
					adapterOptions,
					definitive ? 1 : undefined,
				);
				// Nothing carries this name, so nothing was allocated and there is nothing to leak. The
				// original error is the whole truth — report it without a spurious cleanup warning.
				//
				// A timed-out create whose reconciliation establishes absence is both transient and safe to
				// retry. Do not mark every ambiguous error here: a generic client bug or durable 5xx with an
				// empty lookup must fail promptly rather than masquerade as capacity for an hour. A definitive
				// rejection is also left unmarked — 429 already reaches the harness through its message match,
				// while re-issuing a 422 would only delay the real error.
				if (reconciled.status === "absent") {
					throw error instanceof NativeCallTimeoutError ? markRetryableCreate(error) : error;
				}
				// The create was ambiguous AND the control plane never answered what it did with it, so
				// absence was never established. Say so and name the recovery handle: the name is stamped
				// before the request precisely so a sandbox that outlived this window is still findable.
				// A definitive 4xx is exempt — there the create endpoint itself supplied the rejection, so
				// an unanswered confirming lookup does not put a rejected request back in doubt. A 409 is
				// deliberately not in that set: it is the one status that asserts something exists.
				if (reconciled.status === "unanswered" && !definitive) {
					throw new AggregateError(
						[error, reconciled.lastError],
						`run.cloud create failed ambiguously (${errorMessage(error)}) and every reconciliation ` +
							`lookup also failed (${errorMessage(reconciled.lastError)}), so it is unknown whether a ` +
							`sandbox was allocated; if one was it carries the name ${recoveryName} and manual ` +
							`cleanup may be required`,
					);
				}
				if (reconciled.status !== "adopted") throw error;
				// An allocation exists. The create SUCCEEDED and only its response was lost, so adopt it:
				// destroying a healthy sandbox to honour a lost HTTP response would throw away the work and
				// fail the cell for no reason. Readiness below still gates whether it is usable.
				created = reconciled.sandbox;
			}
			// Do not return until the guest can accept commands — cold image pulls leave the sandbox in
			// `building_image` for minutes, and exec during that window fails with API 4409.
			try {
				const sandbox = await waitUntilRunning(sdk, created.id, adapterOptions);
				return { sandbox, sandboxId: sandbox.id };
			} catch (error) {
				// Allocation already succeeded, but the harness has no handle until create() resolves. Own the
				// cleanup (including transient destroy retries) here rather than reducing it to one best-effort
				// request that can silently strand a billable sandbox.
				try {
					await cleanupFailedCreate(sdk, created.id, adapterOptions);
				} catch (destroyError) {
					throw new AggregateError(
						[error, destroyError],
						`run.cloud sandbox ${created.id} failed readiness (${errorMessage(error)}) and ` +
							`could not be destroyed after retries (${errorMessage(destroyError)}); manual cleanup may be required`,
					);
				}
				throw error;
			}
		},

		getById: async (_config, sandboxId) => {
			try {
				const sandbox = await boundedNativeCall(
					`get sandbox ${sandboxId}`,
					() => native().get(sandboxId),
					adapterOptions,
				);
				return { sandbox, sandboxId: sandbox.id };
			} catch (error) {
				if (isNotFound(error)) return null;
				throw error;
			}
		},

		list: async () =>
			(await boundedNativeCall("list sandboxes", () => native().list(), adapterOptions))
				// The native API retains destroyed tombstones. ComputeSDK's list contract is active sandboxes;
				// keep paused/stopped/failed records available for recovery, but omit irreversible teardown.
				.filter((sandbox) => sandbox.state !== "destroyed" && sandbox.state !== "destroying")
				.map((sandbox) => ({ sandbox, sandboxId: sandbox.id })),

		destroy: async (_config, sandboxId) => destroySandbox(native(), sandboxId, adapterOptions),

		runCommand: (sandbox, command, runOptions) =>
			runCommand(native(), sandbox, command, runOptions),

		getInfo: async (sandbox) => {
			const current = await boundedNativeCall(
				`get sandbox ${sandbox.id}`,
				() => native().get(sandbox.id),
				adapterOptions,
			);
			return {
				id: current.id,
				provider: PROVIDER,
				status: mapStatus(current.state),
				createdAt: createdAt(current.createdAt),
				timeout: (current.timeoutSeconds ?? 0) * 1000,
				metadata: {
					image: current.image,
					region: current.region,
					sizeClass: current.sizeClass,
					milliCpu: current.milliCpu,
					memoryMb: current.memMb,
					warmStart: current.warmStart,
				},
			};
		},

		getUrl: async (sandbox, options) =>
			(
				await boundedNativeCall(
					`open tunnel for sandbox ${sandbox.id}`,
					() => native().openTunnel(sandbox.id, options.port),
					adapterOptions,
				)
			).url,
	};
}

export function runcloudCompute(options: RuncloudComputeOptions = {}) {
	return defineProvider<Sandbox, undefined>({
		name: PROVIDER,
		methods: { sandbox: sandboxMethods(options) },
	})(undefined);
}
