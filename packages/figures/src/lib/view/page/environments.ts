/**
 * `environments` — the observed-environment spec table.
 *
 * Every row, every value and every mark comes from `envSpecRows` and its predicates, which
 * are the SINGLE source the page and the agent-readable markdown mirror both render
 * through. Nothing here decides what a cell says or whether it is flagged.
 *
 * THE MARKS ARE THE POINT OF THE TABLE, so they and their legends travel together:
 *
 *  - `⚠` on a cell whose value is one draw from a HETEROGENEOUS FLEET, with
 *    `fleetHeterogeneityNoteOf` under the table.
 *  - `§` on a value recovered from the run's shard artifacts rather than reported by the
 *    sandbox, with `egressShardNoteOf` under the table.
 *  - An amber wash on a comparability flag (off-spec vCPU or RAM, non-KVM isolation) and a
 *    rose one on the single capacity flag (disk below target), because the two are
 *    different stories and the page draws them differently.
 *
 * A mark whose note is `null` for this run simply does not occur in it — both notes are
 * derived from the same data as the marks, so a figure cannot draw one without the other.
 */
import type { EnvSpecRow, SandboxBenchmarkData, SandboxProvider } from "../../../domain/index.ts";
import {
	egressShardNoteOf,
	envCellFleetMarked,
	envCellShardMarked,
	environmentFlagLookup,
	envSpecRows,
	fleetHeterogeneityNoteOf,
} from "../../../domain/index.ts";
import { CONTENT_WIDTH, CROP_PADDING, pageColors } from "../../../page-theme.ts";
import type { TextStyle } from "../text.ts";
import { measureRun, textWidth, wrapText } from "../text.ts";
import type { Block, PageFigureView, TextBlock } from "./blocks.ts";
import { stack, textBlock } from "./blocks.ts";
import type { CellLine, TableCell, TableRow } from "./table.ts";
import { buildTable } from "./table.ts";
import { breakPieces } from "./table-layout.ts";
import { CELL, COLUMN_LABEL, FOOTNOTE, PROVIDER_HEADER, ROW_LABEL, STATUS } from "./type-scale.ts";

/** `px-4 py-3` in the header, `px-4 py-2.5` in the body. */
const PAD_X = 16;
const HEAD_PAD_Y = 12;
const BODY_PAD_Y = 10;
/** Line heights, read off the page. */
const LABEL_LH = 14.2857;
const ROW_LABEL_LH = 15.7143;
const CELL_LH = 16;
const NOTE_LH = 16.25;
/** The `§` superscript: `text-[9px]` with `ml-0.5`. */
const MARKER: TextStyle = { stack: "mono", size: 9, weight: 400 };

/** A cell of one wrapped monospace string, optionally with a superscript marker after its
 *  last line. The marker rides the last line so it cannot end up alone on a line of its
 *  own, which is what an inline `<sup>` does in the browser. */
function wrappedCell(
	text: string,
	style: TextStyle,
	color: string,
	options: {
		marker?: string;
		background?: string;
		align?: "left" | "right";
		lineHeight: number;
		nowrap?: boolean;
	},
): TableCell {
	const marker = options.marker ? measureRun(options.marker, MARKER).width + 2 : 0;
	const full = textWidth(text, style) + marker;
	const pieces = options.nowrap
		? [full]
		: breakPieces(text).map((piece) => textWidth(piece, style));
	return {
		min: (options.nowrap ? full : Math.max(...pieces, 0) + marker) + 2 * PAD_X,
		max: full + 2 * PAD_X,
		padX: PAD_X,
		padY: options.lineHeight === LABEL_LH ? HEAD_PAD_Y : BODY_PAD_Y,
		align: options.align,
		background: options.background,
		lines: (contentWidth) => {
			const wrapped = options.nowrap
				? { lines: [measureRun(text, style)] }
				: wrapText(text, style, contentWidth - marker);
			return wrapped.lines.map((line, index): CellLine => {
				const runs: TextBlock[] = [
					textBlock(line.text, style, color, { lineHeight: options.lineHeight }),
				];
				if (options.marker && index === wrapped.lines.length - 1) {
					runs.push(
						textBlock(options.marker, MARKER, pageColors.teal, {
							lineHeight: options.lineHeight,
							marginLeft: 2,
							// `<sup>` raises the mark; approximated by shrinking the line box it sits in
							// so it rides above the baseline of the text beside it.
							paddingBottom: 5,
						}),
					);
				}
				return { height: options.lineHeight, runs };
			});
		},
	};
}

