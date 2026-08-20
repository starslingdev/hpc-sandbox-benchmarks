import { describe, expect, test } from "bun:test";
import type { ProviderId } from "../src/provider-ids.ts";
import { PROVIDER_IDS } from "../src/provider-ids.ts";
import { REGISTRY } from "../src/provider-meta/index.ts";
import { validateProviderModules } from "./provider-meta-schema.ts";

const VALID_MODULES = Object.fromEntries(
	PROVIDER_IDS.map((id) => [id, { id, meta: REGISTRY[id] }]),
) as Record<ProviderId, unknown>;

function replacing(id: ProviderId, module: unknown): Record<ProviderId, unknown> {
	return { ...VALID_MODULES, [id]: module };
}

function meta(id: ProviderId, replacement: Record<string, unknown>): Record<ProviderId, unknown> {
	return replacing(id, { id, meta: { ...REGISTRY[id], ...replacement } });
}

describe("Tier-3 provider metadata schema", () => {
	test("accepts every correlated committed descriptor", () => {
		expect(validateProviderModules(VALID_MODULES)).toBeDefined();
	});

	test("rejects a module whose declared id differs from its generated key", () => {
		expect(() =>
			validateProviderModules(replacing("e2b", { id: "tama", meta: REGISTRY.e2b })),
		).toThrow(/e2b: metadata module declares id tama/);
	});

	test("rejects empty artifact evidence, runner names, and invalid pre-auth policies", () => {
		expect(() =>
			validateProviderModules(meta("vercel", { artifact: { kind: "mirror", repository: "" } })),
		).toThrow(/repository/);
		expect(() => validateProviderModules(meta("microsandbox-local", { runner: "" }))).toThrow(
			/runner/,
		);
		expect(() => validateProviderModules(meta("vercel", { preAuth: "custom-auth" }))).toThrow(
			/preAuth/,
		);
	});

	test("rejects malformed, reserved, and same-vendor colliding baked suffixes", () => {
		expect(() =>
			validateProviderModules(
				meta("daytona-container", { artifact: { kind: "baked", nameSuffix: "container" } }),
			),
		).toThrow(/lowercase kebab-case suffix/);
		expect(() =>
			validateProviderModules(
				meta("daytona-container", {
					artifact: { kind: "baked", nameSuffix: "-container-candidate" },
				}),
			),
		).toThrow(/reserved word 'candidate'/);
		expect(() =>
			validateProviderModules(meta("daytona-container", { artifact: { kind: "baked" } })),
		).toThrow(/daytona-vm\/daytona-container.*derive the same release name/);
	});

	test("rejects duplicate, secret-defaulted, and required-defaulted inputs", () => {
		expect(() =>
			validateProviderModules(meta("e2b", { inputs: ["E2B_API_KEY", "E2B_API_KEY"] })),
		).toThrow(/names are unique/);
		expect(() =>
			validateProviderModules(
				meta("e2b", {
					inputs: [{ name: "E2B_TEMPLATE", source: { kind: "secret" }, default: "template" }],
				}),
			),
		).toThrow(/defaults belong only to variable sources/);
		expect(() =>
			validateProviderModules(
				meta("e2b", {
					inputs: [
						{
							name: "E2B_TEMPLATE",
							source: { kind: "variable" },
							required: true,
							default: "template",
						},
					],
				}),
			),
		).toThrow(/not both required and defaulted/);
	});

	test("rejects malformed transport and pricing before generation", () => {
		expect(() =>
			validateProviderModules(
				meta("e2b", {
					transport: { streaming: false, syncCapMs: Number.POSITIVE_INFINITY, detachedPoll: true },
				}),
			),
		).toThrow(/syncCapMs/);
		expect(() =>
			validateProviderModules(
				meta("e2b", {
					pricing: { ...REGISTRY.e2b.pricing, components: [] },
				}),
			),
		).toThrow(/components/);
	});

	test("requires isolation variants to share pricing by object identity", () => {
		expect(() =>
			validateProviderModules(
				meta("daytona-container", {
					pricing: structuredClone(REGISTRY["daytona-container"].pricing),
				}),
			),
		).toThrow(/daytona-vm\/daytona-container: isolation variants must share one pricing object/);
	});
});
