#!/usr/bin/env bun
// `plan-suites` — emit the selected suite names as a SINGLE LINE of compact JSON array.
// This is a $GITHUB_OUTPUT contract the Bench matrix reads: `suites=<json>` must be one line. Each
// suite job in bench-matrix.yml is gated on membership in this array, so a dispatch can run a subset
// (e.g. just `network`) for pre-merge/targeted validation instead of spending the whole matrix. Shares
// `selectSuites` with the matrix builder, so SUITE_NAMES stays the single source of truth.
import { handleDiscovery } from "../lib/discovery.ts";
import { selectSuites } from "../lib/matrix.ts";

/** The selected-suites JSON for `suitesRaw` (a comma-separated `BENCH_SUITES` value; blank/undefined =
 *  every registered suite). Takes the raw string rather than reading `process.env` itself, so it stays
 *  pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planSuitesJson(suitesRaw?: string): string {
	return JSON.stringify(selectSuites(suitesRaw));
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT suites contract. */
export const HELP = `plan-suites — emit the selected benchmark suite names as one line of compact JSON array.

usage: plan-suites [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print ["cpu-node","system", …] on a single line (the GITHUB_OUTPUT contract): the
                     suites whose matrix jobs run. Each suite job in bench-matrix.yml is gated on this.
  --list-providers   List the registered providers each suite job fans out over.
  --list-suites      List the registered suites (one named matrix job each).
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_SUITES       Comma-separated suites to run (e.g. "network,memory"). Unset or blank selects every
                     registered suite (the main-publish default). An unregistered name is an error,
                     never a silently empty selection.

examples:
  plan-suites                                  # every suite: echo "suites=$(plan-suites)" >> "$GITHUB_OUTPUT"
  BENCH_SUITES=network plan-suites             # only the network suite's job runs
  plan-suites --list-suites --json             # the suites each matrix job runs

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		(discovery.ok ? console.log : console.error)(discovery.text);
		process.exit(discovery.ok ? 0 : 2);
	}
	// A bad BENCH_SUITES must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// `suites=` value CI captures, so an error message there would be parsed as the selection array.
	try {
		console.log(planSuitesJson(process.env.BENCH_SUITES));
	} catch (err) {
		console.error(`plan-suites: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}
}
