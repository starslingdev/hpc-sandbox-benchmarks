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

/** One `<Entry>`: a single measured value plus the per-pass samples that produced it. */
const ptsEntry = type({
	"Identifier?": "string",
	// PTS writes the value as text; the schema is where it becomes a number (the parser stays dumb).
	Value: "string.numeric.parse",
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

/** A full `composite.xml`: the generator header and one-or-more test results. */
export const ptsCompositeSchema = type({
	PhoronixTestSuite: {
		"Generated?": ptsGenerated,
		Result: ptsResult.array(),
	},
});

/** A validated PTS composite document (post-coercion: numeric values, arrays of results/entries). */
export type PtsComposite = typeof ptsCompositeSchema.infer;
/** A single typed `<Result>` from a parsed composite. */
export type PtsResult = typeof ptsResult.infer;
/** A single typed `<Entry>` from a parsed result. */
export type PtsEntry = typeof ptsEntry.infer;
