import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { planMatrixJson } from "./bin/plan-matrix.ts";

describe("plan-matrix", () => {
	it("emits a single line of compact JSON (the $GITHUB_OUTPUT contract)", () => {
		const out = planMatrixJson();
		// Single line: no embedded newlines and no pretty-print indentation.
		expect(out).not.toContain("\n");
		expect(out).not.toMatch(/\n\s+/);

		const parsed = JSON.parse(out) as { include: Array<{ provider: string; suite: string }> };
		// Full provider × suite cross product — one CI cell each.
		expect(parsed.include.length).toBe(PROVIDERS.length * SUITE_NAMES.length);
		expect(parsed.include[0]).toHaveProperty("provider");
		expect(parsed.include[0]).toHaveProperty("suite");
		// Every cell names a registered provider and a registered suite.
		const providerIds = new Set(PROVIDERS.map((p) => p.id));
		for (const cell of parsed.include) {
			expect(providerIds.has(cell.provider as (typeof PROVIDERS)[number]["id"])).toBe(true);
			expect(SUITE_NAMES).toContain(cell.suite as (typeof SUITE_NAMES)[number]);
		}
	});
});
