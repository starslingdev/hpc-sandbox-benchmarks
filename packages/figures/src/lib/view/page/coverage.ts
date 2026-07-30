/**
 * `coverage` — every provider/suite pair the run did not produce a clean result for.
 *
 * This is the figure whose whole job is disclosure, so two things are carried verbatim:
 *
 *  - **The outcome vocabulary and its colours.** `failed` is amber, `skipped` and
 *    `missing` are muted, and a disk-driven skip says so (`skipped · disk`). Flattening
 *    those into one word would turn "we did not run it" into "it did not work".
 *  - **The excluded-provider line under the table.** An environment that was attempted and
 *    never validated is disclosed there; without it, a provider present in the run and
 *    absent from every table above is silently gone.
 *
 * THE REASON COLUMN WRAPS ANYWHERE, which is a layout decision the page makes for a
 * reason: a failure reason is a list of metric ids and source paths, single tokens long
 * enough to set the table's min-content width and push the column out of the image.
 * `overflow-wrap: anywhere` is the only thing that shrinks that intrinsic width, so the
 * column's min-content here is one CHARACTER, not one word — which is what puts the
 * browser's solve and this one on the same answer.
 */
import type { SandboxBenchmarkData } from "../../../domain/index.ts";
import { CONTENT_WIDTH, CROP_PADDING, pageColors } from "../../../page-theme.ts";
import type { TextStyle } from "../text.ts";
import { textWidth, wrapText } from "../text.ts";
import type { Block, PageFigureView } from "./blocks.ts";
import { stack, textBlock } from "./blocks.ts";
import type { TableCell, TableRow } from "./table.ts";
import { buildTable } from "./table.ts";
import { CELL, COLUMN_LABEL, FOOTNOTE, PROSE_SMALL, STATUS } from "./type-scale.ts";

const PAD_X = 16;
const HEAD_PAD_Y = 12;
const BODY_PAD_Y = 10;
const LABEL_LH = 14.2857;
const CELL_LH = 16;
const STATUS_LH = 15.7143;
const REASON_LH = 17.875;
const NOTE_LH = 16.25;

/** A single-line monospace cell (`whitespace-nowrap` on the page). */
function nowrapCell(
	text: string,
	style: TextStyle,
	color: string,
	lineHeight: number,
	padY: number,
): TableCell {
	const width = textWidth(text, style) + 2 * PAD_X;
	return {
		min: width,
		max: width,
		padX: PAD_X,
		padY,
		lines: () => [{ height: lineHeight, runs: [textBlock(text, style, color, { lineHeight })] }],
	};
}

/** A cell that wraps on spaces, sized by its words. */
function wordWrapCell(
	text: string,
	style: TextStyle,
	color: string,
	lineHeight: number,
): TableCell {
	return {
		min:
			Math.max(
				...text
					.split(/\s+/)
					.filter(Boolean)
					.map((w) => textWidth(w, style)),
				0,
			) +
			2 * PAD_X,
		max: textWidth(text, style) + 2 * PAD_X,
		padX: PAD_X,
		padY: BODY_PAD_Y,
		lines: (contentWidth) =>
			wrapText(text, style, contentWidth).lines.map((line) => ({
				height: lineHeight,
				runs: [textBlock(line.text, style, color, { lineHeight })],
			})),
	};
}

/** The reason column: `wrap-anywhere`, so its min-content is one character wide. */
function anywhereCell(text: string, style: TextStyle, color: string): TableCell {
	const widest = Math.max(...[...text].map((ch) => textWidth(ch, style)), 0);
	return {
		min: widest + 2 * PAD_X,
		max: textWidth(text, style) + 2 * PAD_X,
		padX: PAD_X,
		padY: BODY_PAD_Y,
		lines: (contentWidth) =>
			wrapText(text, style, contentWidth, { anywhere: true }).lines.map((line) => ({
				height: REASON_LH,
				// ONE run per line, not one per word. Splitting at the spaces was tried — the
				// kerning correction is a single letter-spacing spread evenly over a run, so a
				// shorter run should drift less — and it made this figure WORSE (8.73% differing
				// pixels to 9.10%): satori rounds each run's position to a whole pixel, and
				// twenty of those roundings per line cost more than the drift they removed.
				runs: [textBlock(line.text, style, color, { lineHeight: REASON_LH })],
			})),
	};
}

/** The outcome word and the colour it is drawn in — the page's own vocabulary. */
function outcomeOf(gap: { outcome: string; disk?: boolean }): { text: string; color: string } {
	if (gap.outcome === "failed") return { text: "failed", color: pageColors.amber };
	if (gap.outcome === "skipped") {
		return { text: gap.disk ? "skipped · disk" : "skipped", color: pageColors.muted70 };
	}
	return { text: "missing", color: pageColors.muted70 };
}

/** `data` is an argument for the same reason it is in ./metrics.ts: the committed run has
 *  no excluded providers, so the disclosure line below the table is untestable against it. */
export function buildCoverageFigure(data: SandboxBenchmarkData): PageFigureView {
	const tableWidth = CONTENT_WIDTH - 2;
	const gaps = data.coverageGaps;
	const byId = new Map(data.providers.map((p) => [p.id, p]));

	const headerRow: TableRow = {
		rule: pageColors.border50,
		cells: ["Provider", "Suite", "Outcome", "Reason"].map((h) =>
			nowrapCell(h, COLUMN_LABEL, pageColors.muted70, LABEL_LH, HEAD_PAD_Y),
		),
	};

	const bodyRows: TableRow[] = gaps.map((gap, index) => {
		const provider = byId.get(gap.provider);
		// A gap naming a provider the run has no column for is a data error, not something to
		// render as an empty cell: the figure would silently drop a disclosed failure.
		if (!provider) throw new Error(`figures: coverage gap names unknown provider ${gap.provider}`);
		const name = provider.specMatched ? provider.name : `${provider.name} †`;
		const outcome = outcomeOf(gap);
		return {
			rule: index === gaps.length - 1 ? undefined : pageColors.border30,
			cells: [
				nowrapCell(name, CELL, pageColors.fg85, CELL_LH, BODY_PAD_Y),
				nowrapCell(gap.suite, CELL, pageColors.fg85, CELL_LH, BODY_PAD_Y),
				wordWrapCell(outcome.text, STATUS, outcome.color, STATUS_LH),
				anywhereCell(gap.reason, PROSE_SMALL, pageColors.muted),
			],
		};
	});

	const table = buildTable([headerRow, ...bodyRows], tableWidth);

	const excluded = data.excludedProviders;
	const notes: Block[] =
		excluded.length === 0
			? []
			: [
					(() => {
						const text =
							`Also in this run, not in the tables above: ` +
							`${excluded.map((p) => `${p.name}: ${p.validationStatus}, ${p.metrics} metrics reported`).join("; ")}` +
							`. An environment that reported nothing gets no column.`;
						return stack(
							"column",
							wrapText(text, FOOTNOTE, tableWidth - 2 * PAD_X).lines.map((line) =>
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
						);
					})(),
				];

	return {
		anchor: "coverage",
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
