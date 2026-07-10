#!/usr/bin/env bun
// `bench-suite` — run a benchmark suite on a provider sandbox, collect the raw results into a
// data/raw tree, and normalize them into a validated Run document. Missing provider credentials are
// recorded as a skip (the provider stays `pending` in the Run), so this is runnable without secrets.

import { join } from "node:path";
import {
	requiredProviders,
	runSuite,
	SuiteUsageError,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import { summarizeRun, writeNormalizedRun } from "@sandbox-benchmarks/results";
import { handleDiscovery } from "../lib/discovery.ts";

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
		if (err instanceof SuiteUsageError) {
			console.error(err.message);
			process.exit(1);
		}
		throw err;
	}

	const run = writeNormalizedRun({ rawRoot, runId, sha, outFile, updateIndexFile: indexFile });
	console.log(`\nNormalized Run ${runId} → ${outFile}`);
	for (const line of summarizeRun(run)) console.log(line);

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
			for (const providerId of unmet) {
				const skips = run.providers.find((p) => p.providerId === providerId)?.skips ?? [];
				const detail = skips.map((s) => `${s.suite}: ${s.reason}`).join("; ");
				console.error(
					`Required provider "${providerId}" produced no metrics${detail ? ` — ${detail}` : " and was absent from the Run"}`,
				);
			}
			process.exit(1);
		}
	}
}
