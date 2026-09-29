import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { Sandbox } from "@infercrane/brezel";
import { BrezelClient, BrezelError } from "@infercrane/brezel";
import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { pollUntilReady } from "@sandbox-benchmarks/driver";
import { computeSdkSpec, defineComputeSdkDriver } from "@sandbox-benchmarks/driver/computesdk";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { nativeSdkCompute } from "@sandbox-benchmarks/driver/native";
import { type } from "arktype";
import { BREZEL_PROVENANCE } from "./provenance.ts";

export const BREZEL_SANDBOX_ID = type(/^sbx_[A-Za-z0-9_-]+$/);
const REMOVED_STATES = new Set(["deleted", "expired"]);
// Safety expiry for the operator-qualified endpoint; shell-detach does not extend allocation TTL.
const CREATE_TTL_SECONDS = 2 * 60 * 60;
const CONTROL_TIMEOUT_MS = 45_000;
const READY_TIMEOUT_MS = 3 * 60_000;
const DELETE_TIMEOUT_MS = 60_000;
const POLL_MS = 250;

const sandboxResource = type({
	id: BREZEL_SANDBOX_ID,
	state:
		"'requested' | 'preparing' | 'running' | 'pausing' | 'standby' | 'resuming' | 'deleting' | 'deleted' | 'expired' | 'failed' | 'unknown'",
	environment_revision: "string >= 1",
	"failure?": type({ code: "string" }).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");
function isRemoved(resource: typeof sandboxResource.infer): boolean {
	return (
		REMOVED_STATES.has(resource.state) ||
		// Reconciliation can retain a failed record after confirming the backend is absent.
		(resource.state === "failed" &&
			["backend_resource_missing", "backend_capacity_unavailable"].includes(
				resource.failure?.code ?? "",
			))
	);
}

const createResponse = type({ resource: sandboxResource }).onUndeclaredKey("ignore");
const optionsSchema = type({
	idempotencyKey: "string >= 1",
	environmentRevision: "string >= 1",
});

interface BrezelCreateBody {
	readonly environment_revision: string;
	readonly lifecycle: { readonly expires_after_seconds: number };
	readonly network: { readonly allow_internet: true };
}

export interface BrezelSpecOptions {
	readonly fetch?: typeof globalThis.fetch;
	readonly pollMs?: number;
	readonly readyTimeoutMs?: number;
	readonly deleteTimeoutMs?: number;
}

function createBody(environmentRevision: string): BrezelCreateBody {
	return {
		environment_revision: environmentRevision,
		lifecycle: { expires_after_seconds: CREATE_TTL_SECONDS },
		network: { allow_internet: true },
	};
}

function isNotFound(error: unknown): boolean {
	return matchesAnyCause(error, (cause) => cause instanceof BrezelError && cause.status === 404);
}

function isDefinitiveCreateRejection(error: unknown): boolean {
	return matchesAnyCause(
		error,
		// Quota rejection happens before provisioning; backend capacity rejection explicitly
		// confirms no resource was created. Both remain eligible for a harness retry.
		(cause) => cause instanceof BrezelError && [400, 401, 403, 404, 429].includes(cause.status),
	);
}

function isRetryableCreateRejection(error: unknown): boolean {
	return matchesAnyCause(
		error,
		(cause) => cause instanceof BrezelError && [429, 502, 503, 504].includes(cause.status),
	);
}

function quoteShell(value: string): string {
	return `'${value.replaceAll("'", `'\\''`)}'`;
}

async function exec(native: Sandbox, command: string, options?: ExecOptions) {
	options?.signal?.throwIfAborted();
	// Starsling's pinned workload preamble intentionally uses Bash features such as `source` and
	// `pipefail`; running it through Ubuntu's dash would silently skip those controls.
	const result = await native.run(["/bin/bash", "-lc", command], { timeoutSeconds: 60 });
	options?.signal?.throwIfAborted();
	return {
		exitCode: result.exitCode,
		stdout: result.stdoutText,
		stderr: result.stderrText,
	};
}

export function brezelSpec(
	{ env, resolvedArtifact }: DriverContext<"brezel">,
	seams: BrezelSpecOptions = {},
) {
	// The SDK supplies its own timeout signal but has no caller-signal option. Scope the
	// additional signal to control calls so the returned Sandbox retains a reusable transport.
	const controlSignals = new AsyncLocalStorage<AbortSignal>();
	const transport: typeof globalThis.fetch = Object.assign(
		async (input: Parameters<typeof fetch>[0], init: Parameters<typeof fetch>[1]) => {
			const signal = controlSignals.getStore();
			return (seams.fetch ?? globalThis.fetch)(input, {
				...init,
				signal: signal
					? AbortSignal.any([signal, ...(init?.signal ? [init.signal] : [])])
					: init?.signal,
			});
		},
		{ preconnect: globalThis.fetch.preconnect },
	);
	const client = new BrezelClient({
		token: env.BREZEL_API_KEY,
		baseUrl: env.BREZEL_API_URL,
		project: env.BREZEL_PROJECT_ID,
		timeoutMs: CONTROL_TIMEOUT_MS,
		fetch: transport,
	});
	async function control<T>(signal: AbortSignal | undefined, call: () => Promise<T>): Promise<T> {
		signal?.throwIfAborted();
		const result = await (signal ? controlSignals.run(signal, call) : call());
		signal?.throwIfAborted();
		return result;
	}
	const pollMs = seams.pollMs ?? POLL_MS;
	const readyTimeoutMs = seams.readyTimeoutMs ?? READY_TIMEOUT_MS;
	const deleteTimeoutMs = seams.deleteTimeoutMs ?? DELETE_TIMEOUT_MS;
	const environmentRevision = env.BREZEL_ENVIRONMENT_REVISION;
	const body = createBody(environmentRevision);

	const getResource = (id: string, signal?: AbortSignal) =>
		control(signal, async () =>
			sandboxResource.assert(await client.requestJSON("GET", `/v1/sandboxes/${id}`)),
		);
	const boundedSignal = (timeoutMs: number, signal?: AbortSignal) =>
		AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])]);
	async function destroy(id: string, signal?: AbortSignal): Promise<void> {
		const bounded = boundedSignal(deleteTimeoutMs, signal);
		let deleteRequested = false;
		await pollUntilReady({
			provider: "brezel",
			deadlineMs: deleteTimeoutMs,
			intervalMs: pollMs,
			signal: bounded,
			poll: async () => {
				try {
					const current = await getResource(id, bounded);
					if (isRemoved(current)) return true;
					if (!deleteRequested && current.state !== "deleting") {
						await control(bounded, () =>
							client.requestJSON("DELETE", `/v1/sandboxes/${id}`, {
								idempotencyKey: `benchmark-delete-${id}`,
							}),
						);
						deleteRequested = true;
					}
					return null;
				} catch (error) {
					if (isNotFound(error)) return true;
					throw error;
				}
			},
		});
	}

	const compute = nativeSdkCompute(
		async (options: typeof optionsSchema.infer, operation) => {
			operation.signal?.throwIfAborted();
			const payload = createResponse.assert(
				await control(operation.signal, () =>
					client.requestJSON("POST", "/v1/sandboxes", {
						body,
						idempotencyKey: options.idempotencyKey,
					}),
				),
			);
			operation.signal?.throwIfAborted();
			return control(operation.signal, () => client.sandbox(payload.resource.id));
		},
		(native) => ({
			sandboxId: native.id,
			runCommand: (command: string, options?: ExecOptions) => exec(native, command, options),
			destroy: () => destroy(native.id),
			filesystem: {
				readFile: async (path: string) => new TextDecoder().decode(await native.readFile(path)),
				exists: async (path: string) =>
					// dash's `test` builtin rejects `test -e -- path`; quoting the unary operand is
					// sufficient and keeps the shell-detach completion probe portable on Ubuntu.
					(await exec(native, `test -e ${quoteShell(path)}`)).exitCode === 0,
				writeFile: async (path: string, content: string) => {
					await native.writeFile(path, content);
				},
			},
		}),
	);

	return computeSdkSpec(compute, {
		sandboxId: BREZEL_SANDBOX_ID,
		createOptions: {
			coverage: {
				spec: { vcpus: { artifact: 4 }, memoryGb: { artifact: 8 }, diskGb: "runtime-verified" },
				artifact: "context",
				deadlineMs: "harness",
				gpu: { model: "unsupported", count: "unsupported" },
				env: "unsupported",
			},
			map: (request, unsupported) => {
				if (request.artifact.kind !== "none" || resolvedArtifact.kind !== "none") {
					unsupported("Brezel uses the manually pinned environment revision from driver context");
				}
				return {
					idempotencyKey: `benchmark-${randomUUID()}`,
					environmentRevision,
				};
			},
		},
		lifecycle: {
			destroy: async (sandbox, ref, operation) =>
				destroy(ref?.id ?? sandbox.sandboxId ?? sandbox.getInstance().id, operation.signal),
		},
		createRecovery: {
			absenceConfirmationMs: 1000,
			maxAttempts: 3,
			locator: (options) => ({
				kind: "marker",
				key: "Idempotency-Key",
				value: options.idempotencyKey,
			}),
			isDefinitive: isDefinitiveCreateRejection,
			isRetryableCreate: isRetryableCreateRejection,
			cleanup: async (_compute, locator, operation) => {
				operation.signal?.throwIfAborted();
				const payload = createResponse.assert(
					await control(operation.signal, () =>
						client.requestJSON("POST", "/v1/sandboxes", {
							body,
							idempotencyKey: locator.value,
						}),
					),
				);
				await destroy(payload.resource.id, operation.signal);
				return { status: "destroyed" };
			},
		},
		prepareAndVerifyCreatedRequest: async (_sandbox, native, request, operation) => {
			const signal = boundedSignal(readyTimeoutMs, operation.signal);
			const resource = await pollUntilReady({
				provider: "brezel",
				deadlineMs: readyTimeoutMs,
				intervalMs: pollMs,
				signal,
				poll: async () => {
					const row = await getResource(native.id, signal);
					if (row.state === "running") return row;
					if (REMOVED_STATES.has(row.state) || row.state === "failed")
						throw new Error(`Brezel sandbox entered ${row.state} before readiness`);
					return null;
				},
			});
			if (resource.environment_revision !== environmentRevision) {
				throw new Error("Brezel created a sandbox from a different environment revision");
			}
			if (request.spec.diskGb === undefined) return { status: "honored" };
			const result = await exec(native, "df -Pk / | awk 'NR==2 {print $2}'", operation);
			if (result.exitCode !== 0 || !/^\d+$/.test(result.stdout.trim())) {
				throw new Error("Brezel disk capacity probe failed");
			}
			const capacity = Number(result.stdout.trim()) / 1024 / 1024;
			return capacity >= request.spec.diskGb
				? { status: "honored" }
				: {
						status: "unsupported",
						detail: `requested ${request.spec.diskGb} GiB but allocation exposes ${capacity.toFixed(2)} GiB`,
					};
		},
		hasWorkingFilesystem: true,
		probes: {
			observe: async (_compute, ref) => {
				try {
					const resource = await getResource(ref.id);
					// Non-running and failed sandboxes can still own resources. Release ownership
					// only after the API confirms deletion, expiration, or a missing record.
					return { state: isRemoved(resource) ? "absent" : "running" };
				} catch (error) {
					if (isNotFound(error)) return { state: "absent" };
					throw error;
				}
			},
			describe: (_compute, ref) => client.requestJSON("GET", `/v1/sandboxes/${ref.id}`),
			list: () => client.listSandboxes({ includeTerminal: true }),
		},
		inventory: {
			list: async (_compute, operation) => {
				operation.signal?.throwIfAborted();
				const rows = await control(operation.signal, () =>
					client.listSandboxes({ includeTerminal: true }),
				);
				operation.signal?.throwIfAborted();
				return {
					owned: rows
						.map((row) => sandboxResource.assert(row))
						.filter((row) => !isRemoved(row))
						.map((row) => row.id),
					foreignCount: 0,
				};
			},
		},
		destroyById: async (_compute, ref, operation) => destroy(ref.id, operation.signal),
	});
}

export default defineComputeSdkDriver("brezel", {
	provenance: BREZEL_PROVENANCE,
	readiness: { startup: "create-returns-ready" },
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	spec: brezelSpec,
});
