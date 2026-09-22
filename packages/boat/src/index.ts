// boat is a native SDK module over @boatdev/sdk. External SDK values are parsed once through the
// schemas below; their inferred types are the only vendor records used past that boundary. Shared
// driver-kit utilities own polling, cause traversal, request validation, and session mechanics.
//
// Teardown is deleteSandbox, never stop: boat snapshots a running sandbox about once a minute and
// stop archives the sandbox with its whole snapshot chain, so a stop-based teardown leaves every
// allocation's disk behind on the account forever. Delete removes the sandbox and its snapshots.

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
export const BOAT_CLEANUP_ATTEMPTS = 6;
export const BOAT_CLEANUP_RETRY_MS = 5_000;
export const BOAT_DELETE_CONFIRM_MS = 60_000;
export const BOAT_DELETE_POLL_MS = 1_000;
// Exec is accepted before the guest's outbound network is up: a clone issued ~1s after boot was
// refused in 6ms on one of 30 sandboxes. Readiness therefore also waits for DNS plus a TCP connect.
export const BOAT_EGRESS_PROBE_HOST = "boat.dev";
export const BOAT_EGRESS_TIMEOUT_MS = 90_000;
export const BOAT_EGRESS_POLL_MS = 1_000;
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
	BOAT_CONTROL_TIMEOUT_MS +
	BOAT_READY_TIMEOUT_MS +
	BOAT_READY_POLL_MS +
	BOAT_EGRESS_TIMEOUT_MS +
	BOAT_CONTROL_TIMEOUT_MS + // rename
	BOAT_CONTROL_TIMEOUT_MS + // disk capacity probe
	BOAT_CLEANUP_ATTEMPTS * BOAT_CONTROL_TIMEOUT_MS +
	(BOAT_CLEANUP_ATTEMPTS - 1) * BOAT_CLEANUP_RETRY_MS +
	BOAT_DELETE_CONFIRM_MS;
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
// Stopped rows hold no compute ("a stopped sandbox costs nothing"). A foreign one is therefore not
// capacity this benchmark competes with; an owned one is still a leftover to delete.
const STOPPED_STATES: ReadonlySet<string> = new Set(["archived"]);

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
// Deletion is accepted asynchronously. In practice the sandbox 404s within seconds while its
// operation settles at `blocked` rather than `completed`, so convergence is proven by observing the
// sandbox gone, never by the operation status.
const boatDeletionResponseSchema = type({
	operation: { id: "string >= 1", targetId: "string", status: "string >= 1" },
});
const boatErrorBodySchema = type("string.json.parse").to({
	"code?": "string",
	"message?": "string",
});
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
/** The create response plus the owner-visible name this allocation is renamed to while preparing. */
export type BoatAllocation = BoatSandbox & { readonly recoveryName: string };
export type BoatClient = Pick<
	BoatApi,
	"create" | "get" | "update" | "deleteSandbox" | "command" | "sandboxes"
>;

export interface BoatSpecOptions {
	readonly client?: BoatClient;
	readonly readyPollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly egressPollMs?: number;
	readonly egressTimeoutMs?: number;
	readonly deleteConfirmMs?: number;
	readonly deletePollMs?: number;
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
	) {
		super(`boat sandbox ${sandboxId} entered terminal state "${state}" while booting`);
		this.name = "BoatBootFailureError";
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
	return boatHttpStatus(error) === 429;
}

function isBoatTransient(error: unknown): boolean {
	const status = boatHttpStatus(error);
	// Deletion can conflict with a current sandbox operation, including an automatic snapshot.
	return (
		status === 408 || status === 409 || status === 429 || (status !== undefined && status >= 500)
	);
}

