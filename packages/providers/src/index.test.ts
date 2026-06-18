import { describe, expect, it } from "bun:test";
import { PROVIDERS, TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { providers } from "./index.ts";

describe("@sandbox-benchmarks/providers", () => {
	it("wires every schema provider through to a computesdk factory", () => {
		// `adapters` is a Record<ProviderId, …>, so it's the same set as the schema registry by
		// construction — assert that against PROVIDERS rather than a hardcoded list.
		expect(providers.map((p) => p.name).sort()).toEqual(PROVIDERS.map((m) => m.id).sort());
		for (const p of providers) {
			expect(typeof p.createCompute).toBe("function");
			expect(p.requiredEnvVars.length).toBeGreaterThan(0);
		}
	});

	it("pins modal's create-time spec from the shared TARGET_SPEC", () => {
		const modal = providers.find((p) => p.name === "modal");
		// Modal bills/provisions in physical cores, so the pinned vCPU count is halved for cpu/cpuLimit.
		expect(modal?.createOptions).toMatchObject({
			cpu: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			cpuLimit: TARGET_SPEC.vcpus / VCPUS_PER_PHYSICAL_CORE,
			memoryMiB: TARGET_SPEC.memoryGb * 1024,
		});
	});
});
