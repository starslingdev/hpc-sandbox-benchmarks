/**
 * `Leaderboard` → the exact set of figures that should exist on disk. Pure and synchronous: no
 * satori, no rasterizer, no filesystem.
 *
 * This exists for one reason that a per-file byte-diff cannot cover: ORPHANS. The figure set is
 * run-dependent — a Run emits figures only for the dimensions it actually produced, and the catalog
 * declares nine dimensions of which the current committed run emits seven. Diffing each rendered
 * file against its committed twin proves every file that SHOULD exist is correct; it says nothing
 * about a file that should NOT exist any more, left behind when a dimension stopped being emitted.
 * Stating the gate as set-equality against this plan closes that.
 *
 * Keeping it pure also keeps the gate cheap: `@repo/repo-checks` can assert the file set without
 * pulling satori and a 2.5 MB wasm blob into the package that runs on every `bun test`.
 */
import type { FigureRef, Leaderboard } from "@sandbox-benchmarks/results";

/**
 * Where the committed figures live, relative to the repo root — and therefore relative to
 * LEADERBOARD.md, which sits beside it. A stable path (not one keyed by run id) keeps the tree from
 * growing a directory per run; the manifest is what records which run the files came from.
 */
export const DEFAULT_FIGURE_DIR = "docs/leaderboard";

export interface FigurePlan {
	/** Stable file name, derived from the dimension — no run id, so the tree does not grow per run. */
	readonly fileName: string;
	/** The dimension this figure is the headline of. */
	readonly dimension: string;
	/** The metric actually rendered (the dimension's headline). */
	readonly metricId: string;
	/** Alt text for the Markdown embed. An image is not readable by a screen reader; this is. */
	readonly altText: string;
}

export interface ReportPlan {
	/** Carried from the board so a figure can never be labelled with another run's id. */
	readonly runId: string;
	readonly sha: string;
	readonly generatedAt: string;
	readonly figures: readonly FigurePlan[];
}

/** One figure per dimension, on that dimension's headline metric — the same metric the Markdown
 *  prints first under the dimension heading. */
export function planReport(board: Leaderboard): ReportPlan {
	const figures: FigurePlan[] = [];
	for (const dimension of board.dimensions) {
		const headline = dimension.metrics[0];
		if (!headline || headline.rows.length === 0) continue;
		figures.push({
			fileName: `${dimension.dimension}.svg`,
			dimension: dimension.dimension,
			metricId: headline.metric.id,
			altText: `${dimension.dimension} headline: ${headline.metric.label ?? headline.metric.id} (${headline.metric.unit}), ${headline.rows.length} providers ranked, run ${board.runId}`,
		});
	}
	return {
		runId: board.runId,
		sha: board.sha,
		generatedAt: board.generatedAt,
		figures,
	};
}

/**
 * The figure references to embed in LEADERBOARD.md.
 *
 * Derived from the same plan the renderer and the gate use, so the Markdown can never reference a
 * figure that was not generated (or miss one that was). This module is a separate entry point
 * (`@sandbox-benchmarks/figures/plan`) precisely so the Markdown path and the CI gate can compute it
 * WITHOUT loading satori and a 2.5 MB wasm rasterizer.
 */
export function figureRefs(board: Leaderboard, dir: string = DEFAULT_FIGURE_DIR): FigureRef[] {
	return planReport(board).figures.map((figure) => ({
		dimension: figure.dimension,
		path: `${dir}/${figure.fileName}`,
		altText: figure.altText,
	}));
}
