#!/usr/bin/env bun
// `plan-matrix` — emit the benchmark matrix as a SINGLE LINE of compact JSON.
// This is the $GITHUB_OUTPUT contract: `matrix=<json>` must be one line, no pretty-printing.
import { handleDiscovery } from "../lib/discovery.ts";
import { buildMatrix } from "../lib/matrix.ts";

export function planMatrixJson(): string {
	return JSON.stringify({ include: buildMatrix() });
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT matrix contract. */
export const HELP = `plan-matrix — emit the provider × suite benchmark matrix as one line of compact JSON.

usage: plan-matrix [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print {"include":[{provider,suite}, …]} on a single line (the GITHUB_OUTPUT contract).
  --list-providers   List the registered providers the matrix fans out over.
  --list-suites      List the registered suites the matrix fans out over.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

examples:
  plan-matrix                       # the CI matrix: echo "matrix=$(plan-matrix)" >> "$GITHUB_OUTPUT"
  plan-matrix --list-suites --json  # the suites + their dimensions/metrics as JSON

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		console.log(discovery);
		process.exit(0);
	}
	console.log(planMatrixJson());
}
