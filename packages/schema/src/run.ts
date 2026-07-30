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

/**
 * One replicate sandbox's contribution to a Metric: the raw per-pass Samples that one (provider, suite)
 * replicate produced, tagged with its {@link index}. Present only on a Metric merged from ≥2 replicate
 * shards ({@link MetricResult.replicates}); the pooled `samples`/`aggregates` above stay the ranking
 * value, this is the between-sandbox breakdown the hierarchical-bootstrap inference reads.
 */
export const metricReplicateSchema = type({
	// The replicate sandbox this slice came from (the `--replicate` index the shard was run under).
	index: "number.integer >= 0",
	// This replicate's retained per-pass Samples (>= 1, all finite — enforced by the parent narrow).
	samples: "number[] >= 1",
});
export type MetricReplicate = typeof metricReplicateSchema.infer;

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
	// The per-replicate breakdown, set only when the aggregate merged ≥2 replicate sandboxes for this
	// Metric. `samples` above is the pooled union (the ranking median is unchanged); `replicates` keeps
	// the clusters distinct so render-time inference can resample the between-sandbox level. Absent at
	// R = 1, so a single-replicate Run is byte-identical to the pre-replicate schema.
	"replicates?": metricReplicateSchema.array(),
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
	if (metric.replicates !== undefined) {
		// The replicate structure only exists to hold ≥2 clusters; a lone replicate is just `samples`.
		if (metric.replicates.length < 2) {
			return ctx.mustBe(
				"a MetricResult whose replicates hold at least two sandboxes (or omit them)",
			);
		}
		const indices = new Set<number>();
		const pooled: number[] = [];
		for (const replicate of metric.replicates) {
			if (indices.has(replicate.index)) {
				return ctx.mustBe("a MetricResult whose replicate indices are distinct");
			}
			indices.add(replicate.index);
			if (!replicate.samples.every((s) => Number.isFinite(s))) {
				return ctx.mustBe("a MetricResult whose replicate samples are all finite");
			}
			pooled.push(...replicate.samples);
		}
		// The pooled `samples` must be exactly the union of the replicate slices (as a multiset), so the
		// ranking distribution and the between-sandbox breakdown can never silently disagree.
		if (pooled.length !== metric.samples.length) {
			return ctx.mustBe(
				"a MetricResult whose pooled samples count equals the sum of its replicates",
			);
		}
		const sortedPooled = [...pooled].sort((a, b) => a - b);
		const sortedSamples = [...metric.samples].sort((a, b) => a - b);
		if (!sortedPooled.every((value, i) => value === sortedSamples[i])) {
			return ctx.mustBe(
				"a MetricResult whose pooled samples are the union of its replicate samples",
			);
		}
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

/** One flattened field from a host-metadata source. String values preserve the source value while
 * the path retains its original nested shape (`hardware.Processor`, `data.cpu-smt`, ...). */
export const hostMetadataFieldSchema = type({
	path: "string >= 1",
	value: "string",
});
export type HostMetadataField = typeof hostMetadataFieldSchema.infer;

/**
 * One rich host record retained from an in-sandbox producer. `mise/system-provider` is the repo's
 * ASN/geo/DMI probe; `phoronix/result-file-to-json` is PTS's native structured System export. The
 * generic flattened field list deliberately preserves new upstream keys without a Run schema bump.
 */
export const hostMetadataRecordSchema = type({
	source: "'mise/system-provider' | 'phoronix/result-file-to-json'",
	sourceFile: "string >= 1",
	fields: hostMetadataFieldSchema.array(),
});
export type HostMetadataRecord = typeof hostMetadataRecordSchema.infer;

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
	// A coarse, best-effort classification of the isolation boundary the in-sandbox probe could
	// actually see — "gvisor" (kernel marker), "container" (a cgroup-limited quota under a much larger
	// disclosed host), "vm" (a self-sized machine), or "unknown". Deliberately NOT authoritative:
	// systemd-detect-virt cannot separate a container from a microVM (both read "kvm") or gVisor from a
	// microVM (both read "unknown"), so the declared per-provider isolation stays the source of truth
	// and this is only a cross-check the leaderboard flags when the two disagree.
	"detectedIsolation?": "string",
	"user?": "string",
	// The distinct host CPU models when merged shards of one provider disclosed more than one — the
	// aggregate-only heterogeneity disclosure (cpuModel is the key; cpuMicroarch is derived from it).
	"hostCpuModels?": "string[]",
	// Rich identity from benchmark:system:provider. ASN/org describe public egress; DMI describes the
	// machine/hypervisor. Full source records also live in ProviderRun.hostMetadata.
	"publicIp?": "string",
	"egressOrg?": "string",
	"egressAsn?": "string",
	"egressOrgName?": "string",
	"reverseDns?": "string",
	"city?": "string",
	"region?": "string",
	"country?": "string",
	"location?": "string",
	"timezone?": "string",
	"manufacturer?": "string",
	"productName?": "string",
	"biosVendor?": "string",
	"networkPrefix?": "string",
	"asnSource?": "string",
	"geoSource?": "string",
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
 * WHY a benchmark produced no result, as data rather than prose.
 *
 * `reason` beside this is a human sentence, and for a long time it was also the machine interface:
 * the leaderboard decided whether a skip was a disk shortfall with `/^insufficient disk/i` against a
 * string authored in another package, a coupling its own comment had to warn about. Every question
 * past that regex — how many GiB short, which step timed out and after how long, which declared
 * metrics never recorded — was answerable only by re-parsing English that no test pinned.
 *
 * The taxonomy is closed and there is deliberately NO catch-all arm. A producer that cannot classify
 * a gap omits `cause` entirely, which reads as "unclassified" and cannot be mistaken for a diagnosis;
 * an `other` kind would let genuinely different failures accumulate behind one label that consumers
 * would then have to re-parse `reason` to tell apart, reintroducing exactly what this replaces.
 */
export const gapCauseSchema = type({
	// A precondition refused the suite: the sandbox had less free disk than `Suite.minDiskGb`.
	kind: "'disk-shortfall'",
	freeGb: "number >= 0",
	requiredGb: "number > 0",
})
	// The provider's credentials were not present in the environment, so nothing was attempted.
	.or({ kind: "'missing-credentials'", variables: "string[] >= 1" })
	// `sandbox.create` never returned a usable sandbox (quota, region, provider-side error).
	.or({ kind: "'sandbox-create-failed'", "detail?": "string" })
	// The sandbox stopped answering mid-step — distinct from a step that ran and failed.
	.or({
		kind: "'sandbox-lost'",
		step: "string >= 1",
		"consecutivePollFailures?": "number.integer >= 1",
	})
	// A step exceeded its own budget. `timeoutSeconds` is the budget, not the elapsed time.
	.or({ kind: "'step-timeout'", step: "string >= 1", timeoutSeconds: "number > 0" })
	// A step ran to completion and exited non-zero.
	.or({ kind: "'step-failed'", step: "string >= 1", "exitCode?": "number.integer" })
	// The suite ran, but these declared metrics never recorded a value on any trial.
	.or({ kind: "'metrics-unrecorded'", metricIds: "string[] >= 1", declared: "number.integer >= 1" })
	// PTS's duplicate-value dedup dropped a result whose value collided with its twin's.
	.or({ kind: "'duplicate-value-dedup'", metricIds: "string[] >= 1" })
	// A lifecycle operation the provider's SDK does not expose (`scope: "operation"` skips).
	.or({ kind: "'unsupported-operation'", "detail?": "string" })
	// The run was configured not to measure this — a choice we made, never a provider limitation. Kept
	// distinct from `unsupported-operation` precisely because collapsing them would let a config toggle
	// read as a capability the provider lacks.
	.or({ kind: "'measurement-disabled'", "detail?": "string" })
	.narrow((cause, ctx) => {
		// The arms carry numbers whose MEANING constrains them beyond their type, and a structured
		// diagnosis that contradicts itself is worse than an absent one: a consumer trusts this field
		// precisely because it stopped re-reading prose. Both invariants already hold at every producer
		// (the disk precondition only fires below the threshold, and a step is only "failed" on a
		// non-zero exit), so this pins them at the boundary for hand-edited and future producers.
		if (cause.kind === "disk-shortfall" && cause.freeGb >= cause.requiredGb) {
			return ctx.mustBe("a disk shortfall whose freeGb is below requiredGb");
		}
		if (cause.kind === "step-failed" && cause.exitCode === 0) {
			return ctx.mustBe("a failed step whose exitCode is non-zero");
		}
		return true;
	});
export type GapCause = typeof gapCauseSchema.infer;

/**
 * The causes that describe a PRECONDITION refusing a benchmark, as opposed to one that was attempted and
 * broke — the {@link GapOutcome} partition of {@link gapCauseSchema}, stated next to the taxonomy it
 * partitions rather than buried in the narrow that enforces it (and allocated once, not per parsed gap).
 */
const SKIP_CAUSE_KINDS: ReadonlySet<GapCause["kind"]> = new Set<GapCause["kind"]>([
	"disk-shortfall",
	"missing-credentials",
	"unsupported-operation",
	"measurement-disabled",
]);

/**
 * Which {@link GapOutcome} a cause belongs to — the partition above, exposed so a producer can CHECK the
 * pairing before building a gap instead of discovering it as a parse failure. `resultGapSchema` is the
 * enforcement; this is how a caller stays on the right side of it (see `parseGapMarker`).
 */
export function gapOutcomeOfCause(cause: GapCause): GapOutcome {
	return SKIP_CAUSE_KINDS.has(cause.kind) ? "skipped" : "failed";
}

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
	/**
	 * The producer's human explanation. Still authored, still the thing a reader reads — but no longer
	 * the machine interface: consumers branch on {@link ResultGap.cause}, and this is free to be prose.
	 */
	reason: "string",
	/**
	 * The same failure as structured data (v4+). Absent means the producer did not classify it — an
	 * older Run, or a failure mode the taxonomy has no arm for. Never infer a cause by parsing `reason`
	 * when this is absent: guessing produces a confident label for an unclassified event.
	 */
	"cause?": gapCauseSchema,
}).narrow((gap, ctx) => {
	// A skip and a failure are different facts (see gapOutcomeSchema), and so are their causes. Pinning
	// the pairing here stops a producer from recording a crash as a skip — or a precondition as a
	// failure — via the cause while the outcome says otherwise, which would make the two disagree
	// inside one gap and leave a consumer to pick a side.
	if (gap.cause === undefined) return true;
	const causeOutcome = gapOutcomeOfCause(gap.cause);
	if (causeOutcome !== gap.outcome) {
		return ctx.mustBe(
			`a ${gap.outcome} gap whose cause describes one (got "${gap.cause.kind}", a ${causeOutcome} cause)`,
		);
	}
	// `unsupported-operation` names a call the provider's SDK does not expose, which is a statement
	// about ONE lifecycle operation — the scope its own doc gives it. On a suite it would read as
	// "this provider cannot run this benchmark at all", a much larger claim than the producer made.
	// Only this arm is pinned: `measurement-disabled` is a choice we make and could legitimately turn
	// off a whole suite one day, so coupling it to a scope would be inventing a rule, not recording one.
	if (gap.cause.kind === "unsupported-operation" && gap.scope !== "operation") {
		return ctx.mustBe('an operation-scoped gap when its cause is "unsupported-operation"');
	}
	return true;
});
export type ResultGap = typeof resultGapSchema.infer;

