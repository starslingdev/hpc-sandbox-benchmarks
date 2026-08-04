import { describe, expect, it } from "bun:test";
import type { Runloop, RunloopSDK } from "@runloop/api-client";
import { runloopCompute, runloopSandboxInfo, runloopStatus } from "./runloop.ts";

function devbox(
	status: Runloop.Devboxes.DevboxView["status"] = "running",
	id = "dbx_test",
): Runloop.Devboxes.DevboxView {
	return {
		id,
		status,
		create_time_ms: 1_700_000_000_000,
		launch_parameters: { keep_alive_time_seconds: 3600 },
		metadata: { owner: "benchmark" },
		blueprint_id: "bpt_test",
	} as unknown as Runloop.Devboxes.DevboxView;
}

describe("Runloop provider hardening", () => {
	it("maps native statuses into ComputeSDK's public status contract", () => {
		expect(runloopStatus("running")).toBe("running");
		expect(runloopStatus("failure")).toBe("error");
		expect(runloopStatus("shutdown")).toBe("stopped");
		expect(runloopStatus("provisioning")).toBe("stopped");
		expect(runloopSandboxInfo(devbox("running"))).toMatchObject({
			id: "dbx_test",
			provider: "runloop",
			status: "running",
			createdAt: new Date(1_700_000_000_000),
			timeout: 3_600_000,
			metadata: {
				owner: "benchmark",
				runloopDevboxId: "dbx_test",
				templateId: "bpt_test",
				runtime: "node",
			},
		});
	});

	it("uses live reads, filters tombstones, and propagates forced-shutdown failures", async () => {
		const createCalls: unknown[] = [];
		const awaitCalls: unknown[][] = [];
		const shutdownCalls: unknown[][] = [];
		let shutdownError: Error | undefined;
		const client = {
			api: {
				devboxes: {
					create: async (params: unknown) => {
						createCalls.push(params);
						return devbox("provisioning");
					},
					awaitRunning: async (...args: unknown[]) => {
						awaitCalls.push(args);
						return devbox("running");
					},
					retrieve: async () => devbox("failure"),
					list: async () => ({ devboxes: [devbox("running"), devbox("shutdown", "dbx_old")] }),
					shutdown: async (...args: unknown[]) => {
						shutdownCalls.push(args);
						if (shutdownError) throw shutdownError;
						return devbox("shutdown");
					},
					snapshotDisk: async () => ({
						id: "snp_test",
						create_time_ms: 1_700_000_000_100,
						metadata: { kind: "lifecycle" },
					}),
					listDiskSnapshots: async () => ({ snapshots: [] }),
					deleteDiskSnapshot: async () => undefined,
				},
			},
		} as unknown as Pick<RunloopSDK, "api">;
		const compute = runloopCompute({ client });

		const sandbox = await compute.sandbox.create({
			timeout: 20 * 60 * 1000,
			blueprint_name: "toolchain-v1",
			launch_parameters: { keep_alive_time_seconds: 3600 },
		});
		expect(createCalls[0]).toMatchObject({
			blueprint_name: "toolchain-v1",
			launch_parameters: { keep_alive_time_seconds: 3600 },
		});
		expect(awaitCalls).toEqual([["dbx_test", { longPoll: { timeoutMs: 20 * 60 * 1000 } }]]);
		expect((await sandbox.getInfo()).status).toBe("error");
		expect(await compute.sandbox.list?.()).toHaveLength(1);

		const snapshot = await compute.snapshot?.create(sandbox.sandboxId, {
			name: "lifecycle",
			metadata: { kind: "lifecycle" },
		});
		expect(snapshot).toEqual({
			id: "snp_test",
			provider: "runloop",
			createdAt: new Date(1_700_000_000_100),
			metadata: { kind: "lifecycle" },
		});

		await sandbox.destroy();
		expect(shutdownCalls.at(-1)).toEqual(["dbx_test", { force: "true" }]);
		shutdownError = new Error("control plane unavailable");
		await expect(sandbox.destroy()).rejects.toThrow("control plane unavailable");
	});

	it("shuts down an allocation when its readiness wait fails", async () => {
		const shutdownCalls: unknown[][] = [];
		const client = {
			api: {
				devboxes: {
					create: async () => devbox("provisioning"),
					awaitRunning: async () => {
						throw new Error("boot failed");
					},
					shutdown: async (...args: unknown[]) => {
						shutdownCalls.push(args);
						return devbox("shutdown");
					},
				},
			},
		} as unknown as Pick<RunloopSDK, "api">;
		const compute = runloopCompute({ client });

		await expect(compute.sandbox.create()).rejects.toThrow(
			/failed to reach running and was shut down/,
		);
		expect(shutdownCalls).toEqual([["dbx_test", { force: "true" }]]);
	});

	it("keeps Blueprint and snapshot source selectors mutually exclusive", async () => {
		const createCalls: Runloop.Devboxes.DevboxCreateParams[] = [];
		const client = {
			api: {
				devboxes: {
					create: async (params: Runloop.Devboxes.DevboxCreateParams) => {
						createCalls.push(params);
						return devbox("provisioning");
					},
					awaitRunning: async () => devbox("running"),
				},
			},
		} as unknown as Pick<RunloopSDK, "api">;
		const compute = runloopCompute({ client });

		await compute.sandbox.create({
			blueprint_name: "default-blueprint",
			snapshotId: "snp_override",
		});
		expect(createCalls[0]).toMatchObject({ snapshot_id: "snp_override" });
		expect(createCalls[0]).not.toHaveProperty("blueprint_id");
		expect(createCalls[0]).not.toHaveProperty("blueprint_name");
	});
});
