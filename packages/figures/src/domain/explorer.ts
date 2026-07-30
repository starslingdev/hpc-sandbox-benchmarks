/**
 * The results explorer's ranking model.
 *
 * Only the page renders this today, but it is a derivation over the same rows the
 * figures draw — the aggregate a cell resolves to, and the ratio-vs-leader shown next
 * to it — so it belongs with the other derivations rather than beside the prose. The
 * provider set is an argument, so a restricted view ranks against the columns it shows.
 */
import type { MetricCell, MetricTableRow, SandboxProvider } from "./types.ts";

/** Aggregate the results explorer can rank on. `best`/`worst` resolve to
 *  min/max per the metric's direction (LIB → best=min; HIB → best=max). */
export type ExplorerStat = "p50" | "mean" | "p95" | "best" | "worst";

export const EXPLORER_STATS: { id: ExplorerStat; label: string }[] = [
	{ id: "p50", label: "median" },
	{ id: "mean", label: "mean" },
	{ id: "best", label: "best" },
	{ id: "worst", label: "worst" },
	{ id: "p95", label: "p95" },
];

/** Default metric the explorer opens on — the better-auth pipeline total. */
export const EXPLORER_DEFAULT_METRIC = "realworld-better-auth_total";

/** Resolve a cell's display value for the chosen explorer aggregate. Falls
 *  back to p50 when the cell is derived (totals/costs carry no spread). */
export function cellStatValue(cell: MetricCell, row: MetricTableRow, stat: ExplorerStat): number {
	switch (stat) {
		case "p50":
			return cell.p50;
		case "mean":
			return cell.mean ?? cell.p50;
		case "p95":
			return cell.p95 ?? cell.p50;
		case "best":
			return (row.direction === "LIB" ? cell.min : cell.max) ?? cell.p50;
		case "worst":
			return (row.direction === "LIB" ? cell.max : cell.min) ?? cell.p50;
		default: {
			const _exhaustive: never = stat;
			return _exhaustive;
		}
	}
}

export interface ExplorerRankedEntry {
	providerId: string;
	value: number;
	cell: MetricCell;
	/** Ratio vs the leader (1 = best). Null when fewer than two providers measured. */
	ratio: number | null;
}

/** Providers with data for `row`, ranked best-first for the chosen aggregate. */
export function rankMetricForExplorer(
	row: MetricTableRow,
	stat: ExplorerStat,
	providers: readonly SandboxProvider[],
): ExplorerRankedEntry[] {
	const entries = providers
		.map((p) => {
			const cell = row.values[p.id];
			if (!cell) return null;
			return { providerId: p.id, value: cellStatValue(cell, row, stat), cell };
		})
		.filter((e): e is { providerId: string; value: number; cell: MetricCell } => e !== null);

	entries.sort((a, b) => (row.direction === "LIB" ? a.value - b.value : b.value - a.value));

	const best = entries[0]?.value;
	const comparable = entries.length >= 2 && best !== undefined && best !== 0;
	return entries.map((e) => ({
		...e,
		ratio:
			!comparable || best === undefined
				? null
				: row.direction === "LIB"
					? e.value / best
					: best / e.value,
	}));
}
