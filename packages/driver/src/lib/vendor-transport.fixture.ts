import { abortableDelay } from "../vendor.ts";
import { guestOf } from "./vendor-memory.fixture.ts";

/** The sandboxes of a stand-in account ({@link restStub}, {@link sdkStub}), each with its own guest. */
function stubAccount<Row extends { readonly id: string }>(
	options: Pick<RestStubOptions<Row>, "newId" | "diskGb">,
) {
	const rows = new Map<string, Row>();
	const guests = new Map<string, ReturnType<ReturnType<typeof guestOf>>>();
	const guest = guestOf(options);
	let next = 0;
	const add = (fields: Omit<Row, "id">): Row => {
		next += 1;
		const row = { ...fields, id: options.newId?.(next) ?? `sb-${next}` } as Row;
		rows.set(row.id, row);
		guests.set(row.id, guest());
		return row;
	};
	/** The guest of sandbox `id` (a fresh one for a row placed in `rows` directly). */
	const guestFor = (id: string) => {
		const found = guests.get(id) ?? guest();
		guests.set(id, found);
		return found;
	};
	return { rows, add, guestFor };
}

/** The stand-in SDK's own typed not-found, for a test that passes no SDK class. */
class SdkNotFound extends Error {
	constructor(id: string) {
		super(`sandbox ${id} not found`);
	}
}

/** The account a {@link sdkStub} surface translates onto. */
export interface SdkAccount<Row extends { readonly id: string }> {
	/** The account's sandboxes by id. */
	readonly rows: Map<string, Row>;
	/** Allocate a sandbox under the next id, with its own guest. */
	add(fields: Omit<Row, "id">): Row;
	/** The sandbox `id` names; throws the account's not-found for one it lacks. */
	row(id: string): Row;
	/** Run `command` in sandbox `id`'s guest: exit codes, the kit's files fallback, `df`. */
	run(id: string, command: string): { exitCode: number; stdout: string; stderr: string };
	/** Sandbox `id`'s files, which its guest reads and writes. */
	files(id: string): Map<string, string>;
	/** The class `row` throws for an unknown id, unless `notFound` says otherwise. */
	readonly NotFound: new (
		id: string,
	) => Error;
}

export interface SdkStubOptions<Row> extends Pick<RestStubOptions<Row>, "newId" | "diskGb"> {
	/** The SDK's own not-found error for `id`, where the test exercises it. */
	readonly notFound?: (id: string) => unknown;
}

/**
 * A whole-account stand-in for a vendor SDK, parallel to {@link restStub}: `surface` states the
 * SDK's shape over the account's sandboxes (`add`, `row`, `rows`), each a row with its own guest
 * shell (`run`, `files`) as in {@link memoryVendor}, so the kit's exec, files fallback and disk
 * proof run for real. `Sdk` is the package's own SDK type, which the surface satisfies
 * structurally.
 */
export function sdkStub<Sdk, Row extends { readonly id: string } = { readonly id: string }>(
	surface: (account: SdkAccount<Row>) => unknown,
	options: SdkStubOptions<Row> = {},
) {
	const { rows, add, guestFor } = stubAccount<Row>(options);
	const row = (id: string): Row => {
		const found = rows.get(id);
		if (found !== undefined) return found;
		throw options.notFound?.(id) ?? new SdkNotFound(id);
	};
	const account: SdkAccount<Row> = {
		rows,
		add,
		row,
		run: (id, command) => {
			const { code, stdout, stderr } = guestFor(row(id).id).run(command);
			return { exitCode: code, stdout, stderr };
		},
		files: (id) => guestFor(row(id).id).files,
		NotFound: SdkNotFound,
	};
	return {
		/** The stand-in, typed as the package's SDK it satisfies structurally. */
		sdk: surface(account) as Sdk,
		...account,
	};
}

/** One request a {@link restStub} route answers. */
export interface RestRequest<Row extends { readonly id: string }> {
	readonly method: string;
	readonly url: URL;
	/** The route's `:name` segments, decoded. */
	readonly params: Readonly<Record<string, string>>;
	readonly headers: Headers;
	/** A string body parsed as JSON (or the string, if it is not JSON), a binary body as text. */
	// biome-ignore lint/suspicious/noExplicitAny: a route reads the body its own API defines.
	readonly body: any;
	readonly signal: AbortSignal | undefined;
	/** The account's sandboxes by id. */
	readonly rows: Map<string, Row>;
	/** Allocate a sandbox under the next id, with its own guest. */
	add(fields: Omit<Row, "id">): Row;
	/** The sandbox `:id` names; a route naming `:id` answers 404 for one the account lacks. */
	readonly row: Row;
	/** Run `command` in the `:id` sandbox's guest: exit codes, the kit's files fallback, `df`. */
	run(command: string): { exitCode: number; stdout: string; stderr: string };
	/** The `:id` sandbox's files, which its guest reads and writes. */
	readonly files: Map<string, string>;
}

