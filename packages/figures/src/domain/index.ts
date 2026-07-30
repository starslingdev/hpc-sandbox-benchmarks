/**
 * The figure package's DOMAIN layer: the shape of the derived sandbox-benchmark
 * artifact, the PARSE that admits a document into that shape, and every pure derivation,
 * formatter and label over it.
 *
 * This is the half of the package the site is allowed to see. It exists here rather
 * than in `@/lib` for one reason: a figure and the page must never disagree about a
 * number, a rounding, a "best" marker or a shading threshold, and the only way to
 * guarantee that is for both to call the same function. When these lived in the site,
 * the package imported the site to get them — which is what made the package
 * unbuildable anywhere else. The edge now runs the other way: the SITE imports these.
 *
 * Nothing here reads a dataset from a module. Every function takes the run it is
 * deriving from as an argument, which is what lets the guards run them against
 * synthetic fixtures rather than against whatever the committed run happens to contain.
 *
 * `parseSandboxBenchmarkData` is the one seam where an `unknown` document becomes a
 * `SandboxBenchmarkData`. It lives here rather than in the site because the shape is the
 * package's, and because a cast that nobody checks is exactly the kind of lie the rest of this
 * layer exists to make impossible. It holds no dataset: the site calls it, once, on the
 * artifact it imports.
 *
 * What deliberately does NOT live here:
 *   - the derived artifact itself, and any singleton over it (the site parses it);
 *   - authored prose — findings, methodology, suite notes, the KPI labels (the site
 *     authors it, and passes it in);
 *   - the published composite SPECS (`@/lib/sandbox-composites`) — an editorial record
 *     about one post, not a rule about how any spec resolves;
 *   - Tailwind classes and any other site presentation. `ratioTintStep` is here; the
 *     class it maps to is not.
 */
export {
	type CompositeSpec,
	type ResolvedComposite,
	resolveComposite,
} from "./composites.ts";
export { backfillNoteOf } from "./disclosure.ts";
export {
	type EnvSpecRow,
	egressShardNoteOf,
	envCellFleetMarked,
	envCellShardMarked,
	environmentFlagLookup,
	envSpecRows,
	fleetHeterogeneityNoteOf,
} from "./environments.ts";
export {
	cellStatValue,
	EXPLORER_DEFAULT_METRIC,
	EXPLORER_STATS,
	type ExplorerRankedEntry,
	type ExplorerStat,
	rankMetricForExplorer,
} from "./explorer.ts";
export {
	displayUnit,
	explorerPillLabel,
	formatMetricValue,
	formatRatio,
	formatSeconds,
	formatSpread,
	formatSpreadPct,
	shortRowLabel,
	stripRepoPrefix,
} from "./format.ts";
export { dimensionLabels, phaseLabels } from "./labels.ts";
export {
	bestP50,
	metricRatio,
	metricRowById,
	metricSpread,
	type RatioTintStep,
	ratioTintStep,
	rowRestrictedTo,
} from "./metrics.ts";
export { parseSandboxBenchmarkData } from "./parse.ts";
export { pipelineScaleMaxSOf, providerIndexOf } from "./pipeline.ts";
export {
	cellSpread,
	type ProviderRepeatability,
	repeatabilityOf,
	repeatabilityScaleMaxOf,
	replicateNOf,
} from "./repeatability.ts";
export type {
	BarSegment,
	MetricCell,
	MetricTableRow,
	PipelineBar,
	PipelineSuite,
	SandboxBenchmarkData,
	SandboxProvider,
	SandboxProviderId,
} from "./types.ts";
