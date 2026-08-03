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
/** A timed-out, transport-failed, or 5xx create response is ambiguous: the server may have allocated
 * the sandbox. Retry the same idempotent request to recover its handle before returning. */
const CREATE_RECOVERY_ATTEMPTS = 3;

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
	createRecoveryAttempts?: number;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
}

let cachedClient: Client | undefined;

// A create response can arrive after every local deadline has expired. Keep that final cleanup
// visible to the benchmark entrypoints: they intentionally use process.exit(), which otherwise
// terminates promise continuations even while a billable sandbox is being destroyed.
const pendingLateCreateCleanups = new Set<Promise<void>>();

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

/** A non-timeout 4xx is a definitive rejection: no allocation was accepted, and replaying it would
 * only delay the real error (especially 429, which the harness recognizes for capacity retries). */
function isDefinitiveCreateFailure(error: unknown): boolean {
	return (
		error instanceof RunCloudError &&
		error.status >= 400 &&
		error.status < 500 &&
		error.status !== 408
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
 * Recover the handle for an ambiguous create failure by replaying the SAME idempotent request. The
 * original promise participates too: if its delayed response arrives during recovery, its sandbox is
 * cleaned up without waiting for another API response. Every recovery attempt has its own deadline.
 */
async function recoverAmbiguousCreate(
	native: RuncloudSandboxClient,
	createInput: NonNullable<Parameters<RuncloudSandboxClient["create"]>[0]>,
	createAttempts: Promise<Sandbox>[],
	options: RuncloudComputeOptions,
): Promise<Sandbox> {
	const attempts = Math.max(
		1,
		Math.floor(options.createRecoveryAttempts ?? CREATE_RECOVERY_ATTEMPTS),
	);
	const retryMs = Math.max(0, options.cleanupRetryMs ?? CREATE_FAILURE_CLEANUP_RETRY_MS);
	const wait = options.sleep ?? sleep;
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			// Retain every issued promise. A previous attempt may resolve during a later recovery window,
			// and all of them need cleanup continuations if every bounded window ultimately expires.
			createAttempts.push(Promise.resolve().then(() => native.create(createInput)));
			return await boundedNativeCall(
				`create recovery attempt ${attempt}`,
				() => Promise.any(createAttempts),
				options,
			);
		} catch (error) {
			lastError = error;
			if (attempt < attempts) await wait(retryMs);
		}
	}
	throw lastError;
}

/**
 * Last-resort cleanup for a client/runtime that ignores abort and returns a create response only after
 * every bounded recovery window expired. Production fetches are actively aborted, so they settle
 * before this point; retaining these continuations prevents an injected/alternate client from
 * discarding a late sandbox handle. The idempotency key means every response names the same sandbox,
 * so the first fulfilled attempt identifies the one allocation that needs cleanup.
 */
function retainLateCreateCleanup(
	native: RuncloudSandboxClient,
	createAttempts: readonly Promise<Sandbox>[],
	options: RuncloudComputeOptions,
): void {
	// Every replay uses one idempotency key, so the first successful response identifies the sole
	// allocation. Promise.any also stays pending while a transport-ignoring attempt might still return.
	const cleanup = Promise.any(createAttempts).then(
		async (late) => {
			try {
				await cleanupFailedCreate(native, late.id, options);
			} catch (error) {
				console.error(
					`run.cloud late create returned sandbox ${late.id}, but cleanup failed ` +
						`(${errorMessage(error)}); manual cleanup may be required`,
				);
			}
		},
		() => {},
	);
	pendingLateCreateCleanups.add(cleanup);
	void cleanup.finally(() => pendingLateCreateCleanups.delete(cleanup));
}

/**
 * Await every late-create cleanup retained by the run.cloud adapter. Benchmark bins call this before
 * their explicit process exit; production REST requests are abort-bounded, while a response that won
 * the deadline race is allowed to finish its fully awaited destroy/retry sequence.
 */
export async function drainRuncloudBackgroundWork(): Promise<void> {
	while (pendingLateCreateCleanups.size > 0) {
		await Promise.all([...pendingLateCreateCleanups]);
	}
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
			// The stable key makes a timed-out response recoverable: replaying create returns the original
			// allocation instead of creating a second sandbox, so we can await its teardown before rejecting.
			const createInput = {
				idempotencyKey: `sandbox-benchmarks-${randomUUID()}`,
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
				...(createOptions?.name ? { name: createOptions.name } : {}),
			};
			const createPromise = Promise.resolve().then(() => sdk.create(createInput));
			const createAttempts = [createPromise];
			let created: Sandbox;
			try {
				created = await boundedNativeCall("create", () => createPromise, adapterOptions);
			} catch (error) {
				if (isDefinitiveCreateFailure(error)) throw error;
				let recovered: Sandbox;
				try {
					recovered = await recoverAmbiguousCreate(
						sdk,
						createInput,
						createAttempts,
						adapterOptions,
					);
				} catch (recoveryError) {
					retainLateCreateCleanup(sdk, createAttempts, adapterOptions);
					throw new AggregateError(
						[error, recoveryError],
						`run.cloud create failed ambiguously (${errorMessage(error)}) and its idempotent ` +
							`allocation could not be recovered; ` +
							`manual cleanup may be required (idempotency key: ${createInput.idempotencyKey})`,
					);
				}
				try {
					await cleanupFailedCreate(sdk, recovered.id, adapterOptions);
				} catch (cleanupError) {
					throw new AggregateError(
						[error, cleanupError],
						`run.cloud create failed ambiguously (${errorMessage(error)}), recovered sandbox ` +
							`${recovered.id}, and could not destroy it ` +
							`after retries (${errorMessage(cleanupError)}); manual cleanup may be required`,
					);
				}
				throw error;
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
