/**
 * Public surface of @sandbox-benchmarks/figures.
 *
 * Renders a built `Leaderboard` into the figure set that `LEADERBOARD.md` embeds: one SVG per
 * dimension, on that dimension's headline metric. Consumes the `Leaderboard` model from
 * `@sandbox-benchmarks/results` and produces bytes — it never derives a ranking, never re-formats a
 * value (the formatters come from `results`, so the figure and the table cannot disagree), and never
 * touches a provider SDK.
 *
 * The layering inside is deliberate and enforced by `@repo/repo-checks`:
 *   view/   pure data — widths, formatted cells, and every integrity decision. Holds the tests.
 *   components/  dumb .tsx — props in, elements out.
 *   render/ the only place satori (svg.ts) and the rasterizer (png.ts) are imported.
 *
 * This surface is deliberately narrow: `view/` and `components/` are internals, and publishing them
 * would make every refactor of the layout a breaking change. Anything not here is reachable by
 * relative import inside the package.
 */
export { type FontDigest, fontDigests } from "./lib/assets/fonts.ts";
export { sha256Hex } from "./lib/digest.ts";
export { committedFigureFiles, diffFigureDir, MANIFEST_FILE } from "./lib/figure-dir.ts";
export { type RenderedFigure, renderBoardFigures } from "./lib/render/board.ts";
export { type FigureManifest, parseFigureManifest } from "./lib/render/manifest.ts";
export { toPng } from "./lib/render/png.ts";
export type { Svg } from "./lib/render/svg.ts";
export type { TableView } from "./lib/view/metric-table.ts";
export {
	DEFAULT_FIGURE_DIR,
	type FigurePlan,
	figureRefs,
	planReport,
	type ReportPlan,
} from "./plan.ts";
export { dark, light, type Theme, themes } from "./theme.ts";
