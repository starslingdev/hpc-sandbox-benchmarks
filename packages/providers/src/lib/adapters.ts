// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { blaxel } from "@computesdk/blaxel";
import { cloudRun } from "@computesdk/cloud-run";
import { vercel } from "@computesdk/vercel";
import type { DirectProvider, ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { daytonaAdapter } from "@sandbox-benchmarks/provider-daytona";
import { e2bAdapter } from "@sandbox-benchmarks/provider-e2b";
import { modalAdapter } from "@sandbox-benchmarks/provider-modal";
import { novitaAdapter } from "@sandbox-benchmarks/provider-novita";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { config } from "./config.ts";

// Vercel provisions sandbox RAM at a fixed 2 GB per vCPU (vercel.com/docs/sandbox: "RAM is
// provisioned at 2 GB per vCPU"), so memory is bought BY choosing vCPUs — the one source of that
// coupling factor, mirroring VCPUS_PER_PHYSICAL_CORE for Modal.
const VERCEL_GB_PER_VCPU = 2;

/**
 * Harness adapters, keyed by the schema {@link ProviderId}. The `Record<ProviderId, …>` type is what
 * keeps the two registries honest: it forces exactly one adapter per schema provider, so a provider
 * added to the schema without an adapter here — or an adapter with a typo'd / unknown id — is a
 * compile error, no runtime reconciliation required.
 */
export const adapters: Record<ProviderId, ProviderAdapter> = {
	// Boots the pre-baked toolchain template; owns its own env slice (E2B_TEMPLATE) and vendor dep —
	// see @sandbox-benchmarks/provider-e2b.
	e2b: e2bAdapter,
	// Boots the pre-baked toolchain snapshot; owns its own env slice (DAYTONA_*) and vendor dep —
	// see @sandbox-benchmarks/provider-daytona.
	daytona: daytonaAdapter,
	blaxel: {
		// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback). The stock
		// base-image is Alpine (no apt — PTS uninstallable) and disk is a tmpfs overlay carved from VM
		// RAM (~78%), so boot the Debian ts-app image and buy disk with memory: 16384 MB ≈ 12.5 GiB
		// disk. No pre-baked toolchain snapshot yet — setup steps run their fallback paths.
		createCompute: () =>
			blaxel({ image: "blaxel/ts-app:latest", memory: 16384, region: "us-pdx-1" }),
		createOptions: {},
	},
	// Boots the toolchain image straight from the registry with the spec pinned in Modal's units;
	// owns its vendor dep — see @sandbox-benchmarks/provider-modal.
	modal: modalAdapter,
	vercel: {
		// Credentials come from VERCEL_TOKEN/VERCEL_TEAM_ID/VERCEL_PROJECT_ID (the factory's env
		// fallback). No custom base images — sandboxes boot Amazon Linux 2023 (dnf) and the setup
		// steps run their fallback paths; no pre-baked toolchain snapshot yet. The cast bridges an
		// upstream declaration gap: the wrapper's snapshot manager returns the raw @vercel/sandbox
		// Snapshot (no id/provider fields), which fails computesdk's snapshot contract — a surface
		// the harness never touches.
		createCompute: () => vercel({}) as unknown as DirectProvider,
		createOptions: {
			// RAM rides vCPUs at a fixed 2 GB/vCPU, so the 2 vCPU / 8 GiB target spec is inexpressible.
			// Buy memory parity (8 GB) and run the CPU oversized (4 vCPU) — the blaxel precedent — with
			// the mismatch disclosed downstream via observed-specs (specMatched=false). `resources` rides
			// the wrapper's create-options passthrough into `Sandbox.create`.
			resources: { vcpus: TARGET_SPEC.memoryGb / VERCEL_GB_PER_VCPU },
		},
	},
	cloudrun: {
		// The gateway URL/secret must be passed as config — the @computesdk/cloud-run factory doesn't
		// read its own env vars (the config gatekeeper does, like every other credential). Sandboxes
		// execute inside the pre-deployed gateway service (remote mode), so there are no create-time
		// spec knobs to pin here: CPU/memory are the gateway's deploy-time flags.
		createCompute: () =>
			cloudRun({
				sandboxUrl: config.cloudRun.sandboxUrl,
				sandboxSecret: config.cloudRun.sandboxSecret,
			}),
		createOptions: {},
	},
	// The e2b wrapper re-pointed at Novita's E2B-compatible control plane; owns its own env slice
	// (NOVITA_API_KEY) and vendor deps — see @sandbox-benchmarks/provider-novita.
	novita: novitaAdapter,
};
