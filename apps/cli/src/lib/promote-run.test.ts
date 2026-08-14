import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate, parseRunIndex } from "@sandbox-benchmarks/schema";
import { PromoteGateError, promoteRun, validatedProviderCount } from "./promote-run.ts";

const dirs: string[] = [];
function freshDir(): string {
	const dir = mkdtempSync(join(tmpdir(), "promote-run-"));
	dirs.push(dir);
	return dir;
}
process.on("exit", () => {
	for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function metric(): MetricResult {
	return { metricId: "stream_type_copy", samples: [10], aggregates: aggregate([10]) };
}

function provider(providerId: string, metrics: MetricResult[]): ProviderRun {
	return {
		providerId,
		costEvidence: [],
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		suitesCovered: metrics.length > 0 ? ["memory"] : [],
		gaps: [],
		uncatalogued: [],
	};
}

function run(providers: ProviderRun[], runId = "local-1"): Run {
	return {
		schemaVersion: "5",
		runId,
		sha: "abc123",
		generatedAt: "2026-08-14T00:00:00.000Z",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		providers,
	};
}

describe("validatedProviderCount", () => {
	it("counts only providers that produced a catalogued metric", () => {
		expect(validatedProviderCount(run([provider("local", [metric()])]))).toBe(1);
		expect(validatedProviderCount(run([provider("local", [])]))).toBe(0);
	});
});

describe("promoteRun", () => {
	// The gate is the reason candidate→promote exists (ADR-0004): a partial collection with no real
	// metrics must never reach a published dataset. Shared by `promote` and `bench-local --promote` so
	// the two cannot disagree about what "publishable" means.
	it("refuses a Run with zero validated providers", () => {
		const dataset = freshDir();
		expect(() => promoteRun(run([provider("local", [])]), dataset)).toThrow(PromoteGateError);
		expect(() => readFileSync(join(dataset, "index.json"), "utf8")).toThrow();
	});

	it("writes the Run and a newest-first index", () => {
		const dataset = freshDir();
		const { outFile, validated } = promoteRun(run([provider("local", [metric()])]), dataset);
		expect(outFile).toBe(join(dataset, "runs", "local-1.json"));
		expect(validated).toBe(1);

		const published = JSON.parse(readFileSync(outFile, "utf8")) as Run;
		expect(published.runId).toBe("local-1");
		expect(published.providers[0]?.providerId).toBe("local");

		const index = parseRunIndex(JSON.parse(readFileSync(join(dataset, "index.json"), "utf8")));
		expect(index.runs).toEqual([
			{ runId: "local-1", generatedAt: "2026-08-14T00:00:00.000Z", path: "runs/local-1.json" },
		]);
	});

	it("accumulates runs in one dataset root", () => {
		const dataset = freshDir();
		promoteRun(run([provider("local", [metric()])], "local-1"), dataset);
		promoteRun(run([provider("local", [metric()])], "local-2"), dataset);
		const index = parseRunIndex(JSON.parse(readFileSync(join(dataset, "index.json"), "utf8")));
		expect(index.runs.map((entry) => entry.runId).sort()).toEqual(["local-1", "local-2"]);
	});
});
