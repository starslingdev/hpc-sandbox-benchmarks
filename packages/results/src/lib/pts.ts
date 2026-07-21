/**
 * Parse a PTS `composite.xml` into the typed {@link PtsComposite}, and map its results onto the
 * Metric Catalog. The parser is configured to emit raw, entity-decoded string text so the schema's
 * morphs (./pts-schema.ts) do every coercion deterministically — no heuristic number/boolean parsing
 * that could turn a version-like identifier into a number.
 */
import { CompactBuilderFactory } from "@nodable/compact-builder";
import XMLParser, { type X2jOptions } from "@nodable/flexible-xml-parser";
import type { MetricDef } from "@sandbox-benchmarks/schema";
import { METRIC_CATALOG, ptsKey } from "@sandbox-benchmarks/schema";
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
 * silently dropped here. The harness normally writes one `<Entry>`, but PTS may preserve an empty
 * entry before a later measured one; use the first entry that actually carries a value so that shape
 * is not misclassified as an all-passes failure. `[]` when every entry is empty (`Value` undefined,
 * pts-schema.ts) — no measurement, not an error.
 */
export function resultSamples(result: PtsResult): number[] {
	const entry = result.Data.Entry.find((candidate) => candidate.Value !== undefined);
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
	| { kind: "uncatalogued"; test: string; description: string; scale: string };

/**
 * Index a catalog by match precedence and return the per-`<Result>` matcher over it.
 *
 * A factory, not three module-scope maps: the singleton below is one instance, but the scale-pinned
 * arm and the build/lookup key-shape agreement are otherwise unexercisable until real pins land in
 * the generated catalog — the exact drift a routing bug would hide behind. Tests build crafted
 * catalogs through the same seam `catalogSchema` already offers.
 *
 * Indexing once matters: the matcher runs per `<Result>` — the golden gate alone calls it across
 * every result of every recorded composite — and a per-call linear scan is O(results × per-test
 * entries), which stopped being hypothetical when fio put 960 entries under one test key. Three
 * maps, one per precedence arm, make each lookup O(1). The catalogSchema invariants (catalog.ts)
 * make a key collision unconstructable; a collision here means those invariants regressed, so it
 * throws at build — matching every other catalog-integrity breach (duplicate ids, duplicate
 * headlines) — rather than silently letting first-wins route every result for the shadowed metric
 * onto the wrong entry.
 */
export function buildPtsIndex(catalog: readonly MetricDef[]): (result: PtsResult) => PtsMapping {
	const byTestDescriptionScale = new Map<string, MetricDef>();
	const byTestDescription = new Map<string, MetricDef>();
	const byTestWildcard = new Map<string, MetricDef>();
	const indexInto = (map: Map<string, MetricDef>, key: string, metric: MetricDef): void => {
		const existing = map.get(key);
		if (existing) {
			throw new Error(
				`catalog integrity: "${metric.id}" and "${existing.id}" collide on PTS match key ${key} — the catalogSchema invariants should have rejected this at load`,
			);
		}
		map.set(key, metric);
	};
	for (const metric of catalog) {
		if (!metric.pts) continue;
		const { test, description, scale } = metric.pts;
		if (description === undefined) {
			indexInto(byTestWildcard, ptsKey(test), metric);
		} else if (scale !== undefined) {
			indexInto(byTestDescriptionScale, ptsKey(test, description, scale), metric);
		} else {
			indexInto(byTestDescription, ptsKey(test, description), metric);
		}
	}

	return (result: PtsResult): PtsMapping => {
		const test = versionlessTest(result.Identifier);
		const description = result.Description ?? "";
		// Prefer an exact `<Description>` match over the wildcard (description-less) entry, so a
		// multi-result test's catalog ordering can't make the wildcard greedily shadow a specific
		// metric. The catalog invariant (`catalogSchema` .narrow, catalog.ts) guarantees a wildcard
		// never coexists with description-bearing entries for the same test, so the fallback can't
		// misattribute a non-matching `<Description>`: if a wildcard matched, it is that test's only
		// entry.
		//
		// Scale-pinned entries (fio: one run posts bandwidth AND IOPS `<Result>`s under one
		// description) additionally require `<Scale>` to byte-match their pin. The same invariant
		// guarantees a pinned description never coexists with an unpinned twin, so the
		// description-only arm below can't steal a result that belongs to a pinned entry — and a
		// pinned description whose `<Scale>` matches no pin falls through to `uncatalogued` (an
		// honest straggler) rather than the nearest twin.
		const def =
			byTestDescriptionScale.get(ptsKey(test, description, result.Scale)) ??
			byTestDescription.get(ptsKey(test, description)) ??
			byTestWildcard.get(ptsKey(test));
		return def
			? { kind: "matched", def, samples: resultSamples(result) }
			: // `scale` rides along: scale-pinned twins share a description, so (test, description)
				// alone no longer identifies a straggler — two twins whose `<Scale>` matched no pin
				// would collapse onto one id downstream, silently dropping one measurement.
				{ kind: "uncatalogued", test, description, scale: result.Scale };
	};
}

/**
 * Map a parsed Result onto the Metric Catalog by its versionless test (and `<Description>` for
 * multi-result tests, plus `<Scale>` where the catalog pins one).
 */
export const ptsResultToMetric = buildPtsIndex(METRIC_CATALOG);
