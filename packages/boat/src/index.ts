// boat is a native SDK module over @boatdev/sdk. There is no @computesdk wrapper. The control plane
// is REST (create/get/list/stop/update) and guest work goes through POST /commands: 600s sync cap,
// plus detached:true for genuine background acceptance. Teardown is stop/archive — billing stops with
// the machine; hard delete is a separate retention action and is not the benchmark's destroy.

import { randomUUID } from "node:crypto";
import type {
	Command200Response,
	CreateSandboxResponse,
	Sandbox,
	SandboxActionResponse,
	SandboxInfoResponse,
	SandboxListResponse,
} from "@boatdev/sdk";
import {
	BoatApi,
	Configuration,
	instanceOfCommandResponse,
	instanceOfCommandStartedResponse,
	ResponseError,
} from "@boatdev/sdk";
import type { CreateRequest, DriverContext, SandboxObservation } from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError } from "@sandbox-benchmarks/driver";
import type {
	ComputeSdkCreatedRequestVerification,
	ComputeSdkCreateRequestCoverage,
} from "@sandbox-benchmarks/driver/computesdk";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import { BOAT_PROVENANCE } from "./provenance.ts";

export { BOAT_PROVENANCE };

export const BOAT_API_BASE = "https://boat.dev/api/v1";
export const BOAT_SANDBOX_ID = type(/^bx_[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
export const BOAT_RECOVERY_NAME_PREFIX = "sandbox-benchmarks";
export const BOAT_MACHINE_TYPE = "default" as const;
export const BOAT_DEFAULT_VCPUS = 4;
export const BOAT_DEFAULT_MEMORY_GB = 8;
export const BOAT_COMMAND_TIMEOUT_SECONDS = 600;
export const BOAT_READY_POLL_MS = 2_000;
export const BOAT_READY_TIMEOUT_MS = 8 * 60_000;
export const BOAT_CONTROL_TIMEOUT_MS = 30_000;
export const BOAT_CLEANUP_ATTEMPTS = 4;
export const BOAT_CLEANUP_RETRY_MS = 20_000;
export const BOAT_RECONCILE_ATTEMPTS = 5;
export const BOAT_RECONCILE_RETRY_MS = 2_000;
export const BOAT_INVENTORY_PAGE_SIZE = 100;
export const BOAT_INVENTORY_MAX_PAGES = 1_000;
export const BOAT_INVENTORY_TIMEOUT_MS = 5 * 60_000;
export const BOAT_READINESS = Object.freeze({ startup: "create-returns-ready" as const });
export const BOAT_EXECUTION = Object.freeze({
	syncCapMs: 60_000,
	durable: "native-launch" as const,
});
export const BOAT_CREATE_CEILING_MS =
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_RECONCILE_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_RECONCILE_ATTEMPTS - 1) * BOAT_RECONCILE_RETRY_MS +
	BOAT_READY_TIMEOUT_MS +
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_READY_POLL_MS +
	BOAT_CLEANUP_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CLEANUP_ATTEMPTS - 1) * BOAT_CLEANUP_RETRY_MS;
export const BOAT_CREATE_BUDGET = Object.freeze({
	owner: "harness" as const,
	timeoutMs: BOAT_CREATE_CEILING_MS,
});
export const BOAT_REQUEST_COVERAGE = {
	spec: {
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: 40 },
	},
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "unsupported", count: "unsupported" },
	env: "unsupported",
} as const satisfies ComputeSdkCreateRequestCoverage;

const READY_STATES = new Set(["ready", "idle", "running"]);
const TERMINAL_BOOT_STATES = new Set(["error", "archived", "archiving"]);
const ABSENT_STATES = new Set(["archived", "archiving"]);

export type BoatCreateOptions = {
	readonly name: string;
	readonly idempotencyKey: string;
	readonly type: typeof BOAT_MACHINE_TYPE;
	readonly ttlSeconds: null;
	readonly noEnv: true;
};

