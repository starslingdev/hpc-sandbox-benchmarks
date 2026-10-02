// Brezel tested at the vendor seam: the adapter's translation, the port contract over a fake HTTP
// router, and a few sessions through the package's own module. Kit behaviour (convergence,
// deadlines, the inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, spyOn, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { kitPort, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import brezel, { BREZEL_SANDBOX_ID } from "./index.ts";
import { brezelPhase, brezelVendor } from "./vendor.ts";

const REVISION = "envr_9830e105167d5161682df50b";
const TOKEN = "brezel_test-token-111111111111111111111111";
const context: DriverContext<"brezel"> = {
	env: {
		BREZEL_API_KEY: TOKEN,
		BREZEL_API_URL: "https://brezel.test",
		BREZEL_PROJECT_ID: "benchmark-project",
		BREZEL_ENVIRONMENT_REVISION: REVISION,
	},
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
};
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });

const json = (value: unknown, status = 200) =>
	new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

/** Brezel's NDJSON command stream for one finished command. */
function commandStream(stdout: string, stderr: string, exitCode: number): Response {
	const output = (type: string, text: string) =>
		text ? [{ execution_id: "exec_test", type, data: Buffer.from(text).toString("base64") }] : [];
	const events = [
		{ execution_id: "exec_test", type: "started" },
		...output("stdout", stdout),
		...output("stderr", stderr),
		{ execution_id: "exec_test", type: "exited", exit_code: exitCode },
	];
	return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
		headers: { "content-type": "application/x-ndjson" },
	});
}

interface Row {
	state: string;
	revision: string;
	failureCode?: string;
	gets: number;
	readonly files: Map<string, string>;
}

/**
 * A fake Brezel API for one dedicated project: idempotent creates keyed by Idempotency-Key, a
 * DELETE that is acknowledged and then observed, an NDJSON command endpoint, and a file store.
 */
function brezelServer(
	options: {
		/** GETs that still observe `preparing` before a sandbox is `running`. */
		readonly readyAfterGets?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		/** The first create is refused with this status before allocating. */
		readonly refuseFirstCreate?: number;
		/** The environment revision the backend actually boots. */
		readonly bootsRevision?: string;
		readonly commandDelayMs?: number;
	} = {},
) {
	const rows = new Map<string, Row>();
	const keys = new Map<string, string>();
	const calls: Array<{ method: string; path: string; headers: Headers; body: unknown }> = [];
	let controlDelayMs = 0;
	let firstCreate = true;
	const resource = (id: string, row: Row) => ({
		id,
		state: row.state,
		environment_revision: row.revision,
		...(row.failureCode && { failure: { code: row.failureCode } }),
		created_at: "2026-09-28T00:00:00Z",
	});
	const delay = (ms: number, signal?: AbortSignal | null) =>
		new Promise<void>((resolve, reject) => {
			const timer = setTimeout(resolve, ms);
			signal?.addEventListener("abort", () => {
				clearTimeout(timer);
				reject(signal.reason);
			});
		});
	function run(row: Row, shell: string): Response {
		if (shell.startsWith("df -Pk")) return commandStream(`${80 * 1024 * 1024}\n`, "", 0);
		const probe = /^test -e '(.*)'$/.exec(shell);
		if (probe) return commandStream("", "", row.files.has(probe[1] ?? "") ? 0 : 1);
		if (shell === "sh -c 'exit 7'") return commandStream("", "", 7);
		return commandStream("out\n", "err\n", 7);
	}
	const route = async (input: string | URL | Request, init: RequestInit = {}) => {
		const url = new URL(String(input));
		const method = init.method ?? "GET";
		const headers = new Headers(init.headers);
		const body =
			typeof init.body === "string"
				? JSON.parse(init.body)
				: init.body instanceof Uint8Array
					? new TextDecoder().decode(init.body)
					: undefined;
		calls.push({ method, path: `${url.pathname}${url.search}`, headers, body });
		const commands = url.pathname.endsWith("/commands");
		const wait = commands ? (options.commandDelayMs ?? 0) : controlDelayMs;
		if (wait) await delay(wait, init.signal);
		const [, , , id = "", sub] = url.pathname.split("/");
		const row = rows.get(id);
		if (method === "POST" && url.pathname === "/v1/sandboxes") {
			const key = headers.get("Idempotency-Key") ?? "";
			if (firstCreate && options.refuseFirstCreate) {
				firstCreate = false;
				return json({ error: { code: "refused", message: "refused" } }, options.refuseFirstCreate);
			}
			let created = keys.get(key);
			if (!created) {
				created = `sbx_${String(rows.size + 1).padStart(32, "0")}`;
				keys.set(key, created);
				rows.set(created, {
					state: (options.readyAfterGets ?? 0) > 0 ? "preparing" : "running",
					revision: options.bootsRevision ?? body.environment_revision,
					gets: 0,
					files: new Map(),
				});
			}
			if (firstCreate && options.ambiguousFirstCreate) {
				firstCreate = false;
				throw new TypeError("connection closed after remote acceptance");
			}
			firstCreate = false;
			return json({ resource: resource(created, rows.get(created) as Row) });
		}
		if (method === "GET" && url.pathname === "/v1/sandboxes")
			return json({ sandboxes: [...rows].map(([key, value]) => resource(key, value)) });
		if (!row) return json({ error: { code: "not_found", message: "no such sandbox" } }, 404);
		if (method === "GET" && sub === undefined) {
			row.gets += 1;
			if (row.state === "preparing" && row.gets >= (options.readyAfterGets ?? 0))
				row.state = "running";
			else if (row.state === "deleting") row.state = "deleted";
			return json(resource(id, row));
		}
		if (method === "DELETE" && sub === undefined) {
			if (row.state !== "deleted") row.state = "deleting";
			return json({ resource: resource(id, row) });
		}
		if (method === "POST" && sub === "commands")
			return run(row, (body as { argv: string[] }).argv.at(-1) ?? "");
		const path = url.searchParams.get("path") ?? "";
		if (method === "PUT" && sub === "files") {
			row.files.set(path, String(body));
			return json({ path, size: String(body).length });
		}
		if (method === "GET" && sub === "files") {
			const text = row.files.get(path);
			return text === undefined ? json({ error: { code: "not_found" } }, 404) : new Response(text);
		}
		throw new Error(`unhandled test request ${method} ${url.pathname}`);
	};
	const fetch = Object.assign(route, { preconnect() {} }) as typeof globalThis.fetch;
	return {
		fetch,
		rows,
		calls,
		creates: () => calls.filter((call) => call.method === "POST" && call.path === "/v1/sandboxes"),
		deletes: () => calls.filter((call) => call.method === "DELETE"),
		setControlDelay: (ms: number) => {
			controlDelayMs = ms;
		},
	};
}

