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
	// The rendered document's provenance and layout contract. Exported because the artifact gate
	// (tooling/repo-checks) re-derives the committed LEADERBOARD.md from these rather than hardcoding a
	// second copy of the dataset path, the dimension order, or which dimensions collapse.
	DATASET_RUNS_DIR,
	LEADERBOARD_DIMENSION_ORDER,
	type Leaderboard,
	type LeaderboardDimension,
	type LeaderboardMetric,
	type LeaderboardRow,
	type ProviderRosterEntry,
	REPO_URL,
	renderLeaderboardMarkdown,
	SYNTHETIC_DIMENSIONS,
} from "./lib/leaderboard.ts";
export { type NormalizeInput, normalizeResultsTree } from "./lib/normalize-tree.ts";
export {
	buildObservedMixtures,
	foldHostMetadata,
	type HostMetadataRecordInput,
	type ObservedMixtureIds,
	observedMixtureIds,
	representativeSpecs,
} from "./lib/observed-mixtures.ts";
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
