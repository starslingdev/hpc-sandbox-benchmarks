/**
 * Board → rendered figures, in memory. Deliberately returns bytes rather than writing them: the CLI
 * bin owns the filesystem (matching `apps/cli/src/bin/leaderboard.ts`, which does its own
 * `writeFileSync`), and the gate needs to render-and-compare without touching the working tree.
 */
import type { Leaderboard } from "@sandbox-benchmarks/results";
import type { FigurePlan, ReportPlan } from "../../plan.ts";
import { planReport } from "../../plan.ts";
import type { Theme } from "../../theme.ts";
import type { TableView } from "../view/metric-table.ts";
import { buildTableView } from "../view/metric-table.ts";
import type { Svg } from "./svg.ts";
import { renderTableSvg } from "./svg.ts";

export interface RenderedFigure {
	readonly plan: FigurePlan;
	readonly view: TableView;
	readonly svg: Svg;
}

export interface RenderBoardOptions {
	readonly theme: Theme;
}

/** Build the view model for one planned figure. Split out so tests can assert the view — where every
 *  decision lives — without rendering anything. */
export function viewForFigure(board: Leaderboard, plan: FigurePlan): TableView {
	const dimension = board.dimensions.find((d) => d.dimension === plan.dimension);
	const entry = dimension?.metrics.find((m) => m.metric.id === plan.metricId);
	if (!entry) {
		throw new Error(
			`figures: plan names ${plan.dimension}/${plan.metricId}, which is not in the board. ` +
				`The plan and the board must come from the same Leaderboard.`,
		);
	}
	return buildTableView(board, entry);
}

export async function renderBoardFigures(
	board: Leaderboard,
	options: RenderBoardOptions,
): Promise<{ plan: ReportPlan; figures: RenderedFigure[] }> {
	const plan = planReport(board);
	const figures: RenderedFigure[] = [];
	for (const figure of plan.figures) {
		const view = viewForFigure(board, figure);
		figures.push({ plan: figure, view, svg: await renderTableSvg(view, { theme: options.theme }) });
	}
	return { plan, figures };
}
