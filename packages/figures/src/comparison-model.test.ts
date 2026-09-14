import { describe, expect, it } from "bun:test";
import { AFTER, BEFORE, COMPARISON, METRICS } from "./chart/__fixtures__/comparison.ts";
import { buildComparisonFigureModel } from "./comparison-model.ts";

const suite = COMPARISON.suites[0];
if (!suite) throw new Error("fixture must compare a suite");

describe("buildComparisonFigureModel", () => {
	it("compares only the tasks BOTH runs exercised, and discloses the rest", () => {
		// The newer run added `test core`; summing it into one side would call a longer
		// pipeline a slowdown. Both bars are summed over clone + install only.
		expect(suite.tasks.map((task) => task.id)).toEqual([
			"realworld_demo_task_git_clone",
			"realworld_demo_task_cold_install",
		]);
		expect(suite.excludedTasks).toEqual({ beforeOnly: [], afterOnly: ["test core"] });
		const alpha = suite.rows.find((row) => row.provider === "alpha");
		expect(alpha?.before?.totalS).toBe(200);
		expect(alpha?.after?.totalS).toBe(150);
		expect(alpha?.after?.segments.map((segment) => segment.id)).not.toContain(
			"realworld_demo_task_test_core",
		);
	});

	it("keeps an environment charted in only one run, with the other side null", () => {
		const gamma = suite.rows.find((row) => row.provider === "gamma");
		expect(gamma?.before).toBeNull();
		expect(gamma?.after?.totalS).toBe(100);
		const delta = suite.rows.find((row) => row.provider === "delta");
		expect(delta?.before?.totalS).toBe(300);
		expect(delta?.after).toBeNull();
	});

	it("lists an environment that completed the suite in neither run, with both reasons", () => {
		expect(suite.incomplete).toEqual([
			{
				provider: "omega",
				before: { outcome: "failed", reason: "sandbox lost" },
				after: { outcome: "failed", reason: "quota exceeded" },
			},
		]);
	});

	it("drops a suite one run could not chart — there is nothing to compare it against", () => {
		const only = buildComparisonFigureModel({
			before: { run: COMPARISON.before, model: { ...BEFORE, suites: [] } },
			after: { run: COMPARISON.after, model: AFTER },
			metrics: METRICS,
		});
		expect(only.suites).toEqual([]);
	});

	it("carries both run identities and the union roster, newer entry winning", () => {
		expect(COMPARISON.before.label).toBe("Aug 2026");
		expect(COMPARISON.after.id).toBe("222");
		const renamed = buildComparisonFigureModel({
			before: { run: COMPARISON.before, model: BEFORE },
			after: {
				run: COMPARISON.after,
				model: {
					...AFTER,
					providers: AFTER.providers.map((p) =>
						p.id === "alpha" ? { ...p, name: "Alpha v2" } : p,
					),
				},
			},
			metrics: METRICS,
		});
		expect(renamed.providers.find((p) => p.id === "alpha")?.name).toBe("Alpha v2");
	});

	it("refuses a task id the catalog does not label", () => {
		expect(() =>
			buildComparisonFigureModel({
				before: { run: COMPARISON.before, model: BEFORE },
				after: { run: COMPARISON.after, model: AFTER },
				metrics: METRICS.slice(0, 2),
			}),
		).toThrow(/not in the metric catalog/);
	});
});
