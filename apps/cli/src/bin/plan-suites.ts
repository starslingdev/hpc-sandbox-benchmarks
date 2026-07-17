#!/usr/bin/env bun
// `plan-suites` — emit the selected suite names as a SINGLE LINE of compact JSON array.
// This is a $GITHUB_OUTPUT contract the Bench matrix reads: `suites=<json>` must be one line. The
// suite-matrix job expands `fromJSON(needs.plan.outputs.suites)`, so a dispatch can run a subset
// (e.g. just `network`) for pre-merge/targeted validation instead of spending the whole matrix. Shares
// `selectSuites` with the matrix builder, so SUITE_NAMES stays the single source of truth.
//
// In Actions ($GITHUB_OUTPUT set) the bin writes `suites=` via emitStepOutputs and logs through
// @actions/core — no bash capture that could splice diagnostics into the outputs file. Control flow
// lives in `plan-axis.ts` (shared with plan-providers).
import { selectSuites } from "../lib/matrix.ts";
import { planAxisJson, runAxisPlan } from "../lib/plan-axis.ts";

/** The selected-suites JSON for `suitesRaw` (a comma-separated `BENCH_SUITES` value; blank/undefined =
 *  every registered suite). Takes the raw string rather than reading `process.env` itself, so it stays
 *  pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planSuitesJson(suitesRaw?: string): string {
	return planAxisJson(selectSuites, suitesRaw);
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT suites contract. */
export const HELP = `plan-suites — emit the selected benchmark suite names as one line of compact JSON array.

usage: plan-suites [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print ["cpu-node","system", …] on a single line (local), or write suites= to
                     $GITHUB_OUTPUT when set (the Bench matrix plan step).
  --list-providers   List the registered providers each suite-matrix cell fans out over.
  --list-suites      List the registered suites (one suite-matrix cell each).
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_SUITES       Comma-separated suites to run (e.g. "network,memory"). Unset or blank selects every
                     registered suite (the main-publish default). An unregistered name is an error,
                     never a silently empty selection.
  GITHUB_OUTPUT      When set (Actions), write suites= step output instead of printing on stdout.

examples:
  plan-suites                                  # local: print every suite
  BENCH_SUITES=network plan-suites             # only the network suite's cells run
  plan-suites --list-suites --json             # the suites the suite-matrix job can expand

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	await runAxisPlan(
		{
			binName: "plan-suites",
			envKey: "BENCH_SUITES",
			outputKey: "suites",
			groupTitle: "Plan suite axis",
			noticeTitle: "Plan suites",
			itemLabel: "suite",
			help: HELP,
			select: selectSuites,
		},
		process.argv.slice(2),
	);
}
