// boat is a native SDK module over @boatdev/sdk. External SDK values are parsed once through the
// schemas below; their inferred types are the only vendor records used past that boundary. Shared
// driver-kit utilities own polling, cause traversal, request validation, and session mechanics.
//
// Teardown prefers deletion to remove snapshot chains. A key explicitly forbidden from deleting
// falls back to stop, which releases compute while retaining the disk. Both paths verify the
// control-plane state; an accepted stop or an archiving/error row does not prove release.
//
// Create pins the bare-metal machine provider. The SDK's CreateSandboxRequest serializer drops
// fields it does not know, so machineProvider is merged into create's body by an init override;
// every other SDK call is sent unchanged.

import { randomUUID } from "node:crypto";
import { BoatApi, Configuration, ResponseError } from "@boatdev/sdk";
import type {
	DriverContext,
	DriverOperationOptions,
	SandboxObservation,
} from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError, pollUntilReady } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { type } from "arktype";
import type {
	BoatAllocation,
	BoatClient,
	BoatCreateOptions,
	BoatSandbox,
	BoatSpecOptions,
} from "./legacy-facts.ts";
import {
	BOAT_API_BASE,
	BOAT_CLEANUP_ATTEMPTS,
	BOAT_CLEANUP_RETRY_MS,
	BOAT_CONTROL_TIMEOUT_MS,
	BOAT_CREATE_ATTEMPTS,
	BOAT_CREATE_BUDGET,
	BOAT_CREATE_RATE_LIMIT_RETRY_MS,
	BOAT_CREATE_RETRY_MS,
	BOAT_DELETE_CONFIRM_MS,
	BOAT_DELETE_POLL_MS,
	BOAT_EXECUTION,
	BOAT_INVENTORY_MAX_PAGES,
	BOAT_INVENTORY_PAGE_SIZE,
	BOAT_INVENTORY_TIMEOUT_MS,
	BOAT_MACHINE_PROVIDER,
	BOAT_MACHINE_TYPE,
	BOAT_READINESS,
	BOAT_READY_POLL_MS,
	BOAT_READY_TIMEOUT_MS,
	BOAT_RECOVERY_NAME_PREFIX,
	BOAT_REQUEST_COVERAGE,
	BOAT_SANDBOX_ID,
	BoatBootFailureError,
	boatCreateOptionsSchema,
	boatDeletionResponseSchema,
	boatErrorBodySchema,
	boatInventoryPageSchema,
	boatSandboxResponseSchema,
	READY_STATES,
	STOPPED_STATES,
	TERMINAL_BOOT_STATES,
} from "./legacy-facts.ts";
import {
	createRequestInit,
	delay,
	execCommand,
	getSandbox,
	launchCommand,
	nonnegativeNumber,
	positiveInteger,
	prepareAllocation,
	requestInit,
	verifyBoatAllocation,
} from "./legacy-guest.ts";
import { BOAT_PROVENANCE } from "./provenance.ts";

export {} from "./legacy-guest.ts";

export { BOAT_PROVENANCE };

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

async function isDeleteActionForbidden(error: unknown): Promise<boolean> {
	if (!(error instanceof ResponseError) || error.response.status !== 403) return false;
	try {
		const body = boatErrorBodySchema(await error.response.clone().text());
		return !(body instanceof type.errors) && body.code === "api_key_action_forbidden";
	} catch {
		return false;
	}
}

/** Retain the disk when deletion is unavailable, but confirm compute has actually stopped. */
async function stopSandbox(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<void> {
	try {
		if (STOPPED_STATES.has((await getSandbox(client, sandboxId, operation)).state)) return;
	} catch (error) {
		if (isBoatNotFound(error)) return;
		throw error;
	}
	const attempts = positiveInteger(options.cleanupAttempts, BOAT_CLEANUP_ATTEMPTS);
	for (let attempt = 1; ; attempt++) {
		try {
			const accepted = type({ id: BOAT_SANDBOX_ID }).assert(
				await client.stop({ sandboxId }, requestInit(operation)),
			);
			if (accepted.id !== sandboxId) throw new Error("boat stop targets another sandbox");
			break;
		} catch (error) {
			if (isBoatNotFound(error)) return;
			if (!isBoatTransient(error) || attempt >= attempts) throw error;
			await delay(
				nonnegativeNumber(options.cleanupRetryMs, BOAT_CLEANUP_RETRY_MS),
				operation.signal,
			);
		}
	}
	await pollUntilReady({
		provider: "boat",
		deadlineMs: positiveInteger(options.deleteConfirmMs, BOAT_DELETE_CONFIRM_MS),
		intervalMs: nonnegativeNumber(options.deletePollMs, BOAT_DELETE_POLL_MS),
		signal: operation.signal,
		poll: async () => {
			try {
				return STOPPED_STATES.has((await getSandbox(client, sandboxId, operation)).state)
					? true
					: null;
			} catch (error) {
				if (isBoatNotFound(error)) return true;
				throw error;
			}
		},
	});
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
 * A listed or fetched row is never `absent`: deletion 404s; a completed stop is `terminal`. `archiving` is still saving its disk and may be refused back to running, so it is live.
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

async function _waitUntilReady(
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

/**
 * Prefer deleting accumulated snapshots; fall back to confirmed stop only for the exact key-policy
 * refusal. Idempotent: an absent sandbox or an already archived stop fallback is released.
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
			if (await isDeleteActionForbidden(error)) {
				console.warn("boat delete is forbidden by key policy; stopping and retaining snapshots");
				await stopSandbox(client, sandboxId, options, operation);
				return;
			}
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
					createRequestInit(createOptions.machineProvider, operation),
				),
			).sandbox;
		} catch (error) {
			lastError = error;
			const rateLimited = isBoatRetryableCreate(error);
			// A 429 is a definitive refusal (nothing to reconcile), but can succeed next minute.
			if (attempt === attempts || (isBoatDefinitiveCreateRejection(error) && !rateLimited)) {
				throw error;
			}
			await (options.createDelay ?? delay)(
				rateLimited
					? BOAT_CREATE_RATE_LIMIT_RETRY_MS
					: nonnegativeNumber(options.createRetryMs, BOAT_CREATE_RETRY_MS),
				operation.signal,
			);
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
					machineProvider: BOAT_MACHINE_PROVIDER,
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
			// Archived snapshots retain data but no compute allocation. Exclude them from admission
			// inventory so a confirmed stop can converge even when the key cannot delete snapshots.
			list: async (_compute, operation) => {
				const owned: string[] = [];
				let foreignCount = 0;
				for (const row of await completeInventory(sdk(), options, operation)) {
					if (STOPPED_STATES.has(row.state)) continue;
					if (row.name.startsWith(`${BOAT_RECOVERY_NAME_PREFIX}-`)) owned.push(row.id);
					else foreignCount += 1;
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
