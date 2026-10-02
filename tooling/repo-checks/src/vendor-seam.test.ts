// Invariant: a provider package is its vendor's only importer (ADR-0023 §2). The check itself is a
// pure function (lib/vendor-seam.ts); this file runs it over the real repository and proves, against
// planted fixtures, that each rule actually fires.
import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { providerPackage } from "@sandbox-benchmarks/schema/providers";
import { Glob } from "bun";
import type { RepositorySnapshot } from "./lib/vendor-seam.ts";
import {
	moduleSpecifiers,
	NAMED_PROVIDER_SUBPATHS,
	packageOf,
	vendorSeamViolations,
} from "./lib/vendor-seam.ts";
import { findRepoRoot, listMembers } from "./lib/workspace.ts";

/** Read every workspace source file, manifest and vendor manifest the check needs. */
function repositorySnapshot(root: string): RepositorySnapshot {
	const files = new Map<string, string>();
	const read = (path: string) => files.set(path, readFileSync(join(root, path), "utf8"));
	read("package.json");
	for (const top of ["apps", "packages", "tooling", "scripts"]) {
		for (const path of new Glob(`${top}/**/*.{ts,tsx,mts,cts,js,mjs,cjs}`).scanSync({
			cwd: root,
			onlyFiles: true,
		})) {
			if (!path.includes("node_modules/")) read(path);
		}
	}
	for (const member of listMembers(root)) read(`${member.relPath}/package.json`);
	const rootManifest = JSON.parse(files.get("package.json") ?? "{}");
	for (const vendor of Object.keys(rootManifest.workspaces?.catalogs?.vendors ?? {})) {
		const path = `node_modules/${vendor}/package.json`;
		if (existsSync(join(root, path))) read(path);
	}
	return {
		files,
		providerDirectories: new Set(
			PROVIDER_IDS.map((id) => `packages/${providerPackage(id).directory}`),
		),
	};
}

describe("vendor seam: the repository", () => {
	it("keeps every vendor library inside exactly one provider package", () => {
		expect(vendorSeamViolations(repositorySnapshot(findRepoRoot()))).toEqual([]);
	});

	it("allowlists only subpaths the owning provider package exports", () => {
		const root = findRepoRoot();
		for (const specifier of NAMED_PROVIDER_SUBPATHS) {
			const name = packageOf(specifier) ?? "";
			const directory = name.replace("@sandbox-benchmarks/", "packages/");
			const pkg = JSON.parse(readFileSync(join(root, directory, "package.json"), "utf8"));
			expect(Object.keys(pkg.exports)).toContain(`.${specifier.slice(name.length)}`);
		}
	});
});

// Fixture sources are assembled at runtime so the real-repository scan above never reads a planted
// specifier out of this file's own string literals.
const q = '"';
const from = (specifier: string, clause = "{ x }") => `import ${clause} from ${q}${specifier}${q};`;

function fixture(
	overrides: Record<string, string | null> = {},
	providerDirectories = ["packages/acme"],
): RepositorySnapshot {
	const json = (value: unknown) => JSON.stringify(value);
	const base: Record<string, string> = {
		"package.json": json({
			workspaces: {
				packages: ["packages/*", "apps/*"],
				catalog: { arktype: "2.2.0" },
				catalogs: { vendors: { "acme-sdk": "1.0.0", "acme-peer": "1.0.0" } },
			},
		}),
		"packages/acme/package.json": json({
			name: "@sandbox-benchmarks/acme",
			dependencies: {
				"acme-sdk": "catalog:vendors",
				"acme-peer": "catalog:vendors",
				arktype: "catalog:",
			},
		}),
		"packages/acme/src/index.ts": from("acme-sdk"),
		"node_modules/acme-sdk/package.json": json({ peerDependencies: { "acme-peer": "^1" } }),
		"packages/drivers/package.json": json({
			name: "@sandbox-benchmarks/drivers",
			dependencies: { "@sandbox-benchmarks/acme": "workspace:*", arktype: "catalog:" },
		}),
		"packages/drivers/src/index.ts": `export const load = () => import(${q}@sandbox-benchmarks/acme${q});`,
		"apps/cli/package.json": json({ name: "@sandbox-benchmarks/cli", dependencies: {} }),
		"apps/cli/src/bin/run.ts": from("@sandbox-benchmarks/drivers"),
	};
	const files = new Map(Object.entries(base));
	for (const [path, text] of Object.entries(overrides)) {
		if (text === null) files.delete(path);
		else files.set(path, text);
	}
	return { files, providerDirectories: new Set(providerDirectories) };
}

