/**
 * Public surface of @sandbox-benchmarks/figures.
 *
 * Renders a built `Leaderboard` into the figure set that `LEADERBOARD.md` embeds: one SVG per
 * dimension, on that dimension's headline metric. Consumes the `Leaderboard` model from
 * `@sandbox-benchmarks/results` and produces bytes — it never derives a ranking, never re-formats a
 * value (the formatters come from `results`, so the figure and the table cannot disagree), and never
 * touches a provider SDK.
 *
 * The layering inside is deliberate and enforced by ./lib/boundaries:
 *   view/   pure data — widths, formatted cells, and every integrity decision. Holds the tests.
 *   components/  dumb .tsx — props in, elements out.
 *   render/ the only place satori (svg.ts) and the rasterizer (png.ts) are imported.
 */
export { type FontFace, loadFonts } from "./lib/assets/fonts.ts";
export { type RenderedFigure, renderBoardFigures } from "./lib/render/board.ts";
export {
	type FigureManifest,
	figureManifestSchema,
	parseFigureManifest,
} from "./lib/render/manifest.ts";
export { type PngOptions, toPng } from "./lib/render/png.ts";
export { type RenderSvgOptions, renderTableSvg, type Svg } from "./lib/render/svg.ts";
export {
	ADVANCE_RATIO,
	type Align,
	type ColumnSpec,
	type SolvedColumn,
	solveColumns,
	textWidth,
} from "./lib/view/columns.ts";
export {
	buildTableView,
	type Span,
	type TableRowView,
	type TableView,
	type TableViewInput,
} from "./lib/view/metric-table.ts";
export {
	DEFAULT_FIGURE_DIR,
	type FigurePlan,
	figureRefs,
	planReport,
	type ReportPlan,
} from "./plan.ts";
export { dark, light, metrics, type Theme, type ThemeColors, themes, type_ } from "./theme.ts";
