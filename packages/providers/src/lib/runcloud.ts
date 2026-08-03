// ComputeSDK provider built directly over run.cloud's native SDK. The SDK reads
// RUN_CLOUD_API_KEY itself; construction stays lazy so importing the provider registry never needs
// credentials. One benchmark cell drives one provider, so a process-local client is sufficient.
import type {
	CommandResult,
	CreateSandboxOptions,
	RunCommandOptions,
	SandboxInfo,
	SandboxMethods,
} from "@computesdk/provider";
import { defineProvider } from "@computesdk/provider";
import type { Sandbox } from "@run-cloud/sdk";
import { Client, RunCloudError } from "@run-cloud/sdk";

const PROVIDER = "runcloud";

/** Create returns as soon as the control plane accepts the sandbox; the OCI pull/boot happens
 *  asynchronously (`building_image`). The harness expects `create()` to resolve only once commands
 *  can run, so the adapter polls until `running` (or a terminal failure). */
const CREATE_READY_POLL_MS = 2_000;
/** Cold pulls of the ~1.5 GiB toolchain image on a first-use host can take several minutes. */
export const RUNCLOUD_READY_TIMEOUT_MS = 20 * 60 * 1000;
/** The harness's outer create race starts before the allocation request, while the readiness clock
 * starts after it. Keep five minutes of headroom for allocation latency and cleanup. */
export const RUNCLOUD_CREATE_TIMEOUT_MS = RUNCLOUD_READY_TIMEOUT_MS + 5 * 60 * 1000;

type RuncloudSandboxClient = Pick<
	Client["sandboxes"],
	"create" | "get" | "list" | "destroy" | "exec" | "openTunnel"
>;

interface RuncloudComputeOptions {
	/** Test seam; production keeps constructing the native SDK client lazily from the environment. */
	client?: RuncloudSandboxClient;
	readyPollMs?: number;
	readyTimeoutMs?: number;
	sleep?: (ms: number) => Promise<void>;
	now?: () => number;
}

let cachedClient: Client | undefined;

function defaultClient(): Client {
	cachedClient ??= new Client();
	return cachedClient;
}

function isNotFound(error: unknown): boolean {
	return error instanceof RunCloudError && error.status === 404;
}

