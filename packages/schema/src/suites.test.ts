import { describe, expect, it } from "bun:test";
import { paddedSuiteToken, padSuiteList, SUITE_NAMES, SUITES } from "./index.ts";

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
		expect(SUITE_NAMES).toEqual(["cpu-node", "system", "memory", "disk"]);
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
