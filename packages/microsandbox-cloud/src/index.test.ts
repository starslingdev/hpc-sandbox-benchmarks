// Microsandbox Cloud tested at the vendor seam: the adapter's translation over a stub of the SDK's
// `Sandbox` statics and backend selector, the port contract, and sessions through the package's own
// module. Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is
// tested once in the driver package.

import { describe, expect, spyOn, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate, launchDetached, readTextFile } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { MARKER_PREFIX } from "@sandbox-benchmarks/driver/vendor";
import { vendorContract } from "@sandbox-benchmarks/driver/vendor/testing";
import {
	InvalidConfigError,
	IoError,
	Sandbox as MsbSandbox,
	SandboxFsOpsError,
	SandboxNotFoundError,
} from "microsandbox";
import microsandboxCloud, { MICROSANDBOX_CREATE_TIMEOUT_MS } from "./index.ts";
import type { MicrosandboxSdk } from "./vendor.ts";
import {
	MICROSANDBOX_LABEL_MARKER,
	MICROSANDBOX_SANDBOX_LIFETIME_MS,
	MICROSANDBOX_STOP_WAIT_MS,
	microsandboxVendor,
} from "./vendor.ts";

const KEY = "msb_test-key";
const context: DriverContext<"microsandbox-cloud"> = {
	env: { MSB_API_KEY: KEY },
	artifact: { kind: "image" },
	resolvedArtifact: { kind: "image", ref: "ghcr.io/starslingdev/sandbox-benchmarks-toolchain:v8" },
};
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: context.resolvedArtifact,
	deadlineMs: 300_000,
};
const op = () => ({ signal: new AbortController().signal });
const OWNED_A = "bench-cloud-aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

interface Row {
	status: string;
	readonly files: Map<string, string>;
	readonly events: string[];
}

/**
 * A whole Microsandbox Cloud account behind a stub SDK: a builder that boots a RUNNING sandbox and
 * returns its connected agent, handles that stop (or wedge `draining`) before remove() deletes the
 * record, cursor-paged listings, and per sandbox a shell and file store. The agent connection can
 * be made to fail, to exercise reconnection.
 */
