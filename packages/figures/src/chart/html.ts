/**
 * The pipeline chart, as one self-contained HTML document per suite.
 *
 * The document is the whole input to the screenshot: inline styles, `data:`-URI fonts, no
 * script, no external reference of any kind. Whatever Chrome draws is a function of this
 * string alone, which is what keeps the HTML — the deterministic half of the pipeline —
 * inspectable on its own: render it, open it, read it.
 *
 * The template is deliberately dumb. Every decision the picture makes — sort order, badge,
 * colours, disclosure rows, the shared scale — arrives already made in the
 * {@link PipelineChartModel}; this file only knows how wide things are and what they look
 * like. The arithmetic it does own is geometric, never editorial. The track: a bar's drawn
 * length is `scaleFraction × TRACK_WIDTH` with TRACK_WIDTH constant across every chart, which
 * is the whole mechanism behind "a second is the same length in all of them". Within a bar the
 * browser distributes the track by `flex-grow: share`, which reproduces the page's
 * gap-then-proportion layout without any of the width bookkeeping the satori renderer
 * needed — flexbox with `gap` IS that algorithm. The frame around the bars — header, eyebrow,
 * note, legend, and the geometry and faces they share with every other chart — lives in
 * `template.ts`.
 */
import { assertCovered } from "./fonts.ts";
import type { PipelineChartModel } from "./model.ts";
import {
	BAR_HEIGHT,
	chartDocument,
	cssNumber,
	disclosureRow,
	escapeHtml,
	hexColor,
	inlineMarkdown,
	legendItem,
	providerMarkup,
	px,
	SEGMENT_GAP,
} from "./template.ts";

export { FIGURE_WIDTH } from "./template.ts";

/**
 * The full-scale bar's length. Fixed rather than solved from the content: with the label
 * column, the gutter and the padding spoken for, 88 px remain for the total that follows
 * the longest bar — enough for any `formatSeconds` string the domain produces. A total the
 * canvas cannot fit would overflow INTO the padding and still be captured, not clipped;
 * ugly beats silently sliced, and the eyeball pass catches ugly.
 */
const TRACK_WIDTH = 648;

const STYLE = `.track { display: flex; gap: ${SEGMENT_GAP}px; height: ${BAR_HEIGHT}px; }
.segment { flex-shrink: 1; flex-basis: 0; }
.segment:first-child { border-top-left-radius: 1px; border-bottom-left-radius: 1px; }
.segment:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
`;

export function pipelineChartHtml(model: PipelineChartModel): string {
	const barRows = model.bars.map((bar) => {
		const segments = bar.segments
			.map(
				(segment) =>
					`<span class="segment" style="flex-grow: ${cssNumber(segment.share, "segment share")}; background: ${hexColor(segment.color)};" title="${escapeHtml(segment.task)}"></span>`,
			)
			.join("");
		const badge = bar.fastest ? `<span class="badge">fastest</span>` : "";
		return (
			`<div class="row">${providerMarkup(bar.label, bar.isolation)}` +
			`<div class="bar"><div class="track" style="width: ${px(bar.scaleFraction * TRACK_WIDTH)};">${segments}</div>` +
			`<span class="value"><span class="total">${escapeHtml(bar.total)}</span>${badge}</span></div></div>`
		);
	});

	const disk =
		model.diskNote === null ? "" : ` <span class="disk">${escapeHtml(model.diskNote)}</span>`;

	const document = chartDocument({
		title: model.suiteName,
		summary: model.summary,
		noteHtml: `${inlineMarkdown(model.note)}${disk}`,
		rows: [...barRows, ...model.incomplete.map(disclosureRow)],
		legendItems: model.legend.map((entry) => legendItem(entry.label, entry.color)),
		legendNote: model.legendNote,
		style: STYLE,
	});
	// The WHOLE document, base64 and all — the font payload is ASCII, so scanning it costs one
	// cheap pass and buys coverage over the stylesheet and the licence notice too, not just the
	// interpolated text. Last thing before the string escapes: nothing downstream adds glyphs.
	assertCovered(document);
	return document;
}
