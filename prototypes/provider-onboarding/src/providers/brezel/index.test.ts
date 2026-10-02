import { describe, expect, test } from "bun:test";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import type { BrezelSpecOptions } from "./index.ts";
import brezel, { BREZEL_SANDBOX_ID, brezelSpec } from "./index.ts";

const environmentRevision = "envr_9830e105167d5161682df50b";
const context = {
	env: {
		BREZEL_API_KEY: "brezel_test-token-111111111111111111111111",
		BREZEL_API_URL: "https://brezel.test",
		BREZEL_PROJECT_ID: "benchmark-project",
		BREZEL_ENVIRONMENT_REVISION: environmentRevision,
	},
	artifact: { kind: "none" as const },
	resolvedArtifact: { kind: "none" as const },
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

function testDriver(
	fake: ReturnType<typeof harnessFetch>,
	options: Partial<BrezelSpecOptions> = {},
) {
	return driverFromComputeSpec(
		"brezel",
		brezelSpec(context, {
			fetch: fake.fetch,
			pollMs: 0,
			readyTimeoutMs: 100,
			deleteTimeoutMs: 500,
			...options,
		}),
		context.resolvedArtifact,
		[context.env.BREZEL_API_KEY],
	);
}

describe("Brezel native integration", () => {
	test("declares a strict identity, shell-detach durability, and the public SDK provenance", () => {
		expect(brezel.id).toBe("brezel");
		expect(brezel.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(brezel.provenance).toEqual({ packageName: "@infercrane/brezel", version: "0.1.1" });
		expect(BREZEL_SANDBOX_ID.allows("sbx_11111111111111111111111111111111")).toBe(true);
		expect(BREZEL_SANDBOX_ID.allows("other_1")).toBe(false);
	});

	test("preserves command streams and files, inventories the dedicated project, and converges delete", async () => {
		const fake = harnessFetch();
		const driver = testDriver(fake);
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "brezel", id: fake.id });
		expect(fake.createKeys[0]).toMatch(/^benchmark-[0-9a-f-]{36}$/);
		expect(fake.calls.find((call) => call.method === "POST")?.body).toEqual({
			environment_revision: environmentRevision,
			lifecycle: { expires_after_seconds: 7_200 },
			network: { allow_internet: true },
		});

		const result = await session.exec("fixture");
		expect(result.exit).toEqual({ kind: "exited", code: 7 });
		expect(result.stdout).toBe("out\n");
		expect(result.stderr).toBe("err\n");
		expect(await session.files?.exists("/tmp/item")).toBe(true);
		expect(
			fake.calls.some(
				(call) =>
					call.method === "POST" &&
					Array.isArray((call.body as { argv?: unknown }).argv) &&
					(call.body as { argv: string[] }).argv.at(-1) === "test -e '/tmp/item'",
			),
		).toBe(true);
		expect(
			fake.calls
				.filter((call) => call.method === "POST" && call.path.endsWith("/commands"))
				.every((call) => (call.body as { argv: string[] }).argv[0] === "/bin/bash"),
		).toBe(true);
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.readFile("/tmp/item")).toBe("saved");
		expect(await driver.inventory?.list()).toEqual({
			owned: [{ provider: "brezel", id: fake.id }],
			foreignCount: 0,
		});

		await session.destroy();
		expect(fake.state()).toBe("deleted");
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
	});

	test("replays the same create identity after an ambiguous failure and deletes the canonical allocation", async () => {
		const fake = harnessFetch({ ambiguousFirstCreate: true });
		await expect(testDriver(fake).create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(fake.createKeys).toHaveLength(2);
		expect(fake.createKeys[1]).toBe(fake.createKeys[0]);
		expect(fake.state()).toBe("deleted");
	});

	test("treats a pre-allocation capacity refusal as definitive and retryable", async () => {
		const fake = harnessFetch({ refuseFirstCreate: true });
		const error = await testDriver(fake)
			.create(request)
			.catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(fake.createKeys).toHaveLength(1);
		expect(fake.state()).toBe("running");
	});

	test("rejects unsupported request dimensions before making a create call", async () => {
		const fake = harnessFetch();
		const driver = testDriver(fake);
		for (const input of [
			{ ...request, spec: { ...TARGET_SPEC, vcpus: 8 } },
			{ ...request, env: { SECRET: "no" } },
			{ ...request, artifact: { kind: "image" as const, ref: "example/image" } },
		]) {
			await expect(driver.create(input)).rejects.toMatchObject({ code: "invalid-create-request" });
		}
		expect(fake.createKeys).toHaveLength(0);
	});
});

