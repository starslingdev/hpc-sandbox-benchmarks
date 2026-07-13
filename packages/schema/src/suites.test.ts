import { describe, expect, it } from "bun:test";
import { METRIC_CATALOG, paddedSuiteToken, padSuiteList, SUITE_NAMES, SUITES } from "./index.ts";
// Not part of the public surface (curation is an implementation detail of the catalog merge); the
// pinned-subset test below reaches in directly to compare suite declarations against curated keys.
import { ptsOverrides } from "./pts-overrides.ts";

describe("suite registry", () => {
	it("registers cpu-node as a PTS- and Node-backed suite", () => {
		const cpuNode = SUITES["cpu-node"];
		expect(cpuNode.setupPts).toBe(true);
		expect(cpuNode.setupNode).toBe(true);
		expect(cpuNode.commands).toEqual(["mise run benchmark:cpu:node"]);
	});

	it("declares the cpu dimension and the node-web-tooling metric it emits", () => {
		const cpuNode = SUITES["cpu-node"];
		expect(cpuNode.dimensions).toEqual(["cpu"]);
		expect(cpuNode.metrics).toEqual(["node_web_tooling_runs_per_s"]);
	});

	it("exposes the suite names", () => {
		expect(SUITE_NAMES).toEqual([
			"cpu-node",
			"system",
			"memory",
			"disk",
			"network",
			"cpu-generic",
			"realworld-mastra",
			"realworld-better-auth",
			"realworld-openclaw",
		]);
	});

	it("mirrors each realworld suite's metrics from the generated catalog (no hand-drift)", () => {
		// The task set already lives in test-definition.xml, target.env, and the generated catalog;
		// this pins the fourth (hand-maintained) copy in SUITES to the catalog in BOTH directions, so
		// an added/removed/renamed task can't leave a suite emitting an undeclared metric or
		// declaring a metric its profile no longer produces.
		const profileOf = {
			"realworld-mastra": "local/realworld-mastra",
			"realworld-better-auth": "local/realworld-better-auth",
			"realworld-openclaw": "local/realworld-openclaw",
		} as const;
		for (const [suiteName, ptsTest] of Object.entries(profileOf)) {
			const fromCatalog = METRIC_CATALOG.filter((m) => m.pts?.test === ptsTest)
				.map((m) => m.id)
				.sort();
			expect(fromCatalog.length).toBeGreaterThan(0);
			const declared: string[] = [...SUITES[suiteName as keyof typeof SUITES].metrics];
			expect(declared.sort()).toEqual(fromCatalog);
		}
	});

	it("mirrors the full-matrix suites' metrics from the generated catalog (no hand-drift)", () => {
		// cpu-generic and network run their profiles' WHOLE option matrices in batch mode, so their
		// declared lists must equal the catalog's entries for those tests — same both-directions pin
		// as the realworld mirror above (a profile bump that adds/renames a combination fails here
		// instead of silently stranding the list).
		const profilesOf = {
			"cpu-generic": ["pts/c-ray", "pts/compress-zstd"],
			network: ["pts/network-loopback"],
		} as const;
		for (const [suiteName, ptsTests] of Object.entries(profilesOf)) {
			const fromCatalog = METRIC_CATALOG.filter(
				(m) => m.pts && (ptsTests as readonly string[]).includes(m.pts.test),
			)
				.map((m) => m.id)
				.sort();
			expect(fromCatalog.length).toBeGreaterThan(0);
			const declared: string[] = [...SUITES[suiteName as keyof typeof SUITES].metrics];
			expect(declared.sort()).toEqual(fromCatalog);
		}
	});

	it("pins the fio/pgbench PINNED-subset suites to their curated override keys", () => {
		// disk (fio) and system (pgbench) deliberately declare a SUBSET of their profiles' catalogued
		// combinations — the ones the producer tasks pin via PRESET_OPTIONS — so a catalog mirror
		// can't gate them. Every declared subset id is also a curated pts-overrides key (only the
		// producible combinations get short labels), so equality against the override keys catches a
		// wrong-axis id here: with the full matrix catalogued, a typo'd engine or block size would
		// otherwise pass the suite contract and just never receive samples.
		const overrideKeys = Object.keys(ptsOverrides);
		const subsets = [
			{ suite: "disk", prefix: "fio_" },
			{ suite: "system", prefix: "pgbench_" },
		] as const;
		for (const { suite, prefix } of subsets) {
			const declared = SUITES[suite].metrics.filter((id) => id.startsWith(prefix)).sort();
			const curated = overrideKeys.filter((id) => id.startsWith(prefix)).sort();
			expect(declared.length).toBeGreaterThan(0);
			expect(declared).toEqual(curated);
		}
	});

	it("keeps command timeouts within the requested sandbox lifetime", () => {
		for (const suite of Object.values(SUITES)) {
			expect(suite.commandTimeoutMinutes).toBeLessThanOrEqual(suite.timeoutMinutes);
		}
	});
});

describe("padded suite tokens", () => {
	it("wraps a single suite for exact GHA contains() matching", () => {
		expect(paddedSuiteToken("cpu-node")).toBe(",cpu-node,");
	});

	it("pads the full list so every token matches as a substring", () => {
		const list = padSuiteList(["cpu-node", "cpu-generic"]);
		expect(list).toBe(",cpu-node,cpu-generic,");
		expect(list.includes(paddedSuiteToken("cpu-node"))).toBe(true);
		expect(list.includes(paddedSuiteToken("cpu-generic"))).toBe(true);
	});
});
