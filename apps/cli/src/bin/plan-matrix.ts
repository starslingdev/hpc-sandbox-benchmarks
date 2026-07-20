#!/usr/bin/env bun
// `plan-matrix` — emit the full provider × suite cell list as a SINGLE LINE of compact JSON.
// Local inspection / discovery helper. CI fans out via `plan-providers` + `plan-suites` (native
// suite→provider nesting); this bin remains for `{"include":[…]}` listing without Actions wiring.
import { fail } from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";
import { buildMatrix, selectProviders } from "../lib/matrix.ts";

/** The matrix JSON for `providersRaw` (a comma-separated `BENCH_PROVIDERS` value; blank/undefined =
 *  every registered provider). Takes the raw string rather than reading `process.env` itself, so it
 *  stays pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planMatrixJson(providersRaw?: string): string {
	return JSON.stringify({ include: buildMatrix(selectProviders(providersRaw)) });
}

/** Agent-facing usage; bare invocation prints one line of cell JSON for local inspection. */
export const HELP = `plan-matrix — emit the provider × suite benchmark matrix as one line of compact JSON.

usage: plan-matrix [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print {"include":[{provider,suite}, …]} on a single line (local cell listing).
  --list-providers   List the registered providers the matrix fans out over.
  --list-suites      List the registered suites the matrix fans out over.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_PROVIDERS    Comma-separated providers to include (e.g. "e2b,daytona-vm,modal-gvisor"). Unset or
                     blank includes every registered provider. An unregistered name is an error,
                     never a silently smaller matrix.

note:
  CI plans axes with plan-providers + plan-suites (bench-matrix.yml → reusable bench-suite.yml).
  Use this bin for local inspection of the cartesian cell list, not as the live $GITHUB_OUTPUT
  contract.

examples:
  plan-matrix                                  # every provider × suite cell
  BENCH_PROVIDERS=e2b,daytona plan-matrix      # only those two providers' cells
  plan-matrix --list-suites --json             # the suites + their dimensions/metrics as JSON

Next: run one cell with  bench-suite <provider> <suite> <runId>
      or plan CI axes with  plan-providers / plan-suites`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "plan-matrix discovery" }, exitCode: 2 });
	}
	// A bad BENCH_PROVIDERS must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// cell-list value local callers capture, so an error message there would be parsed as the matrix.
	try {
		process.stdout.write(`${planMatrixJson(process.env.BENCH_PROVIDERS)}\n`);
	} catch (err) {
		fail(`plan-matrix: ${err instanceof Error ? err.message : String(err)}`, {
			properties: { title: "plan-matrix" },
			exitCode: 2,
		});
	}
}
