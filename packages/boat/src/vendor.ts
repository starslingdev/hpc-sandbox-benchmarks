// boat's vendor adapter: translation only, over @boatdev/sdk. External values are parsed once
// through the schemas below. Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Teardown is deleteSandbox, never stop: boat snapshots a running sandbox about once a minute and
// stop archives the sandbox with its whole snapshot chain, so a stop-based teardown leaves every
// allocation's disk behind on the account forever. Delete removes the sandbox and its snapshots.
//
// Create takes no name. The allocation is renamed to the marker's spelling on attach, which the kit
// runs on its post-create path and so tears down, and holds cleanup, by id if it fails; until then
// no listing can find it, so the module declares that a lookup cannot prove an ambiguous create
// absent.
//
// Create pins the bare-metal machine provider. The SDK's CreateSandboxRequest serializer drops
// fields it does not know, so machineProvider is merged into create's body by an init override;
// every other SDK call is sent unchanged.

import type { BoatApi, InitOverrideFunction } from "@boatdev/sdk";
import { ResponseError } from "@boatdev/sdk";
import type { ExecOptions } from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError, pollUntilReady } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { abortableDelay, markerSpelling } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export type BoatClient = Pick<
	BoatApi,
	"create" | "get" | "update" | "deleteSandbox" | "command" | "sandboxes"
>;

export const BOAT_SANDBOX_ID = type(/^bx_[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
/** The owner-visible name every benchmark sandbox is renamed to: the marker's attempt UUID. */
export const BOAT_NAME = markerSpelling("sandbox-benchmarks-");
export const BOAT_MACHINE_TYPE = "default" as const;
export const BOAT_MACHINE_PROVIDER = "baremetal" as const;
export const BOAT_COMMAND_TIMEOUT_SECONDS = 600;
export const BOAT_CONTROL_TIMEOUT_MS = 30_000;
export const BOAT_CREATE_ATTEMPTS = 5;
export const BOAT_CREATE_RETRY_MS = 2_000;
/**
 * Boat counts create, fork, and resume against one account-wide starts-per-minute limit. A 429
 * needs a fresh minute window; the ordinary 2s transient retry is too soon.
 */
export const BOAT_CREATE_RATE_LIMIT_RETRY_MS = 60_000;
// Exec is accepted before the guest's outbound network is up: a clone issued ~1s after boot was
// refused in 6ms on one of 30 sandboxes. Preparation therefore waits for DNS plus a TCP connect.
export const BOAT_EGRESS_PROBE_HOST = "boat.dev";
export const BOAT_EGRESS_TIMEOUT_MS = 90_000;
export const BOAT_EGRESS_POLL_MS = 1_000;
const EGRESS_PROBE = `getent hosts ${BOAT_EGRESS_PROBE_HOST} >/dev/null 2>&1 && timeout 3 bash -c 'exec 3<>/dev/tcp/${BOAT_EGRESS_PROBE_HOST}/443'`;

const sandboxSchema = type({
	id: BOAT_SANDBOX_ID,
	name: "string",
	state: "string >= 1",
	"vcpu?": "number > 0",
	"memoryGB?": "number > 0",
});
const sandboxResponse = type({ sandbox: sandboxSchema });
const pageSchema = type({
	sandboxes: sandboxSchema.array(),
	"pageInfo?": { "nextCursor?": "string >= 1 | null", "hasMore?": "boolean" },
});
const commandResponse = type.or(
	{ type: "'command.finished'", "exitCode?": "number.integer", stdout: "string", stderr: "string" },
	{ type: "'command.started'", processId: "number.integer > 0" },
);
// Deletion is accepted asynchronously. In practice the sandbox 404s within seconds while its
// operation settles at `blocked` rather than `completed`, so removal is observed, never inferred
// from the operation status.
const deletionResponse = type({
	operation: { id: "string >= 1", targetId: "string", status: "string >= 1" },
});
const errorBody = type("string.json.parse").to({ "code?": "string", "message?": "string" });
const jsonBody = type({ "[string]": "unknown" });

export type BoatSandbox = typeof sandboxSchema.infer;

/**
 * Stopped (`archived`) rows hold no compute ("a stopped sandbox costs nothing") but still hold the
 * benchmark's disk, so they are failed: owned ones are deleted. `archiving` is still saving its
 * disk and may be refused back to running, so it is live; it fails a boot like `error` does.
 */
function phaseOf(state: string): Phase {
	if (state === "ready" || state === "idle" || state === "running") return "ready";
	return state === "error" || state === "archived" || state === "archiving" ? "failed" : "pending";
}

const record = (sandbox: BoatSandbox): VendorRecord<BoatSandbox> => {
	const marker = BOAT_NAME.fromVendor(sandbox.name);
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.state),
		...(marker && { marker }),
		...(sandbox.state === "archived" && { stopped: true }),
		raw: sandbox,
	};
};

