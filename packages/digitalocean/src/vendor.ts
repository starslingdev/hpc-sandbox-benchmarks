// DigitalOcean MicroVMs' vendor adapter: translation only, over the documented `/v2/microvms` REST
// API (the official client, @digitalocean/dots 1.20.0, predates MicroVMs). Readiness, cleanup
// confirmation, recovery, inventory, the file fallback and the disk proof live in the driver kit.

import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	abortableDelay,
	bounded,
	httpClassifiers,
	httpStatus,
	isMintedMarker,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

const API_BASE = "https://api.digitalocean.com/v2/microvms";
/** MicroVMs run only in MKC1 during the public preview. */
const REGION = "mkc1";
/**
 * Auto-pause cannot be disabled; this is the documented maximum. Idle means no traffic, and every
 * harness poll is traffic, so only an abandoned MicroVM pauses (keeping its processes, resumable).
 */
const IDLE_TIMEOUT = "4h";
/** Groups the benchmark's MicroVMs in the console; ownership is the name. */
const TAG = "sandbox-benchmarks";
/** The bound on one control request; reads are also bounded by the kit's control timeout. */
const CONTROL_TIMEOUT_MS = 30_000;
/**
 * Exec documents a 60s limit, but a command still running at ~41-45s never answers: the gateway
 * holds the request ~125s and returns 524 (measured 2026-10-14). Bounded past the real limit.
 */
const EXEC_TIMEOUT_MS = 60_000;
/** Exec is limited team-wide (60/min, 32 concurrent); a 429 is waited out, not failed. */
const EXEC_RATE_LIMIT_ATTEMPTS = 6;
const EXEC_RATE_LIMIT_BACKOFF_MS = 2_000;

export const DIGITALOCEAN_MICROVM_ID = type("string.uuid");

/** The vCPU / memory (MiB) pairs DigitalOcean offers; nothing in between exists. */
export const DIGITALOCEAN_SIZES = [
	{ cpu: 1, memory: 2048 },
	{ cpu: 2, memory: 4096 },
	{ cpu: 8, memory: 16384 },
	{ cpu: 16, memory: 32768 },
] as const;
type Size = (typeof DIGITALOCEAN_SIZES)[number];

/**
 * The smallest offered pair covering both axes: the benchmark's 4 vCPU / 8 GiB runs on 8 / 16 GiB,
 * which observed specs record and the leaderboard flags. `undefined` when no pair covers it.
 */
export function coveringSize(spec: Pick<CreateRequest["spec"], "vcpus" | "memoryGb">) {
	return DIGITALOCEAN_SIZES.find(
		(size) => size.cpu >= spec.vcpus && size.memory >= spec.memoryGb * 1024,
	);
}

export const OFFERED_SIZES = DIGITALOCEAN_SIZES.map(
	(size) => `${size.cpu} vCPU / ${size.memory / 1024} GiB`,
).join(", ");

/** The module's `unsupported` hook refuses any request no pair covers before a create is sent. */
function sizeFor(spec: CreateRequest["spec"]): Size {
	const size = coveringSize(spec);
	if (!size) throw new Error(`no DigitalOcean MicroVM size covers the request (${OFFERED_SIZES})`);
	return size;
}

