// Blaxel's vendor adapter: translation only, over @blaxel/core's `SandboxInstance`. It states what
// Blaxel means in the vendor port's terms: the memory-coupled shape, the disk-backed volume and
// keepalive a benchmark needs on Blaxel's RAM-overlay root, the sandbox name as identity and
// marker, and statuses as phases. Readiness, cleanup confirmation, recovery, inventory and the disk
// proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).

import { randomUUID } from "node:crypto";
import type { SandboxInstance } from "@blaxel/core";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	isMintedMarker,
	LEAK_EXPIRY_MS,
	MARKER_PREFIX,
	refusedOn,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

/** The SDK surface the adapter translates; the package entry passes the real `SandboxInstance`. */
export type BlaxelSdk = Pick<typeof SandboxInstance, "create" | "get" | "list" | "delete">;
type BlaxelProcess = Awaited<ReturnType<SandboxInstance["process"]["exec"]>>;

/** Blaxel resource names: lowercase alphanumeric plus hyphens, at most 49 characters. */
export const BLAXEL_SANDBOX_ID = type(/^[a-z0-9][a-z0-9-]{0,48}$/);
export const BLAXEL_REGION = "us-was-1";
/** Blaxel couples CPU to RAM (measured: cores = memory MB / 2048) and exposes no independent knob. */
export const BLAXEL_MEMORY_MB_PER_VCPU = 2048;
/** The image entrypoint links PTS and HOME into this disk-backed ephemeral volume. */
export const BLAXEL_VOLUME_MOUNT_DIR = "/mnt/benchmark-volume";
export const BLAXEL_PTS_DATA_DIR = "/var/lib/phoronix-test-suite";
/**
 * Filesystem metadata eats into an ephemeral volume: a 40960 MB volume mounted with 39.94 GiB
 * visible (live, 2026-09-10). The request is usable capacity, so the volume is sized with this
 * headroom and the mount is still proven against the request afterwards.
 */
export const BLAXEL_VOLUME_HEADROOM_MB = 256;
/** Ownership label every benchmark create writes, beside the attempt label carrying its marker. */
export const BLAXEL_OWNER_LABEL = "sandbox-benchmarks";
export const BLAXEL_ATTEMPT_LABEL = "sandbox-benchmarks-attempt";
export const BLAXEL_KEEPALIVE_PROCESS = "benchmark-keepalive";
/** Records carrying the owner label alone are the benchmark's, under a marker no attempt mints. */
const OWNER_LABEL_MARKER = `${MARKER_PREFIX}owner-label`;

/** Blaxel resolves this workspace image name to the most recently completed remote build. */
const blaxelImageRef = (name: string) => `${name}:latest`;

/**
 * The control plane's structured error code. With `throwOnError` the generated client throws the
 * parsed error body, whose `code` is the HTTP status — the SDK's own idiom (`createIfNotExists`
 * matches `e.code === 409`). Prose is never consulted; only the control plane's 404 proves absence.
 */
function controlPlaneCode(caught: unknown): number | undefined {
	if ((typeof caught !== "object" && typeof caught !== "function") || caught === null)
		return undefined;
	try {
		const code = Reflect.get(caught, "code");
		return typeof code === "number" ? code : undefined;
	} catch {
		return undefined;
	}
}

/** The data plane attaches the HTTP response to its thrown error; the class itself is not exported. */
function isDataPlaneNotFound(caught: unknown): boolean {
	if ((typeof caught !== "object" && typeof caught !== "function") || caught === null) return false;
	try {
		const response = Reflect.get(caught, "response");
		if ((typeof response !== "object" && typeof response !== "function") || response === null)
			return false;
		return Reflect.get(response, "status") === 404;
	} catch {
		return false;
	}
}

/**
 * Only DEPLOYED is usable. FAILED and deactivated records still hold an allocation (failed: deleted,
 * never released); only TERMINATED (or the control plane's 404) proves removal.
 */
function phaseOf(status: string | undefined): Phase {
	switch (status) {
		case undefined:
			throw new Error("Blaxel returned no sandbox status");
		case "DEPLOYED":
			return "ready";
		case "UPLOADING":
		case "BUILDING":
		case "BUILT":
		case "DEPLOYING":
			return "pending";
		case "DELETING":
			return "deleting";
		case "TERMINATED":
			return "gone";
		default:
			return "failed";
	}
}

/**
 * Ownership is the owner label or the benchmark's name shape, nothing else: an attempt label on a
 * sandbox that carries neither attributes nothing, so another tenant's copy of it is never deleted.
 * An owned record's marker is its attempt label, else its name, else the owner-label marker.
 */
function markerOf(name: string, labels: Readonly<Record<string, string>> = {}): string | undefined {
	const named = isMintedMarker(name);
	if (!named && labels[BLAXEL_OWNER_LABEL] !== "blaxel") return undefined;
	const attempt = labels[BLAXEL_ATTEMPT_LABEL];
	if (attempt?.startsWith(MARKER_PREFIX)) return attempt;
	return named ? name : OWNER_LABEL_MARKER;
}

function record(instance: SandboxInstance): VendorRecord<SandboxInstance> {
	const name = instance.metadata.name;
	if (typeof name !== "string" || name.length === 0)
		throw new Error("Blaxel returned a sandbox without a name");
	const marker = markerOf(name, instance.metadata.labels);
	return {
		id: name,
		phase: phaseOf(instance.status),
		...(marker && { marker }),
		// A sandbox on its way out holds nothing the benchmark competes with: another tenant's is not
		// counted against admission, and an owned one is still torn down.
		...(instance.status === "DELETING" && { stopped: true }),
		raw: instance,
	};
}

