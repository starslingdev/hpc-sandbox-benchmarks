// The cost guard for adding a provider (ADR-0023): what `bun run new-provider` writes, which of
// those files its author must edit, how much of the adapter skeleton is left to write, and that
// once the metadata is stated `generate-providers` leaves no other file to touch. Measured on the
// scaffolder's own plan, so a template that grows or a wiring step that falls back to hand edits
// fails here. `check:new-provider` (new-provider-e2e.ts) runs the same scaffolds through every gate.

import { afterAll, describe, expect, test } from "bun:test";
import {
	cpSync,
	existsSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PROVIDER_IDS } from "../src/provider-ids.ts";
import { providerPackage } from "../src/providers.ts";
import { fillMetadata } from "./new-provider.fixture.ts";
import type { NewProvider, ProviderScaffold } from "./new-provider.ts";
import { HOLE, parseNewProviderArgs, planProvider, writeScaffold } from "./new-provider.ts";
import { generatedProviderRegions, REPO_ROOT } from "./provider-wiring.ts";

const readFrom =
	(root: string) =>
	(file: string): string | undefined => {
		const path = resolve(root, file);
		return existsSync(path) ? readFileSync(path, "utf8") : undefined;
	};

const args = (line: string): NewProvider => parseNewProviderArgs(line.split(" "));
const meta = (id: string) => `packages/schema/src/provider-meta/${id}.ts`;
const pkg = (id: string, ...files: string[]) => files.map((file) => `packages/${id}/${file}`);
const PACKAGE_FILES = ["package.json", "tsconfig.json", "README.md", "src/index.ts"];
const IDS = "packages/schema/src/provider-ids.ts";

/** One scaffold per provider kind: the files it writes and the ones its author edits by hand. */
const KINDS = {
	"E2B protocol": {
		spec: args("--id=acme-e2b --kind=sdk --protocol=e2b --sdk=acme-sandbox@1.0.0"),
		edited: [IDS, "package.json"],
		created: [
			meta("acme-e2b"),
			...pkg("acme-e2b", ...PACKAGE_FILES, "src/vendor.ts", "src/index.test.ts"),
		],
		authored: [meta("acme-e2b"), "packages/acme-e2b/src/vendor.ts"],
		holes: 1,
		codeLines: 24,
	},
	"E2B protocol, baked": {
		spec: args("--id=acme-baked --kind=sdk --protocol=e2b --sdk=acme-baked-sandbox@1.0.0 --baked"),
		edited: [IDS, "package.json"],
		created: [
			meta("acme-baked"),
			...pkg(
				"acme-baked",
				...PACKAGE_FILES,
				"src/vendor.ts",
				"src/index.test.ts",
				"src/artifact.ts",
			),
		],
		authored: [
			meta("acme-baked"),
			"packages/acme-baked/src/vendor.ts",
			"packages/acme-baked/src/artifact.ts",
		],
		holes: 1,
		codeLines: 24,
	},
	SDK: {
		spec: args("--id=acme-sdk --kind=sdk --sdk=@acme/sdk@1.2.3"),
		edited: [IDS, "package.json"],
		created: [
			meta("acme-sdk"),
			...pkg("acme-sdk", ...PACKAGE_FILES, "src/vendor.ts", "src/index.test.ts"),
		],
		// The test's stand-in for the SDK: a vendor-specific transport cannot be stubbed generically.
		authored: [
			meta("acme-sdk"),
			"packages/acme-sdk/src/vendor.ts",
			"packages/acme-sdk/src/index.test.ts",
		],
		holes: 7,
		codeLines: 27,
	},
	HTTP: {
		spec: args("--id=acme-http --kind=http"),
		edited: [IDS],
		created: [
			meta("acme-http"),
			...pkg("acme-http", ...PACKAGE_FILES, "src/vendor.ts", "src/index.test.ts"),
		],
		authored: [
			meta("acme-http"),
			"packages/acme-http/src/vendor.ts",
			"packages/acme-http/src/index.test.ts",
		],
		holes: 8,
		codeLines: 49,
	},
	CLI: {
		spec: args("--id=acme-cli --kind=cli --sdk=acme@0.4.2"),
		edited: [IDS],
		created: [
			".github/actions/setup-acme/action.yml",
			meta("acme-cli"),
			...pkg("acme-cli", ...PACKAGE_FILES, "src/vendor.ts", "src/index.test.ts"),
		],
		// The CLI's pinned release (its archive URL and checksum) is the vendor's to state.
		authored: [
			".github/actions/setup-acme/action.yml",
			meta("acme-cli"),
			"packages/acme-cli/src/vendor.ts",
			"packages/acme-cli/src/index.test.ts",
		],
		holes: 7,
		codeLines: 31,
	},
} as const;

