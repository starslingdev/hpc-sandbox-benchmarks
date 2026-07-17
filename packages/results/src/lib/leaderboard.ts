/**
 * Render a validated {@link Run} into the public comparison surface: one ranked table per emitted,
 * catalogued Metric, grouped by Dimension. This is the payoff the dataset exists for — a complete,
 * human-readable provider ranking. SDK-free: the Run model + the Catalog only.
 *
 * Each Dimension shows every Metric that at least one provider produced, with its headline Metric
 * first (catalog.ts guarantees at most one), and every provider that produced each Metric ranked by
 * its Direction (HIB → highest first, LIB → lowest first). A Metric with no provider value is omitted.
 * The representative value is the Samples' p50 (median) — robust to a single slow pass.
 *
 * Ranking is INFERENTIAL, not a bare sort. A provider's Samples are repeated trials inside one sandbox,
 * so their spread is environmental noise, and ordering on the median alone would let a lucky draw buy a
 * position: a live run had modal's STREAM Copy span 9.7k–65k MB/s against daytona's 66.5k ±0.14%. Each
 * row therefore carries a bootstrapped interval around its median, and two rows share a rank unless
 * their full distributions separate under Mann-Whitney U (with Kolmogorov-Smirnov reported alongside,
 * since a bimodal provider can match another's median while behaving nothing like it).
 */
import type {
	Dimension,
	GapOutcome,
	GapScope,
	MedianInterval,
	MetricDef,
	ObservedSpecs,
	Run,
	TargetSpec,
} from "@sandbox-benchmarks/schema";
import {
	bootstrapMedianInterval,
	canSeparate,
	DEFAULT_ALPHA,
	DIMENSIONS,
	getProvider,
	kolmogorovSmirnov,
	METRIC_CATALOG,
	mannWhitneyU,
} from "@sandbox-benchmarks/schema";

/** One provider's standing on one Metric. */
export interface LeaderboardRow {
	providerId: string;
	displayName: string;
	/** Representative value (Samples' p50) of the Metric for this provider. */
	value: number;
	/**
	 * 1-based rank by the Metric's Direction. Providers whose Sample distributions are NOT
	 * distinguishable (Mann-Whitney U, two-sided, α = {@link DEFAULT_ALPHA}) share a rank: a faster
	 * median earned inside the noise is not a faster provider.
	 */
	rank: number;
	/** Descriptive percentile-bootstrap interval around {@link value}. */
	interval: MedianInterval;
	/** Retained Sample count and their spread, so a wide/unstable row is legible at a glance. */
	n: number;
	stdev: number;
	/**
	 * Two-sided p-values against the row immediately above (`null` for rank 1, which has no predecessor).
	 * `mannWhitney` tests a shift in central tendency and drives the tie grouping; `ks` compares the full
	 * empirical CDFs, catching a provider whose median matches but whose distribution is bimodal — the
	 * signature of environmental noise rather than a real difference.
	 *
	 * Both are rendered: `mannWhitney` as `p vs. above`, `ks` as `p (KS)`. Only `mannWhitney` decides the
	 * rank; `ks` is shown so a reader can see the two disagree.
	 */
	pVsPrevious: { mannWhitney: number; ks: number; floor: number } | null;
	/**
	 * What the test said about this row and the one above it (`null` for rank 1, which has nothing above):
	 *
	 *  - `separated`    — the distributions differ (p < α). This row ranks strictly below the one above.
	 *  - `tied`         — the test ran, could have separated them, and did not. A real statistical tie.
	 *  - `underpowered` — the test COULD NOT have separated them at any effect size: its best attainable
	 *    p already exceeds α. That is a fact about the trial count, not about the providers, and it is
	 *    not a tie. See {@link tiedWithAbove} for what the rank then means.
	 *  - `untested`     — fewer than 2 Samples on a side: no distribution to test at all.
	 */
	verdict: ComparisonVerdict | null;
	/**
	 * Why this row shares the rank above it — and `null` exactly when it does NOT share it. Every shared
	 * rank states its reason, because "same rank" means two different things and conflating them is how a
	 * table comes to claim a tie it never established:
	 *
	 *  - `statistical`    — the test ran and could not tell them apart. THIS is the statistical tie.
	 *  - `identical-value` — their values are exactly equal, so the ranking has nothing to order them by.
	 *    It says nothing about the distributions; it is what stops the providerId sort tie-break from
	 *    silently deciding which of two identical published prices "wins". An `underpowered` row can share
	 *    a rank on this basis, and when it does, the shared rank is NOT a claim that they are alike.
	 */
	tiedWithAbove: TieBasis | null;
}

