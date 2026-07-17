import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { HELP, planSuitesJson } from "./bin/plan-suites.ts";
import { handleDiscovery } from "./lib/discovery.ts";
import { selectSuites } from "./lib/matrix.ts";

describe("plan-suites", () => {
	it("emits a single line of compact JSON array (the $GITHUB_OUTPUT contract)", () => {
		const out = planSuitesJson();
		expect(out).not.toContain("\n");
		expect(out).not.toMatch(/\n\s+/);
		// Every registered suite, in registry order — each suite job is gated on membership here.
		expect(JSON.parse(out)).toEqual([...SUITE_NAMES]);
	});

	it("narrows to the suites a dispatch names, still one line of JSON", () => {
		const out = planSuitesJson("network");
		expect(out).not.toContain("\n");
		expect(JSON.parse(out)).toEqual(["network"]);
	});

	it("throws on an unregistered name rather than silently running nothing", () => {
		expect(() => planSuitesJson("network,netwrk")).toThrow(/unknown suite\(s\): netwrk/);
	});

	it("exposes agent-friendly discovery: --help and --list-* listings the bin wires", () => {
		expect(handleDiscovery(["--help"], HELP)).toEqual({ text: HELP, ok: true });
		expect(HELP).toContain("plan-suites");
		expect(HELP).toContain("examples:");
		const listed = handleDiscovery(["--list-providers"], HELP)?.text ?? "";
		for (const meta of PROVIDERS) expect(listed).toContain(meta.id);
		expect(handleDiscovery([], HELP)).toBeNull();
	});
});

describe("selectSuites", () => {
	it("defaults to every registered suite when unset or blank", () => {
		expect(selectSuites(undefined)).toEqual([...SUITE_NAMES]);
		expect(selectSuites("")).toEqual([...SUITE_NAMES]);
		expect(selectSuites("  , ,")).toEqual([...SUITE_NAMES]);
	});

	it("throws on an unregistered name rather than running nothing", () => {
		expect(() => selectSuites("network,gpu")).toThrow(/unknown suite\(s\): gpu/);
		expect(() => selectSuites("network,gpu")).toThrow(/registered suites are/);
	});

	it("collapses duplicates and orders by the registry, not by the request", () => {
		expect(selectSuites("network,memory,network")).toEqual(["memory", "network"]);
	});

	it("tolerates whitespace and mixed casing around names", () => {
		expect(selectSuites(" Network , Memory ")).toEqual(["memory", "network"]);
	});
});
