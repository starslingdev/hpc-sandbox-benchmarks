// Prototype replacement for the seven hand-maintained id-list oracles (drivers/index.test.ts,
// driver-run.test.ts, providers.test.ts, provider-meta.test.ts REQUIRED_INPUTS/ARTIFACT_KINDS/BAKED,
// release-plan.test.ts, generate-provider-wiring.test.ts, bench-suite.test.ts).
//
// Two layers: invariants that need no edit when a provider is added, and ONE reviewed snapshot of
// the registry projection. Adding a provider is `bun test -u` and a one-file snapshot diff, which
// keeps the "a human must look at the new row" property the literal lists exist for.

import { describe, expect, test } from "bun:test";
import { DRIVERS } from "@sandbox-benchmarks/drivers";
import { PROVIDER_IDS } from "@sandbox-benchmarks/schema/provider-ids";
import type { ProviderMetaSource } from "@sandbox-benchmarks/schema/provider-meta";
import { normalizeProviderInput } from "@sandbox-benchmarks/schema/provider-meta";
import { PROVIDERS, REGISTRY } from "@sandbox-benchmarks/schema/providers";

describe("registry invariants (never edited per provider)", () => {
	test("every registered id has exactly one driver loader", () => {
		expect(Object.keys(DRIVERS).sort()).toEqual([...PROVIDER_IDS].sort());
	});

	test("the provider table is the registry, in registry order", () => {
		expect(PROVIDERS.map((provider) => provider.id)).toEqual([...PROVIDER_IDS]);
	});

	test("input names are unique within each provider", () => {
		for (const id of PROVIDER_IDS) {
			const names = REGISTRY[id].inputs.map((input) => normalizeProviderInput(input).name);
			expect(new Set(names).size).toBe(names.length);
		}
	});
});

test("registry projection (review this snapshot when adding a provider)", () => {
	const projection = Object.fromEntries(
		PROVIDER_IDS.map((id) => {
			const meta: ProviderMetaSource = REGISTRY[id];
			const inputs = meta.inputs.map(normalizeProviderInput);
			return [
				id,
				{
					artifact: meta.artifact.kind,
					required: inputs.filter((input) => input.required).map((input) => input.name),
					isolation: meta.isolation.class,
					runtimeIdentity: meta.runtimeIdentity ?? "root",
					quotaDomain: meta.quotaDomain ?? id,
				},
			];
		}),
	);
	expect(projection).toMatchSnapshot();
});