/** A route's handler: a `Response`, `undefined` (204), or any other value (200 JSON). */
export type RestRoute<Row extends { readonly id: string }> = (request: RestRequest<Row>) => unknown;

export interface RestStubOptions<Row> {
	/** The vendor's id for the `n`th sandbox (default `sb-<n>`). */
	readonly newId?: (n: number) => string;
	/** The guest's root filesystem capacity (default 80 GiB). */
	readonly diskGb?: number;
	/** How `:id` resolves (default: by id), for an API that also addresses a sandbox by name. */
	readonly lookup?: (id: string, rows: ReadonlyMap<string, Row>) => Row | undefined;
	/** How late the API answers a request (a slow transport); a request's signal still aborts it. */
	readonly latencyMs?: (method: string, path: string) => number;
	/** The API's not-found answer (default: 404 `{ error: "not found" }`). */
	readonly missing?: (id: string) => Response;
}

/**
 * A whole-account stand-in for a vendor's REST API, as a route table: `"METHOD /path/:param"` to a
 * handler. Each sandbox is a row with its own guest shell, as in {@link memoryVendor}, so the kit's
 * exec, files fallback and disk proof run for real. Every request is recorded; one no route
 * matches throws, naming it.
 */
export function restStub<Row extends { readonly id: string }>(
	routes: Readonly<Record<string, RestRoute<Row>>>,
	options: RestStubOptions<Row> = {},
) {
	const { rows, add, guestFor } = stubAccount<Row>(options);
	const calls: Array<{ method: string; path: string; headers: Headers; body: unknown }> = [];
	const table = Object.entries(routes).map(([route, handler]) => {
		const [method, path = ""] = route.split(" ");
		return { method, segments: path.split("/"), handler };
	});
	const match = (method: string, path: string) => {
		const segments = path.split("/");
		for (const route of table) {
			if (route.method !== method || route.segments.length !== segments.length) continue;
			const params: Record<string, string> = {};
			const matched = route.segments.every((segment, index) => {
				const actual = segments[index] ?? "";
				if (!segment.startsWith(":")) return segment === actual;
				params[segment.slice(1)] = decodeURIComponent(actual);
				return actual !== "";
			});
			if (matched) return { handler: route.handler, params };
		}
		return undefined;
	};
	const decode = (body: unknown) => {
		if (typeof body === "string") {
			try {
				return JSON.parse(body);
			} catch {
				return body;
			}
		}
		if (body instanceof Uint8Array || body instanceof ArrayBuffer)
			return new TextDecoder().decode(body);
		return undefined;
	};
	const answer = (value: unknown) =>
		value instanceof Response
			? value
			: value === undefined
				? new Response(null, { status: 204 })
				: Response.json(value);
	const route = async (input: string | URL | Request, init: RequestInit = {}) => {
		const request =
			input instanceof Request ? new Request(input, init) : new Request(String(input), init);
		const url = new URL(request.url);
		const method = request.method;
		const headers = request.headers;
		const body = request.body === null ? undefined : decode(await request.text());
		calls.push({ method, path: `${url.pathname}${url.search}`, headers, body });
		const latency = options.latencyMs?.(method, url.pathname) ?? 0;
		if (latency > 0) await abortableDelay(latency, request.signal);
		const found = match(method, url.pathname);
		if (!found) throw new Error(`restStub: no route for ${method} ${url.pathname}`);
		const id = found.params.id;
		const row =
			id === undefined ? undefined : (options.lookup ?? ((key) => rows.get(key)))(id, rows);
		if (id !== undefined && row === undefined)
			return options.missing?.(id) ?? Response.json({ error: "not found" }, { status: 404 });
		const sandbox = () => {
			if (row === undefined) throw new Error(`restStub: ${method} ${url.pathname} names no :id`);
			return { row, guest: guestFor(row.id) };
		};
		return answer(
			await found.handler({
				method,
				url,
				params: found.params,
				headers,
				body,
				signal: request.signal,
				rows,
				add,
				get row() {
					return sandbox().row;
				},
				run: (command) => {
					const { code, stdout, stderr } = sandbox().guest.run(command);
					return { exitCode: code, stdout, stderr };
				},
				get files() {
					return sandbox().guest.files;
				},
			}),
		);
	};
	return {
		/** The stand-in, typed as the `fetch` an adapter receives. */
		fetch: Object.assign(route, { preconnect() {} }) as typeof globalThis.fetch,
		rows,
		/** Every request, in order: method, path with query, headers and decoded body. */
		calls,
		add,
	};
}
