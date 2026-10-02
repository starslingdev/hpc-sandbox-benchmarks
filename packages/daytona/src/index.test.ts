// Daytona tested at the vendor seam: the adapter's translation over a fake org, the port contract,
// sessions through each variant's own module, and the SDK's real create request. Kit behaviour
// (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in the
// driver package.

import { describe, expect, mock, spyOn, test } from "bun:test";
import { randomUUID } from "node:crypto";
import type { Sandbox } from "@daytona/sdk";
import {
	Daytona,
	DaytonaAuthenticationError,
	DaytonaError,
	DaytonaNotFoundError,
	DaytonaRateLimitError,
} from "@daytona/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { kitPort, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import container from "./container.ts";
import type { DaytonaClient } from "./vendor.ts";
import {
	DAYTONA_LISTING_TIMEOUT_MS,
	DAYTONA_SANDBOX_ID,
	daytonaCommands,
	daytonaVendor,
} from "./vendor.ts";
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
const op = () => ({ signal: new AbortController().signal });
const marker = () => `${MARKER_PREFIX}${randomUUID()}`;

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

describe("Daytona translation", () => {
	test("names the create by its marker on the resolved snapshot, with auto-stop off", async () => {
		const org = daytonaOrg();
		const attempt = marker();
		const created = await vendorOver(org).control.create({ request, marker: attempt }, op());
		expect(created).toMatchObject({ phase: "ready", marker: attempt });
		expect(org.names("create")[0]?.input).toEqual([
			{ snapshot: context.resolvedArtifact.ref, name: attempt, autoStopInterval: 0 },
			{ timeout: 300 },
		]);
	});

	test("reads destroyed as gone, destroying as a dying leftover, and only benchmark names as owned", async () => {
		const org = daytonaOrg();
		const { control } = kitPort(vendorOver(org));
		const read = async (name: string, state: string) =>
			control.get(org.allocate(name, state).id, op());
		const owned = marker();
		expect(await read(owned, "started")).toMatchObject({ phase: "ready", marker: owned });
		expect(await read("dev-box", "stopped")).not.toHaveProperty("marker");
		expect(await read(`${MARKER_PREFIX}not-a-uuid`, "started")).not.toHaveProperty("marker");
		expect(await read(marker(), "destroyed")).toMatchObject({ phase: "gone" });
		expect(await read(marker(), "destroying")).toMatchObject({ phase: "deleting", stopped: true });
		expect(await read(marker(), "error")).toMatchObject({ phase: "failed" });
		expect(await control.get(randomUUID(), op())).toBeNull();
	});

	test("a get or remove by id refuses the sandbox the SDK resolved by that name instead", async () => {
		const org = daytonaOrg();
		const { control } = kitPort(vendorOver(org), { provider: "daytona-vm" });
		const id = randomUUID();
		const namesake = org.allocate(id); // the SDK's get resolves this sandbox's name, not an id
		await expect(control.get(id, op())).rejects.toThrow("returned an unrelated sandbox");
		await expect(control.remove(id, op())).rejects.toThrow("returned an unrelated sandbox");
		expect(org.names("delete")).toHaveLength(0);
		expect(org.rows.get(namesake.id)?.state).toBe("started");
	});

	test("a delete that finds the sandbox gone drops its handle, so a later remove reads afresh", async () => {
		const org = daytonaOrg();
		const { control } = kitPort(vendorOver(org));
		const created = await control.create({ request, marker: marker() }, op());
		org.rows.delete(created.id); // gone behind the held handle
		expect(await control.remove(created.id, op())).toBe("removed");
		expect(await control.remove(created.id, op())).toBe("removed");
		// The second remove looked the id up (not found) instead of deleting through a stale handle.
		expect(org.names("delete")).toHaveLength(1);
		expect(org.names("get").map((call) => call.input)).toEqual([created.id]);
	});

	test("absence is only the SDK's typed not-found: never auth, outage or transport failures", () => {
		const { absent } = vendorOver(daytonaOrg()).control;
		expect(absent?.(new DaytonaNotFoundError("sandbox not found", 404))).toBe(true);
		expect(absent?.(new Error("wrapped", { cause: new DaytonaNotFoundError("gone", 404) }))).toBe(
			true,
		);
		for (const error of [
			new DaytonaAuthenticationError("bad key", 401),
			new DaytonaError("forbidden", 403),
			new DaytonaError("not found, untyped", 404),
			new DaytonaError("internal", 500),
			new DaytonaError("unavailable", 503),
			new TypeError("fetch failed"),
		])
			expect(absent?.(error)).toBe(false);
	});

	test("an inactive snapshot is activated and its refusal is retryable; other refusals are not", async () => {
		const inactive = daytonaOrg({
			createError: new DaytonaError("snapshot is inactive", 400),
			snapshotState: "inactive",
		});
		const { control } = vendorOver(inactive);
		const failure = await control
			.create({ request, marker: marker() }, op())
			.catch((caught) => caught);
		expect(inactive.names("activate")).toHaveLength(1);
		expect(control.refused?.(failure)).toEqual({ retryable: true });
		expect(control.refused?.(new DaytonaRateLimitError("slow down", 429))).toEqual({
			retryable: true,
		});
		expect(control.refused?.(new DaytonaAuthenticationError("bad key", 401))).toEqual({
			retryable: false,
		});
		for (const status of [404, 408, 500])
			expect(control.refused?.(new DaytonaError("unproven", status))).toBeUndefined();
	});

	test("refuses an allocation of the wrong class, shape, or disk the snapshot reports", async () => {
		const prepare = async (org: ReturnType<typeof daytonaOrg>, overrides = {}) => {
			const { data } = vendorOver(org);
			const native = org.allocate(marker());
			Object.assign(native, overrides);
			return data.prepare?.(
				{ record: { id: native.id, phase: "ready", raw: native }, native },
				request,
				op(),
			);
		};
		expect(await prepare(daytonaOrg())).toEqual({ status: "honored" });
		expect(await prepare(daytonaOrg({ sandboxClass: "container" }))).toMatchObject({
			status: "unsupported",
			detail: "requested linux-vm but snapshot allocates container",
		});
		expect(await prepare(daytonaOrg(), { cpu: 2 })).toMatchObject({ status: "unsupported" });
		expect(await prepare(daytonaOrg({ disk: 30 }))).toMatchObject({
			detail: "requested 40 GiB but snapshot allocates 30 GiB",
		});
	});
});

