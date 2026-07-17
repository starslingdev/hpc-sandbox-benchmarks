#!/usr/bin/env bun
// `plan-providers` — emit the selected provider ids as a SINGLE LINE of compact JSON array.
// This is the $GITHUB_OUTPUT contract the Bench matrix reads: `providers=<json>` must be one line.
// Where `plan-matrix` emits the full provider × suite cell list, this emits just the provider axis —
// the Bench matrix now has one named job per suite (grouped by dimension), each fanning out over these
// providers, so the workflow needs the provider list alone as each suite job's matrix. Both bins share
// `selectProviders`, so the registry stays the single source of truth for which providers are valid.
import { handleDiscovery } from "../lib/discovery.ts";
import { selectProviders } from "../lib/matrix.ts";

/** The provider-axis JSON for `providersRaw` (a comma-separated `BENCH_PROVIDERS` value; blank/undefined
 *  = every registered provider). Takes the raw string rather than reading `process.env` itself, so it
 *  stays pure — the bin owns the env read, and a test can't be perturbed by an ambient value. */
export function planProvidersJson(providersRaw?: string): string {
	return JSON.stringify(selectProviders(providersRaw));
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT providers contract. */
export const HELP = `plan-providers — emit the selected benchmark provider ids as one line of compact JSON array.

usage: plan-providers [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print ["e2b","daytona", …] on a single line (the GITHUB_OUTPUT contract): the
                     provider axis every per-suite matrix job in bench-matrix.yml fans out over.
  --list-providers   List the registered providers the matrix can fan out over.
  --list-suites      List the registered suites (one named matrix job each).
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_PROVIDERS    Comma-separated providers to fan out over (e.g. "e2b,daytona,modal"). Unset or
                     blank selects every registered provider. An unregistered name is an error,
                     never a silently smaller matrix.

examples:
  plan-providers                               # the CI provider axis: echo "providers=$(plan-providers)" >> "$GITHUB_OUTPUT"
  BENCH_PROVIDERS=e2b,daytona plan-providers   # only those two providers
  plan-providers --list-suites --json          # the suites each matrix job runs

Next: run one cell with  bench-suite <provider> <suite> <runId>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		(discovery.ok ? console.log : console.error)(discovery.text);
		process.exit(discovery.ok ? 0 : 2);
	}
	// A bad BENCH_PROVIDERS must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// `providers=` value CI captures, so an error message there would be parsed as the matrix axis.
	try {
		console.log(planProvidersJson(process.env.BENCH_PROVIDERS));
	} catch (err) {
		console.error(`plan-providers: ${err instanceof Error ? err.message : String(err)}`);
		process.exit(2);
	}
}
