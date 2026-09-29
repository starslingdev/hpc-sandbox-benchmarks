import { describe, expect, test } from "bun:test";
import type { CreateRequest } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { Freestyle, FreestyleApiError } from "freestyle";
import { FREESTYLE_OWNER_KEY, freestyleSpec } from "./index.ts";

const context = {
	env: { FREESTYLE_API_KEY: "freestyle-test-sentinel" },
	artifact: { kind: "none" },
	resolvedArtifact: { kind: "none" },
} as const;
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "none" },
	deadlineMs: 300_000,
};
const missing = () => Response.json({ code: "NOT_FOUND", message: "gone" }, { status: 404 });
const row = (id = "vm-test", state = "running", marker = "benchmark-test") => ({
	id,
	state,
	metadata: { [FREESTYLE_OWNER_KEY]: marker },
	resources: { cpu: 4, memory: 8192, storage: 40960 },
});

function fixture(
	override?: (path: string, method: string, body: Record<string, unknown>) => Response | undefined,
) {
	let deleted = false;
	const calls: { path: string; method: string; body: Record<string, unknown>; headers: Headers }[] =
		[];
	const client = new Freestyle({
		apiKey: context.env.FREESTYLE_API_KEY,
		fetch: (async (input, init) => {
			const url = new URL(String(input));
			const path = url.pathname + url.search;
			const method = init?.method ?? "GET";
			const body =
				typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
			calls.push({ path, method, body, headers: new Headers(init?.headers) });
			const custom = override?.(path, method, body);
			if (custom) return custom;
			if (path === "/v5/vms" && method === "POST") return Response.json(row());
			if (path === "/v5/vms/vm-test/resize") return Response.json(row());
			if (path === "/v5/vms/vm-test/exec-await")
				return Response.json({ statusCode: 0, stdout: "", stderr: "" });
			if (path === "/v5/vms/vm-test/snapshot") return Response.json({ snapshotId: "sh-test" });
			if (path === "/v5/snapshots/sh-test" && method === "DELETE")
				return new Response(null, { status: 204 });
			if (path === "/v5/vms/vm-test" && method === "DELETE") {
				deleted = true;
				return new Response(null, { status: 204 });
			}
			if (path === "/v5/vms/vm-test") return deleted ? missing() : Response.json(row());
			throw new Error(`Unexpected fixture request: ${method} ${path}`);
		}) as typeof fetch,
	});
	const spec = freestyleSpec(context, client);
	const driver = driverFromComputeSpec("freestyle", spec, context.resolvedArtifact, [
		context.env.FREESTYLE_API_KEY,
	]);
	return { client, calls, spec, driver };
}