/**
 * One provider's slice of a Run: its catalogued Metrics, observed specs, coverage gaps and stragglers.
 * The `.narrow`s enforce two cross-field invariants: a `validated` ProviderRun must carry at least
 * one Metric (see {@link validationStatusSchema}), so `{ validationStatus: "validated", metrics: [] }`
 * is rejected at the boundary rather than reaching a consumer that branches on it; and a defined
 * `specMatched` requires a non-empty `observedSpecs` — the verdict is computed FROM observations, so
 * a row carrying one without any is a hand-authored contradiction that would otherwise render both as
 * "not present in this run" ({@link providerReportedNothing}) and under a comparability warning about
 * measured ranks it doesn't have.
 */
export const providerRunSchema = type({
	providerId: "string",
	validationStatus: validationStatusSchema,
	// Whether observed specs honored the pinned target spec; absent when probes saw too little to judge.
	"specMatched?": "boolean",
	observedSpecs: observedSpecsSchema,
	/** Rich, source-attributed host records; optional for historical Runs predating capture. */
	"hostMetadata?": hostMetadataRecordSchema.array(),
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
})
	.narrow(
		(run, ctx) =>
			run.validationStatus !== "validated" ||
			run.metrics.length > 0 ||
			ctx.mustBe('a ProviderRun with at least one metric when validationStatus is "validated"'),
	)
	.narrow(
		(run, ctx) =>
			run.specMatched === undefined ||
			Object.keys(run.observedSpecs).length > 0 ||
			ctx.mustBe("a ProviderRun with observedSpecs when specMatched carries a verdict"),
	);
