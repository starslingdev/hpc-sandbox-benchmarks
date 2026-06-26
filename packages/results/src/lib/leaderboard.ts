/**
 * Render a validated {@link Run} into the public comparison surface: one ranked table per Dimension,
 * keyed on that Dimension's headline Metric, plus economics. This is the payoff the dataset exists for
 * — a human-readable provider ranking. SDK-free: the Run model + the Catalog only.
 *
 * Each Dimension shows its single headline Metric (catalog.ts guarantees exactly one), every provider
 * that produced it, ranked by the Metric's Direction (HIB → highest first, LIB → lowest first). A
 * Dimension with no headline Metric, or no provider value, is omitted. The representative value is the
 * Samples' p50 (median) — robust to a single slow pass.
 */
import type { Dimension, MetricDef, Run } from "@sandbox-benchmarks/schema";
import { DIMENSIONS, getProvider, headlineMetric } from "@sandbox-benchmarks/schema";

/** One provider's standing on a Dimension's headline Metric. */
export interface LeaderboardRow {
	providerId: string;
	displayName: string;
	/** Representative value (Samples' p50) of the headline Metric for this provider. */
	value: number;
	/** 1-based rank by the Metric's Direction; equal values share neither rank (deterministic tie-break). */
	rank: number;
}

/** One Dimension's ranked comparison on its headline Metric. */
export interface LeaderboardDimension {
	dimension: Dimension;
	metric: MetricDef;
	rows: LeaderboardRow[];
}

/** The full comparison surface derived from one Run. */
export interface Leaderboard {
	runId: string;
	sha: string;
	generatedAt: string;
	dimensions: LeaderboardDimension[];
}

/** Build the structured leaderboard from a validated Run. Pure — Run in, ranking out. */
export function buildLeaderboard(run: Run): Leaderboard {
	const dimensions: LeaderboardDimension[] = [];

	for (const dimension of DIMENSIONS) {
		// The headline Metric for this Dimension, if one is catalogued (else the Dimension is unpopulated).
		let metric: MetricDef;
		try {
			metric = headlineMetric(dimension);
		} catch {
			continue;
		}

		const rows: LeaderboardRow[] = run.providers.flatMap((provider) => {
			const result = provider.metrics.find((m) => m.metricId === metric.id);
			if (!result) return [];
			return [
				{
					providerId: provider.providerId,
					displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
					value: result.aggregates.p50,
					rank: 0, // assigned after sort
				},
			];
		});
		if (rows.length === 0) continue;

		// Rank by Direction; tie-break on providerId so the output is deterministic.
		rows.sort((a, b) =>
			a.value !== b.value
				? metric.direction === "HIB"
					? b.value - a.value
					: a.value - b.value
				: a.providerId.localeCompare(b.providerId),
		);
		rows.forEach((row, i) => {
			row.rank = i + 1;
		});

		dimensions.push({ dimension, metric, rows });
	}

	return { runId: run.runId, sha: run.sha, generatedAt: run.generatedAt, dimensions };
}

/** Format a metric value compactly: integers as-is, otherwise up to 4 significant digits, trimmed. */
function formatValue(value: number): string {
	if (Number.isInteger(value)) return String(value);
	// toPrecision(4) then strip trailing zeros / a trailing dot (e.g. 0.2304, 12.35, 1234).
	return Number.parseFloat(value.toPrecision(4)).toString();
}

/** Render a {@link Leaderboard} as a Markdown document — the committed comparison surface. */
export function renderLeaderboardMarkdown(board: Leaderboard): string {
	const lines: string[] = [
		"# Sandbox provider leaderboard",
		"",
		`Run \`${board.runId}\` · commit \`${board.sha}\` · generated ${board.generatedAt}`,
		"",
		"Each table ranks the providers on that dimension's headline metric. Generated from the published Run dataset — do not edit by hand.",
		"",
	];

	if (board.dimensions.length === 0) {
		lines.push("_No ranked dimensions yet (no provider produced a headline metric)._", "");
		return `${lines.join("\n")}\n`;
	}

	for (const { dimension, metric, rows } of board.dimensions) {
		const better = metric.direction === "HIB" ? "higher is better" : "lower is better";
		lines.push(
			`## ${dimension}`,
			"",
			`Headline: **${metric.label}** (${metric.unit}, ${better})`,
			"",
			`| Rank | Provider | ${metric.label} (${metric.unit}) |`,
			"| ---: | --- | ---: |",
			...rows.map((r) => `| ${r.rank} | ${r.displayName} | ${formatValue(r.value)} |`),
			"",
		);
	}

	return `${lines.join("\n")}\n`;
}
