// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { daytona } from "@computesdk/daytona";
import { e2b } from "@computesdk/e2b";
import { modal } from "@computesdk/modal";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { TOOLCHAIN_IMAGE } from "./toolchain.ts";
import type { ProviderAdapter } from "./types.ts";

// An explicit DAYTONA_SNAPSHOT (CI sets it to DAYTONA_SNAPSHOT_DEFAULT) boots the pre-baked toolchain
// snapshot; absent one, Daytona runs a stock image and sets up the toolchain at runtime.
const daytonaSnapshot = process.env.DAYTONA_SNAPSHOT;

/**
 * Harness adapters, keyed by the schema {@link ProviderId}. The `Record<ProviderId, …>` type is what
 * keeps the two registries honest: it forces exactly one adapter per schema provider, so a provider
 * added to the schema without an adapter here — or an adapter with a typo'd / unknown id — is a
 * compile error, no runtime reconciliation required.
 */
export const adapters: Record<ProviderId, ProviderAdapter> = {
	// e2b pins its spec at the template/image level rather than per-create — nothing to set here.
	e2b: { createCompute: () => e2b({}) },
	daytona: {
		createCompute: () => daytona({}),
		// Omit createOptions entirely when there's no snapshot to pin (per the ProviderAdapter
		// contract) — an empty {} would be passed through to compute.sandbox.create as real options.
		...(daytonaSnapshot ? { createOptions: { snapshotId: daytonaSnapshot } } : {}),
	},
	modal: {
		createCompute: () => modal({ scalableSandboxes: true }),
		createOptions: {
			templateId: TOOLCHAIN_IMAGE,
			// Modal's `cpu`/`cpuLimit` are physical cores, not vCPUs — convert from the pinned vCPU spec.
			cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
		},
	},
};
