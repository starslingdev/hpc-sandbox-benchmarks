// What an author writes into a `new-provider` scaffold, shared by the cost guard
// (new-provider.test.ts) and the end-to-end check (new-provider-e2e.ts), and how that work is
// counted: lines of the filled file outside its longest common run with the scaffold.

/** One stated value per metadata field a scaffold can leave unfilled, for provider `id`. */
function metadataValues(id: string): Readonly<Record<string, string>> {
	// Each provider its own vendor, as real ones are: two baked artifacts of one vendor need distinct
	// release names.
	const name = id.split("-").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`);
	return {
		displayName: JSON.stringify(name.join(" ")),
		vendor: JSON.stringify(name.join(" ")),
		website: JSON.stringify(`https://${id}.example`),
		isolation: '{ class: "microVM", technology: "Firecracker microVM" }',
		pricing: `{
		model: "unavailable",
		reason: "unpublished",
		notes: "No published sandbox rate.",
	}`,
		specPinning: '"settable"',
	};
}

/** State every `unfilled(...)` a scaffolded metadata file holds, as its author would. */
export function fillMetadata(source: string): string {
	const values = metadataValues(/defineProviderMeta\("([^"]+)"/.exec(source)?.[1] ?? "");
	const filled = source
		.replace("import { defineProviderMeta, unfilled } from", "import { defineProviderMeta } from")
		.replace(/http: unfilled\((?:[^()]|\([^()]*\))*\)/, 'http: "1.0.0"')
		.replace(/^(\t)(\w+): unfilled\([\s\S]*?\),$/gm, (_line, indent: string, key: string) => {
			const value = values[key];
			if (value === undefined) throw new Error(`no fill for metadata field ${key}`);
			return `${indent}${key}: ${value},`;
		});
	if (/\bunfilled\b/.test(filled)) throw new Error(`metadata still unfilled:\n${filled}`);
	return filled;
}

/** Lines of `after` outside its longest common subsequence of lines with `before`. */
export function handWrittenLines(before: string, after: string): number {
	const left = before.split("\n");
	const right = after.split("\n");
	let previous = new Array<number>(right.length + 1).fill(0);
	for (const line of left) {
		const current = new Array<number>(right.length + 1).fill(0);
		for (let column = 1; column <= right.length; column++)
			current[column] =
				line === right[column - 1]
					? (previous[column - 1] ?? 0) + 1
					: Math.max(previous[column] ?? 0, current[column - 1] ?? 0);
		previous = current;
	}
	return right.length - (previous[right.length] ?? 0);
}

/** Replace each `from` (which must occur) with its `to`: an author's edit of a scaffolded file. */
function rewrite(
	source: string,
	edits: ReadonlyArray<readonly [from: string, to: string]>,
): string {
	let result = source;
	for (const [from, to] of edits) {
		if (!result.includes(from)) throw new Error(`the scaffold no longer holds:\n${from}`);
		result = result.replace(from, to);
	}
	if (/\bunfilled\b/i.test(result)) throw new Error(`still unfilled:\n${result}`);
	return result;
}

const SKELETON_IMPORTS =
	'import type { Unfilled, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";';
const SKELETON_RECORD = `	const record = (sandbox: Sandbox): VendorRecord<Sandbox> =>
		unfilled("{ id, phase, marker, raw: sandbox }");`;
const SKELETON_CONTROL = `			create: async ({ request, marker }, { signal }) => unfilled("the created sandbox's record"),
			// null only on the vendor's own not-found.
			get: async (id, { signal }) => unfilled("the sandbox's record"),
			remove: async (id, { signal }) =>
				unfilled('"removed" when the delete proves it, else "accepted"'),
			page: async (cursor, { signal }) => unfilled("{ records, next? }: one page of the account"),`;
const SKELETON_EXEC = `			exec: async (sandbox, command, options) => unfilled("{ exitCode, stdout, stderr }"),`;
const STUB_IMPORT = 'import { unfilled } from "@sandbox-benchmarks/driver/vendor";\n';

/**
 * The vendor SDKs `check:new-provider` installs, offline, into its copy of the repository: one per
 * SDK case, as the npm package its catalog pin resolves to. `acme-sandbox` speaks the E2B protocol,
 * so it is the pinned E2B SDK under the vendor's own name, the way such SDKs are forks of it.
 * `@acme/sdk` is a small REST client of its own. Specifiers are assembled so the vendor-seam check
 * (which reads every source file) does not mistake this fixture's text for an import.
 */
