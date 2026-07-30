/**
 * `all-metrics` — every catalogued metric this run emitted, grouped by the dataset's own
 * dimensions. The densest figure in the set and the one with the most to get wrong.
 *
 * EVERY DERIVATION COMES FROM the package's own `domain/` layer, the same functions the
 * page renders through: `bestP50` for the leader, `metricSpread` for the Spread column,
 * `ratioTintStep` for how deep a cell's amber wash goes, `formatMetricValue` for the
 * number itself, `shortRowLabel` and `displayUnit` for the label. Re-deriving any of them
 * would let a share image disagree with the table it reproduces about a value, which is
 * the one thing these figures exist to make impossible.
 *
 * THE INTEGRITY RULES ARE THE PAGE'S, CARRIED:
 *
 *  - A `best` marker needs at least TWO measured values in the row. One provider's number
 *    is not the best of anything, and marking it would claim a comparison the run did not
 *    make.
 *  - A gap is the explicit `–` placeholder. Never blank (which reads as a broken render),
 *    never zero (which reads as a measurement).
 *  - `‡` on a backfilled cell, with `backfillNote` under the table. A marker whose legend
 *    was cropped away is worse than no marker.
 *
 * THE PER-CELL RATIOS ARE OMITTED, matching the crop rather than the page: the snapshot
 * script hides `[data-cell-ratio]` before capturing, because the share images keep the
 * multiplier story in the Spread column only. The `best` markers stay.
 */
import type { MetricTableRow, SandboxBenchmarkData } from "../../../domain/index.ts";
import {
	backfillNoteOf,
	bestP50,
	dimensionLabels,
	displayUnit,
	formatMetricValue,
	formatSpread,
	metricRatio,
	metricSpread,
	ratioTintStep,
	shortRowLabel,
} from "../../../domain/index.ts";
import { CONTENT_WIDTH, CROP_PADDING, pageColors } from "../../../page-theme.ts";
import type { TextStyle } from "../text.ts";
import { textWidth, wrapText } from "../text.ts";
import type { Block, PageFigureView, TextBlock } from "./blocks.ts";
import { stack, textBlock } from "./blocks.ts";
import type { CellLine, TableCell, TableRow } from "./table.ts";
import { buildTable } from "./table.ts";
import {
	CELL,
	COLUMN_LABEL,
	FOOTNOTE,
	PROSE_SMALL,
	PROSE_SMALL_MEDIUM,
	PROVIDER_HEADER,
} from "./type-scale.ts";

/** `px-4` on the metric and spread columns, `px-3` on the value columns. */
const PAD_X = 16;
const VALUE_PAD_X = 12;
const HEAD_PAD_Y = 12;
const BODY_PAD_Y = 10;
/** Line heights and the value cell's two-line structure, read off the page. */
const LABEL_LH = 14.2857;
const HEAD_CELL_LH = 16;
const VALUE_LINE = 20;
const MARKER_LINE = 12.5;
const MARKER_GAP = 2;
const BAND_LH = 14.2857;
const NOTE_LH = 16.25;

/** `font-mono text-[10px]` — the unit / direction suffix beside a metric label. */
const UNIT: TextStyle = { stack: "mono", size: 10, weight: 400 };
/** `font-mono text-[10px] uppercase tracking-[0.2em] font-bold` — a dimension band. */
const BAND: TextStyle = { stack: "mono", size: 10, weight: 700, letterSpacing: 2, uppercase: true };
/** The `‡` superscript on a backfilled value, and the `best` marker under it. */
const SUP: TextStyle = { stack: "mono", size: 9, weight: 400 };
const MARKER: TextStyle = { stack: "mono", size: 10, weight: 400 };
/** `font-mono text-[11px]` — the Spread column. */
const SPREAD: TextStyle = { stack: "mono", size: 11, weight: 400 };

/** The unit/direction suffix, plus `∑` on a derived row. Assembled as one run so it
 *  measures and wraps as the page's single `<span>` does. */
function unitSuffix(row: MetricTableRow): string {
	return `${displayUnit(row.unit)} ${row.direction === "LIB" ? "↓" : "↑"}${row.derived ? " ∑" : ""}`;
}

/** The metric-name cell: label, unit suffix, and the `headline` tag on a dimension's
 *  headline metric. One line, `whitespace-nowrap` on the page. */