describe("Daytona session commands", () => {
	test("reuses one control session and retains separate streams and nonzero exits", async () => {
		const process = {
			createSession: mock(async (_id: string) => {}),
			executeSessionCommand: mock(async () => ({
				cmdId: "cmd-1",
				exitCode: 7,
				stdout: "out",
				stderr: "err",
			})),
		};
		const sandbox = { process };
		const commands = daytonaCommands();
		const results = await Promise.all([
			commands.exec(sandbox, "echo one"),
			commands.exec(sandbox, "echo two"),
		]);
		expect(process.createSession).toHaveBeenCalledTimes(1);
		expect(results).toEqual([
			{ exitCode: 7, stdout: "out", stderr: "err" },
			{ exitCode: 7, stdout: "out", stderr: "err" },
		]);
	});

	test("launches once in an independent job session so polling can use the control shell", async () => {
		const calls: { id: string; command: string; runAsync?: boolean }[] = [];
		const process = {
			createSession: mock(async (_id: string) => {}),
			executeSessionCommand: async (
				id: string,
				request: { command: string; runAsync?: boolean },
			) => {
				calls.push({ id, ...request });
				return { cmdId: "accepted", exitCode: 0, stdout: "", stderr: "" };
			},
		};
		const sandbox = { process };
		const commands = daytonaCommands();
		await commands.launch(sandbox, "sleep 60");
		await commands.exec(sandbox, "test -f /tmp/done");
		expect(calls).toHaveLength(2);
		expect(calls[0]?.runAsync).toBe(true);
		expect(calls[1]?.runAsync).toBe(false);
		expect(calls[0]?.id).not.toBe(calls[1]?.id);
		expect(calls[0]?.command).not.toContain("nohup");
	});

	test("rejects missing async acceptance and does not cache failed session creation", async () => {
		const process = {
			createSession: mock(async (_id: string) => {}).mockRejectedValueOnce(
				new Error("create transport failed"),
			),
			executeSessionCommand: mock(async () => ({ cmdId: "", exitCode: 0, stdout: "", stderr: "" })),
		};
		const sandbox = { process };
		const commands = daytonaCommands();
		await expect(commands.exec(sandbox, "true")).rejects.toThrow("create transport failed");
		await commands.exec(sandbox, "true");
		expect(process.createSession).toHaveBeenCalledTimes(2);
		await expect(commands.launch(sandbox, "true")).rejects.toThrow("no asynchronous command id");
	});

	test("a cancelled operation never starts a session", async () => {
		const process = {
			createSession: mock(async (_id: string) => {}),
			executeSessionCommand: mock(async () => ({ cmdId: "unused" })),
		};
		await expect(
			daytonaCommands().exec({ process }, "true", { signal: AbortSignal.abort() }),
		).rejects.toThrow();
		expect(process.createSession).not.toHaveBeenCalled();
	});
});

vendorContract("daytona adapter", vm, () => vendorOver(daytonaOrg()));

