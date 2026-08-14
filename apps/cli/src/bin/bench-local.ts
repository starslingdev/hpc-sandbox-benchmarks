#!/usr/bin/env bun
// `bench-local` — run one or more benchmark suites on THIS machine and emit the Run JSON.
//
// The bare-metal counterpart to `bench-suite`. Same suites, same mise tasks, same normalizer, same
// output document — but no provider, no sandbox, no credentials and no CI. What differs is gathered
// in the harness's `localSuitePlan`: the checkout is already here so nothing is cloned, the toolchain
// is the developer's so nothing is installed (only verified), and the producer writes straight into
// the raw tree so nothing is collected.
//
// stdout is the Run document and NOTHING else — that is what makes `bench-local > run.json` and
// `bench-local | jq` work. Every human-facing line goes to stderr, including the harness's own
// progress logs, which `withStdoutQuarantined` redirects for the duration of the run.

import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
	createLocalSandbox,
	LOCAL_TRANSPORT,
	localSetupSteps,
	localSuitePlan,
	runSuiteOnSandbox,
	shutdownOwnedSandboxes,
	writeGapMarker,
} from "@sandbox-benchmarks/harness";
import { aggregateRuns, writeNormalizedRun } from "@sandbox-benchmarks/results";
import type { LocalRunRequest, Run, SuiteName } from "@sandbox-benchmarks/schema";
import { SUITES } from "@sandbox-benchmarks/schema";
import { fail } from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";
import { isWorkingTreeDirty, LocalArgsError, parseLocalArgs } from "../lib/local-args.ts";
import { PromoteGateError, promoteRun } from "../lib/promote-run.ts";
import { replicatePaths } from "../lib/replicates.ts";
import { withStdoutQuarantined } from "../lib/stdout-guard.ts";
import {
	BENCH_LOCAL_BOOLEAN_FLAGS,
	BENCH_LOCAL_VALUE_FLAGS,
	benchLocalFlagHelp,
	benchLocalUsageSpec,
	USAGE_SPEC_FLAG,
} from "../lib/usage-spec.ts";

export const HELP = `bench-local — run one or more benchmark suites on THIS machine and emit the dataset Run JSON.

usage: bench-local [--suites <a,b,c>] [--replicates <indices>] [--as <label>] [--run-id <id>]
                   [--out <file>] [--promote] [--dataset <dir>] [--keep-going]
       bench-local [--help] [--list-suites] [--json] [--usage-spec]

${benchLocalFlagHelp()}

Everything human goes to stderr; stdout is the Run document and nothing else.
No CI, no provider credentials, no network beyond what the suite itself does.

Preconditions are verified up front, across every selected suite, so a long run cannot die on a
missing tool an hour in. Install PTS once with:
  SUDO=sudo bash -c 'source lib/bench.sh && ensure_pts'

examples:
  bench-local --suites memory > run.json        # one suite, Run JSON on stdout
  bench-local --suites all --keep-going         # every registered suite, gaps instead of exits
  bench-local --suites memory --replicates 0,1  # two sequential repeats, folded into replicates[]
  bench-local --suites memory --promote         # publish into data/local (never data/dataset)

Next: \`leaderboard <run.json>\` renders it; \`stability <a.json> <b.json>\` compares two.`;

/** Human-facing progress. stderr by construction, so it can never reach the JSON contract. */
function note(message: string): void {
	console.error(message);
}

/**
 * Verify every selected suite's tools BEFORE any benchmark runs.
 *
 * Up front and across the whole selection, deliberately: a three-suite run that discovers a missing
 * `pnpm` when it reaches the third suite has already spent an hour. The steps come from
 * `localSetupSteps`, so the definition of "what this suite needs" has one owner and is the same list
 * the harness would run per suite.
 */
