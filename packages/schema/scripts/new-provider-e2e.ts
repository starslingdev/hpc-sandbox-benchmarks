#!/usr/bin/env bun
// `check:new-provider`: the scaffolder end to end, against a temporary copy of the repository.
// It runs the real `new-provider` command once per provider kind (an E2B-protocol SDK that bakes,
// a plain SDK, an HTTP API and a CLI; each SDK is a fake npm package installed offline), states
// only what each scaffold left `unfilled`, the way an author would, runs `generate-providers`, and
// then holds the result to every repository gate a real provider must pass: the drift check,
// `lint`, `lint:workflows`, `lint:shell`, `spell`, the whole `typecheck` and the whole `test`. The
// copy carries the dataset and a baseline commit, so no test is left out; a test failure counts
// against the scaffold unless the unmodified tree fails the same test (an environment-dependent
// failure, reported). Finally it proves that nothing changed beyond the scaffolds, the generator's
// outputs and the lockfile, and reports what each kind cost.
//
// It installs dependencies and runs every gate on a second tree, so it runs as its own CI job
// rather than inside `bun run test`.

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
	fakeSdks,
	fillCliAdapter,
	fillCliTest,
	fillHttpAdapter,
	fillHttpTest,
	fillMetadata,
	fillSdkAdapter,
	fillSdkTest,
	fillSetupAction,
	handWrittenLines,
} from "./new-provider.fixture.ts";

const SOURCE_ROOT = resolve(import.meta.dir, "../../..");

function run(cwd: string, argv: readonly string[]) {
	// The copy's mise.toml is the repository's own, so its pinned tools are trusted there too.
	const env = { ...process.env, MISE_TRUSTED_CONFIG_PATHS: cwd };
	const result = Bun.spawnSync([...argv], { cwd, env, stdout: "pipe", stderr: "pipe" });
	return { exitCode: result.exitCode, output: `${result.stdout}${result.stderr}` };
}

function sh(cwd: string, argv: readonly string[]): string {
	const { exitCode, output } = run(cwd, argv);
	if (exitCode !== 0) throw new Error(`${argv.join(" ")} failed:\n${output}`);
	return output;
}

/** The `(package, test)` pairs a `bun run test` reports failing, as `member > describe > test`. */
const failures = (output: string): string[] =>
	[...output.matchAll(/^(\S+) test: \(fail\) (.*?)(?: \[[\d.]+m?s\])?$/gm)].map(
		([, member, name]) => `${member} > ${name}`,
	);

