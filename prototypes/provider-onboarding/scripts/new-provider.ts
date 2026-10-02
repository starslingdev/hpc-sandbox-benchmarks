#!/usr/bin/env bun
// Prototype scaffolder for the selected design:
//   bun prototypes/provider-onboarding/scripts/new-provider.ts --id acme --vendor Acme \
//     --transport sdk|http|cli --inputs ACME_TOKEN,var:ACME_URL [--sdk acme-sdk@1.2.3] [--baked] [--out dir]
//
// Every provider gets its own package, the only importer of its vendor library. The package holds
// a vendor adapter (translation only), the module binding, and, when the registry says the
// provider bakes an artifact, an artifact builder. The scaffold writes into --out (a dry-run tree)
// and prints the in-place edits it would make. Templates stay thin because the kit owns lifecycle.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";
import { provenanceConstant } from "../registry/src/projections.ts";

const { values } = parseArgs({
	options: {
		id: { type: "string" },
		vendor: { type: "string" },
		transport: { type: "string", default: "sdk" },
		inputs: { type: "string", default: "" },
		sdk: { type: "string" },
		baked: { type: "boolean", default: false },
		out: { type: "string", default: "scaffold-out" },
	},
});
const id = values.id ?? "";
if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error("--id must be a kebab-case provider id");
const TRANSPORTS = ["sdk", "http", "cli"] as const;
const transport = TRANSPORTS.find((name) => name === values.transport);
if (!transport) throw new Error(`--transport must be one of ${TRANSPORTS.join(", ")}`);
const vendorName = values.vendor ?? id;
const ident = id.replaceAll("-", "_");
const constant = id.toUpperCase().replaceAll("-", "_");
const provenance = provenanceConstant(id);
const [sdkName, sdkVersion] = (values.sdk ?? "").split(/@(?=[^@]+$)/);
const inputs = values.inputs
	.split(",")
	.filter(Boolean)
	.map((raw) =>
		raw.startsWith("var:")
			? `{ name: "${raw.slice(4)}", source: { kind: "variable" } }`
			: JSON.stringify(raw),
	);
// Everything that differs by vendor transport, in one place.
const port = {
	sdk: {
		meta: `"${sdkName}"`,
		noun: "SDK",
		param: "client: TODO_Client",
		bind: "new TODO_Client(context.env)",
	},
	http: {
		meta: '{ http: "rest" }',
		noun: "fetch transport",
		param: "fetch: typeof globalThis.fetch",
		bind: "globalThis.fetch",
	},
	cli: { meta: `{ cli: "${id}" }`, noun: "CLI runner", param: "", bind: "" },
}[transport];
const files = new Map<string, string>();

files.set(
	`packages/schema/src/provider-meta/${id}.ts`,
	`import { defineProviderMeta } from "../provider-meta.ts";

export default defineProviderMeta("${id}", {
	displayName: "${vendorName}",
	vendor: "${vendorName}",
	website: "https://TODO",
	sdkPackage: ${port.meta},
	artifact: { kind: "${values.baked ? "baked" : "image"}" },
	inputs: [${inputs.join(", ")}],
	isolation: { class: "unknown", technology: "TODO" },
	pricing: { model: "unavailable", reason: "unpublished" },
	maturity: { status: "beta", notes: "Scaffolded; opt-in until a committed validation run exists." },
	specPinning: "settable",
});
`,
);

