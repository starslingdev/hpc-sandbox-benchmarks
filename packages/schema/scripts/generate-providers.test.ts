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