// Prototype of tooling/repo-checks/src/vendor-seam.test.ts: a vendor library (any entry of the
// root `catalogs.computesdk`) may be a dependency of, and imported by, exactly one provider
// package. Reuses the repo-checks workspace walker and import scanner, adding only the
// `require("...")` / `createRequire(...)("...")` forms that scanner does not model.

import { readFileSync } from "node:fs";
import { relative } from "node:path";
import type { Member } from "../../../tooling/repo-checks/src/lib/workspace.ts";
import {
	importSpecifiers,
	memberSourceFiles,
	stripComments,
} from "../../../tooling/repo-checks/src/lib/workspace.ts";

const REQUIRE = /\brequire\s*\(\s*['"]([^'"]+)['"]|\)\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiers(file: string): string[] {
	const required = [...stripComments(readFileSync(file, "utf8")).matchAll(REQUIRE)].map(
		(match) => match[1] ?? match[2] ?? "",
	);
	return [...importSpecifiers(file), ...required];
}

const vendorOf = (specifier: string, vendors: ReadonlySet<string>) => {
	const parts = specifier.split("/");
	const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? "");
	return vendors.has(name) ? name : undefined;
};

export function vendorSeamViolations(
	root: string,
	members: readonly Member[],
	providerPackages: ReadonlySet<string>,
	vendors: ReadonlySet<string>,
): string[] {
	const violations: string[] = [];
	const dependents = new Map<string, string[]>();
	for (const member of members) {
		const provider = providerPackages.has(member.relPath);
		for (const dep of Object.keys({ ...member.pkg.dependencies, ...member.pkg.devDependencies })) {
			if (!vendors.has(dep)) continue;
			const list = dependents.get(dep) ?? [];
			dependents.set(dep, list);
			list.push(member.relPath);
			if (!provider) violations.push(`${member.relPath} depends on vendor library ${dep}`);
		}
		if (provider || !member.hasSrc) continue;
		for (const file of memberSourceFiles(member).filter((path) => !path.endsWith(".test.ts"))) {
			const found = new Set(specifiers(file).map((spec) => vendorOf(spec, vendors)));
			for (const vendor of found)
				if (vendor) violations.push(`${relative(root, file)} imports vendor library ${vendor}`);
		}
	}
	for (const [dep, packages] of dependents) {
		const providers = packages.filter((pkg) => providerPackages.has(pkg));
		if (providers.length > 1) violations.push(`${dep} is shared by ${providers.join(", ")}`);
	}
	return violations.sort();
}
