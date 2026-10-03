// Runloop's vendor adapter: translation only. It receives a client over @runloop/api-client and
// states what the Devbox API means in the vendor port's terms.
// Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Devboxes run commands as their unprivileged Blueprint user (registry `runtimeIdentity`); there is
// no root lever, so nothing here asks for one — the toolchain accommodates it instead.

import type { Runloop, RunloopSDK } from "@runloop/api-client";
import {
	AuthenticationError,
	BadRequestError,
	NotFoundError,
	RateLimitError,
} from "@runloop/api-client";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny, LEAK_EXPIRY_MS, MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export type DevboxView = Runloop.Devboxes.DevboxView;
/** The control-plane slice the adapter drives; tests inject a fake, production the real SDK. */
export type RunloopClient = Pick<RunloopSDK, "api">;

/** Exact shape observed on live Devbox ids (`dbx_` plus the vendor's opaque suffix). */
export const RUNLOOP_SANDBOX_ID = type(/^dbx_[A-Za-z0-9]+$/);
/** Every benchmark create stamps both keys; the attempt key carries the kit's ownership marker. */
export const RUNLOOP_OWNER_METADATA_KEY = "sandbox-benchmarks";
export const RUNLOOP_ATTEMPT_METADATA_KEY = "sandbox-benchmarks-attempt";
/** One control-plane round-trip; the kit bounds each call by the same ceiling. */
export const RUNLOOP_CONTROL_TIMEOUT_MS = 30_000;
/**
 * A cold Blueprint boot happens inside create: this bounds the readiness long poll and is the
 * harness-owned create budget, so the two cannot disagree about how long one attempt may take.
 */
export const RUNLOOP_CREATE_TIMEOUT_MS = 20 * 60_000;
/**
 * Synchronous commands complete through Runloop's execute-and-await long poll. The harness routes
 * every step budgeted at or past the sync cap to the durable path, so this ceiling only backstops
 * a command the harness already gave up on; the harness's own wait-cap binds first.
 */
const RUNLOOP_SYNC_EXEC_TIMEOUT_MS = 10 * 60_000;
/** Records stamped with the owner key alone are the benchmark's, under a marker no attempt mints. */
const OWNER_KEY_MARKER = `${MARKER_PREFIX}owner-key`;

/**
 * Runloop never forgets a Devbox: `retrieve` and `list` keep returning `shutdown` and `failure`
 * records indefinitely. Both are terminal — nothing runs, nothing can be resumed, no command can be
 * sent — so neither is an allocation the account holds. A suspended Devbox still holds its disk:
 * failed, so it is shut down rather than awaited.
 */
function phaseOf(status: DevboxView["status"]): Phase {
	switch (status) {
		case "running":
			return "ready";
		case "suspending":
		case "suspended":
			return "failed";
		case "failure":
		case "shutdown":
			return "gone";
		default:
			return "pending";
	}
}

function markerOf({ metadata }: DevboxView): string | undefined {
	const attempt = metadata?.[RUNLOOP_ATTEMPT_METADATA_KEY];
	if (attempt?.startsWith(MARKER_PREFIX)) return attempt;
	return metadata?.[RUNLOOP_OWNER_METADATA_KEY] === "runloop" ? OWNER_KEY_MARKER : attempt;
}

const record = (devbox: DevboxView): VendorRecord<DevboxView> => {
	const marker = markerOf(devbox);
	return { id: devbox.id, phase: phaseOf(devbox.status), ...(marker && { marker }), raw: devbox };
};
const requestOptions = (signal?: AbortSignal) => ({
	timeout: RUNLOOP_CONTROL_TIMEOUT_MS,
	...(signal && { signal }),
});
const refusal = instanceOfAny(AuthenticationError, BadRequestError, RateLimitError);
const rateLimited = instanceOfAny(RateLimitError);

