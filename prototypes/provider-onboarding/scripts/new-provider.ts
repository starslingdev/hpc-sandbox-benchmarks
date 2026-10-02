#!/usr/bin/env bun
// Prototype scaffolder: `bun prototypes/provider-onboarding/scripts/new-provider.ts --id acme
//   --kind http|cli|sdk --vendor Acme --inputs ACME_TOKEN,var:ACME_URL [--sdk acme-sdk@1.2.3]
//   [--out <dir>]`
//
// Writes into --out (a dry-run tree mirroring the repo) rather than the checkout, and prints
// what it would also edit in place. The SDK template imports `@sandbox-benchmarks/driver/ops` and
// `ops-testing`: the paths the prototype kits would occupy once promoted into packages/driver. The templates are deliberately thin because the kits own the
// behavior: a scaffold that has to emit 300 lines is a kit that is missing an abstraction.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
	options: {
		id: { type: "string" },
		kind: { type: "string", default: "http" },
		vendor: { type: "string" },
		inputs: { type: "string", default: "" },
		sdk: { type: "string" },
		out: { type: "string", default: "scaffold-out" },
	},
});
const id = values.id ?? "";
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("--id must be a kebab-case provider id");
const kind = values.kind as "http" | "cli" | "sdk";
const vendor = values.vendor ?? id;
const inputs = values.inputs
	.split(",")
	.filter(Boolean)
	.map((raw) =>
		raw.startsWith("var:")
			? `{ name: "${raw.slice(4)}", source: { kind: "variable" } }`
			: JSON.stringify(raw),
	);
const [sdkName, sdkVersion] = (values.sdk ?? "").split(/@(?=[^@]+$)/);
const constant = id.toUpperCase().replaceAll("-", "_");
const files = new Map<string, string>();

// Manifest skeletons the author fills in. The generator's arktype scope plus manifestFailures()
// reject a skeleton left unchanged (TODO paths, an id pattern no row can match).
const HTTP_STUB = `{
		kind: "http",
		transport: { baseUrl: "https://TODO", headers: { Authorization: "Bearer {{env.${inputs[0] ? JSON.parse(inputs[0]) : "TODO"}}}" } },
		spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "runtime-verified" },
		row: { id: "string", status: "string", "label?": "string" },
		id: { field: "id", pattern: "^TODO$" },
		create: { path: "/TODO", marker: { field: "label" }, body: { image: "{{request.artifact.ref}}" } },
		get: { path: "/TODO/{id}" },
		remove: { path: "/TODO/{id}" },
		list: { path: "/TODO", select: "items" },
		phases: { rules: [{ phase: "ready", where: { status: ["running"] } }], otherwise: "pending" },
		ownership: { account: "shared", markerField: "label" },
		data: { kind: "json-exec", path: "/TODO/{id}/exec", body: { cmd: "{{command}}" }, result: { exitCode: "exit_code", stdout: "stdout", stderr: "stderr" } },
	}`;
const CLI_STUB = `{
		kind: "cli",
		label: "${vendor}",
		binary: { default: "${id}" },
		secretFlags: [],
		row: { id: "string", name: "string", status: "string" },
		id: { field: "id", pattern: "^TODO$" },
		nameField: "name",
		timeouts: { commandMs: 60_000, createCeilingMs: 600_000, syncCapMs: 60_000 },
		spec: { vcpus: "mapped", memoryGb: "mapped", diskGb: "unsupported" },
		argv: {
			create: ["create", "{{name}}", "--image", "{{artifact.ref}}", "--json"],
			list: ["list", "--json"],
			exec: ["exec", "{{id}}", "--", "bash", "-lc", "{{command}}"],
			remove: ["delete", "{{id}}"],
		},
		phases: { rules: [{ phase: "ready", where: { status: ["running"] } }], otherwise: "pending" },
		terminalDetail: ["status={{status}}"],
		notFound: { pattern: "not found", flags: "i" },
		absenceConfirmationMs: 2_000,
	}`;

