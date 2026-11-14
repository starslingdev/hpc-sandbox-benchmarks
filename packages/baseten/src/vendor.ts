// Baseten Sandboxes' vendor adapter: translation only, over @basetenlabs/sandbox's `SandboxClient`.
// It states what Baseten means in the vendor port's terms: CPU coupled to memory, a per-sandbox
// persistent volume (the root filesystem is memory-backed), the keepalive that holds a sandbox out
// of standby, the sandbox name as identity and marker, and statuses as phases. Readiness, cleanup
// confirmation, recovery, inventory and the disk proof live in the driver kit.

import { randomUUID } from "node:crypto";
import type {
	Sandbox,
	SandboxClient,
	SandboxInfo,
	SandboxProcessInfo,
	VolumeClient,
	VolumeInfo,
} from "@basetenlabs/sandbox";
import { SandboxApiError, SandboxGatewayError } from "@basetenlabs/sandbox";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	abortableDelay,
	httpStatus,
	isMintedMarker,
	LEAK_EXPIRY_MS,
	MARKER_PREFIX,
	refusedOn,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

/** The SDK surface the adapter translates; the package entry passes a real `SandboxClient`. */
export type BasetenSdk = Pick<SandboxClient, "create" | "getInfo" | "get" | "list" | "delete"> & {
	readonly volumes: Pick<VolumeClient, "create" | "getInfo" | "list" | "delete">;
};

/** Baseten names: 1-49 lowercase letters, digits or hyphens, starting and ending alphanumeric. */
export const BASETEN_SANDBOX_ID = type(/^[a-z0-9](?:[a-z0-9-]{0,47}[a-z0-9])?$/);

/**
 * Baseten derives vCPU from memory through a fixed table (docs.baseten.co/sandboxes/configure);
 * the SDK has no CPU knob. Only these memory sizes have a documented vCPU count.
 */
export const BASETEN_VCPUS_BY_MEMORY_MB: Readonly<Record<number, number>> = Object.freeze({
	2048: 1,
	4096: 2,
	8192: 4,
	16384: 6,
	32768: 8,
	65536: 16,
});

/** The image entrypoint links PTS and HOME into this volume, off the memory-backed root. */
export const BASETEN_VOLUME_MOUNT_DIR = "/mnt/benchmark-volume";
export const BASETEN_PTS_DATA_DIR = "/var/lib/phoronix-test-suite";
/**
 * Filesystem metadata eats into a volume, as on Blaxel's ephemeral volumes. The request is usable
 * capacity, so the volume gets this headroom and the kit still proves the mount afterwards.
 */
export const BASETEN_VOLUME_HEADROOM_MB = 256;
/** A volume is created `DEPLOYING`; a sandbox mounts it only once it is `DEPLOYED`. */
const VOLUME_READY_TIMEOUT_MS = 3 * 60_000;
const VOLUME_POLL_MS = 2_000;

/** Ownership label every benchmark create writes on the sandbox and its volume. */
export const BASETEN_OWNER_LABEL = "sandbox-benchmarks";
export const BASETEN_KEEPALIVE_PROCESS = "benchmark-keepalive";

/** One benchmark allocation: a sandbox and the volume of the same name it mounts. */
export interface BasetenRaw {
	readonly name: string;
	readonly sandbox?: SandboxInfo;
	readonly volume?: VolumeInfo;
}

/**
 * The session's handle. The execution API URL appears only once the sandbox is deployed, so the
 * SDK's `Sandbox` is resolved on first use, after the kit has observed readiness.
 */
export interface BasetenNative {
	readonly name: string;
	readonly raw: BasetenRaw;
	sandbox(): Promise<Sandbox>;
}

const status = httpStatus(SandboxApiError, (error) => error.status);

/** A volume delete refused because the sandbox mounting it has not finished terminating. */
export class BasetenVolumeStillMounted extends Error {
	constructor(name: string, cause: unknown) {
		super(`Baseten volume ${name} is still mounted; retrying once its sandbox terminates`, {
			cause,
		});
		this.name = "BasetenVolumeStillMounted";
	}
}

