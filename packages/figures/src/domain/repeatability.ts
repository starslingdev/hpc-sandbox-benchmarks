// ---------------------------------------------------------------------------
// Repeatability — how far apart an environment's replicate sandboxes landed.
// ---------------------------------------------------------------------------
import { median } from "./metrics.ts";
import type { MetricCell, MetricTableRow, SandboxBenchmarkData, SandboxProvider } from "./types.ts";

/**
 * Relative spread of one cell across its replicate SANDBOXES: (max − min) ÷
 * median over each sandbox's own median (`rep`), falling back to the raw
 * samples for a cell that predates the replicate breakdown. Null when fewer
 * than two points exist or the median is zero.
 *
 * `rep` is preferred over `samples` deliberately: on a v3 run the pooled
 * samples mix within-sandbox pass noise (the convergence-mode suites run a
 * varying number of passes on one machine) with between-sandbox differences,
 * and the repeatability question — "if I get a fresh sandbox tomorrow, how far
 * from this median might it land?" — is about the machines, not the passes.
 * This is still a RANGE, not a variance estimate: it answers how far apart the
 * run's sandboxes landed, and nothing stronger.
 */
export function cellSpread(cell: MetricCell): number | null {
	const points = cell.rep ?? cell.samples;
	if (!points || points.length < 2) return null;
	if (cell.p50 === 0) return null;
	return (Math.max(...points) - Math.min(...points)) / Math.abs(cell.p50);
}

export interface ProviderRepeatability {
	provider: string;
	name: string;
	/** Measured cells with a multi-sandbox breakdown — the population the spread is taken over. */
	cells: number;
	/** Median relative spread: the typical between-sandbox gap. */
	medianSpread: number;
	/** The single widest cell, and the metric it landed on. */
	worstSpread: number;
	worstLabel: string;
}

/**
 * Per-environment replicate spread, tightest median first. Every measured cell
 * with two samples counts — no metric is excluded for being inconvenient, so
 * the two iperf3 WAN rows (a public-Internet path, the noisiest thing the run
 * measures) are in here and tend to be an environment's worst cell.
 */
export function repeatabilityOf(
	groups: { rows: MetricTableRow[] }[],
	providers: SandboxProvider[],
): ProviderRepeatability[] {
	return providers
		.map((provider) => {
			const spreads: number[] = [];
			let worstSpread = 0;
			let worstLabel = "";
			for (const group of groups) {
				for (const row of group.rows) {
					if (row.derived) continue;
					const cell = row.values[provider.id];
					if (!cell) continue;
					const spread = cellSpread(cell);
					if (spread === null) continue;
					spreads.push(spread);
					if (spread > worstSpread) {
						worstSpread = spread;
						worstLabel = row.label;
					}
				}
			}
			return {
				provider: provider.id,
				name: provider.name,
				cells: spreads.length,
				medianSpread: spreads.length === 0 ? 0 : median(spreads),
				worstSpread,
				worstLabel,
			};
		})
		.filter((r) => r.cells > 0)
		.sort((a, b) => a.medianSpread - b.medianSpread || a.provider.localeCompare(b.provider, "en"));
}

/** Widest median in the panel — the shared bar scale. */
export function repeatabilityScaleMaxOf(entries: readonly ProviderRepeatability[]): number {
	return Math.max(...entries.map((r) => r.medianSpread));
}

/** Replicate count for the nameplate: the range of replicate SANDBOXES (`r`)
 *  across the run's measured (non-derived) cells — "3–12" on this run
 *  (benchmark suites on three sandboxes, pipelines on twelve; a lost cell
 *  narrows one metric's count). Falls back to the pooled-pass count `n` for a
 *  run predating the replicate breakdown, where the two coincided. Derived, so
 *  the nameplate can't claim a fleet the data doesn't carry. */
export function replicateNOf(data: SandboxBenchmarkData): string {
	const counts = new Set<number>();
	for (const group of data.dimensionGroups) {
		for (const row of group.rows) {
			if (row.derived) continue;
			for (const cell of Object.values(row.values)) {
				if (cell) counts.add(cell.r ?? cell.n);
			}
		}
	}
	const sorted = [...counts].sort((a, b) => a - b);
	if (sorted.length === 0) return "0";
	const lo = sorted[0];
	const hi = sorted[sorted.length - 1];
	return lo === hi ? String(lo) : `${lo}–${hi}`;
}