/** What the pairwise Mann-Whitney test said about a row and the one above it. */
export type ComparisonVerdict = "separated" | "tied" | "underpowered" | "untested";

/** Why a row shares the rank above it. See {@link LeaderboardRow.tiedWithAbove}. */
export type TieBasis = "statistical" | "identical-value";

/** One emitted Metric's ranked provider comparison. */
export interface LeaderboardMetric {
	metric: MetricDef;
	rows: LeaderboardRow[];
}

/** Every emitted Metric in one Dimension, with the headline first. */
export interface LeaderboardDimension {
	dimension: Dimension;
	metrics: LeaderboardMetric[];
	/** First rendered Metric (the headline when one was emitted), retained for API compatibility. */
	metric: MetricDef;
	/** Rows for {@link metric}, retained for API compatibility. */
	rows: LeaderboardRow[];
}

/** A provider whose observed allocation did not match the Run's requested target. */
export interface ComparabilityCaveat {
	providerId: string;
	displayName: string;
	observedSpecs: ObservedSpecs;
}

/**
 * How a benchmark came to produce no result for a provider — the leaderboard's outcome vocabulary.
 * The first two are RECORDED by the producer ({@link GapOutcome}); `missing` is DERIVED here, and is
 * the one a Run cannot state about itself:
 *
 *  - `skipped` — a precondition said no before anything ran (not enough disk for the suite).
 *  - `failed`  — it ran and broke (the suite threw, the operation errored, the sandbox died).
 *  - `missing` — nothing was ever reported: no result, and no marker either. The suite ran somewhere
 *    else in this Run, so it was part of the comparison, but this provider is simply absent from it.
 *    A dropped CI job, an artifact that never uploaded, a sandbox that died before it could write a
 *    marker. Left underived, it is the ONE hole that shows up nowhere: not in the table (no value to
 *    rank), and not in the gaps (no marker to read).
 */
export type CoverageOutcome = GapOutcome | "missing";

/** One benchmark that produced no result for a provider — a hole in the comparison, surfaced not hidden. */
export interface CoverageGap {
	providerId: string;
	displayName: string;
	/** What did not run: a whole suite, or one harness lifecycle operation. */
	scope: GapScope;
	/** The suite name, or the harness Metric id — whichever {@link scope} names. */
	id: string;
	outcome: CoverageOutcome;
	/** The producer's verbatim reason (a disk shortfall's numbers, an error message), or ours for `missing`. */
	reason: string;
	/**
	 * True when the suite was skipped because the provider could not supply the disk it needs — the
	 * case the leaderboard calls out loudly, since it means a provider is structurally unable to run a
	 * whole class of workload, not that it ran and lost.
	 */
	disk: boolean;
}

/** The full comparison surface derived from one Run. */
export interface Leaderboard {
	runId: string;
	sha: string;
	generatedAt: string;
	/** The requested comparison target recorded on this Run — never substituted from global config. */
	targetSpec: TargetSpec;
	dimensions: LeaderboardDimension[];
	/** Providers explicitly recorded as failing to match {@link targetSpec}. */
	comparabilityCaveats: ComparabilityCaveat[];
	/** Every benchmark that produced no result somewhere, disk gaps first. Empty when coverage is complete. */
	coverageGaps: CoverageGap[];
}

/** Stable, machine-readable projection of the public leaderboard. */
export interface PublicLeaderboard {
	schemaVersion: "1";
	runId: string;
	sha: string;
	generatedAt: string;
	targetSpec: TargetSpec;
	summary: {
		providerCount: number;
		metricCount: number;
		metricRecordCount: number;
		retainedObservationCount: number;
	};
	providers: Array<{
		id: string;
		name: string;
		specMatched: boolean | null;
		observedSpecs: ObservedSpecs;
	}>;
	dimensions: Array<{
		id: Dimension;
		metrics: Array<{
			id: string;
			name: string;
			unit: string;
			direction: "higher" | "lower";
			headline: boolean;
			rows: Array<{
				providerId: string;
				rank: number;
				value: number;
				interval: { low: number; high: number } | null;
				n: number;
				verdict: ComparisonVerdict | null;
				tiedWithAbove: TieBasis | null;
				pVsPrevious: LeaderboardRow["pVsPrevious"];
				note?: string;
			}>;
		}>;
	}>;
	coverageGaps: Array<{
		providerId: string;
		benchmark: string;
		scope: GapScope;
		outcome: CoverageOutcome;
		detail: string;
		disk: boolean;
	}>;
}

/**
 * Whether a skip reason is a disk-capacity gap — i.e. the harness wrote its "Insufficient disk: …"
 * marker because the sandbox had less free disk than the suite's `minDiskGb`. Matched by prefix rather
 * than importing the harness so `results` stays SDK-free; kept in lockstep with `runSuiteOnSandbox`'s
 * reason string (the one place that phrasing is authored).
 */
