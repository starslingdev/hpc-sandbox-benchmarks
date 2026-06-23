// Public surface of @sandbox-benchmarks/harness — drives a provider to produce raw benchmark output.
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { providers } from "@sandbox-benchmarks/providers";
import type { RawRun, Suite } from "@sandbox-benchmarks/schema";
import { isPtsResultFile, SUITES } from "@sandbox-benchmarks/schema";
import { collectResults, writeSkipMarker } from "./lib/collect.ts";
import type { SandboxHandle } from "./lib/execute.ts";
import { MIN, StepRunner, withTimeout } from "./lib/execute.ts";
import { now } from "./lib/internal.ts";
import { DIR, OBSERVED_SPECS_SCRIPT, REPO_REF, REPO_URL, setupSteps } from "./lib/setup.ts";

/** Time a single operation against a provider, producing a {@link RawRun}. Stub (lifecycle path). */
export async function timeOperation(
	config: ProviderConfig,
	operation: string,
	run: () => Promise<void> | void,
): Promise<RawRun> {
	const start = now();
	// NOTE: a rejected `run` currently propagates and no sample is recorded. Capturing failed-run
	// duration as an error sample lands when `rawRunSchema` grows an error shape.
	await run();
	return {
		provider: config.name,
		operation,
		// Floor to a strictly-positive value: `rawRunSchema` requires `durationMs > 0`, and a
		// synchronous no-op can observe two equal `now()` readings (a 0 delta).
		durationMs: Math.max(now() - start, Number.EPSILON),
	};
}

/** An unknown provider or suite is a usage error, distinct from an operational failure mid-run. */
export class SuiteUsageError extends Error {}

export interface RunSuiteOptions {
	/** Provider to create the sandbox on — must be in the provider registry. */
	providerName: string;
	/** Suite to run — must be a key of SUITES. */
	suiteName: string;
	/** Host directory to extract results into (e.g. `data/raw/<runId>/<provider>`). */
	resultsDir: string;
	/** Credential source for the provider's required env vars (default: process.env). */
	env?: Record<string, string | undefined>;
}

async function destroySandbox(sandbox: SandboxHandle | undefined): Promise<void> {
	if (!sandbox) return;
	try {
		await withTimeout(Promise.resolve(sandbox.destroy()), 15_000, "Destroy timeout");
	} catch (err) {
		console.warn(`[cleanup] destroy failed: ${err instanceof Error ? err.message : String(err)}`);
	}
}

/**
 * Run a benchmark suite inside a provider sandbox: clone the repo (carrying the in-sandbox producer),
 * run the suite's mise commands, and pull benchmark-results/ back to `resultsDir`. Uses the sandbox
 * as a CI runner — it does NOT measure the sandbox lifecycle itself (that's the lifecycle path).
 * Missing credentials or insufficient disk are recorded as skip markers, not failures.
 */
export async function runSuite(options: RunSuiteOptions): Promise<void> {
	const { providerName, suiteName, env = process.env } = options;
	const resultsDir = resolve(options.resultsDir);

	const suite: Suite | undefined = (SUITES as Record<string, Suite>)[suiteName];
	if (!suite) {
		throw new SuiteUsageError(
			`Unknown suite "${suiteName}". Known suites: ${Object.keys(SUITES).join(", ")}`,
		);
	}

	const config = providers.find((p) => p.name === providerName);
	if (!config) {
		throw new SuiteUsageError(
			`Unknown provider "${providerName}". Known providers: ${providers.map((p) => p.name).join(", ")}`,
		);
	}

	const missingVars = config.requiredEnvVars.filter((v) => !env[v]);
	if (missingVars.length > 0) {
		const reason = `Missing credentials: ${missingVars.join(", ")}`;
		console.log(`SKIPPED ${providerName}/${suiteName}: ${reason}`);
		writeSkipMarker(resultsDir, providerName, suiteName, reason);
		return;
	}

	console.log(`\n--- Sandbox suite: ${suiteName} on ${providerName} (${REPO_URL}@${REPO_REF}) ---`);

	const compute = config.createCompute();

	// Concurrent jobs share one provider account; quota/capacity errors mean "no slot right now", not
	// "broken" — retry patiently so jobs self-serialize as earlier sandboxes are destroyed.
	const CREATE_RETRY_BUDGET_MS = 60 * MIN;
	const CREATE_RETRY_DELAY_MS = 2 * MIN;
	const createDeadline = Date.now() + CREATE_RETRY_BUDGET_MS;
	let sandbox: SandboxHandle | undefined;
	for (let attempt = 1; ; attempt++) {
		try {
			sandbox = await withTimeout(
				Promise.resolve(
					compute.sandbox.create({
						...config.createOptions,
						// Ask for a sandbox lifetime covering setup + the suite, where supported.
						timeout: suite.timeoutMinutes * MIN,
					}),
				),
				5 * MIN,
				"Sandbox creation timed out",
			);
			break;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			const capacity = /quota|rate.?limit|too many|capacity|429/i.test(message);
			if (!capacity || Date.now() + CREATE_RETRY_DELAY_MS > createDeadline) throw err;
			console.log(
				`Sandbox create attempt ${attempt} hit a capacity limit (${message.slice(0, 140)}); ` +
					`retrying in ${CREATE_RETRY_DELAY_MS / 1000}s...`,
			);
			await new Promise((r) => setTimeout(r, CREATE_RETRY_DELAY_MS));
		}
	}

	await runSuiteOnSandbox(sandbox, { suite, suiteName, providerName, resultsDir });
}

