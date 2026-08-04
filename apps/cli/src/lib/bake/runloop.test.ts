import { describe, expect, it } from "bun:test";
import type { RunloopSDK } from "@runloop/api-client";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema";
import { bakeRunloopBlueprint, runloopBlueprintParams } from "./runloop.ts";

const DIGEST = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`;

describe("Runloop Blueprint bake", () => {
	it("pins the exact immutable FROM, canonical name, and shared target sizing", () => {
		expect(runloopBlueprintParams("sandbox-benchmarks-toolchain-v7-candidate", DIGEST)).toEqual({
			name: "sandbox-benchmarks-toolchain-v7-candidate",
			dockerfile: `FROM ${DIGEST}\n`,
			launch_parameters: {
				resource_size_request: "CUSTOM_SIZE",
				custom_cpu_cores: TARGET_SPEC.vcpus,
				custom_gb_memory: TARGET_SPEC.memoryGb,
				custom_disk_size: TARGET_SPEC.diskGb,
			},
		});
	});

	it("creates and awaits the Blueprint without putting credentials in build parameters", async () => {
		let received: unknown;
		const deleted: string[] = [];
		let listedWith: unknown;
		const sdk = {
			blueprint: {
				create: async (params: unknown) => {
					received = params;
					return { id: "bpt_test" };
				},
				list: async (params: unknown) => {
					listedWith = params;
					return [
						{ id: "bpt_test", delete: async () => undefined },
						{ id: "bpt_old", delete: async () => deleted.push("bpt_old") },
					];
				},
			},
		} as unknown as Pick<RunloopSDK, "blueprint">;
		const logs: string[] = [];
		await bakeRunloopBlueprint(
			"sandbox-benchmarks-toolchain-v7-candidate",
			DIGEST,
			logs.push.bind(logs),
			sdk,
		);

		expect(received).toEqual(
			runloopBlueprintParams("sandbox-benchmarks-toolchain-v7-candidate", DIGEST),
		);
		expect(JSON.stringify(received)).not.toContain("RUNLOOP_API_KEY");
		expect(JSON.stringify(received)).not.toContain("bearerToken");
		expect(listedWith).toEqual({
			name: "sandbox-benchmarks-toolchain-v7-candidate",
			status: "build_complete",
			limit: 100,
		});
		expect(deleted).toEqual(["bpt_old"]);
		expect(logs).toContain("runloop Blueprint built: bpt_test");
		expect(logs.at(-1)).toContain("bpt_old");
	});

	it("keeps a successful successor when stale cleanup is blocked", async () => {
		const sdk = {
			blueprint: {
				create: async () => ({ id: "bpt_new" }),
				list: async () => [
					{
						id: "bpt_old",
						delete: async () => {
							throw new Error("dependent snapshot");
						},
					},
				],
			},
		} as unknown as Pick<RunloopSDK, "blueprint">;
		const logs: string[] = [];

		await expect(
			bakeRunloopBlueprint("toolchain-v7-candidate", DIGEST, logs.push.bind(logs), sdk),
		).resolves.toBeUndefined();
		expect(logs.at(-1)).toContain("dependent snapshot");
	});

	it("removes failed build records while preserving the build error", async () => {
		const deleted: string[] = [];
		const sdk = {
			blueprint: {
				create: async () => {
					throw new Error("docker build failed");
				},
				list: async (params: { status?: string }) => {
					expect(params.status).toBe("failed");
					return [{ id: "bpt_failed", delete: async () => deleted.push("bpt_failed") }];
				},
			},
		} as unknown as Pick<RunloopSDK, "blueprint">;

		await expect(
			bakeRunloopBlueprint("toolchain-v7-candidate", DIGEST, () => {}, sdk),
		).rejects.toThrow("docker build failed");
		expect(deleted).toEqual(["bpt_failed"]);
	});
});
