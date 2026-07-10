// Public surface of @sandbox-benchmarks/provider-cloudrun — the cloudrun ProviderAdapter, bound to
// the schema's `cloudrun` id by the aggregator (@sandbox-benchmarks/providers).
//
// The gateway URL/secret must be passed as config — the @computesdk/cloud-run factory doesn't read
// its own env vars — so this package owns that slice and routes it through provider-core's
// validated env gate. Sandboxes execute inside the pre-deployed gateway service (remote mode), so
// there are no create-time spec knobs to pin: CPU/memory are the gateway's deploy-time flags
// (deploy it at the target spec for parity).
import { cloudRun } from "@computesdk/cloud-run";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { readProviderEnv } from "@sandbox-benchmarks/provider-core";

const env = readProviderEnv(["CLOUD_RUN_SANDBOX_URL", "CLOUD_RUN_SANDBOX_SECRET"]);

/** The pre-deployed Cloud Run gateway (deployed via `npx @computesdk/cloud-run`) this adapter
 *  boots sandboxes through. */
export const cloudRunConfig = {
	sandboxUrl: env.CLOUD_RUN_SANDBOX_URL,
	sandboxSecret: env.CLOUD_RUN_SANDBOX_SECRET,
} as const;

export const cloudRunAdapter: ProviderAdapter = {
	createCompute: () =>
		cloudRun({
			sandboxUrl: cloudRunConfig.sandboxUrl,
			sandboxSecret: cloudRunConfig.sandboxSecret,
		}),
	createOptions: {},
};
