/**
 * The canonical result model for the sandbox comparison dataset. These arktype
 * schemas are the producer/consumer contract: the harness validates every Run it emits, and every
 * consumer validates a dataset at its fetch boundary. The measurement model nests Sample → Metric →
 * Run: `MetricResult.samples` holds the retained Samples, `aggregates` their distribution.
 *
 * Schemas compose by embedding one another (arktype accepts a `Type` as a property value), so the
 * TypeScript types stay inferred from the single runtime source — no hand-written interface to drift.
 */
import { type } from "arktype";
import { aggregatesSchema } from "./analysis.ts";
import { directionSchema } from "./metrics.ts";

/** Whether a ProviderRun carries at least one catalogued Metric (validated) or none yet (pending). */
export const validationStatusSchema = type("'validated' | 'pending'");
export type ValidationStatus = typeof validationStatusSchema.infer;

/** One catalogued Metric's result: the retained Samples and their distribution, with provenance. */
export const metricResultSchema = type({
	metricId: "string",
	// At least one retained Sample — a MetricResult with `samples: []` but `aggregates.n > 0` would be
	// internally inconsistent, so reject it at the boundary.
	samples: "number[] >= 1",
	aggregates: aggregatesSchema,
	// Which raw file the Samples came from — provenance for debugging a Run.
	"sourceFile?": "string",
	// Test-profile provenance carried from the PTS `<Result>`: the profile's AppVersion and the exact
	// option Arguments that produced these Samples. Pins each Metric to the version + argument matrix it
	// was measured under, so a profile/option bump can't silently shift numbers across Runs.
	"appVersion?": "string",
	"arguments?": "string",
}).narrow((metric, ctx) => {
	// `aggregate()` already guarantees these at the producer; enforce them at the dataset boundary too,
	// so a hand-edited/corrupt persisted Run can't carry NaN/Infinity samples or a sample count that
	// disagrees with `aggregates.n`.
	if (!metric.samples.every((s) => Number.isFinite(s))) {
		return ctx.mustBe("a MetricResult whose samples are all finite");
	}
	if (metric.aggregates.n !== metric.samples.length) {
		return ctx.mustBe("a MetricResult whose aggregates.n equals samples.length");
	}
	return true;
});
export type MetricResult = typeof metricResultSchema.infer;

/**
 * A parsed result whose id is not in the Metric Catalog — reported for visibility but inert: it
 * never feeds rankings until someone adds a matching Catalog entry.
 */
export const uncataloguedResultSchema = type({
	id: "string",
	value: "number",
	"unit?": "string",
	"direction?": directionSchema,
	sourceFile: "string",
});
export type UncataloguedResult = typeof uncataloguedResultSchema.infer;

/**
 * Observed actuals recorded per Run — what in-sandbox probes actually saw, versus the requested
 * {@link TargetSpec}. All optional: providers differ in what in-sandbox
 * probes can see. `vcpus`/`memoryGb` are the EFFECTIVE Sandbox size (cgroup quota where enforced);
 * `hostVcpus`/`hostMemoryGb` disclose the underlying machine when probes see through the container
 * boundary (e.g. Daytona: a 4-vCPU quota on a 48-thread host). `cpuMicroarch` is a HOST-side
 * generation/microarch label derived from `cpuModel` (e.g. "Zen 5 (Turin)"). `hostCpuModels` is set
 * only by the aggregate path — the distinct host CPU models a provider's shards disclosed, present
 * only when there was more than one (a scheduling confound the published Run names rather than hides).
 */
export const observedSpecsSchema = type({
	"vcpus?": "number",
	"memoryGb?": "number",
	"diskGb?": "number",
	"hostVcpus?": "number",
	"hostMemoryGb?": "number",
	"cpuModel?": "string",
	// Host-side generation/microarch label derived from cpuModel; never reflects the effective spec.
	"cpuMicroarch?": "string",
	"cpuMhz?": "number",
	"kernel?": "string",
	"os?": "string",
	"virtualization?": "string",
	"user?": "string",
	// The distinct host CPU models when merged shards of one provider disclosed more than one — the
	// aggregate-only heterogeneity disclosure (cpuModel is the key; cpuMicroarch is derived from it).
	"hostCpuModels?": "string[]",
});
export type ObservedSpecs = typeof observedSpecsSchema.infer;

/** The pinned size every provider is asked to match; compared against each provider's {@link ObservedSpecs}. */
export const targetSpecSchema = type({
	vcpus: "number > 0",
	memoryGb: "number > 0",
	"diskGb?": "number > 0",
});
export type TargetSpec = typeof targetSpecSchema.infer;

/**
 * What a benchmark that produced no result was: a whole suite, or one harness lifecycle operation.
 * The two are not interchangeable — a missing suite is a workload the provider never ran, a missing
 * operation is a control-plane call that never returned — so the gap names which it is rather than
 * overloading one identifier slot with both.
 */
export const gapScopeSchema = type("'suite' | 'operation'");
export type GapScope = typeof gapScopeSchema.infer;

/**
 * Why a benchmark produced no result. The distinction is the whole point of recording gaps at all:
 *
 *  - `skipped` — DELIBERATELY not run. A precondition said no before anything was attempted (the
 *    sandbox has less free disk than the suite needs; the provider's SDK has no snapshot call). It
 *    says something structural about the provider: it cannot host this workload as configured.
 *  - `failed`  — ATTEMPTED and errored. The suite/operation ran and threw, timed out, or died with
 *    the sandbox. It says something about reliability, and it is a different fact from a skip.
 *
 * Collapsing the two (recording a crash as a "skip") reports an outage as a design decision, so the
 * producer picks the arm at the point it knows which happened, and never widens one into the other.
 */