function mapStatus(state: string): SandboxInfo["status"] {
	if (state === "running") return "running";
	// Interrupted / failed are hard errors (not a clean stop); match the official SDK adapter.
	if (state === "interrupted" || state === "failed") return "error";
	// Clean stops and transitional boot states (building_image / starting) report as stopped —
	// create() waits for running before returning, so getInfo rarely sees a transitional state.
	return "stopped";
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Terminal states that mean boot failed and we should stop waiting. */
function isTerminalBootFailure(state: string): boolean {
	return ["failed", "interrupted", "destroyed", "destroying", "stopped"].includes(state);
}

/**
 * Poll until the sandbox can accept execs. Returns the freshest record so callers don't keep a
 * stale `building_image` handle from the original create response.
 */
async function waitUntilRunning(
	native: RuncloudSandboxClient,
	sandboxId: string,
	options: RuncloudComputeOptions,
): Promise<Sandbox> {
	const now = options.now ?? Date.now;
	const wait = options.sleep ?? sleep;
	const pollMs = options.readyPollMs ?? CREATE_READY_POLL_MS;
	const timeoutMs = options.readyTimeoutMs ?? RUNCLOUD_READY_TIMEOUT_MS;
	const deadline = now() + timeoutMs;
	let last: Sandbox | undefined;
	while (now() < deadline) {
		last = await native.get(sandboxId);
		if (last.state === "running") return last;
		if (isTerminalBootFailure(last.state)) {
			throw new Error(
				`run.cloud sandbox ${sandboxId} entered terminal state "${last.state}" while booting`,
			);
		}
		await wait(pollMs);
	}
	throw new Error(
		`run.cloud sandbox ${sandboxId} not running after ${timeoutMs}ms (last state: ${last?.state ?? "unknown"})`,
	);
}

async function destroySandbox(native: RuncloudSandboxClient, sandboxId: string): Promise<void> {
	try {
		await native.destroy(sandboxId);
	} catch (error) {
		if (isNotFound(error)) return;
		throw error;
	}
}

function createdAt(value: string | undefined): Date {
	if (!value) return new Date(0);
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}

function streamCallback(
	callback: ((data: string) => void) | undefined,
): ((chunk: Uint8Array) => void) | undefined {
	if (!callback) return undefined;
	const decoder = new TextDecoder();
	return (chunk) => {
		const text = decoder.decode(chunk, { stream: true });
		if (text) callback(text);
	};
}

async function runCommand(
	native: RuncloudSandboxClient,
	sandbox: Sandbox,
	command: string,
	options?: RunCommandOptions,
): Promise<CommandResult> {
	const started = Date.now();
	// The native SDK does not have a detached exec flag. Its command endpoint does run a shell, so
	// daemonize explicitly and return once that short launch command exits. StepRunner observes the
	// actual job through its done file, exactly as it does for native-background providers.
	const executable = options?.background
		? `nohup /bin/sh -lc ${shellQuote(command)} </dev/null >/dev/null 2>&1 &`
		: command;
	const result = await native.exec(sandbox.id, executable, {
		...(options?.cwd ? { cwd: options.cwd } : {}),
		...(options?.env ? { env: options.env } : {}),
		...(options?.timeout ? { timeoutSeconds: Math.max(1, Math.ceil(options.timeout / 1000)) } : {}),
		...(options?.background
			? {}
			: {
					onStdout: streamCallback(options?.onStdout),
					onStderr: streamCallback(options?.onStderr),
				}),
	});
	return {
		stdout: options?.background ? "" : result.stdout,
		stderr: options?.background ? "" : result.stderr,
		exitCode: result.exitCode,
		durationMs: Date.now() - started,
	};
}

function sandboxMethods(
	adapterOptions: RuncloudComputeOptions,
): SandboxMethods<Sandbox, undefined> {
	const native = () => adapterOptions.client ?? defaultClient().sandboxes;
	return {
		create: async (_config, createOptions?: CreateSandboxOptions) => {
			if (createOptions?.snapshotId) {
				throw new Error("run.cloud snapshots are not supported by this adapter");
			}
			const sdk = native();
			const created = await sdk.create({
				...(createOptions?.templateId || createOptions?.image
					? { image: createOptions.templateId ?? createOptions.image }
					: {}),
				...(createOptions?.cpu !== undefined ? { cpu: createOptions.cpu } : {}),
				...(createOptions?.memory !== undefined ? { memory: createOptions.memory } : {}),
				...(createOptions?.disk !== undefined ? { disk: createOptions.disk } : {}),
				...(createOptions?.idlePauseSeconds !== undefined
					? { idlePauseSeconds: createOptions.idlePauseSeconds }
					: {}),
				...(createOptions?.timeoutSeconds !== undefined
					? { timeoutSeconds: createOptions.timeoutSeconds }
					: {}),
				...(createOptions?.region ? { region: createOptions.region } : {}),
				...(createOptions?.name ? { name: createOptions.name } : {}),
			});
			// Do not return until the guest can accept commands — cold image pulls leave the sandbox in
			// `building_image` for minutes, and exec during that window fails with API 4409.
			try {
				const sandbox = await waitUntilRunning(sdk, created.id, adapterOptions);
				return { sandbox, sandboxId: sandbox.id };
			} catch (error) {
				// Allocation already succeeded, but the harness has no handle until create() resolves. Clean up
				// here so a terminal boot, transient poll failure, or readiness timeout cannot leak a sandbox.
				try {
					await destroySandbox(sdk, created.id);
				} catch (destroyError) {
					console.error(
						`run.cloud: failed to destroy sandbox ${created.id} after readiness failure:`,
						destroyError,
					);
				}
				throw error;
			}
		},

		getById: async (_config, sandboxId) => {
			try {
				const sandbox = await native().get(sandboxId);
				return { sandbox, sandboxId: sandbox.id };
			} catch (error) {
				if (isNotFound(error)) return null;
				throw error;
			}
		},

		list: async () =>
			(await native().list())
				// The native API retains destroyed tombstones. ComputeSDK's list contract is active sandboxes;
				// keep paused/stopped/failed records available for recovery, but omit irreversible teardown.
				.filter((sandbox) => sandbox.state !== "destroyed" && sandbox.state !== "destroying")
				.map((sandbox) => ({ sandbox, sandboxId: sandbox.id })),

		destroy: async (_config, sandboxId) => destroySandbox(native(), sandboxId),

		runCommand: (sandbox, command, runOptions) =>
			runCommand(native(), sandbox, command, runOptions),

		getInfo: async (sandbox) => {
			const current = await native().get(sandbox.id);
			return {
				id: current.id,
				provider: PROVIDER,
				status: mapStatus(current.state),
				createdAt: createdAt(current.createdAt),
				timeout: (current.timeoutSeconds ?? 0) * 1000,
				metadata: {
					image: current.image,
					region: current.region,
					sizeClass: current.sizeClass,
					milliCpu: current.milliCpu,
					memoryMb: current.memMb,
					warmStart: current.warmStart,
				},
			};
		},

		getUrl: async (sandbox, options) => (await native().openTunnel(sandbox.id, options.port)).url,
	};
}

export function runcloudCompute(options: RuncloudComputeOptions = {}) {
	return defineProvider<Sandbox, undefined>({
		name: PROVIDER,
		methods: { sandbox: sandboxMethods(options) },
	})(undefined);
}
