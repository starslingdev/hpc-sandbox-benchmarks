// Daytona tested at the vendor seam: the adapter's translation over a fake org, the port contract,
// sessions through each variant's own module, and the SDK's real create request. Kit behaviour
// (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in the
// driver package.

import { describe, expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { DaytonaError, Sandbox } from "@daytona/sdk";
import { DaytonaNotFoundError } from "@daytona/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isFailedCreateCleanupError, isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import container from "./container.ts";
import type { DaytonaClient } from "./vendor.ts";
import { DAYTONA_LISTING_TIMEOUT_MS, daytonaVendor } from "./vendor.ts";
import vm from "./vm.ts";

const KEY = "dtn_test-key";
const context: DriverContext<"daytona-vm"> = {
	env: { DAYTONA_API_KEY: KEY, DAYTONA_TARGET: "us-west-2" },
	artifact: { kind: "baked" },
	resolvedArtifact: { kind: "baked", ref: "benchmark-toolchain-v1" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};

/**
 * A whole Daytona org: creates return started sandboxes of the snapshot's class and shape, the
 * waited delete leaves a `destroyed` record, gets resolve an id or a name, and every guest answers
 * through its session commands.
 */
function daytonaOrg(
	options: {
		readonly sandboxClass?: "linux-vm" | "container";
		readonly disk?: number;
		readonly createError?: DaytonaError;
		readonly snapshotState?: string;
	} = {},
) {
	const rows = new Map<string, Sandbox>();
	const calls: Array<{ name: string; input?: unknown }> = [];
	const allocate = (name: string, state = "started") => {
		const id = randomUUID();
		const files = new Map<string, string>();
		const sandbox = {
			id,
			name,
			state,
			sandboxClass: options.sandboxClass ?? "linux-vm",
			cpu: 4,
			memory: 8,
			disk: options.disk ?? 40,
			process: {
				createSession: async (session: string) => {
					calls.push({ name: "createSession", input: session });
				},
				executeSessionCommand: async (
					session: string,
					command: { command: string; runAsync?: boolean },
				) => {
					calls.push({ name: "exec", input: { session, ...command } });
					const exit = /exit (\d+)/.exec(command.command);
					return {
						cmdId: "cmd-1",
						exitCode: exit ? Number(exit[1]) : 0,
						stdout: exit ? "" : "ok\n",
						stderr: "",
					};
				},
			},
			fs: {
				downloadFile: async (path: string) => Buffer.from(files.get(path) ?? ""),
				getFileDetails: async (path: string) => {
					if (!files.has(path)) throw new DaytonaNotFoundError("no such file", 404);
					return {};
				},
				uploadFile: async (content: Buffer, path: string) => {
					files.set(path, content.toString("utf8"));
				},
			},
			stop: async () => {
				calls.push({ name: "stop" });
			},
			createSnapshot: async (name: string) => {
				calls.push({ name: "createSnapshot", input: name });
			},
			start: async () => {
				calls.push({ name: "start" });
			},
		} as unknown as Sandbox;
		rows.set(id, sandbox);
		return sandbox;
	};
	const find = (idOrName: string) =>
		rows.get(idOrName) ?? [...rows.values()].find((row) => row.name === idOrName);
	const client = {
		create: async (params: { name: string; snapshot: string }, timeout: unknown) => {
			calls.push({ name: "create", input: [params, timeout] });
			if (options.createError) throw options.createError;
			return allocate(params.name);
		},
		get: async (idOrName: string) => {
			calls.push({ name: "get", input: idOrName });
			const row = find(idOrName);
			if (!row) throw new DaytonaNotFoundError("sandbox not found", 404);
			return row;
		},
		delete: async (sandbox: Sandbox, timeout: number, wait: boolean) => {
			calls.push({ name: "delete", input: [sandbox.id, timeout, wait] });
			const row = rows.get(sandbox.id);
			if (!row || row.state === "destroyed") throw new DaytonaNotFoundError("gone", 404);
			Object.assign(row, { state: "destroyed" });
		},
		list: async function* () {
			calls.push({ name: "list" });
			yield* rows.values();
		},
		snapshot: {
			get: async (name: string) => ({ name, state: options.snapshotState ?? "active" }),
			activate: async (snapshot: unknown) => {
				calls.push({ name: "activate", input: snapshot });
			},
			delete: async (name: string) => {
				calls.push({ name: "snapshot.delete", input: name });
			},
		},
	};
	return {
		client: client as unknown as DaytonaClient,
		rows,
		calls,
		allocate,
		names: (name: string) => calls.filter((call) => call.name === name),
	};
}

const vendorOver = (org: ReturnType<typeof daytonaOrg>, sandboxClass = "linux-vm" as const) =>
	daytonaVendor(context, sandboxClass, org.client);

/** Each variant's own module, lowered over a fake org instead of the real SDK. */
function driverOver(org: ReturnType<typeof daytonaOrg>, module: typeof vm | typeof container = vm) {
	const sandboxClass = module === vm ? "linux-vm" : "container";
	return vendorDriver(module as typeof vm, context, {
		vendor: daytonaVendor(context, sandboxClass, org.client),
		timing: { pollMs: 0, deleteTimeoutMs: 1_000 },
	});
}

vendorContract("daytona adapter", vm, () => vendorOver(daytonaOrg()));

describe("Daytona end to end through each variant's module", () => {
	test("cleanup stays owned until a lost create becomes visible", async () => {
		for (const module of [vm, container]) {
			const org = daytonaOrg({ sandboxClass: module === vm ? "linux-vm" : "container" });
			let name = "";
			Object.assign(org.client, {
				create: async (params: { name: string }) => {
					name = params.name;
					throw new TypeError("response lost before the allocation becomes visible");
				},
			});
			const driver = driverOver(org, module);
			const failure = await driver.create(request).catch((error: unknown) => error);
			if (!isFailedCreateCleanupError(failure)) throw new Error("create lost its cleanup owner");
			await expect(failure.cleanup()).rejects.toThrow();
			const sandbox = org.allocate(name);
			await failure.cleanup();
			expect(sandbox.state).toBe("destroyed");
			expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
		}
	});

	test("the list probe drains the whole account in one call, under a bound sized for that", async () => {
		const org = daytonaOrg();
		for (let i = 0; i < 3; i++) org.allocate(`dev-box-${i}`);
		expect(await driverOver(org).probes?.list?.()).toHaveLength(3);
		expect(org.names("list")).toHaveLength(1);
		for (const module of [vm, container])
			expect(module.traits.timing?.controlTimeoutMs).toBe(DAYTONA_LISTING_TIMEOUT_MS);
	});

	test("an ambiguous create is recovered by its name and destroyed", async () => {
		const org = daytonaOrg();
		const create = org.client.create;
		Object.assign(org.client, {
			create: async (...args: Parameters<typeof create>) => {
				await create(...args);
				throw new TypeError("socket hang up after the org accepted the create");
			},
		});
		const failure = await driverOver(org, container)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect([...org.rows.values()].map((row) => row.state)).toEqual(["destroyed"]);
	});
});