describe("vendor seam: planted violations", () => {
	it("passes the clean fixture", () => {
		expect(vendorSeamViolations(fixture())).toEqual([]);
	});

	it("catches a vendor import outside its provider package, in every import form", () => {
		for (const source of [
			from("acme-sdk"),
			from("acme-sdk/sub", "type { X }"),
			`export * from ${q}acme-sdk${q};`,
			`import ${q}acme-sdk${q};`,
			`type T = typeof import(${q}acme-sdk${q});`,
			`const m = await import(${q}acme-sdk${q});`,
			`const m = require(${q}acme-sdk${q});`,
			`const p = require.resolve(${q}acme-sdk${q});`,
			`const m = createRequire(import.meta.url)(${q}acme-sdk${q});`,
		]) {
			expect(vendorSeamViolations(fixture({ "apps/cli/src/lib/leak.ts": source }))).toEqual([
				"apps/cli/src/lib/leak.ts references vendor library acme-sdk",
			]);
		}
	});

	it("ignores a commented-out vendor import", () => {
		const source = `// ${from("acme-sdk")}\n/* ${from("acme-sdk")} */`;
		expect(vendorSeamViolations(fixture({ "apps/cli/src/lib/leak.ts": source }))).toEqual([]);
	});

	it("catches a vendor library declared outside a provider package", () => {
		const cli = JSON.stringify({
			name: "@sandbox-benchmarks/cli",
			dependencies: { "acme-sdk": "catalog:vendors" },
		});
		expect(vendorSeamViolations(fixture({ "apps/cli/package.json": cli }))).toEqual([
			"apps/cli declares vendor library acme-sdk",
		]);
	});

	it("catches a vendor library shared by two provider packages", () => {
		const other = {
			"packages/other/package.json": JSON.stringify({
				name: "@sandbox-benchmarks/other",
				dependencies: { "acme-sdk": "catalog:vendors" },
			}),
			"packages/other/src/index.ts": from("acme-sdk"),
		};
		expect(
			vendorSeamViolations(fixture(other, ["packages/acme", "packages/other"])),
		).toContainEqual("acme-sdk is declared by 2 provider packages: packages/acme, packages/other");
	});

	it("catches a declared vendor library its owner never references", () => {
		expect(vendorSeamViolations(fixture({ "node_modules/acme-sdk/package.json": "{}" }))).toEqual([
			"packages/acme declares acme-peer but never references it",
		]);
	});

	it("catches a vendor library pinned outside the catalogs", () => {
		const acme = JSON.stringify({
			name: "@sandbox-benchmarks/acme",
			dependencies: { "acme-sdk": "1.0.0", "acme-peer": "catalog:vendors" },
		});
		expect(vendorSeamViolations(fixture({ "packages/acme/package.json": acme }))).toEqual([
			"packages/acme pins acme-sdk outside the catalogs; a vendor library belongs in catalogs.vendors",
		]);
	});

	it("catches a vendor SDK passed off through the default catalog", () => {
		const root = JSON.parse(fixture().files.get("package.json") ?? "{}");
		root.workspaces.catalog["acme-extra"] = "1.0.0";
		const acme = JSON.parse(fixture().files.get("packages/acme/package.json") ?? "{}");
		acme.dependencies["acme-extra"] = "catalog:";
		expect(
			vendorSeamViolations(
				fixture({
					"package.json": JSON.stringify(root),
					"packages/acme/package.json": JSON.stringify(acme),
				}),
			),
		).toEqual([
			"packages/acme takes acme-extra from the default catalog, but no non-provider member uses it; a vendor library belongs in catalogs.vendors",
		]);
		// The same entry is provider-neutral once a non-provider member also takes it.
		const cli = JSON.stringify({
			name: "@sandbox-benchmarks/cli",
			dependencies: { "acme-extra": "catalog:" },
		});
		expect(
			vendorSeamViolations(
				fixture({
					"package.json": JSON.stringify(root),
					"packages/acme/package.json": JSON.stringify(acme),
					"apps/cli/package.json": cli,
				}),
			),
		).toEqual([]);
	});

	it("catches a relative path into a provider package from outside it", () => {
		expect(
			vendorSeamViolations(
				fixture({
					"apps/cli/src/lib/leak.ts": from("../../../../packages/acme/src/index.ts"),
					"packages/drivers/src/leak.ts": `export * from ${q}../../acme${q};`,
					"packages/acme/src/inner.ts": from("./index.ts"),
					"packages/acme-tools/src/near.ts": from("../../acme-tools/src/near.ts"),
				}),
			),
		).toEqual([
			"apps/cli/src/lib/leak.ts reaches into provider package packages/acme by relative path ../../../../packages/acme/src/index.ts",
			"packages/drivers/src/leak.ts reaches into provider package packages/acme by relative path ../../acme",
		]);
	});

	it("catches a vendor catalog entry no provider package owns", () => {
		const root = JSON.parse(fixture().files.get("package.json") ?? "{}");
		root.workspaces.catalogs.vendors["acme-orphan"] = "1.0.0";
		expect(vendorSeamViolations(fixture({ "package.json": JSON.stringify(root) }))).toEqual([
			"acme-orphan is in the vendor catalog but no provider package declares it",
		]);
	});

	it("lets only the drivers join and the named subpaths import a provider package", () => {
		const named = [...NAMED_PROVIDER_SUBPATHS][0] ?? "";
		const owner = packageOf(named) ?? "";
		const providerDirectory = owner.replace("@sandbox-benchmarks/", "packages/");
		const snapshot = fixture(
			{
				[`${providerDirectory}/package.json`]: JSON.stringify({ name: owner }),
				"apps/cli/src/bin/named.ts": from(named),
				"apps/cli/src/bin/direct.ts": from(owner),
				"apps/cli/src/bin/acme.ts": from("@sandbox-benchmarks/acme/internal"),
			},
			["packages/acme", providerDirectory],
		);
		expect(vendorSeamViolations(snapshot)).toEqual([
			`apps/cli/src/bin/acme.ts imports provider package @sandbox-benchmarks/acme/internal; only @sandbox-benchmarks/drivers and the named subpaths may`,
			`apps/cli/src/bin/direct.ts imports provider package ${owner}; only @sandbox-benchmarks/drivers and the named subpaths may`,
		]);
	});

	it("catches a resurrected packages/providers", () => {
		expect(
			vendorSeamViolations(fixture({ "packages/providers/src/index.ts": "export {};" })),
		).toEqual(["packages/providers exists; it was dissolved by ADR-0023"]);
	});
});

describe("moduleSpecifiers", () => {
	it("reads every specifier form and skips relative and builtin packages", () => {
		const source = [
			from("a"),
			`export { y } from ${q}b/c${q};`,
			`const z = await import(\`d\`);`,
			`const w = require(${q}@e/f/g${q});`,
			from("./local"),
			from("node:fs"),
		].join("\n");
		expect(moduleSpecifiers(source).map(packageOf).filter(Boolean).sort()).toEqual([
			"@e/f",
			"a",
			"b",
			"d",
		]);
	});
});
