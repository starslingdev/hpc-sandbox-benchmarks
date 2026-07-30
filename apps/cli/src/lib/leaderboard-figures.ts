// Write the leaderboard's suite charts next to the Markdown.
//
// The derivation and the rendering are `@sandbox-benchmarks/results/figures`, which returns bytes
// and never writes — so that the artifact gate can re-render and compare without touching the
// working tree. This module is the other half: the filesystem, which is the CLI's job.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { LeaderboardFigure } from "@sandbox-benchmarks/results";
import { LEADERBOARD_FIGURE_DIR } from "@sandbox-benchmarks/results";
import { renderLeaderboardFigures } from "@sandbox-benchmarks/results/figures";
import type { Run } from "@sandbox-benchmarks/schema";

export interface WrittenFigures {
	/** What the Markdown must link, in the order it links them. */
	readonly figures: LeaderboardFigure[];
	/** Paths written, relative to `markdownDir` — the same strings the Markdown links, so the
	 *  release job's path allowlist and the document cannot disagree about what this produced. */
	readonly written: string[];
}

/**
 * Render the charts for `run` and write them relative to `markdownDir`.
 *
 * Paths are resolved against the Markdown's own directory, so a render into a scratch directory
 * produces a self-contained document exactly as the repo-root render does.
 *
 * `dryRun` renders without writing: printing the document to stdout has no file for a relative
 * image path to resolve against, so dropping SVGs into the working directory would be a side
 * effect nobody asked a pipe for. The links are still rendered, which is what keeps the piped
 * output the same document.
 */
export async function writeLeaderboardFigures(
	run: Run,
	markdownDir: string,
	options: { readonly dryRun?: boolean } = {},
): Promise<WrittenFigures> {
	const rendered = await renderLeaderboardFigures(run);
	const figures = rendered.map(({ figure }) => figure);
	if (options.dryRun === true) return { figures, written: [] };

	const written: string[] = [];
	for (const { figure, svg } of rendered) {
		const target = join(markdownDir, figure.file);
		mkdirSync(dirname(target), { recursive: true });
		writeFileSync(target, svg);
		written.push(figure.file);
	}
	prune(join(markdownDir, LEADERBOARD_FIGURE_DIR), new Set(figures.map((f) => f.file)));
	return { figures, written };
}

/**
 * Remove SVGs in the figure directory that this render did not produce.
 *
 * Without it, a suite that stops being chartable — retired upstream, or dropped to one completing
 * environment — leaves its old chart committed and unlinked: an image of a comparison that is no
 * longer part of the leaderboard, sitting in the repo looking current, and invisible to the
 * freshness gate because that gate only checks the figures the document links.
 *
 * Deliberately narrow. It reads ONE directory (no recursion), touches only `.svg` files, and only
 * ones absent from the set just written. The directory is this pipeline's own output, and the
 * gate below it (`docs/figures holds exactly the linked charts`) is what catches this going wrong
 * in the direction that matters.
 */
function prune(dir: string, keep: ReadonlySet<string>): void {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch (error) {
		// Nothing rendered into a directory that does not exist — nothing to prune either.
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
		throw error;
	}
	for (const entry of entries) {
		if (!entry.endsWith(".svg")) continue;
		if (keep.has(`${LEADERBOARD_FIGURE_DIR}/${entry}`)) continue;
		rmSync(join(dir, entry));
	}
}
