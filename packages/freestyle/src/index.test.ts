import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { FailedCreateCleanupError } from "@sandbox-benchmarks/driver";
import type { VendorTiming } from "@sandbox-benchmarks/driver/vendor";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { BENCH_JOB_CEILING_MINUTES } from "@sandbox-benchmarks/schema";
import { TARGET_SPEC } from "@sandbox-benchmarks/schema/target-spec";
import { FreestyleApiError } from "freestyle";
import freestyle, { snapshotBuild } from "./index.ts";
import {
	FREESTYLE_OWNER_KEY,
	FREESTYLE_SLUG,
	FREESTYLE_VM_TTL_SECONDS,
	freestyleCommand,
	freestyleVendor,
} from "./vendor.ts";

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
	const vms = new Map<
		string,
		ReturnType<typeof row> & { slug: string; files: Map<string, string> }
	>();
	let next = 0;
	const fetchImpl = Object.assign(
		async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? "GET";
			const [, , , name, verb, action] = url.pathname.split("/");
			const vm =
				name === undefined
					? undefined
					: (vms.get(name) ?? [...vms.values()].find((candidate) => candidate.slug === name));
			const view = (found: NonNullable<typeof vm>) => {
				const { files: _, ...rest } = found;
				return rest;
			};
			if (name === undefined && method === "POST") {
				const body = JSON.parse(String(init?.body));
				const id = `vm-${++next}`;
				const created = {
					...row(id, "running", body.metadata[FREESTYLE_OWNER_KEY]),
					slug: body.slug,
				};
				vms.set(id, { ...created, files: new Map() });
				return Response.json(view(vms.get(id) as NonNullable<typeof vm>));
			}
			if (name === undefined) {
				const all = [...vms.values()].map(view);
				const offset = Number(url.searchParams.get("offset") ?? 0);
				return Response.json({ vms: all.slice(offset, offset + 1), totalCount: all.length });
			}
			if (!vm) return missing();
			if (method === "DELETE" && verb === undefined) {
				vms.delete(vm.id);
				return new Response(null, { status: 204 });
			}
			if (verb === "exec-await") {
				const command = String(JSON.parse(String(init?.body)).command);
				return Response.json({
					statusCode: command.includes("exit 7") ? 7 : 0,
					stdout: "",
					stderr: "",
				});
			}
			const path = url.searchParams.get("path") ?? "";
			if (verb === "fs" && action === "write") {
				vm.files.set(path, new TextDecoder().decode(init?.body as Uint8Array));
				return Response.json({});
			}
			if (verb === "fs" && action === "read") return new Response(vm.files.get(path) ?? "");
			if (verb === "fs" && action === "exists")
				return Response.json({ exists: vm.files.has(path) });
			return Response.json(view(vm));
		},
		{ preconnect: fetch.preconnect },
	);
	return { fetch: fetchImpl, vms };
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

