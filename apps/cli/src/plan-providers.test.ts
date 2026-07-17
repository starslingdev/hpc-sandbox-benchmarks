import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { HELP, planProvidersJson } from "./bin/plan-providers.ts";
import { handleDiscovery } from "./lib/discovery.ts";

describe("plan-providers", () => {
	it("emits a single line of compact JSON array (the $GITHUB_OUTPUT contract)", () => {
		const out = planProvidersJson();
		// Single line: no embedded newlines and no pretty-print indentation.
		expect(out).not.toContain("\n");
		expect(out).not.toMatch(/\n\s+/);

		const parsed = JSON.parse(out) as string[];
		// Every registered provider, in registry order — the provider axis each suite job fans out over.
		expect(parsed).toEqual(PROVIDERS.map((p) => p.id));
	});

	it("narrows to the providers a dispatch names, still one line of JSON", () => {
		// Reverse request order so this fails if the planner preserves input order instead of registry order.
		const out = planProvidersJson("daytona,e2b");
		expect(out).not.toContain("\n");
		// Registry order, not request order — the CI job list can't be reordered by a dispatch.
		expect(JSON.parse(out)).toEqual(["e2b", "daytona"]);
	});

	it("throws on an unregistered name rather than shrinking the matrix", () => {
		// A typo'd provider must fail the plan step, not silently publish a dataset missing it.
		expect(() => planProvidersJson("e2b,dayton")).toThrow(/unknown provider\(s\): dayton/);
	});

	it("exposes agent-friendly discovery: --help and --list-* listings the bin wires", () => {
		expect(handleDiscovery(["--help"], HELP)).toEqual({ text: HELP, ok: true });
		expect(HELP).toContain("plan-providers");
		expect(HELP).toContain("examples:");

		// Every registered provider and suite is discoverable through the bin's listings.
		const listed = handleDiscovery(["--list-providers"], HELP)?.text ?? "";
		for (const meta of PROVIDERS) expect(listed).toContain(meta.id);
		const suites = JSON.parse(
			handleDiscovery(["--list-suites", "--json"], HELP)?.text ?? "[]",
		) as Array<{ name: string }>;
		expect(suites.map((s) => s.name)).toEqual([...SUITE_NAMES]);

		// A bare invocation has no discovery flag, so the providers path (the GITHUB_OUTPUT contract) runs.
		expect(handleDiscovery([], HELP)).toBeNull();
	});
});