const dependencies: Record<string, string> = {
	"@sandbox-benchmarks/driver": "workspace:*",
	arktype: "catalog:",
	...(transport === "sdk" && sdkName ? { [sdkName]: "catalog:computesdk" } : {}),
};
files.set(
	`packages/${id}/package.json`,
	`${JSON.stringify(
		{
			name: `@sandbox-benchmarks/${id}`,
			version: "0.0.0",
			private: true,
			type: "module",
			sideEffects: false,
			exports: {
				".": "./src/index.ts",
				...(values.baked && { "./artifact": "./src/artifact.ts" }),
				"./package.json": "./package.json",
			},
			scripts: { test: "bun test", typecheck: "tsc --noEmit" },
			dependencies,
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

if (transport === "cli") {
	// CLI vendors keep the existing declarative CliSpec; its CliRunner is already the transport port.
	files.set(
		`packages/${id}/src/index.ts`,
		`import { defineCliDriver, defineCliSpec } from "@sandbox-benchmarks/driver/cli";
import { type } from "arktype";
import { ${provenance} } from "./provenance.ts";

const ROWS = type("string.json.parse").to(type({ id: "string", name: "string", status: "string" }).array());

export default defineCliDriver("${id}", {
	provenance: ${provenance},
	execution: { syncCapMs: 60_000, durable: "shell-detach" },
	createAttemptCeilingMs: 10 * 60_000,
	spec: ({ env, resolvedArtifact }) =>
		defineCliSpec(ROWS, {
			binary: "${id}",
			secretFlags: [],
			commandTimeoutMs: 60_000,
			requestCoverage: TODO,
			create: (request, name) => ["create", name, "--image", resolvedArtifact.ref, "--json"],
			cleanupCreated: { kind: "lookup", select: (rows, name) => rows.find((row) => row.name === name) ?? null, absenceConfirmationMs: 2_000 },
			ready: { poll: ["list", "--json"], select: (rows, name) => rows.find((row) => row.name === name) ?? null, classify: (row) => (row.status === "running" ? "ready" : "pending") },
			sandboxId: { fromRow: (row) => row.id, parse: type(/^TODO$/) },
			exec: (id, command) => ["exec", id, "--", "bash", "-lc", command],
			destroy: (id) => ["delete", id],
			notFound: /not found/i,
		}),
});
`,
	);
} else {
	files.set(
		`packages/${id}/src/vendor.ts`,
		`// ${vendorName}'s vendor adapter: translation only. It receives its ${port.noun}; it never creates one.
import type { DriverContext } from "@sandbox-benchmarks/driver";
import type { Vendor, VendorRecord } from "@sandbox-benchmarks/driver/vendor";
import { type } from "arktype";

export const ${constant}_SANDBOX_ID = type(/^TODO$/);
const row = type({ id: "string", status: "string", "labels?": { "[string]": "string" } });
type Row = typeof row.infer;

const record = (value: Row): VendorRecord<Row> => ({
	id: value.id,
	phase: value.status === "running" ? "ready" : value.status === "deleted" ? "gone" : "pending",
	...(value.labels?.owner !== undefined && { marker: value.labels.owner }),
	raw: value,
});

export function ${ident}Vendor(
	${port.param},
	{ env, resolvedArtifact }: Pick<DriverContext<"${id}">, "env" | "resolvedArtifact">,
): Vendor<Row, Row> {
	return {
		control: {
			create: async ({ marker }) => record(TODO),
			get: async (id) => TODO, // null only on the vendor's typed not-found
			remove: async (id) => TODO, // "removed" | "accepted"
			page: async (cursor) => ({ records: TODO, next: TODO }),
			refused: (error) => undefined,
		},
		data: {
			attach: (value) => value.raw,
			exec: async (native, command) => TODO,
		},
	};
}
`,
	);
	files.set(
		`packages/${id}/src/index.ts`,
		`import { defineVendorDriver, mapped } from "@sandbox-benchmarks/driver/vendor";
import { ${provenance} } from "./provenance.ts";
import { ${constant}_SANDBOX_ID, ${ident}Vendor } from "./vendor.ts";

export default defineVendorDriver("${id}", {
	provenance: ${provenance},
	sandboxId: ${constant}_SANDBOX_ID,
	coverage: mapped("runtime-verified"),
	vendor: (context) => ${ident}Vendor(${port.bind}, context),
});
`,
	);
	files.set(
		`packages/${id}/src/vendor.test.ts`,
		`// Translation and the port contract over a stubbed ${port.noun}; kit behaviour is tested once in the driver kit.
import { vendorContract } from "@sandbox-benchmarks/driver/vendor/testing";
import { ${ident}Vendor } from "./vendor.ts";

vendorContract("${id} adapter", () => ({ vendor: ${ident}Vendor(TODO_STUB, TODO_CONTEXT), account: "shared" }));
`,
	);
}

if (values.baked)
	files.set(
		`packages/${id}/src/artifact.ts`,
		`import { defineArtifactBuilder } from "@sandbox-benchmarks/driver/artifact";

/** Build \`name\` from the digest-pinned base; return exactly the ref the driver boots. */
export default defineArtifactBuilder("${id}", async ({ name, base, spec, env, log }) => {
	TODO;
	return { ref: name, replaced: "atomic" };
});
`,
	);

const edits = [
	`packages/schema/src/provider-ids.ts: append "${id}" to PROVIDER_IDS`,
	...(transport === "sdk" && sdkName && sdkVersion
		? [`package.json: workspaces.catalogs.computesdk["${sdkName}"] = "${sdkVersion}"`]
		: []),
	"then: bun run generate-providers && bun install && review the registry snapshot diff",
];
for (const [file, content] of files) {
	const path = join(values.out, file);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, content);
}
const lines = [...files.values()].reduce((total, text) => total + text.split("\n").length - 1, 0);
console.log(`scaffolded ${files.size} files (${lines} lines) under ${values.out}:`);
for (const file of files.keys()) console.log(`  + ${file}`);
console.log("in-place edits:");
for (const edit of edits) console.log(`  ~ ${edit}`);
