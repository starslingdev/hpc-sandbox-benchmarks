// Prototype: an HTTP control-plane kit. Most sandbox vendors expose the same REST resource
// (POST/GET/DELETE/LIST one sandbox record). A provider states paths, a row schema, and how a
// row's fields map to a lifecycle Phase; the kit owns transport, cancellation, status
// classification, arktype parsing of every response, and recovery strategy. Everything except
// the optional data-plane hook is plain data, so the same shape is accepted from a manifest.

import type { Type } from "arktype";
import { type } from "arktype";
import type { CreateInput, ExecOutcome, Phase, SandboxOps } from "./ops.ts";
import { coverage, statusIn } from "./ops.ts";
import type { PhaseRules } from "./rules.ts";
import { phaseOf, pick, render } from "./rules.ts";

export class HttpStatusError extends Error {
	constructor(
		readonly status: number,
		readonly path: string,
	) {
		super(`HTTP ${status} from ${path}`);
	}
}

export interface HttpTransport {
	readonly baseUrl: string;
	readonly headers: Readonly<Record<string, string>>;
	readonly timeoutMs?: number;
	readonly fetch?: typeof globalThis.fetch;
}

export interface HttpClient {
	json(
		method: string,
		path: string,
		init?: { body?: unknown; headers?: Record<string, string>; signal?: AbortSignal },
	): Promise<unknown>;
}

export function httpClient(transport: HttpTransport): HttpClient {
	const fetch = transport.fetch ?? globalThis.fetch;
	return {
		async json(method, path, init = {}) {
			const signal = AbortSignal.any([
				AbortSignal.timeout(transport.timeoutMs ?? 45_000),
				...(init.signal ? [init.signal] : []),
			]);
			init.signal?.throwIfAborted();
			const response = await fetch(new URL(path.replace(/^\/+/, ""), `${transport.baseUrl}/`), {
				method,
				redirect: "manual",
				signal,
				headers: {
					accept: "application/json",
					...transport.headers,
					...(init.body === undefined ? {} : { "content-type": "application/json" }),
					...init.headers,
				},
				...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
			});
			init.signal?.throwIfAborted();
			if (!response.ok) throw new HttpStatusError(response.status, path);
			const text = await response.text();
			return text.length === 0 ? null : JSON.parse(text);
		},
	};
}

const statusOf = (cause: unknown) => (cause instanceof HttpStatusError ? cause.status : undefined);

/** Template scope a manifest body/path may reference; functions in TS specs see the same. */
export interface HttpScope {
	readonly env: Readonly<Record<string, string | undefined>>;
	readonly request: CreateInput["request"];
	readonly marker: string;
}

export interface HttpEndpoint {
	readonly path: string;
	/** Dotted path of the record within the response body; omit when the body IS the record. */
	readonly select?: string;
}

/**
 * The declarative part. Strings may contain `{id}` (paths) or `{{...}}` templates (bodies), and
 * `row` is an arktype definition object, so this whole value is JSON-serializable.
 */
export interface HttpControlPlane<RowDef> {
	readonly kind: "http";
	/** Header and base-URL templates over declared inputs, e.g. `Bearer {{env.ACME_TOKEN}}`. */
	readonly transport: {
		readonly baseUrl: string;
		readonly headers: Readonly<Record<string, string>>;
	};
	/** Request-axis dispositions (the fixed axes are filled by the kit). */
	readonly spec: SandboxOps<unknown, unknown>["coverage"]["spec"];
	readonly row: RowDef;
	readonly id: { readonly field: string; readonly pattern: string };
	readonly create: HttpEndpoint & {
		readonly body: unknown;
		/** Where the per-attempt marker travels; it is also the recovery locator key. */
		readonly marker: { readonly header: string } | { readonly field: string };
	};
	readonly get: HttpEndpoint;
	readonly remove: HttpEndpoint & { readonly idempotencyHeader?: string };
	readonly list: HttpEndpoint;
	readonly phases: PhaseRules;
	/**
	 * `replay`: re-issue create with the same idempotency marker to learn the canonical id.
	 * `marker`: list and match the marker field. Dedicated accounts own every listed row.
	 */
	readonly ownership:
		| { readonly account: "dedicated"; readonly recover: "replay" }
		| {
				readonly account: "shared";
				readonly markerField: string;
		  };
	readonly errors?: {
		readonly notFound?: readonly number[];
		readonly definitive?: readonly number[];
		readonly retryable?: readonly number[];
	};
	/** Declarative data plane; omit and pass a `hook` when exec needs an SDK or a stream. */
	readonly data?: Extract<HttpDataPlane<unknown, unknown>, { kind: "json-exec" }>;
}

/** Data plane: either JSON exec over the same API, or a hook (SDK, websocket, ndjson...). */
export type HttpDataPlane<Row, Native> =
	| {
			readonly kind: "json-exec";
			readonly path: string;
			readonly body: unknown;
			readonly result: {
				readonly exitCode: string;
				readonly stdout: string;
				readonly stderr: string;
			};
	  }
	| {
			readonly kind: "hook";
			connect(row: Row): Native | Promise<Native>;
			exec(
				native: Native,
				command: string,
				options?: { signal?: AbortSignal },
			): Promise<ExecOutcome>;
			readonly files?: SandboxOps<Row, Native>["files"];
			launch?(native: Native, command: string): Promise<void>;
	  };

