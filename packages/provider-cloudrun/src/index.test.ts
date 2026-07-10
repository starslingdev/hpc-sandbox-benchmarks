import { describe, expect, it } from "bun:test";
import { cloudRunAdapter, cloudRunConfig } from "./index.ts";

describe("@sandbox-benchmarks/provider-cloudrun", () => {
	it("resolves the gateway coordinates from this package's env slice", () => {
		// The @computesdk/cloud-run factory does NOT read its own env vars — remote mode only engages
		// when sandboxUrl/sandboxSecret arrive as config — so the slice must round-trip through the
		// validated env gate here.
		expect(cloudRunConfig.sandboxUrl).toBe(process.env.CLOUD_RUN_SANDBOX_URL);
		expect(cloudRunConfig.sandboxSecret).toBe(process.env.CLOUD_RUN_SANDBOX_SECRET);
	});

	it("pins nothing at create time — resources are the gateway's deploy-time flags", () => {
		expect(cloudRunAdapter.createOptions).toEqual({});
		expect(typeof cloudRunAdapter.createCompute).toBe("function");
	});
});
