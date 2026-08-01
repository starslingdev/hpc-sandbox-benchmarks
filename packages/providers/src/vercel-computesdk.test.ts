import { afterAll, describe, expect, mock, test } from "bun:test";

let createParams: Record<string, unknown> | undefined;
mock.module("@vercel/sandbox", () => ({
	Sandbox: {
		create: async (params: Record<string, unknown>) => {
			createParams = params;
			return { sandboxId: "sbx_test" };
		},
	},
	Snapshot: {},
}));

const originalToken = process.env.VERCEL_OIDC_TOKEN;
process.env.VERCEL_OIDC_TOKEN = "offline-oidc-token";
const { config, providers } = await import("./index.ts");
const { TARGET_SPEC } = await import("@sandbox-benchmarks/schema");

afterAll(() => {
	if (originalToken === undefined) delete process.env.VERCEL_OIDC_TOKEN;
	else process.env.VERCEL_OIDC_TOKEN = originalToken;
});

describe("ComputeSDK Vercel integration", () => {
	test("uses OIDC and forwards the shared VCR image and resources", async () => {
		const adapter = providers.find((provider) => provider.name === "vercel");
		const created = await adapter?.createCompute().sandbox.create(adapter.createOptions);
		expect(created?.sandboxId).toBe("sbx_test");
		expect(createParams).toMatchObject({
			image: config.vercelImage,
			resources: { vcpus: TARGET_SPEC.vcpus },
		});
		expect(createParams).not.toHaveProperty("token");
		expect(createParams).not.toHaveProperty("teamId");
		expect(createParams).not.toHaveProperty("projectId");
	});
});
