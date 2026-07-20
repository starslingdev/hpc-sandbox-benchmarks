#!/usr/bin/env bun
// `plan-providers` — emit the selected provider ids as a SINGLE LINE of compact JSON array.
// This is the $GITHUB_OUTPUT contract the Bench matrix reads: `providers=<json>` must be one line.
// Where `plan-matrix` emits the full provider × suite cell list, this emits just the provider axis —
// bench-matrix.yml's suite-matrix job fans out over these providers via the reusable bench-suite.yml
// (native nesting: "<suite> / <provider>"). Shares `selectProviders` with the matrix builder, so the
// registry stays the single source of truth for which providers are valid.
//
// In Actions ($GITHUB_OUTPUT set) the bin writes `providers=` via emitStepOutputs and logs through
// @actions/core — no bash capture that could splice diagnostics into the outputs file. The suite axis
// is the sibling `plan-suites` bin (honors `BENCH_SUITES`). Control flow lives in `plan-axis.ts`.
import { selectProviders } from "../lib/matrix.ts";
import { planAxisJson, runAxisPlan } from "../lib/plan-axis.ts";

/** The provider-axis JSON for `providersRaw` (a comma-separated `BENCH_PROVIDERS` value; blank/undefined
 *  = every registered provider). Takes the raw string rather than reading `process.env` itself, so it
 *  stays pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planProvidersJson(providersRaw?: string): string {
	return planAxisJson(selectProviders, providersRaw);
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT providers contract. */
export const HELP = `plan-providers — emit the selected benchmark provider ids as one line of compact JSON array.

usage: plan-providers [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print ["e2b","daytona-vm", …] on a single line (local), or write providers= to
                     $GITHUB_OUTPUT when set (the Bench matrix plan step).
  --list-providers   List the registered providers the matrix can fan out over.
  --list-suites      List the registered suites (the suite axis; see plan-suites).
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_PROVIDERS    Comma-separated providers to fan out over (e.g. "e2b,daytona-vm,modal"). Unset or
                     blank selects every registered provider. An unregistered name is an error,
                     never a silently smaller matrix.
  GITHUB_OUTPUT      When set (Actions), write providers= step output instead of printing on stdout.

examples:
  plan-providers                               # local: print the provider axis
  BENCH_PROVIDERS=e2b,daytona-vm plan-providers   # only those two providers
  plan-providers --list-suites --json          # discover suites (selection is plan-suites)

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	await runAxisPlan(
		{
			binName: "plan-providers",
			envKey: "BENCH_PROVIDERS",
			outputKey: "providers",
			groupTitle: "Plan provider axis",
			noticeTitle: "Plan providers",
			itemLabel: "provider",
			help: HELP,
			select: selectProviders,
		},
		process.argv.slice(2),
	);
}
