// ComputeSDK provider based on packages/vercel/src/index.ts upstream, adapted to the latest
// @vercel/sandbox. Vercel v2 is name-keyed, so its native name is the universal sandboxId. Reconnects
// opt out of automatic resume: replacing a sandbox that died mid-benchmark would hide the loss.
import { randomUUID } from "node:crypto";
import type {
	CommandResult,
	CreateSandboxOptions,
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

export interface VercelConfig {
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

async function getNative(name: string): Promise<Sandbox> {
	// resume defaults to true in v2. This explicit false is required for benchmark lifecycle honesty.
	return Sandbox.get({ name, resume: false });
}

async function runShell(
	sandbox: Sandbox,
	command: string,
	options?: RunCommandOptions,
): Promise<CommandResult> {
	const started = Date.now();
	try {
		ensureRunning(sandbox);
		// Use the current session directly. Sandbox.runCommand() wraps this call in withResume(), which
		// can silently boot a replacement VM after loss and invalidate the benchmark filesystem.
		const result = await sandbox.currentSession().runCommand({
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
			name,
			image: options?.templateId ?? options?.image ?? config.image,
			resources: { vcpus: config.vcpus },
			persistent: false,
			...(options?.timeout ? { timeout: options.timeout } : {}),
			...(options?.envs ? { env: options.envs } : {}),
			tags: tags(options?.metadata),
		});
		return { sandbox, sandboxId: sandbox.name };
	},

	getById: async (_config, sandboxId) => {
		try {
			const sandbox = await getNative(sandboxId);
			return { sandbox, sandboxId: sandbox.name };
		} catch (error) {
			if (isNotFound(error)) return null;
			throw error;
		}
	},

	list: async (_config) => {
		const listed = await Sandbox.list({ namePrefix: NAME_PREFIX });
		const records = await listed.toArray();
		return Promise.all(
			records.map(async (record) => {
				const sandbox = await getNative(record.name);
				return { sandbox, sandboxId: record.name };
			}),
		);
	},

	destroy: async (_config, sandboxId) => {
		try {
			const sandbox = await getNative(sandboxId);
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
		const current = await getNative(sandbox.name);
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

	getUrl: async (sandbox, options) => ensureRunning(sandbox).currentSession().domain(options.port),
};

/** Build a ComputeSDK provider directly over @vercel/sandbox v2. No snapshot manager is declared. */
export const vercelCompute = defineProvider<Sandbox, VercelConfig>({
	name: "vercel",
	methods: { sandbox: methods },
});
