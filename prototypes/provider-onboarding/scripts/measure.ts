#!/usr/bin/env bun
// Count hand-written logical lines (non-blank, not comment-only) for today's drivers and their
// prototype rewrites. Run after `biome check --write` so both sides use the repo's formatting.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "../../..");
const PROTO = "prototypes/provider-onboarding/src";

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

const rows: Array<[string, string, number, number, string]> = [
	[
		"brezel",
		"HTTP API (+SDK data plane)",
		sum(["packages/brezel/src/index.ts"]),
		sum([`${PROTO}/providers/brezel/manifest.ts`, `${PROTO}/providers/brezel/index.ts`]),
		"21/21 original tests",
	],
	[
		"tama",
		"CLI only",
		sum(["packages/tama/src/index.ts"]),
		sum([`${PROTO}/providers/tama/manifest.ts`]),
		"11/11 original tests",
	],
	[
		"novita",
		"TypeScript SDK",
		sum(["packages/novita/src/index.ts"]),
		sum([`${PROTO}/providers/novita/index.ts`]),
		"6/6 original tests",
	],
	[
		"acme (fixture)",
		"HTTP API, JSON exec",
		Number.NaN,
		sum([`${PROTO}/providers/acme/manifest.ts`]),
		"3 new tests (meta+driver)",
	],
];
console.log("| provider | interface | today | prototype | proof |\n|---|---|---:|---:|---|");
for (const [id, kind, before, after, proof] of rows)
	console.log(`| ${id} | ${kind} | ${Number.isNaN(before) ? "—" : before} | ${after} | ${proof} |`);

const kit = ["ops", "http", "rules", "cli", "manifest", "manifest-schema"].map(
	(name) => `${PROTO}/kit/${name}.ts`,
);
console.log(
	`\none-time kit cost: ${sum(kit)} logical lines (${kit.map((file) => `${file.split("/").at(-1)}=${logical(file)}`).join(", ")})`,
);

const fleet = [
	"blaxel",
	"boat",
	"brezel",
	"e2b",
	"freestyle",
	"microsandbox-cloud",
	"namespace",
	"novita",
	"runcloud",
	"runloop",
	"vercel",
	"tama",
];
console.log("\ntoday's single-file drivers (logical lines):");
console.log(fleet.map((id) => `${id}=${logical(`packages/${id}/src/index.ts`)}`).join(", "));