function microsandboxAccount(
	options: {
		readonly pageSize?: number;
		readonly rootDiskMib?: number;
		/** The listed-record config shape instead of the live-sandbox one. */
		readonly listedConfig?: boolean;
		/** The first create allocates (status `crashed`) and then rejects. */
		readonly ambiguousFirstCreate?: boolean;
		/** A draining stop never settles. */
		readonly wedged?: boolean;
		/** The page cursor never advances. */
		readonly repeatCursor?: boolean;
	} = {},
) {
	const rows = new Map<string, Row>();
	const builds: Array<Array<[string, unknown[]]>> = [];
	const backends: unknown[] = [];
	const removed: string[] = [];
	const execs: string[] = [];
	/** Agent calls that fail with a connection error before reaching the guest. */
	const faults = { exec: 0, fs: 0 };
	let ambiguous = options.ambiguousFirstCreate ?? false;
	const allocate = (name: string, status = "running") => {
		rows.set(name, { status, files: new Map(), events: [] });
		return name;
	};
	const running = (name: string) => {
		const row = rows.get(name);
		if (row?.status !== "running") throw new IoError(`sandbox ${name} is gone`);
		return row;
	};
	const agent = (name: string) => ({
		name,
		config: async () =>
			options.listedConfig
				? { resources: { vcpus: 4, memoryMib: 8192, diskSizeMib: options.rootDiskMib ?? 40960 } }
				: {
						resources: { cpus: 4, memoryMib: 8192, maxCpus: 4, maxMemoryMib: 8192 },
						image: {
							Oci: {
								reference: "ref",
								rootDisk: { kind: "managed", sizeMib: options.rootDiskMib ?? 40960 },
							},
						},
					},
		execWith: async (_shell: string, configure: (builder: unknown) => unknown) => {
			let script = "";
			const builder = {
				args: (args: string[]) => {
					script = args[1] ?? "";
					return builder;
				},
			};
			configure(builder);
			if (faults.exec > 0) {
				faults.exec -= 1;
				throw new IoError("connection closed after acceptance");
			}
			const row = running(name);
			execs.push(script);
			const exit = /^sh -c 'exit (\d+)'$/.exec(script);
			const echo = /^nohup \/bin\/sh -lc 'echo (\S+) > (\S+)'/.exec(script);
			if (echo) row.files.set(echo[2] ?? "", `${echo[1]}\n`);
			const cat = /^cat '(.*)'$/.exec(script);
			const body = cat ? row.files.get(cat[1] ?? "") : undefined;
			return {
				code: exit ? Number(exit[1]) : cat && body === undefined ? 1 : 0,
				stdout: () => (cat ? (body ?? "") : `ran:${script}`),
				stderr: () => "",
			};
		},
		fs: () => {
			const guard = () => {
				if (faults.fs > 0) {
					faults.fs -= 1;
					throw new IoError("stale agent");
				}
				return running(name).files;
			};
			return {
				readToString: async (path: string) => {
					const content = guard().get(path);
					if (content === undefined) throw new SandboxFsOpsError("no such file or directory");
					return content;
				},
				exists: async (path: string) => guard().has(path),
				write: async (path: string, content: string) => {
					guard().set(path, content);
				},
			};
		},
	});
	const handle = (name: string) => {
		const row = rows.get(name);
		if (!row) throw new SandboxNotFoundError(`sandbox ${name} not found`);
		return {
			name,
			status: row.status,
			requestStop: async () => {
				row.events.push("requestStop");
				row.status = "draining";
			},
			waitUntilStopped: () => {
				row.events.push("waitUntilStopped");
				if (options.wedged) return new Promise(() => {});
				row.status = "stopped";
				return Promise.resolve({ name, status: "stopped" });
			},
			connect: async () => agent(name),
		};
	};
	const Sandbox = {
		builder: (name: string) => {
			const calls: Array<[string, unknown[]]> = [];
			builds.push(calls);
			const builder: Record<string, unknown> = new Proxy(
				{},
				{
					get: (_target, property) =>
						property === "create"
							? async () => {
									if (ambiguous) {
										ambiguous = false;
										allocate(name, "crashed");
										throw new IoError("response lost");
									}
									allocate(name);
									return agent(name);
								}
							: (...args: unknown[]) => {
									calls.push([String(property), args]);
									return builder;
								},
				},
			);
			return builder;
		},
		get: async (name: string) => handle(name),
		remove: async (name: string) => {
			if (!rows.delete(name)) throw new SandboxNotFoundError(`sandbox ${name} not found`);
			removed.push(name);
		},
		listWith: async (configure: (list: unknown) => unknown) => {
			let cursor: string | undefined;
			const list = {
				limit: () => list,
				cursor: (value: string) => {
					cursor = value;
					return list;
				},
			};
			configure(list);
			const names = [...rows.keys()];
			const from = Number(cursor ?? 0);
			const size = options.pageSize ?? 100;
			return {
				sandboxes: names.slice(from, from + size).map(handle),
				nextCursor: options.repeatCursor
					? "0"
					: from + size < names.length
						? String(from + size)
						: undefined,
			};
		},
	};
	const sdk = {
		Sandbox,
		withDefaultBackend: async (backend: unknown, work: () => Promise<unknown>) => {
			backends.push(backend);
			return work();
		},
	} as unknown as MicrosandboxSdk;
	return { sdk, rows, builds, backends, removed, execs, faults, allocate };
}

/** The package's own module, lowered over a stub SDK instead of the real one. */
function driverOver(account: ReturnType<typeof microsandboxAccount>) {
	return driverFromComputeSpec(
		"microsandbox-cloud",
		microsandboxCloud.specFor(context, {
			vendor: microsandboxVendor(account.sdk, context),
			timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
		}),
		context.resolvedArtifact,
		[KEY],
	);
}

