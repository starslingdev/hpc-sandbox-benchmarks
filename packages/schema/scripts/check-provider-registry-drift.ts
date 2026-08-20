#!/usr/bin/env bun
// Regenerate the provider metadata assembly and fail when the committed bytes differ. Comparing the
// before/after content (rather than `git diff`) also catches a newly-created, still-untracked index.
import { generateProviderRegistryFile } from "./generate-provider-registry.ts";

const GENERATED = `${import.meta.dir}/../src/provider-meta/index.ts`;

async function main(): Promise<void> {
	const before = await Bun.file(GENERATED).text();
	await generateProviderRegistryFile();
	const after = await Bun.file(GENERATED).text();
	if (before !== after) {
		throw new Error(
			"src/provider-meta/index.ts is out of date — run `bun run --filter @sandbox-benchmarks/schema generate-provider-registry` and commit the result",
		);
	}
	console.log("✓ src/provider-meta/index.ts matches a fresh generator run");
}

try {
	await main();
} catch (error) {
	console.error("provider registry drift check failed:", error);
	process.exit(1);
}
