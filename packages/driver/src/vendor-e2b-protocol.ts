// @sandbox-benchmarks/driver/vendor/e2b-protocol — one vendor adapter for every SDK of the E2B
// protocol (E2B's own SDK, and the E2B-compatible SDKs other vendors publish). It imports no SDK:
// each provider package injects its own library, which it alone imports (ADR-0023 §2), and states
// only how its vendor differs.
//
// Every command and file call runs as root in the foreground unless it is the durable launch.

import type { ExecOptions } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorPage, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { instanceOfAny, LEAK_EXPIRY_MS } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

/** The metadata key every benchmark create writes its ownership marker under. */
export const E2B_ATTEMPT_KEY = "sandbox-benchmarks-attempt";
/** The bound on one control-plane request. */
export const E2B_CONTROL_TIMEOUT_MS = 5_000;
/** Live states an account sweep must see: a paused sandbox is still an allocation the account owns. */
export const E2B_LIVE_STATES = ["running", "paused"] as const;

/** Options every SDK call of the protocol accepts. */
interface CallOptions {
	readonly apiKey?: string;
	readonly domain?: string;
	readonly requestTimeoutMs?: number;
	readonly signal?: AbortSignal;
}
interface GuestOptions {
	readonly user: "root";
	readonly requestTimeoutMs?: number;
}
interface RunOptions extends GuestOptions {
	readonly timeoutMs?: number;
	readonly signal?: AbortSignal;
}

/** The native sandbox handle a protocol SDK's create returns. */
export interface E2bProtocolSandbox {
	readonly sandboxId: string;
	readonly commands: {
		run(
			command: string,
			options: RunOptions & { readonly background: true },
		): Promise<{ readonly pid: number }>;
		run(
			command: string,
			options: RunOptions & { readonly background?: false },
		): Promise<{ readonly exitCode: number; readonly stdout: string; readonly stderr: string }>;
	};
	readonly files: {
		read(path: string, options: GuestOptions): Promise<string>;
		exists(path: string, options: GuestOptions): Promise<boolean>;
		write(path: string, text: string, options: GuestOptions): Promise<unknown>;
	};
}

type ErrorClass = abstract new (...args: never[]) => unknown;

/** The SDK surface the adapter translates, structurally: each package passes its loaded module. */
export interface E2bProtocolSdk<Native extends E2bProtocolSandbox> {
	readonly Sandbox: {
		create(
			template: string,
			options: CallOptions & { readonly timeoutMs: number; metadata: Record<string, string> },
		): Promise<Native>;
		getInfo(id: string, options: CallOptions): Promise<unknown>;
		kill(id: string, options: CallOptions): Promise<unknown>;
		list(
			options: CallOptions & {
				readonly query: {
					readonly state?: Array<(typeof E2B_LIVE_STATES)[number]>;
					readonly metadata?: Record<string, string>;
				};
				readonly nextToken?: string;
			},
		): {
			readonly hasNext: boolean;
			readonly nextToken?: string | undefined;
			nextItems(options?: CallOptions): Promise<unknown>;
		};
	};
	readonly SandboxNotFoundError: ErrorClass;
	readonly AuthenticationError: ErrorClass;
	readonly InvalidArgumentError: ErrorClass;
	readonly RateLimitError: ErrorClass;
}

/** What one vendor of the protocol states: its binding and how it differs. */
export interface E2bProtocolOptions {
	/** How diagnostics name the vendor. */
	readonly vendor: string;
	readonly apiKey: string | undefined;
	/** The resolved template every create boots. */
	readonly template: string;
	/** The vendor's control-plane domain, where it is not the SDK's default. */
	readonly domain?: string;
	/**
	 * `true`: the SDK honours the caller's signal on every call, which it then receives. Omitted or
	 * `false`, the safe reading: it may not, so every guest call is bounded by the control-plane
	 * timeout (the kit already races each control-plane read and starts no call on a cancelled
	 * signal).
	 */
	readonly signals?: boolean;
	/** The create request's own bound, where the SDK's default does not serve. */
	readonly createRequestTimeoutMs?: number;
	/** The foreground command timeout, where the SDK's default does not serve. */
	readonly execTimeoutMs?: number;
}

const row = type({
	sandboxId: "string >= 1",
	"state?": "string",
	"metadata?": { "[string]": "string" },
});
const rows = row.array();
/** One sandbox row; a create's row also carries the native handle it returned. */
export type E2bProtocolRow<Native> = typeof row.infer & { readonly native?: Native };
/** The protocol's nonzero-exit envelope, read by shape so a second SDK copy's class still counts. */
const commandFailure = type({
	name: "'CommandExitError'",
	exitCode: "number.integer",
	stdout: "string",
	stderr: "string",
});

/**
 * Both live states own resources; a paused sandbox is not usable until resumed. A state this
 * adapter does not know is read as failed: it still owns resources and is deleted, never released.
 */
function phaseOf({ state }: { readonly state?: string }): Phase {
	if (state === undefined || state === "running") return "ready";
	return state === "paused" ? "pending" : "failed";
}

