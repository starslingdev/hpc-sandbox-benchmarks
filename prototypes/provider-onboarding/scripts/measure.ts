#!/usr/bin/env bun
// Count hand-written logical lines (non-blank, not comment-only) for today's code and the selected
// design's prototype. Run after `biome check --write` so both sides use the repo's formatting.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const P = "prototypes/provider-onboarding";

function logical(file: string): number {
	let inBlock = false;
	let count = 0;
	for (const raw of readFileSync(resolve(ROOT, file), "utf8").split("\n")) {
		const line = raw.trim();
		if (inBlock) {
			if (line.includes("*/")) inBlock = false;
			continue;
		}
		if (line === "" || line.startsWith("//")) continue;
		if (line.startsWith("/*")) {
			inBlock = !line.includes("*/");
			continue;
		}
		count++;
	}
	return count;
}
const sum = (files: readonly string[]) => files.reduce((total, file) => total + logical(file), 0);

const rows: Array<[string, readonly string[], readonly string[], string]> = [
	[
		"brezel driver",
		["packages/brezel/src/index.ts"],
		[`${P}/packages/brezel/src/vendor.ts`, `${P}/packages/brezel/src/index.ts`],
		"21/21 original tests, unmodified",
	],
	[
		"novita driver",
		["packages/novita/src/index.ts"],
		[
			`${P}/packages/novita/src/sdk.ts`,
			`${P}/packages/novita/src/vendor.ts`,
			`${P}/packages/novita/src/index.ts`,
		],
		"6/6 original tests (1 adapted)",
	],
	[
		"novita bake",
		["apps/cli/src/lib/bake/novita.ts"],
		[`${P}/packages/novita/src/artifact.ts`],
		"moved into the provider package",
	],
];
console.log("| module | today | prototype | proof |\n|---|---:|---:|---|");
for (const [name, before, after, proof] of rows)
	console.log(`| ${name} | ${sum(before)} | ${sum(after)} | ${proof} |`);
const kit = [
	`${P}/packages/driver-vendor/src/vendor.ts`,
	`${P}/packages/driver-vendor/src/artifact.ts`,
];
console.log(
	`\none-time kit: ${sum(kit)} logical lines; in-memory vendor + contract: ${logical(`${P}/packages/driver-vendor/src/testing.ts`)}`,
);
console.log(
	`registry projections: ${logical(`${P}/registry/src/projections.ts`)}; fleet joins: ${logical(`${P}/packages/drivers/src/render.ts`)}; vendor seam check: ${logical(`${P}/tooling/vendor-seam.ts`)}`,
);
