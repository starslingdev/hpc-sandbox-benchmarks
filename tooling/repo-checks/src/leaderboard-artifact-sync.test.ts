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

const committed = readFileSync(ARTIFACT, "utf8");
const runId = runIdOf(committed);
const run = parseRun(
	JSON.parse(readFileSync(join(ROOT, "data", "dataset", "runs", `${runId}.json`), "utf8")),
);

describe("LEADERBOARD.md stays in sync with the renderer", () => {
	it("is byte-identical to a fresh render of the Run it names", () => {
		const rendered = renderLeaderboardMarkdown(buildLeaderboard(run));
		if (committed !== rendered) {
			// Name the remedy in the failure, rather than leaving whoever hits this to work it out.
			throw new Error(
				`LEADERBOARD.md is stale — the renderer no longer produces the committed file.\n` +
					`Regenerate it:\n  bun apps/cli/src/bin/leaderboard.ts data/dataset/runs/${runId}.json LEADERBOARD.md`,
			);
		}
		expect(committed).toBe(rendered);
	});

	it("renders the same bytes twice, so this gate can't flake on an unseeded bootstrap", () => {
		expect(renderLeaderboardMarkdown(buildLeaderboard(run))).toBe(
			renderLeaderboardMarkdown(buildLeaderboard(run)),
		);
	});
});
