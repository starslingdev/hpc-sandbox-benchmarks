/**
 * Public surface of the figure package.
 *
 * It renders a derived model into self-contained SVG (and PNG) share images. It never selects
 * rows, never derives a ranking and never re-formats a value on its own terms: the derivations
 * and formatters live in `domain/`, so a figure and a table rendered from the same run cannot
 * drift into disagreeing about a number.
 *
 * NOTHING IN HERE IMPORTS THE REST OF THE REPO — not `@sandbox-benchmarks/schema`, not the CLI.
 * The Run document, the metric catalog and every caption arrive as arguments; there is no
 * module-level dataset and no default spec list. That is what makes the package buildable on its
 * own, and it is the same property that lets every guard below run against a synthetic fixture
 * instead of against whatever the committed run happens to contain.
 * `tooling/repo-checks/src/boundary.test.ts` enforces the no-edge-back rule.
 *
 * The layering inside is deliberate:
 *
 *   ingest/      raw documents (a Run + a catalog) → the derived run. The package's front door,
 *                so it goes raw dataset → image rather than starting from an artifact someone
 *                else produced. Satori-free; import it as `@sandbox-benchmarks/figures/ingest`.
 *   domain/      the shape of a run, the PARSE that admits a document into that shape, and every
 *                pure derivation, formatter and label over it. A leaf.
 *   view/        pure data — solved widths, formatted cells, every integrity decision. Holds the
 *                tests, because asserting `columns[2].width === 130` is a unit test and
 *                asserting on an SVG string is not.
 *   components/  dumb .tsx — props in, elements out. Never sees a raw number.
 *   render/      the ONLY place satori is imported.
 *   plan.ts      a separate, satori-free entry point so a gate can compute the expected file set
 *                without loading a renderer and seven fonts.
 *
 * `view/` and `components/` are internals: publishing them would make every layout change a
 * breaking change. Anything not exported here is still reachable by relative import inside the
 * package. `domain/` is deliberately NOT re-exported through this entry point — importing it
 * must not drag satori in, so consumers import `@sandbox-benchmarks/figures/domain` directly.
 */

export {
	type FigureInput,
	type RenderedFigure,
	renderFigure,
	renderFigures,
} from "./lib/render/figures.ts";
export { DEFAULT_SCALE, type PngResult, toPng } from "./lib/render/png.ts";
export {
	renderSuiteFigures,
	type SuiteFigure,
	type SuiteNote,
} from "./lib/render/suite-figures.ts";
export type { Svg } from "./lib/render/svg.tsx";
export type { PageFigureContent } from "./lib/view/page/content.ts";
export type { TableView } from "./lib/view/table.ts";
export { DEFAULT_FIGURE_DIR, type FigurePlan, planFigures } from "./plan.ts";
export { dark, light, type Theme, type ThemeName, themes } from "./theme.ts";
