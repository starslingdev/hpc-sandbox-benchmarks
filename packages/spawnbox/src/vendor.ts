// Spawnbox's vendor adapter: translation only, over the documented `/v1` HTTP API (no client
// library is published). Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit.
//
// Spawnbox sizes a sandbox by its template, not by the create request. The operator builds one
// template from the shared toolchain image at the target shape (see the package README); the
// adapter boots it by a name derived from the image ref and, before the session is returned,
// proves the template's `base` is that ref and its resources are the requested shape.

import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { Phase, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import {
	bounded,
	httpClassifiers,
	httpStatus,
	LEAK_EXPIRY_MS,
} from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const SPAWNBOX_SANDBOX_ID = type(/^sbx_[a-z0-9]+$/);
/** The label a create carries its ownership marker under; listings echo labels back. */
export const SPAWNBOX_MARKER_LABEL = "benchmark-marker";
/** The bound on one control request. A create restores a snapshot and answers when it runs. */
export const CONTROL_TIMEOUT_MS = 120_000;
/** Server-side bound on one synchronous command, past the harness's 60 s synchronous cap. */
const EXEC_TIMEOUT_S = 300;
const EXEC_REQUEST_TIMEOUT_MS = (EXEC_TIMEOUT_S + 30) * 1000;
const PAGE_LIMIT = 200;
/** Commands run as root, the toolchain image's own user, as on the other image-booting providers. */
const RUN_AS = "root";

/**
 * The template the operator built from `imageRef`: its last path segment and tag, lowercased, with
 * every other character a hyphen (`ghcr.io/org/sandbox-benchmarks-toolchain:v8` →
 * `sandbox-benchmarks-toolchain-v8`). Spawnbox names are `a-z`, `0-9` and `-`, starting with a letter.
 */
export function spawnboxTemplateName(imageRef: string): string {
	const last = imageRef.split("/").at(-1) ?? imageRef;
	const name = last
		.split("@")[0]
		?.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^[^a-z]+|-+$/g, "");
	if (!name) throw new Error(`cannot derive a Spawnbox template name from ${imageRef}`);
	return name.slice(0, 63).replace(/-+$/, "");
}

const sandbox = type({
	id: SPAWNBOX_SANDBOX_ID,
	state: "string >= 1",
	template: "string",
	labels: type({ "[string]": "string" }),
}).onUndeclaredKey("ignore");
type SpawnboxSandbox = typeof sandbox.infer;
const page = type({
	sandboxes: sandbox.array(),
	"next_cursor?": "string | null",
}).onUndeclaredKey("ignore");
const template = type({
	name: "string",
	"base?": "string | null",
	resources: type({
		vcpus: "number",
		memory_mib: "number",
		disk_gib: "number",
	}).onUndeclaredKey("ignore"),
	"current_build?": "string | null",
}).onUndeclaredKey("ignore");
const execResult = type({
	stdout: "string",
	stderr: "string",
	"exit_code?": "number | null",
	"signal?": "number | string | null",
	"timed_out?": "boolean",
	"stdout_truncated?": "boolean",
	"stderr_truncated?": "boolean",
}).onUndeclaredKey("ignore");
const errorBody = type({
	error: type({ "code?": "string", "message?": "string" }).onUndeclaredKey("ignore"),
}).onUndeclaredKey("ignore");

/** A non-2xx answer, carrying Spawnbox's `{error: {code, message}}` body. */
export class SpawnboxError extends Error {
	constructor(
		readonly status: number,
		readonly code: string | undefined,
		message: string,
	) {
		super(`Spawnbox ${status}${code ? ` ${code}` : ""}: ${message}`);
		this.name = "SpawnboxError";
	}
}
const status = httpStatus(SpawnboxError, (error) => error.status);
const classifiers = httpClassifiers(status);

/**
 * A paused sandbox keeps its memory and disk and the next call resumes it, so it is `ready`. A
 * `cold` sandbox exists only for persistent sandboxes, which the benchmark never creates.
 */
export function spawnboxPhase(state: string): Phase {
	switch (state) {
		case "running":
		case "paused":
		case "cold":
			return "ready";
		case "deleted":
			return "gone";
		case "failed":
			return "failed";
		default:
			return "pending";
	}
}

function record(row: SpawnboxSandbox): VendorRecord<SpawnboxSandbox> {
	const marker = row.labels[SPAWNBOX_MARKER_LABEL];
	return {
		id: row.id,
		phase: spawnboxPhase(row.state),
		...(marker && { marker }),
		raw: row,
	};
}