function labelCell(row: MetricTableRow): TableCell {
	const isTotal = row.id.endsWith("_total");
	const style = isTotal ? PROSE_SMALL_MEDIUM : PROSE_SMALL;
	const color = isTotal ? pageColors.fg : row.indent ? pageColors.fg75 : pageColors.fg90;
	const label = shortRowLabel(row);
	const suffix = unitSuffix(row);
	// `pl-9` and a 2px left rule on an indented task row; `px-4` otherwise.
	const padLeft = row.indent ? 36 : PAD_X;
	const width =
		textWidth(label, style) +
		8 +
		textWidth(suffix, UNIT) +
		(row.headline ? 4 + textWidth("headline", UNIT) : 0);
	return {
		min: width + padLeft + PAD_X,
		max: width + padLeft + PAD_X,
		padX: PAD_X,
		padY: BODY_PAD_Y,
		borderLeft: row.indent ? pageColors.border40 : undefined,
		lines: () => {
			const runs: TextBlock[] = [
				textBlock(label, style, color, {
					lineHeight: 18.5714,
					marginLeft: row.indent ? padLeft - PAD_X : 0,
				}),
				textBlock(suffix, UNIT, pageColors.muted55, { lineHeight: LABEL_LH, marginLeft: 8 }),
			];
			if (row.headline) {
				runs.push(
					textBlock("headline", UNIT, pageColors.teal70, { lineHeight: LABEL_LH, marginLeft: 4 }),
				);
			}
			return [{ height: VALUE_LINE, runs }];
		},
	};
}

/** One provider's cell: the value, an optional `‡`, and the `best` marker beneath. */
function valueCell(row: MetricTableRow, providerId: string): TableCell {
	const cell = row.values[providerId];
	const measured = Object.values(row.values).filter((v) => v !== null).length;
	const best = bestP50(row);

	if (!cell) {
		// Rule 2: an explicit placeholder, never blank and never zero.
		const width = textWidth("–", CELL) + 2 * VALUE_PAD_X;
		return {
			min: width,
			max: width,
			padX: VALUE_PAD_X,
			padY: BODY_PAD_Y,
			align: "right",
			valign: "top",
			lines: () => [
				{
					height: VALUE_LINE,
					runs: [textBlock("–", CELL, pageColors.muted40, { lineHeight: HEAD_CELL_LH })],
				},
			],
		};
	}

	// Rule 1: `measured >= 2` is the same bar the page applies before marking anything.
	const isBest = measured >= 2 && best !== null && cell.p50 === best;
	const text = formatMetricValue(row, cell.p50);
	const tint = isBest ? 0 : ratioTintStep(metricRatio(row, providerId));
	const width =
		textWidth(text, CELL) + (cell.backfilled ? 2 + textWidth("‡", SUP) : 0) + 2 * VALUE_PAD_X;

	return {
		min: width,
		max: width,
		padX: VALUE_PAD_X,
		padY: BODY_PAD_Y,
		align: "right",
		valign: "top",
		background: isBest ? pageColors.tealWash : tint > 0 ? pageColors.tint[tint] : undefined,
		lines: () => {
			const first: TextBlock[] = [
				textBlock(text, CELL, isBest ? pageColors.fg : pageColors.fg85, {
					lineHeight: HEAD_CELL_LH,
				}),
			];
			if (cell.backfilled) {
				first.push(
					textBlock("‡", SUP, pageColors.amber, {
						lineHeight: HEAD_CELL_LH,
						marginLeft: 2,
						paddingBottom: 5,
					}),
				);
			}
			const lines: CellLine[] = [{ height: VALUE_LINE, runs: first }];
			// The ratio line is present in the DOM but hidden in the crop; only `best` shows.
			lines.push({
				height: MARKER_GAP + (isBest ? MARKER_LINE : 0),
				runs: isBest
					? [textBlock("best", MARKER, pageColors.teal90, { lineHeight: MARKER_LINE })]
					: [],
			});
			return lines;
		},
	};
}

function spreadCell(row: MetricTableRow): TableCell {
	const spread = metricSpread(row);
	const text = spread === null ? "–" : formatSpread(spread);
	const width = textWidth(text, SPREAD) + 2 * PAD_X;
	return {
		min: width,
		max: width,
		padX: PAD_X,
		padY: BODY_PAD_Y,
		align: "right",
		valign: "top",
		lines: () => [
			{
				height: VALUE_LINE,
				runs: [textBlock(text, SPREAD, pageColors.muted70, { lineHeight: 15.7143 })],
			},
		],
	};
}

