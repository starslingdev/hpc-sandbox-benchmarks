// Brezel's vendor adapter: translation only. Lifecycle, recovery and inventory behaviour live in
// the driver kit; this file states what Brezel's API means.

import { AsyncLocalStorage } from "node:async_hooks";
import type { Sandbox } from "@infercrane/brezel";
import { BrezelClient, BrezelError } from "@infercrane/brezel";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { type } from "arktype";
import type { Phase, Vendor, VendorRecord } from "../../driver-vendor/src/vendor.ts";

export const BREZEL_SANDBOX_ID = type(/^sbx_[A-Za-z0-9_-]+$/);
// Safety expiry for the operator-qualified endpoint; shell-detach does not extend allocation TTL.
const CREATE_TTL_SECONDS = 2 * 60 * 60;

const resource = type({
	id: BREZEL_SANDBOX_ID,
	state:
		"'requested' | 'preparing' | 'running' | 'pausing' | 'standby' | 'resuming' | 'deleting' | 'deleted' | 'expired' | 'failed' | 'unknown'",
	environment_revision: "string >= 1",
	"failure?": type({ code: "string" }).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");
type Resource = typeof resource.infer;
const created = type({ resource }).onUndeclaredKey("ignore");

function phaseOf(row: Resource): Phase {
	if (row.state === "deleted" || row.state === "expired") return "gone";
	// Reconciliation can retain a failed record after confirming the backend is absent.
	if (row.state === "failed")
		return ["backend_resource_missing", "backend_capacity_unavailable"].includes(
			row.failure?.code ?? "",
		)
			? "gone"
			: "failed";
	if (row.state === "deleting") return "deleting";
	return row.state === "running" ? "ready" : "pending";
}

const statusIn = (statuses: readonly number[]) => (error: unknown) =>
	matchesAnyCause(
		error,
		(cause) => cause instanceof BrezelError && statuses.includes(cause.status),
	);
const notFound = statusIn([404]);

/** `fetch` is the injected transport: production passes globalThis.fetch, tests a fake. */
export function brezelVendor(
	{ env }: Pick<DriverContext<"brezel">, "env">,
	transport: { readonly fetch: typeof globalThis.fetch },
): Vendor<Resource, Sandbox> {
	// The SDK has no caller-signal option; scope each control call's signal into the transport.
	const signals = new AsyncLocalStorage<AbortSignal>();
	const fetch = Object.assign(
		(
			input: Parameters<typeof globalThis.fetch>[0],
			init: Parameters<typeof globalThis.fetch>[1],
		) => {
			const signal = signals.getStore();
			return transport.fetch(input, {
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
		timeoutMs: 45_000,
		fetch,
	});
	async function call<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
		signal.throwIfAborted();
		const result = await signals.run(signal, work);
		signal.throwIfAborted();
		return result;
	}
	const record = (row: Resource): VendorRecord<Resource> => ({
		id: row.id,
		phase: phaseOf(row),
		raw: row,
	});
	const body = {
		environment_revision: env.BREZEL_ENVIRONMENT_REVISION,
		lifecycle: { expires_after_seconds: CREATE_TTL_SECONDS },
		network: { allow_internet: true },
	};
	const post = (marker: string, signal: AbortSignal) =>
		call(
			signal,
			async () =>
				created.assert(
					await client.requestJSON("POST", "/v1/sandboxes", { body, idempotencyKey: marker }),
				).resource,
		);

	return {
		control: {
			// The create acknowledgement is not readiness evidence; readiness is observed by GET.
			create: async ({ marker }, { signal }) => ({
				...record(await post(marker, signal)),
				phase: "pending",
			}),
			get: async (id, { signal }) => {
				try {
					return record(
						resource.assert(
							await call(signal, () => client.requestJSON("GET", `/v1/sandboxes/${id}`)),
						),
					);
				} catch (error) {
					if (notFound(error)) return null;
					throw error;
				}
			},
			remove: async (id, { signal }) => {
				try {
					await call(signal, () =>
						client.requestJSON("DELETE", `/v1/sandboxes/${id}`, {
							idempotencyKey: `benchmark-delete-${id}`,
						}),
					);
					return "accepted";
				} catch (error) {
					if (notFound(error)) return "removed";
					throw error;
				}
			},
			page: async (_cursor, { signal }) => ({
				records: (await call(signal, () => client.listSandboxes({ includeTerminal: true }))).map(
					(row) => record(resource.assert(row)),
				),
			}),
			// Dedicated account: an idempotent replay of the same key returns the canonical record.
			find: async (marker, _cursor, { signal }) => ({
				records: [record(await post(marker, signal))],
			}),
			refused: (error) =>
				statusIn([400, 401, 403, 404, 429])(error)
					? { retryable: statusIn([429, 502, 503, 504])(error) }
					: undefined,
			admit: (ready) =>
				ready.raw.environment_revision === env.BREZEL_ENVIRONMENT_REVISION
					? undefined
					: "created from a different environment revision",
		},
		data: {
			attach: (row) => client.sandbox(row.id),
			exec: async (native, command, options) => {
				options?.signal?.throwIfAborted();
				// The pinned workload preamble needs Bash (`source`, `pipefail`), not Ubuntu's dash.
				const result = await native.run(["/bin/bash", "-lc", command], { timeoutSeconds: 60 });
				options?.signal?.throwIfAborted();
				return { exitCode: result.exitCode, stdout: result.stdoutText, stderr: result.stderrText };
			},
			files: {
				read: async (native, path) => new TextDecoder().decode(await native.readFile(path)),
				write: async (native, path, text) => {
					await native.writeFile(path, text);
				},
			},
		},
	};
}
