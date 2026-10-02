// What an author writes into a `new-provider` scaffold, shared by the cost guard
// (new-provider.test.ts) and the end-to-end check (new-provider-e2e.ts), and how that work is
// counted: lines of the filled file outside its longest common run with the scaffold.

/** One stated value per metadata field a scaffold can leave unfilled. */
const METADATA: Readonly<Record<string, string>> = {
	displayName: '"Acme"',
	vendor: '"Acme"',
	website: '"https://acme.example"',
	isolation: '{ class: "microVM", technology: "Firecracker microVM" }',
	pricing: `{
		model: "unavailable",
		reason: "unpublished",
		notes: "Acme publishes no sandbox rate.",
	}`,
	specPinning: '"settable"',
};

/** State every `unfilled(...)` a scaffolded metadata file holds, as its author would. */
export function fillMetadata(source: string): string {
	const filled = source
		.replace("import { defineProviderMeta, unfilled } from", "import { defineProviderMeta } from")
		.replace(/http: unfilled\([^)]*\)/, 'http: "v1"')
		.replace(/^(\t)(\w+): unfilled\([\s\S]*?\),$/gm, (_line, indent: string, key: string) => {
			const value = METADATA[key];
			if (value === undefined) throw new Error(`no fill for metadata field ${key}`);
			return `${indent}${key}: ${value},`;
		});
	if (/\bunfilled\b/.test(filled)) throw new Error(`metadata still unfilled:\n${filled}`);
	return filled;
}

/** The E2B-protocol adapter's one stated difference: the SDK honours the caller's signal. */
export function fillE2bAdapter(source: string): string {
	const filled = source
		.replace('import { unfilled } from "@sandbox-benchmarks/driver/vendor";\n', "")
		.replace(/signals: unfilled\([^)]*\),/, "signals: true,");
	if (/\bunfilled\b/.test(filled)) throw new Error(`adapter still unfilled:\n${filled}`);
	return filled;
}

/** A filled OCI artifact builder for provider `id`: the vendor's build, reduced to its result. */
export const filledArtifactBuilder = (
	id: string,
): string => `// The ${id} artifact builder (\`./artifact\`): bakes the digest-pinned toolchain base into the
// artifact the driver boots, and returns exactly the ref it boots.

import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

export default defineArtifactBuilder(${JSON.stringify(id)}, async ({ name, base, log, signal }) => {
	signal.throwIfAborted();
	log(\`${id} template \${name} from \${base.digestRef}\`);
	return { ref: name, replaced: "atomic" };
});
`;

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
 * The pinned E2B SDK's specifier, assembled so the vendor-seam check (which reads every source file)
 * does not mistake this fixture's text for an import.
 */
const E2B = JSON.stringify(["e", "2b"].join(""));

