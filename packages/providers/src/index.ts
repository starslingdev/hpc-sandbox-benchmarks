// Public surface of @sandbox-benchmarks/providers — the pure aggregator.
// Depends on @sandbox-benchmarks/schema (provider identity) and the per-provider packages
// (@sandbox-benchmarks/provider-<id>, each owning its vendor SDK + env slice); `providers` is the
// schema identity joined with those packages' adapters. No vendor SDK is a dependency here.

import type { ProviderConfig } from "@sandbox-benchmarks/provider-core";
import { PROVIDERS } from "@sandbox-benchmarks/schema";
import { adapters } from "./lib/adapters.ts";
import { assertProviderJoin } from "./lib/join.ts";

// The adapter-contract types live in provider-core (the shared vocabulary of the provider
// packages); re-exported here so the harness/CLI import surface predating the split still holds.
export type {
	DirectProvider,
	ProviderAdapter,
	ProviderConfig,
	ProviderSnapshots,
} from "@sandbox-benchmarks/provider-core";
// The runtime configuration gatekeeper — the single validated config object consumers import.
export { config } from "./lib/config.ts";

/**
 * All provider benchmark configurations: each schema provider's identity joined with its harness
 * adapter, in schema declaration order.
 *
 * No runtime reconciliation is needed because both sides are keyed by the same `ProviderId`:
 * `PROVIDERS` is derived from the schema's `Record<ProviderId, …>` registry and `adapters` is a
 * `Record<ProviderId, ProviderAdapter>`, so every `meta.id` indexes exactly one adapter and the two
 * registries are provably the same set at compile time.
 *
 * The runtime {@link assertProviderJoin} below backs that compile-time guarantee for any path the
 * type-checker never saw — a published/installed build or a cross-version schema/providers drift —
 * failing loudly at module load rather than letting a one-sided provider surface as an `undefined`
 * adapter mid-run.
 */
assertProviderJoin(
	PROVIDERS.map((meta) => meta.id),
	Object.keys(adapters),
);

export const providers: ProviderConfig[] = PROVIDERS.map((meta) => {
	const adapter = adapters[meta.id];
	return {
		...adapter,
		name: meta.id,
		// Credentials are schema-owned identity; the join mirrors the ProviderMeta's static list.
		requiredEnvVars: meta.requiredEnvVars,
		// Transport + probe capabilities are schema-owned (static facts of the @computesdk/*
		// integration), so they ride the same id-keyed join — the harness reads them to pick a per-step
		// transport and to gate the lifecycle probes on what each wrapper can honestly measure.
		transport: meta.transport,
		probes: meta.probes,
	};
});
