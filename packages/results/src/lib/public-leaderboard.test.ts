import { describe, expect, it } from "bun:test";
import type { MetricResult, ProviderRun, Run } from "@sandbox-benchmarks/schema";
import { aggregate } from "@sandbox-benchmarks/schema";
import {
	buildLeaderboard,
	buildPublicLeaderboard,
	renderPublicLeaderboardJson,
} from "./leaderboard.ts";

function metric(metricId: string, samples: number[]): MetricResult {
	return { metricId, samples, aggregates: aggregate(samples) };
}

function fixtureRun(): Run {
	const providers: ProviderRun[] = [
		{
			providerId: "daytona",
			validationStatus: "validated",
			specMatched: true,
			observedSpecs: { vcpus: 2, memoryGb: 8, diskGb: 40 },
			metrics: [metric("node_web_tooling_runs_per_s", [10, 12])],
			suitesCovered: ["cpu-node"],
			gaps: [],
			uncatalogued: [],
		},
		{
			providerId: "blaxel",
			validationStatus: "pending",
			specMatched: false,
			observedSpecs: { vcpus: 6, memoryGb: 15.63, diskGb: 12.5 },
			metrics: [],
			suitesCovered: [],
			gaps: [
				{
					scope: "suite",
					id: "cpu-node",
					outcome: "skipped",
					reason: "Insufficient disk: 12.5 GiB free, suite needs 20 GiB",
				},
			],
			uncatalogued: [],
		},
	];
	return {
		schemaVersion: "2",
		runId: "run-public-1",
		sha: "abc123",
		generatedAt: "2026-07-17T00:00:00.000Z",
		targetSpec: { vcpus: 2, memoryGb: 8, diskGb: 40 },
		providers,
	};
}

describe("public leaderboard JSON", () => {
	it("projects the existing leaderboard without changing ranks, intervals, gaps, or provenance", () => {
		const run = fixtureRun();
		const board = buildLeaderboard(run);
		const output = buildPublicLeaderboard(run, board);
		const sourceRow = board.dimensions[0]?.rows[0];
		const publicRow = output.dimensions[0]?.metrics[0]?.rows[0];
		if (!sourceRow || !publicRow) throw new Error("fixture did not produce its expected row");

		expect(output).toMatchObject({
			schemaVersion: "1",
			runId: run.runId,
			sha: run.sha,
			generatedAt: run.generatedAt,
			targetSpec: run.targetSpec,
			summary: {
				providerCount: 2,
				metricCount: 1,
				metricRecordCount: 1,
				retainedObservationCount: 2,
			},
		});
		expect(publicRow).toMatchObject({
			providerId: sourceRow?.providerId,
			rank: sourceRow?.rank,
			value: sourceRow?.value,
			n: sourceRow?.n,
		});
		expect(publicRow.interval).toEqual({
			low: sourceRow.interval.lo,
			high: sourceRow.interval.hi,
		});
		expect(output.providers.find(({ id }) => id === "blaxel")).toMatchObject({
			name: "Blaxel",
			specMatched: false,
			observedSpecs: { vcpus: 6, memoryGb: 15.63, diskGb: 12.5 },
		});
		expect(output.coverageGaps).toEqual([
			{
				providerId: "blaxel",
				benchmark: "cpu-node",
				scope: "suite",
				outcome: "skipped",
				detail: "Insufficient disk: 12.5 GiB free, suite needs 20 GiB",
				disk: true,
			},
		]);
	});

	it("serializes deterministically with a trailing newline", () => {
		const output = buildPublicLeaderboard(fixtureRun());
		const first = renderPublicLeaderboardJson(output);
		expect(first).toBe(renderPublicLeaderboardJson(output));
		expect(first.endsWith("\n")).toBe(true);
	});

	it("refuses a leaderboard from a different run", () => {
		const run = fixtureRun();
		const board = { ...buildLeaderboard(run), runId: "other-run" };
		expect(() => buildPublicLeaderboard(run, board)).toThrow(
			"Leaderboard and Run provenance do not match",
		);
	});
});
