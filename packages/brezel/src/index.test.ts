// Brezel tested at the vendor seam: the adapter's translation, the port contract over a fake HTTP
// router, and a few sessions through the package's own module. Kit behaviour (convergence,
// deadlines, the inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import type { BrezelSpecOptions } from "./index.ts";
import brezel from "./index.ts";

const environmentRevision = "envr_9830e105167d5161682df50b";
import { brezelVendor } from "./vendor.ts";

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

function json(value: unknown, status = 200): Response {
	return new Response(JSON.stringify(value), {
		status,
		headers: { "content-type": "application/json" },
	});
}

function command(stdout: string, stderr = "", exitCode = 0): Response {
	const events = [
		{ execution_id: "exec_test", type: "started" },
		...(stdout
			? [
					{
						execution_id: "exec_test",
						type: "stdout",
						data: Buffer.from(stdout).toString("base64"),
					},
				]
			: []),
		...(stderr
			? [
					{
						execution_id: "exec_test",
						type: "stderr",
						data: Buffer.from(stderr).toString("base64"),
					},
				]
			: []),
		{ execution_id: "exec_test", type: "exited", exit_code: exitCode },
	];
	return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
		headers: { "content-type": "application/x-ndjson" },
	});
}

function resource(id: string, state = "running") {
	return {
		id,
		state,
		environment_revision: environmentRevision,
		created_at: "2026-09-28T00:00:00Z",
		updated_at: "2026-09-28T00:00:00Z",
	};
}