export type BoatClient = {
	create(request: {
		readonly idempotencyKey?: string;
		readonly createSandboxRequest?: {
			readonly type?: "small" | "default" | "large";
			readonly ttlSeconds?: number | null;
			readonly noEnv?: boolean;
		};
	}): Promise<CreateSandboxResponse>;
	get(request: { readonly sandboxId: string }): Promise<SandboxInfoResponse>;
	update(request: {
		readonly sandboxId: string;
		readonly updateSandboxRequest: { readonly name: string };
	}): Promise<SandboxInfoResponse>;
	stop(request: { readonly sandboxId: string }): Promise<SandboxActionResponse>;
	command(request: {
		readonly sandboxId: string;
		readonly commandRequest: {
			readonly command: string;
			readonly timeoutSeconds?: number;
			readonly detached?: boolean;
		};
	}): Promise<Command200Response>;
	sandboxes(request?: {
		readonly limit?: number;
		readonly cursor?: string | null;
	}): Promise<SandboxListResponse>;
};

export interface BoatSpecOptions {
	readonly client?: BoatClient;
	readonly readyPollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly cleanupAttempts?: number;
	readonly cleanupRetryMs?: number;
	readonly controlPlaneTimeoutMs?: number;
	readonly reconcileAttempts?: number;
	readonly reconcileRetryMs?: number;
	readonly recoveryAbsenceConfirmationMs?: number;
	readonly inventoryTimeoutMs?: number;
	readonly sleep?: (ms: number) => Promise<void>;
	readonly now?: () => number;
}

interface Timing {
	readonly readyPollMs: number;
	readonly readyTimeoutMs: number;
	readonly cleanupAttempts: number;
	readonly cleanupRetryMs: number;
	readonly controlPlaneTimeoutMs: number;
	readonly inventoryTimeoutMs: number;
	readonly reconcileAttempts: number;
	readonly reconcileRetryMs: number;
	readonly sleep: (ms: number) => Promise<void>;
	readonly now: () => number;
}

function timingOf(options: BoatSpecOptions): Timing {
	return {
		readyPollMs: options.readyPollMs ?? BOAT_READY_POLL_MS,
		readyTimeoutMs: options.readyTimeoutMs ?? BOAT_READY_TIMEOUT_MS,
		cleanupAttempts: Math.max(1, Math.floor(options.cleanupAttempts ?? BOAT_CLEANUP_ATTEMPTS)),
		cleanupRetryMs: Math.max(0, options.cleanupRetryMs ?? BOAT_CLEANUP_RETRY_MS),
		controlPlaneTimeoutMs: Math.max(
			1,
			Math.floor(options.controlPlaneTimeoutMs ?? BOAT_CONTROL_TIMEOUT_MS),
		),
		inventoryTimeoutMs: Math.max(
			1,
			Math.floor(options.inventoryTimeoutMs ?? BOAT_INVENTORY_TIMEOUT_MS),
		),
		reconcileAttempts: Math.max(
			1,
			Math.floor(options.reconcileAttempts ?? BOAT_RECONCILE_ATTEMPTS),
		),
		reconcileRetryMs: Math.max(0, options.reconcileRetryMs ?? BOAT_RECONCILE_RETRY_MS),
		sleep: options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
		now: options.now ?? Date.now,
	};
}

export class BoatCallTimeoutError extends Error {
	constructor(
		readonly operation: string,
		readonly timeoutMs: number,
	) {
		super(`boat ${operation} did not settle within ${timeoutMs}ms`);
		this.name = "BoatCallTimeoutError";
	}
}

export class BoatBootFailureError extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
		readonly teardownConfirmed: boolean,
	) {
		super(`boat sandbox ${sandboxId} entered terminal state "${state}" while booting`);
		this.name = "BoatBootFailureError";
	}
}