describe("Brezel ownership and deadline regressions", () => {
	for (const state of ["standby", "preparing", "deleting", "unknown", "failed"]) {
		test(`retains ownership while sandbox state is ${state}`, async () => {
			const fake = harnessFetch();
			fake.setState(state);
			const driver = testDriver(fake);
			expect(await driver.probes?.observe({ provider: "brezel", id: fake.id })).toEqual({
				state: "running",
			});
		});
	}

	test("deletes failed allocations rather than accepting failure as removal", async () => {
		const fake = harnessFetch();
		fake.setState("failed");
		const driver = testDriver(fake);
		await driver.destroyById?.({ provider: "brezel", id: fake.id });
		expect(fake.state()).toBe("deleted");
		expect(fake.calls.some((call) => call.method === "DELETE")).toBe(true);
	});

	test("bounds deletion from the first control request", async () => {
		const fake = harnessFetch();
		fake.setControlDelay(30);
		const driver = testDriver(fake, { deleteTimeoutMs: 5 });
		await expect(driver.destroyById?.({ provider: "brezel", id: fake.id })).rejects.toThrow();
		expect(fake.calls.some((call) => call.method === "DELETE")).toBe(false);
	});

	test("does not accept readiness observed beyond its deadline", async () => {
		const fake = harnessFetch();
		fake.setControlDelay(30);
		const driver = testDriver(fake, { readyTimeoutMs: 5 });
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(fake.state()).toBe("deleted");
	});
});

describe("Brezel transport and removal evidence", () => {
	test("includes failed records in inventory while excluding confirmed removals", async () => {
		const fake = harnessFetch();
		const driver = testDriver(fake);
		fake.setState("failed");
		expect(await driver.inventory?.list()).toEqual({
			owned: [{ provider: "brezel", id: fake.id }],
			foreignCount: 0,
		});
		expect(fake.calls.at(-1)?.path).toBe("/v1/sandboxes?include_terminal=true");
		fake.setState("expired");
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
	});

	test("does not confirm a deletion that ends in failed state", async () => {
		const fake = harnessFetch({ deleteState: "failed" });
		const driver = testDriver(fake, { deleteTimeoutMs: 10 });
		await expect(driver.destroyById?.({ provider: "brezel", id: fake.id })).rejects.toThrow();
		expect(await driver.probes?.observe({ provider: "brezel", id: fake.id })).toEqual({
			state: "running",
		});
	});

	test("accepts a missing record when deletion races with remote removal", async () => {
		const fake = harnessFetch({ deleteStatus: 404 });
		await testDriver(fake).destroyById?.({ provider: "brezel", id: fake.id });
		expect(fake.state()).toBe("deleted");
	});

	test("forwards inventory cancellation to the pending HTTP request", async () => {
		const fake = harnessFetch();
		fake.setControlDelay(100);
		const driver = testDriver(fake);
		await expect(driver.inventory?.list({ signal: AbortSignal.timeout(5) })).rejects.toThrow();
	});

	test("does not retain the create signal in commands or file transport", async () => {
		const fake = harnessFetch();
		const controller = new AbortController();
		const session = await testDriver(fake).create(request, { signal: controller.signal });
		controller.abort();
		expect((await session.exec("fixture")).stdout).toBe("out\n");
		await session.files?.writeText("/tmp/item", "saved");
		expect(await session.files?.readFile("/tmp/item")).toBe("saved");
		await session.destroy();
		expect(fake.state()).toBe("deleted");
	});

	test("waits for accepted command completion before reporting cancellation", async () => {
		const fake = harnessFetch({ commandDelayMs: 30 });
		const session = await testDriver(fake).create(request);
		const before = Date.now();
		await expect(session.exec("fixture", { signal: AbortSignal.timeout(5) })).rejects.toThrow();
		expect(Date.now() - before).toBeGreaterThanOrEqual(25);
		await session.destroy();
	});
});

test("recognizes explicit backend absence without treating other failures as removal", async () => {
	for (const failureCode of [
		"backend_resource_missing",
		"backend_capacity_unavailable",
		"backend_delete_unconfirmed",
	]) {
		const fake = harnessFetch({ failureCode });
		fake.setState("failed");
		const driver = testDriver(fake);
		const absent = failureCode !== "backend_delete_unconfirmed";
		expect(await driver.probes?.observe({ provider: "brezel", id: fake.id })).toEqual({
			state: absent ? "absent" : "running",
		});
		expect((await driver.inventory?.list())?.owned).toHaveLength(absent ? 0 : 1);
		await driver.destroyById?.({ provider: "brezel", id: fake.id });
		expect(fake.calls.some((call) => call.method === "DELETE")).toBe(!absent);
	}
});

test("rejects a removal response beyond the budget before the timeout callback runs", async () => {
	const fake = harnessFetch({ controlBusyMs: 20 });
	fake.setState("deleted");
	await expect(
		testDriver(fake, { deleteTimeoutMs: 5 }).destroyById?.({ provider: "brezel", id: fake.id }),
	).rejects.toThrow();
});
