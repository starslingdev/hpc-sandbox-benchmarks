// briq's vendor adapter: translation only, over the typed client of @briq-cloud/sdk (the REST API).
// Readiness, cleanup confirmation, recovery, inventory, the file fallback and the disk proof live in
// the driver kit.

import { AsyncLocalStorage } from "node:async_hooks";
import { Briq, BriqApiError } from "@briq-cloud/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { httpClassifiers, httpStatus, isMintedMarker } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const BRIQ_ID = type(/^bq_[A-Za-z0-9]+$/);
/** Groups the benchmark's sandboxes in the dashboard; ownership is the marker label. */
const STACK = "sandbox-benchmarks";
/** Where the toolchain keeps the state the benchmark writes (PTS installs and results). */
export const BRIQ_DATA_DIR = "/var/lib/phoronix-test-suite";

/** The label that carries the create's ownership marker. */
export const MARKER_LABEL = "benchmark-marker";
/** The bound on one control request; the kit's `controlTimeoutMs` bounds each read as well. */
export const CONTROL_TIMEOUT_MS = 30_000;
/** The REST exec runs a command for at most 60 s; longer steps are detached by the kit. */
export const EXEC_TIMEOUT_MS = 60_000;

/** The sizes briq offers (vCPU / GiB): nothing in between exists. */
export const BRIQ_SIZES = [
	{ name: "small", cpu: 1, memoryGb: 2 },
	{ name: "medium", cpu: 2, memoryGb: 4 },
	{ name: "large", cpu: 4, memoryGb: 8 },
	{ name: "xlarge", cpu: 8, memoryGb: 16 },
] as const;
type Size = (typeof BRIQ_SIZES)[number];

/** The smallest size covering both axes: the benchmark's 4 vCPU / 8 GiB is exactly `large`. */
export function coveringSize(spec: Pick<CreateRequest["spec"], "vcpus" | "memoryGb">) {
	return BRIQ_SIZES.find((size) => size.cpu >= spec.vcpus && size.memoryGb >= spec.memoryGb);
}

export const OFFERED_SIZES = BRIQ_SIZES.map(
	(size) => `${size.name} (${size.cpu} vCPU / ${size.memoryGb} GiB)`,
).join(", ");

/** The module's `unsupported` hook refuses any request no size covers before a create is sent. */
function sizeFor(spec: CreateRequest["spec"]): Size {
	const size = coveringSize(spec);
	if (!size) throw new Error(`no briq size covers the request (${OFFERED_SIZES})`);
	return size;
}

/** A briq's name is a DNS label of at most 32 characters; the marker's uuid makes it unique. */
export function briqName(marker: string): string {
	return `bm-${marker
		.replace(/^benchmark-/, "")
		.replaceAll("-", "")
		.slice(-28)}`;
}

const briq = type({
	id: BRIQ_ID,
	name: "string",
	state:
		"'creating' | 'running' | 'stopping' | 'stopped' | 'sleeping' | 'starting' | 'resizing' | 'moving' | 'destroying' | 'destroyed' | 'error'",
	size: "string",
	"labels?": type({ "[string]": "string" }),
	"error?": "string | null",
	"stoppedReason?": "string | null",
}).onUndeclaredKey("ignore");
type BriqRow = typeof briq.infer;
const one = type({ briq }).onUndeclaredKey("ignore");
const many = type({ briqs: briq.array() }).onUndeclaredKey("ignore");
const execResult = type({
	stdout: "string",
	stderr: "string",
	exitCode: "number",
	timedOut: "boolean",
	truncated: "boolean",
}).onUndeclaredKey("ignore");

const status = httpStatus(BriqApiError, (error) => error.status);
const classifiers = httpClassifiers(status);
/**
 * Asked again rather than failed: the kit's classes, plus a request that reached no HTTP status (a
 * dropped connection or the request's own bound; a caller's abort is neither). A teardown that gave
 * up on these would leak a briq.
 */
const transient = (error: unknown) =>
	status(error) === undefined
		? error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError")
		: classifiers.transient(error);

/**
 * A sleeping or stopped briq keeps its disk, holds no compute, and wakes on the next call: it is
 * "ready" and flagged `stopped`. One that stopped because its own process ended (`exited`) will
 * not wake by itself, so it counts as failed.
 */
export function briqPhase(row: Pick<BriqRow, "state" | "stoppedReason">): Phase {
	switch (row.state) {
		case "running":
			return "ready";
		case "sleeping":
		case "stopping":
		case "stopped":
			return row.state === "stopped" && row.stoppedReason === "exited" ? "failed" : "ready";
		case "destroying":
			return "deleting";
		case "destroyed":
			return "gone";
		case "error":
			return "failed";
		default:
			return "pending";
	}
}

