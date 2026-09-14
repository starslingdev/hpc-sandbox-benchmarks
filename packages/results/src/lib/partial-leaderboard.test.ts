import { expect, test } from "bun:test";
import { parseRun } from "@sandbox-benchmarks/schema";
import { buildLeaderboard, renderLeaderboardMarkdown } from "./leaderboard.ts";

test("partial dataset readers prominently disclose frozen coverage without changing historical output", () => {
	const run = parseRun({
		schemaVersion: "8",
		runId: "partial-run",
		sha: "a".repeat(40),
		generatedAt: "2026-09-13T00:00:00Z",
		targetSpec: { vcpus: 4, memoryGb: 8 },
		providers: [],
		experiment: {
			planDigest: `sha256:${"a".repeat(64)}`,
			attemptIds: ["attempt-1"],
			partial: {
				status: "partial",
				planned: 1,
				complete: 0,
				incomplete: 1,
				excluded: 0,
				cells: [
					{
						id: "cell-1",
						provider: "e2b",
						suite: "cpu-node",
						replicate: 0,
						attemptId: "attempt-1",
						status: "failed",
						plannedMetrics: ["node_web_tooling_runs_per_s"],
						passes: 2,
						missingMetrics: ["node_web_tooling_runs_per_s"],
						excludedMetrics: [],
						retainedMetrics: [],
					},
				],
			},
		},
	});
	const markdown = renderLeaderboardMarkdown(buildLeaderboard(run), []);
	expect(markdown).toContain(
		"**Partial results — incomplete experiment.** 0 of 1 planned cells complete; 1 incomplete",
	);
	expect(markdown).toContain("Only verified measurements are ranked.");
	const historicalInput = { ...run, schemaVersion: "6" };
	Reflect.deleteProperty(historicalInput, "experiment");
	const historical = parseRun(historicalInput);
	expect(renderLeaderboardMarkdown(buildLeaderboard(historical), [])).not.toContain(
		"Partial results",
	);
});
