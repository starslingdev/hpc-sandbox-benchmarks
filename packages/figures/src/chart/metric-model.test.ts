import { describe, expect, it } from "bun:test";
import { METRIC_FIXTURE } from "./__fixtures__/metric.ts";
import {
	buildMetricChartModel,
	METRIC_BAR_COLOR,
	WHISKER_OVERRUN_PERCENT,
} from "./metric-model.ts";

const figure = METRIC_FIXTURE.metrics[0];
if (!figure) throw new Error("fixture must carry a metric");

const model = buildMetricChartModel(figure, METRIC_FIXTURE, "note text");

describe("buildMetricChartModel", () => {
	it("keeps the board's best-first order and badges every row ranked first", () => {
		// Two rows the board could not separate share rank 1, so both wear the badge: the chart
		// must not invent a winner the statistics did not find.
		expect(model.bars.map((bar) => bar.label)).toEqual(["Alpha", "Beta †", "Gamma"]);
		expect(model.bars.map((bar) => bar.best)).toEqual([true, true, false]);
	});

	it("scales to the widest interval bound, capped at WHISKER_OVERRUN_PERCENT past the largest value", () => {
		// Largest value 200, widest bound 300: the scale is min(300, 200 × 115%) = 230, so the
		// longest bar is 200/230 of the track and a whisker may run 15% past it — no further.
		expect(model.bars.map((bar) => bar.scaleFraction)).toEqual([200 / 230, 190 / 230, 50 / 230]);
		expect(WHISKER_OVERRUN_PERCENT).toBe(15);
		// With every bound inside the cap, the widest bound IS the scale.
		const narrow = buildMetricChartModel(
			{ ...figure, rows: figure.rows.map((row) => ({ ...row, hi: Math.min(row.hi, 210) })) },
			METRIC_FIXTURE,
			"n",
		);
		expect(narrow.bars[0]?.scaleFraction).toBe(200 / 210);
		expect(narrow.bars[0]?.interval).toEqual({ lo: 180 / 210, hi: 1, clipped: false });
	});

	it("cuts an interval bound past the scale at the chart edge and says so", () => {
		// Alpha's hi (300) exceeds the scale (230): drawn to the edge, flagged, disclosed. Beta's
		// (230) lands exactly on it: drawn to the edge, not a cut.
		expect(model.bars[0]?.interval).toEqual({ lo: 180 / 230, hi: 1, clipped: true });
		expect(model.bars[1]?.interval).toEqual({ lo: 150 / 230, hi: 1, clipped: false });
		expect(model.legendNote).toBe("sorted best first · interval cut at chart edge");
	});

	it("draws no whisker for a row with no estimable interval", () => {
		expect(model.bars[2]?.interval).toBeNull();
	});

	it("prints the value with its unit, formatted as the table prints it", () => {
		expect(model.bars.map((bar) => bar.value)).toEqual(["200 ops/s", "190 ops/s", "50 ops/s"]);
		const fractional = buildMetricChartModel(
			{
				...figure,
				rows: [{ ...figure.rows[0], value: 24.2712345 } as (typeof figure.rows)[number]],
			},
			METRIC_FIXTURE,
			"n",
		);
		expect(fractional.bars[0]?.value).toBe("24.27 ops/s");
	});

	it("summarises the metric as dimension, unit, direction and comparison size", () => {
		expect(model.summary).toBe("cpu · ops/s · higher is better · 3 environments · headline");
		const lower = buildMetricChartModel(
			{ ...figure, direction: "LIB", headline: false },
			METRIC_FIXTURE,
			"n",
		);
		expect(lower.summary).toBe("cpu · ops/s · lower is better · 3 environments");
	});

	it("legends the one bar colour and the whisker, and drops the whisker entry when none is drawn", () => {
		expect(model.legend.map((entry) => entry.label)).toEqual([
			"median across sandboxes",
			"95% interval",
		]);
		expect(model.legend[0]?.color).toBe(METRIC_BAR_COLOR);
		const pointOnly = buildMetricChartModel(
			{ ...figure, rows: figure.rows.map((row) => ({ ...row, lo: row.value, hi: row.value })) },
			METRIC_FIXTURE,
			"n",
		);
		expect(pointOnly.legend.map((entry) => entry.label)).toEqual(["median across sandboxes"]);
		expect(pointOnly.legendNote).toBe("sorted best first");
	});

	it("does not call a chart of single observations a median", () => {
		const priced = buildMetricChartModel(
			{
				...figure,
				rows: figure.rows.map((row) => ({
					...row,
					lo: row.value,
					hi: row.value,
					n: 1,
					sandboxes: 1,
				})),
			},
			METRIC_FIXTURE,
			"n",
		);
		expect(priced.legend.map((entry) => entry.label)).toEqual(["retained value"]);
	});

	it("lists unmeasured environments under the bars, dagger following the provider", () => {
		expect(model.unmeasured).toEqual([
			{ label: "Delta", outcome: "failed", reason: "sandbox lost" },
		]);
	});

	it("draws an all-zero metric at zero width, never as NaN", () => {
		const zeroed = buildMetricChartModel(
			{ ...figure, rows: figure.rows.map((row) => ({ ...row, value: 0, lo: 0, hi: 0 })) },
			METRIC_FIXTURE,
			"n",
		);
		expect(zeroed.bars.map((bar) => bar.scaleFraction)).toEqual([0, 0, 0]);
		expect(zeroed.bars.every((bar) => bar.interval === null)).toBe(true);
	});

	it("refuses a row naming a provider the run does not list", () => {
		expect(() =>
			buildMetricChartModel(
				{
					...figure,
					rows: [{ ...figure.rows[0], provider: "omega" } as (typeof figure.rows)[number]],
				},
				METRIC_FIXTURE,
				"n",
			),
		).toThrow(/"omega"/);
	});
});
