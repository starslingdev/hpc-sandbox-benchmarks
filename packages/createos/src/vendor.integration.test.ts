import { expect, test } from "bun:test";
import type { SandboxView } from "@nodeops-createos/sandbox";
import { CreateosSandboxClient } from "@nodeops-createos/sandbox";
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

function account(preflight: { exit_code: number; error?: string } = { exit_code: 0 }) {
	const stub = restStub<SandboxView>(
		{
			"POST /v1/sandboxes": ({ body, add }) => {
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
			retry: false,
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
