/**
 * The comparison chart, as one self-contained HTML document per suite: the pipeline chart's
 * frame and bars, with each environment's row holding two stacked bars — the older run's
 * (faded) over the newer run's — each chipped with its run label, and the delta beside the
 * newer total.
 */

import { pageColors } from "../page-theme.ts";
import type { ComparisonChartModel, ComparisonChartRow } from "./comparison-model.ts";
import { assertCovered } from "./fonts.ts";
import {
	BAR_HEIGHT,
	chartDocument,
	cssNumber,
	escapeHtml,
	hexColor,
	inlineMarkdown,
	legendItem,
	MONO,
	providerMarkup,
	px,
	SEGMENT_GAP,
} from "./template.ts";

export { FIGURE_WIDTH } from "./template.ts";

/**
 * The full-scale bar's length. Shorter than the single-run chart's 648 px: each lane also
 * carries a run chip before the track and, on the newer lane, a delta after the total, so
 * 88 px of slack would not hold `1472.8 s` + `fastest` + `-12.3%`.
 */
const TRACK_WIDTH = 520;
/** The run chip's column: wide enough for `Sep 2026` in the chip face. */
const CHIP_COLUMN = 64;
/** Vertical gap between the two lanes of one environment's pair. */
const PAIR_GAP = 4;
/** How light the older run's bars are drawn. */
const FADED_OPACITY = 0.45;

const STYLE = `.pair { display: flex; flex-direction: column; gap: ${PAIR_GAP}px; }
.lane { display: flex; align-items: center; gap: 10px; min-height: ${BAR_HEIGHT}px; }
/* A lane carrying a reason instead of a bar may wrap over several lines: it grows, and its
   chip sits on the first line rather than the vertical middle of the paragraph. */
.lane.text { align-items: flex-start; }
.lane.text .run-chip { line-height: 16.5px; }
.run-chip { flex: 0 0 ${CHIP_COLUMN}px; font: 400 9px/13.5px ${MONO}; letter-spacing: 0.1em; text-transform: uppercase; color: ${pageColors.muted70}; white-space: nowrap; }
.track { display: flex; gap: ${SEGMENT_GAP}px; height: ${BAR_HEIGHT}px; }
.track.faded { opacity: ${FADED_OPACITY}; }
.segment { flex-shrink: 1; flex-basis: 0; }
.segment:first-child { border-top-left-radius: 1px; border-bottom-left-radius: 1px; }
.segment:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.delta { font: 600 11px/16.5px ${MONO}; white-space: nowrap; }
.delta.faster { color: ${pageColors.teal}; }
.delta.slower { color: ${pageColors.fg}; }
.delta.same { color: ${pageColors.muted}; }
.row.compare { align-items: center; }
.row.compare.incomplete { align-items: flex-start; }
.row.compare + .row.compare { margin-top: 16px; }
.row.incomplete .pair { gap: 2px; }
`;

function lane(side: ComparisonChartRow["before"], delta: ComparisonChartRow["delta"]): string {
	if (!("bar" in side)) {
		return (
			`<div class="lane text"><span class="run-chip">${escapeHtml(side.runLabel)}</span>` +
			`<span class="gap">${escapeHtml(side.outcome)} · ${escapeHtml(side.reason)}</span></div>`
		);
	}
	const { bar } = side;
	const segments = bar.segments
		.map(
			(segment) =>
				`<span class="segment" style="flex-grow: ${cssNumber(segment.share, "segment share")}; background: ${hexColor(segment.color)};" title="${escapeHtml(segment.task)}"></span>`,
		)
		.join("");
	const badge = bar.fastest ? `<span class="badge">fastest</span>` : "";
	const change =
		delta && !bar.faded
			? `<span class="delta ${delta.direction}">${escapeHtml(delta.text)}</span>`
			: "";
	return (
		`<div class="lane"><span class="run-chip">${escapeHtml(bar.runLabel)}</span>` +
		`<div class="track${bar.faded ? " faded" : ""}" style="width: ${px(bar.scaleFraction * TRACK_WIDTH)};">${segments}</div>` +
		`<span class="value"><span class="total">${escapeHtml(bar.total)}</span>${badge}${change}</span></div>`
	);
}

export function comparisonChartHtml(model: ComparisonChartModel): string {
	const rows = model.rows.map(
		(row) =>
			`<div class="row compare">${providerMarkup(row.label, row.isolation)}` +
			`<div class="pair">${lane(row.before, row.delta)}${lane(row.after, row.delta)}</div></div>`,
	);
	const incomplete = model.incomplete.map(
		(row) =>
			`<div class="row compare incomplete">${providerMarkup(row.label, row.isolation)}<div class="pair">` +
			row.reasons
				.map(
					(reason) =>
						`<div class="lane text"><span class="run-chip">${escapeHtml(reason.runLabel)}</span>` +
						`<span class="gap">${escapeHtml(reason.outcome)} · ${escapeHtml(reason.reason)}</span></div>`,
				)
				.join("") +
			`</div></div>`,
	);
	const disk =
		model.diskNote === null ? "" : ` <span class="disk">${escapeHtml(model.diskNote)}</span>`;
	const document = chartDocument({
		title: model.suiteName,
		summary: model.summary,
		noteHtml: `${inlineMarkdown(model.note)}${disk}`,
		rows: [...rows, ...incomplete],
		legendItems: model.legend.map((entry) => legendItem(entry.label, entry.color)),
		legendNote: model.legendNote,
		style: STYLE,
	});
	assertCovered(document);
	return document;
}
