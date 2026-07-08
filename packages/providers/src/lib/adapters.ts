// The whole adapter layer: each schema provider id mapped to its computesdk factory plus the
// benchmark's create-time policy. The @computesdk/* wrappers already adapt each raw vendor SDK to
// computesdk's universal sandbox (runCommand with daemon-backed streaming, filesystem, destroy), so
// nothing here re-wraps an SDK — these are pure config. Credentials are read from each provider's
// env vars by its factory.
import { blaxel } from "@computesdk/blaxel";
import { daytona } from "@computesdk/daytona";
import { e2b } from "@computesdk/e2b";
import { modal } from "@computesdk/modal";
import type { ProviderId } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { config } from "./config.ts";
import type { ProviderAdapter } from "./types.ts";

// The active Daytona region profile (key/target/snapshot), resolved by the config gatekeeper from
// DAYTONA_REGION. Never read process.env directly here.
const { daytonaRegion } = config;

/**
 * Harness adapters, keyed by the schema {@link ProviderId}. The `Record<ProviderId, …>` type is what
 * keeps the two registries honest: it forces exactly one adapter per schema provider, so a provider
 * added to the schema without an adapter here — or an adapter with a typo'd / unknown id — is a
 * compile error, no runtime reconciliation required.
 */
export const adapters: Record<ProviderId, ProviderAdapter> = {
	// Boot the e2b template built from the toolchain image (computesdk maps snapshotId → the e2b
	// template id/name). cpu/memory are pinned in the template's e2b.toml, not per-create.
	e2b: {
		createCompute: () => e2b({}),
		createOptions: { snapshotId: config.e2bTemplate },
	},
	daytona: {
		// The region's API key (beta regions like ZEN5 use a separate key); the toolchain snapshot and
		// runner target are pinned per-create. `target` rides the wrapper's create-options passthrough
		// into Daytona's createParams. requiredEnvVars tracks the active region's key var so a missing
		// credential skips (not errors).
		createCompute: () => daytona({ apiKey: daytonaRegion.apiKey }),
		createOptions: {
			snapshotId: daytonaRegion.snapshot,
			...(daytonaRegion.target ? { target: daytonaRegion.target } : {}),
		},
		requiredEnvVars: [daytonaRegion.apiKeyVar],
	},
	blaxel: {
		// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback). The stock
		// base-image is Alpine (no apt — PTS uninstallable) and disk is a tmpfs overlay carved from VM
		// RAM (~78%), so boot the Debian ts-app image and buy disk with memory: 16384 MB ≈ 12.5 GiB
		// disk. No pre-baked toolchain snapshot yet — setup steps run their fallback paths.
		createCompute: () =>
			blaxel({ image: "blaxel/ts-app:latest", memory: 16384, region: "us-pdx-1" }),
		createOptions: {},
	},
	modal: {
		createCompute: () => modal({ scalableSandboxes: true }),
		createOptions: {
			templateId: config.toolchainImage,
			// Modal's `cpu`/`cpuLimit` are physical cores, not vCPUs — convert from the pinned vCPU spec.
			cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
		},
	},
};
