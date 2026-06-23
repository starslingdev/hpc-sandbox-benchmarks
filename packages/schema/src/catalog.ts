// The Metric Catalog: the single registry of every Metric the dataset can rank or chart, and the
// stability contract for the comparison dataset — entries change only by deliberate schema revision,
// so historical Runs stay comparable. A parsed result whose id isn't here is inert: it's reported
// separately for visibility, never ranked, until someone adds a matching entry.
//
// This slice populates only the cpu Dimension's single headline Metric (PTS node-web-tooling). The
// per-Dimension assembly seam below is retained so the remaining Metrics slot in without reshaping
// the Catalog or its consumers. As more PTS dimensions land, prefer GENERATING the cpu/pts entries by
// parsing the upstream PTS `test-definition.xml` over hand-authoring multi-result option matrices —
// the `...ptsCpu` seam accepts such a generated module unchanged.
import type { Dimension, MetricDef } from "./metrics.ts";
import { metricDefSchema } from "./metrics.ts";

// The cpu Dimension is PTS-backed; node-web-tooling is its headline (V8 Web Tooling under Node.js).
const ptsCpu: MetricDef[] = [
	{
		id: "node_web_tooling_runs_per_s",
		dimension: "cpu",
		unit: "runs/s",
		direction: "HIB",
		headline: true,
		label: "Node.js web tooling",
		description:
			"Node.js V8 Web Tooling Benchmark (PTS pts/node-web-tooling). Running the V8 project's Web-Tooling-Benchmark under Node.js. The Web-Tooling-Benchmark stresses JavaScript-related workloads common to web developers like Babel and TypeScript and Babylon. This test profile can test the system's JavaScript performance with Node.js.",
		pts: { test: "pts/node-web-tooling" },
		sourceUrl:
			"https://github.com/phoronix-test-suite/phoronix-test-suite/tree/master/ob-cache/test-profiles/pts/node-web-tooling-1.0.1",
	},
];

/**
 * The Catalog schema: every entry's shape PLUS the PTS-mapping invariant the runtime relies on. The
 * `.narrow` makes the dangerous catalog shape UNCONSTRUCTABLE so `ptsResultToMetric`'s wildcard
 * fallback (pts.ts) is safe by construction rather than by reviewer vigilance — for any one PTS test:
 *   1. at most one description-less wildcard entry, and
 *   2. a wildcard never coexists with description-bearing entries.
 * Either would let a result's `<Description>` that matches no specific entry fall to the wildcard and
 * be misattributed; forbidding the shape at load (deterministic, CI-caught) removes that path.
 * Exported so the invariant is unit-testable against crafted catalogs, independent of the singleton.
 */
export const catalogSchema = metricDefSchema.array().narrow((cat, ctx) => {
	const wildcardTests = new Set<string>();
	const describedTests = new Set<string>();
	for (const metric of cat) {
		if (!metric.pts) continue;
		if (metric.pts.description === undefined) {
			if (wildcardTests.has(metric.pts.test)) {
				return ctx.mustBe(
					`at most one description-less wildcard per PTS test ("${metric.pts.test}")`,
				);
			}
			wildcardTests.add(metric.pts.test);
		} else {
			describedTests.add(metric.pts.test);
		}
	}
	for (const test of wildcardTests) {
		if (describedTests.has(test)) {
			return ctx.mustBe(
				`no description-bearing entries alongside the description-less wildcard for "${test}"`,
			);
		}
	}
	return true;
});

/**
 * The full Catalog, validated at load. Dimensions land in display order as their Metrics are ported;
 * the runtime `.assert` turns a malformed entry (bad dimension/direction, missing field) — or a
 * violated PTS-mapping invariant ({@link catalogSchema}) — into a fail-fast at import rather than a
 * silently broken stability contract.
 */
export const METRIC_CATALOG: readonly MetricDef[] = catalogSchema.assert([...ptsCpu]);

const byId = new Map(METRIC_CATALOG.map((metric) => [metric.id, metric]));

// Two Metrics sharing an id would silently collapse in `byId` (and corrupt getMetric); fail fast at
// import — the schema validates each entry's shape but not id-uniqueness across the registry.
if (byId.size !== METRIC_CATALOG.length) {
	throw new Error("METRIC_CATALOG contains duplicate metric ids");
}

/** Look up a Metric by id; undefined for ids not in the Catalog. */
export function getMetric(id: string): MetricDef | undefined {
	return byId.get(id);
}

/** Every Metric belonging to a Dimension, in Catalog order. */
export function metricsForDimension(dimension: Dimension): MetricDef[] {
	return METRIC_CATALOG.filter((metric) => metric.dimension === dimension);
}

/** The first headline Metric of a Dimension — what the leaderboard shows. Throws if none exists. */
export function headlineMetric(dimension: Dimension): MetricDef {
	const headline = METRIC_CATALOG.find(
		(metric) => metric.dimension === dimension && metric.headline,
	);
	if (!headline) throw new Error(`Dimension ${dimension} has no headline Metric`);
	return headline;
}
