import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate } from "@sandbox-benchmarks/schema";
import { hostIngestRunId, spliceProviderRun } from "./host-ingest.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function provider(providerId: string, metrics: MetricResult[] = []): ProviderRun {
	return {
		providerId,
		costEvidence: [],
		validationStatus: metrics.length > 0 ? "validated" : "pending",
		observedSpecs: {},
		metrics,
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
	};
}

function baseRun(providers: ProviderRun[], overrides: Partial<Run> = {}): Run {
	return {
		schemaVersion: "5",
		runId: "31066359914",
		sha: "abc123",
		generatedAt: "2026-06-01T00:00:00.000Z",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		providers,
		...overrides,
	} as Run;
}

const AT = "2026-08-20T00:00:00.000Z";

describe("spliceProviderRun", () => {
	it("inserts a new provider without touching the existing rows", () => {
		const e2b = provider("e2b", [metric("git_seconds", [10])]);
		const base = baseRun([e2b]);
		const host = provider("claude-cloud", [metric("git_seconds", [20])]);

		const out = spliceProviderRun({
			base,
			provider: host,
			runId: "r1",
			sha: "def456",
			generatedAt: AT,
		});

		expect(out.providers.map((p) => p.providerId)).toEqual(["claude-cloud", "e2b"]);
		// The untouched row must survive byte-identical — a splice re-derives nothing.
		expect(out.providers.find((p) => p.providerId === "e2b")).toEqual(e2b);
	});

	it("replaces an existing row for the same provider rather than duplicating it", () => {
		const stale = provider("claude-cloud", [metric("git_seconds", [99])]);
		const base = baseRun([provider("e2b"), stale]);
		const fresh = provider("claude-cloud", [metric("git_seconds", [20])]);

		const out = spliceProviderRun({
			base,
			provider: fresh,
			runId: "r1",
			sha: "def456",
			generatedAt: AT,
		});

		const rows = out.providers.filter((p) => p.providerId === "claude-cloud");
		expect(rows).toHaveLength(1);
		expect(rows[0]?.metrics[0]?.samples).toEqual([20]);
	});

	it("emits rows in provider-id order regardless of input order", () => {
		const base = baseRun([provider("vercel"), provider("e2b")]);
		const out = spliceProviderRun({
			base,
			provider: provider("modal-vm"),
			runId: "r1",
			sha: "def456",
			generatedAt: AT,
		});
		expect(out.providers.map((p) => p.providerId)).toEqual(["e2b", "modal-vm", "vercel"]);
	});

	it("carries the base target spec and sourceRunUrl, and stamps the new identity", () => {
		const base = baseRun([provider("e2b")], { sourceRunUrl: "https://example.com/run/1" });
		const out = spliceProviderRun({
			base,
			provider: provider("claude-cloud"),
			runId: "31066359914+claude-cloud-20260820",
			sha: "def456",
			generatedAt: AT,
		});

		expect(out.runId).toBe("31066359914+claude-cloud-20260820");
		expect(out.sha).toBe("def456");
		expect(out.generatedAt).toBe(AT);
		expect(out.schemaVersion).toBe("5");
		expect(out.targetSpec).toEqual(base.targetSpec);
		expect(out.sourceRunUrl).toBe("https://example.com/run/1");
	});

	it("backfills costEvidence on pre-v5 rows the ingest never touched", () => {
		// A v4 base row carries no costEvidence; v5 requires the array on every row, so a splice must
		// not fail validation over a row it did not measure.
		const legacy = { ...provider("e2b") } as ProviderRun & { costEvidence?: unknown };
		legacy.costEvidence = undefined;
		const base = baseRun([legacy as ProviderRun], { schemaVersion: "4" } as Partial<Run>);

		const out = spliceProviderRun({
			base,
			provider: provider("claude-cloud"),
			runId: "r1",
			sha: "def456",
			generatedAt: AT,
		});
		expect(out.providers.find((p) => p.providerId === "e2b")?.costEvidence).toEqual([]);
	});
});

describe("hostIngestRunId", () => {
	it("builds a composite id whose host component is non-numeric", () => {
		const id = hostIngestRunId("31066359914", "claude-cloud", new Date("2026-08-20T12:00:00Z"));
		expect(id).toBe("31066359914+claude-cloud-20260820");

		// The leaderboard links a NUMERIC component to /actions/runs/<id>. The host component must not
		// be numeric, or the board asserts a workflow run that was never issued.
		const components = id.split("+");
		expect(components[0]).toMatch(/^\d+$/);
		expect(components[1]).not.toMatch(/^\d+$/);
	});

	it("chains when the base is itself a composite", () => {
		const id = hostIngestRunId(
			"31066359914+cursor-cloud-agent-20260814",
			"claude-cloud",
			new Date("2026-08-20T00:00:00Z"),
		);
		expect(id.split("+")).toEqual([
			"31066359914",
			"cursor-cloud-agent-20260814",
			"claude-cloud-20260820",
		]);
	});
});
