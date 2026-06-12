// Public surface of @repo/test-utils — the shared provider conformance suite factory.
// Adding a provider later means implementing the adapter interface and calling this factory,
// not writing bespoke tests.
import type { Capability, CapabilityFlags } from "@sandbox-benchmarks/schema";
import { supportedCapabilities } from "./lib/internal.ts";

/** Minimal adapter shape the conformance suite drives. Stub — widened as the harness grows. */
export interface ConformanceAdapter {
  id: string;
}

/** A registered conformance suite: its name and the assertions it would run. Stub. */
export interface ConformanceSuite {
  name: string;
  /** Capabilities this suite will exercise, derived from the declared flags. */
  covers: Capability[];
  /** Run the suite. Stub: a real suite would register `bun:test` cases per capability. */
  run(): void;
}

/**
 * Build a conformance suite for an adapter, scoped to the capabilities it claims to support.
 * Typed against schema's {@link CapabilityFlags} so capability drift is a type error.
 */
export function createProviderConformanceSuite(
  adapter: ConformanceAdapter,
  capabilities: CapabilityFlags,
): ConformanceSuite {
  const covers = supportedCapabilities(capabilities);
  return {
    name: `conformance: ${adapter.id}`,
    covers,
    run() {
      // Stub: real implementation registers one bun:test block per covered capability.
    },
  };
}