const sorted = (files: Iterable<string>) => [...files].sort();
/** The values left for the author: each is one line they write. */
const holes = (source: string) => source.match(/\bunfilled\(|\bUnfilled</g)?.length ?? 0;
/** Lines of code, without blank lines and comments. */
const codeLines = (source: string) =>
	source.split("\n").filter((line) => !/^\s*(?:$|\/\/|\/\*\*?|\*)/.test(line)).length;

const copies: string[] = [];
afterAll(() => {
	for (const copy of copies.splice(0)) rmSync(copy, { recursive: true, force: true });
});

/** Copy what the scaffolder and the generator read or write, sharing the installed dependencies. */
function copyTree(): string {
	const root = mkdtempSync(join(tmpdir(), "new-provider-"));
	copies.push(root);
	const copy = (path: string) =>
		cpSync(resolve(REPO_ROOT, path), resolve(root, path), {
			recursive: true,
			filter: (source) => !source.includes("node_modules"),
		});
	for (const path of [
		"package.json",
		"biome.json",
		"packages/schema",
		"packages/drivers",
		".github",
	])
		copy(path);
	for (const directory of new Set(PROVIDER_IDS.map((id) => providerPackage(id).directory))) {
		copy(`packages/${directory}/package.json`);
		copy(`packages/${directory}/src`);
	}
	for (const file of new Set(generatedProviderRegions().map((region) => region.file))) copy(file);
	symlinkSync(resolve(REPO_ROOT, "node_modules"), resolve(root, "node_modules"));
	return root;
}

function run(root: string, argv: readonly string[]) {
	const result = Bun.spawnSync([...argv], { cwd: root, stdout: "pipe", stderr: "pipe" });
	return { exitCode: result.exitCode, output: `${result.stdout}${result.stderr}` };
}

describe("new-provider: what one scaffold writes and leaves to its author", () => {
	const plans = new Map<string, ProviderScaffold>();
	const plan = (kind: keyof typeof KINDS) => {
		const cached = plans.get(kind);
		if (cached) return cached;
		const planned = planProvider(KINDS[kind].spec, readFrom(REPO_ROOT));
		plans.set(kind, planned);
		return planned;
	};

	for (const kind of Object.keys(KINDS) as Array<keyof typeof KINDS>) {
		const expected = KINDS[kind];
		test(`${kind}: the exact files written, edited in place, and edited by hand`, () => {
			const scaffold = plan(kind);
			expect(sorted(scaffold.files.keys())).toEqual(
				sorted([...expected.edited, ...expected.created]),
			);
			expect(sorted(scaffold.edited)).toEqual(sorted(expected.edited));
			expect(sorted(scaffold.authored)).toEqual(sorted(expected.authored));
			// Only the authored files hold values to state; every other file is final as written.
			for (const [file, content] of scaffold.files)
				expect(HOLE.test(content)).toBe(expected.authored.some((authored) => authored === file));
		});

		test(`${kind}: the adapter skeleton stays within its budget`, () => {
			const adapter = plan(kind).files.get(`packages/${expected.spec.id}/src/vendor.ts`) ?? "";
			expect(holes(adapter)).toBeLessThanOrEqual(expected.holes);
			expect(codeLines(adapter)).toBeLessThanOrEqual(expected.codeLines);
		});
	}

	test("the E2B protocol's adapter is the shared binding with one difference to state", () => {
		const adapter = plan("E2B protocol").files.get("packages/acme-e2b/src/vendor.ts") ?? "";
		expect(adapter).toContain("e2bProtocolVendor<Sandbox>(sdk, {");
		expect(adapter.match(/unfilled\("[^"]*"\)/g)).toEqual([
			`unfilled("true when the SDK honours the caller's signal on every call")`,
		]);
	});

	test("edits in place append the identity and pin the SDK, preserving everything else", () => {
		const scaffold = plan("SDK");
		const ids = scaffold.files.get(IDS) ?? "";
		expect(ids).toBe(
			(readFrom(REPO_ROOT)(IDS) ?? "").replace('\t"brezel",\n', '\t"brezel",\n\t"acme-sdk",\n'),
		);
		const root = JSON.parse(scaffold.files.get("package.json") ?? "{}");
		expect(root.workspaces.catalogs.vendors["@acme/sdk"]).toBe("1.2.3");
		const manifest = JSON.parse(scaffold.files.get("packages/acme-sdk/package.json") ?? "{}");
		expect(manifest.dependencies["@acme/sdk"]).toBe("catalog:vendors");
		// An SDK already pinned at the same version is reused, not re-pinned.
		const e2b = JSON.parse(readFrom(REPO_ROOT)("package.json") ?? "{}").workspaces.catalogs.vendors
			.e2b;
		const reused = planProvider(
			args(`--id=acme-reuse --kind=sdk --sdk=e2b@${e2b}`),
			readFrom(REPO_ROOT),
		);
		expect(sorted(reused.edited)).toEqual([IDS]);
	});

	test("refuses a scaffold that would collide or pin loosely", () => {
		const read = readFrom(REPO_ROOT);
		const refused = (line: string) => () => planProvider(args(line), read);
		expect(refused("--id=e2b --kind=sdk --sdk=e2b@1.0.0")).toThrow("already a registered provider");
		expect(refused("--id=Acme --kind=http")).toThrow("kebab-case");
		expect(refused("--id=acme --kind=http --protocol=e2b")).toThrow("use --kind sdk");
		expect(refused("--id=acme --kind=sdk --sdk=acme-sdk")).toThrow("exact version");
		expect(refused("--id=acme --kind=sdk --sdk=acme-sdk@^1.0.0")).toThrow("pin an exact version");
		expect(refused("--id=acme --kind=sdk --sdk=e2b@0.0.1")).toThrow("already pinned at");
		expect(() => parseNewProviderArgs(["--id=acme"])).toThrow("--kind");
	});

	test("once the metadata is stated, generate-providers leaves no other file to edit", () => {
		const root = copyTree();
		const read = readFrom(root);
		const scaffolds = (Object.keys(KINDS) as Array<keyof typeof KINDS>).map((kind) => {
			// Each scaffold plans against the tree the previous one left, as successive runs would.
			const scaffold = planProvider(KINDS[kind].spec, read);
			writeScaffold(root, scaffold);
			return scaffold;
		});

		// Unstated metadata is refused by name, before anything is generated.
		const unstated = run(root, ["bun", "packages/schema/scripts/generate-providers.ts"]);
		expect(unstated.exitCode).toBe(1);
		expect(unstated.output).toContain("unfilled: the provider's display name");

		for (const { spec } of Object.values(KINDS))
			writeFileSync(resolve(root, meta(spec.id)), fillMetadata(read(meta(spec.id)) ?? ""));
		const before = new Map(
			scaffolds.flatMap((scaffold) => [...scaffold.files.keys()]).map((file) => [file, read(file)]),
		);
		expect(run(root, ["bun", "packages/schema/scripts/generate-providers.ts"]).exitCode).toBe(0);
		const check = run(root, ["bun", "packages/schema/scripts/generate-providers.ts", "--check"]);
		expect(check.output).toContain("match the metadata registry");

		// The generator wrote only its own outputs; the scaffolded files are as the author left them.
		const listed = run(root, [
			"bun",
			"-e",
			'const { generatedProviderFiles } = await import("./packages/schema/scripts/generate-providers.ts"); console.log((await generatedProviderFiles()).join("\\n"));',
		]);
		const generated = new Set(listed.output.trim().split("\n"));
		for (const { spec } of Object.values(KINDS))
			expect(generated).toContain(`packages/${spec.id}/src/provenance.ts`);
		for (const [file, content] of before)
			if (!generated.has(file) && !file.startsWith("packages/schema/src/provider-meta/"))
				expect(read(file)).toBe(content ?? "");

		// Every file the scaffold leaves final passes the repository's lint as written.
		const final = scaffolds.flatMap((scaffold) =>
			[...scaffold.files.keys()].filter(
				(file) =>
					!scaffold.authored.includes(file) &&
					!scaffold.edited.has(file) &&
					/\.(?:ts|json)$/.test(file),
			),
		);
		const lint = run(root, [
			"bunx",
			"biome",
			"check",
			"--vcs-enabled=false",
			"--error-on-warnings",
			...final,
		]);
		expect(lint.output).toContain(`Checked ${final.length} files`);
		expect(lint.exitCode).toBe(0);
	}, 60_000);
});
