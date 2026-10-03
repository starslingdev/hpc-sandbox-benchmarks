import { describe, expect, it, spyOn } from "bun:test";
import type { Command200Response, Sandbox, SandboxListResponse } from "@boatdev/sdk";
import { BoatApi, Configuration, ResponseError } from "@boatdev/sdk";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { sandboxRef } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import type { BoatClient, BoatSpecOptions } from "./index.ts";
import { BOAT_RECOVERY_NAME_PREFIX, boatObservation, boatSpec } from "./index.ts";

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
		stop: async ({ sandboxId }) => ({
			ok: true,
			type: "sandbox.stopped",
			id: sandboxId,
			status: "archived",
		}),
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
		createDelay: async () => {},
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

	it("retries a temporary delete conflict before confirming absence", async () => {
		let deletes = 0;
		const client = nativeClient({
			deleteSandbox: async () => {
				deletes++;
				if (deletes < 3) throw vendorError(409, "snapshot_in_progress");
				return deletion("bx_23456789");
			},
		});
		await driver(client).destroyById?.(sandboxRef("boat", "bx_23456789"));
		expect(deletes).toBe(3);
	});

	it("releases a delete-forbidden allocation only after stop is observed archived", async () => {
		let stops = 0;
		let polls = 0;
		const client = nativeClient({
			deleteSandbox: async () => {
				throw vendorError(403, "api_key_action_forbidden");
			},
			stop: async ({ sandboxId }) => {
				stops++;
				return { ok: true, type: "sandbox.stopped", id: sandboxId, status: "archiving" };
			},
			get: async () => ({
				ok: true,
				type: "sandbox.info",
				sandbox: nativeSandbox(++polls < 3 ? "archiving" : "archived"),
			}),
		});
		await driver(client).destroyById?.(sandboxRef("boat", "bx_23456789"));
		expect(stops).toBe(1);
		expect(polls).toBe(3);
		expect(await driver(client).probes?.observe(sandboxRef("boat", "bx_23456789"))).toEqual({
			state: "terminal",
		});
	});

	it("does not release a delete-forbidden allocation when stop is forbidden", async () => {
		const client = nativeClient({
			deleteSandbox: async () => {
				throw vendorError(403, "api_key_action_forbidden");
			},
			stop: async () => {
				throw vendorError(403, "api_key_action_forbidden");
			},
		});
		await expect(
			driver(client).destroyById?.(sandboxRef("boat", "bx_23456789")),
		).rejects.toMatchObject({ code: "destroy-failed" });
	});

	for (const state of ["archiving", "ready", "error"] as const) {
		it(`does not release a delete-forbidden allocation while stop leaves it ${state}`, async () => {
			const client = nativeClient({
				deleteSandbox: async () => {
					throw vendorError(403, "api_key_action_forbidden");
				},
				get: async () => ({ ok: true, type: "sandbox.info", sandbox: nativeSandbox(state) }),
			});
			await expect(
				driver(client, { deleteConfirmMs: 5, deletePollMs: 1 }).destroyById?.(
					sandboxRef("boat", "bx_23456789"),
				),
			).rejects.toMatchObject({ code: "destroy-failed" });
		});
	}

	it("does not stop an already archived allocation again", async () => {
		let stops = 0;
		const client = nativeClient({
			deleteSandbox: async () => {
				throw vendorError(403, "api_key_action_forbidden");
			},
			get: async () => ({ ok: true, type: "sandbox.info", sandbox: nativeSandbox("archived") }),
			stop: async ({ sandboxId }) => {
				stops++;
				return { ok: true, type: "sandbox.stopped", id: sandboxId, status: "archived" };
			},
		});
		await driver(client).destroyById?.(sandboxRef("boat", "bx_23456789"));
		expect(stops).toBe(0);
	});

	it("uses the real SDK stop endpoint after the exact delete permission refusal", async () => {
		let stopped = false;
		const requests: string[] = [];
		const client = new BoatApi(
			new Configuration({
				basePath: "https://boat.invalid/api/v1",
				accessToken: "test-key",
				fetchApi: async (...[input, init]: Parameters<typeof fetch>) => {
					const path = new URL(String(input)).pathname;
					requests.push(`${init?.method ?? "GET"} ${path}`);
					let body: unknown;
					let status = 200;
					if (init?.method === "DELETE") {
						body = { ok: false, code: "api_key_action_forbidden" };
						status = 403;
					} else if (path.endsWith("/stop")) {
						expect(init?.method).toBe("POST");
						expect(init?.body).toBeUndefined();
						stopped = true;
						body = { ok: true, type: "sandbox.stopped", id: "bx_23456789", status: "archived" };
					} else
						body = {
							ok: true,
							type: "sandbox.info",
							sandbox: nativeSandbox(stopped ? "archived" : "ready"),
						};
					return new Response(JSON.stringify(body), {
						status,
						headers: { "Content-Type": "application/json" },
					});
				},
			}),
		);
		await driver(client).destroyById?.(sandboxRef("boat", "bx_23456789"));
		expect(requests).toEqual([
			"DELETE /api/v1/sandboxes/bx_23456789",
			"GET /api/v1/sandboxes/bx_23456789",
			"POST /api/v1/sandboxes/bx_23456789/stop",
			"GET /api/v1/sandboxes/bx_23456789",
		]);
	});

	it("reports the vendor refusal when deletion cannot be accepted", async () => {
		const diagnostic = spyOn(console, "error").mockImplementation(() => undefined);
		let deletes = 0;
		const client = nativeClient({
			deleteSandbox: async () => {
				deletes++;
				throw vendorError(403, "delete_denied", "account may not delete this sandbox");
			},
		});
		try {
			await expect(
				driver(client).destroyById?.(sandboxRef("boat", "bx_23456789")),
			).rejects.toMatchObject({ code: "destroy-failed" });
			expect(deletes).toBe(1);
			expect(diagnostic).toHaveBeenCalledWith(
				"boat delete HTTP 403 delete_denied; removal unconfirmed",
			);
		} finally {
			diagnostic.mockRestore();
		}
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

	it("inventories live and failed prefixed rows and ignores archived snapshots", async () => {
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
					nativeSandbox("archiving", {
						id: "bx_2345678f",
						name: `${BOAT_RECOVERY_NAME_PREFIX}-saving`,
					}),
				],
			}),
		});
		const snapshot = await driver(client).inventory?.list();
		expect(snapshot).toEqual({
			owned: [
				sandboxRef("boat", "bx_23456789"),
				sandboxRef("boat", "bx_2345678d"),
				sandboxRef("boat", "bx_2345678f"),
			],
			foreignCount: 1,
		});
	});
});
