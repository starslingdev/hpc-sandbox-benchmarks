/**
 * One definition of "the committed figure directory is stale", shared by `figures --check` and the
 * CI gate.
 *
 * These were two hand-rolled comparisons that had already drifted: the bin compared `manifest.json`
 * bytes and the gate did not, so "figures are in sync" meant something different depending on which
 * entry point you ran — and `update-leaderboard.yml` runs the bin before opening a PR that the gate
 * then judges. `planReport` is already the single source of which figures should exist; this is the
 * same treatment for what their contents should be.
 *
 * No satori import, so a caller can check a directory without loading a renderer.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The manifest's file name, and the one non-`.svg` artifact the directory is allowed to contain. */
export const MANIFEST_FILE = "manifest.json";

/** What belongs in a figure directory. The single definition of "an orphan", used by both callers. */
export function committedFigureFiles(dir: string): string[] {
	return readdirSync(dir)
		.filter((file) => file.endsWith(".svg") || file === MANIFEST_FILE)
		.sort();
}

function readOrNull(path: string): string | null {
	try {
		return readFileSync(path, "utf8");
	} catch {
		return null;
	}
}

/**
 * Compare `dir` against the exact contents it should have.
 *
 * Returns one human-readable reason per problem, empty when the directory is current. Orphans are
 * reported as well as differences: the figure set is run-dependent, so a per-file comparison alone
 * would never notice a file left behind when a dimension stopped being emitted.
 *
 * Throws if `dir` does not exist — that is a different failure from "stale", and the caller says so.
 */
export function diffFigureDir(dir: string, expected: ReadonlyMap<string, string>): string[] {
	const onDisk = committedFigureFiles(dir);
	return [
		...onDisk
			.filter((file) => !expected.has(file))
			.map((file) => `${file}: on disk but not in the plan (orphaned figure)`),
		...[...expected].flatMap(([file, want]) => {
			const got = readOrNull(join(dir, file));
			if (got === null) return [`${file}: missing`];
			return got === want ? [] : [`${file}: differs from the current renderer`];
		}),
	];
}
