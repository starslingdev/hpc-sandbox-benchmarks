// First-class ComputeSDK adapter over @vercel/sandbox v2. Vercel v2 is name-keyed, so the native
// sandbox name is also the universal sandboxId. The adapter deliberately opts out of v2's automatic
// resume: replacing a sandbox that died mid-benchmark would hide the loss behind an empty guest.
import { randomUUID } from "node:crypto";
import type {
	CommandResult,
	CreateSandboxOptions,
	FileEntry,
	RunCommandOptions,
	SandboxInfo,
	SandboxMethods,
} from "@computesdk/provider";
import { defineProvider } from "@computesdk/provider";
import { APIError, Sandbox } from "@vercel/sandbox";

const NAME_PREFIX = "sandbox-benchmarks-";
const OWNER_TAG = "sandbox-benchmarks";
const OWNER_VALUE = "vercel";
const MAX_METADATA_TAGS = 4;
const sandboxConfigs = new WeakMap<Sandbox, VercelConfig>();

export interface VercelConfig {
	token: string;
	teamId: string;
	projectId: string;
	image: string;
	vcpus: number;
}

export class VercelTransportError extends Error {
	constructor(sandboxName: string, cause: unknown) {
		super(
			`Vercel command did not reach sandbox "${sandboxName}": ${cause instanceof Error ? cause.message : String(cause)}`,
			{ cause },
		);
		this.name = "VercelTransportError";
	}
}

function credentials(config: VercelConfig) {
	return { token: config.token, teamId: config.teamId, projectId: config.projectId };
}

function isNotFound(error: unknown): boolean {
	return error instanceof APIError && error.response.status === 404;
}

function tags(metadata: Record<string, unknown> = {}): Record<string, string> {
	return Object.fromEntries([
		[OWNER_TAG, OWNER_VALUE],
		...Object.entries(metadata)
			.slice(0, MAX_METADATA_TAGS)
			.map(([key, value]) => [`meta.${key}`, String(value)]),
	]);
}

function mapStatus(status: Sandbox["status"]): SandboxInfo["status"] {
	if (status === "running") return "running";
	if (status === "stopped" || status === "aborted") return "stopped";
	return "error";
}

function ensureRunning(sandbox: Sandbox): Sandbox {
	if (sandbox.status !== "running") {
		throw new Error(
			`Vercel sandbox "${sandbox.name}" is ${sandbox.status}, not running; refusing to resume or replace it`,
		);
	}
	return sandbox;
}

async function getNative(config: VercelConfig, name: string): Promise<Sandbox> {
	// resume defaults to true in v2. This explicit false is required for benchmark lifecycle honesty.
	return Sandbox.get({ name, resume: false, ...credentials(config) });
}

async function runShell(
	sandbox: Sandbox,
	command: string,
	options?: RunCommandOptions,
): Promise<CommandResult> {
	const started = Date.now();
	try {
		ensureRunning(sandbox);
		const result = await sandbox.runCommand({
			cmd: "/bin/sh",
			args: ["-lc", command],
			...(options?.cwd ? { cwd: options.cwd } : {}),
			...(options?.env ? { env: options.env } : {}),
			...(options?.timeout ? { timeoutMs: options.timeout } : {}),
			...(options?.background ? { detached: true as const } : {}),
		});

		// A detached native command has been accepted by the guest. Do not wait: ComputeSDK's detached
		// path observes completion through the done file while this command remains independent.
		if (options?.background) {
			return { stdout: "", stderr: "", exitCode: 0, durationMs: Date.now() - started };
		}
		const [stdout, stderr] = await Promise.all([result.stdout(), result.stderr()]);
		return {
			stdout,
			stderr,
			exitCode: result.exitCode ?? 1,
			durationMs: result.durationMs ?? Date.now() - started,
		};
	} catch (error) {
		// Never synthesize exit 127. Detached launch results are discarded by the harness, so only a
		// thrown transport error can stop it from polling a done file for a command that never started.
		throw new VercelTransportError(sandbox.name, error);
	}
}

