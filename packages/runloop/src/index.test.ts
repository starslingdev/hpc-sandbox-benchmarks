// Runloop tested at the vendor seam: the adapter's translation over a fake Devbox API, the port
// contract, and sessions through the package's own module. Kit behaviour (convergence, deadlines,
// the inventory partition, recovery mechanics) is tested once in the driver package.

import { describe, expect, test } from "bun:test";
import { NotFoundError } from "@runloop/api-client";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import runloop, { RUNLOOP_CREATE_TIMEOUT_MS } from "./index.ts";
import type { DevboxView, RunloopClient } from "./vendor.ts";
import {
	RUNLOOP_ATTEMPT_METADATA_KEY,
	RUNLOOP_OWNER_METADATA_KEY,
	runloopVendor,
} from "./vendor.ts";

const KEY = "rl_test-key";
const context: DriverContext<"runloop"> = {
	env: { RUNLOOP_API_KEY: KEY },
	artifact: { kind: "baked" },
	resolvedArtifact: { kind: "baked", ref: "sandbox-benchmarks-toolchain-v8" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: RUNLOOP_CREATE_TIMEOUT_MS,
};
type Execution = Partial<{
	status: string;
	exit_status: number | null;
	stdout: string;
	stderr: string;
	stdout_truncated: boolean;
}>;

/**
 * A whole Runloop account: creates start `provisioning` and run after a few retrieves or at once
 * under the long poll (which, like the SDK, rejects a Devbox that settled elsewhere), a forced
 * shutdown leaves a `shutdown` tombstone (Runloop never forgets a Devbox), listings page by the
 * last id, and each Devbox has a file store its commands and file API share.
 */
function runloopAccount(
	options: {
		readonly readyAfterRetrieves?: number;
		readonly pageSize?: number;
		readonly diskCapacityGb?: number;
		/** The first create allocates and then loses its response. */
		readonly ambiguousFirstCreate?: boolean;
		/** Booting Devboxes end in `failure` instead of running. */
		readonly bootFails?: boolean;
		readonly exec?: (command: string) => Execution;
		readonly executionId?: string;
	} = {},
) {
	const rows = new Map<string, DevboxView & { retrieves: number; files: Map<string, string> }>();
	const created: Array<Record<string, unknown>> = [];
	const shutdowns: unknown[] = [];
	const waits: Array<[string, unknown]> = [];
	const commands: string[] = [];
	let next = 0;
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (
		metadata: Record<string, string> = {},
		status: DevboxView["status"] = "running",
	) => {
		const id = `dbx_${++next}`;
		rows.set(id, {
			id,
			status,
			metadata,
			create_time_ms: 0,
			capabilities: [],
			launch_parameters: {},
			state_transitions: [],
			retrieves: 0,
			files: new Map(),
		} as unknown as DevboxView & { retrieves: number; files: Map<string, string> });
		return id;
	};
	const view = (id: string) => {
		const { retrieves: _, files: __, ...devbox } = rows.get(id) ?? {};
		return devbox as DevboxView;
	};
	const running = (id: string) => {
		const row = rows.get(id);
		if (row?.status !== "running") throw new Error(`devbox ${id} is not running`);
		return row;
	};
	const run = (id: string, command: string): Execution => {
		const files = running(id).files;
		commands.push(command);
		const custom = options.exec?.(command);
		if (custom) return custom;
		if (command.startsWith("df -Pk"))
			return {
				exit_status: 0,
				stdout: `${Math.round((options.diskCapacityGb ?? 39.6) * 1024 ** 2)}\n`,
			};
		const exit = /^sh -c 'exit (\d+)'$/.exec(command);
		if (exit) return { exit_status: Number(exit[1]), stdout: "" };
		const exists = /^test -e '(.*)'$/.exec(command);
		if (exists) return { exit_status: files.has(exists[1] ?? "") ? 0 : 1, stdout: "" };
		const echo = /^echo (\S+) > (\S+)$/.exec(command);
		if (echo) files.set(echo[2] ?? "", `${echo[1]}\n`);
		return { exit_status: 0, stdout: `ran: ${command}` };
	};
	const devboxes = {
		create: async (params: Record<string, unknown>) => {
			created.push(params);
			const id = allocate(params.metadata as Record<string, string>, "provisioning");
			if (ambiguous) {
				ambiguous = false;
				throw new TypeError("connection reset after the vendor accepted the create");
			}
			return view(id);
		},
		retrieve: async (id: string) => {
			const row = rows.get(id);
			if (!row) throw new NotFoundError(404, undefined, "devbox not found", {});
			row.retrieves += 1;
			if (row.status === "provisioning" && row.retrieves >= (options.readyAfterRetrieves ?? 1))
				row.status = options.bootFails ? "failure" : "running";
			return view(id);
		},
		awaitRunning: async (id: string, { longPoll }: { longPoll?: unknown }) => {
			waits.push([id, longPoll]);
			const row = rows.get(id);
			if (!row) throw new NotFoundError(404, undefined, "devbox not found", {});
			if (row.status === "provisioning") row.status = options.bootFails ? "failure" : "running";
			if (row.status !== "running")
				throw new Error(`Devbox ${id} is in non-running state ${row.status}`);
			return view(id);
		},
		shutdown: async (id: string, params: unknown) => {
			shutdowns.push([id, params]);
			const row = rows.get(id);
			if (!row) throw new NotFoundError(404, undefined, "devbox not found", {});
			row.status = "shutdown";
			return view(id);
		},
		list: async (query: { limit: number; starting_after?: string }) => {
			const all = [...rows.keys()];
			const from = query.starting_after === undefined ? 0 : all.indexOf(query.starting_after) + 1;
			const size = Math.min(query.limit, options.pageSize ?? 100);
			const items = all.slice(from, from + size).map(view);
			return { has_more: from + size < all.length, getPaginatedItems: () => items };
		},
		executeAndAwaitCompletion: async (id: string, params: { command: string }) => ({
			devbox_id: id,
			execution_id: "exe_1",
			status: "completed",
			stderr: "",
			...run(id, params.command),
		}),
		executeAsync: async (id: string, params: { command: string }) => {
			run(id, params.command);
			return { devbox_id: id, execution_id: options.executionId ?? "exe_bg", status: "running" };
		},
		readFileContents: async (id: string, params: { file_path: string }) => {
			const body = running(id).files.get(params.file_path);
			if (body === undefined) throw new Error(`${params.file_path}: no such file`);
			return body;
		},
		writeFileContents: async (id: string, params: { file_path: string; contents: string }) => {
			running(id).files.set(params.file_path, params.contents);
			return { devbox_id: id, exit_status: 0, stdout: "", stderr: "" };
		},
	};
	const client = { api: { devboxes } } as unknown as RunloopClient;
	return { client, rows, created, shutdowns, waits, commands, allocate };
}

/** The package's own module, lowered over a fake account instead of the real SDK. */
function driverOver(account: ReturnType<typeof runloopAccount>) {
	return vendorDriver(runloop, context, {
		vendor: runloopVendor(context, account.client),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
	});
}

vendorContract("runloop adapter", runloop, () =>
	runloopVendor(context, runloopAccount({ pageSize: 1, readyAfterRetrieves: 2 }).client),
);

describe("Runloop end to end through its module", () => {
	test("a session boots, proves disk within the allowance, runs, launches, files, inventories, and shuts down", async () => {
		// Only the long poll can observe this Devbox running: readiness is never a retrieve poll.
		const account = runloopAccount({ readyAfterRetrieves: 1_000, pageSize: 2 });
		account.allocate({}, "running"); // another tenant's Devbox
		account.allocate({}, "failure"); // a tombstone nobody holds
		const driver = driverOver(account);
		const session = await driver.create(request);
		expect(account.waits.map(([id]) => id)).toEqual([session.sandboxRef.id]);
		expect(account.rows.get(session.sandboxRef.id)?.retrieves).toBe(0);
		// 39.6 GiB visible on a 40 GB request is filesystem overhead, not a short allocation.
		expect(account.commands[0]).toBe("df -Pk / | awk 'NR==2 {print $2}'");

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await session.launch?.("echo done > /tmp/done");
		expect(await session.files?.readFile("/tmp/done")).toBe("done\n");
		await session.files?.writeText("/tmp/y", "payload");
		expect(await session.files?.exists("/tmp/y")).toBe(true);
		expect(await session.files?.readFile("/tmp/y")).toBe("payload");

		const ownerOnly = account.allocate({ [RUNLOOP_OWNER_METADATA_KEY]: "runloop" });
		const suspended = account.allocate(
			{ [RUNLOOP_ATTEMPT_METADATA_KEY]: `${MARKER_PREFIX}legacy` },
			"suspended",
		);
		expect(await driver.inventory?.list()).toEqual({
			owned: [
				session.sandboxRef,
				{ provider: "runloop", id: ownerOnly },
				{ provider: "runloop", id: suspended },
			],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "runloop", id: suspended });
		await driver.destroyById?.({ provider: "runloop", id: ownerOnly });
		const before = account.shutdowns.length;
		await session.destroy();
		expect(account.shutdowns.slice(before)).toEqual([[session.sandboxRef.id, { force: "true" }]]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("an allocation whose root filesystem is short of the request is refused and shut down", async () => {
		const account = runloopAccount({ diskCapacityGb: 30 });
		const failure = await driverOver(account)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "invalid-create-request", provider: "runloop" });
		expect(account.shutdowns).toEqual([["dbx_1", { force: "true" }]]);
	});
});
