/**
 * What every chart document shares: the canvas geometry, the brand faces, the escaping helpers
 * and the base stylesheet — one copy, so the pipeline chart and the metric chart are two views of
 * one figure style rather than two styles that happen to look alike today.
 *
 * Everything here is string building. The templates that import it (`html.ts` for the stacked
 * pipeline chart, `metric-html.ts` for the single-metric bar chart) add only the rules and markup
 * their own bars need.
 */
import { pageColors } from "../page-theme.ts";
import { fontFaceCss } from "./fonts.ts";
import {
	WORDMARK_ASPECT,
	WORDMARK_BASELINE_RATIO,
	WORDMARK_CAP_RATIO,
	WORDMARK_SVG,
} from "./wordmark.ts";

/** Canvas width in CSS px, padding included — every chart, fixed, so the figures sit on the
 *  page as one column. 2× this is the committed WebP's pixel width. */
export const FIGURE_WIDTH = 960;
/** Margin around the content, matching the crops the old pipeline was calibrated against. */
export const PADDING = 24;
/**
 * The provider label column and the gutter after it.
 *
 * 160 px is the isolation chip's budget, not the provider name's: the widest chip the chip
 * vocabulary produces (`microVM` + `dedicated instance`) measures 154 px, and the column has to
 * hold it because the column is what puts every track on the same origin. Sized at the name
 * alone (the 128 px this used to be) the chip became the cell's min-content width and pushed
 * THAT ROW'S bar right — one row starting 26 px further in than the seven under it, which is
 * the misalignment `min-width: 0` below now makes structurally impossible.
 */
export const LABEL_COLUMN = 160;
export const COLUMN_GAP = 16;
/** `h-5` bars with a `gap-[2px]` between task segments and `gap-2.5` before the total. */
export const BAR_HEIGHT = 20;
export const SEGMENT_GAP = 2;
export const TOTAL_GAP = 10;
/** `space-y-3` between bar rows. */
export const ROW_GAP = 12;
/**
 * The title's own metrics, at `500 24px Afacad`, READ OFF THE PINNED FACE rather than assumed —
 * canvas `TextMetrics` in the rendered document, which is the only thing that knows what the
 * embedded woff2 actually draws. Afacad's caps are 15 px at 24 px (0.625 em, not the ~0.7 a
 * generic sans would give: assuming that made the wordmark 12% oversized), and its ascent+descent
 * come to exactly the 32 px line box, so the baseline sits flush at 24 px with no half-leading to
 * account for. The lockfile pins the glyphs, so these are as fixed as the font-size beside them.
 */
const TITLE_CAP_HEIGHT = 15;
const TITLE_BASELINE = 24;
/**
 * The wordmark's drawn height, solved from the title rather than guessed.
 *
 * The artwork is a lockup — a disc that fills its box, and letterforms that occupy the middle
 * {@link WORDMARK_CAP_RATIO} of it — so matching its BOX to the title's 24 px would set
 * `STARSLING` at about 11 px and read as a footnote beside the name. Cap height to cap height is
 * what "the size of the title" means to the eye, so that is what this solves.
 */
const WORDMARK_HEIGHT = Math.round(TITLE_CAP_HEIGHT / WORDMARK_CAP_RATIO);
/**
 * Where the artwork's box starts, so its letterforms sit in the title's cap band.
 *
 * Solved, not aligned: `align-items` has no setting that means "put THIS part of a replaced
 * element on the text's baseline" — Chrome offers the box's bottom edge and nothing else (which
 * is why `baseline` floated the mark 10 px high, and why a negative bottom margin did not move
 * it). Sizing to the cap band already makes the two cap heights equal, so landing the baselines
 * lands the cap tops too, and this is the one number that does it: the title's baseline, less
 * however far the wordmark's own baseline sits down its box. It comes out near zero at this size,
 * which is a coincidence of the two ratios and not a licence to drop the term.
 */
const WORDMARK_TOP = TITLE_BASELINE - WORDMARK_HEIGHT * WORDMARK_BASELINE_RATIO;

// Every stack ends on Geist before the generic: Geist Mono and Afacad lack `†` and `→`, and the
// embedded Geist Sans subset has both — so the fallback glyph is a brand glyph, not a foreign
// face. The generic keyword is the last resort the coverage check exists to keep unreachable.
export const MONO = `"Geist Mono", Geist, monospace`;
export const SANS = `Geist, sans-serif`;
export const HEADING = `Afacad, Geist, sans-serif`;

