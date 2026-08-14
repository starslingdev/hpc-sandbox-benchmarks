/**
 * Write a normalized {@link Run} to disk and maintain the newest-first Run index. SDK-free —
 * filesystem + schema only. Timestamps default to now; pass `generatedAt` for reproducible output.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { Run, RunIndex } from "@sandbox-benchmarks/schema";
import { parseRunIndex, providerStatusText, runDocumentPaths } from "@sandbox-benchmarks/schema";
import { normalizeResultsTree } from "./normalize-tree.ts";

/**
 * Write a file atomically: serialize to a sibling temp file, then rename over the target. rename(2) is
 * atomic within a filesystem, so a crash mid-write can never leave a half-written Run/index on disk —
 * a reader sees either the old file or the complete new one.
 */
function atomicWriteFileSync(path: string, contents: string): void {
	mkdirSync(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.tmp`;
	writeFileSync(tmp, contents);
	renameSync(tmp, path);
}

export interface WriteNormalizedRunInput {
	rawRoot: string;
	runId: string;
	sha: string;
	outFile: string;
	generatedAt?: string;
	sourceRunUrl?: string;
	updateIndexFile?: string;
	/** The replicate sandbox index for this shard (the `--replicate` argument), threaded onto the Run. */
	replicateIndex?: number;
}

/** Insert a Run into the index (newest first, one entry per replicate sandbox) and rewrite the file. */
export function updateRunIndex(indexPath: string, run: Run, runFilePath: string): RunIndex {
	// Read-and-parse directly rather than existsSync-then-read: a TOCTOU gap there could throw ENOENT
	// after the Run JSON was already written, orphaning it from the index. A missing index is the
	// first-run case; a corrupt/unreadable one must still surface (don't silently overwrite it).
	let existing: RunIndex;
	try {
		existing = parseRunIndex(JSON.parse(readFileSync(indexPath, "utf8")));
	} catch (err) {
		if (!(err && typeof err === "object" && "code" in err && err.code === "ENOENT")) throw err;
		existing = { schemaVersion: "1", runs: [] };
	}

	// The entry records where the Run document ACTUALLY is — an index whose path is derived rather than
	// measured can name a file that was never written — but it is admitted only if that location is one
	// the Run's identity allows (`runDocumentPaths`, the same rule the schema re-checks it against).
	// Measuring without checking is how entries no RunIndex accepts reached the schema in the first
	// place; checking against a single derived name is how the un-suffixed single-sandbox shard, whose
	// filename is a downstream contract, stopped being writable. Forward slashes so the comparison (and
	// the entry) stay portable: relative() yields backslashes on Windows.
	const path = relative(dirname(indexPath), runFilePath).replaceAll("\\", "/");
	const allowed = runDocumentPaths(run.runId, run.replicateIndex);
	if (!allowed.includes(path)) {
		const identity =
			run.replicateIndex === undefined
				? `Run ${run.runId}`
				: `Run ${run.runId} replicate ${run.replicateIndex}`;
		// Two different mistakes, named apart: an index parked somewhere other than the root of its tree
		// (every Run then resolves outside `runs/`, and NOTHING it could write would validate), versus a
		// correctly placed index handed a Run document under an unexpected name. Reported here, at the
		// call that can still say which two paths disagree, rather than as an arktype summary surfacing
		// from deep inside a write that has already put the Run on disk.
		throw new Error(
			path.startsWith("runs/")
				? `RunIndex ${indexPath} cannot describe ${runFilePath}: ${identity} must be written as ` +
						`${allowed.map((p) => `"${p}"`).join(" or ")} relative to its index, but this one ` +
						`resolves to "${path}"`
				: `RunIndex ${indexPath} cannot describe ${runFilePath}: a Run index must sit at the ROOT ` +
						`of the tree holding its Runs (which live under "runs/"), but this Run resolves to ` +
						`"${path}" relative to the index`,
		);
	}
	const entry = {
		runId: run.runId,
		generatedAt: run.generatedAt,
		path,
		...(run.replicateIndex !== undefined ? { replicateIndex: run.replicateIndex } : {}),
	};
	// Superseded by IDENTITY or by LOCATION, and it has to be both. Identity, because every shard of a
	// fan-out carries the same runId — keying on the id alone would let the last replicate to normalize
	// evict its peers and leave the index claiming a one-sandbox cell. Location, because the two lanes
	// can write the same sandbox under different names (and successive `--replicate <idx>` runs write
	// DIFFERENT indices to the same un-suffixed file): without it the index would keep a stale entry
	// pointing at a document that has since been overwritten by another replicate's results.
	const supersedes = (r: RunIndex["runs"][number]): boolean =>
		(r.runId === run.runId && r.replicateIndex === run.replicateIndex) || r.path === path;
	// Fixed "en" locale: ISO-8601 strings sort lexicographically === chronologically, regardless of
	// the runtime's default collation.
	const runs = [entry, ...existing.runs.filter((r) => !supersedes(r))].sort((a, b) =>
		b.generatedAt.localeCompare(a.generatedAt, "en"),
	);
	const index = parseRunIndex({ schemaVersion: "1", runs });
	atomicWriteFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
	return index;
}

/**
 * Write an already-built {@link Run} to disk (optionally updating a Run index) — the publish primitive
 * the candidate→promote flow uses. Unlike {@link writeNormalizedRun} it does not normalize a raw tree;
 * the Run is already aggregated/validated. Atomic write + atomic index update, so a crash mid-publish
 * leaves the dataset consistent.
 */
export function writeRunDocument(run: Run, outFile: string, updateIndexFile?: string): void {
	const outPath = resolve(outFile);
	atomicWriteFileSync(outPath, `${JSON.stringify(run, null, 2)}\n`);
	if (updateIndexFile) updateRunIndex(resolve(updateIndexFile), run, outPath);
}

/** Normalize a raw tree and write the validated Run JSON (optionally updating a Run index). */
export function writeNormalizedRun(input: WriteNormalizedRunInput): Run {
	const run = normalizeResultsTree({
		rawRoot: resolve(input.rawRoot),
		runId: input.runId,
		sha: input.sha,
		generatedAt: input.generatedAt ?? new Date().toISOString(),
		...(input.sourceRunUrl !== undefined ? { sourceRunUrl: input.sourceRunUrl } : {}),
		...(input.replicateIndex !== undefined ? { replicateIndex: input.replicateIndex } : {}),
	});

	const outPath = resolve(input.outFile);
	atomicWriteFileSync(outPath, `${JSON.stringify(run, null, 2)}\n`);

	if (input.updateIndexFile) updateRunIndex(resolve(input.updateIndexFile), run, outPath);
	return run;
}

/** One human-readable status line per provider, for CLI/CI logs. */
export function summarizeRun(run: Run): string[] {
	return run.providers.map((provider) => {
		// Broken out rather than a single `gaps=` count: a run whose gaps are all deliberate skips and one
		// whose gaps are all crashes are wildly different results, and a lone total says which is which.
		const skipped = provider.gaps.filter((g) => g.outcome === "skipped").length;
		const failed = provider.gaps.filter((g) => g.outcome === "failed").length;
		return (
			`${provider.providerId.padEnd(12)} ${providerStatusText(provider).padEnd(10)} ` +
			`metrics=${provider.metrics.length} suites=${provider.suitesCovered.length} ` +
			`skipped=${skipped} failed=${failed} uncatalogued=${provider.uncatalogued.length}`
		);
	});
}
