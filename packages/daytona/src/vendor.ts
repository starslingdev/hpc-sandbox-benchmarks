// Daytona's vendor adapter: translation only, over @daytona/sdk. Readiness, cleanup confirmation,
// recovery, inventory and probes live in the driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Both isolation variants share one org. Every create is named by its ownership marker (the kit's
// `benchmark-<uuid>`), so each variant's inventory claims every benchmark sandbox it finds: batches
// on the shared account never overlap (one concurrency queue), so anything present at admission is
// a leftover, and a sibling variant's later teardown of the same id converges on not-found. The
// SDK's create waits until the sandbox has started and its waited delete until it is destroyed, so
// both responses are evidence, not acknowledgements.

import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";
import type { DaytonaV2Client } from "@daytona/sdk";
import type { RootOnlyClientV0 as Daytona, Sandbox } from "@daytona/sdk/v0";
import { DaytonaError, DaytonaNotFoundError, DaytonaRateLimitError } from "@daytona/sdk/v0";
import type { CreateSandboxOptions } from "@daytona/sdk/v2";
import {
	DISABLED,
	DaytonaError as V2DaytonaError,
	NotFoundError as V2NotFoundError,
	RateLimitError as V2RateLimitError,
} from "@daytona/sdk/v2";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { shellQuote } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny, isMintedMarker } from "@sandbox-benchmarks/driver/vendor";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { DAYTONA_VM_REGIONS } from "@sandbox-benchmarks/schema/toolchain";
import { type } from "arktype";
import { DAYTONA_CONTAINER_DISK_GB } from "./container-disk.ts";

export type DaytonaVmId =
	| "daytona-vm-zen5"
	| "daytona-vm-zen5-burst"
	| "daytona-vm-arm"
	| "daytona-vm-arm-burst";
export type DaytonaId = DaytonaVmId | "daytona-container";
/** v0 ids are UUIDs; v2 ids are `sbx_<id>-<region>`. */
export const DAYTONA_SANDBOX_ID = type("string.uuid | /^sbx_[A-Za-z0-9-]+$/");
/** The bound on one SDK request. */
export const DAYTONA_CONTROL_TIMEOUT_MS = 10_000;
/**
 * The kit's bound on one control-plane call. A listing page drains the whole account through the
 * SDK's own cursor (one SDK request per vendor page, each within {@link DAYTONA_CONTROL_TIMEOUT_MS}),
 * so it is not one request's bound: a minute, as Modal's whole-generation page has.
 */
export const DAYTONA_LISTING_TIMEOUT_MS = 60_000;
/** The create and waited-delete bounds the SDK takes, in seconds. */
const CREATE_TIMEOUT_SECS = 300;
const DELETE_TIMEOUT_SECS = 30;

/** The SDK client surface the adapter translates; the package entry passes the real client. */
export type DaytonaClient = Pick<Daytona, "create" | "get" | "list" | "delete" | "snapshot">;

type CommandSandbox = {
	readonly process: Pick<Sandbox["process"], "createSession" | "executeSessionCommand">;
};

/** A reusable control shell and independent asynchronous shells preserve stream and exit identity. */
export function daytonaCommands() {
	const controls = new WeakMap<CommandSandbox, Promise<string>>();
	const controlSession = (sandbox: CommandSandbox) => {
		let session = controls.get(sandbox);
		if (!session) {
			const id = `benchmark-control-${randomUUID()}`;
			session = sandbox.process.createSession(id).then(() => id);
			controls.set(sandbox, session);
			void session.catch(() => controls.delete(sandbox));
		}
		return session;
	};
	return {
		invalidate: (sandbox: CommandSandbox) => controls.delete(sandbox),
		exec: async (sandbox: CommandSandbox, command: string, options?: ExecOptions) => {
			options?.signal?.throwIfAborted();
			const id = await controlSession(sandbox);
			options?.signal?.throwIfAborted();
			const result = await sandbox.process.executeSessionCommand(
				id,
				{
					command: `bash -lc ${shellQuote(command)}`,
					runAsync: false,
				},
				60,
			);
			return {
				...(result.exitCode !== undefined && { exitCode: result.exitCode }),
				stdout: result.stdout ?? "",
				stderr: result.stderr ?? "",
			};
		},
		launch: async (sandbox: CommandSandbox, command: string, options?: ExecOptions) => {
			options?.signal?.throwIfAborted();
			// A durable command must not occupy the control shell used to poll its done file.
			const id = `benchmark-job-${randomUUID()}`;
			await sandbox.process.createSession(id);
			options?.signal?.throwIfAborted();
			const result = await sandbox.process.executeSessionCommand(
				id,
				{
					command: `bash -lc ${shellQuote(command)}`,
					runAsync: true,
				},
				DAYTONA_CONTROL_TIMEOUT_MS / 1000,
			);
			if (typeof result.cmdId !== "string" || !result.cmdId)
				throw new Error("Daytona returned no asynchronous command id");
		},
	};
}

