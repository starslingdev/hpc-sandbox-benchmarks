// run.cloud's vendor adapter: translation only, over @run-cloud/sdk. Readiness, cleanup
// confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Four vendor facts shape it, each reproduced live: create returns as soon as the control plane
// accepts the sandbox while the OCI pull/boot continues (`building_image`, exec 4409 until
// `running`); overload can stall a create (matrix run 30960125032) or refuse quota with 429 (run
// 34781421576); an ambiguous create leaks a sandbox that never auto-pauses; and the API keeps
// `destroyed` tombstones in every listing. The create name is chosen before the request, so a lost
// response is answered by READING that name (never by replaying the create), and a timed-out POST
// can still land after every lookup, so the module declares that a lookup cannot prove it absent.

import type { CreateSandboxOptions, Sandbox, SandboxClient } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { DriverError, isDriverError } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	bounded,
	httpClassifiers,
	httpStatus,
	LEAK_EXPIRY_MS,
	markerSpelling,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

/** The SDK's sandbox calls plus one raw inventory page (the SDK's `list` drops its cursor). */
export interface RuncloudTransport {
	readonly sandboxes: Pick<SandboxClient, "create" | "get" | "list" | "destroy" | "exec">;
	page(cursor: string | undefined, signal: AbortSignal): Promise<unknown>;
}

export const RUNCLOUD_SANDBOX_ID = type(/^[A-Za-z0-9][A-Za-z0-9._-]*$/);
/**
 * The caller-owned name stamped on every create, chosen before the request: a create whose response
 * is lost still leaves an allocation the control plane can be queried for by name.
 */
export const RUNCLOUD_NAME = markerSpelling("sandbox-benchmarks-");
/** Lifetime and idle-pause window, both the kit's leak expiry: above the longest suite, so a
 *  detached benchmark is never paused while the harness polls its done file. */
const LIFETIME_SECS = LEAK_EXPIRY_MS / 1000;
/** Bound each SDK call independently: a call that never settles must not suspend a create. */
export const RUNCLOUD_CONTROL_TIMEOUT_MS = 30_000;
/** An allocation can take a moment to become visible to `list()`; an ambiguous create looks this
 *  many times before concluding nothing was allocated. Guessing "absent" early leaks a sandbox. */
export const RUNCLOUD_RECONCILE_ATTEMPTS = 5;
export const RUNCLOUD_RECONCILE_RETRY_MS = 2_000;

const page = type({
	items: type({ id: "string >= 1", state: "string", "name?": "string | null" }).array(),
	nextCursor: "string >= 1 | null",
});
/** A sandbox as the SDK returns it, or the slice of it an inventory page is checked for. */
type RuncloudRow = Pick<Sandbox, "id" | "state" | "name" | "milliCpu" | "memMb" | "createdAt">;

/**
 * `destroyed` is a tombstone the API keeps forever. A pending delete can race image preparation
 * and return to running, so `destroying` is still live. A terminal boot where the HOST gave up is
 * worth a fresh create: run.cloud rebuilds the image into an ext4 rootfs per sandbox and that build
 * corrupts non-deterministically under a concurrent burst (27 failed boots of run 33712242440).
 * `stopped` says nothing about the host giving up.
 */
function phaseOf(state: string): Phase {
	switch (state) {
		case "running":
			return "ready";
		case "destroyed":
			return "gone";
		case "destroying":
			return "deleting";
		case "failed":
		case "interrupted":
		case "stopped":
			return "failed";
		default:
			return "pending";
	}
}

function record(sandbox: RuncloudRow): VendorRecord<RuncloudRow> {
	const marker = sandbox.name ? RUNCLOUD_NAME.fromVendor(sandbox.name) : undefined;
	const lastError = (sandbox as Sandbox).last_error;
	const detail = typeof lastError === "string" ? lastError.trim() : "";
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.state),
		...(marker && { marker }),
		...(detail && { detail }),
		...(["failed", "interrupted", "destroyed", "destroying"].includes(sandbox.state) && {
			retryCreate: true,
		}),
		raw: sandbox,
	};
}

/** The SDK's typed status, raw or as the cause this adapter's create error carries. */
const status = httpStatus(RunCloudError, (error) => error.status);
/** The REST reading of the status: refused, transient, and the 404 that is absence. */
const http = httpClassifiers(status);
/**
 * The SDK passes fetch failures through raw: a connection error (a TypeError, or a Bun error carrying
 * a string `code`) or the per-call control-plane timeout reached no HTTP status at all. A caller's
 * abort is no network failure, though Node's AbortError carries a string `code` too.
 */
const network = (error: unknown) =>
	error instanceof TypeError ||
	(error instanceof Error &&
		error.name !== "AbortError" &&
		(error.name === "TimeoutError" || typeof (error as { code?: unknown }).code === "string"));
/** A network failure, timeout, conflict, rate limit or outage: a DELETE refused this way is asked again. */
const transient = (error: unknown) =>
	status(error) === undefined ? !isDriverError(error) && network(error) : http.transient(error);

/**
 * One SDK call raced against its bound and the caller (the SDK's create and list take no signal).
 * The bound's own expiry is named, and so is never read as a network failure.
 */
