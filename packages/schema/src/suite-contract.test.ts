import { describe, expect, it } from "bun:test";
import { METRIC_CATALOG } from "./catalog.ts";
import type { Dimension, MetricDef } from "./metrics.ts";
import type { SuiteContract } from "./suite-contract.ts";
import {
	assertSuiteContract,
	describeSuiteContractViolation,
	suiteContractViolations,
} from "./suite-contract.ts";
import { SUITES } from "./suites.ts";

// A crafted catalog kept tiny and explicit so each case exercises one rule. Only the fields the
// contract reads (id, dimension) matter; the rest satisfy MetricDef's shape.
const metric = (id: string, dimension: Dimension): MetricDef => ({
	id,
	dimension,
	unit: "x",
	direction: "HIB",
	headline: false,
	label: id,
	description: id,
});

const catalog: MetricDef[] = [
	metric("cpu_a", "cpu"),
	metric("cpu_b", "cpu"),
	metric("disk_a", "disk"),
];

const suites = (entries: Record<string, SuiteContract>): Record<string, SuiteContract> => entries;

describe("suiteContractViolations", () => {
	it("returns no violations for a sound declaration", () => {
		const out = suiteContractViolations(
			suites({ "cpu-suite": { dimensions: ["cpu"], metrics: ["cpu_a", "cpu_b"] } }),
			catalog,
		);
		expect(out).toEqual([]);
	});

	it("accepts a suite spanning several dimensions with a metric on each", () => {
		const out = suiteContractViolations(
			suites({ mixed: { dimensions: ["cpu", "disk"], metrics: ["cpu_a", "disk_a"] } }),
			catalog,
		);
		expect(out).toEqual([]);
	});

	it("flags an uncatalogued metric", () => {
		const out = suiteContractViolations(
			suites({ "cpu-suite": { dimensions: ["cpu"], metrics: ["cpu_a", "not_a_metric"] } }),
			catalog,
		);
		// The whole structured violation — uncatalogued arms carry only a metricId, never a dimension.
		expect(out).toEqual([{ suite: "cpu-suite", kind: "uncatalogued", metricId: "not_a_metric" }]);
	});

	it("flags a catalogued metric on a dimension the suite does not declare", () => {
		const out = suiteContractViolations(
			// disk_a is real but sits on `disk`, which this cpu-only suite never declares.
			suites({ "cpu-suite": { dimensions: ["cpu"], metrics: ["cpu_a", "disk_a"] } }),
			catalog,
		);
		// The off-dimension arm carries both the metric and the dimension it actually sits on.
		expect(out).toEqual([
			{ suite: "cpu-suite", kind: "off-dimension", metricId: "disk_a", dimension: "disk" },
		]);
	});

	it("flags a declared dimension that no declared metric covers", () => {
		const out = suiteContractViolations(
			suites({ "cpu-suite": { dimensions: ["cpu", "memory"], metrics: ["cpu_a"] } }),
			catalog,
		);
		expect(out).toEqual([{ suite: "cpu-suite", kind: "empty-dimension", dimension: "memory" }]);
	});

	it("flags every declared dimension when the suite emits no metrics at all", () => {
		// The metrics loop never runs, so this exercises the dangling-axis pass in isolation.
		const out = suiteContractViolations(
			suites({ "cpu-suite": { dimensions: ["cpu"], metrics: [] } }),
			catalog,
		);
		expect(out).toEqual([{ suite: "cpu-suite", kind: "empty-dimension", dimension: "cpu" }]);
	});

	it("tolerates a metric id listed twice — the dimension is covered, not double-flagged", () => {
		// Pins current behavior: a repeated id is not itself a contract breach (the catalog guards
		// id-uniqueness; a suite re-listing one only covers its dimension again).
		const out = suiteContractViolations(
			suites({ "cpu-suite": { dimensions: ["cpu"], metrics: ["cpu_a", "cpu_a"] } }),
			catalog,
		);
		expect(out).toEqual([]);
	});

	it("reports every violation across multiple suites, deterministically ordered", () => {
		const out = suiteContractViolations(
			suites({
				good: { dimensions: ["cpu"], metrics: ["cpu_a"] },
				bad: { dimensions: ["cpu"], metrics: ["ghost", "disk_a"] },
			}),
			catalog,
		);
		// `good` is clean. `bad` yields, in order: uncatalogued (ghost) and off-dimension (disk_a) over
		// its metrics, then the dangling-axis check — `cpu` is declared but its intended metric was the
		// misspelled `ghost`, so nothing covers it (disk_a, on `disk`, was already rejected off-dimension).
		expect(out).toEqual([
			{ suite: "bad", kind: "uncatalogued", metricId: "ghost" },
			{ suite: "bad", kind: "off-dimension", metricId: "disk_a", dimension: "disk" },
			{ suite: "bad", kind: "empty-dimension", dimension: "cpu" },
		]);
	});

	it("defaults to the real Metric Catalog when none is passed", () => {
		// node_web_tooling_runs_per_s is the real cpu headline; no second arg means the singleton catalog.
		expect(
			suiteContractViolations(
				suites({ "cpu-node": { dimensions: ["cpu"], metrics: ["node_web_tooling_runs_per_s"] } }),
			),
		).toEqual([]);
	});
});

describe("describeSuiteContractViolation", () => {
	it("derives the line for each failure mode from its structured fields", () => {
		expect(
			describeSuiteContractViolation({ suite: "s", kind: "uncatalogued", metricId: "m" }),
		).toBe('suite "s" declares metric "m", which is not in the Metric Catalog');
		expect(
			describeSuiteContractViolation({
				suite: "s",
				kind: "off-dimension",
				metricId: "m",
				dimension: "disk",
			}),
		).toBe('suite "s" declares metric "m" on undeclared dimension "disk"');
		expect(
			describeSuiteContractViolation({ suite: "s", kind: "empty-dimension", dimension: "memory" }),
		).toBe('suite "s" declares dimension "memory" but emits no metric on it');
	});
});

describe("assertSuiteContract", () => {
	it("does not throw for the real SUITES against the real catalog", () => {
		expect(() => assertSuiteContract()).not.toThrow();
		expect(suiteContractViolations(SUITES, METRIC_CATALOG)).toEqual([]);
	});

	it("throws a single aggregated error listing every violation line, in order", () => {
		let message: string | undefined;
		try {
			assertSuiteContract(
				suites({
					"cpu-suite": { dimensions: ["cpu"], metrics: ["ghost"] },
					"disk-suite": { dimensions: ["disk"], metrics: ["cpu_a"] },
				}),
				catalog,
			);
		} catch (err) {
			message = err instanceof Error ? err.message : String(err);
		}
		// One thrown error whose body carries every violation as its own `  - ` line, in suite-declaration
		// then within-suite order — proving the "fix in one pass" aggregation, not one throw per violation.
		expect(message).toBe(
			[
				"suite ↔ dimension ↔ metric contract violated:",
				'  - suite "cpu-suite" declares metric "ghost", which is not in the Metric Catalog',
				'  - suite "cpu-suite" declares dimension "cpu" but emits no metric on it',
				'  - suite "disk-suite" declares metric "cpu_a" on undeclared dimension "cpu"',
				'  - suite "disk-suite" declares dimension "disk" but emits no metric on it',
			].join("\n"),
		);
	});

	it("does not throw for a sound crafted registry", () => {
		expect(() =>
			assertSuiteContract(suites({ ok: { dimensions: ["disk"], metrics: ["disk_a"] } }), catalog),
		).not.toThrow();
	});
});
