// Public surface of @sandbox-benchmarks/harness — drives a provider and emits raw runs.
import type { ProviderConfig } from "@sandbox-benchmarks/providers";
import type { RawRun } from "@sandbox-benchmarks/schema";
import { now } from "./lib/internal.ts";

/** Time a single operation against a provider, producing a {@link RawRun}. Stub. */
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