function isDiskGap(reason: string): boolean {
	return /^insufficient disk/i.test(reason.trim());
}

/** Rendering/sort precedence: the structural absences first, the merely-unreported last. */
const OUTCOME_ORDER: Record<CoverageOutcome, number> = { skipped: 0, failed: 1, missing: 2 };

/**
 * The suites this Run actually exercised — every suite that produced a Metric for SOME provider, or
 * that some provider left a marker for. This is the denominator the missing-suite gaps are derived
 * against, and it is deliberately the Run's OWN evidence rather than the registry's `SUITE_NAMES`: a
 * Run that only ever ran the disk suite has not "failed to cover" the other five, and accusing every
 * provider of five holes would bury the one real gap in noise the reader must then learn to ignore.
 */
function suitesExercised(run: Run): string[] {
	const suites = new Set<string>();
	for (const provider of run.providers) {
		for (const suite of provider.suitesCovered) suites.add(suite);
		for (const gap of provider.gaps) if (gap.scope === "suite") suites.add(gap.id);
	}
	return [...suites].sort((a, b) => a.localeCompare(b, "en"));
}

/**
 * Every hole in one Run's coverage: the gaps the providers RECORDED (skipped / failed), plus the ones
 * only the whole Run can see — a suite that ran elsewhere but never reported here at all, with no
 * result and no marker to explain itself.
 *
 * Deriving that last class is the difference between a coverage section that is honest and one that
 * merely looks it: an unrecorded absence is exactly what a dropped CI job, a lost artifact, or a
 * sandbox that died before writing its marker leaves behind, and it is invisible in every other view —
 * the ranked tables can only show providers that produced a value.
 */
function coverageGapsOf(run: Run): CoverageGap[] {
	const exercised = suitesExercised(run);

	const gaps = run.providers.flatMap((provider): CoverageGap[] => {
		const displayName = getProvider(provider.providerId)?.displayName ?? provider.providerId;
		const accountedFor = new Set([
			...provider.suitesCovered,
			...provider.gaps.filter((g) => g.scope === "suite").map((g) => g.id),
		]);
		return [
			...provider.gaps.map((gap) => ({
				providerId: provider.providerId,
				displayName,
				scope: gap.scope,
				id: gap.id,
				outcome: gap.outcome satisfies GapOutcome as CoverageOutcome,
				reason: gap.reason,
				// Only a SKIP can be a disk gap: the reason is the harness's precondition message, written
				// before the suite was attempted. A failure's reason is an error message, and one that merely
				// happens to start with "insufficient disk" is the workload running out of space mid-flight —
				// a different fact, and not the structural "cannot host this at all" the ❌ claims.
				disk: gap.outcome === "skipped" && isDiskGap(gap.reason),
			})),
			...exercised
				.filter((suite) => !accountedFor.has(suite))
				.map((suite) => ({
					providerId: provider.providerId,
					displayName,
					scope: "suite" as GapScope,
					id: suite,
					outcome: "missing" as CoverageOutcome,
					reason: "No result and no marker — the suite never reported for this provider.",
					disk: false,
				})),
		];
	});

	// Deterministically ordered so a committed leaderboard is byte-stable: disk gaps first (the headline
	// — a provider that cannot fit the workload at all), then by outcome, then by provider and benchmark.
	// Locale pinned to "en": bare localeCompare collates by whatever locale the runtime was built with.
	return gaps.sort(
		(a, b) =>
			Number(b.disk) - Number(a.disk) ||
			OUTCOME_ORDER[a.outcome] - OUTCOME_ORDER[b.outcome] ||
			a.displayName.localeCompare(b.displayName, "en") ||
			a.id.localeCompare(b.id, "en"),
	);
}

