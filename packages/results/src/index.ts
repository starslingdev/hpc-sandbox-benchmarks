// Public surface of @sandbox-benchmarks/results.
// Normalizes raw runs into run documents using ONLY @sandbox-benchmarks/schema — never a provider SDK.
import type { RawRun, RunDocument } from "@sandbox-benchmarks/schema";
import { isoNow } from "./lib/internal.ts";

/** Normalize a single raw run into a {@link RunDocument}. Stub logic. */
export function normalize(raw: RawRun): RunDocument {
	return {
		provider: raw.provider,
		operation: raw.operation,
		durationMs: raw.durationMs,
		normalizedAt: isoNow(),
	};
}
