/**
 * The typed schema for a PTS `composite.xml`. The XML parser (./pts.ts) is kept "dumb" — it emits
 * raw, entity-decoded string text and natively forces the repeatable `<Result>`/`<Entry>` nodes to
 * arrays (its `alwaysArray` option) — so this schema is the single source of truth for coercion: it
 * parses `<Value>` to a number, and its elements validate directly without any array-shape morph.
 */
import { directionSchema } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/**
 * The colon-joined per-pass samples (`<RawString>`, e.g. "16.19:16.3:16.08") parsed to a validated
 * `number[]` AT THE SCHEMA EDGE. Parsing here (not in ./pts.ts) is the load-bearing choice: a
 * genuinely malformed token makes `parsePtsComposite` throw rather than silently disappearing from a
 * hand-rolled `.filter()` downstream — so "samples contain a non-number" is unrepresentable past this
 * boundary. Empty/trailing tokens are tolerated explicitly (an absent RawString splits to `[""]`);
 * zero is kept (a benchmark can legitimately measure 0), only non-finite and negative are rejected.
 */
const sampleList = type("string").pipe((raw, ctx) => {
	const out: number[] = [];
	for (const token of raw.split(":")) {
		if (token.trim() === "") continue;
		const n = Number(token);
		if (!Number.isFinite(n) || n < 0) {
			return ctx.error(`a colon-joined list of non-negative numbers (got "${token}")`);
		}
		out.push(n);
	}
	return out;
});

// PTS writes the value as text; the schema is where it becomes a number (the parser stays dumb). When
// every pass of a `<Result>` fails (a real command erroring — expected for realworld CI tasks, not
// just synthetic PTS microbenchmarks), PTS still emits the `<Result>` but with an empty `<Value>`
// rather than omitting it. Treated as "no measurement" (undefined), not a parse failure, so one failed
// option can't throw away every other `<Result>` in the same composite.xml.
const entryValue = type("string").pipe((raw, ctx) => {
	if (raw.trim() === "") return undefined;
	const parsed = type("string.numeric.parse")(raw);
	if (parsed instanceof type.errors) return ctx.error("a well-formed numeric string");
	return parsed;
});

/** One `<Entry>`: a single measured value plus the per-pass samples that produced it. */
const ptsEntry = type({
	"Identifier?": "string",
	Value: entryValue,
	// Per-pass samples, parsed string → validated number[] here (see {@link sampleList}).
	"RawString?": sampleList,
});

/** One `<Result>`: a single test profile's measurement (each Result maps to exactly one Metric). */
const ptsResult = type({
	Identifier: "string",
	Title: "string",
	"AppVersion?": "string",
	"Arguments?": "string",
	// Sub-result label; disambiguates multi-result tests when mapping onto the Catalog.
	"Description?": "string",
	Scale: "string",
	Proportion: directionSchema,
	Data: { Entry: ptsEntry.array() },
});

/** Provenance from the `<Generated>` header — which PTS client wrote the file, and when. */
const ptsGenerated = type({
	"Title?": "string",
	"LastModified?": "string",
	"TestClient?": "string",
});

/**
 * The host fingerprint PTS embeds in `<System>`: free-text Hardware/Software description strings plus
 * the run user. Inside a container these disclose the HOST machine (e.g. a 48-thread EPYC), never the
 * sandbox's effective cgroup quota — so the reader (./system-specs.ts) maps them ONLY to the host side
 * of ObservedSpecs (`hostVcpus`/`hostMemoryGb`/…), never the effective `vcpus`/`memoryGb`. Optional:
 * PTS writes `<System>` into composite.xml, but older/partial trees may omit it.
 */
const ptsSystem = type({
	"Identifier?": "string",
	"Hardware?": "string",
	"Software?": "string",
	"User?": "string",
});

/** A full `composite.xml`: the generator header, the host `<System>` fingerprint, and the results. */
export const ptsCompositeSchema = type({
	PhoronixTestSuite: {
		"Generated?": ptsGenerated,
		"System?": ptsSystem,
		Result: ptsResult.array(),
	},
});

/** A validated PTS composite document (post-coercion: numeric values, arrays of results/entries). */
export type PtsComposite = typeof ptsCompositeSchema.infer;
/** A single typed `<Result>` from a parsed composite. */
export type PtsResult = typeof ptsResult.infer;
/** A single typed `<Entry>` from a parsed result. */
export type PtsEntry = typeof ptsEntry.infer;
/** The typed `<System>` host fingerprint from a parsed composite. */
export type PtsSystem = typeof ptsSystem.infer;