/** The HTTP status of a vendor refusal, whether raw or already carried by this adapter's error. */
function boatHttpStatus(error: unknown): number | undefined {
	let status: number | undefined;
	matchesAnyCause(error, (cause) => {
		if (cause instanceof ResponseError) status = cause.response.status;
		else if (isDriverError(cause) && cause.provider === "boat") status = cause.vendorHttpStatus;
		return status !== undefined;
	});
	return status;
}

/** A 4xx other than a timeout or conflict refused the create before anything was allocated. */
const definitive = (status: number | undefined) =>
	status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 409;
/** A delete can conflict with a running operation, an automatic snapshot included: asked again. */
const transient = (status: number | undefined) =>
	status === 408 || status === 409 || status === 429 || (status !== undefined && status >= 500);

/** The vendor's typed error code and message, so a refusal such as a trial policy is diagnosable. */
async function errorDetail(error: ResponseError): Promise<{ code?: string; message?: string }> {
	try {
		const body = errorBody(await error.response.clone().text());
		return body instanceof type.errors ? {} : body;
	} catch {
		return {}; // An unreadable body leaves the status as the only evidence.
	}
}

/** One call's request init: the caller's signal, bounded by the control-plane timeout. */
const init = (signal?: AbortSignal): RequestInit => ({
	signal: AbortSignal.any([
		AbortSignal.timeout(BOAT_CONTROL_TIMEOUT_MS),
		...(signal ? [signal] : []),
	]),
});

export interface BoatVendorOptions {
	/** The wait between create retries (test seam). */
	readonly delay?: (ms: number, signal?: AbortSignal) => Promise<void>;
	readonly egressPollMs?: number;
}

