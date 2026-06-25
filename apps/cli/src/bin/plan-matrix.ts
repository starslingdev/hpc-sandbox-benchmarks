#!/usr/bin/env bun
// `plan-matrix` — plan the provider × suite benchmark matrix for the bench-matrix orchestrator.
//
// Validates the requested providers/suites against the registries, drops the providers whose credentials
// are absent (writing one skip marker per dropped (provider, suite) cell under `--skip-markers`), and
// emits the credentialed provider list + selected suites to `$GITHUB_OUTPUT` for the per-suite reusable
// workflow to fan over. With no `$GITHUB_OUTPUT` (local dev) the same `name=value` lines print to stdout.
//
//   plan-matrix [--providers <csv|all>] [--suites <csv|all>] [--skip-markers <dir>]
//
// Outputs (the $GITHUB_OUTPUT contract the orchestrator reads):
//   providers  — compact JSON array of credentialed provider ids, e.g. ["daytona"] (the suite matrix)
//   suites     — comma-padded selected-suite list, e.g. ,cpu-node, (suite jobs gate on contains(',name,'))
//   has_skips  — "true" when any provider was dropped (so the setup job uploads its skip markers)
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { missingCreds } from "@sandbox-benchmarks/harness";
import { providers as providerConfigs } from "@sandbox-benchmarks/providers";
import {
	harnessSkipMarkerJson,
	padSuiteList,
	SUITE_NAMES,
	sandboxSkipMarkerFile,
} from "@sandbox-benchmarks/schema";
import type { MatrixPlan, ProviderCredState } from "../lib/matrix.ts";
import { planMatrix, resolveSelection } from "../lib/matrix.ts";

/** Read a `--flag value` / `--flag=value` option from argv (empty string when `--flag` has no value). */
export function readFlag(argv: string[], name: string): string | undefined {
	const eq = argv.find((a) => a.startsWith(`--${name}=`));
	if (eq) return eq.slice(name.length + 3);
	const i = argv.indexOf(`--${name}`);
	if (i === -1) return undefined;
	const next = argv[i + 1];
	return next !== undefined && !next.startsWith("--") ? next : "";
}

/** Write one skip marker per dropped cell: `<dir>/<provider>/sandbox-<provider>-<suite>--skipped.json`. */
export function writeSkipMarkers(dir: string, plan: MatrixPlan): void {
	for (const cell of plan.skipped) {
		const providerDir = join(dir, cell.provider);
		mkdirSync(providerDir, { recursive: true });
		writeFileSync(
			join(providerDir, sandboxSkipMarkerFile(cell.provider, cell.suite)),
			harnessSkipMarkerJson(cell.provider, cell.suite, cell.reason),
		);
	}
}

/** The `$GITHUB_OUTPUT` key/value contract the orchestrator's setup job exposes. */
export function planOutputs(plan: MatrixPlan): Record<string, string> {
	return {
		providers: JSON.stringify(plan.providers),
		suites: padSuiteList(plan.suites),
		has_skips: String(plan.skipped.length > 0),
	};
}

/**
 * Plan against the real provider registry + an injectable `env`. `env` is a parameter (not a direct
 * `process.env` read) so the planning is testable without mutating the process environment.
 */
export function buildPlan(argv: string[], env: Record<string, string | undefined>): MatrixPlan {
	const suites = resolveSelection(readFlag(argv, "suites"), SUITE_NAMES, "suite");
	const providerIds = providerConfigs.map((p) => p.name);
	const selected = resolveSelection(readFlag(argv, "providers"), providerIds, "provider");
	const credState: ProviderCredState[] = providerConfigs
		.filter((p) => selected.includes(p.name))
		.map((p) => ({ id: p.name, missing: missingCreds(p, env) }));
	return planMatrix({ providers: credState, suites });
}

if (import.meta.main) {
	const argv = process.argv.slice(2);
	const plan = buildPlan(argv, process.env);

	const skipDir = readFlag(argv, "skip-markers");
	if (skipDir && plan.skipped.length > 0) writeSkipMarkers(skipDir, plan);

	const outputLines = Object.entries(planOutputs(plan)).map(([key, value]) => `${key}=${value}`);
	const outFile = process.env.GITHUB_OUTPUT;
	// One batched write — the $GITHUB_OUTPUT contract is line-oriented, so join and append once.
	if (outFile) appendFileSync(outFile, `${outputLines.join("\n")}\n`);

	// Human summary (always), then the raw name=value lines when there is no $GITHUB_OUTPUT to capture.
	console.log(`providers (credentialed): ${plan.providers.join(", ") || "(none)"}`);
	console.log(`suites: ${plan.suites.join(", ")}`);
	if (plan.skipped.length > 0) {
		console.log("skipped (no credentials):");
		for (const cell of plan.skipped) {
			console.log(`  - ${cell.provider}/${cell.suite}: ${cell.reason}`);
		}
	}
	if (!outFile) for (const line of outputLines) console.log(line);
}
