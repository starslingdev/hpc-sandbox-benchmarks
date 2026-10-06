import { dirname, resolve } from "node:path";
import type { LeaderboardDataset } from "@sandbox-benchmarks/results";
import { combineLeaderboardDatasets } from "@sandbox-benchmarks/results";
import { parseRun } from "@sandbox-benchmarks/schema";
import { type } from "arktype";

/**
 * A dataset manifest: the Run paths to pool, relative to the manifest itself. Parsed rather than
 * hand-checked (ADR-0001) — an operator-authored file is exactly the edge schemas exist for.
 *
 * The `.narrow` rejects a repeated path so the common typo is named where the operator wrote it.
 * It is not the whole guard, and deliberately so: two spellings of one path (`a.json`,
 * `./a.json`) or two files holding the same Run pass this and are caught by
 * `combineLeaderboardDatasets`, which is the only place run IDENTITY is known.
 */
const datasetManifestSchema = type("(string >= 1)[] >= 1").narrow((paths, ctx) => {
	const duplicates = [...new Set(paths.filter((path, at) => paths.indexOf(path) !== at))].sort();
	return duplicates.length === 0
		? true
		: ctx.reject({
				expected: `distinct Run paths (repeated: ${duplicates.join(", ")})`,
				actual: "",
			});
});

/** A single Run, or a manifest array of paths relative to the manifest. */
export async function loadLeaderboardInput(
	path: string,
	cohortReview?: string,
): Promise<LeaderboardDataset> {
	const input: unknown = await Bun.file(path).json();
	if (!Array.isArray(input)) return parseRun(input);
	const manifest = datasetManifestSchema.assert(input);
	const runs = await Promise.all(
		manifest.map(async (entry) => parseRun(await Bun.file(resolve(dirname(path), entry)).json())),
	);
	return combineLeaderboardDatasets(runs, { cohortReview });
}