const FAST: Partial<VendorTiming> = { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 };

/** The package's own module, lowered over the fake API instead of the real transport. */
function driverOver(server: ReturnType<typeof brezelServer>, timing: Partial<VendorTiming> = {}) {
	return vendorDriver(brezel, context, {
		vendor: brezelVendor(context, server.fetch),
		timing: { ...FAST, ...timing },
	});
}

describe("Brezel translation", () => {
	test("reads every state as a phase; only deletion, expiry, or a backend-absence verdict is gone", () => {
		const phase = (state: string, code?: string) =>
			brezelPhase({
				id: "sbx_1",
				state: state as never,
				environment_revision: REVISION,
				...(code && { failure: { code } }),
			});
		expect(
			["requested", "preparing", "pausing", "standby", "resuming", "unknown"].map((s) => phase(s)),
		).toEqual(Array(6).fill("pending"));
		expect(phase("running")).toBe("ready");
		expect(phase("deleting")).toBe("deleting");
		expect([phase("deleted"), phase("expired")]).toEqual(["gone", "gone"]);
		expect(phase("failed")).toBe("failed");
		expect(phase("failed", "backend_delete_unconfirmed")).toBe("failed");
		expect(phase("failed", "backend_resource_missing")).toBe("gone");
		expect(phase("failed", "backend_capacity_unavailable")).toBe("gone");
	});

	/** The SDK's own error for a create the fake API answers with `status` (0: transport loss). */
	const failure = (status: number) => {
		const server = brezelServer(
			status ? { refuseFirstCreate: status } : { ambiguousFirstCreate: true },
		);
		return brezelVendor(context, server.fetch)
			.control.create({ request, marker: "m" }, op())
			.catch((caught: unknown) => caught);
	};

	test("absence is only the API's 404: never auth, outage or transport failures", async () => {
		const { control } = brezelVendor(context, brezelServer().fetch);
		const missing = await control.get("sbx_missing", op()).catch((caught: unknown) => caught);
		expect(control.absent?.(missing)).toBe(true);
		expect(control.absent?.(await failure(404))).toBe(true);
		for (const status of [0, 401, 403, 500, 503])
			expect(control.absent?.(await failure(status))).toBe(false);
		expect(control.absent?.(new Error("404 not found"))).toBe(false);
	});

	test("classifies refusals by status; only a rate limit is retryable", async () => {
		const { refused } = brezelVendor(context, brezelServer().fetch).control;
		for (const status of [400, 401, 403, 404])
			expect(refused?.(await failure(status))).toEqual({ retryable: false });
		expect(refused?.(await failure(429))).toEqual({ retryable: true });
		expect(refused?.(new Error("wrapped", { cause: await failure(429) }))).toEqual({
			retryable: true,
		});
		for (const status of [0, 500, 503]) expect(refused?.(await failure(status))).toBeUndefined();
		// Gateway errors and rate limits are retryable once reconciliation proves nothing remains.
		const { transient } = brezelVendor(context, brezelServer().fetch).control;
		for (const status of [429, 502, 503, 504])
			expect(transient?.(await failure(status))).toBe(true);
		for (const status of [0, 400, 500]) expect(transient?.(await failure(status))).toBe(false);
	});

	test("maps the create, delete, listing and exec requests and keeps the token in Authorization", async () => {
		const server = brezelServer();
		const { control, data } = kitPort(brezelVendor(context, server.fetch));
		// A running create acknowledgement is still not readiness evidence.
		const created = await control.create({ request, marker: "benchmark-key" }, op());
		expect(created.phase).toBe("pending");
		const [post] = server.creates();
		expect(post?.headers.get("Idempotency-Key")).toBe("benchmark-key");
		expect(post?.body).toEqual({
			environment_revision: REVISION,
			lifecycle: { expires_after_seconds: 7_200 },
			network: { allow_internet: true },
		});
		expect(post?.headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
		expect(post?.headers.get("X-Project-ID")).toBe("benchmark-project");
		expect(JSON.stringify(post?.body)).not.toContain(TOKEN);

		await control.page(undefined, op());
		expect(server.calls.at(-1)?.path).toBe("/v1/sandboxes?include_terminal=true");
		expect(await control.remove(created.id, op())).toBe("accepted");
		expect(server.deletes()[0]?.headers.get("Idempotency-Key")).toBe(
			`benchmark-delete-${created.id}`,
		);

		const native = await data.attach(created, op());
		await data.exec(native, "echo hi");
		expect(server.calls.at(-1)?.body).toMatchObject({ argv: ["/bin/bash", "-lc", "echo hi"] });
	});

	test("admits only the pinned environment revision", async () => {
		const { control } = brezelVendor(context, brezelServer().fetch);
		const record = (revision: string) => ({
			id: "sbx_1",
			phase: "ready" as const,
			raw: { id: "sbx_1", state: "running" as const, environment_revision: revision },
		});
		expect(control.admit?.(record(REVISION))).toBeUndefined();
		expect(control.admit?.(record("envr_other"))).toContain("different environment revision");
	});

	test("forwards a control call's signal into the pending HTTP request", async () => {
		const server = brezelServer();
		server.setControlDelay(1_000);
		const { control } = brezelVendor(context, server.fetch);
		const started = performance.now();
		await expect(control.page(undefined, { signal: AbortSignal.timeout(5) })).rejects.toThrow();
		expect(performance.now() - started).toBeLessThan(500);
	});

	test("waits for an accepted command to complete before reporting cancellation", async () => {
		const server = brezelServer({ commandDelayMs: 30 });
		const { control, data } = brezelVendor(context, server.fetch);
		const native = await data.attach(await control.create({ request, marker: "m" }, op()), op());
		const started = performance.now();
		await expect(
			data.exec(native, "fixture", { signal: AbortSignal.timeout(5) }),
		).rejects.toThrow();
		expect(performance.now() - started).toBeGreaterThanOrEqual(25);
	});
});

vendorContract("brezel adapter", brezel, () =>
	brezelVendor(context, brezelServer({ readyAfterGets: 2 }).fetch),
);

describe("Brezel end to end through its module", () => {
	test("declares strict identity, shell-detach durability, and the public SDK provenance", () => {
		expect(brezel.id).toBe("brezel");
		expect(brezel.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(brezel.provenance).toEqual({ packageName: "@infercrane/brezel", version: "0.1.1" });
		expect(BREZEL_SANDBOX_ID.allows("sbx_11111111111111111111111111111111")).toBe(true);
		expect(BREZEL_SANDBOX_ID.allows("other_1")).toBe(false);
	});

	test("a session creates, executes, round-trips files, is inventoried, and is destroyed", async () => {
		const server = brezelServer({ readyAfterGets: 2 });
		const driver = driverOver(server);
		const controller = new AbortController();
		const session = await driver.create(request, { signal: controller.signal });
		// The create signal stays with control calls; the data plane keeps working without it.
		controller.abort();
		expect(server.creates()[0]?.headers.get("Idempotency-Key")).toMatch(
			/^benchmark-[0-9a-f-]{36}$/,
		);

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect([result.stdout, result.stderr]).toEqual(["out\n", "err\n"]);
		expect(await session.files?.exists("/tmp/item")).toBe(false);
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.exists("/tmp/item")).toBe(true);
		expect(await session.files?.readFile("/tmp/item")).toBe("saved");

		// A dedicated project: every record not yet removed is owned, failed ones included.
		const [id] = [...server.rows.keys()];
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 0,
		});
		// The held session's teardown starts with its DELETE, then observes removal.
		const before = server.calls.length;
		await session.destroy();
		expect(server.calls.slice(before).map((call) => call.method)).toEqual(["DELETE", "GET"]);
		expect(server.rows.get(id ?? "")?.state).toBe("deleted");
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
	});

	test("an ambiguous create is recovered by replaying its key and deleting the canonical allocation", async () => {
		const server = brezelServer({ ambiguousFirstCreate: true });
		await expect(driverOver(server).create(request)).rejects.toMatchObject({
			code: "create-failed",
		});
		const keys = server.creates().map((call) => call.headers.get("Idempotency-Key"));
		expect(keys.length).toBeGreaterThanOrEqual(2);
		expect(new Set(keys).size).toBe(1);
		expect(server.rows.size).toBe(1);
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("a rate-limit refusal is retryable and never replayed", async () => {
		const server = brezelServer({ refuseFirstCreate: 429 });
		const error = await driverOver(server)
			.create(request)
			.catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(server.creates()).toHaveLength(1);
		expect(server.rows.size).toBe(0);
	});

	test("a gateway failure is reconciled by replay before it is marked retryable", async () => {
		const server = brezelServer({ refuseFirstCreate: 503 });
		const error = await driverOver(server)
			.create(request)
			.catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		const keys = server.creates().map((call) => call.headers.get("Idempotency-Key"));
		expect(keys.length).toBeGreaterThanOrEqual(2);
		expect(new Set(keys).size).toBe(1);
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("an allocation booted from another environment revision is rejected and deleted", async () => {
		const server = brezelServer({ bootsRevision: "envr_other" });
		await expect(driverOver(server).create(request)).rejects.toMatchObject({
			code: "create-failed",
		});
		expect([...server.rows.values()].map((row) => row.state)).toEqual(["deleted"]);
	});

	test("a failed record is deleted, but a backend-absence verdict is never sent a delete", async () => {
		for (const [failureCode, deletes] of [
			["backend_delete_unconfirmed", 1],
			["backend_resource_missing", 0],
		] as const) {
			const server = brezelServer();
			const driver = driverOver(server);
			const session = await driver.create(request);
			const row = server.rows.get(session.sandboxRef.id);
			if (!row) throw new Error("missing row");
			Object.assign(row, { state: "failed", failureCode });
			await driver.destroyById?.(session.sandboxRef);
			expect(server.deletes()).toHaveLength(deletes);
		}
	});

	test("deletion is bounded from its first control request", async () => {
		const server = brezelServer();
		const driver = driverOver(server, { deleteTimeoutMs: 5 });
		const session = await driver.create(request);
		server.setControlDelay(30);
		await expect(driver.destroyById?.(session.sandboxRef)).rejects.toThrow();
		expect(server.deletes()).toHaveLength(0);
	});
});

describe("Brezel's production binding", () => {
	/** `brezel.driver(context)` exactly as the fleet loads it, over a spied global fetch. */
	function production(server: ReturnType<typeof brezelServer>) {
		const fetch = spyOn(globalThis, "fetch").mockImplementation(server.fetch);
		try {
			return { driver: brezel.driver(context), fetch };
		} catch (error) {
			fetch.mockRestore();
			throw error;
		}
	}

	test("the default module sends the bearer token and Idempotency-Key through globalThis.fetch", async () => {
		const server = brezelServer();
		const { driver, fetch } = production(server);
		try {
			const session = await driver.create(request);
			const [post] = server.creates();
			expect(post?.headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
			expect(post?.headers.get("Idempotency-Key")).toMatch(/^benchmark-[0-9a-f-]{36}$/);
			expect(post?.body).toMatchObject({ environment_revision: REVISION });
			expect(JSON.stringify(post?.body)).not.toContain(TOKEN);
			await session.destroy();
			expect(fetch).toHaveBeenCalled();
		} finally {
			fetch.mockRestore();
		}
	});

	test("the pinned 4 vCPU / 8 GiB shape refuses other requests before any create call", async () => {
		const server = brezelServer();
		const { driver, fetch } = production(server);
		try {
			for (const input of [
				{ ...request, spec: { ...TARGET_SPEC, vcpus: 8 } },
				{ ...request, env: { OVERRIDE: "yes" } },
				{ ...request, artifact: { kind: "image" as const, ref: "example/image" } },
			])
				await expect(driver.create(input)).rejects.toMatchObject({
					code: "invalid-create-request",
				});
			expect(server.calls).toHaveLength(0);
		} finally {
			fetch.mockRestore();
		}
	});
});
