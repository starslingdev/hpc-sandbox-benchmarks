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
 * like. The one piece of arithmetic here is the track: a bar's drawn length is
 * `scaleFraction × TRACK_WIDTH` with TRACK_WIDTH constant across every chart, which is the
 * whole mechanism behind "a second is the same length in all of them". Within a bar the
 * browser distributes the track by `flex-grow: share`, which reproduces the page's
 * gap-then-proportion layout without any of the width bookkeeping the satori renderer
 * needed — flexbox with `gap` IS that algorithm.
 */
import { pageColors } from "../page-theme.ts";
import { assertCovered, fontFaceCss } from "./fonts.ts";
import type { PipelineChartModel } from "./model.ts";

/** Canvas width in CSS px, padding included — every chart, fixed, so the three figures sit
 *  on the page as one column. 2× this is the committed PNG's pixel width. */
export const FIGURE_WIDTH = 960;
/** Margin around the content, matching the crops the old pipeline was calibrated against. */
const PADDING = 24;
/** `grid-cols-[8rem_1fr] gap-x-4` — the provider label column and the gutter after it. */
const LABEL_COLUMN = 128;
const COLUMN_GAP = 16;
/**
 * The full-scale bar's length. Fixed rather than solved from the content: with the label
 * column, the gutter and the padding spoken for, 88 px remain for the total that follows
 * the longest bar — enough for any `formatSeconds` string the domain produces. A total the
 * canvas cannot fit would overflow INTO the padding and still be captured, not clipped;
 * ugly beats silently sliced, and the eyeball pass catches ugly.
 */
const TRACK_WIDTH = 680;
/** `h-5` bars with a `gap-[2px]` between task segments and `gap-2.5` before the total. */
const BAR_HEIGHT = 20;
const SEGMENT_GAP = 2;
const TOTAL_GAP = 10;
/** `space-y-3` between bar rows. */
const ROW_GAP = 12;
/** `max-w-2xl` on the authored note. */
const NOTE_WIDTH = 672;

// Every stack ends on Geist before the generic: Geist Mono and Afacad lack `†` and `→`, and the
// embedded Geist Sans subset has both — so the fallback glyph is a brand glyph, not a foreign
// face. The generic keyword is the last resort the coverage check exists to keep unreachable.
const MONO = `"Geist Mono", Geist, monospace`;
const SANS = `Geist, sans-serif`;
const HEADING = `Afacad, Geist, sans-serif`;

/** `Bun.escapeHTML`: native, single-pass, and escapes the full set (`& < > " '`) — apostrophes
 *  too, which the hand-rolled version it replaced left raw in attribute values. */
const escapeHtml = Bun.escapeHTML;

/**
 * The note's inline markdown, rendered rather than stripped. The satori pipeline stripped
 * `**` and `` ` `` because it could not change weight or face mid-paragraph; a browser can,
 * so the authored emphasis survives. Escaping happens FIRST — the markdown delimiters are
 * matched in already-escaped text, so an author writing literal `<` or `&` gets a character,
 * never markup.
 */
