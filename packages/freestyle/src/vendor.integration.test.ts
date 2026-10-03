import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { restStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import freestyle, { snapshotBuild } from "./driver.ts";
import { FREESTYLE_OWNER_KEY, FREESTYLE_SLUG, freestyleVendor } from "./vendor.ts";

const context = {
	env: { FREESTYLE_API_KEY: "freestyle-test-sentinel" },
	artifact: { kind: "baked", source: "native-snapshot" },
	resolvedArtifact: { kind: "baked", ref: "sh-test" },
} as const;
const request: CreateRequest = {
	spec: TARGET_SPEC,
	artifact: { kind: "baked", ref: "sh-test" },
	deadlineMs: 300_000,
};
const missing = () => Response.json({ code: "NOT_FOUND", message: "gone" }, { status: 404 });
const row = (id = "vm-test", state = "running", marker = "benchmark-test") => ({
	id,
	snapshotId: "sh-test",
	state,
	metadata: { [FREESTYLE_OWNER_KEY]: marker },
	resources: { cpu: 4, memory: 8192, storage: 40960 },
});

function fixture(
	override?: (
		path: string,
		method: string,
		body: Record<string, unknown>,
		init?: RequestInit,
	) => Response | undefined | Promise<Response | undefined>,
	timing: Partial<VendorTiming> = {},
	driverContext: DriverContext<"freestyle"> = context,
) {
	let deleted = false;
	const calls: { path: string; method: string; body: Record<string, unknown>; headers: Headers }[] =
		[];
	const mockFetch = Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const url = new URL(String(input));
			const path = url.pathname + url.search;
			const method = init?.method ?? "GET";
			const body =
				typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : {};
			calls.push({ path, method, body, headers: new Headers(init?.headers) });
			const custom = await override?.(path, method, body, init);
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
		},
		{ preconnect: fetch.preconnect },
	);
	// The package's own module, lowered over the fake transport instead of the real API.
	const driver = vendorDriver(freestyle, driverContext, {
		vendor: freestyleVendor(driverContext, mockFetch),
		timing: { deletePollMs: 0, ...timing },
	});
	return { calls, driver };
}

/**
 * A whole Freestyle account over its HTTP API: creates run at once under their slug, a DELETE is
 * acknowledged and the VM is gone at the next read, listings page by offset, and each guest's shell
 * answers exit codes and keeps the files written to it.
 */
function freestyleAccount() {
	type Vm = ReturnType<typeof row> & { slug: string };
	const account = restStub<Vm>(
		{
			"POST /v5/vms": ({ body, add }) => {
				const { id: _, ...created } = row("", "running", body.metadata[FREESTYLE_OWNER_KEY]);
				return add({ ...created, slug: body.slug });
			},
			"GET /v5/vms": ({ url, rows }) => {
				const offset = Number(url.searchParams.get("offset") ?? 0);
				const all = [...rows.values()];
				return { vms: all.slice(offset, offset + 1), totalCount: all.length };
			},
			"GET /v5/vms/:id": ({ row: vm }) => vm,
			"POST /v5/vms/:id/resize": ({ row: vm }) => vm,
			"DELETE /v5/vms/:id": ({ rows, row: vm }) => {
				rows.delete(vm.id);
			},
			"POST /v5/vms/:id/exec-await": ({ body }) => ({
				statusCode: String(body.command).includes("exit 7") ? 7 : 0,
				stdout: "",
				stderr: "",
			}),
			"PUT /v5/vms/:id/fs/write": ({ url, body, files }) => {
				files.set(url.searchParams.get("path") ?? "", body);
				return {};
			},
			"GET /v5/vms/:id/fs/read": ({ url, files }) =>
				new Response(files.get(url.searchParams.get("path") ?? "") ?? ""),
			"GET /v5/vms/:id/fs/exists": ({ url, files }) => ({
				exists: files.has(url.searchParams.get("path") ?? ""),
			}),
		},
		{
			newId: (n) => `vm-${n}`,
			lookup: (name, vms) => vms.get(name) ?? [...vms.values()].find((vm) => vm.slug === name),
			missing,
		},
	);
	return { fetch: account.fetch, vms: account.rows };
}

vendorContract("freestyle adapter", freestyle, () =>
	freestyleVendor(context, freestyleAccount().fetch),
);

