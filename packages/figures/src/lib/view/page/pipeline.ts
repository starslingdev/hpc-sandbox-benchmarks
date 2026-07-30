/**
 * `better-auth` / `mastra` / `openclaw` — one stacked pipeline chart per suite.
 *
 * One builder over the dataset's own suite list rather than three near-copies: a suite
 * added upstream becomes a figure automatically and cannot be the one somebody forgot.
 *
 * WHAT THE PICTURE CLAIMS, AND WHAT IS THEREFORE CARRIED RATHER THAN RE-DECIDED:
 *
 *  - **Bars share ONE time scale across all three charts** (`pipelineScaleMaxS`), so a
 *    second is the same length in every figure. Scaling each chart to its own maximum
 *    would make three unrelated pictures out of one comparison.
 *  - **Segment order is the suite's real execution order**, one segment per task, coloured
 *    by phase on the ordinal ramp — later phase, darker. The colour ordering IS the
 *    legend's claim ("color order = execution order").
 *  - **Rows are sorted fastest-first and the fastest is badged**, as the page sorts and
 *    badges them.
 *  - **Environments that did not complete the suite are listed under the bars** with their
 *    outcome and reason. Dropping them would turn a chart that discloses its gaps into one
 *    that appears to have none.
 *
 * THE CANVAS IS WIDER THAN THE CONTENT COLUMN when a bar's total label overruns it — which
 * two of the three do. The crop is cut to the anchor's own box PLUS anything overflowing
 * it (see `measureAnchors` in the snapshot script), so the figure has to size itself the
 * same way or the longest bar's total is sliced off the right edge.
 */
import type {
	PipelineSuite,
	SandboxBenchmarkData,
	SandboxProvider,
} from "../../../domain/index.ts";
import {
	formatSeconds,
	phaseLabels,
	pipelineScaleMaxSOf,
	providerIndexOf,
} from "../../../domain/index.ts";
import { CONTENT_WIDTH, CROP_PADDING, pageColors, phaseRamp } from "../../../page-theme.ts";
import { wrapText } from "../text.ts";
import type { Block, PageFigureView } from "./blocks.ts";
import { fill, stack, textBlock } from "./blocks.ts";
import {
	BADGE,
	BAR_TOTAL,
	CELL,
	CHART_EYEBROW,
	CHART_TITLE,
	LEGEND,
	LEGEND_NOTE,
	PROSE,
} from "./type-scale.ts";

/** `grid-cols-[8rem_1fr] gap-x-4` — the provider label column and the gutter after it. */
const LABEL_COLUMN = 128;
const COLUMN_GAP = 16;
/** `h-5` bars with a `gap-[2px]` between task segments and `gap-2.5` before the total. */
const BAR_HEIGHT = 20;
const SEGMENT_GAP = 2;
const TOTAL_GAP = 10;
/** `space-y-3` between bar rows. */
const ROW_GAP = 12;
/** `max-w-2xl` on the authored note. */
const NOTE_WIDTH = 672;

/**
 * The provider a chart row names. `domain/parse.ts` already refuses a document whose bar or
 * incomplete row names a provider outside `providers[]`, so this cannot miss on parsed data —
 * it throws rather than asserting because the alternative under `noUncheckedIndexedAccess` is
 * a `!` that would read `undefined.name` and crash with no clue which row was at fault.
 */
function requireProvider(
	byId: Record<string, SandboxProvider>,
	providerId: string,
): SandboxProvider {
	const provider = byId[providerId];
	if (!provider) {
		throw new Error(`pipeline chart names provider "${providerId}", which the run does not list`);
	}
	return provider;
}

/** Phase → ramp colour, from the dataset's own execution-order phase list. Clamped rather
 *  than wrapped: a sixth phase should read as "the last one", not as the first again. */
function rampFor(phaseOrder: readonly string[], phase: string): string {
	const slot = phaseOrder.indexOf(phase);
	const index = Math.min(Math.max(slot, 0), phaseRamp.length - 1);
	return phaseRamp[index] ?? phaseRamp[0];
}

