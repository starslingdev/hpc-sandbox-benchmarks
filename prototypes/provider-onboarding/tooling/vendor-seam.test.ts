import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { providerPackage } from "../registry/src/projections.ts";
import { vendorSeamViolations } from "./vendor-seam.ts";

const REPO = resolve(import.meta.dir, "../../..");
const PROTO = resolve(import.meta.dir, "..");
const catalog = JSON.parse(readFileSync(resolve(REPO, "package.json"), "utf8")).workspaces.catalogs
	.computesdk;
// ComputeSDK's own core is provider-neutral driver plumbing, not a vendor library.
const vendors = new Set(
	Object.keys(catalog).filter((name) => !["computesdk", "@computesdk/provider"].includes(name)),
);
const providerDirs = new Set(PROVIDER_IDS.map((id) => `packages/${providerPackage(id).directory}`));

describe("vendor seam", () => {
	test("the prototype packages keep every vendor library inside its own provider package", () => {
		const packages = readdirSync(resolve(PROTO, "packages")).map((dir) => `packages/${dir}`);
		expect(
			vendorSeamViolations({ root: PROTO, packages, providerPackages: providerDirs, vendors }),
		).toEqual([]);
	});

	test("today's repository: the leaks this check would fail on", () => {
		const packages = ["apps", "packages", "tooling"].flatMap((group) =>
			readdirSync(resolve(REPO, group)).map((dir) => `${group}/${dir}`),
		);
		const violations = vendorSeamViolations({
			root: REPO,
			packages,
			providerPackages: providerDirs,
			vendors,
		});
		expect(violations).toMatchSnapshot();
	});
});
