/**
 * The realworld pipeline charts, rendered — the entry point `apps/cli` uses to produce the
 * three figures that lead `LEADERBOARD.md`'s `realworld` section.
 *
 * Narrow on purpose. `renderFigures` in ./figures.ts renders the whole published set (three
 * composites plus eight page anchors) and needs the authored KPI band and per-suite prose to do
 * it; the leaderboard wants three charts and no prose it did not derive. Rather than teach that
 * function to render a subset — a filter argument whose wrong value silently produces fewer
 * files — this is its own function over the same builder.
 *
 * WHICH SUITES GET A FIGURE IS THE INGEST'S DECISION, NOT THIS FUNCTION'S. `data.suites` already
 * holds exactly the suites worth charting: `ingest/build.ts` drops a suite nobody exercised, and
 * one where fewer than two environments completed EVERY exercised task (a partial pipeline would
 * chart an understated total as if it were comparable). This maps over what it is given. The
 * caller therefore cannot ask for a chart the data does not support, and the markdown cannot
 * link a file that was not written — both read the same array.
 */
import type { PipelineSuite, SandboxBenchmarkData } from "../../domain/index.ts";
import { buildPipelineFigure } from "../view/page/pipeline.ts";
import { renderPageFigureSvg } from "./page-svg.tsx";
import type { Svg } from "./svg.tsx";

/** One rendered suite chart, plus the facts a caption or a gate wants without re-deriving them. */
export interface SuiteFigure {
	/** The suite's registry id, e.g. `realworld-better-auth`. Names the output file. */
	readonly suiteId: string;
	/** Display name from the tasks' catalog labels, e.g. `Better-Auth`. */
	readonly suiteName: string;
	readonly svg: Svg;
	/** Canvas width in CSS px. Yoga computes the height; see ./svg.tsx on why it is never passed. */
	readonly width: number;
	/** Environments charted (bars) and, separately, those disclosed as not having completed. */
	readonly charted: number;
	readonly incomplete: number;
	readonly tasks: number;
}

/**
 * How a chart's paragraph is written. Taking a FUNCTION rather than a `Record<string, string>`
 * keeps this package with no opinion about the caption while making it impossible to render a
 * chart whose caption belongs to a different suite — the note is asked for by suite, at the
 * moment that suite is drawn.
 */
export type SuiteNote = (suite: PipelineSuite) => string;

export async function renderSuiteFigures(
	data: SandboxBenchmarkData,
	note: SuiteNote,
): Promise<SuiteFigure[]> {
	const out: SuiteFigure[] = [];
	for (const suite of data.suites) {
		const view = buildPipelineFigure(suite, data, note(suite));
		out.push({
			suiteId: suite.id,
			suiteName: suite.name,
			svg: await renderPageFigureSvg(view),
			width: view.width,
			charted: suite.bars.length,
			incomplete: suite.incomplete.length,
			tasks: suite.tasks.length,
		});
	}
	return out;
}