/** An SDK adapter, written against the pinned `e2b` SDK standing in for a vendor's own SDK. */
export function fillSdkAdapter(source: string): string {
	return rewrite(source, [
		[
			`${SKELETON_IMPORTS}\nimport { unfilled } from "@sandbox-benchmarks/driver/vendor";`,
			'import type { Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";\nimport { instanceOfAny, LEAK_EXPIRY_MS } from "@sandbox-benchmarks/driver/vendor";',
		],
		[
			'import { type } from "arktype";',
			`import { type } from "arktype";\nimport type { Sandbox as Native } from ${E2B};`,
		],
		[
			`type Sandbox = Unfilled<"the vendor's sandbox type">;`,
			`const row = type({ sandboxId: "string", "metadata?": { "[string]": "string" } });
type Sandbox = typeof row.infer & { readonly native?: Native };`,
		],
		[
			"): Vendor<Sandbox, Sandbox> {",
			"): Vendor<Sandbox, Native> {\n\tconst auth = { apiKey: env.ACME_SDK_API_KEY };",
		],
		[
			SKELETON_RECORD,
			`	const record = (sandbox: Sandbox): VendorRecord<Sandbox> => ({
		id: sandbox.sandboxId,
		phase: "ready",
		...(sandbox.metadata?.marker && { marker: sandbox.metadata.marker }),
		raw: sandbox,
	});`,
		],
		[
			SKELETON_CONTROL,
			`			create: async ({ marker }, { signal }) => {
				const metadata = { marker };
				const options = { ...auth, metadata, timeoutMs: LEAK_EXPIRY_MS, signal };
				const native = await sdk.Sandbox.create(resolvedArtifact.ref, options);
				return record({ sandboxId: native.sandboxId, metadata, native });
			},
			// null only on the vendor's own not-found.
			get: async (id, { signal }) =>
				record(row.assert(await sdk.Sandbox.getInfo(id, { ...auth, signal }))),
			remove: async (id, { signal }) => {
				await sdk.Sandbox.kill(id, { ...auth, signal });
				return "removed";
			},
			absent: instanceOfAny(sdk.SandboxNotFoundError),
			page: async (cursor, { signal }) => {
				const query = { state: ["running" as const] };
				const pages = sdk.Sandbox.list({ ...auth, query, ...(cursor && { nextToken: cursor }) });
				const records = row.array().assert(await pages.nextItems({ signal })).map(record);
				return pages.hasNext ? { records, next: pages.nextToken ?? "" } : { records };
			},`,
		],
		[
			"			attach: ({ raw }) => raw,",
			`			attach: ({ raw }) => {
				if (!raw.native) throw new Error("acme-sdk attaches only the sandbox its create returned");
				return raw.native;
			},`,
		],
		[
			SKELETON_EXEC,
			`			exec: async (native, command) => {
				try {
					return await native.commands.run(command, { user: "root" });
				} catch (error) {
					if (error instanceof Error && "exitCode" in error && typeof error.exitCode === "number")
						return { exitCode: error.exitCode, stdout: "", stderr: error.message };
					throw error;
				}
			},`,
		],
	]);
}

/** The SDK provider's stand-in: the shared E2B-protocol stub, which the `e2b` SDK's surface fits. */
export function fillSdkTest(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		["import {\n\ttestContext,", "import {\n\te2bProtocolStub,\n\ttestContext,"],
		[
			'const stub = (): AcmeSdkSdk => unfilled("an in-memory stand-in for the SDK");',
			"const stub = (): AcmeSdkSdk => e2bProtocolStub<AcmeSdkSdk>().sdk;",
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

/** The HTTP provider's stand-in: the REST API above, over one in-memory account. */
export function fillHttpTest(source: string): string {
	return rewrite(source, [
		[STUB_IMPORT, ""],
		[
			'const stub = (): typeof globalThis.fetch => unfilled("an in-memory stand-in for the API");',
			`const stub = (): typeof globalThis.fetch => {
	const sandboxes = new Map<string, { id: string; status: string; marker: string }>();
	const json = (status: number, body?: unknown) =>
		new Response(body === undefined ? null : JSON.stringify(body), { status });
	const api = async (input: string | URL | Request, init?: RequestInit) => {
		const [, , , id, action] = new URL(String(input)).pathname.split("/");
		const body = init?.body ? JSON.parse(String(init.body)) : undefined;
		if (id === undefined) {
			if (init?.method !== "POST") return json(200, { items: [...sandboxes.values()] });
			const created = { id: \`sb-\${sandboxes.size + 1}\`, status: "running", marker: body.marker };
			sandboxes.set(created.id, created);
			return json(201, created);
		}
		const found = sandboxes.get(id);
		if (!found) return json(404, { error: "not found" });
		if (init?.method === "DELETE") return json(204, sandboxes.delete(id) && undefined);
		if (action !== "exec") return json(200, found);
		const exitCode = Number(/exit (\\d+)/.exec(body.command)?.[1] ?? 0);
		return json(200, { exitCode, stdout: "", stderr: "" });
	};
	return api as typeof globalThis.fetch;
};`,
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