describe("Freestyle native SDK driver", () => {
	test("maps the target shape, opens only outbound traffic, and bounds orphan lifetime", async () => {
		const { driver, calls } = fixture();
		const session = await driver.create(request);
		const create = calls.find((call) => call.path === "/v5/vms");
		expect(create?.body).toMatchObject({
			snapshotId: "freestyle/ubuntu",
			idleTimeoutSeconds: -1,
			autoDeleteSeconds: 0,
			ttlSeconds: 900,
			firewall: { rules: [{ action: "allow", source: {}, destination: { public: true } }] },
		});
		expect(create?.body.slug).toMatch(/^sandbox-benchmarks-[a-f0-9-]+$/);
		expect(create?.body.metadata).toEqual({
			[FREESTYLE_OWNER_KEY]: expect.stringMatching(/^benchmark-/),
		});
		expect(JSON.stringify(create?.body)).not.toContain(context.env.FREESTYLE_API_KEY);
		expect(calls.find((call) => call.path.endsWith("/resize"))?.body).toEqual({
			cpu: 4,
			memory: 8192,
			storage: 40960,
		});
		expect(calls.find((call) => call.path.endsWith("/exec-await"))?.body).toMatchObject({
			command: "true",
			linuxUser: "ubuntu",
			timeoutMs: 300_000,
		});
		expect(session.sandboxRef).toEqual({ provider: "freestyle", id: "vm-test" });
		await session.destroy();
		await session.destroy();
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
	});

	test("rejects unsupported shapes, artifacts, environment, and GPU before allocating", async () => {
		const { driver, calls } = fixture();
		for (const input of [
			{ ...request, spec: { vcpus: 2, memoryGb: 8 } },
			{ ...request, spec: { vcpus: 4, memoryGb: 4 } },
			{ ...request, spec: { vcpus: 4, memoryGb: 8, diskGb: 16 } },
			{ ...request, artifact: { kind: "image" as const, ref: "unrelated" } },
			{ ...request, env: { INJECT: "value" } },
			{ ...request, gpu: { model: "A100", count: 1 } },
		])
			await expect(driver.create(input)).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(calls).toHaveLength(0);
	});

	test("preserves split output and nonzero exits; a timeout never becomes exit zero", async () => {
		const { driver } = fixture((path, _method, body) => {
			if (!path.endsWith("/exec-await") || body.command === "true") return;
			return Response.json({
				stdout: "out\n",
				stderr: "err\n",
				statusCode: body.command === "timeout" ? null : 7,
			});
		});
		const session = await driver.create(request);
		expect(await session.exec("fail")).toMatchObject({
			stdout: "out\n",
			stderr: "err\n",
			exit: { kind: "exited", code: 7 },
		});
		expect(await session.exec("timeout")).toMatchObject({ exit: { kind: "unknown" } });
		await session.destroy();
	});

	test("tears down an accepted VM if resizing fails or returns the wrong resources", async () => {
		for (const failed of [true, false]) {
			const { driver, calls } = fixture((path) => {
				if (failed && path.endsWith("/resize"))
					return Response.json({ code: "LIMIT_EXCEEDED", message: "disk cap" }, { status: 400 });
				if (!failed && path === "/v5/vms/vm-test") return undefined;
			});
			const input = failed ? request : { ...request, spec: { vcpus: 8, memoryGb: 16, diskGb: 64 } };
			await expect(driver.create(input)).rejects.toThrow();
			expect(
				calls.some((call) => call.method === "DELETE" && call.path === "/v5/vms/vm-test"),
			).toBe(true);
		}
	});

	test("treats only typed not-found as absence and propagates auth failures", async () => {
		const { driver } = fixture(() =>
			Response.json({ code: "UNAUTHORIZED", message: "bad key" }, { status: 401 }),
		);
		await expect(
			driver.destroyById?.({ provider: "freestyle", id: "vm-test" }),
		).rejects.toMatchObject({ code: "destroy-failed" });
		await expect(
			driver.probes?.observe({ provider: "freestyle", id: "vm-test" }),
		).rejects.toThrow();
	});

	test("recovers a lost create response only when its exact attempt marker matches", async () => {
		for (const marker of ["benchmark-test", "someone-else"]) {
			const { spec, calls } = fixture((path) =>
				path === "/v5/vms/sandbox-benchmarks-test"
					? Response.json(row("vm-test", "running", marker))
					: undefined,
			);
			const recovery = spec.createRecovery;
			if (!recovery) throw new Error("missing recovery");
			const result = recovery.cleanup(
				spec.compute,
				{ kind: "marker", key: FREESTYLE_OWNER_KEY, value: "benchmark-test" },
				{},
			);
			if (marker === "benchmark-test")
				await expect(result).resolves.toEqual({ status: "destroyed" });
			else {
				await expect(result).rejects.toThrow("unrelated VM");
				expect(calls.some((call) => call.method === "DELETE")).toBe(false);
			}
		}
	});

	test("classifies API refusals without interpreting arbitrary error prose", () => {
		const recovery = fixture().spec.createRecovery;
		expect(
			recovery?.isRetryableCreate?.(
				new FreestyleApiError(429, { code: "RATE_LIMITED", message: "wait" }),
			),
		).toBe(true);
		expect(
			recovery?.isDefinitive?.(
				new FreestyleApiError(401, { code: "UNAUTHORIZED", message: "bad key" }),
			),
		).toBe(true);
		expect(recovery?.isDefinitive?.(new Error("401 429"))).toBe(false);
		expect(
			recovery?.isDefinitive?.(
				new FreestyleApiError(500, { code: "INTERNAL_ERROR", message: "lost" }),
			),
		).toBe(false);
	});

	test("drains inventory pages, owns stopped VMs, and counts live foreign allocations", async () => {
		const { driver } = fixture((path) => {
			if (path === "/v5/vms?limit=100&offset=0")
				return Response.json({ vms: [row(), row("foreign", "running", "other")], totalCount: 4 });
			if (path === "/v5/vms?limit=100&offset=2")
				return Response.json({
					vms: [row("owned-stopped", "stopped"), row("foreign-paused", "paused", "other")],
					totalCount: 4,
				});
		});
		expect(await driver.inventory?.list()).toEqual({
			owned: [
				{ provider: "freestyle", id: "vm-test" },
				{ provider: "freestyle", id: "owned-stopped" },
			],
			foreignCount: 1,
		});
	});

	test("rejects partial, repeated, and changing inventory results", async () => {
		for (const second of [
			{ vms: [], totalCount: 2 },
			{ vms: [row()], totalCount: 2 },
			{ vms: [row("another")], totalCount: 3 },
		]) {
			const { driver } = fixture((path) =>
				path.startsWith("/v5/vms?")
					? Response.json(path.endsWith("offset=0") ? { vms: [row()], totalCount: 2 } : second)
					: undefined,
			);
			await expect(driver.inventory?.list()).rejects.toThrow();
		}
	});

	test("exposes native snapshots with a cleanup deadline and permanent deletion", async () => {
		const { driver, calls } = fixture();
		const session = await driver.create(request);
		const snapshot = await driver.snapshots?.create(session);
		expect(snapshot).toEqual({ snapshotId: "sh-test" });
		expect(calls.find((call) => call.path.endsWith("/snapshot"))?.body).toEqual({
			ttlSeconds: 600,
		});
		await driver.snapshots?.delete("sh-test");
		await session.destroy();
	});
});
