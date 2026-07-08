import { describe, expect, it } from "bun:test";
import { PROVIDERS, TARGET_SPEC, VCPUS_PER_PHYSICAL_CORE } from "@sandbox-benchmarks/schema";
import { config, providers } from "./index.ts";
import { assertProviderJoin } from "./lib/join.ts";

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

	it("carries each provider's schema-owned transport capability through to the config", () => {
		// The join must surface the same transport the schema declares, so the harness selects a
		// transport from the provider's real capability rather than a hardcoded default. `providers` is
		// `PROVIDERS.map(...)`, so the two are index-aligned by construction — assert positionally
		// instead of an O(N²) `.find`, which also keeps the failure message pointing at the drift.
		expect(providers.length).toBe(PROVIDERS.length);
		for (let i = 0; i < providers.length; i++) {
			expect(providers[i]?.transport).toEqual(PROVIDERS[i]?.transport);
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

	it("boots e2b from the configured template and daytona from the configured snapshot", () => {
		const e2b = providers.find((p) => p.name === "e2b");
		expect(e2b?.createOptions?.snapshotId).toBe(config.e2bTemplate);

		const daytona = providers.find((p) => p.name === "daytona");
		expect(daytona?.createOptions?.snapshotId).toBe(config.daytona.snapshot);
		// No adapter override — requiredEnvVars falls back to the schema meta's static list.
		expect(daytona?.requiredEnvVars).toEqual(
			PROVIDERS.find((m) => m.id === "daytona")?.requiredEnvVars,
		);
	});
});

describe("assertProviderJoin", () => {
	it("passes silently when the schema ids and the adapter ids are the same set", () => {
		// The real registries are already index-aligned, so the live module load (above) exercises the
		// happy path; assert it explicitly here too, including when order differs between the two sides.
		expect(() =>
			assertProviderJoin(["e2b", "daytona", "modal"], ["modal", "e2b", "daytona"]),
		).not.toThrow();
		expect(() =>
			assertProviderJoin(
				PROVIDERS.map((m) => m.id),
				providers.map((p) => p.name),
			),
		).not.toThrow();
	});

	it("throws naming a provider that's in the schema but missing an adapter", () => {
		// A provider added to the schema registry without a matching harness adapter — the compile-time
		// Record can't catch this across a version drift, so the runtime guard must.
		expect(() => assertProviderJoin(["e2b", "daytona", "modal"], ["e2b", "daytona"])).toThrow(
			/missing a harness adapter: modal/,
		);
	});

	it("throws naming an adapter that has no schema entry", () => {
		expect(() => assertProviderJoin(["e2b", "daytona"], ["e2b", "daytona", "modal"])).toThrow(
			/no schema PROVIDERS entry: modal/,
		);
	});

	it("reports both one-sided directions at once", () => {
		const err = (() => {
			try {
				assertProviderJoin(["e2b", "ghost"], ["e2b", "modal"]);
			} catch (e) {
				return e as Error;
			}
		})();
		expect(err?.message).toContain("missing a harness adapter: ghost");
		expect(err?.message).toContain("no schema PROVIDERS entry: modal");
	});
});
