/**
 * `repeatability` — replicate spread per environment, tightest first.
 *
 * The one panel on the page where the categorical provider hues do work, because the rows
 * ARE the environments; the pipeline charts colour by phase instead. Both facts are
 * decisions the page already made, so this reads `repeatability` (already sorted) and
 * `providerSwatch`'s palette rather than re-sorting or re-colouring anything.
 *
 * The bar length is `medianSpread ÷ repeatabilityScaleMax × 62%` of the bar column — the
 * page's own scale, kept so the two unstable environments read as outliers rather than
 * merely as the bottom two rows. The 62 is the page's; changing it here would change what
 * the picture claims.
 */
import type { SandboxBenchmarkData } from "../../../domain/index.ts";
import {
	formatSpreadPct,
	repeatabilityOf,
	repeatabilityScaleMaxOf,
	replicateNOf,
} from "../../../domain/index.ts";
import {
	CONTENT_WIDTH,
	CROP_PADDING,
	pageColors,
	providerHueFallback,
	providerHues,
} from "../../../page-theme.ts";
import type { Block, PageFigureView } from "./blocks.ts";
import { fill, stack, textBlock } from "./blocks.ts";
import { BAR_VALUE, CELL, COLUMN_LABEL, FOOTNOTE } from "./type-scale.ts";

/** `px-4 py-5` inside the panel's 1px border. */
const PAD_X = 16;
const PAD_Y = 20;
/** `grid-cols-[8rem_1fr] gap-x-4`. */
const LABEL_COLUMN = 128;
const COLUMN_GAP = 16;
/** `space-y-3.5` between rows, `h-4` bars, `gap-2.5` after the bar. */
const ROW_GAP = 14;
const BAR_HEIGHT = 16;
const BAR_GAP = 10;
/** The page's own scale factor: a bar at the maximum spread fills 62% of its column. */
const BAR_SCALE_PERCENT = 62;

export function buildRepeatabilityFigure(data: SandboxBenchmarkData): PageFigureView {
	const repeatability = repeatabilityOf(data.dimensionGroups, data.providers);
	const repeatabilityScaleMax = repeatabilityScaleMaxOf(repeatability);
	const replicateN = replicateNOf(data);
	const inner = CONTENT_WIDTH - 2 * PAD_X - 2;
	const barColumn = inner - LABEL_COLUMN - COLUMN_GAP;

	const rows: Block[] = repeatability.map((entry, index) => {
		const hue = providerHues[entry.provider] ?? providerHueFallback;
		const barWidth =
			(entry.medianSpread / repeatabilityScaleMax) * barColumn * (BAR_SCALE_PERCENT / 100);
		return stack(
			"row",
			[
				stack(
					"row",
					[
						fill(8, 8, hue, { radius: 2 }),
						textBlock(entry.name, CELL, pageColors.fg90, { lineHeight: 16 }),
					],
					{ width: LABEL_COLUMN, gap: 6, align: "center", height: BAR_HEIGHT },
				),
				stack(
					"column",
					[
						stack(
							"row",
							[
								// `rounded-r`: the bar grows from a square baseline to a rounded end.
								fill(barWidth, BAR_HEIGHT, hue, { radiusCorners: [0, 4, 4, 0] }),
								textBlock(formatSpreadPct(entry.medianSpread), BAR_VALUE, pageColors.fg, {
									lineHeight: 16,
								}),
								textBlock(`n = ${entry.cells} cells`, FOOTNOTE, pageColors.muted55, {
									lineHeight: 15,
								}),
							],
							{ gap: BAR_GAP, align: "center", height: BAR_HEIGHT },
						),
						textBlock(
							`worst ${formatSpreadPct(entry.worstSpread)} · ${entry.worstLabel}`,
							FOOTNOTE,
							pageColors.muted70,
							{ lineHeight: 12.5, marginTop: 4 },
						),
					],
					{ width: barColumn },
				),
			],
			{
				gap: COLUMN_GAP,
				align: "flex-start",
				marginBottom: index === repeatability.length - 1 ? 0 : ROW_GAP,
			},
		);
	});

	return {
		anchor: "repeatability",
		width: CONTENT_WIDTH + 2 * CROP_PADDING,
		root: stack(
			"column",
			[
				stack(
					"column",
					[
						textBlock(
							`Median replicate spread · n = ${replicateN} sandboxes`,
							COLUMN_LABEL,
							pageColors.muted70,
							{ lineHeight: 15, height: 25 },
						),
					],
					{
						paddingBottom: 12,
						marginBottom: 16,
						borderBottom: pageColors.border40,
						width: inner,
					},
				),
				stack("column", rows, { width: inner }),
			],
			{
				width: CONTENT_WIDTH,
				paddingLeft: PAD_X,
				paddingRight: PAD_X,
				paddingTop: PAD_Y,
				paddingBottom: PAD_Y,
				borderTop: pageColors.border50,
				borderBottom: pageColors.border50,
				borderLeft: pageColors.border50,
				borderRight: pageColors.border50,
				radius: 8,
			},
		),
	};
}
