// Prototype: the "sandbox ops" core. Every driver in the fleet re-derives the same seven account
// behaviors (readiness poll, convergent delete, destroyById, observe, inventory, ambiguous-create
// recovery, disk proof) from the same handful of vendor verbs. This module asks a provider for the
// verbs only and lowers them onto the existing ComputeSDK bridge, so every safety property the
// bridge enforces (coverage, id boundary, cleanup double faults, redaction) still applies.

import { randomUUID } from "node:crypto";
import type {
	CreateRequest,
	DriverContext,
	DriverOperationOptions,
	ExecOptions,
	ProviderId,
	SandboxObservation,
} from "@sandbox-benchmarks/driver";
import { pollUntilReady, shellQuote } from "@sandbox-benchmarks/driver";
import type {
	ComputeSdkCreateRequestCoverage,
	ComputeSdkDriverModuleSpec,
} from "@sandbox-benchmarks/driver/computesdk";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import type { Type } from "arktype";

/**
 * The only lifecycle question a provider answers about a control-plane record.
 * `failed` still owns resources (delete it); `gone` is confirmed removal.
 */
export type Phase = "pending" | "ready" | "failed" | "deleting" | "gone";

export interface ExecOutcome {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

/** How a create is attributed to this benchmark, which drives inventory and recovery. */
export type Ownership<Row> =
	/** A create-time marker (label, metadata, name) is readable back from list rows. */
	| {
			readonly kind: "marker";
			readonly key: string;
			readonly of: (row: Row) => string | undefined;
			/** Server-side recovery lookup; defaults to filtering `list()` by `of`. */
			readonly find?: (marker: string, signal?: AbortSignal) => Promise<readonly string[]>;
	  }
	/** The credential targets an account used only by the benchmark; recovery replays create. */
	| {
			readonly kind: "dedicated";
			readonly key: string;
			readonly find: (marker: string, signal?: AbortSignal) => Promise<readonly string[]>;
	  };

export interface OpsTiming {
	readonly pollMs: number;
	readonly readyTimeoutMs: number;
	readonly deleteTimeoutMs: number;
}

export interface SandboxOps<Row, Native> {
	readonly sandboxId: Type<string>;
	readonly coverage: ComputeSdkCreateRequestCoverage;
	/** Translate an already artifact-checked request. `marker` is fresh per attempt. */
	create(input: CreateInput, signal?: AbortSignal): Promise<Row>;
	get(id: string, signal?: AbortSignal): Promise<Row>;
	remove(id: string, signal?: AbortSignal): Promise<void>;
	list(signal?: AbortSignal): Promise<readonly Row[]>;
	idOf(row: Row): string;
	phase(row: Row): Phase;
	readonly ownership: Ownership<Row>;
	/** Data-plane handle for one sandbox (an SDK object, or the row itself for HTTP/CLI). */
	connect(row: Row): Native | Promise<Native>;
	exec(native: Native, command: string, options?: ExecOptions): Promise<ExecOutcome>;
	readonly files?: {
		read(native: Native, path: string): Promise<string>;
		write(native: Native, path: string, text: string): Promise<void>;
		exists?(native: Native, path: string): Promise<boolean>;
	};
	/** Native background launch. Omit to get shell-detach durability. */
	launch?(native: Native, command: string, options?: ExecOptions): Promise<void>;
	/** Post-readiness invariant beyond the request axes; throw to reject the allocation. */
	verify?(row: Row): void;
	readonly errors: {
		notFound(error: unknown): boolean;
		/** The control plane refused before allocating. */
		definitive?(error: unknown): boolean;
		/** A capacity/rate refusal the harness may retry. */
		retryable?(error: unknown): boolean;
	};
	readonly timing?: Partial<OpsTiming>;
	/** `on-create`: the create call returns a running sandbox, so no readiness poll is needed. */
	readonly readiness?: "poll" | "on-create";
	/** The vendor's delete resolves only once the sandbox is removed; skip convergence polling. */
	readonly removeConfirms?: boolean;
	readonly recovery?: { readonly absenceConfirmationMs?: number; readonly maxAttempts?: number };
}

export interface CreateInput {
	readonly request: CreateRequest;
	readonly marker: string;
}

interface Handle<Row, Native> {
	readonly id: string;
	readonly row: Row;
	readonly native: Native;
}

const DEFAULT_TIMING: OpsTiming = { pollMs: 250, readyTimeoutMs: 180_000, deleteTimeoutMs: 60_000 };
export const MARKER_PREFIX = "benchmark-";

/* ----------------------------- coverage presets ----------------------------- */

type Axis = ComputeSdkCreateRequestCoverage["spec"]["vcpus"];

/** Fill the axes every provider in the fleet declares identically; state only what differs. */
export function coverage(
	spec: { readonly vcpus: Axis; readonly memoryGb: Axis; readonly diskGb: Axis },
	options: { readonly env?: "mapped" | "unsupported" } = {},
): ComputeSdkCreateRequestCoverage {
	return {
		spec,
		artifact: "context",
		deadlineMs: "harness",
		gpu: { model: "unsupported", count: "unsupported" },
		env: options.env ?? "unsupported",
	};
}

/** The artifact pins the shape; disk is proven after boot. The most common fleet declaration. */
export const pinnedShape = (vcpus: number, memoryGb: number) =>
	coverage({
		vcpus: { artifact: vcpus },
		memoryGb: { artifact: memoryGb },
		diskGb: "runtime-verified",
	});

/* ----------------------------- error classifiers ----------------------------- */

/** Declarative status classification over any error class that carries an HTTP status. */
export function statusIn(
	statusOf: (cause: unknown) => number | undefined,
	statuses: readonly number[],
): (error: unknown) => boolean {
	return (error) =>
		matchesAnyCause(error, (cause) => {
			const status = statusOf(cause);
			return status !== undefined && statuses.includes(status);
		});
}

export function instanceOfAny(
	...classes: ReadonlyArray<abstract new (...args: never[]) => unknown>
) {
	return (error: unknown) =>
		matchesAnyCause(error, (cause) => classes.some((errorClass) => cause instanceof errorClass));
}

/* ----------------------------- lowering ----------------------------- */

function bounded(timeoutMs: number, signal?: AbortSignal): AbortSignal {
	return AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
}

/** Lower provider verbs onto the ComputeSDK bridge for one resolved driver context. */
export function opsSpec<P extends ProviderId, Row, Native>(
	provider: P,
	context: DriverContext<P>,
	ops: SandboxOps<Row, Native>,
) {
	const timing = { ...DEFAULT_TIMING, ...ops.timing };
	const isGone = (row: Row) => ops.phase(row) === "gone";

	async function destroy(id: string, signal?: AbortSignal): Promise<void> {
		if (ops.removeConfirms) {
			try {
				return await ops.remove(id, signal);
			} catch (error) {
				if (ops.errors.notFound(error)) return;
				throw error;
			}
		}
		const deadline = bounded(timing.deleteTimeoutMs, signal);
		let requested = false;
		await pollUntilReady({
			provider,
			deadlineMs: timing.deleteTimeoutMs,
			intervalMs: timing.pollMs,
			signal: deadline,
			poll: async () => {
				try {
					const row = await ops.get(id, deadline);
					if (isGone(row)) return true;
					if (!requested && ops.phase(row) !== "deleting") {
						await ops.remove(id, deadline);
						requested = true;
					}
					return null;
				} catch (error) {
					if (ops.errors.notFound(error)) return true;
					throw error;
				}
			},
		});
	}

	async function awaitReady(id: string, outer?: AbortSignal): Promise<void> {
		const signal = bounded(timing.readyTimeoutMs, outer);
		const row = await pollUntilReady({
			provider,
			deadlineMs: timing.readyTimeoutMs,
			intervalMs: timing.pollMs,
			signal,
			poll: async () => {
				const current = await ops.get(id, signal);
				const phase = ops.phase(current);
				if (phase === "ready") return current;
				if (phase !== "pending")
					throw new Error(`${provider} sandbox entered ${phase} before readiness`);
				return null;
			},
		});
		ops.verify?.(row);
	}

	async function ownedIds(marker: string, signal?: AbortSignal): Promise<readonly string[]> {
		const owner = ops.ownership;
		if (owner.find) return owner.find(marker, signal);
		const of = owner.kind === "marker" ? owner.of : () => undefined;
		return (await ops.list(signal)).filter((row) => of(row) === marker).map(ops.idOf);
	}

	async function exists(native: Native, path: string): Promise<boolean> {
		if (ops.files?.exists) return ops.files.exists(native, path);
		return (await ops.exec(native, `test -e ${shellQuote(path)}`)).exitCode === 0;
	}

	const compute = nativeSdkCompute(
		async (input: CreateInput, operation): Promise<Handle<Row, Native>> => {
			const row = await ops.create(input, operation.signal);
			operation.signal?.throwIfAborted();
			return { id: ops.idOf(row), row, native: await ops.connect(row) };
		},
		(handle) => ({
			sandboxId: handle.id,
			runCommand: (command: string, options?: ExecOptions) =>
				ops.exec(handle.native, command, options),
			destroy: () => destroy(handle.id),
			...(ops.files && {
				filesystem: {
					readFile: (path: string) => ops.files?.read(handle.native, path) ?? Promise.reject(),
					exists: (path: string) => exists(handle.native, path),
					writeFile: (path: string, text: string) =>
						ops.files?.write(handle.native, path, text) ?? Promise.reject(),
				},
			}),
		}),
	);

	const launch = ops.launch;
	return computeSdkSpec(compute, {
		sandboxId: ops.sandboxId,
		createOptions: {
			coverage: ops.coverage,
			map: (request, unsupported) => {
				const resolved = context.resolvedArtifact;
				const same =
					request.artifact.kind === resolved.kind &&
					(resolved.kind === "none" ||
						(request.artifact.kind !== "none" && request.artifact.ref === resolved.ref));
				if (!same) unsupported(`request artifact differs from the resolved ${provider} artifact`);
				return { request, marker: `${MARKER_PREFIX}${randomUUID()}` };
			},
		},
		...(launch && {
			commands: {
				exec: (sandbox, command, options) =>
					ops.exec(sandbox.getInstance().native, command, options),
				launch: (sandbox, command, options) =>
					launch(sandbox.getInstance().native, command, options),
			},
		}),
		lifecycle: {
			destroy: (sandbox, ref, operation) =>
				destroy(ref?.id ?? sandbox.getInstance().id, operation.signal),
		},
		createRecovery: {
			absenceConfirmationMs: ops.recovery?.absenceConfirmationMs ?? 2_000,
			maxAttempts: ops.recovery?.maxAttempts ?? 4,
			locator: (input) => ({ kind: "marker", key: ops.ownership.key, value: input.marker }),
			...(ops.errors.definitive && { isDefinitive: ops.errors.definitive }),
			...(ops.errors.retryable && { isRetryableCreate: ops.errors.retryable }),
			cleanup: async (_compute, locator, operation) => {
				const ids = await ownedIds(locator.value, operation.signal);
				for (const id of ids) await destroy(id, operation.signal);
				return ids.length > 0 ? { status: "destroyed" } : { status: "absent" };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, handle, request, operation) => {
			if (ops.readiness !== "on-create") await awaitReady(handle.id, operation.signal);
			if (ops.coverage.spec.diskGb !== "runtime-verified" || request.spec.diskGb === undefined)
				return { status: "honored" };
			return verifyDisk(provider, request.spec.diskGb, (command) =>
				ops.exec(handle.native, command, operation),
			);
		},
		hasWorkingFilesystem: ops.files !== undefined,
		probes: {
			observe: async (_compute, ref): Promise<SandboxObservation> => {
				try {
					return { state: isGone(await ops.get(ref.id)) ? "absent" : "running" };
				} catch (error) {
					if (ops.errors.notFound(error)) return { state: "absent" };
					throw error;
				}
			},
			describe: (_compute, ref) => ops.get(ref.id),
			list: () => ops.list(),
		},
		inventory: {
			list: async (_compute, operation) => {
				const rows = (await ops.list(operation.signal)).filter((row) => !isGone(row));
				const owner = ops.ownership;
				const mine = (row: Row) =>
					owner.kind === "dedicated" || (owner.of(row)?.startsWith(MARKER_PREFIX) ?? false);
				return {
					owned: rows.filter(mine).map(ops.idOf),
					foreignCount: rows.filter((row) => !mine(row)).length,
				};
			},
		},
		destroyById: (_compute, ref, operation) => destroy(ref.id, operation.signal),
	});
}

/** The `df` disk-capacity proof that ten drivers each copy today. */
export async function verifyDisk(
	provider: ProviderId,
	requestedGb: number,
	exec: (command: string) => Promise<ExecOutcome>,
) {
	const result = await exec("df -Pk / | awk 'NR==2 {print $2}'");
	if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim()))
		throw new Error(`${provider} disk capacity probe failed`);
	const capacity = Number(result.stdout.trim()) / 1024 / 1024;
	return capacity >= requestedGb
		? ({ status: "honored" } as const)
		: ({
				status: "unsupported",
				detail: `requested ${requestedGb} GiB but allocation exposes ${capacity.toFixed(2)} GiB`,
			} as const);
}

/** One registry-joined module whose execution policy follows from whether `launch` exists. */
export function defineOpsDriver<P extends ProviderId, Row, Native>(
	provider: P,
	module: Omit<
		ComputeSdkDriverModuleSpec<P, ReturnType<typeof opsSpec<P, Row, Native>>["compute"]>,
		"spec" | "readiness" | "execution"
	> & {
		readonly syncCapMs?: number;
		readonly ops: (context: DriverContext<P>) => SandboxOps<Row, Native>;
		/** Native background launch exists; decided once per module, not per context. */
		readonly nativeLaunch?: boolean;
	},
) {
	const { ops, syncCapMs = 60_000, nativeLaunch = false, ...policy } = module;
	return defineComputeSdkDriver(provider, {
		...policy,
		readiness: { startup: "create-returns-ready" },
		execution: { syncCapMs, durable: nativeLaunch ? "native-launch" : "shell-detach" },
		spec: (context) => opsSpec(provider, context, ops(context)),
	});
}

export type { DriverOperationOptions };
