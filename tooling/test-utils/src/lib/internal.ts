// Private implementation detail of @repo/test-utils.
import type { Capability, CapabilityFlags } from "@sandbox-benchmarks/schema";

/** The capabilities a descriptor claims, as a list (derived from its flags). */
export function supportedCapabilities(flags: CapabilityFlags): Capability[] {
  return (Object.keys(flags) as Capability[]).filter((c) => flags[c]);
}
