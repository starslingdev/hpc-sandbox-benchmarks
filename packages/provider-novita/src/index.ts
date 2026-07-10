// Public surface of @sandbox-benchmarks/provider-novita — the novita ProviderAdapter, bound to the
// schema's `novita` id by the aggregator (@sandbox-benchmarks/providers). Novita has no
// `@computesdk/*` wrapper of its own; lib/novita.ts re-points the e2b wrapper at Novita's
// E2B-protocol-compatible control plane. `novitaCompute`/`NOVITA_E2B_DOMAIN` stay exported for
// anyone driving Novita outside the harness join.
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { readProviderEnv } from "@sandbox-benchmarks/provider-core";
import { novitaCompute } from "./lib/novita.ts";

export { NOVITA_E2B_DOMAIN, novitaCompute } from "./lib/novita.ts";

const env = readProviderEnv(["NOVITA_API_KEY"]);

export const novitaAdapter: ProviderAdapter = {
	// Lazy-credentialed: the missing-key error fires only when the harness actually selects the
	// provider — its requiredEnvVars gate (schema-owned) turns an unset key into a skip before that.
	// Boots Novita's default template (no pre-baked toolchain template on their control plane yet, so
	// the harness setup steps run their fallback paths).
	createCompute: () => novitaCompute(env.NOVITA_API_KEY),
	createOptions: {},
};