export type ProviderRun = typeof providerRunSchema.infer;

/**
 * True when a ProviderRun carries NO evidence of participation at all: no metric, no coverage, no
 * gap, no uncatalogued straggler, no observed-spec reading, no host-metadata record. This is exactly
 * the shape the normalizer emits for an absent raw directory — a registered provider the run never
 * dispatched (or whose every cell was lost before reporting anything). It is deliberately stricter
 * than "no metrics": a straggler, a spec probe, or a host record IS participation evidence, and a
 * provider that reported any of them belongs in the coverage derivation, not in the absent list.
 * Consumers (the leaderboard's coverage derivation, the CLI status logs) use it to keep the pending
 * dataset row first-class while not accusing a never-dispatched provider of per-suite holes.
 * `specMatched` needs no clause of its own: the schema narrow rejects a verdict without
 * observations, and observations already count via `observedSpecs`.
 */
export function providerReportedNothing(p: ProviderRun): boolean {
	return (
		p.metrics.length === 0 &&
		p.suitesCovered.length === 0 &&
		p.gaps.length === 0 &&
		p.uncatalogued.length === 0 &&
		Object.keys(p.observedSpecs).length === 0 &&
		(p.hostMetadata?.length ?? 0) === 0
	);
}

/**
 * Display status for a ProviderRun row: the validation status, tagged "(no shard data)" when the
 * row is a zero-evidence registry placeholder — so a never-dispatched provider stops printing
 * indistinguishably from a freshly-attempted shard that also reads `pending metrics=0`. Shared by
 * every human-facing status line (CI job summaries, `summarizeRun`) so the two views can't drift.
 */