function record(row: BriqRow): VendorRecord<BriqRow> {
	const marker = row.labels?.[MARKER_LABEL];
	return {
		id: row.id,
		phase: briqPhase(row),
		...(marker !== undefined && isMintedMarker(marker) && { marker }),
		...(row.state === "sleeping" || row.state === "stopped" || row.state === "stopping"
			? { stopped: true }
			: {}),
		...(row.error && { detail: row.error }),
		raw: row,
	};
}

/** The adapter over one transport: production binds `globalThis.fetch`, tests a fake router. */
export function briqVendor(
	{ env, resolvedArtifact }: Pick<DriverContext<"briq">, "env" | "resolvedArtifact">,
	transport: typeof globalThis.fetch,
): Vendor<BriqRow, BriqRow> {
	// The client has no caller-signal option. Scope each call's signal into the transport, so one
	// client serves every call and a cancelled create or exec is abandoned at once.
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
	const client = new Briq(env.BRIQ_API_KEY, {
		...(env.BRIQ_API_URL && { baseUrl: env.BRIQ_API_URL }),
		fetch,
	});
	async function call<T>(signal: AbortSignal, timeoutMs: number, work: () => Promise<T>) {
		const bound = AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]);
		const result = await signals.run(bound, work);
		bound.throwIfAborted();
		return result;
	}

	// What each marker asked for, so an ambiguous create can be replayed under the same key.
	const requests = new Map<string, CreateRequest["spec"]>();
	const run = async (marker: string, spec: CreateRequest["spec"], signal: AbortSignal) => {
		const size = sizeFor(spec);
		const created = await call(signal, CONTROL_TIMEOUT_MS, () =>
			client.run(
				{
					stack: STACK,
					wait: false,
					spec: {
						name: briqName(marker),
						image: resolvedArtifact.ref,
						size: size.name,
						// The image's own command is not a long-lived process; the harness drives it by exec.
						cmd: ["sleep", "infinity"],
						// The image's own disk is small: the requested capacity is a volume mounted where the
						// toolchain keeps its state, and the kit proves it there after boot.
						...(spec.diskGb === undefined
							? {}
							: { volume: { mount: BRIQ_DATA_DIR, gb: spec.diskGb } }),
						labels: { [MARKER_LABEL]: marker },
					},
				},
				// The marker is the Idempotency-Key: repeating the call returns the same briq.
				{ idempotencyKey: marker },
			),
		);
		const [row] = created.briqs;
		if (!row || created.briqs.length !== 1)
			throw new Error(`briq answered a create with ${created.briqs.length} briqs`);
		return briq.assert(row);
	};
	const get = async (id: string, signal: AbortSignal) =>
		one.assert(await call(signal, CONTROL_TIMEOUT_MS, () => client.status(id))).briq;

	return {
		control: {
			// The create answers `creating`: readiness is observed by GET.
			create: async ({ request: { spec }, marker }, { signal }) => {
				requests.set(marker, spec);
				return { ...record(await run(marker, spec, signal)), phase: "pending" };
			},
			get: async (id, { signal }) => record(await get(id, signal)),
			remove: async (id, { signal }) => {
				const { briq: row } = one.assert(
					await call(signal, CONTROL_TIMEOUT_MS, () => client.destroy(id)),
				);
				return row.state === "destroyed" ? "removed" : "accepted";
			},
			// One unpaged listing of the dedicated team, destroyed briqs included.
			page: async (_cursor, { signal }) => ({
				records: many
					.assert(await call(signal, CONTROL_TIMEOUT_MS, () => client.list({ all: true })))
					.briqs.map(record),
			}),
			// Dedicated account: replaying the create's key returns its canonical briq, which is then
			// read fresh (the replay repeats the `creating` snapshot of the first answer).
			find: async (marker, _cursor, { signal }) => {
				const spec = requests.get(marker);
				if (!spec) return { records: [] };
				const replayed = await run(marker, spec, signal);
				return { records: [record(await get(replayed.id, signal))] };
			},
			...classifiers,
			transient,
		},
		data: {
			attach: ({ raw }) => raw,
			// The control plane reports the allocated size; the request maps to exactly one size.
			prepare: async ({ record: { raw } }, { spec }) => {
				const want = sizeFor(spec);
				return raw.size === want.name
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${want.name} (${want.cpu} vCPU / ${want.memoryGb} GiB) but the briq reports ${raw.size}`,
						};
			},
			exec: async (native, command, options) => {
				const exec = () =>
					client.exec(native.id, ["/bin/bash", "-lc", command], { timeoutMs: EXEC_TIMEOUT_MS });
				const result = execResult.assert(
					await call(
						options?.signal ?? new AbortController().signal,
						EXEC_TIMEOUT_MS + CONTROL_TIMEOUT_MS,
						exec,
					),
				);
				// The vendor port has no truncation field, so partial output must not pass as success.
				if (result.truncated) throw new Error("briq exec output was truncated by the provider");
				return {
					// A command that timed out has no exit status: recorded as unknown, never zero.
					...(!result.timedOut && { exitCode: result.exitCode }),
					stdout: result.stdout,
					stderr: result.stderr,
				};
			},
		},
	};
}
