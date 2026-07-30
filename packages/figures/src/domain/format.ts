/**
 * Every string a number turns into.
 *
 * One copy, shared by the page, the markdown mirror and the share figures: two
 * implementations of `formatMetricValue` would let a cropped image print a value the
 * table above it rounds differently, which is the whole class of drift these figures
 * exist to make impossible.
 */
import type { MetricTableRow } from "./types.ts";

/** Drop a metric label's leading `"Repo: "` prefix — the chart/table names the
 *  repo once on the total row, so the indented task rows below it don't repeat it. */
export function stripRepoPrefix(label: string): string {
	return label.replace(/^[^:]+:\s*/, "");
}

/** A row's display label: the repo prefix is stripped only on indented task rows. */
export function shortRowLabel(row: MetricTableRow): string {
	return row.indent ? stripRepoPrefix(row.label) : row.label;
}

/** Compact pill label for the explorer control strip. */
export function explorerPillLabel(row: MetricTableRow): string {
	let label = shortRowLabel(row);
	label = label.replace(/: total \(Σ task medians\)$/, " · TOTAL");
	label = label
		.replace(/^fio /, "")
		.replace(/, O_DIRECT /, " ")
		.replace(/ \(IOPS\)$/, " · IOPS")
		.replace(/ \(MB\/s\)$/, " · MB/s")
		.replace(/^Cost per compute run \((.+)\)$/, "cost / $1")
		.replace(/^Hourly cost$/, "on-demand price");
	return label;
}

/** Format a p50 for display, by the catalog's canonical unit. */
export function formatMetricValue(row: MetricTableRow, value: number): string {
	if (row.unit === "USD" || row.unit === "USD/hr") return `$${value.toFixed(4)}`;
	if (row.unit === "Milliseconds") return Math.round(value).toLocaleString("en-US");
	if (row.unit === "Seconds") return value < 10 ? value.toFixed(2) : value.toFixed(1);
	if (row.unit === "runs/s" || row.unit === "bogo ops/s") return value.toFixed(2);
	return Math.round(value).toLocaleString("en-US");
}

/** Short display unit for the table ("Seconds" → "s", "Milliseconds" → "ms"). */
export function displayUnit(unit: string): string {
	if (unit === "Seconds") return "s";
	if (unit === "Milliseconds") return "ms";
	return unit;
}

export function formatRatio(ratio: number): string {
	return `×${ratio.toFixed(2)}`;
}

export function formatSpread(spread: number): string {
	return `×${spread.toFixed(1)}`;
}

export function formatSeconds(s: number): string {
	return `${s < 10 ? s.toFixed(2) : s.toFixed(1)} s`;
}

export function formatSpreadPct(spread: number): string {
	return `${(spread * 100).toFixed(spread < 0.1 ? 1 : 0)}%`;
}
