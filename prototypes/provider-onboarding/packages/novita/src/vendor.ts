// Novita's vendor adapter: translation only. It receives the SDK; it never loads it.

import type { DriverContext, ExecOptions } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import { type } from "arktype";
import type { Sandbox as NativeSandbox } from "novita-sandbox";
import type { Vendor, VendorPage, VendorRecord } from "../../driver-vendor/src/vendor.ts";
import type { NovitaSdk } from "./sdk.ts";
import { NOVITA_DOMAIN } from "./sdk.ts";

export const NOVITA_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);
const KEY = "sandbox-benchmarks-attempt";
const AS_ROOT = { user: "root", requestTimeoutMs: 5000 } as const;
const row = type({ sandboxId: "string >= 1", "metadata?": { "[string]": "string" } });
type Row = typeof row.infer & { readonly native?: NativeSandbox };
const commandFailure = type({
	name: "'CommandExitError'",
	exitCode: "number.integer",
	stdout: "string",
	stderr: "string",
});

export function novitaVendor(
	sdk: NovitaSdk,
	{ env, resolvedArtifact }: Pick<DriverContext<"novita">, "env" | "resolvedArtifact">,
): Vendor<Row, NativeSandbox> {
	const connection = { apiKey: env.NOVITA_API_KEY, domain: NOVITA_DOMAIN, requestTimeoutMs: 5000 };
	const is =
		(...classes: ReadonlyArray<abstract new (...args: never[]) => unknown>) =>
		(error: unknown) =>
			matchesAnyCause(error, (cause) => classes.some((errorClass) => cause instanceof errorClass));
	const notFound = is(sdk.SandboxNotFoundError);
	// Every live state owns resources; Novita's create returns a running sandbox.
	const record = (value: Row): VendorRecord<Row> => ({
		id: value.sandboxId,
		phase: "ready",
		...(value.metadata?.[KEY] !== undefined && { marker: value.metadata[KEY] }),
		raw: value,
	});
	// The SDK paginator is stateful; continue the one that issued the cursor.
	const paginators = new Map<string, ReturnType<NovitaSdk["Sandbox"]["list"]>>();
	async function page(query: object, cursor: string | undefined): Promise<VendorPage<Row>> {
		const paginator =
			cursor === undefined ? sdk.Sandbox.list({ ...connection, query }) : paginators.get(cursor);
		if (!paginator) throw new Error("Novita continuation cursor is unknown");
		const records = row
			.array()
			.assert(await paginator.nextItems())
			.map(record);
		if (!paginator.hasNext) return { records };
		const next = paginator.nextToken ?? "";
		paginators.set(next, paginator);
		return { records, next };
	}

	return {
		control: {
			create: async ({ marker }) => {
				const native = await sdk.Sandbox.create(resolvedArtifact.ref, {
					...connection,
					requestTimeoutMs: 300_000,
					timeoutMs: 3 * 60 * 60_000,
					metadata: { [KEY]: marker },
				});
				return record({ sandboxId: native.sandboxId, metadata: { [KEY]: marker }, native });
			},
			get: async (id) => {
				try {
					const info = await sdk.Sandbox.getInfo(id, connection);
					if (info.state !== "running" && info.state !== "paused")
						throw new Error("Novita returned an unknown state");
					return record({ sandboxId: info.sandboxId, metadata: info.metadata });
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
			page: (cursor) => page({ state: ["running", "paused"] }, cursor),
			find: (marker, cursor) => page({ metadata: { [KEY]: marker } }, cursor),
			refused: (error) =>
				is(sdk.AuthenticationError, sdk.InvalidArgumentError, sdk.RateLimitError)(error)
					? { retryable: is(sdk.RateLimitError)(error) }
					: undefined,
		},
		data: {
			attach: (value) => value.raw.native ?? sdk.Sandbox.connect(value.id, connection),
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
			launch: async (native, command) => {
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
