// Brezel's vendor adapter: translation only. It states what Brezel's HTTP API means in the vendor
// port's terms and receives its transport; readiness, cleanup confirmation, recovery, inventory and
// the disk proof live in the driver kit (`@sandbox-benchmarks/driver/vendor`).

import { AsyncLocalStorage } from "node:async_hooks";
import type { Sandbox } from "@infercrane/brezel";
import { BrezelClient, BrezelError } from "@infercrane/brezel";
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { httpStatus, refusedOn } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const BREZEL_SANDBOX_ID = type(/^sbx_[A-Za-z0-9_-]+$/);
// Safety expiry for the operator-qualified endpoint; shell-detach does not extend allocation TTL.
const CREATE_TTL_SECONDS = 2 * 60 * 60;
/** The SDK's own per-request timeout; the kit's `controlTimeoutMs` matches it. */
export const BREZEL_CONTROL_TIMEOUT_MS = 45_000;

const resource = type({
	id: BREZEL_SANDBOX_ID,
	state:
		"'requested' | 'preparing' | 'running' | 'pausing' | 'standby' | 'resuming' | 'deleting' | 'deleted' | 'expired' | 'failed' | 'unknown'",
	environment_revision: "string >= 1",
	"failure?": type({ code: "string" }).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");
type BrezelResource = typeof resource.infer;
const created = type({ resource }).onUndeclaredKey("ignore");

/**
 * Non-running records (standby, unknown, failed) still own resources. Removal is evidenced only by
 * deletion, expiry, or reconciliation's explicit verdict that the backend is absent.
 */
export function brezelPhase(row: BrezelResource): Phase {
	if (row.state === "deleted" || row.state === "expired") return "gone";
	if (row.state === "failed")
		return ["backend_resource_missing", "backend_capacity_unavailable"].includes(
			row.failure?.code ?? "",
		)
			? "gone"
			: "failed";
	if (row.state === "deleting") return "deleting";
	return row.state === "running" ? "ready" : "pending";
}

const status = httpStatus(BrezelError, (error) => error.status);
const decoder = new TextDecoder();

/**
 * The adapter over one transport. Production binds `globalThis.fetch` in the package entry; tests
 * pass a fake HTTP router. The bearer token rides the SDK's own `Authorization` channel.
 */
export function brezelVendor(
	{ env }: Pick<DriverContext<"brezel">, "env">,
	transport: typeof globalThis.fetch,
): Vendor<BrezelResource, Sandbox> {
	// The SDK supplies its own timeout signal but has no caller-signal option. Scope each control
	// call's signal into the transport, so the attached Sandbox keeps a reusable transport.
	const signals = new AsyncLocalStorage<AbortSignal>();
	const fetch = Object.assign(
		(
			input: Parameters<typeof globalThis.fetch>[0],
			init: Parameters<typeof globalThis.fetch>[1],
		) => {
			const signal = signals.getStore();
			return transport(input, {
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
		timeoutMs: BREZEL_CONTROL_TIMEOUT_MS,
		fetch,
	});
	// The kit starts no call on a cancelled signal; one cancelled in flight is not answered.
	async function call<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
		const result = await signals.run(signal, work);
		signal.throwIfAborted();
		return result;
	}
	const record = (row: BrezelResource): VendorRecord<BrezelResource> => ({
		id: row.id,
		phase: brezelPhase(row),
		raw: row,
	});
	const body = {
		environment_revision: env.BREZEL_ENVIRONMENT_REVISION,
		lifecycle: { expires_after_seconds: CREATE_TTL_SECONDS },
		network: { allow_internet: true },
	};
	// The ownership marker is the create's Idempotency-Key: replaying it returns the same record.
	const post = async (marker: string, signal: AbortSignal) =>
		created.assert(
			await call(signal, () =>
				client.requestJSON("POST", "/v1/sandboxes", { body, idempotencyKey: marker }),
			),
		).resource;

	return {
		control: {
			// The create acknowledgement is not readiness evidence; readiness is observed by GET.
			create: async ({ marker }, { signal }) => ({
				...record(await post(marker, signal)),
				phase: "pending",
			}),
			get: async (id, { signal }) =>
				record(
					resource.assert(
						await call(signal, () => client.requestJSON("GET", `/v1/sandboxes/${id}`)),
					),
				),
			remove: async (id, { signal }) => {
				await call(signal, () =>
					client.requestJSON("DELETE", `/v1/sandboxes/${id}`, {
						idempotencyKey: `benchmark-delete-${id}`,
					}),
				);
				return "accepted";
			},
			absent: (error) => status(error) === 404,
			// One unpaged listing of the dedicated project, terminal records included.
			page: async (_cursor, { signal }) => ({
				records: (await call(signal, () => client.listSandboxes({ includeTerminal: true }))).map(
					(row) => record(resource.assert(row)),
				),
			}),
			// Dedicated account: an idempotent replay of the create's key returns its canonical record.
			find: async (marker, _cursor, { signal }) => ({
				records: [record(await post(marker, signal))],
			}),
			// Rejected before provisioning (quota and backend capacity included); only a rate limit is
			// worth a harness retry.
			refused: refusedOn(status, [400, 401, 403, 404, 429]),
			// Gateway failures prove nothing about allocation: reconciled first, then retryable.
			transient: (error) => [429, 502, 503, 504].includes(status(error) ?? 0),
			admit: (ready) =>
				ready.raw.environment_revision === env.BREZEL_ENVIRONMENT_REVISION
					? undefined
					: "created from a different environment revision",
		},
		data: {
			attach: (row, { signal }) => call(signal, () => client.sandbox(row.id)),
			exec: async (native, command, options) => {
				// The pinned workload preamble uses Bash features (`source`, `pipefail`); Ubuntu's dash
				// would silently skip those controls. An accepted command runs to its bounded completion
				// before cancellation is reported.
				const result = await native.run(["/bin/bash", "-lc", command], { timeoutSeconds: 60 });
				options?.signal?.throwIfAborted();
				return { exitCode: result.exitCode, stdout: result.stdoutText, stderr: result.stderrText };
			},
			// `exists` is the kit's quoted `test -e`, which Ubuntu's dash also accepts.
			files: {
				read: async (native, path) => decoder.decode(await native.readFile(path)),
				write: async (native, path, text) => {
					await native.writeFile(path, text);
				},
			},
		},
	};
}
