// Prototype of tooling/repo-checks/src/vendor-seam.test.ts: a vendor library (any entry of the
// root `catalogs.computesdk`) may be a dependency of, and imported by, exactly one provider
// package. Type-only imports and `require("...")`/`createRequire(...)("...")` strings count.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const IMPORT =
	/(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\)\s*\(\s*)["']([^"'./][^"']*)["']/g;

function sourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === "node_modules" || name.startsWith(".")) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
		else if (/\.(ts|mts|js|mjs)$/.test(name) && !/\.test\.ts$/.test(name)) out.push(path);
	}
	return out;
}

const owner = (specifier: string, vendors: ReadonlySet<string>) => {
	const parts = specifier.split("/");
	const name = specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? "");
	return vendors.has(name) ? name : undefined;
};

export interface Workspace {
	readonly root: string;
	/** Package directories relative to root, e.g. "packages/novita". */
	readonly packages: readonly string[];
	readonly providerPackages: ReadonlySet<string>;
	readonly vendors: ReadonlySet<string>;
}

export function vendorSeamViolations(workspace: Workspace): string[] {
	const violations: string[] = [];
	const dependents = new Map<string, string[]>();
	for (const pkg of workspace.packages) {
		const manifest = JSON.parse(readFileSync(join(workspace.root, pkg, "package.json"), "utf8"));
		for (const dep of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
			if (!workspace.vendors.has(dep)) continue;
			dependents.set(dep, [...(dependents.get(dep) ?? []), pkg]);
			if (!workspace.providerPackages.has(pkg))
				violations.push(`${pkg} depends on vendor library ${dep}`);
		}
		if (workspace.providerPackages.has(pkg)) continue;
		for (const file of sourceFiles(join(workspace.root, pkg))) {
			const text = readFileSync(file, "utf8");
			const seen = new Set<string>();
			for (const match of text.matchAll(IMPORT)) {
				const vendor = owner(match[1] ?? "", workspace.vendors);
				if (vendor && !seen.has(vendor)) {
					seen.add(vendor);
					violations.push(`${relative(workspace.root, file)} imports vendor library ${vendor}`);
				}
			}
		}
	}
	for (const [dep, pkgs] of dependents) {
		const providers = pkgs.filter((pkg) => workspace.providerPackages.has(pkg));
		if (providers.length > 1) violations.push(`${dep} is shared by ${providers.join(", ")}`);
	}
	return violations.sort();
}
