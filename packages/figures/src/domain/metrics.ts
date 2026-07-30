/**
 * Row-level derivations: who leads a row, by how much, and how far behind a cell sits.
 *
 * These are the numbers a figure and the page must never disagree about, so they exist
 * exactly once and take their row as an argument. Nothing here reads a dataset from a
 * module: a composite that drops columns re-derives against the restricted row through the
 * same functions rather than reimplementing the arithmetic against a different provider set.
 */
import type {
	MetricCell,
	MetricTableRow,
	SandboxBenchmarkData,
	SandboxProviderId,
} from "./types.ts";

/**
 * Middle value, or the mean of the two middles — the same convention the dataset's own
 * aggregate uses for p50, which is why it is stated once here rather than at each of the
 * three points that need it. Sorts a COPY: the callers' arrays are the run's samples and
 * a replicate's spreads, and neither wants its order mutated out from under it.
 */
export function median(values: readonly number[]): number {
	// Throws rather than returning NaN on an empty set. Both callers pass a run's samples or a
	// replicate's spreads, neither of which can legitimately be empty, and a NaN median
	// propagates silently into a bar length and a rendered total.
	if (values.length === 0) throw new Error("median of an empty sample set");
	const sorted = [...values].sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const upper = sorted[mid] as number;
	return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] as number) + upper) / 2;
}

/** Best (per the metric's direction) p50 among providers with data. */
export function bestP50(row: MetricTableRow): number | null {
	const vals = Object.values(row.values)
		.filter((v): v is MetricCell => v !== null)
		.map((v) => v.p50);
	if (vals.length === 0) return null;
	return row.direction === "LIB" ? Math.min(...vals) : Math.max(...vals);
}

/** Ratio of a provider's p50 to the row's best (1 = best); null when no data
 *  or when fewer than two providers measured (no comparison exists). */
export function metricRatio(row: MetricTableRow, id: SandboxProviderId): number | null {
	const cell = row.values[id];
	const best = bestP50(row);
	const measured = Object.values(row.values).filter((v) => v !== null).length;
	if (!cell || best === null || measured < 2) return null;
	return row.direction === "LIB" ? cell.p50 / best : best / cell.p50;
}

/** Worst÷best across the row — the "spread" column. Null when <2 measured. */
export function metricSpread(row: MetricTableRow): number | null {
	const vals = Object.values(row.values)
		.filter((v): v is MetricCell => v !== null)
		.map((v) => v.p50);
	if (vals.length < 2) return null;
	return Math.max(...vals) / Math.min(...vals);
}

/**
 * How far behind the row's best a cell is, as a shading STEP rather than a class.
 *
 * The thresholds live here, once. The page turns a step into a Tailwind class and the
 * share figures turn the same step into an SVG fill, so the two surfaces cannot
 * disagree about which cells read as "far behind" — a figure that shaded on different
 * cut-points than the table above it would be quietly making a different claim.
 *
 * 0 = no shading (at or near the best).
 */
export type RatioTintStep = 0 | 1 | 2 | 3 | 4;

export function ratioTintStep(ratio: number | null): RatioTintStep {
	if (ratio === null || ratio <= 1.15) return 0;
	if (ratio <= 2) return 1;
	if (ratio <= 4) return 2;
	if (ratio <= 8) return 3;
	return 4;
}

/**
 * A row restricted to a subset of providers — the shape the ratio/spread/best
 * helpers above take, so a composite that drops columns can reuse them instead
 * of reimplementing the arithmetic against a different provider set.
 */
export function rowRestrictedTo(row: MetricTableRow, providerIds: string[]): MetricTableRow {
	return {
		...row,
		values: Object.fromEntries(providerIds.map((id) => [id, row.values[id] ?? null])),
	};
}

/** Look up a metric table row by id across every dimension group. */
export function metricRowById(data: SandboxBenchmarkData, id: string): MetricTableRow | undefined {
	for (const group of data.dimensionGroups) {
		const row = group.rows.find((r) => r.id === id);
		if (row) return row;
	}
	return undefined;
}