/** A dropped connection or a request's own bound reached no HTTP status, and proves nothing. */
const noResponse = (error: unknown) =>
	status(error) === undefined &&
	(error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError"));

function transient(error: unknown): boolean {
	if (error instanceof BasetenVolumeStillMounted || error instanceof SandboxGatewayError)
		return true;
	const code = status(error);
	if (code === undefined) return noResponse(error);
	return code === 408 || code === 409 || code === 429 || code >= 500;
}

const notFound = (error: unknown) => status(error) === 404;

/** Read a record, the vendor's 404 as `undefined`; every other failure throws. */
async function orAbsent<T>(read: () => Promise<T>): Promise<T | undefined> {
	try {
		return await read();
	} catch (error) {
		if (notFound(error)) return undefined;
		throw error;
	}
}

/**
 * Only DEPLOYED runs commands. DEACTIVATED and ARCHIVED records are a sandbox the keepalive failed
 * to hold resident, which still owns its volume: failed, so the kit tears it down. A TERMINATED
 * sandbox is gone only once its volume is too.
 */
export function basetenPhase({ sandbox, volume }: Pick<BasetenRaw, "sandbox" | "volume">): Phase {
	if (sandbox === undefined || sandbox.status === "TERMINATED") {
		if (volume === undefined) return "gone";
		// A leftover volume with no live sandbox (a create that failed between the two allocations,
		// or a teardown that never reached it): owned storage the kit must remove.
		return volume.status === "DELETING" ? "deleting" : "failed";
	}
	switch (sandbox.status) {
		case "DEPLOYED":
			return "ready";
		case "UPLOADING":
		case "BUILDING":
		case "DEPLOYING":
			return "pending";
		case "DELETING":
			return "deleting";
		default:
			return "failed";
	}
}

function markerOf(raw: BasetenRaw): string | undefined {
	if (isMintedMarker(raw.name)) return raw.name;
	const labels = raw.sandbox?.labels ?? raw.volume?.labels ?? {};
	return labels[BASETEN_OWNER_LABEL] === "baseten" ? `${MARKER_PREFIX}owner-label` : undefined;
}

function record(raw: BasetenRaw): VendorRecord<BasetenRaw> {
	const marker = markerOf(raw);
	const phase = basetenPhase(raw);
	return {
		id: raw.name,
		phase,
		...(marker && { marker }),
		// A sandbox on its way out holds nothing another tenant's benchmark competes with.
		...(phase === "deleting" && { stopped: true }),
		...(phase === "failed" &&
			raw.sandbox !== undefined && { detail: `Baseten reports ${raw.sandbox.status}` }),
		raw,
	};
}

/**
 * A process the sandbox killed or stopped never reported its own exit. Withholding the code lets
 * the kit record an unknown exit as evidence instead of the zero the record carries.
 */
function commandOutcome(result: SandboxProcessInfo) {
	const reported = result.status === "completed" || result.status === "failed";
	return {
		...(reported && Number.isSafeInteger(result.exitCode) && { exitCode: result.exitCode }),
		stdout: typeof result.stdout === "string" ? result.stdout : "",
		stderr: typeof result.stderr === "string" ? result.stderr : "",
	};
}

export function basetenVendor(
	sdk: BasetenSdk,
	{ resolvedArtifact }: Pick<DriverContext<"baseten">, "resolvedArtifact">,
	delay: (ms: number, signal?: AbortSignal) => Promise<void> = abortableDelay,
): Vendor<BasetenRaw, BasetenNative> {
	const read = async (name: string, signal: AbortSignal): Promise<BasetenRaw | undefined> => {
		const callOptions = { signal };
		const [sandbox, volume] = await Promise.all([
			orAbsent(() => sdk.getInfo({ name, callOptions })),
			orAbsent(() => sdk.volumes.getInfo({ name, callOptions })),
		]);
		return sandbox === undefined && volume === undefined ? undefined : { name, sandbox, volume };
	};

	const awaitVolume = async (name: string, signal: AbortSignal): Promise<VolumeInfo> => {
		const deadline = Date.now() + VOLUME_READY_TIMEOUT_MS;
		for (;;) {
			const volume = await sdk.volumes.getInfo({ name, callOptions: { signal } });
			if (volume.status === "DEPLOYED") return volume;
			if (volume.status !== "DEPLOYING")
				throw new Error(`Baseten volume ${name} is ${volume.status}, not DEPLOYED`);
			if (Date.now() >= deadline)
				throw new Error(`Baseten volume ${name} was still DEPLOYING after its readiness budget`);
			await delay(VOLUME_POLL_MS, signal);
		}
	};

	return {
		control: {
			// The sandbox's `DEPLOYING` record is returned; readiness is observed by `get`.
			create: async ({ request: { spec }, marker }, { signal }) => {
				const labels = { [BASETEN_OWNER_LABEL]: "baseten" };
				const callOptions = { signal };
				const sandbox = (volume?: VolumeInfo) =>
					sdk.create({
						name: marker,
						image: `${resolvedArtifact.ref}:latest`,
						memory: spec.memoryGb * 1024,
						// A volume belongs to one region and only mounts in a sandbox there.
						...(volume?.region !== undefined && { region: volume.region }),
						labels,
						lifecycle: {
							expirationPolicies: [
								{ type: "TTL_MAX_AGE", afterMs: LEAK_EXPIRY_MS, action: "DELETE" },
							],
						},
						volumes:
							volume === undefined ? [] : [{ name: marker, mountPath: BASETEN_VOLUME_MOUNT_DIR }],
						callOptions,
					});
				// The module's `unsupported` hook refuses a request without disk: the image's entrypoint
				// requires the mounted volume. The adapter itself still translates a bare create.
				if (spec.diskGb === undefined)
					return record({ name: marker, sandbox: (await sandbox()).info });
				await sdk.volumes.create({
					name: marker,
					size: spec.diskGb * 1024 + BASETEN_VOLUME_HEADROOM_MB,
					labels,
					callOptions,
				});
				try {
					const volume = await awaitVolume(marker, signal);
					return record({ name: marker, sandbox: (await sandbox(volume)).info, volume });
				} catch (error) {
					// The volume is allocated; a refused or failed sandbox create must not strand it. A
					// volume that cannot be removed here is found again by its marker and torn down.
					const code = status(error);
					if (code !== undefined && code !== 409) {
						const removed = await sdk.volumes
							.delete({ name: marker })
							.then(() => true)
							.catch(() => false);
						if (removed) throw error;
					}
					throw new Error(`Baseten sandbox create failed after allocating volume ${marker}`, {
						cause: error,
					});
				}
			},
			get: async (name, { signal }) => {
				const raw = await read(name, signal);
				return raw === undefined ? null : record(raw);
			},
			/**
			 * Deletes the sandbox, then its volume. Baseten refuses to delete a mounted volume, and a
			 * sandbox takes minutes to terminate, so that refusal is transient: the kit asks again at
			 * `removeRetryMs` until the volume delete is accepted.
			 */
			remove: async (name, op) => {
				const current = await op.current();
				const sandbox = current?.raw.sandbox;
				if (
					sandbox !== undefined &&
					sandbox.status !== "DELETING" &&
					sandbox.status !== "TERMINATED"
				)
					await orAbsent(() => sdk.delete({ name, callOptions: { signal: op.signal } }));
				const volume = current?.raw.volume;
				if (volume !== undefined && volume.status !== "DELETING") {
					try {
						await orAbsent(() => sdk.volumes.delete({ name, callOptions: { signal: op.signal } }));
					} catch (error) {
						if (sandbox !== undefined && !transient(error) && status(error) !== undefined)
							throw new BasetenVolumeStillMounted(name, error);
						throw error;
					}
				}
				return current === null ? "removed" : "accepted";
			},
			// The whole account: every sandbox, plus benchmark volumes no sandbox holds any more.
			page: async (_cursor, { signal }) => {
				const callOptions = { signal };
				const sandboxes = new Map<string, SandboxInfo>();
				for await (const info of sdk.list({ callOptions }))
					if (info.status !== "TERMINATED") sandboxes.set(info.name, info);
				const volumes = new Map<string, VolumeInfo>();
				for await (const info of sdk.volumes.list({ query: MARKER_PREFIX, callOptions }))
					if (isMintedMarker(info.name)) volumes.set(info.name, info);
				const names = new Set([...sandboxes.keys(), ...volumes.keys()]);
				return {
					records: [...names].map((name) =>
						record({ name, sandbox: sandboxes.get(name), volume: volumes.get(name) }),
					),
				};
			},
			// A structured refusal before allocation proves nothing was created; 429 is retryable.
			refused: refusedOn(status, [400, 401, 403, 422, 429]),
			transient,
		},
		data: {
			attach: ({ raw }) => {
				let sandbox: Promise<Sandbox> | undefined;
				return {
					name: raw.name,
					raw,
					sandbox: () => {
						sandbox ??= sdk.get({ name: raw.name });
						return sandbox;
					},
				};
			},
			/**
			 * Start the lifetime keepalive and prove the memory-coupled shape. An idle Baseten sandbox
			 * goes on standby, pausing its processes; a `keepAlive` process holds it resident through
			 * synchronous steps, detached steps and the gaps between harness calls. A keepalive that
			 * never started fails the create, so the kit tears the allocation down.
			 */
			prepare: async ({ native }, request, { signal }) => {
				const sandbox = await native.sandbox();
				const keepalive = await sandbox.process.exec({
					name: BASETEN_KEEPALIVE_PROCESS,
					command: "sleep infinity",
					keepAlive: true,
					// keepAlive alone defaults to a 600 s kill; 0 is never.
					timeoutMs: 0,
					waitForCompletion: false,
					callOptions: { signal },
				});
				if (keepalive.status !== "running")
					throw new Error(`Baseten keepalive process is ${keepalive.status}, not running`);
				const info = await sdk.getInfo({ name: native.name, callOptions: { signal } });
				return info.memory === request.spec.memoryGb * 1024
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${request.spec.memoryGb} GiB but the sandbox reports ${info.memory ?? "unknown"} MB`,
						};
			},
			// timeoutMs 0: the harness owns every step deadline; the vendor must not kill a command.
			exec: async (native, command, options) =>
				commandOutcome(
					await (await native.sandbox()).process.exec({
						command,
						waitForCompletion: true,
						timeoutMs: 0,
						...(options?.signal && { callOptions: { signal: options.signal } }),
					}),
				),
			// Long steps run as native background processes, accepted only once Baseten returns a
			// genuine handle that has not already ended.
			launch: async (native, command) => {
				const handle = await (await native.sandbox()).process.exec({
					name: `benchmark-job-${randomUUID()}`,
					command,
					waitForCompletion: false,
					keepAlive: true,
					timeoutMs: 0,
				});
				if (typeof handle.pid !== "string" || handle.pid.length === 0)
					throw new Error("Baseten background process returned no process id");
				if (handle.status === "failed" || handle.status === "killed" || handle.status === "stopped")
					throw new Error(
						`Baseten background process ended immediately with status ${handle.status}`,
					);
			},
			files: {
				read: async (native, path) => (await native.sandbox()).fs.read({ path }),
				write: async (native, path, content) => {
					await (await native.sandbox()).fs.write({ path, content });
				},
				// One read answers existence whether or not the parent directory exists yet; the harness
				// only asks this of its tiny done-file, never of a log.
				exists: async (native, path) =>
					(await orAbsent(async () => (await native.sandbox()).fs.read({ path }))) !== undefined,
			},
		},
	};
}
