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
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { dark, parseFigureManifest, renderBoardFigures } from "@sandbox-benchmarks/figures";
import { figureRefs, planReport } from "@sandbox-benchmarks/figures/plan";
import type { Leaderboard } from "@sandbox-benchmarks/results";
import { buildLeaderboard } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

setDefaultTimeout(120_000);

const ROOT = findRepoRoot();
const FIGURE_DIR = join(ROOT, "docs", "leaderboard");
const ARTIFACT = join(ROOT, "LEADERBOARD.md");

const regenCmd = (runId: string) =>
	`bun apps/cli/src/bin/figures.ts data/dataset/runs/${runId}.json docs/leaderboard && ` +
	`bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/${runId}.json LEADERBOARD.md`;

/** The run id LEADERBOARD.md declares in its header line. */
function committedRunId(): string {
	const markdown = readFileSync(ARTIFACT, "utf8");
	const match = /^Run `([^`]+)`/m.exec(markdown);
	if (!match?.[1]) throw new Error("Could not read the run id from LEADERBOARD.md's header");
	return match[1];
}

let cached: { board: Leaderboard; runId: string } | undefined;
function boardOnce(): { board: Leaderboard; runId: string } {
	if (!cached) {
		const runId = committedRunId();
		const run = parseRun(
			JSON.parse(readFileSync(join(ROOT, "data", "dataset", "runs", `${runId}.json`), "utf8")),
		);
		cached = { board: buildLeaderboard(run), runId };
	}
	return cached;
}

describe("committed figures stay in sync with the renderer", () => {
	it("the file set on disk is exactly the planned set (no missing, no orphans)", () => {
		const { board } = boardOnce();
		const expected = new Set([
			...planReport(board).figures.map((f) => f.fileName),
			"manifest.json",
		]);
		const onDisk = new Set(
			readdirSync(FIGURE_DIR).filter((f) => f.endsWith(".svg") || f === "manifest.json"),
		);
		expect([...onDisk].sort()).toEqual([...expected].sort());
	});

	it("every committed figure is byte-identical to a fresh render", async () => {
		const { board, runId } = boardOnce();
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
		const { runId } = boardOnce();
		const manifest = parseFigureManifest(
			JSON.parse(readFileSync(join(FIGURE_DIR, "manifest.json"), "utf8")),
		);
		// The cross-check that catches a half-landed regeneration: figures from one run beside a
		// Markdown surface describing another.
		expect(manifest.runId).toBe(runId);
	});

	it("the manifest's font digests match the committed font files", async () => {
		const manifest = parseFigureManifest(
			JSON.parse(readFileSync(join(FIGURE_DIR, "manifest.json"), "utf8")),
		);
		expect(manifest.fonts.length).toBeGreaterThan(0);
		for (const font of manifest.fonts) {
			const bytes = await Bun.file(
				join(ROOT, "packages", "figures", "assets", "fonts", font.file),
			).arrayBuffer();
			const digest = await crypto.subtle.digest("SHA-256", bytes);
			const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
			// A font swap reflows every figure; the manifest is what makes that attributable.
			expect(hex).toBe(font.sha256);
		}
	});

	it("LEADERBOARD.md embeds exactly the planned figures, with alt text", () => {
		const { board } = boardOnce();
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
		for (const file of readdirSync(FIGURE_DIR).filter((f) => f.endsWith(".svg"))) {
			const svg = readFileSync(join(FIGURE_DIR, file), "utf8");
			// Satori emits one line; committed as-is, a one-digit change reports as the whole file
			// changed and GitHub refuses to render the diff.
			expect(svg.split("\n").length).toBeGreaterThan(50);
			expect(svg).not.toContain("><");
		}
	});

	it("figures embed glyphs as paths — no <text>, which is font-dependent and sanitiser-fragile", () => {
		for (const file of readdirSync(FIGURE_DIR).filter((f) => f.endsWith(".svg"))) {
			expect(readFileSync(join(FIGURE_DIR, file), "utf8")).not.toContain("<text");
		}
	});
});
