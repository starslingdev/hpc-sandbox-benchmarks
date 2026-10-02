// End-to-end: the real `generate-providers` entry point, run as a subprocess against a temporary copy
// of every file it reads or writes, so a deliberately stale metadata value never touches the tree.
import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { PROVIDER_IDS } from "../src/provider-ids.ts";
import { providerPackage } from "../src/providers.ts";
import { generatedProviderRegions, REPO_ROOT } from "./provider-wiring.ts";

const copies: string[] = [];
afterEach(() => {
	for (const copy of copies.splice(0)) rmSync(copy, { recursive: true, force: true });
});

/** Copy the generator, the metadata, every provider package and every managed output. */
function copyTree(): string {
	const root = mkdtempSync(join(tmpdir(), "generate-providers-"));
	copies.push(root);
	const copy = (path: string) =>
		cpSync(resolve(REPO_ROOT, path), resolve(root, path), {
			recursive: true,
			filter: (source) => !source.includes("node_modules"),
		});
	for (const path of ["package.json", "packages/schema", "packages/drivers", ".github/actions"])
		copy(path);
	for (const directory of new Set(PROVIDER_IDS.map((id) => providerPackage(id).directory))) {
		copy(`packages/${directory}/package.json`);
		copy(`packages/${directory}/src`);
	}
	for (const file of new Set(generatedProviderRegions().map((region) => region.file))) copy(file);
	symlinkSync(resolve(REPO_ROOT, "node_modules"), resolve(root, "node_modules"));
	return root;
}

function run(root: string, ...args: string[]) {
	const result = Bun.spawnSync(
		["bun", resolve(root, "packages/schema/scripts/generate-providers.ts"), ...args],
		{ cwd: root, stdout: "pipe", stderr: "pipe" },
	);
	return { exitCode: result.exitCode, output: `${result.stdout}${result.stderr}` };
}

function edit(root: string, file: string, from: string, to: string): void {
	const path = resolve(root, file);
	const source = readFileSync(path, "utf8");
	expect(source).toContain(from);
	writeFileSync(path, source.replace(from, to));
}

describe("generate-providers", () => {
	test("the drift check passes on a clean tree", () => {
		const root = copyTree();
		const check = run(root, "--check");
		expect(check.output).toContain("match the metadata registry");
		expect(check.exitCode).toBe(0);
	});

	test("a metadata edit without regeneration fails the check; regenerating restores it", () => {
		const root = copyTree();
		edit(
			root,
			"packages/schema/src/provider-meta/e2b.ts",
			'displayName: "E2B"',
			'displayName: "E2B Cloud"',
		);
		const stale = run(root, "--check");
		expect(stale.exitCode).toBe(1);
		expect(stale.output).toContain(".env.example");
		expect(stale.output).toContain("run `bun run generate-providers`");

		const generate = run(root);
		expect(generate.exitCode).toBe(0);
		expect(readFileSync(resolve(root, ".env.example"), "utf8")).toContain("# --- E2B Cloud (");
		expect(run(root, "--check").exitCode).toBe(0);
	});

	test("a provider id without its assembled registry entry fails the check", () => {
		const root = copyTree();
		edit(
			root,
			"packages/schema/src/provider-meta/index.ts",
			"\tbrezel: MODULES.brezel.meta,\n",
			"",
		);
		const stale = run(root, "--check");
		expect(stale.exitCode).toBe(1);
		expect(stale.output).toContain("packages/schema/src/provider-meta/index.ts");
	});

	test("an sdkPackage its provider package does not depend on fails generation", () => {
		const root = copyTree();
		edit(
			root,
			"packages/schema/src/provider-meta/runloop.ts",
			'sdkPackage: "@runloop/api-client"',
			'sdkPackage: "@computesdk/runloop"',
		);
		const stale = run(root, "--check");
		expect(stale.exitCode).toBe(1);
		expect(stale.output).toContain(
			"runloop: sdkPackage @computesdk/runloop is not a runtime dependency of packages/runloop/package.json",
		);
	});

	test("a CLI sdkPackage without a pinned setup action fails generation", () => {
		const root = copyTree();
		edit(
			root,
			"packages/schema/src/provider-meta/tama.ts",
			'sdkPackage: { cli: "tama" }',
			'sdkPackage: { cli: "tamarind" }',
		);
		const stale = run(root, "--check");
		expect(stale.exitCode).toBe(1);
		expect(stale.output).toContain(".github/actions/setup-tamarind/action.yml");
	});
});
