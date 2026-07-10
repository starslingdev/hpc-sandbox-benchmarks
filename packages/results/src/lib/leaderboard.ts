/**
 * Render a validated {@link Run} into the public comparison surface: one ranked table per Dimension,
 * keyed on that Dimension's headline Metric, plus economics. This is the payoff the dataset exists for
 * — a human-readable provider ranking. SDK-free: the Run model + the Catalog only.
 *
 * Each Dimension shows its single headline Metric (catalog.ts guarantees exactly one), every provider
 * that produced it, ranked by the Metric's Direction (HIB → highest first, LIB → lowest first). A
 * Dimension with no headline Metric, or no provider value, is omitted. The representative value is the
 * Samples' p50 (median) — robust to a single slow pass.
 *
 * Ranking is INFERENTIAL, not a bare sort. A provider's Samples are repeated trials inside one sandbox,
 * so their spread is environmental noise, and ordering on the median alone would let a lucky draw buy a
 * position: a live run had modal's STREAM Copy span 9.7k–65k MB/s against daytona's 66.5k ±0.14%. Each
 * row therefore carries a bootstrapped interval around its median, and two rows share a rank unless
 * their full distributions separate under Mann-Whitney U (with Kolmogorov-Smirnov reported alongside,
 * since a bimodal provider can match another's median while behaving nothing like it).
 */
import type { Dimension, MedianInterval, MetricDef, Run } from "@sandbox-benchmarks/schema";
import {
	bootstrapMedianInterval,
	DEFAULT_ALPHA,
	DIMENSIONS,
	getProvider,
	kolmogorovSmirnov,
	METRIC_CATALOG,
	mannWhitneyU,
} from "@sandbox-benchmarks/schema";

/** One provider's standing on a Dimension's headline Metric. */
export interface LeaderboardRow {
	providerId: string;
	displayName: string;
	/** Representative value (Samples' p50) of the headline Metric for this provider. */
	value: number;
	/**
	 * 1-based rank by the Metric's Direction. Providers whose Sample distributions are NOT
	 * distinguishable (Mann-Whitney U, two-sided, α = {@link DEFAULT_ALPHA}) share a rank: a faster
	 * median earned inside the noise is not a faster provider.
	 */
	rank: number;
	/** Bootstrapped interval around {@link value} — the honest precision of the median. */
	interval: MedianInterval;
	/** Retained Sample count and their spread, so a wide/unstable row is legible at a glance. */
	n: number;
	stdev: number;
	/**
	 * Two-sided p-values against the row immediately above (`null` for rank 1, which has no predecessor).
	 * `mannWhitney` tests a shift in central tendency and drives the tie grouping; `ks` compares the full
	 * empirical CDFs, catching a provider whose median matches but whose distribution is bimodal — the
	 * signature of environmental noise rather than a real difference.
	 */
	pVsPrevious: { mannWhitney: number; ks: number } | null;
	/** Whether this row is statistically separable from the one above it. `null` for rank 1. */
	separated: boolean | null;
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
		// A direct lookup, not headlineMetric()+catch: an unpopulated Dimension is the expected case here,
		// not an exceptional one, and a bare catch would also swallow real programming errors.
		const metric: MetricDef | undefined = METRIC_CATALOG.find(
			(m) => m.dimension === dimension && m.headline,
		);
		if (!metric) continue;

		// Carry each provider's raw Samples alongside its row: the ranking needs the full distributions,
		// not just their medians, to tell a real difference from environmental noise.
		const candidates = run.providers.flatMap((provider) => {
			const result = provider.metrics.find((m) => m.metricId === metric.id);
			if (!result) return [];
			const row: LeaderboardRow = {
				providerId: provider.providerId,
				displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
				value: result.aggregates.p50,
				rank: 0, // assigned after sort
				// Seed from stable identity so a committed leaderboard is byte-identical on every
				// regeneration — a Math.random() bootstrap would churn the diff on every run.
				interval: bootstrapMedianInterval(result.samples, {
					seed: `${run.runId}:${metric.id}:${provider.providerId}`,
				}),
				n: result.aggregates.n,
				stdev: result.aggregates.stdev,
				pVsPrevious: null,
				separated: null,
			};
			return [{ samples: result.samples, row }];
		});
		if (candidates.length === 0) continue;

		// Order by Direction; tie-break on providerId so the output is deterministic.
		candidates.sort((a, b) =>
			a.row.value !== b.row.value
				? metric.direction === "HIB"
					? b.row.value - a.row.value
					: a.row.value - b.row.value
				: a.row.providerId.localeCompare(b.row.providerId),
		);

