import { describe, expect, it } from "bun:test";
import { PROVIDERS, TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { config, providers } from "./index.ts";
import { resolveDaytonaRegion } from "./lib/config.ts";

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

	it("boots e2b from the configured template and daytona from the region snapshot", () => {
		const e2b = providers.find((p) => p.name === "e2b");
		expect(e2b?.createOptions?.snapshotId).toBe(config.e2bTemplate);

		const daytona = providers.find((p) => p.name === "daytona");
		expect(daytona?.createOptions?.snapshotId).toBe(config.daytonaRegion.snapshot);
		// requiredEnvVars tracks the active region's key var (the schema default for the default region).
		expect(daytona?.requiredEnvVars).toEqual([config.daytonaRegion.apiKeyVar]);
	});
});

describe("resolveDaytonaRegion", () => {
	const SNAP = "sandbox-benchmarks-toolchain-v1";

	it("defaults to the base env vars and the default snapshot", () => {
		const r = resolveDaytonaRegion({ DAYTONA_API_KEY: "k", DAYTONA_TARGET: "us" }, SNAP);
		expect(r).toEqual({
			region: "default",
			apiKeyVar: "DAYTONA_API_KEY",
			apiKey: "k",
			target: "us",
			snapshot: SNAP,
		});
	});

	it("selects the ZEN5 region's suffixed key + target", () => {
		const r = resolveDaytonaRegion(
			{ DAYTONA_REGION: "zen5", DAYTONA_API_KEY_ZEN5: "kz", DAYTONA_TARGET_ZEN5: "zen5-rgn" },
			SNAP,
		);
		expect(r).toMatchObject({
			region: "zen5",
			apiKeyVar: "DAYTONA_API_KEY_ZEN5",
			apiKey: "kz",
			target: "zen5-rgn",
			snapshot: SNAP,
		});
	});

	it("honors a per-region snapshot override and leaves a missing key undefined", () => {
		expect(resolveDaytonaRegion({ DAYTONA_SNAPSHOT: "snap" }, SNAP).snapshot).toBe("snap");
		expect(resolveDaytonaRegion({}, SNAP).apiKey).toBeUndefined();
	});
});