/** Rank all providers that emitted one Metric; empty when the Run has no result for it. */
function rankMetric(run: Run, metric: MetricDef): LeaderboardRow[] {
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
			verdict: null,
			tiedWithAbove: null,
		};
		return [{ samples: result.samples, row }];
	});
	if (candidates.length === 0) return [];

	// Order by Direction; tie-break on providerId so the output is deterministic. Locale pinned to
	// "en" so the byte-identical artifact gate can't flake on a runner built with a different locale.
	candidates.sort((a, b) =>
		a.row.value !== b.row.value
			? metric.direction === "HIB"
				? b.row.value - a.row.value
				: a.row.value - b.row.value
			: a.row.providerId.localeCompare(b.row.providerId, "en"),
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
	// tests don't support. It also keeps this to k−1 tests. The rendered methodology explicitly labels
	// their p-values unadjusted and exploratory; it does not claim family-wise error control.
	candidates.forEach((candidate, i) => {
		const previous = candidates[i - 1];
		if (!previous) {
			candidate.row.rank = 1;
			return;
		}
		// A row shares the rank above it EXACTLY when it has a reason to, and the reason is recorded.
		// That invariant is the whole defence against the table claiming a tie it never established: a
		// shared rank always answers "on what basis?", and the renderer prints the answer.
		const settle = (basis: TieBasis | null): void => {
			candidate.row.tiedWithAbove = basis;
			candidate.row.rank = basis === null ? i + 1 : previous.row.rank;
		};
		// Exactly equal values cannot be ordered by a ranking that ranks on the value. Whenever no
		// verdict is available to override that, they must share a rank — otherwise the providerId sort
		// tie-break alone would split two providers with an identical published price.
		const identical = candidate.row.value === previous.row.value;

		// A single Sample is not a distribution: there is nothing to test, and the value is typically
		// exact rather than measured (a Metric like `usd_per_hour` is a published price, not a trial).
		// Rank such rows on the value and mark them untested, rather than declaring every provider
		// "indistinguishable" because a one-trial comparison can never reach significance.
		if (previous.samples.length < 2 || candidate.samples.length < 2) {
			candidate.row.verdict = "untested";
			settle(identical ? "identical-value" : null);
			return;
		}

		const mw = mannWhitneyU(previous.samples, candidate.samples);
		const ks = kolmogorovSmirnov(previous.samples, candidate.samples);
		candidate.row.pVsPrevious = {
			mannWhitney: mw.pValue,
			ks: ks.pValue,
			floor: mw.minAttainablePValue,
		};

		// The same "a test that can never reach α is not evidence of sameness" rule as the n<2 case
		// above, applied where it actually bites: Mann-Whitney's p has a FLOOR, and at 3 v 3 that floor
		// (0.1) is already above α. Grouping those rows would print "statistically tied" for a provider
		// running at half the speed of the one above it — a fact about the trial count masquerading as a
		// fact about the providers. Claim no verdict, rank on the observed value, and let the rendering
		// disclose that the comparison was untestable.
		//
		// The floor comes from the test itself (it depends on the tie pattern, not just the sample
		// sizes), so the guard and the p-value it guards are answers about the same enumerated null and
		// cannot disagree.
		if (!canSeparate(mw)) {
			candidate.row.verdict = "underpowered";
			// An underpowered row can still share a rank — but only ever because the two values are
			// identical, never because the test "found no difference". The basis says which, so the
			// renderer and the footer can keep the two apart.
			settle(identical ? "identical-value" : null);
			return;
		}

		if (mw.pValue < DEFAULT_ALPHA) {
			candidate.row.verdict = "separated";
			settle(null);
			return;
		}
		// The test could have separated them and did not: a real statistical tie.
		candidate.row.verdict = "tied";
		settle("statistical");
	});

	return candidates.map((candidate) => candidate.row);
}

/** Build the structured leaderboard from a validated Run. Pure — Run in, ranking out. */
export function buildLeaderboard(run: Run): Leaderboard {
	const dimensions: LeaderboardDimension[] = [];

	for (const dimension of DIMENSIONS) {
		// Catalog order is the stable display order, except the dimension's editorial headline leads.
		// Crucially, every emitted Metric gets a table: headline is presentation priority, not a filter.
		const catalogued = METRIC_CATALOG.filter((metric) => metric.dimension === dimension).sort(
			(a, b) => Number(b.headline) - Number(a.headline),
		);
		const metrics = catalogued.flatMap((metric): LeaderboardMetric[] => {
			const rows = rankMetric(run, metric);
			return rows.length === 0 ? [] : [{ metric, rows }];
		});
		const primary = metrics[0];
		if (primary) {
			dimensions.push({ dimension, metrics, metric: primary.metric, rows: primary.rows });
		}
	}

	return {
		runId: run.runId,
		sha: run.sha,
		generatedAt: run.generatedAt,
		targetSpec: run.targetSpec,
		dimensions,
		comparabilityCaveats: run.providers.flatMap((provider): ComparabilityCaveat[] =>
			provider.specMatched === false
				? [
						{
							providerId: provider.providerId,
							displayName: getProvider(provider.providerId)?.displayName ?? provider.providerId,
							observedSpecs: provider.observedSpecs,
						},
					]
				: [],
		),
		coverageGaps: coverageGapsOf(run),
	};
}

