// Public surface of @sandbox-benchmarks/schema — the bottom of the dependency DAG.
// Depends only on arktype. Every other package imports its shared types from here.
import { type } from "arktype";
import { rawRunSchema } from "./lib/internal.ts";

// Pure analysis over retained Samples: the Aggregates distribution and how it's computed.
export * from "./analysis.ts";
// The Metric Catalog — the registry of rankable Metrics, plus lookup helpers.
export * from "./catalog.ts";
// The non-PTS, harness-measured Metric slice (lifecycle + control-plane) and its operation→id contract.
export * from "./harness-metrics.ts";
// Metric vocabulary: Dimension, Direction and the MetricDef shape every Metric declares.
export * from "./metrics.ts";
// Provider identity & economics registry (id, requiredEnvVars, pricing, isolation, spec-pinning).
export * from "./providers.ts";
// The raw-file naming contract shared by the producers and the results extractor.
export * from "./raw-files.ts";
// The canonical Run dataset model (Run/ProviderRun/MetricResult/…) and its validators.
export * from "./run.ts";
// The benchmark suite registry — shared by the harness and CI matrix planning.
export * from "./suites.ts";
// Canonical toolchain image identity (name + version), shared by the build pins and runtime config.
export * from "./toolchain.ts";

/** The capabilities a sandbox provider may support. Stub set — expanded as providers land. */
export const capabilities = ["spawn", "exec", "filesystem", "snapshot"] as const;
export type Capability = (typeof capabilities)[number];

/** Which capabilities a given provider supports. */
export type CapabilityFlags = Record<Capability, boolean>;

/**
 * The capability view of a provider, keyed by the same `id` as the {@link ProviderMeta} registry in
 * `./providers.ts`. Identity and economics live in `ProviderMeta` (its single owner); this type adds
 * the orthogonal "what can it do" axis. The two are joined by `id`, never merged.
 */
export interface ProviderDescriptor {
	/** Stable identifier, joined against {@link ProviderMeta.id}, e.g. "e2b", "daytona", "modal". */
	id: string;
	/** Human-readable name. */
	displayName: string;
	/** Capabilities the provider supports. */
	capabilities: CapabilityFlags;
}

/**
 * A single raw, un-normalized benchmark run as emitted by the harness.
 * Inferred from {@link rawRunSchema} so the runtime schema stays the single source of truth.
 */
export type RawRun = typeof rawRunSchema.infer;

/** Validate an unknown value as a {@link RawRun} using the arktype schema. */
export function parseRawRun(value: unknown): RawRun {
	const out = rawRunSchema(value);
	if (out instanceof type.errors) {
		throw new Error(`invalid RawRun: ${out.summary}`);
	}
	return out;
}
