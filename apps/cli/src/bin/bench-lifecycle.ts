#!/usr/bin/env bun
// `bench-lifecycle` — measure each provider's lifecycle (spawn→exec→snapshot→teardown) and
// control-plane (sandbox info/list) timings directly in the harness, the axes PTS cannot see. Each
// provider runs `--iterations` cold-start cycles; per-Metric distributions are aggregated and reported.
//
// Providers whose credentials are absent are SKIPPED, not failed (the e2e surface is CI-with-secrets);
// a provider that can't even spawn FAILS. Exits non-zero iff a provider that ran failed, or a
// `--require`d provider didn't run-and-pass — mirroring `bench-smoke`.
//
// Observability: a per-provider timing log goes to stderr; the machine-readable summary is JSON on
// stdout. bun auto-loads .env, so local creds in a .env file are picked up.
import {
	benchmarkLifecycle,
	requiredProviders,
	unmetRequirements,
} from "@sandbox-benchmarks/harness";
import type { LifecycleMetricSummary } from "../lib/lifecycle-summary.ts";
import { formatLifecycleLines, summarizeLifecycleAggregates } from "../lib/lifecycle-summary.ts";
import { anyFailed, forEachProviderWithCreds } from "../lib/providers-run.ts";

/** A positive integer flag (`--flag N`), falling back when absent or malformed. */
function intFlag(argv: string[], flag: string, fallback: number): number {
	const i = argv.indexOf(flag);
	const raw = i === -1 ? undefined : argv[i + 1];
	// parseInt yields NaN for absent/garbage input, and `NaN > 0` is false — so this also rejects those.
	const value = raw === undefined ? Number.NaN : Number.parseInt(raw, 10);
	return value > 0 ? value : fallback;
}

if (import.meta.main) {
	const log = (m: string) => console.error(m);

	const iterations = intFlag(process.argv, "--iterations", 3);
	const controlPlaneSamples = intFlag(process.argv, "--control-plane-samples", 5);
	const snapshot = !process.argv.includes("--no-snapshot");

	log(
		`>>> lifecycle: ${iterations} cold-start cycle(s)/provider, ` +
			`${controlPlaneSamples} control-plane probe(s)/cycle, snapshot=${snapshot}`,
	);

	// Summarize each provider's aggregates once, as it settles, then reuse for both the stderr log and the
	// stdout JSON below. Skipped providers never settle through onComplete and carry no metrics.
	const metricsByProvider = new Map<string, LifecycleMetricSummary[]>();
	const runs = await forEachProviderWithCreds(
		(provider) => {
			log(`>>> ${provider.name}: measuring lifecycle…`);
			return benchmarkLifecycle(provider, { iterations, controlPlaneSamples, snapshot });
		},
		{
			log,
			onComplete: (run) => {
				if (run.value) {
					const metrics = summarizeLifecycleAggregates(run.value.aggregates);
					metricsByProvider.set(run.provider, metrics);
					for (const line of formatLifecycleLines(metrics)) log(line);
					for (const skip of run.value.skips) log(`    [skip] ${skip.suite}: ${skip.reason}`);
				}
				const time = run.durationMs ? `${run.durationMs.toFixed(0)}ms` : "";
				log(`<<< ${run.provider}: ${run.status}${time ? ` (${time})` : ""}`);
			},
		},
	);

	const summary = runs.map((run) => ({
		provider: run.provider,
		status: run.status,
		...(run.reason ? { reason: run.reason } : {}),
		...(run.durationMs !== undefined ? { durationMs: run.durationMs } : {}),
		...(run.value
			? {
					metrics: metricsByProvider.get(run.provider) ?? [],
					skips: run.value.skips,
				}
			: {}),
	}));
	console.log(JSON.stringify({ summary }, null, 2));

	// Skips (missing creds) never fail the run; only a provider that ran and broke does.
	if (anyFailed(runs)) process.exit(1);

	// At the CI/publish boundary a *required* provider that didn't run-and-pass must fail the lane loudly,
	// so a green run can't hide that a provider was never actually measured.
	const required = requiredProviders();
	const unmet = unmetRequirements(runs, required);
	if (required.length > 0 && unmet.length > 0) {
		log(
			`error: required providers did not pass: ${unmet.join(", ")} (--require / REQUIRE_PROVIDERS)`,
		);
		process.exit(1);
	}
}
