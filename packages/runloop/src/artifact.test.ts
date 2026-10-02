// The Runloop Blueprint builder at its interface: a build request becomes one Blueprint build and
// a best-effort sweep of same-name records, over a stub client.

import { describe, expect, test } from "bun:test";
import { runloopArtifactBuilder, runloopBlueprintParams } from "./artifact.ts";

const DIGEST = `ghcr.io/starslingdev/sandbox-benchmarks-toolchain@sha256:${"a".repeat(64)}`;
const NAME = "sandbox-benchmarks-toolchain-v7-candidate";
const SPEC = { vcpus: 4, memoryGb: 8, diskGb: 40 };

function build(blueprint: object) {
	const keys: string[] = [];
	const logs: string[] = [];
	const builder = runloopArtifactBuilder((env) => {
		keys.push(env.RUNLOOP_API_KEY);
		return { blueprint } as never;
	});
	const run = () =>
		builder.build({
			bakes: "oci",
			name: NAME,
			base: { digestRef: DIGEST },
			spec: SPEC,
			env: { RUNLOOP_API_KEY: "rl_test" },
			replace: "allowed",
			imagesDir: "/unused",
			dockerConfig: "/unused",
			log: (line) => logs.push(line),
			signal: new AbortController().signal,
		});
	return { keys, logs, run };
}

describe("the Runloop Blueprint builder", () => {
	test("pins the exact immutable FROM, canonical name, and target sizing", () => {
		expect(runloopBlueprintParams(NAME, DIGEST, SPEC)).toEqual({
			name: NAME,
			dockerfile: `FROM ${DIGEST}\n`,
			launch_parameters: {
				resource_size_request: "CUSTOM_SIZE",
				custom_cpu_cores: 4,
				custom_gb_memory: 8,
				custom_disk_size: 40,
			},
		});
	});

	test("builds the Blueprint with the parsed credential, then removes completed predecessors", async () => {
		let received: unknown;
		let listedWith: unknown;
		const deleted: string[] = [];
		const { keys, logs, run } = build({
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
		});
		expect(await run()).toEqual({ ref: NAME, replaced: "atomic" });
		expect(keys).toEqual(["rl_test"]);
		expect(received).toEqual(runloopBlueprintParams(NAME, DIGEST, SPEC));
		expect(JSON.stringify(received)).not.toContain("rl_test");
		expect(listedWith).toEqual({ name: NAME, status: "build_complete", limit: 100 });
		expect(deleted).toEqual(["bpt_old"]);
		expect(logs).toContain("runloop Blueprint built: bpt_test");
	});

	test("keeps a successful successor when stale cleanup is blocked", async () => {
		const { logs, run } = build({
			create: async () => ({ id: "bpt_new" }),
			list: async () => [
				{
					id: "bpt_old",
					delete: async () => {
						throw new Error("dependent snapshot");
					},
				},
			],
		});
		await expect(run()).resolves.toEqual({ ref: NAME, replaced: "atomic" });
		expect(logs.at(-1)).toContain("dependent snapshot");
	});

	test("removes failed build records while preserving the build error", async () => {
		const deleted: string[] = [];
		const { run } = build({
			create: async () => {
				throw new Error("docker build failed");
			},
			list: async (params: { status?: string }) => {
				expect(params.status).toBe("failed");
				return [{ id: "bpt_failed", delete: async () => deleted.push("bpt_failed") }];
			},
		});
		await expect(run()).rejects.toThrow("docker build failed");
		expect(deleted).toEqual(["bpt_failed"]);
	});
});