/**
 * Describe every underpowered comparison the board actually contains, as `"3 v 3 floors at p ≈ 0.1"` —
 * quoting the floor THE TEST REPORTED for that row, not one recomputed from the sample sizes here. The
 * floor depends on the tie pattern as well as the sizes, so a footer that re-derived it from `n` alone
 * could print a number the row's own test never produced. An underpowered row is always compared against
 * the row above it, which is what supplies the other n. Deduplicated (several dimensions usually share
 * one shape) and ordered so the committed markdown stays byte-stable.
 */
function underpoweredFloors(board: Leaderboard): string[] {
	const seen = new Map<string, string>();
	for (const { metrics } of board.dimensions) {
		for (const { rows } of metrics) {
			rows.forEach((row, i) => {
				const previous = rows[i - 1];
				if (row.verdict !== "underpowered" || !previous || !row.pVsPrevious) return;
				const key = `${previous.n} v ${row.n}`;
				seen.set(key, `${key} floors at p ≈ ${formatPValue(row.pVsPrevious.floor)}`);
			});
		}
	}
	return [...seen.entries()].sort(([a], [b]) => a.localeCompare(b, "en")).map(([, text]) => text);
}

/**
 * Make free-form text safe inside a Markdown table cell. Skip reasons are the harness's verbatim
 * strings — a `|` would end the cell and a newline would end the row, silently corrupting the table.
 */
