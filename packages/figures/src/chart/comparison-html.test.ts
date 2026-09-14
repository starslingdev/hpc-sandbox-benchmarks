import { describe, expect, it } from "bun:test";
import { COMPARISON } from "./__fixtures__/comparison.ts";
import { comparisonChartHtml } from "./comparison-html.ts";
import { buildComparisonChartModel } from "./comparison-model.ts";

const suite = COMPARISON.suites[0];
if (!suite) throw new Error("fixture must compare a suite");
const html = comparisonChartHtml(buildComparisonChartModel(suite, COMPARISON, "note text"));

describe("comparisonChartHtml", () => {
	it("is deterministic and self-contained", () => {
		expect(comparisonChartHtml(buildComparisonChartModel(suite, COMPARISON, "note text"))).toBe(
			html,
		);
		expect(html).toContain("data:font/woff2;base64,");
		expect(html).not.toMatch(/url\((?!data:)/);
		expect(html).not.toContain("<script");
	});

	it("draws two chipped lanes per environment, the older faded", () => {
		expect(html.match(/class="row compare"/g)?.length).toBe(4);
		expect(html).toContain(`<span class="run-chip">Aug 2026</span>`);
		expect(html).toContain(`<span class="run-chip">Sep 2026</span>`);
		// Three older bars charted, each faded; three newer, none faded.
		expect(html.match(/class="track faded"/g)?.length).toBe(3);
		expect(html.match(/class="track"/g)?.length).toBe(3);
	});

	it("draws both runs against one 520 px track", () => {
		// Delta's older 300 s bar is the scale; Alpha's newer 150 s bar is half of it.
		expect(html).toContain(`<div class="track faded" style="width: 520.00px;">`);
		expect(html).toContain(`<div class="track" style="width: 260.00px;">`);
	});

	it("prints the delta beside the newer total only, classed by direction", () => {
		expect(html).toContain(`<span class="delta faster">-25.0%</span>`);
		expect(html).toContain(`<span class="delta slower">+4.8%</span>`);
		expect(html.match(/class="delta /g)?.length).toBe(2);
	});

	it("badges the fastest bar of each run", () => {
		expect(html.match(/class="badge"/g)?.length).toBe(2);
	});

	it("discloses the missing run on a one-sided row and both reasons on an absent one", () => {
		expect(html).toContain("not completed · No result and no marker");
		expect(html).toContain("failed · sandbox lost");
		expect(html).toContain("failed · quota exceeded");
	});

	it("refuses a colour that is not hex", () => {
		const model = buildComparisonChartModel(suite, COMPARISON, "n");
		expect(() =>
			comparisonChartHtml({ ...model, legend: [{ label: "x", color: 'red;" onload="x' }] }),
		).toThrow(/not a hex colour/);
	});
});
