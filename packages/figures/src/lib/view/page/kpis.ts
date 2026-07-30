/**
 * `kpis` — the headline KPI band above the pipeline charts (`StatBand` on the page).
 *
 * Four cells on one row of a `grid-cols-4 gap-x-6` inside the 896px content column, so
 * each is `(896 - 3 × 24) / 4 = 206` wide. The band is fenced by a 1px rule top and
 * bottom with 28px of air inside it.
 *
 * Every string comes from the `headlineStats` the SITE computes and the page renders
 * through unchanged — the figure formats nothing and derives nothing, and it is handed
 * the band rather than reaching for it, so the figure and the page cannot end up reading
 * two different computations of the same four numbers. The band leads with a teal value
 * because the page does (`i === 0`), and that is a claim about which number is the
 * headline, so it is carried rather than re-decided here.
 */
import { CONTENT_WIDTH, CROP_PADDING, pageColors } from "../../../page-theme.ts";
import { wrapText } from "../text.ts";
import type { Block, PageFigureView } from "./blocks.ts";
import { stack, textBlock } from "./blocks.ts";
import type { PageFigureContent } from "./content.ts";
import { KPI_LABEL, KPI_SUB, KPI_VALUE } from "./type-scale.ts";

/** `gap-x-6`. */
const GAP = 24;
/** `py-7` inside the band's two rules. */
const PAD_Y = 28;
/** Line heights, read off the page: `text-4xl` is 36/36, `text-sm` 14/20, the mono
 *  sub-line 11/16.5. */
const VALUE_LH = 36;
const LABEL_LH = 20;
const SUB_LH = 16.5;

export function buildKpisFigure(headlineStats: PageFigureContent["headlineStats"]): PageFigureView {
	const columns = 4;
	const cellWidth = (CONTENT_WIDTH - GAP * (columns - 1)) / columns;

	const cells: Block[] = headlineStats.map((stat, index) => {
		const label = wrapText(stat.label, KPI_LABEL, cellWidth);
		const sub = wrapText(stat.sub, KPI_SUB, cellWidth);
		return stack(
			"column",
			[
				textBlock(stat.value, KPI_VALUE, index === 0 ? pageColors.teal : pageColors.fg, {
					lineHeight: VALUE_LH,
					height: VALUE_LH,
				}),
				stack(
					"column",
					label.lines.map((line) =>
						textBlock(line.text, KPI_LABEL, pageColors.fg, { lineHeight: LABEL_LH }),
					),
					// `mt-2.5` on the label block.
					{ marginTop: 10 },
				),
				stack(
					"column",
					sub.lines.map((line) =>
						textBlock(line.text, KPI_SUB, pageColors.muted70, { lineHeight: SUB_LH }),
					),
					// `mt-0.5` on the sub-line block.
					{ marginTop: 2 },
				),
			],
			{ width: cellWidth },
		);
	});

	return {
		anchor: "kpis",
		width: CONTENT_WIDTH + 2 * CROP_PADDING,
		root: stack("row", cells, {
			gap: GAP,
			width: CONTENT_WIDTH,
			paddingTop: PAD_Y,
			paddingBottom: PAD_Y,
			borderTop: pageColors.border40,
			borderBottom: pageColors.border40,
			align: "flex-start",
		}),
	};
}
