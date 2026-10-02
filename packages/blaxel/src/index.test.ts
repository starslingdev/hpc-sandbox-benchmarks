// Blaxel tested at the vendor seam: the adapter's translation over a stub of @blaxel/core's
// `SandboxInstance`, the port contract, and sessions through the package's own module. Kit
// behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in
// the driver package.

import { describe, expect, spyOn, test } from "bun:test";
import { SandboxInstance } from "@blaxel/core";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract } from "@sandbox-benchmarks/driver/vendor/testing";
import blaxel, { BLAXEL_SANDBOX_ID } from "./index.ts";
import type { BlaxelSdk } from "./vendor.ts";
import {
	BLAXEL_ATTEMPT_LABEL,
	BLAXEL_KEEPALIVE_PROCESS,
	BLAXEL_OWNER_LABEL,
	BLAXEL_PTS_DATA_DIR,
	BLAXEL_REGION,
	BLAXEL_VOLUME_HEADROOM_MB,
	BLAXEL_VOLUME_MOUNT_DIR,
	blaxelVendor,
} from "./vendor.ts";

const IMAGE = "sandbox-benchmarks-toolchain-v8";
const context: DriverContext<"blaxel"> = {
	env: { BL_API_KEY: "bl_test-key", BL_WORKSPACE: "test-workspace" },
	artifact: { kind: "baked" },
	resolvedArtifact: { kind: "baked", ref: IMAGE },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });
const NAMED = "benchmark-33333333-3333-4333-8333-333333333333";

interface ProcessCall {
	readonly command: string;
	readonly name?: string;
	readonly keepAlive?: boolean;
	readonly waitForCompletion?: boolean;
	readonly timeout?: number;
}
interface Row {
	status: string;
	readonly labels: Record<string, string>;
	readonly memory: number;
	readonly files: Map<string, string>;
	deletingGets: number;
}

/**
 * A whole Blaxel workspace behind a stub of `SandboxInstance`'s statics: a delete leaves the record
 * DELETING until a get observes it gone (the control plane's 404), cursor-paged listings, and per
 * sandbox a process API and file store. Control-plane errors are the parsed bodies the generated
 * client throws (`{ code }`).
 */
