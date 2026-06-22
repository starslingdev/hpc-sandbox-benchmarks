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
 * The full Catalog, validated at load. Dimensions land in display order as their Metrics are ported;
 * the runtime `.assert` turns a malformed entry (bad dimension/direction, missing field) into a
 * fail-fast at import rather than a silently broken stability contract.
 */
export const METRIC_CATALOG: readonly MetricDef[] = metricDefSchema.array().assert([...ptsCpu]);

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
