import { expect, test } from "bun:test";
import type { RetryOptions, SandboxView } from "@nodeops-createos/sandbox";
import { CreateosSandboxClient } from "@nodeops-createos/sandbox";
import { isFailedCreateCleanupError } from "@sandbox-benchmarks/driver";
import {
	restStub,
	testContext,
	vendorContract,
	vendorDriver,
} from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import createos from "./index.ts";
import { CREATEOS_PYTHON_PREFLIGHT, createosVendor } from "./vendor.ts";

const request = { spec: TARGET_SPEC, artifact: { kind: "none" }, deadlineMs: 300_000 } as const;
const missing = () => Response.json({ error: "not found" }, { status: 404 });
const ok = (data: unknown) => Response.json({ status: "success", data });

const unavailable = () => Response.json({ error: "service unavailable" }, { status: 503 });

function account(
	preflight: { exit_code: number; error?: string } = { exit_code: 0 },
	options: {
		/** Creates answered 503 before the account accepts one (Infinity: never). */
		readonly unavailableCreates?: number;
		readonly retry?: RetryOptions;
	} = {},
) {
	let unavailable503 = options.unavailableCreates ?? 0;
	const stub = restStub<SandboxView>(
		{
			"POST /v1/sandboxes": ({ body, add }) => {
				if (unavailable503 > 0) {
					unavailable503 -= 1;
					return unavailable();
				}
				const row = add({
					name: body.name,
					envs: Object.keys(body.envs),
					status: "running",
					vcpu: 4,
					mem_mib: 8_192,
					disk_mib: body.disk_mib ?? 40 * 1024,
					created_at: "2026-11-14T00:00:00Z",
					ingress_enabled: false,
				});
				const { envs: _, ...view } = row;
				return ok(view);
			},
			"GET /v1/sandboxes": ({ rows }) => ok([...rows.values()]),
			"GET /v1/sandboxes/:id": ({ row }) => ok(row),
			"DELETE /v1/sandboxes/:id": ({ row }) => {
				row.status = "destroyed";
				return ok({ id: row.id, status: row.status });
			},
			"POST /v1/sandboxes/:id/exec": ({ body, run }) => {
				const script = body.args.at(-1);
				if (script === CREATEOS_PYTHON_PREFLIGHT)
					return ok({ result: { stdout: "", stderr: "", ...preflight }, exec_ms: 1 });
				const { stdout, stderr, exitCode } = run(script);
				return ok({ result: { stdout, stderr, exit_code: exitCode }, exec_ms: 1 });
			},
			"PUT /v1/sandboxes/:id/files": ({ url, body, files }) => {
				files.set(url.searchParams.get("path") ?? "", body);
			},
			"GET /v1/sandboxes/:id/files": ({ url, files }) => {
				const text = files.get(url.searchParams.get("path") ?? "");
				return text === undefined ? missing() : new Response(text);
			},
		},
		{ diskGb: 40, missing },
	);
	const vendor = createosVendor(
		new CreateosSandboxClient({
			apiKey: "test",
			baseUrl: "https://createos.invalid",
			fetch: stub.fetch,
			retry: options.retry ?? false,
		}),
	);
	const driver = vendorDriver(createos, testContext("createos"), {
		vendor,
		timing: { pollMs: 0, deleteTimeoutMs: 1_000 },
	});
	return { ...stub, vendor, driver };
}

vendorContract("createos", createos, () => account().vendor);

test("pins the allocation, attributes list rows by env key, and tears down once", async () => {
	const a = account();
	const session = await a.driver.create(request);
	const body = a.calls.find((call) => call.method === "POST")?.body;
	expect(body).toMatchObject({
		shape: "s-4vcpu-8gb",
		rootfs: "devbox:1",
		disk_mib: 40 * 1024,
		egress: ["*"],
	});
	expect(body).not.toHaveProperty("auto_pause_after_seconds");
	expect(await a.driver.inventory?.list()).toEqual({
		owned: [session.sandboxRef],
		foreignCount: 0,
	});
	await session.destroy();
	expect(a.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
	expect(a.rows.get(session.sandboxRef.id)?.status).toBe("destroyed");
});

test.each([
	{ exit_code: 127 },
	{ exit_code: 0, error: "agent unavailable" },
])("rolls back a failed Python preflight: %j", async (result) => {
	const a = account(result);
	await expect(a.driver.create(request)).rejects.toThrow("python preflight failed");
	expect(a.calls.filter((call) => call.method === "DELETE")).toHaveLength(1);
	expect([...a.rows.values()].every((row) => row.status === "destroyed")).toBe(true);
});

test("a create answered 503 is a refusal that allocated nothing, never an unresolved create", async () => {
	const a = account(undefined, { unavailableCreates: Number.POSITIVE_INFINITY });
	const failure = await a.driver.create(request).catch((error: unknown) => error);
	expect(failure).toBeInstanceOf(Error);
	// An ambiguous create would surface as a failed-create cleanup with no allocation verdict.
	expect(isFailedCreateCleanupError(failure)).toBe(false);
	expect(String(failure)).not.toContain("no allocation verdict");
	expect(a.rows.size).toBe(0);
	expect(await a.driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
});

test("the SDK retries a create answered 503 and the account allocates exactly once", async () => {
	const a = account(undefined, {
		unavailableCreates: 1,
		retry: { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
	});
	const session = await a.driver.create(request);
	expect(
		a.calls.filter((call) => call.method === "POST" && call.path === "/v1/sandboxes"),
	).toHaveLength(2);
	expect(a.rows.size).toBe(1);
	await session.destroy();
});
