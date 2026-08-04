// Harden the official @computesdk/runloop wrapper at its provider-method seam. The published wrapper
// supplies the command, filesystem, and tunnel implementations we want, but its connection methods
// currently swallow get/list/destroy errors and getInfo returns the stale create response with a
// native Runloop status that violates ComputeSDK's three-value status contract. Those behaviors would
// turn control-plane outages and leaked, billable Devboxes into successful benchmark samples.
import type { SandboxMethods } from "@computesdk/provider";
import { runloop } from "@computesdk/runloop";
import type { Runloop } from "@runloop/api-client";
import { NotFoundError, RunloopSDK } from "@runloop/api-client";
import type { CreateSandboxOptions, SandboxInfo } from "computesdk";
import type { DirectProvider } from "./types.ts";

const PROVIDER = "runloop";

type RunloopSandbox = Runloop.Devboxes.DevboxView & { client: RunloopSDK };
type RunloopMethods = Pick<
	SandboxMethods<RunloopSandbox>,
	"create" | "getById" | "list" | "destroy" | "getInfo"
>;
type RunloopControlPlane = Pick<RunloopSDK, "api">;

interface PatchableManager {
	methods: SandboxMethods<RunloopSandbox> & Record<string, unknown>;
}

export interface RunloopComputeOptions {
	/** Test seam; production constructs the official SDK lazily from RUNLOOP_API_KEY. */
	client?: RunloopControlPlane;
}

