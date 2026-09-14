import { expect, test } from "bun:test";
import type { ModalClient } from "modal";
import { observeModalCleanupApp } from "./modal-cleanup-observation.ts";

function fixture(running?: "v1" | "v2", anchored = true) {
	const calls: string[] = [];
	const client = {
		apps: {
			fromName: async (name: string, options: { createIfMissing: boolean }) => {
				expect(name).toBe("sandbox-benchmarks");
				expect(options.createIfMissing).toBe(false);
				return { appId: "ap-original" };
			},
		},
		cpClient: {
			sandboxListV2: async (params: { appId: string; includeFinished: boolean }) => {
				expect(params).toMatchObject({ appId: "ap-original", includeFinished: true });
				return { sandboxes: anchored ? [{ id: "sb-original", appId: "ap-original" }] : [] };
			},
		},
		environmentName: () => "main",
		sandboxes: {
			list: async function* (params: { appId: string }) {
				expect(params.appId).toBe("ap-original");
				calls.push("v1");
				if (running === "v1") yield { detach() {} };
			},
			experimentalList: async function* (params: { appId: string }) {
				expect(params.appId).toBe("ap-original");
				calls.push("v2");
				if (running === "v2") yield { detach() {} };
			},
		},
	} as unknown as ModalClient;
	return { client, calls };
}

test("requires an original-history anchor and two empty observations of both generations", async () => {
	const f = fixture();
	expect(
		await observeModalCleanupApp("sb-original", AbortSignal.timeout(5000), f.client),
	).toMatchObject({
		kind: "modal-app",
		appId: "ap-original",
		anchorSandboxId: "sb-original",
		inventoryPasses: 2,
	});
	expect(f.calls).toEqual(["v1", "v2", "v1", "v2"]);
});

test("a running allocation in either generation refuses App clearance", async () => {
	for (const generation of ["v1", "v2"] as const) {
		const f = fixture(generation);
		await expect(
			observeModalCleanupApp("sb-original", AbortSignal.timeout(5000), f.client),
		).rejects.toThrow("running allocation");
	}
});

test("an empty App in another credential environment cannot certify the original run", async () => {
	const f = fixture(undefined, false);
	await expect(
		observeModalCleanupApp("sb-original", AbortSignal.timeout(5000), f.client),
	).rejects.toThrow("original run");
	expect(f.calls).toEqual([]);
});
