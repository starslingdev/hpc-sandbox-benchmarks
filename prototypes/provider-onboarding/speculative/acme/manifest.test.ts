import { describe, expect, test } from "bun:test";
import type { ProviderId } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { httpOps } from "../kit/http.ts";
import { opsSpec } from "../kit/ops.ts";
import { ACME_MANIFEST } from "./manifest.ts";

const env = { ACME_TOKEN: "acme_secret", ACME_URL: "https://acme.test" };
const resolvedArtifact = { kind: "image", ref: "ghcr.io/example/toolchain:v1" } as const;
const request = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: resolvedArtifact,
	deadlineMs: 300_000,
};

function fakeAcme(options: { dropFirstCreate?: boolean } = {}) {
	const rows = new Map<string, { id: string; status: string; label?: string; polls: number }>();
	rows.set("sb-foreign", { id: "sb-foreign", status: "running", polls: 0 });
	const calls: string[] = [];
	let next = 1;
	let dropped = false;
	const fetch = async (input: Parameters<typeof globalThis.fetch>[0], init: RequestInit = {}) => {
		const url = new URL(String(input));
		const method = init.method ?? "GET";
		calls.push(`${method} ${url.pathname}`);
		expect(new Headers(init.headers).get("authorization")).toBe("Bearer acme_secret");
		const json = (value: unknown, status = 200) => Response.json(value, { status });
		const body = typeof init.body === "string" ? JSON.parse(init.body) : undefined;
		const match = /^\/v1\/sandboxes\/(sb-[a-z0-9]+)(\/exec)?$/.exec(url.pathname);
		if (method === "POST" && url.pathname === "/v1/sandboxes") {
			expect(body).toMatchObject({ image: resolvedArtifact.ref, cpu: 4, memory_gb: 8 });
			const row = { id: `sb-${next++}`, status: "provisioning", label: body.label, polls: 0 };
			rows.set(row.id, row);
			if (options.dropFirstCreate && !dropped) {
				dropped = true;
				throw new TypeError("connection reset after acceptance");
			}
			return json(row, 201);
		}
		if (method === "GET" && url.pathname === "/v1/sandboxes")
			return json({ items: [...rows.values()].filter((row) => row.status !== "terminated") });
		const row = match?.[1] ? rows.get(match[1]) : undefined;
		if (!row) return json({ error: "not found" }, 404);
		if (match?.[2]) {
			const command = (body.cmd as string[]).at(-1) ?? "";
			if (command.startsWith("df -Pk"))
				return json({ exit_code: 0, stdout: `${80 * 1024 * 1024}\n`, stderr: "" });
			return json({ exit_code: 3, stdout: "hello\n", stderr: "warn\n" });
		}
		if (method === "GET") {
			row.polls += 1;
			if (row.status === "provisioning" && row.polls > 1) row.status = "running";
			return json(row);
		}
		if (method === "DELETE") {
			row.status = "terminated";
			return json(null, 204);
		}
		throw new Error(`unhandled ${method} ${url.pathname}`);
	};
	return {
		rows,
		calls,
		fetch: Object.assign(fetch, { preconnect() {} }) as typeof globalThis.fetch,
	};
}

// "acme" is not in the closed ProviderId union; the fixture borrows the type, not an identity.
const provider = "acme" as ProviderId;

function driver(fake: ReturnType<typeof fakeAcme>) {
	const context = { env, artifact: { kind: "image" }, resolvedArtifact } as never;
	const ops = httpOps(ACME_MANIFEST, { env, fetch: fake.fetch, timing: { pollMs: 0 } });
	return driverFromComputeSpec(provider, opsSpec(provider, context, ops), resolvedArtifact, [
		env.ACME_TOKEN,
	]);
}

describe("a provider defined only by data", () => {
	test("creates, waits for readiness, proves disk, executes, inventories, and converges delete", async () => {
		const fake = fakeAcme();
		const acme = driver(fake);
		const session = await acme.create(request);
		expect(session.sandboxRef.id).toBe("sb-1");
		expect(fake.rows.get("sb-1")?.label).toMatch(/^benchmark-[0-9a-f-]{36}$/);
		const result = await session.exec("echo hello");
		expect(result).toMatchObject({
			exit: { kind: "exited", code: 3 },
			stdout: "hello\n",
			stderr: "warn\n",
		});
		expect(await acme.inventory?.list()).toEqual({
			owned: [{ provider, id: "sb-1" }],
			foreignCount: 1,
		});
		await session.destroy();
		expect(fake.rows.get("sb-1")?.status).toBe("terminated");
		expect(await acme.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
	});

	test("recovers an ambiguous create by its marker without touching foreign sandboxes", async () => {
		const fake = fakeAcme({ dropFirstCreate: true });
		await expect(driver(fake).create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(fake.rows.get("sb-1")?.status).toBe("terminated");
		expect(fake.rows.get("sb-foreign")?.status).toBe("running");
	});

	test("refuses an artifact other than the resolved image before any API call", async () => {
		const fake = fakeAcme();
		await expect(
			driver(fake).create({ ...request, artifact: { kind: "image", ref: "other:v2" } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(fake.calls).toEqual([]);
	});
});