/**
 * A sandbox on its way out (`destroying`) holds nothing the benchmark competes with; a state this
 * adapter does not know is still pending, never released.
 */
function phaseOf(state: Sandbox["state"]): Phase {
	switch (state) {
		case "started":
			return "ready";
		case "destroyed":
			return "gone";
		case "destroying":
			return "deleting";
		case "error":
		case "build_failed":
			return "failed";
		default:
			return "pending";
	}
}

function record(sandbox: Sandbox): VendorRecord<Sandbox> {
	const marker = isMintedMarker(sandbox.name) ? sandbox.name : undefined;
	return {
		id: sandbox.id,
		phase: phaseOf(sandbox.state),
		...(marker && { marker }),
		...(sandbox.state === "destroying" && { stopped: true }),
		...(sandbox.errorReason && { detail: sandbox.errorReason }),
		raw: sandbox,
	};
}

const notFound = instanceOfAny(DaytonaNotFoundError);
const definitive = (error: unknown) =>
	matchesAnyCause(
		error,
		(cause) =>
			cause instanceof DaytonaError && [400, 401, 403, 422, 429].includes(cause.statusCode ?? 0),
	);

export function daytonaVendor(
	{ resolvedArtifact }: Pick<DriverContext<DaytonaId>, "resolvedArtifact">,
	sandboxClass: "linux-vm" | "container",
	client: DaytonaClient,
): Vendor<Sandbox, Sandbox> {
	const commands = daytonaCommands();
	// Refusals that activated an inactive snapshot: a fresh create may then succeed.
	const inactiveRefusals = new WeakSet<object>();
	// The SDK deletes through a sandbox handle; keep the latest one each read returned.
	const handles = new Map<string, Sandbox>();
	const read = (sandbox: Sandbox) => {
		handles.set(sandbox.id, sandbox);
		return record(sandbox);
	};

	return {
		control: {
			create: async ({ marker }) => {
				const snapshot = resolvedArtifact.ref;
				try {
					return read(
						await client.create(
							{ snapshot, name: marker, autoStopInterval: 0 },
							{ timeout: CREATE_TIMEOUT_SECS },
						),
					);
				} catch (error) {
					// An HTTP validation refusal allocated nothing. Confirm snapshot state with the SDK
					// instead of classifying retryability from prose, and leave retries to the harness.
					if (error instanceof DaytonaError && error.statusCode === 400) {
						try {
							const state = await client.snapshot.get(snapshot);
							if (state.state === "inactive") {
								inactiveRefusals.add(error);
								await client.snapshot.activate(state);
							}
						} catch {
							/* Preserve the original allocation refusal if activation fails. */
						}
					}
					throw error;
				}
			},
			// The SDK's get resolves a name as well as an id: the kit refuses a namesake of the id, and
			// recovery looks a marker up by this same get of the sandbox name.
			get: async (idOrName) => read(await client.get(idOrName)),
			// A handle is held only until its delete settles, so a not-found never leaves a stale one.
			remove: async (id, { current }) => {
				try {
					const sandbox = handles.get(id) ?? (await current())?.raw;
					if (sandbox) await client.delete(sandbox, DELETE_TIMEOUT_SECS, true);
					return "removed";
				} finally {
					handles.delete(id);
				}
			},
			absent: notFound,
			// The SDK drains its own cursor and exposes none, so the whole account is one page.
			page: async (_cursor, { signal }) => {
				const records = [];
				for await (const sandbox of client.list()) {
					signal.throwIfAborted();
					records.push(record(sandbox));
				}
				return { records };
			},
			refused: (error) =>
				definitive(error)
					? {
							retryable: matchesAnyCause(
								error,
								(cause) =>
									cause instanceof DaytonaRateLimitError ||
									(cause instanceof Error && inactiveRefusals.has(cause)),
							),
						}
					: undefined,
		},
		data: {
			attach: ({ raw }) => raw,
			// The snapshot pins the class and the control plane reports every resource it allocated.
			prepare: async ({ native }, { spec }) => {
				if (native.sandboxClass !== sandboxClass)
					return {
						status: "unsupported",
						detail: `requested ${sandboxClass} but snapshot allocates ${native.sandboxClass ?? "unknown"}`,
					};
				if (native.cpu !== spec.vcpus || native.memory !== spec.memoryGb)
					return {
						status: "unsupported",
						detail: "Daytona snapshot resources differ from the requested CPU or memory",
					};
				// Container-class disk is this org's 10 GiB ceiling, not TARGET_SPEC.diskGb (40).
				const requiredDiskGb =
					sandboxClass === "container" ? DAYTONA_CONTAINER_DISK_GB : spec.diskGb;
				return requiredDiskGb === undefined || native.disk >= requiredDiskGb
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${requiredDiskGb} GiB but snapshot allocates ${native.disk} GiB`,
						};
			},
			exec: (native, command, options) => commands.exec(native, command, options),
			launch: (native, command, options) => commands.launch(native, command, options),
			files: {
				read: async (native, path) => (await native.fs.downloadFile(path)).toString("utf8"),
				exists: async (native, path) => {
					try {
						await native.fs.getFileDetails(path);
						return true;
					} catch (error) {
						if (error instanceof DaytonaNotFoundError) return false;
						throw error;
					}
				},
				write: (native, path, text) => native.fs.uploadFile(Buffer.from(text), path),
			},
		},
		snapshots: {
			create: async ({ native }) => {
				const name = `benchmark-snapshot-${randomUUID()}`;
				// A VM snapshots only while stopped; its restart opens a fresh control shell.
				const vm = native.sandboxClass === "linux-vm";
				try {
					if (vm) {
						await native.stop(30);
						commands.invalidate(native);
					}
					let failure: { error: unknown } | undefined;
					try {
						await native.createSnapshot(name, 300);
					} catch (error) {
						failure = { error };
					}
					if (vm) {
						try {
							await native.start(60);
						} catch (error) {
							if (!failure) failure = { error };
						}
					}
					if (failure) throw failure.error;
					return { snapshotId: name };
				} catch (error) {
					// If restart fails after snapshot creation, the harness never receives an id to delete.
					try {
						await client.snapshot.delete(name);
					} catch (cleanup) {
						if (!(cleanup instanceof DaytonaNotFoundError))
							console.warn("Daytona failed-snapshot cleanup also failed");
					}
					throw error;
				}
			},
			delete: (name) => client.snapshot.delete(name),
		},
	};
}

type V2Sandbox = import("@daytona/sdk/v2").Sandbox;

/** The v2 create shape and placement of one daytona-vm variant. */
export interface DaytonaVmVariant {
	/** The v2 region the variant boots and imports its image in. */
	readonly region: string;
	/** A burst variant guarantees a minimal CPU floor; a fixed one guarantees the whole benchmark spec. */
	readonly burst: boolean;
	/** The placement and resource request, spread into every create. */
	readonly create: CreateSandboxOptions & {
		readonly resources: {
			readonly cpu: number;
			readonly cpuMax?: number;
			readonly memory: number;
			readonly memoryMax: number;
			readonly disk: number;
			readonly diskMax: number;
		};
	};
}

/** CPU cores (1 core = 2 vCPU) and GiB at the benchmark spec every fixed variant must match exactly. */
const SPEC_CORES = TARGET_SPEC.vcpus / 2;

/**
 * Fixed: guarantee and ceiling are both the benchmark spec, so the sandbox cannot burst.
 * Burst (mirrors modal-vm): the smallest CPU guarantee Daytona grants beside 8 GiB of reserved memory
 * (1 core; a 0.125-core request is raised to it, probe 2026-11-20) with no CPU ceiling below the plan
 * cap (10 cores = 20 vCPU), and memory reserved at the spec. Memory is reserved rather than burstable because the VM boots with
 * about the guarantee + 1 GiB as MemTotal and hotplugs the rest too slowly: a 0.5 GiB guarantee had
 * STREAM's first trial global-OOM-killed at 3 GB RSS (run 43769189560). The guarantee is the billing
 * floor the cost hook prices against.
 */
const FIXED_RESOURCES = {
	cpu: SPEC_CORES,
	cpuMax: SPEC_CORES,
	memory: TARGET_SPEC.memoryGb,
	memoryMax: TARGET_SPEC.memoryGb,
	disk: TARGET_SPEC.diskGb,
	diskMax: TARGET_SPEC.diskGb,
} as const;
const BURST_RESOURCES = {
	cpu: 1,
	memory: TARGET_SPEC.memoryGb,
	memoryMax: TARGET_SPEC.memoryGb,
	disk: TARGET_SPEC.diskGb,
	diskMax: TARGET_SPEC.diskGb,
} as const;

/** Zen 5 is the only amd64 CPU type this org's catalog offers (us-east-ash-1). */
const ZEN5 = { cpuType: "zen5" } as const;
/** arm64 exists only in us-east-iad-1 (DAYTONA_VM_REGIONS), and no cpuType is pinned: a graviton pin stays in `creating`
 *  while an unpinned arm64 create boots aarch64 (probe 2026-11-20). */
const ARM = { cpuArch: "arm64" } as const;

export const DAYTONA_VM_VARIANTS = {
	"daytona-vm-zen5": {
		region: DAYTONA_VM_REGIONS["daytona-vm-zen5"],
		burst: false,
		create: { cpuType: ZEN5.cpuType, resources: FIXED_RESOURCES },
	},
	"daytona-vm-zen5-burst": {
		region: DAYTONA_VM_REGIONS["daytona-vm-zen5-burst"],
		burst: true,
		create: { cpuType: ZEN5.cpuType, resources: BURST_RESOURCES },
	},
	"daytona-vm-arm": {
		region: DAYTONA_VM_REGIONS["daytona-vm-arm"],
		burst: false,
		create: { cpuArch: ARM.cpuArch, resources: FIXED_RESOURCES },
	},
	"daytona-vm-arm-burst": {
		region: DAYTONA_VM_REGIONS["daytona-vm-arm-burst"],
		burst: true,
		create: { cpuArch: ARM.cpuArch, resources: BURST_RESOURCES },
	},
} as const satisfies Record<DaytonaVmId, DaytonaVmVariant>;

/** The v2 client surface the VM adapter translates (`new Daytona(...).v2`). */
export type DaytonaV2 = Pick<
	DaytonaV2Client,
	"create" | "get" | "findByName" | "list" | "delete" | "images"
>;

function v2Phase(state: V2Sandbox["state"]): Phase {
	if (state === "started") return "ready";
	if (state === "destroyed") return "gone";
	if (state === "destroying") return "deleting";
	return state === "error" ? "failed" : "pending";
}

function v2Record(sandbox: V2Sandbox): VendorRecord<V2Sandbox> {
	const marker = isMintedMarker(sandbox.name ?? "") ? sandbox.name : undefined;
	return {
		id: sandbox.id,
		phase: v2Phase(sandbox.state),
		...(marker && { marker }),
		...(sandbox.state === "destroying" && { stopped: true }),
		...(sandbox.error && { detail: sandbox.error }),
		raw: sandbox,
	};
}

/**
 * A daytona-vm variant over the v2 control plane, where every Linux sandbox is a VM, created with the
 * variant's {@link DAYTONA_VM_VARIANTS} shape; the boot image is the v2 image the bake imported under
 * the artifact name, in the variant's region.
 */
export function daytonaV2Vendor(
	{ resolvedArtifact }: Pick<DriverContext<DaytonaId>, "resolvedArtifact">,
	variant: DaytonaVmVariant,
	client: DaytonaV2,
): Vendor<V2Sandbox, V2Sandbox> {
	const run = async (sandbox: V2Sandbox, command: string, options?: ExecOptions) => {
		options?.signal?.throwIfAborted();
		const result = await sandbox.process.run(`bash -lc ${shellQuote(command)}`, {
			timeoutSeconds: 60,
		});
		return {
			...(result.exitCode !== undefined && { exitCode: result.exitCode }),
			stdout: result.stdout,
			stderr: result.stderr,
		};
	};
	return {
		control: {
			create: async ({ marker }) =>
				v2Record(
					await client.create(resolvedArtifact.ref, {
						...variant.create,
						name: marker,
						region: variant.region,
						lifecyclePolicy: { idleExpirySeconds: DISABLED },
						createTimeoutSeconds: CREATE_TIMEOUT_SECS,
					}),
				),
			// Recovery looks a lost create up by its marker, which v2 resolves only through its name index.
			get: async (idOrName) =>
				v2Record(
					idOrName.startsWith("sbx_")
						? await client.get(idOrName)
						: ((await client.findByName(idOrName, { region: variant.region }))[0] ??
								(await client.get(idOrName))),
				),
			remove: async (id) => {
				await client.delete(id, { timeoutSeconds: DELETE_TIMEOUT_SECS });
				return "removed";
			},
			absent: instanceOfAny(V2NotFoundError),
			page: async (cursor) => {
				const page = await client.list({ ...(cursor && { cursor }), limit: 100 });
				return {
					records: page.items.map(v2Record),
					...(page.nextCursor && { next: page.nextCursor }),
				};
			},
			refused: (error) =>
				matchesAnyCause(
					error,
					(cause) =>
						cause instanceof V2DaytonaError &&
						[400, 401, 403, 422, 429].includes(cause.statusCode ?? 0),
				)
					? { retryable: matchesAnyCause(error, (cause) => cause instanceof V2RateLimitError) }
					: undefined,
		},
		data: {
			attach: ({ raw }) => raw,
			// The create response omits resources; a fresh read reports the guarantee the VM was given.
			// A fixed variant must hold the spec exactly (guarantee = ceiling = spec); a burst variant
			// must hold its minimal CPU floor and spec memory, and may then run above the floor.
			prepare: async ({ native }, { spec }) => {
				await native.refreshData();
				const { resources } = variant.create;
				const { cpu, memory, disk } = resources;
				const { cpuMax } = resources;
				const memoryMax = resources.memoryMax;
				const specMatches = variant.burst
					? memory === spec.memoryGb
					: cpu * 2 === spec.vcpus && memory === spec.memoryGb;
				return native.sandboxClass === "linux" &&
					specMatches &&
					memoryMax === memory &&
					native.cpu === cpu &&
					(variant.burst || native.cpuMax === cpuMax) &&
					native.memory === memory &&
					(native.disk ?? 0) >= (spec.diskGb ?? disk)
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `Daytona allocated ${native.sandboxClass} ${native.cpu}/${native.cpuMax} cores, ${native.memory} GiB, ${native.disk} GiB disk`,
						};
			},
			exec: run,
			launch: async (sandbox, command, options) => {
				options?.signal?.throwIfAborted();
				await sandbox.process.start(`bash -lc ${shellQuote(command)}`);
			},
			files: {
				read: (native, path) => native.fs.readText(path),
				exists: async (native, path) => {
					try {
						await native.fs.stat(path);
						return true;
					} catch (error) {
						if (error instanceof V2NotFoundError) return false;
						throw error;
					}
				},
				write: (native, path, text) => native.fs.writeText(path, text),
			},
		},
		snapshots: {
			create: async ({ native }) => ({ snapshotId: (await native.captureImage()).id }),
			delete: (id) => client.images.delete(id),
		},
	};
}
