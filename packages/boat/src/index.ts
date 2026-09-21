// boat is a native SDK module over @boatdev/sdk. External SDK values are parsed once through the
// schemas below; their inferred types are the only vendor records used past that boundary. Shared
// driver-kit utilities own polling, cause traversal, request validation, and session mechanics.

import { randomUUID } from "node:crypto";
import { BoatApi, Configuration, ResponseError } from "@boatdev/sdk";
import type {
	CreateRequest,
	DriverContext,
	DriverOperationOptions,
	ExecOptions,
	SandboxObservation,
} from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError, pollUntilReady } from "@sandbox-benchmarks/driver";
import type {
	ComputeSdkCreatedRequestVerification,
	ComputeSdkCreateRequestCoverage,
} from "@sandbox-benchmarks/driver/computesdk";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";
import { BOAT_PROVENANCE } from "./provenance.ts";

export { BOAT_PROVENANCE };

export const BOAT_API_BASE = "https://boat.dev/api/v1";
export const BOAT_SANDBOX_ID = type(/^bx_[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
export const BOAT_RECOVERY_NAME_PREFIX = "sandbox-benchmarks";
export const BOAT_MACHINE_TYPE = "default" as const;
export const BOAT_COMMAND_TIMEOUT_SECONDS = 600;
export const BOAT_READY_POLL_MS = 2_000;
export const BOAT_READY_TIMEOUT_MS = 8 * 60_000;
export const BOAT_CONTROL_TIMEOUT_MS = 30_000;
export const BOAT_CLEANUP_ATTEMPTS = 4;
export const BOAT_CLEANUP_RETRY_MS = 20_000;
export const BOAT_CREATE_ATTEMPTS = 5;
export const BOAT_CREATE_RETRY_MS = 2_000;
export const BOAT_INVENTORY_PAGE_SIZE = 100;
export const BOAT_INVENTORY_MAX_PAGES = 1_000;
export const BOAT_INVENTORY_TIMEOUT_MS = 5 * 60_000;
export const BOAT_READINESS = { startup: "create-returns-ready" } as const;
export const BOAT_EXECUTION = { syncCapMs: 60_000, durable: "native-launch" } as const;
export const BOAT_CREATE_CEILING_MS =
	BOAT_CREATE_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CREATE_ATTEMPTS - 1) * BOAT_CREATE_RETRY_MS +
	BOAT_READY_TIMEOUT_MS +
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_READY_POLL_MS +
	BOAT_CLEANUP_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CLEANUP_ATTEMPTS - 1) * BOAT_CLEANUP_RETRY_MS;
export const BOAT_CREATE_BUDGET = {
	owner: "harness",
	timeoutMs: BOAT_CREATE_CEILING_MS,
} as const;

export const BOAT_REQUEST_COVERAGE = {
	spec: {
		vcpus: "mapped",
		memoryGb: "mapped",
		diskGb: { capacityAtLeast: TARGET_SPEC.diskGb },
	},
	artifact: "context",
	deadlineMs: "harness",
	gpu: { model: "unsupported", count: "unsupported" },
	env: "unsupported",
} as const satisfies ComputeSdkCreateRequestCoverage;

const READY_STATES: ReadonlySet<string> = new Set(["ready", "idle", "running"]);
const TERMINAL_BOOT_STATES: ReadonlySet<string> = new Set(["error", "archived", "archiving"]);
const ABSENT_STATES: ReadonlySet<string> = new Set(["archived", "archiving"]);

const boatSandboxSchema = type({
	id: BOAT_SANDBOX_ID,
	name: "string",
	state: "string >= 1",
	"vcpu?": "number > 0",
	"memoryGB?": "number > 0",
});
const boatSandboxResponseSchema = type({ sandbox: boatSandboxSchema });
const boatInventoryPageSchema = type({
	sandboxes: boatSandboxSchema.array(),
	"pageInfo?": {
		"nextCursor?": "string >= 1 | null",
		"hasMore?": "boolean",
	},
});
const boatCommandResponseSchema = type.or(
	{
		type: "'command.finished'",
		"exitCode?": "number.integer",
		stdout: "string",
		stderr: "string",
	},
	{
		type: "'command.started'",
		processId: "number.integer > 0",
	},
);
const boatCreateOptionsSchema = type({
	name: "string >= 1",
	idempotencyKey: "string >= 1",
	type: "'default'",
	ttlSeconds: "null",
	noEnv: "true",
});
const diskCapacityKbSchema = type("string.integer.parse").to("number > 0");

export type BoatSandbox = typeof boatSandboxSchema.infer;
export type BoatCreateOptions = typeof boatCreateOptionsSchema.infer;
export type BoatClient = Pick<
	BoatApi,
	"create" | "get" | "update" | "stop" | "command" | "sandboxes"
