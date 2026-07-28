/**
 * Invariant: the committed figures under `docs/leaderboard/` are exactly what the current renderer
 * produces from the run `LEADERBOARD.md` names, and the set on disk is exactly the planned set.
 *
 * This is the figure half of `leaderboard-artifact-sync.test.ts`. It differs in two ways that matter:
 *
 *  - SET EQUALITY, not just per-file equality. The figure set is run-dependent (a Run emits figures
 *    only for the dimensions it produced), so a per-file diff proves every file that SHOULD exist is
 *    correct while saying nothing about one that should NOT exist any more. An orphan left behind
 *    when a dimension stops being emitted is invisible to a per-file check.
 *  - A PROVENANCE CROSS-CHECK. The figures live at run-agnostic paths, so the files carry no
 *    evidence of which run they came from; a half-landed regeneration could leave `cpu.svg` from run
 *    A beside a `LEADERBOARD.md` describing run B. `manifest.json` records the run id, and this
 *    compares it against the id in the Markdown header — a text comparison, no rasterizer needed.
 *
 * Cost note: the expensive part is `buildLeaderboard` (~8 s of seeded bootstrap over the committed
 * run), not rendering (~0.3 s for all 7 figures), so the board is built ONCE for the whole file.
 */
import { describe, expect, it, setDefaultTimeout } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
	committedFigureFiles,
	dark,
	fontDigests,
	MANIFEST_FILE,
	parseFigureManifest,
	renderBoardFigures,
} from "@sandbox-benchmarks/figures";
import { figureRefs, planReport } from "@sandbox-benchmarks/figures/plan";
import { ARTIFACT, committedBoard, loadCommittedRun } from "./lib/committed-board.ts";
import { findRepoRoot } from "./lib/workspace.ts";

setDefaultTimeout(120_000);

const ROOT = findRepoRoot();
const FIGURE_DIR = join(ROOT, "docs", "leaderboard");

const regenCmd = (runId: string) =>
	`bun apps/cli/src/bin/figures.ts data/dataset/runs/${runId}.json docs/leaderboard && ` +
	`bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/${runId}.json LEADERBOARD.md`;

const svgFiles = () => committedFigureFiles(FIGURE_DIR).filter((f) => f.endsWith(".svg"));

const manifest = () =>
	parseFigureManifest(JSON.parse(readFileSync(join(FIGURE_DIR, MANIFEST_FILE), "utf8")));

describe("committed figures stay in sync with the renderer", () => {
	it("the file set on disk is exactly the planned set (no missing, no orphans)", () => {
		const board = committedBoard();
		const expected = [...planReport(board).figures.map((f) => f.fileName), MANIFEST_FILE].sort();
		expect(committedFigureFiles(FIGURE_DIR)).toEqual(expected);
	});

	it("every committed figure is byte-identical to a fresh render", async () => {
		const board = committedBoard();
		const { runId } = loadCommittedRun();
		const { figures } = await renderBoardFigures(board, { theme: dark });
		for (const figure of figures) {
			const committed = readFileSync(join(FIGURE_DIR, figure.plan.fileName), "utf8");
			if (committed !== figure.svg) {
				throw new Error(
					`docs/leaderboard/${figure.plan.fileName} is stale — the renderer produces different bytes.\n` +
						`Regenerate: ${regenCmd(runId)}`,
				);
			}
		}
		expect(figures.length).toBeGreaterThan(0);
	});

	it("the manifest parses and names the same run as LEADERBOARD.md", () => {
		const { runId } = loadCommittedRun();
		// The cross-check that catches a half-landed regeneration: figures from one run beside a
		// Markdown surface describing another.
		expect(manifest().runId).toBe(runId);
	});

	it("the manifest records every bundled face, with the digest it actually renders from", async () => {
		// Compared against the package's OWN face list, not against the files the manifest happens to
		// name — otherwise adding a face would leave the manifest describing the old set and this
		// assertion would still pass, validating the record against itself.
		expect(manifest().fonts).toEqual(await fontDigests());
	});

	it("LEADERBOARD.md embeds exactly the planned figures, with alt text", () => {
		const board = committedBoard();
		const markdown = readFileSync(ARTIFACT, "utf8");
		const embedded = [...markdown.matchAll(/^!\[([^\]]*)\]\(([^)]+)\)$/gm)].map((m) => ({
			alt: m[1] ?? "",
			path: m[2] ?? "",
		}));
		const refs = figureRefs(board);
		expect(embedded.map((e) => e.path)).toEqual(refs.map((r) => r.path));
		// An image is not readable by a screen reader; empty alt text would make the figure invisible
		// to one. (The tables below remain the accessible surface regardless.)
		expect(embedded.every((e) => e.alt.length > 20)).toBe(true);
	});

	it("figures are pretty-printed, so a regeneration produces a reviewable diff", () => {
		for (const file of svgFiles()) {
			const svg = readFileSync(join(FIGURE_DIR, file), "utf8");
			// Satori emits one line; committed as-is, a one-digit change reports as the whole file
			// changed and GitHub refuses to render the diff.
			expect(svg.split("\n").length).toBeGreaterThan(50);
			expect(svg).not.toContain("><");
		}
	});

	it("figures embed glyphs as paths — no <text>, which is font-dependent and sanitiser-fragile", () => {
		for (const file of svgFiles()) {
			expect(readFileSync(join(FIGURE_DIR, file), "utf8")).not.toContain("<text");
		}
	});
});