async function deletionRefusalDiagnostic(error: ResponseError): Promise<string> {
	const status = error.response.status;
	try {
		const body = boatErrorBodySchema(await error.response.clone().text());
		if (!(body instanceof type.errors) && body.code && /^[a-z0-9_]{1,80}$/i.test(body.code)) {
			return `boat delete HTTP ${status} ${body.code}; removal unconfirmed`;
		}
	} catch {
		// Status remains useful when the response body is unreadable.
	}
	return `boat delete HTTP ${status}; removal unconfirmed`;
}

/**
 * A listed or fetched row is never `absent`: deletion is the only teardown and a deleted sandbox
 * 404s. `archiving` is still saving its disk and may be refused back to running, so it is live.
 */
export function boatObservation(state: string): SandboxObservation {
	if (state === "error" || STOPPED_STATES.has(state)) return { state: "terminal" };
	return { state: "running" };
}

/** The vendor's typed error code and message, so a refusal such as a trial policy is diagnosable. */
export async function boatErrorDetail(error: ResponseError): Promise<string> {
	const status = error.response.status;
	try {
		const body = boatErrorBodySchema(await error.response.clone().text());
		if (!(body instanceof type.errors) && (body.code ?? body.message) !== undefined) {
			return `HTTP ${status} ${body.code ?? "error"}: ${body.message ?? ""}`.trimEnd();
		}
	} catch {
		// An unreadable body leaves the status as the only evidence.
	}
	return `HTTP ${status}`;
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
				throw new BoatBootFailureError(sandboxId, sandbox.state);
			}
			return null;
		},
	});
}