/** `Bun.escapeHTML`: native, single-pass, and escapes the full set (`& < > " '`) — apostrophes
 *  too, which the hand-rolled version it replaced left raw in attribute values. */
export const escapeHtml = Bun.escapeHTML;

/**
 * The note's inline markdown, rendered rather than stripped. The satori pipeline stripped
 * `**` and `` ` `` because it could not change weight or face mid-paragraph; a browser can,
 * so the authored emphasis survives. Escaping happens FIRST — the markdown delimiters are
 * matched in already-escaped text, so an author writing literal `<` or `&` gets a character,
 * never markup.
 */
export function inlineMarkdown(text: string): string {
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
export function px(value: number): string {
	return `${value.toFixed(2)}px`;
}

/**
 * A colour is only ever interpolated into a `style` attribute after this check. Every colour in
 * a real model comes from the package's own ramp, but the model is a public type, and a string
 * like `red;" onload="…` inside an attribute is markup, not paint — `escapeHtml` cannot help
 * because valid CSS (`url(...)`) can smuggle a fetch without any HTML metacharacter. Hex is the
 * one format the theme uses, so hex is the one format the template accepts.
 */
export function hexColor(value: string): string {
	if (!/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value)) {
		throw new Error(
			`chart colour ${JSON.stringify(value)} is not a hex colour — refusing to interpolate it into a style attribute`,
		);
	}
	return value;
}

/**
 * The same check for a bare number that reaches a `style` attribute. `flex-grow` takes the
 * share unformatted — no unit, no rounding — so unlike the lengths that pass through {@link px}
 * (where `toFixed` alone forces digits) nothing about the interpolation constrains it to a number.
 * The model types say `number`, but they are exported and TypeScript is not a runtime, so a JS
 * caller's `"1; background: url(…)"` would land in the declaration intact and hand the document
 * an external fetch — the exact hole `hexColor` closes for paint.
 */
export function cssNumber(value: number, label: string): string {
	if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
		throw new Error(
			`chart ${label} ${JSON.stringify(value)} is not a finite non-negative number — refusing to interpolate it into a style attribute`,
		);
	}
	return String(value);
}

/** The rules every chart document shares: page, header, note, legend, rows and the provider
 *  column. A template appends the rules for its own kind of bar. */
export const BASE_STYLE = `
* { box-sizing: border-box; }
body { margin: 0; background: ${pageColors.bg}; }
.figure { width: ${FIGURE_WIDTH}px; padding: ${PADDING}px; background: ${pageColors.bg}; }
/* The title anchors the row's top edge and the wordmark is placed against it by WORDMARK_TOP —
   hence flex-start, which is the only alignment that leaves that offset meaning what it says.
   An auto left margin rather than justify-content, so the mark still sits on the right edge if
   the row ever gains a third element. */
header { display: flex; align-items: flex-start; gap: 24px; margin: 0 0 4px; }
h1 { margin: 0; font: 500 24px/32px ${HEADING}; color: ${pageColors.fg}; }
.wordmark { flex: 0 0 auto; margin: ${px(WORDMARK_TOP)} 0 0 auto; width: ${px(WORDMARK_HEIGHT * WORDMARK_ASPECT)}; height: ${px(WORDMARK_HEIGHT)}; color: ${pageColors.fg}; }
.summary { margin: 0 0 14px; font: 400 11px/16.5px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.muted70}; }
.note { margin: 0 0 24px; font: 400 14px/22.75px ${SANS}; color: ${pageColors.muted}; }
.note code { font: 400 13px ${MONO}; }
/* The disk aside wraps as ONE unit. It is a parenthetical in a different face at a different
   size, so a line break through the middle of it ("Needs 30 GB" / "free disk.") reads as two
   fragments rather than one aside — the full-width note made that break reachable. It is ~145 px
   at its longest, so refusing to break it can never overflow a 912 px line. */
.note .disk { white-space: nowrap; font: 400 11px ${MONO}; color: ${pageColors.muted40}; }
.legend { display: flex; align-items: center; gap: ${COLUMN_GAP}px; margin: 22px 0 0; padding: 14px 0 0; border-top: 1px solid ${pageColors.muted40}; list-style: none; font: 400 11px/16.5px ${MONO}; color: ${pageColors.muted}; }
.legend li { display: flex; align-items: center; gap: 6px; }
.swatch { width: 10px; height: 10px; border-radius: 2px; }
.legend-note { margin-left: auto; font: 400 10px/15px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.muted50}; }
.row { display: flex; align-items: center; gap: ${COLUMN_GAP}px; min-height: ${BAR_HEIGHT}px; }
.row + .row { margin-top: ${ROW_GAP}px; }
.provider { flex: 0 0 ${LABEL_COLUMN}px; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; font: 400 12px/16px ${MONO}; color: ${pageColors.fg90}; }
.provider-title { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.isolation-chip { display: inline-flex; align-items: stretch; max-width: 100%; overflow: hidden; border: 1px solid ${pageColors.muted40}; border-radius: 4px; font: 400 9px/13.5px ${MONO}; color: ${pageColors.muted70}; white-space: nowrap; }
.isolation-chip span { flex: 0 0 auto; padding: 1px 4px; }
.isolation-chip span + span { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; border-left: 1px solid ${pageColors.muted40}; color: ${pageColors.teal}; }
.bar { display: flex; align-items: center; gap: ${TOTAL_GAP}px; }
.value { display: flex; align-items: center; gap: 8px; }
.total { font: 600 13px/17.33px ${MONO}; color: ${pageColors.fg}; white-space: nowrap; }
.badge { font: 400 9px/13.5px ${MONO}; letter-spacing: 0.14em; text-transform: uppercase; color: ${pageColors.teal}; border: 1px solid ${pageColors.tealBorder}; border-radius: 4px; padding: 1px 4px; white-space: nowrap; }
.incomplete { align-items: flex-start; }
.incomplete .provider { color: ${pageColors.muted50}; }
.gap { font: 400 11px/16.5px ${MONO}; color: ${pageColors.muted50}; }
`;

