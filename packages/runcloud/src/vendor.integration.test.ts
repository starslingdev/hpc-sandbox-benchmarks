// run.cloud tested at the vendor seam: the adapter's translation over a fake account, the port
// contract, sessions through the package's own module, and the real transport's inventory envelope.
// Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is tested once
// in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateSandboxOptions, Sandbox } from "@run-cloud/sdk";
import { RunCloudError } from "@run-cloud/sdk";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isFailedCreateCleanupError } from "@sandbox-benchmarks/driver";
import { sdkStub, vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import runcloud, {
	RUNCLOUD_CREATE_CEILING_MS,
	RUNCLOUD_PROVENANCE,
	RUNCLOUD_SANDBOX_ID,
	runcloudTransport,
} from "./driver.ts";
import type { RuncloudTransport } from "./vendor.ts";
import { runcloudVendor } from "./vendor.ts";

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
	const hidden = new Set<string>();
	const calls: Array<{ name: string; input?: unknown }> = [];
	const account = sdkStub<RuncloudTransport["sandboxes"], Row>(
		({ rows, row, run }) => ({
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
				const found = rows.get(id);
				if (found) {
					found.gets += 1;
					if (found.state === "building_image" && found.gets >= (options.readyAfterGets ?? 1)) {
						found.state = options.bootsTo?.state ?? "running";
						if (options.bootsTo?.lastError) found.last_error = options.bootsTo.lastError;
					}
					if (found.state === "destroying" && found.gets > (options.removalAfterGets ?? 1))
						found.state = "destroyed";
				}
				return view(id);
			},
			destroy: async (id: string) => {
				calls.push({ name: "destroy", input: id });
				const refusal = options.destroyErrors?.shift();
				if (refusal) throw refusal;
				const found = row(id);
				if (found.state === "destroyed") throw new RunCloudError(404, "sandbox not found");
				found.state = "destroying";
				found.gets = 0;
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
				if (rows.get(id)?.state !== "running")
					throw new RunCloudError(4409, "sandbox is not running");
				const { exitCode, stdout, stderr } = run(id, command);
				return { exit_code: exitCode, exitCode, stdout, stderr };
			},
		}),
		{
			notFound: () => new RunCloudError(404, "sandbox not found"),
			...(options.diskGb !== undefined && { diskGb: options.diskGb }),
		},
	);
	const { rows } = account;
	// Creation times follow allocation order (the account never forgets a sandbox, even destroyed).
	const allocate = (name: string | null, state = "running", createdAt = rows.size) =>
		account.add({
			name,
			state,
			milliCpu: 4_000,
			memMb: 8_192,
			createdAt: new Date(createdAt * 1000).toISOString(),
			gets: 0,
		}).id;
	const view = (id: string): Sandbox => {
		const { gets: _, ...sandbox } = account.row(id);
		return sandbox;
	};
	const transport: RuncloudTransport = {
		sandboxes: account.sdk,
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

vendorContract("runcloud adapter", runcloud, () =>
	vendorOver(runcloudAccount({ pageSize: 1, readyAfterGets: 2 })),
);

describe("run.cloud end to end through its module", () => {
	test("a recovered session preserves its list probe, executes, inventories and reaches a tombstone", async () => {
		const account = runcloudAccount({ creates: [{ lost: true }], readyAfterGets: 2, pageSize: 1 });
		account.allocate("foreign");
		const driver = driverOver(account);
		const session = await driver.create(request);
		expect(account.names("create")).toHaveLength(1);
		await driver.probes?.list?.();
		expect(account.calls.at(-1)).toEqual({ name: "list", input: undefined });
		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("sleep 120");
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef],
			foreignCount: 1,
		});
		await session.destroy();
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});
	test("empty reconciliation retains ownership until a lost allocation becomes visible", async () => {
		const account = runcloudAccount({ creates: [{ lost: true, hidden: true }] });
		const driver = driverOver(account);
		const failure = await driver.create(request).catch((error: unknown) => error);
		if (!isFailedCreateCleanupError(failure)) throw new Error("create lost its cleanup owner");
		await expect(failure.cleanup()).rejects.toThrow();
		account.reveal();
		await failure.cleanup();
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 0 });
		expect(account.names("create")).toHaveLength(1);
	});

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
