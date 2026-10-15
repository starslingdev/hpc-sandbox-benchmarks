import { describe, expect, test } from "bun:test";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import {
	CREATEOS_DISK_MIB,
	CREATEOS_PYTHON_PREFLIGHT,
	CREATEOS_ROOTFS,
	CREATEOS_SHAPE,
	createosSpec,
} from "./index.ts";

const context = {
	env: {
		CREATEOS_API_KEY: "createos-test-sentinel",
		CREATEOS_SANDBOX_BASE_URL: "https://sandbox.test",
	},
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
} as const;

const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};

function view(status = "running", name = "sbbench-test") {
	return {
		id: "sb-01test",
		status,
		ip: "10.0.0.2",
		vcpu: 4,
		mem_mib: 8192,
		disk_mib: CREATEOS_DISK_MIB,
		created_at: "2026-09-30T00:00:00Z",
		ingress_enabled: false,
		name,
		shape: CREATEOS_SHAPE,
		rootfs: CREATEOS_ROOTFS,
	};
}

function success(data: unknown): Response {
	return Response.json({ status: "success", data });
}

function fixture(initialState = "running", inventoryName = "sbbench-test") {
	let state = initialState;
	let staleInventoryReads = 0;
	const calls: Array<{ method: string; path: string; body?: Record<string, unknown> }> = [];
	const mockFetch = Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? "GET";
			const body =
				typeof init?.body === "string"
					? (JSON.parse(init.body) as Record<string, unknown>)
					: undefined;
			calls.push({ method, path: url.pathname + url.search, ...(body ? { body } : {}) });
			if (url.pathname === "/v1/sandboxes" && method === "POST") {
				return success({ ...view(), ...body, spawn_ms: 25, bandwidth_quota_bytes: 50 });
			}
			if (url.pathname === "/v1/sandboxes" && method === "GET") {
				const inventoryState =
					state === "destroyed" && staleInventoryReads-- > 0 ? "running" : state;
				return success({
					data: inventoryState === "destroyed" ? [] : [view(inventoryState, inventoryName)],
					pagination: {
						total: inventoryState === "destroyed" ? 0 : 1,
						limit: 500,
						offset: 0,
						count: inventoryState === "destroyed" ? 0 : 1,
					},
				});
			}
			if (url.pathname === "/v1/sandboxes/sb-01test/exec") {
				return success({ result: { stdout: "ok\n", stderr: "", exit_code: 0 }, exec_ms: 2 });
			}
			if (url.pathname === "/v1/sandboxes/sb-01test" && method === "DELETE") {
				state = "destroyed";
				return success({ id: "sb-01test", status: "destroying" });
			}
			if (url.pathname === "/v1/sandboxes/sb-01test" && method === "GET") {
				return success(view(state));
			}
			throw new Error(`unexpected request: ${method} ${url.pathname}${url.search}`);
		},
		{ preconnect: fetch.preconnect },
	);
	const spec = createosSpec(context, { fetch: mockFetch, deletePollMs: 1 });
	return {
		calls,
		setStaleInventoryReads: (count: number) => {
			staleInventoryReads = count;
		},
		driver: driverFromComputeSpec("createos", spec, context.resolvedArtifact, [
			context.env.CREATEOS_API_KEY,
		]),
	};
}

describe("CreateOS native SDK driver", () => {
	test("creates the benchmark target, executes through bash, and converges deletion", async () => {
		const { calls, driver } = fixture();
		const session = await driver.create(request);
		const create = calls.find((call) => call.method === "POST" && call.path === "/v1/sandboxes");
		expect(create?.body).toMatchObject({
			shape: CREATEOS_SHAPE,
			rootfs: CREATEOS_ROOTFS,
			disk_mib: CREATEOS_DISK_MIB,
			egress: ["*"],
		});
		expect(create?.body?.name).toMatch(/^sbbench-[a-f0-9]{14}$/);

		const execCallsAfterCreate = calls.filter((call) => call.path.endsWith("/exec"));
		expect(execCallsAfterCreate).toHaveLength(1);
		expect(execCallsAfterCreate[0]?.body).toEqual({
			cmd: "bash",
			args: ["-lc", CREATEOS_PYTHON_PREFLIGHT],
		});

		expect(await session.exec("printf ok")).toMatchObject({
			exit: { kind: "exited", code: 0 },
			stdout: "ok\n",
		});
		expect(calls.filter((call) => call.path.endsWith("/exec"))[1]?.body).toEqual({
			cmd: "bash",
			args: ["-lc", "printf ok"],
		});
		await session.destroy();
		expect(calls.some((call) => call.method === "DELETE")).toBe(true);
	});

	test("inventory separates benchmark allocations from foreign sandboxes", async () => {
		const { driver } = fixture();
		expect(await driver.inventory?.list()).toEqual({
			owned: [{ provider: "createos", id: "sb-01test" }],
			foreignCount: 0,
		});
	});

	test("terminal failed creates do not become foreign account allocations", async () => {
		const { driver } = fixture("failed", "generated-create-failure");
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
	});

	test("destroy waits for collection inventory to observe deletion", async () => {
		const { calls, driver, setStaleInventoryReads } = fixture();
		const session = await driver.create(request);
		setStaleInventoryReads(2);

		await session.destroy();

		expect(
			calls.filter(
				(call) => call.method === "GET" && call.path.startsWith("/v1/sandboxes?"),
			),
		).toHaveLength(3);
	});
});
