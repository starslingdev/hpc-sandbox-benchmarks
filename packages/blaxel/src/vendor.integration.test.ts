// Blaxel tested at the vendor seam: the adapter's translation over a stub of @blaxel/core's
// `SandboxInstance`, the port contract, and sessions through the package's own module. Kit
// behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in
// the driver package.

import { describe, expect, test } from "bun:test";
import type { SandboxInstance } from "@blaxel/core";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import blaxel from "./driver.ts";
import type { BlaxelSdk } from "./vendor.ts";
import {
	BLAXEL_ATTEMPT_LABEL,
	BLAXEL_KEEPALIVE_PROCESS,
	BLAXEL_OWNER_LABEL,
	BLAXEL_PTS_DATA_DIR,
	BLAXEL_REGION,
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
	return vendorDriver(blaxel, context, {
		vendor: blaxelVendor(workspace.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

vendorContract("blaxel adapter", blaxel, () =>
	blaxelVendor(blaxelWorkspace({ pageSize: 1 }).sdk, context),
);

describe("Blaxel end to end through its module", () => {
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
		// Another tenant's sandbox mid-delete holds nothing the benchmark competes with.
		workspace.allocate("their-leaving-box", {}, "DELETING");
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
		const remove = workspace.sdk.delete;
		let refused = false;
		workspace.sdk.delete = async (name) => {
			if (!refused) {
				refused = true;
				throw { code: 429 };
			}
			return remove(name);
		};
		await session.destroy();
		expect(refused).toBe(true);
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
});