function inlineMarkdown(text: string): string {
	// Code spans FIRST, then bold only OUTSIDE them — the order real markdown implies. Bold
	// applied to the whole string would pair `**` ACROSS code spans (two glob patterns in
	// backticks become one mangled <strong> run, backticks swallowed), and the corrupted text
	// would render into the published figure.
	return escapeHtml(text)
		.split(/(`[^`]+`)/)
		.map((chunk) =>
			chunk.startsWith("`") && chunk.endsWith("`") && chunk.length > 1
				? `<code>${chunk.slice(1, -1)}</code>`
				: chunk.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>"),
		)
		.join("");
}

/** Fixed-point CSS px. Two decimals is beyond what a 2× rasteriser can draw, and a stable
 *  formatting keeps the HTML byte-deterministic across runs. */
function px(value: number): string {
	return `${value.toFixed(2)}px`;
}

/**
 * A colour is only ever interpolated into a `style` attribute after this check. Every colour in
 * a real model comes from the package's own ramp, but the model is a public type, and a string
 * like `red;" onload="…` inside an attribute is markup, not paint — `escapeHtml` cannot help
 * because valid CSS (`url(...)`) can smuggle a fetch without any HTML metacharacter. Hex is the
 * one format the theme uses, so hex is the one format the template accepts.
 */
function hexColor(value: string): string {
	if (!/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
		throw new Error(
			`chart colour ${JSON.stringify(value)} is not a hex colour — refusing to interpolate it into a style attribute`,
		);
	}
	return value;
}

/**
 * The same check for the one bare number that reaches a `style` attribute. `flex-grow` takes the
 * share unformatted — no unit, no rounding — so unlike the lengths that pass through {@link px}
 * (where `toFixed` alone forces digits) nothing about the interpolation constrains it to a number.
 * The type says `number`, but {@link PipelineChartModel} is exported and TypeScript is not a
 * runtime, so a JS caller's `"1; background: url(…)"` would land in the declaration intact and
 * hand the document an external fetch — the exact hole `hexColor` closes for paint.
 */
function cssNumber(value: number, label: string): string {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error(
			`chart ${label} ${JSON.stringify(value)} is not a finite non-negative number — refusing to interpolate it into a style attribute`,
		);
	}
	return String(value);
}

const STYLE = `
* { box-sizing: border-box; }
body { margin: 0; background: ${pageColors.bg}; }
.figure { width: ${FIGURE_WIDTH}px; padding: ${PADDING}px; background: ${pageColors.bg}; }
header { display: flex; align-items: baseline; gap: ${COLUMN_GAP}px; margin: 0 0 6px; }
h1 { margin: 0; font: 500 24px/32px ${HEADING}; color: ${pageColors.fg}; }
.summary { margin: 0; font: 400 11px/16.5px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.muted70}; }
.note { margin: 0 0 20px; max-width: ${NOTE_WIDTH}px; font: 400 14px/22.75px ${SANS}; color: ${pageColors.muted}; }
.note code { font: 400 13px ${MONO}; }
.note .disk { font: 400 11px ${MONO}; color: ${pageColors.muted40}; }
.legend { display: flex; align-items: center; gap: ${COLUMN_GAP}px; margin: 0 0 ${COLUMN_GAP}px; padding: 0; list-style: none; font: 400 11px/16.5px ${MONO}; color: ${pageColors.muted}; }
.legend li { display: flex; align-items: center; gap: 6px; }
.swatch { width: 10px; height: 10px; border-radius: 2px; }
.legend-note { font: 400 10px/15px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.muted50}; }
.row { display: flex; align-items: center; gap: ${COLUMN_GAP}px; min-height: ${BAR_HEIGHT}px; }
.row + .row { margin-top: ${ROW_GAP}px; }
.provider { flex: 0 0 ${LABEL_COLUMN}px; font: 400 12px/16px ${MONO}; color: ${pageColors.fg90}; }
.bar { display: flex; align-items: center; gap: ${TOTAL_GAP}px; }
.track { display: flex; gap: ${SEGMENT_GAP}px; height: ${BAR_HEIGHT}px; }
.segment { flex-shrink: 1; flex-basis: 0; }
.segment:first-child { border-top-left-radius: 1px; border-bottom-left-radius: 1px; }
.segment:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.value { display: flex; align-items: center; gap: 8px; }
.total { font: 600 13px/17.33px ${MONO}; color: ${pageColors.fg}; white-space: nowrap; }
.badge { font: 400 9px/13.5px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.teal}; border: 1px solid ${pageColors.tealBorder}; border-radius: 4px; padding: 1px 4px; white-space: nowrap; }
.incomplete { align-items: flex-start; }
.incomplete .provider { color: ${pageColors.muted50}; }
.gap { font: 400 11px/16.5px ${MONO}; color: ${pageColors.muted50}; }
`;

export function pipelineChartHtml(model: PipelineChartModel): string {
	const legend = model.legend
		.map(
			(entry) =>
				`<li><span class="swatch" style="background: ${hexColor(entry.color)};"></span>${escapeHtml(entry.label)}</li>`,
		)
		.join("");

	const barRows = model.bars.map((bar) => {
		const segments = bar.segments
			.map(
				(segment) =>
					`<span class="segment" style="flex-grow: ${cssNumber(segment.share, "segment share")}; background: ${hexColor(segment.color)};" title="${escapeHtml(segment.task)}"></span>`,
			)
			.join("");
		const badge = bar.fastest ? `<span class="badge">fastest</span>` : "";
		return (
			`<div class="row"><span class="provider">${escapeHtml(bar.label)}</span>` +
			`<div class="bar"><div class="track" style="width: ${px(bar.scaleFraction * TRACK_WIDTH)};">${segments}</div>` +
			`<span class="value"><span class="total">${escapeHtml(bar.total)}</span>${badge}</span></div></div>`
		);
	});

	const incompleteRows = model.incomplete.map(
		(row) =>
			`<div class="row incomplete"><span class="provider">${escapeHtml(row.label)}</span>` +
			`<span class="gap">${escapeHtml(row.outcome)} · ${escapeHtml(row.reason)}</span></div>`,
	);

	const disk =
		model.diskNote === null ? "" : ` <span class="disk">${escapeHtml(model.diskNote)}</span>`;

	const document = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(model.suiteName)}</title>
<style>
${fontFaceCss()}
${STYLE}
</style>
</head>
<body>
<main class="figure">
<header><h1>${escapeHtml(model.suiteName)}</h1><p class="summary">${escapeHtml(model.summary)}</p></header>
<p class="note">${inlineMarkdown(model.note)}${disk}</p>
<ul class="legend">${legend}<li class="legend-note">${escapeHtml(model.legendNote)}</li></ul>
<section>
${[...barRows, ...incompleteRows].join("\n")}
</section>
</main>
</body>
</html>
`;
	// The WHOLE document, base64 and all — the font payload is ASCII, so scanning it costs one
	// cheap pass and buys coverage over the stylesheet and the licence notice too, not just the
	// interpolated text. Last thing before the string escapes: nothing downstream adds glyphs.
	assertCovered(document);
	return document;
}
