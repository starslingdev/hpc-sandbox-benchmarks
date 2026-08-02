import { describe, expect, it } from "bun:test";
import { FIXTURE } from "./__fixtures__/data.ts";
import { pipelineChartHtml } from "./html.ts";
import { buildPipelineChartModel } from "./model.ts";
import { WORDMARK_ASPECT, WORDMARK_CAP_RATIO, WORDMARK_SVG } from "./wordmark.ts";

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
		// Beta is the run's slowest bar (scaleFraction 1) → the full 648 px track; Alpha is
		// a quarter of it. The constant is the same in every chart, which is the claim.
		expect(html).toContain("width: 648.00px");
		expect(html).toContain("width: 162.00px");
	});

	it("puts every track on one origin — a label column no chip can widen", () => {
		// The bug this pins: the provider cell was 128 px of flex-basis with `min-width: auto`,
		// so the widest isolation chip (`microVM` + `dedicated instance`, 154 px) became the
		// cell's min-content width and pushed ITS row's bar ~26 px right of the others. The
		// column is a constant AND cannot grow, so the second half is what makes it structural.
		expect(html).toContain(`flex: 0 0 160px; min-width: 0;`);
	});

	it("reads top to bottom: title, subtitle, note, bars, then the legend", () => {
		// The document ORDER is the reading order, and the figure's is deliberate: the eyebrow is
		// a subtitle under the title rather than a right-aligned tail on its row, and the legend
		// is a footer under the chart rather than a preamble above it. Asserted as offsets
		// because CSS cannot reorder what is not there — this is the structure, not the styling.
		const at = (needle: string) => {
			const index = html.indexOf(needle);
			expect(index, `${needle} missing`).toBeGreaterThan(-1);
			return index;
		};
		expect(at("<h1>")).toBeLessThan(at(`<p class="summary">`));
		expect(at(`<p class="summary">`)).toBeLessThan(at(`<p class="note">`));
		expect(at(`<p class="note">`)).toBeLessThan(at("<section>"));
		expect(at("<section>")).toBeLessThan(at(`<ul class="legend">`));
		// The subtitle is a SIBLING of the header, not a child: inside it, it would sit on the
		// title's row again, which is the arrangement this replaced.
		expect(html).toContain(`</h1>${WORDMARK_SVG}</header>\n<p class="summary">`);
	});

	it("lets the note run the full content width", () => {
		// It used to carry `max-width: 672px` — a prose measure that left it wrapping short of
		// every other block in the figure and reading as a column that had lost its column.
		expect(html).not.toContain("max-width: 672px");
		expect(html).toMatch(/\.note \{ margin: [^;]+; font:/);
	});

	it("keeps the legend note on the far end of its row", () => {
		expect(html).toContain(".legend-note { margin-left: auto;");
	});

	it("carries the wordmark inline, with the artwork's own geometry", () => {
		// Inline SVG, not a fetch: the whole point of the document is that it is self-contained.
		expect(html).toContain(`<svg class="wordmark" viewBox="0 0 508 125"`);
		expect(html).not.toContain("<image");
		// Every path paints from `currentColor`, so the figure's palette is the only thing that
		// decides the mark's colour — a hard-coded `black` would survive a theme change.
		expect(WORDMARK_SVG).not.toContain("black");
		expect(WORDMARK_SVG.match(/fill="currentColor"/g)?.length).toBe(17);
	});

	it("sizes the wordmark by cap height, so it reads level with the title", () => {
		// Matching the artwork's BOX to the 24 px title would set `STARSLING` at ~11 px, because
		// the letterforms are only WORDMARK_CAP_RATIO of the box — the disc takes the rest. The
		// template solves for the letterforms instead; this pins the arithmetic, not the taste.
		const height = Math.round((24 * 0.7) / WORDMARK_CAP_RATIO);
		expect(height).toBe(37);
		expect(html).toContain(
			`.wordmark { flex: 0 0 auto; width: ${(height * WORDMARK_ASPECT).toFixed(2)}px; height: ${height.toFixed(2)}px;`,
		);
	});

	it("badges exactly the fastest bar", () => {
		expect(html.match(/class="badge"/g)?.length).toBe(1);
	});

	it("renders the incomplete disclosure under the bars", () => {
		expect(html).toContain("failed · install exceeded stop");
	});

	it("renders isolation as a segmented subtitle chip", () => {
		const isolated = {
			...FIXTURE,
			providers: FIXTURE.providers.map((provider) =>
				provider.id === "alpha"
					? {
							...provider,
							name: "Namespace",
							isolation: { kind: "microVM", technology: "Firecracker" },
						}
					: provider,
			),
		};
		const rendered = pipelineChartHtml(
			buildPipelineChartModel(
				isolated.suites[0] as (typeof isolated.suites)[number],
				isolated,
				"n",
			),
		);
		expect(rendered).toContain('class="isolation-chip"');
		expect(rendered).toContain("<span>microVM</span><span>Firecracker</span>");
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