		// Competition ranking with STATISTICAL ties. Walk the ordered rows and test each against the one
		// above: when Mann-Whitney can't separate them, they share a rank rather than letting a median
		// won inside the noise buy a position. `separated` carries the verdict; `ks` is reported beside
		// it because two providers can share a median while differing in distribution shape.
		//
		// Only ADJACENT rows are tested, which is deliberate: a leaderboard is a linear order, and the
		// pairwise "which providers are mutually indistinguishable" relation is not transitive (A~B and
		// B~C does not give A~C). Testing the chain keeps the table honest about the one comparison it
		// actually renders — each row against the row above it — instead of implying a grouping the
		// tests don't support. It also keeps this to k−1 tests, so no multiplicity correction is owed.
		candidates.forEach((candidate, i) => {
			const previous = candidates[i - 1];
			if (!previous) {
				candidate.row.rank = 1;
				return;
			}
			// A single Sample is not a distribution: there is nothing to test, and the value is typically
			// exact rather than measured (a Metric like `usd_per_hour` is a published price, not a trial).
			// Rank such rows on the value and mark them untested, rather than declaring every provider
			// "indistinguishable" because a one-trial comparison can never reach significance. Exactly
			// equal values are a genuine tie, though, and must share a rank — otherwise two providers
			// with an identical published price would be split by the providerId sort tie-break alone.
			if (previous.samples.length < 2 || candidate.samples.length < 2) {
				candidate.row.rank = candidate.row.value === previous.row.value ? previous.row.rank : i + 1;
				return;
			}
			const mw = mannWhitneyU(previous.samples, candidate.samples);
			const ks = kolmogorovSmirnov(previous.samples, candidate.samples);
			const separated = mw.pValue < DEFAULT_ALPHA;
			candidate.row.pVsPrevious = { mannWhitney: mw.pValue, ks: ks.pValue };
			candidate.row.separated = separated;
			// Not separable → inherit the rank above. Separable → this row's ordinal position.
			candidate.row.rank = separated ? i + 1 : previous.row.rank;
		});

		dimensions.push({ dimension, metric, rows: candidates.map((c) => c.row) });
	}

	return { runId: run.runId, sha: run.sha, generatedAt: run.generatedAt, dimensions };
}

/** Format a metric value compactly: integers as-is, otherwise up to 4 significant digits, trimmed. */
function formatValue(value: number): string {
	if (Number.isInteger(value)) return String(value);
	// toPrecision(4) then strip trailing zeros / a trailing dot (e.g. 0.2304, 12.35, 1234).
	return Number.parseFloat(value.toPrecision(4)).toString();
}

/** Format a p-value for the table: tiny values as a bound, never as a misleading `0`. */
function formatPValue(p: number): string {
	if (p < 0.001) return "<0.001";
	return p.toPrecision(2);
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
			`| Rank | Provider | ${metric.label} (${metric.unit}) | 95% CI | n | p vs. above |`,
			"| ---: | --- | ---: | ---: | ---: | ---: |",
			...rows.map((r) => {
				const ci =
					r.interval.resamples === 0
						? "—"
						: `${formatValue(r.interval.lo)} – ${formatValue(r.interval.hi)}`;
				// A tied rank is the interesting case: say so in the cell rather than leaving the reader
				// to infer it from two rows sharing a number.
				const p =
					r.pVsPrevious === null
						? "—"
						: r.separated
							? formatPValue(r.pVsPrevious.mannWhitney)
							: `${formatPValue(r.pVsPrevious.mannWhitney)} (tied)`;
				return `| ${r.rank} | ${r.displayName} | ${formatValue(r.value)} | ${ci} | ${r.n} | ${p} |`;
			}),
			"",
		);
	}

	lines.push(
		"---",
		"",
		"**Reading this table.** The value is the median (p50) of the retained per-trial Samples, not the",
		"mean — a single stalled pass drags a mean far more than it moves a median. The 95% CI is a",
		"percentile bootstrap of that median (10,000 resamples, seeded from the Run id so the table is",
		"reproducible byte-for-byte), not a normal-theory interval: these Samples are neither normal nor",
		"independent of the host's scheduling.",
		"",
		`Rows are separated only when their full Sample distributions differ (Mann-Whitney U, two-sided, α = ${DEFAULT_ALPHA}).`,
		"**Providers sharing a rank are statistically indistinguishable on this Metric** — a faster median",
		"earned inside the noise is not a faster provider. Samples are repeated trials inside one sandbox,",
		"so their spread is environmental (neighbours, host contention, virtualization), and a wide CI or a",
		"large `n` (the harness re-runs a test that will not converge) is itself the signal that the",
		"provider's performance is unstable, not that the measurement is imprecise.",
		"",
		"At the small `n` this suite produces, a non-significant result means *not enough evidence to",
		"separate*, never *the providers are equal*.",
		"",
	);

	return `${lines.join("\n")}\n`;
}