export function fakeSdks(e2bVersion: string): Record<string, Record<string, string>> {
	const e2b = JSON.stringify(["e", "2b"].join(""));
	const manifest = (name: string, dependencies = {}) =>
		JSON.stringify({
			name,
			version: "1.0.0",
			type: "module",
			main: "index.js",
			types: "index.d.ts",
			dependencies,
		});
	return {
		"acme-sandbox": {
			"package.json": manifest("acme-sandbox", { [JSON.parse(e2b)]: e2bVersion }),
			"index.js": `export * from ${e2b};\n`,
			"index.d.ts": `export * from ${e2b};\n`,
		},
		"@acme/sdk": {
			"package.json": manifest("@acme/sdk"),
			"index.d.ts": `export interface SandboxInfo {
	id: string;
	status: "starting" | "running" | "stopping" | "stopped";
	labels: Record<string, string>;
}
export interface RequestOptions {
	signal?: AbortSignal;
}
export declare class NotFoundError extends Error {}
export declare class AcmeClient {
	constructor(options: { apiKey: string; baseUrl?: string });
	readonly sandboxes: {
		create(body: { image: string; labels: Record<string, string> }, options?: RequestOptions): Promise<SandboxInfo>;
		retrieve(id: string, options?: RequestOptions): Promise<SandboxInfo>;
		delete(id: string, options?: RequestOptions): Promise<void>;
		list(query: { cursor?: string }, options?: RequestOptions): Promise<{ data: SandboxInfo[]; nextCursor?: string }>;
		exec(id: string, body: { command: string }, options?: RequestOptions): Promise<{ exitCode: number; stdout: string; stderr: string }>;
	};
}
`,
			"index.js": `export class NotFoundError extends Error {}
export class AcmeClient {
	constructor({ apiKey, baseUrl = "https://api.acme.example" }) {
		const call = async (method, path, body, options = {}) => {
			const response = await fetch(new URL(path, baseUrl), {
				method,
				signal: options.signal,
				headers: { authorization: \`Bearer \${apiKey}\`, "content-type": "application/json" },
				body: body === undefined ? undefined : JSON.stringify(body),
			});
			if (response.status === 404) throw new NotFoundError(path);
			if (!response.ok) throw new Error(\`acme \${response.status}\`);
			return response.status === 204 ? undefined : response.json();
		};
		this.sandboxes = {
			create: (body, options) => call("POST", "/v1/sandboxes", body, options),
			retrieve: (id, options) => call("GET", \`/v1/sandboxes/\${id}\`, undefined, options),
			delete: (id, options) => call("DELETE", \`/v1/sandboxes/\${id}\`, undefined, options),
			list: ({ cursor }, options) => call("GET", \`/v1/sandboxes\${cursor ? \`?cursor=\${cursor}\` : ""}\`, undefined, options),
			exec: (id, body, options) => call("POST", \`/v1/sandboxes/\${id}/exec\`, body, options),
		};
	}
}
`,
		},
	};
}

/** `@acme/sdk`, assembled for the vendor-seam check as in {@link fakeSdks}. */
const ACME_SDK = ["@acme", "sdk"].join("/");

const SDK_IMPORTS = `${SKELETON_IMPORTS}\nimport { unfilled } from "@sandbox-benchmarks/driver/vendor";`;

