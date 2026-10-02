#!/usr/bin/env bun
// `new-provider`: scaffold everything mechanical about a new provider (ADR-0023), so its author
// writes only what the vendor makes true: the metadata file and the adapter, plus the artifact
// builder when it bakes. `planProvider` plans every write from the files it reads (laying new
// sources out with the repository's Biome); `writeScaffold` applies the plan. The cost guard
// (new-provider.test.ts) measures that plan.
//
//   bun run new-provider -- --id <id> --kind sdk|http|cli [--sdk <name>@<version>] [--protocol e2b] [--baked]
//
// Every value only the author knows is left as a typed `unfilled(...)`: assignable to nothing, so
// typecheck names each one, and throwing when evaluated, so `generate-providers` refuses the
// metadata until it is stated. `generate-providers` then derives everything else.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { PROVIDER_IDS } from "../src/provider-ids.ts";
import { provenanceConstant } from "../src/provider-meta.ts";
import { assertProviderIdSyntax } from "./provider-meta-schema.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

export const PROVIDER_KINDS = ["sdk", "http", "cli"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

/** What one scaffold is asked for. */
export interface NewProvider {
	readonly id: string;
	/** How the adapter reaches the vendor: an npm SDK, plain HTTP, or a vendor CLI. */
	readonly kind: ProviderKind;
	/** The npm SDK (`sdk`) or the CLI binary (`cli`), with its exact version (required for an SDK). */
	readonly sdk?: { readonly name: string; readonly version?: string };
	/** `e2b`: the SDK speaks the E2B protocol, so the adapter is the shared protocol binding. */
	readonly protocol?: "e2b";
	/** The provider bakes its artifact from the OCI toolchain base (`./artifact`). */
	readonly baked: boolean;
}

/** A scaffold: every file it writes, which of them it edits in place, and what the author writes. */
export interface ProviderScaffold {
	/** Every file written, keyed by repository-relative path, with its full new content. */
	readonly files: ReadonlyMap<string, string>;
	/** The files that already existed and are edited in place. */
	readonly edited: ReadonlySet<string>;
	/** The files holding `unfilled` values: the only ones the author edits by hand. */
	readonly authored: readonly string[];
}

/** A value left for the author, in TypeScript (`unfilled(...)`) or YAML (an `unfilled:` string). */
export const HOLE = /\bunfilled\b/;

const EXACT_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/;

/** Parse `bun run new-provider` arguments. */
export function parseNewProviderArgs(argv: readonly string[]): NewProvider {
	const { values } = parseArgs({
		args: [...argv],
		options: {
			id: { type: "string" },
			kind: { type: "string" },
			sdk: { type: "string" },
			protocol: { type: "string" },
			baked: { type: "boolean", default: false },
		},
		strict: true,
	});
	const kind = PROVIDER_KINDS.find((candidate) => candidate === values.kind);
	if (values.id === undefined || kind === undefined)
		throw new Error(`--id <id> and --kind ${PROVIDER_KINDS.join("|")} are required`);
	if (values.protocol !== undefined && values.protocol !== "e2b")
		throw new Error("--protocol must be e2b");
	const at = values.sdk?.lastIndexOf("@") ?? -1;
	const sdk =
		values.sdk === undefined
			? undefined
			: at > 0
				? { name: values.sdk.slice(0, at), version: values.sdk.slice(at + 1) }
				: { name: values.sdk };
	return {
		id: values.id,
		kind,
		...(sdk && { sdk }),
		...(values.protocol === "e2b" && { protocol: "e2b" as const }),
		baked: values.baked,
	};
}

/** The spellings one provider id takes in generated source. */
function names(id: string) {
	const words = id.split("-");
	const capital = (word: string) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
	const constant = id.toUpperCase().replaceAll("-", "_");
	return {
		id,
		camel: `${words[0]}${words.slice(1).map(capital).join("")}`,
		pascal: words.map(capital).join(""),
		constant,
		provenance: provenanceConstant(id),
		credential: `${constant}_API_KEY`,
	};
}
type Names = ReturnType<typeof names>;

/** Source lines, skipping the empty ones a template leaves for an absent option. */
const lines = (source: readonly string[]): string => source.filter(Boolean).join("\n");

function validate(spec: NewProvider, read: (file: string) => string | undefined): void {
	assertProviderIdSyntax([spec.id]);
	if ((PROVIDER_IDS as readonly string[]).includes(spec.id))
		throw new Error(`${spec.id} is already a registered provider`);
	for (const file of [
		`packages/schema/src/provider-meta/${spec.id}.ts`,
		`packages/${spec.id}/package.json`,
	])
		if (read(file) !== undefined) throw new Error(`${file} already exists`);
	if (spec.protocol === "e2b" && spec.kind !== "sdk")
		throw new Error("--protocol e2b is an SDK binding: use --kind sdk");
	if (spec.kind === "sdk" && spec.sdk?.version === undefined)
		throw new Error("--kind sdk needs --sdk <npm package>@<exact version>");
	if (spec.kind === "http" && spec.sdk !== undefined)
		throw new Error("--kind http has no library to pin; omit --sdk");
	if (spec.sdk?.version !== undefined && !EXACT_VERSION.test(spec.sdk.version))
		throw new Error(`--sdk ${spec.sdk.name}@${spec.sdk.version}: pin an exact version`);
	const pinned = spec.kind === "sdk" && spec.sdk && vendorCatalog(read)[spec.sdk.name];
	// The vendor seam (ADR-0023 §2): exactly one provider package owns each vendor library.
	if (pinned)
		throw new Error(
			`${spec.sdk?.name} is already pinned at ${pinned} in catalogs.vendors, so a provider package owns it: a provider on the same SDK is an isolation variant of that package (its metadata declares package: { directory, entry } and the package adds src/<entry>.ts), not a new package`,
		);
}

const vendorCatalog = (read: (file: string) => string | undefined): Record<string, string> =>
	JSON.parse(required(read, "package.json")).workspaces.catalogs.vendors;

/**
 * The repository's Biome configuration reduced to layout (format and organized imports): the linter
 * and its project scan are what a scaffold with `unfilled` values could not pass yet anyway.
 */
function layoutConfig(): string {
	const config = JSON.parse(readFileSync(resolve(REPO_ROOT, "biome.json"), "utf8"));
	config.vcs = { enabled: false };
	config.linter = { enabled: false };
	config.overrides = config.overrides.filter((override: object) => "formatter" in override);
	return JSON.stringify(config);
}

/** Lay planned source files out as `bun run lint` would: imports organized, the repository's format. */
export function biomeFormat(files: ReadonlyMap<string, string>): Map<string, string> {
	const scratch = mkdtempSync(join(tmpdir(), "new-provider-"));
	try {
		writeScaffold(scratch, { files: new Map([...files, ["biome.json", layoutConfig()]]) });
		// The repository's pinned Biome: `bunx` would resolve a bare name against the scratch directory.
		const biome = resolve(REPO_ROOT, "node_modules/.bin/biome");
		const result = Bun.spawnSync([biome, "check", "--write", "."], {
			cwd: scratch,
			stdout: "pipe",
			stderr: "pipe",
		});
		if (result.exitCode !== 0)
			throw new Error(`biome could not lay out the scaffold:\n${result.stdout}`);
		return new Map(
			[...files.keys()].map((file) => [file, readFileSync(join(scratch, file), "utf8")]),
		);
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
}

/**
 * Plan a scaffold from the files it reads (`read` returns `undefined` for a missing file), laying
 * each new source file out with `format`. The same inputs always plan the same writes, so the cost
 * guard measures exactly what the command does.
 */
export function planProvider(
	spec: NewProvider,
	read: (file: string) => string | undefined,
	format: (files: ReadonlyMap<string, string>) => ReadonlyMap<string, string> = biomeFormat,
): ProviderScaffold {
	validate(spec, read);
	const n = names(spec.id);
	const files = new Map<string, string>();
	const edited = new Set<string>();
	const edit = (file: string, content: string) => {
		files.set(file, content);
		edited.add(file);
	};

	edit(
		"packages/schema/src/provider-ids.ts",
		withProviderId(required(read, "packages/schema/src/provider-ids.ts"), spec.id),
	);
	if (spec.kind === "sdk" && spec.sdk?.version !== undefined)
		edit(
			"package.json",
			withCatalogEntry(required(read, "package.json"), spec.sdk.name, spec.sdk.version),
		);
	const cli = spec.kind === "cli" ? (spec.sdk?.name ?? spec.id) : undefined;
	if (cli !== undefined && read(`.github/actions/setup-${cli}/action.yml`) === undefined)
		files.set(`.github/actions/setup-${cli}/action.yml`, setupAction(cli, spec.sdk?.version));

	const directory = `packages/${spec.id}`;
	files.set(`packages/schema/src/provider-meta/${spec.id}.ts`, metadata(spec, n, cli));
	files.set(`${directory}/package.json`, packageManifest(spec));
	files.set(`${directory}/tsconfig.json`, TSCONFIG);
	files.set(`${directory}/README.md`, readme(spec, n));
	files.set(`${directory}/src/index.ts`, entry(spec, n));
	files.set(`${directory}/src/vendor.ts`, adapter(spec, n, cli));
	files.set(`${directory}/src/index.test.ts`, tests(spec, n));
	if (spec.baked) files.set(`${directory}/src/artifact.ts`, artifactBuilder(n));

	const created = new Map([...files].filter(([file]) => !edited.has(file)));
	for (const [file, content] of format(created)) files.set(file, content);
	const authored = [...files].filter(([, content]) => HOLE.test(content)).map(([file]) => file);
	return { files, edited, authored };
}

function required(read: (file: string) => string | undefined, file: string): string {
	const content = read(file);
	if (content === undefined) throw new Error(`${file}: missing`);
	return content;
}

/** Append `id` to the identity tuple, the single list every registry projection derives from. */
export function withProviderId(source: string, id: string): string {
	const open = source.indexOf("export const PROVIDER_IDS = [");
	const close = source.indexOf("] as const;", open);
	if (open < 0 || close < 0) throw new Error("provider-ids.ts: PROVIDER_IDS tuple not found");
	return `${source.slice(0, close)}\t${JSON.stringify(id)},\n${source.slice(close)}`;
}

/** Pin `name`, which no provider package owns yet, in the root vendor catalog. */
export function withCatalogEntry(source: string, name: string, version: string): string {
	const manifest = JSON.parse(source);
	if (`${JSON.stringify(manifest, null, 2)}\n` !== source)
		throw new Error("package.json: not in canonical JSON form; format it first");
	const vendors: Record<string, string> = manifest.workspaces.catalogs.vendors;
	if (vendors[name] !== undefined) throw new Error(`${name} is already in catalogs.vendors`);
	vendors[name] = version;
	return `${JSON.stringify(manifest, null, 2)}\n`;
}

const TSCONFIG = `{
  "extends": "@repo/tsconfig/library.json",
  "include": ["src"]
}
`;

function packageManifest(spec: NewProvider): string {
	const dependencies: Record<string, string> = {
		"@sandbox-benchmarks/driver": "workspace:*",
		arktype: "catalog:",
	};
	if (spec.kind === "sdk" && spec.sdk) dependencies[spec.sdk.name] = "catalog:vendors";
	const manifest = {
		name: `@sandbox-benchmarks/${spec.id}`,
		version: "0.0.0",
		private: true,
		description: `${spec.id} sandbox integration for driverkit.`,
		type: "module",
		sideEffects: false,
		exports: {
			".": "./src/index.ts",
			...(spec.baked && { "./artifact": "./src/artifact.ts" }),
			"./package.json": "./package.json",
		},
		scripts: { test: "bun test", typecheck: "tsc --noEmit" },
		dependencies: Object.fromEntries(
			Object.entries(dependencies).sort(([left], [right]) => (left < right ? -1 : 1)),
		),
		devDependencies: {
			"@repo/tsconfig": "workspace:*",
			"@types/bun": "catalog:",
			typescript: "catalog:",
		},
	};
	return `${JSON.stringify(manifest, null, 2)}\n`;
}

function metadata(spec: NewProvider, n: Names, cli: string | undefined): string {
	const sdkPackage =
		spec.kind === "sdk"
			? JSON.stringify(spec.sdk?.name)
			: spec.kind === "cli"
				? `{ cli: ${JSON.stringify(cli)} }`
				: `{ http: unfilled('the version of the API contract the adapter speaks, as exact semver ("1.0.0")') }`;
	const specPinning =
		spec.protocol === "e2b"
			? `// E2B protocol: the template pins CPU and memory, not the per-sandbox create.
	specPinning: "fixed",`
			: spec.kind === "cli"
				? `specPinning: unfilled('"settable" when the create sets CPU and memory, "fixed" when the artifact pins them'),`
				: `// The create sets CPU and memory (\`coverage: mapped()\` in src/index.ts).
	specPinning: "settable",`;
	return `import { defineProviderMeta, unfilled } from "../provider-meta.ts";

export default defineProviderMeta(${JSON.stringify(spec.id)}, {
	displayName: unfilled("the provider's display name"),
	vendor: unfilled("the company that operates it"),
	website: unfilled("the provider's https product page"),
	sdkPackage: ${sdkPackage},
	artifact: { kind: ${spec.baked ? '"baked"' : '"image"'} },
	inputs: [${JSON.stringify(n.credential)}],
	isolation: unfilled("{ class, technology, notes? }: what isolates one sandbox"),
	pricing: unfilled('the published price components, or { model: "unavailable", reason, notes }'),
	maturity: { status: "beta", notes: "Opt-in until a committed validation run exists." },
	${specPinning}
});
`;
}

function readme(spec: NewProvider, n: Names): string {
	const library =
		spec.kind === "sdk"
			? `its \`${spec.sdk?.name}\` dependency`
			: spec.kind === "cli"
				? "its CLI table"
				: "its HTTP adapter";
	const kit =
		spec.kind === "cli"
			? "`@sandbox-benchmarks/driver/cli`"
			: "`@sandbox-benchmarks/driver/vendor`";
	const adapter =
		spec.protocol === "e2b"
			? "the shared `e2bProtocolVendor` over the SDK, stating only how the vendor differs"
			: spec.kind === "cli"
				? "the `defineCliSpec` table of argv per operation and the JSON rows it parses"
				: `the ${spec.kind === "sdk" ? "SDK" : "HTTP API"} translated into the control and data planes`;
	const stub =
		spec.protocol === "e2b"
			? "the shared `e2bProtocolStub`"
			: spec.kind === "http"
				? "a `restStub` route table"
				: "a stand-in";
	const builder = spec.baked
		? "- `src/artifact.ts` (`./artifact`) bakes the digest-pinned toolchain base into the artifact\n  the driver boots.\n"
		: "";
	return `# @sandbox-benchmarks/${n.id}

Owns the ${n.id} driver, ${library}, and its tests.
The fleet loader selects this package lazily.
The driver is written against ${kit} (ADR-0023),
which owns readiness, cleanup confirmation, recovery, inventory and the execution policy.

- \`src/vendor.ts\` is the adapter: ${adapter}.
- \`src/index.ts\` binds it in the kit's module.
${builder}
\`src/index.test.ts\` runs the contract over ${stub}
and drives a session through the package's own module.
Run \`bun run --filter @sandbox-benchmarks/${n.id} test\` or \`typecheck\` from the repo root.
`;
}

function entry(spec: NewProvider, n: Names): string {
	if (spec.kind === "cli")
		return `// The ${n.id} DriverModule: the kit's CLI driver over ${n.id}'s table (src/vendor.ts).

import { defineCliDriver } from "@sandbox-benchmarks/driver/cli";
import { ${n.provenance} } from "./provenance.ts";
import { ${n.camel}Spec } from "./vendor.ts";

export default defineCliDriver(${JSON.stringify(n.id)}, {
	provenance: ${n.provenance},
	// Longer work daemonizes through the kit's shell detach and polls its done file.
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	createAttemptCeilingMs: 10 * 60_000,
	spec: ${n.camel}Spec,
});
`;
	const e2b = spec.protocol === "e2b";
	const transport = spec.kind === "sdk" ? "SDK" : "transport";
	const imports = [
		`import { defineVendorDriver, ${e2b ? "pinned" : "mapped"} } from "@sandbox-benchmarks/driver/vendor";`,
		e2b ? 'import { E2B_ATTEMPT_KEY } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";' : "",
		spec.kind === "sdk" ? `import * as sdk from "${spec.sdk?.name}";` : "",
		`import { ${n.provenance} } from "./provenance.ts";`,
		`import { ${n.constant}_SANDBOX_ID, ${n.camel}Vendor } from "./vendor.ts";`,
	];
	const traits = e2b
		? `	// E2B protocol: the template pins 4 vCPU / 8 GiB; disk is proven after boot.
	coverage: pinned(4, 8),
	// Commands budgeted at or past the 60s synchronous cap launch natively in the background.
	execution: { syncCapMs: 60_000, durable: "native-launch" },
	markerKey: E2B_ATTEMPT_KEY,`
		: `	// The create maps CPU, memory and disk.
	coverage: mapped(),`;
	return `// The ${n.id} DriverModule: the kit's driver over ${n.id}'s adapter, bound to the real ${transport} here
// and nowhere else. Tests lower the same module over a stand-in through \`vendorDriver\`.

${lines(imports)}

export default defineVendorDriver(${JSON.stringify(n.id)}, {
	provenance: ${n.provenance},
	sandboxId: ${n.constant}_SANDBOX_ID,
${traits}
	vendor: (context) => ${n.camel}Vendor(${spec.kind === "sdk" ? "sdk" : "globalThis.fetch"}, context),
});
`;
}

const SANDBOX_ID = (n: Names) =>
	`/** The vendor's sandbox id; the kit refuses any other id at its trust boundary. */
export const ${n.constant}_SANDBOX_ID = type(/^[A-Za-z0-9_-]+$/);`;

function adapter(spec: NewProvider, n: Names, cli: string | undefined): string {
	const context = `Pick<DriverContext<${JSON.stringify(n.id)}>, "env" | "resolvedArtifact">`;
	if (spec.protocol === "e2b") {
		const sdk = spec.sdk?.name ?? "";
		return `// ${n.id}'s vendor adapter: the shared E2B-protocol adapter over the ${sdk} SDK, which it
// receives and never loads. Readiness, cleanup confirmation, recovery, inventory and the disk proof
// live in the driver kit (\`@sandbox-benchmarks/driver/vendor\`); state only how ${n.id} differs
// (\`E2bProtocolOptions\`: its domain, \`signals: true\` where the SDK honours the caller's signal,
// request bounds and command timeout).

import type { DriverContext } from "@sandbox-benchmarks/driver";
import { e2bProtocolVendor } from "@sandbox-benchmarks/driver/vendor/e2b-protocol";
import { type } from "arktype";
import type { Sandbox } from "${sdk}";

/** The SDK surface the adapter translates; the package entry passes the real module. */
export type ${n.pascal}Sdk = Pick<
	typeof import("${sdk}"),
	| "Sandbox"
	| "SandboxNotFoundError"
	| "AuthenticationError"
	| "InvalidArgumentError"
	| "RateLimitError"
>;

${SANDBOX_ID(n)}

export const ${n.camel}Vendor = (sdk: ${n.pascal}Sdk, { env, resolvedArtifact }: ${context}) =>
	e2bProtocolVendor<Sandbox>(sdk, {
		vendor: ${JSON.stringify(n.id)},
		apiKey: env.${n.credential},
		template: resolvedArtifact.ref,
	});
`;
	}
	if (spec.kind === "cli")
		return `// ${n.id}'s CLI adapter: the declarative table that turns the driver contract into \`${cli}\` argv
// and parses its JSON. Spawn, deadlines, cancellation, redaction, retries, output caps and
// lifecycle guards live once in \`@sandbox-benchmarks/driver/cli\`.

import type { DriverContext } from "@sandbox-benchmarks/driver";
import { defineCliSpec } from "@sandbox-benchmarks/driver/cli";
import { unfilled } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

/** The rows \`${cli} … --json\` prints. */
export const ${n.constant}_ROWS = type("string.json.parse").to(
	type({ id: "string >= 1", name: "string >= 1", status: "string >= 1" }).array(),
);

${SANDBOX_ID(n)}

export function ${n.camel}Spec({ resolvedArtifact }: DriverContext<${JSON.stringify(n.id)}>) {
	return defineCliSpec(${n.constant}_ROWS, {
		binary: ${JSON.stringify(cli)},
		secretFlags: [],
		commandTimeoutMs: 60_000,
		requestCoverage: unfilled("how the create honours each request axis"),
		create: (request, name) => unfilled("argv creating \`name\` from resolvedArtifact.ref"),
		cleanupCreated: {
			kind: "lookup",
			select: (rows, name) => rows.find((row) => row.name === name) ?? null,
			absenceConfirmationMs: 2_000,
		},
		ready: {
			poll: unfilled("argv listing every sandbox as JSON"),
			select: (rows, name) => rows.find((row) => row.name === name) ?? null,
			classify: (row) => unfilled('"ready", "pending", or { terminal } for one row'),
		},
		sandboxId: { fromRow: (row) => row.id, parse: ${n.constant}_SANDBOX_ID },
		exec: (id, command) => unfilled("argv running \`command\` in sandbox \`id\`"),
		destroy: (id) => unfilled("argv deleting sandbox \`id\`"),
		notFound: unfilled("the CLI's already-gone message, as a RegExp"),
	});
}
`;
	const sdk = spec.kind === "sdk";
	const http = sdk
		? ""
		: `
/** A non-2xx response; its status classifies the failure (404 absent, 4xx refused, 5xx transient). */
export class ${n.pascal}HttpError extends Error {
	constructor(
		readonly status: number,
		body: string,
	) {
		super(\`${n.id} API \${status}: \${body.slice(0, 200)}\`);
	}
}
`;
	const request = sdk
		? ""
		: `	/** One JSON request with the account's bearer token; a non-2xx response throws. */
	async function api(method: string, path: string, signal?: AbortSignal, body?: unknown) {
		const response = await fetch(new URL(path, unfilled("the API's base URL")), {
			method,
			...(signal && { signal }),
			headers: {
				authorization: \`Bearer \${env.${n.credential}}\`,
				...(body !== undefined && { "content-type": "application/json" }),
			},
			...(body !== undefined && { body: JSON.stringify(body) }),
		});
		const text = await response.text();
		if (!response.ok) throw new ${n.pascal}HttpError(response.status, text);
		return text === "" ? undefined : (JSON.parse(text) as unknown);
	}
`;
	return `// ${n.id}'s vendor adapter: translation only, over the ${sdk ? `${spec.sdk?.name} SDK` : "fetch transport"} it receives and never
// creates. Readiness, cleanup confirmation, recovery, inventory and the disk proof live in the
// driver kit (\`@sandbox-benchmarks/driver/vendor\`).

import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Unfilled, Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { ${sdk ? "" : "httpClassifiers, httpStatus, "}unfilled } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";
${sdk ? `\n/** The SDK surface the adapter translates; the package entry passes the real module. */\nexport type ${n.pascal}Sdk = typeof import("${spec.sdk?.name}");` : ""}
/** One sandbox as the vendor reports it. */
type Sandbox = Unfilled<"the vendor's sandbox type">;

${SANDBOX_ID(n)}
${http}
export function ${n.camel}Vendor(
	${sdk ? `sdk: ${n.pascal}Sdk` : "fetch: typeof globalThis.fetch"},
	{ env, resolvedArtifact }: ${context},
): Vendor<Sandbox, Sandbox> {
${request}	/** One sandbox in the port's terms: its id, phase and create-time marker. */
	const record = (sandbox: Sandbox): VendorRecord<Sandbox> =>
		unfilled("{ id, phase, marker, raw: sandbox }");
	return {
		control: {
			// Boot resolvedArtifact.ref, stamped with the marker; "pending" unless the response proves
			// readiness.
			create: async ({ request, marker }, { signal }) => unfilled("the created sandbox's record"),
			// null only on the vendor's own not-found.
			get: async (id, { signal }) => unfilled("the sandbox's record"),
			remove: async (id, { signal }) => unfilled('"removed" when the delete proves it, else "accepted"'),
			page: async (cursor, { signal }) => unfilled("{ records, next? }: one page of the account"),
${sdk ? "" : `			...httpClassifiers(httpStatus(${n.pascal}HttpError, (error) => error.status)),\n`}		},
		data: {
			attach: ({ raw }) => raw,
			exec: async (sandbox, command, options) => unfilled("{ exitCode, stdout, stderr }"),
		},
	};
}
`;
}

const REQUEST = `const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};`;

const FILES = `
	await session.files?.writeText("/tmp/item", "saved");
	expect(await session.files?.readFile("/tmp/item")).toBe("saved");`;

function tests(spec: NewProvider, n: Names): string {
	const id = JSON.stringify(n.id);
	if (spec.kind === "cli")
		return `// ${n.id} tested through its table: one session over a stand-in for the CLI. The CLI kit's
// behaviour is tested once in the driver package; add translation tests for ${n.id}'s argv and rows.

import { expect, test } from "bun:test";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { driverFromTable } from "@sandbox-benchmarks/driver";
import type { CliRunner } from "@sandbox-benchmarks/driver/cli";
import { cliMethodTable } from "@sandbox-benchmarks/driver/cli";
import { unfilled } from "@sandbox-benchmarks/driver/vendor";
import { testContext } from "@sandbox-benchmarks/driver/vendor/testing";
import ${n.camel} from "./index.ts";
import { ${n.camel}Spec } from "./vendor.ts";

const context = testContext(${id});
${REQUEST}

/** One account's stand-in for the CLI: it answers the table's create, list, exec and delete argv. */
const stubCli = (): CliRunner => unfilled("an in-memory stand-in for the CLI");

test("a session runs and is destroyed through the module's table", async () => {
	expect(${n.camel}.id).toBe(${id});
	const table = cliMethodTable(${id}, ${n.camel}Spec(context), { run: stubCli() });
	const driver = driverFromTable(table, () => Promise.resolve({}));
	const session = await driver.create(request);
	expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
	await session.destroy();
});
`;
	const e2b = spec.protocol === "e2b";
	const sdk = spec.kind === "sdk";
	const stub = e2b
		? ""
		: sdk
			? `
/**
 * A whole-account stand-in for the SDK surface ${n.camel}Vendor translates: its sandboxes become
 * ready within a few reads and answer \`sh -c 'exit 7'\` with exit 7, as the port contract assumes.
 */
const stub = (): ${n.pascal}Sdk => unfilled("an in-memory stand-in for the SDK");
`
			: `
/**
 * A whole-account stand-in for the API ${n.camel}Vendor translates, as a route table from
 * \`"METHOD /path/:id"\` to the answer: \`add\` allocates a sandbox, \`row\` is the one \`:id\` names,
 * and \`run\` executes in its guest (\`sh -c 'exit 7'\` exits 7, as the port contract assumes).
 */
const stub = () => restStub(unfilled("the API's routes")).fetch;
`;
	const make = e2b ? `e2bProtocolStub<${n.pascal}Sdk>().sdk` : "stub()";
	const testing = e2b
		? "e2bProtocolStub, testContext, vendorContract, vendorDriver"
		: sdk
			? "testContext, vendorContract, vendorDriver"
			: "restStub, testContext, vendorContract, vendorDriver";
	const imports = [
		'import { expect, test } from "bun:test";',
		'import type { CreateRequest } from "@sandbox-benchmarks/driver";',
		e2b ? "" : 'import { unfilled } from "@sandbox-benchmarks/driver/vendor";',
		`import { ${testing} } from "@sandbox-benchmarks/driver/vendor/testing";`,
		`import ${n.camel} from "./index.ts";`,
		spec.kind === "sdk" ? `import type { ${n.pascal}Sdk } from "./vendor.ts";` : "",
		`import { ${n.camel}Vendor } from "./vendor.ts";`,
	];
	return `// ${n.id} tested at the vendor seam: the port contract over ${e2b ? "the shared E2B-protocol stand-in" : "a stand-in"}, and a session through
// the package's own module. Kit behaviour is tested once in the driver package; add translation
// tests for ${n.id}'s quirks beside these.

${lines(imports)}

const context = testContext(${id});
${REQUEST}
${stub}
vendorContract("${n.id} adapter", ${n.camel}, () => ${n.camel}Vendor(${make}, context));

test("a session runs${e2b ? ", round-trips a file" : ""} and is destroyed, leaving nothing owned", async () => {
	const driver = vendorDriver(${n.camel}, context, {
		vendor: ${n.camel}Vendor(${make}, context),
		timing: { pollMs: 0 },
	});
	const session = await driver.create(request);
	expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });${e2b ? FILES : ""}
	await session.destroy();
	expect((await driver.inventory?.list())?.owned).toEqual([]);
});
`;
}

function artifactBuilder(n: Names): string {
	return `// The ${n.id} artifact builder (\`./artifact\`): bakes the digest-pinned toolchain base into the
// artifact the driver boots, and returns exactly the ref it boots.

import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";
import { unfilled } from "@sandbox-benchmarks/driver/vendor";

export default defineArtifactBuilder(${JSON.stringify(n.id)}, async ({ name, base, spec, env, log, signal }) =>
	unfilled("build \`name\` from base.digestRef with the vendor's builder; resolve { ref, replaced }"),
);
`;
}

/** A checksum-pinned install of a vendor CLI; `generate-providers` reads its version as provenance. */
function setupAction(cli: string, version: string | undefined): string {
	return `name: Set up the ${cli} CLI
description: Install the checksum-pinned ${cli} CLI onto the runner, because the adapter drives it as a subprocess.

inputs:
  version:
    description: Immutable ${cli} release, substituted for {version} in the archive URL.
    default: ${version ?? '"unfilled: the exact release version"'}
  url:
    description: The release archive (a .tar.gz holding the ${cli} binary at its root).
    default: "unfilled: the archive URL, with {version} for the release"
  sha256:
    description: sha256 of the archive, verified against this pin rather than the vendor's own.
    default: "unfilled: the archive's sha256"

runs:
  using: composite
  steps:
    - name: Install ${cli}
      shell: bash
      env:
        CLI_VERSION: \${{ inputs.version }}
        CLI_URL: \${{ inputs.url }}
        CLI_SHA256: \${{ inputs.sha256 }}
        INSTALL_DIR: \${{ runner.temp }}/${cli}/bin
      run: |
        set -euo pipefail
        workdir="$(mktemp -d)"
        curl -fsSL --retry 3 "\${CLI_URL//\\{version\\}/\${CLI_VERSION}}" -o "\${workdir}/archive.tar.gz"
        echo "\${CLI_SHA256}  \${workdir}/archive.tar.gz" | sha256sum --check --strict
        tar -xzf "\${workdir}/archive.tar.gz" -C "\${workdir}"
        mkdir -p "\${INSTALL_DIR}"
        install -m 0755 "\${workdir}/${cli}" "\${INSTALL_DIR}/${cli}"
        echo "\${INSTALL_DIR}" >> "\${GITHUB_PATH}"
`;
}

/** Write a planned scaffold under `root`. */
export function writeScaffold(root: string, scaffold: Pick<ProviderScaffold, "files">): void {
	for (const [file, content] of scaffold.files) {
		const path = resolve(root, file);
		mkdirSync(dirname(path), { recursive: true });
		writeFileSync(path, content);
	}
}

const readRepoFile = (file: string): string | undefined => {
	const path = resolve(REPO_ROOT, file);
	return existsSync(path) ? readFileSync(path, "utf8") : undefined;
};

if (import.meta.main) {
	try {
		const spec = parseNewProviderArgs(process.argv.slice(2));
		const scaffold = planProvider(spec, readRepoFile);
		writeScaffold(REPO_ROOT, scaffold);
		console.log(`✓ scaffolded ${spec.id}:`);
		for (const file of scaffold.files.keys())
			console.log(`  ${scaffold.edited.has(file) ? "~" : "+"} ${file}`);
		const install = Bun.spawnSync(["bun", "install", "--ignore-scripts"], {
			cwd: REPO_ROOT,
			stdout: "inherit",
			stderr: "inherit",
		});
		if (install.exitCode !== 0)
			console.error("bun install --ignore-scripts failed; run it again before generating");
		console.log(
			[
				"",
				"Next:",
				"  1. State every `unfilled(...)` (typecheck names each one) in:",
				...scaffold.authored.map((file) => `       ${file}`),
				"  2. bun run generate-providers   (registry, loader, provenance, workflows, env, snapshot)",
				`  3. bun run typecheck && bun run --filter @sandbox-benchmarks/${spec.id} test`,
			].join("\n"),
		);
	} catch (error) {
		console.error("new-provider failed:", error instanceof Error ? error.message : error);
		process.exit(1);
	}
}
