/**
 * `ResolvedComposite` → a fully-formatted, fully-decided view model. Pure data: no JSX, no
 * satori, no filesystem. Everything the figure can get wrong is decided here, where an
 * ordinary unit test can assert it.
 *
 * Every value string and every shading decision comes from the package's own `domain/`
 * layer — the same functions the page renders through. That is
 * the point: a share image is read faster and trusted more than the table it was cropped
 * from, so a figure that formats a number differently, or shades on different cut-points,
 * is quietly making a different claim than the page. Nothing here re-implements a
 * derivation.
 *
 * Three integrity rules, each about what the figure is ALLOWED to assert:
 *
 *  1. **A "best" mark needs something to be best against.** Fewer than two measured cells
 *     in a row and nothing is marked — the same `measured >= 2` bar the page applies. A
 *     one-provider row would otherwise crown its only value.
 *  2. **A gap is an explicit cell, never a blank.** A provider the run produced no value
 *     for renders the placeholder, never an empty cell (which reads as a render failure)
 *     and never a zero (which reads as a measurement).
 *  3. **Disclosures survive the crop.** Off-spec providers keep their † in the header and
 *     backfilled cells keep their ‡, and when either is present the footnote that explains
 *     it is required — asserted in the test, because a marker with no legend is worse than
 *     no marker at all once the image is outside the page that explained it.
 */
import type {
	MetricTableRow,
	RatioTintStep,
	ResolvedComposite,
	SandboxBenchmarkData,
	SandboxProvider,
} from "../../domain/index.ts";
import {
	bestP50,
	displayUnit,
	formatMetricValue,
	formatSpread,
	metricRatio,
	metricSpread,
	ratioTintStep,
	shortRowLabel,
} from "../../domain/index.ts";
import { metrics, type_ } from "../../theme.ts";
import type { ColumnSpec, SolvedColumn } from "./columns.ts";
import { solveColumns } from "./columns.ts";

/** How a cell is drawn. One discriminant rather than three booleans, so the illegal
 *  combinations (a "best" cell that was never measured) cannot be represented. */
export type CellTone = "label" | "value" | "best" | "missing" | "spread";

export interface CellView {
	readonly text: string;
	readonly tone: CellTone;
	/** Behind-the-best shading step, shared with the page via `ratioTintStep`. 0 = none. */
	readonly tint: RatioTintStep;
}

export interface RowView {
	readonly id: string;
	/** Index-aligned with {@link TableView.columns}. */
	readonly cells: readonly CellView[];
	/**
	 * A pipeline task nested under its suite's total.
	 *
	 * Carried through to the figure because the nesting is a CLAIM: "git clone" under
	 * "Better-Auth: total" is a component of that total, and rendered flat it reads as a
	 * seventh independent metric that happens to be faster. `resolveComposite` already
	 * flattens a task kept WITHOUT its parent (restoring the full label); this is the other
	 * case, where the parent is present and the hierarchy has to survive the crop.
	 */
	readonly indent: boolean;
}

export interface GroupView {
	readonly dimension: string;
	readonly label: string;
	readonly rows: readonly RowView[];
}

/** Narrowest a figure may be. Below this a title wraps every few words and reads worse
 *  than a slightly over-wide image. */
const MIN_CONTENT_WIDTH = 720;

/** Nesting depth of a task row, in characters of the monospace cell font. Expressed in
 *  characters rather than pixels so it stays part of the same arithmetic the width solver
 *  uses. */
export const INDENT_CHARS = 3;

export interface TableView {
	readonly name: string;
	readonly title: string;
	readonly subtitle: string;
	readonly footnote: string;
	readonly columns: readonly SolvedColumn[];
	readonly groups: readonly GroupView[];
	/** Width of the table and of the prose blocks that wrap beneath it, excluding padding. */
	readonly contentWidth: number;
	/**
	 * Canvas width, solved to fit the widest thing in the figure — the table, or one of the
	 * prose lines above and below it.
	 *
	 * Sizing the canvas to its content is what makes overflow structurally impossible
	 * rather than merely tested for. Satori does not clip, and a title that does not fit
	 * wraps silently.
	 */
	readonly width: number;
}

/** Human label for a dimension band. Falls back to the raw key so a new dimension shows up
 *  as itself rather than vanishing. */
function bandLabel(dimension: string, labels: Record<string, string>): string {
	return (labels[dimension] ?? dimension).toUpperCase();
}

/** The unit/direction annotation the page prints beside a metric label. */
function labelOf(row: MetricTableRow): string {
	return `${shortRowLabel(row)}  ${displayUnit(row.unit)} ${row.direction === "LIB" ? "↓" : "↑"}`;
}

function providerHeader(p: SandboxProvider): string {
	// The dagger travels with the column header, not a separate legend row: cropped out of
	// the page, a column whose spec did not match the target must say so where it is read.
	return p.specMatched ? p.name : `${p.name} †`;
}

