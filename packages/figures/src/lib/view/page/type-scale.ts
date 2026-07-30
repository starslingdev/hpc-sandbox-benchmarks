/**
 * Every text style the eight page figures draw, named for the page role it plays.
 *
 * These are not design choices — they are readings. Each one was taken from
 * `getComputedStyle` on the real rendered page: the family stack, the pixel size Tailwind
 * resolved (`text-[13px]` is 13, `text-xs` is 12, `text-[10px]` is 10), the weight, the
 * tracking (`tracking-[0.16em]` at 10px is 1.6px), and whether the utility uppercased it.
 * Line heights travel with them because the page's line heights are Tailwind's
 * size-derived defaults and are not guessable from the size alone: `text-xs` is 12/16 but
 * `text-[11px]` inside `leading-relaxed` is 11/16.5.
 *
 * Collecting them in one table rather than inlining them at each call site is what makes
 * the whole set auditable against a fresh `getComputedStyle` dump when the page changes.
 * A style used by two figures is declared once, so the two cannot drift apart.
 */
import type { TextStyle } from "../text.ts";

/** `font-mono text-[10px] uppercase tracking-[0.16em]` — a table's column-header label. */
export const COLUMN_LABEL: TextStyle = {
	stack: "mono",
	size: 10,
	weight: 500,
	letterSpacing: 1.6,
	uppercase: true,
};

/** The same label at font-weight 400, which the coverage and metrics tables use. */
export const COLUMN_LABEL_REGULAR: TextStyle = { ...COLUMN_LABEL, weight: 400 };

/** `font-mono text-[11px] uppercase tracking-[0.1em]` — a spec table's ROW label. */
export const ROW_LABEL: TextStyle = {
	stack: "mono",
	size: 11,
	weight: 500,
	letterSpacing: 1.1,
	uppercase: true,
};

/** `font-mono text-xs font-semibold` — a provider name in a table header. */
export const PROVIDER_HEADER: TextStyle = { stack: "mono", size: 12, weight: 600 };

/** `font-mono text-xs` — the default table cell, and the chart's provider labels. */
export const CELL: TextStyle = { stack: "mono", size: 12, weight: 400 };

/** `font-mono text-[11px] uppercase tracking-[0.1em]` at weight 400 — the `matched` /
 *  `failed` status words. */
export const STATUS: TextStyle = {
	stack: "mono",
	size: 11,
	weight: 400,
	letterSpacing: 1.1,
	uppercase: true,
};

/** `font-mono text-[10px]` — footnotes under a table, and the `n = N cells` annotations. */
export const FOOTNOTE: TextStyle = { stack: "mono", size: 10, weight: 400 };

/** `font-mono text-[11px]` — the phase legend and the disk-requirement aside. */
export const LEGEND: TextStyle = { stack: "mono", size: 11, weight: 400 };

/** `font-mono text-[11px] uppercase tracking-[0.14em]` — a chart's task summary. */
export const CHART_EYEBROW: TextStyle = {
	stack: "mono",
	size: 11,
	weight: 400,
	letterSpacing: 1.54,
	uppercase: true,
};

/** `font-mono text-[10px] uppercase tracking-[0.14em]` — `color order = execution order`. */
export const LEGEND_NOTE: TextStyle = {
	stack: "mono",
	size: 10,
	weight: 400,
	letterSpacing: 1.4,
	uppercase: true,
};

/** `font-mono text-[13px] font-semibold` — a pipeline bar's total. */
export const BAR_TOTAL: TextStyle = { stack: "mono", size: 13, weight: 600 };

/** `font-mono text-xs font-semibold` — a repeatability bar's spread percentage. */
export const BAR_VALUE: TextStyle = { stack: "mono", size: 12, weight: 600 };

/** `font-mono text-[9px] uppercase tracking-[0.14em]` — the `fastest` badge. */
export const BADGE: TextStyle = {
	stack: "mono",
	size: 9,
	weight: 400,
	letterSpacing: 1.26,
	uppercase: true,
};

/** `text-sm font-medium` — a KPI's label. */
export const KPI_LABEL: TextStyle = { stack: "sans", size: 14, weight: 500 };

/** `font-mono text-[11px]` — a KPI's sub-line. */
export const KPI_SUB: TextStyle = { stack: "mono", size: 11, weight: 400 };

/** `font-heading text-4xl font-medium` — a KPI's value. */
export const KPI_VALUE: TextStyle = { stack: "head", size: 36, weight: 500 };

/** `font-heading text-2xl font-medium` — a pipeline chart's suite name. */
export const CHART_TITLE: TextStyle = { stack: "head", size: 24, weight: 500 };

/** `text-sm` — a chart's authored note paragraph. */
export const PROSE: TextStyle = { stack: "sans", size: 14, weight: 400 };

/** `text-[13px]` — a metric row's label, and a coverage gap's reason. */
export const PROSE_SMALL: TextStyle = { stack: "sans", size: 13, weight: 400 };

/** `text-[13px] font-medium` — a suite total row's label. */
export const PROSE_SMALL_MEDIUM: TextStyle = { stack: "sans", size: 13, weight: 500 };
