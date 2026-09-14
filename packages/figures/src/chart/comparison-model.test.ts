import { describe, expect, it } from "bun:test";
import { PHASE_RAMP } from "../phases.ts";
import { COMPARISON } from "./__fixtures__/comparison.ts";
import { buildComparisonChartModel } from "./comparison-model.ts";

const suite = COMPARISON.suites[0];
if (!suite) throw new Error("fixture must compare a suite");
const model = buildComparisonChartModel(suite, COMPARISON, "note text");
const row = (label: string) => {
	const found = model.rows.find((entry) => entry.label === label);
	if (!found) throw new Error(`no row ${label}`);
	return found;
};
const bar = (side: ReturnType<typeof row>["before"]) => {
	if (!("bar" in side)) throw new Error("expected a bar");
	return side.bar;
};

describe("buildComparisonChartModel", () => {
	it("sorts by the newer run's total, fastest first, then environments only the older run charted", () => {
		expect(model.rows.map((entry) => entry.label)).toEqual(["Gamma", "Alpha", "Beta †", "Delta"]);
	});

	it("draws both runs on ONE scale — the slowest bar of either run", () => {
		// Delta's older bar (300 s) is the slowest anywhere in the suite, so it is the scale.
		expect(bar(row("Delta").before).scaleFraction).toBe(1);
		expect(bar(row("Alpha").before).scaleFraction).toBeCloseTo(200 / 300, 10);
		expect(bar(row("Alpha").after).scaleFraction).toBeCloseTo(150 / 300, 10);
	});

	it("prints the signed change of the newer summed median against the older", () => {
		expect(row("Alpha").delta).toEqual({ text: "-25.0%", direction: "faster" });
		expect(row("Beta †").delta).toEqual({ text: "+4.8%", direction: "slower" });
		expect(row("Gamma").delta).toBeNull();
		expect(row("Delta").delta).toBeNull();
	});

	it("badges the fastest bar of EACH run", () => {
		const fastest = model.rows.flatMap((entry) =>
			[entry.before, entry.after].flatMap((side) =>
				"bar" in side && side.bar.fastest ? [`${entry.label}/${side.bar.runLabel}`] : [],
			),
		);
		expect(fastest).toEqual(["Gamma/Sep 2026", "Alpha/Aug 2026"]);
	});

	it("fades the older run's bars and chips every bar with its run", () => {
		expect(bar(row("Alpha").before)).toMatchObject({ faded: true, runLabel: "Aug 2026" });
		expect(bar(row("Alpha").after)).toMatchObject({ faded: false, runLabel: "Sep 2026" });
	});

	it("names the missing run on a one-sided row", () => {
		expect(row("Gamma").before).toEqual({
			runLabel: "Aug 2026",
			outcome: "not completed",
			reason: "No result and no marker: the suite never reported for this provider.",
		});
	});

	it("colours segments by phase position in the compared task order, same in both bars", () => {
		expect(bar(row("Alpha").before).segments.map((s) => s.color)).toEqual([
			PHASE_RAMP[0],
			PHASE_RAMP[1],
		]);
		expect(bar(row("Alpha").after).segments.map((s) => s.color)).toEqual([
			PHASE_RAMP[0],
			PHASE_RAMP[1],
		]);
		expect(model.legend.map((entry) => entry.label)).toEqual(["git clone", "cold install"]);
		expect(model.legendNote).toBe("color order = execution order · lighter = Aug 2026");
	});

	it("summarises the compared tasks, the phase walk and the two runs", () => {
		expect(model.summary).toBe("2 tasks · git clone → cold install · Aug 2026 vs Sep 2026");
	});

	it("lists environments that completed the suite in neither run, one reason per run", () => {
		expect(model.incomplete).toEqual([
			{
				label: "Omega",
				reasons: [
					{ runLabel: "Aug 2026", outcome: "failed", reason: "sandbox lost" },
					{ runLabel: "Sep 2026", outcome: "failed", reason: "quota exceeded" },
				],
			},
		]);
	});
});
