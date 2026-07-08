import { describe, expect, it } from "bun:test";
import type { LifecycleAggregate, LifecycleBenchmark } from "@sandbox-benchmarks/harness";
import { HARNESS_METRIC_IDS } from "@sandbox-benchmarks/schema";
import {
	formatLifecycleLines,
	lifecycleFailureReason,
	lifecycleOk,
	summarizeLifecycleAggregates,
} from "./lifecycle-summary.ts";

// `metricId` is typed wider than HarnessMetricId so the uncatalogued-fallback case can pass an
// off-catalog id; the cast recovers the aggregate shape the summarizer consumes.
const agg = (metricId: string, p50: number, p95: number, n: number): LifecycleAggregate =>
	({
		metricId,
		aggregates: { p50, p95, mean: p50, stdev: 0, min: p50, max: p95, n },
	}) as unknown as LifecycleAggregate;

describe("summarizeLifecycleAggregates", () => {
	it("resolves catalog labels/units and rounds p50/p95 to one decimal", () => {
		const [spawn] = summarizeLifecycleAggregates([
			agg(HARNESS_METRIC_IDS.spawn, 812.37, 998.61, 3),
		]);
		expect(spawn).toEqual({
			metricId: HARNESS_METRIC_IDS.spawn,
			label: "Spawn",
			unit: "ms",
			p50: 812.4,
			p95: 998.6,
			n: 3,
		});
	});

	it("falls back to the raw id and ms for an uncatalogued id", () => {
		const [summary] = summarizeLifecycleAggregates([agg("not_a_metric", 1, 2, 1)]);
		expect(summary?.label).toBe("not_a_metric");
		expect(summary?.unit).toBe("ms");
	});

	it("preserves aggregate order (one summary per aggregate)", () => {
		const summaries = summarizeLifecycleAggregates([
			agg(HARNESS_METRIC_IDS.spawn, 800, 900, 3),
			agg(HARNESS_METRIC_IDS.controlPlaneInfo, 12, 20, 15),
		]);
		expect(summaries.map((s) => s.metricId)).toEqual([
			HARNESS_METRIC_IDS.spawn,
			HARNESS_METRIC_IDS.controlPlaneInfo,
		]);
	});
});

// A benchmark carrying just the operations/skips a case needs; unrelated fields stay minimal.
const bench = (
	samples: Array<{ operation: string; durationMs: number }>,
	skips: Array<{ suite: string; reason: string }> = [],
): LifecycleBenchmark =>
	({
		provider: "e2b",
		samples: samples.map((s) => ({ provider: "e2b", ...s })),
		aggregates: [],
		skips,
	}) as unknown as LifecycleBenchmark;

describe("lifecycleOk", () => {
	it("passes a run that captured at least one cold-start sample", () => {
		expect(lifecycleOk(bench([{ operation: HARNESS_METRIC_IDS.coldStart, durationMs: 900 }]))).toBe(
			true,
		);
	});

	it("fails a run that spawned but never became ready (spawn/teardown sampled, cold start skipped)", () => {
		const run = bench(
			[
				{ operation: HARNESS_METRIC_IDS.spawn, durationMs: 400 },
				{ operation: HARNESS_METRIC_IDS.teardown, durationMs: 50 },
			],
			[
				{ suite: HARNESS_METRIC_IDS.coldStart, reason: 'sandbox never ready: no "echo ok" in 40' },
				{ suite: HARNESS_METRIC_IDS.firstExec, reason: 'sandbox never ready: no "echo ok" in 40' },
			],
		);
		expect(lifecycleOk(run)).toBe(false);
	});

	it("fails a run with no samples at all (spawn threw every cycle)", () => {
		expect(lifecycleOk(bench([], [{ suite: HARNESS_METRIC_IDS.spawn, reason: "boom" }]))).toBe(
			false,
		);
	});
});

describe("lifecycleFailureReason", () => {
	it("surfaces the recorded cold-start skip reason", () => {
		const run = bench(
			[{ operation: HARNESS_METRIC_IDS.spawn, durationMs: 400 }],
			[{ suite: HARNESS_METRIC_IDS.coldStart, reason: "sandbox never ready" }],
		);
		expect(lifecycleFailureReason(run)).toBe(
			`no ${HARNESS_METRIC_IDS.coldStart} sample captured (sandbox never ready)`,
		);
	});

	it("falls back to a no-samples note when nothing skipped cold start (spawn threw)", () => {
		const run = bench([], [{ suite: HARNESS_METRIC_IDS.spawn, reason: "boom" }]);
		expect(lifecycleFailureReason(run)).toBe(
			`no ${HARNESS_METRIC_IDS.coldStart} sample captured (no samples recorded)`,
		);
	});
});

describe("formatLifecycleLines", () => {
	it("formats one aligned line per Metric with p50/p95/n", () => {
		const lines = formatLifecycleLines(
			summarizeLifecycleAggregates([agg(HARNESS_METRIC_IDS.controlPlaneInfo, 12.5, 19.9, 15)]),
		);
		expect(lines).toHaveLength(1);
		// 4-space indent, the catalog label, then the rounded p50/p95/n (padding between is alignment).
		expect(lines[0]).toMatch(/^ {4}Sandbox info\s+p50=12\.5ms p95=19\.9ms \(n=15\)$/);
	});
});
