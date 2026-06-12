// Private implementation detail of @sandbox-benchmarks/providers.
// Proves `catalog:computesdk` resolves: we reference the computesdk module surface here.
import { type CapabilityFlags, capabilities } from "@sandbox-benchmarks/schema";
import * as computesdk from "computesdk";

// The `import * as computesdk` above is the compile-time witness that `catalog:computesdk`
// resolves; this count is the runtime re-check that its module surface is non-empty.
/** Runtime witness that the computesdk dependency resolves through the catalog. */
export const computeSdkExportCount: number = Object.keys(computesdk).length;

/**
 * Default, all-false capability flags. Derived from the schema's `capabilities` vocabulary so a
 * newly added capability automatically appears here. Concrete providers override what they support.
 */
export function emptyCapabilities(): CapabilityFlags {
  return Object.fromEntries(capabilities.map((c) => [c, false])) as CapabilityFlags;
}
