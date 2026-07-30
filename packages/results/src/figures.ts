/**
 * `@sandbox-benchmarks/results/figures` — rendering the leaderboard's suite charts.
 *
 * A SECOND entry point rather than more exports on `.`, because importing this one loads satori
 * and its Yoga wasm. Every other bin in the CLI (`normalize`, `promote`, `aggregate`, `stability`)
 * imports `@sandbox-benchmarks/results` for the Run model and the leaderboard types, and none of
 * them draws anything; folding the renderer into that surface would put a megabyte of layout
 * engine on the startup path of all of them. The satori-free half — the catalog document, the
 * ingest call, the figure list the Markdown links — stays on `.`, which is what lets the artifact
 * gate reproduce the document without rendering a pixel.
 *
 * It returns BYTES AND NEVER WRITES. Two consumers need that: `apps/cli` writes the files next to
 * the Markdown, and `tooling/repo-checks` compares a fresh render against the committed ones and
 * must not touch the working tree to do it. It is also the figure package's own doctrine —
 * "the CLI owns the filesystem" — and following it here is why the gate can exist at all.
 */
import { renderSuiteFigures } from "@sandbox-benchmarks/figures";
import type { Run } from "@sandbox-benchmarks/schema";
import { benchmarkDataOf, leaderboardFigures, suiteFigureNote } from "./lib/figures.ts";
import type { LeaderboardFigure } from "./lib/leaderboard.ts";

/** One chart, ready to be written or compared. */
export interface RenderedLeaderboardFigure {
	/** What the Markdown links it as — the same value the renderer is handed. */
	readonly figure: LeaderboardFigure;
	/** The SVG document. Self-contained: glyph outlines, no external font reference. */
	readonly svg: string;
}

/**
 * Render every chartable suite in `run`.
 *
 * The returned `figure` values are the SAME ones {@link renderLeaderboardMarkdown} must be given.
 * That is the whole point of returning them together: the Markdown cannot link an image this
 * function did not produce, so a published page with a broken image is not a state the code can
 * reach — as opposed to one a test has to remember to look for.
 */
export async function renderLeaderboardFigures(run: Run): Promise<RenderedLeaderboardFigure[]> {
	const data = benchmarkDataOf(run);
	const expected = leaderboardFigures(data);
	const rendered = await renderSuiteFigures(data, suiteFigureNote);

	// Both halves map over the same `data.suites`, so they agree by construction — and the
	// construction is the kind that a later refactor can quietly break, in the one direction that
	// matters (the Markdown links a file nobody wrote). Cheap to assert, so assert it.
	const drawn = rendered.map((figure) => figure.suiteId).join(", ");
	const listed = expected.map((figure) => figure.suiteId).join(", ");
	if (drawn !== listed) {
		throw new Error(
			`figure set disagrees with the figure list: rendered [${drawn}] but the Markdown would ` +
				`link [${listed}]. Both derive from the same ingest, so this is a code defect, not a ` +
				`property of the run.`,
		);
	}

	return rendered.map((figure, index) => ({
		// Indexed, not looked up: the check above established these are the same list in the same
		// order, and a `find` here would silently paper over the next time they are not.
		figure: expected[index] as LeaderboardFigure,
		svg: figure.svg,
	}));
}
