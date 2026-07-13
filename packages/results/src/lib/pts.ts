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
 * `[]` when the option's every pass failed (`Value` undefined, pts-schema.ts) — no measurement, not
 * an error.
 */
export function resultSamples(result: PtsResult): number[] {
	const entry = result.Data.Entry[0];
	if (!entry || entry.Value === undefined) return [];
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

// Index the catalog by match precedence once at module load. `ptsResultToMetric` runs per `<Result>`
// — the golden gate alone calls it across every result of every recorded composite — and a per-call
// linear scan is O(results × per-test entries), which stopped being hypothetical when fio put 960
// entries under one test key. Three maps, one per precedence arm, make each lookup O(1); on a key
// collision the FIRST catalog entry wins, preserving catalog-order semantics (the catalogSchema
// invariants make a collision impossible for pts-generated entries anyway).
const byTestDescriptionScale = new Map<string, MetricDef>();
const byTestDescription = new Map<string, MetricDef>();
const byTestWildcard = new Map<string, MetricDef>();
for (const metric of METRIC_CATALOG) {
	if (!metric.pts) continue;
	const { test, description, scale } = metric.pts;
	if (description === undefined) {
		if (!byTestWildcard.has(test)) byTestWildcard.set(test, metric);
	} else if (scale !== undefined) {
		const key = JSON.stringify([test, description, scale]);
		if (!byTestDescriptionScale.has(key)) byTestDescriptionScale.set(key, metric);
	} else {
		const key = JSON.stringify([test, description]);
		if (!byTestDescription.has(key)) byTestDescription.set(key, metric);
	}
}

/**
 * Map a parsed Result onto the Metric Catalog by its versionless test (and `<Description>` for
 * multi-result tests, plus `<Scale>` where the catalog pins one).
 */
export function ptsResultToMetric(result: PtsResult): PtsMapping {
	const test = versionlessTest(result.Identifier);
	const description = result.Description ?? "";
	// Prefer an exact `<Description>` match over the wildcard (description-less) entry, so a
	// multi-result test's catalog ordering can't make the wildcard greedily shadow a specific metric.
	// The catalog invariant (`catalogSchema` .narrow, catalog.ts) guarantees a wildcard never coexists
	// with description-bearing entries for the same test, so the fallback can't misattribute a
	// non-matching `<Description>`: if a wildcard matched, it is that test's only entry.
	//
	// Scale-pinned entries (fio: one run posts bandwidth AND IOPS `<Result>`s under one description)
	// additionally require `<Scale>` to byte-match their pin. The same invariant guarantees a pinned
	// description never coexists with an unpinned twin, so the description-only arm below can't steal
	// a result that belongs to a pinned entry — and a pinned description whose `<Scale>` matches no
	// pin falls through to `uncatalogued` (an honest straggler) rather than the nearest twin.
	const def =
		byTestDescriptionScale.get(JSON.stringify([test, description, result.Scale])) ??
		byTestDescription.get(JSON.stringify([test, description])) ??
		byTestWildcard.get(test);
	return def
		? { kind: "matched", def, samples: resultSamples(result) }
		: { kind: "uncatalogued", test, description };
}
