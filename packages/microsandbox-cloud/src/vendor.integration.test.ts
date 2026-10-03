// Microsandbox Cloud tested at the vendor seam: the adapter's translation over a stub of the SDK's
// `Sandbox` statics and backend selector, the port contract, and sessions through the package's own
// module. Kit behaviour (convergence, deadlines, the inventory partition, recovery mechanics) is
// tested once in the driver package.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, DriverContext } from "@sandbox-benchmarks/driver";
import {
	isFailedCreateCleanupError,
	launchDetached,
	readTextFile,
} from "@sandbox-benchmarks/driver";
import { vendorContract, vendorDriver } from "@sandbox-benchmarks/driver/vendor/testing";
import { IoError, SandboxFsOpsError, SandboxNotFoundError } from "microsandbox";
import microsandboxCloud from "./index.ts";
import type { MicrosandboxSdk } from "./vendor.ts";
import { microsandboxVendor } from "./vendor.ts";

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
		readonly loseCreateBeforeVisible?: boolean;
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
									if (options.loseCreateBeforeVisible)
										throw new IoError("response lost before visibility");
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
	return vendorDriver(microsandboxCloud, context, {
		vendor: microsandboxVendor(account.sdk, context),
		timing: { pollMs: 0, readyTimeoutMs: 500, deleteTimeoutMs: 500 },
	});
}

vendorContract("microsandbox-cloud adapter", microsandboxCloud, () =>
	microsandboxVendor(microsandboxAccount({ pageSize: 1 }).sdk, context),
);

describe("Microsandbox Cloud end to end through its module", () => {
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
		const draining = account.allocate(
			"bench-cloud-cccccccc-cccc-4ccc-8ccc-cccccccccccc",
			"draining",
		);
		expect(await driver.probes?.observe({ provider: "microsandbox-cloud", id: draining })).toEqual({
			state: "running",
		});
		await driver.destroyById?.({ provider: "microsandbox-cloud", id: draining });
		const events = account.rows.get(session.sandboxRef.id)?.events;
		await session.destroy();
		expect(events).toEqual(["requestStop", "waitUntilStopped"]);
		expect(account.removed).toEqual([stopped, draining, session.sandboxRef.id]);
		expect(await driver.probes?.observe(session.sandboxRef)).toEqual({ state: "absent" });
		expect(await driver.inventory?.list()).toEqual({ owned: [], foreignCount: 1 });
	});

	test("a lost create stays owned through an empty lookup until its late allocation is removed", async () => {
		const account = microsandboxAccount({ loseCreateBeforeVisible: true });
		const driver = driverOver(account);
		const failure = await driver.create(request).catch((error: unknown) => error);
		if (!isFailedCreateCleanupError(failure) || failure.locator.kind !== "marker")
			throw new Error("create lost its cleanup owner");
		await expect(failure.cleanup()).rejects.toThrow();
		account.allocate(failure.locator.value);
		await failure.cleanup();
		expect(account.rows.size).toBe(0);
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
});
