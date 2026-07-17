import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { HELP, planMatrixJson } from "./bin/plan-matrix.ts";
import { handleDiscovery } from "./lib/discovery.ts";
import { selectProviders } from "./lib/matrix.ts";

describe("plan-matrix", () => {
	it("emits a single line of compact JSON (local cell-list contract)", () => {
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
		const providerIds = PROVIDERS.map((p) => p.id);
		for (const cell of parsed.include) {
			expect(providerIds).toContain(cell.provider as (typeof PROVIDERS)[number]["id"]);
			expect(SUITE_NAMES).toContain(cell.suite as (typeof SUITE_NAMES)[number]);
		}
	});

	it("exposes agent-friendly discovery: --help and --list-* listings the bin wires", () => {
		// The bin dispatches discovery through `handleDiscovery(argv, HELP)` before its matrix path, so
		// asserting that pairing here is the bin's discovery contract (no process spawn needed).
		expect(handleDiscovery(["--help"], HELP)).toEqual({ text: HELP, ok: true });
		expect(HELP).toContain("plan-matrix");
		expect(HELP).toContain("examples:");

		// Every registered provider and suite is discoverable through the bin's listings.
		const listed = handleDiscovery(["--list-providers"], HELP)?.text ?? "";
		for (const meta of PROVIDERS) expect(listed).toContain(meta.id);
		const suites = JSON.parse(
			handleDiscovery(["--list-suites", "--json"], HELP)?.text ?? "[]",
		) as Array<{ name: string }>;
		expect(suites.map((s) => s.name)).toEqual([...SUITE_NAMES]);

		// A bare invocation has no discovery flag, so the cell-list path runs.
		expect(handleDiscovery([], HELP)).toBeNull();
		expect(HELP).toContain("plan-providers");
		expect(HELP).toContain("plan-suites");
	});

	it("narrows the matrix to the providers a dispatch names, still one line of JSON", () => {
		const out = planMatrixJson("e2b,daytona");
		expect(out).not.toContain("\n");

		const parsed = JSON.parse(out) as { include: Array<{ provider: string }> };
		expect(parsed.include.length).toBe(2 * SUITE_NAMES.length);
		expect([...new Set(parsed.include.map((c) => c.provider))]).toEqual(["e2b", "daytona"]);
	});
});

describe("selectProviders", () => {
	const registered = PROVIDERS.map((p) => p.id);

	it("defaults to every registered provider when unset or blank", () => {
		// Blank is the workflow's "no filter" value (an empty dispatch input arrives as ""), so it must
		// mean the full matrix — not an empty one, which would silently benchmark nothing.
		expect(selectProviders(undefined)).toEqual(registered);
		expect(selectProviders("")).toEqual(registered);
		expect(selectProviders("  , ,")).toEqual(registered);
	});

	it("throws on an unregistered name rather than shrinking the matrix", () => {
		// The failure this guards: `dayton` silently drops daytona's cells, and the published dataset
		// then reads as "daytona produced no results" instead of "the dispatch was misspelled".
		expect(() => selectProviders("e2b,dayton")).toThrow(/unknown provider\(s\): dayton/);
		expect(() => selectProviders("e2b,dayton")).toThrow(/registered providers are/);
	});

	it("collapses duplicates and orders by the registry, not by the request", () => {
		// Cells are a set: a dispatch can neither double-run one nor reorder the CI job list.
		expect(selectProviders("modal,e2b,modal")).toEqual(["e2b", "modal"]);
	});

	it("tolerates whitespace and mixed casing around names, as a hand-typed dispatch input has", () => {
		expect(selectProviders(" E2b , Modal ")).toEqual(["e2b", "modal"]);
	});
});
