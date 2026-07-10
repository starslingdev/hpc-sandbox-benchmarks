// Public surface of @sandbox-benchmarks/provider-vercel — the vercel ProviderAdapter, bound to the
// schema's `vercel` id by the aggregator (@sandbox-benchmarks/providers).
//
// Credentials come from VERCEL_TOKEN/VERCEL_TEAM_ID/VERCEL_PROJECT_ID (the factory's env fallback;
// the schema meta's requiredEnvVars gate skips without them). No custom base images — sandboxes
// boot Amazon Linux 2023 (dnf) and the harness setup steps run their fallback paths; no pre-baked
// toolchain snapshot yet.
import { vercel } from "@computesdk/vercel";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";

/** Vercel provisions sandbox RAM at a fixed 2 GB per vCPU (vercel.com/docs/sandbox: "RAM is
 *  provisioned at 2 GB per vCPU"), so memory is bought BY choosing vCPUs — the one source of that
 *  coupling factor, mirroring provider-modal's VCPUS_PER_PHYSICAL_CORE. */
export const VERCEL_GB_PER_VCPU = 2;

export const vercelAdapter: ProviderAdapter = {
	createCompute: () => vercel({}),
	createOptions: {
		// RAM rides vCPUs at a fixed 2 GB/vCPU, so the 2 vCPU / 8 GiB target spec is inexpressible.
		// Buy memory parity (8 GB) and run the CPU oversized (4 vCPU) — the blaxel precedent — with
		// the mismatch disclosed downstream via observed-specs (specMatched=false). `resources` rides
		// the wrapper's create-options passthrough into `Sandbox.create`.
		resources: { vcpus: TARGET_SPEC.memoryGb / VERCEL_GB_PER_VCPU },
	},
};
