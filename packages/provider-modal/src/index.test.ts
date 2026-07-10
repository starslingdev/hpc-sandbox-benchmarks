import { describe, expect, it } from "bun:test";
import { toolchainImage } from "@sandbox-benchmarks/provider-core";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { modalAdapter, VCPUS_PER_PHYSICAL_CORE } from "./index.ts";

describe("@sandbox-benchmarks/provider-modal", () => {
	it("boots the toolchain image with the target spec pinned in Modal's own units", () => {
		// Modal provisions in physical cores (1 core = 2 vCPU) — passing vcpus straight through would
		// reserve double every other provider. memoryLimitMiB is the hard cap (memoryMiB alone is only
		// a reservation and the guest then sees the host's RAM, which breaks STREAM sizing).
		expect(VCPUS_PER_PHYSICAL_CORE).toBe(2);
		expect(modalAdapter.createOptions).toEqual({
			templateId: toolchainImage,
			cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
			memoryLimitMiB: TARGET_SPEC.memoryGb * 1024,
		});
		expect(typeof modalAdapter.createCompute).toBe("function");
	});
});
