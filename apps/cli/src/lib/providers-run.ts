// The one place the "for each provider, skip if its creds are missing, otherwise time the work and
// collect a structured result" loop lives. bench-smoke, bake, and promote all drive providers the
// same way; before this they each re-implemented the skeleton and had already drifted (performance.now
// vs timeOperation, "ok" vs "ran"). Keeping it here makes the skip-vs-fail contract single-sourced:
// a provider with no creds SKIPS (never fails the run); a provider that runs and throws — or whose
// result `ok()` rejects — FAILS.
import { missingCreds } from "@sandbox-benchmarks/harness";
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import { providers } from "@sandbox-benchmarks/providers";
import type { ProviderId } from "@sandbox-benchmarks/schema";

export type ProviderRunStatus = "ok" | "skipped" | "failed";

/** The outcome of driving one provider: status plus (when it ran) the body's value and wall time. */
export interface ProviderRun<T> {
	provider: ProviderId;
	status: ProviderRunStatus;
	/** Why it skipped or failed (absent when it ran ok). */
	reason?: string;
	/** Body wall time (ms) when it ran. */
	durationMs?: number;
	/** The body's return value when it ran without throwing (carries e.g. smoke checks). */
	value?: T;
}

export interface ForEachProviderOptions<T> {
	/** Progress sink (stderr). Skips are logged here; per-result detail is left to `onComplete`. */
	log?: (message: string) => void;
	/** Env for the missing-creds check (defaults to process.env via the harness). */
	env?: Record<string, string | undefined>;
	/** Mark a non-throwing run failed when this returns false (e.g. a smoke probe failed). Default: ok. */
	ok?: (value: T) => boolean;
	/** Reason recorded for a non-throwing failure (when `ok` returns false). */
	failureReason?: (value: T) => string;
	/** Called right after each provider settles (ok/failed), so callers can log results in order. */
	onComplete?: (run: ProviderRun<T>) => void;
}

const noop = () => {};

/**
 * Run `body` against every provider whose credentials are present, in registry order, collecting a
 * {@link ProviderRun} per provider. Never throws: a body that throws becomes a `failed` run carrying
 * the coerced error message; a provider with missing creds becomes a `skipped` run.
 */
export async function forEachProviderWithCreds<T>(
	body: (provider: ProviderConfig) => Promise<T>,
	options: ForEachProviderOptions<T> = {},
): Promise<ProviderRun<T>[]> {
	const log = options.log ?? noop;
	const runs: ProviderRun<T>[] = [];

	for (const provider of providers) {
		const missing = missingCreds(provider, options.env);
		if (missing.length > 0) {
			log(`skip: ${provider.name} (missing ${missing.join(", ")})`);
			const skipped: ProviderRun<T> = {
				provider: provider.name,
				status: "skipped",
				reason: `missing ${missing.join(", ")}`,
			};
			runs.push(skipped);
			continue;
		}

		const start = performance.now();
		let run: ProviderRun<T>;
		try {
			const value = await body(provider);
			const ok = options.ok?.(value) ?? true;
			run = {
				provider: provider.name,
				status: ok ? "ok" : "failed",
				durationMs: performance.now() - start,
				value,
				...(ok ? {} : { reason: options.failureReason?.(value) }),
			};
		} catch (err) {
			run = {
				provider: provider.name,
				status: "failed",
				reason: err instanceof Error ? err.message : String(err),
				durationMs: performance.now() - start,
			};
		}
		runs.push(run);
		options.onComplete?.(run);
	}

	return runs;
}

/** True iff any provider that actually ran failed (skips never fail the run). For the process exit code. */
export function anyFailed(runs: ProviderRun<unknown>[]): boolean {
	return runs.some((run) => run.status === "failed");
}
