#!/usr/bin/env bun
// `plan-replicates` — emit the per-suite replicate index arrays as a SINGLE LINE of compact JSON object,
// e.g. `{"cpu-node":[0,1,2],"realworld-mastra":[0,1,2,3,4]}`. This is a $GITHUB_OUTPUT contract the Bench
// matrix reads: the suite-matrix job passes each suite its own slice as the reusable bench-suite.yml's
// `replicate` axis (`fromJSON(needs.plan.outputs.replicates)[matrix.suite]`), so N replicate sandboxes
// fan out per (provider, suite) cell — the BETWEEN-MACHINE axis that captures a provider's fleet
// variation (two sandboxes can land on different host hardware).
//
// The count per suite is its schema-declared Suite.defaultReplicas, overridable for the whole run by the
// BENCH_REPLICAS dispatch input (blank = each suite's default; a number scales every suite). The suite
// KEYS match plan-suites' selection exactly (both parse BENCH_SUITES via selectSuites), so the map covers
// precisely the suites the suite axis emits and never desynchronizes from it.
//
// In Actions ($GITHUB_OUTPUT set) the bin writes `replicates=` via emitStepOutputs and logs through
// @actions/core — no bash capture that could splice diagnostics into the outputs file. Mirrors
// plan-providers / plan-suites; the replicate map is an object (not a string[]) so it emits directly
// rather than through the shared string-axis runner in plan-axis.ts.
import * as core from "@actions/core";
import { fail, inActions, logInfo, withGroup } from "../lib/actions-log.ts";
import { handleDiscovery } from "../lib/discovery.ts";
import { emitStepOutputs } from "../lib/gha-output.ts";
import { planReplicateMap } from "../lib/matrix.ts";

/** The per-suite replicate-index map for `suitesRaw` × `replicasRaw` as one line of compact JSON. Takes
 *  the raw strings rather than reading `process.env` itself, so it stays pure — the bin owns the env read,
 *  and a test can't be perturbed by an ambient value. */
export function planReplicatesJson(suitesRaw?: string, replicasRaw?: string): string {
	return JSON.stringify(planReplicateMap(suitesRaw, replicasRaw));
}

/** Agent-facing usage; the bare invocation stays the $GITHUB_OUTPUT replicates contract. */
export const HELP = `plan-replicates — emit the per-suite replicate index arrays as one line of compact JSON object.

usage: plan-replicates [--help] [--list-providers] [--list-suites] [--json]

  (no args)          Print {"cpu-node":[0,1,2], …} on a single line (local), or write replicates= to
                     $GITHUB_OUTPUT when set (the Bench matrix plan step). Each suite maps to [0..R-1].
  --list-providers   List the registered providers each replicate cell runs on.
  --list-suites      List the registered suites and their dimensions/metrics.
  --json             Emit --list-* output as JSON instead of human-readable lines.
  --help, -h         Show this help.

environment:
  BENCH_SUITES       Comma-separated suites to plan replicates for (same selection as plan-suites). Unset
                     or blank selects every registered suite. An unregistered name is an error.
  BENCH_REPLICAS     Replicate sandboxes per (provider, suite) cell. Unset or blank keeps each suite's
                     schema default (Suite.defaultReplicas); a positive integer overrides every suite —
                     higher for tighter between-machine intervals, 1 for a quick single-sandbox pass. A
                     non-positive or non-integer value is an error, never a silently empty fan-out.
  GITHUB_OUTPUT      When set (Actions), write replicates= step output instead of printing on stdout.

examples:
  plan-replicates                              # local: each suite at its schema default replicate count
  BENCH_REPLICAS=5 plan-replicates             # every suite fanned out to 5 replicate sandboxes
  BENCH_SUITES=network BENCH_REPLICAS=1 plan-replicates   # a single network sandbox (a quick pass)

Next: run one replicate with  bench-suite <provider> <suite> <runId> --replicate <idx>`;

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const discovery = handleDiscovery(argv, HELP);
	if (discovery !== null) {
		if (discovery.ok) {
			process.stdout.write(`${discovery.text}\n`);
			process.exit(0);
		}
		fail(discovery.text, { properties: { title: "plan-replicates discovery" }, exitCode: 2 });
	}

	// A bad selection/override must fail the step, not print a diagnostic onto stdout: stdout here IS the
	// replicates value local callers capture, so an error message there would be parsed as the map.
	try {
		const json = planReplicatesJson(process.env.BENCH_SUITES, process.env.BENCH_REPLICAS);
		const map = JSON.parse(json) as Record<string, number[]>;

		if (process.env.GITHUB_OUTPUT) {
			await withGroup("Plan replicate axis", async () => {
				for (const [suite, indices] of Object.entries(map)) {
					logInfo(`suite ${suite}: ${indices.length} replicate(s)`);
				}
				if (inActions()) core.debug(`replicates=${json}`);
			});
			emitStepOutputs(`replicates=${json}`);
			if (inActions()) {
				core.notice(`Planned replicates for ${Object.keys(map).length} suite(s)`, {
					title: "Plan replicates",
				});
			}
		} else {
			// Local / test capture: keep the single-line replicates stdout contract pristine.
			process.stdout.write(`${json}\n`);
		}
	} catch (err) {
		fail(`plan-replicates: ${err instanceof Error ? err.message : String(err)}`, {
			properties: { title: "plan-replicates" },
			exitCode: 2,
		});
	}
}
