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
		const artifact = JSON.parse(
			readFileSync(join(ROOT, "data", "dataset", "leaderboards", `${runId}.json`), "utf8"),
		) as ReturnType<typeof buildPublicLeaderboard>;
		const board = buildLeaderboard(run);
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

		for (const sourceDimension of board.dimensions) {
			const publicDimension = artifact.dimensions.find(
				({ id }) => id === sourceDimension.dimension,
			);
			expect(publicDimension, sourceDimension.dimension).toBeDefined();
			for (const sourceMetric of sourceDimension.metrics) {
				const publicMetric = publicDimension?.metrics.find(
					({ id }) => id === sourceMetric.metric.id,
				);
				expect(publicMetric, sourceMetric.metric.id).toMatchObject({
					name: sourceMetric.metric.label,
					unit: sourceMetric.metric.unit,
					direction: sourceMetric.metric.direction === "HIB" ? "higher" : "lower",
					headline: sourceMetric.metric.headline === true,
				});
				expect(publicMetric?.rows.map(({ providerId }) => providerId)).toEqual(
					sourceMetric.rows.map(({ providerId }) => providerId),
				);
				for (const sourceRow of sourceMetric.rows) {
					const publicRow = publicMetric?.rows.find(
						({ providerId }) => providerId === sourceRow.providerId,
					);
					expect(publicRow, `${sourceMetric.metric.id}/${sourceRow.providerId}`).toMatchObject({
						rank: sourceRow.rank,
						value: sourceRow.value,
						n: sourceRow.n,
						verdict: sourceRow.verdict,
						tiedWithAbove: sourceRow.tiedWithAbove,
						pVsPrevious: sourceRow.pVsPrevious,
					});
					expect(publicRow?.interval).toEqual(
						sourceRow.interval.resamples === 0
							? null
							: { low: sourceRow.interval.lo, high: sourceRow.interval.hi },
					);
				}
			}
		}
	});
});
