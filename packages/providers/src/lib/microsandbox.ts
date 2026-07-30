// ComputeSDK adapters for Microsandbox's two execution backends. Both variants use the same
// public SDK surface; the backend selection is explicit so a process with cloud credentials can
// still benchmark the local runtime without accidentally routing that run to the control plane.
// Requires microsandbox >=0.6.8: that is the first release carrying the unified cloud backend,
// paginated list API, cloud agent tunnel, and create-until-running contract used below.
import { randomUUID } from "node:crypto";
import { posix as posixPath } from "node:path";
import type {
	CommandResult,
	CreateSandboxOptions,
	FileEntry,
	RunCommandOptions,
	SandboxInfo,
	SandboxMethods,
	SnapshotMethods,
} from "@computesdk/provider";
import { defineProvider } from "@computesdk/provider";
import type {
	DefaultBackend,
	FsEntry as MsbFsEntry,
	SandboxHandle as MsbSandboxHandle,
} from "microsandbox";
import {
	Sandbox as MsbSandbox,
	Snapshot as MsbSnapshot,
	SandboxNotFoundError,
	withDefaultBackend,
} from "microsandbox";

type MsbSandboxBuilder = ReturnType<typeof MsbSandbox.builder>;

/** Marker shared by both variants; the value distinguishes local and cloud benchmark sandboxes. */
const LABEL_MARKER = "sandbox-benchmarks.provider";
/** Label prefix under which ComputeSDK metadata is persisted. */
const LABEL_META_PREFIX = "sandbox-benchmarks.meta.";

export type MicrosandboxVariant = "microsandbox-local" | "microsandbox-cloud";

interface MicrosandboxBaseConfig {
	variant: MicrosandboxVariant;
	backend: DefaultBackend;
	/** OCI image to boot when create() receives no templateId. */
	image: string;
	/** Guest vCPUs. */
	cpus: number;
	/** Guest memory in MiB. */
	memoryMib: number;
	/** Writable managed root disk in MiB. */
	rootDiskMib: number;
	/** Working directory inside the guest. */
	workdir?: string;
	/** Prefix for generated sandbox names. */
	namePrefix: string;
	/** Informational timeout surfaced through ComputeSDK getInfo(). */
	timeoutMs: number;
	/** Optional image pull policy forwarded to Microsandbox. */
	pullPolicy?: string;
}

export interface MicrosandboxLocalConfig extends MicrosandboxBaseConfig {
	variant: "microsandbox-local";
	backend: "local";
	/** TCP port maps declared at boot; only the local backend supports published ports. */
	ports?: Array<{ host: number; guest: number }>;
}

export interface MicrosandboxCloudConfig extends MicrosandboxBaseConfig {
	variant: "microsandbox-cloud";
	backend: Extract<DefaultBackend, { kind: "cloud" }>;
}

export type MicrosandboxConfig = MicrosandboxLocalConfig | MicrosandboxCloudConfig;

/** The native sandbox plus enough immutable context to reconnect it safely. */
export interface MicrosandboxHandle {
	name: string;
	sandbox: InstanceType<typeof MsbSandbox> | null;
	backend: DefaultBackend;
	variant: MicrosandboxVariant;
	createdAt: Date;
	timeoutMs: number;
	metadata: Record<string, unknown>;
	/** guestPort -> hostPort, local only. */
	ports: Map<number, number>;
}

/** POSIX single-quote shell escaping for commands sent to the guest shell. */
function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function isNotFound(error: unknown): boolean {
	return error instanceof SandboxNotFoundError;
}

function mapStatus(status: string): SandboxInfo["status"] {
	switch (status) {
		case "running":
		case "draining":
			return "running";
		case "stopped":
			return "stopped";
		default:
			return "error";
	}
}