>;

export interface BoatSpecOptions {
	readonly client?: BoatClient;
	readonly readyPollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly cleanupAttempts?: number;
	readonly cleanupRetryMs?: number;
	readonly createAttempts?: number;
	readonly createRetryMs?: number;
	readonly recoveryAbsenceConfirmationMs?: number;
	readonly inventoryTimeoutMs?: number;
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
			`boat create outcome is unknown; allocation ${recoveryName} may require manual cleanup`,
		);
		this.name = "BoatAmbiguousCreateError";
	}
}

class BootTerminalState extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
	) {
		super(`boat sandbox ${sandboxId} entered terminal state "${state}" while booting`);
	}
}

function positiveInteger(value: number | undefined, fallback: number): number {
	return Math.max(1, Math.floor(value ?? fallback));
}

function nonnegativeNumber(value: number | undefined, fallback: number): number {
	return Math.max(0, value ?? fallback);
}

function controlSignal(options?: DriverOperationOptions, timeoutMs = BOAT_CONTROL_TIMEOUT_MS) {
	const timeout = AbortSignal.timeout(timeoutMs);
	return options?.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
}

function requestInit(options?: DriverOperationOptions, timeoutMs?: number): RequestInit {
	return { signal: controlSignal(options, timeoutMs) };
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}

export function boatHttpStatus(error: unknown): number | undefined {
	let status: number | undefined;
	matchesAnyCause(error, (cause) => {
		if (cause instanceof ResponseError) {
			status = cause.response.status;
			return true;
		}
		if (isDriverError(cause) && cause.provider === "boat" && cause.code === "create-failed") {
			status = cause.vendorHttpStatus;
			return true;
		}
		return false;
	});
	return status;
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

export function boatObservation(state: string): SandboxObservation {
	if (ABSENT_STATES.has(state)) return { state: "absent" };
	if (state === "error") return { state: "terminal" };
	return { state: "running" };
}

async function getSandbox(
	client: BoatClient,
	sandboxId: string,
	options?: DriverOperationOptions,
): Promise<BoatSandbox> {
	return boatSandboxResponseSchema.assert(await client.get({ sandboxId }, requestInit(options)))
		.sandbox;
}

async function waitUntilReady(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<BoatSandbox> {
	return pollUntilReady({
		provider: "boat",
		deadlineMs: positiveInteger(options.readyTimeoutMs, BOAT_READY_TIMEOUT_MS),
		intervalMs: nonnegativeNumber(options.readyPollMs, BOAT_READY_POLL_MS),
		signal: operation?.signal,
		poll: async () => {
			const sandbox = await getSandbox(client, sandboxId, operation);
			if (READY_STATES.has(sandbox.state)) return sandbox;
			if (TERMINAL_BOOT_STATES.has(sandbox.state)) {
				throw new BootTerminalState(sandboxId, sandbox.state);
			}
			return null;
		},
	});
}

async function stopSandbox(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation: DriverOperationOptions = {},
): Promise<void> {
	const attempts = positiveInteger(options.cleanupAttempts, BOAT_CLEANUP_ATTEMPTS);
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			boatSandboxResponseSchema.assert(await client.stop({ sandboxId }, requestInit(operation)));
			return;
		} catch (error) {
			if (isBoatNotFound(error)) return;
			if (boatHttpStatus(error) !== 409 || attempt === attempts) throw error;
			await delay(
				nonnegativeNumber(options.cleanupRetryMs, BOAT_CLEANUP_RETRY_MS),
				operation.signal,
			);
		}
	}
}

async function teardownConfirmed(
	client: BoatClient,
	sandboxId: string,
	options?: DriverOperationOptions,
): Promise<boolean> {
	try {
		return ABSENT_STATES.has((await getSandbox(client, sandboxId, options)).state);
	} catch (error) {
		return isBoatNotFound(error);
	}
}

