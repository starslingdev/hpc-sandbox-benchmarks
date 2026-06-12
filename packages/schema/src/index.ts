// Public surface of @sandbox-benchmarks/schema — the bottom of the dependency DAG.
// Depends only on arktype. Every other package imports its shared types from here.
import { type } from "arktype";
import { rawRunSchema } from "./lib/internal.ts";

/** The capabilities a sandbox provider may support. Stub set — expanded as providers land. */
export const capabilities = ["spawn", "exec", "filesystem", "snapshot"] as const;
export type Capability = (typeof capabilities)[number];

/** Which capabilities a given provider supports. */
export type CapabilityFlags = Record<Capability, boolean>;

/** Static description of a sandbox provider. */
export interface ProviderDescriptor {
  /** Stable identifier, e.g. "e2b", "daytona", "modal". */
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

/** A normalized run document, as produced by @sandbox-benchmarks/results. */
export interface RunDocument {
  provider: string;
  operation: string;
  durationMs: number;
  /** ISO-8601 timestamp the document was normalized at. */
  normalizedAt: string;
}

/** Validate an unknown value as a {@link RawRun} using the arktype schema. */
export function parseRawRun(value: unknown): RawRun {
  const out = rawRunSchema(value);
  if (out instanceof type.errors) {
    throw new Error(`invalid RawRun: ${out.summary}`);
  }
  return out;
}