/** An SDK adapter over the `@acme/sdk` REST client. */
export function fillSdkAdapter(source: string): string {
	return rewrite(source, [
		[
			'import type { DriverContext } from "@sandbox-benchmarks/driver";',
			`import type { SandboxInfo } from "${ACME_SDK}";\nimport type { DriverContext } from "@sandbox-benchmarks/driver";`,
		],
		[
			SDK_IMPORTS,
			'import type { Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";\nimport { instanceOfAny } from "@sandbox-benchmarks/driver/vendor";',
		],
		[`type Sandbox = Unfilled<"the vendor's sandbox type">;`, "type Sandbox = SandboxInfo;"],
		[
			"): Vendor<Sandbox, Sandbox> {",
			"): Vendor<Sandbox, Sandbox> {\n\tconst client = new sdk.AcmeClient({ apiKey: env.ACME_SDK_API_KEY });",
		],
		[
			SKELETON_RECORD,
			`	const record = (sandbox: Sandbox): VendorRecord<Sandbox> => ({
		id: sandbox.id,
		phase: ({ starting: "pending", running: "ready", stopping: "deleting", stopped: "gone" } as const)[sandbox.status],
		...(sandbox.labels.marker && { marker: sandbox.labels.marker }),
		raw: sandbox,
	});`,
		],
		[
			SKELETON_CONTROL,
			`			create: async ({ marker }, { signal }) =>
				record(await client.sandboxes.create({ image: resolvedArtifact.ref, labels: { marker } }, { signal })),
			// null only on the vendor's own not-found.
			get: async (id, { signal }) => record(await client.sandboxes.retrieve(id, { signal })),
			remove: async (id, { signal }) => {
				await client.sandboxes.delete(id, { signal });
				return "accepted";
			},
			absent: instanceOfAny(sdk.NotFoundError),
			page: async (cursor, { signal }) => {
				const page = await client.sandboxes.list({ ...(cursor && { cursor }) }, { signal });
				return { records: page.data.map(record), ...(page.nextCursor && { next: page.nextCursor }) };
			},`,
		],
		[
			SKELETON_EXEC,
			`			exec: async (sandbox, command, options) =>
				client.sandboxes.exec(sandbox.id, { command }, { ...(options?.signal && { signal: options.signal }) }),`,
		],
	]);
}

/** The SDK provider's stand-in: the `@acme/sdk` client over one in-memory account. */
export function fillSdkTest(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		[
			`const stub = () => sdkStub<AcmeSdkSdk>(unfilled("the SDK's surface over the account")).sdk;`,
			`const stub = () =>
	sdkStub<AcmeSdkSdk, SandboxInfo>(({ add, row, rows, run, NotFound }) => ({
		NotFoundError: NotFound,
		AcmeClient: class {
			sandboxes: AcmeClient["sandboxes"] = {
				create: async ({ labels }) => add({ status: "running", labels }),
				retrieve: async (id) => row(id),
				delete: async (id) => {
					rows.delete(row(id).id);
				},
				list: async () => ({ data: [...rows.values()] }),
				exec: async (id, { command }) => run(id, command),
			};
		},
	})).sdk;`,
		],
		[
			'import type { CreateRequest } from "@sandbox-benchmarks/driver";',
			`import type { AcmeClient, SandboxInfo } from "${ACME_SDK}";\nimport type { CreateRequest } from "@sandbox-benchmarks/driver";`,
		],
	]);
}

/** An HTTP adapter for a small REST API: sandboxes, their listing, and an exec endpoint. */
export function fillHttpAdapter(source: string): string {
	return rewrite(source, [
		[
			SKELETON_IMPORTS,
			'import type { Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";',
		],
		[
			'import { httpClassifiers, httpStatus, unfilled } from "@sandbox-benchmarks/driver/vendor";',
			'import { httpClassifiers, httpStatus } from "@sandbox-benchmarks/driver/vendor";',
		],
		[
			`type Sandbox = Unfilled<"the vendor's sandbox type">;`,
			`const row = type({ id: "string", status: "'starting' | 'running' | 'deleting'", marker: "string" });
type Sandbox = typeof row.infer;
const listing = type({ items: row.array(), "next?": "string" });
const outcome = type({ exitCode: "number", stdout: "string", stderr: "string" });`,
		],
		['unfilled("the API\'s base URL")', '"https://api.acme.example"'],
		[
			SKELETON_RECORD,
			`	const record = (sandbox: Sandbox): VendorRecord<Sandbox> => ({
		id: sandbox.id,
		phase: ({ starting: "pending", running: "ready", deleting: "deleting" } as const)[sandbox.status],
		marker: sandbox.marker,
		raw: sandbox,
	});`,
		],
		[
			SKELETON_CONTROL,
			`			create: async ({ marker }, { signal }) => {
				const body = { image: resolvedArtifact.ref, marker };
				return record(row.assert(await api("POST", "/v1/sandboxes", signal, body)));
			},
			// null only on the vendor's own not-found.
			get: async (id, { signal }) => record(row.assert(await api("GET", \`/v1/sandboxes/\${id}\`, signal))),
			remove: async (id, { signal }) => {
				await api("DELETE", \`/v1/sandboxes/\${id}\`, signal);
				return "accepted";
			},
			page: async (cursor, { signal }) => {
				const query = cursor === undefined ? "" : \`?cursor=\${encodeURIComponent(cursor)}\`;
				const page = listing.assert(await api("GET", \`/v1/sandboxes\${query}\`, signal));
				return { records: page.items.map(record), ...(page.next && { next: page.next }) };
			},`,
		],
		[
			SKELETON_EXEC,
			`			exec: async (sandbox, command, options) =>
				outcome.assert(await api("POST", \`/v1/sandboxes/\${sandbox.id}/exec\`, options?.signal, { command })),`,
		],
	]);
}

