import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import { fleetProjection, renderFleetJoins } from "./render.ts";

const exportsIn = (root: string) => (directory: string) => {
	try {
		const manifest = JSON.parse(readFileSync(resolve(root, directory, "package.json"), "utf8"));
		return (manifest.exports ?? {}) as Record<string, string>;
	} catch {
		return {};
	}
};

describe("generated fleet joins", () => {
	test("the prototype provider packages satisfy ./artifact exactness", () => {
		const { entries, failures } = fleetProjection(
			["novita", "brezel"],
			exportsIn(resolve(import.meta.dir, "../..")),
		);
		expect(failures).toEqual([]);
		const source = renderFleetJoins(entries);
		expect(source).toContain('novita: () => import("@sandbox-benchmarks/novita/artifact")');
		expect(source).not.toContain("brezel/artifact");
	});

	test("today's repository: every image-baking provider still keeps its builder in apps/cli", () => {
		const { failures } = fleetProjection(
			PROVIDER_IDS,
			exportsIn(resolve(import.meta.dir, "../../../../../packages")),
		);
		expect(failures).toEqual([
			"e2b: baked artifact needs @sandbox-benchmarks/e2b to export ./artifact",
			"daytona-vm: baked artifact needs @sandbox-benchmarks/daytona to export ./vm/artifact",
			"daytona-container: baked artifact needs @sandbox-benchmarks/daytona to export ./container/artifact",
			"blaxel: baked artifact needs @sandbox-benchmarks/blaxel to export ./artifact",
			"novita: baked artifact needs @sandbox-benchmarks/novita to export ./artifact",
			"runloop: baked artifact needs @sandbox-benchmarks/runloop to export ./artifact",
		]);
	});
});
