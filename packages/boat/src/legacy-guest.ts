import type { InitOverrideFunction } from "@boatdev/sdk";
import type {
	CreateRequest,
	DriverOperationOptions,
	ExecOptions,
} from "@sandbox-benchmarks/driver";
import { pollUntilReady } from "@sandbox-benchmarks/driver";
import type { ComputeSdkCreatedRequestVerification } from "@sandbox-benchmarks/driver/computesdk";
import type {
	BoatAllocation,
	BoatClient,
	BoatCreateOptions,
	BoatSandbox,
	BoatSpecOptions,
} from "./legacy-facts.ts";
import {
	BOAT_COMMAND_TIMEOUT_SECONDS,
	BOAT_CONTROL_TIMEOUT_MS,
	BOAT_EGRESS_POLL_MS,
	BOAT_EGRESS_PROBE_HOST,
	BOAT_EGRESS_TIMEOUT_MS,
	boatCommandResponseSchema,
	boatSandboxResponseSchema,
	diskCapacityKbSchema,
	serializedCreateBodySchema,
} from "./legacy-facts.ts";

export function positiveInteger(value: number | undefined, fallback: number): number {
	return Math.max(1, Math.floor(value ?? fallback));
}

export function nonnegativeNumber(value: number | undefined, fallback: number): number {
	return Math.max(0, value ?? fallback);
}

export function controlSignal(
	options?: DriverOperationOptions,
	timeoutMs = BOAT_CONTROL_TIMEOUT_MS,
) {
	const timeout = AbortSignal.timeout(timeoutMs);
	return options?.signal === undefined ? timeout : AbortSignal.any([options.signal, timeout]);
}

export function requestInit(options?: DriverOperationOptions, timeoutMs?: number): RequestInit {
	return { signal: controlSignal(options, timeoutMs) };
}

/**
 * Create's request init with machineProvider merged into the body. The override runs after the SDK
 * has built the JSON object and before it stringifies it, so the body is still an object here.
 */
export function createRequestInit(
	machineProvider: BoatCreateOptions["machineProvider"],
	options?: DriverOperationOptions,
): InitOverrideFunction {
	return async ({ init }) => ({
		...requestInit(options),
		// The SDK stringifies a JSON body after this override, so it must stay an object; a string
		// would be encoded twice. RequestInit's body type does not model that contract.
		body: {
			...serializedCreateBodySchema.assert(init.body),
			machineProvider,
		} as unknown as RequestInit["body"],
	});
}

export function delay(ms: number, signal?: AbortSignal): Promise<void> {
	if (signal?.aborted) return Promise.reject(signal.reason);
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal?.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				reject(signal.reason);
			},
			{ once: true },
		);
	});
}

export async function getSandbox(
	client: BoatClient,
	sandboxId: string,
	options?: DriverOperationOptions,
): Promise<BoatSandbox> {
	return boatSandboxResponseSchema.assert(await client.get({ sandboxId }, requestInit(options)))
		.sandbox;
}

export async function waitForEgress(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<void> {
	const host = BOAT_EGRESS_PROBE_HOST;
	const probe = `getent hosts ${host} >/dev/null 2>&1 && timeout 3 bash -c 'exec 3<>/dev/tcp/${host}/443'`;
	await pollUntilReady({
		provider: "boat",
		deadlineMs: positiveInteger(options.egressTimeoutMs, BOAT_EGRESS_TIMEOUT_MS),
		intervalMs: nonnegativeNumber(options.egressPollMs, BOAT_EGRESS_POLL_MS),
		signal: operation?.signal,
		poll: async () =>
			(await execCommand(client, sandboxId, probe, operation)).exitCode === 0 ? true : null,
	});
}

export async function prepareAllocation(
	client: BoatClient,
	allocation: BoatAllocation,
	options: BoatSpecOptions,
	operation: DriverOperationOptions,
): Promise<BoatSandbox> {
	boatSandboxResponseSchema.assert(
		await client.update(
			{ sandboxId: allocation.id, updateSandboxRequest: { name: allocation.recoveryName } },
			requestInit(operation),
		),
	);
	const ready = await waitUntilReady(client, allocation.id, options, operation);
	await waitForEgress(client, allocation.id, options, operation);
	return ready;
}

export async function execCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	options?: ExecOptions,
): Promise<{ readonly exitCode?: number; readonly stdout: string; readonly stderr: string }> {
	const result = boatCommandResponseSchema.assert(
		await client.command(
			{
				sandboxId,
				commandRequest: { command, timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS },
			},
			requestInit(options),
		),
	);
	if (result.type !== "command.finished") {
		throw new Error("boat command returned a background envelope for synchronous exec");
	}
	return {
		...(result.exitCode === undefined ? {} : { exitCode: result.exitCode }),
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

export async function launchCommand(
	client: BoatClient,
	sandboxId: string,
	command: string,
	options?: ExecOptions,
): Promise<void> {
	const result = boatCommandResponseSchema.assert(
		await client.command(
			{
				sandboxId,
				commandRequest: {
					command,
					detached: true,
					timeoutSeconds: BOAT_COMMAND_TIMEOUT_SECONDS,
				},
			},
			requestInit(options),
		),
	);
	if (result.type !== "command.started") {
		throw new Error("boat background command returned no process id");
	}
}

export async function verifyBoatAllocation(
	client: BoatClient,
	native: BoatSandbox,
	request: CreateRequest,
	options: DriverOperationOptions,
): Promise<ComputeSdkCreatedRequestVerification> {
	if (native.vcpu !== undefined && native.vcpu < request.spec.vcpus) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.vcpus} vCPU but the allocation reports ${native.vcpu}`,
		};
	}
	if (native.memoryGB !== undefined && native.memoryGB < request.spec.memoryGb) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.memoryGb} GiB but the allocation reports ${native.memoryGB} GiB`,
		};
	}
	if (request.spec.diskGb === undefined) return { status: "honored" };
	const result = await execCommand(client, native.id, "df -Pk / | awk 'NR==2 {print $2}'", options);
	if (result.exitCode !== 0) throw new Error(`boat disk capacity probe exited ${result.exitCode}`);
	const capacityGb = diskCapacityKbSchema.assert(result.stdout.trim()) / 1024 / 1024;
	return capacityGb >= request.spec.diskGb
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${request.spec.diskGb} GiB but the allocation exposes ${capacityGb.toFixed(2)} GiB`,
			};
}

import {
	BOAT_READY_POLL_MS,
	BOAT_READY_TIMEOUT_MS,
	BoatBootFailureError,
	READY_STATES,
	TERMINAL_BOOT_STATES,
} from "./legacy-facts.ts";

async function waitUntilReady(
	client: BoatClient,
	sandboxId: string,
	options: BoatSpecOptions,
	operation?: DriverOperationOptions,
): Promise<BoatSandbox> {
	return pollUntilReady({
		provider: "boat",
		deadlineMs: positiveInteger(options.readyTimeoutMs, BOAT_READY_TIMEOUT_MS),
		intervalMs: nonnegativeNumber(options.readyPollMs, BOAT_READY_POLL_MS),
		signal: operation?.signal,
		poll: async () => {
			const sandbox = await getSandbox(client, sandboxId, operation);
			if (READY_STATES.has(sandbox.state)) return sandbox;
			if (TERMINAL_BOOT_STATES.has(sandbox.state)) {
				throw new BoatBootFailureError(sandboxId, sandbox.state);
			}
			return null;
		},
	});
}
