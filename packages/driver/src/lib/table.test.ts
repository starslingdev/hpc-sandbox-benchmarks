import { describe, expect, test } from "bun:test";
import { DriverError } from "./errors.ts";
import type { CreateRequest } from "./port.ts";
import { sandboxRef } from "./port.ts";
import { okExec } from "./session.fixture.ts";
import type { MethodTable } from "./table.ts";
import { driverFromTable } from "./table.ts";

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifactRef: "im-abc123",
	deadlineMs: 60_000,
};

const baseTable: MethodTable<string, null> = {
	create: async () => ({ handle: "h", sandboxRef: sandboxRef("tama", "m-1") }),
	exec: async () => okExec,
	destroy: async () => {},
};

describe("driverFromTable", () => {
	test("assembles a session over the table with the request's artifactRef", async () => {
		const driver = driverFromTable(baseTable, async () => null);
		const session = await driver.create(request);
		expect(session.sandboxRef).toEqual({ provider: "tama", id: "m-1" });
		expect(session.artifactRef).toBe("im-abc123");
		expect(session.native).toBe("h");
		expect(session.files).toBeUndefined();
		expect(session.launch).toBeUndefined();
	});

	test("a transient context failure is retried, not memoized forever", async () => {
		let attempts = 0;
		const driver = driverFromTable(baseTable, async () => {
			attempts += 1;
			if (attempts === 1) throw new Error("transient plumbing failure");
			return null;
		});
		await expect(driver.create(request)).rejects.toThrow("transient plumbing failure");
		// Before the memo-clear rule this replayed the memoized rejection and bricked the driver.
		const session = await driver.create(request);
		expect(session.sandboxRef.id).toBe("m-1");
		expect(attempts).toBe(2);
	});

	test("a driver-reported artifact contradiction fails create (typed) and tears down the orphan", async () => {
		let destroyed = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-2"),
					artifactRef: "im-OTHER",
				}),
				destroy: async () => {
					destroyed += 1;
				},
			},
			async () => null,
		);
		const error = await driver.create(request).catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(DriverError);
		expect((error as DriverError).code).toBe("artifact-mismatch");
		expect(destroyed).toBe(1);
	});

	test("a mismatch whose orphan teardown ALSO fails preserves the mismatch as SuppressedError", async () => {
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-2"),
					artifactRef: "im-OTHER",
				}),
				destroy: async () => {
					throw new Error("teardown exploded");
				},
			},
			async () => null,
		);
		const error = (await driver
			.create(request)
			.catch((caught: unknown) => caught)) as SuppressedError;
		expect(error).toBeInstanceOf(SuppressedError);
		expect(String(error.error)).toContain("teardown exploded");
		expect((error.suppressed as DriverError).code).toBe("artifact-mismatch");
	});

	test("a driver-reported ref that matches is recorded on the session", async () => {
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({
					handle: "h",
					sandboxRef: sandboxRef("tama", "m-3"),
					artifactRef: "im-abc123",
				}),
			},
			async () => null,
		);
		const session = await driver.create(request);
		expect(session.artifactRef).toBe("im-abc123");
	});

	test("files and launch pass through only when the table declares them", async () => {
		const writes: string[] = [];
		const driver = driverFromTable(
			{
				...baseTable,
				launch: async (_ctx, _handle, command) => {
					writes.push(`launch:${command}`);
				},
				files: {
					readFile: async (_ctx, _handle, path) => `read:${path}`,
					exists: async () => true,
					writeText: async (_ctx, _handle, path, text) => {
						writes.push(`${path}=${text}`);
					},
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		expect(await session.files?.readFile("/etc/os-release")).toBe("read:/etc/os-release");
		await session.files?.writeText("/bench/a", "1");
		await session.launch?.("sleep 1");
		expect(writes).toEqual(["/bench/a=1", "launch:sleep 1"]);
	});

	test("the kit applies byte caps centrally; a table cannot ignore them", async () => {
		const driver = driverFromTable(
			{ ...baseTable, exec: async () => ({ ...okExec, stdout: "x".repeat(100) }) },
			async () => null,
		);
		const session = await driver.create(request);
		const capped = await session.exec("noisy", { maxOutputBytes: 10 });
		expect(capped.stdout).toBe("x".repeat(10));
		expect(capped.truncated).toBe(true);
		const uncapped = await session.exec("noisy");
		expect(uncapped.stdout).toHaveLength(100);
		expect(uncapped.truncated).toBe(false);
	});

	test("destroy is idempotent and every operation after it is a typed use-after-destroy error", async () => {
		let destroys = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				destroy: async () => {
					destroys += 1;
				},
				files: {
					readFile: async () => "x",
					exists: async () => true,
					writeText: async () => {},
				},
			},
			async () => null,
		);
		const session = await driver.create(request);
		await session.destroy();
		await session.destroy(); // idempotent — a second destroy is a no-op, not an error
		expect(destroys).toBe(1);
		const execError = (await session
			.exec("echo")
			.catch((caught: unknown) => caught)) as DriverError;
		expect(execError).toBeInstanceOf(DriverError);
		expect(execError.code).toBe("use-after-destroy");
		const readError = (await (
			session.files?.readFile("/x") ?? Promise.reject(new Error("no files"))
		).catch((caught: unknown) => caught)) as DriverError;
		expect(readError.code).toBe("use-after-destroy");
	});

	test("destroyById, probes and snapshots pass through exactly when the table declares them", async () => {
		const reaped: string[] = [];
		const bare = driverFromTable(baseTable, async () => null);
		expect(bare.destroyById).toBeUndefined();
		expect(bare.probes).toBeUndefined();
		expect(bare.snapshots).toBeUndefined();

		const listed: string[] = [];
		const full = driverFromTable(
			{
				...baseTable,
				destroyById: async (_ctx, ref) => {
					reaped.push(ref.id);
				},
				probes: {
					list: async (ctx) => {
						listed.push(String(ctx));
					},
				},
				snapshots: {
					create: async () => ({ snapshotId: "snap-1" }),
					delete: async () => {},
				},
			},
			async () => null,
		);
		await full.destroyById?.(sandboxRef("tama", "m-gone"));
		expect(reaped).toEqual(["m-gone"]);
		await full.probes?.list();
		expect(listed).toEqual(["null"]);
		expect(full.probes?.describe).toBeUndefined(); // absent, not a no-op stub
		expect(await full.snapshots?.create(sandboxRef("tama", "m-1"))).toEqual({
			snapshotId: "snap-1",
		});
	});
});
