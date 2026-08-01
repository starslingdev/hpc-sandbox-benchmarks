/**
 * Public surface of the figure package: Run document → realworld figure model → one
 * self-contained HTML document per chart.
 *
 * The input side is typed by `@sandbox-benchmarks/schema` — the workspace's one Run contract
 * and registry shapes — so nothing here re-describes a contract the workspace already owns.
 * The registries still arrive as ARGUMENTS (there is no module-level dataset), which is what
 * lets every guard run against a synthetic run instead of whatever the committed dataset
 * contains.
 *
 * Layering:
 *
 *   phases.ts       the pipeline phase vocabulary — id, label and ramp colour defined once.
 *   model.ts        Run + registries → RealworldFigureModel: exactly the three fields the
 *                   charts consume (suites, providers, phaseOrder). Every other derivation
 *                   over a Run belongs to `packages/results`.
 *   chart/          the view-model (every decision the picture makes, as plain data a unit
 *                   test can assert on) and the HTML template that marks it up. Pure string
 *                   building; fonts come from pinned npm packages, inlined as data: URIs.
 *   screenshot.ts   the ONLY impure module: hands a document to headless Chrome via
 *                   `Bun.WebView` and returns PNG bytes. Behind its own entry point,
 *                   `@sandbox-benchmarks/figures/screenshot`, so importing anything above
 *                   never spawns a browser.
 *
 * Everything on `.` is pure and deterministic: same model, same bytes. The rasterised PNG is
 * NOT — Chrome's output depends on its version and platform — which is exactly why the split
 * sits where it does: the deterministic half is what gates and tests hold onto, the browser
 * half is a leaf with one job.
 */

export { FIGURE_WIDTH, pipelineChartHtml } from "./chart/html.ts";
export {
	buildPipelineChartModel,
	type ChartBar,
	type ChartIncompleteRow,
	type ChartSegment,
	type PipelineChartModel,
	pipelineScaleMaxSOf,
} from "./chart/model.ts";
export {
	type BarSegment,
	buildRealworldFigureModel,
	type FigureModelInput,
	type FigureProvider,
	type PipelineBar,
	type PipelineSuite,
	type RealworldFigureModel,
} from "./model.ts";
export { PHASES, type PhaseId, phaseOf, phaseOfTask } from "./phases.ts";
