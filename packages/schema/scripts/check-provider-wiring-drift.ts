#!/usr/bin/env bun
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, renderProviderWiringFiles } from "./generate-provider-wiring.ts";

const drifted: string[] = [];
for (const [file, expected] of renderProviderWiringFiles()) {
	if (readFileSync(resolve(REPO_ROOT, file), "utf8") !== expected) drifted.push(file);
}

if (drifted.length > 0) {
	console.error(
		`provider wiring drifted in ${drifted.join(", ")}; run \`bun run generate-provider-wiring\` and commit the result`,
	);
	process.exit(1);
}
console.log("✓ generated provider wiring is current");
