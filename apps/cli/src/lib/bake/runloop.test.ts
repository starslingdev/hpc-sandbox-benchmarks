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
		const sdk = {
			blueprint: {
				create: async (params: unknown) => {
					received = params;
					return { id: "bpt_test" };
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
		expect(logs.at(-1)).toContain("bpt_test");
	});
});