function recoverFromConfig(configJson: string): {
	labels: Record<string, string>;
	metadata: Record<string, unknown>;
	ports: Map<number, number>;
} {
	const labels: Record<string, string> = {};
	const metadata: Record<string, unknown> = {};
	const ports = new Map<number, number>();
	try {
		const config = JSON.parse(configJson) as Record<string, unknown>;
		const rawLabels = config.labels;
		if (rawLabels && typeof rawLabels === "object") {
			for (const [key, value] of Object.entries(rawLabels as Record<string, unknown>)) {
				labels[key] = String(value);
				if (key.startsWith(LABEL_META_PREFIX)) {
					metadata[key.slice(LABEL_META_PREFIX.length)] = String(value);
				}
			}
		}

		// `configJson` is the raw Rust serde form (host_port/guest_port), while older JS-facing
		// projections used host/guest or hostPort/guestPort. Accept every emitted spelling so a handle
		// recovered by get/list keeps local getUrl() functional across SDK upgrades.
		const network = config.network as { ports?: unknown } | undefined;
		if (Array.isArray(network?.ports)) {
			for (const entry of network.ports as Array<Record<string, unknown>>) {
				const host = Number(entry.host_port ?? entry.host ?? entry.hostPort);
				const guest = Number(entry.guest_port ?? entry.guest ?? entry.guestPort);
				if (Number.isFinite(host) && Number.isFinite(guest)) ports.set(guest, host);
			}
		}
	} catch {
		// A malformed legacy config must not make list/get unusable; the name prefix remains a fallback.
	}
	return { labels, metadata, ports };
}

function handleFromMsb(
	config: MicrosandboxConfig,
	msbHandle: MsbSandboxHandle,
): MicrosandboxHandle {
	const { metadata, ports } = recoverFromConfig(msbHandle.configJson);
	return {
		name: msbHandle.name,
		sandbox: null,
		backend: config.backend,
		variant: config.variant,
		createdAt: msbHandle.createdAt ?? new Date(),
		timeoutMs: config.timeoutMs,
		metadata,
		ports,
	};
}

function isOurs(config: MicrosandboxConfig, handle: MsbSandboxHandle): boolean {
	const { labels } = recoverFromConfig(handle.configJson);
	if (labels[LABEL_MARKER] === config.variant) return true;
	return handle.name.startsWith(config.namePrefix);
}

async function withBackend<T>(config: MicrosandboxConfig, operation: () => Promise<T>): Promise<T> {
	return withDefaultBackend(config.backend, operation);
}

/**
 * Stop and remove one sandbox record if it exists.
 *
 * Microsandbox Cloud can persist a status=error record before create() rejects. Callers that never
 * receive a ComputeSDK sandbox handle cannot use the normal destroy path, so failed autogenerated
 * creates use this primitive too. Missing records are already clean and therefore a no-op.
 */
async function removeSandboxIfPresent(
	config: MicrosandboxConfig,
	sandboxId: string,
): Promise<void> {
	await withBackend(config, async () => {
		try {
			const handle = await MsbSandbox.get(sandboxId);
			if (handle.status === "running" || handle.status === "draining") await handle.stop();
			await MsbSandbox.remove(sandboxId);
		} catch (error) {
			if (isNotFound(error)) return;
			throw error;
		}
	});
}

/** Map the SDK's structured listing without parsing or normalizing valid POSIX filename bytes. */
export function microsandboxFileEntries(entries: readonly MsbFsEntry[]): FileEntry[] {
	return entries.map((entry) => ({
		name: posixPath.basename(entry.path),
		type: entry.kind === "directory" ? ("directory" as const) : ("file" as const),
		size: entry.size,
		...(entry.modified ? { modified: entry.modified } : {}),
	}));
}

/** Connect lazily; handles created by the SDK already retain their backend after this lookup. */
async function ensureConnected(
	handle: MicrosandboxHandle,
): Promise<InstanceType<typeof MsbSandbox>> {
	if (handle.sandbox) return handle.sandbox;
	const sandbox = await withDefaultBackend(handle.backend, async () => {
		const current = await MsbSandbox.get(handle.name);
		return current.status === "running" ? current.connect() : current.startDetached();
	});
	handle.sandbox = sandbox;
	return sandbox;
}

/**
 * Retry one agent filesystem operation when a previously cached connection has gone stale.
 *
 * Filesystem reads and full-content writes are idempotent; command execution is deliberately excluded
 * because a lost response cannot tell us whether the guest already accepted that command.
 */
