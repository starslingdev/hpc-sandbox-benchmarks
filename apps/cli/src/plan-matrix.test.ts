import { describe, expect, it } from "bun:test";
import { planMatrixJson } from "./bin/plan-matrix.ts";

describe("plan-matrix", () => {
	it("emits a single line of compact JSON (the $GITHUB_OUTPUT contract)", () => {
		const out = planMatrixJson();
		// Single line: no embedded newlines and no pretty-print indentation.
		expect(out).not.toContain("\n");
		expect(out).not.toMatch(/\n\s+/);
		// Round-trips to a non-empty matrix.
		const parsed = JSON.parse(out) as { include: Array<{ provider: string; operation: string }> };
		expect(parsed.include.length).toBeGreaterThan(0);
		expect(parsed.include[0]).toHaveProperty("provider");
		expect(parsed.include[0]).toHaveProperty("operation");
	});
});
