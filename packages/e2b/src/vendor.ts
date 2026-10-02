// E2B's vendor adapter: translation only, over the pinned `e2b` SDK. Readiness, cleanup
// confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// Every command and file call runs as root in the foreground unless it is the durable launch.

import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorPage, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
import type { Sandbox as NativeSandbox } from "e2b";

/** The SDK surface the adapter translates; the package entry passes the real module. */
export type E2bSdk = Pick<
	typeof import("e2b"),
	| "Sandbox"
	| "SandboxNotFoundError"
	| "AuthenticationError"
	| "InvalidArgumentError"
	| "RateLimitError"
>;

export const E2B_SANDBOX_ID = type(/^i[a-z0-9]+$/);
/** A suite-length lifetime, so a leaked sandbox still expires on its own. */
export const E2B_SANDBOX_LIFETIME_MS = 3 * 60 * 60_000;
export const E2B_CONTROL_PLANE_TIMEOUT_MS = 5_000;
/** Every benchmark create writes its ownership marker under this metadata key. */
export const E2B_ATTEMPT_METADATA_KEY = "sandbox-benchmarks-attempt";
/** Live states an account sweep must see: a paused sandbox is still an allocation the account owns. */
export const E2B_INVENTORY_STATES = ["running", "paused"] as const;
const AS_ROOT = { user: "root" } as const;

const row = type({
	sandboxId: "string >= 1",
	"state?": "string",
	"metadata?": { "[string]": "string" },
});
const rows = row.array();
/** One sandbox row; a create's row also carries the native handle it returned. */
export type E2bRow = typeof row.infer & { readonly native?: NativeSandbox };
/** E2B's public nonzero-exit envelope, read by shape so a second SDK copy's class still counts. */
const commandFailure = type({
	name: "'CommandExitError'",
	exitCode: "number.integer",
	stdout: "string",
	stderr: "string",
});

/** A live state this adapter does not know still owns resources: failed, deleted, never released. */
function phaseOf({ state }: E2bRow): Phase {
	if (state === undefined || state === "running") return "ready";
	return state === "paused" ? "pending" : "failed";
}

export function e2bVendor(
	sdk: E2bSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"e2b">, "env" | "resolvedArtifact">,
): Vendor<E2bRow, NativeSandbox> {
	const control = { apiKey: env.E2B_API_KEY, requestTimeoutMs: E2B_CONTROL_PLANE_TIMEOUT_MS };
	const notFound = instanceOfAny(sdk.SandboxNotFoundError);
	const refusal = instanceOfAny(
		sdk.AuthenticationError,
		sdk.InvalidArgumentError,
		sdk.RateLimitError,
	);
	const rateLimited = instanceOfAny(sdk.RateLimitError);
	const record = (value: E2bRow): VendorRecord<E2bRow> => {
		const marker = value.metadata?.[E2B_ATTEMPT_METADATA_KEY];
		return { id: value.sandboxId, phase: phaseOf(value), ...(marker && { marker }), raw: value };
	};
	/** One page: a fresh paginator resumed from E2B's own continuation token. */
	async function page(
		query: NonNullable<Parameters<E2bSdk["Sandbox"]["list"]>[0]>["query"],
		cursor: string | undefined,
		signal: AbortSignal,
	): Promise<VendorPage<E2bRow>> {
		const paginator = sdk.Sandbox.list({ ...control, query, ...(cursor && { nextToken: cursor }) });
		const records = rows.assert(await paginator.nextItems({ ...control, signal })).map(record);
		// More pages without a token is an omitted cursor: the kit fails closed on "".
		return paginator.hasNext ? { records, next: paginator.nextToken ?? "" } : { records };
	}

	return {
		control: {
			// Create returns a running sandbox: the response itself proves readiness.
			create: async ({ marker }, { signal }) => {
				const metadata = { [E2B_ATTEMPT_METADATA_KEY]: marker };
				const native = await sdk.Sandbox.create(resolvedArtifact.ref, {
					apiKey: env.E2B_API_KEY,
					timeoutMs: E2B_SANDBOX_LIFETIME_MS,
					metadata,
					signal,
				});
				return record({ sandboxId: native.sandboxId, metadata, native });
			},
			get: async (id, { signal }) => {
				try {
					return record(row.assert(await sdk.Sandbox.getInfo(id, { ...control, signal })));
				} catch (error) {
					if (notFound(error)) return null;
					throw error;
				}
			},
			// kill resolves once the sandbox is removed (false when E2B no longer knows it).
			remove: async (id, { signal }) => {
				try {
					await sdk.Sandbox.kill(id, { ...control, signal });
				} catch (error) {
					if (!notFound(error)) throw error;
				}
				return "removed";
			},
			page: (cursor, { signal }) => page({ state: [...E2B_INVENTORY_STATES] }, cursor, signal),
			// A server-side metadata query; the kit still rejects any row another attempt owns.
			find: (marker, cursor, { signal }) =>
				page({ metadata: { [E2B_ATTEMPT_METADATA_KEY]: marker } }, cursor, signal),
			refused: (error) => (refusal(error) ? { retryable: rateLimited(error) } : undefined),
		},
		data: {
			attach: ({ raw }) => {
				if (!raw.native) throw new Error("E2B attaches only the sandbox its create returned");
				return raw.native;
			},
			exec: async (native, command, options?: ExecOptions) => {
				try {
					return await native.commands.run(command, {
						...AS_ROOT,
						background: false,
						...(options?.signal && { signal: options.signal }),
					});
				} catch (error) {
					const result = commandFailure(error);
					if (!(result instanceof type.errors) && result.exitCode !== 0) return result;
					throw error;
				}
			},
			// Background execution is accepted only once E2B returns a genuine positive process id.
			launch: async (native, command, options) => {
				const handle = await native.commands.run(command, {
					...AS_ROOT,
					background: true,
					// E2B's default 60s timeout kills the receipt-writing shell; the harness owns it.
					timeoutMs: 0,
					...(options?.signal && { signal: options.signal }),
				});
				if (!Number.isSafeInteger(handle.pid) || handle.pid <= 0)
					throw new Error("E2B background command returned no positive process id");
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
