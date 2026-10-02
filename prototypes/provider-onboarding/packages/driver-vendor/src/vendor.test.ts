// The kit's lifecycle behaviour, tested once at the vendor seam against the in-memory adapter.
// These replace the per-provider copies of readiness, teardown, inventory and recovery tests.

import { describe, expect, test } from "bun:test";
import type { CreateRequest, ProviderId } from "@sandbox-benchmarks/driver";
import { isRetryableDriverCreate } from "@sandbox-benchmarks/driver";
import { driverFromComputeSpec } from "@sandbox-benchmarks/driver/computesdk";
import { type } from "arktype";
import type { MemoryVendorOptions } from "./testing.ts";
import { memoryVendor, vendorContract } from "./testing.ts";
import type { Vendor, VendorTraits } from "./vendor.ts";
import { mapped, vendorSpec } from "./vendor.ts";

const provider = "novita" as ProviderId;
const resolvedArtifact = { kind: "baked", ref: "tpl" } as const;
const context = { env: {}, artifact: { kind: "baked" }, resolvedArtifact } as never;
const request: CreateRequest = {
	spec: { vcpus: 4, memoryGb: 8, diskGb: 40 },
	artifact: resolvedArtifact,
	deadlineMs: 300_000,
};

function bind(
	options: MemoryVendorOptions = {},
	extra: Partial<VendorTraits> = {},
	admit?: string,
) {
	const world = memoryVendor(options);
	const vendor: Vendor<unknown, unknown> = admit
		? { ...world.vendor, control: { ...world.vendor.control, admit: () => admit } }
		: (world.vendor as Vendor<unknown, unknown>);
	const traits: VendorTraits = {
		sandboxId: type(/^mem-\d+$/),
		coverage: mapped("runtime-verified"),
		timing: { pollMs: 0, readyTimeoutMs: 1_000, deleteTimeoutMs: 1_000 },
		recovery: { absenceConfirmationMs: 1 },
		...(options.account && { account: options.account }),
		...extra,
	};
	const driver = driverFromComputeSpec(
		provider,
		vendorSpec(provider, context, traits, vendor),
		resolvedArtifact,
		[],
	);
	return { ...world, driver };
}

describe("readiness", () => {
	test("polls a pending sandbox until ready, then proves disk and executes", async () => {
		const { driver, calls } = bind({ readyAfterGets: 3 });
		const session = await driver.create(request);
		expect(calls.filter((call) => call === "get")).toHaveLength(3);
		expect((await session.exec("echo hi")).stdout).toBe("ran: echo hi\n");
		await session.destroy();
	});

	test("a create response that proves readiness skips the poll", async () => {
		const { driver, calls } = bind();
		await (await driver.create(request)).destroy();
		expect(calls.slice(0, 2)).toEqual(["create", "get"]); // the get is teardown's observation
	});
});

describe("cleanup confirmation", () => {
	test("an acknowledged delete is not removal: teardown observes the sandbox gone", async () => {
		const { driver, calls, allocations } = bind();
		await (await driver.create(request)).destroy();
		expect(calls.slice(-3)).toEqual(["get", "remove", "get"]);
		expect(allocations()).toBe(0);
	});

	test("a delete that proves removal ends teardown without further polling", async () => {
		const { driver, calls } = bind({ removal: "removed" });
		await (await driver.create(request)).destroy();
		expect(calls.slice(-2)).toEqual(["get", "remove"]);
	});

	test("never issues a delete for a sandbox already observed gone", async () => {
		const { driver, calls } = bind();
		const session = await driver.create(request);
		await session.destroy();
		calls.length = 0;
		await driver.destroyById?.(session.sandboxRef);
		expect(calls).toEqual(["get"]);
	});
});

describe("inventory", () => {
	test("drains every page and partitions owned from foreign sandboxes", async () => {
		const { driver } = bind({ pageSize: 1, foreign: 2 });
		await driver.create(request);
		await driver.create(request);
		const snapshot = await driver.inventory?.list();
		expect(snapshot?.owned).toHaveLength(2);
		expect(snapshot?.foreignCount).toBe(2);
	});

	test("fails closed on a repeated cursor instead of reporting a partial account", async () => {
		const { driver } = bind({ pageSize: 1, foreign: 3, faults: { pageRepeatsCursor: true } });
		await expect(driver.inventory?.list()).rejects.toThrow();
	});

	test("a dedicated account owns every live sandbox", async () => {
		const { driver } = bind({ account: "dedicated", foreign: 2 });
		expect((await driver.inventory?.list())?.owned).toHaveLength(2);
	});
});

describe("ambiguous-create recovery", () => {
	test("a lost create response is found by its marker and torn down", async () => {
		const { driver, allocations } = bind({ faults: { createAmbiguous: true } });
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});

	test("an unrelated sandbox from a marker lookup is rejected, never deleted", async () => {
		const { driver, live } = bind({ faults: { createAmbiguous: true, findReturnsForeign: true } });
		await expect(driver.create(request)).rejects.toThrow();
		expect(live().some((row) => row.marker === "unrelated")).toBe(true);
	});

	test("a dedicated account recovers by idempotent replay", async () => {
		const { driver, calls, live } = bind({
			account: "dedicated",
			faults: { createAmbiguous: true },
		});
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(calls).toContain("find");
		expect(live()).toHaveLength(0);
	});

	test("a refusal before allocation skips recovery and carries retryability", async () => {
		const { driver, calls } = bind({ faults: { createRefused: { retryable: true } } });
		const error = await driver.create(request).catch((caught) => caught);
		expect(isRetryableDriverCreate(error)).toBe(true);
		expect(calls).toEqual(["create"]);
	});
});

describe("request proof", () => {
	test("rejects an allocation smaller than the requested disk, and tears it down", async () => {
		const { driver, allocations } = bind({ diskGb: 10 });
		await expect(driver.create(request)).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(allocations()).toBe(0);
	});

	test("rejects an allocation the provider does not admit, and tears it down", async () => {
		const { driver, allocations } = bind({}, {}, "wrong environment revision");
		await expect(driver.create(request)).rejects.toMatchObject({ code: "create-failed" });
		expect(allocations()).toBe(0);
	});

	test("refuses a request artifact other than the resolved one before any vendor call", async () => {
		const { driver, calls } = bind();
		await expect(
			driver.create({ ...request, artifact: { kind: "baked", ref: "other" } }),
		).rejects.toMatchObject({ code: "invalid-create-request" });
		expect(calls).toEqual([]);
	});
});

describe("port contract", () => {
	vendorContract("memoryVendor (shared)", () => ({
		vendor: memoryVendor().vendor,
		account: "shared",
	}));
	vendorContract("memoryVendor (dedicated)", () => ({
		vendor: memoryVendor({ account: "dedicated" }).vendor,
		account: "dedicated",
	}));
});