export function e2bProtocolVendor<Native extends E2bProtocolSandbox>(
	sdk: E2bProtocolSdk<Native>,
	options: E2bProtocolOptions,
): Vendor<E2bProtocolRow<Native>, Native> {
	const { vendor, apiKey, template, domain, signals = false } = options;
	const connection: CallOptions = {
		apiKey,
		...(domain !== undefined && { domain }),
		requestTimeoutMs: E2B_CONTROL_TIMEOUT_MS,
	};
	/** A control-plane call's options, carrying the caller's signal where the SDK honours it. */
	const bound = (signal: AbortSignal): CallOptions =>
		signals ? { ...connection, signal } : connection;
	const asRoot: GuestOptions = {
		user: "root",
		...(!signals && { requestTimeoutMs: E2B_CONTROL_TIMEOUT_MS }),
	};
	/** A guest command's options, carrying the caller's signal where the SDK honours it. */
	const guest = (execOptions: ExecOptions | undefined) => ({
		...asRoot,
		...(signals && execOptions?.signal && { signal: execOptions.signal }),
	});
	const refusal = instanceOfAny(
		sdk.AuthenticationError,
		sdk.InvalidArgumentError,
		sdk.RateLimitError,
	);
	const rateLimited = instanceOfAny(sdk.RateLimitError);
	const record = (value: E2bProtocolRow<Native>): VendorRecord<E2bProtocolRow<Native>> => {
		const marker = value.metadata?.[E2B_ATTEMPT_KEY];
		return { id: value.sandboxId, phase: phaseOf(value), ...(marker && { marker }), raw: value };
	};
	/** One page: a fresh paginator resumed from the vendor's own continuation token. */
	async function page(
		query: Parameters<E2bProtocolSdk<Native>["Sandbox"]["list"]>[0]["query"],
		cursor: string | undefined,
		signal: AbortSignal,
	): Promise<VendorPage<E2bProtocolRow<Native>>> {
		const paginator = sdk.Sandbox.list({
			...connection,
			query,
			...(cursor && { nextToken: cursor }),
		});
		const items = await (signals ? paginator.nextItems(bound(signal)) : paginator.nextItems());
		const records = rows.assert(items).map(record);
		// More pages without a token is an omitted cursor: the kit fails closed on "".
		return paginator.hasNext ? { records, next: paginator.nextToken ?? "" } : { records };
	}

	return {
		control: {
			// Create returns a running sandbox: the response itself proves readiness.
			create: async ({ marker }, { signal }) => {
				const metadata = { [E2B_ATTEMPT_KEY]: marker };
				const native = await sdk.Sandbox.create(template, {
					apiKey,
					...(domain !== undefined && { domain }),
					...(options.createRequestTimeoutMs !== undefined && {
						requestTimeoutMs: options.createRequestTimeoutMs,
					}),
					timeoutMs: LEAK_EXPIRY_MS,
					metadata,
					...(signals && { signal }),
				});
				return record({ sandboxId: native.sandboxId, metadata, native });
			},
			// The whole getInfo payload stays the raw record (the describe probe returns it).
			get: async (id, { signal }) =>
				record(row.assert(await sdk.Sandbox.getInfo(id, bound(signal)))),
			// kill resolves once the sandbox is removed, so removal is proven, not acknowledged.
			remove: async (id, { signal }) => {
				await sdk.Sandbox.kill(id, bound(signal));
				return "removed";
			},
			absent: instanceOfAny(sdk.SandboxNotFoundError),
			page: (cursor, { signal }) => page({ state: [...E2B_LIVE_STATES] }, cursor, signal),
			// A server-side metadata query; the kit still rejects any row another attempt owns.
			find: (marker, cursor, { signal }) =>
				page({ metadata: { [E2B_ATTEMPT_KEY]: marker } }, cursor, signal),
			refused: (error) => (refusal(error) ? { retryable: rateLimited(error) } : undefined),
		},
		data: {
			attach: ({ raw }) => {
				if (!raw.native) throw new Error(`${vendor} attaches only the sandbox its create returned`);
				return raw.native;
			},
			exec: async (native, command, execOptions?: ExecOptions) => {
				try {
					return await native.commands.run(command, {
						...guest(execOptions),
						background: false,
						...(options.execTimeoutMs !== undefined && { timeoutMs: options.execTimeoutMs }),
					});
				} catch (error) {
					const result = commandFailure(error);
					if (!(result instanceof type.errors) && result.exitCode !== 0) return result;
					throw error;
				}
			},
			// Background execution is accepted only once the vendor returns a positive process id.
			launch: async (native, command, execOptions) => {
				const handle = await native.commands.run(command, {
					...guest(execOptions),
					background: true,
					// The SDK's default 60s timeout kills the receipt-writing shell; the harness owns it.
					timeoutMs: 0,
				});
				if (!Number.isSafeInteger(handle.pid) || handle.pid <= 0)
					throw new Error(`${vendor} background command returned no positive process id`);
			},
			files: {
				read: (native, path) => native.files.read(path, asRoot),
				exists: (native, path) => native.files.exists(path, asRoot),
				write: async (native, path, text) => {
					await native.files.write(path, text, asRoot);
				},
			},
		},
	};
}