/** A provider cell: the concise title, and the isolation chip beneath it when metadata was
 *  available. Shared so a provider looks the same on every kind of row in every kind of chart. */
export function providerMarkup(
	label: string,
	isolation: { readonly kind: string; readonly technology: string } | undefined,
): string {
	const chip = isolation
		? `<span class="isolation-chip"><span>${escapeHtml(isolation.kind)}</span><span>${escapeHtml(isolation.technology)}</span></span>`
		: "";
	return `<span class="provider"><span class="provider-title">${escapeHtml(label)}</span>${chip}</span>`;
}

/** A disclosure row: an environment named with no bar, and the outcome and reason instead. */
export function disclosureRow(row: {
	readonly label: string;
	readonly isolation?: { readonly kind: string; readonly technology: string };
	readonly outcome: string;
	readonly reason: string;
}): string {
	return (
		`<div class="row incomplete">${providerMarkup(row.label, row.isolation)}` +
		`<span class="gap">${escapeHtml(row.outcome)} · ${escapeHtml(row.reason)}</span></div>`
	);
}

/** One legend entry: a swatch of `color` beside `label`. */
export function legendItem(label: string, color: string): string {
	return `<li><span class="swatch" style="background: ${hexColor(color)};"></span>${escapeHtml(label)}</li>`;
}

/**
 * The document frame every chart shares: title and wordmark, the eyebrow, the note, the rows,
 * the legend footer. Reading order is document order — that is the structure, not the styling —
 * so the frame owns it and a template supplies only the pieces.
 */
export function chartDocument(parts: {
	readonly title: string;
	readonly summary: string;
	/** Already-rendered note markup (see {@link inlineMarkdown}). */
	readonly noteHtml: string;
	readonly rows: readonly string[];
	/** Already-rendered `<li>` entries. */
	readonly legendItems: readonly string[];
	readonly legendNote: string;
	/** The template's own rules, appended after {@link BASE_STYLE}. */
	readonly style: string;
}): string {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(parts.title)}</title>
<style>
${fontFaceCss()}
${BASE_STYLE}${parts.style}</style>
</head>
<body>
<main class="figure">
<header><h1>${escapeHtml(parts.title)}</h1>${WORDMARK_SVG}</header>
<p class="summary">${escapeHtml(parts.summary)}</p>
<p class="note">${parts.noteHtml}</p>
<section>
${parts.rows.join("\n")}
</section>
<ul class="legend">${parts.legendItems.join("")}<li class="legend-note">${escapeHtml(parts.legendNote)}</li></ul>
</main>
</body>
</html>
`;
}