async function withFilesystemReconnect<T>(
	handle: MicrosandboxHandle,
	operation: (sandbox: InstanceType<typeof MsbSandbox>) => Promise<T>,
): Promise<T> {
	const hadCachedConnection = handle.sandbox !== null;
	const sandbox = await ensureConnected(handle);
	try {
		return await operation(sandbox);
	} catch (error) {
		if (!hadCachedConnection) throw error;
		handle.sandbox = null;
		return operation(await ensureConnected(handle));
	}
}

async function execOnce(
	sandbox: InstanceType<typeof MsbSandbox>,
	command: string,
	options?: RunCommandOptions,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const script = options?.background
		? `nohup sh -c ${shellQuote(command)} >/dev/null 2>&1 &`
		: command;
	const output = await sandbox.execWith("/bin/sh", (builder) => {
		let configured = builder.args(["-c", script]);
		if (options?.cwd) configured = configured.cwd(options.cwd);
		if (options?.env && Object.keys(options.env).length > 0) {
			configured = configured.envs(options.env);
		}
		if (options?.timeout) configured = configured.timeout(options.timeout);
		return configured;
	});
	return { stdout: output.stdout(), stderr: output.stderr(), exitCode: output.code };
}

async function runShell(
	handle: MicrosandboxHandle,
	command: string,
	options?: RunCommandOptions,
): Promise<CommandResult> {
	const started = Date.now();
	try {
		const sandbox = await ensureConnected(handle);
		return { ...(await execOnce(sandbox, command, options)), durationMs: Date.now() - started };
	} catch (error) {
		// The agent may have accepted the command before its connection failed. Drop the stale cache so
		// the NEXT operation reconnects, but never replay this operation: setup mutations and detached
		// benchmark launches are not generally idempotent.
		handle.sandbox = null;
		return {
			stdout: "",
			stderr: errorMessage(error),
			exitCode: 127,
			durationMs: Date.now() - started,
		};
	}
}

/** Drain every page for this provider marker; ComputeSDK's list contract is not paginated. */
async function listAll(config: MicrosandboxConfig): Promise<MsbSandboxHandle[]> {
	return withBackend(config, async () => {
		// Ownership is decided once, in isOurs(): labels cover current sandboxes and the name prefix
		// recovers legacy/partial records whose labels were lost. A server-side label filter would make
		// that fallback unreachable.
		let page = await MsbSandbox.listWith((list) => list.limit(100));
		const all = [...page.sandboxes];
		while (page.nextCursor) {
			const cursor = page.nextCursor;
			page = await MsbSandbox.listWith((list) => list.limit(100).cursor(cursor));
			all.push(...page.sandboxes);
		}
		return all;
	});
}

