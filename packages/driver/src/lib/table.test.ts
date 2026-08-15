import { describe, expect, test } from "bun:test";
import type { CreateRequest, ExecResult } from "./port.ts";
import { sandboxId, succeeded } from "./port.ts";
import type { MethodTable } from "./table.ts";
import { driverFromTable } from "./table.ts";

const okExec: ExecResult = {
	exit: { kind: "exited", code: 0 },
	stdout: "",
	stderr: "",
	durationMs: 0,
	truncated: false,
};

const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8 },
	artifactRef: "im-abc123",
	deadlineMs: 60_000,
};

const baseTable: MethodTable<string, null> = {
	create: async () => ({ handle: "h", sandboxId: sandboxId("sb-1") }),
	exec: async () => okExec,
	destroy: async () => {},
};

describe("sandboxId", () => {
	test("rejects the empty string at construction", () => {
		expect(() => sandboxId("")).toThrow("sandboxId must be non-empty");
	});
});

describe("succeeded", () => {
	test("only a zero exited code succeeds", () => {
		expect(succeeded({ kind: "exited", code: 0 })).toBe(true);
		expect(succeeded({ kind: "exited", code: 7 })).toBe(false);
		expect(succeeded({ kind: "signalled", signal: "KILL" })).toBe(false);
		expect(succeeded({ kind: "unknown", detail: "no code" })).toBe(false);
	});
});

describe("driverFromTable", () => {
	test("assembles a session over the table with the request's artifactRef", async () => {
		const driver = driverFromTable(baseTable, async () => null);
		const session = await driver.create(request);
		expect(String(session.sandboxId)).toBe("sb-1");
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
		expect(String(session.sandboxId)).toBe("sb-1");
		expect(attempts).toBe(2);
	});

	test("a driver-reported artifact contradiction fails create and tears down the orphan", async () => {
		let destroyed = 0;
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({ handle: "h", sandboxId: sandboxId("sb-2"), artifactRef: "im-OTHER" }),
				destroy: async () => {
					destroyed += 1;
				},
			},
			async () => null,
		);
		await expect(driver.create(request)).rejects.toThrow(
			"artifact mismatch: request says im-abc123, driver booted im-OTHER",
		);
		expect(destroyed).toBe(1);
	});

	test("a driver-reported ref that matches is recorded on the session", async () => {
		const driver = driverFromTable(
			{
				...baseTable,
				create: async () => ({ handle: "h", sandboxId: sandboxId("sb-3"), artifactRef: "im-abc123" }),
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

	test("destroyById exists on the driver exactly when the table declares it", async () => {
		const reaped: string[] = [];
		const without = driverFromTable(baseTable, async () => null);
		expect(without.destroyById).toBeUndefined();
		const withReap = driverFromTable(
			{
				...baseTable,
				destroyById: async (_ctx, id) => {
					reaped.push(id);
				},
			},
			async () => null,
		);
		await withReap.destroyById?.(sandboxId("sb-gone"));
		expect(reaped).toEqual(["sb-gone"]);
	});
});