const microvm = type({
	id: DIGITALOCEAN_MICROVM_ID,
	name: "string",
	state: "string",
	"failure_reason?": "string",
	"size?": type({ cpu: "number", memory: "number" }).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");
type MicroVm = typeof microvm.infer;
const one = type({ microvm }).onUndeclaredKey("ignore");
const many = type({
	"microvms?": microvm.array().or("null"),
	"links?": type({
		"pages?": type({ "next?": "string" }).onUndeclaredKey("ignore"),
	}).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");
const execResult = type({
	"stdout?": "string",
	"stderr?": "string",
	"exit_code?": "number",
	"truncated?": "boolean",
}).onUndeclaredKey("ignore");
const errorBody = type({ "code?": "string", "message?": "string" }).onUndeclaredKey("ignore");

/** A non-2xx answer, carrying the documented `{code, message}` error body. */
class DigitalOceanError extends Error {
	constructor(
		readonly status: number,
		readonly code: string | undefined,
		message: string,
	) {
		super(`DigitalOcean MicroVMs ${status}${code ? ` ${code}` : ""}: ${message}`);
		this.name = "DigitalOceanError";
	}
}
const status = httpStatus(DigitalOceanError, (error) => error.status);
const classifiers = httpClassifiers(status);
/** A DELETE sent while the MicroVM is still `creating` is refused until it is running or failed. */
const stillProvisioning = (error: unknown) =>
	error instanceof DigitalOceanError && error.code === "FAILED_PRECONDITION";

/**
 * A paused MicroVM still holds its memory, disk and processes (and counts against the team's
 * limits), and any exec resumes it, so pause is "ready", never "stopped".
 */
export function digitalOceanPhase({ state }: Pick<MicroVm, "state">): Phase {
	switch (state) {
		case "running":
		case "pausing":
		case "paused":
		case "resuming":
			return "ready";
		case "terminating":
			return "deleting";
		case "terminated":
			return "gone";
		case "failed":
			return "failed";
		default:
			return "pending";
	}
}

function record(row: MicroVm): VendorRecord<MicroVm> {
	return {
		id: row.id,
		phase: digitalOceanPhase(row),
		...(isMintedMarker(row.name) && { marker: row.name }),
		...(row.failure_reason && { detail: row.failure_reason }),
		raw: row,
	};
}

/** The adapter over one transport: production binds `globalThis.fetch`, tests a fake router. */
export function digitalOceanVendor(
	{ env, resolvedArtifact }: Pick<DriverContext<"digitalocean">, "env" | "resolvedArtifact">,
	transport: typeof globalThis.fetch,
	delay: (ms: number, signal?: AbortSignal) => Promise<void> = abortableDelay,
): Vendor<MicroVm, MicroVm> {
	const request = (
		method: string,
		path: string,
		{ body, signal, timeoutMs }: { body?: unknown; signal?: AbortSignal; timeoutMs: number },
	): Promise<unknown> =>
		bounded(signal, timeoutMs, async (within) => {
			const response = await transport(`${API_BASE}${path}`, {
				method,
				headers: {
					Authorization: `Bearer ${env.DIGITAL_OCEAN_TOKEN}`,
					...(body !== undefined && { "Content-Type": "application/json" }),
				},
				...(body !== undefined && { body: JSON.stringify(body) }),
				signal: within,
			});
			const text = await response.text();
			let parsed: unknown;
			try {
				parsed = text ? JSON.parse(text) : undefined;
			} catch {
				parsed = undefined;
			}
			if (response.ok) return parsed;
			const error = errorBody(parsed);
			const { code, message } = error instanceof type.errors ? {} : error;
			throw new DigitalOceanError(
				response.status,
				code,
				message ?? (text.slice(0, 200) || response.statusText),
			);
		});
	const control = (method: string, path: string, signal: AbortSignal, body?: unknown) =>
		request(method, path, { body, signal, timeoutMs: CONTROL_TIMEOUT_MS });
	const listPage = async (query: string, cursor: string | undefined, signal: AbortSignal) => {
		const page = many.assert(
			await control("GET", `?per_page=200&page=${cursor ?? "1"}${query}`, signal),
		);
		const next = page.links?.pages?.next;
		return {
			records: (page.microvms ?? []).map(record),
			...(next !== undefined && { next: new URL(next).searchParams.get("page") ?? "" }),
		};
	};

	return {
		control: {
			// The 201 carries `creating`: readiness is observed by GET.
			create: async ({ request: { spec }, marker }, { signal }) => {
				const created = one.assert(
					await control("POST", "", signal, {
						name: marker,
						region: REGION,
						size: sizeFor(spec),
						source: { oci_ref: resolvedArtifact.ref },
						auto_pause: { idle_timeout: IDLE_TIMEOUT },
						tags: [TAG],
					}),
				).microvm;
				return { ...record(created), phase: "pending" };
			},
			get: async (id, { signal }) =>
				record(one.assert(await control("GET", `/${id}`, signal)).microvm),
			// 204 is an acknowledgement; the kit reads on until the GET answers 404.
			remove: async (id, { signal }) => {
				await control("DELETE", `/${id}`, signal);
				return "accepted";
			},
			page: (cursor, { signal }) => listPage("", cursor, signal),
			// Names are unique per region and every create is named by its marker.
			find: (marker, cursor, { signal }) =>
				listPage(`&name=${encodeURIComponent(marker)}`, cursor, signal),
			...classifiers,
			// A teardown that lands mid-provisioning is asked again until the MicroVM can be deleted.
			transient: (error) => classifiers.transient(error) || stillProvisioning(error),
		},
		data: {
			attach: ({ raw }) => raw,
			// The control plane reports the allocated size; the request maps to exactly one pair.
			prepare: async ({ record: { raw } }, { spec }) => {
				const want = sizeFor(spec);
				return raw.size?.cpu === want.cpu && raw.size.memory === want.memory
					? { status: "honored" }
					: {
							status: "unsupported",
							detail: `requested ${want.cpu} vCPU / ${want.memory} MiB but the MicroVM reports ${raw.size?.cpu} / ${raw.size?.memory} MiB`,
						};
			},
			exec: async (native, command, options) => {
				for (let attempt = 1; ; attempt++) {
					try {
						const result = execResult.assert(
							await request("POST", `/${native.id}/exec`, {
								body: { argv: ["/bin/bash", "-lc", command] },
								...(options?.signal && { signal: options.signal }),
								timeoutMs: EXEC_TIMEOUT_MS,
							}),
						);
						// The vendor port has no truncation field, so partial output must not pass as success.
						if (result.truncated)
							throw new Error(
								"DigitalOcean exec output exceeded its 4 MiB limit and was truncated",
							);
						return {
							...(result.exit_code !== undefined && { exitCode: result.exit_code }),
							stdout: result.stdout ?? "",
							stderr: result.stderr ?? "",
						};
					} catch (error) {
						if (status(error) !== 429 || attempt >= EXEC_RATE_LIMIT_ATTEMPTS) throw error;
						await delay(EXEC_RATE_LIMIT_BACKOFF_MS * attempt, options?.signal);
					}
				}
			},
		},
	};
}