/**
 * A process the sandbox killed or stopped never reported its own exit. Withholding the code lets
 * the kit record an unknown exit as evidence instead of the fabricated zero the response carries.
 */
function commandOutcome(result: BlaxelProcess) {
	const reported = result.status === "completed" || result.status === "failed";
	return {
		...(reported && Number.isSafeInteger(result.exitCode) && { exitCode: result.exitCode }),
		stdout: typeof result.stdout === "string" ? result.stdout : "",
		stderr: typeof result.stderr === "string" ? result.stderr : "",
	};
}

/** Foreground execution through the native process API, waiting for the command to settle. */
async function exec(native: SandboxInstance, command: string) {
	// timeout 0: the harness owns every step deadline; the vendor must not kill a command mid-wait.
	return commandOutcome(
		await native.process.exec({ command, waitForCompletion: true, timeout: 0 }),
	);
}

export function blaxelVendor(
	sdk: BlaxelSdk,
	{ resolvedArtifact }: Pick<DriverContext<"blaxel">, "resolvedArtifact">,
): Vendor<SandboxInstance, SandboxInstance> {
	return {
		control: {
			// The SDK's create resolves a usable sandbox (its `wait()` is deprecated as unnecessary).
			create: async ({ request, marker }) => {
				const diskGb = request.spec.diskGb;
				const instance = await sdk.create({
					name: marker,
					image: blaxelImageRef(resolvedArtifact.ref),
					memory: request.spec.memoryGb * 1024,
					region: BLAXEL_REGION,
					ttl: `${LEAK_EXPIRY_MS / 1000}s`,
					labels: { [BLAXEL_OWNER_LABEL]: "blaxel", [BLAXEL_ATTEMPT_LABEL]: marker },
					volumes:
						diskGb === undefined
							? []
							: [
									{
										name: `sbx-bench-${marker.slice(-8)}`,
										mountPath: BLAXEL_VOLUME_MOUNT_DIR,
										type: "ephemeral" as const,
										sizeMb: diskGb * 1024 + BLAXEL_VOLUME_HEADROOM_MB,
									},
								],
				});
				return { ...record(instance), phase: "ready" };
			},
			get: async (name) => record(await sdk.get(name)),
			remove: async (name) => {
				await sdk.delete(name);
				return "accepted";
			},
			// Only the control plane's 404 proves absence.
			absent: (error) => controlPlaneCode(error) === 404,
			// One cursor page; showTerminated keeps deleted history out of the listing.
			page: async (cursor) => {
				const page = await sdk.list({
					limit: 100,
					showTerminated: false,
					...(cursor !== undefined && { cursor }),
				});
				const records = page.data.map(record);
				return page.nextCursor === undefined ? { records } : { records, next: page.nextCursor };
			},
			// A structured refusal before allocation proves nothing was created; 429 is also the one
			// transient refusal worth retrying. Anything without a control-plane code stays ambiguous.
			refused: refusedOn(controlPlaneCode, [400, 401, 403, 422, 429]),
			transient: (error) => {
				const code = controlPlaneCode(error);
				return code === 408 || code === 409 || code === 429 || (code !== undefined && code >= 500);
			},
		},
		data: {
			attach: ({ raw }) => raw,
			/**
			 * Start the lifetime keepalive and prove the memory-coupled shape. Blaxel suspends a sandbox
			 * after ~15 s without an inbound request, and a running benchmark is not one; one keepAlive
			 * process keeps it resident through synchronous steps, detached steps and the gaps between
			 * harness calls alike. A keepalive that never started fails the create, so the kit tears the
			 * allocation down rather than leak a suspended one.
			 */
			prepare: async ({ native }, request) => {
				const keepalive = await native.process.exec({
					name: BLAXEL_KEEPALIVE_PROCESS,
					command: "sleep infinity",
					keepAlive: true,
					timeout: 0,
					waitForCompletion: false,
				});
				if (keepalive.status !== "running")
					throw new Error(`Blaxel keepalive process is ${keepalive.status}, not running`);
				const memoryMb = native.spec.runtime?.memory;
				return memoryMb === request.spec.memoryGb * 1024
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${request.spec.memoryGb} GiB but the sandbox reports ${memoryMb ?? "unknown"} MB`,
						};
			},
			exec,
			// Sync execs cross the sandbox gateway unvalidated past a minute; long steps run as native
			// processes, accepted only once Blaxel returns a genuine handle that has not already ended.
			launch: async (native, command) => {
				const handle = await native.process.exec({
					name: `benchmark-job-${randomUUID()}`,
					command,
					waitForCompletion: false,
					keepAlive: true,
					timeout: 0,
				});
				if (typeof handle.pid !== "string" || handle.pid.length === 0)
					throw new Error("Blaxel background process returned no process id");
				if (handle.status === "failed" || handle.status === "killed" || handle.status === "stopped")
					throw new Error(
						`Blaxel background process ended immediately with status ${handle.status}`,
					);
			},
			files: {
				read: (native, path) => native.fs.read(path),
				write: async (native, path, content) => {
					await native.fs.write(path, content);
				},
				// One read answers existence whether or not the parent directory exists yet; the harness
				// only asks this of its tiny done-file, never of a log.
				exists: async (native, path) => {
					try {
						await native.fs.read(path);
						return true;
					} catch (caught) {
						if (isDataPlaneNotFound(caught)) return false;
						throw caught;
					}
				},
			},
		},
	};
}