async function completeInventory(
	client: BoatClient,
	options: BoatSpecOptions,
	operation: DriverOperationOptions = {},
): Promise<BoatSandbox[]> {
	const timeoutMs = positiveInteger(options.inventoryTimeoutMs, BOAT_INVENTORY_TIMEOUT_MS);
	const inventoryOptions = {
		signal:
			operation.signal === undefined
				? AbortSignal.timeout(timeoutMs)
				: AbortSignal.any([operation.signal, AbortSignal.timeout(timeoutMs)]),
	};
	const rows: BoatSandbox[] = [];
	const cursors = new Set<string>();
	const ids = new Set<string>();
	let cursor: string | undefined;
	for (let pageIndex = 0; pageIndex < BOAT_INVENTORY_MAX_PAGES; pageIndex++) {
		inventoryOptions.signal.throwIfAborted();
		const page = boatInventoryPageSchema.assert(
			await client.sandboxes(
				{ limit: BOAT_INVENTORY_PAGE_SIZE, cursor },
				requestInit(inventoryOptions),
			),
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
	throw new Error("boat inventory exceeded its page limit");
}

async function liveSandboxesNamed(
	client: BoatClient,
	name: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<BoatSandbox[]> {
	return (await completeInventory(client, options, operation)).filter(
		(row) => row.name === name && !ABSENT_STATES.has(row.state),
	);
}

async function createWithIdempotency(
	client: BoatClient,
	createOptions: BoatCreateOptions,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<BoatSandbox> {
	const attempts = positiveInteger(options.createAttempts, BOAT_CREATE_ATTEMPTS);
	let lastError: unknown;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		try {
			return boatSandboxResponseSchema.assert(
				await client.create(
					{
						idempotencyKey: createOptions.idempotencyKey,
						createSandboxRequest: {
							type: createOptions.type,
							ttlSeconds: createOptions.ttlSeconds,
							noEnv: createOptions.noEnv,
						},
					},
					requestInit(operation),
				),
			).sandbox;
		} catch (error) {
			lastError = error;
			if (isBoatDefinitiveCreateRejection(error) || attempt === attempts) throw error;
			await delay(nonnegativeNumber(options.createRetryMs, BOAT_CREATE_RETRY_MS), operation.signal);
		}
	}
	throw lastError;
}

async function allocate(
	client: BoatClient,
	createOptions: BoatCreateOptions,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<BoatSandbox> {
	let sandbox: BoatSandbox;
	try {
		sandbox = await createWithIdempotency(client, createOptions, options, operation);
	} catch (createError) {
		if (isBoatDefinitiveCreateRejection(createError)) throw createError;
		try {
			const [recovered, ...duplicates] = await liveSandboxesNamed(
				client,
				createOptions.name,
				options,
				operation,
			);
			if (recovered === undefined || duplicates.length > 0) throw createError;
			sandbox = recovered;
		} catch (lookupError) {
			throw new BoatAmbiguousCreateError(createOptions.name, createError, lookupError);
		}
	}

	try {
		const named = boatSandboxResponseSchema.assert(
			await client.update(
				{
					sandboxId: sandbox.id,
					updateSandboxRequest: { name: createOptions.name },
				},
				requestInit(operation),
			),
		).sandbox;
		return await waitUntilReady(client, named.id, options, operation);
	} catch (error) {
		let stopped = false;
		try {
			await stopSandbox(client, sandbox.id, options, operation);
			stopped = await teardownConfirmed(client, sandbox.id, operation);
		} catch {
			stopped = false;
		}
		if (error instanceof BootTerminalState) {
			throw new BoatBootFailureError(error.sandboxId, error.state, stopped);
		}
		throw error;
	}
}

async function execCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	options?: ExecOptions,
): Promise<{ readonly exitCode?: number; readonly stdout: string; readonly stderr: string }> {
	const result = boatCommandResponseSchema.assert(
		await client.command(
			{
				sandboxId,
				commandRequest: { command, timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS },
			},
			requestInit(options),
		),
	);
	if (result.type !== "command.finished") {
		throw new Error("boat command returned a background envelope for synchronous exec");
	}
	return {
		...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

async function launchCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	options?: ExecOptions,
): Promise<void> {
	const result = boatCommandResponseSchema.assert(
		await client.command(
			{
				sandboxId,
				commandRequest: {
					command,
					detached: true,
					timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS,
				},
			},
			requestInit(options),
		),
	);
	if (result.type !== "command.started") {
		throw new Error("boat background command returned no process id");
	}
}

async function verifyBoatAllocation(
	client: BoatClient,
	native: BoatSandbox,
	request: CreateRequest,
	options: DriverOperationOptions,
): Promise<ComputeSdkCreatedRequestVerification> {
	if (native.vcpu !== undefined && native.vcpu < request.spec.vcpus) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.vcpus} vCPU but the allocation reports ${native.vcpu}`,
		};
	}
	if (native.memoryGB !== undefined && native.memoryGB < request.spec.memoryGb) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.memoryGb} GiB but the allocation reports ${native.memoryGB} GiB`,
		};
	}
	if (request.spec.diskGb === undefined) return { status: "honored" };
	const result = await execCommand(client, native.id, "df -Pk / | awk 'NR==2 {print $2}'", options);
	if (result.exitCode !== 0) throw new Error(`boat disk capacity probe exited ${result.exitCode}`);
	const capacityGb = diskCapacityKbSchema.assert(result.stdout.trim()) / 1024 / 1024;
	return capacityGb >= request.spec.diskGb
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${request.spec.diskGb} GiB but the allocation exposes ${capacityGb.toFixed(2)} GiB`,
			};
}

function controlPlaneFetch(timeoutMs: number): typeof fetch {
	return Object.assign(
		(...args: Parameters<typeof fetch>) =>
			fetch(args[0], {
				...args[1],
				signal:
					args[1]?.signal === undefined
						? AbortSignal.timeout(timeoutMs)
						: AbortSignal.any([args[1].signal, AbortSignal.timeout(timeoutMs)]),
			}),
		{ preconnect: fetch.preconnect },
	);
}

export function boatSpec({ env }: DriverContext<"boat">, options: BoatSpecOptions = {}) {
	const unresolvedCreates = new Set<string>();
	let cached: BoatClient | undefined;
	const sdk = (): BoatClient =>
		(cached ??=
			options.client ??
			new BoatApi(
				new Configuration({
					basePath: env.BOAT_BASE_URL ?? BOAT_API_BASE,
					accessToken: env.BOAT_API_KEY,
					fetchApi: controlPlaneFetch(BOAT_CONTROL_TIMEOUT_MS),
				}),
			));
	const compute = nativeSdkCompute(
		async (createOptions: BoatCreateOptions, operation) => {
			try {
				return await allocate(sdk(), createOptions, options, operation);
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
				execCommand(sdk(), native.id, command, commandOptions),
			destroy: () => stopSandbox(sdk(), native.id, options),
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
					request.spec.vcpus !== TARGET_SPEC.vcpus ||
					request.spec.memoryGb !== TARGET_SPEC.memoryGb
				) {
					unsupported(
						`boat's default SKU is ${TARGET_SPEC.vcpus} vCPU / ${TARGET_SPEC.memoryGb} GiB; ${request.spec.vcpus} vCPU / ${request.spec.memoryGb} GiB is a different size`,
					);
				}
				const name = `${BOAT_RECOVERY_NAME_PREFIX}-${randomUUID()}`;
				return boatCreateOptionsSchema.assert({
					name,
					idempotencyKey: name,
					type: BOAT_MACHINE_TYPE,
					ttlSeconds: null,
					noEnv: true,
				});
			},
		},
		lifecycle: {
			destroy: (sandbox, ref, operation) =>
				stopSandbox(sdk(), ref?.id ?? sandbox.getInstance().id, options, operation),
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
				const matches = await liveSandboxesNamed(sdk(), locator.value, options, operation);
				if (matches.length === 0) {
					if (unresolvedCreates.has(locator.value)) {
						throw new Error(
							"timed-out create has no terminal allocation verdict; empty lookups cannot confirm cancellation",
						);
					}
					return { status: "absent" };
				}
				for (const match of matches) {
					await stopSandbox(sdk(), match.id, options, operation);
				}
				for (const match of matches) {
					if (!(await teardownConfirmed(sdk(), match.id, operation))) {
						throw new Error(`boat sandbox ${match.id} has not confirmed teardown`);
					}
				}
				unresolvedCreates.delete(locator.value);
				return { status: "destroyed" };
			},
		},
		commands: {
			exec: (sandbox, command, commandOptions) =>
				execCommand(sdk(), sandbox.getInstance().id, command, commandOptions),
			launch: (sandbox, command, commandOptions) =>
				launchCommand(sdk(), sandbox.getInstance().id, command, commandOptions),
		},
		prepareAndVerifyCreatedRequest: (_sandbox, native, request, operation) =>
			verifyBoatAllocation(sdk(), native, request, operation),
		hasWorkingFilesystem: false,
		probes: {
			observe: async (_compute, ref) => {
				try {
					return boatObservation((await getSandbox(sdk(), ref.id)).state);
				} catch (error) {
					if (isBoatNotFound(error)) return { state: "absent" };
					throw error;
				}
			},
			describe: (_compute, ref) => getSandbox(sdk(), ref.id),
			list: async () =>
				boatInventoryPageSchema.assert(
					await sdk().sandboxes({ limit: BOAT_INVENTORY_PAGE_SIZE }, requestInit()),
				),
		},
		inventory: {
			list: async (_compute, operation) => {
				const owned: string[] = [];
				let foreignCount = 0;
				for (const row of await completeInventory(sdk(), options, operation)) {
					if (ABSENT_STATES.has(row.state)) continue;
					if (row.name.startsWith(`${BOAT_RECOVERY_NAME_PREFIX}-`)) owned.push(row.id);
					else foreignCount += 1;
				}
				return { owned, foreignCount };
			},
		},
		destroyById: (_compute, ref, operation) => stopSandbox(sdk(), ref.id, options, operation),
	});
}

export default defineComputeSdkDriver("boat", {
	provenance: BOAT_PROVENANCE,
	readiness: BOAT_READINESS,
	execution: BOAT_EXECUTION,
	createBudget: BOAT_CREATE_BUDGET,
	spec: boatSpec,
});
