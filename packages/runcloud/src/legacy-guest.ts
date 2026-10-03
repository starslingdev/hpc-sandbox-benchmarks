import type { Sandbox } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import type { CreateRequest, SandboxObservation } from "@sandbox-benchmarks/driver";
import { isDriverError } from "@sandbox-benchmarks/driver";
import type { ComputeSdkCreatedRequestVerification } from "@sandbox-benchmarks/driver/computesdk";
import type { RuncloudSandboxClient, Timing } from "./legacy-facts.ts";
import { RUNCLOUD_DISK_FILESYSTEM_OVERHEAD } from "./legacy-facts.ts";

/** A native call that did not settle within its bound. A create timeout leaves allocation
 * uncertain even when the server is overloaded; it is not a definitive rejection. */
export class RuncloudCallTimeoutError extends Error {
	constructor(
		readonly operation: string,
		readonly timeoutMs: number,
	) {
		super(`run.cloud ${operation} did not settle within ${timeoutMs}ms`);
		this.name = "RuncloudCallTimeoutError";
	}
}

/**
 * Readiness ended in a terminal state. `hostGaveUp` marks the states worth re-issuing: run.cloud
 * rebuilds the image into an ext4 rootfs per sandbox and that build corrupts non-deterministically
 * under a concurrent burst (27 failed boots of run 33712242440, the same pinned image failing at a
 * different path every time), so a fresh create lands on a fresh build. `teardownConfirmed` is the
 * other half of any retry mark: the control plane has said the allocation is going away.
 */
export class RuncloudBootFailureError extends Error {
	constructor(
		readonly sandboxId: string,
		readonly state: string,
		readonly hostGaveUp: boolean,
		readonly teardownConfirmed: boolean,
		readonly vendorDetail?: string,
	) {
		super(
			`run.cloud sandbox ${sandboxId} entered terminal state "${state}" while booting${vendorDetail ? `: ${vendorDetail}` : ""}`,
		);
		this.name = "RuncloudBootFailureError";
	}
}

/** No positive allocation or rejection verdict followed an ambiguous create. Empty lookups do not
 * cancel an accepted POST; the recovery name remains necessary for later cleanup. */
