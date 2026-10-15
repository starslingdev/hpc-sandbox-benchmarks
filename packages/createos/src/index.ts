import { randomUUID } from "node:crypto";
import type { Sandbox } from "@nodeops-createos/sandbox";
import {
	CreateosSandboxAuthError,
	CreateosSandboxClient,
	CreateosSandboxNotFoundError,
	CreateosSandboxPaymentRequiredError,
	CreateosSandboxPermissionError,
	CreateosSandboxRateLimitError,
	CreateosSandboxServerError,
	CreateosSandboxValidationError,
} from "@nodeops-createos/sandbox";
import type {
	DriverContext,
	DriverOperationOptions,
	ExecOptions,
} from "@sandbox-benchmarks/driver";
import { pollUntilReady, shellQuote } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import { CREATEOS_PROVENANCE } from "./provenance.ts";

export { CREATEOS_PROVENANCE };

export const CREATEOS_ROOTFS = "devbox:1";
export const CREATEOS_SHAPE = "s-4vcpu-8gb";
export const CREATEOS_DISK_MIB = 40 * 1024;
// CreateOS caps sandbox names at 22 characters. Keep a recognizable inventory
// prefix and use 14 UUID hex characters (56 random bits) for uniqueness.
export const CREATEOS_NAME_PREFIX = "sbbench-";
export const CREATEOS_CONTROL_TIMEOUT_MS = 60_000;
export const CREATEOS_DELETE_TIMEOUT_MS = 5 * 60_000;
export const CREATEOS_DELETE_POLL_MS = 1_000;
export const CREATEOS_SANDBOX_ID = type(/^sb-[A-Za-z0-9]+$/);
export const CREATEOS_READINESS = { startup: "create-returns-ready" } as const;
export const CREATEOS_EXECUTION = { syncCapMs: 60_000, durable: "shell-detach" } as const;

// devbox:1 exposes python3 through an ASDF shim. Phoronix runs profiles with a
// sanitized environment, so resolve that shim to the installed interpreter
// before the benchmark harness starts. This is deliberately provider-local:
// it changes only the disposable CreateOS benchmark sandbox and leaves the
// shared harness, other providers, and the catalog image untouched.
export const CREATEOS_PYTHON_PREFLIGHT =
	'if command -v asdf >/dev/null 2>&1; then python_dir="$(asdf where python)"; ' +
	'test -x "$python_dir/bin/python3"; ln -sfn "$python_dir/bin/python3" /usr/local/bin/python3; fi; ' +
	'python3 --version; test -x "$(readlink -f "$(command -v python3)")"';

const createOptions = type({
	name: "string >= 1",
	deadlineMs: "number.integer > 0",
});

export interface CreateosSpecOptions {
	readonly client?: CreateosSandboxClient;
	readonly fetch?: typeof fetch;
	readonly deleteTimeoutMs?: number;
	readonly deletePollMs?: number;
}

function requestOptions(
	operation?: DriverOperationOptions,
	timeoutMs = CREATEOS_CONTROL_TIMEOUT_MS,
) {
	return {
		timeoutMs,
		...(operation?.signal === undefined ? {} : { signal: operation.signal }),
	};
}

function isCreateosNotFound(error: unknown): boolean {
	return matchesAnyCause(error, (cause) => cause instanceof CreateosSandboxNotFoundError);
}

function isTerminalSandbox(status: string): boolean {
	return status === "destroyed" || status === "failed";
}

export function isCreateosDefinitiveCreateRejection(error: unknown): boolean {
	return matchesAnyCause(
		error,
		(cause) =>
			cause instanceof CreateosSandboxAuthError ||
			cause instanceof CreateosSandboxPermissionError ||
			cause instanceof CreateosSandboxPaymentRequiredError ||
			cause instanceof CreateosSandboxValidationError ||
			(cause instanceof CreateosSandboxServerError && cause.statusCode === 503),
	);
}

export function isCreateosRetryableCreate(error: unknown): boolean {
	return matchesAnyCause(
		error,
		(cause) =>
			cause instanceof CreateosSandboxRateLimitError ||
			(cause instanceof CreateosSandboxServerError && cause.statusCode === 503),
	);
}

