// Release-lane configuration and evidence utilities. Benchmark execution uses
// @sandbox-benchmarks/drivers.

// The runtime configuration gatekeeper — the single validated config object consumers import.
export { config } from "./config.ts";
export { sanitizeEvidenceDetail, sanitizeProviderResponse } from "./lib/cost-evidence.ts";
// Novita's pinned regional domain and connection, reused by the Novita template bake.
export { NOVITA_E2B_DOMAIN, novitaConnection } from "./lib/novita.ts";
export type {
	CostEvidenceCaptureInput,
	ProviderCostEvidenceCapability,
	SandboxTeardownResult,
} from "./lib/types.ts";