export function providerStatusText(p: ProviderRun): string {
	return providerReportedNothing(p) ? `${p.validationStatus} (no shard data)` : p.validationStatus;
}

/**
 * A full benchmark Run: every provider measured against one pinned target spec at one SHA.
 *
 * `schemaVersion` accepts `"2"` through `"4"`. v1's `skips: { suite, reason }[]` could not say
 * whether a benchmark was deliberately not run or had crashed, and carried no positive record of what
 * DID run — so a suite that vanished (job died, artifact never uploaded) left no trace anywhere in the
 * document. v2 replaced it with {@link resultGapSchema} + {@link ProviderRun.suitesCovered}. v3 adds
 * the replicate model: a shard Run carries its {@link replicateIndex}, and the aggregate folds ≥2
 * replicate sandboxes of one (provider, suite) into {@link MetricResult.replicates}.
 *
 * v4 makes the document SELF-DESCRIBING — every fact a reader needs is expressible from the file,
 * rather than recoverable only by knowing something the file does not say. The first of those facts:
 *
 *  - {@link ResultGap.cause} classifies a failure as data rather than prose.
 *
 * Every version validates here — already-published Runs are read unchanged, and the parser never
 * migrates them in place.
 */
export const runSchema = type({
	schemaVersion: "'2' | '3' | '4'",
	runId: "string",
	sha: "string",
	// ISO-8601 timestamp the Run was generated at — validated so the RunIndex sort key can't be a
	// free-form string ("tomorrow") that silently breaks newest-first ordering.
	generatedAt: "string.date.iso",
	"sourceRunUrl?": "string",
	// The replicate sandbox index a SHARD Run was measured under (the `--replicate` argument). Present on
	// a per-replicate shard; the aggregate reads it to key {@link MetricResult.replicates} and drops it
	// from the merged Run (which spans every replicate). Absent on legacy shards and aggregated Runs.
	"replicateIndex?": "number.integer >= 0",
	targetSpec: targetSpecSchema,
	providers: providerRunSchema.array(),
}).narrow((run, ctx) => {
	// Version floors are compared NUMERICALLY, not by equality: a field introduced at v3 stays legal at
	// v4 and beyond, so "=== '3'" would have made every version bump retroactively reject the previous
	// version's own fields (the v4 aggregate below carries folded `replicates`).
	const version = Number(run.schemaVersion);
	// The replicate fields (`replicateIndex`, `MetricResult.replicates`) are v3-or-later, so "v2 == the
	// pre-replicate schema" stays a real guarantee: a producer that writes a replicate field but forgets
	// to bump schemaVersion is rejected here rather than silently read by a v3-gated consumer that then
	// ignores the between-sandbox breakdown (reporting the anti-conservative pooled interval instead).
	if (version < 3) {
		if (run.replicateIndex !== undefined) {
			return ctx.mustBe("a v3-or-later Run when it carries a replicateIndex");
		}
		if (
			run.providers.some((provider) => provider.metrics.some((m) => m.replicates !== undefined))
		) {
			return ctx.mustBe("a v3-or-later Run when a MetricResult carries replicates");
		}
	}
	// The v4 self-description fields. A pre-v4 consumer handed one would fall back to the pre-v4 reading
	// of the same fact — here, re-parsing `reason` prose for a classification the document already
	// carries — which is a quietly wrong answer, never a loud one. Reported by FIELD rather than as one
	// blanket message, so the error names what to fix.
	if (version < 4) {
		for (const provider of run.providers) {
			if (provider.gaps.some((gap) => gap.cause !== undefined)) {
				return ctx.mustBe("a v4-or-later Run when a ResultGap carries a structured cause");
			}
		}
	}
	// `replicateIndex` marks a per-replicate SHARD (one sandbox, not yet folded); `MetricResult.replicates`
	// marks the AGGREGATE (the fold across shards, which drops `replicateIndex`). A Run carrying both is
	// neither — reject it here rather than leave a consumer to guess which level it is looking at.
	if (
		run.replicateIndex !== undefined &&
		run.providers.some((provider) => provider.metrics.some((m) => m.replicates !== undefined))
	) {
		return ctx.mustBe(
			"either a replicate shard (replicateIndex, no folded replicates) or an aggregate (folded replicates, no replicateIndex), never both",
		);
	}
	return true;
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