describe("Microsandbox Cloud translation", () => {
	test("boots a named, labelled, size-limited ephemeral sandbox; the key rides only the backend", async () => {
		const account = microsandboxAccount();
		const { control } = microsandboxVendor(account.sdk, context);
		const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const created = await control.create(
			{ request: { ...request, env: { HELLO: "world" } }, marker: `${MARKER_PREFIX}${uuid}` },
			op(),
		);
		expect(created).toMatchObject({
			id: OWNED_A,
			phase: "ready",
			marker: `${MARKER_PREFIX}${uuid}`,
		});
		expect(account.builds[0]).toEqual([
			["image", [context.resolvedArtifact.ref]],
			["rootDisk", [40960]],
			["cpus", [4]],
			["memory", [8192]],
			["maxDuration", [MICROSANDBOX_SANDBOX_LIFETIME_MS / 1000]],
			["detached", [true]],
			["ephemeral", [true]],
			["label", [MICROSANDBOX_LABEL_MARKER, "microsandbox-cloud"]],
			["envs", [{ HELLO: "world" }]],
		]);
		expect(account.backends).toEqual([{ kind: "cloud", apiKey: KEY }]);
		expect(JSON.stringify(account.builds)).not.toContain(KEY);
	});

	test("only a running record is usable; ownership is exactly the generated name shape", async () => {
		const account = microsandboxAccount();
		const { control } = microsandboxVendor(account.sdk, context);
		const read = (name: string, status = "running") =>
			control.get(account.allocate(name, status), op());
		expect(await read(OWNED_A)).toMatchObject({
			phase: "ready",
			marker: `${MARKER_PREFIX}aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
		});
		for (const status of ["stopped", "draining", "crashed"])
			expect((await read(`other-${status}`, status))?.phase).toBe("failed");
		expect((await read("bench-cloud-not-a-uuid"))?.marker).toBeUndefined();
		expect(await control.get("missing", op())).toBeNull();
		expect(control.refused?.(new InvalidConfigError("bad config"))).toEqual({ retryable: false });
		expect(control.refused?.(new Error("HTTP 429 capacity"))).toBeUndefined();
	});

	test("removes stop-first, and removes a wedged draining record without re-stopping it", async () => {
		const account = microsandboxAccount();
		const { control } = microsandboxVendor(account.sdk, context);
		const running = account.allocate(OWNED_A);
		const events = account.rows.get(running)?.events;
		expect(await control.remove(running, op())).toBe("removed");
		expect(events).toEqual(["requestStop", "waitUntilStopped"]);
		expect(account.removed).toEqual([running]);
		expect(await control.remove(running, op())).toBe("removed");

		const wedged = microsandboxAccount({ wedged: true });
		const draining = wedged.allocate(OWNED_A, "draining");
		const timers = spyOn(globalThis, "setTimeout").mockImplementation(((resolve: () => void) => {
			resolve();
			return 0;
		}) as unknown as typeof setTimeout);
		try {
			await microsandboxVendor(wedged.sdk, context).control.remove(draining, op());
			expect(timers.mock.calls[0]?.[1]).toBe(MICROSANDBOX_STOP_WAIT_MS);
		} finally {
			timers.mockRestore();
		}
		expect(wedged.removed).toEqual([draining]);
	});
});

vendorContract("microsandbox-cloud adapter", () => ({
	vendor: microsandboxVendor(microsandboxAccount({ pageSize: 1 }).sdk, context),
	account: "shared",
}));

describe("Microsandbox Cloud end to end through its module", () => {
	test("declares identity, shell-detach execution, and a pull-sized create budget", () => {
		expect(microsandboxCloud.id).toBe("microsandbox-cloud");
		expect(microsandboxCloud.provenance.packageName).toBe("microsandbox");
		expect(microsandboxCloud.execution).toEqual({ syncCapMs: 60_000, durable: "shell-detach" });
		expect(microsandboxCloud.createBudget).toEqual({
			owner: "harness",
			timeoutMs: MICROSANDBOX_CREATE_TIMEOUT_MS,
		});
	});

	test("a session verifies from config, runs, detaches, files, inventories, and is removed stop-first", async () => {
		const account = microsandboxAccount({ pageSize: 1 });
		account.allocate("dev-box");
		const driver = driverOver(account);
		const session = await driver.create(request);
		// Verification reads the record's own config; no in-guest command runs before the first exec.
		expect(account.execs).toEqual([]);

		expect((await session.exec("sh -c 'exit 7'")).exit).toEqual({ kind: "exited", code: 7 });
		await launchDetached(session, "echo done > /tmp/done");
		expect(await readTextFile(session, "/tmp/done")).toBe("done\n");
		expect(await session.files?.exists("/tmp/absent")).toBe(false);
		await session.files?.writeText("/tmp/probe/file.txt", "payload");
		expect(account.execs.at(-1)).toBe("mkdir -p '/tmp/probe'");
		expect(await session.files?.readFile("/tmp/probe/file.txt")).toBe("payload");

		const stopped = account.allocate("bench-cloud-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", "stopped");
		expect(await driver.inventory?.list()).toEqual({
			owned: [session.sandboxRef, { provider: "microsandbox-cloud", id: stopped }],
			foreignCount: 1,
		});
		await driver.destroyById?.({ provider: "microsandbox-cloud", id: stopped });
		const events = account.rows.get(session.sandboxRef.id)?.events;
		await session.destroy();
		expect(events).toEqual(["requestStop", "waitUntilStopped"]);
		expect(account.removed).toEqual([stopped, session.sandboxRef.id]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("an allocation reporting a short root disk is refused and removed; the listed shape verifies too", async () => {
		const short = microsandboxAccount({ rootDiskMib: 24576 });
		await expect(driverOver(short).create(request)).rejects.toMatchObject({
			code: "invalid-create-request",
			provider: "microsandbox-cloud",
		});
		expect(short.removed).toHaveLength(1);
		const listed = microsandboxAccount({ listedConfig: true });
		await (await driverOver(listed).create(request)).destroy();
	});

	test("a command that never reached the guest surfaces once, unreplayed; the next reconnects", async () => {
		const account = microsandboxAccount();
		const session = await driverOver(account).create(request);
		account.faults.exec = 1;
		await expect(session.exec("touch /tmp/must-run-once")).rejects.toMatchObject({
			code: "exec-failed",
			provider: "microsandbox-cloud",
		});
		expect(account.execs).not.toContain("touch /tmp/must-run-once");
		expect((await session.exec("echo hi")).stdout).toBe("ran:echo hi");
	});

	test("an idempotent file read reconnects once on a stale agent, but never reboots a stopped sandbox", async () => {
		const account = microsandboxAccount();
		const session = await driverOver(account).create(request);
		await session.files?.writeText("/tmp/result", "recovered");
		account.faults.fs = 1;
		expect(await session.files?.readFile("/tmp/result")).toBe("recovered");
		const row = account.rows.get(session.sandboxRef.id);
		if (row) row.status = "stopped";
		account.faults.fs = 1;
		await expect(session.files?.readFile("/tmp/result")).rejects.toMatchObject({
			code: "filesystem-failed",
		});
	});

	test("a rejected create is reconciled by its name: the crashed residue is stopped, then removed", async () => {
		const account = microsandboxAccount({ ambiguousFirstCreate: true });
		const failure = await driverOver(account)
			.create(request)
			.catch((caught) => caught);
		expect(failure).toMatchObject({ code: "create-failed", provider: "microsandbox-cloud" });
		expect(isRetryableDriverCreate(failure)).toBe(false);
		expect(account.removed).toHaveLength(1);
		expect(account.rows.size).toBe(0);
	});

	test("an unrecoverable rejected create names the sandbox it asked for", async () => {
		const account = microsandboxAccount({ ambiguousFirstCreate: true });
		const sdk = {
			...account.sdk,
			Sandbox: {
				...account.sdk.Sandbox,
				get: async () => {
					throw new IoError("control plane unavailable");
				},
			},
		} as unknown as MicrosandboxSdk;
		const failure = await driverFromComputeSpec(
			"microsandbox-cloud",
			microsandboxCloud.specFor(context, {
				vendor: microsandboxVendor(sdk, context),
				timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
			}),
			context.resolvedArtifact,
			[KEY],
		)
			.create(request)
			.catch((caught) => caught);
		const [name = ""] = account.rows.keys();
		expect(name).toMatch(/^bench-cloud-[0-9a-f-]{36}$/);
		expect(failure.locator).toEqual({ kind: "marker", key: "name", value: name });
		expect(failure.message).toContain(`by marker name=${name} `);
	});

	test("a listing that repeats its continuation cursor fails closed", async () => {
		const account = microsandboxAccount({ pageSize: 1, repeatCursor: true });
		account.allocate("one");
		account.allocate("two");
		await expect(driverOver(account).inventory?.list()).rejects.toMatchObject({
			code: "probe-failed",
			provider: "microsandbox-cloud",
		});
	});
});

describe("Microsandbox Cloud's production binding", () => {
	test("the default module refuses a request without a root disk or off the image before any call", async () => {
		const builder = spyOn(MsbSandbox, "builder");
		try {
			const driver = microsandboxCloud.driver(context);
			for (const input of [
				{ ...request, spec: { vcpus: 4, memoryGb: 8 } },
				{ ...request, artifact: { kind: "image" as const, ref: "other" } },
				{ ...request, gpu: { model: "H100", count: 1 } },
			])
				await expect(driver.create(input)).rejects.toMatchObject({
					code: "invalid-create-request",
				});
			expect(builder).not.toHaveBeenCalled();
		} finally {
			builder.mockRestore();
		}
	});
});