async function verifyPreconditions(
	request: LocalRunRequest,
): Promise<{ ok: boolean; unmet: Map<SuiteName, Unmet> }> {
	const sandbox = createLocalSandbox({ cwd: request.repoRoot });
	const unmet = new Map<SuiteName, Unmet>();
	try {
		// Deduplicated by script: `check mise` is shared by every suite, so a run that selected `all`
		// would otherwise probe it nine times and print the same remedy nine times.
		const checks = new Map<string, { tool?: string; suites: SuiteName[] }>();
		for (const suiteName of request.suites) {
			for (const step of localSetupSteps(SUITES[suiteName])) {
				const entry = checks.get(step.script) ?? {
					...(step.tool ? { tool: step.tool } : {}),
					suites: [],
				};
				entry.suites.push(suiteName);
				checks.set(step.script, entry);
			}
		}
		for (const [script, { tool, suites }] of checks) {
			const result = await sandbox.runCommand(script);
			if (result.exitCode === 0) {
				// A pin-mismatch note is written to stderr by the check itself; surface it verbatim.
				if (result.stderr?.trim()) note(result.stderr.trim());
				continue;
			}
			const reason = result.stderr?.trim() || `precondition failed (exit ${result.exitCode})`;
			for (const suiteName of suites) {
				const entry = unmet.get(suiteName) ?? { tools: [], reasons: [] };
				if (tool) entry.tools.push(tool);
				entry.reasons.push(reason);
				unmet.set(suiteName, entry);
			}
		}
	} finally {
		await sandbox.destroy();
	}
	return { ok: unmet.size === 0, unmet };
}

/** What one suite is missing: the tools (for the gap cause) and the remedies (for the operator). */
interface Unmet {
	tools: string[];
	reasons: string[];
}