const sandboxMethods: SandboxMethods<MicrosandboxHandle, MicrosandboxConfig> = {
	create: async (config, options?: CreateSandboxOptions) => {
		const generatedName = options?.name === undefined;
		const name = options?.name ?? `${config.namePrefix}${randomUUID()}`;
		const timeoutMs = options?.timeout ?? config.timeoutMs;
		const metadata: Record<string, unknown> = options?.metadata ?? {};
		if (config.variant === "microsandbox-cloud" && options?.ports?.length) {
			throw new Error("Microsandbox cloud does not support published host ports");
		}
		if (config.variant === "microsandbox-cloud" && options?.snapshotId) {
			throw new Error("Microsandbox cloud snapshots are not supported");
		}
		const requestedPorts =
			(options?.ports as Array<{ host: number; guest: number }> | undefined) ?? [];
		const ports =
			config.variant === "microsandbox-local" ? [...(config.ports ?? []), ...requestedPorts] : [];
		const maxDurationSecs = Math.max(1, Math.ceil(timeoutMs / 1000));

		try {
			const sandbox = await withBackend(config, async () => {
				let builder: MsbSandboxBuilder = MsbSandbox.builder(name);
				if (options?.snapshotId) {
					builder = builder.fromSnapshot(options.snapshotId);
				} else {
					builder = builder.image(options?.templateId ?? config.image).rootDisk(config.rootDiskMib);
				}

				builder = builder
					.cpus(config.cpus)
					.memory(config.memoryMib)
					.maxDuration(maxDurationSecs)
					.detached(true)
					.label(LABEL_MARKER, config.variant);
				for (const [key, value] of Object.entries(metadata)) {
					builder = builder.label(`${LABEL_META_PREFIX}${key}`, String(value));
				}
				if (options?.envs && Object.keys(options.envs).length > 0)
					builder = builder.envs(options.envs);
				if (config.workdir) builder = builder.workdir(config.workdir);
				if (config.pullPolicy) builder = builder.pullPolicy(config.pullPolicy);
				for (const { host, guest } of ports) builder = builder.port(host, guest);
				return builder.create();
			});

			return {
				sandbox: {
					name,
					sandbox,
					backend: config.backend,
					variant: config.variant,
					createdAt: new Date(),
					timeoutMs,
					metadata,
					ports: new Map(ports.map(({ host, guest }) => [guest, host])),
				},
				sandboxId: name,
			};
		} catch (error) {
			const location =
				config.variant === "microsandbox-local" ? "local libkrun runtime" : "cloud control plane";
			let cleanupFailure: unknown;
			// Generated UUID names cannot refer to a caller-owned pre-existing sandbox. Explicit names can:
			// an AlreadyExists or transport error must never turn into deleting that existing resource.
			if (generatedName) {
				try {
					await removeSandboxIfPresent(config, name);
				} catch (cleanupError) {
					cleanupFailure = cleanupError;
				}
			}
			const cleanupSuffix = cleanupFailure
				? `; cleanup of the partial sandbox also failed: ${errorMessage(cleanupFailure)}`
				: "";
			throw new Error(
				`Failed to create ${config.variant} sandbox "${name}" through the ${location}: ${errorMessage(error)}${cleanupSuffix}`,
				{ cause: error },
			);
		}
	},

	getById: async (config, sandboxId) => {
		try {
			const handle = await withBackend(config, () => MsbSandbox.get(sandboxId));
			return { sandbox: handleFromMsb(config, handle), sandboxId };
		} catch (error) {
			if (isNotFound(error)) return null;
			throw error;
		}
	},

	list: async (config) =>
		(await listAll(config))
			.filter((handle) => isOurs(config, handle))
			.map((handle) => ({ sandbox: handleFromMsb(config, handle), sandboxId: handle.name })),

	destroy: removeSandboxIfPresent,

	runCommand: runShell,

	getInfo: async (handle): Promise<SandboxInfo> => {
		let status: SandboxInfo["status"] = "running";
		let createdAt = handle.createdAt;
		try {
			const current = await withDefaultBackend(handle.backend, () => MsbSandbox.get(handle.name));
			status = mapStatus(current.status);
			createdAt = current.createdAt ?? createdAt;
		} catch (error) {
			if (!isNotFound(error)) throw error;
			status = "stopped";
		}
		return {
			id: handle.name,
			provider: handle.variant,
			status,
			createdAt,
			timeout: handle.timeoutMs,
			metadata: {
				...handle.metadata,
				isolation: "microVM (libkrun)",
				backend: handle.variant === "microsandbox-local" ? "local" : "cloud",
			},
		};
	},

	getUrl: async (handle, options): Promise<string> => {
		if (handle.variant === "microsandbox-cloud") {
			throw new Error("Microsandbox cloud does not expose published sandbox ports");
		}
		const hostPort = handle.ports.get(options.port);
		if (!hostPort) {
			throw new Error(`No local host port is mapped to guest port ${options.port}`);
		}
		return `${options.protocol ?? "http"}://127.0.0.1:${hostPort}`;
	},

	filesystem: {
		readFile: async (handle, path): Promise<string> =>
			withFilesystemReconnect(handle, (sandbox) => sandbox.fs().readToString(path)),
		writeFile: async (handle, path, content, runCommand): Promise<void> => {
			const parent = posixPath.dirname(path);
			if (parent && parent !== "/" && parent !== ".") {
				const result = await runCommand(handle, `mkdir -p ${shellQuote(parent)}`);
				if (result.exitCode !== 0) {
					throw new Error(`mkdir failed for ${parent}: ${result.stderr}`);
				}
			}
			await withFilesystemReconnect(handle, (sandbox) => sandbox.fs().write(path, content));
		},
		mkdir: async (handle, path, runCommand): Promise<void> => {
			const result = await runCommand(handle, `mkdir -p ${shellQuote(path)}`);
			if (result.exitCode !== 0) throw new Error(`mkdir failed for ${path}: ${result.stderr}`);
		},
		readdir: async (handle, path): Promise<FileEntry[]> =>
			microsandboxFileEntries(
				await withFilesystemReconnect(handle, (sandbox) => sandbox.fs().list(path)),
			),
		exists: async (handle, path): Promise<boolean> =>
			withFilesystemReconnect(handle, (sandbox) => sandbox.fs().exists(path)),
		remove: async (handle, path, runCommand): Promise<void> => {
			const result = await runCommand(handle, `rm -rf ${shellQuote(path)}`);
			if (result.exitCode !== 0) throw new Error(`remove failed for ${path}: ${result.stderr}`);
		},
	},
};

