// Invariant: every workspace member has the uniform package.json shape.

import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Glob } from "bun";
import type { PackageJson } from "./lib/workspace.ts";
import { findRepoRoot, listMembers, workspaceGlobs } from "./lib/workspace.ts";

const root = findRepoRoot();
const members = listMembers(root);

// Build the catalog expectation map: dep name → required version string ("catalog:" / "catalog:<name>").
const rootPkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as PackageJson;
const ws = rootPkg.workspaces;
const catalogExpectation = new Map<string, string>();
if (ws && !Array.isArray(ws)) {
	for (const name of Object.keys(ws.catalog ?? {})) catalogExpectation.set(name, "catalog:");
	for (const [catName, entries] of Object.entries(ws.catalogs ?? {})) {
		for (const name of Object.keys(entries)) catalogExpectation.set(name, `catalog:${catName}`);
	}
}

function isInternal(depName: string): boolean {
	return depName.startsWith("@sandbox-benchmarks/") || depName.startsWith("@repo/");
}

function allDeps(pkg: PackageJson): Record<string, string> {
	return { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
}

/**
 * Every relative file target reachable in an `exports` map, at any nesting depth.
 *
 * Recursive because the field is: a subpath may hold a string, or a conditions object
 * (`{ import, default }`), or an array of fallbacks. Walking it rather than assuming today's flat
 * string form means the check keeps working the day a package needs conditions, instead of quietly
 * matching nothing.
 */
function exportTargets(node: unknown): string[] {
	if (typeof node === "string") return node.startsWith(".") ? [node] : [];
	if (Array.isArray(node)) return node.flatMap(exportTargets);
	if (node !== null && typeof node === "object") return Object.values(node).flatMap(exportTargets);
	return [];
}

describe("package metadata invariants", () => {
	it("enumerates one member per workspace package.json (no silent drops)", () => {
		// Cross-check listMembers against an independent glob of the workspace, so adding a package
		// never requires bumping a magic number, while a regression that drops members still fails.
		const onDisk = workspaceGlobs(root).flatMap((g) =>
			Array.from(new Glob(`${g}/package.json`).scanSync({ cwd: root, onlyFiles: true })),
		).length;
		expect(members.length).toBe(onDisk);
		expect(members.length).toBeGreaterThan(0);
	});

	for (const member of members) {
		describe(member.relPath, () => {
			const { pkg } = member;

			it("has name / version / private:true / type:module", () => {
				expect(typeof pkg.name).toBe("string");
				expect(typeof pkg.version).toBe("string");
				expect(pkg.private).toBe(true);
				expect(pkg.type).toBe("module");
			});

			if (member.hasSrc) {
				it("source member defines test + typecheck scripts", () => {
					expect(pkg.scripts?.test).toBeDefined();
					expect(pkg.scripts?.typecheck).toBeDefined();
				});
			} else {
				it("config-only member declares a non-empty files array", () => {
					expect(Array.isArray(pkg.files)).toBe(true);
					expect((pkg.files ?? []).length).toBeGreaterThan(0);
				});
			}

			const isLibraryPackage = member.relPath.startsWith("packages/");
			const isApp = member.relPath.startsWith("apps/");

			if (isLibraryPackage || member.name === "@repo/test-utils") {
				it("exposes an exports map", () => {
					expect(pkg.exports).toBeDefined();
				});

				it("every exports subpath points at a file that exists", () => {
					// An exports map is the package's public surface, and in a source-first workspace a
					// stale entry in one is invisible until someone imports that subpath: the resolver
					// reports the specifier as unresolvable, which reads like the importer's mistake. Cheap
					// to check, and it catches the move-a-file refactor that forgets the manifest.
					const missing = exportTargets(pkg.exports ?? {}).filter(
						(target) => !existsSync(join(member.dir, target)),
					);
					expect(missing).toEqual([]);
				});
			}

			if (isApp) {
				it("app declares bin and has no exports", () => {
					expect(pkg.bin).toBeDefined();
					expect(pkg.exports).toBeUndefined();
				});
			}

			it("internal deps use workspace:* and cataloged externals use catalog:", () => {
				for (const [dep, version] of Object.entries(allDeps(pkg))) {
					const expected = catalogExpectation.get(dep);
					if (isInternal(dep)) {
						expect(version).toBe("workspace:*");
					} else if (expected) {
						expect(version).toBe(expected);
					}
				}
			});
		});
	}
});
