/**
 * The eight page figures, built from the derived data artifact.
 *
 * One per `data-snapshot` anchor on /sandbox-benchmarks, named the same thing, so a
 * figure and the crop it reproduces pair up without a lookup table anywhere.
 *
 * The three pipeline charts are one builder over the dataset's own suite list rather than
 * three entries: a suite added upstream becomes a figure automatically, and cannot be the
 * one somebody forgot to add here.
 *
 * The run and the authored strings are ARGUMENTS. Nothing in this package reads either
 * from a module, which is what lets the guards build these figures against a synthetic
 * fixture — and what keeps `src/figures` buildable without the site around it.
 */

import type { SandboxBenchmarkData } from "../../../domain/index.ts";
import type { PageFigureView } from "./blocks.ts";
import type { PageFigureContent } from "./content.ts";
import { buildCoverageFigure } from "./coverage.ts";
import { buildEnvironmentsFigure } from "./environments.ts";
import { buildKpisFigure } from "./kpis.ts";
import { buildMetricsFigure } from "./metrics.ts";
import { buildPipelineFigure, pipelineAnchorOf } from "./pipeline.ts";
import { buildRepeatabilityFigure } from "./repeatability.ts";

export function buildPageFigures(
	data: SandboxBenchmarkData,
	content: PageFigureContent,
): PageFigureView[] {
	return [
		buildKpisFigure(content.headlineStats),
		...data.suites.map((suite) =>
			buildPipelineFigure(suite, data, content.suiteNotes[suite.id] ?? ""),
		),
		buildEnvironmentsFigure(data),
		buildMetricsFigure(data),
		buildRepeatabilityFigure(data),
		buildCoverageFigure(data),
	];
}

/** Anchor names only, without building anything. `../../../plan.ts` needs the file set
 *  and must stay free of satori and of the font files. */
export function pageFigureAnchors(data: SandboxBenchmarkData): string[] {
	return [
		"kpis",
		...data.suites.map(pipelineAnchorOf),
		"environments",
		"all-metrics",
		"repeatability",
		"coverage",
	];
}