function blaxelWorkspace(
	options: {
		readonly pageSize?: number;
		readonly volumeCapacityGb?: number;
		readonly reportedMemoryMb?: number;
		readonly keepaliveStatus?: string;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
	} = {},
) {
	const rows = new Map<string, Row>();
	const created: Array<Record<string, unknown>> = [];
	const processCalls: ProcessCall[] = [];
	const deletes: string[] = [];
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (
		name: string,
		labels: Record<string, string> = {},
		status = "DEPLOYED",
		memory = 8192,
	) => {
		rows.set(name, { status, labels, memory, files: new Map(), deletingGets: 0 });
		return name;
	};
	const live = (name: string) => {
		const row = rows.get(name);
		if (row?.status !== "DEPLOYED") throw new Error(`sandbox ${name} is not deployed`);
		return row;
	};
	const instance = (name: string) =>
		({
			metadata: { name, labels: rows.get(name)?.labels },
			get status() {
				return rows.get(name)?.status;
			},
			spec: {
				runtime: {
					memory: options.reportedMemoryMb ?? rows.get(name)?.memory,
					image: `${IMAGE}:latest`,
				},
				region: BLAXEL_REGION,
			},
			process: {
				exec: async (call: ProcessCall) => {
					processCalls.push(call);
					const row = live(name);
					const base = { pid: "1234", name: call.name ?? "cmd", logs: "", stderr: "" };
					if (call.waitForCompletion === false) {
						const echo = /^echo (\S+) > (\S+)$/.exec(call.command);
						if (echo) row.files.set(echo[2] ?? "", `${echo[1]}\n`);
						const status =
							call.name === BLAXEL_KEEPALIVE_PROCESS
								? (options.keepaliveStatus ?? "running")
								: "running";
						return { ...base, status, exitCode: 0, stdout: "" };
					}
					if (call.command === `df -Pk '${BLAXEL_PTS_DATA_DIR}' | awk 'NR==2 {print $2}'`)
						return {
							...base,
							status: "completed",
							exitCode: 0,
							stdout: `${Math.round((options.volumeCapacityGb ?? 40.1) * 1024 * 1024)}\n`,
						};
					const exit = /^sh -c 'exit (\d+)'$/.exec(call.command);
					if (exit) return { ...base, status: "failed", exitCode: Number(exit[1]), stdout: "" };
					if (call.command === "killed")
						return { ...base, status: "killed", exitCode: 0, stdout: "partial" };
					return { ...base, status: "completed", exitCode: 0, stdout: "ok" };
				},
			},
			fs: {
				read: async (path: string) => {
					const body = live(name).files.get(path);
					if (body === undefined)
						throw Object.assign(new Error("not found"), { response: { status: 404 } });
					return body;
				},
				write: async (path: string, content: string) => {
					live(name).files.set(path, content);
					return { message: "ok" };
				},
			},
		}) as unknown as SandboxInstance;
	const sdk = {
		create: async (params: Record<string, unknown>) => {
			created.push(params);
			const name = allocate(String(params.name), params.labels as Record<string, string>);
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("socket hang up after the vendor accepted the create");
			}
			return instance(name);
		},
		get: async (name: string) => {
			const row = rows.get(name);
			if (!row) throw { code: 404, error: "not found" };
			if (row.status === "DELETING" && row.deletingGets++ >= 1) {
				rows.delete(name);
				throw { code: 404, error: "not found" };
			}
			return instance(name);
		},
		delete: async (name: string) => {
			deletes.push(name);
			const row = rows.get(name);
			if (!row) throw { code: 404, error: "not found" };
			row.status = "DELETING";
			return {};
		},
		list: async (query: { cursor?: string }) => {
			const names = [...rows.keys()];
			const from = Number(query.cursor ?? 0);
			const size = options.pageSize ?? 100;
			return {
				data: names.slice(from, from + size).map(instance),
				...(from + size < names.length && { nextCursor: String(from + size) }),
			};
		},
	} as unknown as BlaxelSdk;
	return { sdk, rows, created, processCalls, deletes, allocate };
}

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(workspace: ReturnType<typeof blaxelWorkspace>) {
	return driverFromComputeSpec(
		"blaxel",
		blaxel.specFor(context, {
			vendor: blaxelVendor(workspace.sdk, context),
			timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
		}),
		context.resolvedArtifact,
		[context.env.BL_API_KEY],
	);
}