/** Run every selected suite once, into `<rawRoot>/<label>/<suite>/`. Returns true if any failed. */
async function runSuites(
	request: LocalRunRequest,
	rawRoot: string,
	replicateIndex: number,
	unmet: Map<SuiteName, Unmet>,
): Promise<boolean> {
	let failed = false;
	const plan = localSuitePlan({ repoRoot: request.repoRoot, ...(SUDO ? { sudo: SUDO } : {}) });
	for (const suiteName of request.suites) {
		const resultsDir = resolve(join(rawRoot, request.label, suiteName));
		const missing = unmet.get(suiteName);
		if (missing) {
			// --keep-going reached here: record WHY this suite did not run, so the Run discloses the hole
			// rather than simply lacking the suite — the same contract the sandbox lane's skip markers have.
			mkdirSync(resultsDir, { recursive: true });
			writeGapMarker(
				resultsDir,
				request.label,
				suiteName,
				"skipped",
				missing.reasons.join("; "),
				// `tools`, never the suite name: the reader already knows which suite was skipped from the
				// gap's own id, and what they need is what to install.
				missing.tools.length > 0 ? { kind: "missing-tool", tools: missing.tools } : undefined,
			);
			note(`SKIPPED ${suiteName}: ${missing.reasons.join("; ")}`);
			continue;
		}
		note(`\n--- ${suiteName} (r${replicateIndex}) on this machine ---`);
		const sandbox = createLocalSandbox({ cwd: request.repoRoot });
		try {
			await runSuiteOnSandbox(sandbox, {
				runId: request.runId,
				replicateIndex,
				suite: SUITES[suiteName],
				suiteName,
				providerName: request.label,
				resultsDir,
				transport: LOCAL_TRANSPORT,
				plan,
				// One probe: localhost is either up or this process is not running.
				readiness: { maxAttempts: 1, retryDelayMs: 0, probeTimeoutMs: 10_000 },
			});
		} catch (err) {
			// The harness already wrote the failed marker, so the failure becomes a recorded gap on the
			// Run. Carry on to the next suite: a broken `disk` must not discard a finished `memory`.
			failed = true;
			note(`FAILED ${suiteName}: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			await sandbox.destroy();
		}
	}
	return failed;
}

/** Opt back in to sudo for the producer's own install paths; empty by default (see localSuitePlan). */
const SUDO = process.env.BENCH_LOCAL_SUDO?.trim() ?? "";

if (import.meta.main) {
	const argv = process.argv.slice(2);
	// Discovery resolves BEFORE the quarantine, because `--help` and the listings legitimately print to
	// stdout — and because `--usage-spec` is run by mise outside this task's own process (while a shell
	// asks for completions), so it must be fast and touch nothing.
	const discovery = handleDiscovery(argv, HELP, {
		valueFlags: BENCH_LOCAL_VALUE_FLAGS,
		booleanFlags: BENCH_LOCAL_BOOLEAN_FLAGS,
		extras: { [USAGE_SPEC_FLAG]: benchLocalUsageSpec },
	});
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(discovery.text.endsWith("\n") ? discovery.text : `${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "bench-local discovery" }, exitCode: 2 });
	}

	let request: LocalRunRequest & { promote: boolean };
	try {
		request = parseLocalArgs(argv);
	} catch (err) {
		// A usage error, not a benchmark failure: exit 2 with the message and no stack.
		fail(err instanceof LocalArgsError ? err.message : String(err), {
			properties: { title: "bench-local usage" },
			exitCode: 2,
		});
	}

	note(`Benchmarking this machine as "${request.label}" (run ${request.runId})`);
	note(`suites: ${request.suites.join(", ")} · replicates: ${request.replicates.join(", ")}`);
	if (isWorkingTreeDirty(request.repoRoot)) {
		// Disclosed, never blocking: iterating on a task file and measuring the result is the primary
		// local workflow. The Run still records the committed sha, so the reading is not pin-for-pin
		// attributable to that commit — which is exactly what this line says.
		note("NOTE: the working tree has uncommitted changes; the Run's sha names HEAD, not what ran");
	}

	const { unmet, ok } = await verifyPreconditions(request);
	if (!ok && !request.keepGoing) {
		const lines = [...unmet].map(([suite, m]) => `  ${suite}: ${m.reasons.join("; ")}`);
		fail(
			`unmet preconditions on this machine:\n${lines.join("\n")}\n\n` +
				"Install what is missing, or pass --keep-going to record the gap and continue.",
			{ properties: { title: "bench-local preconditions" }, exitCode: 2 },
		);
	}

	let failed = false;
	const { result: run, emit } = await withStdoutQuarantined(async () => {
		const shards: Run[] = [];
		// SEQUENTIAL, both over replicates and over suites. Concurrency here would contend for the same
		// cores, page cache and disk queue, and the numbers would not be comparable to the CI numbers
		// they sit beside — the opposite of what the replicate axis exists to measure.
		for (const replicateIndex of request.replicates) {
			const { rawRoot, outFile } = replicatePaths(request.runId, replicateIndex);
			if (await runSuites(request, rawRoot, replicateIndex, unmet)) failed = true;
			// No `updateIndexFile`: `runIndexEntrySchema` requires an entry's path to be exactly
			// `runs/<runId>.json`, which a `-r<idx>` shard can never be. The shard files themselves are
			// what the aggregate below reads, and this lane's published output is `--out`/`--promote`
			// (whose index `promoteRun` maintains), so there is nothing for a shard index to serve here.
			shards.push(
				writeNormalizedRun({
					rawRoot,
					runId: request.runId,
					sha: request.sha,
					outFile,
					providerIds: [request.label],
					replicateIndex,
				}),
			);
		}
		// Aggregated even at one shard, so the emitted document is ALWAYS the aggregate shape (v5, no
		// replicateIndex) that `promote` and `leaderboard` consume — rather than a shard at R=1 and an
		// aggregate above it, which would make the output's shape depend on a flag.
		return aggregateRuns(shards);
	});

	const provider = run.providers.find((p) => p.providerId === request.label);
	note(
		`\n${request.label}: ${provider?.validationStatus ?? "absent"} ` +
			`metrics=${provider?.metrics.length ?? 0} suites=${provider?.suitesCovered.length ?? 0} ` +
			`gaps=${provider?.gaps.length ?? 0}`,
	);

	if (request.datasetDir) {
		try {
			const { outFile, validated } = promoteRun(run, request.datasetDir);
			note(`Published ${run.runId} → ${outFile} (${validated} validated provider(s))`);
		} catch (err) {
			if (!(err instanceof PromoteGateError)) throw err;
			note(`NOT published: ${err.message}`);
			failed = true;
		}
	}

	const document = `${JSON.stringify(run, null, 2)}\n`;
	if (request.outFile) {
		await Bun.write(request.outFile, document);
		note(`Wrote ${request.outFile}`);
	} else {
		emit(document);
	}

	// The harness registers no owned sandboxes on this lane, but the drain is what guarantees it — and
	// keeps the exit path identical to bench-suite's.
	await shutdownOwnedSandboxes();
	process.exit(failed ? 1 : 0);
}
