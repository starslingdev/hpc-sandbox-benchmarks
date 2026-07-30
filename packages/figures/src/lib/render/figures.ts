/**
 * Spec → rendered figure, in memory.
 *
 * Deliberately returns bytes rather than writing them: the CLI owns the filesystem, and a
 * gate needs to render-and-compare without touching the working tree.
 *
 * The dataset is threaded through as an argument rather than read from the module, so a
 * figure and the disclosure attached to it always come from the SAME run. That is not
 * hypothetical tidiness — the disclosure bug this package's guards exist to catch was
 * exactly a footnote derived from one place and rows derived from another.
 */
import type { CompositeSpec, SandboxBenchmarkData } from "../../domain/index.ts";
import { backfillNoteOf, dimensionLabels, resolveComposite } from "../../domain/index.ts";
import type { Theme } from "../../theme.ts";
import { light } from "../../theme.ts";
import type { PageFigureView } from "../view/page/blocks.ts";
import type { PageFigureContent } from "../view/page/content.ts";
import { buildPageFigures } from "../view/page/index.ts";
import type { TableView } from "../view/table.ts";
import { buildTableView } from "../view/table.ts";
import { renderPageFigureSvg } from "./page-svg.tsx";
import type { PngResult } from "./png.ts";
import { toPng } from "./png.ts";
import type { Svg } from "./svg.tsx";
import { renderTableSvg } from "./svg.tsx";

export interface RenderedFigure {
	readonly name: string;
	/** The composite's view model, or `null` for a page figure — the two are different
	 *  models on purpose, and collapsing them into one union that every caller has to narrow
	 *  would buy nothing: the only consumer of either is a test. */
	readonly view: TableView | null;
	readonly svg: Svg;
	/** Rasterised at `options.scale`. Present unless `png: false` was passed — rasterising
	 *  is the cheap half of the pipeline, so it is on by default and opted OUT of. */
	readonly png: PngResult | null;
}

export interface RenderOptions {
	readonly theme?: Theme;
	/** Skip rasterisation. Only useful when the caller wants the SVG alone. */
	readonly png?: boolean;
	/** Device-pixel ratio for the PNG. See DEFAULT_SCALE in ./png.ts. */
	readonly scale?: number;
}

/**
 * Everything the package needs from outside itself: one run, the composites the caller
 * publishes, and the authored strings two of the page figures reproduce. There is no
 * default for any of them — a default would be a module-level singleton, and the absence
 * of one is what lets a guard render the whole set against a synthetic fixture.
 */
export interface FigureInput {
	readonly data: SandboxBenchmarkData;
	readonly specs: readonly CompositeSpec[];
	readonly content: PageFigureContent;
}

export async function renderFigure(
	spec: CompositeSpec,
	data: SandboxBenchmarkData,
	options: RenderOptions = {},
): Promise<RenderedFigure> {
	const view = buildTableView(resolveComposite(spec, data), {
		title: spec.title,
		dimensionLabels,
		backfillNote: backfillNoteOf(data.backfill),
		run: data.run,
	});
	const svg = await renderTableSvg(view, options.theme ?? light);
	return {
		name: spec.name,
		view,
		svg,
		png: options.png === false ? null : toPng(svg, options.scale),
	};
}

/** One page-anchor figure: the reproduction of a `data-snapshot` region. */
export async function renderPageFigure(
	view: PageFigureView,
	options: RenderOptions = {},
): Promise<RenderedFigure> {
	const svg = await renderPageFigureSvg(view);
	return {
		name: view.anchor,
		view: null,
		svg,
		png: options.png === false ? null : toPng(svg, options.scale),
	};
}

/**
 * Everything `plan.ts` plans: the composites, then the page figures.
 *
 * Order matters only for the console output; set-equality against the plan is what the
 * CLI actually asserts, so a figure that goes missing fails rather than being noticed by
 * whoever reads the log.
 */
export async function renderFigures(
	input: FigureInput,
	options: RenderOptions = {},
): Promise<RenderedFigure[]> {
	const out: RenderedFigure[] = [];
	for (const spec of input.specs) out.push(await renderFigure(spec, input.data, options));
	for (const view of buildPageFigures(input.data, input.content)) {
		out.push(await renderPageFigure(view, options));
	}
	return out;
}