function escapeCell(text: string): string {
	return text.replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
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

/** Compact note for the main table's Note column — empty when nothing needs calling out. */
function rowNote(r: LeaderboardRow): string {
	const equalValues = r.tiedWithAbove === "identical-value";
	if (r.pVsPrevious === null) {
		return equalValues ? "equal values" : "";
	}
	if (r.verdict === "underpowered") {
		return equalValues ? "n too small, equal medians" : "n too small";
	}
	if (r.verdict === "tied") return "tied";
	return "";
}

/**
 * Project the existing leaderboard result into a stable JSON contract for downstream consumers.
 * Ranking, intervals, ties, gaps, and comparability remain owned by {@link buildLeaderboard}; this
 * function only names and serializes those already-derived facts.
 */
export function buildPublicLeaderboard(
	run: Run,
	board: Leaderboard = buildLeaderboard(run),
): PublicLeaderboard {
	if (board.runId !== run.runId || board.sha !== run.sha || board.generatedAt !== run.generatedAt) {
		throw new Error("Leaderboard and Run provenance do not match");
	}

	const metrics = board.dimensions.flatMap((dimension) => dimension.metrics);
	const rows = metrics.flatMap((metric) => metric.rows);

	return {
		schemaVersion: "1",
		runId: board.runId,
		sha: board.sha,
		generatedAt: board.generatedAt,
		targetSpec: board.targetSpec,
		summary: {
			providerCount: run.providers.length,
			metricCount: metrics.length,
			metricRecordCount: rows.length,
			retainedObservationCount: rows.reduce((sum, row) => sum + row.n, 0),
		},
		providers: run.providers.map((provider) => ({
			id: provider.providerId,
			name: getProvider(provider.providerId)?.displayName ?? provider.providerId,
			specMatched: provider.specMatched ?? null,
			observedSpecs: provider.observedSpecs,
		})),
		dimensions: board.dimensions.map((dimension) => ({
			id: dimension.dimension,
			metrics: dimension.metrics.map(({ metric, rows: metricRows }) => ({
				id: metric.id,
				name: metric.label,
				unit: metric.unit,
				direction: metric.direction === "HIB" ? "higher" : "lower",
				headline: metric.headline === true,
				rows: metricRows.map((row) => {
					const note = rowNote(row);
					return {
						providerId: row.providerId,
						rank: row.rank,
						value: row.value,
						interval:
							row.interval.resamples === 0 ? null : { low: row.interval.lo, high: row.interval.hi },
						n: row.n,
						verdict: row.verdict,
						tiedWithAbove: row.tiedWithAbove,
						pVsPrevious: row.pVsPrevious,
						...(note ? { note } : {}),
					};
				}),
			})),
		})),
		coverageGaps: board.coverageGaps.map((gap) => ({
			providerId: gap.providerId,
			benchmark: gap.id,
			scope: gap.scope,
			outcome: gap.outcome,
			detail: gap.reason,
			disk: gap.disk,
		})),
	};
}

/** Deterministic, newline-terminated serialization used by the CLI and artifact-sync gate. */
export function renderPublicLeaderboardJson(publicLeaderboard: PublicLeaderboard): string {
	return `${JSON.stringify(publicLeaderboard, null, 2)}\n`;
}

/** Mann-Whitney cell in the pairwise details table — reuses {@link rowNote} for the verdict suffix. */
function formatPairwiseP(r: LeaderboardRow): string {
	const note = rowNote(r);
	if (r.pVsPrevious === null) return note ? `— (${note})` : "—";
	const p = formatPValue(r.pVsPrevious.mannWhitney);
	return note ? `${p} (${note})` : p;
}

function formatInterval(r: LeaderboardRow): string {
	return r.interval.resamples === 0
		? "—"
		: `${formatValue(r.interval.lo)} – ${formatValue(r.interval.hi)}`;
}

/** One-line takeaway above each Metric table (leader vs next, or sole provider). */
function metricTakeaway(dimension: Dimension, metric: MetricDef, rows: LeaderboardRow[]): string {
	const leader = rows[0];
	if (!leader) return "";
	const better = metric.direction === "HIB" ? "higher is better" : "lower is better";
	// Immediate neighbor — not the next distinct rank — so a top-of-board statistical tie is not
	// misread as "only one provider ranked".
	const next = rows[1];
	if (!next) {
		return `${leader.displayName} is the only ranked provider (${formatValue(leader.value)} ${metric.unit}; ${better}).`;
	}
	// Collect the full top cohort, not just the immediate neighbor: three or more providers can share
	// rank 1 (statistical tie or identical values), and naming only the first two would silently drop
	// the rest. Rows are rank-sorted, so everything at the leader's rank is the contiguous top group.
	const coLeaders = rows.filter((r) => r.rank === leader.rank);
	if (coLeaders.length > 1) {
		const names = coLeaders.map((r) => r.displayName);
		const list = `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
		return `${list} share the top on this metric (${better}).`;
	}
	if (metric.direction === "HIB") {
		const ratio = leader.value / next.value;
		if (Number.isFinite(ratio) && ratio >= 1.05) {
			return `${leader.displayName} leads · ~${ratio.toFixed(1)}× ${next.displayName} on median (${better}).`;
		}
	} else {
		const ratio = next.value / leader.value;
		if (Number.isFinite(ratio) && ratio >= 1.05) {
			const verb = dimension === "economics" ? "is cheapest" : "leads";
			// ratio = next / leader, so it is how many times HIGHER the neighbour is — phrase it that way.
			// "~1.5× lower than X" reads as "the leader is 1.5× below X", which is not what next/leader means
			// (4.898 vs 7.252 is 1.5× higher for the neighbour, i.e. 32% lower for the leader — not "1.5× lower").
			return `${leader.displayName} ${verb} · ${next.displayName} is ~${ratio.toFixed(1)}× higher (${better}).`;
		}
	}
	return `${leader.displayName} leads on median (${better}); see notes for how ranks are decided.`;
}

/** Summary line for coverage gaps by provider — keeps the main board scannable. */
function coverageSummary(gaps: CoverageGap[]): string {
	const byProvider = new Map<string, number>();
	for (const g of gaps) {
		byProvider.set(g.displayName, (byProvider.get(g.displayName) ?? 0) + 1);
	}
	const parts = [...byProvider.entries()]
		.sort(([a], [b]) => a.localeCompare(b, "en"))
		.map(([name, n]) => `${name} ${n}`);
	return `${gaps.length} uncovered result${gaps.length === 1 ? "" : "s"} across ${byProvider.size} provider${byProvider.size === 1 ? "" : "s"} (${parts.join(", ")}). A gap is a missing result — the provider **failing to cover** that workload — never a tie or a zero.`;
}

/** Compact requested/observed allocation description, omitting fields probes could not see. */
function formatSpec(spec: TargetSpec | ObservedSpecs): string {
	const parts = [
		spec.vcpus === undefined ? undefined : `${formatValue(spec.vcpus)} vCPU`,
		spec.memoryGb === undefined ? undefined : `${formatValue(spec.memoryGb)} GiB RAM`,
		spec.diskGb === undefined ? undefined : `${formatValue(spec.diskGb)} GB disk`,
	].filter((part): part is string => part !== undefined);
	return parts.length > 0 ? parts.join(" · ") : "allocation not observable";
}

/** Render a {@link Leaderboard} as a Markdown document — the committed comparison surface. */
export function renderLeaderboardMarkdown(board: Leaderboard): string {
	// Render the board's OWN target, not the global constant, so the header can never claim the pinned
	// spec while the comparability warnings below report another one.
	const spec = formatSpec(board.targetSpec);
	const metricCount = board.dimensions.reduce(
		(sum, dimension) => sum + dimension.metrics.length,
		0,
	);
	const rows = board.dimensions.flatMap((dimension) =>
		dimension.metrics.flatMap((metric) => metric.rows),
	);
	const observationCount = rows.reduce((sum, row) => sum + row.n, 0);
	const providerCount = new Set(rows.map((row) => row.providerId)).size;
	const metricNoun = metricCount === 1 ? "metric" : "metrics";
	const providerNoun = providerCount === 1 ? "provider" : "providers";
	const lines: string[] = [
		"# Sandbox provider leaderboard",
		"",
		`Run \`${board.runId}\` · commit \`${board.sha}\` · generated ${board.generatedAt}`,
		"",
		`Requested target for every provider: **${spec}**. This run contains **${rows.length} metric records**`,
		`backed by **${observationCount} retained trial observations**, across **${metricCount} ${metricNoun}** and`,
		`**${providerCount} ${providerNoun}**; every emitted, catalogued metric has a ranked table below`,
		"(median of retained trials), grouped by dimension with its headline first.",
		"Generated from the published Run dataset — do not edit by hand. Methodology:",
		"[`docs/methodology.md`](docs/methodology.md).",
		"",
		"**How to read:** value = median (p50) · 95% CI = bootstrap around that median · rows share a rank only",
		"when statistically indistinguishable or tied on the median (see details below) · a coverage gap means unmeasured, never a score of zero.",
		"CPU/RAM comparability uses observed vCPU and RAM (±10% RAM); disk is a workload-capacity gate",
		"surfaced through coverage gaps, not part of the compute-match verdict.",
		"",
	];
	for (const caveat of board.comparabilityCaveats) {
		lines.push(
			`> **Comparability warning:** ${caveat.displayName}'s observed compute did not match the requested CPU/RAM target; its observed allocation was **${formatSpec(caveat.observedSpecs)}**. Its measured ranks are not like-for-like with compute-matched providers.`,
			"",
		);
	}

	if (board.dimensions.length === 0) {
		lines.push("_No ranked metrics yet (no provider produced a catalogued metric)._", "");
	}

	for (const { dimension, metrics } of board.dimensions) {
		lines.push(`## ${dimension}`, "");
		for (const { metric, rows: metricRows } of metrics) {
			const better = metric.direction === "HIB" ? "higher is better" : "lower is better";
			const notes = metricRows.map(rowNote);
			const hasNotes = notes.some((note) => note !== "");
			const headline = metric.headline ? " _(headline)_" : "";
			lines.push(
				`### ${metric.label}${headline}`,
				"",
				`${metric.unit} · ${better}`,
				"",
				`_${metricTakeaway(dimension, metric, metricRows)}_`,
				"",
				hasNotes
					? `| Rank | Provider | ${metric.label} (${metric.unit}) | 95% bootstrap interval | n | Note |`
					: `| Rank | Provider | ${metric.label} (${metric.unit}) | 95% bootstrap interval | n |`,
				hasNotes
					? "| ---: | --- | ---: | ---: | ---: | --- |"
					: "| ---: | --- | ---: | ---: | ---: |",
				...metricRows.map((row, i) => {
					const base = `| ${row.rank} | ${row.displayName} | ${formatValue(row.value)} | ${formatInterval(row)} | ${row.n} |`;
					return hasNotes ? `${base} ${notes[i] || "—"} |` : base;
				}),
				"",
			);
		}
	}

	// Coverage gaps: summary first; full table + legends inside <details> so unfinished providers
	// don't bury the rankings.
	if (board.coverageGaps.length > 0) {
		const outcomes = new Set(board.coverageGaps.map((g) => g.outcome));
		lines.push(
			"## Coverage gaps",
			"",
			coverageSummary(board.coverageGaps),
			"",
			"<details>",
			"<summary>Full coverage table</summary>",
			"",
			"| Provider | Benchmark | Outcome | Detail |",
			"| --- | --- | --- | --- |",
			...board.coverageGaps.map((g) => {
				const what = g.scope === "operation" ? `${g.id} _(lifecycle op)_` : g.id;
				const outcome = g.disk ? "❌ **disk** (skipped)" : `**${g.outcome}**`;
				return `| ${g.displayName} | ${what} | ${outcome} | ${escapeCell(g.reason)} |`;
			}),
			"",
		);
		if (outcomes.has("skipped")) {
			lines.push(
				"**skipped** — a precondition said no before the benchmark was attempted. A ❌ **disk** skip is the",
				"loud one: the provider could not supply the disk the suite needs, so the workload does not run on",
				"its current allocation at all. That is a structural absence, not a slow result.",
				"",
			);
		}
		if (outcomes.has("failed")) {
			lines.push(
				"**failed** — the benchmark was attempted and broke: it threw, timed out, or died with the sandbox.",
				"Unlike a skip, this is a reliability fact about the provider, not a decision made on its behalf.",
				"",
			);
		}
		if (outcomes.has("missing")) {
			lines.push(
				"**missing** — nothing was reported at all: no result, and no marker explaining why. The suite ran",
				"elsewhere in this run, so it was part of the comparison, and this provider is simply absent from",
				"it — a dropped job, a lost artifact, or a sandbox that died before it could say anything. Treat it",
				"as unmeasured, never as a pass: the provider has not been shown to run this workload.",
				"",
			);
		}
		lines.push("</details>", "");
	}

	if (board.dimensions.length === 0) return `${lines.join("\n")}\n`;

	// Statistics essay + optional p-value / KS detail table for readers who want the receipts.
	lines.push(
		"<details>",
		"<summary>How rankings are decided</summary>",
		"",
		"The value is the median (p50) of the retained per-trial Samples, not the mean — a single stalled",
		"pass drags a mean far more than it moves a median. The 95% interval is a percentile bootstrap of",
		"that median (10,000 resamples, seeded from the Run id so the table is reproducible byte-for-byte).",
		"It is a descriptive interval conditional on the retained trials, **not a calibrated frequentist",
		"confidence interval**: n is small and within-sandbox trials may be dependent on host scheduling.",
		"",
		`Rows are separated only when Mann-Whitney U (two-sided, α = ${DEFAULT_ALPHA}, enumerated exactly`,
		"over the permutation null rather than approximated) finds evidence of stochastic ordering — at these",
		"sample sizes the normal approximation can report a p the exact test cannot actually produce. KS is",
		"reported separately for distribution *shape* and does not drive the ranking.",
		"",
	);

	const sharedRankReasons: string[] = [];
	if (rows.some((r) => r.tiedWithAbove === "statistical")) {
		sharedRankReasons.push(
			"`tied` — the test could have separated those providers and did not, so a faster median earned",
			"inside the noise is not a faster provider. This is the only note that claims two providers are",
			"statistically indistinguishable.",
		);
	}
	if (rows.some((r) => r.tiedWithAbove === "identical-value")) {
		sharedRankReasons.push(
			"`equal medians` / `equal values` — arithmetic, not a finding: the ranking sorts on the value,",
			"and two identical values have no order between them. It says nothing about the distributions.",
		);
	}
	if (sharedRankReasons.length > 0) {
		lines.push(
			"**A Note cell always says why a rank is shared, and the reasons are not interchangeable.**",
			...sharedRankReasons,
			"",
		);
	}

	lines.push(
		"Samples are repeated trials inside one sandbox, so their spread is environmental (neighbours, host",
		"contention, virtualization), and a wide bootstrap interval or a large `n` (the harness re-runs a test that will not",
		"converge) is itself the signal that the provider's performance is unstable, not that the measurement",
		"is imprecise.",
		"",
		"At the small `n` this suite produces, a non-significant result means *not enough evidence to",
		"separate*, never *the providers are equal*.",
		"",
	);

	const floors = underpoweredFloors(board);
	if (floors.length > 0) {
		lines.push(
			"`n too small` is the extreme of that: Mann-Whitney's best attainable p already exceeds α for those",
			`Samples, so the test could not have separated the rows at any effect size (here ${floors.join("; ")}).`,
			"Such rows are ranked on their observed medians and are **not** claimed to be tied — read the gap",
			"between the values, and treat the p-value as unable to settle them either way. Where such a row",
			"nevertheless shares the rank above it, the note reads `equal medians`: the two values are simply",
			"identical, which is the ranking having nothing to order them by — never a finding that the",
			"providers are alike.",
			"",
		);
	}

	// Detail table with p vs. above + KS for readers who want distribution shape.
	if (rows.some((r) => r.pVsPrevious !== null)) {
		lines.push(
			"### Pairwise tests (vs. row above)",
			"",
			"`p vs. above` is Mann-Whitney (drives rank). `p (KS)` is Kolmogorov-Smirnov on distribution",
			"*shape* — it does not drive the ranking. A tied Mann-Whitney beside a small KS often means the",
			"same typical speed with different behaviour (e.g. bimodal stalls).",
			"These are unadjusted, exploratory per-comparison p-values; no family-wise or false-discovery-rate",
			"correction is applied across providers or metrics.",
			"",
			"| Dimension | Metric | Provider | p vs. above | p (KS) |",
			"| --- | --- | --- | ---: | ---: |",
		);
		for (const { dimension, metrics } of board.dimensions) {
			for (const { metric, rows: metricRows } of metrics) {
				for (const row of metricRows) {
					const ks = row.pVsPrevious === null ? "—" : formatPValue(row.pVsPrevious.ks);
					lines.push(
						`| ${dimension} | ${metric.label} | ${row.displayName} | ${formatPairwiseP(row)} | ${ks} |`,
					);
				}
			}
		}
		lines.push("");
	}

	lines.push("</details>", "");

	return `${lines.join("\n")}\n`;
}
