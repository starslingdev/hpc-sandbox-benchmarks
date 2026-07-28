/**
 * Shared loader for the Run that `LEADERBOARD.md` names, and the board built from it.
 *
 * Two gates need this — the Markdown artifact-sync check and the figures one — and `buildLeaderboard`
 * over the committed run costs ~8.5 s of seeded bootstrap. `bun test` runs every file in ONE process
 * with a shared module registry, so memoising here makes that cost land once per suite instead of
 * once per gate: the two files together were paying it five times, ~47 s of a ~50 s repo-checks run.
 *
 * The load stays lazy and is called INSIDE each test, never at module scope: a throw during module
 * initialisation aborts the whole file before Bun collects any test, which would silence the
 * determinism checks precisely in the scenario they exist to catch.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Leaderboard } from "@sandbox-benchmarks/results";
import { buildLeaderboard } from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";
import { parseRun } from "@sandbox-benchmarks/schema";
import { findRepoRoot } from "./workspace.ts";

const ROOT = findRepoRoot();

/** The committed artifact both gates are anchored to. */
export const ARTIFACT = join(ROOT, "LEADERBOARD.md");

/**
 * The Run must come from the COMMITTED dataset, which `promote` writes. `data/runs/` is a gitignored
 * raw scratch tree: present on a dev machine, absent in CI, and able to hold a stale or partial Run —
 * rendering from it once silently dropped the whole `economics` dimension from the artifact.
 */
export const runFile = (runId: string) => join(ROOT, "data", "dataset", "runs", `${runId}.json`);

/** The Run id the committed artifact was generated from, read out of its own header line:
 *  "Run `<id>` · commit `<sha>` · generated <iso>". Parsed rather than hardcoded so regenerating the
 *  leaderboard from a newer Run doesn't require editing the gates too. */
export function runIdOf(markdown: string): string {
	const match = markdown.match(/^Run `([^`]+)`/m);
	if (!match?.[1]) {
		throw new Error("LEADERBOARD.md has no `Run <id>` header line — cannot locate its source Run");
	}
	return match[1];
}

export interface CommittedRun {
	/** The committed LEADERBOARD.md text. */
	committed: string;
	runId: string;
	run: Run;
}

let runCache: CommittedRun | undefined;

/** Load (once) the Run the committed artifact names. */
export function loadCommittedRun(): CommittedRun {
	if (runCache) return runCache;
	const committed = readFileSync(ARTIFACT, "utf8");
	const runId = runIdOf(committed);
	const source = runFile(runId);
	try {
		runCache = { committed, runId, run: parseRun(JSON.parse(readFileSync(source, "utf8"))) };
		return runCache;
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

let boardCache: Leaderboard | undefined;

/**
 * The board built from {@link loadCommittedRun}, memoised across gates.
 *
 * Callers that are specifically testing determinism must NOT use this — they need two independent
 * builds to compare. Use `buildLeaderboard(loadCommittedRun().run)` directly there.
 */
export function committedBoard(): Leaderboard {
	boardCache ??= buildLeaderboard(loadCommittedRun().run);
	return boardCache;
}