/** The packages whose `bun test` reported an error outside any test (a rejection, a failed load). */
const errored = (output: string): string[] => [
	...new Set(
		[...output.matchAll(/^(\S+) test:\s+(?:[1-9]\d* errors?|# Unhandled error.*)$/gm)].map(
			([, member]) => member ?? "",
		),
	),
];

/** What one `bun run test` of the scaffolded tree comes to, failing test by failing test. */
export interface TestVerdict {
	/** Errors outside any test, by package: never excused, since no test names them. */
	readonly errors: readonly string[];
	/**
	 * Failures that fail alone in the scaffolded tree but not in the unmodified one: they pass there,
	 * or the test (or its whole package) exists only in the scaffold.
	 */
	readonly own: readonly string[];
	/** Failures that pass alone in the scaffolded tree (on a retry at most): the run's load. */
	readonly underLoad: readonly string[];
	/** Failures that fail alone in both trees: the environment's. */
	readonly environment: readonly string[];
}

/**
 * Judge a `bun run test` of the scaffolded tree. Each failing test is run again alone (`passes`
 * retries once) in the scaffolded tree and, if it still fails, in the unmodified one, so a timeout
 * that only the whole run's load caused does not fail the gate, and a test the unmodified tree
 * happens to fail once does not excuse the scaffold's.
 */
export function judgeTestRun(
	output: string,
	alone: (tree: "scaffolded" | "unmodified", failure: string) => AloneOutcome,
): TestVerdict {
	const verdict = { errors: errored(output), own: [], underLoad: [], environment: [] } as {
		errors: string[];
		own: string[];
		underLoad: string[];
		environment: string[];
	};
	for (const failure of failures(output)) {
		// A scaffolded test that cannot be found again is not excused: only "passes" is load.
		if (alone("scaffolded", failure) === "passes") verdict.underLoad.push(failure);
		else if (alone("unmodified", failure) === "fails") verdict.environment.push(failure);
		else verdict.own.push(failure);
	}
	return verdict;
}

/** How one failing test fares when run alone: a test missing from a tree is "absent" there. */
export type AloneOutcome = "passes" | "fails" | "absent";

/** Whether a lone run found nothing to run: no such package, or no test of that name. */
export const ranNothing = (output: string): boolean =>
	/No workspace packages matched|matched 0 tests/.test(output);

/** Run one failing test alone in `root` (by its full name), retrying once. */
function aloneIn(root: string, failure: string): AloneOutcome {
	const [member = "", ...names] = failure.split(" > ");
	// `bun test -t` matches the describe and test names joined by spaces.
	const pattern = `^${names.join(" ").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`;
	for (let attempt = 0; attempt < 2; attempt++) {
		const { exitCode, output } = run(root, ["bun", "--filter", member, "test", "-t", pattern]);
		if (ranNothing(output)) return "absent";
		if (exitCode === 0) return "passes";
	}
	return "fails";
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

if (import.meta.main) main();

function main(): void {
	const scratch = mkdtempSync(join(tmpdir(), "new-provider-e2e-"));
	const root = join(scratch, "repo");
	try {
		// The working tree as a developer has it, committed, so git-aware checks see a checkout.
		for (const file of filesOf(SOURCE_ROOT))
			try {
				mkdirSync(dirname(join(root, file)), { recursive: true });
				cpSync(join(SOURCE_ROOT, file), join(root, file));
			} catch {
				// Tracked but deleted in the working tree.
			}
		for (const argv of [
			["git", "init", "--quiet"],
			["git", "add", "--all"],
			[
				"git",
				"-c",
				"user.name=e2e",
				"-c",
				"user.email=e2e@example.com",
				"commit",
				"--quiet",
				"--no-verify",
				"--no-gpg-sign",
				"-m",
				"baseline",
			],
		])
			sh(root, argv);
		step("bun install (the checkout a developer starts from)", () =>
			sh(root, ["bun", "install", "--frozen-lockfile", "--ignore-scripts"]),
		);
		// The vendors' npm SDKs, published offline as tarballs (installed like a registry's, beside their
		// own dependencies): each name resolves to its fake once the scaffolder pins it.
		const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
		const sdks = fakeSdks(manifest.workspaces.catalogs.vendors.e2b);
		for (const [name, files] of Object.entries(sdks)) {
			const source = join(scratch, "sdks", name.replaceAll("/", "__"));
			for (const [file, content] of Object.entries(files)) {
				mkdirSync(join(source, "package"), { recursive: true });
				writeFileSync(join(source, "package", file), content);
			}
			sh(source, ["tar", "-czf", `${source}.tgz`, "package"]);
			manifest.overrides[name] = `file:${source}.tgz`;
		}
		writeFileSync(join(root, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
		const before = contents(root);
		const meta = (id: string) => `packages/schema/src/provider-meta/${id}.ts`;
		const CASES: readonly Case[] = [
			{
				label: "E2B-protocol SDK, baked",
				id: "acme",
				args: ["--kind=sdk", "--protocol=e2b", "--sdk=acme-sandbox@1.0.0", "--baked"],
				// The shared protocol adapter and builder are final as scaffolded; its test runs the builder.
				fills: { [meta("acme")]: fillMetadata },
			},
			{
				label: "SDK",
				id: "acme-sdk",
				args: ["--kind=sdk", "--sdk=@acme/sdk@1.0.0"],
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
		for (const gate of [
			"check:providers",
			"lint",
			"lint:workflows",
			"lint:shell",
			"spell",
			"typecheck",
		])
			step(`bun run ${gate}`, () => sh(root, ["bun", "run", gate]));
		step("bun run test (every package)", () => {
			const { exitCode, output } = run(root, ["bun", "run", "test"]);
			if (exitCode === 0 && errored(output).length === 0) return;
			const verdict = judgeTestRun(output, (tree, failure) =>
				aloneIn(tree === "scaffolded" ? root : SOURCE_ROOT, failure),
			);
			const unexplained = exitCode !== 0 && failures(output).length === 0;
			if (verdict.errors.length > 0 || verdict.own.length > 0 || unexplained)
				throw new Error(
					[
						output,
						"bun run test failed in the scaffolded tree:",
						...verdict.errors.map((member) => `  an error outside any test in ${member}`),
						...verdict.own.map((failure) => `  ${failure}`),
						...(unexplained ? ["  a nonzero exit with no failing test"] : []),
					].join("\n"),
				);
			for (const [label, list] of [
				["failing under the whole run's load only (passed alone)", verdict.underLoad],
				["failing alone on the unmodified tree too (not the scaffold's)", verdict.environment],
			] as const)
				if (list.length > 0) console.log(`  ${label}:\n    ${list.join("\n    ")}`);
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
		rmSync(scratch, { recursive: true, force: true });
	}
}