describe("Blaxel translation", () => {
	test("creates the memory-coupled shape with a named, labelled ephemeral volume", async () => {
		const workspace = blaxelWorkspace();
		const { control } = blaxelVendor(workspace.sdk, context);
		const created = await control.create({ request, marker: NAMED }, op());
		expect(created).toMatchObject({ id: NAMED, phase: "ready", marker: NAMED });
		expect(workspace.created[0]).toEqual({
			name: NAMED,
			image: `${IMAGE}:latest`,
			memory: 8192,
			region: BLAXEL_REGION,
			ttl: "10800s",
			labels: { [BLAXEL_OWNER_LABEL]: "blaxel", [BLAXEL_ATTEMPT_LABEL]: NAMED },
			volumes: [
				{
					name: "sbx-bench-33333333",
					mountPath: BLAXEL_VOLUME_MOUNT_DIR,
					type: "ephemeral",
					sizeMb: 40 * 1024 + BLAXEL_VOLUME_HEADROOM_MB,
				},
			],
		});
	});

	test("reads statuses as phases and owns only by the name shape or the owner label", async () => {
		const workspace = blaxelWorkspace();
		const { control } = blaxelVendor(workspace.sdk, context);
		const read = (name: string, labels: Record<string, string>, status = "DEPLOYED") =>
			control.get(workspace.allocate(name, labels, status), op());
		expect(await read("a", {}, "DEPLOYING")).toMatchObject({ phase: "pending" });
		expect(await read("b", {}, "FAILED")).toMatchObject({ phase: "failed" });
		expect(await read("c", {}, "DEACTIVATED")).toMatchObject({ phase: "failed" });
		expect(await read("d", {}, "DELETING")).toMatchObject({ phase: "deleting" });
		expect(await read("e", {}, "TERMINATED")).toMatchObject({ phase: "gone" });
		expect((await read(NAMED, {}))?.marker).toBe(NAMED);
		const labelled = await read("custom-name", { [BLAXEL_OWNER_LABEL]: "blaxel" });
		expect(labelled?.marker?.startsWith(MARKER_PREFIX)).toBe(true);
		expect((await read("someones-dev-box", {}))?.marker).toBeUndefined();
		// An attempt label alone, on neither the owner label nor the benchmark name, attributes nothing.
		const attemptOnly = await read("their-copy", { [BLAXEL_ATTEMPT_LABEL]: NAMED });
		expect(attemptOnly?.marker).toBeUndefined();
		const labelledAttempt = await read("labelled-attempt", {
			[BLAXEL_OWNER_LABEL]: "blaxel",
			[BLAXEL_ATTEMPT_LABEL]: NAMED,
		});
		expect(labelledAttempt?.marker).toBe(NAMED);
		expect(await control.get("missing", op())).toBeNull();
		expect(await control.remove("missing", op())).toBe("removed");
	});

	test("classifies structured refusals by control-plane code only; 429 is retryable", () => {
		const { refused } = blaxelVendor(blaxelWorkspace().sdk, context).control;
		expect(refused?.({ code: 401 })).toEqual({ retryable: false });
		expect(refused?.({ code: 422 })).toEqual({ retryable: false });
		expect(refused?.({ code: 429 })).toEqual({ retryable: true });
		expect(refused?.({ code: 500 })).toBeUndefined();
		expect(refused?.(new Error("401 unauthorized"))).toBeUndefined();
	});

	test("withholds an exit code the sandbox never reported", async () => {
		const workspace = blaxelWorkspace();
		const { data } = blaxelVendor(workspace.sdk, context);
		const native = await data.attach(
			{ id: NAMED, phase: "ready", raw: await workspace.sdk.get(workspace.allocate(NAMED)) },
			op(),
		);
		expect(await data.exec(native, "killed")).toEqual({ stdout: "partial", stderr: "" });
	});
});

vendorContract("blaxel adapter", () => ({
	vendor: blaxelVendor(blaxelWorkspace({ pageSize: 1 }).sdk, context),
	account: "shared",
}));