describe("Freestyle end to end through its module", () => {
	test("a session boots, runs, round-trips files, inventories, and is deleted then read absent", async () => {
		const account = freestyleAccount();
		const reads: string[] = [];
		const traced = Object.assign(
			async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
				reads.push(`${init?.method ?? "GET"} ${new URL(String(input)).pathname}`);
				return account.fetch(input, init);
			},
			{ preconnect: fetch.preconnect },
		);
		const driver = vendorDriver(freestyle, context, {
			vendor: freestyleVendor(context, traced),
			timing: { deletePollMs: 0 },
		});
		const leftover = `${MARKER_PREFIX}00000000-0000-0000-0000-000000000000`;
		await freestyleVendor(context, account.fetch).control.create(
			{ request, marker: leftover },
			{ signal: new AbortController().signal },
		);
		const session = await driver.create(request);
		expect(session.reportedArtifact).toEqual(context.resolvedArtifact);
		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.files?.writeText("/tmp/probe", "hello");
		expect(await session.files?.readFile("/tmp/probe")).toBe("hello");
		expect(await driver.inventory?.list()).toEqual({
			owned: [{ provider: "freestyle", id: "vm-1" }, session.sandboxRef],
			foreignCount: 0,
		});
		expect(account.vms.get("vm-1")?.slug).toBe(FREESTYLE_SLUG.toVendor(leftover));
		reads.length = 0;
		await session.destroy();
		expect(reads).toEqual([
			`DELETE /v5/vms/${session.sandboxRef.id}`,
			`GET /v5/vms/${session.sandboxRef.id}`,
		]);
		await driver.destroyById?.({ provider: "freestyle", id: "vm-1" });
		expect(account.vms.size).toBe(0);
	});
});

describe("Freestyle as a native-snapshot build target", () => {
	test("captures durable snapshots only without an expiry and reclaims every rejected capture", async () => {
		for (const field of ["ttlSeconds", "autoDeleteSeconds"]) {
			for (const expiry of [undefined, null, -1, 0, 10, -2]) {
				const { driver, calls } = fixture((path, method) => {
					if (path.endsWith("/snapshot"))
						return Response.json({ snapshotId: "sh-capture", snapshot: { [field]: expiry } });
					if (path === "/v5/snapshots/sh-capture" && method === "DELETE")
						return new Response(null, { status: 204 });
				});
				const session = await driver.create(request);
				const capture = driver.snapshots?.create(session, { retention: "durable" });
				if (expiry === undefined || expiry === null || expiry === -1) {
					await expect(capture).resolves.toEqual({ snapshotId: "sh-capture" });
					await driver.snapshots?.delete("sh-capture");
				} else await expect(capture).rejects.toThrow();
				expect(
					calls.some(
						(call) => call.method === "DELETE" && call.path === "/v5/snapshots/sh-capture",
					),
				).toBe(true);
				await session.destroy();
			}
		}
	});
	const stock = { kind: "baked", ref: "freestyle/ubuntu" } as const;
	const buildContext: DriverContext<"freestyle"> = { ...context, resolvedArtifact: stock };

	test("boots the stock alias only from a build context and skips the immutable-ID check", async () => {
		const { driver } = fixture(undefined, {}, buildContext);
		const session = await driver.create({ ...request, artifact: stock });
		expect(session.reportedArtifact).toBeUndefined();
		await session.destroy();
		// A benchmark context resolves an immutable ID, so the same request is refused there.
		const benchmark = fixture();
		await expect(benchmark.driver.create({ ...request, artifact: stock })).rejects.toMatchObject({
			code: "invalid-create-request",
		});
		expect(benchmark.calls).toHaveLength(0);
	});

	test("reads the immutable ID a build booted from the VM record", async () => {
		const { driver } = fixture(undefined, {}, buildContext);
		const session = await driver.create({ ...request, artifact: stock });
		expect(
			await snapshotBuild.bootedBase?.(session as never, { signal: AbortSignal.timeout(1000) }),
		).toBe("sh-test");
		await session.destroy();
		expect(snapshotBuild.stockBase({ FREESTYLE_API_KEY: "k" })).toBe("freestyle/ubuntu");
		expect(
			snapshotBuild.stockBase({ FREESTYLE_API_KEY: "k", FREESTYLE_BASE_SNAPSHOT_ID: "sh-base" }),
		).toBe("sh-base");
	});
});
