#!/usr/bin/env bun
// Catalog drift gate (CI): regenerate the catalog from the vendored profiles and fail if the
// committed src/pts-generated.ts differs from a fresh run — catching an un-regenerated profile bump
// or a hand edit of the generated file. Only pts-generated.ts is diffed; pts-overrides.ts is curation
// and is intentionally out of the gate, so curating labels/headlines never trips it.
import { generateCatalogFile } from "./generate-catalog.ts";

// The path is repo-relative; we run git from the repo root so the gate is cwd-independent.
const REPO_ROOT = `${import.meta.dir}/../../..`;
const GENERATED = "packages/schema/src/pts-generated.ts";

async function main(): Promise<void> {
	await generateCatalogFile();

	const diff = Bun.spawn(["git", "diff", "--exit-code", "--", GENERATED], {
		cwd: REPO_ROOT,
		stdout: "inherit",
		stderr: "inherit",
	});
	// `git diff --exit-code` returns 1 for drift specifically; 128 (and other non-zero) means git
	// itself failed (not a repo, missing binary). Don't report a git failure as "out of date".
	const exitCode = await diff.exited;
	if (exitCode === 1) {
		throw new Error(
			`${GENERATED} is out of date — run \`bun run --filter @sandbox-benchmarks/schema generate-catalog\` and commit the result`,
		);
	}
	if (exitCode !== 0) {
		throw new Error(`git diff failed with exit code ${exitCode}`);
	}
	console.log(`✓ ${GENERATED} matches a fresh generator run`);
}

try {
	await main();
} catch (err) {
	// Log the whole error (preserves the stack) so a CI failure is debuggable, not just its message.
	console.error("catalog drift check failed:", err);
	process.exit(1);
}