/** The HTTP provider's stand-in: the REST API above as a route table over one in-memory account. */
export function fillHttpTest(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		[
			`const stub = () => restStub(unfilled("the API's routes")).fetch;`,
			`const stub = () =>
	restStub<{ id: string; status: string; marker: string }>({
		"POST /v1/sandboxes": ({ body, add }) => add({ status: "running", marker: body.marker }),
		"GET /v1/sandboxes": ({ rows }) => ({ items: [...rows.values()] }),
		"GET /v1/sandboxes/:id": ({ row }) => row,
		"DELETE /v1/sandboxes/:id": ({ rows, row }) => {
			rows.delete(row.id);
		},
		"POST /v1/sandboxes/:id/exec": ({ body, run }) => run(body.command),
	}).fetch;`,
		],
	]);
}

/** A CLI table for a vendor CLI that prints JSON rows and names sandboxes on create. */
export function fillCliAdapter(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		[
			'requestCoverage: unfilled("how the create honours each request axis"),',
			`requestCoverage: {
			spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: { capacityAtLeast: 40 } },
			artifact: "context",
			deadlineMs: "driver",
			gpu: { model: "unsupported", count: "unsupported" },
			env: "unsupported",
		},`,
		],
		[
			'create: (request, name) => unfilled("argv creating `name` from resolvedArtifact.ref"),',
			`create: (request, name) => [
			"create",
			name,
			"--image",
			resolvedArtifact.ref,
			"--cpu",
			String(request.spec.vcpus),
			"--memory",
			String(request.spec.memoryGb),
		],`,
		],
		['poll: unfilled("argv listing every sandbox as JSON"),', 'poll: ["list", "--json"],'],
		[
			`classify: (row) => unfilled('"ready", "pending", or { terminal } for one row'),`,
			'classify: (row) => (row.status === "running" ? "ready" : row.status === "failed" ? { terminal: row.status } : "pending"),',
		],
		[
			'exec: (id, command) => unfilled("argv running `command` in sandbox `id`"),',
			'exec: (id, command) => ["exec", id, "--", "sh", "-c", command],',
		],
		['destroy: (id) => unfilled("argv deleting sandbox `id`"),', 'destroy: (id) => ["rm", id],'],
		[
			`notFound: unfilled("the CLI's already-gone message, as a RegExp"),`,
			"notFound: /^no such sandbox/,",
		],
	]);
}

/** The CLI provider's stand-in: the CLI above, over one in-memory account. */
export function fillCliTest(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		[
			'const stubCli = (): CliRunner => unfilled("an in-memory stand-in for the CLI");',
			`const stubCli = (): CliRunner => {
	const rows = new Map<string, { id: string; name: string; status: string }>();
	const done = (stdout = "", code = 0) => ({ stdout, stderr: code === 0 ? "" : "no such sandbox", code });
	return async (_binary, [command, target = "", ...rest]) => {
		if (command === "create") {
			const id = \`sb-\${rows.size + 1}\`;
			rows.set(id, { id, name: target, status: "running" });
			return done();
		}
		if (command === "list") return done(JSON.stringify([...rows.values()]));
		if (!rows.has(target)) return done("", 1);
		if (command === "rm") return done("", rows.delete(target) ? 0 : 1);
		return done("", Number(/exit (\\d+)/.exec(rest.at(-1) ?? "")?.[1] ?? 0));
	};
};`,
		],
	]);
}

/** The CLI's pinned release: its archive URL and checksum. */
export function fillSetupAction(source: string): string {
	return rewrite(source, [
		[
			'default: "unfilled: the archive URL, with {version} for the release"',
			"default: https://downloads.acme.example/cli/{version}/acme-linux-x86_64.tar.gz",
		],
		[
			`default: "unfilled: the archive's sha256"`,
			"default: 2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae",
		],
	]);
}
