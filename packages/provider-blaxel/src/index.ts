// Public surface of @sandbox-benchmarks/provider-blaxel — the blaxel ProviderAdapter, bound to the
// schema's `blaxel` id by the aggregator (@sandbox-benchmarks/providers).
//
// Credentials come from BL_API_KEY/BL_WORKSPACE (the factory's env fallback; the schema meta's
// requiredEnvVars gate skips without them). The stock base-image is Alpine (no apt — PTS
// uninstallable) and disk is a tmpfs overlay carved from VM RAM (~78%), so boot the Debian ts-app
// image and buy disk with memory: 16384 MB ≈ 12.5 GiB disk. No pre-baked toolchain snapshot yet —
// setup steps run their fallback paths. The coupled dimensions mean all create-time policy lives in
// the factory call; createOptions has nothing left to pin.
import { blaxel } from "@computesdk/blaxel";
import type { ProviderAdapter } from "@sandbox-benchmarks/provider-core";

export const blaxelAdapter: ProviderAdapter = {
	createCompute: () => blaxel({ image: "blaxel/ts-app:latest", memory: 16384, region: "us-pdx-1" }),
	createOptions: {},
};
