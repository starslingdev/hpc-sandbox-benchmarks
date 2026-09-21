import { describe, expect, it } from "bun:test";
import type { Command200Response, Sandbox, SandboxListResponse } from "@boatdev/sdk";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { sandboxRef } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import type { BoatClient, BoatSpecOptions } from "./index.ts";
import boatDriver, {
	BOAT_CREATE_BUDGET,
	BOAT_CREATE_CEILING_MS,
	BOAT_DEFAULT_MEMORY_GB,
	BOAT_DEFAULT_VCPUS,
	BOAT_EXECUTION,
	BOAT_MACHINE_TYPE,
	BOAT_PROVENANCE,
	BOAT_READINESS,
	BOAT_RECOVERY_NAME_PREFIX,
	BOAT_SANDBOX_ID,
	boatObservation,
	boatSpec,
} from "./index.ts";

const context = {
	env: { BOAT_API_KEY: "boat_test-key" },
	artifact: { kind: "none" as const },
	resolvedArtifact: { kind: "none" as const },
};

const request: CreateRequest = {
	spec: { vcpus: BOAT_DEFAULT_VCPUS, memoryGb: BOAT_DEFAULT_MEMORY_GB, diskGb: 40 },
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};

function nativeSandbox(
	state: Sandbox["state"] = "ready",
	overrides: Partial<Sandbox> = {},
): Sandbox {
	return {
		id: "bx_23456789",
		name: `${BOAT_RECOVERY_NAME_PREFIX}-11111111-1111-1111-1111-111111111111`,
		state,
		type: "default",
		vcpu: 4,
		memoryGB: 8,
		desktopAvailable: false,
		snapshotAvailable: false,
		...overrides,
	};
}

function finishedCommand(stdout = ""): Command200Response {
	return {
		ok: true,
		type: "command.finished",
		success: true,
		exitCode: 0,
		stdout,
		stderr: "",
		timedOut: false,
	};
}

function startedCommand(): Command200Response {
	return {
		ok: true,
		type: "command.started",
		success: true,
		processId: 42,
		pid: 42,
		command: "true",
		startedAt: new Date("2026-09-21T00:00:00.000Z"),
	};
}

function nativeClient(overrides: Partial<BoatClient> = {}): BoatClient {
	const removed = new Set<string>();
	const named = new Map<string, string>();
	return {
		create: async () => ({
			ok: true,
			type: "sandbox.created",
			status: "provisioning",
			ttlSeconds: null,
			sandbox: nativeSandbox("provisioning", { name: "Sandbox 2026-09-21 12:00" }),
		}),
		get: async ({ sandboxId }) => {
			if (sandboxId === undefined) throw new Error("test get requires a sandbox id");
			return {
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox(removed.has(sandboxId) ? "archived" : "ready", {
					id: sandboxId,
					name: named.get(sandboxId) ?? nativeSandbox().name,
				}),
			};
		},
		update: async ({ sandboxId, updateSandboxRequest }) => {
			if (
				sandboxId === undefined ||
				updateSandboxRequest === undefined ||
				updateSandboxRequest.name === undefined
			) {
				throw new Error("test update requires an id and request");
			}
			named.set(sandboxId, updateSandboxRequest.name);
			return {
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox("provisioning", { id: sandboxId, name: updateSandboxRequest.name }),
			};
		},
		command: async ({ commandRequest }) => {
			if (commandRequest.detached) return startedCommand();
			return finishedCommand(
				commandRequest.command.startsWith("df -Pk") ? `${80 * 1024 * 1024}\n` : "",
			);
		},
		sandboxes: async () =>
			({
				ok: true,
				type: "sandbox.list",
				sandboxes: [],
			}) satisfies SandboxListResponse,
		...overrides,
		stop: async ({ sandboxId }) => {
			await overrides.stop?.({ sandboxId });
			removed.add(sandboxId);
			return {
				ok: true,
				type: "sandbox.stopping",
				id: sandboxId,
				status: "archiving",
				sandbox: nativeSandbox("archiving", { id: sandboxId }),
			};
		},
	};
}

function fast(client: BoatClient, seams: BoatSpecOptions = {}): BoatSpecOptions {
	return {
		client,
		readyPollMs: 0,
		createRetryMs: 0,
		cleanupRetryMs: 0,
		recoveryAbsenceConfirmationMs: 1,
		...seams,
	};
}

function driver(client: BoatClient, seams: BoatSpecOptions = {}) {
	return driverFromComputeSpec(
		"boat",
		boatSpec(context, fast(client, seams)),
		context.resolvedArtifact,
		[context.env.BOAT_API_KEY],
	);
}

