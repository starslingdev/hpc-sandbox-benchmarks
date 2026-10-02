// boat tested at the vendor seam: the adapter's translation over a fake account, the port contract,
// sessions through the package's own module, and one wire test over the real SDK. Kit behaviour
// (convergence, deadlines, the inventory partition, recovery mechanics) is tested once in the
// driver package.

import { describe, expect, test } from "bun:test";
import type { Sandbox } from "@boatdev/sdk";
import { BoatApi, Configuration, ResponseError } from "@boatdev/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { FailedCreateCleanupError, isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { kitPort, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import boat, { BOAT_CREATE_CEILING_MS, BOAT_PROVENANCE, BOAT_SANDBOX_ID } from "./index.ts";
import type { BoatClient, BoatVendorOptions } from "./vendor.ts";
import {
	BOAT_CREATE_RATE_LIMIT_RETRY_MS,
	BOAT_CREATE_RETRY_MS,
	BOAT_MACHINE_PROVIDER,
	BOAT_MACHINE_TYPE,
	BOAT_NAME,
	boatVendor,
} from "./vendor.ts";

const KEY = "boat_test-key";
const context: DriverContext<"boat"> = {
	env: { BOAT_API_KEY: KEY },
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
};
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });
const marker = `${MARKER_PREFIX}11111111-1111-1111-1111-111111111111`;

function vendorError(status: number, code = "error", message = code): ResponseError {
	return new ResponseError(
		new Response(JSON.stringify({ ok: false, status, code, message }), { status }),
		"Response returned an error code",
	);
}

type Row = Sandbox & { probes: number };

/**
 * A whole boat account: creates start `provisioning` under boat's default name and are ready on
 * the next read, deletes are accepted at `blocked` and the sandbox 404s afterwards, listings page
 * by cursor, and commands answer the kit's disk probe and the adapter's egress probe.
 */
function boatAccount(
	options: {
		readonly pageSize?: number;
		/** The state a booting sandbox reaches instead of `ready`. */
		readonly bootsTo?: Sandbox["state"];
		readonly vcpu?: number;
		readonly diskGb?: number;
		/** Egress probes that fail before the guest's network is up. */
		readonly egressFailures?: number;
		/** Create errors thrown before (or, for a lost response, after) allocating. */
		readonly createErrors?: Array<ResponseError | Error>;
		readonly deleteErrors?: ResponseError[];
		readonly renameFails?: boolean;
	} = {},
) {
	const rows = new Map<string, Row>();
	const calls: Array<{ name: string; input: unknown }> = [];
	const keys = new Map<string, string>();
	let next = 0;
	const allocate = (name: string, state: Sandbox["state"] = "ready") => {
		const id = `bx_${"23456789abcdefgh"[next++]?.repeat(8)}`;
		rows.set(id, { id, name, state, vcpu: options.vcpu ?? 4, memoryGB: 8, probes: 0 } as Row);
		return id;
	};
	const sandbox = (id: string) => {
		const row = rows.get(id);
		if (!row) throw vendorError(404, "not_found");
		const { probes: _, ...view } = row;
		return view;
	};
	const client = {
		create: async (input: { idempotencyKey: string }) => {
			calls.push({ name: "create", input });
			const replay = keys.get(input.idempotencyKey);
			const error = options.createErrors?.shift();
			if (error instanceof ResponseError) throw error;
			const id = replay ?? allocate("Sandbox 2026-09-21 12:00", "provisioning");
			keys.set(input.idempotencyKey, id);
			if (error) throw error; // allocated, then the response was lost
			return { ok: true, type: "sandbox.created", sandbox: sandbox(id) };
		},
		get: async ({ sandboxId }: { sandboxId: string }) => {
			calls.push({ name: "get", input: sandboxId });
			const row = rows.get(sandboxId);
			if (row?.state === "provisioning") row.state = options.bootsTo ?? "ready";
			return { ok: true, type: "sandbox.info", sandbox: sandbox(sandboxId) };
		},
		update: async (input: { sandboxId: string; updateSandboxRequest: { name: string } }) => {
			calls.push({ name: "update", input });
			if (options.renameFails) throw vendorError(500, "internal");
			const row = rows.get(input.sandboxId);
			if (!row) throw vendorError(404, "not_found");
			row.name = input.updateSandboxRequest.name;
			return { ok: true, type: "sandbox.info", sandbox: sandbox(input.sandboxId) };
		},
		deleteSandbox: async (input: { sandboxId: string; xAsciiConfirmDelete: string }) => {
			calls.push({ name: "deleteSandbox", input });
			const error = options.deleteErrors?.shift();
			if (error) throw error;
			if (!rows.delete(input.sandboxId)) throw vendorError(404, "not_found");
			return {
				ok: true,
				type: "sandbox.deleting",
				operation: { id: "bdop_1", targetId: input.sandboxId, status: "blocked" },
			};
		},
		command: async ({
			sandboxId,
			commandRequest,
		}: {
			sandboxId: string;
			commandRequest: { command: string; detached?: boolean };
		}) => {
			calls.push({ name: "command", input: commandRequest });
			const row = rows.get(sandboxId);
			if (!row) throw vendorError(404, "not_found");
			if (commandRequest.detached) return { type: "command.started", processId: 42 };
			const { command } = commandRequest;
			const finished = (exitCode: number, stdout = "") => ({
				type: "command.finished",
				exitCode,
				stdout,
				stderr: "",
			});
			if (command.startsWith("getent hosts"))
				return finished(row.probes++ < (options.egressFailures ?? 0) ? 1 : 0);
			if (command.startsWith("df -Pk"))
				return finished(0, `${(options.diskGb ?? 50) * 1024 * 1024}\n`);
			const exit = /^sh -c 'exit (\d+)'$/.exec(command);
			return finished(exit ? Number(exit[1]) : 0, exit ? "" : "ok\n");
		},
		sandboxes: async ({ cursor }: { cursor?: string }) => {
			calls.push({ name: "sandboxes", input: cursor });
			const all = [...rows.keys()];
			const from = cursor === undefined ? 0 : Number(cursor);
			const size = options.pageSize ?? 100;
			const more = from + size < all.length;
			return {
				ok: true,
				type: "sandbox.list",
				sandboxes: all.slice(from, from + size).map(sandbox),
				pageInfo: { nextCursor: more ? String(from + size) : null, hasMore: more },
			};
		},
	} as unknown as BoatClient;
	return {
		client,
		rows,
		calls,
		allocate,
		names: (name: string) => calls.filter((call) => call.name === name),
	};
}