export class BoatAmbiguousCreateError extends AggregateError {
	constructor(
		readonly recoveryName: string,
		createError: unknown,
		lookupError: unknown,
	) {
		super(
			[createError, lookupError],
			`boat create failed ambiguously (${errorMessage(createError)}) and reconciliation ` +
				`could not establish its outcome (${errorMessage(lookupError)}), so it is unknown whether a sandbox was ` +
				`allocated; if one was it carries the name ${recoveryName} and manual cleanup may be required`,
		);
		this.name = "BoatAmbiguousCreateError";
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function boatHttpStatus(error: unknown): number | undefined {
	if (error instanceof ResponseError) return error.response.status;
	if (isDriverError(error) && error.provider === "boat" && error.code === "create-failed") {
		return error.vendorHttpStatus;
	}
	return undefined;
}

export function isBoatNotFound(error: unknown): boolean {
	return boatHttpStatus(error) === 404;
}

export function isBoatDefinitiveCreateRejection(error: unknown): boolean {
	const status = boatHttpStatus(error);
	return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 409;
}

export function isBoatRetryableCreate(error: unknown): boolean {
	return (
		boatHttpStatus(error) === 429 ||
		(error instanceof BoatBootFailureError && error.teardownConfirmed)
	);
}

class BootTerminalState extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
	) {
		super(`boat sandbox ${sandboxId} entered terminal state "${state}" while booting`);
	}
}

async function bounded<T>(
	operation: string,
	call: () => Promise<T>,
	timing: Timing,
	signal?: AbortSignal,
): Promise<T> {
	signal?.throwIfAborted();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let unsubscribe = () => {};
	try {
		return await Promise.race([
			Promise.resolve().then(call),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new BoatCallTimeoutError(operation, timing.controlPlaneTimeoutMs)),
					timing.controlPlaneTimeoutMs,
				);
				if (signal !== undefined) {
					const abort = () => reject(signal.reason ?? new Error("boat operation aborted"));
					signal.addEventListener("abort", abort, { once: true });
					unsubscribe = () => signal.removeEventListener("abort", abort);
				}
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
		unsubscribe();
	}
}

function controlPlaneFetch(timeoutMs: number, signal?: AbortSignal): typeof fetch {
	return Object.assign(
		(...args: Parameters<typeof fetch>) =>
			fetch(args[0], {
				...args[1],
				signal: AbortSignal.any([
					AbortSignal.timeout(timeoutMs),
					...(signal ? [signal] : []),
					...(args[1]?.signal ? [args[1].signal] : []),
				]),
			}),
		{ preconnect: fetch.preconnect },
	);
}

export function boatObservation(state: string): SandboxObservation {
	if (ABSENT_STATES.has(state)) return { state: "absent" };
	if (state === "error") return { state: "terminal" };
	return { state: "running" };
}