export class RuncloudAmbiguousCreateError extends AggregateError {
	constructor(
		readonly recoveryName: string,
		createError: unknown,
		lookupError: unknown,
	) {
		super(
			[createError, lookupError],
			`run.cloud create failed ambiguously (${errorMessage(createError)}) and reconciliation ` +
				`could not establish its outcome (${errorMessage(lookupError)}), so it is unknown whether a sandbox was ` +
				`allocated; if one was it carries the name ${recoveryName} and manual cleanup may be required`,
		);
		this.name = "RuncloudAmbiguousCreateError";
	}
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function isNotFound(error: unknown): boolean {
	return error instanceof RunCloudError && error.status === 404;
}

export function runcloudCreateHttpStatus(error: unknown): number | undefined {
	if (error instanceof RunCloudError) return error.status;
	if (isDriverError(error) && error.provider === "runcloud" && error.code === "create-failed")
		return error.vendorHttpStatus;
	return undefined;
}

/**
 * A non-timeout 4xx is a definitive rejection: the create endpoint itself said no allocation was
 * accepted. 409 is excluded because a conflict asserts the OPPOSITE of absence — something already
 * exists under this request's identity — so it gets the full reconciliation window.
 */
export function isRuncloudDefinitiveCreateRejection(error: unknown): boolean {
	const status = runcloudCreateHttpStatus(error);
	return status !== undefined && status >= 400 && status < 500 && status !== 408 && status !== 409;
}

/** Terminal boot states where the HOST gave up, so re-issuing the create is worth it. */
export function hostGaveUp(state: string): boolean {
	return ["failed", "interrupted", "destroyed", "destroying"].includes(state);
}

/** `stopped` also ends the wait, but says nothing about the host giving up, so it is never retried. */
export function isTerminalBootState(state: string): boolean {
	return state === "stopped" || hostGaveUp(state);
}

export function isTombstone(state: string): boolean {
	return state === "destroyed";
}

/** Race one native call with a local deadline (and the caller's signal). Production's fetch signal
 *  also cancels the socket; the race remains necessary for injected clients and runtimes whose
 *  fetch ignores abort. */
export async function bounded<T>(
	operation: string,
	call: () => Promise<T>,
	timing: Timing,
	signal?: AbortSignal,
): Promise<T> {
	signal?.throwIfAborted();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let unsubscribe = () => {};
	try {
		return await Promise.race([
			Promise.resolve().then(call),
			new Promise<never>((_, reject) => {
				timer = setTimeout(
					() => reject(new RuncloudCallTimeoutError(operation, timing.controlPlaneTimeoutMs)),
					timing.controlPlaneTimeoutMs,
				);
				if (signal !== undefined) {
					const abort = () => reject(signal.reason ?? new Error("run.cloud operation aborted"));
					signal.addEventListener("abort", abort, { once: true });
					unsubscribe = () => signal.removeEventListener("abort", abort);
				}
			}),
		]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
		unsubscribe();
	}
}

export function createdAt(value: string | undefined): number {
	if (!value) return 0;
	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? 0 : parsed;
}

export async function execCommand(
	sdk: RuncloudSandboxClient,
	sandboxId: string,
	command: string,
	signal?: AbortSignal,
): Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }> {
	signal?.throwIfAborted();
	// A string command runs via `/bin/sh -c`; the signal closes the command's WebSocket on abort.
	const result = await sdk.exec(sandboxId, command, signal === undefined ? {} : { signal });
	return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
}

/**
 * Control-plane state → port observation. `destroyed` is ABSENT, not terminal: the API keeps that
 * row as a tombstone forever, and account recovery waits for absence after a destroy — reading the
 * tombstone as a live terminal allocation would block admission on every leftover it removed.
 */
export function runcloudObservation(state: string): SandboxObservation {
	if (state === "destroyed") return { state: "absent" };
	if (state === "stopped" || state === "failed" || state === "interrupted")
		return { state: "terminal" };
	return { state: "running" };
}

export function controlPlaneFetch(
	timeoutMs: number,
	signal?: AbortSignal,
	fetchImpl: typeof fetch = fetch,
): typeof fetch {
	return Object.assign(
		(...args: Parameters<typeof fetch>) =>
			fetchImpl(args[0], {
				...args[1],
				signal: AbortSignal.any([
					AbortSignal.timeout(timeoutMs),
					...(signal ? [signal] : []),
					...(args[1]?.signal ? [args[1].signal] : []),
				]),
			}),
		{ preconnect: fetch.preconnect },
	);
}

/** The control plane reports the allocated CPU/RAM on the record; disk is a quota the guest must
 *  prove, so read it back the same way the harness's own disk gate does. */
export async function verifyRuncloudAllocation(
	sdk: RuncloudSandboxClient,
	native: Sandbox,
	request: CreateRequest,
	signal?: AbortSignal,
): Promise<ComputeSdkCreatedRequestVerification> {
	if (typeof native.milliCpu === "number" && native.milliCpu < request.spec.vcpus * 1000) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.vcpus} vCPU but the allocation reports ${native.milliCpu / 1000}`,
		};
	}
	if (typeof native.memMb === "number" && native.memMb < request.spec.memoryGb * 1024) {
		return {
			status: "unsupported",
			detail: `requested ${request.spec.memoryGb} GiB but the allocation reports ${native.memMb} MiB`,
		};
	}
	if (request.spec.diskGb === undefined) return { status: "honored" };
	const result = await execCommand(sdk, native.id, "df -Pk / | awk 'NR==2 {print $2}'", signal);
	if (result.exitCode !== 0) {
		throw new Error(`run.cloud disk capacity probe exited ${result.exitCode}`);
	}
	const output = result.stdout.trim();
	if (!/^\d+$/.test(output))
		throw new Error("run.cloud disk capacity probe returned malformed output");
	const capacityGb = Number(output) / 1024 / 1024;
	if (!Number.isFinite(capacityGb) || capacityGb <= 0) {
		throw new Error("run.cloud disk capacity probe returned an invalid capacity");
	}
	return capacityGb >= request.spec.diskGb * (1 - RUNCLOUD_DISK_FILESYSTEM_OVERHEAD)
		? { status: "honored" }
		: {
				status: "unsupported",
				detail: `requested ${request.spec.diskGb} GiB but the allocation exposes ${capacityGb.toFixed(2)} GiB`,
			};
}
