import { expect, test } from "bun:test";
import { parseRun } from "@sandbox-benchmarks/schema";
import { parseActiveLeaderboardRun } from "./active-leaderboard-run.ts";

test("projects retired providers out of a leaderboard without changing the published Run", () => {
	const provider = (providerId: string) => ({
		providerId,
		validationStatus: "pending",
		observedSpecs: {},
		suitesCovered: [],
		gaps: [],
		uncatalogued: [],
		metrics: [],
		costEvidence: [],
		artifactEvidence: [],
	});
	const cell = (providerId: string) => ({
		id: `${providerId}-cpu-r0`,
		provider: providerId,
		suite: "cpu-node",
		replicate: 0,
		attemptId: `${providerId}-attempt`,
		status: "failed",
		plannedMetrics: ["node_web_tooling_runs_per_s"],
		passes: 2,
		missingMetrics: ["node_web_tooling_runs_per_s"],
		excludedMetrics: [],
		retainedMetrics: [],
	});
	const original = parseRun({
		schemaVersion: "8",
		runId: "published-run",
		sha: "a".repeat(40),
		generatedAt: "2026-09-13T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [provider("e2b"), provider("runloop")],
		experiment: {
			planDigest: `sha256:${"a".repeat(64)}`,
			attemptIds: ["e2b-attempt", "runloop-attempt"],
			partial: {
				status: "partial",
				planned: 2,
				complete: 0,
				incomplete: 2,
				excluded: 0,
				cells: [cell("e2b"), cell("runloop")],
			},
		},
	});
	const before = JSON.stringify(original);
	const active = parseActiveLeaderboardRun(original);

	expect(active.providers.map((record) => record.providerId)).toEqual(["e2b"]);
	expect(active.experiment?.attemptIds).toEqual(["e2b-attempt"]);
	expect(active.experiment?.partial).toMatchObject({
		planned: 1,
		complete: 0,
		incomplete: 1,
		excluded: 0,
		cells: [{ provider: "e2b" }],
	});
	expect(() => parseRun(active)).not.toThrow();
	expect(JSON.stringify(original)).toBe(before);
});
