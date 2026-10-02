import { expect, test } from "bun:test";
import type { ModalClient } from "modal";
import { observeModalCleanupApp } from "./cleanup-observation.ts";

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

test("pages history oldest-ward to the anchor and fails a cursor that does not advance", async () => {
	const history = (pages: ReadonlyArray<ReadonlyArray<{ id: string; createdAt: number }>>) => {
		const seen: Array<number | undefined> = [];
		const { client } = fixture();
		Object.assign(client, {
			cpClient: {
				sandboxListV2: async ({ beforeTimestamp }: { beforeTimestamp?: number }) => {
					seen.push(beforeTimestamp);
					const page = pages[seen.length - 1] ?? [];
					return { sandboxes: page.map((row) => ({ ...row, appId: "ap-original" })) };
				},
			},
		});
		return { client, seen };
	};
	const paged = history([
		[{ id: "sb-newer", createdAt: 9 }],
		[{ id: "sb-original", createdAt: 4 }],
	]);
	await observeModalCleanupApp("sb-original", AbortSignal.timeout(5000), paged.client);
	expect(paged.seen).toEqual([undefined, 9]);
	const stalled = history([[{ id: "sb-newer", createdAt: 9 }], [{ id: "sb-newer", createdAt: 9 }]]);
	await expect(
		observeModalCleanupApp("sb-original", AbortSignal.timeout(5000), stalled.client),
	).rejects.toThrow("pagination did not advance");
});
