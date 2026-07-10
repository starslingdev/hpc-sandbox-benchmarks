#!/usr/bin/env bun
// `plan-matrix` — emit the benchmark matrix as a SINGLE LINE of compact JSON.
// This is the $GITHUB_OUTPUT contract: `matrix=<json>` must be one line, no pretty-printing.
import { handleDiscovery } from "../lib/discovery.ts";
import { buildMatrix, selectProviders } from "../lib/matrix.ts";

/** The matrix JSON for `providersRaw` (a comma-separated `BENCH_PROVIDERS` value; blank/undefined =
 *  every registered provider). Takes the raw string rather than reading `process.env` itself, so it
 *  stays pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planMatrixJson(providersRaw?: string): string {
	return JSON.stringify({ include: buildMatrix(selectProviders(providersRaw)) });
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT matrix contract. */
export const HELP = `plan-matrix — emit the provider × suite benchmark matrix as one line of compact JSON.

usage: plan-matrix [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print {"include":[{provider,suite}, …]} on a single line (the GITHUB_OUTPUT contract).
  --list-providers   List the registered providers the matrix fans out over.
  --list-suites      List the registered suites the matrix fans out over.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_PROVIDERS    Comma-separated providers to fan out over (e.g. "e2b,daytona,modal"). Unset or
                     blank fans out over every registered provider. An unregistered name is an error,
                     never a silently smaller matrix.

examples:
  plan-matrix                                  # the CI matrix: echo "matrix=$(plan-matrix)" >> "$GITHUB_OUTPUT"
  BENCH_PROVIDERS=e2b,daytona plan-matrix      # only those two providers' cells
  plan-matrix --list-suites --json             # the suites + their dimensions/metrics as JSON

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		(discovery.ok ? console.log : console.error)(discovery.text);
		process.exit(discovery.ok ? 0 : 2);
	}
	// A bad BENCH_PROVIDERS must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// `matrix=` value CI captures, so an error message there would be parsed as the matrix.
	try {
		console.log(planMatrixJson(process.env.BENCH_PROVIDERS));
	} catch (err) {
		console.error(`plan-matrix: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}
}
