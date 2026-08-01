import { describe, expect, it } from "bun:test";
import { PHASE_RAMP } from "../phases.ts";
import { FIXTURE } from "./__fixtures__/data.ts";
import { buildPipelineChartModel } from "./model.ts";

const suite = FIXTURE.suites[0];
if (!suite) throw new Error("fixture must carry a chartable suite");

const model = buildPipelineChartModel(suite, FIXTURE, "note text");

describe("buildPipelineChartModel", () => {
	it("sorts bars fastest-first and flags only the best total", () => {
		expect(model.bars.map((bar) => bar.label)).toEqual(["Alpha", "Beta †"]);
		expect(model.bars.map((bar) => bar.fastest)).toEqual([true, false]);
	});

	it("carries the off-spec dagger on bar and incomplete labels alike", () => {
		// Beta is off-spec and charted; Gamma is on-spec and incomplete. The dagger follows
		// the provider, not the row kind.
		expect(model.bars[1]?.label).toBe("Beta †");
		expect(model.incomplete).toEqual([
			{ label: "Gamma", outcome: "failed", reason: "install exceeded stop" },
		]);
	});

	it("scales every bar against the run's slowest charted total", () => {
		// Beta (400 s) is the run's slowest bar, so it IS the scale; Alpha (100 s) is a
		// quarter of it. This ratio — not a per-chart maximum — is what makes a second the
		// same length in every figure.
		expect(model.bars[1]?.scaleFraction).toBe(1);
		expect(model.bars[0]?.scaleFraction).toBe(0.25);
	});

	it("splits a bar into per-task shares that sum to the bar", () => {
		for (const bar of model.bars) {
			const total = bar.segments.reduce((sum, segment) => sum + segment.share, 0);
			expect(total).toBeCloseTo(1, 10);
		}
		expect(model.bars[0]?.segments.map((s) => s.share)).toEqual([0.4, 0.6]);
	});

	it("colours segments ordinally by position in THIS suite's phase sequence", () => {
		// Position in the suite being drawn, not a fixed phase→colour map: later-in-this-suite
		// is darker-in-this-suite, which is what makes the printed "color order = execution
		// order" claim true for every suite regardless of how its order differs from others'.
		expect(model.bars[0]?.segments.map((s) => s.color)).toEqual([PHASE_RAMP[0], PHASE_RAMP[1]]);
	});

	it("legends the suite's phases in the suite's own execution order", () => {
		expect(model.legend).toEqual([
			{ label: "git clone", color: PHASE_RAMP[0] },
			{ label: "build", color: PHASE_RAMP[1] },
		]);
	});

	it("keeps the eyebrow count honest when declared tasks were dropped", () => {
		const withDropped = buildPipelineChartModel(
			{ ...suite, droppedTasks: ["test core"] },
			FIXTURE,
			"n",
		);
		expect(withDropped.summary).toBe("2 of 3 tasks · git clone → build");
	});

	it("summarises the suite as task count plus phase walk", () => {
		expect(model.summary).toBe("2 tasks · git clone → build");
	});

	it("passes the authored note through and appends the disk aside separately", () => {
		expect(model.note).toBe("note text");
		expect(model.diskNote).toBe("Needs 30 GB free disk.");
	});

	it("omits the disk aside when the suite requires none", () => {
		const noDisk = buildPipelineChartModel({ ...suite, minDiskGb: null }, FIXTURE, "n");
		expect(noDisk.diskNote).toBeNull();
	});

	it("draws a schema-valid zero duration at zero width, never as NaN", () => {
		// 0/0 is NaN, and CSS reads a NaN flex/width as broken layout — the bar would silently
		// vanish. The dataset admits p50 = 0, so the arithmetic has to.
		const zeroBar = {
			provider: "alpha",
			totalS: 0,
			segments: [{ id: "realworld_demo_task_clone", phase: "clone" as const, p50: 0, n: 3 }],
		};
		const zeroed = buildPipelineChartModel({ ...suite, bars: [zeroBar] }, FIXTURE, "n");
		expect(zeroed.bars[0]?.segments[0]?.share).toBe(0);
		// The shared scale still comes from the whole run's bars (the fixture's slowest is
		// 400 s), so the zero bar is 0 of it — and a run whose bars are ALL zero yields 0,
		// not NaN.
		expect(zeroed.bars[0]?.scaleFraction).toBe(0);
	});
});