/**
 * `data` is an ARGUMENT, not a module read, so the integrity rules above can be tested
 * against a synthetic run that actually exercises them. The committed artifact has
 * `backfill: null` and no single-measurement rows, so every one of those assertions is
 * vacuously green against it — which is how a dropped disclosure got through review once
 * already on this branch.
 */
export function buildMetricsFigure(data: SandboxBenchmarkData): PageFigureView {
	const tableWidth = CONTENT_WIDTH - 2;
	const providers = data.providers;
	const backfillNote = backfillNoteOf(data.backfill);

	const headerRow: TableRow = {
		rule: pageColors.border50,
		cells: [
			{
				min: textWidth("Metric", COLUMN_LABEL) + 2 * PAD_X,
				max: textWidth("Metric", COLUMN_LABEL) + 2 * PAD_X,
				padX: PAD_X,
				padY: HEAD_PAD_Y,
				lines: () => [
					{
						height: LABEL_LH,
						runs: [textBlock("Metric", COLUMN_LABEL, pageColors.muted70, { lineHeight: LABEL_LH })],
					},
				],
			},
			...providers.map((p): TableCell => {
				const name = p.specMatched ? p.name : `${p.name} †`;
				const words = name.split(" ");
				return {
					min: Math.max(...words.map((w) => textWidth(w, PROVIDER_HEADER)), 0) + 2 * VALUE_PAD_X,
					max: textWidth(name, PROVIDER_HEADER) + 2 * VALUE_PAD_X,
					padX: VALUE_PAD_X,
					padY: HEAD_PAD_Y,
					align: "right",
					lines: (contentWidth) =>
						wrapText(name, PROVIDER_HEADER, contentWidth).lines.map((line) => ({
							height: HEAD_CELL_LH,
							runs: [
								textBlock(line.text, PROVIDER_HEADER, pageColors.fg, { lineHeight: HEAD_CELL_LH }),
							],
						})),
				};
			}),
			{
				min: textWidth("Spread", COLUMN_LABEL) + 2 * PAD_X,
				max: textWidth("Spread", COLUMN_LABEL) + 2 * PAD_X,
				padX: PAD_X,
				padY: HEAD_PAD_Y,
				align: "right",
				lines: () => [
					{
						height: LABEL_LH,
						runs: [textBlock("Spread", COLUMN_LABEL, pageColors.muted70, { lineHeight: LABEL_LH })],
					},
				],
			},
		],
	};

	const rows: TableRow[] = [headerRow];
	for (const group of data.dimensionGroups) {
		const label = dimensionLabels[group.dimension] ?? group.dimension;
		rows.push({
			span: true,
			background: pageColors.bandBg,
			rule: pageColors.border40,
			cells: [
				{
					min: 0,
					max: 0,
					padX: PAD_X,
					padY: 8,
					lines: () => [
						{
							height: BAND_LH,
							runs: [textBlock(label, BAND, pageColors.teal, { lineHeight: BAND_LH })],
						},
					],
				},
			],
		});
		for (const row of group.rows) {
			rows.push({
				rule: pageColors.border30,
				background: row.id.endsWith("_total") ? pageColors.totalRowBg : undefined,
				cells: [labelCell(row), ...providers.map((p) => valueCell(row, p.id)), spreadCell(row)],
			});
		}
	}

	const table = buildTable(rows, tableWidth);

	// Rule 3: the ‡ legend travels with the marker.
	const notes: Block[] =
		backfillNote === null
			? []
			: [
					stack(
						"column",
						wrapText(backfillNote, FOOTNOTE, tableWidth - 2 * PAD_X).lines.map((line) =>
							textBlock(line.text, FOOTNOTE, pageColors.muted70, { lineHeight: NOTE_LH }),
						),
						{
							width: tableWidth,
							paddingLeft: PAD_X,
							paddingRight: PAD_X,
							paddingTop: BODY_PAD_Y,
							paddingBottom: BODY_PAD_Y,
							borderTop: pageColors.border40,
						},
					),
				];

	return {
		anchor: "all-metrics",
		width: CONTENT_WIDTH + 2 * CROP_PADDING,
		root: stack("column", [table.block, ...notes], {
			width: CONTENT_WIDTH,
			borderTop: pageColors.border50,
			borderBottom: pageColors.border50,
			borderLeft: pageColors.border50,
			borderRight: pageColors.border50,
			radius: 8,
		}),
	};
}
