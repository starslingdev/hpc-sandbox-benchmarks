// Public surface of @sandbox-benchmarks/providers.
// Depends on @sandbox-benchmarks/schema (types) and computesdk (provider runtime, via catalog).
import type { ProviderDescriptor } from "@sandbox-benchmarks/schema";
import { computeSdkExportCount, emptyCapabilities } from "./lib/internal.ts";

/**
 * A provider adapter: a descriptor plus (eventually) the methods the harness drives.
 * Stub — the real adapter interface lands in the providers implementation pass.
 */
export interface ProviderAdapter {
  descriptor: ProviderDescriptor;
}

/** Build a stub adapter for a provider id with no capabilities yet. */
export function createStubAdapter(id: string, displayName: string): ProviderAdapter {
  return {
    descriptor: { id, displayName, capabilities: emptyCapabilities() },
  };
}

/** Re-exported witness that the computesdk surface is reachable and non-empty. */
export const providerRuntimeReady: boolean = computeSdkExportCount > 0;
