// Public surface of @sandbox-benchmarks/results.
// Turns a provider's raw PTS output into the schema's Run model using ONLY @sandbox-benchmarks/schema
// and the XML parser — never a provider SDK (enforced by the package boundary).
//
// The PTS parser, per-file extraction, observed-spec reading, and Run writer all live under ./lib and
// are implementation detail. This surface exposes only the entry points consumers (the CLI) need:
// normalize a raw tree, write the Run, and summarize it.
export { aggregateRuns } from "./lib/aggregate.ts";
export { type NormalizeInput, normalizeResultsTree } from "./lib/normalize-tree.ts";
export {
	summarizeRun,
	updateRunIndex,
	type WriteNormalizedRunInput,
	writeNormalizedRun,
	writeRunDocument,
} from "./lib/write-run.ts";
