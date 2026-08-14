/**
 * `bench-local`'s argv → a validated {@link LocalRunRequest}.
 *
 * The split is deliberate and is the whole point of the module: this file only ASSEMBLES an object
 * (read flags, apply defaults, expand `all`), and `parseLocalRunRequest` is the single thing that
 * turns it into a value. So every rejection — an unregistered suite, a label that could escape the
 * raw tree, a duplicate replicate index, a runId the dataset filename contract could not hold — is
 * one arktype error at one boundary, rather than a scatter of hand-rolled checks each deciding its
 * own failure mode. Parse, don't validate (ADR-0001).
 */
import { spawnSync } from "node:child_process";
import { LOCAL_DATASET_DIR } from "@sandbox-benchmarks/results";
import type { LocalRunRequest } from "@sandbox-benchmarks/schema";
import { DEFAULT_LOCAL_LABEL, parseLocalRunRequest, SUITE_NAMES } from "@sandbox-benchmarks/schema";
import { hasFlag } from "./discovery.ts";
import { lastFlagValue, parseReplicatesFlag } from "./replicates.ts";
import { ALL_SUITES_TOKEN, DEFAULT_SUITE } from "./usage-spec.ts";

/** A usage error the bin reports without a stack — the operator mistyped something. */
export class LocalArgsError extends Error {}

/**
 * Expand `--suites`. `all` means every registered suite, in registry order; otherwise a comma list in
 * the order given, because a local run executes them in that order and a reader comparing the Run to
 * the command should see the same sequence. Unknown names are NOT rejected here — the schema does it,
 * so the error names the whole request rather than one field at a time.
 */
function parseSuites(raw: string | undefined): string[] {
	if (raw === undefined) return [DEFAULT_SUITE];
	const trimmed = raw.trim();
	if (trimmed === "" || trimmed === ALL_SUITES_TOKEN) return [...SUITE_NAMES];
	return trimmed
		.split(",")
		.map((name) => name.trim())
		.filter((name) => name.length > 0);
}

/**
 * The commit the measurement is taken against, for the Run's `sha`.
 *
 * Best-effort by design: a Run is still a valid, useful measurement from a checkout with no git
 * history (a tarball, a container copy), and refusing to benchmark because `git` could not answer
 * would be a worse trade than recording `"local"` — which is exactly what the CI path already
 * records when `GITHUB_SHA` is unset, and which `commitSourceLink` already renders as bare code
 * rather than a dead link.
 */
export function resolveSha(repoRoot: string): string {
	const result = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" });
	const sha = result.status === 0 ? result.stdout.trim() : "";
	return sha.length > 0 ? sha : "local";
}

/** Whether the checkout has uncommitted changes — disclosed, never blocking (see the bin). */
export function isWorkingTreeDirty(repoRoot: string): boolean {
	const result = spawnSync("git", ["-C", repoRoot, "status", "--porcelain"], { encoding: "utf8" });
	return result.status === 0 && result.stdout.trim().length > 0;
}

export interface LocalArgsEnvironment {
	/** Defaults to `process.cwd()`; injected so the parser is testable without a real checkout. */
	repoRoot?: string;
	/** Defaults to `resolveSha(repoRoot)`. */
	sha?: string;
	/** Defaults to `Date.now()`, used only for the generated runId. */
	now?: number;
}

/**
 * Parse `bench-local`'s argv into a validated request.
 *
 * @throws LocalArgsError for a malformed flag operand, and Error (arktype's summary) for anything the
 * request schema refuses.
 */
export function parseLocalArgs(
	argv: readonly string[],
	environment: LocalArgsEnvironment = {},
): LocalRunRequest {
	const repoRoot = environment.repoRoot ?? process.cwd();
	// `--replicates` reuses the CI fan-out's own parser, so "0,1,2" and "[0,1,2]" mean the same thing
	// in both lanes and a malformed axis fails identically. Absent is the single shard `[0]`.
	let replicates: number[];
	try {
		replicates = parseReplicatesFlag(argv) ?? [0];
	} catch (err) {
		throw new LocalArgsError(err instanceof Error ? err.message : String(err));
	}

	const promote = hasFlag(argv, "--promote");
	const datasetDir = lastFlagValue(argv, "dataset");
	const outFile = lastFlagValue(argv, "out");
	if (datasetDir !== undefined && !promote) {
		// Silently ignoring it would leave the operator believing they had published.
		throw new LocalArgsError("--dataset only applies with --promote");
	}

	return parseLocalRunRequest({
		runId: lastFlagValue(argv, "run-id") ?? `local-${environment.now ?? Date.now()}`,
		label: lastFlagValue(argv, "as") ?? DEFAULT_LOCAL_LABEL,
		suites: parseSuites(lastFlagValue(argv, "suites")),
		replicates,
		repoRoot,
		sha: environment.sha ?? resolveSha(repoRoot),
		...(outFile !== undefined ? { outFile } : {}),
		// `LOCAL_DATASET_DIR` from the results package, which owns where a published Run lives — the same
		// module that owns `DATASET_RUNS_DIR` for the CI lane. A literal here would be a second answer to
		// "where does promote write", and the two would drift the first time either moved.
		...(promote ? { datasetDir: datasetDir ?? LOCAL_DATASET_DIR } : {}),
		keepGoing: hasFlag(argv, "--keep-going"),
	});
}