/** The already-resolved context {@link runSuiteOnSandbox} runs against. */
export interface SuiteRunContext {
	suite: Suite;
	suiteName: string;
	providerName: string;
	resultsDir: string;
}

/**
 * Run a suite against an already-created sandbox, then tear it down (run-and-dispose). Split from
 * {@link runSuite} so the orchestration — disk gate, setup, benchmark, result collection, the
 * benchmark-vs-collect error precedence, and the always-runs teardown — is testable against a fake
 * sandbox without provisioning a real one. Long steps (setup installs, the benchmark) run on the
 * durable detached transport so Daytona's 408 on multi-minute synchronous execs can't truncate them.
 */
export async function runSuiteOnSandbox(
	sandbox: SandboxHandle,
	ctx: SuiteRunContext,
): Promise<void> {
	const { suite, suiteName, providerName, resultsDir } = ctx;
	const runner = new StepRunner(sandbox);
	let suiteError: unknown;
	try {
		runner.phase = "setup";
		if (suite.minDiskGb) {
			const df = await runner.run("check free disk", "df -Pk / | awk 'NR==2 {print $4}'", MIN);
			// Treat non-numeric df output as 0 free (skip) — a NaN comparison would silently pass the check.
			const freeKb = Number.parseInt((df.stdout || "").trim(), 10);
			const freeGb = Number.isNaN(freeKb) ? 0 : freeKb / 1024 / 1024;
			if (freeGb < suite.minDiskGb) {
				const reason = `Insufficient disk: ${freeGb.toFixed(1)} GiB free, suite needs ${suite.minDiskGb} GiB`;
				console.log(`SKIPPED ${providerName}/${suiteName}: ${reason}`);
				writeSkipMarker(resultsDir, providerName, suiteName, reason);
				return;
			}
		}

		for (const step of setupSteps(suite)) {
			const attempts = (step.retries ?? 0) + 1;
			for (let attempt = 1; ; attempt++) {
				try {
					// Detached: a multi-minute install (mise/PTS/apt) would 408 a synchronous exec.
					await runner.runDetached(step.label, step.script, step.timeoutMs);
					break;
				} catch (err) {
					if (attempt >= attempts) throw err;
					console.log(`Step "${step.label}" failed, retrying (${attempt + 1}/${attempts})...`);
				}
			}
		}

		// Observed specs are best-effort: a spec probe must never fail a Run (hence allowFailure below).
		await runner.run("capture observed specs", OBSERVED_SPECS_SCRIPT, MIN, { allowFailure: true });

		try {
			runner.phase = "benchmark";
			for (const command of suite.commands) {
				// Detached: the cpu-node command budgets 110 min — far past Daytona's synchronous-exec 408.
				await runner.runDetached(
					command,
					`cd ${DIR} && ${command}`,
					suite.commandTimeoutMinutes * MIN,
				);
			}
		} catch (err) {
			// Still pull whatever results were produced before failing the job.
			suiteError = err;
		}

		try {
			await collectResults(runner, resultsDir);
		} catch (collectErr) {
			// A failed result-pull must not mask an in-flight benchmark error.
			if (!suiteError) throw collectErr;
			console.warn(
				`[collect] failed after benchmark error: ${collectErr instanceof Error ? collectErr.message : String(collectErr)}`,
			);
		}

		// PTS exits 0 even when a profile fails to install, so a broken environment yields a green job
		// with an empty artifact — treat "no pts_*.xml from a PTS suite" as a failure.
		if (!suiteError && suite.setupPts && !readdirSync(resultsDir).some(isPtsResultFile)) {
			suiteError = new Error(
				`Suite "${suiteName}" on ${providerName} produced no pts_*.xml — PTS likely failed silently`,
			);
		}
	} finally {
		await destroySandbox(sandbox);
	}

	if (suiteError) throw suiteError;
	console.log(`\nDone: ${suiteName} on ${providerName}`);
}