async function runCreateosCommand(sandbox: Sandbox, command: string, options?: ExecOptions) {
	options?.signal?.throwIfAborted();
	const response = await sandbox.runCommand("bash", ["-lc", command], {
		timeoutMs: 0,
		...(options?.signal === undefined ? {} : { signal: options.signal }),
	});
	options?.signal?.throwIfAborted();
	return {
		stdout: response.result.stdout,
		stderr: response.result.stderr,
		exitCode: response.result.exit_code,
	};
}

export function createosSpec(
	{ env, resolvedArtifact }: DriverContext<"createos">,
	seams: CreateosSpecOptions = {},
) {
	const client =
		seams.client ??
		new CreateosSandboxClient({
			apiKey: env.CREATEOS_API_KEY,
			baseUrl: env.CREATEOS_SANDBOX_BASE_URL,
			timeoutMs: CREATEOS_CONTROL_TIMEOUT_MS,
			...(seams.fetch === undefined ? {} : { fetch: seams.fetch }),
		});
	const deleteTimeoutMs = seams.deleteTimeoutMs ?? CREATEOS_DELETE_TIMEOUT_MS;
	const deletePollMs = seams.deletePollMs ?? CREATEOS_DELETE_POLL_MS;

	async function observe(id: string, operation?: DriverOperationOptions) {
		try {
			const sandbox = await client.getSandbox(id, requestOptions(operation));
			return isTerminalSandbox(sandbox.status)
				? ({ state: "absent" } as const)
				: ({ state: "running" } as const);
		} catch (error) {
			if (isCreateosNotFound(error)) return { state: "absent" } as const;
			throw error;
		}
	}

	async function inventoryAbsent(id: string, operation?: DriverOperationOptions): Promise<boolean> {
		const sandboxes = await client.listSandboxes(requestOptions(operation));
		return !sandboxes.some((sandbox) => sandbox.id === id && !isTerminalSandbox(sandbox.status));
	}

	async function destroy(id: string, operation?: DriverOperationOptions): Promise<void> {
		const signal = AbortSignal.any([
			AbortSignal.timeout(deleteTimeoutMs),
			...(operation?.signal === undefined ? [] : [operation.signal]),
		]);
		let sandbox: Sandbox;
		try {
			sandbox = await client.getSandbox(id, requestOptions({ signal }));
		} catch (error) {
			if (isCreateosNotFound(error)) return;
			throw error;
		}
		if (!isTerminalSandbox(sandbox.status) && sandbox.status !== "destroying") {
			await sandbox.destroy(requestOptions({ signal }));
		}
		await pollUntilReady({
			provider: "createos",
			deadlineMs: deleteTimeoutMs,
			intervalMs: deletePollMs,
			signal,
			// CreateOS updates the item and collection views independently. Admission for the
			// next benchmark reads the collection, so a terminal item response alone is not
			// enough to release the account: the stale collection row can otherwise be
			// mistaken for an unowned live sandbox.
			poll: async () =>
				(await observe(id, { signal })).state === "absent" &&
				(await inventoryAbsent(id, { signal }))
					? true
					: null,
		});
	}

	const compute = nativeSdkCompute(
		async (options: typeof createOptions.infer, operation) => {
			operation.signal?.throwIfAborted();
			const sandbox = await client.createSandbox(
				{
					shape: CREATEOS_SHAPE,
					rootfs: CREATEOS_ROOTFS,
					name: options.name,
					disk_mib: CREATEOS_DISK_MIB,
					egress: ["*"],
				},
				requestOptions(operation, options.deadlineMs),
			);
			const prepared = await runCreateosCommand(sandbox, CREATEOS_PYTHON_PREFLIGHT, {
				signal: operation.signal,
			});
			if (prepared.exitCode !== 0) {
				throw new Error(
					`CreateOS Python preflight failed: ${prepared.stderr.trim() || prepared.stdout.trim() || `exit ${prepared.exitCode}`}`,
				);
			}
			return sandbox;
		},
		(sandbox) => ({
			sandboxId: sandbox.id,
			runCommand: (command, options) => runCreateosCommand(sandbox, command, options),
			destroy: () => destroy(sandbox.id),
			filesystem: {
				readFile: async (path) =>
					new TextDecoder().decode(await sandbox.files.download(path, { timeoutMs: 0 })),
				exists: async (path) =>
					(await runCreateosCommand(sandbox, `test -e ${shellQuote(path)}`)).exitCode === 0,
				writeFile: async (path, content) => {
					await sandbox.files.upload(path, content, { timeoutMs: 0 });
				},
			},
		}),
	);

	return computeSdkSpec(compute, {
		sandboxId: CREATEOS_SANDBOX_ID,
		createOptions: {
			coverage: {
				spec: {
					vcpus: { artifact: 4 },
					memoryGb: { artifact: 8 },
					diskGb: { capacityAtLeast: 40 },
				},
				artifact: "context",
				deadlineMs: "harness",
				gpu: { model: "unsupported", count: "unsupported" },
				env: "unsupported",
			},
			map: (request, unsupported) => {
				if (request.artifact.kind !== "none" || resolvedArtifact.kind !== "none") {
					unsupported("CreateOS boots the devbox:1 catalog image");
				}
				if (
					request.spec.vcpus !== 4 ||
					request.spec.memoryGb !== 8 ||
					(request.spec.diskGb !== undefined && request.spec.diskGb !== 40)
				) {
					unsupported("CreateOS benchmark integration is pinned to 4 vCPU / 8 GiB / 40 GiB");
				}
				return {
					name: `${CREATEOS_NAME_PREFIX}${randomUUID().replaceAll("-", "").slice(0, 14)}`,
					deadlineMs: request.deadlineMs,
				};
			},
		},
		lifecycle: {
			destroy: async (sandbox, ref, operation) =>
				destroy(ref?.id ?? sandbox.getInstance().id, operation),
		},
		createRecovery: {
			absenceConfirmationMs: 2_000,
			maxAttempts: 4,
			locator: (options) => ({ kind: "marker", key: "name", value: options.name }),
			isDefinitive: isCreateosDefinitiveCreateRejection,
			isRetryableCreate: isCreateosRetryableCreate,
			cleanup: async (_compute, locator, operation) => {
				operation.signal?.throwIfAborted();
				const matches = (await client.listSandboxes(requestOptions(operation))).filter(
					(sandbox) => sandbox.name === locator.value && !isTerminalSandbox(sandbox.status),
				);
				if (matches.length === 0) return { status: "absent" };
				if (matches.length !== 1)
					throw new Error("CreateOS recovery found duplicate sandbox names");
				const match = matches[0];
				if (match === undefined) throw new Error("CreateOS recovery lost its sandbox match");
				await destroy(match.id, operation);
				return { status: "destroyed" };
			},
		},
		hasWorkingFilesystem: true,
		probes: {
			observe: (_compute, ref) => observe(ref.id),
			describe: (_compute, ref) => client.getSandbox(ref.id),
			list: () => client.listSandboxes(),
		},
		inventory: {
			list: async (_compute, operation) => {
				operation.signal?.throwIfAborted();
				const sandboxes = await client.listSandboxes(requestOptions(operation));
				operation.signal?.throwIfAborted();
				const live = sandboxes.filter((sandbox) => !isTerminalSandbox(sandbox.status));
				return {
					owned: live
						.filter((sandbox) => sandbox.name?.startsWith(CREATEOS_NAME_PREFIX))
						.map((sandbox) => sandbox.id),
					foreignCount: live.filter((sandbox) => !sandbox.name?.startsWith(CREATEOS_NAME_PREFIX))
						.length,
				};
			},
		},
		destroyById: async (_compute, ref, operation) => destroy(ref.id, operation),
	});
}

export default defineComputeSdkDriver("createos", {
	provenance: CREATEOS_PROVENANCE,
	readiness: CREATEOS_READINESS,
	execution: CREATEOS_EXECUTION,
	spec: createosSpec,
});
