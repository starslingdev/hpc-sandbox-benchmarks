// Munito Sandboxes' vendor adapter: translation only, over Munito's TypeScript SDK (`@munitoai/cli`),
// whose `Client` calls the public `/sandboxes/v1` REST API. Each answer is parsed with arktype.
// Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the driver kit
// (`@sandbox-benchmarks/driver/vendor`).
//
// A create carries the attempt's marker twice: as its Idempotency-Key, so a repeated create answers
// the sandbox of the first one, and in metadata, so a listing attributes the sandbox.
//
// The API keeps every ended sandbox (`stopped` or `failed`) as a record and never answers 404 for
// it. An ended sandbox holds no VM, so it reads as gone.

import { ApiError, Client } from "@munitoai/cli";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { matchesAnyCause } from "@sandbox-benchmarks/driver/errors";
import type {
	ControlPlane,
	ExecOutcome,
	Phase,
	Vendor,
	VendorRecord,
} from "@sandbox-benchmarks/driver/vendor";
import {
	abortableDelay,
	bounded,
	httpClassifiers,
	httpStatus,
	isMintedMarker,
	LEAK_EXPIRY_MS,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const MUNITO_API_BASE = "https://api.munito.ai/sandboxes/v1";
/** The SDK's own prefix of the sandbox routes, under its base URL. */
const SANDBOXES = "/sandboxes/v1/sandboxes";
/** `sbx_` and 26 characters of lower-case Crockford base32, which has no i, l, o or u. */
export const MUNITO_SANDBOX_ID = type(/^sbx_[0-9a-hjkmnp-tv-z]{26}$/);
/** The metadata key that carries the attempt's ownership marker. */
export const MUNITO_MARKER_KEY = "sandbox-benchmarks-attempt";
/** The largest root disk that a create can ask for with `disk_gib`, in GiB. */
export const MUNITO_DISK_GIB = 100;
/** The root disk of a sandbox that asks for none: the template's own, in GiB. */
export const MUNITO_TEMPLATE_DISK_GIB = 10;
/** The bound on one control-plane request other than a create. */
export const MUNITO_CONTROL_TIMEOUT_MS = 30_000;
/** A create answers when the VM runs. The API waits up to 90 s for a host, and this outlasts it. */
export const MUNITO_CREATE_TIMEOUT_MS = 100_000;
/** Attempts of one create, all with the same Idempotency-Key. */
export const MUNITO_CREATE_ATTEMPTS = 3;
const CREATE_RETRY_MS = 2_000;
/** The longest wait between two create attempts, also when Retry-After asks for more. */
export const MUNITO_CREATE_RETRY_MAX_MS = 10_000;
/**
 * The server's limit on one command (the API allows 1 to 1,800 s). The harness detaches each step
 * near the 60 s cap, so this limit stops only a command that nothing else stops.
 */
const EXEC_TIMEOUT_S = 300;
/** The client's bound on one exec: the command's limit and a margin for its answer. */
export const MUNITO_EXEC_TIMEOUT_MS = (EXEC_TIMEOUT_S + 30) * 1000;
/** The API gives its own call to the host 120 s for a file. */
const FILE_TIMEOUT_MS = 150_000;
/** The most sandboxes the API lists on one page. */
const PAGE_LIMIT = 100;

/** The API's presets, by their ceiling. */
const PRESETS = [
	{ size: "small", vcpus: 1, memoryMib: 1024 },
	{ size: "default", vcpus: 2, memoryMib: 4096 },
	{ size: "large", vcpus: 4, memoryMib: 8192 },
] as const;

export type MunitoSize = (
	| { readonly size: (typeof PRESETS)[number]["size"] }
	| { readonly vcpus: number; readonly memory_mib: number }
) & { readonly disk_gib?: number };

/**
 * The create fields for a shape: a preset by name (the 4 vCPU / 8 GiB target is `large`), else a
 * custom size inside the API's limits, and `disk_gib` for a disk larger than the template's. A
 * string is the reason the API would refuse the shape.
 */
export function munitoSize(
	spec: Pick<CreateRequest["spec"], "vcpus" | "memoryGb" | "diskGb">,
): MunitoSize | string {
	const disk = munitoDisk(spec.diskGb);
	if (typeof disk === "string") return disk;
	const memoryMib = spec.memoryGb * 1024;
	const preset = PRESETS.find((p) => p.vcpus === spec.vcpus && p.memoryMib === memoryMib);
	if (preset) return { size: preset.size, ...disk };
	if (!Number.isInteger(spec.vcpus) || spec.vcpus < 1 || spec.vcpus > 8)
		return `a Munito sandbox has 1 to 8 vCPUs, not ${spec.vcpus}`;
	if (
		!Number.isInteger(memoryMib) ||
		memoryMib % 256 !== 0 ||
		memoryMib < 512 ||
		memoryMib > 16_384
	)
		return `a Munito sandbox has 512 to 16,384 MiB of memory in steps of 256 MiB, not ${memoryMib} MiB`;
	if (memoryMib < spec.vcpus * 512)
		return "a Munito sandbox has at least 512 MiB of memory for each vCPU";
	return { vcpus: spec.vcpus, memory_mib: memoryMib, ...disk };
}

/** `disk_gib` in whole GiB for a disk larger than the template's, or the reason the API refuses it. */
function munitoDisk(diskGb: number | undefined): { readonly disk_gib?: number } | string {
	if (diskGb === undefined || diskGb <= MUNITO_TEMPLATE_DISK_GIB) return {};
	if (diskGb > MUNITO_DISK_GIB)
		return `a Munito sandbox has a root disk of ${MUNITO_TEMPLATE_DISK_GIB} to ${MUNITO_DISK_GIB} GiB, not ${diskGb} GiB`;
	return { disk_gib: Math.ceil(diskGb) };
}

const sandbox = type({
	id: MUNITO_SANDBOX_ID,
	status: "string",
	vcpus: "number",
	memory_mib: "number",
	"disk_gib?": "number",
	metadata: { "[string]": "string" },
	"end_reason?": "string | null",
});
type MunitoSandbox = typeof sandbox.infer;
const sandboxList = type({ data: sandbox.array(), has_more: "boolean" });
const execEvent = type.or(
	{ type: "'stdout' | 'stderr'", data: "string" },
	{ type: "'exit'", exit_code: "number.integer", timed_out: "boolean" },
	{ type: "'error'", error: { code: "string", message: "string" } },
);

/** The SDK's error anywhere in a cause chain: the API's refusal, with its status and stable `code`. */
function refusalOf(error: unknown): ApiError | undefined {
	let found: ApiError | undefined;
	matchesAnyCause(error, (cause) => {
		if (cause instanceof ApiError) found = cause;
		return found !== undefined;
	});
	return found;
}

// The SDK gives status 0 to an answer that it could not read as one: no HTTP status.
const status = httpStatus(ApiError, (error) => (error.status === 0 ? undefined : error.status));
const http = httpClassifiers(status);

/**
 * How the API's answers read in the port's terms. Only the sandbox's own not-found is removal: a
 * path the caller cannot use (no preview, or a key without access) also answers 404, with no code.
 * `no_capacity` means that each host refused the create, so nothing was allocated.
 */
export const munitoClassifiers = {
	absent: (error: unknown) =>
		status(error) === 404 && refusalOf(error)?.code === "sandbox_not_found",
	refused: (error: unknown) =>
		status(error) === 503 && refusalOf(error)?.code === "no_capacity"
			? { retryable: true }
			: http.refused(error),
	// A request that got no HTTP status (a dropped connection, or its own bound) proves nothing, so
	// a teardown asks again. A caller's abort is neither.
	transient: (error: unknown) =>
		http.transient(error) ||
		(status(error) === undefined &&
			matchesAnyCause(
				error,
				(cause) =>
					cause instanceof TypeError || (cause instanceof Error && cause.name === "TimeoutError"),
			)),
} satisfies Pick<ControlPlane, "absent" | "refused" | "transient">;

/**
 * `stopped` (deleted, or past its timeout) and `failed` (it did not start, or an error stopped it)
 * are ends: the VM is gone and only the record stays. An unknown status reads as still starting.
 */
export function munitoPhase(status: string): Phase {
	switch (status) {
		case "running":
			return "ready";
		case "stopped":
		case "failed":
			return "gone";
		default:
			return "pending";
	}
}

function record(row: MunitoSandbox): VendorRecord<MunitoSandbox> {
	const marker = row.metadata[MUNITO_MARKER_KEY];
	return {
		id: row.id,
		phase: munitoPhase(row.status),
		...(marker !== undefined && isMintedMarker(marker) && { marker }),
		// A start that failed holds nothing, and the API places a new create again, so it is retryable.
		...(row.status === "failed" && {
			detail: `failed with end reason ${row.end_reason ?? "unknown"}`,
			retryCreate: true,
		}),
		raw: row,
	};
}

/**
 * A command's outcome from its streamed events: text as the command writes it, then one `exit` or
 * `error` event. A stream that ends without either was cut, so it is never a result.
 */
export async function execOutcome(events: AsyncIterable<unknown>): Promise<ExecOutcome> {
	let stdout = "";
	let stderr = "";
	for await (const line of events) {
		const event = execEvent.assert(line);
		switch (event.type) {
			case "stdout":
				stdout += event.data;
				break;
			case "stderr":
				stderr += event.data;
				break;
			case "error":
				throw new Error(
					`Munito Sandboxes command failed: ${event.error.code}: ${event.error.message}`,
				);
			case "exit":
				if (event.timed_out)
					throw new Error(`Munito Sandboxes stopped the command at its ${EXEC_TIMEOUT_S} s limit`);
				// The API sends -1 when the host reported no exit code: unknown, never a made-up code.
				return { ...(event.exit_code >= 0 && { exitCode: event.exit_code }), stdout, stderr };
		}
	}
	throw new Error("Munito Sandboxes ended the command's output without an exit event");
}

/** Retry-After in seconds, when the answer sent a usable one. */
function retryAfterOf(response: Response): number | undefined {
	const header = response.headers.get("retry-after");
	const seconds = header === null ? Number.NaN : Number(header);
	return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
}

/** The wait before the next create attempt: Retry-After when the API sent one, within bounds. */
const retryDelayMs = (retryAfterS: number | undefined) =>
	Math.min(MUNITO_CREATE_RETRY_MAX_MS, Math.max(CREATE_RETRY_MS, (retryAfterS ?? 0) * 1000));

interface Call {
	readonly signal?: AbortSignal;
	readonly timeoutMs: number;
	/** Receives the Retry-After of the call's last answer. */
	readonly answer?: { retryAfterS?: number };
}

export interface MunitoVendorOptions {
	/** The wait between create attempts (test seam). */
	readonly delay?: (ms: number, signal?: AbortSignal) => Promise<void>;
}

/** The adapter over one transport: production binds `globalThis.fetch`, tests a fake router. The SDK
 * sends each request through it. */
export function munitoVendor(
	{ env }: Pick<DriverContext<"munito">, "env">,
	transport: typeof globalThis.fetch,
	{ delay = abortableDelay }: MunitoVendorOptions = {},
): Vendor<MunitoSandbox, MunitoSandbox> {
	// The SDK takes the API's base URL and adds the `/sandboxes/v1` prefix itself.
	const baseUrl = (env.MUNITO_SANDBOXES_URL ?? MUNITO_API_BASE)
		.replace(/\/+$/, "")
		.replace(/\/sandboxes\/v1$/, "");
	/**
	 * One SDK call within `timeoutMs` and the caller's signal, which the transport carries to each
	 * request. The SDK makes one attempt: the kit and this adapter own every retry. A non-2xx answer
	 * throws the SDK's `ApiError`.
	 */
	const call = <T>({ signal, timeoutMs, answer }: Call, run: (sdk: Client) => Promise<T>) =>
		bounded(signal, timeoutMs, (within) =>
			run(
				new Client({
					apiKey: env.MUNITO_API_KEY,
					baseUrl,
					attempts: 1,
					fetch: (async (input, init) => {
						const response = await transport(input, { ...init, signal: within });
						if (answer) answer.retryAfterS = retryAfterOf(response);
						return response;
					}) as typeof globalThis.fetch,
				}),
			),
		);
	const control = (signal: AbortSignal) => ({ signal, timeoutMs: MUNITO_CONTROL_TIMEOUT_MS });
	const sandboxPath = (id: string) => `${SANDBOXES}/${encodeURIComponent(id)}`;

	return {
		control: {
			// Every attempt carries the marker as its Idempotency-Key, so it answers the sandbox of the
			// first attempt that reached the API. A refusal allocated nothing and ends the create here,
			// and a conflict does not change when it is asked again.
			create: async ({ request: { spec }, marker }, { signal }) => {
				const size = munitoSize(spec);
				// The module's `unsupported` hook refuses such a shape before any vendor call.
				if (typeof size === "string") throw new Error(size);
				const json = {
					template: "base",
					...size,
					timeout: LEAK_EXPIRY_MS / 1000,
					metadata: { [MUNITO_MARKER_KEY]: marker },
					internet: true,
				};
				for (let attempt = 1; ; attempt++) {
					const answer: { retryAfterS?: number } = {};
					try {
						return record(
							sandbox.assert(
								await call({ signal, timeoutMs: MUNITO_CREATE_TIMEOUT_MS, answer }, (sdk) =>
									sdk.createSandbox(json, undefined, marker),
								),
							),
						);
					} catch (error) {
						const repeat =
							munitoClassifiers.transient(error) &&
							munitoClassifiers.refused(error) === undefined &&
							status(error) !== 409;
						if (attempt >= MUNITO_CREATE_ATTEMPTS || !repeat) throw error;
						await delay(retryDelayMs(answer.retryAfterS), signal);
					}
				}
			},
			get: async (id, { signal }) =>
				record(sandbox.assert(await call(control(signal), (sdk) => sdk.getSandbox(id)))),
			// The answer is the sandbox after the stop. `stopped` is the API's end state, and each
			// later read repeats it.
			remove: async (id, { signal }) => {
				const ended = sandbox.assert(
					await call(control(signal), (sdk) => sdk.request<unknown>("DELETE", sandboxPath(id))),
				);
				if (ended.id !== id)
					throw new Error(`Munito Sandboxes answered the delete of ${id} for ${ended.id}`);
				return munitoPhase(ended.status) === "gone" ? "removed" : "accepted";
			},
			// Newest first. The cursor is the id of the last sandbox on the previous page.
			page: async (cursor, { signal }) => {
				const after = cursor === undefined ? "" : `&after=${encodeURIComponent(cursor)}`;
				const listed = sandboxList.assert(
					await call(control(signal), (sdk) =>
						sdk.request<unknown>("GET", `${SANDBOXES}?limit=${PAGE_LIMIT}${after}`),
					),
				);
				return {
					records: listed.data.map(record),
					...(listed.has_more && { next: listed.data.at(-1)?.id ?? "" }),
				};
			},
			...munitoClassifiers,
		},
		data: {
			attach: ({ raw }) => raw,
			// The record reports the size and the disk that the API allocated; the kit proves the disk
			// with df after.
			prepare: async ({ record: { raw } }, { spec }) => {
				const disk = raw.disk_gib ?? MUNITO_TEMPLATE_DISK_GIB;
				if (raw.vcpus !== spec.vcpus || raw.memory_mib !== spec.memoryGb * 1024)
					return {
						status: "unsupported",
						detail: `requested ${spec.vcpus} vCPU / ${spec.memoryGb * 1024} MiB but the sandbox reports ${raw.vcpus} vCPU / ${raw.memory_mib} MiB`,
					};
				if (spec.diskGb !== undefined && disk < spec.diskGb)
					return {
						status: "unsupported",
						detail: `requested a ${spec.diskGb} GiB disk but the sandbox reports ${disk} GiB`,
					};
				return { status: "honored" };
			},
			// A string runs in `bash -lc`. The streamed answer has no 1 MiB cut, unlike a buffered one.
			exec: ({ id }, command, options) =>
				call(
					{ ...(options?.signal && { signal: options.signal }), timeoutMs: MUNITO_EXEC_TIMEOUT_MS },
					(sdk) => execOutcome(sdk.execStream(id, { command, timeout: EXEC_TIMEOUT_S })),
				),
			// `exists` is the kit's quoted `test -e`.
			files: {
				read: ({ id }, path) =>
					call({ timeoutMs: FILE_TIMEOUT_MS }, (sdk) => sdk.readFile(id, path)),
				write: async ({ id }, path, text) => {
					await call({ timeoutMs: FILE_TIMEOUT_MS }, (sdk) => sdk.writeFile(id, path, text));
				},
			},
		},
	};
}