function cellsFor(row: MetricTableRow, providers: readonly SandboxProvider[]): CellView[] {
	const best = bestP50(row);
	const measured = Object.values(row.values).filter((v) => v !== null).length;
	const cells: CellView[] = [{ text: labelOf(row), tone: "label", tint: 0 }];

	for (const p of providers) {
		const cell = row.values[p.id];
		if (!cell) {
			// Rule 2: an explicit placeholder. Never blank, never zero.
			cells.push({ text: "–", tone: "missing", tint: 0 });
			continue;
		}
		// Rule 1: `measured >= 2` is the same bar the page applies before it marks anything.
		const isBest = measured >= 2 && best !== null && cell.p50 === best;
		const text = `${formatMetricValue(row, cell.p50)}${cell.backfilled ? " ‡" : ""}`;
		cells.push({
			text,
			tone: isBest ? "best" : "value",
			tint: isBest ? 0 : ratioTintStep(metricRatio(row, p.id)),
		});
	}

	const spread = metricSpread(row);
	cells.push({ text: spread === null ? "–" : formatSpread(spread), tone: "spread", tint: 0 });
	return cells;
}

export interface BuildTableViewOptions {
	/** Overrides the derived title. Specs carry editorial titles; the name is the fallback. */
	readonly title?: string;
	readonly dimensionLabels: Record<string, string>;
	/** The run's backfill disclosure, or null. Required, not optional, so a caller cannot
	 *  forget it — see rule 3. */
	readonly backfillNote: string | null;
	readonly run: SandboxBenchmarkData["run"];
}

export function buildTableView(
	composite: ResolvedComposite,
	options: BuildTableViewOptions,
): TableView {
	const providers = composite.providers;
	const columns: ColumnSpec[] = [
		{ id: "metric", header: "METRIC", align: "left" },
		...providers.map((p) => ({ id: p.id, header: providerHeader(p), align: "right" as const })),
		{ id: "spread", header: "SPREAD", align: "right" },
	];

	const groups: GroupView[] = composite.groups.map((group) => ({
		dimension: group.dimension,
		label: bandLabel(group.dimension, options.dimensionLabels),
		rows: group.rows.map((row) => ({
			id: row.id,
			cells: cellsFor(row, providers),
			indent: row.indent === true,
		})),
	}));

	const allRows = groups.flatMap((g) => g.rows);
	// The indent is drawn as extra padding INSIDE the metric column, so it has to be part of
	// the width solve or a nested row's label is what overflows.
	const solved = solveColumns(
		columns,
		allRows.map((r) =>
			r.cells.map((c, i) =>
				i === 0 && r.indent ? `${" ".repeat(INDENT_CHARS)}${c.text}` : c.text,
			),
		),
		{ cellFontSize: type_.cell, headerFontSize: type_.columnHeader, padX: metrics.cellPadX },
	);

	const title = options.title ?? composite.name;
	const { runId, date, targetSpec } = options.run;
	const subtitle = `run ${runId} · ${date} · ${targetSpec.vcpus} vCPU / ${targetSpec.memoryGb} GB / ${targetSpec.diskGb} GB target`;

	// Rule 3: the legend is assembled from the markers the figure actually contains, so it
	// can neither omit an explanation nor invent one for a marker that is not there.
	const legend: string[] = [];
	if (providers.some((p) => !p.specMatched)) {
		legend.push("† ran above the target spec, so its numbers are not like-for-like");
	}
	const hasBackfill = allRows.some((r) => r.cells.some((c) => c.text.includes("‡")));
	if (hasBackfill && options.backfillNote !== null) legend.push(options.backfillNote);
	legend.push("SPREAD is worst ÷ best across the columns shown");
	const footnote = legend.join("  ·  ");

	// The canvas is sized to the TABLE, and the prose is allowed to wrap inside it.
	//
	// The distinction matters and is not the obvious one. A wrapping CELL is a defect: rows
	// must align across a table, so one cell taking two lines desynchronises the grid and
	// bleeds across the rule below it — which is why columns are solved up front and never
	// capped. A wrapping PROSE line is fine: it is the only thing on its row, and Yoga
	// computes the block's height (the renderer never passes one). Sizing the canvas to the
	// widest of table-or-prose instead would let a long editorial title stretch the figure
	// far past its own table, leaving half the image empty.
	const tableWidth = solved.reduce((sum, c) => sum + c.width, 0);
	// Floor so a two-column composite still has room for its title to breathe rather than
	// wrapping every three words.
	const contentWidth = Math.max(tableWidth, MIN_CONTENT_WIDTH);

	return {
		name: composite.name,
		title,
		subtitle,
		footnote,
		columns: solved,
		groups,
		contentWidth,
		width: contentWidth + 2 * metrics.pad,
	};
}
