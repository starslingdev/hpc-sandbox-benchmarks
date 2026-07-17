#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.
// In GitHub Actions it also writes a compact job summary + run annotation so the nested
// "<suite> / <provider>" cell shows a clean result without digging through the log.

import { join } from "node:path";
import * as core from "@actions/core";
import {
	requiredProviders,
	runSuite,
	SuiteUsageError,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import { summarizeRun, writeNormalizedRun } from "@sandbox-benchmarks/results";
import type { Run } from "@sandbox-benchmarks/schema";
import { handleDiscovery } from "../lib/discovery.ts";

/** Escape HTML metacharacters for values reaching core.summary addHeading/addRaw (those APIs do not
 *  escape). Mirrors release-summary.ts. */
function escapeHtml(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Write the cell's outcome to the Actions job summary + annotations panel when running in GHA.
 *  No-op locally so `bun apps/cli/src/bin/bench-suite.ts` stays a plain CLI. */
async function writeActionsResult(opts: {
	provider: string;
	suite: string;
	runId: string;
	outFile: string;
	run: Run;
	failed: boolean;
	detail?: string;
}): Promise<void> {
	if (process.env.GITHUB_ACTIONS !== "true") return;
	const status = opts.failed ? "failure" : "success";
	const title = `${opts.suite} / ${opts.provider}`;
	const lines = summarizeRun(opts.run);
	core.summary.addHeading(escapeHtml(title), 3).addTable([
		[
			{ data: "Field", header: true },
			{ data: "Value", header: true },
		],
		["Status", status],
		["Suite", `<code>${escapeHtml(opts.suite)}</code>`],
		["Provider", `<code>${escapeHtml(opts.provider)}</code>`],
		["Run", `<code>${escapeHtml(opts.runId)}</code>`],
		["Artifact path", `<code>${escapeHtml(opts.outFile)}</code>`],
	]);
	if (lines.length > 0) {
		core.summary.addHeading("Provider status", 4);
		core.summary.addCodeBlock(lines.join("\n"));
	}
	if (opts.detail) {
		core.summary.addRaw(escapeHtml(opts.detail));
		core.summary.addEOL();
	}
	await core.summary.write();
	const annotation = lines[0] ?? opts.detail ?? title;
	if (opts.failed) core.error(annotation, { title });
	else core.notice(annotation, { title });
}

/** Agent-facing usage; bare invocation keeps the daytona/cpu-node local-dev default. */
export const HELP = `bench-suite — run a benchmark suite on a provider sandbox and normalize it into a Run document.

usage: bench-suite [provider] [suite] [runId]
       bench-suite [--help] [--list-providers] [--list-suites] [--json]

  provider           Provider to run on (default: daytona). See --list-providers.
  suite              Suite to run (default: cpu-node). See --list-suites.
  runId              Run identifier for the data/ tree (default: local-<timestamp>).
  --require <ids>    Comma-separated providers that MUST reach "validated"; exit 1 otherwise.
                     Also read from REQUIRE_PROVIDERS. CI sets this so a missing secret fails loudly.
  --list-providers   List the registered providers.
  --list-suites      List the registered suites and their dimensions/metrics.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

Missing provider credentials are recorded as a skip (the provider stays "pending"), so this is
runnable without secrets. Writes data/runs/<runId>.json and updates data/runs/index.json.

examples:
  bench-suite daytona cpu-node            # one suite locally, auto runId
  bench-suite modal memory ci-1234        # a specific cell + runId
  bench-suite e2b memory --require e2b    # fail (don't skip) if E2B_API_KEY is absent
  bench-suite --list-suites               # discover the suite names first

Next: render the Run with \`leaderboard data/runs/<runId>.json\`.`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP, ["--require"]);
	if (discovery !== null) {
		(discovery.ok ? console.log : console.error)(discovery.text);
		process.exit(discovery.ok ? 0 : 2);
	}

	// Filter flags out before positional resolution so a trailing/misplaced flag (e.g.
	// `bench-suite daytona cpu-node --json`) never gets captured as the runId. `--require` is the one
	// flag that takes a separate operand, so consume that operand too — otherwise `--require daytona`
	// would leave `daytona` behind to be read as the runId.
	const positionals: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === undefined) continue;
		// Only the space-separated spelling needs the skip: `--require=<ids>` is a single token and is
		// already dropped by the leading-`-` guard below.
		if (arg === "--require") {
			i++;
			continue;
		}
		if (arg.startsWith("-")) continue;
		positionals.push(arg);
	}
	const provider = positionals[0] ?? "daytona";
	const suite = positionals[1] ?? "cpu-node";
	const runId = positionals[2] ?? `local-${Date.now()}`;
	const sha = process.env.GITHUB_SHA ?? "local";

	const rawRoot = join("data", "raw", runId);
	const outFile = join("data", "runs", `${runId}.json`);
	const indexFile = join("data", "runs", "index.json");

	// A suite that RAN AND BROKE is a result — the harness has already written its `--failed.json` marker
	// into the raw tree — so the error is held, not thrown. Normalizing anyway is what turns that marker
	// into a recorded `failed` gap on this shard's Run document; rethrowing here would skip the write, the
	// shard would contribute nothing for the aggregate to merge, and the only trace of the failure would
	// die inside the CI artifact. The job still goes red at the bottom of this block.
	let suiteError: unknown;
	try {
		await runSuite({
			providerName: provider,
			suiteName: suite,
			// Tag the raw tree by suite: `<rawRoot>/<provider>/<suite>/`. The normalizer reads each suite
			// subdirectory independently and rejects any catalogued metric a suite emits off its declared
			// Dimensions (the runtime half of the suite↔dimension↔metric contract).
			resultsDir: join(rawRoot, provider, suite),
		});
	} catch (err) {
		// A usage error (unknown provider/suite) produced no raw tree and no marker: there is nothing to
		// normalize, and pretending otherwise would write an empty Run for a cell that never existed.
		if (err instanceof SuiteUsageError) {
			console.error(err.message);
			process.exit(1);
		}
		suiteError = err;
	}

	let run: Run;
	try {
		run = writeNormalizedRun({ rawRoot, runId, sha, outFile, updateIndexFile: indexFile });
	} catch (normalizeErr) {
		// Never let a normalization failure mask the benchmark failure that caused it.
		if (suiteError) throw suiteError;
		throw normalizeErr;
	}
	console.log(`\nNormalized Run ${runId} → ${outFile}`);
	for (const line of summarizeRun(run)) console.log(line);

	if (suiteError) {
		const detail =
			`Suite "${suite}" failed on ${provider} — recorded as a failed gap in ${outFile}: ` +
			`${suiteError instanceof Error ? suiteError.message : String(suiteError)}`;
		console.error(`\n${detail}`);
		await writeActionsResult({
			provider,
			suite,
			runId,
			outFile,
			run,
			failed: true,
			detail,
		});
		process.exit(1);
	}

	// Missing credentials (and an unusable sandbox) are recorded as a skip, not a throw — the lenient
	// local-dev default. That would make a smoke run whose secret is missing/misnamed exit 0 having
	// benchmarked nothing, so CI passes `--require <provider>` (or REQUIRE_PROVIDERS) to assert the
	// provider actually reached `validated` — i.e. produced at least one catalogued metric.
	// Pass the sliced argv explicitly rather than letting it default to `process.argv` (which also
	// carries the bun executable and script path), so the flag this bin parses is the flag this gate reads.
	const required = requiredProviders(argv);
	if (required.length > 0) {
		const reports = run.providers.map((p) => ({
			provider: p.providerId,
			status: p.validationStatus === "validated" ? "ok" : p.validationStatus,
		}));
		const unmet = unmetRequirements(reports, required);
		if (unmet.length > 0) {
			const details: string[] = [];
			for (const providerId of unmet) {
				// The gaps ARE the explanation for "no metrics", and their outcome is the important half of
				// it: a required provider that skipped on a precondition is a configuration problem, one that
				// failed is an outage, and the operator reading this line needs to know which they have.
				const gaps = run.providers.find((p) => p.providerId === providerId)?.gaps ?? [];
				const gapDetail = gaps.map((g) => `${g.id} ${g.outcome}: ${g.reason}`).join("; ");
				const line = `Required provider "${providerId}" produced no metrics${gapDetail ? ` — ${gapDetail}` : " and was absent from the Run"}`;
				console.error(line);
				details.push(line);
			}
			await writeActionsResult({
				provider,
				suite,
				runId,
				outFile,
				run,
				failed: true,
				detail: details.join("\n"),
			});
			process.exit(1);
		}
	}

	await writeActionsResult({ provider, suite, runId, outFile, run, failed: false });
}
