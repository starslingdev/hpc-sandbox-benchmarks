import { describe, expect, it } from "bun:test";
import { METRIC_FIXTURE } from "./__fixtures__/metric.ts";
import { metricChartHtml } from "./metric-html.ts";
import { buildMetricChartModel } from "./metric-model.ts";
import { WORDMARK_SVG } from "./wordmark.ts";

const figure = METRIC_FIXTURE.metrics[0];
if (!figure) throw new Error("fixture must carry a metric");

const html = metricChartHtml(buildMetricChartModel(figure, METRIC_FIXTURE, "note text"));

describe("metricChartHtml", () => {
	it("is deterministic — the same model renders the same bytes", () => {
		expect(metricChartHtml(buildMetricChartModel(figure, METRIC_FIXTURE, "note text"))).toBe(html);
	});

	it("is self-contained — every face inline, no external reference, no script", () => {
		expect(html.match(/@font-face/g)?.length).toBe(4);
		expect(html).toContain("data:font/woff2;base64,");
		expect(html).not.toMatch(/url\((?!data:)/);
		expect(html).not.toContain("<script");
	});

	it("shares the pipeline chart's frame: title, wordmark, eyebrow, note, rows, legend", () => {
		const at = (needle: string) => {
			const index = html.indexOf(needle);
			expect(index, `${needle} missing`).toBeGreaterThan(-1);
			return index;
		};
		expect(html).toContain("<title>Demo throughput</title>");
		expect(html).toContain(`</h1>${WORDMARK_SVG}</header>\n<p class="summary">`);
		expect(at("<h1>")).toBeLessThan(at(`<p class="summary">`));
		expect(at(`<p class="summary">`)).toBeLessThan(at(`<p class="note">`));
		expect(at(`<p class="note">`)).toBeLessThan(at("<section>"));
		expect(at("<section>")).toBeLessThan(at(`<ul class="legend">`));
		expect(html).toContain(`flex: 0 0 160px; min-width: 0;`);
	});

	it("draws each bar to its fraction of the 560 px track, and the whisker on the same scale", () => {
		// Scale 230 (see the model tests). Alpha: 200/230 → 486.96 px; its interval from 180/230
		// (438.26 px) to the edge at 560 px. Gamma: 50/230 → 121.74 px, and no whisker at all.
		expect(html).toContain(`<span class="fill" style="width: 486.96px;`);
		expect(html).toContain(`<span class="whisker" style="left: 438.26px; width: 121.74px;`);
		expect(html).toContain(`<span class="fill" style="width: 121.74px;`);
		expect(html.match(/class="whisker"/g)?.length).toBe(2);
	});

	it("sizes the lane to the whisker when it reaches past the bar, so the value never sits on it", () => {
		// Beta: bar 190/230 → 462.61 px, interval to the edge → 560 px; the lane is the further one.
		expect(html).toContain(
			`<div class="lane" style="width: 560.00px;"><span class="fill" style="width: 462.61px;`,
		);
	});

	it("badges every row the board ranked first, as `best`", () => {
		expect(html.match(/<span class="badge">best<\/span>/g)?.length).toBe(2);
		expect(html).not.toContain(">fastest<");
	});

	it("renders the unmeasured disclosure under the bars", () => {
		expect(html).toContain("failed · sandbox lost");
	});

	it("refuses a colour that is not hex — a style attribute must not be an injection point", () => {
		const model = buildMetricChartModel(figure, METRIC_FIXTURE, "n");
		const poisoned = {
			...model,
			legend: [{ label: "median", color: 'red;" onload="alert(1)' }],
		};
		expect(() => metricChartHtml(poisoned)).toThrow(/not a hex colour/);
	});

	it("refuses a character no embedded face can draw", () => {
		expect(() =>
			metricChartHtml(buildMetricChartModel(figure, METRIC_FIXTURE, "median µs")),
		).toThrow(/no embedded face covers "µ"/);
	});

	it("escapes interpolated text and renders the note's inline markdown", () => {
		const spiky = metricChartHtml(
			buildMetricChartModel(figure, METRIC_FIXTURE, "a **median** of `p50 <& friends>`"),
		);
		expect(spiky).toContain("<strong>median</strong>");
		expect(spiky).toContain("<code>p50 &lt;&amp; friends&gt;</code>");
	});
});
