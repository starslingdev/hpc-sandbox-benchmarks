import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { batchesForFiles } from "./openclaw-lint.mjs";

test("lint batching preserves every selected file exactly once, without empty groups", () => {
	for (const length of [1, 999, 1000, 1001, 2301]) {
		const files = Array.from({ length }, (_, index) => `extensions/channel-${index}/test.ts`);
		const batches = batchesForFiles(`${files.toReversed().join("\n")}\n`);
		assert.deepEqual(batches.flat(), files.sort());
		assert.ok(batches.every((batch) => batch.length > 0 && batch.length <= 1000));
	}
});

test("empty discovery and duplicate inputs cannot produce a lint timing", () => {
	assert.throws(() => batchesForFiles("\n"), /selected no files/);
	assert.throws(() => batchesForFiles("extensions/a.ts\nextensions/a.ts\n"), /duplicate files/);
});

test("extension execution includes generated inputs and refuses a successful empty discovery", () => {
	const cwd = mkdtempSync(join(tmpdir(), "openclaw-lint-"));
	const write = (path, content) => writeFileSync(join(cwd, path), content);
	try {
		for (const dir of ["scripts/lib", "node_modules/oxlint/bin", "extensions"]) {
			mkdirSync(join(cwd, dir), { recursive: true });
		}
		write("extensions/source.ts", "export const source = 1;\n");
		write(
			"scripts/run-oxlint-shards.mjs",
			`export const createOxlintShards = () => [
  { name: 'core', args: ['--tsconfig', 'core.json', 'src'] },
  { name: 'extensions', args: ['--tsconfig', 'extensions.json', 'extensions'] },
];`,
		);
		write(
			"scripts/lib/local-heavy-check-runtime.mjs",
			`export const applyLocalOxlintPolicy = (args, env) => ({args: [...args, '--type-aware'], env});`,
		);
		write(
			"scripts/prepare-extension-package-boundary-artifacts.mjs",
			`import {writeFileSync} from 'node:fs';
writeFileSync('extensions/generated.ts', 'export const generated = 1;');`,
		);
		// This executable stands in for the pinned compiler at the process boundary. Discovery
		// resolves the directory after preparation; execution must receive actual nonempty files.
		write(
			"node_modules/oxlint/bin/oxlint",
			`const fs = require('node:fs');
const args = process.argv.slice(2);
if (!args.includes('--type-aware') || !args.includes('extensions.json')) process.exit(2);
if (args.includes('--debug=files')) {
  if (!process.env.EMPTY_DISCOVERY) console.log(fs.readdirSync('extensions').map(f => 'extensions/' + f).join('\\n'));
} else {
  const files = args.filter(arg => arg.endsWith('.ts'));
  if (!files.length) process.exit(3);
  for (const file of files) fs.readFileSync(file);
  fs.writeFileSync('linted.json', JSON.stringify(files));
}`,
		);
		const command = [fileURLToPath(new URL("./openclaw-lint.mjs", import.meta.url)), "extensions"];
		const run = spawnSync(process.execPath, command, { cwd, encoding: "utf8" });
		assert.equal(run.status, 0, run.stderr);
		assert.deepEqual(JSON.parse(readFileSync(join(cwd, "linted.json"), "utf8")), [
			"extensions/generated.ts",
			"extensions/source.ts",
		]);
		rmSync(join(cwd, "linted.json"));
		const empty = spawnSync(process.execPath, command, {
			cwd,
			encoding: "utf8",
			env: { ...process.env, EMPTY_DISCOVERY: "1" },
		});
		assert.notEqual(empty.status, 0);
		assert.match(empty.stderr, /selected no files/);
	} finally {
		rmSync(cwd, { recursive: true, force: true });
	}
});
