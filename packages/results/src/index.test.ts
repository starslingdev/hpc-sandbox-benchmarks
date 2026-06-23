import { describe, expect, it } from "bun:test";
import { join } from "node:path";
import { normalizeResultsTree, summarizeRun } from "./index.ts";

// The committed fixture tree has one provider directory (daytona) holding a real node-web-tooling
// composite, a bench.sh skip marker, and observed specs. This is the offline end-to-end proof.
const rawRoot = join(import.meta.dir, "lib/__fixtures__");

describe("normalizeResultsTree", () => {
	const run = normalizeResultsTree({
		rawRoot,
		runId: "run-test",
		sha: "abc123",
		generatedAt: "2026-06-20T00:00:00.000Z",
	});

	it("validates as a Run and includes every known provider", () => {
		expect(run.schemaVersion).toBe("1");
		expect(run.providers.map((provider) => provider.providerId).sort()).toEqual([
			"daytona",
			"e2b",
			"modal",
		]);
	});

	it("normalizes daytona's node-web-tooling into an aggregated, validated metric", () => {
		const daytona = run.providers.find((provider) => provider.providerId === "daytona");
		expect(daytona?.validationStatus).toBe("validated");
		const metric = daytona?.metrics.find((m) => m.metricId === "node_web_tooling_runs_per_s");
		expect(metric?.samples).toEqual([16.19, 16.3, 16.08]);
		expect(metric?.aggregates.n).toBe(3);
		expect(metric?.aggregates.p50).toBeCloseTo(16.19, 5);
		expect(metric?.sourceFile).toBe("pts_node-web-tooling.xml");
	});

	it("records the bench.sh skip and matches the pinned target spec", () => {
		const daytona = run.providers.find((provider) => provider.providerId === "daytona");
		expect(daytona?.skips).toEqual([
			{ suite: "pts_git", reason: "phoronix-test-suite not installed" },
		]);
		expect(daytona?.specMatched).toBe(true);
		expect(daytona?.observedSpecs.hostVcpus).toBe(48);
	});

	it("leaves providers without a raw directory pending", () => {
		const e2b = run.providers.find((provider) => provider.providerId === "e2b");
		expect(e2b?.validationStatus).toBe("pending");
		expect(e2b?.metrics).toEqual([]);
	});

	it("summarizes one line per provider", () => {
		expect(summarizeRun(run)).toHaveLength(3);
	});
});
