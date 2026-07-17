import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	buildLeaderboard,
	buildPublicLeaderboard,
	renderPublicLeaderboardJson,
} from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const ROOT = findRepoRoot();

function publishedRunId(): string {
	const leaderboard = readFileSync(join(ROOT, "LEADERBOARD.md"), "utf8");
	const match = leaderboard.match(/^Run `([^`]+)`/m);
	if (!match?.[1]) throw new Error("LEADERBOARD.md does not name its published Run");
	return match[1];
}

describe("public leaderboard artifact", () => {
	it("is byte-identical to the existing leaderboard result for the published Run", () => {
		const runId = publishedRunId();
		const run = parseRun(
			JSON.parse(readFileSync(join(ROOT, "data", "dataset", "runs", `${runId}.json`), "utf8")),
		);
		const artifactPath = join(ROOT, "data", "dataset", "leaderboards", `${runId}.json`);
		const committed = readFileSync(artifactPath, "utf8");
		const rendered = renderPublicLeaderboardJson(
			buildPublicLeaderboard(run, buildLeaderboard(run)),
		);

		if (committed !== rendered) {
			throw new Error(
				`Public leaderboard is stale. Regenerate it:\n  bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/${runId}.json data/dataset/leaderboards/${runId}.json`,
			);
		}
		expect(committed).toBe(rendered);
	});

	it("covers every provider metric record and retained observation", () => {
		const runId = publishedRunId();
		const run = parseRun(
			JSON.parse(readFileSync(join(ROOT, "data", "dataset", "runs", `${runId}.json`), "utf8")),
		);
		const artifact = buildPublicLeaderboard(run);
		const metricRecordCount = run.providers.reduce(
			(sum, provider) => sum + provider.metrics.length,
			0,
		);
		const observationCount = run.providers.reduce(
			(sum, provider) =>
				sum +
				provider.metrics.reduce((providerSum, metric) => providerSum + metric.samples.length, 0),
			0,
		);

		expect(artifact.summary.metricRecordCount).toBe(metricRecordCount);
		expect(artifact.summary.retainedObservationCount).toBe(observationCount);
		expect(
			artifact.dimensions.flatMap(({ metrics }) => metrics.flatMap(({ rows }) => rows)),
		).toHaveLength(metricRecordCount);
	});
});
