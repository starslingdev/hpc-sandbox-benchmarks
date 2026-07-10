// The novita ProviderAdapter: this package's whole reason to exist, assembled from its two halves —
// the env slice this package owns (NOVITA_API_KEY, read through provider-core's validated gate) and
// the re-pointed e2b wrapper (novita.ts). Pure create-time policy, like every adapter: boots
// Novita's default template (no pre-baked toolchain template on their control plane yet, so the
// harness setup steps run their fallback paths).
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { readProviderEnv } from "@sandbox-benchmarks/provider-core";
import { novitaCompute } from "./novita.ts";

const env = readProviderEnv(["NOVITA_API_KEY"] as const);

export const novitaAdapter: ProviderAdapter = {
	// Lazy-credentialed: the missing-key error fires only when the harness actually selects the
	// provider — its requiredEnvVars gate (schema-owned) turns an unset key into a skip before that.
	createCompute: () => novitaCompute(env.NOVITA_API_KEY),
	createOptions: {},
};
