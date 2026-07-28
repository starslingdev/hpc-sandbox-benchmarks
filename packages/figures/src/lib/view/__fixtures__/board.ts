/**
 * Hand-built `Leaderboard` literals for the view tests.
 *
 * Deliberately NOT the committed dataset run: `buildLeaderboard` over it takes ~8 s (bootstrap
 * resampling on 2500 observations), which would dominate this package's test time to assert things
 * that are decided by three fields. The gate in `@repo/repo-checks` is what covers the real board.
 */
import type { Leaderboard, LeaderboardMetric, LeaderboardRow } from "@sandbox-benchmarks/results";
import type { MetricDef } from "@sandbox-benchmarks/schema";

export const METRIC: MetricDef = {
	id: "demo_metric",
	label: "Demo metric",
	description: "A metric used only by the view tests.",
	dimension: "cpu",
	unit: "runs/s",
	direction: "HIB",
	headline: true,
};

export function row(
	over: Partial<LeaderboardRow> & Pick<LeaderboardRow, "providerId">,
): LeaderboardRow {
	return {
		displayName: over.providerId,
		value: 10,
		rank: 1,
		interval: { median: 10, lo: 9, hi: 11, level: 0.95, resamples: 10_000 },
		n: 20,
		stdev: 1,
		pVsPrevious: null,
		verdict: null,
		tiedWithAbove: null,
		...over,
	};
}

export function entry(rows: LeaderboardRow[]): LeaderboardMetric {
	return { metric: METRIC, rows };
}

export function board(rows: LeaderboardRow[], extraProviders: string[] = []): Leaderboard {
	return {
		runId: "1234567890",
		sha: "a".repeat(40),
		generatedAt: "2026-07-23T16:40:10.630Z",
		targetSpec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
		dimensions: [{ dimension: "cpu", metrics: [entry(rows)], metric: METRIC, rows }],
		roster: [...rows.map((r) => r.providerId), ...extraProviders].map((providerId) => ({
			providerId,
			displayName: providerId,
			declaredIsolation: "microVM",
			detectedIsolation: "vm",
			mismatch: false,
		})),
		comparabilityCaveats: [],
		coverageGaps: [],
		absentProviders: [],
	} as Leaderboard;
}