async function waitForEgress(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<void> {
	const host = BOAT_EGRESS_PROBE_HOST;
	const probe = `getent hosts ${host} >/dev/null 2>&1 && timeout 3 bash -c 'exec 3<>/dev/tcp/${host}/443'`;
	await pollUntilReady({
		provider: "boat",
		deadlineMs: positiveInteger(options.egressTimeoutMs, BOAT_EGRESS_TIMEOUT_MS),
		intervalMs: nonnegativeNumber(options.egressPollMs, BOAT_EGRESS_POLL_MS),
		signal: operation?.signal,
		poll: async () =>
			(await execCommand(client, sandboxId, probe, operation)).exitCode === 0 ? true : null,
	});
}

/**
 * Delete the sandbox and every snapshot it accumulated, then prove it is gone. Idempotent: a
 * repeated delete returns the same accepted operation and an unknown id is already absent.
 */
async function deleteSandbox(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation: DriverOperationOptions = {},
): Promise<void> {
	const attempts = positiveInteger(options.cleanupAttempts, BOAT_CLEANUP_ATTEMPTS);
	for (let attempt = 1; ; attempt++) {
		try {
			const accepted = boatDeletionResponseSchema.assert(
				await client.deleteSandbox(
					{ sandboxId, xAsciiConfirmDelete: sandboxId },
					requestInit(operation),
				),
			);
			if (accepted.operation.targetId !== sandboxId) {
				throw new Error(`boat deletion ${accepted.operation.id} targets another sandbox`);
			}
			break;
		} catch (error) {
			if (isBoatNotFound(error)) return;
			if (!isBoatTransient(error) || attempt >= attempts) {
				if (error instanceof ResponseError) console.error(await deletionRefusalDiagnostic(error));
				throw error;
			}
			await delay(
				nonnegativeNumber(options.cleanupRetryMs, BOAT_CLEANUP_RETRY_MS),
				operation.signal,
			);
		}
	}
	const deadlineMs = positiveInteger(options.deleteConfirmMs, BOAT_DELETE_CONFIRM_MS);
	await pollUntilReady({
		provider: "boat",
		deadlineMs,
		intervalMs: nonnegativeNumber(options.deletePollMs, BOAT_DELETE_POLL_MS),
		signal: operation.signal,
		poll: async () => {
			try {
				await getSandbox(client, sandboxId, operation);
				return null;
			} catch (error) {
				if (isBoatNotFound(error)) return true;
				throw error;
			}
		},
	}).catch((error: unknown) => {
		if (isDriverError(error) && error.code === "readiness-timeout") {
			throw new Error(`boat sandbox ${sandboxId} still exists ${deadlineMs}ms after deletion`, {
				cause: error,
			});
		}
		throw error;
	});
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

async function sandboxesNamed(
	client: BoatClient,
	name: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<BoatSandbox[]> {
	return (await completeInventory(client, options, operation)).filter((row) => row.name === name);
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

/**
 * Only the create call. Renaming, readiness, and egress run in the post-create hook so that every
 * failure after boat returns an id tears down, and retains cleanup, by that id: create takes no
 * name, so a sandbox whose rename never landed could not be found again by its recovery name.
 */
async function allocate(
	client: BoatClient,
	createOptions: BoatCreateOptions,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<BoatAllocation> {
	const sandbox = await createWithIdempotency(client, createOptions, options, operation);
	return { ...sandbox, recoveryName: createOptions.name };
}

async function prepareAllocation(
	client: BoatClient,
	allocation: BoatAllocation,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<BoatSandbox> {
	boatSandboxResponseSchema.assert(
		await client.update(
			{ sandboxId: allocation.id, updateSandboxRequest: { name: allocation.recoveryName } },
			requestInit(operation),
		),
	);
	const ready = await waitUntilReady(client, allocation.id, options, operation);
	await waitForEgress(client, allocation.id, options, operation);
	return ready;
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
				// Anything but a refusal may have allocated a sandbox that still carries boat's default
				// name, so an empty lookup by recovery name can never prove it absent.
				if (!isBoatDefinitiveCreateRejection(error)) unresolvedCreates.add(createOptions.name);
				if (!(error instanceof ResponseError)) throw error;
				throw new DriverError("create-failed", `boat create ${await boatErrorDetail(error)}`, {
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
			destroy: () => deleteSandbox(sdk(), native.id, options),
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
				deleteSandbox(sdk(), ref?.id ?? sandbox.getInstance().id, options, operation),
		},
		createRecovery: {
			absenceConfirmationMs: options.recoveryAbsenceConfirmationMs ?? 2_000,
			maxAttempts: 4,
			locator: (createOptions) => ({ kind: "name", value: createOptions.name }),
			isDefinitive: isBoatDefinitiveCreateRejection,
			isRetryableCreate: isBoatRetryableCreate,
			cleanup: async (_compute, locator, operation) => {
				const matches = await sandboxesNamed(sdk(), locator.value, options, operation);
				if (matches.length === 0) {
					if (unresolvedCreates.has(locator.value)) {
						throw new Error(
							"timed-out create has no terminal allocation verdict; empty lookups cannot confirm cancellation",
						);
					}
					return { status: "absent" };
				}
				for (const match of matches) {
					await deleteSandbox(sdk(), match.id, options, operation);
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
		prepareAndVerifyCreatedRequest: async (_sandbox, native, request, operation) =>
			verifyBoatAllocation(
				sdk(),
				await prepareAllocation(sdk(), native, options, operation),
				request,
				operation,
			),
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
			// Every owned row is a leftover to delete, stopped and errored ones included: deletion is
			// the only teardown, so a row still listed under our prefix is data this benchmark left.
			list: async (_compute, operation) => {
				const owned: string[] = [];
				let foreignCount = 0;
				for (const row of await completeInventory(sdk(), options, operation)) {
					if (row.name.startsWith(`${BOAT_RECOVERY_NAME_PREFIX}-`)) owned.push(row.id);
					else if (!STOPPED_STATES.has(row.state)) foreignCount += 1;
				}
				return { owned, foreignCount };
			},
		},
		destroyById: (_compute, ref, operation) => deleteSandbox(sdk(), ref.id, options, operation),
	});
}

export default defineComputeSdkDriver("boat", {
	provenance: BOAT_PROVENANCE,
	readiness: BOAT_READINESS,
	execution: BOAT_EXECUTION,
	createBudget: BOAT_CREATE_BUDGET,
	spec: boatSpec,
});
