import { describe, expect, it } from "bun:test";
import type { LocalRunRequest } from "./index.ts";
import {
	benchmarkLabelSchema,
	DEFAULT_LOCAL_LABEL,
	localLabelSchema,
	PROVIDERS,
	parseLocalRunRequest,
} from "./index.ts";

/** A minimal valid request; each case overrides the one field it is about. */
function request(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
	return {
		runId: "local-1",
		label: "local",
		suites: ["cpu-node"],
		replicates: [0],
		repoRoot: "/repo",
		sha: "abc1234",
		keepGoing: false,
		...overrides,
	};
}

describe("localLabelSchema", () => {
	it("accepts the bare default and a suffixed label", () => {
		expect(localLabelSchema.allows("local")).toBe(true);
		expect(localLabelSchema.allows("local-thinkpad-x1")).toBe(true);
		expect(localLabelSchema.allows(DEFAULT_LOCAL_LABEL)).toBe(true);
	});

	// The label becomes a directory under data/raw/ and part of a marker filename, so these are
	// rejections about path safety and marker forgery, not about style.
	it("rejects labels that could escape the raw tree or forge another marker", () => {
		expect(localLabelSchema.allows("../escape")).toBe(false);
		expect(localLabelSchema.allows("local/../e2b")).toBe(false);
		expect(localLabelSchema.allows("local.host")).toBe(false);
		expect(localLabelSchema.allows("LOCAL")).toBe(false);
		expect(localLabelSchema.allows("")).toBe(false);
	});

	it("requires the local- prefix, so a label can never collide with a provider id", () => {
		expect(localLabelSchema.allows("laptop")).toBe(false);
		expect(localLabelSchema.allows("local-")).toBe(false);
		for (const provider of PROVIDERS) {
			expect(localLabelSchema.allows(provider.id)).toBe(false);
		}
	});

	it("bounds the suffix length", () => {
		expect(localLabelSchema.allows(`local-${"a".repeat(31)}`)).toBe(true);
		expect(localLabelSchema.allows(`local-${"a".repeat(32)}`)).toBe(false);
	});
});

describe("benchmarkLabelSchema", () => {
	it("admits every registered provider id and the local labels", () => {
		for (const provider of PROVIDERS) {
			expect(benchmarkLabelSchema.allows(provider.id)).toBe(true);
		}
		expect(benchmarkLabelSchema.allows("local")).toBe(true);
		expect(benchmarkLabelSchema.allows("local-ci-box")).toBe(true);
	});

	it("admits nothing else", () => {
		expect(benchmarkLabelSchema.allows("aws")).toBe(false);
		expect(benchmarkLabelSchema.allows("daytona")).toBe(false);
	});
});

describe("parseLocalRunRequest", () => {
	it("returns the parsed request for a valid invocation", () => {
		const parsed: LocalRunRequest = parseLocalRunRequest(
			request({ suites: ["memory", "cpu-node"], replicates: [0, 1] }),
		);
		expect(parsed.suites).toEqual(["memory", "cpu-node"]);
		expect(parsed.replicates).toEqual([0, 1]);
		expect(parsed.outFile).toBeUndefined();
	});

	it("rejects an unregistered suite", () => {
		expect(() => parseLocalRunRequest(request({ suites: ["gpu-vllm"] }))).toThrow(
			/invalid local run request/,
		);
	});

	it("rejects an empty suite or replicate list", () => {
		expect(() => parseLocalRunRequest(request({ suites: [] }))).toThrow();
		expect(() => parseLocalRunRequest(request({ replicates: [] }))).toThrow();
	});

	// A duplicate would make the second pass overwrite the first's raw directory or shard file, so the
	// Run would claim more evidence than it actually has.
	it("rejects duplicate suites and duplicate replicate indices", () => {
		expect(() => parseLocalRunRequest(request({ suites: ["memory", "memory"] }))).toThrow(
			/distinct/,
		);
		expect(() => parseLocalRunRequest(request({ replicates: [0, 0] }))).toThrow(/distinct/);
	});

	it("rejects a runId the dataset filename contract could not hold", () => {
		expect(() => parseLocalRunRequest(request({ runId: "../etc" }))).toThrow();
		expect(() => parseLocalRunRequest(request({ runId: "" }))).toThrow();
	});

	it("rejects a label outside the attribution vocabulary", () => {
		expect(() => parseLocalRunRequest(request({ label: "my-laptop" }))).toThrow();
	});

	it("rejects a negative or fractional replicate index", () => {
		expect(() => parseLocalRunRequest(request({ replicates: [-1] }))).toThrow();
		expect(() => parseLocalRunRequest(request({ replicates: [1.5] }))).toThrow();
	});

	it("rejects an undeclared key rather than silently dropping it", () => {
		expect(() => parseLocalRunRequest(request({ promote: true }))).toThrow();
	});
});

describe("localRunRequestSchema label vocabulary", () => {
	// Deliberately NARROWER than benchmarkLabelSchema, which the harness uses for both lanes. A
	// registered id here would parse, then make `getProvider` hit during normalization and attribute
	// that vendor's published $/hr to timings taken on a laptop.
	it("refuses a registered provider id, so a local Run cannot inherit vendor pricing", () => {
		for (const provider of PROVIDERS) {
			expect(() => parseLocalRunRequest(request({ label: provider.id }))).toThrow();
		}
	});

	it("still accepts every local label", () => {
		expect(parseLocalRunRequest(request({ label: "local-box-2" })).label).toBe("local-box-2");
	});
});
