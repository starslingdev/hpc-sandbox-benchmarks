/**
 * The local-run vocabulary: who a bare-metal Run is attributed to, and what a local invocation is
 * once it has been parsed.
 *
 * Local runs measure the machine the CLI is invoked on — no provider, no control plane, no
 * credentials. That leaves one modelling question: `ProviderRun.providerId` is the only field naming
 * the thing a measurement belongs to, and the canonical {@link ProviderId} vocabulary is a closed
 * union joined against a ComputeSDK adapter. Registering `local` there would force a compute adapter
 * that cannot exist and would stamp a permanently-`pending` row into every CI Run.
 *
 * So the Run document's `providerId` stays a plain string (it always was — see `providerRunSchema`)
 * and the PRODUCER side is constrained here instead: {@link benchmarkLabelSchema} is the one
 * vocabulary a harness run may be attributed to, either a registered provider or a local label. The
 * cost-evidence cell keeps requiring the closed {@link ProviderId}, which is what stops a local label
 * from ever reaching a billing record.
 *
 * Parse, don't validate (ADR-0001): {@link localRunRequestSchema} is the single edge the CLI's argv
 * crosses. Everything downstream takes {@link LocalRunRequest}, inferred from that schema, so there
 * is no hand-written mirror of the CLI's own arguments to drift.
 */
import { type } from "arktype";
import { providerIdSchema, runIdSchema } from "./identifiers.ts";
import { suiteNameSchema } from "./suites.ts";

/**
 * A local runner's label — the non-provider half of the attribution vocabulary.
 *
 * Constrained rather than free-form because the label is not only displayed: it becomes a raw-tree
 * DIRECTORY (`data/raw/<runId>/<label>/<suite>/`) and part of a marker FILENAME
 * (`sandbox-<label>-<suite>--failed.json`, see `./raw-files.ts`). An unvalidated label is therefore a
 * path-traversal seam and a way to forge another provider's marker, so the pattern admits neither `/`
 * nor `.` nor uppercase. The `local` prefix is mandatory so a label can never collide with a
 * {@link ProviderId}, present or future — which is what lets the two be unioned below without the
 * union ever being ambiguous about which side matched.
 */
export const localLabelSchema = type("string").matching("^local(-[a-z0-9][a-z0-9-]{0,30})?$");
export type LocalLabel = typeof localLabelSchema.infer;

/**
 * Who a harness run is attributed to: a registered provider, or a local runner.
 *
 * One vocabulary so the harness can TYPE its `providerName` instead of widening it to `string` the
 * moment bare-metal runs exist. Widening would have silently admitted any string into the marker
 * filenames and the raw-tree path; this admits exactly two shapes, both checked.
 */
export const benchmarkLabelSchema = providerIdSchema.or(localLabelSchema);
export type BenchmarkLabel = typeof benchmarkLabelSchema.infer;

/** The default label, used when `--as` is absent. */
export const DEFAULT_LOCAL_LABEL = "local" satisfies LocalLabel;

/**
 * A fully-resolved local invocation — the CLI's argv after defaults are applied, before anything runs.
 *
 * The argv parser's job is to produce this OBJECT; this schema's job is to be the only thing that
 * turns it into a value. An unknown suite, a malformed label, a duplicate replicate index or an
 * unusable runId is therefore one rejection with one error shape, raised before a single benchmark
 * process is spawned — rather than a scatter of hand-rolled checks that each decide their own
 * failure mode.
 */
export const localRunRequestSchema = type({
	runId: runIdSchema,
	/**
	 * A LOCAL label specifically, not the wider {@link benchmarkLabelSchema} the harness accepts.
	 *
	 * Naming a registered provider here would parse — the Run's `providerId` is a plain string — and
	 * would then make `getProvider` HIT during normalization, so `deriveEconomics` would attribute that
	 * vendor's published $/hr to timings taken on a laptop. The narrower type is what makes that
	 * unexpressible rather than merely discouraged.
	 */
	label: localLabelSchema,
	/** Suites to run, in the order given. */
	suites: suiteNameSchema.array().atLeastLength(1),
	/**
	 * Repeat indices, one shard each. `[0]` is the single-shard default. These are the same indices
	 * the CI fan-out calls replicates, and they key `MetricResult.replicates` identically — but on one
	 * machine they are repeats over TIME, not independent sandboxes, so they capture run-to-run noise
	 * and never between-machine variance.
	 */
	replicates: type("number.integer >= 0").array().atLeastLength(1),
	/** The checkout the mise tasks run in. */
	repoRoot: "string >= 1",
	/** Stamped onto the Run; the local driver reads it from `git rev-parse HEAD`. */
	sha: "string >= 1",
	/** Write the Run document here instead of stdout. */
	"outFile?": "string >= 1",
	/** Publish into this dataset root. Absent means do not publish. */
	"datasetDir?": "string >= 1",
	/** Record an unmet precondition or a failed suite as a gap and carry on to the next one. */
	keepGoing: "boolean",
})
	.onUndeclaredKey("reject")
	.narrow((request, ctx) => {
		// Both lists key something downstream — a suite names a raw subdirectory, an index names a shard
		// file — so a duplicate is not a harmless repeat: the second pass would overwrite the first's
		// results and the Run would claim more evidence than it has.
		if (new Set(request.suites).size !== request.suites.length) {
			return ctx.mustBe("a request whose suites are distinct");
		}
		if (new Set(request.replicates).size !== request.replicates.length) {
			return ctx.mustBe("a request whose replicate indices are distinct");
		}
		return true;
	});
export type LocalRunRequest = typeof localRunRequestSchema.infer;

/** Validate an unknown value as a {@link LocalRunRequest}, throwing with arktype's own summary. */
export function parseLocalRunRequest(value: unknown): LocalRunRequest {
	const out = localRunRequestSchema(value);
	if (out instanceof type.errors) {
		throw new Error(`invalid local run request: ${out.summary}`);
	}
	return out;
}
