import { describe, expect, it } from "bun:test";
import { FIXTURE } from "./__fixtures__/data.ts";
import { pipelineChartHtml } from "./html.ts";
import { buildPipelineChartModel } from "./model.ts";

const suite = FIXTURE.suites[0];
if (!suite) throw new Error("fixture must carry a chartable suite");

const html = pipelineChartHtml(buildPipelineChartModel(suite, FIXTURE, "note text"));

describe("pipelineChartHtml", () => {
	it("is deterministic — the same model renders the same bytes", () => {
		expect(pipelineChartHtml(buildPipelineChartModel(suite, FIXTURE, "note text"))).toBe(html);
	});

	it("is self-contained — every face inline, no external reference", () => {
		expect(html.match(/@font-face/g)?.length).toBe(4);
		expect(html).toContain("data:font/woff2;base64,");
		// The one URL scheme in the document is `data:`. An http(s) or file reference would
		// make the figure depend on something other than this string.
		expect(html).not.toMatch(/url\((?!data:)/);
		expect(html).not.toContain("<script");
	});

	it("carries the embedded fonts' licence notices — an inlined font is a copy", () => {
		expect(html).toContain("The Geist Project Authors");
		expect(html).toContain("The Afacad Project Authors");
		expect(html).toContain("SIL Open Font License");
	});

	it("carries brand faces only — no Unicode fallback face rides along", () => {
		// The 986 KB DejaVu payload was 88% of the document and supplied two glyphs (`†`, `→`)
		// the embedded Geist Sans subset already has. Every stack ends on Geist for that reason.
		expect(html).not.toContain("DejaVu");
		expect(html).toContain(`"Geist Mono", Geist, monospace`);
		// The characters that motivated the fallback still render — they are drawn by a brand face.
		expect(html).toContain("†");
		expect(html).toContain("→");
	});

	it("refuses a character no embedded face can draw, rather than falling back silently", () => {
		// `µ` is in DejaVu but not in the Geist subsets: exactly the case that used to slip
		// through and make the figure depend on the rendering machine's installed fonts.
		expect(() => pipelineChartHtml(buildPipelineChartModel(suite, FIXTURE, "median µs"))).toThrow(
			/no embedded face covers "µ" \(U\+00B5\)/,
		);
	});

	it("refuses a colour that is not hex — a style attribute must not be an injection point", () => {
		const model = buildPipelineChartModel(suite, FIXTURE, "n");
		const poisoned = {
			...model,
			legend: [{ label: "clone", color: 'red;" onload="alert(1)' }],
		};
		expect(() => pipelineChartHtml(poisoned)).toThrow(/not a hex colour/);
	});

	it("refuses a share that is not a finite number — `flex-grow` takes it unformatted", () => {
		const model = buildPipelineChartModel(suite, FIXTURE, "n");
		const bar = model.bars[0];
		if (!bar) throw new Error("fixture must carry a bar");
		// A CSS declaration smuggled through the one bare number in a style attribute: it would
		// close `flex-grow` and give the document an external fetch.
		const poisoned = {
			...model,
			bars: [
				{
					...bar,
					segments: [{ ...bar.segments[0], share: "1; background: url(https://x/y)" }],
				},
				...model.bars.slice(1),
			],
		} as unknown as typeof model;
		expect(() => pipelineChartHtml(poisoned)).toThrow(/not a finite non-negative number/);
	});

	it("draws the shared scale as track widths against one constant", () => {
		// Beta is the run's slowest bar (scaleFraction 1) → the full 680 px track; Alpha is
		// a quarter of it. The constant is the same in every chart, which is the claim.
		expect(html).toContain("width: 680.00px");
		expect(html).toContain("width: 170.00px");
	});

	it("badges exactly the fastest bar", () => {
		expect(html.match(/class="badge"/g)?.length).toBe(1);
	});

	it("renders the incomplete disclosure under the bars", () => {
		expect(html).toContain("failed · install exceeded stop");
	});

	it("escapes interpolated text and renders the note's inline markdown", () => {
		const spiky = pipelineChartHtml(
			buildPipelineChartModel(suite, FIXTURE, "a **sum of medians** of `p50 <& friends>`"),
		);
		expect(spiky).toContain("<strong>sum of medians</strong>");
		expect(spiky).toContain("<code>p50 &lt;&amp; friends&gt;</code>");
		expect(spiky).not.toContain("p50 <&");
	});
});