function assertPatchable(manager: unknown): asserts manager is PatchableManager {
	const methods = (manager as { methods?: Record<string, unknown> })?.methods;
	for (const method of ["create", "getById", "list", "destroy", "getInfo"] as const) {
		if (typeof methods?.[method] !== "function") {
			throw new Error(
				"@computesdk/runloop provider internals changed shape (sandbox manager has no " +
					`patchable ${method} method); revisit the Runloop adapter against the upgraded wrapper`,
			);
		}
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function longPollOptions(timeoutMs: number | undefined) {
	return timeoutMs ? { longPoll: { timeoutMs } } : undefined;
}

export function runloopStatus(
	status: Runloop.Devboxes.DevboxView["status"],
): SandboxInfo["status"] {
	if (status === "running") return "running";
	if (status === "failure") return "error";
	// ComputeSDK has no transitional state. Create waits for running, so this path is normally a clean
	// suspended/shutdown record (or a brief transition observed by getById/list).
	return "stopped";
}

export function runloopSandboxInfo(devbox: Runloop.Devboxes.DevboxView): SandboxInfo {
	const keepAliveSecs = devbox.launch_parameters.keep_alive_time_seconds;
	return {
		id: devbox.id,
		provider: PROVIDER,
		status: runloopStatus(devbox.status),
		createdAt: new Date(devbox.create_time_ms),
		timeout: keepAliveSecs ? keepAliveSecs * 1000 : 300_000,
		metadata: {
			...devbox.metadata,
			runloopDevboxId: devbox.id,
			templateId: devbox.blueprint_id ?? devbox.snapshot_id,
			runtime: "node",
		},
	};
}

function sandboxMethods(client: () => RunloopControlPlane): RunloopMethods {
	return {
		create: async (_config, options?: CreateSandboxOptions) => {
			const {
				timeout,
				envs,
				name,
				metadata,
				templateId,
				snapshotId,
				sandboxId: requestedId,
				ports: _ports,
				namespace: _namespace,
				directory: _directory,
				...providerOptions
			} = options ?? {};
			const keepAliveSeconds = timeout ? Math.ceil(timeout / 1000) : 1800;
			const {
				blueprint_id: providerBlueprintId,
				blueprint_name: providerBlueprintName,
				snapshot_id: providerSnapshotId,
				...runloopOptions
			} = providerOptions as Runloop.Devboxes.DevboxCreateParams;
			const source = snapshotId
				? { snapshot_id: snapshotId }
				: templateId?.startsWith("bpt_")
					? { blueprint_id: templateId }
					: templateId?.startsWith("snp_")
						? { snapshot_id: templateId }
						: providerSnapshotId
							? { snapshot_id: providerSnapshotId }
							: providerBlueprintId
								? { blueprint_id: providerBlueprintId }
								: providerBlueprintName
									? { blueprint_name: providerBlueprintName }
									: {};
			const params = {
				launch_parameters: { keep_alive_time_seconds: keepAliveSeconds },
				name: name ?? requestedId,
				metadata,
				environment_variables: envs,
				...runloopOptions,
				...source,
			} as Runloop.Devboxes.DevboxCreateParams;

			const sdk = client();
			let created: Runloop.Devboxes.DevboxView | undefined;
			try {
				created = await sdk.api.devboxes.create(params);
				const running = await sdk.api.devboxes.awaitRunning(created.id, longPollOptions(timeout));
				return {
					sandbox: { ...running, client: sdk as RunloopSDK },
					sandboxId: running.id,
				};
			} catch (error) {
				if (!created) {
					throw new Error(`Failed to create Runloop Devbox: ${errorMessage(error)}`, {
						cause: error,
					});
				}
				try {
					await sdk.api.devboxes.shutdown(created.id, { force: "true" });
				} catch (cleanupError) {
					throw new AggregateError(
						[error, cleanupError],
						`Runloop Devbox ${created.id} failed to reach running (${errorMessage(error)}) and ` +
							`cleanup failed (${errorMessage(cleanupError)}); manual cleanup may be required`,
					);
				}
				throw new Error(
					`Runloop Devbox ${created.id} failed to reach running and was shut down: ${errorMessage(error)}`,
					{ cause: error },
				);
			}
		},

		getById: async (_config, sandboxId) => {
			const sdk = client();
			try {
				const devbox = await sdk.api.devboxes.retrieve(sandboxId);
				return {
					sandbox: { ...devbox, client: sdk as RunloopSDK },
					sandboxId: devbox.id,
				};
			} catch (error) {
				if (error instanceof NotFoundError) return null;
				throw error;
			}
		},

		// One page is intentional: lifecycle measures one list round-trip, not paginator drain time.
		// Omit irreversible tombstones from ComputeSDK's active-sandbox surface.
		list: async () => {
			const sdk = client();
			const page = await sdk.api.devboxes.list({ include_total_count: false, limit: 100 });
			return (page.devboxes ?? [])
				.filter((devbox) => devbox.status !== "shutdown")
				.map((devbox) => ({
					sandbox: { ...devbox, client: sdk as RunloopSDK },
					sandboxId: devbox.id,
				}));
		},

		destroy: async (_config, sandboxId) => {
			// A snapshot can still be finalizing when lifecycle reaches teardown. Force makes shutdown
			// deterministic instead of accepting Runloop's 409 and leaking the Devbox.
			await client().api.devboxes.shutdown(sandboxId, { force: "true" });
		},

		getInfo: async (sandbox) => {
			const current = await sandbox.client.api.devboxes.retrieve(sandbox.id);
			return runloopSandboxInfo(current);
		},
	};
}

function normalizeSnapshot(snapshot: Runloop.Devboxes.DevboxSnapshotView) {
	return {
		id: snapshot.id,
		provider: PROVIDER,
		createdAt: new Date(snapshot.create_time_ms),
		...(snapshot.metadata ? { metadata: snapshot.metadata } : {}),
	};
}

/** Official Runloop provider with lifecycle semantics hardened for benchmark correctness and cleanup. */
export function runloopCompute(options: RunloopComputeOptions = {}): DirectProvider {
	let cached = options.client;
	const client = (): RunloopControlPlane => {
		cached ??= new RunloopSDK();
		return cached;
	};

	const compute = runloop({});
	const manager: unknown = compute.sandbox;
	assertPatchable(manager);
	manager.methods = { ...manager.methods, ...sandboxMethods(client) };

	return {
		name: compute.name,
		sandbox: compute.sandbox,
		snapshot: {
			create: async (sandboxId, snapshotOptions) => {
				const params: Runloop.Devboxes.DevboxSnapshotDiskParams = {};
				if (snapshotOptions?.name) params.name = snapshotOptions.name;
				if (snapshotOptions?.metadata) params.metadata = snapshotOptions.metadata;
				return normalizeSnapshot(await client().api.devboxes.snapshotDisk(sandboxId, params));
			},
			list: async () => {
				const page = await client().api.devboxes.listDiskSnapshots({ limit: 100 });
				return (page.snapshots ?? []).map(normalizeSnapshot);
			},
			delete: async (snapshotId) => {
				await client().api.devboxes.deleteDiskSnapshot(snapshotId);
			},
		},
	};
}
