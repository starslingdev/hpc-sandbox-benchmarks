// Write the leaderboard's suite charts next to the Markdown.
//
// The derivation and the chart documents are `@sandbox-benchmarks/results`
// (`renderLeaderboardFigureHtml`), which builds strings and never writes — so the artifact gate
// can re-derive and compare without touching a browser or the working tree. This module is the
// other half: the browser and the filesystem, which are the CLI's job.
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { screenshotHtml } from "@sandbox-benchmarks/figures/screenshot";
import type { LeaderboardFigure } from "@sandbox-benchmarks/results";
import {
	benchmarkDataOf,
	FIGURE_DEVICE_SCALE,
	LEADERBOARD_FIGURE_DIR,
	leaderboardFigures,
	renderLeaderboardFigureHtml,
} from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";

export interface WrittenFigures {
	/** What the Markdown must link, in the order it links them. */
	readonly figures: LeaderboardFigure[];
	/** Paths written, relative to `markdownDir` — the same strings the Markdown links, so the
	 *  release job's path allowlist and the document cannot disagree about what this produced. */
	readonly written: string[];
	/** Committed charts this render deleted because the run no longer draws them. Surfaced so
	 *  the bin can SAY a tracked file disappeared — a deletion only `git status` reveals is a
	 *  side effect, a logged one is a decision. */
	readonly pruned: string[];
}

/**
 * Render the charts for `run` and write them relative to `markdownDir`.
 *
 * Paths are resolved against the Markdown's own directory, so a render into a scratch directory
 * produces a self-contained document exactly as the repo-root render does.
 *
 * Every chart is rasterised TWICE and the bytes compared. Chrome's output is not promised to be
 * stable across machines, but it must be stable across two runs on this one — a mismatch means
 * something nondeterministic leaked into the figure (an animation, a timestamp, a race), and the
 * committed WebP would differ on every regeneration for no reviewable reason. Three charts,
 * sub-second each; cheap enough to hold unconditionally rather than only in the release job.
 *
 * `dryRun` renders no pixels — and no documents: printing to stdout has no file for a relative
 * image path to resolve against, so spawning a browser (or building megabytes of font-inlined
 * HTML nobody will rasterise) would be pure side effect. The figure LIST is derived without
 * either, and the links are still rendered, which keeps the piped output the same document.
 */
export async function writeLeaderboardFigures(
	run: Run,
	markdownDir: string,
	options: { readonly dryRun?: boolean } = {},
): Promise<WrittenFigures> {
	if (options.dryRun === true) {
		return { figures: leaderboardFigures(benchmarkDataOf(run)), written: [], pruned: [] };
	}
	const rendered = renderLeaderboardFigureHtml(run);
	const figures = rendered.map(({ figure }) => figure);

	const written: string[] = [];
	for (const { figure, html } of rendered) {
		const shoot = () =>
			screenshotHtml(html, { width: figure.width, deviceScaleFactor: FIGURE_DEVICE_SCALE });
		const webp = await shoot();
		const again = await shoot();
		if (!Bun.deepEquals(webp, again)) {
			throw new Error(
				`${figure.suiteId}: two renders of the same HTML produced different images — ` +
					`something nondeterministic leaked into the chart document`,
			);
		}
		// Bun.write creates the destination's directory by default — no mkdir preamble.
		await Bun.write(join(markdownDir, figure.file), webp);
		written.push(figure.file);
	}
	const pruned = prune(
		join(markdownDir, LEADERBOARD_FIGURE_DIR),
		new Set(figures.map((f) => f.file)),
	);
	return { figures, written, pruned };
}

/**
 * Remove figures in the figure directory that this render did not produce, returning what went.
 *
 * Without it, a suite that stops being chartable — retired upstream, or dropped to one completing
 * environment — leaves its old chart committed and unlinked: an image of a comparison that is no
 * longer part of the leaderboard, sitting in the repo looking current, and invisible to the
 * freshness gate because that gate only checks the figures the document links.
 *
 * This CAN delete a tracked file from the working tree — that is its job — and rendering from an
 * OLDER run that charts fewer suites will do exactly that. Which is why the deletions are
 * returned rather than swallowed: the bin prints each one, so an exploratory regeneration says
 * "pruned X" instead of leaving a vanished chart for `git status` to explain.
 *
 * Deliberately narrow. It reads ONE directory (no recursion) and touches only `.webp` files — and `.png`, which an earlier revision wrote —
 * absent from the set just written. The directory is this pipeline's own output, and the gate
 * below it (`docs/figures holds exactly the linked charts`) is what catches this going wrong in
 * the direction that matters.
 */
function prune(dir: string, keep: ReadonlySet<string>): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch (error) {
		// Nothing rendered into a directory that does not exist — nothing to prune either.
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw error;
	}
	const pruned: string[] = [];
	for (const entry of entries) {
		if (!entry.endsWith(".webp") && !entry.endsWith(".png")) continue;
		const rel = `${LEADERBOARD_FIGURE_DIR}/${entry}`;
		if (keep.has(rel)) continue;
		rmSync(join(dir, entry));
		pruned.push(rel);
	}
	return pruned;
}
