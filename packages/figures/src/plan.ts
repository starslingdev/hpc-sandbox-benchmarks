/**
 * The exact set of figures that should exist on disk. Pure and synchronous: calling
 * `planFigures` loads no satori, reads no font and touches no file. (The module GRAPH
 * reaches `node:fs` — the page anchors' text measurement imports the font table — but
 * the read behind it is lazy and cached, so planning never triggers it.)
 *
 * This is a separate entry point from index.ts for one reason a per-file byte-diff cannot
 * cover: ORPHANS. The figure set is spec-dependent — retire a composite and its file is
 * still sitting in the output directory, correct in itself and describing a comparison
 * nobody publishes any more. Stating the gate as set-equality against this plan closes
 * that, and keeping the plan free of satori means the gate can compute it without loading
 * a renderer and two 340 KB font files.
 */
import type { CompositeSpec, SandboxBenchmarkData } from "./domain/index.ts";
import { pageFigureAnchors } from "./lib/view/page/index.ts";

export interface FigurePlan {
	readonly name: string;
	/** Stable file names, derived from the spec name — no run id, so the tree does not grow
	 *  a file per run. Both formats are planned together so a gate asserting set-equality
	 *  cannot pass while one of the pair is missing. */
	readonly svgFile: string;
	readonly pngFile: string;
	/** Alt text for any Markdown/HTML embed. An image is not readable by a screen reader. */
	readonly altText: string;
}

/** Where generated figures land by default, relative to the repo root. Gitignored: these
 *  are build outputs, and figures already published in a post are immutable. */
export const DEFAULT_FIGURE_DIR = ".screenshots/sandbox-benchmarks";

export function planFigures(
	specs: readonly CompositeSpec[],
	data: SandboxBenchmarkData,
): FigurePlan[] {
	return [
		...specs.map((spec) => ({
			name: spec.name,
			svgFile: `${spec.name}.svg`,
			pngFile: `${spec.name}.png`,
			altText:
				spec.title ??
				`${spec.name}: a filtered view of the sandbox-benchmark all-metrics table` +
					(spec.providers ? `, restricted to ${spec.providers.join(" and ")}` : ""),
		})),
		// The PAGE figures: one per `data-snapshot` anchor on /sandbox-benchmarks, rendered
		// from the data rather than photographed.
		//
		// The FILE names carry a `-figure` suffix while the figure NAME stays the anchor's.
		// That is not decoration: `pnpm sandbox-benchmarks:snapshots` writes `<anchor>.png`
		// into the SAME default directory, and a figure sharing the file name would silently
		// overwrite the crop it is supposed to be compared against — destroying the ground
		// truth as a side effect of rendering. Keeping the name equal to the anchor is what
		// lets `figure-diff` pair the two without a lookup table.
		...pageFigureAnchors(data).map((anchor) => ({
			name: anchor,
			svgFile: `${anchor}-figure.svg`,
			pngFile: `${anchor}-figure.png`,
			altText: `${anchor}: the /sandbox-benchmarks ${anchor.replace(/-/g, " ")} panel, rendered from the run's derived data`,
		})),
	];
}