const localSnapshotMethods: SnapshotMethods<unknown, MicrosandboxLocalConfig> = {
	create: async (config, sandboxId, options) =>
		withBackend(config, async () => {
			const name = options?.name ?? `${sandboxId}-snap-${Date.now().toString(36)}`;
			const current = await MsbSandbox.get(sandboxId);
			const wasRunning = current.status === "running" || current.status === "draining";
			if (wasRunning) await current.stop();

			let snapshotError: unknown;
			try {
				let builder = MsbSnapshot.builder(name).fromSandbox(sandboxId);
				for (const [key, value] of Object.entries(options?.metadata ?? {})) {
					builder = builder.label(key, String(value));
				}
				await builder.create();
			} catch (error) {
				snapshotError = error;
			}

			if (wasRunning) {
				try {
					await (await MsbSandbox.get(sandboxId)).startDetached();
				} catch (restartError) {
					if (snapshotError) {
						throw new AggregateError(
							[snapshotError, restartError],
							`Snapshot "${name}" failed: ${errorMessage(snapshotError)}; restart also failed: ${errorMessage(restartError)}`,
						);
					}
					throw new Error(
						`Snapshot "${name}" succeeded but restart failed: ${errorMessage(restartError)}`,
						{ cause: restartError },
					);
				}
			}
			if (snapshotError) throw snapshotError;
			return {
				id: name,
				snapshotId: name,
				sandboxId,
				name,
				createdAt: new Date(),
				metadata: options?.metadata,
			};
		}),
	list: async (config) =>
		withBackend(config, async () =>
			(await MsbSnapshot.list()).map((snapshot) => ({
				snapshotId: snapshot.name ?? snapshot.digest,
				name: snapshot.name ?? undefined,
				createdAt: snapshot.createdAt,
				imageRef: snapshot.imageRef,
			})),
		),
	delete: async (config, snapshotId) => withBackend(config, () => MsbSnapshot.remove(snapshotId)),
};

/** Local libkrun provider, including local snapshot support. */
export const microsandboxLocalCompute = defineProvider<MicrosandboxHandle, MicrosandboxLocalConfig>(
	{
		name: "microsandbox-local",
		methods: {
			sandbox: sandboxMethods as SandboxMethods<MicrosandboxHandle, MicrosandboxLocalConfig>,
			snapshot: localSnapshotMethods,
		},
	},
);

/** Cloud provider. Snapshot methods are intentionally absent so the lifecycle harness records a gap. */
export const microsandboxCloudCompute = defineProvider<MicrosandboxHandle, MicrosandboxCloudConfig>(
	{
		name: "microsandbox-cloud",
		methods: {
			sandbox: sandboxMethods as SandboxMethods<MicrosandboxHandle, MicrosandboxCloudConfig>,
		},
	},
);
