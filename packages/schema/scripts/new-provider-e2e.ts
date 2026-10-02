#!/usr/bin/env bun
// `check:new-provider`: the scaffolder end to end, against a temporary copy of the repository.
// It runs the real `new-provider` command once per provider kind (an E2B-protocol SDK that bakes,
// a plain SDK, an HTTP API and a CLI), states only what each scaffold left `unfilled`, the way an
// author would, runs `generate-providers`, and then holds the result to the gates a real provider
// must pass: the drift check, lint of every scaffolded file, the whole repository's typecheck, and
// the tests of the new packages, the driver loader and the registry snapshot. Finally it proves
// that nothing changed beyond the scaffolds, the generator's outputs and the lockfile, and reports
// what each kind cost.
//
// It installs dependencies and typechecks every package, so it runs as its own CI step rather than
// inside `bun run test`.

import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	fillCliAdapter,
	fillCliTest,
	fillE2bAdapter,
	filledArtifactBuilder,
	fillHttpAdapter,
	fillHttpTest,
	fillMetadata,
	fillSdkAdapter,
	fillSdkTest,
	fillSetupAction,
	handWrittenLines,
} from "./new-provider.fixture.ts";

const SOURCE_ROOT = resolve(import.meta.dir, "../../..");

function sh(cwd: string, argv: readonly string[]): string {
	const result = Bun.spawnSync([...argv], { cwd, stdout: "pipe", stderr: "pipe" });
	const output = `${result.stdout}${result.stderr}`;
	if (result.exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${output}`);
	return output;
}

/** A tree's files, tracked or not, minus ignored ones (dependencies, build output). */
const filesOf = (root: string): string[] =>
	sh(root, ["git", "ls-files", "-z", "--cached", "--others", "--exclude-standard"])
		.split("\0")
		.filter((file) => file !== "");

function contents(root: string): Map<string, string> {
	const read = new Map<string, string>();
	for (const file of filesOf(root)) {
		try {
			read.set(file, readFileSync(join(root, file), "utf8"));
		} catch {
			// Tracked but deleted in the working tree.
		}
	}
	return read;
}

const changed = (from: ReadonlyMap<string, string>, to: ReadonlyMap<string, string>) =>
	[...to].filter(([file, text]) => from.get(file) !== text).map(([file]) => file);

function step(label: string, work: () => unknown): void {
	const started = performance.now();
	work();
	console.log(`✓ ${label} (${((performance.now() - started) / 1000).toFixed(1)}s)`);
}

interface Case {
	readonly label: string;
	readonly id: string;
	readonly args: readonly string[];
	/** What the author writes, by repository-relative file. */
	readonly fills: Readonly<Record<string, (scaffold: string) => string>>;
}

const root = mkdtempSync(join(tmpdir(), "new-provider-e2e-"));
try {
	// The working tree, minus the dataset and prototypes nothing here reads.
	for (const file of filesOf(SOURCE_ROOT).filter((path) => !/^(?:data|prototypes)\//.test(path)))
		try {
			cpSync(join(SOURCE_ROOT, file), join(root, file));
		} catch {
			// Tracked but deleted in the working tree.
		}
	sh(root, ["git", "init", "--quiet"]);
	step("bun install (the checkout a developer starts from)", () =>
		sh(root, ["bun", "install", "--frozen-lockfile", "--ignore-scripts"]),
	);
	const before = contents(root);
	// The pinned E2B SDK stands in for a vendor's own SDK, E2B-compatible or not.
	const e2b = JSON.parse(before.get("package.json") ?? "{}").workspaces.catalogs.vendors.e2b;
	const meta = (id: string) => `packages/schema/src/provider-meta/${id}.ts`;
	const CASES: readonly Case[] = [
		{
			label: "E2B-protocol SDK, baked",
			id: "acme",
			args: ["--kind=sdk", "--protocol=e2b", `--sdk=e2b@${e2b}`, "--baked"],
			fills: {
				[meta("acme")]: fillMetadata,
				"packages/acme/src/vendor.ts": fillE2bAdapter,
				"packages/acme/src/artifact.ts": () => filledArtifactBuilder("acme"),
			},
		},
		{
			label: "SDK",
			id: "acme-sdk",
			args: ["--kind=sdk", `--sdk=e2b@${e2b}`],
			fills: {
				[meta("acme-sdk")]: fillMetadata,
				"packages/acme-sdk/src/vendor.ts": fillSdkAdapter,
				"packages/acme-sdk/src/index.test.ts": fillSdkTest,
			},
		},
		{
			label: "HTTP",
			id: "acme-http",
			args: ["--kind=http"],
			fills: {
				[meta("acme-http")]: fillMetadata,
				"packages/acme-http/src/vendor.ts": fillHttpAdapter,
				"packages/acme-http/src/index.test.ts": fillHttpTest,
			},
		},
		{
			label: "CLI",
			id: "acme-cli",
			args: ["--kind=cli", "--sdk=acme@0.4.2"],
			fills: {
				".github/actions/setup-acme/action.yml": fillSetupAction,
				[meta("acme-cli")]: fillMetadata,
				"packages/acme-cli/src/vendor.ts": fillCliAdapter,
				"packages/acme-cli/src/index.test.ts": fillCliTest,
			},
		},
	];

	const scaffolds = new Map<Case, string[]>();
	let current = before;
	for (const scenario of CASES)
		step(`bun run new-provider (${scenario.label}, with its bun install)`, () => {
			sh(root, ["bun", "run", "new-provider", "--", `--id=${scenario.id}`, ...scenario.args]);
			const next = contents(root);
			scaffolds.set(
				scenario,
				changed(current, next).filter((file) => file !== "bun.lock"),
			);
			current = next;
		});
	const scaffolded = current;
	const fills = CASES.flatMap((scenario) => Object.entries(scenario.fills));
	step("the author fills every unfilled value and formats", () => {
		for (const [file, fill] of fills)
			writeFileSync(join(root, file), fill(scaffolded.get(file) ?? ""));
		const sources = fills.map(([file]) => file).filter((file) => file.endsWith(".ts"));
		sh(root, ["bunx", "biome", "check", "--write", ...sources]);
	});

	step("bun run generate-providers", () => sh(root, ["bun", "run", "generate-providers"]));
	step("bun run check:providers", () => sh(root, ["bun", "run", "check:providers"]));
	step("biome check of every scaffolded file", () =>
		sh(root, [
			"bunx",
			"biome",
			"check",
			"--error-on-warnings",
			...CASES.flatMap(({ id }) => [`packages/${id}`, meta(id)]),
		]),
	);
	step("bun run typecheck (every package)", () => sh(root, ["bun", "run", "typecheck"]));
	step("tests: the new packages, the driver loader, the registry snapshot", () => {
		for (const { id } of CASES) sh(join(root, `packages/${id}`), ["bun", "test"]);
		sh(join(root, "packages/drivers"), ["bun", "test"]);
		sh(join(root, "packages/schema"), ["bun", "test", "./src/provider-registry.test.ts"]);
	});

	// Nothing changed but the scaffolds, what the author filled, the generator's outputs and the lock.
	const generated = new Set(
		sh(root, [
			"bun",
			"-e",
			'const { generatedProviderFiles } = await import("./packages/schema/scripts/generate-providers.ts"); console.log((await generatedProviderFiles()).join("\\n"));',
		])
			.trim()
			.split("\n"),
	);
	const after = contents(root);
	const scaffoldFiles = new Set([...scaffolds.values()].flat());
	const stray = changed(before, after).filter(
		(file) => !scaffoldFiles.has(file) && !generated.has(file) && file !== "bun.lock",
	);
	if (stray.length > 0) throw new Error(`changed outside scaffolds and generator: ${stray}`);
	const handEdited = changed(scaffolded, after)
		.filter((file) => !generated.has(file))
		.sort();
	const expected = fills.map(([file]) => file).sort();
	if (handEdited.join() !== expected.join())
		throw new Error(`hand-edited ${handEdited}, expected only ${expected}`);

	console.log("\nWhat each provider kind cost:");
	for (const scenario of CASES) {
		const lines = Object.keys(scenario.fills).map(
			(file) =>
				[file, handWrittenLines(scaffolded.get(file) ?? "", after.get(file) ?? "")] as const,
		);
		const files = scaffolds.get(scenario) ?? [];
		const edited = files.filter((file) => before.has(file)).length;
		const total = lines.reduce((sum, [, count]) => sum + count, 0);
		console.log(
			[
				`  ${scenario.label} (${scenario.id}): the scaffolder wrote ${files.length} files (${edited} edited in place) and bun.lock;`,
				`    the author edited ${lines.length} of them, ${total} lines:`,
				...lines.map(([file, count]) => `      ${file}: ${count}`),
			].join("\n"),
		);
	}
	const regenerated = changed(scaffolded, after).filter((file) => generated.has(file));
	console.log(`  generate-providers rewrote ${regenerated.length} files for all four.`);
} finally {
	rmSync(root, { recursive: true, force: true });
}