function settled<T>(label: string, work: () => Promise<T>, signal: AbortSignal): Promise<T> {
	let bound: AbortSignal | undefined;
	return bounded(signal, RUNCLOUD_CONTROL_TIMEOUT_MS, (within) => {
		bound = within;
		return work();
	}).catch((error: unknown) => {
		if (signal.aborted || error !== bound?.reason) throw error;
		throw new Error(`run.cloud ${label} did not settle within ${RUNCLOUD_CONTROL_TIMEOUT_MS}ms`);
	});
}

export function runcloudVendor(
	{ resolvedArtifact }: Pick<DriverContext<"runcloud">, "resolvedArtifact">,
	transport: RuncloudTransport,
	{
		sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
	}: {
		readonly sleep?: (ms: number) => Promise<void>;
	} = {},
): Vendor<RuncloudRow, RuncloudRow> {
	const { sandboxes } = transport;
	/** Live sandboxes carrying exactly this name, oldest first: never a prefix or fuzzy match. */
	const named = async (name: string, signal: AbortSignal) =>
		(await settled(`lookup ${name}`, () => sandboxes.list({ name }), signal))
			.filter((sandbox) => sandbox.name === name && sandbox.state !== "destroyed")
			.sort((a, b) => (Date.parse(a.createdAt ?? "") || 0) - (Date.parse(b.createdAt ?? "") || 0));
	/** A failed create's outcome, read by its name; a failed lookup costs an attempt, not the search. */
	async function reconcile(name: string, attempts: number, signal: AbortSignal) {
		for (let attempt = 1; attempt <= attempts; attempt++) {
			// One unique name per create, so a second match means the server allocated twice; adopting
			// the oldest keeps the original from being orphaned.
			const [oldest] = await named(name, signal).catch(() => []);
			if (oldest) return oldest;
			if (attempt < attempts) await sleep(RUNCLOUD_RECONCILE_RETRY_MS);
		}
		return undefined;
	}

	return {
		control: {
			create: async ({ request: { spec }, marker }, { signal }) => {
				const name = RUNCLOUD_NAME.toVendor(marker);
				const options: CreateSandboxOptions = {
					name,
					idempotencyKey: name,
					image: resolvedArtifact.ref,
					cpu: spec.vcpus,
					memory: spec.memoryGb * 1024,
					...(spec.diskGb !== undefined && { disk: spec.diskGb }),
					idlePauseSeconds: LIFETIME_SECS,
					timeoutSeconds: LIFETIME_SECS,
				};
				try {
					return record(await settled("create", () => sandboxes.create(options), signal));
				} catch (error) {
					// Ask what the request did. A definitive 4xx gets one confirming look (a rejection can
					// still sit on a real allocation); anything else the whole window. A create that
					// SUCCEEDED and only lost its response is adopted, so a slow cold pull is not wasted.
					const found = await reconcile(
						name,
						http.refused(error) ? 1 : RUNCLOUD_RECONCILE_ATTEMPTS,
						signal,
					);
					if (found) return record(found);
					// The SDK's typed status lets account admission tell a quota refusal from others.
					if (!(error instanceof RunCloudError)) throw error;
					throw new DriverError("create-failed", error.message, {
						provider: "runcloud",
						vendorHttpStatus: error.status,
						vendorMessage: error.detail,
						cause: error,
					});
				}
			},
			get: async (id) => record(await sandboxes.get(id)),
			// run.cloud deletes asynchronously: only `destroyed` or a 404 is removal.
			remove: async (id) => {
				await sandboxes.destroy(id);
				return "accepted";
			},
			absent: http.absent,
			page: async (cursor, { signal }) => {
				const { items, nextCursor } = page.assert(await transport.page(cursor, signal));
				const records = items.map(record);
				return nextCursor === null ? { records } : { records, next: nextCursor };
			},
			find: async (marker, _cursor, { signal }) => ({
				records: (await named(RUNCLOUD_NAME.toVendor(marker), signal)).map(record),
			}),
			// A conflict (409) is no refusal: it asserts something already exists under this identity.
			refused: http.refused,
			transient,
		},
		data: {
			attach: ({ raw }) => raw,
			// The control plane reports the allocated CPU and RAM; the kit proves the disk quota after.
			prepare: async ({ record: { raw } }, { spec }) => {
				if (typeof raw.milliCpu === "number" && raw.milliCpu < spec.vcpus * 1000)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU but the allocation reports ${raw.milliCpu / 1000}`,
					};
				if (typeof raw.memMb === "number" && raw.memMb < spec.memoryGb * 1024)
					return {
						status: "unsupported",
						detail: `requested ${spec.memoryGb} GiB but the allocation reports ${raw.memMb} MiB`,
					};
				return { status: "honored" };
			},
			// A string command runs via `/bin/sh -c`; the signal closes the command's WebSocket.
			exec: async ({ id }, command, options?: ExecOptions) => {
				const { exitCode, stdout, stderr } = await sandboxes.exec(
					id,
					command,
					options?.signal ? { signal: options.signal } : {},
				);
				return { exitCode, stdout, stderr };
			},
		},
	};
}
