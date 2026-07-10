// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { cloudRun } from "@computesdk/cloud-run";
import { blaxelAdapter } from "@sandbox-benchmarks/provider-blaxel";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { daytonaAdapter } from "@sandbox-benchmarks/provider-daytona";
import { e2bAdapter } from "@sandbox-benchmarks/provider-e2b";
import { modalAdapter } from "@sandbox-benchmarks/provider-modal";
import { novitaAdapter } from "@sandbox-benchmarks/provider-novita";
import { vercelAdapter } from "@sandbox-benchmarks/provider-vercel";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { config } from "./config.ts";

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
	// Boots the stock Debian image oversized for Blaxel's coupled spec dimensions; owns its vendor
	// dep — see @sandbox-benchmarks/provider-blaxel.
	blaxel: blaxelAdapter,
	// Boots the toolchain image straight from the registry with the spec pinned in Modal's units;
	// owns its vendor dep — see @sandbox-benchmarks/provider-modal.
	modal: modalAdapter,
	// Buys memory parity through Vercel's 2 GB/vCPU coupling (CPU oversized, disclosed); owns its
	// vendor dep — see @sandbox-benchmarks/provider-vercel.
	vercel: vercelAdapter,
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