const delays: number[] = [];
const fast: BoatVendorOptions = {
	delay: async (ms) => {
		delays.push(ms);
	},
	egressPollMs: 0,
};

/** The package's own module, lowered over a fake account instead of the real SDK. */
function driverOver(client: BoatClient) {
	return vendorDriver(boat, context, {
		vendor: boatVendor(client, fast),
		timing: { pollMs: 0, deletePollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
	});
}

describe("boat translation", () => {
	test("creates the default bare-metal SKU keyed by the marker, and renames it on attach", async () => {
		const account = boatAccount();
		const { control, data } = boatVendor(account.client, fast);
		const created = await control.create({ request, marker }, op());
		expect(created).toMatchObject({ phase: "pending", marker });
		expect(account.names("create")[0]?.input).toMatchObject({
			idempotencyKey: BOAT_NAME.toVendor(marker),
			createSandboxRequest: { type: BOAT_MACHINE_TYPE, ttlSeconds: null, noEnv: true },
		});
		// Until the rename lands no listing can attribute the allocation.
		expect((await control.get(created.id, op()))?.marker).toBeUndefined();
		await data.attach(created, op());
		expect(await control.get(created.id, op())).toMatchObject({ phase: "ready", marker });
	});

	test("reads boat's states as phases; a stopped sandbox holds no compute but is still owned", async () => {
		const account = boatAccount();
		const { control } = kitPort(boatVendor(account.client, fast));
		const read = (state: Sandbox["state"], name = BOAT_NAME.toVendor(marker)) =>
			control.get(account.allocate(name, state), op());
		for (const state of ["ready", "idle", "running"] as const)
			expect(await read(state)).toMatchObject({ phase: "ready" });
		for (const state of ["error", "archiving"] as const)
			expect(await read(state)).toMatchObject({ phase: "failed" });
		expect(await read("archived")).toMatchObject({ phase: "failed", stopped: true, marker });
		expect(await read("ready", "someone-else")).not.toHaveProperty("marker");
		expect(await control.get("bx_zzzzzzzz", op())).toBeNull();
		expect(await control.remove("bx_zzzzzzzz", op())).toBe("removed");
	});

	test("a minute-limit refusal waits a fresh minute and retries with the same idempotency key", async () => {
		const account = boatAccount({
			createErrors: [vendorError(429, "rate_limited"), new TypeError("socket hang up")],
		});
		delays.length = 0;
		const { control } = boatVendor(account.client, fast);
		const created = await control.create({ request, marker }, op());
		const keys = account
			.names("create")
			.map((call) => (call.input as { idempotencyKey: string }).idempotencyKey);
		expect(keys).toEqual(Array(3).fill(BOAT_NAME.toVendor(marker)));
		expect(delays).toEqual([BOAT_CREATE_RATE_LIMIT_RETRY_MS, BOAT_CREATE_RETRY_MS]);
		expect(account.rows.has(created.id)).toBe(true);
		expect(account.rows.size).toBe(1); // the replayed key returned the lost allocation
	});

	test("a refusal names boat's error code; only a minute limit is retryable", async () => {
		const { control } = boatVendor(
			boatAccount({
				createErrors: [
					vendorError(
						400,
						"trial_auto_stop_required",
						"Free-trial Sandboxes cannot run without auto-stop.",
					),
				],
			}).client,
			fast,
		);
		const refusal = await control.create({ request, marker }, op()).catch((caught) => caught);
		expect(refusal).toMatchObject({
			code: "create-failed",
			vendorHttpStatus: 400,
			message: expect.stringContaining("HTTP 400 trial_auto_stop_required"),
		});
		expect(control.refused?.(refusal)).toEqual({ retryable: false });
		expect(control.refused?.(vendorError(429))).toEqual({ retryable: true });
		for (const status of [408, 409, 500])
			expect(control.refused?.(vendorError(status))).toBeUndefined();
		expect(control.refused?.(new Error("HTTP 400"))).toBeUndefined();
	});

	test("a refused delete names boat's code; only a conflict or outage is transient", async () => {
		const account = boatAccount({
			deleteErrors: [vendorError(409, "snapshot_in_progress"), vendorError(403, "delete_denied")],
		});
		const { control } = boatVendor(account.client, fast);
		const id = account.allocate("x");
		for (const [message, transient] of [
			["boat delete HTTP 409 snapshot_in_progress; removal unconfirmed", true],
			["boat delete HTTP 403 delete_denied; removal unconfirmed", false],
		] as const) {
			const refusal = await control.remove(id, op()).catch((caught) => caught);
			expect(refusal).toMatchObject({ message });
			expect(control.transient?.(refusal)).toBe(transient);
		}
		expect(await control.remove(id, op())).toBe("accepted");
		for (const status of [408, 429, 500])
			expect(control.transient?.(vendorError(status))).toBe(true);
		expect(control.transient?.(new TypeError("socket hang up"))).toBe(false);
	});
});

vendorContract("boat adapter", boat, () => boatVendor(boatAccount({ pageSize: 1 }).client, fast));

describe("boat end to end through its module", () => {
	test("declares identity, native-launch durability, and the harness-owned create ceiling", () => {
		expect(boat.id).toBe("boat");
		expect(boat.provenance).toEqual(BOAT_PROVENANCE);
		expect(boat.execution).toEqual({ syncCapMs: 60_000, durable: "native-launch" });
		expect(boat.createBudget).toEqual({ owner: "harness", timeoutMs: BOAT_CREATE_CEILING_MS });
		expect(BOAT_SANDBOX_ID.allows("bx_23456789")).toBe(true);
		expect(BOAT_SANDBOX_ID.allows("i2f3k4abc")).toBe(false);
	});

	test("a session renames, boots, waits for egress, proves disk, runs, inventories and is deleted", async () => {
		const account = boatAccount({ egressFailures: 2, pageSize: 2 });
		account.allocate("someone-else"); // another tenant's live sandbox
		account.allocate("Box 2026-09-21 22:37", "archived"); // a stopped one holds no compute
		const driver = driverOver(account.client);
		const session = await driver.create(request);
		// Renamed to the idempotency key: both are the marker's spelling.
		const { idempotencyKey } = account.names("create")[0]?.input as { idempotencyKey: string };
		expect(account.rows.get(session.sandboxRef.id)?.name).toBe(idempotencyKey);
		const probes = account
			.names("command")
			.map((call) => (call.input as { command: string }).command);
		expect(probes.filter((command) => command.includes("/dev/tcp/boat.dev/443"))).toHaveLength(3);
		expect(probes.at(-1)).toBe("df -Pk / | awk 'NR==2 {print $2}'");

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("sleep 120");
		expect(account.names("command").at(-1)?.input).toMatchObject({
			command: "sleep 120",
			detached: true,
		});

		const stopped = account.allocate(BOAT_NAME.toVendor(`${MARKER_PREFIX}stopped`), "archived");
		const failed = account.allocate(BOAT_NAME.toVendor(`${MARKER_PREFIX}failed`), "error");
		expect(await driver.inventory?.list()).toEqual({
			owned: [
				session.sandboxRef,
				{ provider: "boat", id: stopped },
				{ provider: "boat", id: failed },
			],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "boat", id: stopped });
		await driver.destroyById?.({ provider: "boat", id: failed });
		const before = account.calls.length;
		await session.destroy();
		expect(account.calls.slice(before).map((call) => call.name)).toEqual(["deleteSandbox", "get"]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("an allocation smaller than the request is refused and deleted", async () => {
		for (const account of [boatAccount({ vcpu: 2 }), boatAccount({ diskGb: 30 })]) {
			await expect(driverOver(account.client).create(request)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "boat",
			});
			expect(account.names("deleteSandbox")).toHaveLength(1);
			expect(account.rows.size).toBe(0);
		}
	});

	test("a sandbox that fails to boot, or whose rename fails, is deleted by id", async () => {
		for (const account of [boatAccount({ bootsTo: "error" }), boatAccount({ renameFails: true })]) {
			await expect(driverOver(account.client).create(request)).rejects.toMatchObject({
				provider: "boat",
			});
			expect(account.names("deleteSandbox")).toHaveLength(1);
			expect(account.rows.size).toBe(0);
		}
	});

	test("a delete that conflicts with a snapshot is asked again until boat accepts it", async () => {
		const account = boatAccount({
			deleteErrors: [
				vendorError(409, "snapshot_in_progress"),
				vendorError(409, "snapshot_in_progress"),
			],
		});
		const session = await driverOver(account.client).create(request);
		await session.destroy();
		expect(account.names("deleteSandbox")).toHaveLength(3);
		expect(account.rows.size).toBe(0);
	});

	test("a failed rename whose delete also fails keeps a cleanup that deletes by id", async () => {
		const account = boatAccount({
			renameFails: true,
			deleteErrors: [vendorError(403, "delete_denied")],
		});
		const failure = await driverOver(account.client)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		const [id] = account.rows.keys();
		// Never renamed, so no listing could attribute it: only the id the create returned finds it.
		expect(failure.locator).toEqual({ kind: "id", value: id });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		await (failure as FailedCreateCleanupError).cleanup();
		expect(account.rows.size).toBe(0);
	});

	test("an ambiguous create stays held: no lookup can find a sandbox that was never renamed", async () => {
		const lost = Array.from({ length: 5 }, () => new TypeError("socket hang up"));
		const account = boatAccount({ createErrors: lost });
		const failure = await driverOver(account.client)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(failure.locator).toMatchObject({
			kind: "marker",
			key: "name",
			value: expect.stringMatching(/^sandbox-benchmarks-/),
		});
	});

	test("an exhausted minute limit stays retryable and is never reconciled", async () => {
		const account = boatAccount({
			createErrors: Array.from({ length: 5 }, () => vendorError(429, "rate_limited")),
		});
		const failure = await driverOver(account.client)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed", vendorHttpStatus: 429 });
		expect(isRetryableDriverCreate(failure)).toBe(true);
		expect(account.names("sandboxes")).toHaveLength(0);
	});

	test("the default module refuses a non-stock artifact and an off-SKU shape before any call", async () => {
		const driver = boat.driver(context);
		for (const invalid of [
			{ ...request, artifact: { kind: "image" as const, ref: "ubuntu:24.04" } },
			{ ...request, spec: { ...request.spec, vcpus: 8 } },
		])
			await expect(driver.create(invalid)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "boat",
			});
	});
});

describe("boat over the real SDK", () => {
	test("sends machineProvider only on the create request", async () => {
		const sandboxId = "bx_23456789";
		const requests: Array<{
			method: string;
			path: string;
			headers: Headers;
			body: Record<string, unknown> | undefined;
			hasSignal: boolean;
		}> = [];
		let name = "Sandbox 2026-09-21 12:00";
		let deleted = false;
		const json = (body: unknown, status = 200) =>
			new Response(JSON.stringify(body), {
				status,
				headers: { "Content-Type": "application/json" },
			});
		const sandbox = (state: string) => ({
			id: sandboxId,
			name,
			state,
			type: "default",
			vcpu: 4,
			memoryGB: 8,
		});
		const fetchApi = (async (...[input, init]: Parameters<typeof fetch>) => {
			const method = init?.method ?? "GET";
			const path = new URL(String(input)).pathname.replace(/^\/api\/v1/, "");
			const body =
				typeof init?.body === "string"
					? (JSON.parse(init.body) as Record<string, unknown>)
					: undefined;
			requests.push({
				method,
				path,
				headers: new Headers(init?.headers),
				body,
				hasSignal: init?.signal instanceof AbortSignal,
			});
			if (method === "POST" && path === "/sandboxes")
				return json({ ok: true, type: "sandbox.created", sandbox: sandbox("provisioning") });
			if (method === "GET" && path === "/sandboxes")
				return json({
					ok: true,
					type: "sandbox.list",
					sandboxes: [],
					pageInfo: { nextCursor: null, hasMore: false },
				});
			if (path === `/sandboxes/${sandboxId}/commands`) {
				const ran = { ok: true, success: true };
				if (body?.detached === true)
					return json({
						...ran,
						type: "command.started",
						processId: 42,
						pid: 42,
						command: "x",
						startedAt: "2026-09-21T00:00:00.000Z",
					});
				const stdout = String(body?.command).startsWith("df -Pk") ? `${80 * 1024 * 1024}\n` : "";
				return json({
					...ran,
					type: "command.finished",
					exitCode: 0,
					stdout,
					stderr: "",
					timedOut: false,
				});
			}
			if (path === `/sandboxes/${sandboxId}`) {
				if (method === "PATCH") {
					name = String(body?.name);
					return json({ ok: true, type: "sandbox.info", sandbox: sandbox("provisioning") });
				}
				if (method === "DELETE") {
					deleted = true;
					return json({
						ok: true,
						type: "sandbox.deleting",
						operation: { id: "bdop_1", kind: "sandbox", targetId: sandboxId, status: "blocked" },
					});
				}
				if (deleted) return json({ ok: false, status: 404, code: "not_found" }, 404);
				return json({ ok: true, type: "sandbox.info", sandbox: sandbox("ready") });
			}
			throw new Error(`unexpected boat request ${method} ${path}`);
		}) as typeof fetch;
		const client = new BoatApi(new Configuration({ accessToken: KEY, fetchApi }));
		const driver = driverOver(client);
		const session = await driver.create(request);
		await session.exec("uname -a");
		await session.launch?.("sleep 120");
		await session.destroy();
		await driver.inventory?.list();

		expect(new Set(requests.map(({ method, path }) => `${method} ${path}`))).toEqual(
			new Set([
				"POST /sandboxes",
				"PATCH /sandboxes/bx_23456789",
				"GET /sandboxes/bx_23456789",
				"POST /sandboxes/bx_23456789/commands",
				"DELETE /sandboxes/bx_23456789",
				"GET /sandboxes",
			]),
		);
		const carrying = requests.filter(({ body }) => body !== undefined && "machineProvider" in body);
		expect(carrying.map(({ method, path }) => `${method} ${path}`)).toEqual(["POST /sandboxes"]);
		expect(carrying[0]?.body).toEqual({
			type: BOAT_MACHINE_TYPE,
			machineProvider: BOAT_MACHINE_PROVIDER,
			ttlSeconds: null,
			noEnv: true,
		});
		expect(carrying[0]?.headers.get("Authorization")).toBe(`Bearer ${KEY}`);
		expect(carrying[0]?.headers.get("Idempotency-Key")).toBe(name);
		expect(name).toMatch(/^sandbox-benchmarks-[0-9a-f-]{36}$/);
		expect(requests.every(({ hasSignal }) => hasSignal)).toBe(true);
	});
});
