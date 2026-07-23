import { describe, expect, it } from "bun:test";
import { PROVIDERS, SUITE_NAMES, SUITES } from "@sandbox-benchmarks/schema";
import { HELP, planReplicatesJson } from "./bin/plan-replicates.ts";
import { handleDiscovery } from "./lib/discovery.ts";
import {
	parseReplicasOverride,
	planReplicateMap,
	replicaCountForSuite,
	SINGLE_REPLICATE,
} from "./lib/matrix.ts";

describe("plan-replicates", () => {
	it("emits a single line of compact JSON object (the $GITHUB_OUTPUT contract)", () => {
		const out = planReplicatesJson();
		expect(out).not.toContain("\n");
		expect(out).not.toMatch(/\n\s+/);
		const map = JSON.parse(out) as Record<string, number[]>;
		// Keyed by every registered suite, each at its schema-declared replicate count as [0..R-1].
		expect(Object.keys(map)).toEqual([...SUITE_NAMES]);
		for (const name of SUITE_NAMES) {
			const count = SUITES[name].defaultReplicas ?? SINGLE_REPLICATE;
			expect(map[name]).toEqual(Array.from({ length: count }, (_, i) => i));
		}
	});

	it("narrows to the suites a dispatch names, still one line of JSON", () => {
		const out = planReplicatesJson("network");
		expect(out).not.toContain("\n");
		expect(JSON.parse(out)).toEqual({ network: [0, 1, 2] });
	});

	it("scales every suite by the BENCH_REPLICAS override", () => {
		const map = JSON.parse(planReplicatesJson(undefined, "5")) as Record<string, number[]>;
		for (const name of SUITE_NAMES) {
			expect(map[name]).toEqual([0, 1, 2, 3, 4]);
		}
	});

	it("throws on an unregistered suite rather than silently running nothing", () => {
		expect(() => planReplicatesJson("network,netwrk")).toThrow(/unknown suite\(s\): netwrk/);
	});

	it("throws on a non-positive replicas override rather than fanning out zero sandboxes", () => {
		expect(() => planReplicatesJson(undefined, "0")).toThrow(/positive integer/);
	});

	it("exposes agent-friendly discovery: --help and --list-* listings the bin wires", () => {
		expect(handleDiscovery(["--help"], HELP)).toEqual({ text: HELP, ok: true });
		expect(HELP).toContain("plan-replicates");
		expect(HELP).toContain("examples:");
		const listed = handleDiscovery(["--list-providers"], HELP)?.text ?? "";
		for (const meta of PROVIDERS) expect(listed).toContain(meta.id);
		expect(handleDiscovery([], HELP)).toBeNull();
	});
});

describe("parseReplicasOverride", () => {
	it("returns undefined for a blank/unset override (each suite keeps its schema default)", () => {
		expect(parseReplicasOverride(undefined)).toBeUndefined();
		expect(parseReplicasOverride("")).toBeUndefined();
		expect(parseReplicasOverride("  ")).toBeUndefined();
	});

	it("parses a positive integer override", () => {
		expect(parseReplicasOverride("1")).toBe(1);
		expect(parseReplicasOverride(" 8 ")).toBe(8);
	});

	it("throws on a non-positive or non-integer override", () => {
		expect(() => parseReplicasOverride("0")).toThrow(/positive integer/);
		expect(() => parseReplicasOverride("-2")).toThrow(/positive integer/);
		expect(() => parseReplicasOverride("2.5")).toThrow(/positive integer/);
		expect(() => parseReplicasOverride("lots")).toThrow(/positive integer/);
	});
});

describe("replicaCountForSuite", () => {
	it("uses the suite's schema default when no override is given", () => {
		expect(replicaCountForSuite("realworld-mastra")).toBe(5);
		expect(replicaCountForSuite("cpu-node")).toBe(3);
	});

	it("the override wins over every suite's default", () => {
		expect(replicaCountForSuite("realworld-mastra", 2)).toBe(2);
		expect(replicaCountForSuite("cpu-node", 10)).toBe(10);
	});
});

describe("planReplicateMap", () => {
	it("keys exactly the selected suites (matching the suite axis), each as [0..R-1]", () => {
		expect(planReplicateMap("cpu-node,network", undefined)).toEqual({
			"cpu-node": [0, 1, 2],
			network: [0, 1, 2],
		});
	});
});
