// Private implementation detail of @sandbox-benchmarks/templates.
import type { ProviderDescriptor } from "@sandbox-benchmarks/schema";

/** A built sandbox template descriptor. Stub shape — real build metadata lands later. */
export interface TemplateSpec {
  /** The provider this template targets. */
  provider: ProviderDescriptor["id"];
  /** Opaque template tag/id the build step would produce. */
  tag: string;
}

/** Shared helper used by every per-provider builder module. */
export function makeTemplateSpec(provider: string, tag: string): TemplateSpec {
  return { provider, tag };
}