export function buildPipelineFigure(
	suite: PipelineSuite,
	data: SandboxBenchmarkData,
	suiteNote: string,
): PageFigureView {
	const providerById = providerIndexOf(data.providers);
	const pipelineScaleMaxS = pipelineScaleMaxSOf(data);
	const bars = [...suite.bars].sort((a, b) => a.totalS - b.totalS);
	const bestTotal = bars[0]?.totalS ?? 0;
	const barColumn = CONTENT_WIDTH - LABEL_COLUMN - COLUMN_GAP;
	const presentPhases = data.phaseOrder.filter((phase) =>
		suite.tasks.some((t) => t.phase === phase),
	);

	// ── header: suite name and the task summary on one baseline ───────────────────────
	const summary = `${suite.tasks.length} tasks · ${presentPhases
		.map((p) => phaseLabels[p] ?? p)
		.join(" → ")}`;
	const header = stack(
		"row",
		[
			textBlock(suite.name, CHART_TITLE, pageColors.fg, { lineHeight: 32, height: 32 }),
			textBlock(summary, CHART_EYEBROW, pageColors.muted70, {
				lineHeight: 16.5,
				height: 16.5,
				marginTop: 12,
			}),
		],
		{ gap: 16, align: "flex-start", marginBottom: 6 },
	);

	// ── the authored note, with the disk requirement as its own inline run ─────────────
	//
	// The disk requirement is a SEPARATE inline span on the page — smaller, monospace, and
	// a lighter grey — sitting at the end of the same paragraph. Folding it into the prose
	// would set it in the wrong face at the wrong size, so it is measured on its own and
	// placed on the last line when it fits there, exactly as an inline element does.
	//
	// The note is authored with inline markdown. `**bold**` and `` `code` `` are STRIPPED to
	// their text rather than rendered, which is a real loss and not an oversight: satori
	// cannot change weight or draw a background partway through a wrapped block, and
	// re-wrapping the paragraph as a sequence of per-run pieces to get them back would put a
	// second line breaker in the pipeline. Stripping is still strictly better than the
	// alternative of leaving the delimiters in — a figure showing a literal backtick is
	// showing markup it was supposed to render. Every word survives; the emphasis does not.
	const note = suiteNote.replaceAll("**", "").replaceAll("`", "");
	const proseLines = wrapText(note, PROSE, NOTE_WIDTH).lines;
	const noteRows: Block[][] = proseLines.map((line) => [
		textBlock(line.text, PROSE, pageColors.muted, { lineHeight: 22.75 }),
	]);
	if (suite.minDiskGb !== null) {
		const disk = textBlock(` Needs ${suite.minDiskGb} GB free disk.`, LEGEND, pageColors.muted40, {
			lineHeight: 17.875,
		});
		const last = proseLines[proseLines.length - 1];
		const lastRow = noteRows[noteRows.length - 1];
		if (last && lastRow && last.width + disk.measuredWidth <= NOTE_WIDTH) lastRow.push(disk);
		else noteRows.push([disk]);
	}
	const noteBlock = stack(
		"column",
		noteRows.map((runs) => stack("row", runs, { height: 22.75, align: "center" })),
		{ width: NOTE_WIDTH, marginBottom: 20 },
	);

	// ── phase legend ─────────────────────────────────────────────────────────────────
	const legend = stack(
		"row",
		[
			...presentPhases.map((phase) =>
				stack(
					"row",
					[
						fill(10, 10, rampFor(data.phaseOrder, phase), { radius: 2 }),
						textBlock(phaseLabels[phase] ?? phase, LEGEND, pageColors.muted, {
							lineHeight: 16.5,
						}),
					],
					{ gap: 6, align: "center", height: 16.5 },
				),
			),
			textBlock("color order = execution order", LEGEND_NOTE, pageColors.muted50, {
				lineHeight: 15,
				height: 16.5,
			}),
		],
		{ gap: 16, align: "center", marginBottom: 16, height: 16.5 },
	);

	// ── bars ─────────────────────────────────────────────────────────────────────────
	let contentRight = CONTENT_WIDTH;
	const barRows: Block[] = bars.map((bar, index) => {
		const provider = requireProvider(providerById, bar.provider);
		const isBest = bar.totalS === bestTotal;
		const trackWidth = (bar.totalS / pipelineScaleMaxS) * barColumn;
		const gaps = Math.max(bar.segments.length - 1, 0) * SEGMENT_GAP;
		const drawable = Math.max(trackWidth - gaps, 0);

		const segments = bar.segments.map((segment, i) =>
			fill(
				(segment.p50 / bar.totalS) * drawable,
				BAR_HEIGHT,
				rampFor(data.phaseOrder, segment.phase),
				i === 0
					? { radiusCorners: [1, 0, 0, 1] }
					: i === bar.segments.length - 1
						? { radiusCorners: [0, 4, 4, 0] }
						: {},
			),
		);

		const total = textBlock(formatSeconds(bar.totalS), BAR_TOTAL, pageColors.fg, {
			lineHeight: 17.3333,
		});
		const badge = isBest
			? textBlock("fastest", BADGE, pageColors.teal, {
					lineHeight: 13.5,
					paddingLeft: 4,
					paddingRight: 4,
					paddingTop: 1,
					paddingBottom: 1,
					borderTop: pageColors.tealBorder,
					borderBottom: pageColors.tealBorder,
					borderLeft: pageColors.tealBorder,
					borderRight: pageColors.tealBorder,
					radius: 4,
				})
			: null;

		contentRight = Math.max(
			contentRight,
			LABEL_COLUMN +
				COLUMN_GAP +
				trackWidth +
				TOTAL_GAP +
				total.measuredWidth +
				(badge ? 8 + badge.measuredWidth + 10 : 0),
		);

		// The off-spec badge on the provider name is a bordered pill on the page. It is drawn
		// as the plain dagger the rest of the report uses, because a bordered inline pill and
		// its 9px tracking cannot be placed inside a flex row without solving a second
		// baseline; the disclosure survives either way, which is the part that matters.
		const label = provider.specMatched ? provider.name : `${provider.name} †`;

		return stack(
			"row",
			[
				stack("row", [textBlock(label, CELL, pageColors.fg90, { lineHeight: 16 })], {
					width: LABEL_COLUMN,
					height: BAR_HEIGHT,
					align: "center",
				}),
				stack(
					"row",
					[
						stack("row", segments, { gap: SEGMENT_GAP, height: BAR_HEIGHT }),
						...(badge
							? [stack("row", [total, badge], { gap: 8, align: "center", height: BAR_HEIGHT })]
							: [stack("row", [total], { align: "center", height: BAR_HEIGHT })]),
					],
					{ gap: TOTAL_GAP, align: "center", height: BAR_HEIGHT },
				),
			],
			{
				gap: COLUMN_GAP,
				align: "center",
				height: BAR_HEIGHT,
				marginBottom: index === bars.length - 1 && suite.incomplete.length === 0 ? 0 : ROW_GAP,
			},
		);
	});

	// Environments that did not complete the suite: outcome and reason, no bar.
	const incompleteRows: Block[] = suite.incomplete.map((row, index) => {
		const provider = requireProvider(providerById, row.provider);
		const name = provider.specMatched ? provider.name : `${provider.name} †`;
		return stack(
			"row",
			[
				stack("row", [textBlock(name, CELL, pageColors.muted50, { lineHeight: 16 })], {
					width: LABEL_COLUMN,
					height: 16,
					align: "center",
				}),
				textBlock(`${row.outcome} · ${row.reason}`, LEGEND, pageColors.muted50, {
					lineHeight: 16.5,
				}),
			],
			{
				gap: COLUMN_GAP,
				align: "flex-start",
				marginBottom: index === suite.incomplete.length - 1 ? 0 : ROW_GAP,
			},
		);
	});

	return {
		anchor: suite.id.replace(/^realworld-/, ""),
		// ROUND, not floor. Puppeteer's clip is `box.width + 2 × padding` in CSS pixels and
		// the screenshot comes out at `round(clip × deviceScaleFactor)` device pixels — so a
		// 955.53px-wide anchor is cut at 1004 CSS px, not 1003. Flooring here made both
		// overflowing charts 2 device pixels narrow than their crop.
		width: Math.round(contentRight + 2 * CROP_PADDING),
		root: stack(
			"column",
			[header, noteBlock, legend, stack("column", [...barRows, ...incompleteRows])],
			{ width: CONTENT_WIDTH },
		),
	};
}

/** Also used by `../../../plan.ts`, which must not load a renderer to know the file set. */
export function pipelineAnchorOf(suite: PipelineSuite): string {
	return suite.id.replace(/^realworld-/, "");
}