/** Amber for a comparability flag, rose for the one capacity flag (disk below target). */
function flagWash(field: string): string {
	return field === "diskGb" ? pageColors.flagRose : pageColors.flagAmber;
}

function bodyCell(
	row: EnvSpecRow,
	provider: SandboxProvider,
	isEnvironmentFlagged: (providerId: string, field: string) => boolean,
): TableCell {
	const base = row.baseValue(provider) ?? "–";
	const text = envCellFleetMarked(row, provider) ? `${base} ⚠` : base;
	return wrappedCell(text, CELL, pageColors.fg85, {
		marker: envCellShardMarked(row, provider) ? "§" : undefined,
		background: isEnvironmentFlagged(provider.id, row.field) ? flagWash(row.field) : undefined,
		lineHeight: CELL_LH,
	});
}

export function buildEnvironmentsFigure(data: SandboxBenchmarkData): PageFigureView {
	const sandboxProviders = data.providers;
	const isEnvironmentFlagged = environmentFlagLookup(data.environmentFlags);
	const egressShardNote = egressShardNoteOf(sandboxProviders);
	const fleetHeterogeneityNote = fleetHeterogeneityNoteOf(sandboxProviders);
	const tableWidth = CONTENT_WIDTH - 2;

	const header: TableRow = {
		rule: pageColors.border50,
		cells: [
			wrappedCell("Spec", COLUMN_LABEL, pageColors.muted70, {
				lineHeight: LABEL_LH,
				nowrap: true,
			}),
			...sandboxProviders.map((p) =>
				wrappedCell(p.specMatched ? p.name : `${p.name} †`, PROVIDER_HEADER, pageColors.fg, {
					lineHeight: CELL_LH,
				}),
			),
		],
	};
	// The header's provider cells are padded like the header, not like the body.
	const headerRow: TableRow = {
		...header,
		cells: header.cells.map((c) => ({ ...c, padY: HEAD_PAD_Y })),
	};

	const specRows: TableRow[] = envSpecRows.map((row) => ({
		rule: pageColors.border30,
		cells: [
			wrappedCell(row.label, ROW_LABEL, pageColors.muted80, {
				lineHeight: ROW_LABEL_LH,
				nowrap: true,
			}),
			...sandboxProviders.map((p) => bodyCell(row, p, isEnvironmentFlagged)),
		],
	}));

	// "Spec vs target" — the verdict row. No rule under it: it is the table's last row.
	const verdictRow: TableRow = {
		cells: [
			wrappedCell("Spec vs target", ROW_LABEL, pageColors.muted80, {
				lineHeight: ROW_LABEL_LH,
				nowrap: true,
			}),
			...sandboxProviders.map((p) =>
				wrappedCell(
					p.specMatched ? "matched" : "mismatch",
					STATUS,
					p.specMatched ? pageColors.teal : pageColors.amber,
					{
						lineHeight: ROW_LABEL_LH,
						nowrap: true,
					},
				),
			),
		],
	};

	const table = buildTable([headerRow, ...specRows, verdictRow], tableWidth);

	const notes: Block[] = [fleetHeterogeneityNote, egressShardNote]
		.filter((note): note is string => note !== null)
		.map((note) =>
			stack(
				"column",
				wrapText(note, FOOTNOTE, tableWidth - 2 * PAD_X).lines.map((line) =>
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
		);

	return {
		anchor: "environments",
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
