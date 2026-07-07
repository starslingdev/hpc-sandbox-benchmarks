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

/** A benchmark that was deliberately not run, and why. */
export const skipMarkerSchema = type({
	suite: "string",
	reason: "string",
});
export type SkipMarker = typeof skipMarkerSchema.infer;

/**
 * One provider's slice of a Run: its catalogued Metrics, observed specs, skips and stragglers. The
 * `.narrow` enforces the cross-field invariant documented on {@link validationStatusSchema}: a
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
	skips: skipMarkerSchema.array(),
	uncatalogued: uncataloguedResultSchema.array(),
}).narrow(
	(run, ctx) =>
		run.validationStatus !== "validated" ||
		run.metrics.length > 0 ||
		ctx.mustBe('a ProviderRun with at least one metric when validationStatus is "validated"'),
);
export type ProviderRun = typeof providerRunSchema.infer;

/** A full benchmark Run: every provider measured against one pinned target spec at one SHA. */
export const runSchema = type({
	schemaVersion: "'1'",
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
