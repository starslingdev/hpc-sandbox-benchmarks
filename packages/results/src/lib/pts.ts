/**
 * Parse a PTS `composite.xml` into the typed {@link PtsComposite}, and map its results onto the
 * Metric Catalog. The parser is configured to emit raw, entity-decoded string text so the schema's
 * morphs (./pts-schema.ts) do every coercion deterministically — no heuristic number/boolean parsing
 * that could turn a version-like identifier into a number.
 */
import { CompactBuilderFactory } from "@nodable/compact-builder";
import XMLParser, { type X2jOptions } from "@nodable/flexible-xml-parser";
import type { MetricDef } from "@sandbox-benchmarks/schema";
import { METRIC_CATALOG } from "@sandbox-benchmarks/schema";
import { type } from "arktype";
import type { PtsComposite, PtsResult } from "./pts-schema.ts";
import { ptsCompositeSchema } from "./pts-schema.ts";

// Entity-decode text but DON'T coerce numbers/booleans — the schema owns coercion (parse-don't-validate)
// — and force the repeatable <Result>/<Entry> nodes to arrays so a single-test run doesn't collapse
// them to objects (the schema then validates a clean array, no morph needed).
// CompactBuilderFactory extends BaseOutputBuilderFactory at runtime, but compact-builder@1.0.9's types
// declare `implements OutputBuilderFactory` and omit `resetValueParsers` — a types-only skew with the
// parser's expected builder interface. The cast bridges it through the parser's own option type.
const outputBuilder = new CompactBuilderFactory({
	tags: { valueParsers: ["entity"] },
	alwaysArray: ["..Result", "..Entry"],
}) as unknown as X2jOptions["OutputBuilder"];
const parser = new XMLParser({ OutputBuilder: outputBuilder });

/** Parse and validate a PTS composite.xml. Throws with an arktype summary on malformed input. */
export function parsePtsComposite(xml: string): PtsComposite {
	const out = ptsCompositeSchema(parser.parse(xml));
	if (out instanceof type.errors) {
		throw new Error(`invalid PTS composite.xml: ${out.summary}`);
	}
	return out;
}

/** Strip a trailing version from a PTS identifier: "pts/node-web-tooling-1.0.1" → "pts/node-web-tooling". */
export function versionlessTest(identifier: string): string {
	return identifier.replace(/-\d+(\.\d+)*$/, "");
}

/**
 * The per-pass samples behind a Result's headline value, falling back to the single reported value
 * when PTS emitted no per-pass samples. `RawString` is already a validated `number[]` (parsed at the
 * schema edge, pts-schema.ts) — a malformed token threw in `parsePtsComposite`, so nothing is
 * silently dropped here. One `<Entry>` per run (the harness writes one), so this reads the first.
 */
export function resultSamples(result: PtsResult): number[] {
	const entry = result.Data.Entry[0];
	if (!entry) return [];
	return entry.RawString && entry.RawString.length > 0 ? entry.RawString : [entry.Value];
}

/**
 * The outcome of mapping a `<Result>` onto the Catalog: either a catalogued Metric (with its samples)
 * or an explicit `uncatalogued` straggler. A discriminated union — not `… | null` — so every caller
 * must handle both arms (an exhaustive `switch` makes a forgotten case a compile error) instead of
 * silently dropping a `null`.
 */
export type PtsMapping =
	| { kind: "matched"; def: MetricDef; samples: number[] }
	| { kind: "uncatalogued"; test: string; description: string };

/**
 * Map a parsed Result onto the Metric Catalog by its versionless test (and `<Description>` for
 * multi-result tests).
 */
export function ptsResultToMetric(result: PtsResult): PtsMapping {
	const test = versionlessTest(result.Identifier);
	const description = result.Description ?? "";
	const forTest = METRIC_CATALOG.filter((metric) => metric.pts?.test === test);
	// Prefer an exact `<Description>` match over the wildcard (description-less) entry, so a
	// multi-result test's catalog ordering can't make the wildcard greedily shadow a specific metric.
	// The catalog invariant (`catalogSchema` .narrow, catalog.ts) guarantees a wildcard never coexists
	// with description-bearing entries for the same test, so the fallback can't misattribute a
	// non-matching `<Description>`: if a wildcard matched, it is that test's only entry.
	const def =
		forTest.find((metric) => metric.pts?.description === description) ??
		forTest.find((metric) => metric.pts?.description === undefined);
	return def
		? { kind: "matched", def, samples: resultSamples(result) }
		: { kind: "uncatalogued", test, description };
}
