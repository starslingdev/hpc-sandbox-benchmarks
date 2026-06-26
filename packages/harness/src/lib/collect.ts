/**
 * Results collection for a suite run: pulls benchmark-results/ back to the host via a base64 tar
 * stream over stdout (no temp file in the sandbox, so it works even when the sandbox disk is full —
 * exactly when partial results matter), and writes harness skip markers. The pulled files are the
 * raw inputs the normalizer consumes — the committed raw tool output is the dataset's source of truth.
 */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	harnessSkipMarkerJson,
	isPtsResultFile,
	isSkipMarkerFile,
	sandboxSkipMarkerFile,
} from "@sandbox-benchmarks/schema";
import type { StepRunner } from "./execute.ts";
import { MIN } from "./execute.ts";
import { DIR } from "./setup.ts";

const RESULTS_BEGIN = "__BENCH_RESULTS_TGZ_BEGIN__";
const RESULTS_END = "__BENCH_RESULTS_TGZ_END__";

/** Pull the sandbox's benchmark-results/ into `resultsDir` on the host. */
export async function collectResults(runner: StepRunner, resultsDir: string): Promise<void> {
	runner.phase = "collect";
	// Capability-driven transport: on a capped provider the tar|base64 payload lands in the step's log
	// file and is read back, so a large or slow collect can't 408 the synchronous exec mid-stream; on an
	// uncapped provider it streams straight back over a direct exec. Both populate `result.stdout`, and
	// the BEGIN/END markers bound the base64 within that captured output either way.
	const result = await runner.step(
		"collect benchmark-results",
		`cd ${DIR} && mkdir -p benchmark-results && ` +
			`echo ${RESULTS_BEGIN} && tar -czf - benchmark-results | base64 | tr -d '\\n' && echo && echo ${RESULTS_END}`,
		5 * MIN,
		// Silent: the step's stdout IS the base64 tarball — echoing it would flood the CI log.
		{ silent: true },
	);

	const stdout = result.stdout || "";
	const begin = stdout.indexOf(RESULTS_BEGIN);
	const end = stdout.indexOf(RESULTS_END);
	if (begin === -1 || end === -1 || end <= begin) {
		throw new Error("Could not locate results payload markers in sandbox output");
	}
	const base64 = stdout.slice(begin + RESULTS_BEGIN.length, end).trim();

	// Decode straight to disk via the "base64" write encoding — avoids a Node-only Buffer in the
	// cross-runtime package code. A random suffix keeps concurrent collects from colliding.
	const archive = join(tmpdir(), `bench-results-${process.pid}-${randomUUID()}.tgz`);
	try {
		writeFileSync(archive, base64, "base64");
		const target = resolve(resultsDir);
		// The tarball holds a top-level benchmark-results/ directory. Extract into a unique staging
		// dir (not `parent`, which is shared across providers) so concurrent collects can't clobber
		// each other, then copy its contents into the target (`<provider>`, not `benchmark-results`).
		const stage = join(tmpdir(), `bench-extract-${process.pid}-${randomUUID()}`);
		mkdirSync(stage, { recursive: true });
		try {
			execFileSync("tar", ["-xzf", archive, "-C", stage]);
			cpSync(join(stage, "benchmark-results"), target, { recursive: true });
		} finally {
			rmSync(stage, { recursive: true, force: true });
		}
		// Validate the collected tree carries real signal: at least one PTS result or skip marker
		// (the #39 naming contract). A suite that produced neither — the benchmark crashed before
		// writing anything AND no marker was recorded — is silent data loss; fail loudly here rather
		// than let an empty results directory upload and report as a green run.
		const collected = readdirSync(target);
		if (!collected.some((name) => isPtsResultFile(name) || isSkipMarkerFile(name))) {
			throw new Error(
				`Collected results for ${resultsDir} contain no PTS result or skip marker ` +
					`(found: ${collected.join(", ") || "nothing"}); the suite produced no usable output`,
			);
		}
		console.log(
			`Results extracted to ${resultsDir} (${(statSync(archive).size / 1024).toFixed(1)} KiB archive)`,
		);
	} finally {
		rmSync(archive, { force: true });
	}
}

/** Write a harness skip marker (whole suite × provider never ran) into the results directory. */
export function writeSkipMarker(
	resultsDir: string,
	provider: string,
	suite: string,
	reason: string,
): void {
	mkdirSync(resultsDir, { recursive: true });
	writeFileSync(
		join(resultsDir, sandboxSkipMarkerFile(provider, suite)),
		harnessSkipMarkerJson(provider, suite, reason),
	);
}