export type HttpOpsInput<Row, Native> = Pick<
	SandboxOps<Row, Native>,
	"timing" | "recovery" | "verify"
> & {
	readonly env: HttpScope["env"];
	/** Test seam. */
	readonly fetch?: typeof globalThis.fetch;
	readonly hook?: Extract<HttpDataPlane<Row, Native>, { kind: "hook" }>;
};

/** Compile the declarative control plane (plus a data plane) into sandbox ops. */
export function httpOps<const RowDef, Native = never>(
	plane: HttpControlPlane<RowDef>,
	input: HttpOpsInput<type.infer<RowDef>, Native>,
): SandboxOps<type.infer<RowDef>, Native> {
	type Row = type.infer<RowDef>;
	const http = httpClient({
		baseUrl: String(render(plane.transport.baseUrl, { env: input.env })),
		headers: render(plane.transport.headers, { env: input.env }) as Record<string, string>,
		...(input.fetch && { fetch: input.fetch }),
	});
	// Generic arktype inference cannot be re-checked inside this generic body; the boundary is
	// still fully parsed, and callers see the row type inferred from their literal definition.
	const schema = (type as (def: unknown) => Type<unknown>)(plane.row);
	const row = { assert: (value: unknown) => schema.assert(value) as Row };
	const rows = { assert: (value: unknown) => schema.array().assert(value) as readonly Row[] };
	const path = (template: string, id = "") => template.replaceAll("{id}", encodeURIComponent(id));
	const errors = plane.errors ?? {};
	const notFound = statusIn(statusOf, errors.notFound ?? [404]);
	const idOf = (value: Row) => String(pick(value, plane.id.field));

	// Replay recovery must resend the byte-identical body of the ambiguous attempt.
	const sentBodies = new Map<string, unknown>();
	async function post(marker: string, body: unknown, signal?: AbortSignal): Promise<Row> {
		const m = plane.create.marker;
		const response = await http.json("POST", path(plane.create.path), {
			body,
			...("header" in m ? { headers: { [m.header]: marker } } : {}),
			...(signal && { signal }),
		});
		return row.assert(pick(response, plane.create.select));
	}
	function create({ request, marker }: CreateInput, signal?: AbortSignal): Promise<Row> {
		const scope: HttpScope = { env: input.env, request, marker };
		const m = plane.create.marker;
		const rendered = render(plane.create.body, scope);
		const body = "field" in m ? { ...(rendered as object), [m.field]: marker } : rendered;
		sentBodies.set(marker, body);
		return post(marker, body, signal);
	}

	const data = input.hook ?? plane.data;
	if (!data) throw new Error("HTTP manifest declares no data plane and no hook was supplied");
	const dataPlane =
		data.kind === "hook"
			? data
			: {
					connect: (value: Row) => idOf(value),
					exec: async (id: string, command: string, options?: { signal?: AbortSignal }) => {
						const result = await http.json("POST", path(data.path, id), {
							body: render(data.body, { env: input.env, command }),
							...(options?.signal && { signal: options.signal }),
						});
						return {
							exitCode: Number(pick(result, data.result.exitCode)),
							stdout: String(pick(result, data.result.stdout) ?? ""),
							stderr: String(pick(result, data.result.stderr) ?? ""),
						};
					},
				};

	const ownership = plane.ownership;
	return {
		...(input.timing && { timing: input.timing }),
		...(input.recovery && { recovery: input.recovery }),
		...(input.verify && { verify: input.verify }),
		coverage: coverage(plane.spec),
		sandboxId: type(new RegExp(plane.id.pattern)),
		create,
		get: async (id, signal) =>
			row.assert(
				pick(
					await http.json("GET", path(plane.get.path, id), signal && { signal }),
					plane.get.select,
				),
			),
		remove: async (id, signal) => {
			await http.json("DELETE", path(plane.remove.path, id), {
				...(plane.remove.idempotencyHeader && {
					headers: { [plane.remove.idempotencyHeader]: `benchmark-delete-${id}` },
				}),
				...(signal && { signal }),
			});
		},
		list: async (signal) =>
			rows.assert(
				pick(await http.json("GET", plane.list.path, signal && { signal }), plane.list.select),
			),
		idOf,
		phase: (value): Phase => phaseOf(plane.phases, value),
		ownership:
			ownership.account === "dedicated"
				? {
						kind: "dedicated",
						key:
							"header" in plane.create.marker
								? plane.create.marker.header
								: plane.create.marker.field,
						// Idempotent replay returns the canonical record of the ambiguous attempt.
						find: async (marker, signal) => {
							if (!sentBodies.has(marker)) return [];
							return [idOf(await post(marker, sentBodies.get(marker), signal))];
						},
					}
				: {
						kind: "marker",
						key: ownership.markerField,
						of: (value) => {
							const marker = pick(value, ownership.markerField);
							return typeof marker === "string" ? marker : undefined;
						},
					},
		connect: dataPlane.connect as (value: Row) => Native,
		exec: dataPlane.exec as SandboxOps<Row, Native>["exec"],
		...(data.kind === "hook" && data.files && { files: data.files }),
		...(data.kind === "hook" && data.launch && { launch: data.launch }),
		errors: {
			notFound,
			...(errors.definitive && { definitive: statusIn(statusOf, errors.definitive) }),
			...(errors.retryable && { retryable: statusIn(statusOf, errors.retryable) }),
		},
	};
}
