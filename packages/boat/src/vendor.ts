// boat's vendor adapter: translation only, over @boatdev/sdk. External values are parsed once
// through the schemas below. Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Teardown deletes snapshot chains. Only the exact key-policy refusal permits a stop fallback;
// that path retains the disk and confirms compute is archived or absent before releasing ownership.
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
import { DriverError, pollUntilReady } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	abortableDelay,
	bounded,
	httpClassifiers,
	httpStatus,
	markerSpelling,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export type BoatClient = Pick<
	BoatApi,
	"create" | "get" | "update" | "deleteSandbox" | "stop" | "command" | "sandboxes"
>;

export const BOAT_SANDBOX_ID = type(/^bx_[23456789abcdefghjkmnpqrstuvwxyz]{8}$/);
/** The owner-visible name every benchmark sandbox is renamed to: the marker's attempt UUID. */
export const BOAT_NAME = markerSpelling("sandbox-benchmarks-");
export const BOAT_MACHINE_TYPE = "default" as const;
export const BOAT_MACHINE_PROVIDER = "baremetal" as const;
const BOAT_COMMAND_TIMEOUT_SECONDS = 600;
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
const BOAT_EGRESS_PROBE_HOST = "boat.dev";
export const BOAT_EGRESS_TIMEOUT_MS = 90_000;
const BOAT_EGRESS_POLL_MS = 1_000;
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

type BoatSandbox = typeof sandboxSchema.infer;

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
		...(sandbox.state === "archiving" && { terminal: false }),
		...(marker && { marker }),
		...(sandbox.state === "archived" && { stopped: true }),
		raw: sandbox,
	};
};

/** The HTTP status of a vendor refusal, raw or as the cause this adapter's create error carries. */
const boatHttpStatus = httpStatus(ResponseError, (error) => error.response.status);

/**
 * The REST reading of the status: a 4xx other than a timeout or conflict refused the create before
 * anything was allocated, and a delete that conflicts with a running operation (an automatic
 * snapshot included) is asked again.
 */
const http = httpClassifiers(boatHttpStatus);

/** The vendor's typed error code and message, so a refusal such as a trial policy is diagnosable. */
async function errorDetail(error: ResponseError): Promise<{ code?: string; message?: string }> {
	try {
		const body = errorBody(await error.response.clone().text());
		return body instanceof type.errors ? {} : body;
	} catch {
		return {}; // An unreadable body leaves the status as the only evidence.
	}
}

/** One call the kit does not bound itself, within the control-plane timeout and the caller. */
const call = <T>(signal: AbortSignal | undefined, work: (init: RequestInit) => Promise<T>) =>
	bounded(signal, BOAT_CONTROL_TIMEOUT_MS, (bound) => work({ signal: bound }));

export interface BoatVendorOptions {
	/** The wait between create retries (test seam). */
	readonly delay?: (ms: number, signal?: AbortSignal) => Promise<void>;
	readonly egressPollMs?: number;
	readonly stopPollMs?: number;
}

export function boatVendor(
	client: BoatClient,
	{
		delay = abortableDelay,
		egressPollMs = BOAT_EGRESS_POLL_MS,
		stopPollMs = 1_000,
	}: BoatVendorOptions = {},
): Vendor<BoatSandbox, BoatSandbox> {
	const command = async (
		sandboxId: string,
		commandText: string,
		detached: boolean,
		signal?: AbortSignal,
	) =>
		commandResponse.assert(
			await call(signal, (init) =>
				client.command(
					{
						sandboxId,
						commandRequest: {
							command: commandText,
							...(detached && { detached }),
							timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS,
						},
					},
					init,
				),
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
		(init: RequestInit): InitOverrideFunction =>
		async ({ init: built }) => ({
			...init,
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
						const created = await call(signal, (init) =>
							client.create(
								{
									idempotencyKey: BOAT_NAME.toVendor(marker),
									createSandboxRequest: { type: BOAT_MACHINE_TYPE, ttlSeconds: null, noEnv: true },
								},
								withMachineProvider(init),
							),
						);
						// The response predates the rename; the idempotency key attributes it to the attempt.
						return { ...record(sandboxResponse.assert(created).sandbox), marker };
					} catch (error) {
						const status = boatHttpStatus(error);
						if (attempt >= BOAT_CREATE_ATTEMPTS || (http.refused(error) && status !== 429)) {
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
			get: async (id, { signal }) =>
				record(sandboxResponse.assert(await client.get({ sandboxId: id }, { signal })).sandbox),
			// Accepted only: the sandbox is observed gone (404) by the kit, which also asks a
			// transient refusal again. A refusal names boat's error code, so it is diagnosable; a
			// not-found is removal, passed to the kit as it is, its body unread.
			remove: async (id, { signal }) => {
				try {
					const accepted = deletionResponse.assert(
						await call(signal, (init) =>
							client.deleteSandbox({ sandboxId: id, xAsciiConfirmDelete: id }, init),
						),
					);
					if (accepted.operation.targetId !== id)
						throw new Error(`boat deletion ${accepted.operation.id} targets another sandbox`);
					return "accepted";
				} catch (error) {
					if (!(error instanceof ResponseError) || http.absent(error)) throw error;
					const status = error.response.status;
					const { code } = await errorDetail(error);
					if (status === 403 && code === "api_key_action_forbidden") {
						const released = async () => {
							try {
								const row = sandboxResponse.assert(
									await call(signal, (init) => client.get({ sandboxId: id }, init)),
								).sandbox;
								if (row.id !== id) throw new Error("boat stop observation targets another sandbox");
								return row.state === "archived" ? true : null;
							} catch (error) {
								if (http.absent(error)) return true;
								throw error;
							}
						};
						if (await released()) return "removed";
						try {
							const accepted = type({ id: BOAT_SANDBOX_ID }).assert(
								await call(signal, (init) => client.stop({ sandboxId: id }, init)),
							);
							if (accepted.id !== id) throw new Error("boat stop targets another sandbox");
						} catch (error) {
							if (http.absent(error)) return "removed";
							throw error;
						}
						await pollUntilReady({
							provider: "boat",
							deadlineMs: 60_000,
							intervalMs: stopPollMs,
							signal,
							poll: released,
						});
						return "removed";
					}
					const named = code && /^[a-z0-9_]{1,80}$/i.test(code) ? ` ${code}` : "";
					throw new Error(`boat delete HTTP ${status}${named}; removal unconfirmed`, {
						cause: error,
					});
				}
			},
			page: async (cursor, { signal }) => {
				const page = pageSchema.assert(await client.sandboxes({ limit: 100, cursor }, { signal }));
				const next = page.pageInfo?.nextCursor ?? null;
				// Archived rows retain disk but hold no account capacity; direct handles can still delete them.
				const records = page.sandboxes
					.filter((sandbox) => sandbox.state !== "archived")
					.map(record);
				return next === null || page.pageInfo?.hasMore === false ? { records } : { records, next };
			},
			...http,
		},
		data: {
			// The rename that makes the allocation attributable: the kit deletes it by id on failure.
			attach: async ({ id, marker }, { signal }) => {
				if (marker === undefined) throw new Error("boat attaches only a create's record");
				const name = BOAT_NAME.toVendor(marker);
				return sandboxResponse.assert(
					await call(signal, (init) =>
						client.update({ sandboxId: id, updateSandboxRequest: { name } }, init),
					),
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
