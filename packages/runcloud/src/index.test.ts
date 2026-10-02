// run.cloud tested at the vendor seam: the adapter's translation over a fake account, the port
// contract, sessions through the package's own module, and the real transport's inventory envelope.
// Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is tested once
// in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateSandboxOptions, Sandbox } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { FailedCreateCleanupError, isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { kitPort, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import runcloud, {
	RUNCLOUD_CREATE_CEILING_MS,
	RUNCLOUD_PROVENANCE,
	RUNCLOUD_SANDBOX_ID,
	runcloudTransport,
} from "./index.ts";
import type { RuncloudTransport } from "./vendor.ts";
import { RUNCLOUD_NAME, RUNCLOUD_RECONCILE_ATTEMPTS, runcloudVendor } from "./vendor.ts";

const KEY = "rc_test-key";
const context: DriverContext<"runcloud"> = {
	env: { RUN_CLOUD_API_KEY: KEY },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v1" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });
const marker = `${MARKER_PREFIX}11111111-1111-1111-1111-111111111111`;

type Row = Sandbox & { gets: number; last_error?: string };

/**
 * A whole run.cloud account: creates start in `building_image` and run after a few reads, a
 * DELETE leaves the sandbox `destroying` for a few reads and then a `destroyed` tombstone (which
 * every listing keeps), and inventory pages are the raw `{ items, nextCursor }` envelope.
 */
function runcloudAccount(
	options: {
		readonly pageSize?: number;
		readonly readyAfterGets?: number;
		/** The state a booting sandbox settles in instead of `running`, with the vendor's detail. */
		readonly bootsTo?: { readonly state: string; readonly lastError?: string };
		readonly removalAfterGets?: number;
		readonly diskGb?: number;
		/** DELETE refusals, in order, before the account accepts one. */
		readonly destroyErrors?: Error[];
		/** Create outcomes in order: a refusal, or a response lost after (hidden) allocation. */
		readonly creates?: Array<RunCloudError | { readonly lost: true; readonly hidden?: boolean }>;
	} = {},
) {
	const rows = new Map<string, Row>();
	const hidden = new Set<string>();
	const calls: Array<{ name: string; input?: unknown }> = [];
	let next = 0;
	const allocate = (name: string | null, state = "running", createdAt = next) => {
		const id = `sb-${++next}`;
		rows.set(id, {
			id,
			name,
			state,
			milliCpu: 4_000,
			memMb: 8_192,
			createdAt: new Date(createdAt * 1000).toISOString(),
			gets: 0,
		});
		return id;
	};
	const view = (id: string): Sandbox => {
		const row = rows.get(id);
		if (!row) throw new RunCloudError(404, "sandbox not found");
		const { gets: _, ...sandbox } = row;
		return sandbox;
	};
	const sandboxes = {
		create: async (input: CreateSandboxOptions) => {
			calls.push({ name: "create", input });
			const outcome = options.creates?.shift();
			if (outcome instanceof RunCloudError) throw outcome;
			const id = allocate(input.name ?? null, "building_image");
			if (outcome?.lost) {
				if (outcome.hidden) hidden.add(id);
				throw new TypeError("socket hang up after the vendor accepted the create");
			}
			return view(id);
		},
		get: async (id: string) => {
			calls.push({ name: "get", input: id });
			const row = rows.get(id);
			if (row) {
				row.gets += 1;
				if (row.state === "building_image" && row.gets >= (options.readyAfterGets ?? 1)) {
					row.state = options.bootsTo?.state ?? "running";
					if (options.bootsTo?.lastError) row.last_error = options.bootsTo.lastError;
				}
				if (row.state === "destroying" && row.gets > (options.removalAfterGets ?? 1))
					row.state = "destroyed";
			}
			return view(id);
		},
		destroy: async (id: string) => {
			calls.push({ name: "destroy", input: id });
			const refusal = options.destroyErrors?.shift();
			if (refusal) throw refusal;
			const row = rows.get(id);
			if (!row || row.state === "destroyed") throw new RunCloudError(404, "sandbox not found");
			row.state = "destroying";
			row.gets = 0;
		},
		list: async ({ name }: { name?: string } = {}) => {
			calls.push({ name: "list", input: name });
			// A loose server-side filter: the adapter must match the name exactly itself.
			return [...rows.keys()]
				.filter((id) => !hidden.has(id) && (rows.get(id)?.name ?? "").startsWith(name ?? ""))
				.map(view);
		},
		exec: async (id: string, command: string) => {
			calls.push({ name: "exec", input: command });
			const row = rows.get(id);
			if (row?.state !== "running") throw new RunCloudError(4409, "sandbox is not running");
			const answer = (exitCode: number, stdout = "") => ({
				exit_code: exitCode,
				exitCode,
				stdout,
				stderr: "",
			});
			if (command.startsWith("df -Pk"))
				return answer(0, `${Math.round((options.diskGb ?? 80) * 1024 * 1024)}\n`);
			const exit = /^sh -c 'exit (\d+)'$/.exec(command);
			return exit ? answer(Number(exit[1])) : answer(0, "ok\n");
		},
	};
	const transport: RuncloudTransport = {
		sandboxes: sandboxes as unknown as RuncloudTransport["sandboxes"],
		page: async (cursor) => {
			calls.push({ name: "page", input: cursor });
			const all = [...rows.keys()];
			const from = cursor === undefined ? 0 : Number(cursor);
			const size = options.pageSize ?? 200;
			return {
				items: all.slice(from, from + size).map((id) => {
					const { id: _, state, name } = view(id);
					return { id, state, name };
				}),
				nextCursor: from + size < all.length ? String(from + size) : null,
			};
		},
	};
	return {
		transport,
		rows,
		calls,
		allocate,
		reveal: () => hidden.clear(),
		names: (name: string) => calls.filter((call) => call.name === name),
	};
}

const vendorOver = (account: ReturnType<typeof runcloudAccount>) =>
	runcloudVendor(context, account.transport, { sleep: async () => {} });

/** The package's own module, lowered over a fake account instead of the real SDK. */
function driverOver(account: ReturnType<typeof runcloudAccount>) {
	return vendorDriver(runcloud, context, {
		vendor: vendorOver(account),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
	});
}

describe("run.cloud translation", () => {
	test("creates the resolved image at the requested size, named and keyed by its marker", async () => {
		const account = runcloudAccount();
		const created = await vendorOver(account).control.create({ request, marker }, op());
		expect(created).toMatchObject({ phase: "pending", marker });
		const name = RUNCLOUD_NAME.toVendor(marker);
		expect(account.names("create")[0]?.input).toEqual({
			name,
			idempotencyKey: name,
			image: context.resolvedArtifact.ref,
			cpu: 4,
			memory: 8 * 1024,
			disk: 40,
			idlePauseSeconds: 3 * 60 * 60,
			timeoutSeconds: 3 * 60 * 60,
		});
	});

	test("reads tombstones as gone, a pending delete as live, and marks boots the host gave up on", async () => {
		const account = runcloudAccount({ readyAfterGets: 1_000 });
		const { control } = kitPort(vendorOver(account));
		const read = (state: string) => control.get(account.allocate("x", state), op());
		expect(await read("running")).toMatchObject({ phase: "ready" });
		expect(await read("building_image")).toMatchObject({ phase: "pending" });
		expect(await read("destroyed")).toMatchObject({ phase: "gone", retryCreate: true });
		expect(await read("destroying")).toMatchObject({ phase: "deleting", retryCreate: true });
		for (const state of ["failed", "interrupted"])
			expect(await read(state)).toMatchObject({ phase: "failed", retryCreate: true });
		expect(await read("stopped")).not.toHaveProperty("retryCreate");
		expect(await control.get("sb-missing", op())).toBeNull();
		expect(await control.remove("sb-missing", op())).toBe("removed");
		expect(await control.remove(account.allocate("x"), op())).toBe("accepted");
	});

	test("a lost create response is answered by reading the name, never by replaying the create", async () => {
		const account = runcloudAccount({ creates: [{ lost: true }] });
		const name = RUNCLOUD_NAME.toVendor(marker);
		const older = account.allocate(name, "running", -10); // the server allocated twice
		account.allocate(`${name}-different`); // a fuzzy match is never adopted
		account.allocate(name, "destroyed", -20); // nor is a tombstone
		const adopted = await vendorOver(account).control.create({ request, marker }, op());
		expect(adopted).toMatchObject({ id: older, marker });
		expect(account.names("create")).toHaveLength(1);
		expect(account.names("list").map((call) => call.input)).toEqual([name]);
	});

	test("an unanswered create looks for the whole window; a refusal gets one confirming look", async () => {
		const lost = runcloudAccount({ creates: [{ lost: true, hidden: true }] });
		await expect(vendorOver(lost).control.create({ request, marker }, op())).rejects.toThrow(
			"socket hang up",
		);
		expect(lost.names("list")).toHaveLength(RUNCLOUD_RECONCILE_ATTEMPTS);

		const refused = runcloudAccount({ creates: [new RunCloudError(429, "quota reached")] });
		const { control } = vendorOver(refused);
		const failure = await control.create({ request, marker }, op()).catch((caught) => caught);
		expect(failure).toMatchObject({
			code: "create-failed",
			vendorHttpStatus: 429,
			vendorMessage: "quota reached",
		});
		expect(refused.names("list")).toHaveLength(1);
		expect(control.refused?.(failure)).toEqual({ retryable: true });
		expect(control.refused?.(new RunCloudError(422, "invalid image"))).toEqual({
			retryable: false,
		});
		for (const status of [408, 409, 503])
			expect(control.refused?.(new RunCloudError(status, "unproven"))).toBeUndefined();
		expect(control.refused?.(new Error("HTTP 429 in prose"))).toBeUndefined();
	});

	test("a create that never answers is bounded by the caller", async () => {
		const transport = runcloudAccount().transport;
		const stalled: RuncloudTransport = {
			...transport,
			sandboxes: { ...transport.sandboxes, create: () => new Promise<never>(() => {}) },
		};
		const { control } = runcloudVendor(context, stalled, { sleep: async () => {} });
		await expect(
			control.create({ request, marker }, { signal: AbortSignal.timeout(5) }),
		).rejects.toThrow();
	});
});

vendorContract("runcloud adapter", runcloud, () =>
	vendorOver(runcloudAccount({ pageSize: 1, readyAfterGets: 2 })),
);

describe("run.cloud end to end through its module", () => {
	test("declares identity, the shell-detach policy, the create ceiling, and cost evidence", async () => {
		expect(runcloud.id).toBe("runcloud");
		expect(runcloud.provenance).toEqual(RUNCLOUD_PROVENANCE);
		expect(runcloud.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(runcloud.createBudget).toEqual({
			owner: "harness",
			timeoutMs: RUNCLOUD_CREATE_CEILING_MS,
		});
		expect(RUNCLOUD_CREATE_CEILING_MS).toBeGreaterThan(20 * 60_000);
		expect(RUNCLOUD_SANDBOX_ID.allows("sb-test")).toBe(true);
		const capture = runcloud.costEvidence?.captureAfterTeardown;
		if (!capture) throw new Error("run.cloud declares no cost evidence");
		const cell = { runId: "run-1", providerId: "runcloud", suite: "cpu-node" } as const;
		const attemptedAt = "2026-08-08T00:00:00.000Z";
		expect(
			await capture({
				cell,
				providerId: "runcloud",
				sandboxId: "sb-1",
				teardown: { completed: true, attemptedAt, completedAt: attemptedAt },
			}),
		).toMatchObject({ kind: "missing", reason: "not_sandbox_scoped" });
		expect(
			await capture({
				cell,
				providerId: "runcloud",
				sandboxId: "sb-1",
				teardown: { completed: false, attemptedAt },
			}),
		).toMatchObject({ kind: "missing", reason: "sandbox_teardown_unconfirmed" });
	});

	test("a session boots, proves its disk quota within the overhead, runs, inventories and is destroyed", async () => {
		// 39.30 GiB visible on a 40 GiB quota is the filesystem's own metadata, measured live.
		const account = runcloudAccount({
			readyAfterGets: 3,
			removalAfterGets: 2,
			diskGb: 39.3,
			pageSize: 2,
		});
		account.allocate("someone-else"); // another tenant's sandbox
		account.allocate(RUNCLOUD_NAME.toVendor(`${MARKER_PREFIX}old`), "destroyed"); // a tombstone
		const driver = driverOver(account);
		const session = await driver.create(request);
		expect(account.rows.get(session.sandboxRef.id)?.gets).toBe(3);
		expect(account.names("exec")[0]?.input).toBe("df -Pk / | awk 'NR==2 {print $2}'");
		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });

		const stopped = account.allocate(RUNCLOUD_NAME.toVendor(`${MARKER_PREFIX}stopped`), "stopped");
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "runcloud", id: stopped }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "runcloud", id: stopped });
		// A DELETE is not removal: teardown reads until the tombstone appears.
		const before = account.calls.length;
		await session.destroy();
		expect(account.calls.slice(before).map((call) => call.name)).toEqual([
			"destroy",
			"get",
			"get",
			"get",
		]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("uses one deadline for the entire inventory rather than resetting it for every page", async () => {
		const account = runcloudAccount({ pageSize: 1 });
		for (let i = 0; i < 10; i++) account.allocate(`someone-else-${i}`);
		const page = account.transport.page;
		// Every page answers well inside its own bound; together they outlast the inventory's.
		account.transport.page = async (cursor, signal) => {
			await Bun.sleep(40);
			return page(cursor, signal);
		};
		const driver = vendorDriver(runcloud, context, {
			vendor: vendorOver(account),
			timing: { controlTimeoutMs: 1_000, inventoryTimeoutMs: 100 },
		});
		await expect(driver.inventory?.list()).rejects.toMatchObject({ code: "probe-failed" });
		expect(account.names("page").length).toBeLessThan(10);
	});

	test("a DELETE refused by the network, an outage or a conflict is asked again; a definitive one is not", async () => {
		const connectionReset = Object.assign(new Error("socket closed"), { code: "ECONNRESET" });
		const account = runcloudAccount({
			destroyErrors: [
				new TypeError("fetch failed"),
				connectionReset,
				new DOMException("timed out", "TimeoutError"),
				new RunCloudError(503, "unavailable"),
				new RunCloudError(409, "busy"),
			],
		});
		const session = await driverOver(account).create(request);
		await session.destroy();
		expect(account.names("destroy")).toHaveLength(6);
		expect(account.rows.get(session.sandboxRef.id)?.state).toBe("destroyed");

		const { transient } = vendorOver(account).control;
		for (const code of [408, 429, 500])
			expect(transient?.(new RunCloudError(code, "x"))).toBe(true);
		for (const code of [400, 403, 404])
			expect(transient?.(new RunCloudError(code, "x"))).toBe(false);
		expect(transient?.(new DOMException("caller stopped", "AbortError"))).toBe(false);
		// Node's AbortError carries a string code, like a connection error, but is the caller's stop.
		const nodeAbort = Object.assign(new Error("The operation was aborted"), {
			name: "AbortError",
			code: "ABORT_ERR",
		});
		expect(transient?.(nodeAbort)).toBe(false);
		expect(transient?.(new Error("response did not match the schema"))).toBe(false);
	});

	test("an allocation short of the request by more than 3% is refused and destroyed", async () => {
		// 38.7 GiB of a 40 GiB quota is short of the 38.8 GiB the formatting allowance permits.
		const account = runcloudAccount({ diskGb: 38.7 });
		await expect(driverOver(account).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "runcloud",
		});
		expect(account.rows.get("sb-1")?.state).toBe("destroyed");
	});

	test("a boot the host gave up on keeps the vendor's detail and is retryable once destroyed", async () => {
		const corrupt = runcloudAccount({
			bootsTo: { state: "failed", lastError: `ext4 corrupt ${KEY}` },
		});
		const failure = await driverOver(corrupt)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed" });
		expect(failure.message).toContain("ext4 corrupt");
		expect(failure.message).not.toContain(KEY);
		expect(isRetryableDriverCreate(failure)).toBe(true);
		expect(corrupt.rows.get("sb-1")?.state).toBe("destroyed");

		// A clean stop says nothing about the host giving up.
		const stopped = runcloudAccount({ bootsTo: { state: "stopped" } });
		const stop = await driverOver(stopped)
			.create(request)
			.catch((caught) => caught);
		expect(isRetryableDriverCreate(stop)).toBe(false);
		expect(stopped.rows.get("sb-1")?.state).toBe("destroyed");
	});

	test("a lost create no lookup can see stays held, and its held cleanup removes it once visible", async () => {
		const account = runcloudAccount({ creates: [{ lost: true, hidden: true }] });
		const failure = await driverOver(account)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toBeInstanceOf(FailedCreateCleanupError);
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(failure.locator).toMatchObject({ kind: "marker", key: "name" });
		account.reveal();
		await failure.cleanup();
		expect(account.rows.get("sb-1")?.state).toBe("destroyed");
	});

	test("the default module refuses artifact, accelerator, and environment drift before any call", async () => {
		const driver = runcloud.driver(context);
		for (const invalid of [
			{ ...request, artifact: { kind: "image" as const, ref: "ubuntu:24.04" } },
			{ ...request, gpu: { model: "H100", count: 1 } },
			{ ...request, env: { X: "1" } },
		])
			await expect(driver.create(invalid)).rejects.toMatchObject({
				code: "invalid-create-request",
				provider: "runcloud",
			});
	});
});

describe("run.cloud's real transport", () => {
	test("reads the raw inventory envelope at 200 rows with encoded cursors, aborted with its caller", async () => {
		const urls: URL[] = [];
		const signals: Array<AbortSignal | undefined> = [];
		const fetchImpl = Object.assign(
			async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
				urls.push(new URL(String(input)));
				signals.push(init?.signal ?? undefined);
				expect(init?.method).toBe("GET");
				return Response.json({ items: [], nextCursor: null });
			},
			{ preconnect: fetch.preconnect },
		);
		const transport = runcloudTransport(KEY, fetchImpl);
		const caller = new AbortController();
		await transport.page(undefined, caller.signal);
		await transport.page("older+/=?&", caller.signal);
		expect(urls.map((url) => url.pathname)).toEqual([
			"/run-cloud/sandboxes",
			"/run-cloud/sandboxes",
		]);
		expect(urls.map((url) => url.searchParams.get("limit"))).toEqual(["200", "200"]);
		expect(urls.map((url) => url.searchParams.get("cursor"))).toEqual([null, "older+/=?&"]);
		caller.abort(new Error("cancel admission"));
		expect(signals.every((signal) => signal?.aborted)).toBe(true);
	});
});
