/**
 * The ranked metric chart, as one self-contained HTML document per metric.
 *
 * The same frame as the pipeline chart (`template.ts`): title and wordmark, eyebrow, note, rows,
 * legend. What differs is the bar: one solid fill per environment rather than stacked segments,
 * and a whisker over it for the interval. The template's arithmetic is geometric only — a bar is
 * `scaleFraction × TRACK_WIDTH`, the whisker runs from `lo × TRACK_WIDTH` to `hi × TRACK_WIDTH` —
 * and every editorial decision arrives made in the {@link MetricChartModel}.
 */

import { assertCovered } from "./fonts.ts";
import type { MetricChartModel } from "./metric-model.ts";
import {
	BAR_HEIGHT,
	chartDocument,
	disclosureRow,
	escapeHtml,
	hexColor,
	inlineMarkdown,
	legendItem,
	providerMarkup,
	px,
} from "./template.ts";

export { FIGURE_WIDTH } from "./template.ts";

/**
 * The full-scale bar's length. Shorter than the pipeline chart's 648 px because the value that
 * follows the longest bar carries a unit (`178100 MB/s`, `0.3312 USD/hr`) and may carry the
 * badge too; 176 px remain for both, which the widest string the catalog produces fits inside.
 */
const TRACK_WIDTH = 560;
/** The whisker: a hairline with short end caps, ringed in the surface colour so it stays
 *  legible where it crosses from the bar onto the page. */
const WHISKER_HEIGHT = 2;
const CAP_HEIGHT = 10;

const STYLE = `.lane { position: relative; height: ${BAR_HEIGHT}px; }
.fill { position: absolute; left: 0; top: 0; height: ${BAR_HEIGHT}px; border-radius: 1px 4px 4px 1px; }
.whisker { position: absolute; top: ${px((BAR_HEIGHT - WHISKER_HEIGHT) / 2)}; height: ${WHISKER_HEIGHT}px; box-shadow: 0 0 0 1px #ffffff; }
.cap { position: absolute; top: ${px((BAR_HEIGHT - CAP_HEIGHT) / 2)}; width: ${WHISKER_HEIGHT}px; height: ${CAP_HEIGHT}px; box-shadow: 0 0 0 1px #ffffff; }
`;

export function metricChartHtml(model: MetricChartModel): string {
	const barColor = hexColor(model.legend[0]?.color ?? "#000000");
	const whiskerColor = hexColor(model.legend[1]?.color ?? "#222222");
	const barRows = model.bars.map((bar) => {
		const barWidth = bar.scaleFraction * TRACK_WIDTH;
		// The lane spans the bar OR the whisker, whichever reaches further, so the value never sits
		// on top of an interval that runs past the bar.
		const reach = Math.max(barWidth, (bar.interval?.hi ?? 0) * TRACK_WIDTH);
		const whisker = bar.interval
			? `<span class="whisker" style="left: ${px(bar.interval.lo * TRACK_WIDTH)}; width: ${px((bar.interval.hi - bar.interval.lo) * TRACK_WIDTH)}; background: ${whiskerColor};"></span>` +
				`<span class="cap" style="left: ${px(bar.interval.lo * TRACK_WIDTH)}; background: ${whiskerColor};"></span>` +
				`<span class="cap" style="left: ${px(bar.interval.hi * TRACK_WIDTH - 2)}; background: ${whiskerColor};"></span>`
			: "";
		const badge = bar.best ? `<span class="badge">best</span>` : "";
		return (
			`<div class="row">${providerMarkup(bar.label, bar.isolation)}` +
			`<div class="bar"><div class="lane" style="width: ${px(reach)};">` +
			`<span class="fill" style="width: ${px(barWidth)}; background: ${barColor};"></span>${whisker}</div>` +
			`<span class="value"><span class="total">${escapeHtml(bar.value)}</span>${badge}</span></div></div>`
		);
	});

	const document = chartDocument({
		title: model.title,
		summary: model.summary,
		noteHtml: inlineMarkdown(model.note),
		rows: [...barRows, ...model.unmeasured.map(disclosureRow)],
		legendItems: model.legend.map((entry) => legendItem(entry.label, entry.color)),
		legendNote: model.legendNote,
		style: STYLE,
	});
	assertCovered(document);
	return document;
}
