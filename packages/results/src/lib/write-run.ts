/**
 * Write a normalized {@link Run} to disk and maintain the newest-first Run index. SDK-free —
 * filesystem + schema only. Timestamps default to now; pass `generatedAt` for reproducible output.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import type { Run, RunIndex } from "@sandbox-benchmarks/schema";
import { parseRunIndex } from "@sandbox-benchmarks/schema";
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
}

/** Insert a Run into the index (newest first, de-duplicated by runId) and rewrite the index file. */
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

	const entry = {
		runId: run.runId,
		generatedAt: run.generatedAt,
		// Forward slashes so the index stays portable (relative() yields backslashes on Windows).
		path: relative(dirname(indexPath), runFilePath).replaceAll("\\", "/"),
	};
	// Fixed "en" locale: ISO-8601 strings sort lexicographically === chronologically, regardless of
	// the runtime's default collation.
	const runs = [entry, ...existing.runs.filter((r) => r.runId !== run.runId)].sort((a, b) =>
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
			`${provider.providerId.padEnd(12)} ${provider.validationStatus.padEnd(10)} ` +
			`metrics=${provider.metrics.length} suites=${provider.suitesCovered.length} ` +
			`skipped=${skipped} failed=${failed} uncatalogued=${provider.uncatalogued.length}`
		);
	});
}
