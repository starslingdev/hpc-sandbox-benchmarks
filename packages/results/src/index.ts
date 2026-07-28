// Public surface of @sandbox-benchmarks/results.
// Turns a provider's raw PTS output into the schema's Run model using ONLY @sandbox-benchmarks/schema
// and the XML parser — never a provider SDK (enforced by the package boundary).
//
// The PTS parser, per-file extraction, observed-spec reading, and Run writer all live under ./lib and
// are implementation detail. This surface exposes only the entry points consumers (the CLI) need:
// normalize a raw tree, write the Run, and summarize it.
export { aggregateRuns } from "./lib/aggregate.ts";
export {
	type AbsentProvider,
	buildLeaderboard,
	type ComparabilityCaveat,
	// Every type reachable from `Leaderboard` is exported with it: a consumer that can hold the value but
	// cannot name the type of `leaderboard.coverageGaps` can't write a function that takes one.
	type CoverageGap,
	type CoverageOutcome,
	// The presentation formatters are public so a SECOND rendered surface (the figures) prints the
	// same strings as the Markdown. Two renderers with two copies of `toPrecision(4)` is exactly how
	// a table and a figure come to disagree about the same run.
	type FigureRef,
	formatInterval,
	formatValue,
	type Leaderboard,
	type LeaderboardDimension,
	type LeaderboardMetric,
	type LeaderboardRow,
	metricTakeaway,
	type ProviderRosterEntry,
	type RenderLeaderboardOptions,
	renderLeaderboardMarkdown,
	rowNote,
} from "./lib/leaderboard.ts";
export { type NormalizeInput, normalizeResultsTree } from "./lib/normalize-tree.ts";
export {
	type CompareRunsOptions,
	compareRuns,
	DEFAULT_THRESHOLD,
	describeShift,
	type MetricShift,
	regressions,
} from "./lib/stability.ts";
export {
	summarizeRun,
	updateRunIndex,
	type WriteNormalizedRunInput,
	writeNormalizedRun,
	writeRunDocument,
} from "./lib/write-run.ts";
