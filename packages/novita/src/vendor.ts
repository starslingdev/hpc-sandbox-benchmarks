// Novita's vendor adapter: translation only. It receives the loaded novita-sandbox SDK and never
// loads it; readiness, cleanup confirmation, recovery, inventory and the disk proof live in the
// driver kit (`@sandbox-benchmarks/driver/vendor`).
//
// Novita's E2B-compatible SDK owns its regional control plane and credential channel. The account
// key rides only the SDK's `apiKey` option, never custom headers, which the SDK would also forward
// to the guest daemon on every data-plane call.

import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorPage, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type { Sandbox as NativeSandbox } from "novita-sandbox";

/** The SDK surface the adapter translates; the package entry passes the loaded module. */
export type NovitaSdk = Pick<
	typeof import("novita-sandbox"),
	| "Sandbox"
	| "SandboxNotFoundError"
	| "AuthenticationError"
	| "InvalidArgumentError"
	| "RateLimitError"
>;

export const NOVITA_DOMAIN = "us-phx-1.sandbox.novita.ai";
export const NOVITA_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);
/** The metadata key every benchmark create writes its ownership marker under. */
export const NOVITA_ATTEMPT_KEY = "sandbox-benchmarks-attempt";
const CONTROL_TIMEOUT_MS = 5000;
const AS_ROOT = { user: "root", requestTimeoutMs: CONTROL_TIMEOUT_MS } as const;
/** A paused sandbox is still an allocation the account owns, so listings cover both live states. */
const LIVE_STATES = ["running", "paused"];

const row = type({
	sandboxId: "string >= 1",
	"state?": "string",
	"metadata?": { "[string]": "string" },
});
const rows = row.array();
/** One sandbox row; a create's row also carries the native handle it returned. */
export type NovitaRow = typeof row.infer & { readonly native?: NativeSandbox };
const commandFailure = type({
	name: "'CommandExitError'",
	exitCode: "number.integer",
	stdout: "string",
	stderr: "string",
});

/** Both live states own resources; a paused sandbox is not usable until resumed. */
function phaseOf(value: NovitaRow): Phase {
	if (value.state === undefined || value.state === "running") return "ready";
	if (value.state === "paused") return "pending";
	throw new Error("Novita returned an unknown state");
}

export function novitaVendor(
	sdk: NovitaSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"novita">, "env" | "resolvedArtifact">,
): Vendor<NovitaRow, NativeSandbox> {
	const connection = {
		apiKey: env.NOVITA_API_KEY,
		domain: NOVITA_DOMAIN,
		requestTimeoutMs: CONTROL_TIMEOUT_MS,
	};
	const notFound = instanceOfAny(sdk.SandboxNotFoundError);
	const refusal = instanceOfAny(
		sdk.AuthenticationError,
		sdk.InvalidArgumentError,
		sdk.RateLimitError,
	);
	const rateLimited = instanceOfAny(sdk.RateLimitError);
	const record = (value: NovitaRow): VendorRecord<NovitaRow> => ({
		id: value.sandboxId,
		phase: phaseOf(value),
		...(value.metadata?.[NOVITA_ATTEMPT_KEY] !== undefined && {
			marker: value.metadata[NOVITA_ATTEMPT_KEY],
		}),
		raw: value,
	});
	// The SDK paginator is stateful: continue the one that issued a cursor, and forget it once
	// consumed, so the map holds at most one entry per listing in progress.
	const paginators = new Map<string, ReturnType<NovitaSdk["Sandbox"]["list"]>>();
	async function page(query: object, cursor: string | undefined): Promise<VendorPage<NovitaRow>> {
		const paginator =
			cursor === undefined ? sdk.Sandbox.list({ ...connection, query }) : paginators.get(cursor);
		if (!paginator) throw new Error("Novita continuation cursor is unknown");
		if (cursor !== undefined) paginators.delete(cursor);
		const records = rows.assert(await paginator.nextItems()).map(record);
		if (!paginator.hasNext) return { records };
		// An omitted token reaches the kit as "", which fails the listing closed.
		const next = paginator.nextToken ?? "";
		paginators.set(next, paginator);
		return { records, next };
	}

	return {
		control: {
			// Create returns a running sandbox: the response itself proves readiness.
			create: async ({ marker }) => {
				const native = await sdk.Sandbox.create(resolvedArtifact.ref, {
					...connection,
					requestTimeoutMs: 300_000,
					timeoutMs: 3 * 60 * 60_000,
					metadata: { [NOVITA_ATTEMPT_KEY]: marker },
				});
				return record({
					sandboxId: native.sandboxId,
					metadata: { [NOVITA_ATTEMPT_KEY]: marker },
					native,
				});
			},
			get: async (id) => {
				try {
					const info = await sdk.Sandbox.getInfo(id, connection);
					return record({ sandboxId: info.sandboxId, state: info.state, metadata: info.metadata });
				} catch (error) {
					if (notFound(error)) return null;
					throw error;
				}
			},
			// kill resolves once the sandbox is removed, so removal is proven, not acknowledged.
			remove: async (id) => {
				try {
					await sdk.Sandbox.kill(id, connection);
				} catch (error) {
					if (!notFound(error)) throw error;
				}
				return "removed";
			},
			page: (cursor) => page({ state: LIVE_STATES }, cursor),
			// A server-side metadata query; the kit still rejects any row another attempt owns.
			find: (marker, cursor) => page({ metadata: { [NOVITA_ATTEMPT_KEY]: marker } }, cursor),
			refused: (error) => (refusal(error) ? { retryable: rateLimited(error) } : undefined),
		},
		data: {
			attach: (value) => {
				if (!value.raw.native)
					throw new Error("Novita attaches only the sandbox its create returned");
				return value.raw.native;
			},
			exec: async (native, command, options?: ExecOptions) => {
				options?.signal?.throwIfAborted();
				try {
					return await native.commands.run(command, {
						...AS_ROOT,
						background: false,
						timeoutMs: 60_000,
					});
				} catch (error) {
					const result = commandFailure(error);
					if (!(result instanceof type.errors) && result.exitCode !== 0) return result;
					throw error;
				}
			},
			// The SDK applies E2B's 60s command timeout, so long steps launch in the background.
			launch: async (native, command, options) => {
				options?.signal?.throwIfAborted();
				const handle = await native.commands.run(command, {
					...AS_ROOT,
					background: true,
					timeoutMs: 0,
				});
				if (!Number.isSafeInteger(handle.pid) || handle.pid <= 0)
					throw new Error("Novita returned no positive process id");
			},
			files: {
				read: (native, path) => native.files.read(path, AS_ROOT),
				exists: (native, path) => native.files.exists(path, AS_ROOT),
				write: async (native, path, text) => {
					await native.files.write(path, text, AS_ROOT);
				},
			},
		},
	};
}