describe("Daytona end to end through each variant's module", () => {
	test("declares identity, native launch, and the snapshot-pinned shape", () => {
		for (const module of [vm, container]) {
			expect(module.execution).toEqual({ syncCapMs: 60_000, durable: "native-launch" });
		}
		expect([vm.id, container.id]).toEqual(["daytona-vm", "daytona-container"]);
		expect(DAYTONA_SANDBOX_ID.allows(randomUUID())).toBe(true);
	});

	test("the list probe drains the whole account in one call, under a bound sized for that", async () => {
		const org = daytonaOrg();
		for (let i = 0; i < 3; i++) org.allocate(`dev-box-${i}`);
		expect(await driverOver(org).probes?.list?.()).toHaveLength(3);
		expect(org.names("list")).toHaveLength(1);
		for (const module of [vm, container])
			expect(module.traits.timing?.controlTimeoutMs).toBe(DAYTONA_LISTING_TIMEOUT_MS);
	});

	test("a session boots, runs, launches, snapshots, inventories and is destroyed", async () => {
		const org = daytonaOrg();
		org.allocate("dev-box"); // a foreign sandbox on the org
		const leftover = org.allocate(marker()); // a sibling variant's or an earlier run's leftover
		org.allocate(marker(), "destroyed");
		const driver = driverOver(org);
		const session = await driver.create(request);
		// The reported disk is the proof: no guest df runs.
		expect(JSON.stringify(org.names("exec"))).not.toContain("df -Pk");
		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("sleep 600");
		expect(await session.files?.exists("/missing")).toBe(false);
		const snapshot = await driver.snapshots?.create(session);
		expect(snapshot?.snapshotId).toMatch(/^benchmark-snapshot-/);
		expect(await driver.inventory?.list()).toEqual({
			owned: expect.arrayContaining([
				session.sandboxRef,
				{ provider: "daytona-vm", id: leftover.id },
			]),
			foreignCount: 1,
		});
		// A held session is deleted first, by the waited delete alone.
		const before = org.calls.length;
		await session.destroy();
		expect(org.calls.slice(before).map((call) => call.name)).toEqual(["delete"]);
		expect(org.names("delete")[0]?.input).toEqual([session.sandboxRef.id, 30, true]);
		await driver.destroyById?.({ provider: "daytona-vm", id: leftover.id });
		expect(org.rows.get(leftover.id)?.state).toBe("destroyed");
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
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

	test("a container module refuses a VM-class snapshot and tears the allocation down", async () => {
		const org = daytonaOrg({ sandboxClass: "linux-vm" });
		await expect(driverOver(org, container).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "daytona-container",
		});
		expect([...org.rows.values()].map((row) => row.state)).toEqual(["destroyed"]);
	});

	test("the default module refuses artifact, shape, and environment drift before any call", async () => {
		const driver = vm.driver(context);
		for (const invalid of [
			{ ...request, artifact: { kind: "baked" as const, ref: "other-snapshot" } },
			{ ...request, spec: { ...request.spec, vcpus: 8 } },
			{ ...request, env: { X: "1" } },
		])
			await expect(driver.create(invalid)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "daytona-vm",
			});
	});
});

test("the real module sends the context's target and snapshot without reading the ambient region", async () => {
	const stock = Daytona.createAxiosInstance;
	const bodies: unknown[] = [];
	const previous = process.env.DAYTONA_TARGET;
	process.env.DAYTONA_TARGET = "decoy-region";
	// The SDK's own transport, answered offline: an authentication refusal allocates nothing.
	const transport = spyOn(Daytona, "createAxiosInstance").mockImplementation((timeout) => {
		const axios = stock(timeout);
		axios.defaults.adapter = async (config) => {
			if (config.method === "post")
				bodies.push(typeof config.data === "string" ? JSON.parse(config.data) : config.data);
			throw new DaytonaAuthenticationError("offline test refusal", 401);
		};
		return axios;
	});
	try {
		const failure = await vm
			.driver(context)
			.create(request)
			.catch((caught) => caught);
		// The SDK rewraps the refusal without its status, so the create stays ambiguous.
		expect(failure).toBeInstanceOf(Error);
		expect(String(failure)).not.toContain(KEY);
		expect(bodies).toHaveLength(1);
		expect(bodies[0]).toMatchObject({
			name: expect.stringMatching(/^benchmark-[0-9a-f-]{36}$/),
			snapshot: context.resolvedArtifact.ref,
			target: "us-west-2",
			autoStopInterval: 0,
		});
		expect(process.env.DAYTONA_TARGET).toBe("decoy-region");
	} finally {
		transport.mockRestore();
		if (previous === undefined) delete process.env.DAYTONA_TARGET;
		else process.env.DAYTONA_TARGET = previous;
	}
});
