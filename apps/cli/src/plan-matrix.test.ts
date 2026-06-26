import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { HELP, planMatrixJson } from "./bin/plan-matrix.ts";
import { handleDiscovery } from "./lib/discovery.ts";

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

	it("exposes agent-friendly discovery: --help and --list-* listings the bin wires", () => {
		// The bin dispatches discovery through `handleDiscovery(argv, HELP)` before its matrix path, so
		// asserting that pairing here is the bin's discovery contract (no process spawn needed).
		expect(handleDiscovery(["--help"], HELP)).toBe(HELP);
		expect(HELP).toContain("plan-matrix");
		expect(HELP).toContain("examples:");

		// Every registered provider and suite is discoverable through the bin's listings.
		const listed = handleDiscovery(["--list-providers"], HELP) ?? "";
		for (const meta of PROVIDERS) expect(listed).toContain(meta.id);
		const suites = JSON.parse(handleDiscovery(["--list-suites", "--json"], HELP) ?? "[]") as Array<{
			name: string;
		}>;
		expect(suites.map((s) => s.name)).toEqual([...SUITE_NAMES]);

		// A bare invocation has no discovery flag, so the matrix path (the GITHUB_OUTPUT contract) runs.
		expect(handleDiscovery([], HELP)).toBeNull();
	});
});
