// Modal's vendor adapter: translation only, over the pinned `modal` SDK. Readiness, cleanup
// confirmation, recovery, inventory, the disk proof and the shell-detach launcher live in the
// driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Four Modal facts shape it. Every create lands in the benchmark App, the ownership boundary
// (ADR-0016), under the attempt's marker as its sandbox name; each isolation generation (V1 for
// modal-vm and GPU allocations, V2 for modal-gvisor) owns only its own sandboxes there. A read by id
// carries no name, so the adapter reports the name its own create, listing or lookup learned. The
// SDK's create returns a running sandbox and its waited terminate an exited one, so both responses
// are evidence. And Modal 0.9 ignores its client timeouts, so every RPC runs inside a control runner
// that injects the operation's deadline where the SDK's middleware chain consumes it.

import { AsyncLocalStorage } from "node:async_hooks";
import type { ExecOptions } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type { CreateAttempt, Op, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type { ModalClient } from "modal";
import { NotFoundError, Sandbox } from "modal";
import type { ClientMiddleware } from "nice-grpc";
import { ClientError, Status } from "nice-grpc";

export const MODAL_APP_NAME = "sandbox-benchmarks";
export const MODAL_SANDBOX_LIFETIME_MS = 3 * 60 * 60_000;
export const MODAL_CONTROL_TIMEOUT_MS = 5_000;
/**
 * Waited teardown must fit under the harness destroy ceiling (60s) without racing it.
 * GHA run 35799078413 modal-gvisor-network-r1 aborted terminate({wait:true}) at the 5s
 * control budget while measurement had already completed.
 */
export const MODAL_DESTROY_TIMEOUT_MS = 55_000;
/** Enumerating an account is a multi-page loop, not one bounded RPC; it gets its own budget. */
export const MODAL_INVENTORY_TIMEOUT_MS = 60_000;
export const MODAL_V1_SANDBOX_ID = type(/^sb-[A-Za-z0-9]{22}$/);
export const MODAL_V2_SANDBOX_ID = type(/^sb-[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
const MODAL_CONTROL_SANDBOX_ID = type(/^sb-(?:[A-Za-z0-9]{22}|[0-7][0-9A-HJKMNP-TV-Z]{25})$/);

export type ModalBackend = "v1" | "v2";

/** The sandbox id grammar of one generation, with every generation's id accepted from the vendor. */
export function modalSandboxId(backend: ModalBackend) {
	return {
		// A cross-generation id is still a real allocation identity. Retain it as a safe raw
		// boundary so recovery can destroy the allocation before canonical validation rejects it.
		fromVendor: MODAL_CONTROL_SANDBOX_ID,
		canonical: backend === "v2" ? MODAL_V2_SANDBOX_ID : MODAL_V1_SANDBOX_ID,
	};
}

const MODAL_SANDBOX_NOT_FOUND_PATHS = new Set([
	"/modal.client.ModalClient/SandboxGetFromName",
	"/modal.client.ModalClient/SandboxGetFromNameV2",
	"/modal.client.ModalClient/SandboxTerminate",
	"/modal.client.ModalClient/SandboxTerminateV2",
	"/modal.client.ModalClient/SandboxWait",
	"/modal.client.ModalClient/SandboxWaitV2",
]);

/** Only a sandbox RPC's NOT_FOUND is absence; an auth or App NOT_FOUND is not. */
function isModalNotFound(caught: unknown): boolean {
	try {
		return (
			caught instanceof ClientError &&
			caught.code === Status.NOT_FOUND &&
			MODAL_SANDBOX_NOT_FOUND_PATHS.has(caught.path)
		);
	} catch {
		return false;
	}
}

/** Exact message the control runner throws when its outer budget elapses. */
export function modalControlTimeoutMessage(timeoutMs: number): string {
	return `Modal control operation exceeded ${timeoutMs}ms`;
}

/**
 * Native gRPC capacity refusal, or our own control-budget abort after a create path that left no
 * owned allocation (or whose rollback already destroyed it). Vendor prose stays terminal.
 */
export function isModalRetryableCreate(error: unknown): boolean {
	return matchesAnyCause(
		error,
		(link) =>
			(link instanceof ClientError && link.code === Status.RESOURCE_EXHAUSTED) ||
			(link instanceof Error && /^Modal control operation exceeded \d+ms$/.test(link.message)),
	);
}

export interface ModalTextProcess {
	readonly stdout: { readText(): Promise<unknown> };
	readonly stderr: { readText(): Promise<unknown> };
	wait(): Promise<unknown>;
}

export interface ModalControlSandbox {
	readonly sandboxId: string;
	poll(): Promise<number | null>;
	terminate(params: { readonly wait: true }): Promise<number>;
	exec(
		command: string[],
		params: { readonly stdout: "pipe"; readonly stderr: "pipe"; readonly timeoutMs?: number },
	): Promise<ModalTextProcess>;
	detach(): void;
}

/** One listed sandbox, as the control plane's raw listing reports it. */
export interface ModalSandboxInfo {
	readonly id: string;
	readonly appId: string;
	readonly name: string;
	readonly createdAt: number;
}

/** One listing page (newest first), or all of it older than `beforeTimestamp`. */
type ModalListPage = (params: {
	readonly appId?: string;
	readonly beforeTimestamp?: number;
}) => Promise<readonly ModalSandboxInfo[]>;

export interface ModalControlPlane {
	readonly apps: {
		/** The named App, or undefined when this workspace has never created it. */
		fromName(name: string): Promise<{ readonly appId: string } | undefined>;
		list(): Promise<readonly { readonly appId: string }[]>;
	};
	readonly sandboxes: {
		fromId(id: string): Promise<ModalControlSandbox>;
		fromName(appName: string, name: string): Promise<ModalControlSandbox>;
		experimentalFromName(appName: string, name: string): Promise<ModalControlSandbox>;
		/** Running V1 sandboxes in the environment, or only those under `appId`. */
		list: ModalListPage;
		/** Running V2 sandboxes under one App; Modal cannot enumerate V2 environment-wide. */
		experimentalList: (params: {
			readonly appId: string;
			readonly beforeTimestamp?: number;
		}) => Promise<readonly ModalSandboxInfo[]>;
	};
}

/**
 * Modal's high-level fromName catches every nested NOT_FOUND (including AuthTokenGet) and rewrites
 * it to an unqualified NotFoundError, and its listings drop each sandbox's name and App. The
 * control plane uses the public control client directly, so the originating RPC path survives (only
 * a sandbox lookup can prove absence) and a listing reports what ownership rests on.
 */
export function modalControlPlane(client: ModalClient): ModalControlPlane {
	const environmentName = client.environmentName();
	return {
		apps: {
			list: async () => (await client.cpClient.appList({ environmentName })).apps,
			fromName: async (name) => {
				try {
					return await client.apps.fromName(name, { createIfMissing: false });
				} catch (caught) {
					// Only the SDK's typed absence means "no such App"; an inventory must not create one.
					if (caught instanceof NotFoundError) return undefined;
					throw caught;
				}
			},
		},
		sandboxes: {
			fromId: (id) => client.sandboxes.fromId(id),
			// The SDK's own listing requests: running sandboxes only, untagged.
			list: async ({ appId, beforeTimestamp }) =>
				(
					await client.cpClient.sandboxList({
						...(appId !== undefined && { appId }),
						...(beforeTimestamp !== undefined && { beforeTimestamp }),
						environmentName,
						includeFinished: false,
						tags: [],
					})
				).sandboxes,
			experimentalList: async ({ appId, beforeTimestamp }) =>
				(
					await client.cpClient.sandboxListV2({
						appId,
						...(beforeTimestamp !== undefined && { beforeTimestamp }),
						includeFinished: false,
						tags: [],
					})
				).sandboxes,
			fromName: async (appName, name) => {
				const response = await client.cpClient.sandboxGetFromName({
					appName,
					sandboxName: name,
					environmentName,
				});
				return new Sandbox(client, MODAL_V1_SANDBOX_ID.assert(response.sandboxId), {
					isV2: false,
				});
			},
			experimentalFromName: async (appName, name) => {
				const response = await client.cpClient.sandboxGetFromNameV2({
					appName,
					sandboxName: name,
					environmentName,
				});
				return new Sandbox(client, MODAL_V2_SANDBOX_ID.assert(response.sandboxId), {
					isV2: true,
				});
			},
		},
	};
}

export interface ModalControlRunner<Control = ModalControlPlane> {
	run<T>(
		options: { readonly signal?: AbortSignal },
		operation: (control: Control) => Promise<T>,
		onAbort?: () => void,
	): Promise<T>;
}

/**
 * Modal 0.9 declares client timeout/retry constructor fields but does not apply them at runtime.
 * Inject the transaction signal where the SDK's middleware chain actually consumes it. nice-grpc
 * invokes the last-attached custom middleware first, so these options reach Modal's timeout and
 * retry middleware on every control-plane RPC. The outer timer spans multi-RPC loops such as
 * terminate({wait:true}).
 */
export function createModalControlRunner<Control>(
	createControl: (middleware: ClientMiddleware) => Control,
	timeoutMs = MODAL_CONTROL_TIMEOUT_MS,
): ModalControlRunner<Control> {
	const operationSignals = new AsyncLocalStorage<AbortSignal>();
	const deadlineMiddleware: ClientMiddleware = async function* (call, options) {
		const signal = operationSignals.getStore();
		if (signal === undefined) {
			throw new Error("Modal control RPC escaped its bounded operation");
		}
		const nextOptions = {
			...options,
			signal,
			timeoutMs,
			// Modal 0.9's retry middleware drops `signal` entirely when retries is zero, so one
			// bounded retry is what keeps cancellation attached to the real gRPC transport; the
			// operation-wide controller remains the hard ceiling across both attempts.
			//
			// Retrying a non-idempotent SandboxExec is safe here: that middleware stamps one
			// x-idempotency-key per call and replays it on every attempt, so a response lost after
			// the server accepted the exec is deduplicated server-side rather than starting the
			// benchmark command a second time. Stock Modal defaults to three attempts on every unary
			// RPC; one is the conservative setting, not a laxer one.
			retries: 1,
		};
		return yield* call.next(call.request, nextOptions);
	};
	const control = createControl(deadlineMiddleware);
	return {
		run: async (options, operation, onAbort) => {
			options.signal?.throwIfAborted();
			const controller = new AbortController();
			const abort = (reason: unknown) => {
				if (controller.signal.aborted) return;
				controller.abort(reason);
				try {
					onAbort?.();
				} catch {
					// Closing a local transport is best effort; the operation rejection remains primary.
				}
			};
			const forwardAbort = () => abort(options.signal?.reason);
			options.signal?.addEventListener("abort", forwardAbort, { once: true });
			const timer = setTimeout(
				() => abort(new Error(modalControlTimeoutMessage(timeoutMs))),
				timeoutMs,
			);
			try {
				const result = await operationSignals.run(controller.signal, () => operation(control));
				controller.signal.throwIfAborted();
				return result;
			} finally {
				clearTimeout(timer);
				options.signal?.removeEventListener("abort", forwardAbort);
				if (controller.signal.aborted) {
					try {
						onAbort?.();
					} catch {
						// The operation's cancellation/timeout remains the primary failure.
					}
				}
			}
		},
	};
}

/** Join both output streams and the exit, then validate the native result. */
export async function modalProcessResult(
	process: ModalTextProcess,
	onFailure: () => void,
): Promise<{
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}> {
	const settleAfterFailure = async (start: () => Promise<unknown>): Promise<unknown> => {
		try {
			return await Promise.resolve().then(start);
		} catch (caught) {
			try {
				onFailure();
			} catch {
				// Local transport close is best effort; the process failure remains primary.
			}
			throw caught;
		}
	};
	const settled = await Promise.allSettled(
		[() => process.stdout.readText(), () => process.stderr.readText(), () => process.wait()].map(
			settleAfterFailure,
		),
	);
	// Detach can reject one stream before the others finish unwinding. Join every accepted
	// command-router operation before surfacing the first deterministic error so runner.run never
	// releases a transaction with sibling RPCs still active.
	const [stdout, stderr, exitCode] = settled.map((result) => {
		if (result.status === "rejected") throw result.reason;
		return result.value;
	});
	if (
		typeof stdout !== "string" ||
		typeof stderr !== "string" ||
		typeof exitCode !== "number" ||
		!Number.isSafeInteger(exitCode)
	) {
		throw new Error("Modal process returned a malformed result");
	}
	return { stdout, stderr, exitCode };
}

/** A sandbox as the adapter knows it: a listing's row, or a create's handle. */
export interface ModalRow<Native> {
	readonly id: string;
	readonly name?: string;
	readonly appId?: string;
	readonly native?: Native;
}

export interface ModalVendorOptions<Native> {
	/** The generation this module creates, owns and lists in the App. */
	readonly backend: ModalBackend;
	/** The App every create lands in: the ownership boundary. */
	readonly appName: string;
	/** The control plane over a client carrying the runner's deadline middleware. */
	readonly control: (middleware: ClientMiddleware) => ModalControlPlane;
	/** The create transaction: resolve the App and image, then allocate the named sandbox. */
	readonly allocate: (attempt: CreateAttempt, op: Op) => Promise<Native>;
}

export function modalVendor<Native extends { readonly sandboxId: string }>(
	options: ModalVendorOptions<Native>,
): Vendor<ModalRow<Native>, Native> {
	const { backend, appName } = options;
	const runner = createModalControlRunner(options.control);
	const destroyRunner = createModalControlRunner(options.control, MODAL_DESTROY_TIMEOUT_MS);
	const inventoryRunner = createModalControlRunner(options.control, MODAL_INVENTORY_TIMEOUT_MS);
	// A read by id reports no name; remember the one each create, listing or lookup reported.
	const names = new Map<string, string>();
	const record = (
		row: ModalRow<Native>,
		phase: "ready" | "gone" = "ready",
	): VendorRecord<ModalRow<Native>> => {
		if (row.name) names.set(row.id, row.name);
		const marker = row.name || names.get(row.id);
		return { id: row.id, phase, ...(marker && { marker }), raw: row };
	};
	/** One bounded transaction on an attached sandbox, detached when it is cut short. */
	const attached = <T>(
		using: ModalControlRunner,
		signal: AbortSignal,
		attach: (control: ModalControlPlane) => Promise<ModalControlSandbox>,
		work: (sandbox: ModalControlSandbox) => Promise<T>,
	) => {
		let sandbox: ModalControlSandbox | undefined;
		return using.run(
			{ signal },
			async (control) => {
				sandbox = await attach(control);
				return work(sandbox);
			},
			() => sandbox?.detach(),
		);
	};
	/** Every running sandbox of one listing, drained by creation time; a stalled cursor fails. */
	const drain = async (
		list: (beforeTimestamp?: number) => Promise<readonly ModalSandboxInfo[]>,
	) => {
		const rows: ModalSandboxInfo[] = [];
		let before: number | undefined;
		for (;;) {
			const page = await list(before);
			const last = page.at(-1);
			if (!last) return rows;
			if (!Number.isFinite(last.createdAt) || (before !== undefined && last.createdAt >= before))
				throw new Error("Modal listing pagination did not advance");
			rows.push(...page);
			before = last.createdAt;
		}
	};
	const listed = (row: ModalSandboxInfo) =>
		({ id: MODAL_CONTROL_SANDBOX_ID.assert(row.id), name: row.name, appId: row.appId }) as const;

	return {
		control: {
			// The create transaction returns a running sandbox: the response itself proves readiness.
			create: async (attempt, op) => {
				const native = await options.allocate(attempt, op);
				return record({ id: native.sandboxId, name: attempt.marker, native });
			},
			// A null poll is a running sandbox; an exit code is one that holds nothing any more.
			get: async (id, { signal }) => {
				try {
					const exitCode = await attached(
						runner,
						signal,
						(control) => control.sandboxes.fromId(id),
						async (sandbox) => {
							try {
								return await sandbox.poll();
							} finally {
								sandbox.detach();
							}
						},
					);
					if (exitCode !== null && !Number.isSafeInteger(exitCode))
						throw new Error("Modal poll returned a malformed exit code");
					return record({ id }, exitCode === null ? "ready" : "gone");
				} catch (caught) {
					if (isModalNotFound(caught)) return null;
					throw caught;
				}
			},
			// The waited terminate resolves once the sandbox has exited: removal is proven.
			remove: async (id, { signal }) => {
				try {
					await attached(
						destroyRunner,
						signal,
						(control) => control.sandboxes.fromId(id),
						(sandbox) => sandbox.terminate({ wait: true }),
					);
				} catch (caught) {
					if (!isModalNotFound(caught)) throw caught;
				}
				return "removed";
			},
			// Two pages: the App's own generation (owned by name), then everything outside the App
			// (foreign). The second carries the App's id, so the sibling generation in the App, which
			// the other variant owns, is in neither.
			page: (cursor, { signal }) =>
				inventoryRunner.run({ signal }, async (control) => {
					if (cursor === undefined) {
						const app = await control.apps.fromName(appName);
						const appId = app?.appId ?? "";
						const own = app
							? await drain((beforeTimestamp) =>
									backend === "v2"
										? control.sandboxes.experimentalList({ appId, beforeTimestamp })
										: control.sandboxes.list({ appId, beforeTimestamp }),
								)
							: [];
						return { records: own.map((row) => record(listed(row))), next: `outside:${appId}` };
					}
					const appId = cursor.slice("outside:".length);
					const outside = (
						await drain((beforeTimestamp) => control.sandboxes.list({ beforeTimestamp }))
					).filter((row) => row.appId !== appId);
					for (const other of await control.apps.list()) {
						if (other.appId === appId) continue;
						outside.push(
							...(await drain((beforeTimestamp) =>
								control.sandboxes.experimentalList({ appId: other.appId, beforeTimestamp }),
							)),
						);
					}
					return {
						records: outside.map((row) => ({
							id: listed(row).id,
							phase: "ready",
							raw: listed(row),
						})),
					};
				}),
			// Both generations' name endpoints, this module's own first: a create can land in either.
			find: (marker, _cursor, { signal }) => {
				const lookups = [
					(control: ModalControlPlane) => control.sandboxes.experimentalFromName(appName, marker),
					(control: ModalControlPlane) => control.sandboxes.fromName(appName, marker),
				];
				if (backend === "v1") lookups.reverse();
				let active: ModalControlSandbox | undefined;
				return destroyRunner.run(
					{ signal },
					async (control) => {
						const records = [];
						for (const lookup of lookups) {
							try {
								active = await lookup(control);
							} catch (caught) {
								if (isModalNotFound(caught)) continue;
								throw caught;
							}
							records.push(record({ id: active.sandboxId, name: marker }));
							active.detach();
						}
						return { records };
					},
					() => active?.detach(),
				);
			},
			transient: isModalRetryableCreate,
		},
		data: {
			attach: ({ raw }) => {
				if (!raw.native) throw new Error("Modal attaches only the sandbox its create returned");
				return raw.native;
			},
			// Attachment and exec-start are bounded; a foreground benchmark command may legitimately run
			// for minutes and owns its duration outside the control budget.
			exec: async ({ sandboxId }, command, execOptions?: ExecOptions) => {
				let sandbox: ModalControlSandbox | undefined;
				let process: ModalTextProcess;
				try {
					process = await runner.run(
						{ ...(execOptions?.signal && { signal: execOptions.signal }) },
						async (control) => {
							sandbox = await control.sandboxes.fromId(sandboxId);
							// Modal 0.9 rejects a defined timeoutMs <= 0: omission leaves the duration open.
							return sandbox.exec(["sh", "-c", command], { stdout: "pipe", stderr: "pipe" });
						},
						() => sandbox?.detach(),
					);
				} catch (caught) {
					// A normal exec-start rejection does not pass through the runner's abort callback.
					try {
						sandbox?.detach();
					} catch {
						// Local transport close is best effort; the exec-start failure remains primary.
					}
					throw caught;
				}
				try {
					return await modalProcessResult(process, () => sandbox?.detach());
				} finally {
					sandbox?.detach();
				}
			},
		},
	};
}
