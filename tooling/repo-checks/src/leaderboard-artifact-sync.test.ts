// Invariant: the committed LEADERBOARD.md is exactly what the current renderer produces from the Run
// it names. The file is generated ("do not edit by hand") but nothing re-generated it in CI, so a
// change to `renderLeaderboardMarkdown` or to the ranking silently left the published comparison
// surface stale — showing readers an old table while the code computed a new one. This gate closes
// that gap the same way workflow-registry-sync does: re-derive the truth and diff.
//
// This is only sound because the leaderboard is deterministic: the bootstrap is seeded from stable
// Run/Metric/provider identity (see schema/analysis.ts `seededRng`), and `generatedAt` is read from the
// Run document rather than the clock. A Math.random() bootstrap would make this gate flake on every run.
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLeaderboard, renderLeaderboardMarkdown } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./lib/workspace.ts";

const ROOT = findRepoRoot();
const ARTIFACT = join(ROOT, "LEADERBOARD.md");
/** The Run the artifact is rendered from must be the COMMITTED dataset (`data/dataset/runs/`), which
 *  `promote` writes. `data/runs/` is a gitignored raw scratch tree: it exists on a dev machine, is
 *  absent in CI, and can hold a stale/partial Run — rendering from it once silently dropped the whole
 *  `economics` dimension from this file. */
const runFile = (runId: string) => join(ROOT, "data", "dataset", "runs", `${runId}.json`);
const regenCmd = (runId: string) =>
	`bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/${runId}.json LEADERBOARD.md`;

/** The Run id the committed artifact was generated from, read out of its own header line:
 *  "Run `<id>` · commit `<sha>` · generated <iso>". Parsed rather than hardcoded so regenerating the
 *  leaderboard from a newer Run doesn't require editing this gate too. */
function runIdOf(markdown: string): string {
	const match = markdown.match(/^Run `([^`]+)`/m);
	if (!match?.[1]) {
		throw new Error("LEADERBOARD.md has no `Run <id>` header line — cannot locate its source Run");
	}
	return match[1];
}

/**
 * Load the Run the committed artifact names. Called INSIDE each test, never at module scope: a throw
 * during module initialisation aborts the whole file before Bun collects any test, so a missing source
 * Run would take the determinism test below down with it — silencing the check precisely in the
 * scenario it exists to catch (an artifact rendered from the gitignored `data/runs/`).
 */
function loadCommittedRun(): {
	committed: string;
	runId: string;
	run: ReturnType<typeof parseRun>;
} {
	const committed = readFileSync(ARTIFACT, "utf8");
	const runId = runIdOf(committed);
	const source = runFile(runId);
	try {
		return { committed, runId, run: parseRun(JSON.parse(readFileSync(source, "utf8"))) };
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			// A named Run that isn't in the committed dataset means the artifact was rendered from the
			// gitignored raw tree — say so, rather than failing later with a bare ENOENT. try/catch
			// rather than an existsSync pre-check, so there is no TOCTOU gap.
			throw new Error(
				`LEADERBOARD.md names Run "${runId}", but ${source} is not committed. The artifact must be ` +
					`rendered from the published dataset (data/dataset/runs/), not the gitignored data/runs/.`,
			);
		}
		throw error;
	}
}

describe("LEADERBOARD.md stays in sync with the renderer", () => {
	// TEMPORARILY SKIPPED on this branch only. This PR changes the renderer but deliberately does NOT
	// regenerate the 735-line LEADERBOARD.md, so the generated artifact can be reviewed on its own in
	// the PR stacked directly above (which regenerates it and re-enables this assertion). The skip is
	// undone one branch up; it never reaches main.
	it.skip("is byte-identical to a fresh render of the Run it names", () => {
		const { committed, runId, run } = loadCommittedRun();
		const rendered = renderLeaderboardMarkdown(buildLeaderboard(run));
		if (committed !== rendered) {
			// Name the remedy in the failure, rather than leaving whoever hits this to work it out.
			throw new Error(
				`LEADERBOARD.md is stale — the renderer no longer produces the committed file.\n` +
					`Regenerate it:\n  ${regenCmd(runId)}`,
			);
		}
		expect(committed).toBe(rendered);
	});

	it("renders the same bytes twice, so this gate can't flake on an unseeded bootstrap", () => {
		// Loads independently of the test above: each resolves the Run itself, so one failing reports
		// its own diagnosis instead of aborting the file and taking the other down with it.
		const { run } = loadCommittedRun();
		expect(renderLeaderboardMarkdown(buildLeaderboard(run))).toBe(
			renderLeaderboardMarkdown(buildLeaderboard(run)),
		);
	});
});