describe("Freestyle native SDK driver", () => {
	test("retains the control-plane snapshot observation for publication evidence", async () => {
		const { driver } = fixture();
		const session = await driver.create(request);
		expect(session.reportedArtifact).toEqual(context.resolvedArtifact);
		await session.destroy();
	});
	test("exec excludes stock NVM globals, including Mastra's missing language server", async () => {
		const home = mkdtempSync(join(tmpdir(), "freestyle-path-"));
		const nvmBin = join(home, ".nvm/versions/node/v22/bin");
		mkdirSync(nvmBin, { recursive: true });
		const server = join(nvmBin, "typescript-language-server");
		writeFileSync(
			join(home, "stock-env"),
			`export PATH='${nvmBin}':$PATH\nexport NODE_OPTIONS=poison NODE_PATH=stock NVM_BIN=stock\n`,
		);
		writeFileSync(server, "#!/bin/sh\nexit 0\n");
		chmodSync(server, 0o755);
		const { driver } = fixture(async (path, _method, body) => {
			if (!path.endsWith("/exec-await")) return;
			const process = Bun.spawn(
				["/bin/bash", "--noprofile", "--norc", "-c", String(body.command)],
				{
					env: { HOME: home, PATH: `${nvmBin}:/usr/bin:/bin`, BASH_ENV: join(home, "stock-env") },
					stdout: "pipe",
					stderr: "pipe",
				},
			);
			return Response.json({
				statusCode: await process.exited,
				stdout: await new Response(process.stdout).text(),
				stderr: await new Response(process.stderr).text(),
			});
		});
		try {
			const session = await driver.create(request);
			const result = await session.exec(
				// biome-ignore lint/suspicious/noTemplateCurlyInString: expanded by the guest shell
				'if command -v typescript-language-server; then exit 1; fi; test -z "${NODE_OPTIONS:-}${NODE_PATH:-}${NVM_BIN:-}" && printf clean',
			);
			expect(result.exit).toEqual({ kind: "exited", code: 0 });
			expect(result.stdout).toBe("clean");
			await session.destroy();
		} finally {
			rmSync(home, { recursive: true, force: true });
		}
	});

	test("deletes a VM if its reported boot snapshot differs from the frozen request", async () => {
		let deleted = false;
		const { driver, calls } = fixture((path, method) => {
			if (method === "DELETE") deleted = true;
			if (path === "/v5/vms/vm-test" && method === "GET" && !deleted)
				return Response.json({ ...row(), snapshotId: "sh-unexpected" });
		});
		await expect(driver.create(request)).rejects.toThrow("requested immutable snapshot");
		expect(calls.some((call) => call.method === "DELETE")).toBe(true);
	});
	test("keeps VM lifetime independent of a short create deadline", async () => {
		const { driver, calls } = fixture();
		const session = await driver.create({ ...request, deadlineMs: 1_000 });
		const create = calls.find((call) => call.path === "/v5/vms");
		expect(create?.body.ttlSeconds).toBeGreaterThan(BENCH_JOB_CEILING_MINUTES * 60);
		await session.destroy();
	});

	test("exposes an array of VM records to the lifecycle list consumer", async () => {
		const { driver } = fixture((path) =>
			path === "/v5/vms?limit=100&offset=0"
				? Response.json({ vms: [row()], totalCount: 1 })
				: undefined,
		);
		expect(await driver.probes?.list?.()).toEqual([row()]);
	});

	test("bounds a pending DELETE before acknowledgement", async () => {
		let deleteSignal: AbortSignal | undefined;
		const { driver } = fixture(
			(path, method, _body, init) => {
				if (path !== "/v5/vms/vm-test" || method !== "DELETE") return;
				deleteSignal = init?.signal ?? undefined;
				return new Promise((_resolve, reject) => {
					deleteSignal?.addEventListener("abort", () => reject(deleteSignal?.reason), {
						once: true,
					});
				});
			},
			{ deleteTimeoutMs: 30 },
		);
		await expect(
			driver.destroyById?.({ provider: "freestyle", id: "vm-test" }),
		).rejects.toMatchObject({ code: "destroy-failed" });
		expect(deleteSignal?.aborted).toBe(true);
	});

	test("bounds every inventory page of a multi-page scan", async () => {
		let secondSignal: AbortSignal | undefined;
		const { driver } = fixture(
			(path, _method, _body, init) => {
				if (path === "/v5/vms?limit=100&offset=0")
					return Response.json({ vms: [row()], totalCount: 2 });
				if (path !== "/v5/vms?limit=100&offset=1") return;
				secondSignal = init?.signal ?? undefined;
				return new Promise((_resolve, reject) => {
					secondSignal?.addEventListener("abort", () => reject(secondSignal?.reason), {
						once: true,
					});
				});
			},
			{ controlTimeoutMs: 30 },
		);
		await expect(driver.inventory?.list()).rejects.toThrow();
		expect(secondSignal?.aborted).toBe(true);
	});

	test("does not turn a lost allocation followed by 404 into confirmed absence", async () => {
		let appeared = false;
		let created: Record<string, unknown> = {};
		const { driver, calls } = fixture((path, method, body) => {
			if (path === "/v5/vms" && method === "POST") {
				created = body;
				throw new Error("lost response");
			}
			const marker = (created.metadata as Record<string, string>)?.[FREESTYLE_OWNER_KEY];
			if (path === `/v5/vms/${created.slug}`)
				return appeared ? Response.json(row("vm-test", "running", marker)) : missing();
		});
		const failure = await driver.create(request).catch((caught: unknown) => caught);
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		// The held cleanup's diagnostic stays opaque (it can carry vendor errors); its effect is checked.
		const held = failure as FailedCreateCleanupError;
		await expect(held.cleanup()).rejects.toMatchObject({ code: "destroy-failed" });
		expect(calls.some((call) => call.method === "DELETE")).toBe(false);
		appeared = true;
		await held.cleanup();
		expect(calls.some((call) => call.method === "DELETE")).toBe(true);
		// Torn down, the attempt has its verdict: a later empty lookup is absence.
		appeared = false;
		await held.cleanup();
	});

	test("does not treat a missing background poll record as allocation rejection", async () => {
		const { driver } = fixture((path, method) => {
			if (path === "/v5/vms" && method === "POST")
				return Response.json({ requestId: "request-lost" }, { status: 202 });
			if (
				path === "/v5/background-requests/request-lost" ||
				path.startsWith("/v5/vms/sandbox-benchmarks-")
			)
				return missing();
		});
		const failure = await driver.create(request).catch((caught: unknown) => caught);
		// Held as a cleanup failure, not reported as a create the vendor refused.
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		await expect((failure as FailedCreateCleanupError).cleanup()).rejects.toMatchObject({
			code: "destroy-failed",
		});
	});

	test("session files do not retain an expired create signal", async () => {
		const controller = new AbortController();
		const { driver } = fixture((path, _method, _body, init) => {
			if (!path.includes("/fs/exists")) return;
			init?.signal?.throwIfAborted();
			return Response.json({ exists: true });
		});
		const session = await driver.create(request, { signal: controller.signal });
		controller.abort(new Error("create operation finished"));
		expect(await session.files?.exists("/tmp/probe")).toBe(true);
		await session.destroy();
	});

	test("cancelling accepted synchronous exec waits until the command settles", async () => {
		const controller = new AbortController();
		let finish: ((result: Response) => void) | undefined;
		let entered: (() => void) | undefined;
		const started = new Promise<void>((resolve) => {
			entered = resolve;
		});
		const { driver } = fixture((path, _method, body) => {
			if (!path.endsWith("/exec-await") || body.command !== freestyleCommand("work")) return;
			entered?.();
			return new Promise((resolve) => {
				finish = resolve;
			});
		});
		const session = await driver.create(request);
		let settled = false;
		const execution = session.exec("work", { signal: controller.signal });
		const outcome = execution.then(
			() => {
				settled = true;
				return "completed";
			},
			() => {
				settled = true;
				return "cancelled";
			},
		);
		await started;
		controller.abort(new Error("cancel work"));
		await Promise.resolve();
		expect(settled).toBe(false);
		finish?.(Response.json({ statusCode: 0, stdout: "", stderr: "" }));
		expect(await outcome).toBe("cancelled");
		await session.destroy();
	});

	test("maps the target shape, opens only outbound traffic, and bounds orphan lifetime", async () => {
		const { driver, calls } = fixture();
		const session = await driver.create(request);
		const create = calls.find((call) => call.path === "/v5/vms");
		expect(create?.body).toMatchObject({
			snapshotId: "sh-test",
			idleTimeoutSeconds: -1,
			autoDeleteSeconds: 0,
			ttlSeconds: FREESTYLE_VM_TTL_SECONDS,
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
			command: freestyleCommand("true"),
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
			{ ...request, artifact: { kind: "baked" as const, ref: "freestyle/ubuntu" } },
			{ ...request, env: { INJECT: "value" } },
			{ ...request, gpu: { model: "A100", count: 1 } },
		])
			await expect(driver.create(input)).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(calls).toHaveLength(0);
	});

	test("preserves split output and nonzero exits; a timeout never becomes exit zero", async () => {
		const { driver } = fixture((path, _method, body) => {
			if (!path.endsWith("/exec-await") || body.command === freestyleCommand("true")) return;
			return Response.json({
				stdout: "out\n",
				stderr: "err\n",
				statusCode: body.command === freestyleCommand("timeout") ? null : 7,
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
		for (const owner of ["attempt", "someone-else"]) {
			let created: { slug?: unknown; marker?: unknown } = {};
			const { driver, calls } = fixture((path, method, body) => {
				if (path === "/v5/vms" && method === "POST") {
					created = {
						slug: body.slug,
						marker: (body.metadata as Record<string, unknown>)[FREESTYLE_OWNER_KEY],
					};
					throw new Error("lost response");
				}
				if (path === `/v5/vms/${created.slug}`)
					return Response.json(
						row("vm-test", "running", owner === "attempt" ? String(created.marker) : owner),
					);
			});
			const failure = await driver.create(request).catch((caught: unknown) => caught);
			if (owner === "attempt") {
				// Recovered and torn down: the create fails plainly, holding nothing.
				expect(failure).not.toBeInstanceOf(FailedCreateCleanupError);
				expect(calls.some((call) => call.method === "DELETE")).toBe(true);
			} else {
				expect(failure).toBeInstanceOf(FailedCreateCleanupError);
				expect(calls.some((call) => call.method === "DELETE")).toBe(false);
			}
		}
	});

	test("classifies API refusals without interpreting arbitrary error prose", () => {
		const { refused } = freestyleVendor(context).control;
		expect(
			refused?.(new FreestyleApiError(429, { code: "RATE_LIMITED", message: "wait" })),
		).toEqual({ retryable: true });
		expect(
			refused?.(new FreestyleApiError(401, { code: "UNAUTHORIZED", message: "bad key" })),
		).toEqual({ retryable: false });
		expect(refused?.(new Error("401 429"))).toBeUndefined();
		expect(
			refused?.(new FreestyleApiError(500, { code: "INTERNAL_ERROR", message: "lost" })),
		).toBeUndefined();
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

describe("Freestyle as a native-snapshot build target", () => {
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

	test("captures a durable release snapshot without automatic deletion", async () => {
		const { driver, calls } = fixture((path) =>
			path === "/v5/vms/vm-test/snapshot"
				? Response.json({ snapshotId: "sh-release", snapshot: { autoDeleteSeconds: null } })
				: undefined,
		);
		const session = await driver.create(request);
		expect(await driver.snapshots?.create(session, { retention: "durable" })).toEqual({
			snapshotId: "sh-release",
		});
		expect(calls.find((call) => call.path.endsWith("/snapshot"))?.body).toEqual({
			autoDeleteSeconds: -1,
		});
		await session.destroy();
	});

	test("deletes and refuses a durable snapshot the plan would expire", async () => {
		const { driver, calls } = fixture((path) =>
			path === "/v5/vms/vm-test/snapshot"
				? Response.json({ snapshotId: "sh-test", snapshot: { ttlSeconds: 86_400 } })
				: undefined,
		);
		const session = await driver.create(request);
		const failure = await driver.snapshots
			?.create(session, { retention: "durable" })
			.catch((error: unknown) => error);
		expect(failure).toMatchObject({ code: "snapshot-failed" });
		expect(
			calls.some((call) => call.method === "DELETE" && call.path === "/v5/snapshots/sh-test"),
		).toBe(true);
		await session.destroy();
	});
});
