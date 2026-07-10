import { describe, expect, it } from "bun:test";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { VERCEL_GB_PER_VCPU, vercelAdapter } from "./index.ts";

describe("@sandbox-benchmarks/provider-vercel", () => {
	it("buys memory parity through the 2 GB/vCPU coupling", () => {
		// RAM rides vCPUs at 2 GB each, so the 8 GiB memory target costs 4 vCPUs (CPU oversized,
		// disclosed downstream via observed-specs) — pin the derivation so a TARGET_SPEC change
		// re-derives it rather than orphaning a hardcoded 4.
		expect(VERCEL_GB_PER_VCPU).toBe(2);
		expect(vercelAdapter.createOptions).toEqual({
			resources: { vcpus: TARGET_SPEC.memoryGb / VERCEL_GB_PER_VCPU },
		});
		expect(typeof vercelAdapter.createCompute).toBe("function");
	});
});
