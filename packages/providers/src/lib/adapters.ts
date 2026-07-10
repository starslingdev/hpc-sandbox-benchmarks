// The whole adapter layer: each schema provider id bound to its provider package's adapter. No
// vendor SDK is imported here any more — every @computesdk/* wrapper (and each provider's env
// slice + create-time policy) lives in its own @sandbox-benchmarks/provider-<id> package; this map
// is the join point the Record type keeps exhaustive.
import { blaxelAdapter } from "@sandbox-benchmarks/provider-blaxel";
import { cloudRunAdapter } from "@sandbox-benchmarks/provider-cloudrun";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";
import { daytonaAdapter } from "@sandbox-benchmarks/provider-daytona";
import { e2bAdapter } from "@sandbox-benchmarks/provider-e2b";
import { modalAdapter } from "@sandbox-benchmarks/provider-modal";
import { novitaAdapter } from "@sandbox-benchmarks/provider-novita";
import { vercelAdapter } from "@sandbox-benchmarks/provider-vercel";
import type { ProviderId } from "@sandbox-benchmarks/schema";

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
	// Executes inside the pre-deployed gateway service; owns its own env slice (CLOUD_RUN_*) and
	// vendor dep — see @sandbox-benchmarks/provider-cloudrun.
	cloudrun: cloudRunAdapter,
	// The e2b wrapper re-pointed at Novita's E2B-compatible control plane; owns its own env slice
	// (NOVITA_API_KEY) and vendor deps — see @sandbox-benchmarks/provider-novita.
	novita: novitaAdapter,
};
