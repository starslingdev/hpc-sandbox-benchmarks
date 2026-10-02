import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import type { Member, PackageJson } from "../../../tooling/repo-checks/src/lib/workspace.ts";
import { findRepoRoot, listMembers } from "../../../tooling/repo-checks/src/lib/workspace.ts";
import { providerPackage } from "../registry/src/projections.ts";
import { vendorSeamViolations } from "./vendor-seam.ts";

const REPO = findRepoRoot(import.meta.dir);
const PROTO = resolve(import.meta.dir, "..");
const rootManifest = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")) as PackageJson;
const catalogs = Array.isArray(rootManifest.workspaces)
	? {}
	: (rootManifest.workspaces?.catalogs ?? {});
// ComputeSDK's own core is provider-neutral driver plumbing, not a vendor library. In the real
// change these two move to their own catalog so the vendor set needs no exception list.
const vendors = new Set(
	Object.keys(catalogs.computesdk ?? {}).filter(
		(name) => !["computesdk", "@computesdk/provider"].includes(name),
	),
);
const providerPackages = new Set(
	PROVIDER_IDS.map((id) => `packages/${providerPackage(id).directory}`),
);

describe("vendor seam", () => {
	test("the prototype packages keep every vendor library inside its own provider package", () => {
		// The prototype directory is not a workspace; enumerate its packages the same shape listMembers returns.
		const members: Member[] = readdirSync(join(PROTO, "packages")).map((name) => {
			const dir = join(PROTO, "packages", name);
			const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as PackageJson;
			return {
				name: pkg.name ?? name,
				dir,
				relPath: `packages/${name}`,
				hasSrc: existsSync(join(dir, "src")),
				pkg,
			};
		});
		expect(vendorSeamViolations(PROTO, members, providerPackages, vendors)).toEqual([]);
	});

	test("today's repository: the leaks this check would fail on", () => {
		expect(
			vendorSeamViolations(REPO, listMembers(REPO), providerPackages, vendors),
		).toMatchSnapshot();
	});
});
