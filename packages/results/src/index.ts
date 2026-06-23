// Public surface of @sandbox-benchmarks/results.
// Normalizes raw PTS output into the schema's Run model using ONLY @sandbox-benchmarks/schema and the
// XML parser — never a provider SDK (enforced by the package boundary).
import type { RawRun, RunDocument } from "@sandbox-benchmarks/schema";
import { isoNow } from "./lib/internal.ts";

// Per-provider raw-directory extraction (samples, stragglers, skips).
export * from "./lib/extract.ts";
export * from "./lib/pts.ts";
// Typed PTS composite.xml parsing and Catalog mapping.
export * from "./lib/pts-schema.ts";

/** Normalize a single raw run into a {@link RunDocument}. Stub logic. */
export function normalize(raw: RawRun): RunDocument {
	return {
		provider: raw.provider,
		operation: raw.operation,
		durationMs: raw.durationMs,
		normalizedAt: isoNow(),
	};
}
