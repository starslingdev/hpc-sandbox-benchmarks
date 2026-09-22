import { describe, expect, it } from "bun:test";
import type { Command200Response, Sandbox, SandboxListResponse } from "@boatdev/sdk";
import { ResponseError } from "@boatdev/sdk";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { sandboxRef } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import type { BoatClient, BoatSpecOptions } from "./index.ts";
import boatDriver, {
	BOAT_CREATE_BUDGET,
	BOAT_CREATE_CEILING_MS,
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
	spec: TARGET_SPEC,
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

function vendorError(status: number, code = "error", message = code): ResponseError {
	return new ResponseError(
		new Response(JSON.stringify({ ok: false, status, code, message }), { status }),
		"Response returned an error code",
	);
}

function deletion(sandboxId: string) {
	return {
		ok: true,
		type: "sandbox.deleting",
		operation: {
			id: "bdop_1",
			kind: "sandbox",
			targetId: sandboxId,
			reason: "explicit",
			status: "blocked",
			attemptCount: 1,
			requestedAt: new Date("2026-09-21T00:00:00.000Z"),
			completedAt: null,
		},
	} as const;
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
			if (removed.has(sandboxId)) throw vendorError(404, "not_found");
			return {
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox("ready", {
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
		deleteSandbox: async (input) => {
			await overrides.deleteSandbox?.(input);
			removed.add(input.sandboxId);
			return deletion(input.sandboxId);
		},
	};
}

function fast(client: BoatClient, seams: BoatSpecOptions = {}): BoatSpecOptions {
	return {
		client,
		readyPollMs: 0,
		createRetryMs: 0,
		cleanupRetryMs: 0,
		egressPollMs: 0,
		deletePollMs: 0,
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

	it("deletes an undersized allocation after create", async () => {
		const deleted: string[] = [];
		const removed = new Set<string>();
		const client = nativeClient({
			get: async ({ sandboxId }) => {
				if (removed.has(sandboxId)) throw vendorError(404, "not_found");
				return {
					ok: true,
					type: "sandbox.info",
					sandbox: nativeSandbox("ready", { id: sandboxId, vcpu: 2 }),
				};
			},
			deleteSandbox: async ({ sandboxId, xAsciiConfirmDelete }) => {
				expect(xAsciiConfirmDelete).toBe(sandboxId);
				deleted.push(sandboxId);
				removed.add(sandboxId);
				return deletion(sandboxId);
			},
		});
		await expect(driver(client).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(deleted).toEqual(["bx_23456789"]);
	});

	it("deletes by id when preparation fails after boat returned the sandbox", async () => {
		const deleted: string[] = [];
		const client = nativeClient({
			update: async () => {
				throw vendorError(500, "internal");
			},
			deleteSandbox: async ({ sandboxId }) => {
				deleted.push(sandboxId);
				return deletion(sandboxId);
			},
		});
		await expect(driver(client).create(request)).rejects.toMatchObject({ provider: "boat" });
		expect(deleted).toEqual(["bx_23456789"]);
	});

	it("deletes a sandbox that fails while booting", async () => {
		const deleted: string[] = [];
		const removed = new Set<string>();
		const client = nativeClient({
			get: async ({ sandboxId }) => {
				if (removed.has(sandboxId)) throw vendorError(404, "not_found");
				return {
					ok: true,
					type: "sandbox.info",
					sandbox: nativeSandbox("error", { id: sandboxId }),
				};
			},
			deleteSandbox: async ({ sandboxId }) => {
				deleted.push(sandboxId);
				removed.add(sandboxId);
				return deletion(sandboxId);
			},
		});
		await expect(driver(client).create(request)).rejects.toMatchObject({ provider: "boat" });
		expect(deleted).toEqual(["bx_23456789"]);
	});

	it("waits for outbound network before handing the sandbox over", async () => {
		const probes: string[] = [];
		const client = nativeClient({
			command: async ({ commandRequest }) => {
				if (commandRequest.command.startsWith("getent hosts")) {
					probes.push(commandRequest.command);
					return { ...finishedCommand(), exitCode: probes.length < 3 ? 1 : 0 };
				}
				return finishedCommand(
					commandRequest.command.startsWith("df -Pk") ? `${80 * 1024 * 1024}\n` : "",
				);
			},
		});
		await driver(client).create(request);
		expect(probes).toHaveLength(3);
		expect(probes[0]).toContain("/dev/tcp/boat.dev/443");
	});

	it("reports boat's error code when create is refused", async () => {
		const client = nativeClient({
			create: async () => {
				throw vendorError(
					400,
					"trial_auto_stop_required",
					"Free-trial Sandboxes cannot run without auto-stop.",
				);
			},
		});
		await expect(driver(client).create(request)).rejects.toMatchObject({
			code: "create-failed",
			message: expect.stringContaining("HTTP 400 trial_auto_stop_required"),
		});
	});

	it("destroys idempotently and only after the sandbox is gone", async () => {
		let polls = 0;
		const deleted: string[] = [];
		const client = nativeClient({
			get: async ({ sandboxId }) => {
				if (deleted.length > 0 && ++polls >= 3) throw vendorError(404, "not_found");
				return {
					ok: true,
					type: "sandbox.info",
					sandbox: nativeSandbox("ready", { id: sandboxId }),
				};
			},
			deleteSandbox: async ({ sandboxId }) => {
				deleted.push(sandboxId);
				if (deleted.length > 1) throw vendorError(404, "not_found");
				return deletion(sandboxId);
			},
		});
		const boat = driver(client);
		const ref = sandboxRef("boat", "bx_23456789");
		await boat.destroyById?.(ref);
		expect(polls).toBe(3);
		await boat.destroyById?.(ref);
		expect(deleted).toEqual(["bx_23456789", "bx_23456789"]);
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

	it("never observes a listed row as absent; archiving is still live", () => {
		expect(boatObservation("archived")).toEqual({ state: "terminal" });
		expect(boatObservation("error")).toEqual({ state: "terminal" });
		expect(boatObservation("archiving")).toEqual({ state: "running" });
		expect(boatObservation("ready")).toEqual({ state: "running" });
	});

	it("inventories every prefixed row as owned and ignores stopped foreign rows", async () => {
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
					nativeSandbox("error", {
						id: "bx_2345678d",
						name: `${BOAT_RECOVERY_NAME_PREFIX}-failed`,
					}),
					nativeSandbox("archived", { id: "bx_2345678e", name: "Box 2026-09-21 22:37" }),
				],
			}),
		});
		const snapshot = await driver(client).inventory?.list();
		expect(snapshot).toEqual({
			owned: [
				sandboxRef("boat", "bx_23456789"),
				sandboxRef("boat", "bx_2345678c"),
				sandboxRef("boat", "bx_2345678d"),
			],
			foreignCount: 1,
		});
	});
});