export function runloopVendor(
	{ resolvedArtifact }: Pick<DriverContext<"runloop">, "resolvedArtifact">,
	client: RunloopClient,
): Vendor<DevboxView, DevboxView> {
	const { devboxes } = client.api;
	const get = async (id: string, { signal }: { signal: AbortSignal }) =>
		record(await devboxes.retrieve(id, requestOptions(signal)));
	return {
		control: {
			// The create acknowledgement is `provisioning`: readiness is observed by `settle`.
			create: async ({ request, marker }, { signal }) =>
				record(
					await devboxes.create(
						{
							name: marker,
							metadata: {
								[RUNLOOP_OWNER_METADATA_KEY]: "runloop",
								[RUNLOOP_ATTEMPT_METADATA_KEY]: marker,
							},
							blueprint_name: resolvedArtifact.ref,
							launch_parameters: {
								resource_size_request: "CUSTOM_SIZE",
								custom_cpu_cores: request.spec.vcpus,
								custom_gb_memory: request.spec.memoryGb,
								...(request.spec.diskGb !== undefined && {
									custom_disk_size: request.spec.diskGb,
								}),
								keep_alive_time_seconds: LEAK_EXPIRY_MS / 1000,
							},
						},
						requestOptions(signal),
					),
				),
			get,
			/**
			 * Runloop's server-side long poll (`wait_for_status`) answers as soon as the Devbox leaves
			 * its boot states, so readiness is observed when Runloop reports it rather than at the next
			 * retrieve. The SDK rejects a Devbox that settled anywhere but `running` in prose only, so
			 * any rejection is followed by one retrieve, whose record is the verdict the kit classifies
			 * (a transport fault reads `pending` there, and the kit waits again).
			 */
			settle: async (id, { signal }) => {
				try {
					return record(
						await devboxes.awaitRunning(id, {
							...requestOptions(signal),
							longPoll: { timeoutMs: RUNLOOP_CREATE_TIMEOUT_MS },
						}),
					);
				} catch {
					signal.throwIfAborted();
					return get(id, { signal });
				}
			},
			// Forced shutdown is deterministic even while a snapshot finalizes (Runloop's 409 otherwise).
			remove: async (id, { signal }) => {
				const devbox = await devboxes.shutdown(id, { force: "true" }, requestOptions(signal));
				return phaseOf(devbox.status) === "gone" ? "removed" : "accepted";
			},
			absent: instanceOfAny(NotFoundError),
			// One Stainless cursor page; no server-side metadata filter exists, so recovery matches
			// the attempt marker over the drained account.
			page: async (cursor, { signal }) => {
				const page = await devboxes.list(
					{ include_total_count: false, limit: 100, ...(cursor && { starting_after: cursor }) },
					requestOptions(signal),
				);
				const items = page.getPaginatedItems();
				const records = items.map(record);
				return page.has_more ? { records, next: items.at(-1)?.id ?? "" } : { records };
			},
			refused: (error) => (refusal(error) ? { retryable: rateLimited(error) } : undefined),
		},
		data: {
			attach: ({ raw }) => raw,
			// A missing exit status is an unknown exit, never a fabricated zero; truncated output is a
			// failure, because a synchronous step whose stdout carries data cannot be trusted once cut.
			exec: async ({ id }, command, options?: ExecOptions) => {
				const result = await devboxes.executeAndAwaitCompletion(
					id,
					{ command },
					{
						...requestOptions(options?.signal),
						longPoll: { timeoutMs: RUNLOOP_SYNC_EXEC_TIMEOUT_MS },
					},
				);
				if (result.status !== "completed")
					throw new Error(
						`Runloop execution ${result.execution_id} ended in status ${result.status}`,
					);
				if (result.stdout_truncated || result.stderr_truncated)
					throw new Error("Runloop truncated the command output; the step needs the durable route");
				const exitCode = result.exit_status;
				return {
					...(typeof exitCode === "number" && Number.isSafeInteger(exitCode) && { exitCode }),
					stdout: result.stdout ?? "",
					stderr: result.stderr ?? "",
				};
			},
			// Background execution is accepted only once Runloop returns a genuine execution handle.
			launch: async ({ id }, command, options) => {
				const execution = await devboxes.executeAsync(
					id,
					{ command },
					requestOptions(options?.signal),
				);
				if (typeof execution.execution_id !== "string" || execution.execution_id.length === 0)
					throw new Error("Runloop background execution returned no execution id");
			},
			// `exists` is the kit's quoted `test -e`, run as the Blueprint user like every command.
			files: {
				read: ({ id }, path) =>
					devboxes.readFileContents(id, { file_path: path }, requestOptions()),
				write: async ({ id }, path, contents) => {
					const result = await devboxes.writeFileContents(
						id,
						{ file_path: path, contents },
						requestOptions(),
					);
					if (result.exit_status !== 0)
						throw new Error(`Runloop file write exited ${result.exit_status}: ${result.stderr}`);
				},
			},
		},
	};
}