async function waitUntilReady(
	client: BoatClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox> {
	const deadline = timing.now() + timing.readyTimeoutMs;
	let last: Sandbox | undefined;
	while (timing.now() < deadline) {
		last = (
			await bounded(
				`readiness get for sandbox ${sandboxId}`,
				() => client.get({ sandboxId }),
				timing,
				signal,
			)
		).sandbox;
		if (READY_STATES.has(last.state)) return last;
		if (TERMINAL_BOOT_STATES.has(last.state)) throw new BootTerminalState(sandboxId, last.state);
		await timing.sleep(timing.readyPollMs);
		signal?.throwIfAborted();
	}
	throw new Error(
		`boat sandbox ${sandboxId} not ready after ${timing.readyTimeoutMs}ms (last state: ${last?.state ?? "unknown"})`,
	);
}

async function stopSandbox(
	client: BoatClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<void> {
	for (let attempt = 0; attempt < timing.cleanupAttempts; attempt++) {
		try {
			await bounded(`stop sandbox ${sandboxId}`, () => client.stop({ sandboxId }), timing, signal);
			return;
		} catch (error) {
			if (isBoatNotFound(error)) return;
			const status = boatHttpStatus(error);
			if (status === 409 && attempt + 1 < timing.cleanupAttempts) {
				await timing.sleep(timing.cleanupRetryMs);
				continue;
			}
			throw error;
		}
	}
}

async function teardownConfirmed(
	client: BoatClient,
	sandboxId: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<boolean> {
	try {
		const current = await bounded(
			`observe stop ${sandboxId}`,
			() => client.get({ sandboxId }),
			timing,
			signal,
		);
		return ABSENT_STATES.has(current.sandbox.state);
	} catch (error) {
		return isBoatNotFound(error);
	}
}

async function liveSandboxesNamed(
	client: BoatClient,
	name: string,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox[]> {
	const rows = await completeInventory(client, timing, signal);
	return rows.filter((row) => row.name === name && !ABSENT_STATES.has(row.state));
}

async function completeInventory(
	client: BoatClient,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox[]> {
	const deadline = timing.now() + timing.inventoryTimeoutMs;
	const rows: Sandbox[] = [];
	const cursors = new Set<string>();
	const ids = new Set<string>();
	let cursor: string | undefined;
	for (let index = 0; index < BOAT_INVENTORY_MAX_PAGES; index++) {
		const remaining = deadline - timing.now();
		if (remaining <= 0)
			throw new BoatCallTimeoutError("list sandbox inventory", timing.inventoryTimeoutMs);
		const page = await bounded(
			"list sandbox inventory page",
			() => client.sandboxes({ limit: BOAT_INVENTORY_PAGE_SIZE, cursor }),
			{ ...timing, controlPlaneTimeoutMs: Math.min(remaining, timing.controlPlaneTimeoutMs) },
			signal,
		);
		for (const row of page.sandboxes) {
			if (ids.has(row.id)) throw new Error("boat inventory returned a duplicate sandbox id");
			ids.add(row.id);
			rows.push(row);
		}
		const next = page.pageInfo?.nextCursor ?? null;
		if (next === null || page.pageInfo?.hasMore === false) return rows;
		if (cursors.has(next)) throw new Error("boat inventory repeated a page cursor");
		cursors.add(next);
		cursor = next;
	}
	throw new Error("boat inventory exceeded its page limit before reaching the end");
}

async function createWithIdempotency(
	client: BoatClient,
	options: BoatCreateOptions,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox> {
	let lastError: unknown;
	for (let attempt = 0; attempt < timing.reconcileAttempts; attempt++) {
		try {
			return (
				await bounded(
					"create sandbox",
					() =>
						client.create({
							idempotencyKey: options.idempotencyKey,
							createSandboxRequest: {
								type: options.type,
								ttlSeconds: options.ttlSeconds,
								noEnv: options.noEnv,
							},
						}),
					timing,
					signal,
				)
			).sandbox;
		} catch (error) {
			lastError = error;
			if (isBoatDefinitiveCreateRejection(error)) throw error;
			if (
				(boatHttpStatus(error) === 409 || error instanceof BoatCallTimeoutError) &&
				attempt + 1 < timing.reconcileAttempts
			) {
				await timing.sleep(timing.reconcileRetryMs);
				continue;
			}
			break;
		}
	}
	throw lastError ?? new Error("boat create returned no sandbox");
}

async function allocate(
	client: BoatClient,
	options: BoatCreateOptions,
	timing: Timing,
	signal?: AbortSignal,
): Promise<Sandbox> {
	let sandbox: Sandbox;
	try {
		sandbox = await createWithIdempotency(client, options, timing, signal);
	} catch (error) {
		if (isBoatDefinitiveCreateRejection(error)) throw error;
		try {
			const matches = await liveSandboxesNamed(client, options.name, timing, signal);
			if (matches.length !== 1) throw error;
			const recovered = matches[0];
			if (recovered === undefined) throw error;
			sandbox = recovered;
		} catch (lookupError) {
			throw new BoatAmbiguousCreateError(options.name, error, lookupError);
		}
	}
	try {
		const named = await bounded(
			`name sandbox ${sandbox.id}`,
			() =>
				client.update({
					sandboxId: sandbox.id,
					updateSandboxRequest: { name: options.name },
				}),
			timing,
			signal,
		);
		return await waitUntilReady(client, named.sandbox.id, timing, signal);
	} catch (error) {
		let stopped = false;
		try {
			await stopSandbox(client, sandbox.id, timing, signal);
			stopped = await teardownConfirmed(client, sandbox.id, timing, signal);
		} catch {
			stopped = false;
		}
		if (error instanceof BootTerminalState) {
			throw new BoatBootFailureError(error.sandboxId, error.state, stopped);
		}
		throw error;
	}
}

function commandOutcome(result: Command200Response): {
	readonly exitCode?: number;
	readonly stdout: string;
	readonly stderr: string;
} {
	if (!instanceOfCommandResponse(result)) {
		throw new Error("boat command returned a background start envelope for a synchronous exec");
	}
	return {
		...(typeof result.exitCode === "number" && Number.isSafeInteger(result.exitCode)
			? { exitCode: result.exitCode }
			: {}),
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

async function execCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	signal?: AbortSignal,
): Promise<{ readonly exitCode?: number; readonly stdout: string; readonly stderr: string }> {
	signal?.throwIfAborted();
	return commandOutcome(
		await client.command({
			sandboxId,
			commandRequest: { command, timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS },
		}),
	);
}

async function launchCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	signal?: AbortSignal,
): Promise<void> {
	signal?.throwIfAborted();
	const result = await client.command({
		sandboxId,
		commandRequest: { command, detached: true, timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS },
	});
	if (!instanceOfCommandStartedResponse(result) || !Number.isSafeInteger(result.processId)) {
		throw new Error("boat background command returned no process id");
	}
}

async function verifyBoatAllocation(
	client: BoatClient,
	native: Sandbox,
	request: CreateRequest,
	signal?: AbortSignal,
): Promise<ComputeSdkCreatedRequestVerification> {
	if (typeof native.vcpu === "number" && native.vcpu < request.spec.vcpus) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.vcpus} vCPU but the allocation reports ${native.vcpu}`,
		};
	}
	if (typeof native.memoryGB === "number" && native.memoryGB < request.spec.memoryGb) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.memoryGb} GiB but the allocation reports ${native.memoryGB} GiB`,
		};
	}
	if (request.spec.diskGb === undefined) return { status: "honored" };
	const result = await execCommand(client, native.id, "df -Pk / | awk 'NR==2 {print $2}'", signal);
	if (result.exitCode !== 0) throw new Error(`boat disk capacity probe exited ${result.exitCode}`);
	const output = result.stdout.trim();
	if (!/^\d+$/.test(output)) throw new Error("boat disk capacity probe returned malformed output");
	const capacityGb = Number(output) / 1024 / 1024;
	if (!Number.isFinite(capacityGb) || capacityGb <= 0) {
		throw new Error("boat disk capacity probe returned an invalid capacity");
	}
	return capacityGb >= request.spec.diskGb
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${request.spec.diskGb} GiB but the allocation exposes ${capacityGb.toFixed(2)} GiB`,
			};
}

export function boatSpec({ env }: DriverContext<"boat">, options: BoatSpecOptions = {}) {
	const timing = timingOf(options);
	const unresolvedCreates = new Set<string>();
	let cached: BoatClient | undefined;
	const sdk = (): BoatClient => {
		cached ??=
			options.client ??
			new BoatApi(
				new Configuration({
					basePath: env.BOAT_BASE_URL ?? BOAT_API_BASE,
					accessToken: env.BOAT_API_KEY,
					fetchApi: controlPlaneFetch(timing.controlPlaneTimeoutMs),
				}),
			);
		return cached;
	};
	const compute = nativeSdkCompute(
		async (createOptions: BoatCreateOptions, operation) => {
			try {
				return await allocate(sdk(), createOptions, timing, operation.signal);
			} catch (error) {
				if (error instanceof BoatAmbiguousCreateError) unresolvedCreates.add(createOptions.name);
				if (!(error instanceof ResponseError)) throw error;
				throw new DriverError("create-failed", error.message, {
					provider: "boat",
					vendorHttpStatus: error.response.status,
					cause: error,
				});
			}
		},
		(native) => ({
			sandboxId: native.id,
			runCommand: (command, commandOptions) =>
				execCommand(sdk(), native.id, command, commandOptions?.signal),
			destroy: () => stopSandbox(sdk(), native.id, timing),
		}),
	);
	return computeSdkSpec(compute, {
		sandboxId: BOAT_SANDBOX_ID,
		createOptions: {
			coverage: BOAT_REQUEST_COVERAGE,
			map: (request, unsupported) => {
				if (request.artifact.kind !== "none") {
					unsupported("boat boots a vendor stock Ubuntu image and cannot take an artifact ref");
				}
				if (
					request.spec.vcpus !== BOAT_DEFAULT_VCPUS ||
					request.spec.memoryGb !== BOAT_DEFAULT_MEMORY_GB
				) {
					unsupported(
						`boat's default SKU is ${BOAT_DEFAULT_VCPUS} vCPU / ${BOAT_DEFAULT_MEMORY_GB} GiB; ${request.spec.vcpus} vCPU / ${request.spec.memoryGb} GiB is a different size`,
					);
				}
				const name = `${BOAT_RECOVERY_NAME_PREFIX}-${randomUUID()}`;
				return {
					name,
					idempotencyKey: name,
					type: BOAT_MACHINE_TYPE,
					ttlSeconds: null,
					noEnv: true,
				} satisfies BoatCreateOptions;
			},
		},
		lifecycle: {
			destroy: async (sandbox, ref, operation) =>
				stopSandbox(sdk(), ref?.id ?? sandbox.getInstance().id, timing, operation.signal),
		},
		createRecovery: {
			absenceConfirmationMs: options.recoveryAbsenceConfirmationMs ?? 2_000,
			maxAttempts: 4,
			locator: (createOptions) => ({ kind: "name", value: createOptions.name }),
			isDefinitive: (error) =>
				isBoatDefinitiveCreateRejection(error) ||
				(error instanceof BoatBootFailureError && error.teardownConfirmed),
			isRetryableCreate: isBoatRetryableCreate,
			cleanup: async (_compute, locator, operation) => {
				const matches = await liveSandboxesNamed(sdk(), locator.value, timing, operation.signal);
				if (matches.length === 0) {
					if (unresolvedCreates.has(locator.value)) {
						throw new Error(
							"timed-out create has no terminal allocation verdict; empty lookups cannot confirm cancellation",
						);
					}
					return { status: "absent" };
				}
				for (const match of matches) {
					await stopSandbox(sdk(), match.id, timing, operation.signal);
				}
				for (const match of matches) {
					if (!(await teardownConfirmed(sdk(), match.id, timing, operation.signal))) {
						throw new Error(
							`boat sandbox ${match.id} has not confirmed teardown after create recovery`,
						);
					}
				}
				unresolvedCreates.delete(locator.value);
				return { status: "destroyed" };
			},
		},
		commands: {
			exec: (sandbox, command, commandOptions) =>
				execCommand(sdk(), sandbox.getInstance().id, command, commandOptions?.signal),
			launch: (sandbox, command, commandOptions) =>
				launchCommand(sdk(), sandbox.getInstance().id, command, commandOptions?.signal),
		},
		prepareAndVerifyCreatedRequest: (_sandbox, native, request, operation) =>
			verifyBoatAllocation(sdk(), native, request, operation.signal),
		hasWorkingFilesystem: false,
		probes: {
			observe: async (_compute, ref) => {
				try {
					const current = await bounded(
						`get sandbox ${ref.id}`,
						() => sdk().get({ sandboxId: ref.id }),
						timing,
					);
					return boatObservation(current.sandbox.state);
				} catch (error) {
					if (isBoatNotFound(error)) return { state: "absent" };
					throw error;
				}
			},
			describe: (_compute, ref) =>
				bounded(`get sandbox ${ref.id}`, () => sdk().get({ sandboxId: ref.id }), timing),
			list: () =>
				bounded(
					"list sandboxes",
					() => sdk().sandboxes({ limit: BOAT_INVENTORY_PAGE_SIZE }),
					timing,
				),
		},
		inventory: {
			list: async (_compute, operation) => {
				const rows = await completeInventory(sdk(), timing, operation.signal);
				const owned: string[] = [];
				let foreignCount = 0;
				for (const row of rows) {
					if (ABSENT_STATES.has(row.state)) continue;
					if (row.name.startsWith(`${BOAT_RECOVERY_NAME_PREFIX}-`)) owned.push(row.id);
					else foreignCount += 1;
				}
				return { owned, foreignCount };
			},
		},
		destroyById: (_compute, ref, operation) => stopSandbox(sdk(), ref.id, timing, operation.signal),
	});
}

export default defineComputeSdkDriver("boat", {
	provenance: BOAT_PROVENANCE,
	readiness: BOAT_READINESS,
	execution: BOAT_EXECUTION,
	createBudget: BOAT_CREATE_BUDGET,
	spec: boatSpec,
});
