#!/usr/bin/env bun
// `assemble-run` — merge a matrix run's per-cell raw artifacts into ONE curated raw tree
// (`data/raw/<runId>/`), the tree the normalizer (the package-raw schema gate) consumes.
//
//   assemble-run <artifactsDir> <destDir> <runId> <sha> <sourceRunUrl>
//
// The bench-suite lane uploads one artifact per cell named `benchmark-results-<suite>-sandbox-<provider>`
// (the raw-files contract); this resolves each back to its provider via parseResultsArtifactName — the
// tested inverse of resultsArtifactName, so the artifact-name → provider mapping can't drift from the
// writer side — and merges every suite's subtree under one dir per provider. Setup-time skip markers
// (`setup-skips/<provider>/`, for providers the planner dropped) merge in alongside. Curated down to
// structured tool output (logs/OS cruft dropped, ADR-0006), plus a run.json provenance stamp.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseResultsArtifactName } from "@sandbox-benchmarks/schema";

/** Immediate subdirectory names of `dir`, sorted (so first-writer-wins merges are deterministic), or
 *  `[]` when it doesn't exist (a run may produce no results). */
function subdirs(dir: string): string[] {
	try {
		return readdirSync(dir, { withFileTypes: true })
			.filter((e) => e.isDirectory())
			.map((e) => e.name)
			.sort();
	} catch {
		return [];
	}
}

/** Merge `src`'s contents into `dest`, first-writer-wins on a duplicate filename (the `cp -n` semantics
 *  the rare cross-suite collision needs). */
function mergeInto(src: string, dest: string): void {
	mkdirSync(dest, { recursive: true });
	cpSync(src, dest, { recursive: true, force: false, errorOnExist: false });
}

export interface AssembleRunInput {
	/** Directory the per-cell artifacts were downloaded into (one subdir per artifact). */
	artifactsDir: string;
	/** The Run's raw tree to build, e.g. `data/raw/<runId>`. */
	destDir: string;
	runId: string;
	sha: string;
	sourceRunUrl: string;
}

/** Assemble the curated raw tree for one matrix run; returns the providers that contributed a subtree. */
export function assembleRun(input: AssembleRunInput): { providers: string[] } {
	mkdirSync(input.destDir, { recursive: true });
	const providers = new Set<string>();

	// benchmark-results-<suite>-sandbox-<provider> → one dir per provider, suites merged.
	for (const name of subdirs(input.artifactsDir)) {
		const parsed = parseResultsArtifactName(name);
		if (!parsed) continue;
		mergeInto(join(input.artifactsDir, name), join(input.destDir, parsed.provider));
		providers.add(parsed.provider);
	}

	// Skip markers for providers the planner dropped from the matrix (setup-skips/<provider>/).
	const skipsRoot = join(input.artifactsDir, "setup-skips");
	for (const provider of subdirs(skipsRoot)) {
		mergeInto(join(skipsRoot, provider), join(input.destDir, provider));
		providers.add(provider);
	}

	// Curate down to structured tool output: drop logs and OS cruft.
	for (const entry of readdirSync(input.destDir, { recursive: true, withFileTypes: true })) {
		if (entry.isFile() && (entry.name.endsWith(".log") || entry.name === ".DS_Store")) {
			rmSync(join(entry.parentPath, entry.name), { force: true });
		}
	}

	writeFileSync(
		join(input.destDir, "run.json"),
		`${JSON.stringify({ runId: input.runId, sha: input.sha, sourceRunUrl: input.sourceRunUrl })}\n`,
	);
	return { providers: [...providers].sort() };
}

if (import.meta.main) {
	const [artifactsDir, destDir, runId, sha, sourceRunUrl] = process.argv.slice(2);
	if (!artifactsDir || !destDir || !runId || !sha || !sourceRunUrl) {
		console.error("usage: assemble-run <artifactsDir> <destDir> <runId> <sha> <sourceRunUrl>");
		process.exit(1);
	}
	const { providers } = assembleRun({ artifactsDir, destDir, runId, sha, sourceRunUrl });
	console.log(`Assembled ${destDir} from providers: ${providers.join(", ") || "(none)"}`);
}