/** The adapter over one transport: production binds `globalThis.fetch`, tests a fake router. */
export function spawnboxVendor(
	{ env, resolvedArtifact }: Pick<DriverContext<"spawnbox">, "env" | "resolvedArtifact">,
	transport: typeof globalThis.fetch,
): Vendor<SpawnboxSandbox, SpawnboxSandbox> {
	if (resolvedArtifact.kind !== "image")
		throw new Error("Spawnbox boots a template built from the resolved toolchain image");
	const imageRef = resolvedArtifact.ref;
	const templateName = spawnboxTemplateName(imageRef);
	const base = `${env.SPAWNBOX_URL.replace(/\/+$/, "")}/v1`;

	const request = (
		method: string,
		path: string,
		options: { body?: unknown; raw?: string; signal?: AbortSignal; timeoutMs?: number } = {},
	): Promise<unknown> =>
		bounded(options.signal, options.timeoutMs ?? CONTROL_TIMEOUT_MS, async (within) => {
			const body =
				options.raw ?? (options.body === undefined ? undefined : JSON.stringify(options.body));
			const response = await transport(`${base}${path}`, {
				method,
				headers: {
					Authorization: `Bearer ${env.SPAWNBOX_API_KEY}`,
					...(options.body !== undefined && { "Content-Type": "application/json" }),
				},
				...(body !== undefined && { body }),
				signal: within,
			});
			const text = await response.text();
			if (response.ok) {
				if (!text) return undefined;
				try {
					return JSON.parse(text);
				} catch {
					return text;
				}
			}
			let parsed: unknown;
			try {
				parsed = JSON.parse(text);
			} catch {
				parsed = undefined;
			}
			const error = errorBody(parsed);
			const { code, message } = error instanceof type.errors ? {} : error.error;
			throw new SpawnboxError(
				response.status,
				code,
				message ?? (text.slice(0, 200) || response.statusText),
			);
		});

	const listPage = async (cursor: string | undefined, signal: AbortSignal) => {
		const listed = page.assert(
			await request(
				"GET",
				`/sandboxes?limit=${PAGE_LIMIT}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
				{ signal },
			),
		);
		return {
			records: listed.sandboxes.map(record),
			...(listed.next_cursor ? { next: listed.next_cursor } : {}),
		};
	};

	const filePath = (path: string) =>
		`/files?path=${encodeURIComponent(path)}&user=${encodeURIComponent(RUN_AS)}`;

	return {
		control: {
			// The create answers once the sandbox runs (a snapshot restore), so the response proves
			// readiness. The lifetime is a backstop for a sandbox every teardown missed.
			create: async ({ marker }, { signal }) =>
				record(
					sandbox.assert(
						await request("POST", "/sandboxes", {
							body: {
								template: templateName,
								timeout_s: LEAK_EXPIRY_MS / 1000,
								idle_pause_s: 0,
								labels: { [SPAWNBOX_MARKER_LABEL]: marker },
							},
							signal,
						}),
					),
				),
			get: async (id, { signal }) =>
				record(sandbox.assert(await request("GET", `/sandboxes/${id}`, { signal }))),
			// A 204 stops the VM before it answers; the kit still reads until the record is `deleted`.
			remove: async (id, { signal }) => {
				await request("DELETE", `/sandboxes/${id}`, { signal });
				return "accepted";
			},
			page: (cursor, { signal }) => listPage(cursor, signal),
			// Spawnbox has no label filter: a lookup pages the account and keeps the marker's rows.
			find: async (marker, cursor, { signal }) => {
				const listed = await listPage(cursor, signal);
				return { ...listed, records: listed.records.filter((row) => row.marker === marker) };
			},
			...classifiers,
			// A request that reached no HTTP status (a dropped connection, the request's own bound) is
			// asked again; a caller's abort is neither.
			transient: (error) =>
				status(error) === undefined
					? error instanceof TypeError || (error instanceof Error && error.name === "TimeoutError")
					: classifiers.transient(error),
		},
		data: {
			attach: ({ raw }) => raw,
			// The sandbox must come from the template built from exactly this image, at the requested shape.
			prepare: async ({ record: { raw } }, { spec }: CreateRequest, { signal }) => {
				if (raw.template !== templateName)
					return {
						status: "unsupported",
						detail: `sandbox runs template ${raw.template}, not ${templateName}`,
					};
				const built = template.assert(
					await request("GET", `/templates/${templateName}`, { signal }),
				);
				if (built.base !== imageRef)
					return {
						status: "unsupported",
						detail: `template ${templateName} was built from ${built.base ?? "the Debian base"}, not ${imageRef}`,
					};
				const { vcpus, memory_mib, disk_gib } = built.resources;
				if (
					vcpus !== spec.vcpus ||
					memory_mib !== spec.memoryGb * 1024 ||
					(spec.diskGb !== undefined && disk_gib < spec.diskGb)
				)
					return {
						status: "unsupported",
						detail: `template ${templateName} is ${vcpus} vCPU / ${memory_mib} MiB / ${disk_gib} GiB, not ${spec.vcpus} vCPU / ${spec.memoryGb * 1024} MiB / ${spec.diskGb ?? "any"} GiB`,
					};
				return { status: "honored", reportedArtifact: { kind: "image", ref: imageRef } };
			},
			exec: async (native, command, options) => {
				const result = execResult.assert(
					await request("POST", `/sandboxes/${native.id}/exec`, {
						body: { cmd: command, user: RUN_AS, timeout_s: EXEC_TIMEOUT_S },
						...(options?.signal && { signal: options.signal }),
						timeoutMs: EXEC_REQUEST_TIMEOUT_MS,
					}),
				);
				// The vendor port has no truncation or timeout field, so neither may pass as a result.
				if (result.stdout_truncated || result.stderr_truncated)
					throw new Error("Spawnbox exec output exceeded its 1 MiB limit and was truncated");
				if (result.timed_out)
					throw new Error(`Spawnbox exec exceeded its ${EXEC_TIMEOUT_S}s server-side timeout`);
				return {
					...(typeof result.exit_code === "number" && { exitCode: result.exit_code }),
					stdout: result.stdout,
					stderr: result.stderr,
				};
			},
			files: {
				read: async (native, path) => {
					const body = await request("GET", `/sandboxes/${native.id}${filePath(path)}`);
					if (typeof body !== "string") throw new Error(`Spawnbox path ${path} is not a file`);
					return body;
				},
				write: async (native, path, text) => {
					await request("PUT", `/sandboxes/${native.id}${filePath(path)}`, { raw: text });
				},
			},
		},
	};
}