function harnessFetch(
	options: {
		readonly ambiguousFirstCreate?: boolean;
		readonly refuseFirstCreate?: boolean;
		readonly deleteState?: string;
		readonly deleteStatus?: number;
		readonly commandDelayMs?: number;
		readonly failureCode?: string;
		readonly controlBusyMs?: number;
	} = {},
) {
	const id = "sbx_11111111111111111111111111111111";
	let state = "running";
	let controlDelayMs = 0;
	let firstCreate = true;
	const createKeys: string[] = [];
	const calls: Array<{ method: string; path: string; body: unknown }> = [];
	const fetchImplementation = async (
		input: Parameters<typeof globalThis.fetch>[0],
		init: Parameters<typeof globalThis.fetch>[1] = {},
	) => {
		const url = new URL(String(input));
		const method = init.method ?? "GET";
		const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
		calls.push({ method, path: `${url.pathname}${url.search}`, body });
		if (options.controlBusyMs && !url.pathname.endsWith("/commands")) {
			const until = Date.now() + options.controlBusyMs;
			while (Date.now() < until) {
				/* Exercise a response that settles before the timeout callback. */
			}
		}
		const waitMs = url.pathname.endsWith("/commands")
			? (options.commandDelayMs ?? 0)
			: controlDelayMs;
		if (waitMs) {
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(resolve, waitMs);
				init.signal?.addEventListener(
					"abort",
					() => {
						clearTimeout(timer);
						reject(init.signal?.reason);
					},
					{ once: true },
				);
			});
		}
		if (method === "POST" && url.pathname === "/v1/sandboxes") {
			createKeys.push(new Headers(init.headers).get("Idempotency-Key") ?? "");
			if (options.refuseFirstCreate && firstCreate) {
				firstCreate = false;
				return json(
					{ error: { code: "capacity_exhausted", message: "capacity unavailable" } },
					429,
				);
			}
			if (options.ambiguousFirstCreate && firstCreate) {
				firstCreate = false;
				throw new TypeError("connection closed after remote acceptance");
			}
			return json({ resource: resource(id) });
		}
		if (method === "GET" && url.pathname === `/v1/sandboxes/${id}`) {
			return json({
				...resource(id, state),
				...(options.failureCode ? { failure: { code: options.failureCode } } : {}),
			});
		}
		if (method === "GET" && url.pathname === "/v1/sandboxes") {
			return json({
				sandboxes:
					state === "deleted"
						? []
						: [
								{
									...resource(id, state),
									...(options.failureCode ? { failure: { code: options.failureCode } } : {}),
								},
							],
			});
		}
		if (method === "DELETE" && url.pathname === `/v1/sandboxes/${id}`) {
			state = options.deleteState ?? "deleted";
			return json({ resource: resource(id, state) }, options.deleteStatus ?? 200);
		}
		if (method === "POST" && url.pathname === `/v1/sandboxes/${id}/commands`) {
			const argv = (body as { argv?: string[] }).argv ?? [];
			const shell = argv.at(-1) ?? "";
			if (shell.startsWith("df -Pk")) return command(`${80 * 1024 * 1024}\n`);
			if (shell.startsWith("test -e")) return command("", "", 0);
			return command("out\n", "err\n", 7);
		}
		if (method === "PUT" && url.pathname === `/v1/sandboxes/${id}/files`) {
			return json({ path: url.searchParams.get("path"), size: 5 });
		}
		if (method === "GET" && url.pathname === `/v1/sandboxes/${id}/files`) {
			return new Response("saved");
		}
		throw new Error(`unhandled test request ${method} ${url.pathname}${url.search}`);
	};
	const fetch = Object.assign(fetchImplementation, { preconnect() {} }) as typeof globalThis.fetch;
	return {
		id,
		fetch,
		createKeys,
		calls,
		state: () => state,
		setState: (value: string) => {
			state = value;
		},
		setControlDelay: (value: number) => {
			controlDelayMs = value;
		},
	};
}

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
	readonly id: string;
	state: string;
	revision: string;
	failureCode?: string;
	gets: number;
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
	const keys = new Map<string, Row>();
	let controlDelayMs = 0;
	let firstCreate = true;
	const resource = (row: Row) => ({
		id: row.id,
		state: row.state,
		environment_revision: row.revision,
		...(row.failureCode && { failure: { code: row.failureCode } }),
		created_at: "2026-09-28T00:00:00Z",
	});
	const stub = restStub<Row>(
		{
			"POST /v1/sandboxes": ({ headers, body, add }) => {
				const first = firstCreate;
				firstCreate = false;
				if (first && options.refuseFirstCreate)
					return json(
						{ error: { code: "refused", message: "refused" } },
						options.refuseFirstCreate,
					);
				const key = headers.get("Idempotency-Key") ?? "";
				const row =
					keys.get(key) ??
					add({
						state: (options.readyAfterGets ?? 0) > 0 ? "preparing" : "running",
						revision: options.bootsRevision ?? body.environment_revision,
						gets: 0,
					});
				keys.set(key, row);
				if (first && options.ambiguousFirstCreate)
					throw new TypeError("connection closed after remote acceptance");
				return { resource: resource(row) };
			},
			"GET /v1/sandboxes": ({ rows }) => ({ sandboxes: [...rows.values()].map(resource) }),
			"GET /v1/sandboxes/:id": ({ row }) => {
				row.gets += 1;
				if (row.state === "preparing" && row.gets >= (options.readyAfterGets ?? 0))
					row.state = "running";
				else if (row.state === "deleting") row.state = "deleted";
				return resource(row);
			},
			"DELETE /v1/sandboxes/:id": ({ row }) => {
				if (row.state !== "deleted") row.state = "deleting";
				return { resource: resource(row) };
			},
			"POST /v1/sandboxes/:id/commands": ({ body, run }) => {
				const shell = (body as { argv: string[] }).argv.at(-1) ?? "";
				if (shell === "fixture") return commandStream("out\n", "err\n", 7);
				const { stdout, stderr, exitCode } = run(shell);
				return commandStream(stdout, stderr, exitCode);
			},
			"PUT /v1/sandboxes/:id/files": ({ url, body, files }) => {
				const path = url.searchParams.get("path") ?? "";
				files.set(path, String(body));
				return { path, size: String(body).length };
			},
			"GET /v1/sandboxes/:id/files": ({ url, files }) => {
				const text = files.get(url.searchParams.get("path") ?? "");
				return text === undefined
					? json({ error: { code: "not_found" } }, 404)
					: new Response(text);
			},
		},
		{
			newId: (n) => `sbx_${String(n).padStart(32, "0")}`,
			latencyMs: (_method, path) =>
				path.endsWith("/commands") ? (options.commandDelayMs ?? 0) : controlDelayMs,
			missing: () => json({ error: { code: "not_found", message: "no such sandbox" } }, 404),
		},
	);
	const { fetch, calls, rows } = stub;
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

vendorContract("brezel adapter", brezel, () =>
	brezelVendor(context, brezelServer({ readyAfterGets: 2 }).fetch),
);

describe("Brezel end to end through its module", () => {
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
});