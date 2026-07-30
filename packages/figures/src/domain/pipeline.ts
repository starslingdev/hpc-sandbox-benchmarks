/**
 * Pipeline-chart derivations.
 *
 * The shared x-scale is the load-bearing one: every pipeline chart on the page and every
 * pipeline FIGURE measures a second at the same length, which is only true while both
 * read the same maximum out of the same run. Scaling each chart to its own maximum would
 * make three unrelated pictures out of one comparison.
 */
import type { SandboxBenchmarkData, SandboxProvider } from "./types.ts";

/** Shared x-scale across the pipeline charts: the slowest charted total. */
export function pipelineScaleMaxSOf(data: SandboxBenchmarkData): number {
	return Math.max(...data.suites.flatMap((s) => s.bars.map((b) => b.totalS)));
}

/** Provider id → provider, for the chart rows that carry only an id. */
export function providerIndexOf(
	providers: readonly SandboxProvider[],
): Record<string, SandboxProvider> {
	return Object.fromEntries(providers.map((p) => [p.id, p])) as Record<string, SandboxProvider>;
}