describe("boat module policy", () => {
	it("declares provenance, readiness, native launch, and the create ceiling", () => {
		expect(boatDriver.id).toBe("boat");
		expect(boatDriver.provenance).toEqual(BOAT_PROVENANCE);
		expect(boatDriver.readiness).toEqual(BOAT_READINESS);
		expect(boatDriver.execution).toEqual(BOAT_EXECUTION);
		expect(boatDriver.createBudget).toEqual(BOAT_CREATE_BUDGET);
		expect(BOAT_CREATE_CEILING_MS).toBeGreaterThan(8 * 60_000);
		expect(BOAT_SANDBOX_ID.allows("bx_23456789")).toBe(true);
		expect(BOAT_SANDBOX_ID.allows("i2f3k4abc")).toBe(false);
	});

	it("maps the benchmark request onto the default SKU with an idempotent recovery name", async () => {
		let createInput: Parameters<BoatClient["create"]>[0] | undefined;
		let named: string | undefined;
		const states: Sandbox["state"][] = ["provisioning", "ready"];
		const client = nativeClient({
			create: async (input) => {
				createInput = input;
				return {
					ok: true,
					type: "sandbox.created",
					status: "provisioning",
					ttlSeconds: null,
					sandbox: nativeSandbox("provisioning", { name: "transient" }),
				};
			},
			get: async ({ sandboxId }) => ({
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox(states.shift() ?? "ready", {
					id: sandboxId,
					name: named ?? "transient",
				}),
			}),
			update: async ({ sandboxId, updateSandboxRequest }) => {
				named = updateSandboxRequest.name;
				return {
					ok: true,
					type: "sandbox.info",
					sandbox: nativeSandbox("provisioning", { id: sandboxId, name: named }),
				};
			},
		});
		const session = await driver(client).create(request);
		expect(session.sandboxRef).toEqual(sandboxRef("boat", "bx_23456789"));
		expect(createInput?.createSandboxRequest).toEqual({
			type: BOAT_MACHINE_TYPE,
			ttlSeconds: null,
			noEnv: true,
		});
		expect(createInput?.idempotencyKey).toMatch(
			new RegExp(`^${BOAT_RECOVERY_NAME_PREFIX}-[0-9a-f-]{36}$`),
		);
		expect(named).toBe(createInput?.idempotencyKey);
		expect(states).toHaveLength(0);
	});

	it("refuses a non-stock artifact and an off-SKU shape before allocation", async () => {
		let createCalls = 0;
		const client = nativeClient({
			create: async () => {
				createCalls += 1;
				throw new Error("must not allocate");
			},
		});
		await expect(
			driver(client).create({
				...request,
				artifact: { kind: "image", ref: "ubuntu:24.04" },
			}),
		).rejects.toMatchObject({ code: "invalid-create-request", provider: "boat" });
		await expect(
			driver(client).create({ ...request, spec: { ...request.spec, vcpus: 8 } }),
		).rejects.toMatchObject({ code: "invalid-create-request", provider: "boat" });
		expect(createCalls).toBe(0);
	});

	it("tears down an undersized allocation after create", async () => {
		const stopped: string[] = [];
		const client = nativeClient({
			get: async ({ sandboxId }) => ({
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox("ready", { id: sandboxId, vcpu: 2 }),
			}),
			stop: async ({ sandboxId }) => {
				stopped.push(sandboxId);
				return {
					ok: true,
					type: "sandbox.stopping",
					id: sandboxId,
					status: "archiving",
					sandbox: nativeSandbox("archiving", { id: sandboxId }),
				};
			},
		});
		await expect(driver(client).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(stopped).toEqual(["bx_23456789"]);
	});

	it("launches durable work through detached command acceptance", async () => {
		const commands: Array<{ command: string; detached?: boolean }> = [];
		const client = nativeClient({
			command: async ({ commandRequest }) => {
				commands.push({ command: commandRequest.command, detached: commandRequest.detached });
				if (commandRequest.detached) return startedCommand();
				return finishedCommand(
					commandRequest.command.startsWith("df -Pk") ? `${80 * 1024 * 1024}\n` : "ok\n",
				);
			},
		});
		const session = await driver(client).create(request);
		const result = await session.exec("uname -a");
		expect(result.exit).toEqual({ kind: "exited", code: 0 });
		expect(result.stdout).toBe("ok\n");
		await session.launch?.("sleep 120");
		expect(commands).toEqual(
			expect.arrayContaining([
				{ command: "uname -a", detached: undefined },
				{ command: "sleep 120", detached: true },
			]),
		);
	});

	it("treats archived sandboxes as absent and error as terminal", () => {
		expect(boatObservation("archived")).toEqual({ state: "absent" });
		expect(boatObservation("archiving")).toEqual({ state: "absent" });
		expect(boatObservation("error")).toEqual({ state: "terminal" });
		expect(boatObservation("ready")).toEqual({ state: "running" });
	});

	it("inventories only live sandboxes named with the recovery prefix", async () => {
		const client = nativeClient({
			sandboxes: async () => ({
				ok: true,
				type: "sandbox.list",
				sandboxes: [
					nativeSandbox("ready", { id: "bx_23456789", name: `${BOAT_RECOVERY_NAME_PREFIX}-owned` }),
					nativeSandbox("ready", { id: "bx_abcdefgh", name: "someone-else" }),
					nativeSandbox("archived", {
						id: "bx_2345678c",
						name: `${BOAT_RECOVERY_NAME_PREFIX}-stopped`,
					}),
				],
			}),
		});
		const snapshot = await driver(client).inventory?.list();
		expect(snapshot).toEqual({ owned: [sandboxRef("boat", "bx_23456789")], foreignCount: 1 });
	});
});