const meta = `import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("${id}", {
	displayName: "${vendor}",
	vendor: "${vendor}",
	website: "https://TODO",
	sdkPackage: "${kind === "sdk" ? sdkName : kind === "cli" ? `${id} CLI` : "rest"}",
	artifact: { kind: "image", boot: { key: "image" } },
	inputs: [${inputs.join(", ")}],
	isolation: { class: "unknown", technology: "TODO" },
	pricing: { model: "unavailable", reason: "unpublished" },
	maturity: { status: "beta", notes: "Scaffolded; opt-in until a committed validation run exists." },
	specPinning: "settable",
	transport: { streaming: false, syncCapMs: 60_000, detachedPoll: true },${
		kind === "sdk" ? "" : `\n\tdriver: ${kind === "http" ? HTTP_STUB : CLI_STUB},`
	}
});
`;
files.set(`packages/schema/src/provider-meta/${id}.ts`, meta);

if (kind === "sdk") {
	files.set(
		`packages/${id}/package.json`,
		`${JSON.stringify(
			{
				name: `@sandbox-benchmarks/${id}`,
				version: "0.0.0",
				private: true,
				type: "module",
				sideEffects: false,
				exports: { ".": "./src/index.ts", "./package.json": "./package.json" },
				scripts: { test: "bun test", typecheck: "tsc --noEmit" },
				dependencies: {
					[sdkName ?? "TODO"]: "catalog:computesdk",
					"@sandbox-benchmarks/driver": "workspace:*",
					arktype: "catalog:",
				},
				devDependencies: {
					"@repo/tsconfig": "workspace:*",
					"@types/bun": "catalog:",
					typescript: "catalog:",
				},
			},
			null,
			2,
		)}\n`,
	);
	files.set(
		`packages/${id}/tsconfig.json`,
		`{\n  "extends": "@repo/tsconfig/library.json",\n  "include": ["src"]\n}\n`,
	);
	files.set(
		`packages/${id}/src/index.ts`,
		`import type { DriverContext } from "@sandbox-benchmarks/driver";
import { defineOpsDriver, instanceOfAny, pinnedShape } from "@sandbox-benchmarks/driver/ops";
import { type } from "arktype";
import * as sdk from "${sdkName}";
import { ${constant}_PROVENANCE } from "./provenance.ts";

export default defineOpsDriver("${id}", {
	provenance: ${constant}_PROVENANCE,
	ops: ({ env, resolvedArtifact }: DriverContext<"${id}">) => {
		const client = new sdk.Client(/* TODO: env */);
		return {
			sandboxId: type(/^TODO$/),
			coverage: pinnedShape(4, 8),
			create: ({ marker }) => client.create({ image: resolvedArtifact.ref, labels: { owner: marker } }),
			get: (id) => client.get(id),
			remove: (id) => client.delete(id),
			list: () => client.list(),
			idOf: (row) => row.id,
			phase: (row) => (row.status === "running" ? "ready" : "pending"),
			ownership: { kind: "marker", key: "owner", of: (row) => row.labels?.owner },
			connect: (row) => client.connect(row.id),
			exec: (native, command) => native.exec(["bash", "-lc", command]),
			errors: { notFound: instanceOfAny(sdk.NotFoundError) },
		};
	},
});
`,
	);
	files.set(
		`packages/${id}/src/index.test.ts`,
		`import { kitConformance } from "@sandbox-benchmarks/driver/ops-testing";
import ${id.replaceAll("-", "_")} from "./index.ts";

// The shared suite drives create/exec/destroy/inventory/recovery against an in-memory vendor.
// Add provider-specific edge cases below it; do not re-test kit behavior here.
kitConformance(${id.replaceAll("-", "_")}, { fake: "in-memory" });
`,
	);
}

const edits = [
	`packages/schema/src/provider-ids.ts: append "${id}" to PROVIDER_IDS`,
	...(kind === "sdk" && sdkName && sdkVersion
		? [`package.json: workspaces.catalogs.computesdk["${sdkName}"] = "${sdkVersion}"`]
		: []),
	"then: bun run generate-providers && bun install && bun test -u (registry snapshot)",
];

for (const [file, content] of files) {
	const path = join(values.out, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}
const lines = [...files.values()].reduce((sum, text) => sum + text.split("\n").length - 1, 0);
console.log(`scaffolded ${files.size} files (${lines} lines) under ${values.out}:`);
for (const file of files.keys()) console.log(`  + ${file}`);
console.log("in-place edits:");
for (const edit of edits) console.log(`  ~ ${edit}`);