describe("Blaxel end to end through its module", () => {
	test("declares identity and native-launch durability", () => {
		expect(blaxel.id).toBe("blaxel");
		expect(blaxel.provenance.packageName).toBe("@blaxel/core");
		expect(blaxel.execution).toEqual({ syncCapMs: 60_000, durable: "native-launch" });
		expect(blaxel.createBudget).toBeUndefined();
		expect(BLAXEL_SANDBOX_ID.allows("benchmark-abc-123")).toBe(true);
		expect(BLAXEL_SANDBOX_ID.allows("Benchmark_1")).toBe(false);
	});

	test("a session starts its keepalive, proves the volume, runs, launches, files, inventories, and is deleted", async () => {
		const workspace = blaxelWorkspace({ pageSize: 2 });
		workspace.allocate("someones-dev-box");
		const driver = driverOver(workspace);
		const session = await driver.create(request);
		expect(workspace.processCalls[0]).toEqual({
			name: BLAXEL_KEEPALIVE_PROCESS,
			command: "sleep infinity",
			keepAlive: true,
			timeout: 0,
			waitForCompletion: false,
		});
		expect(workspace.processCalls[1]?.command).toContain(`df -Pk '${BLAXEL_PTS_DATA_DIR}'`);

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("echo done > /tmp/done");
		expect(workspace.processCalls.at(-1)).toMatchObject({ keepAlive: true, timeout: 0 });
		expect(await session.files?.readFile("/tmp/done")).toBe("done\n");
		expect(await session.files?.exists("/tmp/missing")).toBe(false);
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.exists("/tmp/item")).toBe(true);

		const labelled = workspace.allocate("custom-name", { [BLAXEL_OWNER_LABEL]: "blaxel" });
		const named = workspace.allocate(NAMED, {}, "FAILED");
		// Another tenant's sandbox that copied the attempt label is foreign, never deleted.
		workspace.allocate("their-copy", { [BLAXEL_ATTEMPT_LABEL]: NAMED });
		expect(await driver.inventory?.list()).toEqual({
			owned: [
				session.sandboxRef,
				{ provider: "blaxel", id: labelled },
				{ provider: "blaxel", id: named },
			],
			foreignCount: 2,
		});
		await driver.destroyById?.({ provider: "blaxel", id: labelled });
		await driver.destroyById?.({ provider: "blaxel", id: named });
		await session.destroy();
		expect(workspace.deletes.at(-1)).toBe(session.sandboxRef.id);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 2 });
	});

	test("a short volume or a memory off the request is refused; a dead keepalive fails; each is deleted", async () => {
		for (const [options, code] of [
			[{ volumeCapacityGb: 5 }, "invalid-create-request"],
			[{ reportedMemoryMb: 4096 }, "invalid-create-request"],
			[{ keepaliveStatus: "failed" }, "create-failed"],
		] as const) {
			const workspace = blaxelWorkspace(options);
			await expect(driverOver(workspace).create(request)).rejects.toMatchObject({
				code,
				provider: "blaxel",
			});
			expect(workspace.deletes).toHaveLength(1);
			expect(workspace.rows.size).toBe(0);
		}
	});

	test("an ambiguous create is recovered by its name and deleted", async () => {
		const workspace = blaxelWorkspace({ ambiguousFirstCreate: true });
		const failure = await driverOver(workspace)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(workspace.deletes).toEqual([String(workspace.created[0]?.name)]);
		expect(workspace.rows.size).toBe(0);
	});
});

describe("Blaxel's production binding", () => {
	test("the default module refuses shapes off the coupling curve or without a volume before any call", async () => {
		const create = spyOn(SandboxInstance, "create");
		try {
			const driver = blaxel.driver(context);
			for (const input of [
				{ ...request, spec: { ...request.spec, memoryGb: 16 } },
				{ ...request, spec: { ...request.spec, vcpus: 2 } },
				{ ...request, spec: { vcpus: 4, memoryGb: 8 } },
				{ ...request, artifact: { kind: "baked" as const, ref: "wrong-image" } },
			])
				await expect(driver.create(input)).rejects.toMatchObject({
					code: "invalid-create-request",
				});
			expect(create).not.toHaveBeenCalled();
		} finally {
			create.mockRestore();
		}
	});

	test("the default module treats a structured refusal as definitive and never reconciles it", async () => {
		const create = spyOn(SandboxInstance, "create").mockRejectedValueOnce({ code: 401 });
		const get = spyOn(SandboxInstance, "get");
		try {
			const failure = await blaxel
				.driver(context)
				.create(request)
				.catch((caught) => caught);
			expect(failure).toMatchObject({ code: "create-failed" });
			expect(create).toHaveBeenCalledTimes(1);
			expect(get).not.toHaveBeenCalled();
			expect(create.mock.calls[0]?.[0]).toMatchObject({ image: `${IMAGE}:latest`, memory: 8192 });
		} finally {
			create.mockRestore();
			get.mockRestore();
		}
	});
});