export const gapOutcomeSchema = type("'skipped' | 'failed'");
export type GapOutcome = typeof gapOutcomeSchema.infer;

/**
 * One benchmark that produced no result for a provider, and why — the recorded half of a coverage
 * gap. The DERIVED half (a suite that ran elsewhere in the Run but never reported here at all, with
 * no marker of any kind) cannot live on a ProviderRun: it is a cross-provider fact, so the
 * leaderboard derives it from {@link ProviderRun.suitesCovered}. See `CoverageGap` in the results
 * package, which unions the two into the surface a reader sees.
 */
export const resultGapSchema = type({
	scope: gapScopeSchema,
	/** The suite name (`scope: "suite"`) or the harness Metric id (`scope: "operation"`). */
	id: "string",
	outcome: gapOutcomeSchema,
	/** The producer's verbatim explanation — a disk shortfall's numbers, or the error's message. */
	reason: "string",
});
export type ResultGap = typeof resultGapSchema.infer;

/**
 * One provider's slice of a Run: its catalogued Metrics, observed specs, coverage gaps and stragglers.
 * The `.narrow` enforces the cross-field invariant documented on {@link validationStatusSchema}: a
 * `validated` ProviderRun must carry at least one Metric, so `{ validationStatus: "validated",
 * metrics: [] }` is rejected at the boundary rather than reaching a consumer that branches on it.
 */
export const providerRunSchema = type({
	providerId: "string",
	validationStatus: validationStatusSchema,
	// Whether observed specs honored the pinned target spec; absent when probes saw too little to judge.
	"specMatched?": "boolean",
	observedSpecs: observedSpecsSchema,
	metrics: metricResultSchema.array(),
	/**
	 * Every suite that produced at least one catalogued Metric here — the POSITIVE record of coverage,
	 * without which a hole is indistinguishable from a suite this Run never ran at all. `metrics` alone
	 * cannot supply it: a Metric knows its Dimension, and two suites can declare one Dimension, so
	 * suite→metric is not invertible. Recorded by the producer, which is the only layer that saw the
	 * raw tree. Sorted, so a re-normalized Run is byte-stable.
	 */
	suitesCovered: "string[]",
	/** Benchmarks that reported no result here, each tagged with WHY (see {@link resultGapSchema}). */
	gaps: resultGapSchema.array(),
	uncatalogued: uncataloguedResultSchema.array(),
}).narrow(
	(run, ctx) =>
		run.validationStatus !== "validated" ||
		run.metrics.length > 0 ||
		ctx.mustBe('a ProviderRun with at least one metric when validationStatus is "validated"'),
);
export type ProviderRun = typeof providerRunSchema.infer;

/**
 * A full benchmark Run: every provider measured against one pinned target spec at one SHA.
 *
 * `schemaVersion` is `"2"`: v1's `skips: { suite, reason }[]` could not say whether a benchmark was
 * deliberately not run or had crashed, and carried no positive record of what DID run — so a suite
 * that vanished (job died, artifact never uploaded) left no trace anywhere in the document. v2
 * replaces it with {@link resultGapSchema} + {@link ProviderRun.suitesCovered}. The committed dataset
 * is migrated in place, not dual-read: one shape, validated at every boundary.
 */
export const runSchema = type({
	schemaVersion: "'2'",
	runId: "string",
	sha: "string",
	// ISO-8601 timestamp the Run was generated at — validated so the RunIndex sort key can't be a
	// free-form string ("tomorrow") that silently breaks newest-first ordering.
	generatedAt: "string.date.iso",
	"sourceRunUrl?": "string",
	targetSpec: targetSpecSchema,
	providers: providerRunSchema.array(),
});
export type Run = typeof runSchema.infer;

/**
 * Index of committed Runs, newest first — the time series the trends view reads. The `.narrow`
 * enforces the newest-first ordering the doc promises (ISO-8601 sorts lexicographically), so a
 * consumer can trust `runs[0]` is the latest without re-sorting.
 */
export const runIndexSchema = type({
	schemaVersion: "'1'",
	runs: type({
		runId: "string",
		// ISO-8601 — the sort key for the newest-first time series, validated like runSchema's.
		generatedAt: "string.date.iso",
		// Path to the Run document, relative to the index file.
		path: "string",
	}).array(),
}).narrow((index, ctx) => {
	for (let i = 1; i < index.runs.length; i++) {
		const prev = index.runs[i - 1];
		const curr = index.runs[i];
		if (prev && curr && prev.generatedAt < curr.generatedAt) {
			return ctx.mustBe("a RunIndex whose runs are ordered newest-first by generatedAt");
		}
	}
	return true;
});
export type RunIndex = typeof runIndexSchema.infer;

/** Validate an unknown value as a {@link Run}. */
export function parseRun(value: unknown): Run {
	const out = runSchema(value);
	if (out instanceof type.errors) {
		throw new Error(`invalid Run: ${out.summary}`);
	}
	return out;
}

/** Validate an unknown value as a {@link RunIndex}. */
export function parseRunIndex(value: unknown): RunIndex {
	const out = runIndexSchema(value);
	if (out instanceof type.errors) {
		throw new Error(`invalid RunIndex: ${out.summary}`);
	}
	return out;
}
