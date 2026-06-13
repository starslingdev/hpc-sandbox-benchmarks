// Public surface of @sandbox-benchmarks/harness — drives an adapter and emits raw runs.
import type { ProviderAdapter } from "@sandbox-benchmarks/providers";
import type { RawRun } from "@sandbox-benchmarks/schema";
import { now } from "./lib/internal.ts";

/** Time a single operation against an adapter, producing a {@link RawRun}. Stub. */
export async function timeOperation(
	adapter: ProviderAdapter,
	operation: string,
	run: () => Promise<void> | void,
): Promise<RawRun> {
	const start = now();
	// NOTE: a rejected `run` currently propagates and no sample is recorded. Capturing failed-run
	// duration as an error sample lands when `rawRunSchema` grows an error shape.
	await run();
	return {
		provider: adapter.descriptor.id,
		operation,
		// Floor to a strictly-positive value: `rawRunSchema` requires `durationMs > 0`, and a
		// synchronous no-op can observe two equal `now()` readings (a 0 delta).
		durationMs: Math.max(now() - start, Number.EPSILON),
	};
}