const methods: SandboxMethods<Sandbox, VercelConfig> = {
	create: async (config, options?: CreateSandboxOptions) => {
		if (options?.snapshotId) throw new Error("Vercel snapshots are not supported by this adapter");
		const name = options?.name ?? `${NAME_PREFIX}${randomUUID()}`;
		const sandbox = await Sandbox.create({
			...credentials(config),
			name,
			image: options?.templateId ?? options?.image ?? config.image,
			resources: { vcpus: config.vcpus },
			persistent: false,
			...(options?.timeout ? { timeout: options.timeout } : {}),
			...(options?.envs ? { env: options.envs } : {}),
			tags: tags(options?.metadata),
		});
		sandboxConfigs.set(sandbox, config);
		return { sandbox, sandboxId: sandbox.name };
	},

	getById: async (config, sandboxId) => {
		try {
			const sandbox = await getNative(config, sandboxId);
			sandboxConfigs.set(sandbox, config);
			return { sandbox, sandboxId: sandbox.name };
		} catch (error) {
			if (isNotFound(error)) return null;
			throw error;
		}
	},

	list: async (config) => {
		const listed = await Sandbox.list({ ...credentials(config), namePrefix: NAME_PREFIX });
		const records = await listed.toArray();
		return Promise.all(
			records.map(async (record) => {
				const sandbox = await getNative(config, record.name);
				sandboxConfigs.set(sandbox, config);
				return { sandbox, sandboxId: record.name };
			}),
		);
	},

	destroy: async (config, sandboxId) => {
		try {
			const sandbox = await getNative(config, sandboxId);
			// ComputeSDK destroy means permanent resource cleanup. Vercel stop() only terminates the
			// current VM session and leaves the named sandbox addressable; delete() removes the sandbox
			// and all of its sessions/snapshots, including when its current session is already stopped.
			await sandbox.delete();
		} catch (error) {
			if (isNotFound(error)) return;
			throw error;
		}
	},

	runCommand: runShell,

	getInfo: async (sandbox) => {
		const config = sandboxConfigs.get(sandbox);
		if (!config) throw new Error(`Missing Vercel adapter configuration for "${sandbox.name}"`);
		const current = await getNative(config, sandbox.name);
		return {
			id: current.name,
			provider: "vercel",
			status: mapStatus(current.status),
			createdAt: current.createdAt,
			timeout: current.timeout ?? 0,
			metadata: {
				...(current.tags ?? {}),
				image: current.image,
				region: current.region,
				vcpus: current.vcpus,
				memoryMb: current.memory,
			},
		};
	},

	getUrl: async (sandbox, options) => ensureRunning(sandbox).domain(options.port),

	filesystem: {
		readFile: async (sandbox, path) => ensureRunning(sandbox).fs.readFile(path, "utf8"),
		writeFile: async (sandbox, path, content) => {
			await ensureRunning(sandbox).fs.writeFile(path, content);
		},
		mkdir: async (sandbox, path) => {
			await ensureRunning(sandbox).fs.mkdir(path, { recursive: true });
		},
		readdir: async (sandbox, path): Promise<FileEntry[]> => {
			const native = ensureRunning(sandbox);
			const entries = await native.fs.readdir(path, { withFileTypes: true });
			return Promise.all(
				entries.map(async (entry) => {
					const stat = await native.fs.lstat(`${path.replace(/\/$/, "")}/${entry.name}`);
					return {
						name: entry.name,
						type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
						size: stat.size,
						modified: stat.mtime,
					};
				}),
			);
		},
		exists: async (sandbox, path) => ensureRunning(sandbox).fs.exists(path),
		remove: async (sandbox, path) => {
			await ensureRunning(sandbox).fs.rm(path, { recursive: true, force: true });
		},
	},
};

const createVercelProvider = defineProvider<Sandbox, VercelConfig>({
	name: "vercel",
	methods: { sandbox: methods },
});

/** Build a ComputeSDK provider directly over @vercel/sandbox. No snapshot manager is declared. */
export function vercelCompute(config: VercelConfig) {
	return createVercelProvider(config);
}