export function boatVendor(
	client: BoatClient,
	{ delay = abortableDelay, egressPollMs = BOAT_EGRESS_POLL_MS }: BoatVendorOptions = {},
): Vendor<BoatSandbox, BoatSandbox> {
	const get = async (id: string, signal?: AbortSignal) => {
		try {
			return record(
				sandboxResponse.assert(await client.get({ sandboxId: id }, init(signal))).sandbox,
			);
		} catch (error) {
			if (boatHttpStatus(error) === 404) return null;
			throw error;
		}
	};
	const command = async (
		sandboxId: string,
		commandText: string,
		detached: boolean,
		signal?: AbortSignal,
	) =>
		commandResponse.assert(
			await client.command(
				{
					sandboxId,
					commandRequest: {
						command: commandText,
						...(detached && { detached }),
						timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS,
					},
				},
				init(signal),
			),
		);
	const exec = async ({ id }: BoatSandbox, commandText: string, options?: ExecOptions) => {
		const result = await command(id, commandText, false, options?.signal);
		if (result.type !== "command.finished")
			throw new Error("boat command returned a background envelope for synchronous exec");
		const { exitCode, stdout, stderr } = result;
		return { ...(exitCode !== undefined && { exitCode }), stdout, stderr };
	};
	// The override runs after the SDK built the JSON object and before it stringifies it, so the
	// body must stay an object (a string would be encoded twice); RequestInit does not model that.
	const withMachineProvider =
		(signal: AbortSignal): InitOverrideFunction =>
		async ({ init: built }) => ({
			...init(signal),
			body: {
				...jsonBody.assert(built.body),
				machineProvider: BOAT_MACHINE_PROVIDER,
			} as unknown as RequestInit["body"],
		});

	return {
		control: {
			// Idempotent by the marker's spelling: a retry after a lost or refused response returns the
			// same allocation. A 429 can succeed next minute; any other refusal ends the attempt.
			create: async ({ marker }, { signal }) => {
				for (let attempt = 1; ; attempt++) {
					try {
						const created = await client.create(
							{
								idempotencyKey: BOAT_NAME.toVendor(marker),
								createSandboxRequest: { type: BOAT_MACHINE_TYPE, ttlSeconds: null, noEnv: true },
							},
							withMachineProvider(signal),
						);
						// The response predates the rename; the idempotency key attributes it to the attempt.
						return { ...record(sandboxResponse.assert(created).sandbox), marker };
					} catch (error) {
						const status = boatHttpStatus(error);
						if (attempt >= BOAT_CREATE_ATTEMPTS || (definitive(status) && status !== 429)) {
							if (!(error instanceof ResponseError)) throw error;
							const { code, message } = await errorDetail(error);
							const detail =
								code === undefined && message === undefined
									? ""
									: ` ${code ?? "error"}: ${message ?? ""}`;
							throw new DriverError(
								"create-failed",
								`boat create HTTP ${status}${detail}`.trimEnd(),
								{
									provider: "boat",
									vendorHttpStatus: error.response.status,
									cause: error,
								},
							);
						}
						await delay(
							status === 429 ? BOAT_CREATE_RATE_LIMIT_RETRY_MS : BOAT_CREATE_RETRY_MS,
							signal,
						);
					}
				}
			},
			get: (id, { signal }) => get(id, signal),
			// Accepted only: the sandbox is observed gone (404) by the kit, which also asks a
			// transient refusal again. A refusal names boat's error code, so it is diagnosable.
			remove: async (id, { signal }) => {
				try {
					const accepted = deletionResponse.assert(
						await client.deleteSandbox({ sandboxId: id, xAsciiConfirmDelete: id }, init(signal)),
					);
					if (accepted.operation.targetId !== id)
						throw new Error(`boat deletion ${accepted.operation.id} targets another sandbox`);
					return "accepted";
				} catch (error) {
					if (!(error instanceof ResponseError)) throw error;
					const status = error.response.status;
					if (status === 404) return "removed";
					const { code } = await errorDetail(error);
					const named = code && /^[a-z0-9_]{1,80}$/i.test(code) ? ` ${code}` : "";
					throw new Error(`boat delete HTTP ${status}${named}; removal unconfirmed`, {
						cause: error,
					});
				}
			},
			page: async (cursor, { signal }) => {
				const page = pageSchema.assert(
					await client.sandboxes({ limit: 100, cursor }, init(signal)),
				);
				const next = page.pageInfo?.nextCursor ?? null;
				const records = page.sandboxes.map(record);
				return next === null || page.pageInfo?.hasMore === false ? { records } : { records, next };
			},
			refused: (error) => {
				const status = boatHttpStatus(error);
				return definitive(status) ? { retryable: status === 429 } : undefined;
			},
			transient: (error) => transient(boatHttpStatus(error)),
		},
		data: {
			// The rename that makes the allocation attributable: the kit deletes it by id on failure.
			attach: async ({ id, marker }, { signal }) => {
				if (marker === undefined) throw new Error("boat attaches only a create's record");
				const name = BOAT_NAME.toVendor(marker);
				return sandboxResponse.assert(
					await client.update({ sandboxId: id, updateSandboxRequest: { name } }, init(signal)),
				).sandbox;
			},
			// Outbound network, then the allocation's reported size; the kit proves the disk after.
			prepare: async ({ record: ready }, { spec }, { signal }) => {
				await pollUntilReady({
					provider: "boat",
					deadlineMs: BOAT_EGRESS_TIMEOUT_MS,
					intervalMs: egressPollMs,
					signal,
					poll: async () =>
						(await exec(ready.raw, EGRESS_PROBE, { signal })).exitCode === 0 ? true : null,
				});
				const { vcpu, memoryGB } = ready.raw;
				if (vcpu !== undefined && vcpu < spec.vcpus)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU but the allocation reports ${vcpu}`,
					};
				if (memoryGB !== undefined && memoryGB < spec.memoryGb)
					return {
						status: "unsupported",
						detail: `requested ${spec.memoryGb} GiB but the allocation reports ${memoryGB} GiB`,
					};
				return { status: "honored" };
			},
			exec,
			// Background execution is accepted only once boat returns a process id.
			launch: async ({ id }, commandText, options) => {
				if ((await command(id, commandText, true, options?.signal)).type !== "command.started")
					throw new Error("boat background command returned no process id");
			},
		},
	};
}
